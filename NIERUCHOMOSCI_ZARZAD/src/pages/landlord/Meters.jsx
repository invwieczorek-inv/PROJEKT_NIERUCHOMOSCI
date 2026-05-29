import React, { useState, useEffect } from "react";
import { 
  getMeters, 
  approveMeterReading, 
  rejectMeterReading,
  getPropertyById,
  getUserById,
  addMeterReading,
  getPropertiesByLandlord
} from "../../utils/storage";
import { Gauge, Check, X, Clock, Activity, Info, Plus, Coins, Zap, Flame, Calendar, Sparkles } from "lucide-react";

const METER_TYPES = {
  electricity: { label: "💡 Prąd", unit: "kWh" },
  water_cold: { label: "💧 Zimna woda", unit: "m³" },
  water_hot: { label: "🔥 Ciepła woda", unit: "m³" },
  gas: { label: "⛽ Gaz", unit: "m³" },
  heating: { label: "♨️ Ogrzewanie", unit: "GJ" }
};

export default function LandlordMeters({ landlordId }) {
  const [meters, setMeters] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedMeterType, setSelectedMeterType] = useState("electricity");
  const [meterNumber, setMeterNumber] = useState("");
  const [readingValue, setReadingValue] = useState("");
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [rates, setRates] = useState(() => {
    const DEFAULT_RATES = {
      electricity: {
        active_energy: 0.51,        // zł / kWh
        network_variable: 0.35,     // zł / kWh
        quality_fee: 0.332,         // zł / kWh
        oze_fee: 0.073,             // zł / kWh
        co_generation_fee: 0.03,    // zł / kWh
        subscription_fee: 0.8,      // zł / month
        transitional_fee: 0.33,     // zł / month
        network_fixed: 7.83,        // zł / month
        capacity_fee: 17.18,        // zł / month
        billing_service_fee: 15.00  // flat gross / month
      },
      gas: {
        variable_distribution: 0.20, // zł / m3
        gas_fuel: 0.33,              // zł / m3
        handling_fee: 5.20,          // zł / month
        fixed_distribution: 7.20     // zł / month
      }
    };
    const stored = localStorage.getItem("rentportal_meter_rates");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return {
            electricity: { ...DEFAULT_RATES.electricity, ...(parsed.electricity || {}) },
            gas: { ...DEFAULT_RATES.gas, ...(parsed.gas || {}) }
          };
        }
      } catch (e) {
        console.error("Failed to parse stored meter rates", e);
      }
    }
    return DEFAULT_RATES;
  });

  useEffect(() => {
    setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
    const props = getPropertiesByLandlord(landlordId).filter(p => p.tenant_id !== null);
    setProperties(props);
    if (props.length > 0) {
      setSelectedPropertyId(props[0].id);
    }
  }, [landlordId]);

  // Dynamically auto-suggest serial number based on property and medium selection
  useEffect(() => {
    if (selectedPropertyId && selectedMeterType) {
      const readings = meters.filter(m => m.property_id === selectedPropertyId && m.meter_type === selectedMeterType);
      if (readings.length > 0) {
        setMeterNumber(readings[0].meter_number || "");
      } else {
        // Standard formats
        if (selectedMeterType === "electricity") setMeterNumber("L-EL-9901");
        else if (selectedMeterType === "gas") setMeterNumber("G-GZ-5502");
        else if (selectedMeterType === "water_cold") setMeterNumber("W-WC-1103");
        else if (selectedMeterType === "water_hot") setMeterNumber("W-WH-1104");
        else if (selectedMeterType === "heating") setMeterNumber("H-HT-3305");
        else setMeterNumber("");
      }
    }
  }, [selectedPropertyId, selectedMeterType, meters]);

  const handleAddReadingSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedPropertyId) {
      setErrorMsg("Wybierz mieszkanie.");
      return;
    }
    if (!readingValue || Number(readingValue) <= 0) {
      setErrorMsg("Wpisz poprawny stan odczytu licznika.");
      return;
    }
    if (!meterNumber.trim()) {
      setErrorMsg("Wpisz numer seryjny licznika.");
      return;
    }
    if (!readingDate) {
      setErrorMsg("Wybierz datę odczytu.");
      return;
    }

    try {
      addMeterReading({
        property_id: selectedPropertyId,
        meter_type: selectedMeterType,
        meter_number: meterNumber.trim(),
        reading_value: Number(readingValue),
        reading_date: readingDate,
        reported_by_id: landlordId,
        status: "approved" // auto-approved direct landlord entry
      });

      setSuccessMsg("Ręczny odczyt licznika został pomyślnie dodany!");
      setReadingValue("");
      setShowAddModal(false);
      setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRateChange = (medium, field, value) => {
    setRates(prev => ({
      ...prev,
      [medium]: {
        ...prev[medium],
        [field]: value
      }
    }));
  };

  const handleSaveRates = (e) => {
    e.preventDefault();
    localStorage.setItem("rentportal_meter_rates", JSON.stringify(rates));
    setSuccessMsg("Stawki składowe mediów zostały pomyślnie zapisane!");
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const calculateReadingCost = (item) => {
    if (item.status !== "approved" && item.status !== "pending_approval") return "—";

    const prevReadingObj = meters
      .filter(m => 
        m.property_id === item.property_id && 
        m.meter_type === item.meter_type && 
        (m.status === "approved" || m.status === "pending_approval") && 
        new Date(m.reading_date) < new Date(item.reading_date)
      )
      .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))[0];

    if (!prevReadingObj) return "—";

    const Q = Number(item.reading_value) - Number(prevReadingObj.reading_value);
    if (Q <= 0) return "0.00 PLN";

    const diffTime = new Date(item.reading_date).getTime() - new Date(prevReadingObj.reading_date).getTime();
    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const M = Math.round((diffDays / 30.4) * 10) / 10 || 1.0;

    if (item.meter_type === "electricity") {
      const net_cons = Q * (
        Number(rates.electricity.active_energy || 0) + 
        Number(rates.electricity.network_variable || 0) + 
        Number(rates.electricity.quality_fee || 0) + 
        Number(rates.electricity.oze_fee || 0) + 
        Number(rates.electricity.co_generation_fee || 0)
      );
      const net_fixed = M * (
        Number(rates.electricity.subscription_fee || 0) + 
        Number(rates.electricity.transitional_fee || 0) + 
        Number(rates.electricity.network_fixed || 0) + 
        Number(rates.electricity.capacity_fee || 0)
      );
      const gross = (net_cons + net_fixed) * 1.23 + (M * Number(rates.electricity.billing_service_fee || 0));
      return `${gross.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`;
    } else if (item.meter_type === "gas") {
      const net_cons = Q * (
        Number(rates.gas.variable_distribution || 0) + 
        Number(rates.gas.gas_fuel || 0)
      );
      const net_fixed = M * (
        Number(rates.gas.handling_fee || 0) + 
        Number(rates.gas.fixed_distribution || 0)
      );
      const gross = (net_cons + net_fixed) * 1.23;
      return `${gross.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`;
    } else if (item.meter_type === "water_cold") {
      return `${(Q * 12.0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`;
    } else if (item.meter_type === "water_hot") {
      return `${(Q * 35.0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`;
    } else if (item.meter_type === "heating") {
      return `${(Q * 80.0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`;
    }

    return "—";
  };

  const handleApprove = (id) => {
    try {
      approveMeterReading(id);
      setSuccessMsg("Odczyt licznika został zatwierdzony!");
      setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
      // Dispatch custom event to notify other components (e.g. Invoices)
      window.dispatchEvent(new Event("rentportal_meters_updated"));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleReject = (id) => {
    try {
      rejectMeterReading(id);
      setSuccessMsg("Odczyt licznika został odrzucony.");
      setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
      window.dispatchEvent(new Event("rentportal_meters_updated"));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Helper to calculate consumption (difference between current and previous approved/pending readings)
  const getConsumption = (item) => {
    if (item.status !== "approved" && item.status !== "pending_approval") return "Oczekuje";

    const prevReadings = meters
      .filter(m => 
        m.property_id === item.property_id && 
        m.meter_type === item.meter_type && 
        (m.status === "approved" || m.status === "pending_approval") && 
        new Date(m.reading_date) < new Date(item.reading_date)
      )
      .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));

    if (prevReadings.length > 0) {
      const diff = Number(item.reading_value) - Number(prevReadings[0].reading_value);
      return `+${diff.toFixed(1)} ${METER_TYPES[item.meter_type]?.unit || ""}`;
    }
    return "Pierwszy odczyt";
  };

  const pendingReadings = meters.filter(m => m.status === "pending_approval");
  const approvedReadings = meters; // all readings including pending and rejected

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <Gauge className="w-6 h-6 text-brand-400" />
            Agregacja Liczników i Zużycia
          </h2>
          <p className="text-dark-400 text-sm mt-1">Zatwierdzaj odczyty podawane przez lokatorów i śledź historyczne zużycie mediów.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 self-start glass-glow-brand cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Zarejestruj odczyt ręczny
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
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Approvals Section */}
      <div className="glass p-6 rounded-2xl border-brand-500/10 glass-glow-brand">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          Oczekujące Zgłoszenia Lokatorów
        </h3>

        {pendingReadings.length === 0 ? (
          <p className="text-dark-500 text-sm text-center py-6">Brak nowych odczytów oczekujących na zatwierdzenie.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingReadings.map(m => {
              const prop = getPropertyById(m.property_id);
              const reporter = getUserById(m.reported_by_id);
              const label = METER_TYPES[m.meter_type]?.label || m.meter_type;
              const unit = METER_TYPES[m.meter_type]?.unit || "";

              return (
                <div key={m.id} className="bg-dark-900 border border-dark-800 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-dark-800 text-brand-300">
                        {label}
                      </span>
                      <span className="text-[10px] text-dark-500 font-mono">S/N: {m.meter_number}</span>
                    </div>

                    <h4 className="font-bold text-white text-sm">{prop ? prop.title.split(",")[0] : 'Mieszkanie'}</h4>
                    <p className="text-xxs text-dark-400">
                      Zgłosił: <strong>{reporter ? reporter.name : 'Lokator'}</strong> dnia {m.reading_date}
                    </p>
                    
                    <div className="text-lg font-black text-white mt-1">
                      {m.reading_value} <span className="text-xs font-normal text-dark-500">{unit}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(m.id)}
                      className="p-2 bg-green-500/10 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Zatwierdź
                    </button>
                    <button
                      onClick={() => handleReject(m.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Odrzuć
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical logs list */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-400" />
          Historia Odczytów i Zużycie
        </h3>

        {approvedReadings.length === 0 ? (
          <p className="text-dark-500 text-center py-6 text-sm">Brak zatwierdzonych logów w historii.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-dark-300">
              <thead>
                <tr className="border-b border-dark-800 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Mieszkanie</th>
                  <th className="pb-3">Licznik (Typ)</th>
                  <th className="pb-3">Numer licznika</th>
                  <th className="pb-3 text-right">Stan odczytu</th>
                  <th className="pb-3 text-right">Zużycie</th>
                  <th className="pb-3 text-right">Koszt (Brutto)</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {approvedReadings.map((h) => {
                  const prop = getPropertyById(h.property_id);
                  const type = METER_TYPES[h.meter_type] || { label: h.meter_type, unit: "" };
                  const consumption = getConsumption(h);
                  const isApproved = h.status === "approved";
                  const isPending = h.status === "pending_approval";

                  return (
                    <tr key={h.id} className={`transition-all duration-300 hover:bg-dark-900/30 ${
                      isPending ? 'bg-yellow-500/5 border-l-2 border-yellow-500/50' : isApproved ? 'bg-green-500/5 hover:bg-green-500/10' : ''
                    }`}>
                      <td className="py-3.5 font-medium text-white">{h.reading_date}</td>
                      <td className="py-3.5 text-xs text-white">{prop ? prop.title : 'Nieruchomość'}</td>
                      <td className="py-3.5 text-xs font-semibold text-brand-300">{type.label}</td>
                      <td className="py-3.5 font-mono text-xs text-dark-400">{h.meter_number}</td>
                      <td className="py-3.5 text-right font-bold text-white">
                        {h.reading_value} <span className="text-xs font-normal text-dark-500">{type.unit}</span>
                      </td>
                      <td className={`py-3.5 text-right font-semibold ${isPending ? 'text-emerald-400/70 italic' : 'text-emerald-400'}`}>
                        {consumption} {isPending && <span className="text-[9px] opacity-75 font-normal block font-sans">(podgląd)</span>}
                      </td>
                      <td className={`py-3.5 text-right font-bold font-mono ${isPending ? 'text-green-400/70 italic font-medium' : 'text-green-400'}`}>
                        {calculateReadingCost(h)} {isPending && <span className="text-[9px] opacity-75 font-sans font-normal block">(podgląd)</span>}
                      </td>
                      <td className="py-3.5 text-center">
                        {isPending ? (
                          <div className="flex flex-col items-center gap-1 justify-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 animate-pulse border border-yellow-500/20">
                              Oczekuje
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApprove(h.id)}
                                title="Zatwierdź odczyt (podświetli na zielono i doda do opłat)"
                                className="p-1 bg-green-500/20 hover:bg-green-500 hover:text-white text-green-400 rounded-md transition-all cursor-pointer shadow-md"
                              >
                                <Check className="w-3.5 h-3.5 font-black" />
                              </button>
                              <button
                                onClick={() => handleReject(h.id)}
                                title="Odrzuć odczyt"
                                className="p-1 bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-md transition-all cursor-pointer shadow-md"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            isApproved 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-sm shadow-green-950/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {isApproved ? "Zatwierdzony" : "Odrzucony"}
                          </span>
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

      {/* Stawki składowe taryfy (Component Rates from Excel) */}
      <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-6 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800/80 pb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-brand-400" />
            Taryfy i Stawki Składowe Mediów (Konstrukcja Excel Draft)
          </h3>
          <span className="text-xxs text-dark-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 font-bold uppercase tracking-wider">
            Aktywny podatek VAT: 23%
          </span>
        </div>

        <form onSubmit={handleSaveRates} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Box 1: Electricity */}
            <div className="bg-dark-900/40 p-5 rounded-xl border border-dark-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-brand-300">
                <Zap className="w-4.5 h-4.5 text-yellow-400" />
                💡 Taryfa Energii Elektrycznej (EE)
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 text-xxs font-medium text-dark-300 text-left">
                <div>
                  <label className="block text-dark-400 mb-1">Energia czynna całodobowa (netto zł/kWh)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={rates.electricity.active_energy}
                    onChange={(e) => handleRateChange("electricity", "active_energy", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata sieciowa zmienna (netto zł/kWh)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={rates.electricity.network_variable}
                    onChange={(e) => handleRateChange("electricity", "network_variable", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata jakościowa (netto zł/kWh)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={rates.electricity.quality_fee}
                    onChange={(e) => handleRateChange("electricity", "quality_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata OZE (netto zł/kWh)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={rates.electricity.oze_fee}
                    onChange={(e) => handleRateChange("electricity", "oze_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata kogeneracyjna (netto zł/kWh)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={rates.electricity.co_generation_fee}
                    onChange={(e) => handleRateChange("electricity", "co_generation_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div className="border-t border-dark-800/60 pt-2 sm:col-span-2 my-1" />
                <div>
                  <label className="block text-dark-400 mb-1">Opłata abonamentowa (netto zł/miesiąc)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={rates.electricity.subscription_fee}
                    onChange={(e) => handleRateChange("electricity", "subscription_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata przejściowa (netto zł/miesiąc)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={rates.electricity.transitional_fee}
                    onChange={(e) => handleRateChange("electricity", "transitional_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata sieciowa stała (netto zł/miesiąc)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={rates.electricity.network_fixed}
                    onChange={(e) => handleRateChange("electricity", "network_fixed", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata mocowa (netto zł/miesiąc)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={rates.electricity.capacity_fee}
                    onChange={(e) => handleRateChange("electricity", "capacity_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-dark-400 mb-1">Opłata obsługi naliczeń (brutto zł/miesiąc)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={rates.electricity.billing_service_fee}
                    onChange={(e) => handleRateChange("electricity", "billing_service_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Gas */}
            <div className="bg-dark-900/40 p-5 rounded-xl border border-dark-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-brand-300">
                <Flame className="w-4.5 h-4.5 text-orange-400" />
                ⛽ Taryfa Gazu
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 text-xxs font-medium text-dark-300 text-left">
                <div>
                  <label className="block text-dark-400 mb-1">Opłata dystrybucyjna zmienna (netto zł/m³)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={rates.gas.variable_distribution}
                    onChange={(e) => handleRateChange("gas", "variable_distribution", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Paliwo gazowe (netto zł/m³)</label>
                  <input
                    type="number" step="0.0001" min="0"
                    value={rates.gas.gas_fuel}
                    onChange={(e) => handleRateChange("gas", "gas_fuel", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div className="border-t border-dark-800/60 pt-2 sm:col-span-2 my-1" />
                <div>
                  <label className="block text-dark-400 mb-1">Opłata handlowa (netto zł/miesiąc)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={rates.gas.handling_fee}
                    onChange={(e) => handleRateChange("gas", "handling_fee", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 mb-1">Opłata dystrybucyjna stała (netto zł/miesiąc)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={rates.gas.fixed_distribution}
                    onChange={(e) => handleRateChange("gas", "fixed_distribution", e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* Explanatory notes */}
              <div className="bg-dark-950/40 p-3 rounded-lg border border-dark-850 text-[10px] text-dark-400 flex items-start gap-1.5 mt-4">
                <Info className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                <span>
                  Konstrukcja taryfowa EE i Gaz jest dokładnie oparta na plikach Excel: <code>EE draft.xlsx</code> oraz <code>gaz draft.xlsx</code>. Zmiana tych stawek skoryguje koszty brutto we wszystkich zatwierdzonych i historycznych odczytach w czasie rzeczywistym.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="py-2.5 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all glass-glow-brand cursor-pointer flex items-center gap-1.5"
            >
              <Coins className="w-4 h-4" /> Zapisz stawki taryfowe
            </button>
          </div>
        </form>
      </div>

      {/* Manual Meter Reading Logging Modal Window */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-md w-full p-6 rounded-2xl border-brand-500/20 space-y-4 shadow-2xl relative text-left">
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-dark-800 pb-3 text-brand-400">
              <Sparkles className="w-5 h-5 text-brand-400" />
              Zarejestruj Odczyt Ręczny Licznika
            </h3>

            <p className="text-xxs text-dark-400">
              Wpisz stan licznika przesłany przez lokatora (np. na czacie jako zdjęcie). Zgłoszenie to zostanie automatycznie zatwierdzone i wciągnięte do historii zużycia.
            </p>

            {properties.length === 0 ? (
              <p className="text-xs text-yellow-500 bg-yellow-500/5 p-4 border border-yellow-500/20 rounded-xl">
                Błąd: Nie posiadasz wynajętych mieszkań z aktywnymi lokatorami.
              </p>
            ) : (
              <form onSubmit={handleAddReadingSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">
                    Wybierz mieszkanie *
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    required
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    {properties.map(p => {
                      const tenant = getUserById(p.tenant_id);
                      return (
                        <option key={p.id} value={p.id}>{p.title.split(",")[0]} ({tenant ? tenant.name : "brak"})</option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">
                      Typ licznika *
                    </label>
                    <select
                      value={selectedMeterType}
                      onChange={(e) => setSelectedMeterType(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    >
                      {Object.keys(METER_TYPES).map(k => (
                        <option key={k} value={k}>{METER_TYPES[k].label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">
                      Numer seryjny licznika *
                    </label>
                    <input
                      type="text" required placeholder="np. L-EL-9901"
                      value={meterNumber}
                      onChange={(e) => setMeterNumber(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">
                      Stan licznika ({METER_TYPES[selectedMeterType]?.unit || ""}) *
                    </label>
                    <input
                      type="number" step="0.1" required placeholder="np. 12580.5"
                      value={readingValue}
                      onChange={(e) => setReadingValue(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">
                      Data odczytu *
                    </label>
                    <input
                      type="date" required
                      value={readingDate}
                      onChange={(e) => setReadingDate(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Zapisz odczyt
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
