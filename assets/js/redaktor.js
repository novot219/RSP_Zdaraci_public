(function () {
  const {
    readArticles, writeArticles, fmtDate, fmtDateOnly, statusCode, showToast,
    lastVersion, readReviewers, pushNotification, daysUntil
  } = window.Shared;

  let SORT = { key: "updated", dir: "desc" };
  let FILTERS = { q: "", status: "" };
  let CURRENT_ID = null;

  // Přehled
  const rowsEl = document.getElementById("r-rows");
  const tableEl = document.getElementById("r-table");
  const emptyEl = document.getElementById("r-empty");

  // Filtry
  const qEl = document.getElementById("flt-q");
  const statusEl = document.getElementById("flt-status");
  const clearEl = document.getElementById("flt-clear");

  // Modal: detail
  const modal = document.getElementById("detailModal");
  const dTitle = document.getElementById("d-title");
  const dAuthor = document.getElementById("d-author");
  const dEmail = document.getElementById("d-email");
  const dStatus = document.getElementById("d-status");
  const dVersions = document.getElementById("d-versions");
  const dNotes = document.getElementById("d-notes");
  const dReason = document.getElementById("d-reason");
  const btnClose = document.getElementById("d-close");
  const btnReturn = document.getElementById("d-return");
  const btnAccept = document.getElementById("d-accept");
  const btnAssign = document.getElementById("d-assign");
  const btnSendToChief = document.getElementById("d-send-to-chief");
  const dReviews = document.getElementById("d-reviews");

  // Modal: assign
  const assignModal = document.getElementById("assignModal");
  const aReviewers = document.getElementById("a-reviewers");
  const aDue = document.getElementById("a-due");
  const aCancel = document.getElementById("a-cancel");
  const aSave = document.getElementById("a-save");
  
  // Modal: view review
  const viewReviewModal = document.getElementById("viewReviewModal");
  const vRevTitle = document.getElementById("v-rev-title");
  const vRevContent = document.getElementById("v-rev-content");
  const vRevClose = document.getElementById("v-rev-close");

  // Mapování
  const reviewStatusMap = {
    pending: "Čeká na přijetí",
    accepted: "Přijato recenzentem",
    declined: "Odmítnuto recenzentem",
    submitted: "Odevzdáno"
  };
  const recommendationMap = {
    accept: "Přijmout",
    minor: "Přijmout s drobnými úpravami",
    major: "Přepracovat",
    reject: "Odmítnout"
  };

  // --- Přehled / render ---
  function getFiltered() {
    const q = FILTERS.q.toLowerCase();
    const list = readArticles();
    return list
      .filter((a) => {
        if (FILTERS.status && (a.status || "") !== FILTERS.status) return false;
        if (!q) return true;
        const hay = (a.title || "") + " " + (a.coauthors || "") + " " + (a.contactEmail || "") + " " + (a.author || "");
        return hay.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const lastA = a.updatedAt || a.createdAt || 0;
        const lastB = b.updatedAt || b.createdAt || 0;
        switch (SORT.key) {
          case "title": return cmp(a.title || a.fileName || "", b.title || b.fileName || "");
          case "author": return cmp(a.author || "", b.author || "");
          case "status": return cmp(a.status || "", b.status || "");
          case "version": {
            const va = a.versions ? a.versions.length : 0;
            const vb = b.versions ? b.versions.length : 0;
            return cmp(va, vb);
          }
          case "updated":
          default: return cmp(lastA, lastB);
        }
      });
  }

  function cmp(a, b) {
    let r = a < b ? -1 : a > b ? 1 : 0;
    return SORT.dir === "asc" ? r : -r;
  }

  function render() {
    const data = getFiltered();
    if (!data.length) {
      tableEl.style.display = "none";
      emptyEl.style.display = "block";
      rowsEl.innerHTML = "";
      return;
    }
    emptyEl.style.display = "none";
    tableEl.style.display = "table";
    rowsEl.innerHTML = "";

    data.forEach((a) => {
      const authorLabel = (a.authorName || a.contactEmail || a.author || "—");
      const tr = document.createElement("tr");
      const last = lastVersion(a);
      const lastLabel = last ? last.label : "v1";
      const ts = a.updatedAt || a.createdAt || Date.now();
      const status = a.status || "Koncept";
      const badge = `<span class='badge' data-status='${statusCode(status)}'>${status}</span>`;

      tr.innerHTML =
        `<td>${a.title || a.fileName || "—"}</td>` +
        `<td>${authorLabel}</td>` +
        `<td>${badge}</td>` +
        `<td>${lastLabel}</td>` +
        `<td>${fmtDate(ts)}</td>` +
        `<td><div class='row-actions'>
           <button class='btn btn-primary' data-act='detail' data-id='${a.id}'>Detail / kontrola</button>
         </div></td>`;

      rowsEl.appendChild(tr);
    });

    rowsEl.querySelectorAll("[data-act='detail']").forEach((btn) => {
      btn.addEventListener("click", () => openDetail(btn.getAttribute("data-id")));
    });
  }

  // --- Detail / screening / rozhodnutí ---
  function openDetail(id) {
    CURRENT_ID = id;
    const all = readArticles();
    const art = all.find((x) => x.id === id);
    if (!art) return;

    dTitle.textContent = art.title || art.fileName || "—";
    dAuthor.textContent = (art.authorName || art.contactEmail || art.author || "—");
    dEmail.textContent = art.contactEmail || "—";
    const status = art.status || "Koncept";
    dStatus.textContent = status;
    dStatus.setAttribute("data-status", statusCode(status));

    // verze
    dVersions.innerHTML = "";
    (art.versions || []).slice().reverse().forEach((v) => {
      const a = document.createElement("a");
      a.href = v.data || "#";
      a.download = v.name || "soubor";
      a.textContent = `${v.label} — ${v.name} (${fmtDate(v.uploadedAt)})`;
      a.style.display = "block";
      dVersions.appendChild(a);
    });

    // checklist / poznámky
    document.querySelectorAll(".d-chk").forEach((el) => (el.checked = false));
    dNotes.value = "";
    dReason.value = "";
    if (art.screening && art.screening.checks) {
      const checks = art.screening.checks;
      document.querySelectorAll(".d-chk").forEach((el) => {
        const key = el.getAttribute("data-key");
        if (key in checks) el.checked = !!checks[key];
      });
      dNotes.value = art.screening.notes || "";
    }

    renderReviews(art);

    // Povolení tlačítek dle stavu
    const allowScreening = status === "Čeká na kontrolu";
    btnAccept.disabled = !allowScreening;
    btnReturn.disabled = !allowScreening;

    // Tlačítka recenzí
    const inReview = ["V recenzi", "K rozhodnutí", "Odložen"].includes(status);
    btnAssign.disabled = !inReview;
    btnSendToChief.disabled = status !== "V recenzi" && status !== "K rozhodnutí";

    modal.style.display = "flex";
  }

  function renderReviews(art) {
    const list = Array.isArray(art.reviews) ? art.reviews : [];
    if (!list.length) { dReviews.textContent = "—"; return; }

    dReviews.innerHTML = ""; // Vyčistit
    
    list.forEach((r, idx) => {
      const row = document.createElement("div");
      row.className = "review-item";
      
      const status = r.status || "pending";
      const dueStr = r.dueAt ? fmtDateOnly(r.dueAt) : "—";
      const days = daysUntil(r.dueAt);
      
      let statusLabel = reviewStatusMap[status] || status;
      if (status === 'pending' || status === 'accepted') {
         if (days < 0) statusLabel += ` <span class='badge' data-status='rejected'>(Po termínu)</span>`;
      }
      
      let actions = "";
      if (status === 'submitted') {
        actions = `<button class='btn btn-ghost btn-sm' data-act='view-review' data-idx='${idx}'>Zobrazit posudek</button>`;
      }
      // (US-1) Odmítnutí vrací redaktorovi -> redaktor může přiřadit znovu (tlačítko d-assign)
      if (status === 'declined') {
        statusLabel = `<span style="color:var(--danger);">${statusLabel}</span>`;
      }

      row.innerHTML =
        `<div><strong>${r.reviewer}</strong></div>
         <div>Stav: ${statusLabel}</div>
         <div>Termín: ${dueStr}</div>
         <div class="review-actions">${actions}</div>`;

      dReviews.appendChild(row);
    });
    
    // Listenery pro zobrazení posudku
    dReviews.querySelectorAll("[data-act='view-review']").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx, 10);
        showSubmittedReview(art, idx);
      });
    });
  }
  
  // Zobrazení odevzdaného posudku
  function showSubmittedReview(art, reviewIndex) {
    const review = art.reviews[reviewIndex];
    if (!review || !review.reviewData) {
      showToast("Data posudku nenalezena.", true); return;
    }
    const data = review.reviewData;
    vRevTitle.textContent = `Posudek od: ${review.reviewer}`;
    vRevContent.innerHTML = `
      <p><strong>Doporučení:</strong> ${recommendationMap[data.recommendation] || data.recommendation}</p>
      <p><strong>Souhrn:</strong> ${data.summary || "—"}</p>
      <p><strong>Silné stránky:</strong> ${data.strengths || "—"}</p>
      <p><strong>Slabé stránky:</strong> ${data.weaknesses || "—"}</p>
      <p><strong>Komentář pro redakci:</strong> ${data.comments || "—"}</p>
    `;
    viewReviewModal.style.display = "flex";
  }
  
  vRevClose.addEventListener("click", () => viewReviewModal.style.display = "none");
  viewReviewModal.addEventListener("click", (e) => { if (e.target === viewReviewModal) viewReviewModal.style.display = "none"; });


  function closeDetail() {
    modal.style.display = "none";
    CURRENT_ID = null;
  }

  // --- Rozhodnutí tlačítka ---
  btnClose.addEventListener("click", closeDetail);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeDetail(); });

  btnReturn.addEventListener("click", function () {
    if (!CURRENT_ID) return;
    const reason = (dReason.value || "").trim();
    if (!reason) { showToast("Při vrácení k úpravě je důvod povinný.", true); return; }
    updateScreeningAndStatus(CURRENT_ID, "Vráceno k úpravě", reason, "returned");
    notifyAuthor(CURRENT_ID, "Článek vrácen k úpravě: " + reason);
    showToast("Článek vrácen autorovi k úpravě."); closeDetail(); render();
  });

  btnAccept.addEventListener("click", function () {
    if (!CURRENT_ID) return;
    const note = dReason.value.trim();
    updateScreeningAndStatus(CURRENT_ID, "V recenzi", note, "screening_pass");
    notifyAuthor(CURRENT_ID, "Článek byl zařazen do recenzního řízení.");
    showToast("Článek přesunut do recenzního řízení."); closeDetail(); render();
  });

  // (US-4) Finální rozhodnutí dělá šéfredaktor. Redaktor pouze posouvá.
  btnSendToChief.addEventListener("click", function () {
    if (!CURRENT_ID) return;
    const all = readArticles();
    const art = all.find((x) => x.id === CURRENT_ID);
    if (!art) return;
    
    // Změna stavu na "K rozhodnutí"
    art.status = "K rozhodnutí";
    art.statusChangedAt = Date.now();
    art.updatedAt = Date.now();
    
    if (!Array.isArray(art.decisions)) art.decisions = [];
    art.decisions.push({ type: "sent_to_chief", by: readSessionUser(), at: Date.now() });
    
    pushNotification(art, "sefredaktor", `Článek "${art.title}" byl postoupen k finálnímu rozhodnutí.`, { type: "ready_for_decision" });
    
    writeArticles(all);
    showToast("Článek postoupen šéfredaktorovi.");
    closeDetail();
    render();
  });


  function updateScreeningAndStatus(id, newStatus, reason, decisionType) {
    const all = readArticles();
    const art = all.find((x) => x.id === id);
    if (!art) return;

    const checks = {};
    document.querySelectorAll(".d-chk").forEach((el) => {
      checks[el.getAttribute("data-key")] = !!el.checked;
    });

    const user = readSessionUser();
    const now = Date.now();

    art.screening = {
      checkedBy: user, checkedAt: now,
      notes: (document.getElementById("d-notes").value || "").trim(),
      reason: reason || "", checks
    };

    art.status = newStatus;
    art.statusChangedAt = now;
    art.updatedAt = now;

    if (!Array.isArray(art.decisions)) art.decisions = [];
    art.decisions.push({ type: decisionType, by: user, at: now, reason: reason || "" });

    writeArticles(all);
  }

  function notifyAuthor(id, message) {
    const all = readArticles();
    const art = all.find((x) => x.id === id);
    if (!art) return;
    pushNotification(art, art.author, message, { type: "author_notice" });
    writeArticles(all);
  }

  function readSessionUser() {
    try {
      const raw = sessionStorage.getItem("session.user");
      return raw ? JSON.parse(raw).username : "redaktor";
    } catch { return "redaktor"; }
  }

  // --- Přiřazení recenzentů / úprava termínu (modal) ---
  btnAssign.addEventListener("click", openAssign);
  aCancel.addEventListener("click", () => (assignModal.style.display = "none"));

  function openAssign() {
    // naplnit seznam recenzentů
    const list = readReviewers();
    aReviewers.innerHTML = "";
    list.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name || r.id;
      aReviewers.appendChild(opt);
    });
    // default due = +14 dní
    const dt = new Date(); dt.setDate(dt.getDate() + 14);
    aDue.value = dt.toISOString().slice(0, 10);
    assignModal.style.display = "flex";
  }

  aSave.addEventListener("click", function () {
    if (!CURRENT_ID) return;
    const selected = Array.from(aReviewers.selectedOptions).map((o) => o.value);
    const due = aDue.value ? new Date(aDue.value).getTime() : null;
    if (!due || isNaN(due)) { showToast("Zadej platný termín.", true); return; }

    const all = readArticles();
    const art = all.find((x) => x.id === CURRENT_ID);
    if (!art) return;

    if (!Array.isArray(art.reviews)) art.reviews = [];
    const now = Date.now();
    let assignedNew = false;

    if (selected.length) {
      if (selected.length > 2) { showToast("Vyber max. 2 nové recenzenty.", true); return; }
      selected.forEach((rid) => {
        // Přiřaď jen pokud tam ještě není (nebo pokud odmítl)
        const existing = art.reviews.find(r => r.reviewer === rid);
        if (!existing || existing.status === 'declined') {
          // Pokud odmítl, přepíšeme starý záznam. Jinak přidáme nový.
          const target = (existing && existing.status === 'declined') ? existing : null;
          
          if (target) {
            target.status = "pending";
            target.assignedAt = now;
            target.dueAt = due;
            target.reminders = [];
            target.reviewData = null; // Vyčistit starý posudek, pokud by tam byl
          } else {
             art.reviews.push({
              reviewer: rid, assignedAt: now, dueAt: due, status: "pending", reminders: []
            });
          }
          pushNotification(art, rid, `Byl vám přiřazen článek. Termín: ${fmtDateOnly(due)}`, { type: "assign" });
          assignedNew = true;
        }
      });
      if (art.status !== "V recenzi") art.status = "V recenzi";
      art.updatedAt = now; art.statusChangedAt = now;
      if (assignedNew) {
        if (!Array.isArray(art.decisions)) art.decisions = [];
        art.decisions.push({ type: "assigned_reviewers", by: readSessionUser(), at: now, reviewers: selected });
      }
    } else {
      // režim „jen upravit termín“ všem aktivním recenzím
      let updated = false;
      art.reviews.forEach((r) => {
        if (r.status === "pending" || r.status === "accepted") {
           r.dueAt = due;
           updated = true;
        }
      });
      if(updated) {
        pushNotification(art, art.author, `Aktualizován termín recenzí na ${fmtDateOnly(due)}.`, { type: "due_updated" });
        art.updatedAt = now;
      }
    }

    writeArticles(all);
    showToast("Uloženo."); assignModal.style.display = "none";
    renderReviews(art);
  });
  
  // --- Automatické upomínky 3 dny před deadlinem ---
  function scanAndRemind() {
    const all = readArticles();
    let changed = false;
    const now = Date.now();
    all.forEach((art) => {
      if (!Array.isArray(art.reviews)) return;
      art.reviews.forEach((r) => {
        if (!r.dueAt || (r.status !== "pending" && r.status !== "accepted")) return;
        const days = daysUntil(r.dueAt);
        if (days === null) return;
        
        const hasAuto = Array.isArray(r.reminders) && r.reminders.some((x) => x.type === "auto_3d");
        
        if (days <= 3 && days >= 0 && !hasAuto) {
          if (!Array.isArray(r.reminders)) r.reminders = [];
          r.reminders.push({ type: "auto_3d", at: now });
          pushNotification(art, r.reviewer, `Připomínka: recenze má termín ${fmtDateOnly(r.dueAt)} (za ${days} dny).`, { type: "auto_reminder" });
          changed = true;
        }
      });
    });
    if (changed) writeArticles(all);
  }

  // --- Události filtrů & sortů ---
  qEl.addEventListener("input", () => { FILTERS.q = qEl.value; render(); });
  statusEl.addEventListener("change", () => { FILTERS.status = statusEl.value; render(); });
  clearEl.addEventListener("click", () => {
    FILTERS = { q: "", status: "" };
    qEl.value = "";
    statusEl.value = "";
    render();
  });

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (SORT.key === key) SORT.dir = SORT.dir === "asc" ? "desc" : "asc";
      else { SORT.key = key; SORT.dir = key === "updated" ? "desc" : "asc"; }
      render();
    });
  });

  // Init – vykreslit a spustit plánovač připomínek (kontrola každou minutu)
  document.addEventListener("DOMContentLoaded", () => {
    render();
    scanAndRemind();
    setInterval(scanAndRemind, 60 * 1000);
  });
})();
