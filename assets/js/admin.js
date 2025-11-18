(function () {
  // jen admin se sem dostane
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!u || u.role !== "admin") {
      location.href = "../admin-login.html";
      return;
    }
  } catch {
    location.href = "../admin-login.html";
    return;
  }

  const S = window.Shared || {};
  const readArticles =
    S.readArticles ||
    (() => JSON.parse(localStorage.getItem("articles") || "[]"));
  const lastVersion =
    S.lastVersion ||
    function (a) {
      return (a.versions || []).slice(-1)[0];
    };

  const HD_KEY = "helpdesk.tickets";
  const readHD = () => {
    try {
      return JSON.parse(localStorage.getItem(HD_KEY) || "[]");
    } catch {
      return [];
    }
  };
  const writeHD = (arr) =>
    localStorage.setItem(HD_KEY, JSON.stringify(arr));

  const $ = (id) => document.getElementById(id);
  const TBL = $("tbl").querySelector("tbody");

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (!isFinite(d)) return "—";
    return d.toLocaleDateString("cs-CZ");
  }

  function fmtDateTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (!isFinite(d)) return "—";
    return (
      d.toLocaleDateString("cs-CZ") +
      " " +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  }

  let state = {
    q: "",
    fStatus: "",
    fRole: "",
    sortKey: "createdAt",
    sortDir: "desc",
  };

  function normalize(v) {
    return (v == null ? "" : String(v)).toLowerCase();
  }

  function applyFilters(list) {
    let out = list.map((a) => ({
      ...a,
      createdAt: a.createdAt || a.updatedAt || null,
    }));

    const q = normalize(state.q);

    if (q) {
      out = out.filter((a) => {
        const title = normalize(a.title);
        const name = normalize(a.authorName || a.author);
        const kw = Array.isArray(a.keywords)
          ? a.keywords.join(" ")
          : Array.isArray(a.tags)
          ? a.tags.join(" ")
          : "";
        const kws = normalize(kw);
        return (
          title.includes(q) || name.includes(q) || kws.includes(q)
        );
      });
    }

    if (state.fStatus) {
      out = out.filter((a) => (a.status || "") === state.fStatus);
    }
    if (state.fRole) {
      out = out.filter((a) => (a.author || "") === state.fRole);
    }

    const k = state.sortKey;
    const dir = state.sortDir === "asc" ? 1 : -1;

    out.sort((a, b) => {
      let va = a[k];
      let vb = b[k];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }

      const na = Number(va);
      const nb = Number(vb);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        return (na - nb) * dir;
      }

      return (
        String(va).localeCompare(String(vb), "cs") * dir
      );
    });

    return out;
  }

  function renderTable() {
    const rows = applyFilters(readArticles());

    TBL.innerHTML = rows
      .map((a) => {
        const v = lastVersion(a);
        const ds = fmtDate(a.createdAt);
        const dl = v
          ? `<a class="btn btn-ghost btn-sm" href="${
              v.data || "#"
            }" download="${v.name || "clanek"}">Stáhnout</a>`
          : "";
        return `<tr>
          <td>${a.title || "—"}</td>
          <td>${a.authorName || a.author || "—"}</td>
          <td><span class="badge" data-status="${normalize(
            a.status
          )}">${a.status || "—"}</span></td>
          <td>${ds}</td>
          <td class="row-actions">${dl}</td>
        </tr>`;
      })
      .join("");

    $("sumCount").textContent = `Celkem: ${rows.length}`;
    $("sumPublished").textContent = `Publikováno: ${
      rows.filter((a) => a.status === "Publikováno").length
    }`;
    $("sumPending").textContent = `V recenzi: ${
      rows.filter((a) => a.status === "V recenzi").length
    }`;

    renderTags(rows);
  }

  function renderTags(list) {
    const m = {};
    list.forEach((a) => {
      const s = a.status || "Neznámý";
      m[s] = (m[s] || 0) + 1;
    });
    $("summaryTags").innerHTML = Object.entries(m)
      .map(
        ([k, v]) =>
          `<span class="tag">${k}: ${v}</span>`
      )
      .join("");
  }

  // řazení klikem na hlavičku
  document
    .querySelectorAll("th[data-sort]")
    .forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDir =
            state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        renderTable();
      });
    });

  // vyhledávání & filtry
  $("q").addEventListener("input", (e) => {
    state.q = e.target.value.trim();
    renderTable();
  });
  $("fStatus").addEventListener("change", (e) => {
    state.fStatus = e.target.value;
    renderTable();
  });
  $("fRole").addEventListener("change", (e) => {
    state.fRole = e.target.value;
    renderTable();
  });
  $("clear").addEventListener("click", () => {
    state.q = "";
    state.fStatus = "";
    state.fRole = "";
    state.sortKey = "createdAt";
    state.sortDir = "desc";
    $("q").value = "";
    $("fStatus").value = "";
    $("fRole").value = "";
    renderTable();
  });

  // ===== TOP STATS + GRAFY =====
  function topStats() {
    const A = readArticles();
    const byStatus = {};
    const byRole = {};
    const users = new Set();
    let reviews = 0;
    let pubs = 0;

    A.forEach((a) => {
      const s = a.status || "Neznámý";
      byStatus[s] = (byStatus[s] || 0) + 1;

      const r = a.author || "neuvedeno";
      byRole[r] = (byRole[r] || 0) + 1;

      if (a.authorName) users.add(a.authorName);
      if (Array.isArray(a.reviews))
        reviews += a.reviews.length;
      if (s === "Publikováno") pubs++;
    });

    $("statsTop").innerHTML = `
      <div class="stat">
        <div class="k">Článků celkem</div>
        <div class="v">${A.length}</div>
      </div>
      <div class="stat">
        <div class="k">Uživatelé (odhad)</div>
        <div class="v">${users.size}</div>
      </div>
      <div class="stat">
        <div class="k">Posudků</div>
        <div class="v">${reviews}</div>
      </div>
      <div class="stat">
        <div class="k">Publikací</div>
        <div class="v">${pubs}</div>
      </div>
    `;

    // GRAF 1 – STAVY ČLÁNKŮ (čisté počty, bez času)
    const statuses = [
      "Koncept",
      "Čeká na kontrolu",
      "Vráceno k úpravě",
      "V recenzi",
      "Přijato",
      "Odmítnuto",
      "Publikováno",
    ];
    const chartS = $("chartStatuses");
    chartS.innerHTML = "";

    const maxS = Math.max(
      1,
      ...statuses.map((s) => byStatus[s] || 0)
    );

    statuses.forEach((s) => {
      const v = byStatus[s] || 0;
      // výška sloupce v pixelech – min 8, max cca 160
      const h = v === 0 ? 8 : 40 + (v / maxS) * 120;

      const col = document.createElement("div");
      col.className = "chart-col";

      const shortLabel =
        s === "Čeká na kontrolu"
          ? "Čeká"
          : s.split(" ")[0];

      col.innerHTML = `
        <div class="chart-col__bar" style="height:${h}px"></div>
        <div class="chart-col__value">${v}</div>
        <div class="chart-col__label">${shortLabel}</div>
      `;
      chartS.appendChild(col);
    });

    // GRAF 2 – ČLÁNKY PODLE ROLE AUTORA
    const roles = Object.keys(byRole);
    const chartR = $("chartRoles");
    chartR.innerHTML = "";
    if (!roles.length) return;

    const maxR = Math.max(
      1,
      ...roles.map((r) => byRole[r] || 0)
    );

    roles.forEach((r) => {
      const v = byRole[r] || 0;
      const h = v === 0 ? 8 : 40 + (v / maxR) * 120;

      const col = document.createElement("div");
      col.className = "chart-col";

      col.innerHTML = `
        <div class="chart-col__bar" style="height:${h}px"></div>
        <div class="chart-col__value">${v}</div>
        <div class="chart-col__label">${r}</div>
      `;
      chartR.appendChild(col);
    });
  }

  // ===== HELPDESK =====
  function renderHD() {
    const list = readHD().sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );
    const tbody = $("hd").querySelector("tbody");
    if (!list.length) {
      $("hdEmpty").style.display = "block";
      tbody.innerHTML = "";
      return;
    }
    $("hdEmpty").style.display = "none";
    tbody.innerHTML = list
      .map(
        (t) => `
      <tr>
        <td>${fmtDateTime(t.createdAt)}</td>
        <td>${t.user?.name || "—"}</td>
        <td>${t.user?.email || "—"}</td>
        <td>${t.subject || "—"}</td>
        <td><span class="badge">${
          t.status || "—"
        }</span></td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-open="${
            t.id
          }">Otevřít</button>
        </td>
      </tr>`
      )
      .join("");

    tbody
      .querySelectorAll("[data-open]")
      .forEach((btn) => {
        btn.addEventListener("click", () =>
          openTicket(btn.getAttribute("data-open"))
        );
      });
  }

  let currentTicket = null;

  function openTicket(id) {
    const all = readHD();
    const t = all.find((x) => x.id === id);
    if (!t) return;
    currentTicket = t;

    $("ticketTitle").textContent =
      t.subject || "Detail dotazu";

    const thr = $("thread");
    thr.innerHTML = "";
    (t.messages || []).forEach((m) => {
      const div = document.createElement("div");
      div.className = "msg";
      const who =
        m.by === "admin"
          ? "Administrátor"
          : t.user?.name || "Uživatel";
      div.innerHTML = `<div class="meta">${who} • ${fmtDateTime(
        m.at
      )}</div><div>${escapeHtml(
        m.text || ""
      )}</div>`;
      thr.appendChild(div);
    });

    $("reply").value = "";
    $("hdModal").style.display = "flex";

    $("sendReply").onclick = () => {
      const txt = $("reply").value.trim();
      if (!txt) return;
      t.messages = t.messages || [];
      t.messages.push({
        by: "admin",
        at: Date.now(),
        text: txt,
      });
      t.status = "Odpovězeno";
      writeHD(all);
      openTicket(id);
    };

    $("closeTicket").onclick = () => {
      t.status = "Uzavřený";
      writeHD(all);
      renderHD();
      closeModal();
    };

    $("modalClose").onclick = closeModal;
    $("modalBackdrop").onclick = closeModal;
  }

  function closeModal() {
    $("hdModal").style.display = "none";
    renderHD();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      }[c];
    });
  }

  // odhlášení
  $("signout").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    location.href = "../admin-login.html";
  });

  // start
  topStats();
  renderTable();
  renderHD();
})();
