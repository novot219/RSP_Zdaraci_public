# Journal – Administrátorská dokumentace

Tento dokument popisuje možnosti administrátorského rozhraní a základní správu aplikace Journal.

## 1. Přístup administrátora

- Administrátor má samostatnou přihlašovací stránku:
  - URL: `https://skolniproject.netlify.app/admin-login`
- Přístupové údaje (demo):
  - **uživatelské jméno:** `admin`
  - **heslo:** `heslo`

Po úspěšném přihlášení je uživatel přesměrován do administrátorského panelu (`roles/admin.html`).

## 2. Struktura systému (přehled)

Aplikace je čistě front-endová, data jsou ukládána do `localStorage` webového prohlížeče.  
Pro reálné nasazení by bylo nutné napojení na backend / databázi, pro školní projekt stačí tato simulace.

Admin panel obsahuje zejména:

- přehled uživatelů a jejich rolí,
- přehled všech článků napříč stavy,
- globální vyhledávání, filtrování a řazení,
- statistické přehledy (počty článků, uživatelů, recenzí, publikací),
- správu HelpDesk dotazů.

## 3. Administrátorské funkce

### 3.1 Dashboard

Na úvodní obrazovce admin vidí:

- souhrnné počty:
  - celkový počet článků,
  - počet publikovaných článků,
  - počet uživatelů podle rolí,
  - počet recenzí / posudků,
- vybrané grafy nebo tabulky (např. články podle stavu, vývoj počtu článků v čase).

### 3.2 Přehled článků

Admin může:

- zobrazit seznam všech článků v systému,
- filtrovat podle:
  - stavu (koncept, kontrola, recenze, k úpravám, přijatý, zamítnutý, publikovaný),
  - autora,
  - typu článku (pokud je implementováno),
- řadit podle data, názvu, stavu,
- fulltextově vyhledávat v názvu, autorech a klíčových slovech.

Admin obvykle články neupravuje obsahově – jde o kontrolu, zda systém funguje správně a pro statistiky.

### 3.3 Přehled uživatelů

Funkce podle implementace – typicky:

- výpis všech uživatelů,
- filtrace podle role,
- možnost zobrazit detaily uživatele (jméno, e-mail, role),
- případně ruční vytvoření / úprava uživatele (pokud je implementováno).

### 3.4 HelpDesk

V sekci HelpDesk admin:

- vidí seznam všech odeslaných dotazů,
- může zobrazit detail dotazu (jméno / e-mail odesílatele, text),
- může přidat odpověď nebo označit dotaz jako vyřešený,
- historie komunikace zůstává uložená a dohledatelná.

### 3.5 Statistiky a souhrny

V části Statistiky:

- jsou zobrazeny grafy nebo tabulky obsahující:
  - počet článků podle stavu,
  - počet článků podle autora / čísla časopisu,
  - počet recenzí,
  - počet publikovaných článků,
- admin může omezit statistiky podle období (např. rok / měsíc) nebo typu článku.

Tyto statistiky slouží pro rychlý přehled o vytížení redakce a vývoji časopisu.

---

## 4. DEMO data a testování

Pro oponenty je připravena stránka **DEMO data** (`public/seed.html`), která umožňuje:

- jedním tlačítkem vygenerovat testovací sadu článků v různých stavech,
- druhým tlačítkem tato data vymazat (vyčištění localStorage pro články).

Admin může oponentovi doporučit:

1. Vymazat případná stará data.
2. Vygenerovat demo data.
3. Testovat jednotlivé role (autor, redaktor, recenzent, šéfredaktor) na stejné sadě článků.

---

## 5. Nasazení

Pro školní projekt je aplikace typicky nasazena jako statický web (např. GitHub Pages).

Stačí:

1. Vytvořit produkční větev / složku s `index.html`, `assets/`, `public/`, `roles/`.
2. Zapnout GitHub Pages pro repozitář (branch + root).
3. URL, kterou GitHub vygeneruje, je adresa, kterou pošlete vyučujícímu a oponentům.

V produkční verzi ověřte:

- že funguje přihlášení všech rolí,
- že veřejná část (časopis) je dostupná na root URL bez přihlášení,
- že fungují odkazy v navigaci (O časopisu, Vydaná čísla, Nápověda, DEMO data).
