import React, { useState, useEffect, useMemo } from "react";
import { 
  getUsers, 
  getInvoices, 
  getMeters, 
  addTenantNote, 
  deleteTenantNote, 
  getPropertyById, 
  getUserById,
  getPaymentTimeliness,
  updateTenantSummary,
  getInvoicesForTenant,
  getMessagesBetweenUsers,
  deleteUser
} from "../../utils/storage";
import { 
  History, 
  User, 
  Mail, 
  Phone, 
  Search, 
  Trash2, 
  Clock, 
  ChevronRight, 
  Calendar, 
  Building, 
  Gauge, 
  FileText, 
  CheckCircle,
  CreditCard,
  Plus,
  MessageSquare,
  Download,
  X,
  CheckCheck
} from "lucide-react";

export default function LandlordArchive({ landlordId }) {
  const [archivedTenants, setArchivedTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Note Form States
  const [noteTopic, setNoteTopic] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);

  // Archived Chat States
  const [archiveChatThread, setArchiveChatThread] = useState("Wszystkie");
  const [activeLightbox, setActiveLightbox] = useState(null);

  // Success/Error notifications
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const refreshArchivedList = () => {
    const allUsers = getUsers();
    const archived = allUsers.filter(u => u.role === "tenant" && u.isArchived === true);
    setArchivedTenants(archived);
    if (archived.length > 0 && !selectedTenantId) {
      setSelectedTenantId(archived[0].id);
    }
  };

  useEffect(() => {
    refreshArchivedList();
    
    // Listen for users updates
    const handleUsersUpdate = () => {
      refreshArchivedList();
    };
    window.addEventListener("rentportal_users_updated", handleUsersUpdate);
    return () => {
      window.removeEventListener("rentportal_users_updated", handleUsersUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  // Selected tenant data
  const tenant = archivedTenants.find(t => t.id === selectedTenantId) || null;

  // Filter list of tenants based on search input
  const filteredTenants = archivedTenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Invoices issued to this archived tenant
  const tenantInvoices = useMemo(() => {
    if (!selectedTenantId) return [];
    return getInvoices()
      .filter(i => i.tenant_id === selectedTenantId)
      .sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt));
  }, [selectedTenantId]);

  // Meters reported or registered for past properties rented by this tenant
  const tenantMeters = useMemo(() => {
    if (!tenant) return [];
    // Grab all properties they rented
    const propertiesHistoryIds = (tenant.leaseHistory || []).map(lh => lh.propertyId);
    if (tenant.property_id) propertiesHistoryIds.push(tenant.property_id); // active just in case
    
    return getMeters()
      .filter(m => propertiesHistoryIds.includes(m.property_id))
      .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));
  }, [tenant]);

  // Chat history with this tenant
  const tenantMessages = useMemo(() => {
    if (!tenant) return [];
    return getMessagesBetweenUsers(landlordId, tenant.id);
  }, [tenant, landlordId]);

  const filteredArchiveMessages = useMemo(() => {
    if (archiveChatThread === "Wszystkie") {
      return tenantMessages;
    }
    return tenantMessages.filter(m => m.subject === archiveChatThread);
  }, [tenantMessages, archiveChatThread]);

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

  // Add structured note
  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!tenant || !noteTopic.trim() || !noteContent.trim()) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      addTenantNote(tenant.id, noteTopic.trim(), noteContent.trim());
      setSuccessMsg("Pomyślnie dodano nową notatkę!");
      setNoteTopic("");
      setNoteContent("");
      setShowAddNote(false);
      
      // Force refresh of the active tenant details
      refreshArchivedList();
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Delete structured note
  const handleDeleteNoteClick = (noteId) => {
    if (!tenant || !window.confirm("Czy na pewno chcesz usunąć tę notatkę z historii rozmów?")) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      deleteTenantNote(tenant.id, noteId);
      setSuccessMsg("Notatka została pomyślnie usunięta.");
      refreshArchivedList();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Completely delete user from database
  const handleCompletelyDeleteTenant = (t) => {
    if (!window.confirm(`⚠️ UWAGA: Czy na pewno chcesz TRWALE i CAŁKOWICIE usunąć lokatora ${t.name} z całej aplikacji?\n\nTa operacja usunie go bezpowrotnie z bazy (wraz z jego historią notatek i przypisań) i jest całkowicie nieodwracalna!`)) return;
    try {
      deleteUser(t.id);
      setSuccessMsg(`Pomyślnie usunięto trwale lokatora ${t.name} z systemu!`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setSelectedTenantId(""); // Reset active selected user
    } catch (err) {
      setErrorMsg("Błąd trwałego usuwania: " + err.message);
    }
  };

  // Filter notes for search
  const filteredNotes = useMemo(() => {
    if (!tenant) return [];
    const notes = tenant.notes || [];
    return notes.filter(n => 
      n.title.toLowerCase().includes(noteSearch.toLowerCase()) || 
      n.content.toLowerCase().includes(noteSearch.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tenant, noteSearch]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header and description */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <History className="w-6 h-6 text-brand-400" />
          Archiwum Lokatorów i Historii Najmu
        </h2>
        <p className="text-dark-400 text-sm mt-1">Przeglądaj przebieg najmu, faktury, historyczne opłaty za media i rejestry rozmów byłych najemców.</p>
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-3 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {archivedTenants.length === 0 ? (
        <div className="glass p-8 text-center rounded-2xl border-brand-500/10">
          <History className="w-12 h-12 text-dark-500 mx-auto mb-3 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Archiwum jest puste</h3>
          <p className="text-xxs text-dark-400 mt-1 max-w-md mx-auto leading-relaxed">
            Obecnie nie posiadasz zarchiwizowanych lokatorów. Kiedy zakończysz najem i usuniesz aktywnego lokatora z karty mieszkania, jego pełna historia automatycznie pojawi się w tej zakładce.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* LEFT COLUMN: Search & Tenant selector list */}
          <div className="glass p-5 rounded-2xl md:col-span-1 space-y-4 h-fit">
            <span className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider block">Wyszukaj Archiwum</span>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-dark-500" />
              <input
                type="text"
                placeholder="Szukaj lokatora (imię, email)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none placeholder-dark-500"
              />
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {filteredTenants.length === 0 ? (
                <p className="text-xxs text-dark-500 text-center py-4 italic">Brak pasujących wyników.</p>
              ) : (
                filteredTenants.map(t => {
                  const isSelected = selectedTenantId === t.id;
                  const lastLease = t.leaseHistory && t.leaseHistory.length > 0 
                    ? t.leaseHistory[t.leaseHistory.length - 1] 
                    : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTenantId(t.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                        isSelected 
                          ? "bg-brand-600/10 border-brand-500/40 text-white shadow-lg" 
                          : "bg-dark-900/40 border-dark-800 text-dark-300 hover:bg-dark-900/60 hover:text-white"
                      }`}
                    >
                      <div className="space-y-1 truncate">
                        <div className="font-bold text-xs truncate leading-tight group-hover:text-brand-300 transition-colors">
                          {t.name}
                        </div>
                        <div className="text-[10px] text-dark-500 truncate leading-none">{t.email}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {!t.isArchived && t.property_id && (
                            <span className="text-[8px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                              🟢 Aktywny
                            </span>
                          )}
                          {lastLease && (
                            <span className="text-[8px] text-dark-400 bg-dark-950/50 px-1.5 py-0.5 rounded border border-dark-850">
                              🏠 {lastLease.propertyTitle.split(",")[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-brand-400 translate-x-0.5' : 'text-dark-500'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Reconstructed Tenant Profile details */}
          <div className="md:col-span-2 space-y-6">
            {tenant ? (
              <div className="space-y-6">
                
                {/* Tenant Basic Details Card */}
                <div className="glass p-6 rounded-2xl border-brand-500/10 relative overflow-hidden space-y-4">
                  <div className="absolute right-4 top-4 text-brand-500/10 pointer-events-none">
                    <User className="w-24 h-24 stroke-[1.5]" />
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      {tenant.isArchived ? (
                        <span className="bg-brand-500/10 text-brand-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-brand-500/20">
                          🔒 Zarchiwizowany
                        </span>
                      ) : (
                        <span className="bg-green-500/15 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/20">
                          🟢 Aktywny najem
                        </span>
                      )}
                      {tenant.leaseHistory && tenant.leaseHistory.length > 0 && tenant.isArchived && (
                        <span className="bg-dark-950 border border-dark-850 text-dark-400 text-[9px] font-mono px-2 py-0.5 rounded-full">
                          Zarchiwizowano: {new Date(tenant.leaseHistory[tenant.leaseHistory.length - 1].archivedAt).toLocaleDateString('pl-PL')}
                        </span>
                      )}
                    </div>
                    
                    {/* Permanent deletion button inside archive */}
                    <button
                      type="button"
                      onClick={() => handleCompletelyDeleteTenant(tenant)}
                      className="py-1.5 px-3 bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg hover:shadow-red-500/5"
                      title="Usuń trwale z bazy danych"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Trwałe Usunięcie
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white leading-tight tracking-tight">{tenant.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xxs text-dark-400 pt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-brand-400" /> {tenant.email}</span>
                      {tenant.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-brand-400" /> {tenant.phone}</span>}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xxs text-dark-300 border-t border-dark-800/60 pt-3">
                    <div>🪪 Dowód Osobisty: <strong className="text-white">{tenant.idCard || "brak danych"}</strong></div>
                    <div>🏠 Adres korespondencyjny: <strong className="text-white">{tenant.address || "brak danych"}</strong></div>
                  </div>

                  {tenant.roommate && tenant.roommate.name && (
                    <div className="bg-dark-900/40 p-3 rounded-xl border border-dark-800/80 text-xxs space-y-1.5 max-w-lg">
                      <span className="text-brand-400 font-bold block uppercase text-[9px] tracking-wider">👥 Zarchiwizowany Współlokator</span>
                      <div className="grid gap-x-4 gap-y-1 grid-cols-2 text-[10px]">
                        <div>Nazwisko: <strong className="text-white">{tenant.roommate.name}</strong></div>
                        {tenant.roommate.phone && <div>Telefon: <strong className="text-white">{tenant.roommate.phone}</strong></div>}
                        {tenant.roommate.email && <div className="truncate">Email: <strong className="text-white" title={tenant.roommate.email}>{tenant.roommate.email}</strong></div>}
                        {tenant.roommate.idCard && <div>Dowód: <strong className="text-white">{tenant.roommate.idCard}</strong></div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lease History Timeline */}
                <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-800 pb-3 font-sans">
                    <Building className="w-4.5 h-4.5 text-brand-400" />
                    Przebieg Najmu i Historia Kontraktów
                  </h3>

                  {unifiedTimeline.length === 0 ? (
                    <p className="text-xxs text-dark-500 italic py-2">Brak umów najmu ani zdarzeń w kartotece timeline.</p>
                  ) : (
                    <div className="relative border-l border-dark-800 pl-5 ml-2.5 space-y-5 py-1">
                      {unifiedTimeline.map((item, idx) => {
                        const isCurrentActive = item.isActive;
                        return (
                          <div key={idx} className="relative space-y-1">
                            {/* Timeline dot */}
                            <span className={`absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center rounded-full ${isCurrentActive ? 'bg-green-500/20 border-green-400' : 'bg-brand-500/20 border-brand-400'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isCurrentActive ? 'bg-green-400 animate-ping' : 'bg-brand-400'}`}></span>
                            </span>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <span className={`text-xs font-bold ${isCurrentActive ? 'text-green-400' : 'text-white'}`}>
                                {item.title}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${isCurrentActive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-dark-900 border-dark-800 text-dark-400'}`}>
                                  {item.badge}
                                </span>
                                <span className="text-[10px] text-dark-500 font-mono">
                                  {new Date(item.date).toLocaleDateString('pl-PL')}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-dark-400 leading-relaxed">{item.desc}</p>
                            
                            {item.leaseStart && (
                              <div className="text-[9px] text-dark-500 font-mono mt-1">
                                Okres kontraktu: <strong className="text-dark-300">{item.leaseStart}</strong> &rarr; <strong className="text-dark-300">{item.leaseEnd || "bezterminowo"}</strong>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Financial and Invoices History */}
                <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-800 pb-3 font-sans">
                    <FileText className="w-4.5 h-4.5 text-brand-400" />
                    Archiwalny Rejestr Płatności ({tenantInvoices.length} faktur)
                  </h3>

                  {tenantInvoices.length === 0 ? (
                    <p className="text-xxs text-dark-500 italic text-center py-4">Brak faktur powiązanych z tym najemcą w bazie.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-dark-800">
                      <table className="w-full border-collapse text-left text-xxs text-dark-350 min-w-[750px]">
                        <thead>
                          <tr className="bg-dark-900/40 border-b border-dark-800 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                            <th className="p-3">Tytuł</th>
                            <th className="p-3 text-right">Czynsz</th>
                            <th className="p-3 text-right">Czynsz admin</th>
                            <th className="p-3 text-right">Media</th>
                            <th className="p-3 text-right font-black text-brand-300">Suma</th>
                            <th className="p-3 text-center">Termin</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Terminowość</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800/80 bg-dark-900/10">
                          {tenantInvoices.map((inv) => {
                            const isPaid = inv.status === "paid";
                            const timelineDetails = getPaymentTimeliness(inv.due_date, inv.paymentDate, inv.status);
                            
                            return (
                              <tr key={inv.id} className="hover:bg-dark-900/30 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-white text-xxs">{inv.title}</div>
                                  <div className="text-[9px] text-dark-500 font-mono mt-0.5">{inv.id}</div>
                                </td>
                                <td className="p-3 text-right font-mono text-white">{(inv.amountRent || 0).toFixed(2)} zł</td>
                                <td className="p-3 text-right font-mono text-white">{(inv.amountAdmin || 0).toFixed(2)} zł</td>
                                <td className="p-3 text-right font-mono text-brand-300">{(inv.amountUtilities || 0).toFixed(2)} zł</td>
                                <td className="p-3 text-right font-mono font-bold text-white">
                                  <div>{(inv.amount || 0).toFixed(2)} zł</div>
                                  <div className="text-[8px] text-green-400 font-medium">Otrzymano: {(inv.receivedPayment || 0).toFixed(2)} zł</div>
                                </td>
                                <td className="p-3 text-center font-mono text-white">{inv.due_date}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] uppercase tracking-wider ${
                                    isPaid ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                                  }`}>
                                    {isPaid ? "Opłacona" : "Zaległość"}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {timelineDetails ? (
                                    <span className={`${timelineDetails.colorClass} text-[9px]`}>
                                      {timelineDetails.isDelayed ? "🔴 " : "🟢 "}
                                      {timelineDetails.message}
                                    </span>
                                  ) : (
                                    <span className="text-dark-500 italic">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Meter readings history */}
                <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-dark-800 pb-3 font-sans">
                    <Gauge className="w-4.5 h-4.5 text-brand-400" />
                    Archiwum Wskazań Liczników ({tenantMeters.length} logs)
                  </h3>

                  {tenantMeters.length === 0 ? (
                    <p className="text-xxs text-dark-500 italic text-center py-4">Brak wskazań liczników powiązanych z tym najemcą.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-dark-800">
                      <table className="w-full border-collapse text-left text-xxs text-dark-350">
                        <thead>
                          <tr className="bg-dark-900/40 border-b border-dark-800 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                            <th className="p-3">Data</th>
                            <th className="p-3">Medium</th>
                            <th className="p-3">Numer licznika</th>
                            <th className="p-3 text-right">Stan</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-800 bg-dark-900/10">
                          {tenantMeters.map((m) => (
                            <tr key={m.id} className="hover:bg-dark-900/30 transition-colors">
                              <td className="p-3 font-mono text-[10px] text-white">{m.reading_date}</td>
                              <td className="p-3 font-semibold text-brand-350">
                                {m.meter_type === "electricity" ? "💡 Prąd" : m.meter_type === "gas" ? "⛽ Gaz" : m.meter_type === "water_cold" ? "💧 Woda zimna" : m.meter_type === "water_hot" ? "🔥 Woda ciepła" : "♨️ Ogrzewanie"}
                              </td>
                              <td className="p-3 text-dark-400 font-mono">{m.meter_number}</td>
                              <td className="p-3 text-right font-mono text-white font-bold">{m.reading_value}</td>
                              <td className="p-3 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 text-[8px] font-bold uppercase tracking-wider">
                                  Approved
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Archived Chat History Card */}
                <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-dark-800 pb-3 gap-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <MessageSquare className="w-4.5 h-4.5 text-brand-400" />
                      Archiwum Konwersacji i Rozmów Czatu ({tenantMessages.length} wiadomości)
                    </h3>
                    
                    {/* Thread Selector Tabs */}
                    {tenantMessages.length > 0 && (
                      <div className="flex bg-dark-900/60 p-1 rounded-xl border border-dark-800 gap-1 text-[9px] font-bold">
                        {["Wszystkie", "Usterki", "Rozliczenia", "Ogólne"].map((t) => {
                          const isActive = archiveChatThread === t;
                          const label = t === "Wszystkie" ? "📦 Wszystkie" : t === "Usterki" ? "🛠️ Usterki" : t === "Rozliczenia" ? "💰 Opłaty" : "💬 Ogólne";
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setArchiveChatThread(t)}
                              className={`px-2 py-1 rounded-lg transition-all ${
                                isActive 
                                  ? "bg-dark-800 text-brand-300 font-extrabold border border-brand-500/20" 
                                  : "text-dark-400 hover:text-white"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {tenantMessages.length === 0 ? (
                    <p className="text-xxs text-dark-500 italic text-center py-6 bg-dark-900/20 rounded-xl border border-dark-800">
                      Brak historii rozmów czatu z tym najemcą w bazie.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Read-Only Scrollable Chat panel */}
                      <div className="bg-dark-950/40 rounded-xl border border-dark-850 p-4 max-h-[350px] overflow-y-auto space-y-3.5 custom-scrollbar">
                        {filteredArchiveMessages.length === 0 ? (
                          <div className="text-center text-dark-500 text-xxs py-10">
                            Brak wiadomości w wybranym wątku: <strong className="text-dark-300">{archiveChatThread}</strong>
                          </div>
                        ) : (
                          filteredArchiveMessages.map((m) => {
                            const isMe = m.sender_id === landlordId || m.sender_id === "u1";
                            return (
                              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md transition-all ${
                                  isMe 
                                    ? 'bg-brand-600/90 text-white rounded-tr-none' 
                                    : 'bg-dark-800 text-dark-100 border border-dark-700/50 rounded-tl-none'
                                }`}>
                                  {/* Subject Tag in chronological flow */}
                                  {archiveChatThread === "Wszystkie" && (
                                    <span className="text-[8px] opacity-60 font-bold uppercase tracking-wider block mb-1">
                                      {m.subject === "Usterki" ? "🛠️ Usterki" : m.subject === "Rozliczenia" ? "💰 Opłaty" : "💬 Ogólne"}
                                    </span>
                                  )}
                                  
                                  {m.text && <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                                  
                                  {m.attachment_data && (
                                    <div 
                                      className={`mt-2 rounded-xl overflow-hidden border ${
                                        isMe ? 'border-brand-500/30' : 'border-dark-700'
                                      } bg-dark-950/40 cursor-pointer group relative max-w-xs`}
                                      onClick={() => setActiveLightbox(m)}
                                    >
                                      <img 
                                        src={m.attachment_data} 
                                        alt={m.attachment_name || "Załącznik"} 
                                        className="max-w-full max-h-40 object-cover rounded-xl transition-all duration-300 group-hover:scale-[1.02] group-hover:brightness-110" 
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[10px] text-white font-medium">
                                        Powiększ
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-end gap-1 mt-1 text-[8px] opacity-60">
                                    <span>
                                      {new Date(m.timestamp).toLocaleDateString('pl-PL')} o {new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && <CheckCheck className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[9px] text-dark-500 bg-dark-900/30 p-2 rounded-xl border border-dark-850">
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500"></span>
                        </span>
                        <span>Konwersacja zarchiwizowana (tylko do odczytu). Pełna historia została zabezpieczona w LocalStorage.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Summary Card */}
                <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans border-b border-dark-800 pb-3">
                    <FileText className="w-4.5 h-4.5 text-brand-400" />
                    Podsumowanie Końcowe Lokatora
                  </h3>
                  <TenantFinalSummarySection tenant={tenant} />
                </div>

                {/* Structured Notes Search Section */}
                <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <CreditCard className="w-4.5 h-4.5 text-brand-400" />
                      Rejestr Ustaleń i Notatek Historycznych
                    </h3>
                    <button
                      onClick={() => setShowAddNote(!showAddNote)}
                      className="py-1.5 px-3 bg-brand-950/20 hover:bg-brand-900/30 border border-brand-500/20 hover:border-brand-500/40 text-brand-300 rounded-xl text-xxs font-bold transition-all flex items-center gap-1 cursor-pointer glass-glow-brand"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand-400" />
                      {showAddNote ? "Anuluj" : "Dodaj Notatkę"}
                    </button>
                  </div>

                  {showAddNote && (
                    <form onSubmit={handleAddNoteSubmit} className="space-y-3 bg-dark-900/50 p-4 rounded-xl border border-brand-500/20 text-xs animate-fade-in max-w-lg">
                      <div>
                        <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Temat rozmowy / Ustaleń *</label>
                        <input
                          type="text" required placeholder="np. Kwestie zaległego czynszu za styczeń"
                          value={noteTopic} onChange={(e) => setNoteTopic(e.target.value)}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-dark-400 uppercase tracking-wider mb-1">Szczegóły rozmowy / Ustalenia *</label>
                        <textarea
                          required rows="3" placeholder="Wpisz pełne treść ustaleń z lokatorem..."
                          value={noteContent} onChange={(e) => setNoteContent(e.target.value)}
                          className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-lg w-fit"
                      >
                        Zapisz Notatkę Historyczną
                      </button>
                    </form>
                  )}

                  {/* Active search among tenant notes */}
                  {(tenant.notes || []).length > 0 && (
                    <div className="relative max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-dark-500" />
                      <input
                        type="text"
                        placeholder="Szukaj w tematach notatek..."
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-8 pr-3 py-2 text-xxs text-white focus:border-brand-500 focus:outline-none placeholder-dark-500"
                      />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2 max-h-[400px] overflow-y-auto pr-1">
                    {filteredNotes.length === 0 ? (
                      <p className="text-xxs text-dark-500 italic py-4 col-span-2 text-center bg-dark-900/20 rounded-xl border border-dark-800">
                        {(tenant.notes || []).length === 0 ? "Brak sporządzonych notatek historycznych dla tego najemcy." : "Brak notatek spełniających wybrane kryteria wyszukiwania."}
                      </p>
                    ) : (
                      filteredNotes.map(n => (
                        <div key={n.id} className="p-4 bg-dark-900/30 rounded-xl border border-dark-800 flex flex-col gap-2 relative group hover:border-dark-700 transition-all text-xs">
                          <div className="flex items-start justify-between gap-4 border-b border-dark-800/80 pb-2">
                            <span className="font-bold text-white text-xs leading-snug">📌 {n.title}</span>
                            <span className="text-[8px] text-brand-300 font-mono bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20 flex items-center gap-0.5 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(n.createdAt).toLocaleDateString('pl-PL')}
                            </span>
                          </div>
                          
                          <p className="text-dark-300 text-xxs leading-relaxed whitespace-pre-wrap flex-1">{n.content}</p>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteNoteClick(n.id)}
                            className="absolute top-2 right-2 p-1 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Usuń notatkę"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="glass p-8 text-center rounded-2xl border-brand-500/10">
                <p className="text-dark-500 text-sm italic">Wybierz lokatora z listy po lewej stronie, aby odtworzyć przebieg jego najmu.</p>
              </div>
            )}
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
    <div className="space-y-3 font-sans text-xs">
      <div className="flex items-center justify-between">
        <span className="text-dark-400 text-xxs font-bold uppercase tracking-wider block">
          Pokaż Charakterystykę i Rekomendację lokatora
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
            rows="6"
            className="w-full bg-dark-950 border border-dark-800 focus:border-brand-500 rounded-xl p-3 text-xxs text-white focus:outline-none placeholder-dark-500 leading-normal"
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
              className="px-2.5 py-1 bg-dark-900 border border-dark-800 hover:bg-dark-800 text-white rounded text-[10px] transition-all cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
            >
              Zapisz podsumowanie
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-dark-950/40 rounded-xl border border-dark-850 p-3 text-xxs text-dark-300 leading-relaxed relative min-h-[50px] flex items-center justify-center">
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
