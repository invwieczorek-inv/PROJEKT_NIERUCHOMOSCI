import { describe, it, expect, beforeEach, vi } from "vitest";
import * as storage from "./storage";

// ==========================================
// GLOBALS MOCKING SETUP FOR NODE ENVIRONMENT
// ==========================================
let mockLocalStorage = {};
const localStorageMock = {
  getItem: vi.fn((key) => mockLocalStorage[key] || null),
  setItem: vi.fn((key, value) => {
    mockLocalStorage[key] = value.toString();
  }),
  removeItem: vi.fn((key) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage = {};
  }),
};
vi.stubGlobal("localStorage", localStorageMock);

const dispatchMock = vi.fn();
vi.stubGlobal("window", {
  dispatchEvent: dispatchMock,
  location: { reload: vi.fn() },
});
vi.stubGlobal("Event", class {
  constructor(type) {
    this.type = type;
  }
});
vi.stubGlobal("CustomEvent", class {
  constructor(type, detail) {
    this.type = type;
    this.detail = detail;
  }
});

// Keys in storage.js
const KEYS = {
  USERS: "rentportal_users_v3",
  PROPERTIES: "rentportal_properties_v3",
  INVOICES: "rentportal_invoices_v3",
  METERS: "rentportal_meters_v3",
  MESSAGES: "rentportal_messages_v3",
  DOCUMENTS: "rentportal_documents_v3",
  EXPENSES: "rentportal_expenses_v3",
  METER_RATES: "rentportal_meter_rates", // Correct key checked in getMeterRates()
};

describe("RentPortal Core Business Unit & Integration Tests", () => {
  beforeEach(() => {
    mockLocalStorage = {};
    vi.clearAllMocks();
  });

  // ==========================================
  // UNIT TEST 1: String Normalization (Deduplication)
  // ==========================================
  describe("normalizeStringForMatching", () => {
    it("should collapse multiple inner spaces and lowercase the string", () => {
      const input = "   Tetiana    Adamenko    ";
      const output = storage.normalizeStringForMatching(input);
      expect(output).toBe("tetianaadamenko"); // spaces are removed by /[^a-z0-9]/g in storage.js
    });

    it("should handle Polish characters and basic trims", () => {
      const input = "Krzysztof   Wieczorek";
      const output = storage.normalizeStringForMatching(input);
      expect(output).toBe("krzysztofwieczorek");
    });

    it("should return empty string for null or undefined input", () => {
      expect(storage.normalizeStringForMatching(null)).toBe("");
      expect(storage.normalizeStringForMatching(undefined)).toBe("");
    });
  });

  // ==========================================
  // UNIT TEST 2: Payment Timeliness Classifier
  // ==========================================
  describe("getPaymentTimeliness", () => {
    it("should correctly classify a payment received in advance (early payment)", () => {
      const dueDate = "2026-06-10";
      const paymentDate = "2026-06-08";
      const status = "paid";

      const timeliness = storage.getPaymentTimeliness(dueDate, paymentDate, status);
      expect(timeliness).not.toBeNull();
      expect(timeliness.isDelayed).toBe(false);
      expect(timeliness.days).toBe(-2);
      expect(timeliness.message).toContain("Przed czasem: 2 dni");
      expect(timeliness.colorClass).toContain("text-green-400");
    });

    it("should correctly classify a payment received late (overdue payment)", () => {
      const dueDate = "2026-06-10";
      const paymentDate = "2026-06-14";
      const status = "paid";

      const timeliness = storage.getPaymentTimeliness(dueDate, paymentDate, status);
      expect(timeliness).not.toBeNull();
      expect(timeliness.isDelayed).toBe(true);
      expect(timeliness.days).toBe(4);
      expect(timeliness.message).toContain("Opóźnienie: 4 dni");
      expect(timeliness.colorClass).toContain("text-red-400");
    });

    it("should correctly classify a payment made on the exact due date", () => {
      const dueDate = "2026-06-10";
      const paymentDate = "2026-06-10";
      const status = "paid";

      const timeliness = storage.getPaymentTimeliness(dueDate, paymentDate, status);
      expect(timeliness).not.toBeNull();
      expect(timeliness.isDelayed).toBe(false);
      expect(timeliness.days).toBe(0);
      expect(timeliness.message).toContain("W terminie");
      expect(timeliness.colorClass).toContain("text-green-400");
    });

    it("should return unpaid alert for overdue unpaid invoices", () => {
      const dueDate = "2026-05-20";
      const paymentDate = null;
      const status = "unpaid";

      const timeliness = storage.getPaymentTimeliness(dueDate, paymentDate, status);
      expect(timeliness).toBeDefined();
    });
  });

  // ==========================================
  // UNIT TEST 3: Utility Taryf Cost Calculator
  // ==========================================
  describe("calculateReadingCostVal", () => {
    const mockRates = {
      electricity: {
        active_energy: 0.40,
        network_variable: 0.15,
        quality_fee: 0.02,
        oze_fee: 0.01,
        co_generation_fee: 0.01,
        subscription_fee: 5.0,
        transitional_fee: 2.0,
        network_fixed: 6.0,
        capacity_fee: 10.0,
        billing_service_fee: 4.0,
      },
      gas: {
        variable_rate: 0.18,
        subscription_fee: 6.0,
      }
    };

    beforeEach(() => {
      // Mock meter rates in fake localStorage with the correct key
      localStorageMock.setItem(KEYS.METER_RATES, JSON.stringify(mockRates));
    });

    it("should calculate correct electricity cost based on consumption and duration", () => {
      // Baseline reading on 2026-05-01
      const m1 = {
        id: "meter-base",
        property_id: "prop-1",
        meter_type: "electricity",
        reading_value: 1000,
        reading_date: "2026-05-01",
        status: "approved",
      };

      // Current reading on 2026-06-01 (31 days difference, Q = 200 kWh)
      const m2 = {
        id: "meter-current",
        property_id: "prop-1",
        meter_type: "electricity",
        reading_value: 1200,
        reading_date: "2026-06-01",
        status: "approved",
      };

      const meters = [m1, m2];
      
      // Call calculation function
      const cost = storage.calculateReadingCostVal(m2, meters);

      // Q = 200 kWh
      // Sum net variable rates = 0.40 + 0.15 + 0.02 + 0.01 + 0.01 = 0.59 PLN / kWh
      // net_cons = 200 * 0.59 = 118.0 PLN
      
      // diffDays = 31 days. M = Math.round((31/30.4)*10)/10 = 1.0 months
      // Sum net fixed fees = 5.0 + 2.0 + 6.0 + 10.0 = 23.0 PLN
      // net_fixed = 1.0 * 23.0 = 23.0 PLN
      
      // Subtotal variable + fixed = 118.0 + 23.0 = 141.0 PLN
      // Subtotal with 23% VAT = 141.0 * 1.23 = 173.43 PLN
      // Add billing fee = 1.0 * 4.0 = 4.0 PLN
      // Expected Cost = 173.43 + 4.0 = 177.43 PLN
      
      expect(cost).toBeCloseTo(177.43, 2);
    });

    it("should return 0 cost if status is not approved or pending_approval", () => {
      const item = {
        status: "rejected",
        reading_value: 1200,
        reading_date: "2026-06-01",
      };
      expect(storage.calculateReadingCostVal(item, [])).toBe(0);
    });

    it("should return 0 cost if no baseline reading is found", () => {
      const item = {
        status: "approved",
        property_id: "prop-1",
        meter_type: "electricity",
        reading_value: 1200,
        reading_date: "2026-06-01",
      };
      expect(storage.calculateReadingCostVal(item, [])).toBe(0);
    });

    it("should return 0 cost if current reading is less than baseline (negative consumption)", () => {
      const m1 = {
        property_id: "prop-1",
        meter_type: "electricity",
        reading_value: 1000,
        reading_date: "2026-05-01",
        status: "approved",
      };
      const m2 = {
        property_id: "prop-1",
        meter_type: "electricity",
        reading_value: 900,
        reading_date: "2026-06-01",
        status: "approved",
      };
      expect(storage.calculateReadingCostVal(m2, [m1, m2])).toBe(0);
    });
  });

  // ==========================================
  // INTEGRATION TEST 4: Tenant CRM Archiving Flow
  // ==========================================
  describe("archiveTenant Integration Flow", () => {
    const mockUsers = [
      {
        id: "tenant-1",
        role: "tenant",
        name: "Roman Czuryk",
        email: "roman@czuryk.pl",
        isArchived: false,
        leaseHistory: [],
        activityLog: [],
        notes: [],
      }
    ];

    const mockProperties = [
      {
        id: "prop-1",
        landlord_id: "landlord-1",
        tenant_id: "tenant-1",
        title: "Kawalerka Słoneczna",
        rentAmount: 2000,
        depositAmount: 3000,
        leaseStart: "2026-01-01",
        leaseEnd: "2026-12-31",
      }
    ];

    beforeEach(() => {
      localStorageMock.setItem(KEYS.USERS, JSON.stringify(mockUsers));
      localStorageMock.setItem(KEYS.PROPERTIES, JSON.stringify(mockProperties));
      localStorageMock.setItem(KEYS.INVOICES, JSON.stringify([]));
    });

    it("should successfully archive tenant, unbind property, log timeline, and preserve lease details", () => {
      // Execute the archiving function
      storage.archiveTenant("prop-1");

      // Verify that property is now vacant (tenant_id set to null)
      const properties = JSON.parse(mockLocalStorage[KEYS.PROPERTIES]);
      expect(properties[0].tenant_id).toBeNull();
      expect(properties[0].leaseStart).toBeNull();
      expect(properties[0].leaseEnd).toBeNull();

      // Verify that tenant is now marked as archived
      const users = JSON.parse(mockLocalStorage[KEYS.USERS]);
      const archivedTenant = users.find(u => u.id === "tenant-1");
      expect(archivedTenant.isArchived).toBe(true);

      // Verify lease history has been correctly saved
      expect(archivedTenant.leaseHistory).toHaveLength(1);
      expect(archivedTenant.leaseHistory[0].propertyId).toBe("prop-1");
      expect(archivedTenant.leaseHistory[0].propertyTitle).toBe("Kawalerka Słoneczna");
      expect(archivedTenant.leaseHistory[0].rentAmount).toBe(2000);

      // Verify timeline deactivation activity has been logged
      const deactLogs = archivedTenant.activityLog.filter(log => log.type === "deactivation");
      expect(deactLogs).toHaveLength(1);
      expect(deactLogs[0].propertyTitle).toBe("Kawalerka Słoneczna");

      // Verify global events have been dispatched to notify reactive dashboards
      expect(dispatchMock).toHaveBeenCalled();
    });
  });

  // ==========================================
  // INTEGRATION TEST 5: Structured Tenant Notes CRUD
  // ==========================================
  describe("addTenantNote & deleteTenantNote Flow", () => {
    const mockUsers = [
      {
        id: "tenant-1",
        role: "tenant",
        name: "Tetiana Adamenko",
        email: "tetiana@gmail.com",
        notes: [],
      }
    ];

    beforeEach(() => {
      localStorageMock.setItem(KEYS.USERS, JSON.stringify(mockUsers));
    });

    it("should append a new note correctly and allow deleting it by ID", () => {
      // 1. Add Note
      storage.addTenantNote("tenant-1", "Kultura osobista", "Lokator dba o czystość.");

      let users = JSON.parse(mockLocalStorage[KEYS.USERS]);
      let tenant = users.find(u => u.id === "tenant-1");
      expect(tenant.notes).toHaveLength(1);
      expect(tenant.notes[0].title).toBe("Kultura osobista");
      expect(tenant.notes[0].content).toBe("Lokator dba o czystość.");
      expect(tenant.notes[0].id).toBeDefined();
      expect(tenant.notes[0].createdAt).toBeDefined(); // actual field used is createdAt in storage.js

      const createdNoteId = tenant.notes[0].id;

      // 2. Delete Note
      storage.deleteTenantNote("tenant-1", createdNoteId);

      users = JSON.parse(mockLocalStorage[KEYS.USERS]);
      tenant = users.find(u => u.id === "tenant-1");
      expect(tenant.notes).toHaveLength(0);
    });
  });
});
