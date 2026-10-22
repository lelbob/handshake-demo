'use strict';
(async()=>{
  const lab=document.getElementById('lab');
  const id=location.hash.slice(1);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try {
    const response=await fetch('/api/records/'+encodeURIComponent(id));
    const data=await response.json();
    if(!response.ok)throw new Error(data.error);
    const r=data.record;
    if(!r.is_payer&&!r.is_buyer)throw new Error('Restore the private payer session before opening this simulator.');
    lab.innerHTML=`<section class="flow-card"><span class="eyebrow">Testing tool · outside the customer app</span><h1>Local provider result</h1><div class="amount">${r.total.toLocaleString('en-US')}<small>MMK</small></div><p>${safe(r.method)} · ${safe(r.code)}</p><p class="sub">These controls update simulated records saved in this browser. No bank, wallet, or real account is involved.</p><div id="error" role="alert" tabindex="-1"></div><div class="actions"><button data-outcome="confirmed" class="primary">Simulate successful collection</button><button data-outcome="pending" class="secondary">Return with payment pending</button><button data-outcome="failed" class="secondary">Simulate failed collection</button><a class="quiet" href="/#record/${safe(id)}">Return to saved status</a></div></section>`;
    lab.addEventListener('click',async e=>{
      const button=e.target.closest('[data-outcome]');if(!button)return;
      lab.querySelectorAll('button').forEach(b=>b.disabled=true);
      try {
        const res=await fetch('/api/simulate/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json','X-Handshake':'1'},body:JSON.stringify({outcome:button.dataset.outcome})});
        const result=await res.json();if(!res.ok)throw new Error(result.error);
        location.assign('/#record/'+id);
      } catch(error){const alert=document.getElementById('error');alert.textContent=error.message;alert.focus();lab.querySelectorAll('button').forEach(b=>b.disabled=false);}
    });
  } catch(error){lab.innerHTML=`<section class="flow-card"><h1>Private access required</h1><p role="alert">${safe(error.message)}</p><a class="primary" href="/#access">Restore private access</a></section>`;}
})();
