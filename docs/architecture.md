# Architektura systému – Žďáráci (zjednodušená)

## 1) Cíl
Jedno místo pro práci redakce: odevzdání článků → recenze → úpravy → rozhodnutí → zařazení do čísla → publikace.

## 2) Role
Autor • Recenzent • Redaktor • Šéfredaktor • Čtenář (veřejně) • Administrátor

## 3) Hlavní moduly
- Přihlášení a role
- Články (odeslání, metadata, verze)
- Recenze (přiřazení, termíny, posudek)
- Rozhodnutí (redaktor/šéfredaktor)
- Čísla a publikace (sestavení vydání)
- Veřejná část (katalog čísel a článků)
- Administrace (uživatelé, šablony, nastavení)
- Přehledy a notifikace

## 4) Struktura obrazovek (mapa)
- **Login** → přesměrování na panel role
- **Autor**: Nový článek • Moje články (stav: koncept/odesláno/vráceno/přijato)
- **Recenzent**: Moje recenze • Formulář posudku
- **Redaktor**: Seznam článků • Přiřazení recenzentů • Termíny • Návrh rozhodnutí
- **Šéfredaktor**: Přehled k rozhodnutí • Finální schválení • Zařazení do čísla
- **Čísla**: Plán vydání • Obsah čísla • Publikovat
- **Veřejně**: Katalog čísel • Fulltext • Detail článku/stažení
- **Admin**: Uživatelé a role • Šablony (posudek, e-maily) • Obory/sekce

## 5) Jednoduché uživatelské toky
- **Autor**: Nový článek → odeslat → reagovat na připomínky → nahrát revizi → čeká na rozhodnutí.
- **Recenzent**: Přijatý úkol → vyplnit posudek → odeslat do termínu.
- **Redaktor**: Přijmout článek → vybrat recenzenty → hlídat termíny → navrhnout rozhodnutí.
- **Šéfredaktor**: Projít podklady → schválit/vrátit/odmítnout → zařadit do čísla → publikovat.
- **Čtenář**: Prohlížet čísla a články, vyhledávat, stahovat.

## 6) Stavový model článku (jednoduše)
Koncept → Odesláno → V recenzi → Po posudcích → (Vráceno k úpravě ↔ Znovu odesláno) → Přijato → Vydání → Publikováno / Odmítnuto.

## 7) Data (co si systém drží)
- **Uživatel**: jméno, role, kontakt (pro notifikace).
- **Článek**: název, autoři, soubor/y, verze, stav, termíny, historie.
- **Přiřazení recenze**: článek, recenzent, termín, stav.
- **Posudek**: odpovědi, doporučení, datum odeslání.
- **Číslo**: název/rok, seznam článků, stav (plánováno/publikováno).
- **Notifikace**: komu, co, kdy (např. nové zadání, blíží se termín, rozhodnutí).

## 8) Notifikace a připomínky
- Přiřazení recenze, blížící se termín, nové připomínky pro autora, finální rozhodnutí, publikace čísla.

## 9) Nefunkční požadavky
- Jednoduché formuláře, konzistentní vzhled, přístupnost.
- Přehledy „co mám udělat dnes“ pro každou roli.
- Dohledatelnost: historie změn u článku a posudků.

## 10) Roadmapa (podle sprintů)
1. Login + panely rolí + odhlášení  
2. Autor: nahrání souboru, metadata, verze, přehled stavů  
3. Redaktor: přiřazení recenzentů, termíny, přehled článků  
4. Recenzent + Šéfredaktor: posudek, doporučení, finální rozhodnutí  
5. Veřejná část: katalog čísel, fulltext, detail/stažení  
6. Administrace + přehledy + notifikace + nápověda
