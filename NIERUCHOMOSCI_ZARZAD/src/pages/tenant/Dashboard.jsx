import React, { useState, useEffect } from "react";
import { 
  getPropertiesByTenant, 
  getUserById, 
  getInvoicesForTenant, 
  getMetersByProperty,
  getDocumentsForTenant,
  openDocumentFile
} from "../../utils/storage";
import TenantInvoices from "./Invoices";
import TenantMeters from "./Meters";
import TenantMessages from "./Messages";
import { 
  Home, 
  CreditCard, 
  Gauge, 
  MessageSquare, 
  User, 
  Calendar, 
  Activity, 
  MapPin, 
  AlertCircle,
  FileText,
  Eye,
  Download
} from "lucide-react";

export default function TenantDashboard({ activeUser }) {
  const [activeTab, setActiveTab] = useState("pulpit");
  const [property, setProperty] = useState(null);
  const [landlord, setLandlord] = useState(null);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [recentReadings, setRecentReadings] = useState([]);
  const [documents, setDocuments] = useState([]);

  const refreshTenantData = () => {
    if (activeUser) {
      const props = getPropertiesByTenant(activeUser.id);
      if (props.length > 0) {
        const prop = props[0];
        setProperty(prop);
        const landlordUser = getUserById(prop.landlord_id);
        setLandlord(landlordUser);

        // Calculate unpaid count and amount
        const tenantInvoices = getInvoicesForTenant(activeUser.id);
        const unpaid = tenantInvoices.filter(i => i.status !== "paid");
        setUnpaidCount(unpaid.length);
        setTotalDue(unpaid.reduce((acc, curr) => acc + curr.amount, 0));

        // Get recent meter readings
        const readings = getMetersByProperty(prop.id)
          .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))
          .slice(0, 3);
        setRecentReadings(readings);

        // Get active documents
        const docs = getDocumentsForTenant(activeUser.id);
        setDocuments(docs);
      } else {
        setProperty(null);
        setLandlord(null);
        setUnpaidCount(0);
        setTotalDue(0);
        setRecentReadings([]);
        setDocuments([]);
      }
    }
  };

  useEffect(() => {
    refreshTenantData();

    const handleUsersUpdate = () => {
      refreshTenantData();
    };

    window.addEventListener("rentportal_users_updated", handleUsersUpdate);
    return () => {
      window.removeEventListener("rentportal_users_updated", handleUsersUpdate);
    };
  }, [activeUser, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "invoices":
        return <TenantInvoices tenantId={activeUser.id} />;
      case "meters":
        return <TenantMeters tenantId={activeUser.id} />;
      case "messages":
        return <TenantMessages tenantId={activeUser.id} />;
      case "pulpit":
      default:
        return renderPulpitSummary();
    }
  };

  const renderPulpitSummary = () => {
    if (!property) {
      return (
        <div className="glass p-8 text-center rounded-2xl border-yellow-500/10 glass-glow-brand">
          <Home className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-pulse" />
          <h3 className="text-xl font-bold text-white mb-2">Brak aktywnego najmu</h3>
          <p className="text-dark-400 text-sm">Nie jesteś obecnie przypisany do żadnego lokalu. Skontaktuj się z administratorem lub właścicielem.</p>
        </div>
      );
    }

    const agreements = documents.filter(d => d.document_type === "lease_agreement");
    const protocol = documents.find(d => d.document_type === "handover_protocol");

    return (
      <div className="space-y-6">
        
        {/* Welcome Card & Property Overview */}
        <div className="glass p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-brand-500/10 glass-glow-brand relative overflow-hidden">
          <div className="space-y-2 z-10">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
              Mój Wynajem
            </span>
            <h2 className="text-2xl font-bold text-white font-sans tracking-tight">
              Cześć, {activeUser.name}! 👋
            </h2>
            <p className="text-dark-300 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-400" />
              {property.title} — {property.address}, {property.city}
            </p>
          </div>

          <div className="flex gap-4 md:self-center shrink-0 z-10 w-full md:w-auto">
            <div className="bg-dark-900/60 border border-dark-800 rounded-xl px-4 py-3 text-center flex-1 md:flex-initial">
              <span className="text-xxs text-dark-500 block uppercase font-bold tracking-wider">Czynsz</span>
              <span className="text-xl font-extrabold text-white">{property.rentAmount} PLN</span>
            </div>
            <div className="bg-dark-900/60 border border-dark-800 rounded-xl px-4 py-3 text-center flex-1 md:flex-initial">
              <span className="text-xxs text-dark-500 block uppercase font-bold tracking-wider">Kaucja</span>
              <span className="text-xl font-extrabold text-white">{property.depositAmount} PLN</span>
            </div>
          </div>
        </div>

        {/* Financial Alert */}
        {unpaidCount > 0 && (
          <div className="glass p-5 rounded-2xl border-red-500/20 bg-red-500/5 glass-glow-red flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-white text-sm">Masz nieopłacone rachunki!</h3>
              <p className="text-dark-300 text-xs leading-relaxed">
                W twoim panelu widnieją <strong>{unpaidCount}</strong> nieopłacone rachunki na łączną kwotę <strong>{totalDue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</strong>. Prosimy o uregulowanie płatności u właściciela.
              </p>
              <button 
                onClick={() => setActiveTab("invoices")} 
                className="text-xs text-red-400 font-bold hover:underline mt-1 block"
              >
                Zobacz szczegóły &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Landlord Contact Info */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2 border-b border-dark-800 pb-3">
              <User className="w-5 h-5 text-brand-400" />
              Informacje o Właścicielu
            </h3>
            {landlord ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-400">Imię i nazwisko:</span>
                  <span className="font-semibold text-white">{landlord.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-400">Telefon:</span>
                  <span className="font-semibold text-white">{landlord.phone || 'brak'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-400">E-mail:</span>
                  <span className="font-semibold text-white text-brand-400">{landlord.email || 'brak'}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-400">Umowa najmu:</span>
                  <span className="font-semibold text-white flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-dark-500" />
                    {property.leaseStart || 'brak'} do {property.property_id ? property.leaseEnd : 'brak'}
                  </span>
                </div>
                {property.leaseEnd && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-dark-400">Okres najmu:</span>
                    {(() => {
                      const endDate = new Date(property.leaseEnd);
                      const today = new Date();
                      endDate.setHours(0, 0, 0, 0);
                      today.setHours(0, 0, 0, 0);
                      const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                      const isOver = diffDays < 0;
                      const isWarning = diffDays <= 40;
                      return (
                        <span className={`font-semibold flex items-center gap-1 ${isOver || isWarning ? 'text-red-400 font-bold' : 'text-green-400'}`}>
                          ⏱️ {isOver ? `Zakończona (${Math.abs(diffDays)} dni temu)` : `Pozostało dni: ${diffDays}`}
                        </span>
                      );
                    })()}
                  </div>
                )}
                {property.earlyTermination && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-xl text-xxs mt-2 space-y-1 text-left w-full font-sans">
                    <strong className="block text-amber-400">⚠️ Umowa rozwiązana przed czasem!</strong>
                    <div className="text-[10px] text-dark-300">
                      Data rozwiązania: <strong>{property.earlyTermination.terminationDate}</strong>
                    </div>
                    {(() => {
                      const endDate = new Date(property.leaseEnd);
                      const termDate = new Date(property.earlyTermination.terminationDate);
                      const diff = Math.ceil((endDate - termDate) / (1000 * 60 * 60 * 24));
                      return (
                        <div className="text-[10px] text-amber-200">
                          Rozwiązano przed czasem o: <strong>{diff} dni</strong>
                        </div>
                      );
                    })()}
                    <div className="text-[10px] text-amber-200">
                      Naliczona kara umowna: <strong className="text-red-400 font-bold">{parseFloat(property.earlyTermination.penaltyAmount).toFixed(2)} PLN</strong>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => setActiveTab("messages")}
                  className="w-full mt-2 py-2 px-4 bg-dark-900 border border-dark-800 hover:border-brand-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
                  Napisz wiadomość na czacie
                </button>
              </div>
            ) : (
              <p className="text-dark-400 text-sm">Brak danych właściciela.</p>
            )}
          </div>

          {/* Recent Meter Status */}
          <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2 border-b border-dark-800 pb-3">
              <Activity className="w-5 h-5 text-brand-400" />
              Ostatnie Odczyty Liczników
            </h3>
            
            {recentReadings.length === 0 ? (
              <p className="text-dark-400 text-sm text-center py-6">Brak zgłoszonych odczytów w ostatnim czasie.</p>
            ) : (
              <div className="space-y-3">
                {recentReadings.map(r => {
                  const label = r.meter_type === "electricity" ? "⚡ Prąd" : r.meter_type === "water_cold" ? "💧 Zimna woda" : r.meter_type === "water_hot" ? "🔥 Ciepła woda" : r.meter_type === "gas" ? "⛽ Gaz" : "♨️ Ogrzewanie";
                  return (
                    <div key={r.id} className="flex justify-between items-center bg-dark-900/50 p-2.5 rounded-xl border border-dark-800 text-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-xs">{label}</span>
                        <span className="text-xxs text-dark-500">{r.reading_date}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-brand-300">{r.reading_value}</span>
                        <span className={`block text-[10px] font-semibold ${
                          r.status === "approved" ? "text-green-400" : r.status === "rejected" ? "text-red-400" : "text-yellow-400"
                        }`}>
                          {r.status === "approved" ? "Zatwierdzony" : r.status === "rejected" ? "Odrzucony" : "Oczekuje"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <button 
                  onClick={() => setActiveTab("meters")}
                  className="w-full mt-1 py-2 px-4 bg-dark-900 border border-dark-800 hover:border-brand-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Gauge className="w-3.5 h-3.5 text-brand-400" />
                  Zgłoś nowy stan licznika
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Documents View for Tenants */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white font-sans flex items-center gap-2 border-b border-dark-800 pb-3">
            <FileText className="w-5 h-5 text-brand-400" />
            Moje Dokumenty i Umowy (PDF / DOCX)
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* Lease Agreement Card */}
            <div className="bg-dark-900/50 border border-dark-800 p-4 rounded-xl flex flex-col gap-3">
              <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 tracking-wider w-max">
                Umowa Najmu (DOCX / PDF)
              </span>
              {agreements.length > 0 ? (
                <div className="space-y-2">
                  {agreements.map(agreement => {
                    const isDocx = agreement.file_name.toLowerCase().endsWith(".docx");
                    return (
                      <div key={agreement.id} className="flex items-center justify-between bg-dark-950/60 p-2.5 rounded-lg border border-dark-800/80 gap-4">
                        <div className="truncate">
                          <h4 className="font-semibold text-white text-xs truncate" title={agreement.file_name}>
                            {agreement.file_name}
                          </h4>
                          <p className="text-xxs text-dark-500">Rozmiar: {agreement.file_size}</p>
                        </div>
                        <button
                          onClick={() => openDocumentFile(agreement.file_data, agreement.file_name)}
                          className="py-1 px-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xxs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {isDocx ? <Download className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isDocx ? "Pobierz" : "Otwórz"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-dark-500 italic">Brak załączonego pliku umowy najmu</p>
              )}
            </div>

            {/* Handover Protocol Card */}
            <div className="bg-dark-900/50 border border-dark-800 p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="truncate space-y-1">
                <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 tracking-wider">
                  Protokół Zdawczo-Odbiorczy
                </span>
                {protocol ? (
                  <>
                    <h4 className="font-semibold text-white text-xs truncate mt-1.5" title={protocol.file_name}>
                      {protocol.file_name}
                    </h4>
                    <p className="text-xxs text-dark-500">Rozmiar: {protocol.file_size}</p>
                  </>
                ) : (
                  <p className="text-xs text-dark-500 italic mt-1.5">Brak załączonego protokołu Z-O</p>
                )}
              </div>
              
              {protocol && (
                <button
                  onClick={() => openDocumentFile(protocol.file_data, protocol.file_name)}
                  className="py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xxs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Otwórz plik
                </button>
              )}
            </div>

          </div>
        </div>

      </div>
    );
  };

  if (!property) {
    return (
      <div className="max-w-md mx-auto md:max-w-4xl px-2 py-4 space-y-6">
        <div className="glass p-8 text-center rounded-2xl border-yellow-500/10 glass-glow-brand relative overflow-hidden">
          <div className="absolute right-4 top-4 text-yellow-500/5 pointer-events-none">
            <Home className="w-32 h-32 stroke-[1.5]" />
          </div>
          <Home className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-xl font-extrabold text-white mb-2">Brak Aktywnego Najmu</h3>
          <p className="text-dark-300 text-xs max-w-sm mx-auto leading-relaxed mb-4">
            Cześć, <strong className="text-brand-300">{activeUser.name}</strong>! Nie posiadasz obecnie aktywnego najmu lokalu w naszym portalu. Twój najem mógł zostać zarchiwizowany przez zarządcę po zakończeniu okresu umowy.
          </p>
          <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-800 text-[10px] text-dark-400 max-w-sm mx-auto">
            ℹ️ Jeśli uważasz, że to błąd, skontaktuj się bezpośrednio ze swoim zarządcą lub administratorem RentPortal.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto md:max-w-4xl px-2 py-4 space-y-6">
      
      {/* Mobile Tab Bar Header for Tenants */}
      <div className="glass p-2 rounded-2xl flex justify-around items-center border-brand-500/10">
        <button
          onClick={() => setActiveTab("pulpit")}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === "pulpit" ? "text-brand-400 bg-brand-500/5 font-semibold" : "text-dark-400 hover:text-white"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xxs">Pulpit</span>
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === "invoices" ? "text-brand-400 bg-brand-500/5 font-semibold" : "text-dark-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-xxs">Opłaty</span>
        </button>
        <button
          onClick={() => setActiveTab("meters")}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === "meters" ? "text-brand-400 bg-brand-500/5 font-semibold" : "text-dark-400 hover:text-white"
          }`}
        >
          <Gauge className="w-5 h-5" />
          <span className="text-xxs">Liczniki</span>
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === "messages" ? "text-brand-400 bg-brand-500/5 font-semibold" : "text-dark-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xxs">Czat</span>
        </button>
      </div>

      {/* Primary Tab Content Panel */}
      <main className="transition-all duration-300">
        {renderContent()}
      </main>

    </div>
  );
}
