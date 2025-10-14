const users = {
	autor: { password: "heslo", role: "autor", target: "roles/autor.html" },
	redaktor: { password: "heslo", role: "redaktor", target: "roles/redaktor.html" },
	recenzent: { password: "heslo", role: "recenzent", target: "roles/recenzent.html" }
};

const form = document.getElementById("loginForm");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");
const errorEl = document.getElementById("error");
const btn = document.getElementById("loginBtn");

function setError(msg) {
	errorEl.textContent = msg;
}
function setLoading(s) {
	if (s) {
		btn.disabled = true;
		btn.dataset.label = btn.textContent;
		btn.textContent = "Přihlašuji…";
	} else {
		btn.disabled = false;
		if (btn.dataset.label) btn.textContent = btn.dataset.label;
	}
}

form.addEventListener("submit", function (e) {
	e.preventDefault();
	setError("");
	const username = usernameEl.value.trim();
	const password = passwordEl.value.trim();
	if (!username || !password) {
		setError("Vyplňte prosím všechna pole.");
		return;
	}
	setLoading(true);
	setTimeout(function () {
		const record = users[username];
		if (!record || record.password !== password) {
			setLoading(false);
			setError("Neplatné přihlašovací údaje.");
			return;
		}
		const session = { username, role: record.role, issuedAt: Date.now() };
		sessionStorage.setItem("session.user", JSON.stringify(session));
		window.location.href = record.target;
	}, 400);
});

usernameEl.addEventListener("input", function () {
	if (errorEl.textContent) setError("");
});
passwordEl.addEventListener("input", function () {
	if (errorEl.textContent) setError("");
});
