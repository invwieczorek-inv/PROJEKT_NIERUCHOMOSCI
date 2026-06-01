import { roundToTwoDecimals, safeParseAmount } from "./landlordService";

/**
 * Calculates remaining days in lease, prioritizing early termination overrides.
 * Returns 0 for past leases or invalid inputs.
 * 
 * @param {string} leaseEndStr 
 * @param {string} leaseStartStr 
 * @param {string} earlyTerminationDateStr 
 * @param {string} referenceDateStr - Anchors calculation (default is today)
 * @returns {number} Days remaining in lease
 */
export const calculateLeaseCountdown = (
  leaseEndStr,
  leaseStartStr,
  earlyTerminationDateStr = null,
  referenceDateStr = null
) => {
  if (!leaseEndStr) return 0;

  const start = leaseStartStr ? new Date(leaseStartStr) : null;
  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  ref.setHours(0,0,0,0);

  // If lease hasn't started yet relative to reference anchor, count remains positive from start
  // but if it is already active, we calculate from ref to final date.
  const targetDateStr = earlyTerminationDateStr || leaseEndStr;
  const target = new Date(targetDateStr);
  target.setHours(0,0,0,0);

  if (isNaN(target.getTime())) return 0;

  if (start && !isNaN(start.getTime()) && ref < start) {
    // Contract has not started yet
    const diffTime = target.getTime() - start.getTime();
    return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  }

  const diffTime = target.getTime() - ref.getTime();
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
};

/**
 * Returns CSS visual warning classes and alert statuses in Polish based on remaining days.
 * 
 * @param {number} days 
 * @returns {object} Styling object containing text, color class, and alert level
 */
export const classifyLeaseAlert = (days) => {
  const safeDays = parseInt(days);
  if (isNaN(safeDays) || safeDays <= 0) {
    return {
      level: "expired",
      message: "Umowa zakończona",
      colorClass: "text-red-500 font-extrabold animate-pulse",
      bgClass: "bg-red-950/30 border-red-500/30"
    };
  }

  if (safeDays < 30) {
    return {
      level: "critical",
      message: `Zaległy czas najmu: OSTATNIE ${safeDays} DNI!`,
      colorClass: "text-red-400 font-extrabold animate-pulse",
      bgClass: "bg-red-900/20 border-red-500/25"
    };
  }

  if (safeDays >= 30 && safeDays < 90) {
    return {
      level: "warning",
      message: `Do końca umowy: ${safeDays} dni`,
      colorClass: "text-yellow-400 font-bold",
      bgClass: "bg-yellow-950/20 border-yellow-500/25"
    };
  }

  return {
    level: "normal",
    message: `Umowa aktywna: pozostało ${safeDays} dni`,
    colorClass: "text-green-400 font-bold",
    bgClass: "bg-green-950/20 border-green-500/25"
  };
};

/**
 * Aggregates a tenant's historical billings and balances.
 * 
 * @param {Array} invoices 
 * @returns {object} Total values for rent, admin, utilities, paid, and balance
 */
export const calculateTenantFinancialSummary = (invoices = []) => {
  let totalRent = 0;
  let totalAdmin = 0;
  let totalUtilities = 0;
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  invoices.forEach((inv) => {
    // Invoices splits in rentPortal are stored as:
    // amount_rent (czynsz najmu), amount_admin (opłata admin), amount_media (opłata media)
    const rent = safeParseAmount(inv.amount_rent);
    const admin = safeParseAmount(inv.amount_admin);
    const media = safeParseAmount(inv.amount_media);
    const amount = safeParseAmount(inv.amount);
    const paid = safeParseAmount(inv.receivedPayment);
    const balance = paid - amount;

    totalRent += rent;
    totalAdmin += admin;
    totalUtilities += media;
    totalInvoiced += amount;
    totalPaid += paid;
    totalBalance += balance;
  });

  return {
    rent: roundToTwoDecimals(totalRent),
    admin: roundToTwoDecimals(totalAdmin),
    utilities: roundToTwoDecimals(totalUtilities),
    invoiced: roundToTwoDecimals(totalInvoiced),
    paid: roundToTwoDecimals(totalPaid),
    balance: roundToTwoDecimals(totalBalance),
  };
};
