import React, { useState, useEffect, useMemo } from "react";
import { 
  getMeters, 
  approveMeterReading, 
  rejectMeterReading,
  getPropertyById,
  getUserById,
  addMeterReading,
  getPropertiesByLandlord,
  deleteMeterReading,
  updateMeterReadingValue
} from "../../utils/storage";
import { Gauge, Check, X, Clock, Activity, Info, Plus, Coins, Zap, Flame, Calendar, Sparkles, Edit, Trash2, Building } from "lucide-react";

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
  const [editingReading, setEditingReading] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [modalError, setModalError] = useState("");
  const [inlineValues, setInlineValues] = useState({});
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

  const propertiesWithReadings = useMemo(() => {
    const landlordProperties = getPropertiesByLandlord(landlordId);
    return landlordProperties.map(p => {
      const propReadings = meters.filter(m => m.property_id === p.id);
      return {
        ...p,
        readings: propReadings.sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))
      };
    });
  }, [meters, landlordId]);

  useEffect(() => {
    const handleMetersUpdated = () => {
      setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
      const props = getPropertiesByLandlord(landlordId).filter(p => p.tenant_id !== null);
      setProperties(props);
    };

    handleMetersUpdated();
    const props = getPropertiesByLandlord(landlordId).filter(p => p.tenant_id !== null);
    if (props.length > 0) {
      setSelectedPropertyId(props[0].id);
    }

    window.addEventListener("rentportal_meters_updated", handleMetersUpdated);
    return () => {
      window.removeEventListener("rentportal_meters_updated", handleMetersUpdated);
    };
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

  const handleInlineSubmit = (e, propId) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const data = inlineValues[propId];
    const medium = data?.type || "electricity";
    const val = data?.val;
    const date = data?.date || new Date().toISOString().split("T")[0];

    if (val === undefined || val === "" || Number(val) < 0) {
      setErrorMsg("Wpisz poprawną wartość odczytu.");
      return;
    }

    // Auto-detect serial number
    let sn = "";
    const readings = meters.filter(m => m.property_id === propId && m.meter_type === medium);
    if (readings.length > 0) {
      sn = readings[0].meter_number || "";
    } else {
      if (medium === "electricity") sn = "L-EL-9901";
      else if (medium === "gas") sn = "G-GZ-5502";
      else if (medium === "water_cold") sn = "W-WC-1103";
      else if (medium === "water_hot") sn = "W-WH-1104";
      else if (medium === "heating") sn = "H-HT-3305";
    }

    try {
      addMeterReading({
        property_id: propId,
        meter_type: medium,
        meter_number: sn,
        reading_value: Number(val),
        reading_date: date,
        reported_by_id: landlordId,
        status: "approved"
      });

      // Clear state
      setInlineValues(prev => ({
        ...prev,
        [propId]: { ...prev[propId], val: "" }
      }));
      setSuccessMsg("Szybki odczyt licznika został pomyślnie dodany!");
      setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
      setTimeout(() => setSuccessMsg(""), 3500);

      // Force dispatch sync event
      window.dispatchEvent(new Event("rentportal_meters_updated"));
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
    setErrorMsg("");
    setSuccessMsg("");
    try {
      localStorage.setItem("rentportal_meter_rates", JSON.stringify(rates));
      setSuccessMsg("Stawki składowe mediów zostały pomyślnie zapisane!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setErrorMsg("Błąd zapisu stawek: " + err.message);
    }
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

      {/* Historical logs list grouped by Properties */}
      <div className="glass p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
          <Activity className="w-5 h-5 text-brand-400" />
          Historia Odczytów i Zużycie (Grupowanie Lokalami)
        </h3>

        {approvedReadings.length === 0 ? (
          <p className="text-dark-500 text-center py-6 text-sm">Brak zarejestrowanych logów odczytów w historii.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 font-sans">
            {propertiesWithReadings.map(p => (
              <div 
                key={p.id} 
                className="glass p-5 rounded-2xl border-brand-500/10 hover:border-brand-500/20 transition-all duration-300 relative overflow-hidden group shadow-xl flex flex-col justify-between"
              >
                {/* Visual hover background glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors pointer-events-none" />

                <div className="space-y-4">
                  {/* Property Header */}
                  <div className="flex justify-between items-start border-b border-dark-800 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-dark-900 border border-dark-800 text-brand-400 rounded-xl">
                        <Building className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-xs tracking-tight">{p.title.split(",")[0]}</h3>
                        <span className="text-[9px] text-dark-500 truncate block mt-0.5">{p.address}</span>
                      </div>
                    </div>
                    <span className="text-[8px] text-brand-300 font-mono bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20 uppercase tracking-wider shrink-0 font-bold">
                      {p.readings.length} odczytów
                    </span>
                  </div>

                  {/* Readings list inside property card */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {p.readings.length === 0 ? (
                      <p className="text-[10px] text-dark-500 italic py-6 text-center">Brak odczytów dla tego lokalu.</p>
                    ) : (
                      p.readings.map((h) => {
                        const type = METER_TYPES[h.meter_type] || { label: h.meter_type, unit: "" };
                        const consumption = getConsumption(h);
                        const isApproved = h.status === "approved";
                        const isPending = h.status === "pending_approval";
                        const cost = calculateReadingCost(h);

                        return (
                          <div 
                            key={h.id} 
                            className={`p-3 rounded-xl border transition-all text-xxs flex flex-col gap-2.5 ${
                              isPending 
                                ? 'bg-yellow-500/5 border-yellow-500/25 shadow-md shadow-yellow-950/5' 
                                : isApproved 
                                  ? 'bg-dark-900/40 border-dark-800 hover:border-dark-700/80' 
                                  : 'bg-red-500/5 border-red-500/20'
                            }`}
                          >
                            {/* Date & Meter Serial */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                                {h.reading_date}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-dark-800 border border-dark-750 text-brand-300">
                                  {type.label}
                                </span>
                                <span className="text-[8px] text-dark-500 font-mono">S/N: {h.meter_number}</span>
                              </div>
                            </div>

                            {/* Reading parameters grid */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-left pt-2 border-t border-dark-800/50">
                              <div>
                                <span className="text-[8px] text-dark-500 font-bold block uppercase tracking-wider">Stan Odczytu</span>
                                <strong className="text-white font-mono text-[10px]">
                                  {h.reading_value} <span className="text-[8px] font-normal text-dark-400">{type.unit}</span>
                                </strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-dark-500 font-bold block uppercase tracking-wider">Zużycie</span>
                                <strong className={`font-mono text-[10px] ${isPending ? 'text-emerald-400/70 italic font-medium' : 'text-emerald-400'}`}>
                                  {consumption}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-dark-500 font-bold block uppercase tracking-wider">Koszt Brutto</span>
                                <strong className={`font-mono text-[10px] ${isPending ? 'text-green-400/70 italic font-medium' : 'text-green-400 font-bold'}`}>
                                  {cost}
                                </strong>
                              </div>
                              <div>
                                <span className="text-[8px] text-dark-500 font-bold block uppercase tracking-wider mb-0.5">Status</span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  isApproved 
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                    : isPending 
                                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {isApproved ? "Zatwierdzony" : isPending ? "Oczekuje" : "Odrzucony"}
                                </span>
                              </div>
                            </div>

                            {/* Row Actions */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-dark-800/40 mt-0.5">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReading(h);
                                    setEditValue(h.reading_value);
                                  }}
                                  className="py-1 px-2 bg-dark-950 hover:bg-dark-800 border border-dark-800 hover:border-brand-500/40 text-brand-400 hover:text-brand-300 rounded-lg text-[9px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                                  title="Modyfikuj stan licznika"
                                >
                                  <Edit className="w-3 h-3" />
                                  Modyfikuj
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm("Czy na pewno chcesz trwale usunąć ten odczyt z historii? Zostanie on usunięty z bazy w czasie rzeczywistym.")) {
                                      deleteMeterReading(h.id);
                                      setSuccessMsg("Odczyt licznika został pomyślnie usunięty!");
                                      setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
                                      setTimeout(() => setSuccessMsg(""), 3000);
                                    }
                                  }}
                                  className="py-1 px-2 bg-dark-950 hover:bg-red-500/10 border border-dark-800 hover:border-red-500/30 text-dark-500 hover:text-red-400 rounded-lg text-[9px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                                  title="Usuń odczyt"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Usuń
                                </button>
                              </div>

                              {isPending && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleApprove(h.id)}
                                    title="Zatwierdź odczyt"
                                    className="py-1 px-1.5 bg-green-500/20 hover:bg-green-500 hover:text-white text-green-400 rounded-lg transition-all cursor-pointer font-bold text-[9px] flex items-center gap-0.5 shadow-md"
                                  >
                                    <Check className="w-3 h-3 font-black" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(h.id)}
                                    title="Odrzuć odczyt"
                                    className="py-1 px-1.5 bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-all cursor-pointer font-bold text-[9px] flex items-center gap-0.5 shadow-md"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Inline Quick Add Form */}
                  <form 
                    onSubmit={(e) => handleInlineSubmit(e, p.id)}
                    className="border-t border-dark-800/60 pt-3.5 mt-3 space-y-2 text-left font-sans"
                  >
                    <span className="text-[9px] font-bold text-brand-300 uppercase tracking-wider block">
                      ⚡ Szybki wpis odczytu:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={inlineValues[p.id]?.type || "electricity"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInlineValues(prev => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || { type: "electricity", val: "", date: new Date().toISOString().split("T")[0] }), type: val }
                            }));
                          }}
                          className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          {Object.keys(METER_TYPES).map(k => (
                            <option key={k} value={k}>{METER_TYPES[k].label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.1"
                          required
                          placeholder="Stan licznika"
                          value={inlineValues[p.id]?.val || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInlineValues(prev => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || { type: "electricity", val: "", date: new Date().toISOString().split("T")[0] }), val }
                            }));
                          }}
                          className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <input
                          type="date"
                          required
                          value={inlineValues[p.id]?.date || new Date().toISOString().split("T")[0]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInlineValues(prev => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || { type: "electricity", val: "", date: new Date().toISOString().split("T")[0] }), date: val }
                            }));
                          }}
                          className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-brand-500 font-mono cursor-pointer"
                        />
                      </div>
                      <button
                        type="submit"
                        className="py-1 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-brand-950/20"
                      >
                        <Plus className="w-3 h-3" /> Dodaj
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ))}
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

      {/* Edit Reading Modal Window */}
      {editingReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-sm w-full p-6 rounded-2xl border-brand-500/20 space-y-4 shadow-2xl relative text-left">
            <button 
              type="button"
              onClick={() => { setEditingReading(null); setModalError(""); }}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-dark-800 pb-3 text-brand-400">
              <Edit className="w-4.5 h-4.5 text-brand-400" />
              Modyfikacja Stanu Licznika
            </h3>

            <p className="text-xxs text-dark-400 leading-relaxed">
              Modyfikujesz stan licznika dla nieruchomości: <strong className="text-white">{getPropertyById(editingReading.property_id)?.title.split(",")[0]}</strong>, medium: <strong className="text-white">{METER_TYPES[editingReading.meter_type]?.label || editingReading.meter_type}</strong>.
            </p>

            {modalError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xxs flex items-start gap-2 animate-fade-in">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setModalError("");
                if (!editValue || Number(editValue) <= 0) {
                  setModalError("Wpisz poprawną wartość odczytu.");
                  return;
                }
                try {
                  updateMeterReadingValue(editingReading.id, editValue);
                  setSuccessMsg("Stan licznika został pomyślnie zaktualizowany!");
                  setEditingReading(null);
                  setMeters(getMeters().sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date)));
                  setTimeout(() => setSuccessMsg(""), 3000);
                } catch (err) {
                  setModalError("Błąd zapisu: " + err.message);
                }
              }} 
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">
                  Nowy Stan Odczytu ({METER_TYPES[editingReading.meter_type]?.unit || ""}) *
                </label>
                <input
                  type="number" step="0.1" required
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-brand-500 focus:outline-none font-bold font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => { setEditingReading(null); setModalError(""); }}
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
          </div>
        </div>
      )}
    </div>
  );
}
