import { describe, it, expect } from "vitest";
import * as service from "./meterService";

describe("MeterService Business Logic Unit Tests", () => {

  // ==========================================
  // TEST GROUP 1: Date Difference Calculations
  // ==========================================
  describe("calculateDaysAndMonthsBetweenDates", () => {
    it("should correctly calculate days and months between two dates", () => {
      const output = service.calculateDaysAndMonthsBetweenDates("2026-06-01", "2026-06-31");
      expect(output.days).toBe(30);
      expect(output.months).toBe(1.0); // 30 / 30.4 rounded to 1 decimal is 1.0
    });

    it("should default to 1 day and 1.0 month for invalid or missing dates", () => {
      const output = service.calculateDaysAndMonthsBetweenDates("", null);
      expect(output.days).toBe(1);
      expect(output.months).toBe(1.0);
    });
  });

  // ==========================================
  // TEST GROUP 2: Meter Reading Input Validation
  // ==========================================
  describe("validateMeterReadingInput", () => {
    it("should reject empty, negative, or non-numeric values", () => {
      const emptyVal = service.validateMeterReadingInput("");
      expect(emptyVal.isValid).toBe(false);
      expect(emptyVal.errors.value).toBe("Wartość odczytu nie może być pusta.");

      const negativeVal = service.validateMeterReadingInput("-120");
      expect(negativeVal.isValid).toBe(false);
      expect(negativeVal.errors.value).toBe("Wartość odczytu musi być liczbą nieujemną.");

      const nanVal = service.validateMeterReadingInput("not-a-number");
      expect(nanVal.isValid).toBe(false);
      expect(nanVal.errors.value).toBe("Wartość odczytu musi być liczbą nieujemną.");
    });

    it("should reject values that are less than previous reading value", () => {
      const regressedVal = service.validateMeterReadingInput("150.5", 200.0);
      expect(regressedVal.isValid).toBe(false);
      expect(regressedVal.errors.value).toContain("nie może być niższy niż poprzedni odczyt");
    });

    it("should accept valid readings and return parsed numerical value", () => {
      const validVal = service.validateMeterReadingInput("250.5", 200.0);
      expect(validVal.isValid).toBe(true);
      expect(validVal.value).toBe(250.5);
    });
  });

  // ==========================================
  // TEST GROUP 3: Grouping Readings by Property
  // ==========================================
  describe("groupMetersByProperty", () => {
    it("should group readings by property and sort them by date descending", () => {
      const properties = [{ id: "prop-1", title: "Mieszkanie 1" }, { id: "prop-2", title: "Mieszkanie 2" }];
      const meters = [
        { id: "m1", property_id: "prop-1", reading_date: "2026-06-01", reading_value: 100 },
        { id: "m2", property_id: "prop-1", reading_date: "2026-06-15", reading_value: 120 },
        { id: "m3", property_id: "prop-2", reading_date: "2026-06-10", reading_value: 50 }
      ];

      const grouped = service.groupMetersByProperty(meters, properties);
      
      expect(grouped).toHaveLength(2);
      expect(grouped[0].readings).toHaveLength(2);
      expect(grouped[0].readings[0].reading_date).toBe("2026-06-15"); // descending check
      expect(grouped[1].readings).toHaveLength(1);
    });

    it("should return empty readings list for properties with no readings", () => {
      const properties = [{ id: "prop-1", title: "Mieszkanie 1" }];
      const grouped = service.groupMetersByProperty([], properties);
      expect(grouped[0].readings).toHaveLength(0);
    });
  });

  // ==========================================
  // TEST GROUP 4: Cost Calculation Engine
  // ==========================================
  describe("calculateGasWaterHeatingCost", () => {
    it("should return 0 for non-positive consumption Q", () => {
      expect(service.calculateGasWaterHeatingCost(0, 1.0, "electricity")).toBe(0);
      expect(service.calculateGasWaterHeatingCost(-10, 1.0, "electricity")).toBe(0);
    });

    it("should calculate correct gross cost for cold water, hot water, and heating using simple rates", () => {
      // cold water Q=10 => 10 * 12.0 = 120 PLN
      expect(service.calculateGasWaterHeatingCost(10, 1.0, "water_cold")).toBe(120);

      // hot water Q=5 => 5 * 35.0 = 175 PLN
      expect(service.calculateGasWaterHeatingCost(5, 1.0, "water_hot")).toBe(175);

      // heating Q=3 => 3 * 80.0 = 240 PLN
      expect(service.calculateGasWaterHeatingCost(3, 1.0, "heating")).toBe(240);
    });

    it("should calculate correct electricity cost incorporating variables, fixed subscription components, and 23% VAT", () => {
      // active_energy: 0.51, network_variable: 0.35, quality_fee: 0.332, oze_fee: 0.073, co_generation_fee: 0.03 => sum of variables = 1.295 / kWh
      // subscription_fee: 0.8, transitional_fee: 0.33, network_fixed: 7.83, capacity_fee: 17.18 => sum of fixed = 26.14 / month
      // billing_service_fee: 15.00 flat gross / month
      // Q = 100 kWh, M = 2.0 months
      // net_cons = 100 * 1.295 = 129.5
      // net_fixed = 2 * 26.14 = 52.28
      // gross = (129.5 + 52.28) * 1.23 + (2 * 15) = 181.78 * 1.23 + 30 = 223.5894 + 30 = 253.59
      const cost = service.calculateGasWaterHeatingCost(100, 2.0, "electricity");
      expect(cost).toBe(253.59);
    });

    it("should calculate correct gas cost incorporating variables, fixed components, and 23% VAT", () => {
      // variable_distribution: 0.20, gas_fuel: 0.33 => sum variables = 0.53 / m3
      // handling_fee: 5.20, fixed_distribution: 7.20 => sum fixed = 12.40 / month
      // Q = 50 m3, M = 1.5 months
      // net_cons = 50 * 0.53 = 26.5
      // net_fixed = 1.5 * 12.40 = 18.6
      // gross = (26.5 + 18.6) * 1.23 = 45.1 * 1.23 = 55.473 => 55.47
      const cost = service.calculateGasWaterHeatingCost(50, 1.5, "gas");
      expect(cost).toBe(55.47);
    });

    it("should respect custom rates overrides", () => {
      const customRates = {
        electricity: {
          active_energy: 0.60,
          network_variable: 0.40,
          quality_fee: 0,
          oze_fee: 0,
          co_generation_fee: 0,
          subscription_fee: 0,
          transitional_fee: 0,
          network_fixed: 0,
          capacity_fee: 0,
          billing_service_fee: 0
        }
      };
      // Q = 100, M = 1.0
      // net_cons = 100 * (0.60 + 0.40) = 100
      // net_fixed = 0
      // gross = 100 * 1.23 = 123.00
      const cost = service.calculateGasWaterHeatingCost(100, 1.0, "electricity", customRates);
      expect(cost).toBe(123.00);
    });
  });
});
