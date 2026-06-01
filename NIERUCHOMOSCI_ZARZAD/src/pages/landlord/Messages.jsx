import React, { useState, useEffect, useRef } from "react";
import { 
  getMessagesBetweenUsers, 
  sendMessage, 
  markMessagesAsRead,
  getPropertiesByLandlord,
  getUserById,
  checkAndRunDunning,
  approveAndSendFormalNotice,
  openDocumentFile,
  getInvoicesForTenant,
  downloadDocumentFile
} from "../../utils/storage";
import { 
  MessageSquare, 
  Send, 
  CheckCheck, 
  User, 
  Sparkles, 
  Image, 
  Paperclip, 
  X, 
  Download,
  XCircle,
  FileText,
  Eye
} from "lucide-react";

export const generateFormalNoticeHtml = (invoice, tenant, landlord, property) => {
  const todayStr = new Date().toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const leaseStartStr = property.leaseStart 
    ? new Date(property.leaseStart).toLocaleDateString("pl-PL")
    : "___";

  const outstanding = invoice.amount - (invoice.receivedPayment || 0);

  // Extract city of residence from landlord's postalCodeCity
  let issueCity = "Kraków";
  if (landlord && landlord.postalCodeCity) {
    const cleanedCity = landlord.postalCodeCity
      .replace(/^\d{2}-\d{3}\s*/, "") // matches standard Polish XX-XXX postal code
      .replace(/^\d{5}\s*/, "")        // matches standard XXXXX postal code
      .trim();
    if (cleanedCity) {
      issueCity = cleanedCity;
    }
  }

  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Formalne Wezwanie do Zapłaty</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    
    .page {
      max-width: 800px;
      margin: 40px auto;
      padding: 50px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      position: relative;
    }
    
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #d97706;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      z-index: 100;
      transition: background-color 0.2s;
    }
    
    .print-btn:hover {
      background-color: #b45309;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      font-size: 13px;
    }
    
    .date-place {
      text-align: right;
    }
    
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 50px;
      gap: 40px;
    }
    
    .party-box {
      flex: 1;
      padding: 15px;
      background-color: #f8fafc;
      border-radius: 8px;
      border: 1px solid #f1f5f9;
      font-size: 13px;
    }
    
    .party-title {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    
    .doc-title {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 40px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
    }
    
    .content-text {
      font-size: 14px;
      text-align: justify;
      margin-bottom: 30px;
    }
    
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      font-size: 13px;
    }
    
    .invoice-table th, .invoice-table td {
      border: 1px solid #e2e8f0;
      padding: 12px;
      text-align: left;
    }
    
    .invoice-table th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 600;
    }
    
    .highlight-row {
      background-color: #fffbeb;
      font-weight: 700;
      color: #b45309;
    }
    
    .warning-box {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      border-radius: 4px;
      font-size: 13px;
      color: #991b1b;
      margin-bottom: 30px;
    }
    
    .signatures {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }
    
    .signature-line {
      width: 200px;
      border-top: 1px dashed #94a3b8;
      text-align: center;
      padding-top: 8px;
      margin-top: 50px;
      color: #64748b;
    }
    
    @media print {
      body {
        background-color: white;
      }
      .page {
        border: none;
        box-shadow: none;
        margin: 0;
        padding: 20px;
      }
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>

  <button class="print-btn" onclick="window.print()">🖨️ Drukuj / Zapisz PDF</button>

  <div class="page">
    <div class="header">
      <div>
        <strong>System RentPortal</strong><br>
        Monit Windykacyjny ID: WZP-${invoice.id}
      </div>
      <div class="date-place">
        ${issueCity}, dnia ${todayStr}
      </div>
    </div>
    
    <div class="parties">
      <div class="party-box">
        <div class="party-title">Wzywający (Wynajmujący)</div>
        <strong>${landlord.name || "Krzysztof"}</strong><br>
        ${landlord.addressStreet ? `${landlord.addressStreet}<br>` : ""}
        ${landlord.postalCodeCity ? `${landlord.postalCodeCity}<br>` : ""}
        Telefon: ${landlord.phone || "+48 501 234 567"}<br>
        E-mail: ${landlord.email || "krzysztof@wlasciciel.pl"}
      </div>
      <div class="party-box">
        <div class="party-title">Wezwany (Najemca)</div>
        <strong>${tenant.name}</strong><br>
        Meldunek: ${tenant.address || "Brak adresu zameldowania"}<br>
        Dowód: ${tenant.idCard || "Brak serii dowodu"}<br>
        Telefon: ${tenant.phone || "Brak telefonu"}
      </div>
    </div>
    
    <div class="doc-title">
      Ostateczne Przedsądowe Wezwanie do Zapłaty
    </div>
    
    <div class="content-text">
      Działając w imieniu własnym jako Wynajmujący lokal mieszkalny przy <strong>ul. ${property.address}, ${property.city}</strong>, na podstawie zawartej umowy najmu z dnia ${leaseStartStr} r., <strong>niniejszym ostatecznie wzywam Pana/Panią do zapłaty</strong> wymagalnego zadłużenia z tytułu opłat czynszowych i eksploatacyjnych.
    </div>
    
    <div class="content-text">
      Stan zadłużenia na dzień sporządzenia wezwania przedstawia się następująco:
    </div>
    
    <table class="invoice-table">
      <thead>
        <tr>
          <th>Tytuł dokumentu</th>
          <th>Termin płatności</th>
          <th>Kwota całkowita</th>
          <th>Wpłacono</th>
          <th>Do zapłaty</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${invoice.title}</td>
          <td>${invoice.due_date}</td>
          <td>${invoice.amount.toFixed(2)} PLN</td>
          <td>${(invoice.receivedPayment || 0).toFixed(2)} PLN</td>
          <td style="color: #ef4444; font-weight: 600;">${outstanding.toFixed(2)} PLN</td>
        </tr>
        <tr class="highlight-row">
          <td colspan="4" style="text-align: right;">ŁĄCZNA KWOTA DO ZAPŁATY:</td>
          <td>${outstanding.toFixed(2)} PLN</td>
        </tr>
      </tbody>
    </table>
    
    <div class="warning-box">
      <strong>UWAGA:</strong> Wyżej wymienioną kwotę zaległości należy uregulować w nieprzekraczalnym terminie <strong>7 dni</strong> od daty doręczenia niniejszego wezwania, dokonując przelewu na konto bankowe wskazane w umowie najmu.
    </div>
    
    <div class="content-text">
      Brak uregulowania pełnej kwoty zadłużenia w wyżej zakreślonym terminie skutkować będzie <strong>skierowaniem sprawy na drogę postępowania sądowego</strong> w celu przymusowego dochodzenia należności, co znacznie zwiększy wysokość zadłużenia o koszty sądowe, koszty zastępstwa procesowego (adwokackie) oraz odsetki ustawowe za opóźnienie. 
    </div>
    
    <div class="content-text">
      Niniejsze wezwanie jest wezwaniem ostatecznym przed wytoczeniem powództwa. W przypadku uregulowania należności w ostatnich dniach, prosimy o przesłanie potwierdzenia przelewu w panelu konwersacji.
    </div>
    
    <div class="signatures">
      <div>
        <div class="signature-line">Podpis Najemcy<br>(Potwierdzenie odbioru)</div>
      </div>
      <div>
        <div class="signature-line">Podpis Wynajmującego</div>
      </div>
    </div>
  </div>

</body>
</html>
  `;
};

const THREADS = [
  { id: "Usterki", label: "🛠️ Usterki i naprawy" },
  { id: "Rozliczenia", label: "💰 Rozliczenia i opłaty" },
  { id: "Ogólne", label: "💬 Tematy ogólne" }
];

export default function LandlordMessages({ landlordId }) {
  const [properties, setProperties] = useState([]);
  const [tenantsWithProps, setTenantsWithProps] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [activeThread, setActiveThread] = useState("Usterki");
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [activeLightbox, setActiveLightbox] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingMonits, setPendingMonits] = useState([]);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Run dunning engine checks on mount
    try {
      checkAndRunDunning(landlordId);
    } catch (err) {
      console.error("[Dunning] Error running collection engine:", err);
    }

    const props = getPropertiesByLandlord(landlordId);
    setProperties(props);

    // Map tenants who are renting landlord's properties
    const list = [];
    props.forEach(p => {
      if (p.tenant_id) {
        const tenant = getUserById(p.tenant_id);
        if (tenant) {
          list.push({
            tenant,
            property: p
          });
        }
      }
    });

    setTenantsWithProps(list);
    if (list.length > 0) {
      setSelectedTenant(list[0].tenant);
      setSelectedProperty(list[0].property);
    }
  }, [landlordId]);

  const loadPendingMonits = () => {
    if (selectedTenant) {
      const invoices = getInvoicesForTenant(selectedTenant.id) || [];
      const pending = invoices.filter(inv => inv.dunningFormalNoticeStatus === "pending");
      setPendingMonits(pending);
    } else {
      setPendingMonits([]);
    }
  };

  useEffect(() => {
    loadPendingMonits();
  }, [selectedTenant]);

  useEffect(() => {
    if (selectedTenant) {
      // Get messages
      const list = getMessagesBetweenUsers(landlordId, selectedTenant.id)
        .filter(m => m.subject === activeThread);
      setMessages(list);

      // Mark as read
      markMessagesAsRead(selectedTenant.id, landlordId, activeThread);
    }
  }, [landlordId, selectedTenant, activeThread]);

  useEffect(() => {
    const handleInvoiceUpdate = () => {
      loadPendingMonits();
      if (selectedTenant) {
        const list = getMessagesBetweenUsers(landlordId, selectedTenant.id)
          .filter(m => m.subject === activeThread);
        setMessages(list);
      }
    };
    window.addEventListener("rentportal_invoices_updated", handleInvoiceUpdate);
    window.addEventListener("rentportal_messages_updated", handleInvoiceUpdate);
    return () => {
      window.removeEventListener("rentportal_invoices_updated", handleInvoiceUpdate);
      window.removeEventListener("rentportal_messages_updated", handleInvoiceUpdate);
    };
  }, [landlordId, selectedTenant, activeThread]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePreviewFormalNotice = (inv) => {
    try {
      const tenant = selectedTenant;
      const landlord = getUserById(landlordId);
      const property = selectedProperty;
      
      if (!tenant || !landlord || !property) {
        throw new Error("Brak kompletnych danych do wygenerowania wezwania.");
      }

      const htmlContent = generateFormalNoticeHtml(inv, tenant, landlord, property);
      const base64Data = "data:text/html;base64," + btoa(unescape(encodeURIComponent(htmlContent)));
      const fileName = `Wezwanie_do_zaplaty_PODGLAD_${tenant.name.replace(/\s+/g, "_")}.html`;
      
      openDocumentFile(base64Data, fileName);
    } catch (err) {
      setErrorMsg("Błąd podglądu wezwania: " + err.message);
    }
  };

  const handleSendFormalNotice = async (inv) => {
    try {
      setErrorMsg("");
      const tenant = selectedTenant;
      const landlord = getUserById(landlordId);
      const property = selectedProperty;
      
      if (!tenant || !landlord || !property) {
        throw new Error("Brak kompletnych danych do wygenerowania wezwania.");
      }

      const htmlContent = generateFormalNoticeHtml(inv, tenant, landlord, property);
      const base64Data = "data:text/html;base64," + btoa(unescape(encodeURIComponent(htmlContent)));
      const invMonth = inv.month || (inv.title ? inv.title : (inv.issueDate ? inv.issueDate.substring(0, 7) : "Monit"));
      const fileName = `Wezwanie_do_zaplaty_${tenant.name.replace(/\s+/g, "_")}_${invMonth.replace(/\s+/g, "_")}.html`;

      // Save file physically on disk
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

      // Transaction: approve monit, register document, send chat message with attachment, and update invoice status
      approveAndSendFormalNotice(inv.id, fileUrl, fileName, htmlContent.length);

      // Switch to the Rozliczenia thread so the user sees the sent message immediately
      setActiveThread("Rozliczenia");
      
      // Reload pending monits for UI
      loadPendingMonits();
      
      alert("Wezwanie do zapłaty zostało pomyślnie wygenerowane, zapisane na dysku i wysłane do lokatora w czacie!");
    } catch (err) {
      setErrorMsg("Błąd wysyłania wezwania: " + err.message);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorMsg("");

    // Validate if file is an image
    const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImg) {
      setErrorMsg("Wybrany plik nie jest obsługiwanym formatem obrazu (PNG, JPG, WEBP, GIF).");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG at 0.6 quality to prevent LocalStorage QuotaExceededError
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6);
            setSelectedImage(compressedDataUrl);
            setSelectedImageName(file.name);
          } catch (canvasErr) {
            setErrorMsg("Błąd kompresji obrazu: " + canvasErr.message);
          }
        };
        img.onerror = () => {
          setErrorMsg("Błąd ładowania pliku graficznego.");
        };
        img.src = event.target.result;
      };
      reader.onerror = () => {
        setErrorMsg("Błąd odczytu pliku z dysku.");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMsg("Błąd wczytywania załącznika: " + err.message);
    }
    
    // Clear value to allow re-uploading same file
    e.target.value = "";
  };

  const handleSend = (e) => {
    e.preventDefault();
    setErrorMsg("");
    if ((!inputMsg.trim() && !selectedImage) || !selectedTenant || !selectedProperty) return;

    try {
      const newMsg = sendMessage({
        sender_id: landlordId,
        receiver_id: selectedTenant.id,
        property_id: selectedProperty.id,
        subject: activeThread,
        text: inputMsg.trim(),
        attachment_name: selectedImageName || null,
        attachment_data: selectedImage || null
      });

      setMessages(prev => [...prev, newMsg]);
      setInputMsg("");
      setSelectedImage(null);
      setSelectedImageName("");
    } catch (err) {
      setErrorMsg("Błąd wysyłania: " + err.message + ". Pamięć przeglądarki może być przepełniona.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-brand-400" />
          Panel Konwersacji z Lokatorami
        </h2>
        <p className="text-dark-400 text-sm mt-1">Koresponduj bezpośrednio ze swoimi lokatorami w podziale na lokale mieszkalne.</p>
      </div>

      {tenantsWithProps.length === 0 ? (
        <div className="glass p-8 text-center rounded-2xl">
          <MessageSquare className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <p className="text-dark-300">Obecnie nie wynajmujesz żadnego lokalu. Zarejestruj najem w zakładce "Nieruchomości", aby rozpocząć konwersacje.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-4 h-[600px]">
          
          {/* Tenant Sidebar Selector */}
          <div className="md:col-span-1 glass rounded-2xl p-4 flex flex-col justify-start gap-2 h-full overflow-y-auto">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider px-2 mb-2">
              Lokatorzy / Mieszkania
            </h3>
            {tenantsWithProps.map(item => {
              const isSelected = selectedTenant?.id === item.tenant.id;
              return (
                <button
                  key={item.tenant.id}
                  onClick={() => {
                    setSelectedTenant(item.tenant);
                    setSelectedProperty(item.property);
                  }}
                  className={`text-left p-3 rounded-xl transition-all duration-200 border flex flex-col gap-1 ${
                    isSelected 
                      ? 'bg-brand-600 border-brand-500 text-white shadow-lg' 
                      : 'border-transparent text-dark-300 hover:bg-dark-900/40 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    {item.tenant.name}
                  </div>
                  <div className={`text-xxs font-mono truncate ${isSelected ? 'text-brand-100' : 'text-dark-400'}`}>
                    🏠 {item.property.title.split(",")[0]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chat and Threads */}
          <div className="md:col-span-3 glass rounded-2xl flex flex-col md:flex-row h-full overflow-hidden">
            
            {/* Thread Select Panel inside Chat */}
            <div className="md:w-1/3 bg-dark-900/40 border-r border-dark-800 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
              <h4 className="text-xxs font-semibold text-dark-500 uppercase tracking-wider px-1 mb-2 hidden md:block">
                Temat konwersacji
              </h4>
              {THREADS.map(t => {
                const isActive = activeThread === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveThread(t.id)}
                    className={`text-left py-2 px-3 rounded-lg text-xs font-semibold transition-all shrink-0 md:shrink ${
                      isActive 
                        ? 'bg-dark-800 text-brand-300 border-l-2 border-brand-500 font-bold' 
                        : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Header */}
              <div className="bg-dark-900/60 border-b border-dark-800 px-5 py-3.5 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white font-sans text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-brand-400" />
                    Czat: {selectedTenant?.name}
                  </h4>
                  <p className="text-xxs text-dark-400 mt-0.5">Mieszkanie: {selectedProperty?.title}</p>
                </div>
                <span className="text-xs text-brand-400 flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded-full font-semibold">
                  <Sparkles className="w-3 h-3" />
                  Rozmowa
                </span>
              </div>

              {/* Pending Monit Alerts */}
              {pendingMonits.map(inv => (
                <div key={inv.id} className="bg-amber-500/10 border-b border-amber-500/25 px-5 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-sans text-xs animate-fade-in shrink-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                      <XCircle className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        Formalne wezwanie do zapłaty (T+10) – Oczekuje na wysyłkę
                      </p>
                      <p className="text-dark-400 text-[10px] mt-0.5 font-sans leading-relaxed">
                        Zaległość za rachunek <span className="font-semibold text-amber-300">"{inv.title}"</span> ({inv.amount} PLN). Opóźnienie przekroczyło 10 dni.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => handlePreviewFormalNotice(inv)}
                      className="px-2.5 py-1.5 bg-dark-850 hover:bg-dark-800 text-dark-300 hover:text-white rounded-lg border border-dark-700/50 transition-all font-semibold uppercase text-[10px] cursor-pointer"
                    >
                      📄 Podgląd wezwania
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendFormalNotice(inv)}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all font-semibold uppercase text-[10px] flex items-center gap-1 shadow-md shadow-amber-600/10 hover:shadow-amber-500/20 cursor-pointer"
                    >
                      🟢 Akceptuj i wyślij
                    </button>
                  </div>
                </div>
              ))}

              {/* Bubbles */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                {messages.length === 0 ? (
                  <div className="text-center text-dark-500 text-xs py-20">
                    Brak wiadomości w tym wątku. Wpisz odpowiedź poniżej, aby rozpocząć!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === landlordId;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all ${
                          isMe 
                            ? 'bg-brand-600 text-white rounded-tr-none' 
                            : 'bg-dark-800 text-dark-100 border border-dark-700/50 rounded-tl-none'
                        }`}>
                          {m.text && <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                          
                          {m.attachment_data && (
                            (() => {
                              const isImage = m.attachment_data.startsWith("data:image/") || 
                                              (m.attachment_name && m.attachment_name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/));
                              
                              if (isImage) {
                                return (
                                  <div 
                                    className={`mt-2 rounded-xl overflow-hidden border ${
                                      isMe ? 'border-brand-500/30' : 'border-dark-700'
                                    } bg-dark-950/40 cursor-pointer group relative max-w-xs`}
                                    onClick={() => setActiveLightbox(m)}
                                  >
                                    <img 
                                      src={m.attachment_data} 
                                      alt={m.attachment_name || "Załącznik"} 
                                      className="max-w-full max-h-48 object-cover rounded-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:brightness-110" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium">
                                      <Sparkles className="w-4 h-4 text-brand-400 animate-pulse" /> Powiększ
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className={`mt-2 rounded-xl border ${
                                    isMe ? 'border-brand-500/30' : 'border-dark-700'
                                  } bg-dark-950/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-sm`}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-9 h-9 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5 text-brand-400" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-white truncate max-w-[180px]">{m.attachment_name || "Dokument"}</p>
                                        <p className="text-[10px] text-dark-400">Dokument PDF/HTML</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openDocumentFile(m.attachment_data, m.attachment_name)}
                                        className="p-1.5 bg-dark-800 hover:bg-brand-600 text-dark-300 hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                                        title="Podgląd dokumentu"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Podgląd
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadDocumentFile(m.attachment_data, m.attachment_name)}
                                        className="p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                                        title="Pobierz dokument na dysk"
                                      >
                                        <Download className="w-3.5 h-3.5" /> Pobierz
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                            })()
                          )}
                          
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-60">
                            <span>
                              {new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Selected Image Preview above Input Bar */}
              {selectedImage && (
                <div className="bg-dark-900/80 border-t border-dark-800 px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-dark-700 bg-dark-950 flex-shrink-0">
                      <img src={selectedImage} alt="Selected preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-[200px]">{selectedImageName}</p>
                      <p className="text-xxs text-dark-400">Załącznik graficzny gotowy do wysłania</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedImageName("");
                    }}
                    className="p-1.5 bg-dark-800 hover:bg-red-500/20 hover:text-red-400 text-dark-300 rounded-lg transition-all"
                    title="Usuń załącznik"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-500/10 border-t border-red-500/20 text-red-400 px-5 py-2 text-xxs flex items-center justify-between gap-4 animate-fade-in font-sans">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMsg("")}
                    className="text-dark-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <form onSubmit={handleSend} className="bg-dark-900/60 border-t border-dark-800 p-3.5 flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-xl transition-all duration-200 shrink-0 border border-dark-700/50"
                  title="Dodaj zrzut ekranu"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                
                <input
                  type="text"
                  placeholder={selectedImage ? "Dodaj opis do zdjęcia (opcjonalnie)..." : `Odpowiedz użytkownikowi ${selectedTenant?.name || ''}...`}
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-2 text-white text-sm focus:border-brand-500 focus:outline-none placeholder:text-dark-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all duration-200 glass-glow-brand shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>

          </div>

        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all duration-300"
          onClick={() => setActiveLightbox(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center transition-all transform duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Actions */}
            <div className="absolute top-[-48px] right-0 flex items-center gap-3 text-white">
              <span className="text-xs font-mono bg-dark-900/80 px-3 py-1.5 rounded-full border border-dark-800 truncate max-w-[200px] md:max-w-[350px]">
                {activeLightbox.attachment_name || "Zrzut ekranu"}
              </span>
              <a
                href={activeLightbox.attachment_data}
                download={activeLightbox.attachment_name || "rentportal_zrzut.jpg"}
                className="p-2 bg-dark-900/80 hover:bg-brand-600 text-dark-300 hover:text-white rounded-xl transition-all border border-dark-800"
                title="Pobierz plik"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => setActiveLightbox(null)}
                className="p-2 bg-dark-900/80 hover:bg-red-600 text-dark-300 hover:text-white rounded-xl transition-all border border-dark-800"
                title="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image display */}
            <div className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden border border-dark-800 bg-dark-950/80 shadow-2xl">
              <img 
                src={activeLightbox.attachment_data} 
                alt={activeLightbox.attachment_name || "Załącznik w pełnym oknie"} 
                className="max-w-full max-h-[75vh] object-contain select-none rounded-xl"
              />
            </div>
            
            {activeLightbox.text && (
              <div className="mt-3 bg-dark-900/90 border border-dark-800 text-dark-100 rounded-2xl px-5 py-3 text-sm max-w-2xl text-center shadow-lg whitespace-pre-wrap leading-relaxed">
                {activeLightbox.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
