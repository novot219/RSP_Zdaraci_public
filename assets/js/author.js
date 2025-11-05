// Zde je pouze upravená verze author.js, která používá utility z window.Shared
// a přidává logiku pro zobrazení finálního rozhodnutí.

(function () {
  // Načtení sdílených utilit
  const {
    readArticles, writeArticles, fmtDate, fmtDateOnly, statusCode, showToast,
    lastVersion, pushNotification
  } = window.Shared;
  
  // Převod starých funkcí na sdílené (pokud by se author.js spouštěl samostatně)
  const fmtSize = (n) => {
    if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(0) + " kB";
    return n + " B";
  };

  function setStatus(art, status) {
    art.status = status;
    art.statusChangedAt = Date.now();
    art.updatedAt = art.statusChangedAt;
  }

  function refreshList() {
    const me = JSON.parse(sessionStorage.getItem("session.user") || "null");
    if (!me) return;
    const all = readArticles();
    const mine = all.filter(x => x.author === me.username);
    const rowsEl = document.getElementById("a-rows");
    const table = document.getElementById("a-table");
    const empty = document.getElementById("a-empty");

    if (mine.length === 0) {
      table.style.display = "none";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    table.style.display = "table";
    rowsEl.innerHTML = "";
    
    mine.sort((a,b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    mine.forEach(function (a) {
      const tr = document.createElement("tr");
      const last = lastVersion(a);
      const lastLabel = last ? last.label : "v1";
      const lastTs = a.updatedAt || a.createdAt || Date.now();
      const status = a.status || "Koncept";
      const badge = "<span class='badge' data-status='" + statusCode(status) + "'>" + status + "</span>";

      const actions = [];
      if ((status === "Koncept") || (status === "Vráceno k úpravě")) {
        actions.push("<button class='btn btn-primary' data-act='send' data-id='" + a.id + "'>Odeslat k recenzi</button>");
      }
      
      actions.push("<button class='btn btn-ghost' data-act='versions' data-id='" + a.id + "'>Verze</button>");
      
      // (US-5) Tlačítko pro zobrazení rozhodnutí
      if (["Přijato", "Odmítnuto", "Vráceno k úpravě"].includes(status)) {
         actions.push("<button class='btn btn-ghost' data-act='decision' data-id='" + a.id + "'>Detail rozhodnutí</button>");
      }


      tr.innerHTML =
        "<td>" + (a.title || a.fileName || "—") + "</td>" +
        "<td>" + badge + "</td>" +
        "<td>" + lastLabel + "</td>" +
        "<td>" + fmtDate(lastTs) + "</td>" +
        "<td><div class='row-actions'>" + actions.join(" ") + "</div></td>";
      rowsEl.appendChild(tr);
    });

    rowsEl.querySelectorAll("[data-act='versions']").forEach(function (btn) {
      btn.addEventListener("click", function () { openVersions(this.getAttribute("data-id")); });
    });
    rowsEl.querySelectorAll("[data-act='send']").forEach(function (btn) {
      btn.addEventListener("click", function () { sendToReview(this.getAttribute("data-id")); });
    });
    rowsEl.querySelectorAll("[data-act='decision']").forEach(function (btn) {
      btn.addEventListener("click", function () { openDecision(this.getAttribute("data-id")); });
    });
  }

  // --- Modaly pro nahrávání ---
  function openModal() { document.getElementById("uploadModal").style.display = "flex"; }
  function closeModal() {
    document.getElementById("uploadModal").style.display = "none";
    document.getElementById("u-file").value = "";
    document.getElementById("u-title").value = "";
    document.getElementById("u-coauthors").value = "";
    document.getElementById("u-email").value = "";
    document.getElementById("u-error").textContent = "";
  }

  function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function validateFile(file) {
    if (!file) return "Vyberte soubor.";
    const ok = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    const ext = /\.(pdf|docx?|PDF|DOCX?)$/i.test(file.name);
    const typeOk = ok.includes(file.type) || ext;
    if (!typeOk) return "Povoleny jsou pouze PDF nebo DOC/DOCX.";
    const max = 15 * 1024 * 1024;
    if (file.size > max) return "Soubor je příliš velký (limit 15 MB).";
    return "";
  }

  let currentArticleId = null;
  function openVersions(id) {
    currentArticleId = id;
    const all = readArticles();
    const art = all.find(x => x.id === id); if (!art) return;
    document.getElementById("v-title").textContent = art.title || art.fileName || "—";
    const rows = document.getElementById("v-rows"); rows.innerHTML = "";
    (art.versions || []).slice().reverse().forEach(function (v) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + v.label + "</td><td>" + v.name + "</td><td>" + fmtSize(v.size) + "</td><td>" + fmtDate(v.uploadedAt) + "</td>";
      rows.appendChild(tr);
    });
    document.getElementById("v-file").value = "";
    document.getElementById("v-error").textContent = "";
    document.getElementById("versionsModal").style.display = "flex";
  }
  function closeVersions() { document.getElementById("versionsModal").style.display = "none"; currentArticleId = null; }

  function sendToReview(id) {
    const all = readArticles();
    const art = all.find(x => x.id === id); if (!art) return;
    setStatus(art, "Čeká na kontrolu");
    
    // Notifikace redaktorovi
    pushNotification(art, "redaktor", `Článek "${art.title}" byl odeslán ke kontrole.`, {type: "new_submission"});
    
    writeArticles(all);
    showToast("Článek odeslán ke kontrole.");
    refreshList();
  }
  
  // (US-5) Zobrazení rozhodnutí
  const decisionModal = document.getElementById("decisionModal");
  const decTitle = document.getElementById("dec-title");
  const decStatus = document.getElementById("dec-status");
  const decReason = document.getElementById("dec-reason");
  
  function openDecision(id) {
    const all = readArticles();
    const art = all.find(x => x.id === id); if (!art) return;
    
    decTitle.textContent = `Výsledek: ${art.title}`;
    const status = art.status;
    decStatus.textContent = status;
    decStatus.setAttribute("data-status", statusCode(status));
    
    // Najdi poslední relevantní rozhodnutí
    const decisions = (art.decisions || []).filter(d => 
      ['accepted', 'rejected', 'returned'].includes(d.type)
    );
    const lastDecision = decisions.length ? decisions[decisions.length - 1] : null;
    
    decReason.textContent = lastDecision ? lastDecision.reason : "Zdůvodnění nebylo poskytnuto.";
    
    decisionModal.style.display = "flex";
  }
  
  function closeDecision() {
    decisionModal.style.display = "none";
  }

  document.addEventListener("DOMContentLoaded", function () {
    refreshList();

    document.getElementById("a-new").addEventListener("click", openModal);
    document.getElementById("u-cancel").addEventListener("click", closeModal);
    document.getElementById("v-cancel").addEventListener("click", closeVersions);
    document.getElementById("dec-close").addEventListener("click", closeDecision);
    decisionModal.addEventListener("click", (e) => { if (e.target === decisionModal) closeDecision(); });

    document.getElementById("u-submit").addEventListener("click", function () {
      const fileEl = document.getElementById("u-file");
      const titleEl = document.getElementById("u-title");
      const coEl = document.getElementById("u-coauthors");
      const emailEl = document.getElementById("u-email");
      const errEl = document.getElementById("u-error");

      errEl.textContent = "";
      const file = fileEl.files[0];
      const fv = validateFile(file); if (fv) { errEl.textContent = fv; showToast(fv, true); return; }

      const title = titleEl.value.trim(); if (!title) { const m = "Vyplňte název článku."; errEl.textContent = m; showToast(m, true); return; }
      const email = emailEl.value.trim(); if (!email || !validateEmail(email)) { const m = "Zadejte platný kontaktní e-mail."; errEl.textContent = m; showToast(m, true); return; }
      const coauthors = coEl.value.trim();

      const me = JSON.parse(sessionStorage.getItem("session.user") || "null"); if (!me) { showToast("Session vypršela.", true); window.location.href = "../index.html"; return; }

      const reader = new FileReader();
      reader.onerror = function () { errEl.textContent = "Nelze přečíst soubor."; showToast("Nelze přečíst soubor.", true); };
      reader.onload = function (e) {
        const dataUrl = e.target.result;
        const all = readArticles();
        const id = "art_" + Date.now();
        const now = Date.now();
        const art = {
          id,
          author: me.username,
          title,
          coauthors,
          contactEmail: email,
          status: "Koncept",
          statusChangedAt: now,
          createdAt: now,
          updatedAt: now,
          fileName: file.name,
          versions: [
            { label: "v1", name: file.name, type: file.type || "application/octet-stream", size: file.size, data: dataUrl, uploadedAt: now }
          ]
        };
        all.push(art);
        writeArticles(all);
        closeModal();
        showToast("Článek uložen.");
        refreshList();
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("v-submit").addEventListener("click", function () {
      const fileEl = document.getElementById("v-file");
      const errEl = document.getElementById("v-error"); errEl.textContent = "";
      const file = fileEl.files[0];
      const fv = validateFile(file); if (fv) { errEl.textContent = fv; showToast(fv, true); return; }

      const all = readArticles();
      const art = all.find(x => x.id === currentArticleId); if (!art) { showToast("Článek nenalezen.", true); return; }

      const reader = new FileReader();
      reader.onerror = function () { errEl.textContent = "Nelze přečíst soubor."; showToast("Nelze přečíst soubor.", true); };
      reader.onload = function (e) {
        const now = Date.now();
        const next = (art.versions ? art.versions.length : 0) + 1;
        const label = "v" + next;
        const v = { label, name: file.name, type: file.type || "application/octet-stream", size: file.size, data: e.target.result, uploadedAt: now };
        if (!art.versions) art.versions = [];
        art.versions.push(v);
        art.updatedAt = now;
        
        // Pokud byl článek vrácen, nahráním nové verze se stav nemění.
        // Autor musí znovu kliknout na "Odeslat k recenzi".
        if (art.status === "Vráceno k úpravě") {
            // Stav zůstává, jen se aktualizuje čas
        } else if (art.status !== "Koncept") {
             // Pokud nahrává novou verzi k článku, který je "V recenzi", 
             // je to bráno jako "Koncept" nové verze
             // Ale pro jednoduchost sprintu to necháme být.
             // Hlavní je scénář "Vráceno k úpravě".
        }
        
        writeArticles(all);
        showToast("Nová verze nahrána.");
        openVersions(art.id);
        refreshList();
        document.getElementById("v-file").value = "";
      };
      reader.readAsDataURL(file);
    });
  });
})();
