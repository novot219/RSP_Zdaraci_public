
const USERS = [
  { username: "autor",       password: "heslo", role: "autor",       page: "src/roles/autor.html" },
  { username: "redaktor",    password: "heslo", role: "redaktor",    page: "src/roles/redaktor.html" },
  { username: "recenzent",   password: "heslo", role: "recenzent",   page: "src/roles/recenzent.html" },
  { username: "sefredaktor", password: "heslo", role: "sefredaktor", page: "src/roles/sefredaktor.html" },
  { username: "ctenar",      password: "heslo", role: "ctenar",      page: "src/roles/ctenar.html" },
  { username: "admin",       password: "heslo", role: "admin",       page: "src/roles/admin.html" }
];

const $ = (id) => document.getElementById(id);

$("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = $("username").value.trim().toLowerCase();
  const password = $("password").value.trim();
  const errorSpan = $("loginErr");

  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) { errorSpan.textContent = "Neplatné přihlašovací údaje."; return; }

  localStorage.setItem("sessionUser", JSON.stringify({ username: user.username, role: user.role }));
  window.location.href = user.page; // relativně z index.html
});
