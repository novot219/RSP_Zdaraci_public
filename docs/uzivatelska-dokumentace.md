# Journal – Uživatelská dokumentace

Tato dokumentace popisuje použití webové aplikace **Journal**, která simuluje redakční systém odborného časopisu.
Aplikace je školní projekt, všechna data jsou testovací.

## 1. Přístup k aplikaci

- **Veřejná část (čtenář)**:  
  - URL: `https://skolniproject.netlify.app/` (root)  
  - Bez přihlášení lze:
    - prohlížet informace „O časopisu“,
    - prohlížet „Vydaná čísla“ a publikované články,
    - číst nápovědu,
    - zobrazit demo data (pokud jsou zapnutá).

- **Přihlášení uživatelé**  
  Přihlášení je na hlavní stránce vpravo (box „Přihlášení do systému“).  
  Pro testování jsou připravené tyto účty:

  | Role         | Uživatelské jméno | Heslo |
  |--------------|-------------------|-------|
  | Autor        | `autor`           | `heslo` |
  | Redaktor     | `redaktor`        | `heslo` |
  | Recenzent    | `recenzent`       | `heslo` |
  | Šéfredaktor  | `sefredaktor`     | `heslo` |

  Administrátor má samostatnou login stránku – viz administrátorská dokumentace.

---

## 2. Role v systému

### 2.1 Autor

Autor může:

- zobrazit svůj panel s články,
- zakládat nové články,
- nahrát soubor (PDF/DOCX) a vyplnit název + abstrakt,
- upravovat koncepty do doby, než jsou odeslány k recenzi,
- sledovat stav článku (koncept, kontrola, recenze, k úpravám, přijatý, zamítnutý),
- stáhnout poslední verzi svého článku.

Typický postup:

1. Přihlášení jako `autor / heslo`.
2. V panelu klik na **Nový článek**.
3. Vyplnění formuláře (název, abstrakt, nahrání souboru).
4. Uložení a odeslání článku k recenzi.
5. Sledování stavu v přehledu článků; v případě vrácení k úpravám článek upravit a znovu odeslat.

---

### 2.2 Redaktor

Redaktor odpovídá za prvotní kontrolu a koordinaci recenzního řízení.

Může:

- vidět přehled všech článků v systému,
- provést formální kontrolu a článek:
  - přijmout do recenze,
  - vrátit autorovi k úpravám,
- přidělovat recenzenty k článkům,
- sledovat a číst posudky,
- připravit podklady pro šéfredaktora.

Typický postup:

1. Přihlášení jako `redaktor / heslo`.
2. V panelu **Příchozí články** zkontrolovat nové články.
3. U každého článku zvolit akci:
   - **Přijmout do recenze** – volba recenzenta.
   - **Vrátit autorovi** – přidat komentář, článek se vrátí do autorova panelu.
4. Po doručení posudků si je prohlédnout a předat šéfredaktorovi.

---

### 2.3 Recenzent

Recenzent hodnotí články a odevzdává posudek.

Může:

- vidět seznam článků, které mu byly přiděleny,
- stáhnout aktuální verzi článku,
- vyplnit a odeslat posudek (souhrn, silné stránky, slabiny, doporučení),
- doplnit doporučení a poznámky redakci.

Typický postup:

1. Přihlášení jako `recenzent / heslo`.
2. Otevřít **Přidělené články**.
3. Stáhnout soubor a posoudit článek.
4. Vyplnit formulář posudku a odeslat.
5. Případně doplnit textové doporučení či komentář redakci.

---

### 2.4 Šéfredaktor

Šéfredaktor provádí finální rozhodnutí o článku.

Může:

- vidět přehled článků v recenzním řízení,
- zobrazit všechny posudky a doporučení redakce,
- rozhodnout o přijetí, zamítnutí nebo vrácení článku k úpravám,
- označit články jako „připravené k publikaci“.

Typický postup:

1. Přihlášení jako `sefredaktor / heslo`.
2. Otevřít přehled **Rozhodnutí**.
3. U zvoleného článku:
   - zobrazit všechny posudky a komentáře,
   - vybrat rozhodnutí (Přijmout / Zamítnout / Vrátit k úpravám),
   - potvrdit – rozhodnutí se uloží a je viditelné pro autora i redaktora.

---

### 2.5 Čtenář (veřejná část)

Bez přihlášení má čtenář k dispozici:

- **O časopisu** – název, zaměření, složení redakční rady, kontakty,
- **Vydaná čísla** – přehled čísel časopisu,
- detail čísla – seznam publikovaných článků (název, autor, datum),
- možnost stáhnout PDF článku,
- **Nápověda** – stručný návod a FAQ,
- **HelpDesk** – formulář pro odeslání dotazu.

---

## 3. HelpDesk

Na veřejných stránkách je sekce **HelpDesk**, kde může uživatel:

- vyplnit předmět a text dotazu,
- odeslat jej do systému.

Dotazy se zobrazují v admin rozhraní (viz administrátorská dokumentace).  
Uživatel na straně klienta nevidí e-mail, komunikace probíhá uvnitř systému.

---

## 4. DEMO data

Pro rychlé testování lze použít stránku **DEMO data**, která:

- vygeneruje ukázkové články v různých stavech (koncept, recenze, publikováno),
- umožní data také smazat a začít znovu.

DEMO slouží pouze pro oponenty, aby se nemuseli ručně proklikávat celým procesem.
