'use strict';
// Browser-only simulation. This is not authentication or a financial ledger.
(() => {
  const STORE = 'handshake-browser-demo-v1';
  const now = () => Math.floor(Date.now() / 1000);
  const uid = prefix => prefix + '-' + crypto.randomUUID();
  const charge = net => Math.max(100, Math.ceil(net * .02));
  const nativeFetch = window.fetch.bind(window);
  const require = (ok, message) => { if (!ok) throw new Error(message); };
  const load = () => JSON.parse(localStorage.getItem(STORE) || '{"records":{},"accounts":{},"drafts":{},"route_open":true}');
  const save = db => localStorage.setItem(STORE, JSON.stringify(db));
  const session = () => JSON.parse(sessionStorage.getItem(STORE) || 'null');
  const setSession = s => sessionStorage.setItem(STORE, JSON.stringify(s));
  function event(r, type, reason = '') {
    r.version++; r.events.push({id:uid('event'),actor:session()?.actor || 'demo',type,reason,created:now()});
  }
  function insert(db, kind, owner, data) {
    const id = uid(kind);
    const r = {id,kind,owner,code:'HS-'+crypto.randomUUID().slice(0,8).toUpperCase(),version:1,created:now(),state:'open',collection:'not_started',payout:'not_started',scenario:'success',events:[],evidence:[],proposals:[],jobs:[],...data};
    db.records[id] = r; event(r,'demo.created'); return r;
  }
  function record(db, id) { const r = db.records[id]; require(r,'This demo record exists only in the browser that created it. Start a new demo here.'); return r; }
  function project(db,r) {
    const s=session(); const staff=s && s.role!=='customer';
    const out={...r,is_owner:s?.actor===r.owner,is_buyer:!!s && s.actor===r.buyer,is_payer:!!s && s.actor===r.payer};
    out.private=!!(staff||out.is_owner||out.is_buyer||out.is_payer);
    out.can_join=r.kind==='escrow'&&!r.buyer&&!out.is_owner;
    out.case_id=r.case_open?'case:'+r.id:null;
    if(r.kind==='request'&&r.payment_id) {const p=record(db,r.payment_id);out.state=p.state;out.collection=p.collection;out.payout=p.payout;}
    if(r.kind==='request'&&!r.payment_id&&now()>=r.expires)out.state='expired';
    return out;
  }
  function finish(r) {
    if(!r.due || r.due>now() || r.case_open&&r.state==='disputed')return;
    delete r.due;
    if(r.scenario==='payout_unknown'||r.scenario==='payout_failed'||r.scenario==='insufficient_float') {
      r.payout=r.scenario==='payout_unknown'?'unknown':'failed';r.state='payout_'+r.payout;r.case_open=true;r.case_reason='Simulated provider exception.';
    } else {r.payout='confirmed';r.state=r.instruction_type==='refund'?'refunded':'completed';r.case_open=false;}
    event(r,r.instruction_type==='refund'?'refund.confirmed':'payout.'+r.payout);
  }
  function start(r,type='payout') {r.instruction_type=type;r.payout='pending';r.state=type==='refund'?'refund_pending':r.kind==='escrow'?'release_pending':'payout_pending';r.due=now()+2;event(r,type+'.requested');}
  function amount(n) {n=Number(n);require(Number.isInteger(n)&&n>=500&&n<=1000000,'Enter a whole MMK amount between 500 and 1,000,000.');return n;}
  function handle(path,b,db) {
    const u=new URL(path,location.origin), p=u.pathname, s=session();
    Object.values(db.records).forEach(finish);
    if(p==='/api/session')return {session:s};
    if(p==='/api/session/create') {
      const actor=uid('person'),recovery=uid('demo-key');db.accounts[recovery]={actor,role:'customer'};setSession(db.accounts[recovery]);return {session:session(),recovery};
    }
    if(p==='/api/session/logout'){setSession(null);return {ok:true};}
    if(p==='/api/session/recover'){require(db.accounts[b.recovery],'Recovery works only for demo accounts saved in this browser.');setSession(db.accounts[b.recovery]);return {session:session()};}
    if(p==='/api/session/staff') {
      require(['support','operations','finance-a','finance-b','admin'].includes(b.username)&&b.password==='handshake-demo-2026','Use the displayed demo identity and password.');
      setSession({actor:b.username,role:b.username.startsWith('finance')?'finance':b.username});return {session:session()};
    }
    if(p==='/api/drafts') {require(s,'Start a demo session first.');db.drafts[s.actor] ||= {};if(b)db.drafts[s.actor][b.kind]=b;return {drafts:db.drafts[s.actor]};}
    if(p==='/api/activity')return {records:Object.values(db.records).filter(r=>[r.owner,r.buyer,r.payer].includes(s?.actor)).reverse().map(r=>project(db,r))};
    if(p==='/api/resolve'){const r=Object.values(db.records).find(r=>r.code===u.searchParams.get('code')?.toUpperCase());require(r,'No matching code in this browser.');return {id:r.id};}
    if(p==='/api/admin'||p==='/api/admin/route') {
      require(s&&s.role!=='customer','Select a demo staff identity.');if(b)db.route_open=b.open;
      return {records:Object.values(db.records).map(r=>project(db,r)),float:10000000,route_open:db.route_open,balances:[],differences:[],inbox:[],audit:Object.values(db.records).flatMap(r=>r.events)};
    }
    if(p==='/api/create') {
      require(s?.role==='customer','Start a customer demo session first.');require(['escrow','request','shop'].includes(b.kind),'Choose a demo service.');
      const net=b.kind==='shop'?0:amount(b.net);
      const data={...b,net,fee:net?charge(net):0,total:net?net+charge(net):0,destination_mask:'•• '+b.destination.slice(-4),expires:now()+1800,quote_expires:now()+900,paused:false};
      if(b.kind==='escrow')Object.assign(data,{state:'awaiting_buyer',invitation:uid('invite')});
      const r=insert(db,b.kind,s.actor,data);if(db.drafts[s.actor])delete db.drafts[s.actor][b.kind];return {record:project(db,r)};
    }
    const parts=p.split('/').filter(Boolean);
    if(parts[0]==='api'&&parts[1]==='simulate') {
      const r=record(db,parts[2]);require(s&&[r.buyer,r.payer].includes(s.actor),'Switch to this payment’s demo buyer first.');
      require(r.collection==='pending','Authorize this payment first.');
      if(b.outcome==='confirmed'){r.collection='confirmed';event(r,'collection.confirmed');if(r.kind==='escrow')r.state='held';else start(r);}
      else if(b.outcome==='failed'){r.collection='failed';r.state='payment_failed';event(r,'collection.failed');}
      return {record:project(db,r)};
    }
    if(parts[0]==='api'&&parts[1]==='records') {
      const r=record(db,parts[2]), action=parts[3];if(!b)return {record:project(db,r)};
      require(s,'Start a demo session first.');
      if(action==='pay-intent') {
        require(db.route_open&&!r.paused,'Demo collections are paused.');require(r.kind==='shop'||r.kind==='request','Choose a request or shop.');
        if(r.payment_id)return {record:project(db,record(db,r.payment_id))};
        require(r.kind==='shop'||now()<r.expires,'This request expired.');
        const net=r.kind==='shop'?amount(b.net):r.net;
        const payment=insert(db,'payment',r.owner,{name:r.name,rail:r.rail,destination_mask:r.destination_mask,net,fee:charge(net),total:net+charge(net),payer:s.actor,source_id:r.id,shop_id:r.kind==='shop'?r.id:null,state:'awaiting_payment',quote_expires:now()+900,scenario:r.scenario});
        if(r.kind==='request')r.payment_id=payment.id;return {record:project(db,payment)};
      }
      if(action==='join') {require(!r.buyer&&s.actor!==r.owner&&b.invitation===r.invitation&&b.agree,'Switch to the demo buyer and enter the seller invitation key.');r.buyer=s.actor;r.accepted=true;r.state='awaiting_payment';}
      else if(action==='authorize'){require([r.buyer,r.payer].includes(s.actor)&&b.agree,'The demo buyer must accept the payment.');require(['awaiting_payment','payment_failed'].includes(r.state),'This payment is already processing.');require(now()<r.quote_expires,'Refresh the expired quote first.');r.method=b.method;r.collection='pending';r.state='collection_pending';}
      else if(action==='deliver'){require(s.actor===r.owner&&r.state==='held','The seller can mark a held deal delivered.');r.state='delivered';}
      else if(action==='release'){require(s.actor===r.buyer&&r.state==='delivered'&&!r.case_open&&b.agree,'The buyer must check delivery before release.');start(r);}
      else if(action==='dispute'){require([r.owner,r.buyer].includes(s.actor)&&['held','delivered','release_pending'].includes(r.state),'Only an active demo escrow can be reported.');r.case_open=true;r.case_reason=b.reason;r.state='disputed';delete r.due;}
      else if(action==='pause'){require(r.owner===s.actor,'Switch to the demo seller.');r.paused=!r.paused;}
      else if(action==='destination'){require(r.owner===s.actor,'Switch to the demo seller.');r.rail=b.rail;r.destination_mask='•• '+b.destination.slice(-4);}
      else if(action==='requote')r.quote_expires=now()+900;
      else if(s.role!=='customer') {
        if(action==='note')event(r,'case.note_added',b.reason);
        else if(action==='review'){r.reviewed=true;event(r,'case.human_review_recorded',b.reason);}
        else if(action==='assign')r.assignee=b.assignee;
        else if(action==='request-evidence')r.evidence_request=b.reason;
        else if(action==='scenario')r.scenario=b.scenario;
        else if(action==='query'){require(['unknown','pending'].includes(r.payout),'There is no uncertain demo payout to query.');r.due=now();finish(r);}
        else if(action==='propose'){require(['finance','admin'].includes(s.role)&&r.reviewed,'Record a review as demo finance first.');require(b.decision!=='split','Partial settlements are available in the full local app; this demo supports refund, release and retry.');r.proposals.unshift({id:uid('proposal'),action:b.decision,amount:r.net,proposer:s.actor,state:'proposed',reason:b.reason});}
        else if(action==='cancel')r.proposals=[];
        else if(action==='approve'){const q=r.proposals[0];require(['finance','admin'].includes(s.role)&&q&&q.proposer!==s.actor,'Switch to a different demo finance identity to approve.');q.state='approved';}
        else if(action==='submit'){const q=r.proposals[0];require(q?.state==='approved','Independent demo approval is required.');start(r,q.action==='refund'?'refund':'payout');q.state='submitted';}
        else throw new Error('This operation is available in the full local app.');
      } else throw new Error('This operation is available in the full local app.');
      event(r,'demo.'+action,b.reason||'');return {record:project(db,r)};
    }
    throw new Error('This operation is available in the full local app.');
  }
  window.fetch=async(input,options={})=>{
    const url=typeof input==='string'?input:input.url;
    if(!new URL(url,location.origin).pathname.startsWith('/api/'))return nativeFetch(input,options);
    try{const db=load(),result=handle(url,options.body?JSON.parse(options.body):null,db);save(db);return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});}
    catch(error){return new Response(JSON.stringify({error:error.message}),{status:400,headers:{'Content-Type':'application/json'}});}
  };
  // Switch demo roles without needing cross-browser shared storage.
  addEventListener('DOMContentLoaded',()=>{
    const panel=document.createElement('details');panel.className='demo-controls';
    panel.innerHTML='<summary>Demo controls</summary><p>Records stay in this browser. No real accounts or payments.</p><label>Try a role <select id="demo-role"><option value="">Choose…</option><option value="seller">Seller / recipient</option><option value="buyer">Buyer / payer</option><option value="finance-a">Finance A</option><option value="finance-b">Finance B</option><option value="support">Support</option></select></label><button id="demo-reset" type="button">Reset demo data</button>';
    document.body.append(panel);
    panel.querySelector('select').addEventListener('change',e=>{
      const role=e.target.value;if(!role)return;const db=load();
      const routeId=location.hash.split('/')[1],r=db.records[routeId];
      let actor=role,access=role.startsWith('finance')?'finance':role;
      if(role==='seller'||role==='buyer'){access='customer';actor=role==='seller'?r?.owner:r?.buyer||r?.payer;actor ||= 'person-demo-'+role;}
      setSession({actor,role:access});
      if(access!=='customer')location.href='/admin.html#admin';else location.href='/index.html'+(r?'#record/'+r.id:'#home');
      location.reload();
    });
    panel.querySelector('button').addEventListener('click',()=>{if(confirm('Clear all demo records saved in this browser?')){localStorage.removeItem(STORE);sessionStorage.clear();location.href='/';}});
    const observer=new MutationObserver(()=>{
      document.querySelectorAll('img[src^="/api/qr"]').forEach(img=>{const text=new URL(img.getAttribute('src'),location.origin).searchParams.get('text');const qr=qrcode(0,'M');qr.addData(text);qr.make();img.src=qr.createDataURL(4,4);});
    });observer.observe(document.body,{childList:true,subtree:true});
  });
})();
