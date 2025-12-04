// assets/js/public.js
(function () {
  // --- Safe access to Shared -------------------------------------------------
  const S = (typeof window !== "undefined" && window.Shared) ? window.Shared : {};
  const readArticles = S.readArticles || function () {
    try { return JSON.parse(localStorage.getItem("articles") || "[]"); }
    catch { return []; }
  };
  const lastVersion = S.lastVersion || function (a) {
    return (a && a.versions || []).slice(-1)[0] || null;
  };

  // --- Helpers ---------------------------------------------------------------
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const fmt = (ts) => {
    const d = new Date(ts || Date.now());
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  // --- Reveal (dlaždice animace) --------------------------------------------
  function initReveal() {
    const nodes = $$('.reveal');
    if (!nodes.length) return;

    // pokud je k dispozici IntersectionObserver
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (e.isIntersecting) {
            e.target.classList.add('show');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      nodes.forEach(n=>io.observe(n));
      return;
    }

    // fallback (bez IO)
    setTimeout(()=>nodes.forEach(n=>n.classList.add('show')), 200);
  }

  // --- Public: Vydaná čísla --------------------------------------------------
  function renderIssues() {
    const host = $('#issuesList');
    if (!host) return; // tato stránka tu sekci nemá

    const all = readArticles();
    // publikované nebo přijato (kontrola top-level i v poslední verzi)
    const pubs = all.filter(a => {
      const st = (a.status) || (lastVersion(a) && lastVersion(a).status) || '';
      return st === 'Publikováno' || st === 'Přijato';
    });

    // group: issue label nebo YYYY–MM
    const byIssue = {};
    pubs.forEach(a => {
      const dt = a.publication?.publishedAt || a.updatedAt || a.createdAt || Date.now();
      const d = new Date(dt);
      const fallback = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const key = (a.publication?.issue) || fallback;
      (byIssue[key] ||= []).push(a);
    });

    const keys = Object.keys(byIssue).sort().reverse(); // nejnovější nahoře
    if (!keys.length) {
      host.innerHTML = `<div class="empty">Zatím nebyla publikována žádná čísla.</div>`;
      return;
    }

    host.innerHTML = keys.map(k=>{
      const items = byIssue[k]
        .sort((a,b)=>(b.publication?.publishedAt||b.updatedAt||0) - (a.publication?.publishedAt||a.updatedAt||0))
        .map(a=>{
          const v = lastVersion(a);
          const dl = v ? `<a class="btn btn-ghost btn-sm" href="${v.data}" download="${v.name||'clanek'}">Stáhnout</a>` : '';
          return `<tr>
            <td>${a.title||'—'}</td>
            <td>${a.authorName||a.author||'—'}</td>
            <td>${fmt(a.publication?.publishedAt || a.updatedAt || a.createdAt)}</td>
            <td class="row-actions">${dl}</td>
          </tr>`;
        }).join('');

      return `
        <section class="panel">
          <div class="panel-head"><h2>Číslo ${k}</h2></div>
          <table class="table">
            <thead><tr><th>Název</th><th>Autor</th><th>Datum</th><th>Akce</th></tr></thead>
            <tbody>${items}</tbody>
          </table>
        </section>
      `;
    }).join('');
  }

  // --- Init --------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function(){
    initReveal();    // dlaždice (help, index apod.)
    renderIssues();  // stránka public/cisla.html (pokud existuje)
  });
})();
