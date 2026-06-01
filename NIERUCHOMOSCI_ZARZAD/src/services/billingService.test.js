import { describe, it, expect } from "vitest";
import * as service from "./billingService";

describe("BillingService Business Logic Unit Tests", () => {

  // ==========================================
  // TEST GROUP 1: Sequential Invoice Numbers
  // ==========================================
  describe("generateInvoiceNumber", () => {
    it("should correctly increment the sequence number within the same month prefix", () => {
      const output = service.generateInvoiceNumber("FV/2026/06/0002", "2026", "06");
      expect(output).toBe("FV/2026/06/0003");
    });

    it("should start a new sequence '0001' when month or year changes", () => {
      // Previous was May, new is June -> Expected: restart sequence
      const output = service.generateInvoiceNumber("FV/2026/05/0122", "2026", "06");
      expect(output).toBe("FV/2026/06/0001");
    });

    it("should start a new sequence '0001' for missing or corrupt inputs", () => {
      expect(service.generateInvoiceNumber("", "2026", "06")).toBe("FV/2026/06/0001");
      expect(service.generateInvoiceNumber("invalid-format", "2026", "06")).toBe("FV/2026/06/0001");
    });
  });

  // ==========================================
  // TEST GROUP 2: Invoices Input Validators
  // ==========================================
  describe("validateInvoiceInputs", () => {
    it("should reject negative amounts and zero sum totals", () => {
      const validation = service.validateInvoiceInputs("prop-1", -100, 50, 0, "2026-06-01", "2026-06-10");
      expect(validation.isValid).toBe(false);
      expect(validation.errors.rent).toBeDefined();

      const validationZero = service.validateInvoiceInputs("prop-1", 0, 0, 0, "2026-06-01", "2026-06-10");
      expect(validationZero.isValid).toBe(false);
      expect(validationZero.errors.total).toBeDefined();
    });

    it("should reject invalid date formats or backward due dates", () => {
      // Due date is before issue date
      const validation = service.validateInvoiceInputs("prop-1", 1000, 200, 100, "2026-06-10", "2026-06-05");
      expect(validation.isValid).toBe(false);
      expect(validation.errors.dates).toBe("Termin płatności nie może być wcześniejszy niż data wystawienia.");

      // Missing dates
      const validationMissing = service.validateInvoiceInputs("prop-1", 1000, 200, 100, "", "");
      expect(validationMissing.isValid).toBe(false);
      expect(validationMissing.errors.dates).toBeDefined();
    });

    it("should accept valid inputs and return parsed safe values", () => {
      const validation = service.validateInvoiceInputs("prop-1", "1200.50", "300", "150.25", "2026-06-01", "2026-06-10");
      expect(validation.isValid).toBe(true);
      expect(validation.data.rent).toBe(1200.50);
      expect(validation.data.admin).toBe(300);
      expect(validation.data.utilities).toBe(150.25);
      expect(validation.data.total).toBe(1650.75);
    });
  });

  // ==========================================
  // TEST GROUP 3: Accounting PDF Statement Totals
  // ==========================================
  describe("calculatePDFStatementTotals", () => {
    it("should aggregate all statement columns correctly", () => {
      const invoices = [
        { amountRent: 2000, amountAdmin: 500, amountUtilities: 150, amount: 2650, receivedPayment: 2650 },
        { amountRent: 2000, amountAdmin: 500, amountUtilities: 200, amount: 2700, receivedPayment: 2000 } // Balance -700
      ];

      const totals = service.calculatePDFStatementTotals(invoices);

      expect(totals.rent).toBe(4000);
      expect(totals.admin).toBe(1000);
      expect(totals.utilities).toBe(350);
      expect(totals.total).toBe(5350);
      expect(totals.paid).toBe(4650);
      expect(totals.balance).toBe(-700);
    });

    it("should return zeros for empty invoice lists", () => {
      const totals = service.calculatePDFStatementTotals([]);
      expect(totals.total).toBe(0);
      expect(totals.paid).toBe(0);
      expect(totals.balance).toBe(0);
    });
  });
});
