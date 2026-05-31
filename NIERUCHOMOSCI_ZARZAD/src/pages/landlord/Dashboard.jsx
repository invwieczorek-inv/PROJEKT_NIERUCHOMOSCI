import React, { useState, useEffect } from "react";
import { 
  getPropertiesByLandlord, 
  getInvoices, 
  getMeters,
  getUserById,
  updateUserProfile
} from "../../utils/storage";
import LandlordProperties from "./Properties";
import LandlordTenants from "./Tenants";
import LandlordInvoices from "./Invoices";
import LandlordMeters from "./Meters";
import LandlordMessages from "./Messages";
import LandlordArchive from "./Archive";
import { 
  Building, 
  CreditCard, 
  Gauge, 
  MessageSquare, 
  Activity, 
  UserCheck, 
  User,
  Clock, 
  Sparkles, 
  ArrowRight,
  CheckCircle,
  XCircle,
  X,
  Calendar,
  History
} from "lucide-react";

export default function LandlordDashboard({ activeUser }) {
  const [activeTab, setActiveTab] = useState("pulpit");
  const [stats, setStats] = useState({
    totalProps: 0,
    vacantProps: 0,
    activeLeases: 0,
    unpaidRevenue: 0,
    pendingMeters: 0
  });

  const [showAdminFeesModal, setShowAdminFeesModal] = useState(false);
  const [adminFeesMonth, setAdminFeesMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [adminFeesValues, setAdminFeesValues] = useState({});
  const [occupiedProperties, setOccupiedProperties] = useState([]);
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  // Landlord Profile States
  const [profileName, setProfileName] = useState(activeUser.name || "");
  const [profilePhone, setProfilePhone] = useState(activeUser.phone || "");
  const [profileEmail, setProfileEmail] = useState(activeUser.email || "");

  // Sync profile states with activeUser changes
  useEffect(() => {
    if (activeUser) {
      setProfileName(activeUser.name || "");
      setProfilePhone(activeUser.phone || "");
      setProfileEmail(activeUser.email || "");
    }
  }, [activeUser]);

  const handleUpdateProfileSubmit = (e) => {
    e.preventDefault();
    try {
      updateUserProfile(activeUser.id, {
        name: profileName.trim(),
        phone: profilePhone.trim(),
        email: profileEmail.trim()
      });
      setSuccessToast("Profil zarządcy został zaktualizowany!");
      setTimeout(() => setSuccessToast(""), 3000);
    } catch (err) {
      setErrorToast("Błąd aktualizacji profilu: " + err.message);
      setTimeout(() => setErrorToast(""), 3500);
    }
  };

  useEffect(() => {
    if (activeUser) {
      const landlordProperties = getPropertiesByLandlord(activeUser.id);
      const vacant = landlordProperties.filter(p => !p.tenant_id).length;
      const occupied = landlordProperties.filter(p => p.tenant_id).length;

      const invoices = getInvoices();
      const unpaidSum = invoices
        .filter(i => i.landlord_id === activeUser.id && i.status !== "paid")
        .reduce((sum, current) => sum + current.amount, 0);

      const pendingMetersCount = getMeters()
        .filter(m => m.status === "pending_approval").length;

      setStats({
        totalProps: landlordProperties.length,
        vacantProps: vacant,
        activeLeases: occupied,
        unpaidRevenue: unpaidSum,
        pendingMeters: pendingMetersCount
      });
    }
  }, [activeUser, activeTab]);

  const handleOpenAdminFeesModal = () => {
    const props = getPropertiesByLandlord(activeUser.id).filter(p => p.tenant_id !== null);
    setOccupiedProperties(props);

    // Load existing fees
    const existingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
    const initialValues = {};
    props.forEach(p => {
      const feeObj = existingFees[p.id];
      if (feeObj && feeObj.month === adminFeesMonth) {
        initialValues[p.id] = feeObj.amount;
      } else {
        initialValues[p.id] = "";
      }
    });
    setAdminFeesValues(initialValues);
    setShowAdminFeesModal(true);
  };

  // Reload if month changes while modal is open
  useEffect(() => {
    if (showAdminFeesModal) {
      const existingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
      const updatedValues = {};
      occupiedProperties.forEach(p => {
        const feeObj = existingFees[p.id];
        if (feeObj && feeObj.month === adminFeesMonth) {
          updatedValues[p.id] = feeObj.amount;
        } else {
          updatedValues[p.id] = "";
        }
      });
      setAdminFeesValues(updatedValues);
    }
  }, [adminFeesMonth, showAdminFeesModal, occupiedProperties]);

  const handleSaveAdminFees = (e) => {
    e.preventDefault();
    try {
      const existingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
      const updatedFees = { ...existingFees };
      
      Object.keys(adminFeesValues).forEach(propId => {
        const val = adminFeesValues[propId];
        if (val !== "" && Number(val) > 0) {
          updatedFees[propId] = {
            amount: Number(val),
            month: adminFeesMonth
          };
        } else {
          delete updatedFees[propId];
        }
      });

      localStorage.setItem("rentportal_pending_admin_fees", JSON.stringify(updatedFees));
      window.dispatchEvent(new Event("rentportal_admin_fees_updated"));
      
      setShowAdminFeesModal(false);
      setSuccessToast("Opłaty administracyjne zostały pomyślnie zaktualizowane!");
      setTimeout(() => setSuccessToast(""), 3000);
    } catch (err) {
      setErrorToast("Błąd zapisu opłat: " + err.message);
      setTimeout(() => setErrorToast(""), 3500);
    }
  };

  const handleAdminFeeChange = (propId, val) => {
    setAdminFeesValues(prev => ({
      ...prev,
      [propId]: val
    }));
  };

  // Generate month list for dropdown (e.g. 5 months centered around current month)
  const monthsList = (() => {
    const list = [];
    const now = new Date();
    for (let i = -2; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthName = d.toLocaleString("pl-PL", { month: "long", year: "numeric" });
      list.push({ key: monthKey, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) });
    }
    return list;
  })();

  const renderContent = () => {
    switch (activeTab) {
      case "properties":
        return <LandlordProperties landlordId={activeUser.id} />;
      case "tenants":
        return <LandlordTenants landlordId={activeUser.id} />;
      case "invoices":
        return <LandlordInvoices landlordId={activeUser.id} />;
      case "meters":
        return <LandlordMeters landlordId={activeUser.id} />;
      case "messages":
        return <LandlordMessages landlordId={activeUser.id} />;
      case "archive":
        return <LandlordArchive landlordId={activeUser.id} />;
      case "pulpit":
      default:
        return renderDashboardSummary();
    }
  };

  const renderDashboardSummary = () => {
    return (
      <div className="space-y-6">
        
        {/* Top Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1 */}
          <div className="glass p-5 rounded-2xl flex items-center justify-between border-brand-500/10 hover:border-brand-500/25 transition-all">
            <div className="space-y-1">
              <span className="text-xxs text-dark-500 block font-bold uppercase tracking-wider">Moje lokale</span>
              <span className="text-2xl font-black text-white tracking-tight">{stats.totalProps}</span>
              <span className="text-[10px] text-brand-300 block">Zarządzane jednostki</span>
            </div>
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
              <Building className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass p-5 rounded-2xl flex items-center justify-between border-brand-500/10 hover:border-brand-500/25 transition-all">
            <div className="space-y-1">
              <span className="text-xxs text-dark-500 block font-bold uppercase tracking-wider">Aktywne umowy</span>
              <span className="text-2xl font-black text-white tracking-tight">{stats.activeLeases}</span>
              <span className="text-[10px] text-green-400 block font-semibold">{stats.vacantProps} lokali wolnych</span>
            </div>
            <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass p-5 rounded-2xl flex items-center justify-between border-brand-500/10 hover:border-brand-500/25 transition-all">
            <div className="space-y-1">
              <span className="text-xxs text-dark-500 block font-bold uppercase tracking-wider">Należności (Zaległości)</span>
              <span className="text-2xl font-black text-red-400 tracking-tight">
                {stats.unpaidRevenue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
              </span>
              <span className="text-[10px] text-red-400/80 block">Oczekujące na wpłatę</span>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass p-5 rounded-2xl flex items-center justify-between border-brand-500/10 hover:border-brand-500/25 transition-all">
            <div className="space-y-1">
              <span className="text-xxs text-dark-500 block font-bold uppercase tracking-wider">Liczniki lokatorów</span>
              <span className="text-2xl font-black text-yellow-400 tracking-tight">{stats.pendingMeters}</span>
              <span className="text-[10px] text-yellow-400/80 block">Oczekuje na akceptację</span>
            </div>
            <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-xl">
              <Gauge className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Horizontal Timeline Panel */}
        {(() => {
          const landlordProperties = getPropertiesByLandlord(activeUser.id);
          if (landlordProperties.length === 0) return null;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayMs = today.getTime();
          const yearMs = 365.25 * 24 * 60 * 60 * 1000;

          // Generate next 12 months starting from today
          const timelineMonths = [];
          for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            timelineMonths.push(d);
          }

          const ticks = timelineMonths.map((m, idx) => {
            const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
            let pct = ((mStart.getTime() - todayMs) / yearMs) * 100;
            if (idx === 0) pct = 0;
            return {
              label: m.toLocaleString("pl-PL", { month: "short" }).toUpperCase(),
              pct: Math.max(0, Math.min(100, pct))
            };
          });

          return (
            <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4">
              <h3 className="text-base font-bold text-white font-sans flex items-center justify-between border-b border-dark-800 pb-3">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-400" />
                  Harmonogram Najmu (Timeline 12 miesięcy)
                </span>
                <span className="text-[10px] text-dark-400 font-medium">
                  Dziś: <strong className="text-brand-400">{today.toLocaleDateString("pl-PL")}</strong>
                </span>
              </h3>

              <div className="overflow-x-auto">
                <div className="min-w-[700px] pb-2 space-y-2 relative font-sans">
                  
                  {/* Timeline Header - Month Labels */}
                  <div className="flex select-none h-6 mb-1 relative">
                    <div className="w-36 shrink-0" />
                    <div className="flex-1 relative">
                      {ticks.map((tick, i) => (
                        <span 
                          key={i} 
                          className="absolute text-[9px] text-dark-500 font-bold uppercase tracking-wider -translate-x-1/2"
                          style={{ left: `${tick.pct}%` }}
                        >
                          {tick.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Property Rows */}
                  <div className="space-y-2.5">
                    {landlordProperties.map((p) => {
                      const lStart = p.leaseStart ? new Date(p.leaseStart) : null;
                      let lEnd = p.leaseEnd ? new Date(p.leaseEnd) : null;
                      if (p.earlyTermination && p.earlyTermination.terminationDate) {
                        lEnd = new Date(p.earlyTermination.terminationDate);
                      }

                      const tenant = p.tenant_id ? getUserById(p.tenant_id) : null;
                      const hasLease = lStart && lEnd && p.tenant_id && lEnd >= today;

                      let startPct = 0;
                      let endPct = 0;
                      let widthPct = 0;

                      if (hasLease) {
                        const startMs = lStart.getTime();
                        const endMs = lEnd.getTime();
                        
                        startPct = ((startMs - todayMs) / yearMs) * 100;
                        endPct = ((endMs - todayMs) / yearMs) * 100;

                        startPct = Math.max(0, Math.min(100, startPct));
                        endPct = Math.max(0, Math.min(100, endPct));
                        widthPct = endPct - startPct;
                      }

                      return (
                        <div key={p.id} className="flex items-center">
                          {/* Property Label */}
                          <div className="w-36 shrink-0 pr-4 text-xxs font-bold text-white truncate" title={p.title}>
                            🏠 {p.title.split(",")[0]}
                          </div>

                          {/* Track */}
                          <div className="flex-1 h-7 bg-dark-950/40 rounded-xl border border-dark-800/80 relative overflow-hidden">
                            {/* Vertical ticks */}
                            {ticks.map((tick, i) => (
                              <div 
                                key={i} 
                                className="absolute top-0 bottom-0 border-l border-dark-800/40 pointer-events-none" 
                                style={{ left: `${tick.pct}%` }}
                              />
                            ))}

                            {/* Active Lease Bar */}
                            {hasLease && widthPct > 0 && (
                              <div 
                                className="absolute top-1 bottom-1 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 border border-blue-400/20 rounded-lg flex items-center px-2.5 shadow-lg shadow-blue-500/10 cursor-pointer group transition-all"
                                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                              >
                                <span className="text-[9px] font-bold text-white truncate max-w-full leading-none flex items-center gap-1 font-sans">
                                  👤 {tenant ? tenant.name : "Najemca"}
                                </span>

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-52 hidden group-hover:block bg-dark-950 border border-dark-800 rounded-xl p-3 text-[10px] text-dark-200 shadow-2xl z-30 space-y-1.5 font-sans text-left leading-normal">
                                  <div className="font-bold text-white border-b border-dark-800 pb-1.5 flex items-center justify-between">
                                    <span className="truncate pr-2">{p.title.split(",")[0]}</span>
                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase font-black tracking-wider shrink-0">Najem</span>
                                  </div>
                                  <div className="pt-0.5">
                                    <span className="text-dark-500 block text-[9px] uppercase tracking-wider font-bold">Lokator:</span>
                                    <strong className="text-white text-xs">{tenant ? tenant.name : "Nieznany"}</strong>
                                  </div>
                                  <div>
                                    <span className="text-dark-500 block text-[9px] uppercase tracking-wider font-bold">Okres kontraktu:</span>
                                    <strong className="text-white">{p.leaseStart} - {p.leaseEnd}</strong>
                                  </div>
                                  {p.earlyTermination && (
                                    <div className="text-amber-400 font-semibold border-t border-dark-800/60 pt-1.5 mt-1 text-[9px]">
                                      ⚠️ Rozwiązano przed czasem: <strong className="text-amber-300 block">{p.earlyTermination.terminationDate}</strong>
                                    </div>
                                  )}
                                  <div className="border-t border-dark-800/60 pt-1.5 mt-1 text-[9px] text-dark-400">
                                    Czynsz: <strong className="text-white font-mono">{p.rentAmount} PLN</strong>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Vacant track description if empty */}
                            {(!hasLease || widthPct === 0) && (
                              <div className="absolute inset-0 border border-dashed border-dark-850/40 bg-dark-950/5 flex items-center px-3 justify-center pointer-events-none">
                                <span className="text-[8px] text-dark-500 font-bold uppercase tracking-widest">📭 Wolny lokal</span>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>
          );
        })()}

        {/* Dashboard grid panel */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Quick actions panel */}
          <div className="glass p-6 rounded-2xl md:col-span-1 space-y-4">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2 border-b border-dark-800 pb-3">
              <Activity className="w-5 h-5 text-brand-400" />
              Szybkie Akcje
            </h3>
            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => setActiveTab("properties")}
                className="w-full py-2.5 px-4 bg-dark-900 hover:bg-dark-800 border border-dark-800 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-between cursor-pointer"
              >
                <span>Dodaj nowe mieszkanie / lokatora</span>
                <ArrowRight className="w-4 h-4 text-brand-400" />
              </button>
              <button 
                onClick={() => setActiveTab("invoices")}
                className="w-full py-2.5 px-4 bg-dark-900 hover:bg-dark-800 border border-dark-800 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-between cursor-pointer"
              >
                <span>Wystaw fakturę / rozlicz media</span>
                <ArrowRight className="w-4 h-4 text-brand-400" />
              </button>
              <button 
                onClick={() => setActiveTab("meters")}
                className="w-full py-2.5 px-4 bg-dark-900 hover:bg-dark-800 border border-dark-800 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-between cursor-pointer"
              >
                <span>Sprawdź liczniki ({stats.pendingMeters} nowe)</span>
                <ArrowRight className="w-4 h-4 text-yellow-400 animate-pulse" />
              </button>
              <button 
                onClick={handleOpenAdminFeesModal}
                className="w-full py-2.5 px-4 bg-brand-950/20 hover:bg-brand-900/30 border border-brand-500/20 hover:border-brand-500/40 rounded-xl text-xs font-semibold text-brand-300 transition-all flex items-center justify-between glass-glow-brand cursor-pointer"
              >
                <span className="flex items-center gap-2 font-bold">
                  🏢 Opłaty administracyjne
                </span>
                <ArrowRight className="w-4 h-4 text-brand-400" />
              </button>
            </div>
          </div>

          {/* Overview summary */}
          <div className="glass p-6 rounded-2xl md:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2 border-b border-dark-800 pb-3">
              <Sparkles className="w-5 h-5 text-brand-400" />
              Status Wynajmu - Podsumowanie
            </h3>
            
            <div className="space-y-3">
              <div className="p-4 bg-dark-900/60 rounded-xl border border-dark-800 flex items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <span className="font-semibold text-white">Przegląd lokali mieszkalnych</span>
                  <p className="text-xxs text-dark-500">
                    Posiadasz {stats.vacantProps} niezagospodarowane lokale mieszkalne na {stats.totalProps}.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("properties")}
                  className="text-xs font-bold text-brand-400 hover:underline"
                >
                  Zarządzaj &rarr;
                </button>
              </div>

              <div className="p-4 bg-dark-900/60 rounded-xl border border-dark-800 flex items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <span className="font-semibold text-white">Należności lokatorskie</span>
                  <p className="text-xxs text-dark-500">
                    W systemie oczekują faktury o łącznej wartości {stats.unpaidRevenue} PLN.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("invoices")}
                  className="text-xs font-bold text-brand-400 hover:underline"
                >
                  Księgowanie &rarr;
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Zarządca Profile Editing Form */}
        <div className="glass p-6 rounded-2xl border-brand-500/10 relative overflow-hidden space-y-4">
          <div className="absolute right-4 top-4 text-brand-500/10 pointer-events-none">
            <User className="w-24 h-24 stroke-[1.5]" />
          </div>
          
          <h3 className="text-base font-bold text-white font-sans flex items-center gap-2 border-b border-dark-800 pb-3">
            <User className="w-5 h-5 text-brand-400" />
            Profil Zarządcy (Moje Dane Kontaktowe)
          </h3>
          
          <p className="text-xxs text-dark-400 max-w-2xl leading-relaxed">
            Wprowadź lub zmodyfikuj poniżej swoje dane kontaktowe. Zostaną one automatycznie udostępnione Twoim lokatorom na ich pulpitach mobilnych (sekcja „Informacje o Właścicielu”), co umożliwi im bezpośredni i poprawny kontakt telefoniczny oraz mailowy.
          </p>

          <form onSubmit={handleUpdateProfileSubmit} className="grid gap-4 sm:grid-cols-3 max-w-4xl text-xs pt-2">
            <div>
              <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Imię i Nazwisko *</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Numer Telefonu</label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder="np. +48 501 234 567"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Adres E-mail *</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                className="py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-lg w-fit"
              >
                Zapisz Profil Zarządcy
              </button>
            </div>
          </form>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce">
            <CheckCircle className="w-3.5 h-3.5" />
            {successToast}
          </div>
        )}

        {/* Error Toast */}
        {errorToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce">
            <XCircle className="w-3.5 h-3.5" />
            {errorToast}
          </div>
        )}

        {/* Admin Fees Quick Modal */}
        {showAdminFeesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
            <div className="glass max-w-xl w-full p-6 rounded-2xl border-brand-500/20 space-y-4 shadow-2xl relative text-left">
              <button 
                type="button"
                onClick={() => setShowAdminFeesModal(false)}
                className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-dark-800 pb-3 text-brand-400">
                <Building className="w-5 h-5 text-brand-400" />
                Szybkie Wprowadzanie Opłat Administracyjnych
              </h3>

              <p className="text-xxs text-dark-400">
                Wpisz aktualne opłaty administracyjne (czynsz spółdzielczy) od administratora. Wartości te zostaną automatycznie dopasowane i wczytane w dziale Finanse przy wystawianiu rachunku lokatorowi na wybrany miesiąc.
              </p>

              <form onSubmit={handleSaveAdminFees} className="space-y-4 text-xs">
                {/* Month Select Dropdown */}
                <div className="bg-dark-900/40 p-3 rounded-xl border border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xxs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-400" />
                    Miesiąc, którego dotyczy wpis:
                  </span>
                  <select
                    value={adminFeesMonth}
                    onChange={(e) => setAdminFeesMonth(e.target.value)}
                    className="bg-dark-950 border border-dark-800 rounded-lg px-3 py-1.5 text-white text-xs font-semibold focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    {monthsList.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Occupied Properties List */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {occupiedProperties.length === 0 ? (
                    <p className="text-center text-dark-500 py-6 italic">
                      Brak aktywnych lokatorów w systemie. Najpierw przypisz lokatora do mieszkania.
                    </p>
                  ) : (
                    occupiedProperties.map(p => {
                      const tenant = getUserById(p.tenant_id);
                      const currentVal = adminFeesValues[p.id] || "";
                      return (
                        <div key={p.id} className="p-3.5 bg-dark-900/40 rounded-xl border border-dark-800 flex items-center justify-between gap-4 hover:border-dark-700 transition-colors">
                          <div className="space-y-1">
                            <div className="font-semibold text-white text-xs leading-tight">
                              {p.title.split(",")[0]}
                            </div>
                            <div className="text-[10px] text-dark-500 flex items-center gap-1 font-sans">
                              <span>Najemca:</span>
                              <strong className="text-brand-300">{tenant ? tenant.name : "Nieznany"}</strong>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="np. 350"
                              value={currentVal}
                              onChange={(e) => handleAdminFeeChange(p.id, e.target.value)}
                              className="w-24 bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono font-bold text-right focus:border-brand-500 focus:outline-none font-bold"
                            />
                            <span className="text-[10px] font-bold text-dark-500 uppercase">PLN</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => setShowAdminFeesModal(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={occupiedProperties.length === 0}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-dark-900 disabled:text-dark-500 disabled:border-dark-850 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Zapisz opłaty
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Desktop Dashboard Navigation bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-dark-900/60 p-4 rounded-2xl border border-dark-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-600 text-white rounded-xl shadow-lg">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-sans tracking-tight">RentPortal</h1>
            <p className="text-xxs text-dark-400 font-medium">Panel Zarządczy Właściciela ({activeUser.name})</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("pulpit")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "pulpit" ? "bg-brand-600 text-white shadow-md" : "text-dark-300 hover:bg-dark-800 hover:text-white"
            }`}
          >
            Pulpit
          </button>
          <button
            onClick={() => setActiveTab("properties")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "properties" ? "bg-brand-600 text-white shadow-md" : "text-dark-300 hover:bg-dark-800 hover:text-white"
            }`}
          >
            Mieszkania
          </button>
          <button
            onClick={() => setActiveTab("tenants")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "tenants" ? "bg-brand-600 text-white shadow-md" : "text-dark-300 hover:bg-dark-800 hover:text-white"
            }`}
          >
            Lokatorzy
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "invoices" ? "bg-brand-600 text-white shadow-md" : "text-dark-300 hover:bg-dark-800 hover:text-white"
            }`}
          >
            Finanse
          </button>
          <button
            onClick={() => setActiveTab("meters")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "meters" ? "bg-brand-600 text-white shadow-md" : "text-dark-300 hover:bg-dark-800 hover:text-white"
            }`}
          >
            Liczniki
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "messages" ? "bg-brand-600 text-white shadow-md" : "text-dark-300 hover:bg-dark-800 hover:text-white"
            }`}
          >
            Wiadomości
          </button>
          <button
            onClick={() => setActiveTab("archive")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "archive" ? "bg-brand-600 text-white shadow-md" : "text-dark-300 hover:bg-dark-800 hover:text-white"
            }`}
          >
            Archiwum
          </button>
        </nav>
      </div>

      <main className="transition-all duration-300">
        {renderContent()}
      </main>

    </div>
  );
}
