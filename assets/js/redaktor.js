

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
  const btnMarkAccepted = document.getElementById("d-mark-accepted");
  const btnMarkRejected = document.getElementById("d-mark-rejected");
  const btnMarkPostponed = document.getElementById("d-mark-postponed");
  const dReviews = document.getElementById("d-reviews");

  // Modal: assign
  const assignModal = document.getElementById("assignModal");
  const aReviewers = document.getElementById("a-reviewers");
  const aDue = document.getElementById("a-due");
  const aCancel = document.getElementById("a-cancel");
  const aSave = document.getElementById("a-save");

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
    const authorLabel =
  (a.authorName && a.authorName.trim()) ||   // kdyby někdy existovalo skutečné jméno
  (a.contactEmail && a.contactEmail.trim()) || // ← použij e-mail
  a.author || "—";


    const tr = document.createElement("tr");
    const last = lastVersion(a);
    const lastLabel = last ? last.label : "v1";
    const ts = a.updatedAt || a.createdAt || Date.now();

    const badge =
      "<span class='badge' data-status='" +
      statusCode(a.status || "Koncept") +
      "'>" +
      (a.status || "Koncept") +
      "</span>";

    tr.innerHTML =
      "<td>" + (a.title || a.fileName || "—") + "</td>" +
      "<td>" + authorLabel + "</td>" +
      "<td>" + badge + "</td>" +
      "<td>" + lastLabel + "</td>" +
      "<td>" + fmtDate(ts) + "</td>" +
      "<td><div class='row-actions'>" +
      "<button class='btn btn-primary' data-act='detail' data-id='" + a.id + "'>Detail / kontrola</button>" +
      "</div></td>";

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
    dAuthor.textContent =
  (art.authorName && art.authorName.trim()) ||
  (art.contactEmail && art.contactEmail.trim()) ||  // ← e-mail
  art.author || "—";

    art.author || "—";
    dEmail.textContent = art.contactEmail || "—";
    dStatus.textContent = art.status || "Koncept";
    dStatus.setAttribute("data-status", statusCode(art.status || "Koncept"));

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
    const st = art.status || "Koncept";
    const allowScreening = st === "Čeká na kontrolu" || st === "Vráceno k úpravě";
    btnAccept.disabled = !allowScreening;
    btnReturn.disabled = !allowScreening;

    // Přiřazení recenzentů dostupné pro "V recenzi" a "Odložen"
    btnAssign.disabled = !(st === "V recenzi" || st === "Odložen");

    modal.style.display = "flex";
  }

  function renderReviews(art) {
    const list = Array.isArray(art.reviews) ? art.reviews : [];
    if (!list.length) { dReviews.textContent = "—"; return; }

    const wrap = document.createElement("div");
    list.forEach((r, idx) => {
      const row = document.createElement("div");
      const overdue = r.dueAt && Date.now() > r.dueAt && (r.status || "pending") === "pending";
      const dueStr = r.dueAt ? fmtDateOnly(r.dueAt) : "—";
      const days = r.dueAt ? daysUntil(r.dueAt) : null;

      row.innerHTML =
        `${r.reviewer} • stav: ${r.status || "pending"} • termín: ${dueStr}` +
        (overdue ? " <span class='badge' data-status='rejected'>po termínu</span>" :
         (days !== null && days <= 3 ? " <span class='badge' data-status='queued'>blíží se termín</span>" : ""));

      // Inline akce: upravit termín
      const btn = document.createElement("button");
      btn.className = "btn btn-ghost";
      btn.textContent = "Upravit termín";
      btn.style.marginLeft = "8px";

      const inp = document.createElement("input");
      inp.type = "date";
      inp.className = "input";
      inp.style.marginLeft = "8px";
      inp.value = r.dueAt ? fmtDateOnly(r.dueAt) : "";

      const save = document.createElement("button");
      save.className = "btn btn-primary";
      save.textContent = "Uložit";
      save.style.marginLeft = "6px";
      save.style.display = "none";

      btn.addEventListener("click", () => {
        save.style.display = "inline-block";
        inp.focus();
      });

      save.addEventListener("click", () => {
        const v = inp.value ? new Date(inp.value).getTime() : NaN;
        if (!v || isNaN(v)) { showToast("Zadej platný termín.", true); return; }
        updateDueDate(art.id, idx, v);
      });

      row.appendChild(btn);
      row.appendChild(inp);
      row.appendChild(save);
      wrap.appendChild(row);
    });

    dReviews.innerHTML = "";
    dReviews.appendChild(wrap);
  }

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

  btnMarkAccepted.addEventListener("click", function () {
    if (!CURRENT_ID) return;
    const note = dReason.value.trim();
    changeFinalDecision(CURRENT_ID, "Přijato", note, "accepted");
    notifyAuthor(CURRENT_ID, "Článek byl přijat. " + (note || ""));
    showToast("Stav změněn na „Přijato“."); closeDetail(); render();
  });

  btnMarkRejected.addEventListener("click", function () {
    if (!CURRENT_ID) return;
    const reason = (dReason.value || "").trim();
    if (!reason) { showToast("Při odmítnutí uveď důvod.", true); return; }
    changeFinalDecision(CURRENT_ID, "Odmítnuto", reason, "rejected");
    notifyAuthor(CURRENT_ID, "Článek byl odmítnut: " + reason);
    showToast("Stav změněn na „Odmítnuto“."); closeDetail(); render();
  });

  btnMarkPostponed.addEventListener("click", function () {
    if (!CURRENT_ID) return;
    const note = dReason.value.trim();
    changeFinalDecision(CURRENT_ID, "Odložen", note, "postponed");
    notifyAuthor(CURRENT_ID, "Článek byl dočasně odložen. " + (note || ""));
    showToast("Stav změněn na „Odložen“."); closeDetail(); render();
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

  function changeFinalDecision(id, status, reason, decisionType) {
    const all = readArticles();
    const art = all.find((x) => x.id === id);
    if (!art) return;

    const user = readSessionUser();
    const now = Date.now();

    art.status = status;
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

    if (selected.length) {
      // nové přiřazení 1–2 recenzentů
      if (selected.length > 2) { showToast("Vyber 1–2 recenzenty.", true); return; }
      selected.forEach((rid) => {
        if (art.reviews.some((r) => r.reviewer === rid && r.status !== "declined")) return;
        art.reviews.push({
          reviewer: rid, assignedAt: now, dueAt: due, status: "pending", reminders: []
        });
        pushNotification(art, rid, `Byl vám přiřazen článek. Termín: ${fmtDateOnly(due)}`, { type: "assign" });
      });
      if (art.status !== "V recenzi") art.status = "V recenzi";
      art.updatedAt = now; art.statusChangedAt = now;
      if (!Array.isArray(art.decisions)) art.decisions = [];
      art.decisions.push({ type: "assigned_reviewers", by: readSessionUser(), at: now, reviewers: selected });
    } else {
      // režim „jen upravit termín“ všem pending recenzím
      art.reviews.forEach((r) => {
        if (r.status === "pending") r.dueAt = due;
      });
      pushNotification(art, art.author, `Aktualizován termín recenzí na ${fmtDateOnly(due)}.`, { type: "due_updated" });
      art.updatedAt = now;
    }

    writeArticles(all);
    showToast("Uloženo."); assignModal.style.display = "none";
    renderReviews(art);
  });

  function updateDueDate(articleId, reviewIndex, newDueTs) {
    const all = readArticles();
    const art = all.find((x) => x.id === articleId);
    if (!art || !Array.isArray(art.reviews) || !art.reviews[reviewIndex]) return;

    const r = art.reviews[reviewIndex];
    r.dueAt = newDueTs;
    const now = Date.now();
    art.updatedAt = now;

    if (!Array.isArray(art.decisions)) art.decisions = [];
    art.decisions.push({ type: "due_updated", by: readSessionUser(), at: now, reviewer: r.reviewer, dueAt: newDueTs });

    pushNotification(art, r.reviewer, `Aktualizován termín posudku na ${fmtDateOnly(newDueTs)}.`, { type: "due_updated" });
    pushNotification(art, art.author, `Aktualizován termín recenze na ${fmtDateOnly(newDueTs)} (recenzent: ${r.reviewer}).`, { type: "due_updated" });

    writeArticles(all);
    showToast("Termín upraven.");
    renderReviews(art);
  }

  // --- Automatické upomínky 3 dny před deadlinem ---
  function scanAndRemind() {
    const all = readArticles();
    let changed = false;
    const now = Date.now();
    all.forEach((art) => {
      if (!Array.isArray(art.reviews)) return;
      art.reviews.forEach((r) => {
        if (!r.dueAt || r.status !== "pending") return;
        const days = daysUntil(r.dueAt);
        // už posláno auto upozornění?
        const hasAuto =
          Array.isArray(r.reminders) &&
          r.reminders.some((x) => x.type === "auto_3d");
        if (days <= 3 && days >= 0 && !hasAuto) {
          if (!Array.isArray(r.reminders)) r.reminders = [];
          r.reminders.push({ type: "auto_3d", at: now });
          pushNotification(art, r.reviewer, `Připomínka: recenze má termín ${fmtDateOnly(r.dueAt)} (za ${days} dny).`, { type: "auto_reminder" });
          pushNotification(art, art.author, `Připomínka: recenze k vašemu článku má termín ${fmtDateOnly(r.dueAt)}.`, { type: "auto_reminder" });
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
