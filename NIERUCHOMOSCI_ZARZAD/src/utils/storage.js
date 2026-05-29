import {
  MOCK_USERS,
  MOCK_PROPERTIES,
  MOCK_INVOICES,
  MOCK_METERS,
  MOCK_MESSAGES,
  MOCK_DOCUMENTS,
  MOCK_EXPENSES
} from "./mockData";

const KEYS = {
  USERS: "rentportal_users_v3",
  PROPERTIES: "rentportal_properties_v3",
  INVOICES: "rentportal_invoices_v3",
  METERS: "rentportal_meters_v3",
  MESSAGES: "rentportal_messages_v3",
  DOCUMENTS: "rentportal_documents_v3",
  EXPENSES: "rentportal_expenses_v3",
  SESSION: "rentportal_session_v3"
};

// Initialize LocalStorage with mock data if keys do not exist
export const initializeStorage = () => {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem(KEYS.PROPERTIES)) {
    localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(MOCK_PROPERTIES));
  }
  if (!localStorage.getItem(KEYS.INVOICES)) {
    localStorage.setItem(KEYS.INVOICES, JSON.stringify(MOCK_INVOICES));
  }
  if (!localStorage.getItem(KEYS.METERS)) {
    localStorage.setItem(KEYS.METERS, JSON.stringify(MOCK_METERS));
  }
  if (!localStorage.getItem(KEYS.MESSAGES)) {
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(MOCK_MESSAGES));
  }
  if (!localStorage.getItem(KEYS.DOCUMENTS)) {
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(MOCK_DOCUMENTS));
  }
  if (!localStorage.getItem(KEYS.EXPENSES)) {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(MOCK_EXPENSES));
  }
  // Auto-login Krzysztof (landlord u1) if no session exists
  if (!localStorage.getItem(KEYS.SESSION)) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(MOCK_USERS[0]));
  }
};

const getItems = (key) => {
  initializeStorage();
  const data = localStorage.getItem(key);
  let items = data ? JSON.parse(data) : [];
  
  if (key === KEYS.INVOICES) {
    let updated = false;
    const nextItems = items.map(inv => {
      let isChanged = false;
      let amountRent = inv.amountRent;
      let amountAdmin = inv.amountAdmin !== undefined ? inv.amountAdmin : 0;
      let amountUtilities = inv.amountUtilities !== undefined ? inv.amountUtilities : 0;

      if (amountRent === undefined) {
        isChanged = true;
        const propsData = localStorage.getItem(KEYS.PROPERTIES);
        const properties = propsData ? JSON.parse(propsData) : [];
        const prop = properties.find(p => p.id === inv.property_id);
        const propRent = prop ? prop.rentAmount : inv.amount;
        
        amountRent = Math.min(propRent, inv.amount);
        amountAdmin = 0;
        amountUtilities = Math.max(0, inv.amount - amountRent);
      }

      // If invoice is unpaid, dynamically sync media costs with approved meter readings for its target billing month
      if (inv.status !== "paid" && inv.issueDate) {
        const targetMonth = inv.issueDate.slice(0, 7); // "YYYY-MM"
        const metersData = localStorage.getItem(KEYS.METERS);
        const allMeters = metersData ? JSON.parse(metersData) : [];
        
        // Filter approved meters for this property in targetMonth
        const approvedMetersInMonth = allMeters.filter(m => 
          m.property_id === inv.property_id && 
          m.status === "approved" && 
          m.reading_date.startsWith(targetMonth)
        );

        // Sum up costs in real-time
        const calculatedMedia = approvedMetersInMonth.reduce((sum, item) => {
          const prevReadingObj = allMeters
            .filter(m => 
              m.property_id === item.property_id && 
              m.meter_type === item.meter_type && 
              (m.status === "approved" || m.status === "pending_approval") && 
              new Date(m.reading_date) < new Date(item.reading_date)
            )
            .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))[0];

          if (!prevReadingObj) return sum;

          const Q = Number(item.reading_value) - Number(prevReadingObj.reading_value);
          if (Q <= 0) return sum;

          const diffTime = new Date(item.reading_date).getTime() - new Date(prevReadingObj.reading_date).getTime();
          const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          const M = Math.round((diffDays / 30.4) * 10) / 10 || 1.0;

          // Load rates
          const storedRates = localStorage.getItem("rentportal_meter_rates");
          const DEFAULT_RATES = {
            electricity: {
              active_energy: 0.51,
              network_variable: 0.35,
              quality_fee: 0.332,
              oze_fee: 0.073,
              co_generation_fee: 0.03,
              subscription_fee: 0.8,
              transitional_fee: 0.33,
              network_fixed: 7.83,
              capacity_fee: 17.18,
              billing_service_fee: 15.00
            },
            gas: {
              variable_distribution: 0.20,
              gas_fuel: 0.33,
              handling_fee: 5.20,
              fixed_distribution: 7.20
            }
          };
          const rates = storedRates ? JSON.parse(storedRates) : DEFAULT_RATES;
          const electricityRates = { ...DEFAULT_RATES.electricity, ...(rates.electricity || {}) };
          const gasRates = { ...DEFAULT_RATES.gas, ...(rates.gas || {}) };

          let cost = 0;
          if (item.meter_type === "electricity") {
            const net_cons = Q * (
              Number(electricityRates.active_energy || 0) + 
              Number(electricityRates.network_variable || 0) + 
              Number(electricityRates.quality_fee || 0) + 
              Number(electricityRates.oze_fee || 0) + 
              Number(electricityRates.co_generation_fee || 0)
            );
            const net_fixed = M * (
              Number(electricityRates.subscription_fee || 0) + 
              Number(electricityRates.transitional_fee || 0) + 
              Number(electricityRates.network_fixed || 0) + 
              Number(electricityRates.capacity_fee || 0)
            );
            cost = (net_cons + net_fixed) * 1.23 + (M * Number(electricityRates.billing_service_fee || 0));
          } else if (item.meter_type === "gas") {
            const net_cons = Q * (
              Number(gasRates.variable_distribution || 0) + 
              Number(gasRates.gas_fuel || 0)
            );
            const net_fixed = M * (
              Number(gasRates.handling_fee || 0) + 
              Number(gasRates.fixed_distribution || 0)
            );
            cost = (net_cons + net_fixed) * 1.23;
          } else if (item.meter_type === "water_cold") {
            cost = Q * 12.0;
          } else if (item.meter_type === "water_hot") {
            cost = Q * 35.0;
          } else if (item.meter_type === "heating") {
            cost = Q * 80.0;
          }
          return sum + cost;
        }, 0);

        const roundedMedia = Math.round(calculatedMedia * 100) / 100;
        if (roundedMedia !== amountUtilities) {
          amountUtilities = roundedMedia;
          isChanged = true;
        }
      }

      if (isChanged || inv.amountRent === undefined) {
        updated = true;
        const amount = amountRent + amountAdmin + amountUtilities;
        return {
          ...inv,
          amountRent,
          amountAdmin,
          amountUtilities,
          amount,
          receivedPayment: inv.status === "paid" ? amount : inv.receivedPayment || 0
        };
      }
      return inv;
    });

    if (updated) {
      localStorage.setItem(KEYS.INVOICES, JSON.stringify(nextItems));
      return nextItems;
    }
  }
  return items;
};

const saveItems = (key, items) => {
  localStorage.setItem(key, JSON.stringify(items));
};

// ==========================================
// SESSION MANAGEMENT (SIMULATION)
// ==========================================
export const getActiveUser = () => {
  initializeStorage();
  const data = localStorage.getItem(KEYS.SESSION);
  return data ? JSON.parse(data) : null;
};

export const switchSessionUser = (userId) => {
  const users = getItems(KEYS.USERS);
  const user = users.find(u => u.id === userId);
  if (user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    return user;
  }
  throw new Error("Użytkownik nie istnieje.");
};

// ==========================================
// USERS
// ==========================================
export const getUsers = () => getItems(KEYS.USERS);

export const getUserById = (id) => {
  return getUsers().find(u => u.id === id) || null;
};

export const getTenants = () => {
  return getUsers().filter(u => u.role === "tenant" && !u.isArchived);
};

export const addTenant = (tenantData) => {
  const users = getItems(KEYS.USERS);
  
  if (users.some(u => u.email.toLowerCase() === tenantData.email.toLowerCase())) {
    throw new Error("Użytkownik z tym adresem e-mail już istnieje.");
  }

  const newTenant = {
    ...tenantData,
    id: `u-${Date.now()}`,
    passwordHash: "123",
    role: "tenant",
    property_id: null,
    createdAt: new Date().toISOString()
  };

  users.push(newTenant);
  saveItems(KEYS.USERS, users);
  return newTenant;
};

// ==========================================
// PROPERTIES
// ==========================================
export const getProperties = () => getItems(KEYS.PROPERTIES);

export const getPropertyById = (id) => {
  return getProperties().find(p => p.id === id) || null;
};

export const getPropertiesByLandlord = (landlordId) => {
  return getProperties().filter(p => p.landlord_id === landlordId);
};

export const getPropertiesByTenant = (tenantId) => {
  return getProperties().filter(p => p.tenant_id === tenantId);
};

export const addProperty = (propertyData) => {
  const properties = getProperties();
  const newProperty = {
    ...propertyData,
    id: `m-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  properties.push(newProperty);
  saveItems(KEYS.PROPERTIES, properties);
  return newProperty;
};

export const updatePropertyTenant = (propertyId, tenantId, leaseStart = null, leaseEnd = null, rentAmount = null, paymentDueDay = null) => {
  const properties = getProperties();
  const users = getItems(KEYS.USERS);
  
  const propIndex = properties.findIndex(p => p.id === propertyId);
  if (propIndex === -1) throw new Error("Nieruchomość nie istnieje.");
  
  // Clean old tenant property reference
  const oldTenantId = properties[propIndex].tenant_id;
  const updatedUsers = users.map(u => {
    if (oldTenantId && u.id === oldTenantId) {
      return { ...u, property_id: null };
    }
    if (tenantId && u.id === tenantId) {
      return { ...u, property_id: propertyId };
    }
    return u;
  });

  properties[propIndex] = {
    ...properties[propIndex],
    tenant_id: tenantId,
    leaseStart,
    leaseEnd
  };

  if (rentAmount !== null) {
    properties[propIndex].rentAmount = Number(rentAmount);
  }
  if (paymentDueDay !== null) {
    properties[propIndex].paymentDueDay = Number(paymentDueDay);
  } else if (tenantId === null) {
    properties[propIndex].paymentDueDay = null;
  }

  saveItems(KEYS.PROPERTIES, properties);
  saveItems(KEYS.USERS, updatedUsers);
  return properties[propIndex];
};

// ==========================================
// INVOICES
// ==========================================
export const getInvoices = () => getItems(KEYS.INVOICES);

export const getInvoiceById = (id) => {
  return getInvoices().find(i => i.id === id) || null;
};

export const getInvoicesForTenant = (tenantId) => {
  return getInvoices().filter(i => i.tenant_id === tenantId);
};

export const getInvoicesForLandlord = (landlordId) => {
  return getInvoices().filter(i => i.landlord_id === landlordId);
};

export const addInvoice = (invoiceData) => {
  const invoices = getInvoices();
  
  const property = getPropertyById(invoiceData.property_id);
  if (!property) throw new Error("Powiązana nieruchomość nie istnieje.");

  const seq = String(invoices.length + 1).padStart(3, '0');
  const newInvoice = {
    ...invoiceData,
    id: `inv_${seq}_${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  };

  invoices.push(newInvoice);
  saveItems(KEYS.INVOICES, invoices);
  return newInvoice;
};

export const bookInvoicePayment = (invoiceId, receivedAmount, paymentDate = null, notes = null) => {
  const invoices = getInvoices();
  const index = invoices.findIndex(i => i.id === invoiceId);
  if (index === -1) throw new Error("Faktura nie istnieje.");

  const amt = Number(receivedAmount);
  const totalAmount = invoices[index].amount;
  const resolvedPaymentDate = paymentDate || new Date().toISOString().split('T')[0];

  invoices[index] = {
    ...invoices[index],
    receivedPayment: amt,
    status: amt >= totalAmount ? "paid" : "unpaid",
    paymentDate: resolvedPaymentDate
  };

  if (notes !== null) {
    invoices[index].notes = notes;
  }

  saveItems(KEYS.INVOICES, invoices);
  return invoices[index];
};

// ==========================================
// METERS
// ==========================================
export const getMeters = () => getItems(KEYS.METERS);

export const getMetersByProperty = (propertyId) => {
  return getMeters().filter(m => m.property_id === propertyId);
};

export const getLatestMeterReading = (propertyId, meterType) => {
  const readings = getMeters()
    .filter(m => m.property_id === propertyId && m.meter_type === meterType && m.status === "approved")
    .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date));
  return readings[0] || null;
};

export const addMeterReading = (readingData) => {
  const meters = getMeters();

  const property = getPropertyById(readingData.property_id);
  if (!property) throw new Error("Nieruchomość nie istnieje.");

  // Validation
  const latestApproved = getLatestMeterReading(readingData.property_id, readingData.meter_type);
  if (latestApproved && Number(readingData.reading_value) < Number(latestApproved.reading_value)) {
    throw new Error(
      `Nowy odczyt (${readingData.reading_value}) nie może być niższy niż poprzedni zatwierdzony odczyt (${latestApproved.reading_value}) z dnia ${latestApproved.reading_date}.`
    );
  }

  const newReading = {
    ...readingData,
    id: `met-${Date.now()}`,
    reading_value: Number(readingData.reading_value),
    createdAt: new Date().toISOString()
  };

  meters.push(newReading);
  saveItems(KEYS.METERS, meters);
  return newReading;
};

export const approveMeterReading = (meterId) => {
  const meters = getMeters();
  const index = meters.findIndex(m => m.id === meterId);
  if (index === -1) throw new Error("Odczyt nie istnieje.");

  meters[index] = {
    ...meters[index],
    status: "approved"
  };
  saveItems(KEYS.METERS, meters);
  return meters[index];
};

export const rejectMeterReading = (meterId) => {
  const meters = getMeters();
  const index = meters.findIndex(m => m.id === meterId);
  if (index === -1) throw new Error("Odczyt nie istnieje.");

  meters[index] = {
    ...meters[index],
    status: "rejected"
  };
  saveItems(KEYS.METERS, meters);
  return meters[index];
};

// ==========================================
// MESSAGES
// ==========================================
export const getMessages = () => getItems(KEYS.MESSAGES);

export const getMessagesBetweenUsers = (userAId, userBId) => {
  return getMessages().filter(m => 
    (m.sender_id === userAId && m.receiver_id === userBId) ||
    (m.sender_id === userBId && m.receiver_id === userAId)
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export const sendMessage = (messageData) => {
  const messages = getMessages();
  const newMsg = {
    ...messageData,
    id: `msg_${Date.now()}`,
    isRead: false,
    timestamp: new Date().toISOString()
  };
  messages.push(newMsg);
  saveItems(KEYS.MESSAGES, messages);
  return newMsg;
};

export const markMessagesAsRead = (senderId, receiverId, subject) => {
  const messages = getMessages();
  let updated = false;
  const nextMessages = messages.map(m => {
    if (m.sender_id === senderId && m.receiver_id === receiverId && m.subject === subject && !m.isRead) {
      updated = true;
      return { ...m, isRead: true };
    }
    return m;
  });
  if (updated) {
    saveItems(KEYS.MESSAGES, nextMessages);
  }
};

// ==========================================
// DOCUMENTS
// ==========================================
export const getDocuments = () => getItems(KEYS.DOCUMENTS);

export const getDocumentsForTenant = (tenantId) => {
  return getDocuments().filter(d => d.tenant_id === tenantId);
};

export const getDocumentsForProperty = (propertyId) => {
  return getDocuments().filter(d => d.property_id === propertyId);
};

export const addDocument = (docData) => {
  const docs = getDocuments();
  const newDoc = {
    ...docData,
    id: `doc-${Date.now()}`,
    uploaded_at: new Date().toISOString()
  };
  docs.push(newDoc);
  saveItems(KEYS.DOCUMENTS, docs);
  return newDoc;
};

export const deleteDocument = (docId) => {
  const docs = getDocuments();
  const filtered = docs.filter(d => d.id !== docId);
  saveItems(KEYS.DOCUMENTS, filtered);
};

// Converts Base64 DataURL into a trusted browser Blob URL and opens it safely in a new tab
export const openDocumentFile = (base64Data, fileName) => {
  try {
    // If not a data URL, fallback directly to simple window.open
    if (!base64Data.startsWith("data:")) {
      window.open(base64Data, "_blank");
      return;
    }

    const arr = base64Data.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    
    // Open in new tab by creating a virtual trusted link
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory cache after short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
  } catch (err) {
    console.error("[RentPortal] Error rendering Base64 PDF to Blob URL:", err);
    // Fallback: Force a direct file download link
    const link = document.createElement("a");
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const getExpenses = () => getItems(KEYS.EXPENSES);

export const addExpense = (expenseData) => {
  const expenses = getExpenses();
  const newExpense = {
    ...expenseData,
    id: `exp-${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  expenses.push(newExpense);
  saveItems(KEYS.EXPENSES, expenses);
  return newExpense;
};

export const deleteExpense = (expenseId) => {
  const expenses = getExpenses();
  const filtered = expenses.filter(e => e.id !== expenseId);
  saveItems(KEYS.EXPENSES, filtered);
};

export const getPaymentTimeliness = (dueDateStr, paymentDateStr, status) => {
  if (!dueDateStr) return null;
  
  const due = new Date(dueDateStr);
  due.setHours(0,0,0,0);
  
  if (status === "paid" && paymentDateStr) {
    const payment = new Date(paymentDateStr);
    payment.setHours(0,0,0,0);
    
    // Difference in milliseconds
    const diffTime = payment.getTime() - due.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return {
        isDelayed: true,
        days: diffDays,
        message: `Opóźnienie: ${diffDays} dni`,
        colorClass: "text-red-400 font-bold"
      };
    } else if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return {
        isDelayed: false,
        days: diffDays,
        message: `Przed czasem: ${absDays} dni`,
        colorClass: "text-green-400 font-bold"
      };
    } else {
      return {
        isDelayed: false,
        days: 0,
        message: "W terminie (o czasie)",
        colorClass: "text-green-400 font-bold"
      };
    }
  } else {
    // Unpaid
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return {
        isDelayed: true,
        days: diffDays,
        message: `Zaległość: ${diffDays} dni`,
        colorClass: "text-red-400 font-bold animate-pulse"
      };
    } else {
      const absDays = Math.abs(diffDays);
      return {
        isDelayed: false,
        days: diffDays,
        message: diffDays === 0 ? "Termin dzisiaj" : `Pozostało: ${absDays} dni`,
        colorClass: "text-green-400 font-bold"
      };
    }
  }
};

// ==========================================
// METER RATES & MEDIA UTILITY COST CALCULATION
// ==========================================
export const getMeterRates = () => {
  const DEFAULT_RATES = {
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
  const stored = localStorage.getItem("rentportal_meter_rates");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        return {
          electricity: { ...DEFAULT_RATES.electricity, ...(parsed.electricity || {}) },
          gas: { ...DEFAULT_RATES.gas, ...(parsed.gas || {}) }
        };
      }
    } catch (e) {
      console.error("Failed to parse stored meter rates in storage.js", e);
    }
  }
  return DEFAULT_RATES;
};

export const calculateReadingCostVal = (item, meters = null) => {
  // We want to calculate the cost even if pending, for preview, so we check status is approved or pending_approval
  if (item.status !== "approved" && item.status !== "pending_approval") return 0;
  
  const allMeters = meters || getMeters();
  const prevReadingObj = allMeters
    .filter(m => 
      m.property_id === item.property_id && 
      m.meter_type === item.meter_type && 
      (m.status === "approved" || m.status === "pending_approval") && 
      new Date(m.reading_date) < new Date(item.reading_date)
    )
    .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))[0];

  if (!prevReadingObj) return 0;

  const Q = Number(item.reading_value) - Number(prevReadingObj.reading_value);
  if (Q <= 0) return 0;

  const diffTime = new Date(item.reading_date).getTime() - new Date(prevReadingObj.reading_date).getTime();
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  const M = Math.round((diffDays / 30.4) * 10) / 10 || 1.0;

  const rates = getMeterRates();

  if (item.meter_type === "electricity") {
    const net_cons = Q * (
      Number(rates.electricity.active_energy || 0) + 
      Number(rates.electricity.network_variable || 0) + 
      Number(rates.electricity.quality_fee || 0) + 
      Number(rates.electricity.oze_fee || 0) + 
      Number(rates.electricity.co_generation_fee || 0)
    );
    const net_fixed = M * (
      Number(rates.electricity.subscription_fee || 0) + 
      Number(rates.electricity.transitional_fee || 0) + 
      Number(rates.electricity.network_fixed || 0) + 
      Number(rates.electricity.capacity_fee || 0)
    );
    return (net_cons + net_fixed) * 1.23 + (M * Number(rates.electricity.billing_service_fee || 0));
  } else if (item.meter_type === "gas") {
    const net_cons = Q * (
      Number(rates.gas.variable_distribution || 0) + 
      Number(rates.gas.gas_fuel || 0)
    );
    const net_fixed = M * (
      Number(rates.gas.handling_fee || 0) + 
      Number(rates.gas.fixed_distribution || 0)
    );
    return (net_cons + net_fixed) * 1.23;
  } else if (item.meter_type === "water_cold") {
    return Q * 12.0;
  } else if (item.meter_type === "water_hot") {
    return Q * 35.0;
  } else if (item.meter_type === "heating") {
    return Q * 80.0;
  }
  return 0;
};

export const getMediaCostForPropertyAndMonth = (propertyId, monthStr) => {
  // monthStr is e.g. "2026-05"
  const allMeters = getMeters();
  const approvedMetersInMonth = allMeters.filter(m => 
    m.property_id === propertyId && 
    m.status === "approved" && 
    m.reading_date.startsWith(monthStr)
  );

  return approvedMetersInMonth.reduce((sum, item) => {
    return sum + calculateReadingCostVal(item, allMeters);
  }, 0);
};

export const archiveTenant = (propertyId) => {
  const properties = getProperties();
  const users = getItems(KEYS.USERS);

  const propIndex = properties.findIndex(p => p.id === propertyId);
  if (propIndex === -1) throw new Error("Nieruchomość nie istnieje.");
  
  const tenantId = properties[propIndex].tenant_id;
  if (!tenantId) throw new Error("Mieszkanie nie ma aktywnego lokatora do zarchiwizowania.");

  const userIndex = users.findIndex(u => u.id === tenantId);
  if (userIndex === -1) throw new Error("Lokator nie istnieje w bazie danych.");

  const prop = properties[propIndex];
  const user = users[userIndex];

  // Append history record
  const leaseHistoryEntry = {
    propertyId: prop.id,
    propertyTitle: prop.title,
    address: prop.address,
    city: prop.city,
    rentAmount: prop.rentAmount,
    depositAmount: prop.depositAmount,
    leaseStart: prop.leaseStart,
    leaseEnd: prop.leaseEnd,
    archivedAt: new Date().toISOString()
  };

  const currentHistory = user.leaseHistory || [];
  user.leaseHistory = [...currentHistory, leaseHistoryEntry];
  user.isArchived = true;
  user.property_id = null;

  // Unlink property
  properties[propIndex] = {
    ...prop,
    tenant_id: null,
    leaseStart: null,
    leaseEnd: null,
    paymentDueDay: null
  };

  saveItems(KEYS.PROPERTIES, properties);
  saveItems(KEYS.USERS, users);

  // Dispatch events to force UI re-renders
  window.dispatchEvent(new Event("rentportal_properties_updated"));
  window.dispatchEvent(new Event("rentportal_users_updated"));

  return { property: properties[propIndex], tenant: users[userIndex] };
};

export const addTenantNote = (tenantId, title, content) => {
  const users = getItems(KEYS.USERS);
  const userIndex = users.findIndex(u => u.id === tenantId);
  if (userIndex === -1) throw new Error("Lokator nie istnieje w bazie.");

  const newNote = {
    id: `note-${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  const currentNotes = users[userIndex].notes || [];
  users[userIndex].notes = [...currentNotes, newNote];

  saveItems(KEYS.USERS, users);
  window.dispatchEvent(new Event("rentportal_users_updated"));
  return newNote;
};

export const deleteTenantNote = (tenantId, noteId) => {
  const users = getItems(KEYS.USERS);
  const userIndex = users.findIndex(u => u.id === tenantId);
  if (userIndex === -1) throw new Error("Lokator nie istnieje w bazie.");

  const currentNotes = users[userIndex].notes || [];
  users[userIndex].notes = currentNotes.filter(n => n.id !== noteId);

  saveItems(KEYS.USERS, users);
  window.dispatchEvent(new Event("rentportal_users_updated"));
};

export const updateUserProfile = (userId, profileData) => {
  const users = getItems(KEYS.USERS);
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) throw new Error("Użytkownik nie istnieje.");

  users[index] = {
    ...users[index],
    ...profileData
  };

  saveItems(KEYS.USERS, users);

  // If this was the current session user, update session as well
  const sessionData = localStorage.getItem(KEYS.SESSION);
  if (sessionData) {
    const sessionUser = JSON.parse(sessionData);
    if (sessionUser.id === userId) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(users[index]));
    }
  }

  // Dispatch both events to refresh all components
  window.dispatchEvent(new Event("rentportal_users_updated"));
  window.dispatchEvent(new Event("rentportal_session_updated"));
  
  return users[index];
};


