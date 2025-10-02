
export function currentUser() {
  try { return JSON.parse(localStorage.getItem("sessionUser") || "null"); }
  catch { return null; }
}

export function requireRole(role) {
  const u = currentUser();
  if (!u || u.role !== role) {
    location.href = "../../index.html";
  }
}

export function logout() {
  localStorage.removeItem("sessionUser");
  location.href = "../../index.html";
}
