import React, { useState, useEffect, useMemo } from "react";
import { 
  getUsers, 
  addTenant, 
  updateUserProfile, 
  getProperties,
  archiveTenant,
  addTenantNote,
  deleteTenantNote,
  updateTenantSummary,
  getInvoicesForTenant,
  getPropertyById
} from "../../utils/storage";
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle, 
  X, 
  Sparkles, 
  Building, 
  UserPlus, 
  Info,
  MapPin,
  UserCheck,
  Clock
} from "lucide-react";

export default function LandlordTenants({ landlordId }) {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTenantId, setExpandedTenantId] = useState(null);
  
  // Forms & Dialog Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Input states for Add/Edit
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantIdCard, setTenantIdCard] = useState("");
  const [tenantAddress, setTenantAddress] = useState("");
  
  // Roommate inputs
  const [roommateName, setRoommateName] = useState("");
  const [roommateEmail, setRoommateEmail] = useState("");
  const [roommatePhone, setRoommatePhone] = useState("");
  const [roommateIdCard, setRoommateIdCard] = useState("");

  // Load and subscribe to database updates
  const loadData = () => {
    // Get active tenants (exclude archived)
    const allUsers = getUsers();
    setTenants(allUsers.filter(u => u.role === "tenant" && !u.isArchived));
    setProperties(getProperties());
  };

  useEffect(() => {
    loadData();
    
    // Multi-event database sync
    window.addEventListener("rentportal_users_updated", loadData);
    window.addEventListener("rentportal_properties_updated", loadData);
    
    return () => {
      window.removeEventListener("rentportal_users_updated", loadData);
      window.removeEventListener("rentportal_properties_updated", loadData);
    };
  }, []);

  const resetFormFields = () => {
    setTenantName("");
    setTenantEmail("");
    setTenantPhone("");
    setTenantIdCard("");
    setTenantAddress("");
    setRoommateName("");
    setRoommateEmail("");
    setRoommatePhone("");
    setRoommateIdCard("");
    setErrorMsg("");
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!tenantName.trim()) {
      setErrorMsg("Imię i nazwisko lokatora jest wymagane.");
      return;
    }
    if (!tenantEmail.trim()) {
      setErrorMsg("Adres e-mail jest wymagany.");
      return;
    }
    if (!tenantPhone.trim()) {
      setErrorMsg("Numer telefonu jest wymagany.");
      return;
    }

    try {
      const email = tenantEmail.trim().toLowerCase();
      const existing = getUsers().find(u => u.email.toLowerCase() === email);
      if (existing) {
        setErrorMsg("Użytkownik z tym adresem e-mail już istnieje w systemie.");
        return;
      }

      addTenant({
        name: tenantName.trim(),
        email: tenantEmail.trim(),
        phone: tenantPhone.trim(),
        idCard: tenantIdCard.trim(),
        address: tenantAddress.trim(),
        roommate: roommateName.trim() ? {
          name: roommateName.trim(),
          email: roommateEmail.trim(),
          phone: roommatePhone.trim(),
          idCard: roommateIdCard.trim()
        } : null
      });

      setSuccessMsg(`Dodano lokatora ${tenantName.trim()} do bazy!`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setShowAddModal(false);
      resetFormFields();
      window.dispatchEvent(new Event("rentportal_users_updated"));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenEditModal = (t) => {
    setEditingTenant(t);
    setTenantName(t.name || "");
    setTenantEmail(t.email || "");
    setTenantPhone(t.phone || "");
    setTenantIdCard(t.idCard || "");
    setTenantAddress(t.address || "");
    
    if (t.roommate) {
      setRoommateName(t.roommate.name || "");
      setRoommateEmail(t.roommate.email || "");
      setRoommatePhone(t.roommate.phone || "");
      setRoommateIdCard(t.roommate.idCard || "");
    } else {
      setRoommateName("");
      setRoommateEmail("");
      setRoommatePhone("");
      setRoommateIdCard("");
    }
    
    setErrorMsg("");
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!tenantName.trim()) {
      setErrorMsg("Imię i nazwisko lokatora jest wymagane.");
      return;
    }
    if (!tenantEmail.trim()) {
      setErrorMsg("Adres e-mail jest wymagany.");
      return;
    }

    try {
      const email = tenantEmail.trim().toLowerCase();
      // Ensure email duplicate check ignores the currently edited user
      const duplicate = getUsers().find(u => u.email.toLowerCase() === email && u.id !== editingTenant.id);
      if (duplicate) {
        setErrorMsg("Inny użytkownik w systemie posiada już ten adres e-mail.");
        return;
      }

      updateUserProfile(editingTenant.id, {
        name: tenantName.trim(),
        email: tenantEmail.trim(),
        phone: tenantPhone.trim(),
        idCard: tenantIdCard.trim(),
        address: tenantAddress.trim(),
        roommate: roommateName.trim() ? {
          name: roommateName.trim(),
          email: roommateEmail.trim(),
          phone: roommatePhone.trim(),
          idCard: roommateIdCard.trim()
        } : null
      });

      setSuccessMsg(`Zaktualizowano profil lokatora ${tenantName.trim()}!`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setShowEditModal(false);
      resetFormFields();
      setEditingTenant(null);
      window.dispatchEvent(new Event("rentportal_users_updated"));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleArchiveClick = (t) => {
    const isAssigned = t.property_id;
    const propertyTitle = isAssigned ? (properties.find(p => p.id === t.property_id)?.title.split(",")[0] || "mieszkania") : "";
    
    let confirmMsg = `Czy na pewno chcesz usunąć i zarchiwizować lokatora ${t.name}?`;
    if (isAssigned) {
      confirmMsg = `⚠️ UWAGA: Lokator ${t.name} ma aktywną umowę wynajmu dla lokalu: "${propertyTitle}". Usunięcie przeniesie go do Archiwum, zwalniając to mieszkanie w systemie i rejestrując historię kontraktu. Czy na pewno chcesz kontynuować?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isAssigned) {
        // Safe database soft-delete transaction that updates both tenant and property
        archiveTenant(t.property_id);
      } else {
        // Just mark as archived if not assigned to any property
        updateUserProfile(t.id, { isArchived: true });
      }
      setSuccessMsg(`Pomyślnie zarchiwizowano lokatora ${t.name}!`);
      setTimeout(() => setSuccessMsg(""), 3000);
      window.dispatchEvent(new Event("rentportal_users_updated"));
      window.dispatchEvent(new Event("rentportal_properties_updated"));
    } catch (err) {
      alert("Błąd archiwizacji lokatora: " + err.message);
    }
  };

  // Live real-time filter logic
  const filteredTenants = tenants.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    const nameMatch = (t.name || "").toLowerCase().includes(q);
    const emailMatch = (t.email || "").toLowerCase().includes(q);
    const phoneMatch = (t.phone || "").toLowerCase().includes(q);
    const roommateMatch = t.roommate && (t.roommate.name || "").toLowerCase().includes(q);
    
    return nameMatch || emailMatch || phoneMatch || roommateMatch;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            Baza Lokatorów i Najemców
          </h2>
          <p className="text-dark-400 text-sm mt-1">Zarządzaj profilami najemców, danymi kontaktowymi oraz współlokatorami.</p>
        </div>

        <button
          onClick={() => {
            resetFormFields();
            setShowAddModal(true);
          }}
          className="py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 glass-glow-brand cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Dodaj Lokatora do Bazy
        </button>
      </div>

      {/* Toast Alert */}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-3 text-xs flex items-start gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass p-4 rounded-xl border-brand-500/10 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Szukaj lokatora po imieniu, telefonie, współlokatorze..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-900 border border-dark-800 hover:border-dark-700 focus:border-brand-500 text-white rounded-xl pl-10 pr-4 py-2 text-xs transition-colors focus:outline-none"
          />
        </div>
        <span className="text-xxs text-dark-400 font-mono self-end md:self-auto shrink-0">
          Wykaz: {filteredTenants.length} z {tenants.length} lokatorów
        </span>
      </div>

      {/* Tenants Grid list */}
      {filteredTenants.length === 0 ? (
        <div className="glass p-12 text-center rounded-2xl border-brand-500/5">
          <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-300 text-sm font-semibold">
            {tenants.length === 0 ? "Brak zarejestrowanych lokatorów w systemie." : "Brak lokatorów spełniających kryteria wyszukiwania."}
          </p>
          <p className="text-dark-500 text-xs mt-1">Użyj przycisku w prawym górnym rogu, aby utworzyć nowy profil.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map(t => {
            const property = properties.find(p => p.id === t.property_id);
            return (
              <div 
                key={t.id} 
                className={`glass p-5 rounded-2xl flex flex-col justify-between hover:border-brand-500/20 transition-all duration-300 relative overflow-hidden group shadow-xl ${t.isArchived ? "opacity-75 bg-dark-950/20" : ""}`}
              >
                {/* Visual glow element on hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors pointer-events-none" />

                <div className="space-y-4">
                  {/* Top card header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-dark-900 border border-dark-800 text-brand-400 rounded-xl">
                        <Users className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-sm tracking-tight">{t.name}</h3>
                        <span className="text-[9px] text-dark-500 font-mono uppercase block mt-0.5">ID: {t.id}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="p-1.5 bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-brand-500/40 text-brand-400 hover:text-brand-300 rounded-lg transition-colors cursor-pointer"
                        title="Edytuj profil"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchiveClick(t)}
                        className="p-1.5 bg-dark-900 hover:bg-red-500/10 border border-dark-800 hover:border-red-500/30 text-dark-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Zarchiwizuj / Usuń lokatora"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rent status badge */}
                  <div className="pt-1">
                    {property ? (
                      <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        <UserCheck className="w-3.5 h-3.5 text-green-400" />
                        🏠 Wynajmuje: {property.title.split(",")[0]}
                      </div>
                    ) : t.isArchived ? (
                      <div className="inline-flex items-center gap-1 bg-dark-900 border border-dark-800 text-dark-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        <Info className="w-3.5 h-3.5 text-dark-500" />
                        📁 Archiwalny (Nieaktywny)
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        <Info className="w-3.5 h-3.5 text-yellow-400" />
                        📭 Brak aktywnego najmu
                      </div>
                    )}
                  </div>

                  {/* Core tenant contact details */}
                  <div className="space-y-2 text-xxs text-dark-350 border-t border-dark-850 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-dark-500 shrink-0" />
                      <span className="truncate text-dark-300">{t.email}</span>
                    </div>
                    {t.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-dark-500 shrink-0" />
                        <span className="text-dark-300 font-medium">{t.phone}</span>
                      </div>
                    )}
                    {t.idCard && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-dark-500 shrink-0" />
                        <span>Dowód osobisty: <strong className="text-white">{t.idCard}</strong></span>
                      </div>
                    )}
                    {t.address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-dark-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">Adres: <strong className="text-white">{t.address}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Optional roommate sub-card */}
                  {t.roommate && t.roommate.name && (
                    <div className="bg-dark-950/40 p-2.5 rounded-xl border border-dark-850/80 text-[10px] space-y-1 mt-1 font-sans">
                      <span className="text-brand-300 font-bold uppercase text-[9px] tracking-wider block mb-1">
                        👥 Dane Współlokatora
                      </span>
                      <div className="text-white font-semibold">{t.roommate.name}</div>
                      {t.roommate.phone && <div className="text-dark-400">Tel: <strong className="text-dark-300">{t.roommate.phone}</strong></div>}
                      {t.roommate.email && <div className="text-dark-400 truncate">Email: <strong className="text-dark-300" title={t.roommate.email}>{t.roommate.email}</strong></div>}
                      {t.roommate.idCard && <div className="text-dark-400">Dowód: <strong className="text-dark-300">{t.roommate.idCard}</strong></div>}
                    </div>
                  )}
                </div>

                {/* Bottom link helper */}
                {!property && !t.isArchived && (
                  <div className="mt-4 pt-3 border-t border-dark-850 text-xxs text-dark-500 italic text-center">
                    Lokatora przypiszesz w zakładce "Mieszkania"
                  </div>
                )}

                {/* Expandable CRM Section for Notes and Summary */}
                <div className="mt-4 border-t border-dark-850 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedTenantId(expandedTenantId === t.id ? null : t.id)}
                    className="w-full py-1.5 px-3 bg-brand-950/20 hover:bg-brand-900/30 border border-brand-500/20 hover:border-brand-500/40 text-brand-350 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{expandedTenantId === t.id ? "📂 Ukryj Notatki i Podsumowanie" : "📁 Pokaż Notatki i Podsumowanie"}</span>
                  </button>

                  {expandedTenantId === t.id && (
                    <div className="mt-3 pt-3 border-t border-dark-850 space-y-4 animate-fade-in text-left">
                      <TenantNotesSection tenant={t} />
                      <TenantFinalSummarySection tenant={t} />
                      <TenantHistoryTimelineSection tenant={t} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD LOKATOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-3xl w-full p-6 rounded-2xl border-brand-500/20 space-y-6 shadow-2xl relative text-left">
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="border-b border-dark-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-400" />
                Rejestracja Nowego Lokatora do Bazy
              </h3>
              <p className="text-xxs text-dark-450 mt-1">Dodaj profil najemcy do głównego repozytorium. Będziesz mógł go wygodnie przydzielić do dowolnego wolnego lokalu.</p>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-5 text-xs">
              <div className="grid gap-5 sm:grid-cols-2">
                
                {/* Primary Tenant Details */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-dark-800/40 text-brand-300">Dane Podstawowe Lokatora</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Imię i Nazwisko *</label>
                      <input 
                        type="text" required placeholder="np. Jan Kowalski"
                        value={tenantName} onChange={(e) => setTenantName(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Adres E-mail *</label>
                      <input 
                        type="email" required placeholder="np. jan@lokator.pl"
                        value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Telefon *</label>
                        <input 
                          type="text" required placeholder="+48 600..."
                          value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Dowód Osobisty</label>
                        <input 
                          type="text" placeholder="ABC 123..."
                          value={tenantIdCard} onChange={(e) => setTenantIdCard(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Adres zameldowania / korespondencyjny</label>
                      <input 
                        type="text" placeholder="np. ul. Lipowa 5, 30-001 Kraków"
                        value={tenantAddress} onChange={(e) => setTenantAddress(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Roommate Details */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-dark-800/40 text-brand-300">Dane Współlokatora (Opcjonalnie)</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Imię i nazwisko współlokatora</label>
                      <input 
                        type="text" placeholder="np. Maria Kowalska"
                        value={roommateName} onChange={(e) => setRoommateName(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">E-mail współlokatora</label>
                      <input 
                        type="email" placeholder="np. maria@wspollokator.pl"
                        value={roommateEmail} onChange={(e) => setRoommateEmail(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Telefon współlokatora</label>
                        <input 
                          type="text" placeholder="+48 600..."
                          value={roommatePhone} onChange={(e) => setRoommatePhone(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Dowód osobisty współlokatora</label>
                        <input 
                          type="text" placeholder="XYZ 987..."
                          value={roommateIdCard} onChange={(e) => setRoommateIdCard(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand"
                >
                  Utwórz profil lokatora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LOKATOR MODAL */}
      {showEditModal && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-3xl w-full p-6 rounded-2xl border-brand-500/20 space-y-6 shadow-2xl relative text-left">
            <button 
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingTenant(null);
              }}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="border-b border-dark-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-brand-400" />
                Modyfikacja Profilu Lokatora: {editingTenant.name}
              </h3>
              <p className="text-xxs text-dark-450 mt-1">Zaktualizuj dane kontaktowe, adres zameldowania lub informacje o współlokatorze.</p>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-5 text-xs">
              <div className="grid gap-5 sm:grid-cols-2">
                
                {/* Primary Tenant Details */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-dark-800/40 text-brand-300">Dane Podstawowe Lokatora</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Imię i Nazwisko *</label>
                      <input 
                        type="text" required placeholder="np. Jan Kowalski"
                        value={tenantName} onChange={(e) => setTenantName(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Adres E-mail *</label>
                      <input 
                        type="email" required placeholder="np. jan@lokator.pl"
                        value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Telefon *</label>
                        <input 
                          type="text" required placeholder="+48 600..."
                          value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Dowód Osobisty</label>
                        <input 
                          type="text" placeholder="ABC 123..."
                          value={tenantIdCard} onChange={(e) => setTenantIdCard(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Adres zameldowania / korespondencyjny</label>
                      <input 
                        type="text" placeholder="np. ul. Lipowa 5, 30-001 Kraków"
                        value={tenantAddress} onChange={(e) => setTenantAddress(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Roommate Details */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-dark-800/40 text-brand-300">Dane Współlokatora (Opcjonalnie)</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Imię i nazwisko współlokatora</label>
                      <input 
                        type="text" placeholder="np. Maria Kowalska"
                        value={roommateName} onChange={(e) => setRoommateName(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">E-mail współlokatora</label>
                      <input 
                        type="email" placeholder="np. maria@wspollokator.pl"
                        value={roommateEmail} onChange={(e) => setRoommateEmail(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Telefon współlokatora</label>
                        <input 
                          type="text" placeholder="+48 600..."
                          value={roommatePhone} onChange={(e) => setRoommatePhone(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Dowód osobisty współlokatora</label>
                        <input 
                          type="text" placeholder="XYZ 987..."
                          value={roommateIdCard} onChange={(e) => setRoommateIdCard(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTenant(null);
                  }}
                  className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand"
                >
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function generateDraftSummary(tenant) {
  const notesCount = (tenant.notes || []).length;
  const noteTopics = (tenant.notes || []).map(n => `"${n.title}"`).join(", ");
  
  const invoices = getInvoicesForTenant(tenant.id) || [];
  const totalInvoices = invoices.length;
  
  let timelinessText = "Brak zarejestrowanej historii płatności.";
  if (totalInvoices > 0) {
    const latePayments = invoices.filter(i => {
      if (i.status !== "paid" || !i.paymentDate || !i.dueDate) return false;
      return new Date(i.paymentDate) > new Date(i.dueDate);
    }).length;
    
    if (latePayments === 0) {
      timelinessText = "Płatności były regulowane w 100% terminowo i rzetelnie.";
    } else {
      timelinessText = `Regulowanie opłat z opóźnieniami (${latePayments} opóźnionych płatności na ${totalInvoices} faktur).`;
    }
  }

  let notesText = "Brak odnotowanych uwag lub incydentów w rejestrze notatek.";
  if (notesCount > 0) {
    notesText = `W trakcie najmu sporządzono ${notesCount} notatek (dotyczących m.in.: ${noteTopics}).\n`;
    const contentSummaries = (tenant.notes || []).map(n => `- ${n.title}: ${n.content.slice(0, 80)}${n.content.length > 80 ? '...' : ''}`).join("\n");
    notesText += `Szczegóły zdarzeń:\n${contentSummaries}`;
  }

  return `PODSUMOWANIE LOKATORA: ${tenant.name.toUpperCase()}

1. RZETELNOŚĆ I TERMINOWOŚĆ FINANSOWA:
${timelinessText}

2. ZACHOWANIE I RELACJE (NA PODSTAWIE NOTATEK):
${notesText}

3. SPOSÓB ROZWIĄZYWANIA KONFLIKTÓW I CECHY OSOBISTE:
Lokator w komunikacji jest... [opisz np. ugodowy / wymagający / bezkonfliktowy]. Wszelkie usterki zgłaszał...

4. REKOMENDACJA KOŃCOWA:
[Wpisz np. Zdecydowanie polecam tego najemcę kolejnym wynajmującym. / Najemca poprawny, ale wymagał dyscyplinowania płatniczego.]`;
}

function TenantFinalSummarySection({ tenant }) {
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
        <div className="space-y-2 animate-fade-in text-xs">
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

function TenantNotesSection({ tenant }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [localNotes, setLocalNotes] = useState(tenant.notes || []);

  useEffect(() => {
    setLocalNotes(tenant.notes || []);
  }, [tenant.notes]);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!topic.trim() || !content.trim()) return;
    try {
      const newNote = addTenantNote(tenant.id, topic.trim(), content.trim());
      setLocalNotes(prev => [...prev, newNote]);
      setTopic("");
      setContent("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = (noteId) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę notatkę?")) return;
    try {
      deleteTenantNote(tenant.id, noteId);
      setLocalNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotes = localNotes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-dark-500 text-[10px] block font-bold uppercase tracking-wider text-dark-400">
          📝 Rejestr Ustaleń i Notatek
        </span>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-brand-400 hover:text-white text-[9px] font-bold uppercase flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded transition-all cursor-pointer border border-brand-500/20"
        >
          {showAddForm ? "Anuluj" : "+ Dodaj notatkę"}
        </button>
      </div>

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
      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
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
