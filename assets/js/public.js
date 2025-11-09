(function () {
  const { readArticles, lastVersion } = window.Shared;

  // ===== O ČASOPISU (veřejná homepage) =====================================
  const DEFAULT_INFO = {
    name: "Journal of Modern Studies",
    description:
      "Akademický recenzovaný časopis zaměřený na moderní trendy a aplikovaný výzkum. Publikujeme dvakrát ročně.",
    focus:
      "Informační technologie, pedagogika, management, společenské vědy. Přijímáme původní články i přehledové studie.",
    publisher: "Fiktivní univerzita • Katedra moderních studií",
    email: "redakce@journal.test",
    board: [
      "Šéfredaktor: sefredaktor",
      "Redaktoři: redaktor",
      "Recenzenti: recenzent, recenzent2",
    ],
    guidelines:
      "Max. 20 stran, anonymní posouzení, soubory PDF/DOCX. Citace dle APA."
  };

  function readJournalInfo() {
    try {
      const raw = localStorage.getItem("journal.info");
      return raw ? Object.assign({}, DEFAULT_INFO, JSON.parse(raw)) : DEFAULT_INFO;
    } catch {
      return DEFAULT_INFO;
    }
  }

  function renderAbout() {
    const info = readJournalInfo();
    const $ = (id) => document.getElementById(id);

    if ($("about-name")) $("about-name").textContent = info.name;
    if ($("about-desc")) $("about-desc").textContent = info.description;
    if ($("about-focus")) $("about-focus").textContent = info.focus;
    if ($("about-publisher")) $("about-publisher").textContent = info.publisher;

    const emailEl = $("about-email");
    if (emailEl) {
      emailEl.href = "mailto:" + info.email;
      emailEl.textContent = info.email;
    }

    const board = $("about-board");
    if (board) {
      board.innerHTML = "";
      info.board.forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        board.appendChild(li);
      });
    }

    if ($("about-guidelines")) $("about-guidelines").textContent = info.guidelines;
  }

  // ===== VYDANÁ ČÍSLA (pro public/cisla.html – ponecháno) ==================
  function isPublished(a) {
    return (a.status || "") === "Publikováno";
  }
  function publishedAt(a) {
    return (a.publication && a.publication.publishedAt) ||
           a.statusChangedAt || a.updatedAt || a.createdAt || Date.now();
  }
  function issueLabel(a) {
    const lbl = a.publication && (a.publication.issue || a.publication.issueLabel);
    if (lbl) return lbl;
    const d = new Date(publishedAt(a));
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}–${mm}`;
  }

  function renderIssues() {
    const mount = document.getElementById("issues");
    const empty = document.getElementById("issues-empty");
    if (!mount) return;

    const pubs = readArticles().filter(isPublished);
    if (!pubs.length) {
      if (empty) empty.style.display = "block";
      mount.innerHTML = "";
      return;
    }
    if (empty) empty.style.display = "none";

    // Group by issue label
    const groups = {};
    pubs.forEach((a) => {
      const lbl = issueLabel(a);
      (groups[lbl] = groups[lbl] || []).push(a);
    });

    // Order groups by latest date desc
    const labels = Object.keys(groups).sort((A, B) => {
      const da = Math.max(...groups[A].map(publishedAt));
      const db = Math.max(...groups[B].map(publishedAt));
      return db - da;
    });

    mount.innerHTML = "";
    labels.forEach((lbl) => {
      const list = groups[lbl].slice().sort((x, y) => publishedAt(y) - publishedAt(x));

      const det = document.createElement("details");
      det.innerHTML = `<summary>${lbl} <span class="badge" data-status="published">${list.length} článků</span></summary>`;
      const container = document.createElement("div");

      list.forEach((a) => {
        const v = lastVersion(a);
        const d = new Date(publishedAt(a));
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

        const row = document.createElement("div");
        row.className = "art";
        row.innerHTML = `
          <div><strong>${a.title || "—"}</strong></div>
          <div class="muted">${a.authorName || a.author || "—"} • ${ds}</div>
          <div style="margin-top:6px">${v ? `<a class="btn btn-ghost" href="${v.data || "#"}" download="${v.name || "clanek"}">Stáhnout</a>` : ""}</div>
        `;
        container.appendChild(row);
      });

      det.appendChild(container);
      mount.appendChild(det);
    });
  }

  // ===== Fancy UI: reveal & tilt (jemné, bez knihoven) ======================
  function initRevealAndTilt() {
    const tiles = Array.from(document.querySelectorAll(".tile.reveal"));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal--in");
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -10% 0px" });
      tiles.forEach((t) => io.observe(t));
    } else {
      tiles.forEach((t) => t.classList.add("reveal--in"));
    }

    tiles.forEach((tile) => {
      if (!tile.hasAttribute("data-tilt")) return;
      const strength = 8;
      function onMove(e) {
        const r = tile.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const rx = (0.5 - y) * strength;
        const ry = (x - 0.5) * strength;
        tile.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      }
      function reset() { tile.style.transform = ""; }
      tile.addEventListener("mousemove", onMove);
      tile.addEventListener("mouseleave", reset);
      tile.addEventListener("blur", reset);
    });
  }

  // ===== INIT ===============================================================
  document.addEventListener("DOMContentLoaded", function () {
    renderAbout();       // homepage
    renderIssues();      // cisla.html (na homepage nic neudělá)
    initRevealAndTilt(); // animace dlaždic
  });
})();
