'use strict';
const frame=document.querySelector('iframe');
function navigate(){frame.src='/index.html?motion=reduce&build=mobile-ui-2'+(location.hash||'#home');}
addEventListener('hashchange',navigate);navigate();
setInterval(()=>{
  const d=frame.contentDocument;if(!d)return;
  const w=frame.contentWindow;
  const overflow=[...d.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>d.documentElement.clientWidth+1||r.left<0);}).slice(0,8).map(e=>e.className||e.tagName);
  document.getElementById('metrics').textContent=JSON.stringify({frameWidth:frame.clientWidth,viewport:d.documentElement.clientWidth,documentWidth:d.documentElement.scrollWidth,route:w.location.hash,overflow,activeAnimations:d.getAnimations().filter(a=>a.playState==='running').length,mascotReduced:d.querySelector('.elephant')?.getAttribute('data-reduced-motion'),focus:d.activeElement?.getAttribute('id')||d.activeElement?.tagName});
},400);
