/**
 * RentPortal - Landlord Business Logic Service
 * 
 * Houses decoupled core calculations, validation layers, currency roundings,
 * and edge-case handling for the Landlord portal views.
 */

/**
 * Rounds a number to exactly two decimal places.
 * Handles floating-point inaccuracies like 0.1 + 0.2.
 * @param {number} val 
 * @returns {number}
 */
export const roundToTwoDecimals = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
};

/**
 * Safely parses financial input amounts with fallback to zero.
 * Prevents negative values and NaN values from crashing calculations.
 * @param {any} val 
 * @returns {number}
 */
export const safeParseAmount = (val) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
};

/**
 * Computes NOI, ROI, and ROE metrics with strict division-by-zero checks and currency rounding.
 * 
 * @param {number} totalRentSum - Annualized or portoflio rent received
 * @param {object} expenses - Portfolio expenses breakdown
 * @param {number} communityCosts - Monthly administrative cost
 * @param {number} propertyValue - Market value of properties
 * @param {number} equityValue - Owner wkład własny
 * @param {number} monthlyCreditInstallment - Bank credit installment
 * @returns {object} Financial ROI/ROE metrics
 */
export const calculateNOI_ROI_ROE = (
  totalRentSum = 0,
  expenses = { repairs: 0, insurance: 0, furnishings: 0 },
  communityCosts = 0,
  propertyValue = 0,
  equityValue = 0,
  monthlyCreditInstallment = 0
) => {
  const safeRent = safeParseAmount(totalRentSum);
  const safeRepairs = safeParseAmount(expenses.repairs);
  const safeInsurance = safeParseAmount(expenses.insurance);
  const safeFurnishings = safeParseAmount(expenses.furnishings);
  const safeCommunity = safeParseAmount(communityCosts);
  const safePropVal = safeParseAmount(propertyValue);
  const safeEquity = safeParseAmount(equityValue);
  const safeCredit = safeParseAmount(monthlyCreditInstallment);

  // Flat tax rate is 8.5% of total gross rent received
  const flatTax = safeRent * 0.085;

  // Real NOI calculation (Net Operating Income)
  const totalExpenses = safeRepairs + safeInsurance + safeFurnishings + safeCommunity;
  const realNOI = safeRent - totalExpenses - flatTax;

  // ROI: Return on Investment relative to property market value
  const annualNOI = realNOI;
  const roi = safePropVal > 0 ? (annualNOI / safePropVal) * 100 : 0;

  // ROE: Return on Equity relative to owner wkład własny
  const annualNetProfit = realNOI - (safeCredit * 12);
  const roe = safeEquity > 0 ? (annualNetProfit / safeEquity) * 100 : 0;

  return {
    flatTax: roundToTwoDecimals(flatTax),
    totalExpenses: roundToTwoDecimals(totalExpenses),
    realNOI: roundToTwoDecimals(realNOI),
    roi: roundToTwoDecimals(roi),
    roe: roundToTwoDecimals(roe),
    annualNetProfit: roundToTwoDecimals(annualNetProfit),
  };
};

/**
 * Aggregates portoflio financial metrics from a list of invoices with currency rounding.
 * Detects discrepancies between expected and received payments (Anomalies).
 * 
 * @param {Array} invoices 
 * @returns {object} Aggregated financial summary & anomalies
 */
export const calculateFinancialMetrics = (invoices = []) => {
  let invoiced = 0;
  let collected = 0;
  let underpayments = 0;
  let overpayments = 0;
  const anomalies = [];

  invoices.forEach((inv) => {
    const amount = safeParseAmount(inv.amount);
    const received = safeParseAmount(inv.receivedPayment);
    const balance = roundToTwoDecimals(received - amount);

    invoiced += amount;
    collected += received;

    if (balance < 0) {
      underpayments += Math.abs(balance);
      anomalies.push({
        id: inv.id,
        title: inv.title,
        dueDate: inv.due_date,
        propertyTitle: inv.propertyTitle || inv.property_id,
        tenantName: inv.tenantName || inv.tenant_id,
        expected: amount,
        received: received,
        balance: balance,
        type: "underpayment",
      });
    } else if (balance > 0) {
      overpayments += balance;
      anomalies.push({
        id: inv.id,
        title: inv.title,
        dueDate: inv.due_date,
        propertyTitle: inv.propertyTitle || inv.property_id,
        tenantName: inv.tenantName || inv.tenant_id,
        expected: amount,
        received: received,
        balance: balance,
        type: "overpayment",
      });
    }
  });

  return {
    invoiced: roundToTwoDecimals(invoiced),
    collected: roundToTwoDecimals(collected),
    underpayments: roundToTwoDecimals(underpayments),
    overpayments: roundToTwoDecimals(overpayments),
    outstanding: roundToTwoDecimals(invoiced - collected),
    anomalies,
  };
};

/**
 * Classifies overdue invoices into 4 risk brackets for the Aging Debts visual timeline widget.
 * 
 * @param {Array} invoices 
 * @param {string} referenceDateStr - Reference date anchor (e.g. 2026-06-01)
 * @returns {object} Aging debt metrics & classified groups
 */
export const calculateAgingDebts = (invoices = [], referenceDateStr = "2026-06-01") => {
  const refDate = new Date(referenceDateStr);
  refDate.setHours(0,0,0,0);

  const groups = {
    low: { count: 0, total: 0, items: [] },      // 1-3 days
    medium: { count: 0, total: 0, items: [] },   // 4-9 days
    high: { count: 0, total: 0, items: [] },     // 10-29 days
    critical: { count: 0, total: 0, items: [] }  // 30+ days
  };

  let totalRiskExposure = 0;

  invoices.forEach((inv) => {
    if (inv.status === "paid" || !inv.due_date) return;

    const expected = safeParseAmount(inv.amount);
    const received = safeParseAmount(inv.receivedPayment);
    const outstanding = roundToTwoDecimals(expected - received);

    if (outstanding <= 0) return;

    const due = new Date(inv.due_date);
    due.setHours(0,0,0,0);

    const diffTime = refDate.getTime() - due.getTime();
    const delayDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (delayDays <= 0) return; // Not overdue yet relative to reference anchor

    totalRiskExposure += outstanding;

    const debtItem = {
      id: inv.id,
      title: inv.title,
      dueDate: inv.due_date,
      tenantName: inv.tenantName || inv.tenant_id,
      propertyTitle: inv.propertyTitle || inv.property_id,
      delayDays,
      amount: outstanding
    };

    if (delayDays >= 1 && delayDays <= 3) {
      groups.low.count++;
      groups.low.total += outstanding;
      groups.low.items.push(debtItem);
    } else if (delayDays >= 4 && delayDays <= 9) {
      groups.medium.count++;
      groups.medium.total += outstanding;
      groups.medium.items.push(debtItem);
    } else if (delayDays >= 10 && delayDays <= 29) {
      groups.high.count++;
      groups.high.total += outstanding;
      groups.high.items.push(debtItem);
    } else if (delayDays >= 30) {
      groups.critical.count++;
      groups.critical.total += outstanding;
      groups.critical.items.push(debtItem);
    }
  });

  // Round aggregated totals
  groups.low.total = roundToTwoDecimals(groups.low.total);
  groups.medium.total = roundToTwoDecimals(groups.medium.total);
  groups.high.total = roundToTwoDecimals(groups.high.total);
  groups.critical.total = roundToTwoDecimals(groups.critical.total);

  return {
    totalRiskExposure: roundToTwoDecimals(totalRiskExposure),
    groups
  };
};

/**
 * Computes lease active duration and applies early termination penalty rules.
 * Throws clean, localized errors for invalid date chronology.
 * 
 * @param {string} leaseStartStr - Date lease started (ISO string)
 * @param {string} terminationDateStr - Date lease is early terminated (ISO string)
 * @param {number} monthlyRent - Czynsz najmu
 * @returns {object} Calculated penalty & lease duration metrics
 */
export const calculateEarlyTerminationPenalty = (leaseStartStr, terminationDateStr, monthlyRent = 0) => {
  if (!leaseStartStr || !terminationDateStr) {
    throw new Error("Wymagane jest podanie daty rozpoczęcia najmu oraz daty wcześniejszego zakończenia.");
  }

  const start = new Date(leaseStartStr);
  const end = new Date(terminationDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Podano nieprawidłowy format daty.");
  }

  if (end < start) {
    throw new Error("Data zakończenia najmu nie może być wcześniejsza niż data rozpoczęcia najmu.");
  }

  const rent = safeParseAmount(monthlyRent);

  // Calculate active lease duration in full months
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  const activeMonths = diffDays / 30.4;

  let multiplier = 0;
  if (activeMonths < 6) {
    multiplier = 3;
  } else if (activeMonths >= 6 && activeMonths < 9) {
    multiplier = 1.5;
  } else if (activeMonths >= 9 && activeMonths < 11) {
    multiplier = 1;
  } else {
    multiplier = 0; // Over 11 months, no penalty
  }

  const penalty = rent * multiplier;

  return {
    activeDays: diffDays,
    activeMonths: roundToTwoDecimals(activeMonths),
    multiplier,
    penalty: roundToTwoDecimals(penalty)
  };
};

/**
 * Validates Tenant Notes inputs to avoid corrupt database records.
 * Strips HTML tags to keep notes text clean and sanitised.
 * 
 * @param {string} title 
 * @param {string} content 
 * @returns {object} Validation errors list, empty if valid
 */
export const validateTenantNoteInput = (title = "", content = "") => {
  const errors = {};

  const cleanTitle = (title || "").replace(/<[^>]*>/g, "").trim();
  const cleanContent = (content || "").replace(/<[^>]*>/g, "").trim();

  if (!cleanTitle) {
    errors.title = "Temat notatki nie może być pusty.";
  } else if (cleanTitle.length > 100) {
    errors.title = "Temat notatki nie może przekraczać 100 znaków.";
  }

  if (!cleanContent) {
    errors.content = "Treść notatki nie może być pusta.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      title: cleanTitle,
      content: cleanContent
    }
  };
};
