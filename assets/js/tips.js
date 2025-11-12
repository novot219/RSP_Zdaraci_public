// Lightweight context tips – zobrazí tooltip při focusu/hoveru na elementech s [data-tip]
window.Tips = (function(){
  const TIP_CLASS = 'ctx-tip';

  function createTip(el){
    const text = el.getAttribute('data-tip');
    if(!text) return null;
    const tip = document.createElement('div');
    tip.className = TIP_CLASS;
    tip.textContent = text;
    document.body.appendChild(tip);
    positionTip(tip, el);
    return tip;
  }

  function positionTip(tip, el){
    const r = el.getBoundingClientRect();
    const pad = 8;
    tip.style.position = 'fixed';
    tip.style.left = (r.left) + 'px';
    tip.style.top  = (r.bottom + pad) + 'px';
    tip.style.maxWidth = Math.max(220, r.width) + 'px';
    tip.style.zIndex = 70;
    tip.style.background = 'rgba(17,24,39,.95)';
    tip.style.border = '1px solid rgba(255,255,255,.12)';
    tip.style.borderRadius = '10px';
    tip.style.padding = '8px 10px';
    tip.style.color = '#e5e7eb';
    tip.style.boxShadow = '0 12px 28px rgba(0,0,0,.45)';
    tip.style.fontSize = '.9rem';
  }

  function mount(root=document){
    const nodes = Array.from(root.querySelectorAll('[data-tip]'));
    nodes.forEach(el=>{
      let t=null;
      function show(){ if(t) return; t=createTip(el); }
      function hide(){ if(!t) return; t.remove(); t=null; }
      el.addEventListener('focus', show);
      el.addEventListener('mouseenter', show);
      el.addEventListener('blur', hide);
      el.addEventListener('mouseleave', hide);
      window.addEventListener('scroll', ()=>{ if(t) positionTip(t,el); }, { passive:true });
      window.addEventListener('resize', ()=>{ if(t) positionTip(t,el); });
    });
  }

  return { mount };
})();
