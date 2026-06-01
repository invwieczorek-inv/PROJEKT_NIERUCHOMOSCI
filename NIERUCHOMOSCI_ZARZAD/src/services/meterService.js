/**
 * MeterService Business Logic
 * Covers grouping, validations, date differences, and core utility cost engine calculations.
 */

export const DEFAULT_RATES = {
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

const roundToTwoDecimals = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Calculates days and months difference between two dates.
 * 
 * @param {string} dateStr1 
 * @param {string} dateStr2 
 * @returns {object} { days, months }
 */
export const calculateDaysAndMonthsBetweenDates = (dateStr1, dateStr2) => {
  if (!dateStr1 || !dateStr2) {
    return { days: 1, months: 1.0 };
  }
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return { days: 1, months: 1.0 };
  }
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  const months = Math.round((days / 30.4) * 10) / 10 || 1.0;
  return { days, months };
};

/**
 * Validates manual or inline input for a meter reading.
 * 
 * @param {string|number} currentValue 
 * @param {number|null} previousValue 
 * @param {string} meterType 
 * @returns {object} Validation status, errors, and parsed value
 */
export const validateMeterReadingInput = (currentValue, previousValue = null, meterType = "") => {
  const errors = {};
  
  if (currentValue === undefined || currentValue === null || currentValue === "") {
    errors.value = "Wartość odczytu nie może być pusta.";
    return { isValid: false, errors, value: 0 };
  }

  const val = parseFloat(currentValue);
  if (isNaN(val) || val < 0) {
    errors.value = "Wartość odczytu musi być liczbą nieujemną.";
  } else if (previousValue !== null && previousValue !== undefined) {
    const prevVal = parseFloat(previousValue);
    if (!isNaN(prevVal) && val < prevVal) {
      errors.value = `Nowy odczyt (${val}) nie może być niższy niż poprzedni odczyt (${prevVal}).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value: isNaN(val) ? 0 : val
  };
};

/**
 * Groups raw meters readings by property, sorted descending by date.
 * 
 * @param {Array} meters 
 * @param {Array} properties 
 * @returns {Array} List of properties with sorted readings
 */
export const groupMetersByProperty = (meters = [], properties = []) => {
  return properties.map(p => {
    const propReadings = meters.filter(m => m.property_id === p.id);
    return {
      ...p,
      readings: [...propReadings].sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))
    };
  });
};

/**
 * Clean cost calculation engine based on consumption Q and duration in months M.
 * 
 * @param {number} Q - Consumption difference (current - previous)
 * @param {number} M - Duration in months multiplier
 * @param {string} type - Meter type
 * @param {object} customRates - Dynamic component rates
 * @returns {number} Cost gross in PLN
 */
export const calculateGasWaterHeatingCost = (Q, M, type, customRates = null) => {
  if (Q <= 0) return 0;

  const rates = customRates || DEFAULT_RATES;

  if (type === "electricity") {
    const elecRates = rates.electricity || DEFAULT_RATES.electricity;
    const net_cons = Q * (
      parseFloat(elecRates.active_energy || 0) + 
      parseFloat(elecRates.network_variable || 0) + 
      parseFloat(elecRates.quality_fee || 0) + 
      parseFloat(elecRates.oze_fee || 0) + 
      parseFloat(elecRates.co_generation_fee || 0)
    );
    const net_fixed = M * (
      parseFloat(elecRates.subscription_fee || 0) + 
      parseFloat(elecRates.transitional_fee || 0) + 
      parseFloat(elecRates.network_fixed || 0) + 
      parseFloat(elecRates.capacity_fee || 0)
    );
    const gross = (net_cons + net_fixed) * 1.23 + (M * parseFloat(elecRates.billing_service_fee || 0));
    return roundToTwoDecimals(gross);
  } else if (type === "gas") {
    const gasRates = rates.gas || DEFAULT_RATES.gas;
    const net_cons = Q * (
      parseFloat(gasRates.variable_distribution || 0) + 
      parseFloat(gasRates.gas_fuel || 0)
    );
    const net_fixed = M * (
      parseFloat(gasRates.handling_fee || 0) + 
      parseFloat(gasRates.fixed_distribution || 0)
    );
    const gross = (net_cons + net_fixed) * 1.23;
    return roundToTwoDecimals(gross);
  } else if (type === "water_cold") {
    return roundToTwoDecimals(Q * 12.0);
  } else if (type === "water_hot") {
    return roundToTwoDecimals(Q * 35.0);
  } else if (type === "heating") {
    return roundToTwoDecimals(Q * 80.0);
  }

  return 0;
};
