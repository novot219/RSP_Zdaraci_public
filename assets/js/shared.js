// Sdílené utility pro role

window.Shared = (function () {
  function readArticles() {
    try {
      const raw = localStorage.getItem("articles");
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeArticles(list) {
    localStorage.setItem("articles", JSON.stringify(list || []));
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" +
      p(d.getMonth() + 1) +
      "-" +
      p(d.getDate()) +
      " " +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes())
    );
  }

  function fmtDateOnly(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function statusCode(s) {
    switch (s) {
      case "Koncept": return "draft";
      case "Čeká na kontrolu": return "queued";
      case "V recenzi": return "review";
      case "Vráceno k úpravě": return "revisions";
      case "Přijato": return "accepted";
      case "Odmítnuto": return "rejected";
      case "Publikováno": return "published";
      case "K rozhodnutí": return "review"; // Stejný styl jako "V recenzi"
      case "Odložen": return "queued"; // reuse stylu
      default: return "draft";
    }
  }

  function showToast(msg, isErr) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle("err", !!isErr);
    t.style.display = "block";
    setTimeout(() => (t.style.display = "none"), 1800);
  }

  function lastVersion(art) {
    return art.versions && art.versions.length
      ? art.versions[art.versions.length - 1]
      : null;
  }

  // --- Recenzenti (jednoduchá správa v localStorage) ---
  function readReviewers() {
    try {
      const raw = localStorage.getItem("reviewers");
      let list = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(list) || !list.length) {
        list = [
          { id: "recenzent", name: "recenzent" },
          { id: "recenzent2", name: "recenzent2" },
          { id: "redaktor", name: "redaktor (test)" },
          { id: "sefredaktor", name: "šéfredaktor (test)" } // PŘIDÁNO
        ];
        writeReviewers(list);
      }
      return list;
    } catch {
      return [];
    }
  }

  function writeReviewers(list) {
    localStorage.setItem("reviewers", JSON.stringify(list || []));
  }

  // --- Notifikace (ukládáme k článku, in-app) ---
  function pushNotification(art, toUser, message, meta) {
    if (!Array.isArray(art.notifications)) art.notifications = [];
    art.notifications.push({
      to: toUser,
      channel: "in-app",
      message,
      at: Date.now(),
      read: false, // Přidáno pro sledování
      meta: meta || {}
    });
  }

  // Pomocné výpočty k termínům
  function daysUntil(ts) {
    if (!ts) return null;
    const ONE = 24 * 60 * 60 * 1000;
    const now = new Date().setHours(0, 0, 0, 0); // Začátek dneška
    const due = new Date(ts).setHours(0, 0, 0, 0); // Začátek dne termínu
    return Math.floor((due - now) / ONE);
  }

  return {
    readArticles,
    writeArticles,
    fmtDate,
    fmtDateOnly,
    statusCode,
    showToast,
    lastVersion,
    readReviewers,
    writeReviewers,
    pushNotification,
    daysUntil
  };
})();
