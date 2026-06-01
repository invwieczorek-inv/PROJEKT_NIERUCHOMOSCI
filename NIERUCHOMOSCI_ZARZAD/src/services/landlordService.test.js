import { describe, it, expect } from "vitest";
import * as service from "./landlordService";

describe("LandlordService Business Logic Unit Tests", () => {
  
  // ==========================================
  // TEST GROUP 1: Formatting and Safe Parsing Helpers
  // ==========================================
  describe("roundToTwoDecimals & safeParseAmount", () => {
    it("should round numbers accurately to 2 decimals avoiding float issues", () => {
      expect(service.roundToTwoDecimals(123.456)).toBe(123.46);
      expect(service.roundToTwoDecimals(0.1 + 0.2)).toBe(0.3); // avoids 0.30000000000000004
      expect(service.roundToTwoDecimals("invalid")).toBe(0);
      expect(service.roundToTwoDecimals(null)).toBe(0);
    });

    it("should safely parse numeric strings and clamp negative parameters", () => {
      expect(service.safeParseAmount("1500.50")).toBe(1500.50);
      expect(service.safeParseAmount("-250")).toBe(0); // clamped to 0
      expect(service.safeParseAmount("not-a-number")).toBe(0);
      expect(service.safeParseAmount(undefined)).toBe(0);
    });
  });

  // ==========================================
  // TEST GROUP 2: NOI, ROI, and ROE Financial Calculations
  // ==========================================
  describe("calculateNOI_ROI_ROE", () => {
    it("should compute exact financial yields with 8.5% flat tax subtraction", () => {
      const grossRent = 24000; // Annual gross rent
      const expenses = { repairs: 1200, insurance: 500, furnishings: 300 };
      const communityCosts = 1000;
      const propertyValue = 400000;
      const wkladWlasny = 100000;
      const creditInstallment = 500; // 500 * 12 = 6000 annual

      const metrics = service.calculateNOI_ROI_ROE(
        grossRent,
        expenses,
        communityCosts,
        propertyValue,
        wkladWlasny,
        creditInstallment
      );

      // Flat tax = 24000 * 8.5% = 2040.00 PLN
      // Total expenses = 1200 + 500 + 300 + 1000 = 3000.00 PLN
      // Real NOI = 24000 - 3000 - 2040 = 18960.00 PLN
      // ROI = (18960 / 400000) * 100 = 4.74%
      // Annual Credit rate = 500 * 12 = 6000.00 PLN
      // Net profit = 18960 - 6000 = 12960.00 PLN
      // ROE = (12960 / 100000) * 100 = 12.96%

      expect(metrics.flatTax).toBe(2040);
      expect(metrics.totalExpenses).toBe(3000);
      expect(metrics.realNOI).toBe(18960);
      expect(metrics.roi).toBe(4.74);
      expect(metrics.roe).toBe(12.96);
      expect(metrics.annualNetProfit).toBe(12960);
    });

    it("should protect calculations from division-by-zero errors when parameters are zero", () => {
      const metrics = service.calculateNOI_ROI_ROE(12000, { repairs: 0, insurance: 0, furnishings: 0 }, 0, 0, 0, 0);

      expect(metrics.roi).toBe(0);
      expect(metrics.roe).toBe(0);
      expect(metrics.realNOI).toBe(10980); // 12000 - 8.5% tax
    });
  });

  // ==========================================
  // TEST GROUP 3: Invoices Discrepancies and Anomalies
  // ==========================================
  describe("calculateFinancialMetrics", () => {
    it("should aggregate total invoiced/collected cash-in and detect anomalies", () => {
      const invoices = [
        { id: "inv-1", amount: 2000, receivedPayment: 2000, title: "Czynsz Maj" },
        { id: "inv-2", amount: 2500, receivedPayment: 2000, title: "Czynsz Czerwiec" }, // Underpayment: -500
        { id: "inv-3", amount: 1500, receivedPayment: 1700, title: "Czynsz Lipiec" }  // Overpayment: +200
      ];

      const summary = service.calculateFinancialMetrics(invoices);

      // Invoiced = 2000 + 2500 + 1500 = 6000 PLN
      // Collected = 2000 + 2000 + 1700 = 5700 PLN
      // Outstanding = 6000 - 5700 = 300 PLN
      // Underpayments = 500 PLN
      // Overpayments = 200 PLN
      // Anomalies count = 2

      expect(summary.invoiced).toBe(6000);
      expect(summary.collected).toBe(5700);
      expect(summary.outstanding).toBe(300);
      expect(summary.underpayments).toBe(500);
      expect(summary.overpayments).toBe(200);
      expect(summary.anomalies).toHaveLength(2);

      const under = summary.anomalies.find(a => a.type === "underpayment");
      expect(under.balance).toBe(-500);
      expect(under.title).toBe("Czynsz Czerwiec");

      const over = summary.anomalies.find(a => a.type === "overpayment");
      expect(over.balance).toBe(200);
      expect(over.title).toBe("Czynsz Lipiec");
    });
  });

  // ==========================================
  // TEST GROUP 4: Aging Debts Risk Classification
  // ==========================================
  describe("calculateAgingDebts", () => {
    it("should group unpaid invoices into correct risk tiers relative to anchor date", () => {
      const invoices = [
        { id: "inv-1", status: "unpaid", amount: 100, receivedPayment: 0, due_date: "2026-05-30" }, // 2 days overdue -> Low (1-3 days)
        { id: "inv-2", status: "unpaid", amount: 200, receivedPayment: 0, due_date: "2026-05-25" }, // 7 days overdue -> Medium (4-9 days)
        { id: "inv-3", status: "partial", amount: 1000, receivedPayment: 600, due_date: "2026-05-18" }, // 14 days overdue, 400 outstanding -> High (10-29 days)
        { id: "inv-4", status: "unpaid", amount: 500, receivedPayment: 0, due_date: "2026-04-15" }, // 47 days overdue -> Critical (30+ days)
        { id: "inv-5", status: "paid", amount: 1000, receivedPayment: 1000, due_date: "2026-05-01" } // Already paid -> Ignored
      ];

      // Reference anchor is 2026-06-01
      const result = service.calculateAgingDebts(invoices, "2026-06-01");

      // Total exposure = 100 + 200 + 400 (outstanding) + 500 = 1200 PLN
      expect(result.totalRiskExposure).toBe(1200);

      expect(result.groups.low.count).toBe(1);
      expect(result.groups.low.total).toBe(100);

      expect(result.groups.medium.count).toBe(1);
      expect(result.groups.medium.total).toBe(200);

      expect(result.groups.high.count).toBe(1);
      expect(result.groups.high.total).toBe(400); // Only unpaid balance 1000 - 600 = 400 counted

      expect(result.groups.critical.count).toBe(1);
      expect(result.groups.critical.total).toBe(500);
    });
  });

  // ==========================================
  // TEST GROUP 5: Early Lease Termination Penalties
  // ==========================================
  describe("calculateEarlyTerminationPenalty", () => {
    it("should compute penalty multipliers correctly based on active duration", () => {
      // 1. Under 6 months active: 3x rent
      // Start: 2026-01-01, End: 2026-04-01 -> ~3 months active -> Multiplier = 3
      const case1 = service.calculateEarlyTerminationPenalty("2026-01-01", "2026-04-01", 2000);
      expect(case1.multiplier).toBe(3);
      expect(case1.penalty).toBe(6000);

      // 2. Between 6 and 9 months active: 1.5x rent
      // Start: 2026-01-01, End: 2026-08-01 -> ~7 months active -> Multiplier = 1.5
      const case2 = service.calculateEarlyTerminationPenalty("2026-01-01", "2026-08-01", 2000);
      expect(case2.multiplier).toBe(1.5);
      expect(case2.penalty).toBe(3000);

      // 3. Between 9 and 11 months active: 1x rent
      // Start: 2026-01-01, End: 2026-10-15 -> ~9.5 months active -> Multiplier = 1
      const case3 = service.calculateEarlyTerminationPenalty("2026-01-01", "2026-10-15", 2000);
      expect(case3.multiplier).toBe(1);
      expect(case3.penalty).toBe(2000);

      // 4. Over 11 months active: 0 PLN penalty
      // Start: 2026-01-01, End: 2026-12-15 -> ~11.5 months active -> Multiplier = 0
      const case4 = service.calculateEarlyTerminationPenalty("2026-01-01", "2026-12-15", 2000);
      expect(case4.multiplier).toBe(0);
      expect(case4.penalty).toBe(0);
    });

    it("should throw error for chronological date errors", () => {
      expect(() => {
        service.calculateEarlyTerminationPenalty("2026-06-01", "2026-05-01", 2000);
      }).toThrow("Data zakończenia najmu nie może być wcześniejsza niż data rozpoczęcia najmu.");
    });
  });

  // ==========================================
  // TEST GROUP 6: Tenant Notes Sanitization
  // ==========================================
  describe("validateTenantNoteInput", () => {
    it("should strip HTML tags and validate inputs", () => {
      const title = "<b>Pilne!</b> Płatność zaległa";
      const content = "<b>Lokator</b> obiecał zapłacić w piątek.";

      const validation = service.validateTenantNoteInput(title, content);

      expect(validation.isValid).toBe(true);
      expect(validation.sanitized.title).toBe("Pilne! Płatność zaległa"); // stripped <b>
      expect(validation.sanitized.content).toBe("Lokator obiecał zapłacić w piątek."); // stripped <b>
    });

    it("should return validation errors for empty fields", () => {
      const validation = service.validateTenantNoteInput("", "Some content");
      expect(validation.isValid).toBe(false);
      expect(validation.errors.title).toBeDefined();
    });
  });
});
