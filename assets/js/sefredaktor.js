(function () {
  const {
    readArticles, writeArticles, fmtDate, fmtDateOnly, statusCode, showToast,
    lastVersion, pushNotification
  } = window.Shared;

  let FILTERS = { status: "K rozhodnutí" };
  let CURRENT_ID = null;

  // Přehled
  const rowsEl = document.getElementById("r-rows");
  const tableEl = document.getElementById("r-table");
  const emptyEl = document.getElementById("r-empty");
  const statusEl = document.getElementById("flt-status");

  // Modal: rozhodnutí
  const modal = document.getElementById("decisionModal");
  const dTitle = document.getElementById("d-title");
  const dAuthor = document.getElementById("d-author");
  const dEmail = document.getElementById("d-email");
  const dStatus = document.getElementById("d-status");
  const dVersions = document.getElementById("d-versions");
  const dReviewsSummary = document.getElementById("d-reviews-summary");
  const dReviewsList = document.getElementById("d-reviews-list");
  const dReason = document.getElementById("d-reason");

  const btnClose = document.getElementById("d-close");
  const btnReturn = document.getElementById("d-return");
  const btnReject = document.getElementById("d-reject");
  const btnAccept = document.getElementById("d-accept");

  // --- Mapování doporučení ---
  const recommendationMap = {
    accept: "Přijmout",
    minor: "Přijmout s drobnými úpravami",
    major: "Přepracovat",
    reject: "Odmítnout"
  };

  // --- Načtení session ---
  function readSessionUser() {
    try {
      const raw = sessionStorage.getItem("session.user");
      return raw ? JSON.parse(raw).username : "sefredaktor";
    } catch { return "sefredaktor"; }
  }

  // --- Přehled / render ---
  function getFiltered() {
    const list = readArticles();
    // Šéfredaktor vidí články, které jsou "V recenzi" nebo "K rozhodnutí" + finální stavy
    const relevantStatuses = ["V recenzi", "K rozhodnutí", "Přijato", "Odmítnuto", "Vráceno k úpravě"];
    
    return list
      .filter((a) => {
        const status = a.status || "Koncept";
        if (!relevantStatuses.includes(status)) return false;
        if (FILTERS.status && status !== FILTERS.status) return false;
        return true;
      })
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
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
      const tr = document.createElement("tr");
      const ts = a.updatedAt || a.createdAt || Date.now();
      const status = a.status || "Koncept";
      
      const badge = `<span class='badge' data-status='${statusCode(status)}'>${status}</span>`;

      // Souhrn posudků
      const reviews = Array.isArray(a.reviews) ? a.reviews : [];
      const submitted = reviews.filter(r => r.status === 'submitted').length;
      const assigned = reviews.filter(r => r.status === 'pending' || r.status === 'accepted').length;
      const declined = reviews.filter(r => r.status === 'declined').length;
      const reviewsSummary = `Hotovo: ${submitted} / Zpracovává se: ${assigned} / Odmítnuto: ${declined}`;

      tr.innerHTML =
        `<td>${a.title || a.fileName || "—"}</td>` +
        `<td>${a.contactEmail || a.author || "—"}</td>` +
        `<td>${badge}</td>` +
        `<td>${reviewsSummary}</td>` +
        `<td>${fmtDate(ts)}</td>` +
        `<td><div class='row-actions'>
           <button class='btn btn-primary' data-act='detail' data-id='${a.id}'>Detail / Rozhodnutí</button>
         </div></td>`;

      rowsEl.appendChild(tr);
    });

    rowsEl.querySelectorAll("[data-act='detail']").forEach((btn) => {
      btn.addEventListener("click", () => openDecisionModal(btn.getAttribute("data-id")));
    });
  }

  // --- Modal: Rozhodnutí ---
  function openDecisionModal(id) {
    CURRENT_ID = id;
    const all = readArticles();
    const art = all.find((x) => x.id === id);
    if (!art) return;

    dTitle.textContent = art.title || art.fileName || "—";
    dAuthor.textContent = art.contactEmail || art.author || "—";
    dEmail.textContent = art.contactEmail || "—";
    dStatus.textContent = art.status || "Koncept";
    dStatus.setAttribute("data-status", statusCode(art.status || "Koncept"));

    // Verze ke stažení
    dVersions.innerHTML = "";
    const v = lastVersion(art);
    if (v) {
      const a = document.createElement("a");
      a.href = v.data || "#";
      a.download = v.name || "soubor";
      a.textContent = `${v.label} — ${v.name} (${fmtDate(v.uploadedAt)})`;
      a.style.display = "block";
      dVersions.appendChild(a);
    } else {
      dVersions.textContent = "Žádný soubor nenalezen.";
    }

    // Načtení posudků
    renderSubmittedReviews(art);
    
    // Vyčištění formuláře
    dReason.value = "";

    // Povolení tlačítek
    const canDecide = art.status === "K rozhodnutí" || art.status === "V recenzi";
    btnReturn.disabled = !canDecide;
    btnReject.disabled = !canDecide;
    btnAccept.disabled = !canDecide;

    modal.style.display = "flex";
  }

  function renderSubmittedReviews(art) {
    const list = (Array.isArray(art.reviews) ? art.reviews : [])
      .filter(r => r.status === 'submitted' && r.reviewData);
      
    if (!list.length) {
      dReviewsSummary.style.display = "block";
      dReviewsList.style.display = "none";
      return;
    }

    dReviewsSummary.style.display = "none";
    dReviewsList.style.display = "block";
    dReviewsList.innerHTML = "";

    list.forEach((r, idx) => {
      const data = r.reviewData;
      const el = document.createElement("div");
      el.className = "review-display";
      el.innerHTML = `
        <h4>Posudek #${idx + 1} (Recenzent: ${r.reviewer})</h4>
        <p><strong>Doporučení:</strong> ${recommendationMap[data.recommendation] || data.recommendation}</p>
        <p><strong>Souhrn:</strong> ${data.summary || "—"}</p>
        <p><strong>Silné stránky:</strong> ${data.strengths || "—"}</p>
        <p><strong>Slabé stránky:</strong> ${data.weaknesses || "—"}</p>
        <p><strong>Komentář pro redakci:</strong> ${data.comments || "—"}</p>
      `;
      dReviewsList.appendChild(el);
    });
  }

  function closeDecisionModal() {
    modal.style.display = "none";
    CURRENT_ID = null;
  }

  // --- Akce Rozhodnutí ---
  btnClose.addEventListener("click", closeDecisionModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeDecisionModal(); });

  btnReturn.addEventListener("click", () => handleDecision("Vráceno k úpravě", "returned"));
  btnReject.addEventListener("click", () => handleDecision("Odmítnuto", "rejected"));
  btnAccept.addEventListener("click", () => handleDecision("Přijato", "accepted"));

  function handleDecision(newStatus, decisionType) {
    if (!CURRENT_ID) return;
    const reason = dReason.value.trim();

    if ((decisionType === 'rejected' || decisionType === 'returned') && !reason) {
      showToast("Pro odmítnutí nebo vrácení je zdůvodnění povinné.", true);
      return;
    }

    const all = readArticles();
    const art = all.find((x) => x.id === CURRENT_ID);
    if (!art) return;

    const user = readSessionUser();
    const now = Date.now();

    art.status = newStatus;
    art.statusChangedAt = now;
    art.updatedAt = now;

    if (!Array.isArray(art.decisions)) art.decisions = [];
    art.decisions.push({
      type: decisionType,
      by: user,
      at: now,
      reason: reason || (newStatus === "Přijato" ? "Článek byl přijat k publikaci." : "N/A")
    });

    let notifyMsg = "";
    if (newStatus === "Přijato") {
      notifyMsg = `Váš článek "${art.title}" byl přijat k publikaci. ${reason}`;
    } else if (newStatus === "Odmítnuto") {
      notifyMsg = `Váš článek "${art.title}" byl odmítnut. Zdůvodnění: ${reason}`;
    } else if (newStatus === "Vráceno k úpravě") {
      notifyMsg = `Váš článek "${art.title}" byl vrácen k úpravě. Pokyny: ${reason}`;
    }
    pushNotification(art, art.author, notifyMsg, { type: "final_decision", decision: newStatus });

    writeArticles(all);
    showToast(`Článek byl ${newStatus.toLowerCase()}. Autor informován.`);
    closeDecisionModal();
    render();
  }


  // --- Filtry ---
  statusEl.addEventListener("change", () => {
    FILTERS.status = statusEl.value;
    render();
  });
  
  // --- Inicializace ---
  document.addEventListener("DOMContentLoaded", () => {
    statusEl.value = FILTERS.status; // Nastavíme výchozí filtr v UI
    render();
  });
})();
