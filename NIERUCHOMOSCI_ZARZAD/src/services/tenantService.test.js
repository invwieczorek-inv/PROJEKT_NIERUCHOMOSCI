import { describe, it, expect } from "vitest";
import * as service from "./tenantService";

describe("TenantService Business Logic Unit Tests", () => {

  // ==========================================
  // TEST GROUP 1: Lease Countdown Calculations
  // ==========================================
  describe("calculateLeaseCountdown", () => {
    it("should return 0 days for past leases that have already expired", () => {
      // Lease ended 2026-05-01, current ref is 2026-06-01 -> Expired -> 0 days
      const days = service.calculateLeaseCountdown("2026-05-01", "2026-01-01", null, "2026-06-01");
      expect(days).toBe(0);
    });

    it("should return 0 days if leaseEnd date is missing or corrupt", () => {
      expect(service.calculateLeaseCountdown(null, "2026-01-01")).toBe(0);
      expect(service.calculateLeaseCountdown("invalid-date", "2026-01-01")).toBe(0);
    });

    it("should correctly override standard leaseEnd with earlyTerminationDate", () => {
      // Standard end: 2026-12-31, Early term: 2026-06-15, Ref: 2026-06-01 -> Expected: 14 days
      const days = service.calculateLeaseCountdown("2026-12-31", "2026-01-01", "2026-06-15", "2026-06-01");
      expect(days).toBe(14);
    });
  });

  // ==========================================
  // TEST GROUP 2: Lease Warning Styling Classifiers
  // ==========================================
  describe("classifyLeaseAlert", () => {
    it("should map expired/invalid countdowns to expired styles", () => {
      const expiredAlert = service.classifyLeaseAlert(0);
      expect(expiredAlert.level).toBe("expired");
      expect(expiredAlert.colorClass).toContain("text-red-500");
    });

    it("should map less than 30 days countdown to critical warning styles", () => {
      const critAlert = service.classifyLeaseAlert(15);
      expect(critAlert.level).toBe("critical");
      expect(critAlert.message).toContain("OSTATNIE 15 DNI");
      expect(critAlert.colorClass).toContain("text-red-400");
    });

    it("should map 30 to 89 days countdown to moderate warning styles", () => {
      const modAlert = service.classifyLeaseAlert(45);
      expect(modAlert.level).toBe("warning");
      expect(modAlert.colorClass).toContain("text-yellow-400");
    });

    it("should map 90+ days countdown to normal active styles", () => {
      const normAlert = service.classifyLeaseAlert(120);
      expect(normAlert.level).toBe("normal");
      expect(normAlert.colorClass).toContain("text-green-400");
    });
  });

  // ==========================================
  // TEST GROUP 3: Tenant Financial Billing Summaries
  // ==========================================
  describe("calculateTenantFinancialSummary", () => {
    it("should aggregate financial splits and compute balance exactly", () => {
      const invoices = [
        {
          amount_rent: 1800,
          amount_admin: 450.50,
          amount_media: 150.25,
          amount: 2400.75,
          receivedPayment: 2400.75,
        },
        {
          amount_rent: 1800,
          amount_admin: 450.50,
          amount_media: 200,
          amount: 2450.50,
          receivedPayment: 2000, // Underpayment: -450.50
        }
      ];

      const summary = service.calculateTenantFinancialSummary(invoices);

      // Rent = 1800 + 1800 = 3600 PLN
      // Admin = 450.50 + 450.50 = 901 PLN
      // Utilities = 150.25 + 200 = 350.25 PLN
      // Total Invoiced = 2400.75 + 2450.50 = 4851.25 PLN
      // Total Paid = 2400.75 + 2000 = 4400.75 PLN
      // Balance = 4400.75 - 4851.25 = -450.50 PLN

      expect(summary.rent).toBe(3600);
      expect(summary.admin).toBe(901);
      expect(summary.utilities).toBe(350.25);
      expect(summary.invoiced).toBe(4851.25);
      expect(summary.paid).toBe(4400.75);
      expect(summary.balance).toBe(-450.50);
    });

    it("should return clean zero structure when input is empty list", () => {
      const summary = service.calculateTenantFinancialSummary([]);
      expect(summary.invoiced).toBe(0);
      expect(summary.paid).toBe(0);
      expect(summary.balance).toBe(0);
    });
  });
});
