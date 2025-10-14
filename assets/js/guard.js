const roleRoutes = {
	autor: "roles/autor.html",
	redaktor: "roles/redaktor.html",
	recenzent: "roles/recenzent.html"
};

function readSession() {
	try {
		const raw = sessionStorage.getItem("session.user");
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function ensureAuth(requiredRole) {
	const session = readSession();
	if (!session) {
		window.location.replace("../index.html");
		return;
	}
	if (requiredRole && session.role !== requiredRole) {
		const target = roleRoutes[session.role] || "../index.html";
		window.location.replace("../" + target);
		return;
	}
	document.querySelectorAll("[data-username]").forEach(function (el) {
		el.textContent = session.username;
	});
	document.querySelectorAll("[data-role]").forEach(function (el) {
		el.textContent = session.role;
	});
	const btn = document.getElementById("logoutBtn");
	if (btn) {
		btn.addEventListener("click", function () {
			sessionStorage.removeItem("session.user");
			window.location.replace("../index.html");
		});
	}
}

document.addEventListener("DOMContentLoaded", function () {
	const requiredRole = document.body.dataset.requiredRole || null;
	ensureAuth(requiredRole);
});
