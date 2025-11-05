(function () {
  const {
    readArticles, writeArticles, fmtDateOnly, showToast, lastVersion,
    pushNotification, daysUntil
  } = window.Shared;

  let CURRENT_USER = null;
  let CURRENT_ID = null; // ID článku v modalu

  // Přehled
  const rowsEl = document.getElementById("r-rows");
  const tableEl = document.getElementById("r-table");
  const emptyEl = document.getElementById("r-empty");

  // Modal: posudek
  const modal = document.getElementById("reviewModal");
  // ... (elementy modalu) ...
  const vTitle = document.getElementById("v-title");
  const vDownload = document.getElementById("v-download");
  const vSummary = document.getElementById("v-summary");
  const vStrengths = document.getElementById("v-strengths");
  const vWeaknesses = document.getElementById("v-weaknesses");
  const vRecommendation = document.getElementById("v-recommendation");
  const vComments = document.getElementById("v-comments");
  const vCancel = document.getElementById("v-cancel");
  const vSaveDraft = document.getElementById("v-save-draft");
  const vSubmit = document.getElementById("v-submit");

  // --- Mapování stavů ---
  const statusMap = {
    pending: "Čeká na přijetí",
    accepted: "Přijato (zpracovává se)",
    declined: "Odmítnuto",
    submitted: "Odevzdáno"
  };

  // --- Načtení session ---
  function readSessionUser() {
    try {
      const raw = sessionStorage.getItem("session.user");
      if (!raw) { window.location.replace("../index.html"); return null; }
      return JSON.parse(raw).username;
    } catch { return null; }
  }

  // --- Přehled / render ---
  function getMyTasks() {
    // --- PŘIDÁNO LADĚNÍ ---
    console.log("--- Spouštím getMyTasks ---");
    console.log("Hledám úkoly pro CURRENT_USER:", CURRENT_USER);

    const all = readArticles();
    console.log("Nalezeno celkem článků v localStorage:", all.length);
    const myTasks = [];

    all.forEach((art, index) => {
      if (Array.isArray(art.reviews)) {
        const myReview = art.reviews.find(r => r.reviewer === CURRENT_USER);
        if (myReview) {
          console.log(`%c[MATCH FOUND] Článek: "${art.title}"`, "color: #4CAF50; font-weight: bold;");
          console.log("   -> Můj záznam recenze:", myReview);
          myTasks.push({
            id: art.id,
            title: art.title || art.fileName,
            review: myReview
          });
        } else {
          // Volitelné: vypíše články, které *nejsou* pro mě, ale mají recenzenty
          const reviewers = art.reviews.map(r => r.reviewer);
          if (reviewers.length > 0) {
            console.log(`[NO MATCH] Článek: "${art.title}" (Přiřazeno: ${reviewers.join(", ")})`);
          }
        }
      } else if (index === 0) {
         // Vypíše jen u prvního, pokud nemá pole reviews
         console.log(`Článek "${art.title}" nemá inicializované pole 'reviews'.`);
      }
    });

    console.log("--- Dokončeno getMyTasks ---");
    console.log("Nalezeno úkolů pro mě:", myTasks.length);
    // --- KONEC LADĚNÍ ---

    return myTasks.sort((a, b) => (b.review.assignedAt || 0) - (a.review.assignedAt || 0));
  }

  function render() {
    const tasks = getMyTasks();
    if (!tasks.length) {
      tableEl.style.display = "none";
      emptyEl.style.display = "block";
      rowsEl.innerHTML = "";
      return;
    }
    emptyEl.style.display = "none";
    tableEl.style.display = "table";
    rowsEl.innerHTML = "";

    tasks.forEach((task) => {
      const tr = document.createElement("tr");
      const r = task.review;
      const status = r.status || "pending";
      
      const due = r.dueAt ? fmtDateOnly(r.dueAt) : "—";
      const days = daysUntil(r.dueAt);
      let dueLabel = due;
      if (status === 'pending' || status === 'accepted') {
         // Oprava překlepu: class'badge' -> class='badge'
         if (days === 0) dueLabel += ` <span class='badge' data-status='revisions'>(Dnes)</span>`;
         else if (days < 0) dueLabel += ` <span class='badge' data-status='rejected'>(Po termínu!)</span>`;
         else if (days <= 3) dueLabel += ` <span class='badge' data-status='queued'>(${days} dny)</span>`;
      }

      // Akce
      let actions = "";
      if (status === 'pending') {
        actions = 
          `<button class='btn btn-primary' data-act='accept' data-id='${task.id}'>Přijmout</button>
           <button class='btn btn-danger' data-act='decline' data-id='${task.id}'>Odmítnout</button>`;
      } else if (status === 'accepted') {
        actions = 
          `<button class='btn btn-primary' data-act='review' data-id='${task.id}'>Zpracovat posudek</button>`;
      } else if (status === 'submitted') {
         actions = `<button class='btn btn-ghost' data-act='review' data-id='${task.id}'>Zobrazit odevzdané</button>`;
      } else {
        actions = "—";
      }

      tr.innerHTML =
        `<td>${task.title}</td>` +
        `<td>${statusMap[status] || status}</td>` +
        `<td>${dueLabel}</td>` +
        `<td><div class='row-actions'>${actions}</div></td>`;
      rowsEl.appendChild(tr);
    });

    // Event listenery pro tlačítka
    rowsEl.querySelectorAll("[data-act='accept']").forEach(btn => 
      btn.addEventListener("click", () => updateReviewStatus(btn.dataset.id, "accepted"))
    );
    rowsEl.querySelectorAll("[data-act='decline']").forEach(btn => 
      btn.addEventListener("click", () => updateReviewStatus(btn.dataset.id, "declined"))
    );
    rowsEl.querySelectorAll("[data-act='review']").forEach(btn => 
      btn.addEventListener("click", () => openReviewModal(btn.dataset.id))
    );
  }

  // (US-1) Přijetí / Odmítnutí
  function updateReviewStatus(articleId, newStatus) {
    const all = readArticles();
    const art = all.find(x => x.id === articleId);
    if (!art || !art.reviews) return;
    
    const review = art.reviews.find(r => r.reviewer === CURRENT_USER);
    if (!review) return;

    review.status = newStatus;
    review.statusAt = Date.now();
    art.updatedAt = Date.now();

    // (US-1) Při odmítnutí se vrací redaktorovi
    if (newStatus === 'declined') {
      pushNotification(art, "redaktor", `Recenzent ${CURRENT_USER} odmítl recenzi článku "${art.title}".`, { type: "review_declined" });
      pushNotification(art, "sefredaktor", `Recenzent ${CURRENT_USER} odmítl recenzi článku "${art.title}".`, { type: "review_declined" });
    } else if (newStatus === 'accepted') {
      pushNotification(art, "redaktor", `Recenzent ${CURRENT_USER} přijal recenzi.`, { type: "review_accepted" });
    }

    writeArticles(all);
    showToast(`Stav recenze aktualizován na: ${statusMap[newStatus]}`);
    render();
  }

  // (US-2) Otevření modalu posudku
  function openReviewModal(id) {
    CURRENT_ID = id;
    const all = readArticles();
    const art = all.find((x) => x.id === id);
    if (!art) return;
    
    const review = art.reviews.find(r => r.reviewer === CURRENT_USER);
    if (!review) return;

    vTitle.textContent = art.title || "—";

    // (US-2) Stažení článku
    vDownload.innerHTML = "";
    const v = lastVersion(art);
    if (v) {
      const a = document.createElement("a");
      a.href = v.data || "#";
      a.download = v.name || "soubor";
      a.textContent = `Stáhnout: ${v.label} — ${v.name}`;
      vDownload.appendChild(a);
    } else {
      vDownload.textContent = "Nelze stáhnout soubor.";
    }

    // Načtení uložených dat posudku
    const data = review.reviewData || {};
    vSummary.value = data.summary || "";
    vStrengths.value = data.strengths || "";
    vWeaknesses.value = data.weaknesses || "";
    vRecommendation.value = data.recommendation || "";
    vComments.value = data.comments || "";

    // (US-2) Odeslání posudku - tlačítka
    if (review.status === 'submitted') {
      vSaveDraft.style.display = "none";
      vSubmit.style.display = "none";
      // Zamknutí formuláře
      modal.querySelectorAll(".input").forEach(el => el.disabled = true);
    } else {
      vSaveDraft.style.display = "inline-block";
      vSubmit.style.display = "inline-block";
      modal.querySelectorAll(".input").forEach(el => el.disabled = false);
    }

    modal.style.display = "flex";
  }

  function closeReviewModal() {
    modal.style.display = "none";
    CURRENT_ID = null;
  }
  
  vCancel.addEventListener("click", closeReviewModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeReviewModal(); });

  vSaveDraft.addEventListener("click", () => saveReview(false));
  vSubmit.addEventListener("click", () => saveReview(true));

  // (US-2, US-3) Uložení / Odeslání posudku
  function saveReview(isFinal) {
    if (!CURRENT_ID) return;
    
    // (US-2) Validace formuláře posudku
    if (isFinal) {
      if (!vSummary.value.trim() || !vStrengths.value.trim() || !vWeaknesses.value.trim() || !vRecommendation.value) {
        showToast("Pro finální odeslání vyplňte souhrn, silné/slabé stránky a doporučení.", true);
        return;
      }
    }

    const all = readArticles();
    const art = all.find(x => x.id === CURRENT_ID);
    if (!art || !art.reviews) return;
    
    const review = art.reviews.find(r => r.reviewer === CURRENT_USER);
    if (!review) return;

    review.reviewData = {
      summary: vSummary.value.trim(),
      strengths: vStrengths.value.trim(),
      weaknesses: vWeaknesses.value.trim(),
      recommendation: vRecommendation.value,
      comments: vComments.value.trim() // (US-3) Komunikace
    };

    if (isFinal) {
      review.status = "submitted";
      review.submittedAt = Date.now();
      art.updatedAt = Date.now();
      
      // (US-2) Po odeslání je viditelný redaktorovi i šéfredaktorovi
      // Zkontrolujeme, zda jsou všechny ostatní recenze hotové
      const allReviews = art.reviews || [];
      const pendingReviews = allReviews.filter(r => r.status === 'pending' || r.status === 'accepted').length;
      
      if (pendingReviews === 0) {
        // Všechny recenze odevzdány -> posun na šéfredaktora
        art.status = "K rozhodnutí";
        art.statusChangedAt = Date.now();
        pushNotification(art, "sefredaktor", `Článek "${art.title}" má všechny posudky a je připraven k finálnímu rozhodnutí.`, { type: "ready_for_decision" });
        pushNotification(art, "redaktor", `Článek "${art.title}" je připraven k finálnímu rozhodnutí.`, { type: "ready_for_decision" });
      } else {
        // Jen dílčí notifikace
        pushNotification(art, "redaktor", `Recenzent ${CURRENT_USER} odevzdal posudek k článku "${art.title}".`, { type: "review_submitted" });
        pushNotification(art, "sefredaktor", `Recenzent ${CURRENT_USER} odevzdal posudek k článku "${art.title}".`, { type: "review_submitted" });
      }

      showToast("Posudek finálně odeslán.");
    } else {
      showToast("Posudek uložen jako rozpracovaný.");
    }

    writeArticles(all);
    closeReviewModal();
    render();
  }

  // --- Inicializace ---
  document.addEventListener("DOMContentLoaded", () => {
    CURRENT_USER = readSessionUser();
    if (CURRENT_USER) {
      render();
    }
  });
})();

