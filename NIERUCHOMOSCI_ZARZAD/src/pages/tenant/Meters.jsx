import React, { useState, useEffect } from "react";
import { 
  getMetersByProperty, 
  getLatestMeterReading, 
  addMeterReading,
  getPropertiesByTenant,
  calculateReadingCostVal
} from "../../utils/storage";
import { 
  validateMeterReadingInput, 
  calculateGasWaterHeatingCost, 
  calculateDaysAndMonthsBetweenDates 
} from "../../services/meterService";
import { Gauge, CheckCircle2, Clock, XCircle, Send, Plus } from "lucide-react";

const METER_TYPES = {
  electricity: { label: "Prąd (Energia elektryczna)", unit: "kWh", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  water_cold: { label: "Zimna woda", unit: "m³", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  water_hot: { label: "Ciepła woda", unit: "m³", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  gas: { label: "Gaz", unit: "m³", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  heating: { label: "Ogrzewanie", unit: "GJ", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" }
};

export default function TenantMeters({ tenantId }) {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [meterType, setMeterType] = useState("electricity");
  const [meterNumber, setMeterNumber] = useState("");
  const [readingValue, setReadingValue] = useState("");
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState([]);
  const [latestApproved, setLatestApproved] = useState(null);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const props = getPropertiesByTenant(tenantId);
    setProperties(props);
    if (props.length > 0) {
      setSelectedPropertyId(props[0].id);
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedPropertyId) {
      const readings = getMetersByProperty(selectedPropertyId)
        .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));
      setHistory(readings);

      const latest = getLatestMeterReading(selectedPropertyId, meterType);
      setLatestApproved(latest);
      
      // Auto-fill meter number if exists in history
      const existingMeter = readings.find(m => m.meter_type === meterType);
      if (existingMeter) {
        setMeterNumber(existingMeter.meter_number);
      } else {
        setMeterNumber("");
      }
    }
  }, [selectedPropertyId, meterType]);

  const getCostString = (item) => {
    if (item.status !== "approved" && item.status !== "pending_approval") return "—";
    
    const prevReadingObj = history
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

    const { months } = calculateDaysAndMonthsBetweenDates(prevReadingObj.reading_date, item.reading_date);
    
    const stored = localStorage.getItem("rentportal_meter_rates");
    let rates = null;
    if (stored) {
      try {
        rates = JSON.parse(stored);
      } catch (e) {}
    }
    
    const val = calculateGasWaterHeatingCost(Q, months, item.meter_type, rates);
    if (val === 0) return "—";
    return `${val.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedPropertyId) {
      setErrorMsg("Błąd: Nie jesteś przypisany do żadnego mieszkania.");
      return;
    }
    if (!meterNumber.trim()) {
      setErrorMsg("Błąd: Podaj numer seryjny licznika.");
      return;
    }
    const prevVal = latestApproved ? latestApproved.reading_value : null;
    const validation = validateMeterReadingInput(readingValue, prevVal, meterType);
    if (!validation.isValid) {
      setErrorMsg("Błąd: " + validation.errors.value);
      return;
    }

    try {
      addMeterReading({
        property_id: selectedPropertyId,
        meter_type: meterType,
        meter_number: meterNumber.trim(),
        reading_value: Number(readingValue),
        reading_date: readingDate,
        reported_by_id: tenantId,
        status: "pending_approval",
        imageUrl: null
      });

      setSuccessMsg("Sukces: Odczyt został wysłany do weryfikacji przez właściciela!");
      setReadingValue("");
      
      // Refresh history
      const readings = getMetersByProperty(selectedPropertyId)
        .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));
      setHistory(readings);
      
      const latest = getLatestMeterReading(selectedPropertyId, meterType);
      setLatestApproved(latest);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <Gauge className="w-6 h-6 text-brand-400" />
          Odczyty Liczników
        </h2>
        <p className="text-dark-400 text-sm mt-1">Wprowadzaj aktualne stany liczników mediów do rozliczeń.</p>
      </div>

      {properties.length === 0 ? (
        <div className="glass p-8 text-center rounded-2xl">
          <Gauge className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <p className="text-dark-300">Nie jesteś przypisany do żadnej nieruchomości. Skontaktuj się z właścicielem.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Submission Form */}
          <div className="glass p-6 rounded-2xl lg:col-span-1 h-fit">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-400" />
              Zgłoś Nowy Odczyt
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Nieruchomość
                </label>
                <select 
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Typ licznika
                </label>
                <select 
                  value={meterType}
                  onChange={(e) => setMeterType(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                >
                  {Object.entries(METER_TYPES).map(([type, details]) => (
                    <option key={type} value={type}>{details.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Numer seryjny licznika
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="np. L-EL-9901"
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              {latestApproved && (
                <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-3 text-xs text-brand-300">
                  <span className="font-semibold block mb-0.5">Ostatni zatwierdzony odczyt:</span>
                  {latestApproved.reading_value} {METER_TYPES[meterType].unit} ({latestApproved.reading_date})
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Aktualny stan ({METER_TYPES[meterType].unit})
                </label>
                <input 
                  type="number" 
                  step="any"
                  required
                  placeholder={`np. ${latestApproved ? latestApproved.reading_value + 5 : '120.5'}`}
                  value={readingValue}
                  onChange={(e) => setReadingValue(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Data odczytu
                </label>
                <input 
                  type="date" 
                  required
                  value={readingDate}
                  onChange={(e) => setReadingDate(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-3 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 glass-glow-brand"
              >
                <Send className="w-4 h-4" />
                Wyślij Odczyt
              </button>
            </form>
          </div>

          {/* Readings History */}
          <div className="glass p-6 rounded-2xl lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-400" />
              Historia Zgłoszeń
            </h3>

            {history.length === 0 ? (
              <p className="text-dark-500 text-sm text-center py-8">Brak wcześniejszych odczytów.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-dark-300">
                  <thead>
                    <tr className="border-b border-dark-800 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                      <th className="pb-3">Data</th>
                      <th className="pb-3">Licznik (Typ)</th>
                      <th className="pb-3">Numer seryjny</th>
                      <th className="pb-3 text-right">Stan</th>
                      <th className="pb-3 text-right">Koszt (Brutto)</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-800">
                    {history.map((h) => {
                      const type = METER_TYPES[h.meter_type] || { label: h.meter_type, unit: "", color: "" };
                      return (
                        <tr key={h.id} className="hover:bg-dark-900/30 transition-colors">
                          <td className="py-3.5 font-medium text-white">{h.reading_date}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-xs border font-medium ${type.color}`}>
                              {type.label.split(" ")[0]}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-xs">{h.meter_number}</td>
                          <td className="py-3.5 text-right font-bold text-white">
                            {h.reading_value} <span className="text-xs font-normal text-dark-500">{type.unit}</span>
                          </td>
                          <td className={`py-3.5 text-right font-bold font-mono ${h.status === 'pending_approval' ? 'text-green-400/70 italic font-medium' : 'text-green-400'}`}>
                            {getCostString(h)} {h.status === 'pending_approval' && <span className="text-[9px] opacity-75 font-sans font-normal block">(podgląd)</span>}
                          </td>
                          <td className="py-3.5 text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              h.status === "approved" 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : h.status === "rejected" 
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse'
                            }`}>
                              {h.status === "approved" ? "Zatwierdzony" : h.status === "rejected" ? "Odrzucony" : "Oczekuje"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
