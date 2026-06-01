import { roundToTwoDecimals, safeParseAmount } from "./landlordService";

/**
 * Autonomously generates a sequential invoice number following convention: FV/YYYY/MM/NNNN
 * 
 * @param {string} lastInvoiceNumber - Previous invoice number (e.g. FV/2026/06/0002)
 * @param {string} yearStr - Reference year (e.g. 2026)
 * @param {string} monthStr - Reference month (e.g. 06)
 * @returns {string} Generated sequential invoice number
 */
export const generateInvoiceNumber = (lastInvoiceNumber = "", yearStr = "2026", monthStr = "06") => {
  const currentPrefix = `FV/${yearStr}/${monthStr}/`;

  if (!lastInvoiceNumber || !lastInvoiceNumber.startsWith(currentPrefix)) {
    // Start sequence for this month
    return `${currentPrefix}0001`;
  }

  const parts = lastInvoiceNumber.split("/");
  const lastSeqStr = parts[parts.length - 1];
  const lastSeq = parseInt(lastSeqStr, 10);

  if (isNaN(lastSeq)) {
    return `${currentPrefix}0001`;
  }

  const nextSeq = lastSeq + 1;
  const nextSeqStr = nextSeq.toString().padStart(4, "0");
  return `${currentPrefix}${nextSeqStr}`;
};

/**
 * Validates manual inputs for invoice creation, raising descriptive errors.
 * 
 * @param {string} propertyId 
 * @param {number} rent 
 * @param {number} admin 
 * @param {number} utilities 
 * @param {string} issueDateStr 
 * @param {string} dueDateStr 
 * @returns {object} Validation result and errors list
 */
export const validateInvoiceInputs = (
  propertyId,
  rent = 0,
  admin = 0,
  utilities = 0,
  issueDateStr = "",
  dueDateStr = ""
) => {
  const errors = {};

  if (!propertyId) {
    errors.propertyId = "Należy wybrać mieszkanie.";
  }

  const rentVal = safeParseAmount(rent);
  const adminVal = safeParseAmount(rent === 0 ? 0 : admin); // if rent is 0, allow 0 admin
  const utilitiesVal = safeParseAmount(utilities);

  if (parseFloat(rent) < 0) errors.rent = "Czynsz najmu nie może być ujemny.";
  if (parseFloat(admin) < 0) errors.admin = "Czynsz administracyjny nie może być ujemny.";
  if (parseFloat(utilities) < 0) errors.utilities = "Opłata za media nie może być ujemna.";

  const total = rentVal + adminVal + utilitiesVal;
  if (total <= 0) {
    errors.total = "Suma opłat na rachunku musi być większa niż 0 PLN.";
  }

  if (!issueDateStr || !dueDateStr) {
    errors.dates = "Wymagane jest podanie daty wystawienia oraz terminu płatności.";
  } else {
    const issue = new Date(issueDateStr);
    const due = new Date(dueDateStr);

    if (isNaN(issue.getTime()) || isNaN(due.getTime())) {
      errors.dates = "Podano nieprawidłowy format dat.";
    } else if (due < issue) {
      errors.dates = "Termin płatności nie może być wcześniejszy niż data wystawienia.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      rent: rentVal,
      admin: adminVal,
      utilities: utilitiesVal,
      total: roundToTwoDecimals(total)
    }
  };
};

/**
 * Calculates aggregated sums in landlord PDF reports accounting table.
 * 
 * @param {Array} filteredInvoices 
 * @returns {object} Aggregated totals for footers
 */
export const calculatePDFStatementTotals = (filteredInvoices = []) => {
  let rent = 0;
  let admin = 0;
  let utilities = 0;
  let total = 0;
  let paid = 0;
  let balance = 0;

  filteredInvoices.forEach((inv) => {
    const amountRent = safeParseAmount(inv.amountRent);
    const amountAdmin = safeParseAmount(inv.amountAdmin);
    const amountUtilities = safeParseAmount(inv.amountUtilities);
    const amountTotal = safeParseAmount(inv.amount);
    const amountPaid = safeParseAmount(inv.receivedPayment);
    const amountBalance = roundToTwoDecimals(amountPaid - amountTotal);

    rent += amountRent;
    admin += amountAdmin;
    utilities += amountUtilities;
    total += amountTotal;
    paid += amountPaid;
    balance += amountBalance;
  });

  return {
    rent: roundToTwoDecimals(rent),
    admin: roundToTwoDecimals(admin),
    utilities: roundToTwoDecimals(utilities),
    total: roundToTwoDecimals(total),
    paid: roundToTwoDecimals(paid),
    balance: roundToTwoDecimals(balance)
  };
};
