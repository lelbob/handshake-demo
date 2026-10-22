'use strict';
const frame=document.querySelector('iframe');
const device=document.querySelector('.device');
const space=document.querySelector('.device-space');
// Keep staff/customer cookies independent while testing both on this computer.
const adminLink=document.querySelector('a[href="/admin.html"]');
const adminUrl=new URL('/admin.html',location.origin);
adminUrl.hostname=location.hostname==='127.0.0.1'?'localhost':'127.0.0.1';
adminLink.href=adminUrl.href;
function fitPhone(){
  const scale=Math.min(1,(innerWidth-48)/390,(innerHeight-126)/796);
  if(innerWidth<=430){device.style.transform='none';return;}
  const fit=Math.max(.45,scale);
  device.style.transform=`scale(${fit})`;
  space.style.width=390*fit+'px';space.style.height=796*fit+'px';
}
function openRoute(){
  const route=location.hash||'#home';
  if(frame.contentWindow.location.hash!==route)frame.src='/index.html?mobile=1&build=mobile-2'+route;
}
frame.addEventListener('load',()=>{
  function rememberRoute(){
    const route=frame.contentWindow.location.hash;
    if(/^#(home|create|review|activity|access|code|help|record|share|provider|release|report|receipt)(\/|$)/.test(route))history.replaceState(null,'',location.pathname+location.search+route);
  }
  frame.contentWindow.addEventListener('hashchange',rememberRoute);rememberRoute();
});
addEventListener('hashchange',openRoute);addEventListener('resize',fitPhone);
fitPhone();openRoute();
