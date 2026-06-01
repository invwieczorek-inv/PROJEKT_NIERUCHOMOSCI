import React, { useState, useEffect, useMemo } from "react";
import { 
  getPropertiesByLandlord, 
  getTenants, 
  updatePropertyTenant, 
  addProperty,
  getDocumentsForProperty,
  addDocument,
  deleteDocument,
  openDocumentFile,
  addTenant,
  archiveTenant,
  addTenantNote,
  deleteTenantNote,
  updateProperty,
  deleteProperty,
  updateTenantSummary,
  getInvoicesForTenant,
  getPaymentTimeliness,
  getPropertyById,
  addMeterReading,
  getHandoverProtocolByProperty,
  saveHandoverProtocol,
  deleteHandoverProtocolData,
  getLatestMeterReading,
  saveHandoverProtocolMeterReadings,
  deleteHandoverProtocolMeterReadings,
  deleteHandoverProtocolDataByType,
  registerEarlyTermination,
  clearEarlyTermination
} from "../../utils/storage";
import { 
  Home, 
  UserPlus, 
  Trash2, 
  Calendar, 
  MapPin, 
  Building, 
  Plus, 
  CheckCircle, 
  Info, 
  FileText, 
  UploadCloud, 
  Eye,
  Search,
  PlusCircle,
  Clock,
  Edit,
  X,
  Sparkles,
  Download
} from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

function numberToPolishWords(number) {
  if (isNaN(number) || number === null || number === undefined) return "";
  const num = Math.floor(Number(number));
  if (num === 0) return "zero";

  const units = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
  const teens = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
  const tens = ["", "dziesięć", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
  const hundreds = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];

  let words = [];

  // Handle thousands
  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      words.push("tysiąc");
    } else {
      words.push(numberToPolishWords(thousands));
      const lastDigit = thousands % 10;
      const lastTwoDigits = thousands % 100;
      if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits > 20)) {
        words.push("tysiące");
      } else {
        words.push("tysięcy");
      }
    }
  }

  // Handle hundreds
  const h = Math.floor(remainder / 100);
  const tenRemainder = remainder % 100;
  if (h > 0) {
    words.push(hundreds[h]);
  }

  // Handle tens and units
  if (tenRemainder > 0) {
    if (tenRemainder >= 10 && tenRemainder < 20) {
      words.push(teens[tenRemainder - 10]);
    } else {
      const t = Math.floor(tenRemainder / 10);
      const u = tenRemainder % 10;
      if (t > 0) {
        words.push(tens[t]);
      }
      if (u > 0) {
        words.push(units[u]);
      }
    }
  }

  return words.filter(w => w !== "").join(" ");
}

const generateProtocolHtml = (data, prop, tenant) => {
  const isEntry = data.protocolType === "entry";
  const protocolTypeName = isEntry ? "ZDAWCZY (Wydanie Lokalu)" : "ODBIORCZY (Zwrot Lokalu)";
  const docDate = data.documentDate || new Date().toISOString().split('T')[0];

  const getConditionSpan = (val) => {
    let color = "#10b981"; // green
    if (val <= 2) color = "#ef4444"; // red
    else if (val <= 3) color = "#f59e0b"; // orange
    else if (val <= 4) color = "#3b82f6"; // blue
    return `<span style="font-weight: bold; color: ${color};">${val}/5</span>`;
  };

  const getYesNoSpan = (val) => {
    return val 
      ? `<span style="font-weight: bold; color: #10b981;">TAK (Sprawne)</span>`
      : `<span style="font-weight: bold; color: #ef4444;">NIE (Niesprawne)</span>`;
  };

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Protokół Zdawczo-Odbiorczy - ${prop.title || "Lokal"}</title>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #3730a3;
      --text: #1f2937;
      --text-muted: #6b7280;
      --bg: #f9fafb;
      --border: #e5e7eb;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Outfit', sans-serif;
      color: var(--text);
      background-color: var(--bg);
      line-height: 1.5;
      font-size: 13px;
      padding: 20px;
    }
    .wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      position: relative;
    }
    .control-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111827;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      max-width: 800px;
      margin: 0 auto 20px auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .control-bar h4 {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .control-bar-buttons {
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover {
      background: var(--primary-dark);
    }
    .btn-secondary {
      background: #374151;
      color: white;
    }
    .btn-secondary:hover {
      background: #4b5563;
    }
    
    header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 15px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #e0e7ff;
      color: var(--primary);
      border-radius: 9999px;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-top: 5px;
    }
    .doc-meta {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 5px;
    }
    
    h2 {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      border-left: 4px solid var(--primary);
      padding-left: 8px;
      margin: 25px 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 6px 10px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    .col-element { width: 35%; }
    .col-condition { width: 15%; text-align: center; }
    .col-notes { width: 50%; }

    .party-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .party-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 15px;
      background: #fafafa;
    }
    .party-card h3 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      border-bottom: 1px dashed var(--border);
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .party-info {
      font-size: 12px;
      line-height: 1.6;
    }
    
    .signature-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 40px;
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .signature-box {
      border-top: 1px dashed #9ca3af;
      text-align: center;
      padding-top: 15px;
    }
    .signature-label {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .signature-value {
      font-family: 'Caveat', cursive;
      font-size: 32px;
      color: #1e3a8a;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 5px;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
        font-size: 11px;
      }
      .wrapper {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .control-bar {
        display: none !important;
      }
      @page {
        margin: 15mm;
      }
    }
  </style>
</head>
<body>

  <div class="control-bar">
    <h4>📄 PODGLĄD PROTOKOŁU: ${protocolTypeName}</h4>
    <div class="control-bar-buttons">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Drukuj / Zapisz jako PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">❌ Zamknij</button>
    </div>
  </div>

  <div class="wrapper">
    <header>
      <span class="badge">Protokół ${isEntry ? 'Zdawczy' : 'Odbiorczy'}</span>
      <h1>PROTOKÓŁ ZDAWCZO-ODBIORCZY</h1>
      <p class="doc-meta">Sporządzony dnia <strong>${docDate}</strong> w miejscowości <strong>${data.documentPlace || "Kraków"}</strong></p>
    </header>

    <h2>1. Strony i Metryka</h2>
    <div class="party-grid">
      <div class="party-card">
        <h3>Wynajmujący / Zarządca</h3>
        <div class="party-info">
          <strong>Imię i Nazwisko:</strong> ${data.landlordName || "Krzysztof"}<br>
          <strong>Rola:</strong> Właściciel / Zarządca Lokalu
        </div>
      </div>
      <div class="party-card">
        <h3>Najemca lokalu</h3>
        <div class="party-info">
          <strong>Imię i Nazwisko:</strong> ${data.tenantName}<br>
          <strong>Telefon:</strong> ${data.tenantPhone || "brak"}<br>
          <strong>E-mail:</strong> ${data.tenantEmail || "brak"}<br>
          <strong>Zameldowanie:</strong> ${data.tenantAddress || "brak"}
        </div>
      </div>
    </div>
    
    <table style="margin-top: 10px;">
      <tr>
        <th style="width: 30%;">Przedmiot protokołu</th>
        <td>Lokal mieszkalny: <strong>${data.propertyAddress}</strong></td>
      </tr>
      <tr>
        <th>Księga Wieczysta</th>
        <td><code style="font-family: monospace;">${data.landRegister || "brak"}</code></td>
      </tr>
      <tr>
        <th>Typ protokołu</th>
        <td>${isEntry ? 'Przekazanie lokalu (Protokół Zdawczy przy wydaniu przedmiotu najmu)' : 'Zwrot lokalu (Protokół Odbiorczy przy zdaniu lokalu)'}</td>
      </tr>
    </table>

    <div class="page-break"></div>

    <h2>2. Stan Techniczny Pomieszczeń</h2>
    
    <h3>Salon i Pokój Dzienny</h3>
    <table>
      <thead>
        <tr>
          <th class="col-element">Element</th>
          <th class="col-condition">Ocena stanu</th>
          <th class="col-notes">Uwagi / Zastrzeżenia</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Ściany i sufity</td><td class="col-condition">${getConditionSpan(data.salon.walls.condition)}</td><td>${data.salon.walls.notes || "bez uwag"}</td></tr>
        <tr><td>Podłogi i listwy przypodłogowe</td><td class="col-condition">${getConditionSpan(data.salon.floors.condition)}</td><td>${data.salon.floors.notes || "bez uwag"}</td></tr>
        <tr><td>Okna, szyby i parapety</td><td class="col-condition">${getConditionSpan(data.salon.windows.condition)}</td><td>${data.salon.windows.notes || "bez uwag"}</td></tr>
        <tr><td>Drzwi i ościeżnice</td><td class="col-condition">${getConditionSpan(data.salon.doors.condition)}</td><td>${data.salon.doors.notes || "bez uwag"}</td></tr>
        <tr><td>Grzejniki centralnego ogrzewania</td><td class="col-condition">${getConditionSpan(data.salon.radiators.condition)}</td><td>${data.salon.radiators.notes || "bez uwag"}</td></tr>
        <tr><td>Meble i wyposażenie ruchome</td><td class="col-condition">${getConditionSpan(data.salon.furniture.condition)}</td><td>${data.salon.furniture.notes || "bez uwag"}</td></tr>
        <tr><td>Gniazdka elektryczne i włączniki</td><td class="col-condition">${getConditionSpan(data.salon.sockets.condition)}</td><td>${data.salon.sockets.notes || "bez uwag"}</td></tr>
      </tbody>
    </table>

    <h3>Sypialnia</h3>
    <table>
      <thead>
        <tr>
          <th class="col-element">Element</th>
          <th class="col-condition">Ocena stanu</th>
          <th class="col-notes">Uwagi / Zastrzeżenia</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Ściany i sufity</td><td class="col-condition">${getConditionSpan(data.sypialnia.walls.condition)}</td><td>${data.sypialnia.walls.notes || "bez uwag"}</td></tr>
        <tr><td>Podłogi i listwy przypodłogowe</td><td class="col-condition">${getConditionSpan(data.sypialnia.floors.condition)}</td><td>${data.sypialnia.floors.notes || "bez uwag"}</td></tr>
        <tr><td>Okna, szyby i parapety</td><td class="col-condition">${getConditionSpan(data.sypialnia.windows.condition)}</td><td>${data.sypialnia.windows.notes || "bez uwag"}</td></tr>
        <tr><td>Drzwi i ościeżnice</td><td class="col-condition">${getConditionSpan(data.sypialnia.doors.condition)}</td><td>${data.sypialnia.doors.notes || "bez uwag"}</td></tr>
        <tr><td>Grzejniki centralnego ogrzewania</td><td class="col-condition">${getConditionSpan(data.sypialnia.radiators.condition)}</td><td>${data.sypialnia.radiators.notes || "bez uwag"}</td></tr>
        <tr><td>Meble i wyposażenie ruchome</td><td class="col-condition">${getConditionSpan(data.sypialnia.furniture.condition)}</td><td>${data.sypialnia.furniture.notes || "bez uwag"}</td></tr>
        <tr><td>Gniazdka elektryczne i włączniki</td><td class="col-condition">${getConditionSpan(data.sypialnia.sockets.condition)}</td><td>${data.sypialnia.sockets.notes || "bez uwag"}</td></tr>
      </tbody>
    </table>

    <div class="page-break"></div>

    <h3>Kuchnia</h3>
    <table>
      <thead>
        <tr>
          <th class="col-element">Element</th>
          <th class="col-condition">Ocena stanu</th>
          <th class="col-notes">Uwagi / Zastrzeżenia</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Ściany i sufity</td><td class="col-condition">${getConditionSpan(data.kuchnia.walls.condition)}</td><td>${data.kuchnia.walls.notes || "bez uwag"}</td></tr>
        <tr><td>Podłogi i listwy przypodłogowe</td><td class="col-condition">${getConditionSpan(data.kuchnia.floors.condition)}</td><td>${data.kuchnia.floors.notes || "bez uwag"}</td></tr>
        <tr><td>Okna i stolarka okienna</td><td class="col-condition">${getConditionSpan(data.kuchnia.windows.condition)}</td><td>${data.kuchnia.windows.notes || "bez uwag"}</td></tr>
        <tr><td>Zlew kuchenny i baterie</td><td class="col-condition">${getConditionSpan(data.kuchnia.sink.condition)}</td><td>${data.kuchnia.sink.notes || "bez uwag"}</td></tr>
        <tr><td>Meble kuchenne i szafki</td><td class="col-condition">${getConditionSpan(data.kuchnia.furniture.condition)}</td><td>${data.kuchnia.furniture.notes || "bez uwag"}</td></tr>
      </tbody>
    </table>

    <h4>Sprzęty AGD i weryfikacja techniczna:</h4>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Urządzenie</th>
          <th style="width: 20%;">Sprawność</th>
          <th style="width: 15%;">Ocena</th>
          <th style="width: 40%;">Uwagi szczegółowe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Lodówka i zamrażarka</td>
          <td>${getYesNoSpan(data.kuchnia.appliances.fridge.working)}</td>
          <td style="text-align: center;">${getConditionSpan(data.kuchnia.appliances.fridge.condition)}</td>
          <td>${data.kuchnia.appliances.fridge.notes || "bez zastrzeżeń"}</td>
        </tr>
        <tr>
          <td>Płyta grzewcza / kuchenka</td>
          <td>${getYesNoSpan(data.kuchnia.appliances.hob.working)}</td>
          <td style="text-align: center;">${getConditionSpan(data.kuchnia.appliances.hob.condition)}</td>
          <td>${data.kuchnia.appliances.hob.notes || "bez zastrzeżeń"}</td>
        </tr>
        <tr>
          <td>Piekarnik elektryczny</td>
          <td>${getYesNoSpan(data.kuchnia.appliances.oven.working)}</td>
          <td style="text-align: center;">${getConditionSpan(data.kuchnia.appliances.oven.condition)}</td>
          <td>${data.kuchnia.appliances.oven.notes || "bez zastrzeżeń"}</td>
        </tr>
        <tr>
          <td>Zmywarka do naczyń</td>
          <td>${getYesNoSpan(data.kuchnia.appliances.dishwasher.working)}</td>
          <td style="text-align: center;">${getConditionSpan(data.kuchnia.appliances.dishwasher.condition)}</td>
          <td>${data.kuchnia.appliances.dishwasher.notes || "bez zastrzeżeń"}</td>
        </tr>
      </tbody>
    </table>

    <div class="page-break"></div>

    <h3>Łazienka i Przedpokój</h3>
    <table>
      <thead>
        <tr>
          <th class="col-element">Obszar i Element</th>
          <th class="col-condition">Ocena stanu</th>
          <th class="col-notes">Uwagi / Zastrzeżenia</th>
        </tr>
      </thead>
      <tbody>
        <!-- Łazienka -->
        <tr><td>[Ł] Ściany, płytki i sufity</td><td class="col-condition">${getConditionSpan(data.lazienka.walls.condition)}</td><td>${data.lazienka.walls.notes || "bez uwag"}</td></tr>
        <tr><td>[Ł] Podłoga i hydroizolacja</td><td class="col-condition">${getConditionSpan(data.lazienka.floors.condition)}</td><td>${data.lazienka.floors.notes || "bez uwag"}</td></tr>
        <tr><td>[Ł] Drzwi łazienkowe</td><td class="col-condition">${getConditionSpan(data.lazienka.doors.condition)}</td><td>${data.lazienka.doors.notes || "bez uwag"}</td></tr>
        <tr><td>[Ł] Sanitariaty (wanna/prysznic, wc, umywalka)</td><td class="col-condition">${getConditionSpan(data.lazienka.sanitary.condition)}</td><td>${data.lazienka.sanitary.notes || "bez uwag"}</td></tr>
        <tr><td>[Ł] Grzejnik drabinkowy / ogrzewanie</td><td class="col-condition">${getConditionSpan(data.lazienka.radiator.condition)}</td><td>${data.lazienka.radiator.notes || "bez uwag"}</td></tr>
        <!-- Przedpokój -->
        <tr><td>[P] Ściany i sufity</td><td class="col-condition">${getConditionSpan(data.przedpokoj.walls.condition)}</td><td>${data.przedpokoj.walls.notes || "bez uwag"}</td></tr>
        <tr><td>[P] Podłoga</td><td class="col-condition">${getConditionSpan(data.przedpokoj.floors.condition)}</td><td>${data.przedpokoj.floors.notes || "bez uwag"}</td></tr>
        <tr><td>[P] Drzwi wejściowe i zamki</td><td class="col-condition">${getConditionSpan(data.przedpokoj.doors.condition)}</td><td>${data.przedpokoj.doors.notes || "bez uwag"}</td></tr>
        <tr><td>[P] Domofon</td><td class="col-condition">${getConditionSpan(data.przedpokoj.intercom.condition)}</td><td>${data.przedpokoj.intercom.notes || "bez uwag"}</td></tr>
        <tr><td>[P] Szafy wnękowe / meble</td><td class="col-condition">${getConditionSpan(data.przedpokoj.furniture.condition)}</td><td>${data.przedpokoj.furniture.notes || "bez uwag"}</td></tr>
      </tbody>
    </table>

    <h4>Pralka i weryfikacja techniczna:</h4>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Urządzenie</th>
          <th style="width: 20%;">Sprawność</th>
          <th style="width: 15%;">Ocena</th>
          <th style="width: 40%;">Uwagi szczegółowe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Pralka automatyczna</td>
          <td>${getYesNoSpan(data.lazienka.washingMachine.working)}</td>
          <td style="text-align: center;">${getConditionSpan(data.lazienka.washingMachine.condition)}</td>
          <td>${data.lazienka.washingMachine.notes || "bez zastrzeżeń"}</td>
        </tr>
      </tbody>
    </table>

    <h2>3. Stan Ogólny i Estetyka</h2>
    <table>
      <tr>
        <th style="width: 30%;">Zapach w lokalu</th>
        <td>${data.general.smell === 'neutral' ? 'Neutralny / bezzapachowy' : data.general.smell === 'pleasant' ? 'Przyjemny / świeży' : 'Nieprzyjemny (wilgoć / stęchlizna / dym)'}</td>
      </tr>
      <tr>
        <th>Czystość i porządek</th>
        <td>${data.general.cleanliness === 'clean' ? 'Lokal bardzo czysty, gotowy do zamieszkania' : data.general.cleanliness === 'needs_cleaning' ? 'Wymaga drobnego sprzątania' : 'Lokal brudny, rażące zaniedbania czystości'}</td>
      </tr>
      ${data.general.comments ? `<tr><th>Uwagi ogólne zarządcy</th><td>${data.general.comments}</td></tr>` : ''}
    </table>

    <div class="page-break"></div>

    <h2>4. Odczyty Liczników i Stan Mediów</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 30%;">Typ licznika</th>
          <th style="width: 30%;">Numer fabryczny / seryjny</th>
          <th style="width: 20%;">Odczyt / Stan</th>
          <th style="width: 20%;">Uwagi</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>💡 <strong>Energia elektryczna (kWh)</strong></td>
          <td><code>${data.meters.electricity.serial || "brak"}</code></td>
          <td style="font-weight: bold; text-align: right;">${data.meters.electricity.value} kWh</td>
          <td>${data.meters.electricity.notes || "—"}</td>
        </tr>
        <tr>
          <td>🔥 <strong>Gaz ziemny (m³)</strong></td>
          <td><code>${data.meters.gas.serial || "brak"}</code></td>
          <td style="font-weight: bold; text-align: right;">${data.meters.gas.value} m³</td>
          <td>${data.meters.gas.notes || "—"}</td>
        </tr>
        <tr>
          <td>♨️ <strong>Ogrzewanie (GJ)</strong></td>
          <td><code>${data.meters.heating.serial || "brak"}</code></td>
          <td style="font-weight: bold; text-align: right;">${data.meters.heating.value} GJ</td>
          <td>${data.meters.heating.notes || "—"}</td>
        </tr>
        <tr>
          <td>💧 <strong>Ciepła woda (m³)</strong></td>
          <td><code>${data.meters.water_hot.serial || "brak"}</code></td>
          <td style="font-weight: bold; text-align: right;">${data.meters.water_hot.value} m³</td>
          <td>${data.meters.water_hot.notes || "—"}</td>
        </tr>
        <tr>
          <td>🚰 <strong>Zimna woda (m³)</strong></td>
          <td><code>${data.meters.water_cold.serial || "brak"}</code></td>
          <td style="font-weight: bold; text-align: right;">${data.meters.water_cold.value} m³</td>
          <td>${data.meters.water_cold.notes || "—"}</td>
        </tr>
      </tbody>
    </table>

    <h2>5. Przekazane Klucze i Akcesoria</h2>
    <table>
      <thead>
        <tr>
          <th>Klucz / pilot / karta</th>
          <th style="width: 30%; text-align: center;">Liczba przekazanych sztuk</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Klucze do drzwi wejściowych (lokal)</td><td style="text-align: center; font-weight: bold;">${data.keys.entryKeys} szt.</td></tr>
        <tr><td>Klucze do skrzynki pocztowej</td><td style="text-align: center; font-weight: bold;">${data.keys.mailboxKeys} szt.</td></tr>
        <tr><td>Chip / Karta dostępowa do klatki schodowej</td><td style="text-align: center; font-weight: bold;">${data.keys.doorChip} szt.</td></tr>
        <tr><td>Pilot do bramy wjazdowej / garażu</td><td style="text-align: center; font-weight: bold;">${data.keys.gateRemote} szt.</td></tr>
        ${data.keys.notes ? `<tr><td>Uwagi i dodatkowe akcesoria</td><td>${data.keys.notes}</td></tr>` : ''}
      </tbody>
    </table>

    <h2>6. Oświadczenia i Podpisy</h2>
    <div style="font-size: 11px; color: #4b5563; text-align: justify; line-height: 1.6; border: 1px solid var(--border); padding: 12px; border-radius: 6px; background: #fafafa; margin-bottom: 20px;">
      <p style="margin-bottom: 8px;"><strong>Oświadczenie Najemcy:</strong> Najemca oświadcza, że dokonał szczegółowych oględzin opisywanego lokalu wraz z jego wyposażeniem i potwierdza, że ich stan techniczny oraz sanitarny jest zgodny z opisem sporządzonym w niniejszym protokole. Najemca zobowiązuje się zgłosić wszelkie ewentualne wady ukryte, niewykryte w trakcie rutynowych oględzin, w terminie <strong>48 godzin</strong> od podpisania protokołu, w formie pisemnej pod rygorem wygaśnięcia roszczeń z tego tytułu.</p>
      <p><strong>Zgoda stron:</strong> Strony zgodnie oświadczają, że dane i stany liczników wykazane w protokole są prawdziwe i stanowią punkt odniesienia do rozliczenia mediów w okresie najmu.</p>
    </div>

    <div class="signature-grid">
      <div class="signature-box">
        <div class="signature-value">${data.signatures.landlordSignature || "Krzysztof"}</div>
        <div class="signature-label">Wynajmujący / Zarządca</div>
      </div>
      <div class="signature-box">
        <div class="signature-value">${data.signatures.tenantSignature || ""}</div>
        <div class="signature-label">Najemca lokalu</div>
      </div>
    </div>
  </div>

</body>
</html>
`;
};

const getProtocolDifferences = (initial, final) => {
  if (!initial || !final) return [];
  const differences = [];

  const rooms = ["salon", "sypialnia", "kuchnia", "lazienka", "przedpokoj"];
  
  const roomLabels = {
    salon: "Salon",
    sypialnia: "Sypialnia",
    kuchnia: "Kuchnia",
    lazienka: "Łazienka",
    przedpokoj: "Przedpokój"
  };

  const itemLabels = {
    walls: "Ściany",
    floors: "Podłogi",
    windows: "Okna",
    doors: "Drzwi",
    radiators: "Grzejniki",
    furniture: "Meble",
    sockets: "Gniazdka elektryczne",
    sink: "Zlew",
    sanitary: "Sanitariaty (wanna/prysznic/WC)",
    radiator: "Grzejnik łazienkowy",
    intercom: "Domofon",
    fridge: "Lodówka (AGD)",
    hob: "Płyta grzewcza (AGD)",
    oven: "Piekarnik (AGD)",
    dishwasher: "Zmywarka (AGD)",
    washingMachine: "Pralka (AGD)"
  };

  rooms.forEach(room => {
    const initRoom = initial[room] || {};
    const finRoom = final[room] || {};

    Object.keys(initRoom).forEach(itemKey => {
      if (itemKey === "appliances" || itemKey === "washingMachine") return;

      const initItem = initRoom[itemKey] || {};
      const finItem = finRoom[itemKey] || {};

      if (typeof initItem.condition === "number" && typeof finItem.condition === "number") {
        if (finItem.condition < initItem.condition) {
          differences.push({
            id: `${room}_${itemKey}`,
            room: roomLabels[room],
            item: itemLabels[itemKey] || itemKey,
            type: "condition_drop",
            initialVal: `${initItem.condition}/5`,
            finalVal: `${finItem.condition}/5`,
            description: `Spadek oceny stanu z ${initItem.condition}/5 na ${finItem.condition}/5.${finItem.notes ? ' Uwagi: ' + finItem.notes : ''}`
          });
        }
      }
    });

    if (room === "kuchnia" && initRoom.appliances && finRoom.appliances) {
      Object.keys(initRoom.appliances).forEach(appKey => {
        const initApp = initRoom.appliances[appKey] || {};
        const finApp = finRoom.appliances[appKey] || {};

        if (typeof initApp.condition === "number" && typeof finApp.condition === "number") {
          if (finApp.condition < initApp.condition) {
            differences.push({
              id: `kuchnia_appliance_${appKey}_condition`,
              room: "Kuchnia (Urządzenia)",
              item: itemLabels[appKey] || appKey,
              type: "condition_drop",
              initialVal: `${initApp.condition}/5`,
              finalVal: `${finApp.condition}/5`,
              description: `Spadek oceny stanu urządzenia z ${initApp.condition}/5 na ${finApp.condition}/5.${finApp.notes ? ' Uwagi: ' + finApp.notes : ''}`
            });
          }
        }
        if (initApp.working === true && finApp.working === false) {
          differences.push({
            id: `kuchnia_appliance_${appKey}_working`,
            room: "Kuchnia (Urządzenia)",
            item: itemLabels[appKey] || appKey,
            type: "working_failure",
            initialVal: "Sprawne",
            finalVal: "Niesprawne",
            description: `Urządzenie przestało działać.${finApp.notes ? ' Uwagi: ' + finApp.notes : ''}`
          });
        }
      });
    }

    if (room === "lazienka" && initRoom.washingMachine && finRoom.washingMachine) {
      const initW = initRoom.washingMachine;
      const finW = finRoom.washingMachine;

      if (typeof initW.condition === "number" && typeof finW.condition === "number") {
        if (finW.condition < initW.condition) {
          differences.push({
            id: `lazienka_washingMachine_condition`,
            room: "Łazienka (Urządzenia)",
            item: itemLabels.washingMachine,
            type: "condition_drop",
            initialVal: `${initW.condition}/5`,
            finalVal: `${finW.condition}/5`,
            description: `Spadek oceny stanu pralki z ${initW.condition}/5 na ${finW.condition}/5.${finW.notes ? ' Uwagi: ' + finW.notes : ''}`
          });
        }
      }
      if (initW.working === true && finW.working === false) {
        differences.push({
          id: `lazienka_washingMachine_working`,
          room: "Łazienka (Urządzenia)",
          item: itemLabels.washingMachine,
          type: "working_failure",
          initialVal: "Sprawne",
          finalVal: "Niesprawne",
          description: `Pralka przestała działać.${finW.notes ? ' Uwagi: ' + finW.notes : ''}`
        });
      }
    }
  });

  return differences;
};

const generateDifferenceReportHtml = (propertyName, tenantName, diffs, comparisonCosts, comparisonComments, total, deposit, penaltyAmount = 0) => {
  const currentDate = new Date().toLocaleDateString('pl-PL');

  const rows = diffs.map((diff, index) => {
    const cost = comparisonCosts[diff.id] || 0;
    const comment = comparisonComments[diff.id] || "";
    return `
      <tr>
        <td style="text-align: center; font-weight: bold;">${index + 1}</td>
        <td><strong>${diff.room}</strong><br><span style="color: var(--text-muted); font-size: 11px;">${diff.item}</span></td>
        <td style="text-align: center; color: #10b981; font-weight: bold;">${diff.initialVal}</td>
        <td style="text-align: center; color: #ef4444; font-weight: bold;">${diff.finalVal}</td>
        <td>${diff.description}</td>
        <td>${comment || '<span style="color: #9ca3af; font-style: italic;">Brak uwag</span>'}</td>
        <td style="text-align: right; font-weight: bold; color: #b91c1c;">${Number(cost).toFixed(2)} PLN</td>
      </tr>
    `;
  }).join("");

  const penaltyRow = parseFloat(penaltyAmount) > 0 
    ? `
      <tr style="background-color: #fffbeb; font-weight: bold; border: 1.5px solid #f59e0b;">
        <td style="text-align: center; font-weight: bold; color: #d97706;">★</td>
        <td><strong>Rozliczenie najmu przed czasem</strong><br><span style="color: #d97706; font-size: 11px;">Kara umowna za wcześniejsze rozwiązanie</span></td>
        <td style="text-align: center; color: var(--text-muted);">-</td>
        <td style="text-align: center; color: var(--text-muted);">-</td>
        <td>Wcześniejsze rozwiązanie umowy najmu przed terminem wygaśnięcia.</td>
        <td style="color: #b45309;">Naliczona kara umowna wg regulaminu</td>
        <td style="text-align: right; font-weight: bold; color: #b91c1c;">${Number(penaltyAmount).toFixed(2)} PLN</td>
      </tr>
    `
    : "";

  const depositVal = parseFloat(deposit) || 0;
  const penaltyVal = parseFloat(penaltyAmount) || 0;
  const repairCosts = parseFloat(total) || 0;
  const balance = depositVal - (repairCosts + penaltyVal);
  const balanceLabel = balance >= 0 ? "ZWROT DLA LOKATORA" : "DOPŁATA OD LOKATORA";
  const balanceColor = balance >= 0 ? "#10b981" : "#ef4444";


  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Protokół Różnicowy - Zestawienie Zniszczeń i Napraw</title>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #3730a3;
      --text: #1f2937;
      --text-muted: #6b7280;
      --bg: #f9fafb;
      --border: #e5e7eb;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Outfit', sans-serif;
      color: var(--text);
      background-color: var(--bg);
      line-height: 1.5;
      font-size: 13px;
      padding: 20px;
    }
    .wrapper {
      max-width: 850px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      position: relative;
    }
    .control-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111827;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      max-width: 850px;
      margin: 0 auto 20px auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .control-bar h4 {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .control-bar-buttons {
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover {
      background: var(--primary-dark);
    }
    .btn-secondary {
      background: #374151;
      color: white;
    }
    .btn-secondary:hover {
      background: #4b5563;
    }
    
    header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 15px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
      border-radius: 30px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 5px;
    }
    .doc-meta {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .party-card {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 15px;
      border-left: 4px solid var(--primary);
    }
    .party-card h3 {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .party-card p {
      margin-bottom: 4px;
    }
    
    .summary-box {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .summary-box h3 {
      color: #991b1b;
      font-size: 15px;
    }
    .summary-total {
      font-size: 24px;
      font-weight: 700;
      color: #b91c1c;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 12px;
      text-align: left;
      font-size: 12px;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .signatures-box {
      margin-top: 50px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
    }
    .signature-slot {
      text-align: center;
      border-top: 1px dashed var(--border);
      padding-top: 15px;
    }
    .signature-slot h4 {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }
    .signature-handwritten {
      font-family: 'Caveat', cursive;
      font-size: 28px;
      color: #1e3a8a;
      margin-bottom: 10px;
    }
    
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .wrapper {
        box-shadow: none;
        padding: 0;
      }
      .control-bar {
        display: none;
      }
      .btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="control-bar">
    <h4>Generator Protokołu Różnicowego (PDF)</h4>
    <div class="control-bar-buttons">
      <button class="btn btn-secondary" onclick="window.close()">Zamknij</button>
      <button class="btn btn-primary" onclick="window.print()">
        <svg style="width:14px;height:14px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
        Drukuj / Zapisz jako PDF
      </button>
    </div>
  </div>

  <div class="wrapper">
    <header>
      <div class="badge">Raport Różnicowy</div>
      <h1>PROTOKÓŁ PORÓWNAWCZY (RÓŻNICOWY)</h1>
      <div class="doc-meta">
        Sporządzono dnia: <strong>${currentDate}</strong> | Lokal: <strong>${propertyName}</strong>
      </div>
    </header>

    <div class="parties-grid">
      <div class="party-card">
        <h3>Wynajmujący</h3>
        <p><strong>Krzysztof</strong></p>
        <p>Właściciel / Zarządca</p>
      </div>
      <div class="party-card">
        <h3>Najemca</h3>
        <p><strong>${tenantName}</strong></p>
        <p>Osoba zdająca lokal</p>
      </div>
    </div>

    <div class="summary-box" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1.2fr; gap: 15px; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; color: var(--text); align-items: center; padding: 15px 20px;">
      <div style="border-right: 1px solid #e2e8f0; padding-right: 10px;">
        <span style="font-size: 9px; color: var(--text-muted); font-weight: bold; text-transform: uppercase;">Wpłacona kaucja</span>
        <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 4px;">${depositVal.toFixed(2)} PLN</div>
      </div>
      <div style="border-right: 1px solid #e2e8f0; padding-right: 10px;">
        <span style="font-size: 9px; color: var(--text-muted); font-weight: bold; text-transform: uppercase;">Obciążenie za zerwanie umowy</span>
        <div style="font-size: 15px; font-weight: 700; color: #d97706; margin-top: 4px;">${penaltyVal.toFixed(2)} PLN</div>
      </div>
      <div style="border-right: 1px solid #e2e8f0; padding-right: 10px;">
        <span style="font-size: 9px; color: var(--text-muted); font-weight: bold; text-transform: uppercase;">Koszt napraw</span>
        <div style="font-size: 15px; font-weight: 700; color: #b91c1c; margin-top: 4px;">${repairCosts.toFixed(2)} PLN</div>
      </div>
      <div>
        <span style="font-size: 9px; color: var(--text-muted); font-weight: bold; text-transform: uppercase;">${balanceLabel}</span>
        <div style="font-size: 16px; font-weight: 800; color: ${balanceColor}; margin-top: 4px;">${Math.abs(balance).toFixed(2)} PLN</div>
      </div>
    </div>

    <h2 style="font-size: 15px; margin-bottom: 12px; color: #111827; border-bottom: 2px solid var(--border); padding-bottom: 5px;">
      Wykaz Zidentyfikowanych Różnic i Uszkodzeń (Początek vs Koniec Najmu)
    </h2>
    
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">Lp.</th>
          <th style="width: 150px;">Obszar / Element</th>
          <th style="width: 80px; text-align: center;">Wejście</th>
          <th style="width: 80px; text-align: center;">Wyjście</th>
          <th>Opis Różnicy (Ubytek)</th>
          <th>Uwagi / Rozstrzygnięcie</th>
          <th style="width: 110px; text-align: right;">Szacowany Koszt</th>
        </tr>
      </thead>
      <tbody>
        ${rows || (penaltyRow ? "" : `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted); font-style: italic;">Nie stwierdzono żadnych pogorszeń stanu lokalu ani awarii urządzeń. Stan idealny.</td></tr>`)}
        ${penaltyRow}
      </tbody>
    </table>

    <div style="margin-top: 20px; font-size: 11px; color: var(--text-muted); line-height: 1.6;">
      <p><strong>Oświadczenie stron:</strong></p>
      <p>
        Strony zgodnie potwierdzają wykaz uszkodzeń oraz szacowane koszty napraw w wysokości <strong>${repairCosts.toFixed(2)} PLN</strong>,
        oraz naliczone obciążenie z tytułu przedwczesnego rozwiązania umowy w wysokości <strong>${penaltyVal.toFixed(2)} PLN</strong> (łączna kwota obciążeń wynosi <strong>${(repairCosts + penaltyVal).toFixed(2)} PLN</strong>).
        Po potrąceniu powyższych kwot z wpłaconej kaucji zabezpieczającej w wysokości <strong>${depositVal.toFixed(2)} PLN</strong>, 
        końcowe rozliczenie wynosi: <strong>${Math.abs(balance).toFixed(2)} PLN</strong> jako <strong>${balance >= 0 ? "kwota do zwrotu dla Lokatora" : "kwota do dopłaty przez Lokatora"}</strong>.
        ${balance >= 0 
          ? "Wynajmujący zobowiązuje się zwrócić kwotę zwrotu na rachunek bankowy Najemcy w terminie 14 dni od dnia podpisania niniejszego protokołu."
          : "Najemca zobowiązuje się uregulować kwotę dopłaty na rachunek bankowy Wynajmującego w terminie 7 dni od dnia podpisania niniejszego protokołu."
        }
      </p>
    </div>

    <div class="signatures-box">
      <div class="signature-slot">
        <h4>Podpis Wynajmującego (Zarządcy)</h4>
        <div class="signature-handwritten">Krzysztof</div>
        <p style="font-size: 10px; color: var(--text-muted);">Zarządca Nieruchomości</p>
      </div>
      <div class="signature-slot">
        <h4>Podpis Najemcy (Lokatora)</h4>
        <div class="signature-handwritten">${tenantName}</div>
        <p style="font-size: 10px; color: var(--text-muted);">Zdający Lokal</p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

import { calculateEarlyTerminationPenalty as calcPenaltyService } from "../../services/landlordService";

const calculateEarlyTerminationPenalty = (prop, terminationDate) => {
  if (!prop || !prop.leaseStart || !prop.leaseEnd || !terminationDate) return 0;
  const start = new Date(prop.leaseStart);
  const term = new Date(terminationDate);
  const end = new Date(prop.leaseEnd);
  
  if (term >= end) return 0;
  
  try {
    const res = calcPenaltyService(prop.leaseStart, terminationDate, prop.rentAmount);
    return res.penalty;
  } catch (e) {
    console.error("[RentPortal] Early termination calculation error in service:", e);
    return 0;
  }
};

export default function LandlordProperties({ landlordId }) {
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [propertyDocs, setPropertyDocs] = useState({});
  
  // Early Lease Termination states
  const [expandedEarlyTermination, setExpandedEarlyTermination] = useState({});
  const [terminationDates, setTerminationDates] = useState({});
  const [terminationFiles, setTerminationFiles] = useState({});
  
  // Add form fields
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [area, setArea] = useState("");
  const [landRegister, setLandRegister] = useState("");

  // Edit property fields & state
  const [editPropertyId, setEditPropertyId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRentAmount, setEditRentAmount] = useState("");
  const [editDepositAmount, setEditDepositAmount] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editLandRegister, setEditLandRegister] = useState("");

  // Assign tenant fields
  const [activePropertyId, setActivePropertyId] = useState(null);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [leaseRentAmount, setLeaseRentAmount] = useState("");
  const [leasePaymentDueDay, setLeasePaymentDueDay] = useState("10");
  const [tenantSearchQuery, setTenantSearchQuery] = useState("");
  const [showTenantSuggestions, setShowTenantSuggestions] = useState(false);

  // Initial meter states for baseline
  const [initMeterElectricity, setInitMeterElectricity] = useState("");
  const [initMeterGas, setInitMeterGas] = useState("");
  const [initMeterWaterHot, setInitMeterWaterHot] = useState("");
  const [initMeterWaterCold, setInitMeterWaterCold] = useState("");
  const [initMeterHeating, setInitMeterHeating] = useState("");

  // Add Tenant fields
  const [showAddTenantForm, setShowAddTenantForm] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantIdCard, setTenantIdCard] = useState("");
  const [tenantAddress, setTenantAddress] = useState("");
  const [roommateName, setRoommateName] = useState("");
  const [roommatePhone, setRoommatePhone] = useState("");
  const [roommateEmail, setRoommateEmail] = useState("");
  const [roommateIdCard, setRoommateIdCard] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Handover Protocol states
  const [showProtocolWizard, setShowProtocolWizard] = useState(false);
  const [wizardPropertyId, setWizardPropertyId] = useState(null);
  const [wizardTenant, setWizardTenant] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState(null);
  const [wizardProtocolType, setWizardProtocolType] = useState("initial"); // "initial" | "final"

  // Comparison/Difference Report states
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonPropertyId, setComparisonPropertyId] = useState(null);
  const [comparisonTenant, setComparisonTenant] = useState(null);
  const [comparisonCosts, setComparisonCosts] = useState({});
  const [comparisonComments, setComparisonComments] = useState({});
  const [exportingDifferenceReport, setExportingDifferenceReport] = useState(false);

  const comparisonDifferences = useMemo(() => {
    if (!comparisonPropertyId) return [];
    const protocols = getHandoverProtocolByProperty(comparisonPropertyId);
    return getProtocolDifferences(protocols.initial, protocols.final);
  }, [comparisonPropertyId]);

  const comparisonProperty = useMemo(() => {
    if (!comparisonPropertyId) return null;
    return properties.find(p => p.id === comparisonPropertyId);
  }, [comparisonPropertyId, properties]);

  const repairCostsSum = useMemo(() => {
    return comparisonDifferences.reduce((sum, diff) => {
      const val = parseFloat(comparisonCosts[diff.id]) || 0;
      return sum + val;
    }, 0);
  }, [comparisonDifferences, comparisonCosts]);

  const terminationPenalty = useMemo(() => {
    if (comparisonProperty && comparisonProperty.earlyTermination) {
      return parseFloat(comparisonProperty.earlyTermination.penaltyAmount) || 0;
    }
    return 0;
  }, [comparisonProperty]);

  const totalRepairSum = useMemo(() => {
    return repairCostsSum + terminationPenalty;
  }, [repairCostsSum, terminationPenalty]);

  const comparisonDeposit = useMemo(() => {
    return comparisonProperty ? (parseFloat(comparisonProperty.depositAmount) || 0) : 0;
  }, [comparisonProperty]);

  const comparisonBalance = useMemo(() => {
    return comparisonDeposit - totalRepairSum;
  }, [comparisonDeposit, totalRepairSum]);


  const loadData = () => {
    const landlordProps = getPropertiesByLandlord(landlordId);
    setProperties(landlordProps);
    setTenants(getTenants());

    // Fetch documents map
    const docsMap = {};
    landlordProps.forEach(p => {
      docsMap[p.id] = getDocumentsForProperty(p.id);
    });
    setPropertyDocs(docsMap);
  };

  useEffect(() => {
    loadData();

    window.addEventListener("rentportal_users_updated", loadData);
    window.addEventListener("rentportal_properties_updated", loadData);

    return () => {
      window.removeEventListener("rentportal_users_updated", loadData);
      window.removeEventListener("rentportal_properties_updated", loadData);
    };
  }, [landlordId]);

  const handleAddProperty = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim() || !address.trim() || !city.trim() || !rentAmount || !depositAmount) {
      setErrorMsg("Wszystkie pola oznaczone gwiazdką są wymagane.");
      return;
    }

    try {
      addProperty({
        landlord_id: landlordId,
        tenant_id: null,
        title: title.trim(),
        address: address.trim(),
        city: city.trim(),
        description: description.trim(),
        rentAmount: Number(rentAmount),
        depositAmount: Number(depositAmount),
        area: area ? Number(area) : null,
        landRegister: landRegister.trim() || null,
        leaseStart: null,
        leaseEnd: null
      });

      setSuccessMsg("Mieszkanie zostało pomyślnie dodane!");
      setTitle("");
      setAddress("");
      setCity("");
      setDescription("");
      setRentAmount("");
      setDepositAmount("");
      setArea("");
      setLandRegister("");
      setShowAddForm(false);
      
      // Refresh properties list
      const landlordProps = getPropertiesByLandlord(landlordId);
      setProperties(landlordProps);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStartEditProperty = (prop) => {
    setEditPropertyId(prop.id);
    setEditTitle(prop.title || "");
    setEditAddress(prop.address || "");
    setEditCity(prop.city || "");
    setEditDescription(prop.description || "");
    setEditRentAmount(prop.rentAmount || "");
    setEditDepositAmount(prop.depositAmount || "");
    setEditArea(prop.area || "");
    setEditLandRegister(prop.landRegister || "");
    
    // Clear other forms/notifications
    setShowAddForm(false);
    setActivePropertyId(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleEditPropertySubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!editTitle.trim() || !editAddress.trim() || !editCity.trim() || !editRentAmount || !editDepositAmount) {
      setErrorMsg("Wszystkie pola oznaczone gwiazdką są wymagane.");
      return;
    }

    try {
      updateProperty(editPropertyId, {
        title: editTitle.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        description: editDescription.trim(),
        rentAmount: Number(editRentAmount),
        depositAmount: Number(editDepositAmount),
        area: editArea ? Number(editArea) : null,
        landRegister: editLandRegister.trim() || null
      });

      setSuccessMsg("Dane nieruchomości zostały pomyślnie zaktualizowane!");
      setEditPropertyId(null);

      // Refresh properties list
      const landlordProps = getPropertiesByLandlord(landlordId);
      setProperties(landlordProps);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeletePropertyClick = (propertyId) => {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    let confirmMsg = `Czy na pewno chcesz trwale usunąć nieruchomość "${prop.title}" (np. w przypadku sprzedaży)?\n`;
    if (prop.tenant_id) {
      confirmMsg += `\n⚠️ UWAGA: Mieszkanie ma aktywnego lokatora! Lokator zostanie automatycznie odłączony od lokalu.`;
    }
    
    if (!window.confirm(confirmMsg)) return;

    setErrorMsg("");
    setSuccessMsg("");

    try {
      deleteProperty(propertyId);
      setSuccessMsg("Nieruchomość została pomyślnie usunięta z bazy danych!");

      // Refresh list
      const landlordProps = getPropertiesByLandlord(landlordId);
      setProperties(landlordProps);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleAssignTenant = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedTenantId) {
      setErrorMsg("Wybierz lokatora z listy.");
      return;
    }

    try {
      updatePropertyTenant(
        activePropertyId, 
        selectedTenantId, 
        leaseStart || null, 
        leaseEnd || null,
        leaseRentAmount ? Number(leaseRentAmount) : null,
        leasePaymentDueDay ? Number(leasePaymentDueDay) : 10
      );
      
      // Save initial meter baselines if provided
      const reportedDate = leaseStart || new Date().toISOString().split("T")[0];
      const metersToSave = [
        { type: "electricity", val: initMeterElectricity, sn: "L-EL-9901" },
        { type: "gas", val: initMeterGas, sn: "G-GZ-5502" },
        { type: "water_hot", val: initMeterWaterHot, sn: "W-WH-1104" },
        { type: "water_cold", val: initMeterWaterCold, sn: "W-WC-1103" },
        { type: "heating", val: initMeterHeating, sn: "H-HT-3305" }
      ];

      metersToSave.forEach(m => {
        if (m.val !== "" && Number(m.val) >= 0) {
          addMeterReading({
            property_id: activePropertyId,
            meter_type: m.type,
            meter_number: m.sn,
            reading_value: Number(m.val),
            reading_date: reportedDate,
            reported_by_id: landlordId,
            status: "approved"
          });
        }
      });

      setSuccessMsg("Lokator został pomyślnie przypisany do mieszkania!");
      setActivePropertyId(null);
      setSelectedTenantId("");
      setTenantSearchQuery("");
      setShowTenantSuggestions(false);
      setLeaseStart("");
      setLeaseEnd("");
      setLeaseRentAmount("");
      setLeasePaymentDueDay("10");
      setInitMeterElectricity("");
      setInitMeterGas("");
      setInitMeterWaterHot("");
      setInitMeterWaterCold("");
      setInitMeterHeating("");
      
      // Refresh properties list
      const landlordProps = getPropertiesByLandlord(landlordId);
      setProperties(landlordProps);

      // Force dispatch sync event
      window.dispatchEvent(new Event("rentportal_meters_updated"));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleAddTenant = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!tenantName.trim() || !tenantEmail.trim() || !tenantPhone.trim() || !tenantIdCard.trim() || !tenantAddress.trim()) {
      setErrorMsg("Wypełnij wszystkie wymagane pola lokatora.");
      return;
    }

    try {
      const newTenant = addTenant({
        name: tenantName.trim(),
        email: tenantEmail.trim(),
        phone: tenantPhone.trim(),
        idCard: tenantIdCard.trim(),
        address: tenantAddress.trim(),
        roommate: {
          name: roommateName.trim(),
          phone: roommatePhone.trim(),
          email: roommateEmail.trim(),
          idCard: roommateIdCard.trim()
        }
      });

      setSuccessMsg(`Pomyślnie dodano lokatora: ${newTenant.name}!`);
      setTenants(getTenants());
      setSelectedTenantId(newTenant.id);
      
      // Notify parent simulator in App.jsx to reload active users
      window.dispatchEvent(new Event("rentportal_users_updated"));
      
      // Clear fields
      setTenantName("");
      setTenantEmail("");
      setTenantPhone("");
      setTenantIdCard("");
      setTenantAddress("");
      setRoommateName("");
      setRoommatePhone("");
      setRoommateEmail("");
      setRoommateIdCard("");
      setShowAddTenantForm(false);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRemoveTenant = (propertyId) => {
    if (!window.confirm("Czy na pewno chcesz zakończyć najem i przenieść lokatora do archiwum? Spowoduje to zwolnienie lokalu i zachowanie pełnej historii najmu.")) return;
    
    setErrorMsg("");
    setSuccessMsg("");
    try {
      archiveTenant(propertyId);
      setSuccessMsg("Lokator został pomyślnie przeniesiony do archiwum! Lokal jest teraz wolny.");
      const landlordProps = getPropertiesByLandlord(landlordId);
      setProperties(landlordProps);
      
      // Update local tenant list
      setTenants(getTenants());
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleGenerateLeaseAgreement = async (propertyId, tenant) => {
    if (!propertyId || !tenant) return;
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    try {
      setSuccessMsg("Generowanie umowy najmu...");
      setErrorMsg("");

      // Fetch the binary template file from the public folder
      const response = await fetch("/umowa_najmu_wzor.docx");
      if (!response.ok) {
        throw new Error("Nie znaleziono szablonu umowy najmu (umowa_najmu_wzor.docx) w folderze public.");
      }

      // Safeguard against SPA routing HTML fallback
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("Serwer deweloperski zwrócił stronę HTML (index.html) zamiast pliku wzoru (.docx). Spróbuj odświeżyć przeglądarkę za pomocą Ctrl+F5 lub zrestartować serwer npm run dev.");
      }

      const arrayBuffer = await response.arrayBuffer();

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: "{{",
          end: "}}"
        }
      });

      // Convert rent into Polish words
      const rentInWords = numberToPolishWords(prop.rentAmount);

      // Map document template fields
      const data = {
        NAJEMCA_IMIE_NAZWISKO: tenant.name || "",
        NAJEMCA_MAIL: tenant.email || "",
        NAJEMCA_TELEFON: tenant.phone || "",
        NAJEMCA_MIEJSCE_ZAMELDOWANIA: tenant.address || "",
        NAJEMCA_PESEL: "", // Empty as requested ("pozostaw to miejsce puste")
        MIESZKANIE_ADRES: `${prop.address || ""}, ${prop.city || ""}`,
        MIESZKANIE_POWIERZCHNIA: prop.area ? `${prop.area} m²` : "",
        MIESZKANIE_KSIEGA_WIECZYSTA: prop.landRegister || "",
        CZYNSZ_KWOTA: prop.rentAmount ? `${prop.rentAmount} PLN` : "",
        CZYNSZ_SLOWNIE: rentInWords ? `${rentInWords} PLN` : "",
        KAUCJA_KWOTA: prop.depositAmount ? `${prop.depositAmount} PLN` : "",
        DATA_ROZPOCZECIA: prop.leaseStart || "",
        DATA_ZAKONCZENIA: prop.leaseEnd || "",
      };

      doc.render(data);

      const generatedDocBlob = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Read as Base64 Data URL
      const reader = new FileReader();
      reader.readAsDataURL(generatedDocBlob);
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const fileName = `Umowa_Najmu_${tenant.name.replace(/\s+/g, "_")}.docx`;

        try {
          // Send to the server to write to filesystem
          const saveResponse = await fetch("/api/save-document", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              fileName,
              fileData: base64Data
            })
          });

          if (!saveResponse.ok) {
            const errData = await saveResponse.json();
            throw new Error(errData.error || "Serwer odmówił zapisu pliku.");
          }

          const { fileUrl } = await saveResponse.json();

          // Save the STATIC URL in localStorage (virtually 0 space!)
          addDocument({
            property_id: propertyId,
            tenant_id: tenant.id,
            document_type: "lease_agreement",
            file_name: fileName,
            file_size: (generatedDocBlob.size / 1024).toFixed(1) + " KB",
            file_data: fileUrl
          });

          alert("Sukces! Umowa najmu została wygenerowana i pomyślnie zapisana na dysku w folderze public/generated_docs/!");

          setSuccessMsg("Umowa najmu została pomyślnie wygenerowana i załączona!");
          setTimeout(() => setSuccessMsg(""), 3500);

          // Force reactive state reload in properties view
          const landlordProps = getPropertiesByLandlord(landlordId);
          setProperties(landlordProps);

          const updatedDocs = getDocumentsForProperty(propertyId);
          setPropertyDocs(prev => ({
            ...prev,
            [propertyId]: updatedDocs
          }));

        } catch (saveErr) {
          alert("Błąd zapisu wygenerowanego dokumentu na dysku: " + saveErr.message);
          setErrorMsg("Błąd podczas zapisu wygenerowanego dokumentu: " + saveErr.message);
        }
      };
    } catch (err) {
      console.error(err);
      alert("Błąd generowania umowy najmu:\n" + err.message);
      setErrorMsg("Błąd generowania umowy najmu: " + err.message);
    }
  };

  // --- HANDOVER PROTOCOL WIZARD METHODS ---
  // --- HANDOVER PROTOCOL WIZARD METHODS ---
  const handleOpenProtocolWizard = (propertyId, tenant, type = "initial") => {
    if (!propertyId || !tenant) return;
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    setWizardProtocolType(type);
    setWizardPropertyId(propertyId);
    setWizardTenant(tenant);
    setWizardStep(1);

    const existingObj = getHandoverProtocolByProperty(propertyId);
    const existing = existingObj[type];

    if (existing) {
      setWizardData(existing);
      setShowProtocolWizard(true);
    } else {
      if (type === "final" && existingObj.initial) {
        // Prefill exit protocol using initial protocol values
        const prefilled = JSON.parse(JSON.stringify(existingObj.initial));
        prefilled.protocolType = "exit";
        prefilled.documentDate = new Date().toISOString().split('T')[0];
        prefilled.signatures = {
          landlordSignature: "Krzysztof",
          tenantSignature: tenant.name || "",
          agreed: true
        };
        setWizardData(prefilled);
        setShowProtocolWizard(true);
      } else {
        const latestElec = getLatestMeterReading(propertyId, "electricity");
        const latestGas = getLatestMeterReading(propertyId, "gas");
        const latestWaterHot = getLatestMeterReading(propertyId, "water_hot");
        const latestWaterCold = getLatestMeterReading(propertyId, "water_cold");
        const latestHeating = getLatestMeterReading(propertyId, "heating");

        setWizardData({
          documentDate: new Date().toISOString().split('T')[0],
          documentPlace: "Kraków",
          protocolType: type === "initial" ? "entry" : "exit",
          landlordName: "Krzysztof",
          tenantName: tenant.name || "",
          tenantPhone: tenant.phone || "",
          tenantEmail: tenant.email || "",
          tenantAddress: tenant.address || "",
          propertyAddress: `${prop.address || ""}, ${prop.city || ""}`,
          landRegister: prop.landRegister || "",
          salon: {
            walls: { condition: 5, notes: "" },
            floors: { condition: 5, notes: "" },
            windows: { condition: 5, notes: "" },
            doors: { condition: 5, notes: "" },
            radiators: { condition: 5, notes: "" },
            furniture: { condition: 5, notes: "" },
            sockets: { condition: 5, notes: "" }
          },
          sypialnia: {
            walls: { condition: 5, notes: "" },
            floors: { condition: 5, notes: "" },
            windows: { condition: 5, notes: "" },
            doors: { condition: 5, notes: "" },
            radiators: { condition: 5, notes: "" },
            furniture: { condition: 5, notes: "" },
            sockets: { condition: 5, notes: "" }
          },
          kuchnia: {
            walls: { condition: 5, notes: "" },
            floors: { condition: 5, notes: "" },
            windows: { condition: 5, notes: "" },
            furniture: { condition: 5, notes: "" },
            sink: { condition: 5, notes: "" },
            appliances: {
              fridge: { working: true, condition: 5, notes: "" },
              hob: { working: true, condition: 5, notes: "" },
              oven: { working: true, condition: 5, notes: "" },
              dishwasher: { working: true, condition: 5, notes: "" }
            }
          },
          lazienka: {
            walls: { condition: 5, notes: "" },
            floors: { condition: 5, notes: "" },
            doors: { condition: 5, notes: "" },
            sanitary: { condition: 5, notes: "" },
            washingMachine: { working: true, condition: 5, notes: "" },
            radiator: { condition: 5, notes: "" }
          },
          przedpokoj: {
            walls: { condition: 5, notes: "" },
            floors: { condition: 5, notes: "" },
            doors: { condition: 5, notes: "" },
            intercom: { condition: 5, notes: "" },
            furniture: { condition: 5, notes: "" }
          },
          general: {
            smell: "neutral",
            cleanliness: "clean",
            comments: ""
          },
          meters: {
            electricity: { serial: latestElec?.meter_number || "L-EL-9901", value: latestElec?.reading_value || "", notes: "" },
            gas: { serial: latestGas?.meter_number || "G-GZ-5502", value: latestGas?.reading_value || "", notes: "" },
            water_hot: { serial: latestWaterHot?.meter_number || "W-WH-1104", value: latestWaterHot?.reading_value || "", notes: "" },
            water_cold: { serial: latestWaterCold?.meter_number || "W-WC-1103", value: latestWaterCold?.reading_value || "", notes: "" },
            heating: { serial: latestHeating?.meter_number || "H-HT-3305", value: latestHeating?.reading_value || "", notes: "" }
          },
          keys: {
            entryKeys: 2,
            mailboxKeys: 1,
            gateRemote: 0,
            doorChip: 1,
            notes: ""
          },
          signatures: {
            landlordSignature: "Krzysztof",
            tenantSignature: tenant.name || "",
            agreed: true
          }
        });
        setShowProtocolWizard(true);
      }
    }
  };

  const updateWizardNested = (category, field, subfield, value) => {
    setWizardData(prev => {
      if (!field) {
        return {
          ...prev,
          [category]: value
        };
      }
      if (subfield) {
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [field]: {
              ...prev[category][field],
              [subfield]: value
            }
          }
        };
      } else {
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [field]: value
          }
        };
      }
    });
  };

  const updateApplianceNested = (applianceKey, subfield, value) => {
    setWizardData(prev => ({
      ...prev,
      kuchnia: {
        ...prev.kuchnia,
        appliances: {
          ...prev.kuchnia.appliances,
          [applianceKey]: {
            ...prev.kuchnia.appliances[applianceKey],
            [subfield]: value
          }
        }
      }
    }));
  };

  const updateWashingMachineNested = (subfield, value) => {
    setWizardData(prev => ({
      ...prev,
      lazienka: {
        ...prev.lazienka,
        washingMachine: {
          ...prev.lazienka.washingMachine,
          [subfield]: value
        }
      }
    }));
  };

  const handleSaveProtocolDraft = () => {
    if (!wizardPropertyId || !wizardData) return;
    saveHandoverProtocol(wizardPropertyId, wizardProtocolType, wizardData);
    alert("Zapisano wersję roboczą protokołu w pamięci lokalnej (Local Storage)!");
  };

  const handleSaveProtocolSubmit = async (e) => {
    e.preventDefault();
    if (!wizardPropertyId || !wizardTenant || !wizardData) return;

    try {
      setSuccessMsg("Generowanie protokołu zdawczo-odbiorczego...");
      setErrorMsg("");

      // Save JSON state persistently in LocalStorage
      saveHandoverProtocol(wizardPropertyId, wizardProtocolType, wizardData);

      const prop = properties.find(p => p.id === wizardPropertyId);
      const htmlContent = generateProtocolHtml(wizardData, prop, wizardTenant);

      // Convert to Base64 data URL
      const base64Data = "data:text/html;base64," + btoa(unescape(encodeURIComponent(htmlContent)));
      const typeLabel = wizardProtocolType === "initial" ? "Poczatkowy" : "Koncowy";
      const fileName = `Protokol_${typeLabel}_${wizardTenant.name.replace(/\s+/g, "_")}.html`;

      // Post to server to save physically on disk
      const saveResponse = await fetch("/api/save-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName,
          fileData: base64Data
        })
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json();
        throw new Error(errData.error || "Serwer odmówił zapisu pliku.");
      }

      const { fileUrl } = await saveResponse.json();

      // Delete any old protocol document of this type
      const docs = propertyDocs[wizardPropertyId] || [];
      const oldDocType = wizardProtocolType === "initial" ? "handover_protocol_initial" : "handover_protocol_final";
      const oldProtocol = docs.find(d => d.document_type === oldDocType || (d.document_type === "handover_protocol" && wizardProtocolType === "initial"));
      if (oldProtocol) {
        deleteDocument(oldProtocol.id);
      }

      // Add document record
      addDocument({
        property_id: wizardPropertyId,
        tenant_id: wizardTenant.id,
        document_type: oldDocType,
        file_name: fileName,
        file_size: (htmlContent.length / 1024).toFixed(1) + " KB",
        file_data: fileUrl
      });

      // Automatically save meter readings as initial/final baselines in the database
      saveHandoverProtocolMeterReadings(wizardPropertyId, wizardData.meters, wizardData.documentDate, landlordId);

      alert(`Sukces! Protokół zdawczo-odbiorczy (${wizardProtocolType === "initial" ? "początkowy" : "końcowy"}) został pomyślnie wygenerowany i zapisany na dysku!`);
      setSuccessMsg("Protokół został wygenerowany pomyślnie!");
      setTimeout(() => setSuccessMsg(""), 3500);

      // Close wizard
      setShowProtocolWizard(false);

      // Reload state
      const landlordProps = getPropertiesByLandlord(landlordId);
      setProperties(landlordProps);

      const updatedDocs = getDocumentsForProperty(wizardPropertyId);
      setPropertyDocs(prev => ({
        ...prev,
        [wizardPropertyId]: updatedDocs
      }));
    } catch (err) {
      console.error(err);
      alert("Błąd podczas generowania protokołu: " + err.message);
      setErrorMsg("Błąd generowania protokołu: " + err.message);
    }
  };

  const handleGenerateDifferenceReport = async () => {
    if (!comparisonPropertyId || !comparisonTenant) return;
    try {
      setExportingDifferenceReport(true);
      setErrorMsg("");

      const protocols = getHandoverProtocolByProperty(comparisonPropertyId);
      const diffs = getProtocolDifferences(protocols.initial, protocols.final);
      const prop = properties.find(p => p.id === comparisonPropertyId);

      const htmlContent = generateDifferenceReportHtml(
        prop.title || prop.address,
        comparisonTenant.name,
        diffs,
        comparisonCosts,
        comparisonComments,
        repairCostsSum,
        prop.depositAmount || 0,
        prop.earlyTermination?.penaltyAmount || 0
      );

      // Convert to Base64
      const base64Data = "data:text/html;base64," + btoa(unescape(encodeURIComponent(htmlContent)));
      const fileName = `Raport_Roznicowy_${comparisonTenant.name.replace(/\s+/g, "_")}.html`;

      // Save physically on disk
      const saveResponse = await fetch("/api/save-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName,
          fileData: base64Data
        })
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json();
        throw new Error(errData.error || "Serwer odmówił zapisu raportu.");
      }

      const { fileUrl } = await saveResponse.json();

      // Clean up old comparison reports
      const docs = propertyDocs[comparisonPropertyId] || [];
      const oldRep = docs.find(d => d.document_type === "handover_difference_report");
      if (oldRep) {
        deleteDocument(oldRep.id);
      }

      // Save to database
      addDocument({
        property_id: comparisonPropertyId,
        tenant_id: comparisonTenant.id,
        document_type: "handover_difference_report",
        file_name: fileName,
        file_size: (htmlContent.length / 1024).toFixed(1) + " KB",
        file_data: fileUrl
      });

      alert("Sukces! Raport różnicowy został pomyślnie wygenerowany i zapisany na dysku!");
      
      // Close modal
      setShowComparisonModal(false);

      // Reload document states
      const updatedDocs = getDocumentsForProperty(comparisonPropertyId);
      setPropertyDocs(prev => ({
        ...prev,
        [comparisonPropertyId]: updatedDocs
      }));

      // Auto-open
      openDocumentFile(fileUrl, fileName);

    } catch (err) {
      console.error(err);
      alert("Błąd podczas generowania raportu różnicowego: " + err.message);
    } finally {
      setExportingDifferenceReport(false);
    }
  };

  const handleEarlyTerminationSubmit = async (e, propertyId, tenantId) => {
    e.preventDefault();
    const dateInput = terminationDates[propertyId] || new Date().toISOString().split("T")[0];
    const fileInput = terminationFiles[propertyId]; // File object
    
    try {
      setSuccessMsg("Rozwiązywanie umowy przed czasem...");
      setErrorMsg("");
      
      const prop = properties.find(p => p.id === propertyId);
      const penalty = calculateEarlyTerminationPenalty(prop, dateInput);
      
      let fileUrl = null;
      if (fileInput) {
        // Upload the PDF
        const reader = new FileReader();
        const readPromise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(fileInput);
        });
        
        const base64Data = await readPromise;
        const uniqueFileName = `Wypowiedzenie_${propertyId}_${Date.now()}_${fileInput.name.replace(/\s+/g, "_")}`;
        
        const saveResponse = await fetch("/api/save-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileName: uniqueFileName,
            fileData: base64Data
          })
        });
        
        if (!saveResponse.ok) {
          throw new Error("Serwer odmówił zapisu dokumentu wypowiedzenia.");
        }
        
        const res = await saveResponse.json();
        fileUrl = res.fileUrl;
        
        // Also save this document in the general documents system as lease_termination
        addDocument({
          property_id: propertyId,
          tenant_id: tenantId,
          document_type: "lease_termination",
          file_name: fileInput.name,
          file_size: (fileInput.size / 1024).toFixed(1) + " KB",
          file_data: fileUrl
        });
      }
      
      registerEarlyTermination(propertyId, dateInput, penalty, fileUrl);
      
      alert(`Sukces! Wcześniejsze rozwiązanie najmu zostało zarejestrowane.\nNaliczona kara umowna: ${penalty.toFixed(2)} PLN.`);
      
      // Clear panel states
      setTerminationDates(prev => ({ ...prev, [propertyId]: "" }));
      setTerminationFiles(prev => ({ ...prev, [propertyId]: null }));
      setExpandedEarlyTermination(prev => ({ ...prev, [propertyId]: false }));
      
      // Reload states
      loadData();
      
    } catch (err) {
      console.error(err);
      alert("Błąd podczas rejestrowania wcześniejszego rozwiązania: " + err.message);
      setErrorMsg("Błąd: " + err.message);
    }
  };

  const handleFileUpload = (e, propertyId, tenantId, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Robust extension check to support PDF and Word (.docx) files
    const isValidFile = 
      file.type === "application/pdf" || 
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".pdf") || 
      file.name.toLowerCase().endsWith(".docx");
      
    if (!isValidFile) {
      alert("Błąd: Możesz przesyłać wyłącznie pliki w formacie PDF lub DOCX!");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      let fileData = reader.result;
      const fileSize = (file.size / 1024).toFixed(1) + " KB";
      const uniqueFileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

      try {
        setSuccessMsg("Przesyłanie dokumentu...");

        // Send to server to write to filesystem
        const saveResponse = await fetch("/api/save-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileName: uniqueFileName,
            fileData: fileData
          })
        });

        if (!saveResponse.ok) {
          const errData = await saveResponse.json();
          throw new Error(errData.error || "Serwer odmówił zapisu pliku.");
        }

        const { fileUrl } = await saveResponse.json();

        addDocument({
          property_id: propertyId,
          tenant_id: tenantId,
          document_type: docType,
          file_name: file.name,
          file_size: fileSize,
          file_data: fileUrl
        });

        // Update local state
        const updated = getDocumentsForProperty(propertyId);
        setPropertyDocs(prev => ({
          ...prev,
          [propertyId]: updated
        }));
        
        // Reset input value to allow re-upload of same file
        e.target.value = "";

        setSuccessMsg(`Pomyślnie dołączono plik: ${file.name}`);
        setTimeout(() => setSuccessMsg(""), 3500);
      } catch (err) {
        alert("Błąd zapisu dokumentu na dysku: " + err.message);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileDelete = (propertyId, docId) => {
    const docText = "Czy na pewno chcesz usunąć ten dokument?";
    if (!window.confirm(docText)) return;

    try {
      const docs = propertyDocs[propertyId] || [];
      const docToDelete = docs.find(d => d.id === docId);

      deleteDocument(docId);
      
      if (docToDelete && (docToDelete.document_type === "handover_protocol" || docToDelete.document_type === "handover_protocol_initial")) {
        deleteHandoverProtocolDataByType(propertyId, "initial");
        deleteHandoverProtocolMeterReadings(propertyId);
      } else if (docToDelete && docToDelete.document_type === "handover_protocol_final") {
        deleteHandoverProtocolDataByType(propertyId, "final");
      }
      
      const updated = getDocumentsForProperty(propertyId);
      setPropertyDocs(prev => ({
        ...prev,
        [propertyId]: updated
      }));
      
      setSuccessMsg("Dokument został pomyślnie usunięty.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert("Błąd: " + err.message);
    }
  };

  const renderRatingButtons = (category, itemKey) => {
    if (!wizardData || !wizardData[category] || !wizardData[category][itemKey]) return null;
    const currentVal = wizardData[category][itemKey].condition;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(val => {
          let colorClass = "bg-dark-950 border-dark-800 text-dark-400 hover:border-brand-500/50";
          if (currentVal === val) {
            if (val === 5) colorClass = "bg-green-500/20 border-green-500/40 text-green-400 font-bold";
            else if (val === 4) colorClass = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold";
            else if (val === 3) colorClass = "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 font-bold";
            else if (val === 2) colorClass = "bg-orange-500/20 border-orange-500/40 text-orange-400 font-bold";
            else if (val === 1) colorClass = "bg-red-500/20 border-red-500/40 text-red-400 font-bold";
          }
          return (
            <button
              key={val}
              type="button"
              onClick={() => updateWizardNested(category, itemKey, "condition", val)}
              className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition-all cursor-pointer ${colorClass}`}
            >
              {val}
            </button>
          );
        })}
      </div>
    );
  };

  const renderApplianceRow = (applianceKey, label) => {
    if (!wizardData || !wizardData.kuchnia || !wizardData.kuchnia.appliances || !wizardData.kuchnia.appliances[applianceKey]) return null;
    const app = wizardData.kuchnia.appliances[applianceKey];
    return (
      <tr className="border-b border-dark-800/40 text-xxs">
        <td className="py-2.5 font-semibold text-white">{label}</td>
        <td className="py-2.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => updateApplianceNested(applianceKey, "working", true)}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                app.working 
                  ? "bg-green-500/20 border-green-500/40 text-green-400" 
                  : "bg-dark-950 border-dark-800 text-dark-500 hover:border-dark-750"
              }`}
            >
              TAK (Sprawne)
            </button>
            <button
              type="button"
              onClick={() => updateApplianceNested(applianceKey, "working", false)}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                !app.working 
                  ? "bg-red-500/20 border-red-500/40 text-red-400" 
                  : "bg-dark-950 border-dark-800 text-dark-500 hover:border-dark-750"
              }`}
            >
              NIE (Niesprawne)
            </button>
          </div>
        </td>
        <td className="py-2.5">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(val => {
              let colorClass = "bg-dark-950 border-dark-800 text-dark-400 hover:border-brand-500/50";
              if (app.condition === val) {
                if (val === 5) colorClass = "bg-green-500/20 border-green-500/40 text-green-400 font-bold";
                else if (val === 4) colorClass = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold";
                else if (val === 3) colorClass = "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 font-bold";
                else if (val === 2) colorClass = "bg-orange-500/20 border-orange-500/40 text-orange-400 font-bold";
                else if (val === 1) colorClass = "bg-red-500/20 border-red-500/40 text-red-400 font-bold";
              }
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateApplianceNested(applianceKey, "condition", val)}
                  className={`w-6 h-6 rounded-lg border text-[10px] flex items-center justify-center transition-all cursor-pointer ${colorClass}`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </td>
        <td className="py-2.5">
          <input
            type="text"
            placeholder="Uwagi dot. urządzenia..."
            value={app.notes}
            onChange={(e) => updateApplianceNested(applianceKey, "notes", e.target.value)}
            className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
          />
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-400" />
            Zarządzanie Nieruchomościami
          </h2>
          <p className="text-dark-400 text-sm mt-1">Dodawaj lokale mieszkalne, zarządzaj umowami i przydzielaj lokatorów.</p>
        </div>
        
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setActivePropertyId(null);
          }}
          className="py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 self-start glass-glow-brand"
        >
          <Plus className="w-4 h-4" />
          Dodaj Nieruchomość
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-3 text-xs flex items-start gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Property Form */}
      {showAddForm && (
        <div className="glass p-6 rounded-2xl border-brand-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Dodaj Nowe Mieszkanie</h3>
          <form onSubmit={handleAddProperty} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Tytuł ogłoszenia / Nazwa lokalu *</label>
              <input 
                type="text" required placeholder="np. Apartament Jasny, Mickiewicza 4/12" 
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Miasto *</label>
              <input 
                type="text" required placeholder="np. Kraków" 
                value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Adres nieruchomości *</label>
              <input 
                type="text" required placeholder="np. ul. Mickiewicza 4/12" 
                value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Miesięczny czynsz (PLN) *</label>
              <input 
                type="number" required placeholder="np. 2500" 
                value={rentAmount} onChange={(e) => setRentAmount(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Kaucja zwrotna (PLN) *</label>
              <input 
                type="number" required placeholder="np. 2500" 
                value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Powierzchnia mieszkania (m²)</label>
              <input 
                type="number" step="0.1" placeholder="np. 48.5" 
                value={area} onChange={(e) => setArea(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Nr księgi wieczystej</label>
              <input 
                type="text" placeholder="np. KR1P/00012345/1" 
                value={landRegister} onChange={(e) => setLandRegister(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Krótki opis / wyposażenie</label>
              <textarea 
                placeholder="np. Standard wykończenia premium, zmywarka, pralka." 
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none h-20 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button 
                type="button" onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800"
              >
                Anuluj
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand"
              >
                Zapisz Mieszkanie
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Property Form */}
      {editPropertyId && (
        <div className="glass p-6 rounded-2xl border-brand-500/20 bg-brand-500/5">
          <h3 className="text-lg font-semibold text-white mb-4">Edycja Nieruchomości</h3>
          <form onSubmit={handleEditPropertySubmit} className="grid gap-4 md:grid-cols-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Tytuł ogłoszenia / Nazwa lokalu *</label>
              <input 
                type="text" required placeholder="np. Apartament Jasny, Mickiewicza 4/12" 
                value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Miasto *</label>
              <input 
                type="text" required placeholder="np. Kraków" 
                value={editCity} onChange={(e) => setEditCity(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Adres nieruchomości *</label>
              <input 
                type="text" required placeholder="np. ul. Mickiewicza 4/12" 
                value={editAddress} onChange={(e) => setEditAddress(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Miesięczny czynsz (PLN) *</label>
              <input 
                type="number" required placeholder="np. 2500" 
                value={editRentAmount} onChange={(e) => setEditRentAmount(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Kaucja zwrotna (PLN) *</label>
              <input 
                type="number" required placeholder="np. 2500" 
                value={editDepositAmount} onChange={(e) => setEditDepositAmount(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Powierzchnia mieszkania (m²)</label>
              <input 
                type="number" step="0.1" placeholder="np. 48.5" 
                value={editArea} onChange={(e) => setEditArea(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Nr księgi wieczystej</label>
              <input 
                type="text" placeholder="np. KR1P/00012345/1" 
                value={editLandRegister} onChange={(e) => setEditLandRegister(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Krótki opis / wyposażenie</label>
              <textarea 
                placeholder="np. Standard wykończenia premium, zmywarka, pralka." 
                value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none h-20 resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button 
                type="button" onClick={() => setEditPropertyId(null)}
                className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800"
              >
                Anuluj
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand"
              >
                Zapisz Zmiany
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Tenant Form Overlay */}
      {/* Assign Tenant Form Overlay */}
      {/* Assign Tenant Form Overlay */}
      {activePropertyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-2xl w-full p-6 rounded-2xl border-brand-500/20 space-y-6 shadow-2xl relative text-left">
            <button 
              type="button"
              onClick={() => {
                setActivePropertyId(null);
                setShowAddTenantForm(false);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-dark-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-400" />
                Przydziel Lokatora do Mieszkania
              </h3>
              <p className="text-xs text-brand-300 font-semibold mt-1">
                Lokal: {properties.find(p => p.id === activePropertyId)?.title.split(",")[0]}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddTenantForm(!showAddTenantForm);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="py-2 px-3 bg-brand-600/10 hover:bg-brand-600/25 border border-brand-500/20 text-brand-300 rounded-xl text-xxs font-bold transition-all cursor-pointer"
              >
                {showAddTenantForm ? "← Wybierz lokatora z bazy" : "➕ Stwórz i dodaj nowego lokatora"}
              </button>
            </div>

            {showAddTenantForm ? (
              <form onSubmit={handleAddTenant} className="space-y-4 text-xs">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 font-sans text-brand-400">Dane Nowego Lokatora</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Imię i Nazwisko *</label>
                    <input 
                      type="text" required placeholder="np. Jan Kowalski"
                      value={tenantName} onChange={(e) => setTenantName(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Adres E-mail *</label>
                    <input 
                      type="email" required placeholder="np. jan@lokator.pl"
                      value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Numer telefonu *</label>
                    <input 
                      type="text" required placeholder="np. +48 602 987 654"
                      value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Dowód Osobisty (Seria i Nr) *</label>
                    <input 
                      type="text" required placeholder="np. ABC 123456"
                      value={tenantIdCard} onChange={(e) => setTenantIdCard(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Adres zamieszkania *</label>
                    <input 
                      type="text" required placeholder="np. ul. Mickiewicza 4/12, Kraków"
                      value={tenantAddress} onChange={(e) => setTenantAddress(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white uppercase tracking-wider mt-4 mb-2 pt-3 border-t border-dark-800 font-sans text-brand-400">Dane Współlokatora (Opcjonalnie)</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Imię i Nazwisko</label>
                    <input 
                      type="text" placeholder="np. Maria Kowalska"
                      value={roommateName} onChange={(e) => setRoommateName(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Adres E-mail</label>
                    <input 
                      type="email" placeholder="np. maria@wspollokator.pl"
                      value={roommateEmail} onChange={(e) => setRoommateEmail(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Numer telefonu</label>
                    <input 
                      type="text" placeholder="np. +48 602 111 222"
                      value={roommatePhone} onChange={(e) => setRoommatePhone(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">Dowód Osobisty (Seria i Nr)</label>
                    <input 
                      type="text" placeholder="np. XYZ 987654"
                      value={roommateIdCard} onChange={(e) => setRoommateIdCard(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
                  <button 
                    type="button" onClick={() => setShowAddTenantForm(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand"
                  >
                    Zapisz Lokatora
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAssignTenant} className="space-y-4 text-xs">
                <div className="relative">
                  <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">
                    Wyszukaj i Wybierz Lokatora *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Wpisz pierwsze litery nazwiska lub e-mail lokatora..."
                      value={tenantSearchQuery}
                      onFocus={() => setShowTenantSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTenantSuggestions(false), 250)}
                      onChange={(e) => {
                        setTenantSearchQuery(e.target.value);
                        setSelectedTenantId("");
                        setShowTenantSuggestions(true);
                      }}
                      className="w-full bg-dark-900 border border-dark-800 focus:border-brand-500 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    />
                    {selectedTenantId && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-green-400 font-sans text-xs font-bold">
                        ✓ Wybrano
                      </span>
                    )}
                  </div>

                  {showTenantSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-dark-900 border border-dark-800 rounded-xl shadow-2xl overflow-hidden max-h-[180px] overflow-y-auto font-sans text-xs">
                      {(() => {
                        const filtered = tenants.filter(t => {
                          const q = tenantSearchQuery.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            (t.name || "").toLowerCase().includes(q) ||
                            (t.email || "").toLowerCase().includes(q)
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-dark-500 italic text-center text-white">
                              Brak lokatorów o podanej nazwie
                            </div>
                          );
                        }

                        return filtered.map(t => {
                          const isArchived = t.isArchived;
                          const isAssigned = !!t.property_id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTenantId(t.id);
                                setTenantSearchQuery(t.name);
                                setShowTenantSuggestions(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 hover:bg-brand-600 hover:text-white text-white flex justify-between items-center border-b border-dark-850/60 last:border-0 transition-colors cursor-pointer ${isArchived ? "opacity-50" : ""}`}
                            >
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  {t.name}
                                  {isArchived && (
                                    <span className="text-[8px] bg-dark-850 text-dark-400 px-1.5 py-0.5 rounded border border-dark-750 font-normal">
                                      Archiwalny
                                    </span>
                                  )}
                                  {!isArchived && isAssigned && (
                                    <span className="text-[8px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/20 font-normal">
                                      Aktywny najem
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-dark-400">{t.email}</div>
                              </div>
                              {selectedTenantId === t.id && (
                                <span className="text-green-400 font-bold text-xs">✓</span>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Początek umowy najmu *</label>
                    <input 
                      type="date" required
                      value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Koniec umowy najmu *</label>
                    <input 
                      type="date" required
                      value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Ustalony czynsz najmu (PLN) *</label>
                    <input 
                      type="number" required placeholder="np. 2500"
                      value={leaseRentAmount} onChange={(e) => setLeaseRentAmount(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5 font-sans">Termin płatności (Dzień miesiąca) *</label>
                    <input 
                      type="number" required min="1" max="31" placeholder="np. 10"
                      value={leasePaymentDueDay} onChange={(e) => setLeasePaymentDueDay(e.target.value)}
                    />
                  </div>
                </div>

                {/* Initial baselines config */}
                <div className="border-t border-dark-800/60 pt-4 mt-2 space-y-3">
                  <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider block font-sans">
                    ⚙️ Początkowe stany liczników (Punkt odniesienia)
                  </h4>
                  <p className="text-[10px] text-dark-500 font-sans leading-relaxed">
                    Wprowadź stan liczników z dnia przekazania lokalu. Zostaną one zapisane jako zatwierdzone odczyty początkowe z datą rozpoczęcia najmu.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">💡 Licznik Prądu (kWh)</label>
                      <input 
                        type="number" step="0.1" placeholder="np. 0.0"
                        value={initMeterElectricity} onChange={(e) => setInitMeterElectricity(e.target.value)}
                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">⛽ Licznik Gazu (m³)</label>
                      <input 
                        type="number" step="0.1" placeholder="np. 0.0"
                        value={initMeterGas} onChange={(e) => setInitMeterGas(e.target.value)}
                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">🔥 Woda Ciepła (m³)</label>
                      <input 
                        type="number" step="0.1" placeholder="np. 0.0"
                        value={initMeterWaterHot} onChange={(e) => setInitMeterWaterHot(e.target.value)}
                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">💧 Woda Zimna (m³)</label>
                      <input 
                        type="number" step="0.1" placeholder="np. 0.0"
                        value={initMeterWaterCold} onChange={(e) => setInitMeterWaterCold(e.target.value)}
                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1 font-sans">♨️ Ogrzewanie (GJ)</label>
                      <input 
                        type="number" step="0.1" placeholder="np. 0.0"
                        value={initMeterHeating} onChange={(e) => setInitMeterHeating(e.target.value)}
                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    type="button" onClick={() => setActivePropertyId(null)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand"
                  >
                    Zatwierdź Wynajem
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Properties List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map(p => {
          const tenant = tenants.find(t => t.id === p.tenant_id);
          const docs = propertyDocs[p.id] || [];
          const agreements = docs.filter(d => d.document_type === "lease_agreement");
          const protocol = docs.find(d => d.document_type === "handover_protocol");

          return (
            <div key={p.id} className="glass p-5 rounded-2xl space-y-4 flex flex-col justify-between hover:border-brand-500/20 transition-all">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="p-2 rounded-xl bg-dark-900 border border-dark-800 text-brand-400">
                    <Home className="w-5 h-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEditProperty(p)}
                      className="p-1.5 bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-brand-500/40 text-brand-400 hover:text-brand-300 rounded-lg transition-colors cursor-pointer"
                      title="Edytuj Nieruchomość"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePropertyClick(p.id)}
                      className="p-1.5 bg-dark-900 hover:bg-red-500/10 border border-dark-800 hover:border-red-500/30 text-dark-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                      title="Usuń Nieruchomość"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${
                      p.tenant_id 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    }`}>
                      {p.tenant_id ? 'Wynajęte' : 'Wolne'}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white font-sans mt-2">{p.title}</h3>
                
                <p className="text-xs text-dark-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-dark-500" />
                  {p.address}, {p.city}
                </p>

                {p.description && (
                  <p className="text-xs text-dark-400 line-clamp-2 mt-1">{p.description}</p>
                )}

                <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3 pt-3 border-t border-dark-800 text-xs">
                  <div>
                    <span className="text-dark-500 text-xxs uppercase block tracking-wider font-bold">Czynsz</span>
                    <span className="font-bold text-white mt-0.5 block">{p.rentAmount} PLN</span>
                  </div>
                  <div>
                    <span className="text-dark-500 text-xxs uppercase block tracking-wider font-bold">Kaucja</span>
                    <span className="font-bold text-white mt-0.5 block">{p.depositAmount} PLN</span>
                  </div>
                  <div>
                    <span className="text-dark-500 text-xxs uppercase block tracking-wider font-bold">Powierzchnia</span>
                    <span className="font-bold text-brand-300 mt-0.5 block">{p.area ? `${p.area} m²` : "brak danych"}</span>
                  </div>
                  <div>
                    <span className="text-dark-500 text-xxs uppercase block tracking-wider font-bold">Księga Wieczysta</span>
                    <span className="font-mono font-semibold text-brand-300 text-[10px] truncate mt-0.5 block" title={p.landRegister || "brak danych"}>
                      {p.landRegister || "brak danych"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dark-800/80">
                {tenant ? (
                  <div className="space-y-3.5">
                    <div className="bg-dark-900/50 p-2.5 rounded-xl border border-dark-800/60 text-xs space-y-1.5">
                      <div>
                        <span className="text-dark-500 text-xxs block font-bold uppercase tracking-wider">Aktywny Lokator</span>
                        <span className="font-semibold text-white block mt-0.5">{tenant.name}</span>
                        <span className="text-dark-400 text-xxs font-mono block">{tenant.email}</span>
                      </div>
                      
                      <div className="text-[10px] text-dark-300 space-y-0.5 border-t border-dark-800/40 pt-1.5">
                        {tenant.phone && <div>📞 Tel: <strong className="text-white">{tenant.phone}</strong></div>}
                        {tenant.idCard && <div>🪪 Dowód: <strong className="text-white">{tenant.idCard}</strong></div>}
                        {tenant.address && <div className="truncate">🏠 Adres zameldowania: <strong className="text-white" title={tenant.address}>{tenant.address}</strong></div>}
                        {p.paymentDueDay && <div>📅 Dzień płatności: <strong className="text-brand-300">{p.paymentDueDay} dzień miesiąca</strong></div>}
                      </div>

                      {tenant.roommate && tenant.roommate.name && (
                        <div className="bg-dark-950/50 p-2 rounded-lg border border-dark-800 text-[10px] space-y-0.5 mt-2">
                          <span className="text-brand-400 font-bold block uppercase text-[9px] tracking-wider mb-1">👥 Współlokator</span>
                          <div>Nazwisko: <strong className="text-white">{tenant.roommate.name}</strong></div>
                          {tenant.roommate.phone && <div>Tel: <strong className="text-white">{tenant.roommate.phone}</strong></div>}
                          {tenant.roommate.email && <div className="truncate">Email: <strong className="text-white" title={tenant.roommate.email}>{tenant.roommate.email}</strong></div>}
                          {tenant.roommate.idCard && <div>Dowód: <strong className="text-white">{tenant.roommate.idCard}</strong></div>}
                        </div>
                      )}
                      {p.leaseStart && (
                        <div className="space-y-1.5 mt-1.5 border-t border-dark-800/40 pt-1.5">
                          <span className="text-xxs text-dark-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-brand-400" />
                            Okres najmu: {p.leaseStart} do {p.leaseEnd}
                          </span>
                          {(() => {
                            const endDate = new Date(p.leaseEnd);
                            const today = new Date();
                            endDate.setHours(0, 0, 0, 0);
                            today.setHours(0, 0, 0, 0);
                            const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                            const isOver = diffDays < 0;
                            const isWarning = diffDays <= 40;
                            return (
                              <span className={`text-xxs block font-sans ${isOver || isWarning ? 'text-red-400 font-bold' : 'text-green-400 font-semibold'}`}>
                                ⏱️ {isOver ? `Najem zakończony (${Math.abs(diffDays)} dni temu)` : `Pozostało dni najmu: ${diffDays}`}
                              </span>
                            );
                          })()}

                          {p.earlyTermination && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2 rounded-xl text-[10px] leading-relaxed mt-1">
                              <strong>⚠️ Umowa rozwiązana przed czasem!</strong>
                              <div className="text-[9px] text-dark-400 mt-0.5">
                                Data rozwiązania: <strong>{p.earlyTermination.terminationDate}</strong>
                              </div>
                              {(() => {
                                const endDate = new Date(p.leaseEnd);
                                const termDate = new Date(p.earlyTermination.terminationDate);
                                const diff = Math.ceil((endDate - termDate) / (1000 * 60 * 60 * 24));
                                return (
                                  <div className="text-[9px] text-amber-200">
                                    Rozwiązano przed czasem o: <strong>{diff} dni</strong>
                                  </div>
                                );
                              })()}
                              <div className="text-[9px] text-amber-200">
                                Naliczona kara umowna: <strong className="text-red-400 font-bold">{parseFloat(p.earlyTermination.penaltyAmount).toFixed(2)} PLN</strong>
                              </div>
                              {p.earlyTermination.fileUrl && (
                                <button
                                  type="button"
                                  onClick={() => openDocumentFile(p.earlyTermination.fileUrl, "Wypowiedzenie_umowy.pdf")}
                                  className="mt-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[9px] font-bold hover:bg-amber-500/35 transition-colors cursor-pointer"
                                >
                                  📥 Pobierz wypowiedzenie
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {p.leaseStart && !p.earlyTermination && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedEarlyTermination(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                            className="w-full py-1 bg-gradient-to-r from-red-950/40 to-red-900/20 border border-red-900/30 hover:border-red-500/40 text-red-300 hover:text-red-200 rounded-xl text-[9px] font-bold tracking-wide transition-all shadow flex items-center justify-center gap-1 cursor-pointer uppercase font-sans"
                          >
                            🚪 Rozwiązanie przed czasem
                          </button>
                        </div>
                      )}

                      {p.leaseStart && p.earlyTermination && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Czy na pewno chcesz anulować wcześniejsze rozwiązanie najmu? Przywróci to normalny stan i wykasuje naliczoną karę umowną.")) {
                                clearEarlyTermination(p.id);
                              }
                            }}
                            className="w-full py-1 bg-dark-900/60 border border-dark-800 hover:border-dark-700 text-dark-400 hover:text-dark-300 rounded-xl text-[9px] font-bold tracking-wide transition-all flex items-center justify-center gap-1 cursor-pointer uppercase font-sans"
                          >
                            ↩ Anuluj wcześniejsze rozwiązanie
                          </button>
                        </div>
                      )}

                      {expandedEarlyTermination[p.id] && (
                        <form
                          onSubmit={(e) => handleEarlyTerminationSubmit(e, p.id, tenant.id)}
                          className="mt-3 bg-dark-950/40 border border-dark-800/80 p-3 rounded-2xl space-y-3 font-sans text-left animate-fade-in"
                        >
                          <div className="flex justify-between items-center border-b border-dark-800/50 pb-1.5 mb-1.5">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">🚪 Panel Rozwiązania Umowy</span>
                            <button
                              type="button"
                              onClick={() => setExpandedEarlyTermination(prev => ({ ...prev, [p.id]: false }))}
                              className="text-dark-500 hover:text-red-400 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-semibold text-dark-400 uppercase tracking-wider">Data rozwiązania umowy *</label>
                            <input
                              type="date"
                              required
                              value={terminationDates[p.id] || new Date().toISOString().split("T")[0]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTerminationDates(prev => ({ ...prev, [p.id]: val }));
                              }}
                              className="w-full bg-dark-950 border border-dark-800 rounded-xl px-2.5 py-1.5 text-white text-[11px] focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-semibold text-dark-400 uppercase tracking-wider">Załącz skan wypowiedzenia (PDF)</label>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                setTerminationFiles(prev => ({ ...prev, [p.id]: file }));
                              }}
                              className="w-full text-xxs text-dark-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-dark-800 file:text-white hover:file:bg-dark-700 cursor-pointer"
                            />
                          </div>

                          {(() => {
                            const dateVal = terminationDates[p.id] || new Date().toISOString().split("T")[0];
                            const penalty = calculateEarlyTerminationPenalty(p, dateVal);
                            const active = (() => {
                              if (!p.leaseStart) return 0;
                              const start = new Date(p.leaseStart);
                              const term = new Date(dateVal);
                              const diffDays = Math.ceil((term - start) / (1000 * 60 * 60 * 24));
                              return (diffDays / 30.4).toFixed(1);
                            })();
                            
                            return (
                              <div className="bg-dark-950/60 p-2 rounded-xl text-[9px] text-dark-400 space-y-1">
                                <div>Czas trwania umowy: <strong className="text-white">{active} miesięcy</strong></div>
                                <div>Naliczana kara umowna: <strong className="text-red-400 font-bold">{penalty.toFixed(2)} PLN</strong></div>
                                <div className="text-[8px] text-dark-500 leading-normal italic mt-1 font-sans">
                                  Reguła: &lt;6 mies. = 3x czynsz | 6-9 mies. = 1.5x czynsz | 10-11 mies. = 1x czynsz.
                                </div>
                              </div>
                            );
                          })()}

                          <button
                            type="submit"
                            className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xxs font-bold transition-all shadow-lg shadow-red-600/10 cursor-pointer uppercase tracking-wider"
                          >
                            Zatwierdź Rozwiązanie
                          </button>
                        </form>
                      )}

                      {/* PDF Documents Management Block */}
                      <div className="mt-3.5 pt-3 border-t border-dark-800/80 space-y-2">
                        <span className="text-dark-500 text-[10px] block font-bold uppercase tracking-wider">
                          Dokumenty Najmu (PDF)
                        </span>
                        
                        {/* Lease Agreement Section with List of Documents */}
                        <div className="flex flex-col gap-1.5 bg-dark-950 p-2 rounded-lg border border-dark-800 text-xxs">
                          <div className="flex items-center justify-between border-b border-dark-800/50 pb-1.5 mb-1.5">
                            <span className="text-dark-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                              Umowa Najmu (DOCX / PDF)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleGenerateLeaseAgreement(p.id, tenant)}
                                className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                title="Generuj umowę najmu z szablonu Word (.docx)"
                              >
                                <Sparkles className="w-3 h-3 text-brand-400" />
                                Generuj
                              </button>
                              <span className="text-dark-700">|</span>
                              <label className="cursor-pointer text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5" title="Wgraj skan PDF lub plik Word (.docx)">
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Wgraj</span>
                                <input
                                  type="file"
                                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, p.id, tenant.id, "lease_agreement")}
                                />
                              </label>
                            </div>
                          </div>
                          {agreements.length > 0 ? (
                            <div className="space-y-1.5">
                              {agreements.map(agreement => {
                                const isDocx = agreement.file_name.toLowerCase().endsWith(".docx");
                                return (
                                  <div key={agreement.id} className="flex items-center justify-between bg-dark-900/40 p-1.5 rounded border border-dark-800/40">
                                    <span className="text-white truncate font-medium max-w-[70%]" title={agreement.file_name}>
                                      {agreement.file_name}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => openDocumentFile(agreement.file_data, agreement.file_name)}
                                        className="p-1 text-brand-400 hover:text-brand-300 transition-colors"
                                        title={isDocx ? "Pobierz plik Word (.docx)" : "Otwórz plik PDF"}
                                      >
                                        {isDocx ? <Download className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                      <button
                                        onClick={() => handleFileDelete(p.id, agreement.id)}
                                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                        title="Usuń"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-dark-500 italic px-1 py-0.5 font-sans">Brak załączonych dokumentów</span>
                          )}
                        </div>

                        {/* Handover Protocols block */}
                        {(() => {
                          const pObj = getHandoverProtocolByProperty(p.id);
                          const initialData = pObj.initial;
                          const finalData = pObj.final;

                          const protocolInitial = docs.find(d => d.document_type === "handover_protocol_initial" || d.document_type === "handover_protocol");
                          const protocolFinal = docs.find(d => d.document_type === "handover_protocol_final");
                          const diffReport = docs.find(d => d.document_type === "handover_difference_report");

                          return (
                            <div className="flex flex-col gap-3 bg-dark-950 p-3 rounded-xl border border-dark-800 text-xxs space-y-1">
                              <div className="flex items-center justify-between border-b border-dark-800/50 pb-2">
                                <span className="text-dark-400 font-bold uppercase tracking-wider flex items-center gap-1 font-sans">
                                  <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                                  Protokoły Zdawczo-Odbiorcze
                                </span>
                                <a
                                  href="/PROTOKOL_ZDAWCZO_ODBIORCZY_SZABLON.pdf"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                  title="Pobierz pusty wzorcowy dokument PDF"
                                >
                                  Szablon (PDF)
                                </a>
                              </div>

                              {/* 1. Protokół Początkowy (Wejście) */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-dark-400 font-sans">
                                  <span className="font-semibold text-white">1. Protokół Początkowy (Wejście)</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenProtocolWizard(p.id, tenant, "initial")}
                                      className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                      title={initialData ? "Modyfikuj protokół początkowy" : "Generuj cyfrowy protokół początkowy"}
                                    >
                                      <Sparkles className="w-3 h-3 text-brand-400" />
                                      {initialData ? "Edytuj" : "Generuj"}
                                    </button>
                                    <span className="text-dark-700">|</span>
                                    <label className="cursor-pointer text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5" title="Wgraj gotowy podpisany skan PDF">
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span>Wgraj</span>
                                      <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) => handleFileUpload(e, p.id, tenant.id, "handover_protocol_initial")}
                                      />
                                    </label>
                                  </div>
                                </div>
                                
                                {protocolInitial ? (
                                  <div className="flex items-center justify-between bg-dark-900/40 p-1.5 rounded border border-dark-800/40 font-sans">
                                    <span className="text-white truncate font-medium max-w-[70%]" title={protocolInitial.file_name}>
                                      {protocolInitial.file_name}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => openDocumentFile(protocolInitial.file_data, protocolInitial.file_name)}
                                        className="p-1 text-brand-400 hover:text-brand-300 transition-colors"
                                        title="Otwórz podgląd dokumentu"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleFileDelete(p.id, protocolInitial.id)}
                                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                        title="Usuń"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-dark-500 italic px-1 block py-0.5 font-sans">Brak sporządzonego protokołu początkowego</span>
                                )}
                              </div>

                              {/* 2. Protokół Końcowy (Wyjście) */}
                              <div className="space-y-1.5 pt-1.5 border-t border-dark-900/60">
                                <div className="flex items-center justify-between text-dark-400 font-sans">
                                  <span className="font-semibold text-white">2. Protokół Końcowy (Wyjście)</span>
                                  {protocolInitial ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenProtocolWizard(p.id, tenant, "final")}
                                        className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                        title={finalData ? "Modyfikuj protokół końcowy" : "Generuj cyfrowy protokół końcowy na bazie wejściowego"}
                                      >
                                        <Sparkles className="w-3 h-3 text-brand-400" />
                                        {finalData ? "Edytuj" : "Generuj"}
                                      </button>
                                      <span className="text-dark-700">|</span>
                                      <label className="cursor-pointer text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5" title="Wgraj gotowy skan końcowy PDF">
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>Wgraj</span>
                                        <input
                                          type="file"
                                          accept="application/pdf"
                                          className="hidden"
                                          onChange={(e) => handleFileUpload(e, p.id, tenant.id, "handover_protocol_final")}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-dark-500 italic font-mono">Wymaga protokołu początkowego</span>
                                  )}
                                </div>

                                {protocolFinal ? (
                                  <div className="flex items-center justify-between bg-dark-900/40 p-1.5 rounded border border-dark-800/40 font-sans">
                                    <span className="text-white truncate font-medium max-w-[70%]" title={protocolFinal.file_name}>
                                      {protocolFinal.file_name}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => openDocumentFile(protocolFinal.file_data, protocolFinal.file_name)}
                                        className="p-1 text-brand-400 hover:text-brand-300 transition-colors"
                                        title="Otwórz podgląd dokumentu"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleFileDelete(p.id, protocolFinal.id)}
                                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                        title="Usuń"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  protocolInitial && (
                                    <span className="text-dark-500 italic px-1 block py-0.5 font-sans">Brak sporządzonego protokołu końcowego</span>
                                  )
                                )}
                              </div>

                              {/* 3. Porównanie i Wycena (Protokół Różnicowy) */}
                              {initialData && finalData && (
                                <div className="pt-2 border-t border-dark-800/80 flex flex-col gap-2 font-sans">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setComparisonPropertyId(p.id);
                                      setComparisonTenant(tenant);
                                      setComparisonCosts({});
                                      setComparisonComments({});
                                      setShowComparisonModal(true);
                                    }}
                                    className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white rounded-lg text-[10px] font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase font-sans"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                    🔎 Porównaj i Wycen Szkody
                                  </button>
                                  
                                  {diffReport && (
                                    <div className="flex items-center justify-between bg-dark-900/40 p-1.5 rounded border border-yellow-500/20 font-sans">
                                      <span className="text-yellow-400 truncate font-semibold max-w-[70%]" title={diffReport.file_name}>
                                        📊 {diffReport.file_name.replace(/_/g, " ")}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={() => openDocumentFile(diffReport.file_data, diffReport.file_name)}
                                          className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                                          title="Otwórz podgląd raportu różnicowego"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleFileDelete(p.id, diffReport.id)}
                                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                          title="Usuń"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <TenantNotesSection tenant={tenant} />
                      <TenantFinalSummarySection tenant={tenant} />
                      <TenantHistoryTimelineSection tenant={tenant} />

                    </div>
                    
                    <button
                      onClick={() => handleRemoveTenant(p.id)}
                      className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl text-xxs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Usuń lokatora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-dark-900/20 text-center py-2.5 rounded-xl border border-dashed border-dark-800 text-xxs text-dark-500">
                      Brak przypisanego lokatora
                    </div>
                    <button
                      onClick={() => {
                        setActivePropertyId(p.id);
                        setShowAddForm(false);
                        setLeaseRentAmount(p.rentAmount || "");
                        setLeasePaymentDueDay(p.paymentDueDay || "10");
                        setShowAddTenantForm(false);
                        setSelectedTenantId("");
                        setTenantSearchQuery("");
                        setShowTenantSuggestions(false);
                      }}
                      className="w-full py-2 px-3 bg-brand-500/10 hover:bg-brand-500/25 border border-brand-500/20 text-brand-300 rounded-xl text-xxs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Zarejestruj lokatora
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* HANDOVER PROTOCOL MULTI-STEP WIZARD OVERLAY */}
      {showProtocolWizard && wizardData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans text-left">
          <div className="bg-dark-900/90 border border-dark-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] glass-glow-brand animate-fade-in text-left">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-dark-800/80 bg-dark-950/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  Kreator Protokołu Zdawczo-Odbiorczego
                </h3>
                <p className="text-[10px] text-dark-400 mt-0.5">
                  Lokal: <strong className="text-brand-300">{wizardData.propertyAddress}</strong> | Najemca: <strong className="text-brand-300">{wizardTenant?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Czy na pewno chcesz zamknąć kreator? Niezapisane zmiany zostaną utracone (możesz najpierw kliknąć 'Zapisz Szkic').")) {
                    setShowProtocolWizard(false);
                  }
                }}
                className="p-1.5 bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-red-500/30 text-dark-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="px-6 py-4 bg-dark-950/20 border-b border-dark-800/40">
              <div className="flex items-center justify-between text-xxs max-w-3xl mx-auto">
                {[
                  { step: 1, label: "Metryka" },
                  { step: 2, label: "Salon & Sypialnia" },
                  { step: 3, label: "Kuchnia & Łazienka" },
                  { step: 4, label: "Przedpokój & Ogólne" },
                  { step: 5, label: "Liczniki & Klucze" },
                  { step: 6, label: "Finalizacja" }
                ].map((s, idx) => (
                  <React.Fragment key={s.step}>
                    <div 
                      onClick={() => setWizardStep(s.step)}
                      className="flex flex-col items-center gap-1 cursor-pointer group"
                    >
                      <div className={`w-6 h-6 rounded-full border text-[10px] flex items-center justify-center font-bold transition-all ${
                        wizardStep === s.step
                          ? "bg-brand-500 border-brand-400 text-white shadow-lg shadow-brand-500/20"
                          : wizardStep > s.step
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-dark-950 border-dark-800 text-dark-500 group-hover:border-dark-700"
                      }`}>
                        {wizardStep > s.step ? "✓" : s.step}
                      </div>
                      <span className={`text-[9px] font-semibold ${
                        wizardStep === s.step ? "text-brand-300" : "text-dark-500 group-hover:text-dark-400"
                      }`}>{s.label}</span>
                    </div>
                    {idx < 5 && (
                      <div className={`flex-1 h-[2px] mx-2 ${
                        wizardStep > s.step ? "bg-green-500/30" : "bg-dark-800"
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Scrollable Step Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="border border-dark-800/80 bg-dark-950/40 p-4 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide">Typ i Data Protokołu</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Typ Protokołu *</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateWizardNested("protocolType", null, null, "entry")}
                            className={`flex-1 py-2 px-3 border rounded-xl text-xxs font-bold cursor-pointer transition-all ${
                              wizardData.protocolType === "entry"
                                ? "bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-md"
                                : "bg-dark-950 border-dark-800 text-dark-500 hover:border-dark-770"
                            }`}
                          >
                            📥 ZDAWCZY (Wejście Najemcy)
                          </button>
                          <button
                            type="button"
                            onClick={() => updateWizardNested("protocolType", null, null, "exit")}
                            className={`flex-1 py-2 px-3 border rounded-xl text-xxs font-bold cursor-pointer transition-all ${
                              wizardData.protocolType === "exit"
                                ? "bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-md"
                                : "bg-dark-950 border-dark-800 text-dark-500 hover:border-dark-770"
                            }`}
                          >
                            📤 ODBIORCZY (Wyjście / Zwrot)
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Data sporządzenia *</label>
                          <input
                            type="date"
                            required
                            value={wizardData.documentDate}
                            onChange={(e) => updateWizardNested("documentDate", null, null, e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Miejscowość *</label>
                          <input
                            type="text"
                            required
                            value={wizardData.documentPlace}
                            onChange={(e) => updateWizardNested("documentPlace", null, null, e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Wynajmujący */}
                    <div className="border border-dark-800/80 bg-dark-950/40 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide">Wynajmujący / Zarządca</h4>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Imię i Nazwisko / Firma *</label>
                        <input
                          type="text"
                          required
                          value={wizardData.landlordName}
                          onChange={(e) => updateWizardNested("landlordName", null, null, e.target.value)}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Najemca */}
                    <div className="border border-dark-800/80 bg-dark-950/40 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide">Najemca Lokalu</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Imię i Nazwisko *</label>
                          <input
                            type="text"
                            required
                            value={wizardData.tenantName}
                            onChange={(e) => updateWizardNested("tenantName", null, null, e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Telefon</label>
                          <input
                            type="text"
                            value={wizardData.tenantPhone}
                            onChange={(e) => updateWizardNested("tenantPhone", null, null, e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">E-mail</label>
                          <input
                            type="email"
                            value={wizardData.tenantEmail}
                            onChange={(e) => updateWizardNested("tenantEmail", null, null, e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Zameldowanie</label>
                          <input
                            type="text"
                            value={wizardData.tenantAddress}
                            onChange={(e) => updateWizardNested("tenantAddress", null, null, e.target.value)}
                            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-dark-800/80 bg-dark-950/40 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide">Przedmiot Protokołu (Lokal)</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Adres lokalu *</label>
                        <input
                          type="text"
                          required
                          value={wizardData.propertyAddress}
                          onChange={(e) => updateWizardNested("propertyAddress", null, null, e.target.value)}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Numer Księgi Wieczystej</label>
                        <input
                          type="text"
                          value={wizardData.landRegister}
                          onChange={(e) => updateWizardNested("landRegister", null, null, e.target.value)}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-6 animate-fade-in text-left">
                  {/* Salon */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-brand-400" />
                      Salon i Pokój Dzienny
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[35%]">Element</th>
                            <th className="py-2 w-[25%]">Ocena Stanu (1-5)</th>
                            <th className="py-2 w-[40%]">Uwagi / Zastrzeżenia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "walls", label: "Ściany i sufity" },
                            { key: "floors", label: "Podłogi i listwy" },
                            { key: "windows", label: "Okna i parapety" },
                            { key: "doors", label: "Drzwi" },
                            { key: "radiators", label: "Grzejniki" },
                            { key: "furniture", label: "Meble i wyposażenie" },
                            { key: "sockets", label: "Gniazdka i włączniki" }
                          ].map(item => (
                            <tr key={item.key} className="border-b border-dark-800/40">
                              <td className="py-2.5 font-semibold text-white">{item.label}</td>
                              <td className="py-2.5">{renderRatingButtons("salon", item.key)}</td>
                              <td className="py-2.5">
                                <input
                                  type="text"
                                  placeholder="brak uwag"
                                  value={wizardData.salon[item.key].notes}
                                  onChange={(e) => updateWizardNested("salon", item.key, "notes", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sypialnia */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-brand-400" />
                      Sypialnia
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[35%]">Element</th>
                            <th className="py-2 w-[25%]">Ocena Stanu (1-5)</th>
                            <th className="py-2 w-[40%]">Uwagi / Zastrzeżenia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "walls", label: "Ściany i sufity" },
                            { key: "floors", label: "Podłogi i listwy" },
                            { key: "windows", label: "Okna i parapety" },
                            { key: "doors", label: "Drzwi" },
                            { key: "radiators", label: "Grzejniki" },
                            { key: "furniture", label: "Meble i wyposażenie" },
                            { key: "sockets", label: "Gniazdka i włączniki" }
                          ].map(item => (
                            <tr key={item.key} className="border-b border-dark-800/40">
                              <td className="py-2.5 font-semibold text-white">{item.label}</td>
                              <td className="py-2.5">{renderRatingButtons("sypialnia", item.key)}</td>
                              <td className="py-2.5">
                                <input
                                  type="text"
                                  placeholder="brak uwag"
                                  value={wizardData.sypialnia[item.key].notes}
                                  onChange={(e) => updateWizardNested("sypialnia", item.key, "notes", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6 animate-fade-in text-left">
                  {/* Kuchnia */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      🍳 Kuchnia & Urządzenia AGD
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[35%]">Element</th>
                            <th className="py-2 w-[25%]">Ocena Stanu (1-5)</th>
                            <th className="py-2 w-[40%]">Uwagi / Zastrzeżenia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "walls", label: "Ściany i sufity" },
                            { key: "floors", label: "Podłogi i listwy" },
                            { key: "windows", label: "Okna" },
                            { key: "furniture", label: "Meble kuchenne" },
                            { key: "sink", label: "Zlew kuchenny i bateria" }
                          ].map(item => (
                            <tr key={item.key} className="border-b border-dark-800/40">
                              <td className="py-2.5 font-semibold text-white">{item.label}</td>
                              <td className="py-2.5">{renderRatingButtons("kuchnia", item.key)}</td>
                              <td className="py-2.5">
                                <input
                                  type="text"
                                  placeholder="brak uwag"
                                  value={wizardData.kuchnia[item.key].notes}
                                  onChange={(e) => updateWizardNested("kuchnia", item.key, "notes", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <h5 className="text-[10px] font-bold text-white uppercase tracking-wider mt-4">Weryfikacja urządzeń AGD</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[25%]">Sprzęt</th>
                            <th className="py-2 w-[25%]">Sprawność</th>
                            <th className="py-2 w-[20%]">Stan (1-5)</th>
                            <th className="py-2 w-[30%]">Uwagi szczegółowe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {renderApplianceRow("fridge", "Lodówka")}
                          {renderApplianceRow("hob", "Płyta grzewcza")}
                          {renderApplianceRow("oven", "Piekarnik")}
                          {renderApplianceRow("dishwasher", "Zmywarka")}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Łazienka */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      🛁 Łazienka & Pralka
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[35%]">Element</th>
                            <th className="py-2 w-[25%]">Ocena Stanu (1-5)</th>
                            <th className="py-2 w-[40%]">Uwagi / Zastrzeżenia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "walls", label: "Ściany, płytki i sufity" },
                            { key: "floors", label: "Podłoga i hydroizolacja" },
                            { key: "doors", label: "Drzwi łazienkowe" },
                            { key: "sanitary", label: "Sanitariaty (Wanna/Prysznic, WC, Umywalka)" },
                            { key: "radiator", label: "Grzejnik drabinkowy" }
                          ].map(item => (
                            <tr key={item.key} className="border-b border-dark-800/40">
                              <td className="py-2.5 font-semibold text-white">{item.label}</td>
                              <td className="py-2.5">{renderRatingButtons("lazienka", item.key)}</td>
                              <td className="py-2.5">
                                <input
                                  type="text"
                                  placeholder="brak uwag"
                                  value={wizardData.lazienka[item.key].notes}
                                  onChange={(e) => updateWizardNested("lazienka", item.key, "notes", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <h5 className="text-[10px] font-bold text-white uppercase tracking-wider mt-4">Weryfikacja pralki</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[25%]">Sprzęt</th>
                            <th className="py-2 w-[25%]">Sprawność</th>
                            <th className="py-2 w-[20%]">Stan (1-5)</th>
                            <th className="py-2 w-[30%]">Uwagi szczegółowe</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-dark-800/40 text-xxs">
                            <td className="py-2.5 font-semibold text-white">Pralka automatyczna</td>
                            <td className="py-2.5">
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateWashingMachineNested("working", true)}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                                    wizardData.lazienka.washingMachine.working 
                                      ? "bg-green-500/20 border-green-500/40 text-green-400" 
                                      : "bg-dark-950 border-dark-800 text-dark-500 hover:border-dark-750"
                                  }`}
                                >
                                  TAK (Sprawna)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateWashingMachineNested("working", false)}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                                    !wizardData.lazienka.washingMachine.working 
                                      ? "bg-red-500/20 border-red-500/40 text-red-400" 
                                      : "bg-dark-950 border-dark-800 text-dark-500 hover:border-dark-750"
                                  }`}
                                >
                                  NIE (Niesprawna)
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(val => {
                                  let colorClass = "bg-dark-950 border-dark-800 text-dark-400 hover:border-brand-500/50";
                                  if (wizardData.lazienka.washingMachine.condition === val) {
                                    if (val === 5) colorClass = "bg-green-500/20 border-green-500/40 text-green-400 font-bold";
                                    else if (val === 4) colorClass = "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold";
                                    else if (val === 3) colorClass = "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 font-bold";
                                    else if (val === 2) colorClass = "bg-orange-500/20 border-orange-500/40 text-orange-400 font-bold";
                                    else if (val === 1) colorClass = "bg-red-500/20 border-red-500/40 text-red-400 font-bold";
                                  }
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => updateWashingMachineNested("condition", val)}
                                      className={`w-6 h-6 rounded-lg border text-[10px] flex items-center justify-center transition-all cursor-pointer ${colorClass}`}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-2.5">
                              <input
                                type="text"
                                placeholder="Uwagi dot. pralki..."
                                value={wizardData.lazienka.washingMachine.notes}
                                onChange={(e) => updateWashingMachineNested("notes", e.target.value)}
                                className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-6 animate-fade-in text-left">
                  {/* Przedpokój */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      🚪 Przedpokój
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[35%]">Element</th>
                            <th className="py-2 w-[25%]">Ocena Stanu (1-5)</th>
                            <th className="py-2 w-[40%]">Uwagi / Zastrzeżenia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "walls", label: "Ściany i sufity" },
                            { key: "floors", label: "Podłoga" },
                            { key: "doors", label: "Drzwi wejściowe" },
                            { key: "intercom", label: "Domofon" },
                            { key: "furniture", label: "Szafy / meble" }
                          ].map(item => (
                            <tr key={item.key} className="border-b border-dark-800/40">
                              <td className="py-2.5 font-semibold text-white">{item.label}</td>
                              <td className="py-2.5">{renderRatingButtons("przedpokoj", item.key)}</td>
                              <td className="py-2.5">
                                <input
                                  type="text"
                                  placeholder="brak uwag"
                                  value={wizardData.przedpokoj[item.key].notes}
                                  onChange={(e) => updateWizardNested("przedpokoj", item.key, "notes", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Zapach i czystość */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      🌟 Ogólny Stan Estetyczny
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider">Zapach w Lokalu</label>
                        <div className="flex flex-col gap-1.5">
                          {[
                            { val: "neutral", label: "Neutralny / bezzapachowy" },
                            { val: "pleasant", label: "Przyjemny / świeżo wywietrzony" },
                            { val: "unpleasant", label: "Nieprzyjemny (wilgoć / stęchlizna / dym)" }
                          ].map(opt => (
                            <label key={opt.val} className={`flex items-center gap-2 p-2 rounded-xl border text-xxs font-semibold cursor-pointer transition-all ${
                              wizardData.general.smell === opt.val 
                                ? "bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-md"
                                : "bg-dark-950 border-dark-800 text-dark-400 hover:border-dark-750"
                            }`}>
                              <input
                                type="radio"
                                name="smell"
                                value={opt.val}
                                checked={wizardData.general.smell === opt.val}
                                onChange={() => updateWizardNested("general", "smell", null, opt.val)}
                                className="hidden"
                              />
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                wizardData.general.smell === opt.val ? "border-brand-400" : "border-dark-700"
                              }`}>
                                {wizardData.general.smell === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                              </div>
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider">Czystość i Porządek</label>
                        <div className="flex flex-col gap-1.5">
                          {[
                            { val: "clean", label: "Bardzo czysty / gotowy do zamieszkania" },
                            { val: "needs_cleaning", label: "Wymaga drobnego sprzątania / odświeżenia" },
                            { val: "dirty", label: "Brudny / zaniedbany" }
                          ].map(opt => (
                            <label key={opt.val} className={`flex items-center gap-2 p-2 rounded-xl border text-xxs font-semibold cursor-pointer transition-all ${
                              wizardData.general.cleanliness === opt.val 
                                ? "bg-brand-500/10 border-brand-500/40 text-brand-300 shadow-md"
                                : "bg-dark-950 border-dark-800 text-dark-400 hover:border-dark-750"
                            }`}>
                              <input
                                type="radio"
                                name="cleanliness"
                                value={opt.val}
                                checked={wizardData.general.cleanliness === opt.val}
                                onChange={() => updateWizardNested("general", "cleanliness", null, opt.val)}
                                className="hidden"
                              />
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                wizardData.general.cleanliness === opt.val ? "border-brand-400" : "border-dark-700"
                              }`}>
                                {wizardData.general.cleanliness === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                              </div>
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Uwagi Ogólne Zarządcy</label>
                      <textarea
                        rows="3"
                        placeholder="Wpisz ewentualne wady, niedociągnięcia estetyczne lub dodatkowe uwagi..."
                        value={wizardData.general.comments}
                        onChange={(e) => updateWizardNested("general", "comments", null, e.target.value)}
                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="space-y-6 animate-fade-in text-left">
                  {/* Liczniki */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      📊 Stany Liczników i Numery Fabryczne
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="border-b border-dark-800 text-dark-500 uppercase tracking-wider font-bold">
                            <th className="py-2 w-[25%]">Licznik</th>
                            <th className="py-2 w-[30%]">Numer Seryjny *</th>
                            <th className="py-2 w-[20%]">Stan Licznika *</th>
                            <th className="py-2 w-[25%]">Uwagi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "electricity", label: "💡 Prąd (kWh)" },
                            { key: "gas", label: "🔥 Gaz (m³)" },
                            { key: "heating", label: "♨️ Ogrzewanie (GJ)" },
                            { key: "water_hot", label: "💧 Woda ciepła (m³)" },
                            { key: "water_cold", label: "🚰 Woda zimna (m³)" }
                          ].map(item => (
                            <tr key={item.key} className="border-b border-dark-800/40 text-xxs">
                              <td className="py-2.5 font-semibold text-white">{item.label}</td>
                              <td className="py-2.5 pr-2">
                                <input
                                  type="text"
                                  required
                                  value={wizardData.meters[item.key].serial}
                                  onChange={(e) => updateWizardNested("meters", item.key, "serial", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1 text-white text-xxs font-mono focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5 pr-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  placeholder="np. 0.0"
                                  value={wizardData.meters[item.key].value}
                                  onChange={(e) => updateWizardNested("meters", item.key, "value", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1 text-white text-xxs font-mono focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2.5">
                                <input
                                  type="text"
                                  placeholder="brak uwag"
                                  value={wizardData.meters[item.key].notes}
                                  onChange={(e) => updateWizardNested("meters", item.key, "notes", e.target.value)}
                                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-xxs focus:border-brand-500 focus:outline-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Klucze */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                      🔑 Przekazane Komplety Kluczy i Pilotów
                    </h4>
                    <div className="grid sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Klucze wejściowe (szt.)</label>
                        <input
                          type="number"
                          min="0"
                          value={wizardData.keys.entryKeys}
                          onChange={(e) => updateWizardNested("keys", "entryKeys", null, Number(e.target.value))}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Klucze skrzynka (szt.)</label>
                        <input
                          type="number"
                          min="0"
                          value={wizardData.keys.mailboxKeys}
                          onChange={(e) => updateWizardNested("keys", "mailboxKeys", null, Number(e.target.value))}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Pestka / Chip (szt.)</label>
                        <input
                          type="number"
                          min="0"
                          value={wizardData.keys.doorChip}
                          onChange={(e) => updateWizardNested("keys", "doorChip", null, Number(e.target.value))}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Pilot do bramy (szt.)</label>
                        <input
                          type="number"
                          min="0"
                          value={wizardData.keys.gateRemote}
                          onChange={(e) => updateWizardNested("keys", "gateRemote", null, Number(e.target.value))}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">Dodatkowe Uwagi dot. kluczy</label>
                      <input
                        type="text"
                        placeholder="np. klucz do piwnicy / komórki lokatorskiej"
                        value={wizardData.keys.notes}
                        onChange={(e) => updateWizardNested("keys", "notes", null, e.target.value)}
                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 6 && (
                <div className="space-y-6 animate-fade-in text-left font-sans font-sans">
                  {/* Oświadczenie */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide">
                      📜 Oświadczenia Końcowe
                    </h4>
                    <div className="bg-dark-950/80 border border-dark-800 p-4 rounded-xl text-xxs text-dark-300 space-y-3 text-justify leading-relaxed">
                      <p>
                        <strong>1. Zgodność stanu faktycznego:</strong> Strony zgodnie oświadczają, że dane i oceny techniczne zawarte w niniejszym protokole odzwierciedlają rzeczywisty stan techniczny lokalu mieszkalnego oraz jego wyposażenia na dzień sporządzenia dokumentu.
                      </p>
                      <p>
                        <strong>2. Oświadczenie Najemcy o wadach ukrytych:</strong> Najemca zobowiązuje się do zgłoszenia ewentualnych wad ukryten, które nie były możliwe do zaobserwowania podczas rutynowych oględzin (np. niedziałający odpływ, nieszczelność wewnętrzna instalacji), w terminie <strong>48 godzin</strong> od podpisania protokołu pod rygorem wygaśnięcia późniejszych roszczeń.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xxs font-semibold text-brand-300 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={wizardData.signatures.agreed}
                        onChange={(e) => updateWizardNested("signatures", "agreed", null, e.target.checked)}
                        className="rounded border-dark-800 text-brand-500 bg-dark-950 focus:ring-brand-500 w-3.5 h-3.5"
                      />
                      <span>Strony potwierdzają akceptację powyższych oświadczeń</span>
                    </label>
                  </div>

                  {/* Podpisy */}
                  <div className="border border-dark-800/80 bg-dark-950/40 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white border-b border-dark-800/50 pb-2 uppercase tracking-wide">
                      ✒️ Cyfrowy Podpis Stron
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider">Podpis Wynajmującego / Zarządcy *</label>
                        <input
                          type="text"
                          required
                          placeholder="Wpisz imię i nazwisko"
                          value={wizardData.signatures.landlordSignature}
                          onChange={(e) => updateWizardNested("signatures", "landlordSignature", null, e.target.value)}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                        />
                        <div className="h-14 bg-dark-950 rounded-xl border border-dashed border-dark-800 flex items-center justify-center p-2">
                          <span className="text-2xl text-brand-400 italic font-medium" style={{ fontFamily: "'Caveat', cursive" }}>{wizardData.signatures.landlordSignature || "Krzysztof"}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider">Podpis Najemcy Lokalu *</label>
                        <input
                          type="text"
                          required
                          placeholder="Wpisz imię i nazwisko"
                          value={wizardData.signatures.tenantSignature}
                          onChange={(e) => updateWizardNested("signatures", "tenantSignature", null, e.target.value)}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                        />
                        <div className="h-14 bg-dark-950 rounded-xl border border-dashed border-dark-800 flex items-center justify-center p-2">
                          <span className="text-2xl text-brand-400 italic font-medium" style={{ fontFamily: "'Caveat', cursive" }}>{wizardData.signatures.tenantSignature || "Podpis najemcy"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-dark-800/80 bg-dark-950/60">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Czy na pewno chcesz anulować? Niezapisane dane zostaną utracone.")) {
                      setShowProtocolWizard(false);
                    }
                  }}
                  className="px-4 py-2 bg-dark-900 border border-dark-800 hover:bg-dark-800 text-xxs font-bold text-white rounded-xl transition-all cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSaveProtocolDraft}
                  className="px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-300 rounded-xl text-xxs font-bold transition-all cursor-pointer"
                >
                  Zapisz Szkic
                </button>
              </div>

              <div className="flex gap-2">
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev - 1)}
                    className="px-4 py-2 bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xxs font-bold text-white rounded-xl transition-all cursor-pointer"
                  >
                    Cofnij
                  </button>
                )}

                {wizardStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1) {
                        if (!wizardData.tenantName || !wizardData.documentDate || !wizardData.documentPlace || !wizardData.propertyAddress) {
                          alert("Wypełnij wszystkie pola oznaczone gwiazdką (*).");
                          return;
                        }
                      }
                      setWizardStep(prev => prev + 1);
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xxs font-bold glass-glow-brand cursor-pointer"
                  >
                    Dalej
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveProtocolSubmit}
                    disabled={!wizardData.signatures.landlordSignature || !wizardData.signatures.tenantSignature || !wizardData.signatures.agreed}
                    className={`px-5 py-2 rounded-xl text-xxs font-bold transition-all flex items-center gap-1.5 ${
                      (!wizardData.signatures.landlordSignature || !wizardData.signatures.tenantSignature || !wizardData.signatures.agreed)
                        ? "bg-dark-800 border border-dark-700 text-dark-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20 cursor-pointer"
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Zatwierdź i Generuj Dokument
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HANDOVER DIFFERENCE COMPARISON MODAL */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-dark-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans text-left">
          <div className="bg-dark-900/90 border border-dark-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] glass-glow-brand animate-fade-in text-left">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-dark-800/80 bg-dark-950/60">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Raport Różnicowy & Wycena Szkód
                </h3>
                <p className="text-[10px] text-dark-400 mt-0.5">
                  Lokator: <strong className="text-amber-400">{comparisonTenant?.name}</strong> | Porównanie protokołu początkowego z końcowym
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowComparisonModal(false)}
                className="p-1.5 bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-red-500/30 text-dark-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {comparisonDifferences.length === 0 && terminationPenalty === 0 ? (
                <div className="text-center py-12 px-4 space-y-3 bg-dark-950/40 rounded-2xl border border-dashed border-dark-800">
                  <div className="text-4xl">🎉</div>
                  <h4 className="text-sm font-bold text-white">Idealny stan lokalu!</h4>
                  <p className="text-xxs text-dark-400 max-w-md mx-auto leading-relaxed">
                    Nie stwierdzono żadnego pogorszenia ocen technicznych, ubytków ani awarii sprzętów AGD w stosunku do protokołu początkowego.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowComparisonModal(false)}
                    className="mt-2 px-4 py-1.5 bg-dark-850 hover:bg-dark-800 border border-dark-750 text-xxs font-bold text-white rounded-xl transition-all"
                  >
                    Zamknij
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-200">
                    <Info className="w-4.5 h-4.5 shrink-0 text-amber-400 mt-0.5" />
                    <div className="text-xxs leading-relaxed">
                      {comparisonDifferences.length === 0 ? (
                        <>Brak fizycznych różnic w stanie lokalu. Naliczono obciążenie z tytułu przedwczesnego rozwiązania umowy.</>
                      ) : (
                        <>Wykryto <strong>{comparisonDifferences.length}</strong> różnic/pogorszeń w stanie lokalu. Wpisz szacowany koszt naprawy w PLN oraz komentarz rozstrzygający dla każdego elementu. Suma końcowa obliczy się automatycznie na żywo.</>
                      )}
                    </div>
                  </div>

                  <div className="border border-dark-800/80 rounded-2xl overflow-hidden bg-dark-950/20">
                    <table className="w-full text-xxs text-left border-collapse">
                      <thead>
                        <tr className="bg-dark-950/80 border-b border-dark-800">
                          <th className="p-3 font-semibold text-dark-400 w-1/4">Obszar / Element</th>
                          <th className="p-3 font-semibold text-dark-400 text-center w-24">Stan wejściowy</th>
                          <th className="p-3 font-semibold text-dark-400 text-center w-24">Stan wyjściowy</th>
                          <th className="p-3 font-semibold text-dark-400 w-1/3">Opis różnicy</th>
                          <th className="p-3 font-semibold text-dark-400">Uwagi / Koszt naprawy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-800/50">
                        {comparisonDifferences.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-dark-400 italic">
                              Brak fizycznych uszkodzeń lub różnic technicznych (stan lokalu idealny).
                            </td>
                          </tr>
                        ) : (
                          comparisonDifferences.map((diff) => (
                            <tr key={diff.id} className="hover:bg-dark-900/30 transition-colors">
                              <td className="p-3">
                                <span className="font-bold text-white block">{diff.room}</span>
                                <span className="text-[10px] text-dark-500">{diff.item}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold font-mono text-[10px]">
                                  {diff.initialVal}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-semibold font-mono text-[10px]">
                                  {diff.finalVal}
                                </span>
                              </td>
                              <td className="p-3 text-dark-300 leading-normal">
                                {diff.description}
                              </td>
                              <td className="p-3 space-y-2">
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    placeholder="np. czyszczenie, wymiana..."
                                    value={comparisonComments[diff.id] || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setComparisonComments(prev => ({
                                        ...prev,
                                        [diff.id]: val
                                      }));
                                    }}
                                    className="flex-1 bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-[11px] focus:border-amber-500 focus:outline-none"
                                  />
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0.00"
                                      value={comparisonCosts[diff.id] || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setComparisonCosts(prev => ({
                                          ...prev,
                                          [diff.id]: val
                                        }));
                                      }}
                                      className="w-20 bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-white text-[11px] focus:border-amber-500 focus:outline-none font-semibold text-right"
                                    />
                                    <span className="text-dark-400 font-bold text-[10px]">PLN</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-dark-800/80 bg-dark-950/60">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(false)}
                  className="px-4 py-2 bg-dark-900 border border-dark-800 hover:bg-dark-800 text-xxs font-bold text-white rounded-xl transition-all cursor-pointer"
                >
                  Zamknij
                </button>
              </div>

              {(comparisonDifferences.length > 0 || terminationPenalty > 0) && (
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-right">
                    <div className="border-r border-dark-800 pr-4">
                      <span className="text-[9px] text-dark-400 block uppercase tracking-wider font-semibold">Wpłacona kaucja:</span>
                      <strong className="text-sm text-white font-bold font-mono">{comparisonDeposit.toFixed(2)} PLN</strong>
                    </div>
                    <div className="border-r border-dark-800 pr-4">
                      <span className="text-[9px] text-dark-400 block uppercase tracking-wider font-semibold">Obciążenie za zerwanie:</span>
                      <strong className="text-sm text-amber-400 font-bold font-mono">{terminationPenalty.toFixed(2)} PLN</strong>
                    </div>
                    <div className="border-r border-dark-800 pr-4">
                      <span className="text-[9px] text-dark-400 block uppercase tracking-wider font-semibold">Koszt napraw:</span>
                      <strong className="text-sm text-red-400 font-bold font-mono">{repairCostsSum.toFixed(2)} PLN</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-dark-400 block uppercase tracking-wider font-semibold">
                        {comparisonBalance >= 0 ? "Zwrot dla lokatora:" : "Dopłata od lokatora:"}
                      </span>
                      <strong className={`text-sm font-bold font-mono ${comparisonBalance >= 0 ? "text-green-400" : "text-red-500 animate-pulse"}`}>
                        {Math.abs(comparisonBalance).toFixed(2)} PLN
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={exportingDifferenceReport}
                    onClick={handleGenerateDifferenceReport}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:from-dark-800 disabled:to-dark-800 disabled:text-dark-500 text-white rounded-xl text-xxs font-bold shadow-lg shadow-amber-500/10 flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wide"
                  >
                    {exportingDifferenceReport ? (
                      <>Generowanie...</>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        Zatwierdź i Generuj Raport PDF
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TenantNotesSection({ tenant }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [localNotes, setLocalNotes] = useState(tenant.notes || []);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setLocalNotes(tenant.notes || []);
  }, [tenant.notes]);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!topic.trim() || !content.trim()) return;
    setLocalError("");
    try {
      const newNote = addTenantNote(tenant.id, topic.trim(), content.trim());
      setLocalNotes(prev => [...prev, newNote]);
      setTopic("");
      setContent("");
      setShowAddForm(false);
    } catch (err) {
      setLocalError("Błąd dodawania notatki: " + err.message);
    }
  };

  const handleDeleteNote = (noteId) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę notatkę?")) return;
    setLocalError("");
    try {
      deleteTenantNote(tenant.id, noteId);
      setLocalNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      setLocalError("Błąd usuwania notatki: " + err.message);
    }
  };

  const filteredNotes = localNotes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mt-4 pt-3 border-t border-dark-800/80 space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-dark-500 text-[10px] block font-bold uppercase tracking-wider text-dark-400">
          📝 Rejestr Ustaleń i Notatek
        </span>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-brand-400 hover:text-white text-[9px] font-bold uppercase flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded transition-all cursor-pointer"
        >
          {showAddForm ? "Anuluj" : "+ Dodaj notatkę"}
        </button>
      </div>

      {localError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-2.5 text-xxs flex items-center justify-between gap-2 animate-fade-in font-sans">
          <span>{localError}</span>
          <button type="button" onClick={() => setLocalError("")} className="text-dark-400 hover:text-white font-bold shrink-0">✕</button>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddNote} className="space-y-2 bg-dark-950/80 p-2.5 rounded-xl border border-brand-500/20 text-xxs animate-fade-in">
          <div>
            <label className="block text-[8px] font-bold text-dark-400 uppercase mb-1">Temat ustaleń *</label>
            <input
              type="text"
              required
              placeholder="np. Ustalenia dot. kaucji"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded px-2 py-1 text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[8px] font-bold text-dark-400 uppercase mb-1">Treść notatki *</label>
            <textarea
              required
              rows="2"
              placeholder="Wpisz treść ustaleń z lokatorem..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded px-2 py-1 text-white focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
          >
            Zapisz notatkę
          </button>
        </form>
      )}

      {/* Search Input if there are notes */}
      {localNotes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2 top-2 w-3 h-3 text-dark-500" />
          <input
            type="text"
            placeholder="Szukaj w notatkach..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-7 pr-3 py-1 text-[10px] text-white focus:border-brand-500 focus:outline-none placeholder-dark-500"
          />
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
        {filteredNotes.length === 0 ? (
          <p className="text-[9px] text-dark-500 text-center py-2 italic">
            {localNotes.length === 0 ? "Brak sporządzonych notatek." : "Brak pasujących notatek."}
          </p>
        ) : (
          filteredNotes.map(n => (
            <div key={n.id} className="p-2 bg-dark-950/40 rounded-lg border border-dark-850 flex flex-col gap-1 relative group hover:border-dark-750 transition-all text-[10px]">
              <div className="flex items-center justify-between gap-2 border-b border-dark-850 pb-1">
                <span className="font-bold text-white truncate max-w-[70%]" title={n.title}>
                  📌 {n.title}
                </span>
                <span className="text-[8px] text-dark-500 font-mono flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-brand-400" />
                  {new Date(n.createdAt).toLocaleDateString('pl-PL')}
                </span>
              </div>
              <p className="text-dark-300 text-[9px] leading-relaxed whitespace-pre-wrap">{n.content}</p>
              <button
                type="button"
                onClick={() => handleDeleteNote(n.id)}
                className="absolute top-1.5 right-1.5 p-0.5 text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded"
                title="Usuń notatkę"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function generateDraftSummary(tenant) {
  const notes = tenant.notes || [];
  const invoices = getInvoicesForTenant(tenant.id) || [];
  
  // 1. ANALIZA TERMINOWOŚCI WPŁAT (LOGI)
  const totalInvoices = invoices.length;
  let paidOnTime = 0;
  let paidLate = 0;
  let unpaid = 0;
  let partial = 0;
  let delayLogs = [];

  // Sort invoices chronologically by month
  const sortedInvoices = [...invoices].sort((a, b) => a.month.localeCompare(b.month));

  sortedInvoices.forEach(inv => {
    const timeliness = getPaymentTimeliness(inv.due_date, inv.paymentDate, inv.status);
    let statusLabel = "";
    
    if (inv.status === "paid") {
      if (timeliness && timeliness.isDelayed) {
        paidLate++;
        statusLabel = `🔴 OPŁACONO Z OPÓŹNIENIEM o ${timeliness.days} dni (wpłata: ${inv.paymentDate}, termin: ${inv.due_date})`;
      } else {
        paidOnTime++;
        const daysEarly = timeliness && timeliness.days < 0 ? ` (przed czasem o ${Math.abs(timeliness.days)} dni)` : "";
        statusLabel = `🟢 OPŁACONO W TERMINIE${daysEarly} (wpłata: ${inv.paymentDate || "zaksięgowana"}, termin: ${inv.due_date})`;
      }
    } else if (inv.status === "partial") {
      partial++;
      statusLabel = `🟡 CZĘŚCIOWA WPŁATA (wpłacono: ${inv.paidAmount || 0} z ${inv.amount} PLN, termin: ${inv.due_date})`;
    } else {
      unpaid++;
      const overdueDays = timeliness && timeliness.isDelayed ? ` (spóźnienie: ${timeliness.days} dni)` : "";
      statusLabel = `❌ NIEOPŁACONA${overdueDays} (kwota: ${inv.amount} PLN, termin: ${inv.due_date})`;
    }

    delayLogs.push(`- Rachunek za [${inv.month}]: ${statusLabel}`);
  });

  let timelinessSummary = "";
  if (totalInvoices === 0) {
    timelinessSummary = "Brak zarejestrowanej historii finansowej (faktur).";
  } else {
    const onTimePct = Math.round((paidOnTime / totalInvoices) * 100);
    timelinessSummary = `Statystyka: ${paidOnTime} / ${totalInvoices} opłacone w terminie (${onTimePct}%). `;
    if (unpaid > 0 || partial > 0) {
      timelinessSummary += `⚠️ Uwaga! Lokator posiada ${unpaid} nieopłaconych oraz ${partial} częściowo opłaconych rachunków.`;
    } else if (paidLate > 0) {
      timelinessSummary += `Wystąpiły opóźnienia w płatnościach (${paidLate} razy).`;
    } else {
      timelinessSummary += `Wzorowa i nienaganna dyscyplina finansowa.`;
    }
  }

  // 2. ANALIZA KULTURY WSPÓŁPRACY
  const cultureKeywords = ["kultur", "współprac", "komunikac", "kontakt", "zachowan", "kulturaln", "uprzejm", "problem", "konflikt", "krzyk", "agresywn"];
  const cultureNotes = notes.filter(note => {
    const text = `${note.title} ${note.content}`.toLowerCase();
    return cultureKeywords.some(kw => text.includes(kw));
  });

  let cultureSummary = "";
  let cultureLogs = [];
  let isPositiveCulture = true;

  if (cultureNotes.length === 0) {
    cultureSummary = "Brak specyficznych uwag dotyczących kultury współpracy w notatkach. Komunikacja przebiegała w sposób standardowy.";
  } else {
    cultureNotes.forEach(n => {
      const text = `${n.title} ${n.content}`.toLowerCase();
      const hasNegative = ["konflikt", "problem", "trudny", "agresywn", "krzyk", "skarg"].some(kw => text.includes(kw));
      if (hasNegative) isPositiveCulture = false;
      
      const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString("pl-PL") : "Brak daty";
      cultureLogs.push(`- [${dateStr}] ${n.title}: ${n.content}`);
    });

    cultureSummary = isPositiveCulture 
      ? "Lokator wykazywał się wysoką kulturą osobistą, a współpraca przebiegała w przyjaznej, ugodowej atmosferze." 
      : "Zarejestrowano incydenty lub utrudnienia we współpracy / komunikacji (wymagało interwencji).";
  }

  // 3. ANALIZA SPOSOBU DBANIA O LOKAL (WIZYTY KONTROLNE)
  const careKeywords = ["kontro", "wizyt", "stan lok", "dban", "czyst", "porząd", "brud", "zniszcz", "uszkodz", "zalani", "inspekcj"];
  const careNotes = notes.filter(note => {
    const text = `${note.title} ${note.content}`.toLowerCase();
    return careKeywords.some(kw => text.includes(kw));
  });

  let careSummary = "";
  let careLogs = [];
  let isGoodCare = true;

  if (careNotes.length === 0) {
    careSummary = "Brak wpisów z wizyt kontrolnych w rejestrze. Sposób dbania o lokal nie był szczegółowo raportowany podczas trwania umowy.";
  } else {
    careNotes.forEach(n => {
      const text = `${n.title} ${n.content}`.toLowerCase();
      const hasNegative = ["brud", "zniszcz", "uszkodz", "niedba", "zaniedba", "syf", "bałag"].some(kw => text.includes(kw));
      if (hasNegative) isGoodCare = false;
      
      const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString("pl-PL") : "Brak daty";
      careLogs.push(`- [${dateStr}] ${n.title}: ${n.content}`);
    });

    careSummary = isGoodCare 
      ? "Stan lokalu podczas wizyt kontrolnych był oceniany bardzo dobrze. Lokator dbał o czystość, porządek i wyposażenie lokalu w sposób odpowiedzialny." 
      : "Odnotowano uchybienia w dbałości o lokal, stwierdzono zanieczyszczenia lub uszkodzenia sprzętu w trakcie trwania umowy.";
  }

  // 4. REKOMENDACJA KOŃCOWA
  let recommendation = "";
  if (unpaid > 0 || partial > 0) {
    recommendation = "NIE POLECAM tego najemcy ze względu na zaległości finansowe i nieuregulowane rachunki.";
  } else if (paidLate > 1 || !isPositiveCulture || !isGoodCare) {
    recommendation = "Najemca poprawny, ale wymagał dyscyplinowania płatniczego lub zwracania uwagi na kwestie porządkowe/komunikacyjne.";
  } else {
    recommendation = "ZDECYDOWANIE POLECAM tego lokatora. Wzorowa terminowość wpłat, wysoka kultura osobista oraz wzorowa dbałość o czystość i stan lokalu.";
  }

  // BUILD INTELLECTUAL DRAFT TEXT
  return `INTELIGENTNE PODSUMOWANIE LOKATORA: ${tenant.name.toUpperCase()}
Sporządzono dnia: ${new Date().toLocaleDateString("pl-PL")}

1. REJESTR I ANALIZA TERMINOWOŚCI WPŁAT:
Podsumowanie: ${timelinessSummary}

Logi rozliczeniowe (historia faktur):
${delayLogs.length > 0 ? delayLogs.join("\n") : "- Brak historii płatności."}

2. KULTURA WSPÓŁPRACY I KOMUNIKACJA:
Podsumowanie: ${cultureSummary}

Odnotowane logi z notatek:
${cultureLogs.length > 0 ? cultureLogs.join("\n") : "- Brak specyficznych notatek w tej kategorii."}

3. SPOSÓB DBANIA O LOKAL (WIZYTY KONTROLNE):
Podsumowanie: ${careSummary}

Rejestr wizyt kontrolnych i inspekcji:
${careLogs.length > 0 ? careLogs.join("\n") : "- Brak wpisów z kontroli."}

4. REKOMENDACJA KOŃCOWA:
${recommendation}`;
}

export function TenantFinalSummarySection({ tenant }) {
  const [summary, setSummary] = useState(tenant.finalSummary || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setSummary(tenant.finalSummary || "");
  }, [tenant.finalSummary]);

  const handleSave = () => {
    try {
      updateTenantSummary(tenant.id, summary);
      setIsSaved(true);
      setIsEditing(false);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = () => {
    if (summary && !window.confirm("Czy chcesz zastąpić obecną treść automatycznie wygenerowanym szkicem podsumowania na podstawie notatek i historii wpłat?")) {
      return;
    }
    const draft = generateDraftSummary(tenant);
    setSummary(draft);
    setIsEditing(true);
  };

  return (
    <div className="mt-4 pt-3 border-t border-dark-800/80 space-y-3 font-sans text-xxs">
      <div className="flex items-center justify-between">
        <span className="text-dark-500 text-[10px] block font-bold uppercase tracking-wider text-dark-400 flex items-center gap-1">
          📋 Podsumowanie Końcowe Lokatora
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            className="text-brand-400 hover:text-white text-[9px] font-bold uppercase flex items-center gap-0.5 bg-brand-500/10 px-2 py-0.5 rounded transition-all cursor-pointer border border-brand-500/20"
            title="Szkicuj podsumowanie z notatek i historii rozliczeń"
          >
            ✨ Generuj Szkic
          </button>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-brand-400 hover:text-white text-[9px] font-bold uppercase flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded transition-all cursor-pointer border border-brand-500/20"
            >
              Edytuj
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="text-green-400 hover:text-white text-[9px] font-bold uppercase flex items-center gap-1 bg-green-500/20 px-2 py-0.5 rounded transition-all cursor-pointer border border-green-500/25"
            >
              Zapisz
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2 animate-fade-in">
          <textarea
            rows="5"
            className="w-full bg-dark-950 border border-dark-800 focus:border-brand-500 rounded-xl p-2.5 text-[10px] text-white focus:outline-none placeholder-dark-500 leading-normal"
            placeholder="Wpisz podsumowanie końcowe, cechy lokatora, rzetelność, komunikację..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSummary(tenant.finalSummary || "");
                setIsEditing(false);
              }}
              className="px-2 py-1 bg-dark-900 border border-dark-800 hover:bg-dark-800 text-white rounded text-[9px] transition-all cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[9px] font-bold transition-all cursor-pointer"
            >
              Zapisz podsumowanie
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-dark-950/40 rounded-xl border border-dark-850 p-2.5 text-[9px] text-dark-300 leading-relaxed relative min-h-[45px] flex items-center justify-center">
          {summary ? (
            <p className="whitespace-pre-wrap w-full text-left">{summary}</p>
          ) : (
            <p className="text-dark-500 italic text-center py-1">
              Brak sporządzonego podsumowania końcowego najemcy.
            </p>
          )}
          {isSaved && (
            <span className="absolute top-2 right-2 text-[8px] bg-green-500/20 border border-green-500/30 text-green-400 px-1.5 py-0.5 rounded animate-fade-in font-bold">
              Zapisano!
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TenantHistoryTimelineSection({ tenant }) {
  // Build a unified, chronologically sorted activity/lease history
  const unifiedTimeline = useMemo(() => {
    if (!tenant) return [];
    
    let list = [];
    
    // 1. Add creation event
    if (tenant.createdAt) {
      list.push({
        date: tenant.createdAt,
        type: "creation",
        title: "Utworzenie profilu",
        desc: "Utworzono profil lokatora w systemie.",
        colorClass: "bg-blue-500 border-blue-400 text-blue-450",
        badge: "Profil"
      });
    }

    // 2. Map all leaseHistory records into activation and deactivation events
    if (tenant.leaseHistory && tenant.leaseHistory.length > 0) {
      tenant.leaseHistory.forEach(lh => {
        if (lh.leaseStart) {
          list.push({
            date: lh.leaseStart + "T12:00:00.000Z",
            type: "activation",
            title: "Rozpoczęcie najmu",
            desc: `Rozpoczęcie najmu lokalu: ${lh.propertyTitle}`,
            colorClass: "bg-green-500 border-green-400 text-green-400",
            badge: "Najem",
            leaseStart: lh.leaseStart,
            leaseEnd: lh.leaseEnd,
            propertyTitle: lh.propertyTitle
          });
        }
        
        list.push({
          date: lh.archivedAt || (lh.leaseEnd ? lh.leaseEnd + "T23:59:59.000Z" : new Date().toISOString()),
          type: "deactivation",
          title: "Zakończenie najmu",
          desc: `Zakończenie najmu lokalu: ${lh.propertyTitle} i przeniesienie do archiwum`,
          colorClass: "bg-red-500 border-red-400 text-red-400",
          badge: "Archiwum",
          leaseStart: lh.leaseStart,
          leaseEnd: lh.leaseEnd,
          propertyTitle: lh.propertyTitle
        });
      });
    }

    // 3. Map any non-duplicate activity log entries
    if (tenant.activityLog && tenant.activityLog.length > 0) {
      tenant.activityLog.forEach(log => {
        if (log.type === "creation") return; // skip profile creation since we added it
        
        // Skip activation/deactivation from activityLog if they are already represented in leaseHistory
        const isLeaseRep = list.some(item => 
          item.propertyTitle === log.propertyTitle && 
          (item.leaseStart === log.leaseStart || new Date(item.date).toDateString() === new Date(log.date).toDateString())
        );
        if (isLeaseRep) return;

        let typeTitle = "Zdarzenie";
        let color = "bg-brand-500 border-brand-400 text-brand-350";
        let badge = "Log";
        
        if (log.type === "activation") {
          typeTitle = "Rozpoczęcie najmu";
          color = "bg-green-500 border-green-400 text-green-400";
          badge = "Najem";
        } else if (log.type === "reactivation") {
          typeTitle = "Przywrócenie (nowy najem)";
          color = "bg-green-500 border-green-450 text-green-400";
          badge = "Reaktywacja";
        } else if (log.type === "deactivation") {
          typeTitle = "Zakończenie najmu";
          color = "bg-red-500 border-red-400 text-red-400";
          badge = "Archiwum";
        }

        list.push({
          date: log.date,
          type: log.type,
          title: typeTitle,
          desc: log.description,
          colorClass: color,
          badge: badge,
          leaseStart: log.leaseStart,
          leaseEnd: log.leaseEnd,
          propertyTitle: log.propertyTitle
        });
      });
    }

    // 4. Add current active lease if they are currently active
    if (!tenant.isArchived && tenant.property_id) {
      const activeProperty = getPropertyById(tenant.property_id);
      if (activeProperty) {
        list.push({
          date: activeProperty.leaseStart ? activeProperty.leaseStart + "T12:00:00.000Z" : new Date().toISOString(),
          type: "activation",
          title: "Bieżący najem (Aktywny)",
          desc: `Rozpoczęcie aktualnego najmu lokalu: ${activeProperty.title}`,
          colorClass: "bg-emerald-500 border-emerald-450 text-emerald-400 font-bold",
          badge: "Aktywny Najem",
          leaseStart: activeProperty.leaseStart,
          leaseEnd: activeProperty.leaseEnd,
          propertyTitle: activeProperty.title,
          isActive: true
        });
      }
    }

    // Sort descending (newest first)
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [tenant]);

  return (
    <div className="space-y-3 font-sans text-xxs mt-3 pt-3 border-t border-dark-850">
      <span className="text-dark-500 text-[10px] block font-bold uppercase tracking-wider text-dark-400">
        ⌛ Historia Statusów i Okresów Aktywności
      </span>
      {unifiedTimeline.length === 0 ? (
        <p className="text-[9px] text-dark-500 italic text-center py-2">Brak wpisów osi czasu.</p>
      ) : (
        <div className="relative border-l border-dark-800 pl-4 ml-1.5 space-y-4 py-1 max-h-[160px] overflow-y-auto pr-1">
          {unifiedTimeline.map((item, idx) => {
            const isCurrentActive = item.isActive;
            return (
              <div key={idx} className="relative space-y-0.5">
                <span className={`absolute -left-[20px] top-1 flex h-2 w-2 items-center justify-center rounded-full ${isCurrentActive ? 'bg-green-500/25 border-green-400' : 'bg-brand-500/25 border-brand-400'}`}>
                  <span className={`h-1 w-1 rounded-full ${isCurrentActive ? 'bg-green-400 animate-ping' : 'bg-brand-400'}`}></span>
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold ${isCurrentActive ? 'text-green-400' : 'text-white'} text-[9px]`}>
                    {item.title}
                  </span>
                  <span className="text-[8px] text-dark-500 font-mono">
                    {new Date(item.date).toLocaleDateString('pl-PL')}
                  </span>
                </div>
                <p className="text-dark-400 text-[9px] leading-snug">{item.desc}</p>
                {item.leaseStart && (
                  <div className="text-[8px] text-dark-500 font-mono">
                    Kontrakt: {item.leaseStart} &rarr; {item.leaseEnd || "bezterminowo"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
