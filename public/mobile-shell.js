'use strict';
// The same application and API power both surfaces; this only selects their shell.
if(location.pathname==='/admin.html'&&!location.hash)history.replaceState(null,'','#admin');
function updateAppShell(){
  const route=(location.hash.slice(1)||'home').split('/')[0];
  const admin=location.pathname==='/admin.html'||['admin','case'].includes(route);
  document.body.classList.toggle('customer-app',!admin);
  document.body.classList.toggle('admin-app',admin);
  document.body.dataset.route=route;
  document.body.classList.toggle('app-flow',!['home','activity','code','access','help'].includes(route));
  document.querySelectorAll('.app-tabs [data-tab]').forEach(a=>{
    const selected=a.dataset.tab===route;
    if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
}
updateAppShell();
addEventListener('hashchange',updateAppShell);
