# 🏢 RentPortal - System Zarządzania Nieruchomościami i Wynajmem

RentPortal to nowoczesna, wysoce zoptymalizowana i responsywna aplikacja internetowa (PWA) przeznaczona dla zarządców nieruchomości (Właścicieli) oraz najemców (Lokatorów). Aplikacja oferuje zaawansowane narzędzia do śledzenia płatności, kalkulacji kosztów taryfowych mediów na podstawie odczytów liczników, generowania dynamicznych umów najmu w formacie Word (.docx), wyliczania wskaźników ROI/ROE oraz automatycznej windykacji należności za pomocą czatu.

Aplikacja została zbudowana przy użyciu nowoczesnego stosu **React + Vite + Tailwind CSS** z pełnym decouplingiem logiki biznesowej od warstwy widoku oraz kompletnym zestawem automatycznych testów jednostkowych w **Vitest**.

---

## 🚀 Szybki Start (Środowisko Lokalne)

### Wymagania wstępne
* Zainstalowane środowisko **Node.js** (wersja 18.0 lub wyższa, rekomendowana v20)
* Menedżer pakietów **npm**

### Krok 1: Klonowanie i instalacja
1. Wejdź do katalogu aplikacji React:
   ```bash
   cd NIERUCHOMOSCI_ZARZAD
   ```
2. Zainstaluj wymagane zależności:
   ```bash
   npm install
   ```

### Krok 2: Uruchomienie serwera deweloperskiego
Uruchom serwer Vite:
```bash
npm run dev
```
Aplikacja zostanie uruchomiona lokalnie pod adresem: [http://localhost:3457](http://localhost:3457).

---

## 🛠️ Architektura i Konfiguracja Produkcyjna

### 1. Budowanie aplikacji (Production Bundle)
Aby skompilować aplikację do wersji produkcyjnej, uruchom:
```bash
npm run build
```
Vite wykorzystuje silnik **Rolldown + Oxc** do zoptymalizowanego dzielenia kodu (Code Splitting). Wynik kompilacji trafia do katalogu `dist/` i jest podzielony na niezależne, łatwe do buforowania paczki:
* `react-vendor` – rdzeń React & routing.
* `word-vendor` – pizzip & docxtemplater do generowania umów.
* `lucide-vendor` – zasoby ikon graficznych.
* `vendor` – pozostałe biblioteki.
* `index` – skompresowany, zoptymalizowany kod samej aplikacji.

Dzięki względnemu adresowaniu zasobów (`base: './'`) wygenerowana paczka produkcyjna może być hostowana bez zmian na **Vercel, Netlify, GitHub Pages lub dowolnym tradycyjnym serwerze Apache/Nginx**.

### 2. Bezpieczny Zapis Dokumentów (Vite Dev Server Middleware)
W celach deweloperskich i lokalnych, serwer deweloperski Vite posiada wbudowany middleware (`configureServer` w `vite.config.js`), który:
* Obsługuje endpoint `POST /api/save-document` w celu fizycznego zapisu wygenerowanych umów Word, raportów finansowych oraz protokołów odbiorczych bezpośrednio na dysku komputera pod ścieżką `NIERUCHOMOSCI_ZARZAD/public/generated_docs/`.
* Serwuje pliki Word (.docx) z poprawnymi nagłówkami MIME i `Content-Disposition`, zapobiegając ich wadliwemu pobieraniu jako archiwa ZIP.

---

## 🧪 Testy i Zautomatyzowany Workflow (CI/CD)

### 1. Testy Jednostkowe i Integracyjne (Vitest)
Aplikacja posiada rygorystyczny zestaw **52 testów automatycznych**, weryfikujących logikę biznesową w pełnym pokryciu.
Aby uruchomić testy lokalnie:
```bash
npm test
```

### 2. Zabezpieczenia Pre-commit (Husky + lint-staged)
Zainstalowane w projekcie narzędzie **Husky** we współpracy z **lint-staged** zapobiega commitowaniu kodu zawierającego błędy:
* Przed każdym commitem automatycznie uruchamia się `eslint --fix` na modyfikowanych plikach, naprawiając i sprawdzając styl kodu.
* Następnie automatycznie odpala się cała pula testów `npm test`. **Jeśli jakikolwiek test nie przejdzie, commit zostaje zablokowany!**

### 3. Zautomatyzowany rurociąg CI/CD (GitHub Actions)
W katalogu `.github/workflows/deploy.yml` skonfigurowany został automatyczny rurociąg CI/CD:
* **Trigger:** Uruchamia się przy każdym `push` lub `pull_request` do gałęzi `main`.
* **Kroki:**
  1. Klonuje kod i instaluje czyste zależności produkcyjne (`npm ci`).
  2. Odpala weryfikację ESLint (`npm run lint`).
  3. Uruchamia wszystkie testy jednostkowe (`npm test`).
  4. Jeśli testy zakończą się sukcesem, buduje produkcyjną paczkę (`npm run build`).
  5. **Wdrożenie:** Automatycznie publikuje i aktualizuje wersję produkcyjną na platformie **GitHub Pages** (lub Vercel/Netlify) z zerowym czasem przestoju (Zero Downtime).

---

## 📂 Struktura Katalogów Logiki Biznesowej

* [`src/services/landlordService.js`](file:///Users/KRZYSZTOF/Documents/ANTIGRAVITY/NIERUCHOMOSCI_PROJECT/NIERUCHOMOSCI_ZARZAD/src/services/landlordService.js) – kalkulacje kar umownych, ROI/ROE, vacancy rates per property, analizy opóźnień płatności (Aging Debts).
* [`src/services/tenantService.js`](file:///Users/KRZYSZTOF/Documents/ANTIGRAVITY/NIERUCHOMOSCI_PROJECT/NIERUCHOMOSCI_ZARZAD/src/services/tenantService.js) – wyliczanie dni do końca umowy najmu, kolorowanie alertów statusowych, sumowanie sald płatności najemcy.
* [`src/services/billingService.js`](file:///Users/KRZYSZTOF/Documents/ANTIGRAVITY/NIERUCHOMOSCI_PROJECT/NIERUCHOMOSCI_ZARZAD/src/services/billingService.js) – walidacja danych faktur, sumowanie stopek finansowych raportów A4, sekwencyjna generacja numerów FV.
* [`src/services/meterService.js`](file:///Users/KRZYSZTOF/Documents/ANTIGRAVITY/NIERUCHOMOSCI_PROJECT/NIERUCHOMOSCI_ZARZAD/src/services/meterService.js) – wyliczanie zużycia i kosztów brutto EE/Gaz/Woda/Ogrzewanie wraz z VAT 23%, stałymi i zmiennymi opłatami taryfowymi, grupowanie i walidacja regresji odczytów.
* [`src/utils/storage.js`](file:///Users/KRZYSZTOF/Documents/ANTIGRAVITY/NIERUCHOMOSCI_PROJECT/NIERUCHOMOSCI_ZARZAD/src/utils/storage.js) – transakcyjna baza danych LocalStorage obsługująca deduplikację najemców, soft-delete, archiwum i notatki notes CRM.
