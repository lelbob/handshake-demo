const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
function setup(){
  const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),clear:()=>m.clear()};};
  const localStorage=storage(),sessionStorage=storage();
  const ctx={localStorage,sessionStorage,crypto:webcrypto,URL,Response,location:{origin:'http://demo.test'},addEventListener(){},console};ctx.window=ctx;ctx.fetch=()=>{throw Error('Unexpected network access');};
  vm.runInNewContext(fs.readFileSync('public/demo-api.js','utf8'),ctx);
  const api=async(path,b)=>{const res=await ctx.fetch('/api/'+path,{body:b?JSON.stringify(b):undefined});const d=await res.json();if(!res.ok)throw Error(d.error);return d;};
  const role=(actor,role='customer')=>sessionStorage.setItem('handshake-browser-demo-v1',JSON.stringify({actor,role}));
  const advance=()=>{const db=JSON.parse(localStorage.getItem('handshake-browser-demo-v1'));for(const r of Object.values(db.records))if(r.due)r.due=0.1;localStorage.setItem('handshake-browser-demo-v1',JSON.stringify(db));};
  return {api,role,advance};
}
const details={name:'Demo Shop',net:5000,rail:'KPay',destination:'099999999',demo_verified:true,item:'Demo item',delivery:'Tomorrow',description:'Fictional item',window:'24 hours'};
test('escrow completes with seller, buyer, collection and separate payout',async()=>{
  const {api,role,advance}=setup();const seller=(await api('session/create',{})).session.actor;
  let r=(await api('create',{...details,kind:'escrow'})).record;
  await assert.rejects(api('records/'+r.id+'/join',{invitation:r.invitation,agree:true}),/demo buyer/);
  const buyer=(await api('session/create',{})).session.actor;
  await api('records/'+r.id+'/join',{invitation:r.invitation,agree:true});
  await api('records/'+r.id+'/authorize',{method:'KPay',agree:true});
  r=(await api('simulate/'+r.id,{outcome:'confirmed'})).record;assert.equal(r.state,'held');
  role(seller);await api('records/'+r.id+'/deliver',{});
  await assert.rejects(api('records/'+r.id+'/release',{agree:true}),/buyer/);
  role(buyer);r=(await api('records/'+r.id+'/release',{agree:true})).record;assert.equal(r.state,'release_pending');
  advance();r=(await api('records/'+r.id)).record;assert.equal(r.state,'completed');assert.equal(r.payout,'confirmed');
});
test('single-use request resumes payment; pending and failed collection stay unfulfilled',async()=>{
  const {api}=setup();await api('session/create',{});
  const r=(await api('create',{...details,kind:'request'})).record;
  const p=(await api('records/'+r.id+'/pay-intent',{})).record;
  assert.equal((await api('records/'+r.id+'/pay-intent',{})).record.id,p.id);
  await api('records/'+p.id+'/authorize',{method:'WavePay',agree:true});
  assert.equal((await api('simulate/'+p.id,{outcome:'pending'})).record.collection,'pending');
  assert.equal((await api('simulate/'+p.id,{outcome:'failed'})).record.state,'payment_failed');
  assert.equal((await api('records/'+r.id)).record.state,'payment_failed');
});
test('dispute blocks queued escrow payout and records persist across sessions',async()=>{
  const {api,role,advance}=setup();const seller=(await api('session/create',{})).session.actor;
  const r=(await api('create',{...details,kind:'escrow'})).record;await api('session/create',{});
  await api('records/'+r.id+'/join',{invitation:r.invitation,agree:true});await api('records/'+r.id+'/authorize',{method:'KPay',agree:true});await api('simulate/'+r.id,{outcome:'confirmed'});
  role(seller);await api('records/'+r.id+'/dispute',{reason:'Demo delivery issue'});advance();
  await api('session/logout',{});assert.equal((await api('records/'+r.id)).record.state,'disputed');
});
