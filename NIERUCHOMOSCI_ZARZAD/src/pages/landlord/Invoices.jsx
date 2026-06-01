import React, { useState, useEffect } from "react";
import { validateInvoiceInputs, calculatePDFStatementTotals } from "../../services/billingService";
import { 
  getInvoices, 
  bookInvoicePayment, 
  addInvoice, 
  getPropertiesByLandlord,
  getUserById,
  getPropertyById,
  getExpenses,
  addExpense,
  deleteExpense,
  getPaymentTimeliness,
  getMediaCostForPropertyAndMonth,
  getUsers,
  addTenant,
  updatePropertyTenant,
  addMeterReading,
  updateUserProfile,
  getDocuments,
  addDocument,
  deleteDocument,
  openDocumentFile,
  deleteInvoice,
  downloadDocumentFile,
  sendMessage
} from "../../utils/storage";
import { CreditCard, Plus, Check, Calendar, PlusCircle, AlertTriangle, CheckCircle, FileText, Info, X, Sparkles, Trash2, Coins, TrendingUp, History, UserPlus, Database, Layers, Eye, Send, Download } from "lucide-react";


export default function LandlordInvoices({ landlordId }) {
  const [invoices, setInvoices] = useState([]);
  const [properties, setProperties] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [amountRent, setAmountRent] = useState("");
  const [amountAdmin, setAmountAdmin] = useState("");
  const [amountUtilities, setAmountUtilities] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [adminFeeLoadedStatus, setAdminFeeLoadedStatus] = useState("");
  const [mediaFeeLoadedStatus, setMediaFeeLoadedStatus] = useState("");

  // Admin fees configuration panel state
  const [adminFeesMonth, setAdminFeesMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [adminFeesValues, setAdminFeesValues] = useState({});
  const [adminFeesSavedState, setAdminFeesSavedState] = useState({});

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingInvoice, setBookingInvoice] = useState(null);
  const [bookingAmount, setBookingAmount] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  // Payments registry PDF compilation report states
  const [showInvoiceReportModal, setShowInvoiceReportModal] = useState(false);
  const [reportSendingTenantId, setReportSendingTenantId] = useState("");
  const [isGeneratingInvoiceReport, setIsGeneratingInvoiceReport] = useState(false);

  // Filter states
  const [filterPropertyId, setFilterPropertyId] = useState("all");
  const [filterTenantId, setFilterTenantId] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Expense states
  const [expenses, setExpenses] = useState([]);
  const [expensePropertyId, setExpensePropertyId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("renovation");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [customPropertyValue, setCustomPropertyValue] = useState(null);
  const [customEquityValue, setCustomEquityValue] = useState(null);
  const [showRoiSettings, setShowRoiSettings] = useState(false);
  const [roiError, setRoiError] = useState("");

  const getResolvedPropertyValue = () => {
    let resolvedVal = 0;
    if (filterPropertyId !== "all") {
      const prop = allLandlordProperties.find(p => p.id === filterPropertyId);
      if (prop) {
        const isM1 = prop.id === "m1";
        const isM2 = prop.id === "m2";
        resolvedVal = isM1 ? 650000 : (isM2 ? 450000 : prop.rentAmount * 240);
      }
    } else {
      allLandlordProperties.forEach(p => {
        const isM1 = p.id === "m1";
        const isM2 = p.id === "m2";
        const val = isM1 ? 650000 : (isM2 ? 450000 : p.rentAmount * 240);
        resolvedVal += val;
      });
      if (resolvedVal === 0) {
        resolvedVal = 1100000;
      }
    }
    return resolvedVal;
  };

  const handlePropertyValueChange = (val) => {
    setRoiError("");
    try {
      if (val === "") {
        setCustomPropertyValue(null);
        return;
      }
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error("Wartość lokalu musi być liczbą.");
      }
      if (num < 0) {
        throw new Error("Wartość lokalu nie może być ujemna.");
      }
      if (customEquityValue !== null && num < customEquityValue) {
        throw new Error("Wartość lokalu nie może być mniejsza od wkładu własnego.");
      }
      setCustomPropertyValue(num);
    } catch (err) {
      setRoiError(err.message);
    }
  };

  const handleEquityValueChange = (val) => {
    setRoiError("");
    try {
      if (val === "") {
        setCustomEquityValue(null);
        return;
      }
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error("Wkład własny musi być liczbą.");
      }
      if (num < 0) {
        throw new Error("Wkład własny nie może być ujemny.");
      }
      const currentPropVal = customPropertyValue !== null ? customPropertyValue : getResolvedPropertyValue();
      if (num > currentPropVal) {
        throw new Error("Wkład własny nie może przekraczać wartości lokalu.");
      }
      setCustomEquityValue(num);
    } catch (err) {
      setRoiError(err.message);
    }
  };

  const [cashFlowReports, setCashFlowReports] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // History Wizard States
  const [showHistoryWizard, setShowHistoryWizard] = useState(false);
  const [wizardTab, setWizardTab] = useState("tenants");
  const [allLandlordProperties, setAllLandlordProperties] = useState([]);
  const [allTenants, setAllTenants] = useState([]);

  // Tab 1: Tenant & Contracts States
  const [histTenantName, setHistTenantName] = useState("");
  const [histTenantEmail, setHistTenantEmail] = useState("");
  const [histTenantPhone, setHistTenantPhone] = useState("");
  const [histTenantIdCard, setHistTenantIdCard] = useState("");
  const [histTenantAddress, setHistTenantAddress] = useState("");
  const [histRoommateName, setHistRoommateName] = useState("");
  const [histRoommatePhone, setHistRoommatePhone] = useState("");
  const [histRoommateEmail, setHistRoommateEmail] = useState("");
  const [histRoommateIdCard, setHistRoommateIdCard] = useState("");
  const [histPropertyId, setHistPropertyId] = useState("none");
  const [histLeaseStart, setHistLeaseStart] = useState("");
  const [histLeaseEnd, setHistLeaseEnd] = useState("");
  const [histRentAmount, setHistRentAmount] = useState("");
  const [histPaymentDueDay, setHistPaymentDueDay] = useState("10");

  // Tab 2: Invoices & Payments States
  const [histInvPropertyId, setHistInvPropertyId] = useState("");
  const [histInvTenantId, setHistInvTenantId] = useState("");
  const [histInvTitle, setHistInvTitle] = useState("");
  const [histInvRent, setHistInvRent] = useState("");
  const [histInvAdmin, setHistInvAdmin] = useState("");
  const [histInvUtilities, setHistInvUtilities] = useState("");
  const [histInvIssueDate, setHistInvIssueDate] = useState("");
  const [histInvDueDate, setHistInvDueDate] = useState("");
  const [histInvStatus, setHistInvStatus] = useState("paid"); // "paid" | "partial" | "unpaid"
  const [histInvReceived, setHistInvReceived] = useState("");
  const [histInvPaymentDate, setHistInvPaymentDate] = useState("");
  const [histInvNotes, setHistInvNotes] = useState("");

  // Tab 3: Meters States
  const [histMeterPropertyId, setHistMeterPropertyId] = useState("");
  const [histMeterType, setHistMeterType] = useState("electricity");
  const [histMeterNumber, setHistMeterNumber] = useState("");
  const [histMeterValue, setHistMeterValue] = useState("");
  const [histMeterDate, setHistMeterDate] = useState("");

  const handleReloadData = () => {
    setInvoices(getInvoices().sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt)));
    setExpenses(getExpenses().sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    const props = getPropertiesByLandlord(landlordId).filter(p => p.tenant_id !== null);
    setProperties(props);
    
    const allProps = getPropertiesByLandlord(landlordId);
    setAllLandlordProperties(allProps);
    setAllTenants(getUsers().filter(u => u.role === "tenant"));
    setCashFlowReports(getDocuments().filter(d => d.document_type === "cash_flow_report"));
  };

  useEffect(() => {
    handleReloadData();
    
    // Set default initial selections once
    const props = getPropertiesByLandlord(landlordId).filter(p => p.tenant_id !== null);
    if (props.length > 0) {
      setSelectedPropertyId(props[0].id);
      setAmountRent(props[0].rentAmount);
      setAmountAdmin("250"); // sensible default
      setAmountUtilities("150"); // sensible default
      setExpensePropertyId(props[0].id);
    }
  }, [landlordId]);

  useEffect(() => {
    window.addEventListener("rentportal_invoices_updated", handleReloadData);
    window.addEventListener("rentportal_properties_updated", handleReloadData);
    window.addEventListener("rentportal_users_updated", handleReloadData);
    window.addEventListener("rentportal_expenses_updated", handleReloadData);
    
    return () => {
      window.removeEventListener("rentportal_invoices_updated", handleReloadData);
      window.removeEventListener("rentportal_properties_updated", handleReloadData);
      window.removeEventListener("rentportal_users_updated", handleReloadData);
      window.removeEventListener("rentportal_expenses_updated", handleReloadData);
    };
  }, [landlordId]);

  // Load administrative fees from LocalStorage when properties or month changes
  useEffect(() => {
    const existingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
    const initialValues = {};
    properties.forEach(p => {
      const monthKey = `${p.id}_${adminFeesMonth}`;
      if (existingFees[monthKey] !== undefined) {
        initialValues[p.id] = existingFees[monthKey];
      } else if (existingFees[p.id] && existingFees[p.id].month === adminFeesMonth) {
        initialValues[p.id] = existingFees[p.id].amount;
      } else {
        initialValues[p.id] = "";
      }
    });
    setAdminFeesValues(initialValues);
  }, [adminFeesMonth, properties]);

  const handleAdminFeeChange = (propId, val) => {
    setAdminFeesValues(prev => ({
      ...prev,
      [propId]: val
    }));
  };

  const saveSingleAdminFee = (propId, val) => {
    const existingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
    const updatedFees = { ...existingFees };
    
    const monthKey = `${propId}_${adminFeesMonth}`;
    if (val !== "" && Number(val) >= 0) {
      updatedFees[monthKey] = Number(val);
      // For backward compatibility and quick lookup:
      updatedFees[propId] = {
        amount: Number(val),
        month: adminFeesMonth
      };
    } else {
      delete updatedFees[monthKey];
      if (updatedFees[propId] && updatedFees[propId].month === adminFeesMonth) {
        delete updatedFees[propId];
      }
    }

    localStorage.setItem("rentportal_pending_admin_fees", JSON.stringify(updatedFees));
    window.dispatchEvent(new Event("rentportal_admin_fees_updated"));
    
    // Show green save confirmation
    setAdminFeesSavedState(prev => ({ ...prev, [propId]: true }));
    setTimeout(() => {
      setAdminFeesSavedState(prev => ({ ...prev, [propId]: false }));
    }, 2000);
  };

  // Pre-populate tenant & rent for historical invoices based on property selection
  useEffect(() => {
    if (histInvPropertyId) {
      const prop = allLandlordProperties.find(p => p.id === histInvPropertyId);
      if (prop) {
        if (prop.tenant_id) {
          setHistInvTenantId(prop.tenant_id);
        } else {
          setHistInvTenantId("");
        }
        setHistInvRent(String(prop.rentAmount || ""));
      }
    }
  }, [histInvPropertyId, allLandlordProperties]);
  // Pre-fill received amount for paid/unpaid/partial status changes in historical wizard
  useEffect(() => {
    const total = Number(histInvRent || 0) + Number(histInvAdmin || 0) + Number(histInvUtilities || 0);
    if (histInvStatus === "paid") {
      setHistInvReceived(String(total));
    } else if (histInvStatus === "unpaid") {
      setHistInvReceived("0");
    }
  }, [histInvStatus, histInvRent, histInvAdmin, histInvUtilities]);
  // Auto-fill existing tenant details when landlord types the tenant's name in the historical wizard
  useEffect(() => {
    if (histTenantName && histTenantName.trim().length > 3) {
      const existing = getUsers().find(u => 
        u.role === "tenant" && 
        u.name.toLowerCase().trim() === histTenantName.toLowerCase().trim()
      );
      if (existing) {
        setHistTenantEmail(existing.email || "");
        setHistTenantPhone(existing.phone || "");
        setHistTenantIdCard(existing.idCard || "");
        setHistTenantAddress(existing.address || "");
        
        if (existing.roommate) {
          setHistRoommateName(existing.roommate.name || "");
          setHistRoommatePhone(existing.roommate.phone || "");
          setHistRoommateEmail(existing.roommate.email || "");
          setHistRoommateIdCard(existing.roommate.idCard || "");
        }
      }
    }
  }, [histTenantName]);

  // Pre-populate meter numbers for historical meter readings
  useEffect(() => {
    if (histMeterPropertyId && histMeterType) {
      const storedMeters = localStorage.getItem("rentportal_meters_v3");
      const allMeters = storedMeters ? JSON.parse(storedMeters) : [];
      const readings = allMeters.filter(m => m.property_id === histMeterPropertyId && m.meter_type === histMeterType);
      if (readings.length > 0) {
        setHistMeterNumber(readings[0].meter_number || "");
      } else {
        if (histMeterType === "electricity") setHistMeterNumber("L-EL-9901");
        else if (histMeterType === "gas") setHistMeterNumber("L-GAS-8802");
        else if (histMeterType === "water_cold") setHistMeterNumber("L-WC-7703");
        else if (histMeterType === "water_hot") setHistMeterNumber("L-WH-6604");
        else if (histMeterType === "heating") setHistMeterNumber("L-HEAT-5505");
      }
    }
  }, [histMeterPropertyId, histMeterType]);

  const handleHistTenantSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!histTenantName.trim()) {
      setErrorMsg("Imię i nazwisko lokatora jest wymagane.");
      return;
    }
    if (!histTenantEmail.trim()) {
      setErrorMsg("Adres e-mail jest wymagany.");
      return;
    }

    try {
      const email = histTenantEmail.trim().toLowerCase();
      const existingUser = getUsers().find(u => u.email.toLowerCase() === email);

      let tenantId = "";
      let isNew = false;

      const profileData = {
        name: histTenantName.trim(),
        email: histTenantEmail.trim(),
        phone: histTenantPhone.trim(),
        idCard: histTenantIdCard.trim(),
        address: histTenantAddress.trim(),
        isArchived: false, // Ensure they are active
        roommate: histRoommateName.trim() ? {
          name: histRoommateName.trim(),
          phone: histRoommatePhone.trim(),
          email: histRoommateEmail.trim(),
          idCard: histRoommateIdCard.trim()
        } : null
      };

      if (existingUser) {
        if (existingUser.role !== "tenant") {
          setErrorMsg(`Użytkownik z tym adresem e-mail istnieje i pełni inną rolę (${existingUser.role}).`);
          return;
        }
        // Update existing tenant profile
        updateUserProfile(existingUser.id, profileData);
        tenantId = existingUser.id;
      } else {
        // Add new tenant
        const newTenant = addTenant({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          idCard: profileData.idCard,
          address: profileData.address,
          roommate: profileData.roommate
        });
        tenantId = newTenant.id;
        isNew = true;
      }

      if (histPropertyId !== "none") {
        updatePropertyTenant(
          histPropertyId,
          tenantId,
          histLeaseStart || null,
          histLeaseEnd || null,
          histRentAmount ? Number(histRentAmount) : null,
          histPaymentDueDay ? Number(histPaymentDueDay) : 10
        );
      }

      setSuccessMsg(
        isNew 
          ? `Pomyślnie dodano lokatora ${profileData.name}!` 
          : `Pomyślnie zaktualizowano i przypisano lokatora ${profileData.name}!`
      );
      
      // Reset fields
      setHistTenantName("");
      setHistTenantEmail("");
      setHistTenantPhone("");
      setHistTenantIdCard("");
      setHistTenantAddress("");
      setHistRoommateName("");
      setHistRoommatePhone("");
      setHistRoommateEmail("");
      setHistRoommateIdCard("");
      setHistPropertyId("none");
      setHistLeaseStart("");
      setHistLeaseEnd("");
      setHistRentAmount("");
      setHistPaymentDueDay("10");

      // Refresh listings
      const updatedProps = getPropertiesByLandlord(landlordId);
      setAllLandlordProperties(updatedProps);
      setProperties(updatedProps.filter(p => p.tenant_id !== null));
      setAllTenants(getUsers().filter(u => u.role === "tenant"));
      
      window.dispatchEvent(new Event("rentportal_properties_updated"));
      window.dispatchEvent(new Event("rentportal_users_updated"));
      
      setShowHistoryWizard(false);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleHistInvoiceSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!histInvPropertyId) {
      setErrorMsg("Wybierz nieruchomość.");
      return;
    }
    if (!histInvTenantId) {
      setErrorMsg("Wybierz lokatora.");
      return;
    }
    if (!histInvTitle.trim()) {
      setErrorMsg("Podaj tytuł rachunku.");
      return;
    }
    if (!histInvIssueDate || !histInvDueDate) {
      setErrorMsg("Podaj datę wystawienia i termin płatności.");
      return;
    }

    try {
      const rent = Number(histInvRent || 0);
      const admin = Number(histInvAdmin || 0);
      const utils = Number(histInvUtilities || 0);
      const total = rent + admin + utils;

      let received = 0;
      if (histInvStatus === "unpaid") {
        received = 0;
      } else {
        received = histInvReceived !== "" ? Number(histInvReceived) : total;
      }

      let status = "unpaid";
      if (received >= total) {
        status = "paid";
      } else if (received > 0) {
        status = "partial";
      } else {
        status = "unpaid";
      }

      addInvoice({
        property_id: histInvPropertyId,
        tenant_id: histInvTenantId,
        landlord_id: landlordId,
        title: histInvTitle.trim(),
        amountRent: rent,
        amountAdmin: admin,
        amountUtilities: utils,
        amount: total,
        receivedPayment: received,
        status: status,
        due_date: histInvDueDate,
        issueDate: histInvIssueDate,
        paymentDate: histInvStatus !== "unpaid" ? (histInvPaymentDate || histInvIssueDate) : null,
        notes: (histInvNotes.trim() ? histInvNotes.trim() : "") + " (Kreator Historii)"
      });

      setSuccessMsg("Pomyślnie dodano historyczny rachunek!");
      
      // Reset fields
      setHistInvPropertyId("");
      setHistInvTenantId("");
      setHistInvTitle("");
      setHistInvRent("");
      setHistInvAdmin("");
      setHistInvUtilities("");
      setHistInvIssueDate("");
      setHistInvDueDate("");
      setHistInvStatus("paid");
      setHistInvReceived("");
      setHistInvPaymentDate("");
      setHistInvNotes("");

      // Refresh invoices
      setInvoices(getInvoices().sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt)));
      window.dispatchEvent(new Event("rentportal_invoices_updated"));
      setShowHistoryWizard(false);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleHistMeterSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!histMeterPropertyId) {
      setErrorMsg("Wybierz nieruchomość.");
      return;
    }
    if (!histMeterNumber.trim()) {
      setErrorMsg("Podaj numer seryjny licznika.");
      return;
    }
    if (!histMeterValue || Number(histMeterValue) < 0) {
      setErrorMsg("Podaj poprawny, nieujemny stan licznika.");
      return;
    }
    if (!histMeterDate) {
      setErrorMsg("Podaj datę odczytu.");
      return;
    }

    try {
      addMeterReading({
        property_id: histMeterPropertyId,
        meter_type: histMeterType,
        meter_number: histMeterNumber.trim(),
        reading_value: Number(histMeterValue),
        reading_date: histMeterDate,
        reported_by_id: landlordId,
        status: "approved"
      });

      setSuccessMsg("Historyczny odczyt licznika został pomyślnie zapisany!");
      
      // Reset fields
      setHistMeterPropertyId("");
      setHistMeterType("electricity");
      setHistMeterNumber("");
      setHistMeterValue("");
      setHistMeterDate("");

      // Dispatch update events to recalculate any media bills
      window.dispatchEvent(new Event("rentportal_meters_updated"));
      setShowHistoryWizard(false);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };


  // Pre-fill fields when property selection shifts
  useEffect(() => {
    if (selectedPropertyId) {
      const prop = properties.find(p => p.id === selectedPropertyId);
      if (prop) {
        setAmountRent(prop.rentAmount);
        setTitle(`Czynsz - ${new Date().toLocaleString('pl-PL', { month: 'long' })} ${new Date().getFullYear()}`);
        
        // Auto-suggest due date based on paymentDueDay
        let resolvedDueDate = "";
        if (prop.paymentDueDay) {
          const now = new Date();
          const dueYear = now.getFullYear();
          const dueMonth = String(now.getMonth() + 1).padStart(2, '0');
          const dueDay = String(prop.paymentDueDay).padStart(2, '0');
          resolvedDueDate = `${dueYear}-${dueMonth}-${dueDay}`;
          setDueDate(resolvedDueDate);
        } else {
          setDueDate("");
        }
 
        const targetMonth = resolvedDueDate ? resolvedDueDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
        
        // Look up pending admin fee for this property and month
        const pendingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
        const monthKey = `${selectedPropertyId}_${targetMonth}`;
        const compoundVal = pendingFees[monthKey];
        const feeObj = pendingFees[selectedPropertyId];
 
        if (compoundVal !== undefined) {
          setAmountAdmin(String(compoundVal));
          setAdminFeeLoadedStatus(`Automatycznie wczytano ze stawek (${compoundVal} zł za ${targetMonth})`);
        } else if (feeObj && feeObj.month === targetMonth) {
          setAmountAdmin(String(feeObj.amount));
          setAdminFeeLoadedStatus(`Automatycznie wczytano ze stawek (${feeObj.amount} zł za ${feeObj.month})`);
        } else if (feeObj) {
          setAmountAdmin(String(feeObj.amount));
          setAdminFeeLoadedStatus(`Automatycznie wczytano ze stawek (${feeObj.amount} zł)`);
        } else {
          setAmountAdmin("250"); // sensible default
          setAdminFeeLoadedStatus("");
        }

        // Look up approved meter costs for this property and month
        const calculatedMedia = getMediaCostForPropertyAndMonth(selectedPropertyId, targetMonth);
        if (calculatedMedia > 0) {
          setAmountUtilities(String(Math.round(calculatedMedia * 100) / 100));
          setMediaFeeLoadedStatus(`Automatycznie wyliczono z zatwierdzonych liczników (${(Math.round(calculatedMedia * 100) / 100).toFixed(2)} zł za ${targetMonth})`);
        } else {
          setAmountUtilities("150"); // sensible default
          setMediaFeeLoadedStatus("");
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId, properties]);
 
  // Dynamically listen to manual dueDate changes to reload matching admin fee & utility fee if month changes
  useEffect(() => {
    if (selectedPropertyId && dueDate) {
      const targetMonth = dueDate.slice(0, 7); // "YYYY-MM"
      const pendingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
      const monthKey = `${selectedPropertyId}_${targetMonth}`;
      const compoundVal = pendingFees[monthKey];
      const feeObj = pendingFees[selectedPropertyId];
      if (compoundVal !== undefined) {
        setAmountAdmin(String(compoundVal));
        setAdminFeeLoadedStatus(`Automatycznie wczytano ze stawek (${compoundVal} zł za ${targetMonth})`);
      } else if (feeObj && feeObj.month === targetMonth) {
        setAmountAdmin(String(feeObj.amount));
        setAdminFeeLoadedStatus(`Automatycznie wczytano ze stawek (${feeObj.amount} zł za ${feeObj.month})`);
      }
      
      const calculatedMedia = getMediaCostForPropertyAndMonth(selectedPropertyId, targetMonth);
      if (calculatedMedia > 0) {
        setAmountUtilities(String(Math.round(calculatedMedia * 100) / 100));
        setMediaFeeLoadedStatus(`Automatycznie wyliczono z zatwierdzonych liczników (${(Math.round(calculatedMedia * 100) / 100).toFixed(2)} zł za ${targetMonth})`);
      } else {
        setAmountUtilities("150");
        setMediaFeeLoadedStatus("");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueDate, selectedPropertyId]);
 
  // Synchronize when administrative fees or meter readings change globally
  useEffect(() => {
    const handleFeesUpdate = () => {
      if (selectedPropertyId) {
        const targetMonth = dueDate ? dueDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
        const pendingFees = JSON.parse(localStorage.getItem("rentportal_pending_admin_fees") || "{}");
        const monthKey = `${selectedPropertyId}_${targetMonth}`;
        const compoundVal = pendingFees[monthKey];
        const feeObj = pendingFees[selectedPropertyId];
        if (compoundVal !== undefined) {
          setAmountAdmin(String(compoundVal));
          setAdminFeeLoadedStatus(`Automatycznie wczytano ze stawek (${compoundVal} zł za ${targetMonth})`);
        } else if (feeObj && feeObj.month === targetMonth) {
          setAmountAdmin(String(feeObj.amount));
          setAdminFeeLoadedStatus(`Automatycznie wczytano ze stawek (${feeObj.amount} zł za ${feeObj.month})`);
        }
      }
    };

    const handleMetersUpdate = () => {
      if (selectedPropertyId) {
        const targetMonth = dueDate ? dueDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
        const calculatedMedia = getMediaCostForPropertyAndMonth(selectedPropertyId, targetMonth);
        if (calculatedMedia > 0) {
          setAmountUtilities(String(Math.round(calculatedMedia * 100) / 100));
          setMediaFeeLoadedStatus(`Automatycznie wyliczono z zatwierdzonych liczników (${(Math.round(calculatedMedia * 100) / 100).toFixed(2)} zł za ${targetMonth})`);
        } else {
          setAmountUtilities("150");
          setMediaFeeLoadedStatus("");
        }
      }
    };
    
    window.addEventListener("rentportal_admin_fees_updated", handleFeesUpdate);
    window.addEventListener("rentportal_meters_updated", handleMetersUpdate);
    return () => {
      window.removeEventListener("rentportal_admin_fees_updated", handleFeesUpdate);
      window.removeEventListener("rentportal_meters_updated", handleMetersUpdate);
    };
  }, [selectedPropertyId, dueDate]);

  // Synchronize expense property input with active property filter
  useEffect(() => {
    if (filterPropertyId !== "all") {
      setExpensePropertyId(filterPropertyId);
    } else if (properties.length > 0) {
      setExpensePropertyId(properties[0].id);
    }
  }, [filterPropertyId, properties]);

  const handleBookPaymentSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!bookingInvoice) return;

    try {
      bookInvoicePayment(bookingInvoice.id, bookingAmount, bookingDate, bookingNotes);
      setSuccessMsg("Płatność została pomyślnie zaksięgowana / zaktualizowana!");
      setInvoices(getInvoices().sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt)));
      setShowBookingModal(false);
      setBookingInvoice(null);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleGenerateInvoice = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedPropertyId) {
      setErrorMsg("Wybierz nieruchomość z lokatorem.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Podaj tytuł faktury.");
      return;
    }

    const validation = validateInvoiceInputs(
      selectedPropertyId,
      amountRent,
      amountAdmin,
      amountUtilities,
      new Date().toISOString().split('T')[0],
      dueDate
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setErrorMsg(firstError);
      return;
    }

    try {
      const prop = getPropertyById(selectedPropertyId);
      if (!prop || !prop.tenant_id) {
        throw new Error("Wybrany lokal nie ma przypisanego lokatora.");
      }

      const totalAmount = validation.data.total;

      addInvoice({
        property_id: selectedPropertyId,
        tenant_id: prop.tenant_id,
        landlord_id: landlordId,
        title: title.trim(),
        amountRent: Number(amountRent),
        amountAdmin: Number(amountAdmin),
        amountUtilities: Number(amountUtilities),
        amount: totalAmount,
        receivedPayment: 0,
        status: "unpaid",
        due_date: dueDate,
        paymentDate: null,
        issueDate: new Date().toISOString().split('T')[0],
        notes: notes.trim()
      });

      setSuccessMsg("Faktura została pomyślnie wygenerowana!");
      setAmountAdmin("250");
      setAmountUtilities("150");
      setDueDate("");
      setNotes("");
      setShowAddForm(false);
      
      // Refresh invoice list
      setInvoices(getInvoices().sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt)));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!expensePropertyId) {
      setErrorMsg("Wybierz mieszkanie, którego dotyczy koszt.");
      return false;
    }
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      setErrorMsg("Wpisz poprawną kwotę kosztu.");
      return false;
    }
    if (!expenseDate) {
      setErrorMsg("Podaj datę poniesienia kosztu.");
      return false;
    }
    if (!expenseDesc.trim()) {
      setErrorMsg("Wpisz krótki opis kosztu.");
      return false;
    }

    try {
      addExpense({
        property_id: expensePropertyId,
        category: expenseCategory,
        amount: Number(expenseAmount),
        date: expenseDate,
        description: expenseDesc.trim()
      });

      setSuccessMsg("Koszt został pomyślnie dodany!");
      setExpenseAmount("");
      setExpenseDesc("");
      
      // Refresh expenses list
      setExpenses(getExpenses().sort((a, b) => new Date(b.date) - new Date(a.date)));
      return true;
    } catch (err) {
      setErrorMsg(err.message);
      return false;
    }
  };

  const handleDeleteExpense = (id) => {
    try {
      deleteExpense(id);
      setSuccessMsg("Koszt został pomyślnie usunięty.");
      setExpenses(getExpenses().sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteInvoice = (id) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę płatność/rachunek z systemu? Tej operacji nie można cofnąć.")) {
      try {
        setErrorMsg("");
        setSuccessMsg("");
        deleteInvoice(id);
        setSuccessMsg("Płatność została pomyślnie usunięta.");
      } catch (err) {
        setErrorMsg("Błąd podczas usuwania płatności: " + err.message);
      }
    }
  };

  // Collect all unique tenants in active contracts for the filter
  const filterTenants = [];
  const tenantMap = {};
  properties.forEach(p => {
    if (p.tenant_id) {
      const t = getUserById(p.tenant_id);
      if (t && !tenantMap[t.id]) {
        tenantMap[t.id] = true;
        filterTenants.push(t);
      }
    }
  });

  // Filter invoices based on selected filters
  const filteredInvoices = invoices.filter(inv => {
    // Filter by property
    if (filterPropertyId !== "all" && inv.property_id !== filterPropertyId) {
      return false;
    }
    // Filter by tenant
    if (filterTenantId !== "all" && inv.tenant_id !== filterTenantId) {
      return false;
    }
    // Filter by start date
    if (filterStartDate) {
      const invDate = new Date(inv.issueDate || inv.createdAt);
      const startDate = new Date(filterStartDate);
      invDate.setHours(0,0,0,0);
      startDate.setHours(0,0,0,0);
      if (invDate < startDate) return false;
    }
    // Filter by end date
    if (filterEndDate) {
      const invDate = new Date(inv.issueDate || inv.createdAt);
      const endDate = new Date(filterEndDate);
      invDate.setHours(0,0,0,0);
      endDate.setHours(0,0,0,0);
      if (invDate > endDate) return false;
    }
    return true;
  });

  // Calculate Cash Flow statistics on the filtered set
  const stats = filteredInvoices.reduce((acc, inv) => {
    const rent = Number(inv.amountRent || 0);
    const admin = Number(inv.amountAdmin || 0);
    const utils = Number(inv.amountUtilities || 0);
    const total = Number(inv.amount || 0);
    const received = Number(inv.receivedPayment || 0);
    
    acc.rentSum += rent;
    acc.adminSum += admin;
    acc.utilitiesSum += utils;
    acc.totalSum += total;
    acc.receivedSum += received;
    
    const balance = received - total;
    if (balance > 0) {
      acc.overpayments += balance;
    } else if (balance < 0) {
      acc.underpayments += Math.abs(balance);
    }
    
    return acc;
  }, {
    rentSum: 0,
    adminSum: 0,
    utilitiesSum: 0,
    totalSum: 0,
    receivedSum: 0,
    overpayments: 0,
    underpayments: 0
  });

  // Filter expenses based on selected filters
  const filteredExpenses = expenses.filter(exp => {
    // Filter by property
    if (filterPropertyId !== "all" && exp.property_id !== filterPropertyId) {
      return false;
    }
    // Filter by start date
    if (filterStartDate) {
      const expDate = new Date(exp.date);
      const startDate = new Date(filterStartDate);
      expDate.setHours(0,0,0,0);
      startDate.setHours(0,0,0,0);
      if (expDate < startDate) return false;
    }
    // Filter by end date
    if (filterEndDate) {
      const expDate = new Date(exp.date);
      const endDate = new Date(filterEndDate);
      expDate.setHours(0,0,0,0);
      endDate.setHours(0,0,0,0);
      if (expDate > endDate) return false;
    }
    return true;
  });

  // Calculate total expense breakdown
  const expenseStats = filteredExpenses.reduce((acc, exp) => {
    const amt = Number(exp.amount || 0);
    acc.totalExpenses += amt;
    if (exp.category === "renovation") {
      acc.renovationExpenses += amt;
    } else if (exp.category === "insurance") {
      acc.insuranceExpenses += amt;
    } else if (exp.category === "furnishing") {
      acc.furnishingExpenses += amt;
    }
    return acc;
  }, {
    totalExpenses: 0,
    renovationExpenses: 0,
    insuranceExpenses: 0,
    furnishingExpenses: 0
  });

  // Get active contractual rent based on current lease agreements
  const contractRent = (() => {
    if (filterPropertyId !== "all") {
      const prop = properties.find(p => p.id === filterPropertyId);
      return prop ? prop.rentAmount : 0;
    }
    if (filterTenantId !== "all") {
      const prop = properties.find(p => p.tenant_id === filterTenantId);
      return prop ? prop.rentAmount : 0;
    }
    // Sum for all properties with active tenants
    return properties.reduce((acc, p) => acc + (p.tenant_id ? p.rentAmount : 0), 0);
  })();

  // Calculate Net Rental Income & Profitability (ROI)
  // Przychód z najmu = contractRent || stats.rentSum
  // Koszty = expenseStats.totalExpenses
  // Zysk netto = Przychód z najmu - Koszty
  const rentRevenue = contractRent || stats.rentSum;
  const netRentalIncome = rentRevenue - expenseStats.totalExpenses;
  const profitabilityPercentage = rentRevenue > 0 
    ? Math.round((netRentalIncome / rentRevenue) * 100) 
    : 0;

  // Real-term Operating Profitability (ROI/ROE)
  // Real Net Income = (rentRevenue + stats.adminSum) - stats.adminSum - repairs (renovationExpenses) - insurance (insuranceExpenses) - 8.5% flat tax (flatTaxAmount)
  const flatTaxAmount = rentRevenue * 0.085;
  const totalRealRevenue = rentRevenue + stats.adminSum;
  const realNetIncome = totalRealRevenue - stats.adminSum - expenseStats.renovationExpenses - expenseStats.insuranceExpenses - flatTaxAmount;
  const realRoiPercentage = rentRevenue > 0 
    ? Math.round((realNetIncome / rentRevenue) * 100) 
    : 0;

  // Calculate dynamic default property value and equity
  let resolvedPropertyValue = 0;
  let resolvedEquityValue = 0;

  if (filterPropertyId !== "all") {
    const prop = allLandlordProperties.find(p => p.id === filterPropertyId);
    if (prop) {
      const isM1 = prop.id === "m1";
      const isM2 = prop.id === "m2";
      resolvedPropertyValue = isM1 ? 650000 : (isM2 ? 450000 : prop.rentAmount * 240);
      resolvedEquityValue = isM1 ? 200000 : (isM2 ? 150000 : resolvedPropertyValue * 0.3);
    }
  } else {
    // Sum for all properties in properties list
    allLandlordProperties.forEach(p => {
      const isM1 = p.id === "m1";
      const isM2 = p.id === "m2";
      const val = isM1 ? 650000 : (isM2 ? 450000 : p.rentAmount * 240);
      const eq = isM1 ? 200000 : (isM2 ? 150000 : val * 0.3);
      resolvedPropertyValue += val;
      resolvedEquityValue += eq;
    });
    if (resolvedPropertyValue === 0) {
      resolvedPropertyValue = 1100000;
      resolvedEquityValue = 350000;
    }
  }

  const propertyValue = customPropertyValue !== null ? customPropertyValue : resolvedPropertyValue;
  const equityValue = customEquityValue !== null ? customEquityValue : resolvedEquityValue;

  const realRoePercentage = equityValue > 0
    ? Math.round((realNetIncome / equityValue) * 100 * 100) / 100
    : 0;

  // vacancy rate calculation for 2026
  const days2026 = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(2026, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(m + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days2026.push(`2026-${monthStr}-${dayStr}`);
    }
  }

  const targetPropertiesForVacancy = filterPropertyId !== "all"
    ? allLandlordProperties.filter(p => p.id === filterPropertyId)
    : allLandlordProperties;

  const propertyVacancyStats = targetPropertiesForVacancy.map(prop => {
    const intervals = [];

    // 1. Current active lease
    if (prop.tenant_id && prop.leaseStart) {
      const lStart = prop.leaseStart;
      let lEnd = prop.leaseEnd || "2026-12-31";
      if (prop.earlyTermination && prop.earlyTermination.terminationDate) {
        lEnd = prop.earlyTermination.terminationDate;
      }
      intervals.push({ start: lStart, end: lEnd });
    }

    // 2. Historical lease ranges for this property
    allTenants.forEach(tenant => {
      if (tenant.leaseHistory) {
        tenant.leaseHistory.forEach(lh => {
          if (lh.propertyId === prop.id && lh.leaseStart && lh.leaseEnd) {
            intervals.push({ start: lh.leaseStart, end: lh.leaseEnd });
          }
        });
      }
    });

    let vacantDaysForProp = 0;
    days2026.forEach(dayStr => {
      const isRented = intervals.some(inv => {
        return dayStr >= inv.start && dayStr <= inv.end;
      });
      if (!isRented) {
        vacantDaysForProp++;
      }
    });

    const vacantRateForProp = Math.round((vacantDaysForProp / 365) * 100);

    return {
      propertyId: prop.id,
      propertyTitle: prop.title,
      vacantDays: vacantDaysForProp,
      vacantRate: vacantRateForProp,
      rentedDays: 365 - vacantDaysForProp
    };
  });

  const aggVacantDays = propertyVacancyStats.reduce((acc, s) => acc + s.vacantDays, 0);
  const aggPossibleDays = targetPropertiesForVacancy.length * 365;
  const vacancyRate = aggPossibleDays > 0 ? Math.round((aggVacantDays / aggPossibleDays) * 100) : 0;

  // Aging Debts Calculation relative to 2026-06-01
  const referenceDate = new Date("2026-06-01");
  const agingInvoices = invoices.filter(inv => {
    if (filterPropertyId !== "all" && inv.property_id !== filterPropertyId) {
      return false;
    }
    if (filterTenantId !== "all" && inv.tenant_id !== filterTenantId) {
      return false;
    }
    if (inv.status !== "unpaid" && inv.status !== "partial") {
      return false;
    }
    const dueDate = new Date(inv.due_date);
    return dueDate < referenceDate;
  });

  const agingDebtsBrackets = {
    low: { name: "Niskie (1-3 dni)", days: "1-3 dni", color: "text-green-400 bg-green-500/10 border-green-500/20", items: [], total: 0 },
    medium: { name: "Średnie (4-10 dni)", days: "4-10 dni", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", items: [], total: 0 },
    high: { name: "Wysokie (11-30 dni)", days: "11-30 dni", color: "text-orange-400 bg-orange-500/10 border-orange-500/20", items: [], total: 0 },
    critical: { name: "Krytyczne (30+ dni)", days: "30+ dni", color: "text-red-400 bg-red-500/10 border-red-500/20", items: [], total: 0 }
  };

  agingInvoices.forEach(inv => {
    const dueDate = new Date(inv.due_date);
    const diffTime = referenceDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    
    if (diffDays > 0) {
      const outstandingAmount = inv.amount - (inv.receivedPayment || 0);
      const item = {
        invoice: inv,
        overdueDays: diffDays,
        outstandingAmount
      };

      if (diffDays <= 3) {
        agingDebtsBrackets.low.items.push(item);
        agingDebtsBrackets.low.total += outstandingAmount;
      } else if (diffDays <= 10) {
        agingDebtsBrackets.medium.items.push(item);
        agingDebtsBrackets.medium.total += outstandingAmount;
      } else if (diffDays <= 30) {
        agingDebtsBrackets.high.items.push(item);
        agingDebtsBrackets.high.total += outstandingAmount;
      } else {
        agingDebtsBrackets.critical.items.push(item);
        agingDebtsBrackets.critical.total += outstandingAmount;
      }
    }
  });

  const totalAgingDebt = 
    agingDebtsBrackets.low.total + 
    agingDebtsBrackets.medium.total + 
    agingDebtsBrackets.high.total + 
    agingDebtsBrackets.critical.total;

  const generateCashFlowReportHtml = (propertyName, tenantName) => {
    const reportDateStr = new Date().toLocaleString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const dateRangeStr = (filterStartDate || filterEndDate)
      ? `od ${filterStartDate || "początku"} do ${filterEndDate || "teraz"}`
      : "Cały okres rozliczeniowy";

    const balanceValue = stats.receivedSum - stats.totalSum;
    const balanceSign = balanceValue > 0 ? "+" : "";

    // Generate table rows
    const tableRows = filteredInvoices.map((inv) => {
      const propTitle = allLandlordProperties.find(p => p.id === inv.property_id)?.title.split(",")[0] || "Mieszkanie";
      const tenName = allTenants.find(t => t.id === inv.tenant_id)?.name || "Lokator";
      const diff = (inv.receivedPayment || 0) - inv.amount;
      
      let statusLabel = "Niezapłacony";
      let statusClass = "status-unpaid";
      if (inv.receivedPayment >= inv.amount) {
        statusLabel = "Zapłacony";
        statusClass = "status-paid";
      } else if (inv.receivedPayment > 0) {
        statusLabel = "Częściowy";
        statusClass = "status-partial";
      }

      let billingMonth = "";
      if (inv.issueDate) {
        const d = new Date(inv.issueDate);
        billingMonth = d.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
      } else {
        billingMonth = inv.title;
      }

      return `
        <tr class="table-row">
          <td style="padding: 12px 8px; font-family: monospace;">${inv.id}</td>
          <td style="padding: 12px 8px; font-weight: bold; text-transform: capitalize;">${billingMonth}</td>
          <td style="padding: 12px 8px;">${propTitle}</td>
          <td style="padding: 12px 8px;">${tenName}</td>
          <td style="padding: 12px 8px; text-align: right; font-family: monospace;">${inv.amount.toFixed(2)}</td>
          <td style="padding: 12px 8px; text-align: right; font-family: monospace;">${(inv.receivedPayment || 0).toFixed(2)}</td>
          <td style="padding: 12px 8px; text-align: right; font-family: monospace; font-weight: bold; color: ${diff < 0 ? '#ef4444' : diff > 0 ? '#10b981' : '#cbd5e1'}">${diff > 0 ? '+' : ''}${diff.toFixed(2)}</td>
          <td style="padding: 12px 8px; text-align: center;"><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        </tr>
      `;
    }).join("");

    // Generate anomalies rows
    const anomalies = filteredInvoices.filter(inv => (inv.receivedPayment || 0) !== inv.amount);
    const anomaliesContent = anomalies.length === 0
      ? `<div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 8px; color: #10b981; text-align: center; font-size: 13px;">
          ✅ Brak wykrytych anomalii płatniczych w wybranym przedziale.
         </div>`
      : `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-top: 10px;">
          <thead>
            <tr style="border-bottom: 2px solid #ef4444; color: #ef4444; font-weight: bold;">
              <th style="padding: 8px;">Miesiąc / ID</th>
              <th style="padding: 8px;">Mieszkanie / Lokator</th>
              <th style="padding: 8px; text-align: right;">Należność</th>
              <th style="padding: 8px; text-align: right;">Otrzymano</th>
              <th style="padding: 8px; text-align: right;">Różnica</th>
            </tr>
          </thead>
          <tbody>
            ${anomalies.map(inv => {
              const propTitle = allLandlordProperties.find(p => p.id === inv.property_id)?.title.split(",")[0] || "Mieszkanie";
              const tenName = allTenants.find(t => t.id === inv.tenant_id)?.name || "Lokator";
              const diff = (inv.receivedPayment || 0) - inv.amount;
              let billingMonth = inv.issueDate 
                ? new Date(inv.issueDate).toLocaleString('pl-PL', { month: 'long', year: 'numeric' })
                : inv.title;
              return `
                <tr style="border-bottom: 1px solid rgba(239, 68, 68, 0.1); color: ${diff < 0 ? '#ef4444' : '#10b981'};">
                  <td style="padding: 8px; font-weight: bold;">${billingMonth} <span style="font-size: 10px; opacity: 0.6; font-family: monospace;">(${inv.id})</span></td>
                  <td style="padding: 8px;">${propTitle} / ${tenName}</td>
                  <td style="padding: 8px; text-align: right; font-family: monospace;">${inv.amount.toFixed(2)}</td>
                  <td style="padding: 8px; text-align: right; font-family: monospace;">${(inv.receivedPayment || 0).toFixed(2)}</td>
                  <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: bold;">${diff > 0 ? '+' : ''}${diff.toFixed(2)} PLN</td>
                </tr>
              `;
            }).join("")}
          </tbody>
         </table>`;

    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Raport Cash Flow - RentPortal</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
    
    body {
      background-color: #0b0f19;
      color: #f8fafc;
      font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .report-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .report-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      padding: 35px;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 20px;
    }
    
    .brand-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    
    .document-title {
      font-size: 18px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 5px;
    }
    
    .meta-value {
      font-family: monospace;
      color: #cbd5e1;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #3b82f6;
      margin-top: 35px;
      margin-bottom: 15px;
      border-left: 3px solid #3b82f6;
      padding-left: 10px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 15px;
      text-align: center;
    }
    
    .metric-title {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
      display: block;
    }
    
    .metric-value {
      font-size: 16px;
      font-weight: 800;
      font-family: monospace;
    }
    
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .breakdown-card {
      background: rgba(30, 41, 59, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    
    .table-header {
      background: rgba(15, 23, 42, 0.8);
      color: #94a3b8;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    }
    
    .table-row {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 12px;
    }
    
    .table-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    
    .status-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    
    .status-paid {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }
    
    .status-partial {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }
    
    .status-unpaid {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    
    .signature-container {
      margin-top: 50px;
      display: flex;
      justify-content: flex-end;
    }
    
    .signature-box {
      border-top: 1px dashed rgba(255, 255, 255, 0.2);
      width: 250px;
      text-align: center;
      padding-top: 10px;
      font-size: 11px;
      color: #94a3b8;
    }
    
    @media print {
      .no-print {
        display: none !important;
      }
      
      body {
        background-color: white !important;
        color: #0f172a !important;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .report-container {
        padding: 0 !important;
        max-width: 100% !important;
      }
      
      .report-card {
        background: white !important;
        border: none !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        padding: 0 !important;
      }
      
      .brand-title {
        color: #1d4ed8 !important;
        -webkit-text-fill-color: #1d4ed8 !important;
      }
      
      .document-title {
        color: #64748b !important;
      }
      
      .header-table {
        border-bottom: 2px solid #e2e8f0 !important;
        margin-bottom: 20px;
      }
      
      .meta-value {
        color: #0f172a !important;
      }
      
      .section-title {
        color: #1d4ed8 !important;
        border-left: 3px solid #1d4ed8 !important;
        margin-top: 25px;
      }
      
      .metric-card {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        color: #0f172a !important;
      }
      
      .metric-title {
        color: #64748b !important;
      }
      
      .breakdown-card {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        color: #0f172a !important;
      }
      
      .table-header {
        background: #f1f5f9 !important;
        color: #475569 !important;
        border-bottom: 2px solid #cbd5e1 !important;
      }
      
      .table-row {
        border-bottom: 1px solid #e2e8f0 !important;
        color: #334155 !important;
      }
      
      .status-badge {
        border: 1px solid currentColor !important;
      }
      
      .status-paid {
        background: none !important;
        color: #166534 !important;
      }
      
      .status-partial {
        background: none !important;
        color: #9a3412 !important;
      }
      
      .status-unpaid {
        background: none !important;
        color: #991b1b !important;
      }
      
      .signature-box {
        border-top: 1px dashed #94a3b8 !important;
        color: #475569 !important;
      }
      
      tr {
        page-break-inside: avoid !important;
      }
      
      @page {
        size: A4;
        margin: 1.5cm;
      }
    }
  </style>
</head>
<body>

  <div class="no-print" style="position: sticky; top: 0; background: #0b0f19; padding: 15px; text-align: center; border-bottom: 1px solid #1e293b; display: flex; justify-content: center; gap: 15px; align-items: center; z-index: 1000; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
    <span style="color: #94a3b8; font-size: 13px; font-family: 'Outfit', sans-serif;">Zestawienie finansowe wygenerowane pomyślnie. Kliknij przycisk obok, aby wydrukować lub zapisać do PDF.</span>
    <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 8px 18px; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 13px; font-family: 'Outfit', sans-serif; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
      🖨️ Drukuj / Zapisz jako PDF
    </button>
  </div>

  <div class="report-container">
    <div class="report-card">
      
      <!-- Nagłówek dokumentu -->
      <table class="header-table">
        <tr>
          <td style="vertical-align: top; width: 60%;">
            <h1 class="brand-title">RENTPORTAL</h1>
            <div class="document-title">Raport Cash Flow / Zestawienie Finansowe</div>
          </td>
          <td style="vertical-align: top; text-align: right; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <div>Data wygenerowania: <strong class="meta-value">${reportDateStr}</strong></div>
            <div>Okres zestawienia: <strong class="meta-value">${dateRangeStr}</strong></div>
            <div>Zarządca ID: <strong class="meta-value">${landlordId}</strong></div>
          </td>
        </tr>
      </table>

      <!-- Kryteria filtracji -->
      <div class="section-title">Zastosowane Filtry Zestawienia</div>
      <div style="background: rgba(30, 41, 59, 0.2); border: 1px solid rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 15px; margin-bottom: 25px; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #94a3b8;">Wybrana nieruchomość:</td>
            <td style="padding: 4px 0; font-weight: bold; color: white;" class="meta-value">${propertyName}</td>
            <td style="padding: 4px 0; color: #94a3b8; text-align: right;">Zakres dat od:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; color: white;" class="meta-value">${filterStartDate || 'brak ograniczenia'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #94a3b8;">Wybrany lokator:</td>
            <td style="padding: 4px 0; font-weight: bold; color: white;" class="meta-value">${tenantName}</td>
            <td style="padding: 4px 0; color: #94a3b8; text-align: right;">Zakres dat do:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; color: white;" class="meta-value">${filterEndDate || 'brak ograniczenia'}</td>
          </tr>
        </table>
      </div>

      <!-- Główne KPI Finansowe -->
      <div class="section-title">Podsumowanie Przepływu Środków (KPI)</div>
      <div class="metrics-grid">
        <div class="metric-card" style="border-top: 3px solid #3b82f6;">
          <span class="metric-title">Należności</span>
          <span class="metric-value" style="color: white;">${stats.totalSum.toFixed(2)}</span>
          <span style="font-size: 9px; color: #94a3b8; display: block; margin-top: 3px;">Zafakturowano</span>
        </div>
        <div class="metric-card" style="border-top: 3px solid #10b981;">
          <span class="metric-title">Wpłaty</span>
          <span class="metric-value" style="color: #10b981;">${stats.receivedSum.toFixed(2)}</span>
          <span style="font-size: 9px; color: #94a3b8; display: block; margin-top: 3px;">Otrzymano</span>
        </div>
        <div class="metric-card" style="border-top: 3px solid #ef4444;">
          <span class="metric-title">Niedopłaty</span>
          <span class="metric-value" style="color: #ef4444;">${stats.underpayments.toFixed(2)}</span>
          <span style="font-size: 9px; color: #94a3b8; display: block; margin-top: 3px;">Zadłużenie</span>
        </div>
        <div class="metric-card" style="border-top: 3px solid #f59e0b;">
          <span class="metric-title">Nadpłaty</span>
          <span class="metric-value" style="color: #f59e0b;">${stats.overpayments.toFixed(2)}</span>
          <span style="font-size: 9px; color: #94a3b8; display: block; margin-top: 3px;">Nadwyżki</span>
        </div>
        <div class="metric-card" style="border-top: 3px solid ${balanceValue >= 0 ? '#10b981' : '#ef4444'};">
          <span class="metric-title">Końcowe Saldo</span>
          <span class="metric-value" style="color: ${balanceValue >= 0 ? '#10b981' : '#ef4444'};">${balanceSign}${balanceValue.toFixed(2)}</span>
          <span style="font-size: 9px; color: #94a3b8; display: block; margin-top: 3px;">Bilans</span>
        </div>
      </div>

      <!-- Rozbicie Kategorii -->
      <div class="section-title">Kategorie Przychodowe</div>
      <div class="breakdown-grid">
        <div class="breakdown-card">
          <span style="color: #94a3b8;">🏠 Czynsz najmu (umowny):</span>
          <strong style="color: white;">${rentRevenue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</strong>
        </div>
        <div class="breakdown-card">
          <span style="color: #94a3b8;">🏢 Opłata administracyjna:</span>
          <strong style="color: white;">${stats.adminSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</strong>
        </div>
        <div class="breakdown-card">
          <span style="color: #94a3b8;">⚡ Opłaty za media (liczniki):</span>
          <strong style="color: white;">${stats.utilitiesSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</strong>
        </div>
      </div>

      <!-- Wykaz Anomalii (jeśli są) -->
      <div class="section-title" style="color: #ef4444; border-left-color: #ef4444;">⚠️ Wykaz Anomalii Płatniczych (Niedopłaty / Nadpłaty)</div>
      <div style="margin-bottom: 30px;">
        ${anomaliesContent}
      </div>

      <!-- Tabela Szczegółowa -->
      <div class="section-title">Rejestr Rachunków i Płatności Szczegółowych</div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr class="table-header">
              <th style="padding: 12px 8px; width: 10%;">ID</th>
              <th style="padding: 12px 8px; width: 18%;">Okres / Tytuł</th>
              <th style="padding: 12px 8px; width: 22%;">Nieruchomość</th>
              <th style="padding: 12px 8px; width: 18%;">Najemca</th>
              <th style="padding: 12px 8px; text-align: right; width: 10%;">Należność</th>
              <th style="padding: 12px 8px; text-align: right; width: 10%;">Otrzymano</th>
              <th style="padding: 12px 8px; text-align: right; width: 10%;">Saldo</th>
              <th style="padding: 12px 8px; text-align: center; width: 12%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #94a3b8;">Brak rachunków spełniających kryteria.</td></tr>`}
          </tbody>
        </table>
      </div>

      <!-- Podpis administratora -->
      <div class="signature-container">
        <div class="signature-box">
          Sporządził Administrator Systemu RentPortal
          <div style="height: 40px;"></div>
          ...................................................
          <div style="font-size: 9px; margin-top: 5px; opacity: 0.8;">Data i podpis zarządcy</div>
        </div>
      </div>

    </div>
  </div>

</body>
</html>`;
  };

  const handleGenerateCashFlowReport = async () => {
    try {
      setGeneratingReport(true);
      setErrorMsg("");
      setSuccessMsg("Generowanie raportu Cash Flow...");

      const propertyName = filterPropertyId !== "all" 
        ? allLandlordProperties.find(p => p.id === filterPropertyId)?.title || "Mieszkanie"
        : "Wszystkie Lokale";
        
      const tenantName = filterTenantId !== "all"
        ? allTenants.find(t => t.id === filterTenantId)?.name || "Lokator"
        : "Wszyscy Lokatorzy";

      const htmlContent = generateCashFlowReportHtml(propertyName, tenantName);

      // Convert to Base64 data URL
      const base64Data = "data:text/html;base64," + btoa(unescape(encodeURIComponent(htmlContent)));
      const cleanPropName = propertyName.split(",")[0].replace(/\s+/g, "_");
      const cleanTenantName = tenantName.replace(/\s+/g, "_");
      const fileName = `Raport_CashFlow_${cleanPropName}_${cleanTenantName}_${Date.now()}.html`;

      // Post to server to save physically on disk
      const saveResponse = await fetch("/api/save-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName,
          fileData: base64Data
        })
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json();
        throw new Error(errData.error || "Serwer odmówił zapisu pliku raportu.");
      }

      const { fileUrl } = await saveResponse.json();

      // Add document record
      addDocument({
        property_id: filterPropertyId !== "all" ? filterPropertyId : null,
        tenant_id: filterTenantId !== "all" ? filterTenantId : null,
        document_type: "cash_flow_report",
        file_name: fileName,
        file_size: (htmlContent.length / 1024).toFixed(1) + " KB",
        file_data: fileUrl
      });

      setSuccessMsg("Raport Cash Flow został pomyślnie wygenerowany!");
      setTimeout(() => setSuccessMsg(""), 3500);
      handleReloadData();
      
      // Auto-open in new tab
      window.open(fileUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Błąd podczas generowania raportu: " + err.message);
      setErrorMsg("Błąd generowania raportu: " + err.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDeleteReport = (docId) => {
    if (!window.confirm("Czy na pewno chcesz usunąć to zestawienie raportu?")) return;
    try {
      deleteDocument(docId);
      setSuccessMsg("Raport został pomyślnie usunięty.");
      setTimeout(() => setSuccessMsg(""), 3000);
      handleReloadData();
    } catch (err) {
      alert("Błąd podczas usuwania raportu: " + err.message);
    }
  };

  const generateInvoiceReportHtml = (propertyName, tenantName) => {
    const reportDateStr = new Date().toLocaleString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const dateRangeStr = (filterStartDate || filterEndDate)
      ? `od ${filterStartDate || "początku"} do ${filterEndDate || "teraz"}`
      : "Pełna historia";

    // Summary calculations
    const totals = calculatePDFStatementTotals(filteredInvoices);
    const totalRent = totals.rent;
    const totalAdmin = totals.admin;
    const totalUtilities = totals.utilities;
    const totalInvoiced = totals.total;
    const totalPaid = totals.paid;
    const totalBalance = totals.balance;

    // Generate table rows
    const tableRows = filteredInvoices.map((inv) => {
      const propTitle = allLandlordProperties.find(p => p.id === inv.property_id)?.title.split(",")[0] || "Mieszkanie";
      const tenName = allTenants.find(t => t.id === inv.tenant_id)?.name || "Lokator";
      const diff = (inv.receivedPayment || 0) - inv.amount;
      
      let statusLabel = "Niezapłacona";
      let statusClass = "status-unpaid";
      if (inv.status === "paid" || inv.receivedPayment >= inv.amount) {
        statusLabel = "Opłacona";
        statusClass = "status-paid";
      } else if (inv.receivedPayment > 0) {
        statusLabel = "Częściowa";
        statusClass = "status-partial";
      } else if (inv.status === "overdue") {
        statusLabel = "Zaległa";
        statusClass = "status-unpaid";
      }

      // Timeliness calculations
      const timeliness = getPaymentTimeliness(inv.due_date, inv.paymentDate, inv.status);
      let timelinessHtml = "";
      if (timeliness) {
        let color = "#64748b";
        if (timeliness.colorClass.includes("red")) color = "#ef4444";
        if (timeliness.colorClass.includes("green")) color = "#10b981";
        timelinessHtml = `<div style="font-size: 8px; margin-top: 3px; color: ${color}; font-weight: 600;">${timeliness.message}</div>`;
      }

      return `
        <tr class="table-row">
          <td style="padding: 10px 6px; text-align: left; vertical-align: top;">
            <div style="font-weight: bold; color: #0f172a; line-height: 1.2;">${inv.title}</div>
            <div style="font-size: 9px; color: #94a3b8; font-family: monospace; margin-top: 2px;">ID: ${inv.id}</div>
          </td>
          <td style="padding: 10px 6px; text-align: left; vertical-align: top;">
            <div style="font-weight: bold; color: #0f172a;">${propTitle}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">L: <strong>${tenName}</strong></div>
          </td>
          <td style="padding: 10px 6px; text-align: right; font-family: monospace; vertical-align: top; color: #334155;">${(inv.amountRent || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 10px 6px; text-align: right; font-family: monospace; vertical-align: top; color: #334155;">${(inv.amountAdmin || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 10px 6px; text-align: right; font-family: monospace; vertical-align: top; color: #7c3aed; font-weight: bold;">${(inv.amountUtilities || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 10px 6px; text-align: right; font-family: monospace; vertical-align: top; font-weight: bold; color: #0f172a;">${inv.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 10px 6px; text-align: right; font-family: monospace; vertical-align: top; color: #10b981; font-weight: bold;">${(inv.receivedPayment || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 10px 6px; text-align: right; font-family: monospace; vertical-align: top; font-weight: bold; color: ${diff < 0 ? '#ef4444' : diff > 0 ? '#10b981' : '#0f172a'}">${diff > 0 ? '+' : ''}${diff.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 10px 6px; text-align: center; vertical-align: top;">
            <div style="font-weight: bold; color: #0f172a; font-family: monospace;">${inv.due_date}</div>
            ${timelinessHtml}
          </td>
          <td style="padding: 10px 6px; text-align: center; vertical-align: top;"><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        </tr>
      `;
    }).join("");

    return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Zestawienie Płatności i Rachunków</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
    }
    .container {
      max-width: 1100px;
      margin: 35px auto;
      background: #ffffff;
      padding: 35px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .title-cell {
      vertical-align: top;
    }
    .title-cell h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: #7c3aed;
      text-transform: uppercase;
      letter-spacing: -0.025em;
    }
    .title-cell p {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #64748b;
    }
    .meta-cell {
      text-align: right;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
      vertical-align: top;
    }
    .meta-box {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 18px;
      margin-bottom: 25px;
      font-size: 12px;
      border: 1px solid #e2e8f0;
    }
    .meta-box-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-box-table td {
      padding: 3px 0;
    }
    .meta-label {
      font-weight: 600;
      color: #475569;
      width: 150px;
    }
    .meta-val {
      color: #0f172a;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 11px;
    }
    .report-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      padding: 8px 6px;
      border-bottom: 2px solid #cbd5e1;
      text-align: left;
      font-size: 9px;
      letter-spacing: 0.05em;
    }
    .table-row {
      border-bottom: 1px solid #e2e8f0;
    }
    .table-row:nth-child(even) {
      background: #f8fafc;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 7px;
      font-size: 9px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .status-paid {
      background: #dcfce7;
      color: #15803d;
    }
    .status-partial {
      background: #fef9c3;
      color: #a16207;
    }
    .status-unpaid {
      background: #fee2e2;
      color: #b91c1c;
    }
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #7c3aed;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 50px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(124, 58, 237, 0.4);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover {
      background: #6d28d9;
      transform: translateY(-2px);
    }
    @media print {
      body {
        background: #ffffff;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
      }
      .print-btn {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <table class="header-table">
      <tr>
        <td class="title-cell">
          <h1>Zestawienie Płatności i Rachunków</h1>
          <p>Oficjalne podsumowanie rozliczeń finansowych</p>
        </td>
        <td class="meta-cell">
          <strong>Sporządzono dnia:</strong><br>${reportDateStr}<br>
          <strong>System:</strong> RentPortal Core v3
        </td>
      </tr>
    </table>

    <div class="meta-box">
      <table class="meta-box-table">
        <tr>
          <td class="meta-label">Zakres filtru:</td>
          <td class="meta-val">${propertyName}</td>
        </tr>
        <tr>
          <td class="meta-label">Najemca / Strona:</td>
          <td class="meta-val">${tenantName}</td>
        </tr>
        <tr>
          <td class="meta-label">Przedział czasowy:</td>
          <td class="meta-val">${dateRangeStr}</td>
        </tr>
        <tr>
          <td class="meta-label">Liczba rachunków:</td>
          <td class="meta-val">${filteredInvoices.length}</td>
        </tr>
      </table>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 12%; text-align: left; padding-left: 6px;">Tytuł Rachunku</th>
          <th style="width: 14%; text-align: left;">Mieszkanie / Najemca</th>
          <th style="width: 10%; text-align: right;">Czynsz Najmu</th>
          <th style="width: 10%; text-align: right;">Czynsz Admin.</th>
          <th style="width: 10%; text-align: right;">Opłata za Media</th>
          <th style="width: 11%; text-align: right;">Opłata (Suma)</th>
          <th style="width: 11%; text-align: right;">Wpłata</th>
          <th style="width: 11%; text-align: right;">Saldo</th>
          <th style="width: 11%; text-align: center;">Termin</th>
          <th style="width: 10%; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr style="border-top: 2px solid #cbd5e1; border-bottom: 2px double #cbd5e1; background: #f8fafc; font-weight: bold;">
          <td colspan="2" style="padding: 12px 6px; text-align: left; color: #475569; text-transform: uppercase; font-size: 10px; tracking-wider">PODSUMOWANIE RAZEM:</td>
          <td style="padding: 12px 6px; text-align: right; font-family: monospace; color: #0f172a;">${totalRent.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 12px 6px; text-align: right; font-family: monospace; color: #0f172a;">${totalAdmin.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 12px 6px; text-align: right; font-family: monospace; color: #7c3aed;">${totalUtilities.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 12px 6px; text-align: right; font-family: monospace; color: #0f172a;">${totalInvoiced.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 12px 6px; text-align: right; font-family: monospace; color: #10b981;">${totalPaid.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td style="padding: 12px 6px; text-align: right; font-family: monospace; color: ${totalBalance < 0 ? '#ef4444' : totalBalance > 0 ? '#10b981' : '#0f172a'}">${totalBalance > 0 ? '+' : ''}${totalBalance.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
          <td colspan="2" style="background: #f8fafc;"></td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
      Dokument wygenerowany automatycznie w aplikacji RentPortal. Dane są zgodne ze stanem bazy danych na dzień sporządzenia zestawienia.
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align: middle;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
    Drukuj / Zapisz PDF
  </button>

</body>
</html>`;
  };

  const handleOpenInvoiceReportModal = () => {
    if (filteredInvoices.length === 0) {
      alert("Brak płatności do zestawienia w wybranym filtrze.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    
    // Auto-prefill target tenant if a single tenant is selected in filters
    if (filterTenantId !== "all") {
      setReportSendingTenantId(filterTenantId);
    } else {
      // Find the first tenant in the filtered results if any
      const uniqueTenants = [...new Set(filteredInvoices.map(inv => inv.tenant_id))];
      if (uniqueTenants.length > 0) {
        setReportSendingTenantId(uniqueTenants[0]);
      } else {
        setReportSendingTenantId("");
      }
    }
    setShowInvoiceReportModal(true);
  };

  const handleGenerateAndDownloadInvoiceReport = async () => {
    try {
      setIsGeneratingInvoiceReport(true);
      setErrorMsg("");

      const propertyName = filterPropertyId !== "all" 
        ? allLandlordProperties.find(p => p.id === filterPropertyId)?.title || "Mieszkanie"
        : "Wszystkie Mieszkania";
        
      const tenantName = filterTenantId !== "all"
        ? allTenants.find(t => t.id === filterTenantId)?.name || "Wszyscy Najemcy"
        : "Wszyscy Najemcy";

      const htmlContent = generateInvoiceReportHtml(propertyName, tenantName);
      const base64Data = "data:text/html;base64," + btoa(unescape(encodeURIComponent(htmlContent)));
      
      const cleanPropName = propertyName.split(",")[0].replace(/\s+/g, "_");
      const cleanTenantName = tenantName.replace(/\s+/g, "_");
      const fileName = `Zestawienie_Platnosci_${cleanPropName}_${cleanTenantName}_${Date.now()}.html`;

      // Save physically on disk
      const saveResponse = await fetch("/api/save-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName,
          fileData: base64Data
        })
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json();
        throw new Error(errData.error || "Serwer odmówił zapisu pliku raportu.");
      }

      const { fileUrl } = await saveResponse.json();

      // Register document
      addDocument({
        property_id: filterPropertyId !== "all" ? filterPropertyId : null,
        tenant_id: filterTenantId !== "all" ? filterTenantId : null,
        document_type: "invoice_report",
        file_name: fileName,
        file_size: (htmlContent.length / 1024).toFixed(1) + " KB",
        file_data: fileUrl
      });

      // Trigger download
      downloadDocumentFile(fileUrl, fileName);
      setSuccessMsg("Raport został pobrany na dysk!");
      setTimeout(() => setSuccessMsg(""), 3500);
      setShowInvoiceReportModal(false);
      handleReloadData();
    } catch (err) {
      alert("Błąd podczas generowania i pobierania raportu: " + err.message);
    } finally {
      setIsGeneratingInvoiceReport(false);
    }
  };

  const handleGenerateAndSendInvoiceReport = async () => {
    try {
      setErrorMsg("");
      const targetTenantId = filterTenantId !== "all" ? filterTenantId : reportSendingTenantId;
      
      if (!targetTenantId) {
        alert("Proszę wybrać lokatora, do którego chcesz wysłać zestawienie.");
        return;
      }

      setIsGeneratingInvoiceReport(true);

      const targetTenant = allTenants.find(t => t.id === targetTenantId);
      const tenantName = targetTenant ? targetTenant.name : "Najemca";

      const propertyName = filterPropertyId !== "all" 
        ? allLandlordProperties.find(p => p.id === filterPropertyId)?.title || "Mieszkanie"
        : "Wszystkie Mieszkania";

      const htmlContent = generateInvoiceReportHtml(propertyName, tenantName);
      const base64Data = "data:text/html;base64," + btoa(unescape(encodeURIComponent(htmlContent)));
      
      const cleanPropName = propertyName.split(",")[0].replace(/\s+/g, "_");
      const cleanTenantName = tenantName.replace(/\s+/g, "_");
      const fileName = `Zestawienie_Platnosci_${cleanPropName}_${cleanTenantName}_${Date.now()}.html`;

      // Save physically on disk
      const saveResponse = await fetch("/api/save-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName,
          fileData: base64Data
        })
      });

      if (!saveResponse.ok) {
        const errData = await saveResponse.json();
        throw new Error(errData.error || "Serwer odmówił zapisu pliku raportu.");
      }

      const { fileUrl } = await saveResponse.json();

      // Register document
      addDocument({
        property_id: filterPropertyId !== "all" ? filterPropertyId : null,
        tenant_id: targetTenantId,
        document_type: "invoice_report",
        file_name: fileName,
        file_size: (htmlContent.length / 1024).toFixed(1) + " KB",
        file_data: fileUrl
      });

      // Find the associated property of the target tenant to pass correct property_id
      const targetProperty = allLandlordProperties.find(p => p.tenant_id === targetTenantId);

      // Send chat message
      sendMessage({
        sender_id: landlordId,
        receiver_id: targetTenantId,
        property_id: targetProperty ? targetProperty.id : (filterPropertyId !== "all" ? filterPropertyId : null),
        subject: "Rozliczenia",
        text: `[ZESTAWIENIE PŁATNOŚCI] Dzień dobry, przesyłam aktualne zestawienie rachunków i płatności z dnia ${new Date().toLocaleDateString("pl-PL")}. Pełne szczegóły oraz bilans konta znajdują się w załączniku.`,
        attachment_name: fileName,
        attachment_data: fileUrl
      });

      window.dispatchEvent(new Event("rentportal_messages_updated"));
      
      alert(`Sukces! Zestawienie zostało pomyślnie wygenerowane i wysłane czatem do lokatora: ${tenantName}.`);
      setShowInvoiceReportModal(false);
      handleReloadData();
    } catch (err) {
      alert("Błąd podczas generowania i wysyłania raportu: " + err.message);
    } finally {
      setIsGeneratingInvoiceReport(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-400" />
            Rozliczenia i Finanse
          </h2>
          <p className="text-dark-400 text-sm mt-1">Generuj rachunki dla lokatorów i księguj ich płatności.</p>
        </div>

        <div className="flex flex-wrap gap-3 self-start">
          <button
            onClick={() => setShowHistoryWizard(true)}
            className="py-2.5 px-4 bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-brand-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer glass"
          >
            <History className="w-4 h-4 text-brand-400" />
            Uzupełnij Dane Historyczne
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 glass-glow-brand cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Wystaw Rachunek lokatora
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-3 text-xs flex items-start gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}


      {/* 1. Panel Opłat Administracyjnych (Stawki Miesięczne) */}
      <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-800/80 pb-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2 font-sans">
              <Layers className="w-5 h-5 text-brand-400" />
              Miesięczne Opłaty Administracyjne Lokali
            </h3>
            <p className="text-dark-500 text-xxs mt-0.5 font-sans">
              Wprowadź wysokość czynszu administracyjnego dla aktywnie wynajmowanych lokali w danym miesiącu.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xxs text-dark-400 font-bold uppercase tracking-wider">Okres rozliczeniowy:</span>
            <input
              type="month"
              value={adminFeesMonth}
              onChange={(e) => setAdminFeesMonth(e.target.value)}
              className="bg-dark-900 border border-dark-800 rounded-xl px-3 py-1 text-white text-xs font-bold font-mono focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {properties.length === 0 ? (
          <p className="text-dark-500 text-xs py-4 text-center bg-dark-900/30 rounded-xl border border-dark-800">
            Brak aktywnie wynajmowanych lokali w systemie.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-dark-300">
              <thead>
                <tr className="bg-dark-900/40 border-b border-dark-800 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                  <th className="p-3">LP</th>
                  <th className="p-3">Lokal (Mieszkanie)</th>
                  <th className="p-3">Aktywny Najemca</th>
                  <th className="p-3">Czynsz najmu (Z umowy)</th>
                  <th className="p-3 text-right" style={{ width: "200px" }}>Czynsz admin. (PLN / miesiąc)</th>
                  <th className="p-3 text-center" style={{ width: "120px" }}>Status zapisu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 bg-dark-900/10">
                {properties.map((p, idx) => {
                  const tenant = getUserById(p.tenant_id);
                  const val = adminFeesValues[p.id] !== undefined ? adminFeesValues[p.id] : "";
                  const isSaved = adminFeesSavedState[p.id];

                  return (
                    <tr key={p.id} className="hover:bg-dark-900/30 transition-colors">
                      <td className="p-3 font-mono text-dark-500">{idx + 1}</td>
                      <td className="p-3 text-white font-bold">{p.title.split(",")[0]}</td>
                      <td className="p-3 text-dark-350">
                        {tenant ? (
                          <span className="font-semibold text-brand-300">{tenant.name}</span>
                        ) : (
                          <span className="text-dark-500">brak</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-dark-400">
                        {p.rentAmount ? `${p.rentAmount.toLocaleString("pl-PL")} PLN` : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          placeholder="np. 350"
                          value={val}
                          onChange={(e) => handleAdminFeeChange(p.id, e.target.value)}
                          onBlur={(e) => saveSingleAdminFee(p.id, e.target.value)}
                          className="bg-dark-950 border border-dark-800 focus:border-brand-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono text-right w-32 focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded transition-all duration-300 ${
                          isSaved 
                            ? "bg-green-500/10 text-green-400 border border-green-500/25 opacity-100 scale-100" 
                            : "opacity-0 scale-95"
                        }`}>
                          Zapisano ✓
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Rejestr Płatności (Invoices List) */}
      <div className="glass p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-dark-800/80">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            Rejestr Płatności
          </h3>
          
          <button
            type="button"
            onClick={handleOpenInvoiceReportModal}
            className="py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Generuj zestawienie PDF z wyfiltrowanych płatności"
          >
            <FileText className="w-4 h-4" /> Generuj Raport (PDF)
          </button>
        </div>

        {filteredInvoices.length === 0 ? (
          <p className="text-dark-500 text-center py-6 text-sm">
            {invoices.length === 0 
              ? "Brak zarejestrowanych płatności w systemie." 
              : "Brak płatności spełniających wybrane kryteria filtrowania."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-dark-300 min-w-[900px]">
              <thead>
                <tr className="border-b border-dark-800 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                  <th className="pb-3">Tytuł Rachunku</th>
                  <th className="pb-3">Mieszkanie / Najemca</th>
                  <th className="pb-3 text-right">Czynsz najmu</th>
                  <th className="pb-3 text-right">Czynsz admin.</th>
                  <th className="pb-3 text-right">Opłata za media</th>
                  <th className="pb-3 text-right text-brand-400 font-bold">Opłata (Suma)</th>
                  <th className="pb-3 text-center">Termin</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {filteredInvoices.map((inv) => {
                  const prop = getPropertyById(inv.property_id);
                  const tenant = getUserById(inv.tenant_id);
                  const isPaid = inv.status === "paid";
                  const isOverdue = inv.status === "overdue";
 
                  return (
                    <tr key={inv.id} className="hover:bg-dark-900/30 transition-colors">
                      <td className="py-3.5">
                        <div className="font-bold text-white text-xs leading-tight">{inv.title}</div>
                        <div className="text-[10px] text-dark-500 font-mono mt-1">ID: {inv.id}</div>
                        {inv.notes && (
                          <div className="text-[9px] text-dark-450 italic mt-1 bg-dark-950/40 p-1 rounded border border-dark-850 max-w-[180px] truncate" title={inv.notes}>
                            📝 {inv.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold text-white text-xs leading-tight">{prop ? prop.title.split(",")[0] : 'Nieruchomość'}</div>
                        <div className="text-[10px] text-dark-500 mt-1">L: <strong className="text-brand-300 font-medium">{tenant ? tenant.name : 'brak'}</strong></div>
                      </td>
                      <td className="py-3.5 text-right font-mono text-white text-xs">
                        {(inv.amountRent || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono text-white text-xs">
                        {(inv.amountAdmin || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono text-brand-300 font-bold text-xs">
                        {(inv.amountUtilities || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </td>
                      <td className="py-3.5 text-right font-mono text-white font-black">
                        <div className="text-xs">{(inv.amount || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</div>
                        <div className="text-[9px] text-green-400 font-semibold mt-0.5">
                          Wpłata: {(inv.receivedPayment || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                        </div>
                        {(() => {
                          const diff = (inv.receivedPayment || 0) - inv.amount;
                          return (
                            <div className="mt-0.5">
                              {diff > 0 ? (
                                <span className="text-[8px] font-bold text-green-400 bg-green-500/10 px-1 py-0.2 rounded">
                                  Nadpłata: +{diff.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                                </span>
                              ) : diff < 0 ? (
                                <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1 py-0.2 rounded">
                                  Niedopłata: {diff.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                                </span>
                              ) : (
                                <span className="text-[8px] font-semibold text-dark-500">
                                  Rozliczone
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 text-center text-xs">
                        <span className="flex items-center justify-center gap-1 font-medium text-white">
                          <Calendar className="w-3.5 h-3.5 text-dark-500" />
                          {inv.due_date}
                        </span>
                        {(() => {
                          const timeliness = getPaymentTimeliness(inv.due_date, inv.paymentDate, inv.status);
                          if (!timeliness) return null;
                          return (
                            <div className="text-[9px] mt-1 text-center font-sans">
                              <span className={timeliness.colorClass}>
                                {timeliness.message}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isPaid 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : isOverdue 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' 
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {isPaid ? "Opłacona" : isOverdue ? "Zaległa" : "Nieopłacona"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setBookingInvoice(inv);
                              setBookingAmount(inv.receivedPayment || inv.amount);
                              setBookingDate(inv.paymentDate || new Date().toISOString().split('T')[0]);
                              setBookingNotes(inv.notes || "");
                              setShowBookingModal(true);
                            }}
                            className={`py-1 px-2.5 border rounded-xl text-xxs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              inv.receivedPayment > 0
                                ? 'bg-brand-500/10 hover:bg-brand-500/25 border-brand-500/20 text-brand-300'
                                : 'bg-green-500/10 hover:bg-green-500/25 border-green-500/20 text-green-400'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            {inv.receivedPayment > 0 ? "Edytuj" : "Zaksięguj"}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                            title="Usuń płatność"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Panel Analizy Cash Flow i Filtrów */}
      <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800/80 pb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400 font-sans" />
            Panel Analizy Cash Flow i Filtrów
          </h3>
          <span className="text-xxs text-dark-400 font-mono">
            Wyfiltrowano: {filteredInvoices.length} z {invoices.length} rachunków
          </span>
        </div>

        {/* Filters Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 font-sans">Mieszkanie (Wgląd Ogólny)</label>
            <select
              value={filterPropertyId}
              onChange={(e) => setFilterPropertyId(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value="all">Wszystkie mieszkania jednocześnie</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 font-sans">Najemca / Lokator</label>
            <select
              value={filterTenantId}
              onChange={(e) => setFilterTenantId(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value="all">Wszyscy lokatorzy</option>
              {filterTenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 font-sans">Data od</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 font-sans">Data do</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Clear Filters Button if active */}
        {(filterPropertyId !== "all" || filterTenantId !== "all" || filterStartDate || filterEndDate) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setFilterPropertyId("all");
                setFilterTenantId("all");
                setFilterStartDate("");
                setFilterEndDate("");
              }}
              className="text-[10px] font-bold text-brand-400 hover:text-white flex items-center gap-1 bg-brand-500/10 hover:bg-brand-500/25 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-3 h-3" /> Wyczyść wszystkie filtry
            </button>
          </div>
        )}

        {/* Cash Flow Statistics Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 pt-2 font-sans">
          <div className="bg-dark-900/60 p-4 rounded-xl border border-dark-800 flex flex-col justify-between">
            <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block mb-2">Faktyczny Wpływ (Cash-In)</span>
            <div>
              <span className="text-xl md:text-2xl font-bold text-green-400">
                {stats.receivedSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
              </span>
              <span className="text-[9px] text-dark-500 block mt-1">Zaksięgowane środki</span>
            </div>
          </div>

          <div className="bg-dark-900/60 p-4 rounded-xl border border-dark-800 flex flex-col justify-between">
            <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block mb-2">Suma Należności</span>
            <div>
              <span className="text-xl md:text-2xl font-bold text-white">
                {stats.totalSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
              </span>
              <span className="text-[9px] text-dark-500 block mt-1">Czynsz najmu + admin + media</span>
            </div>
          </div>

          <div className="bg-dark-900/60 p-4 rounded-xl border border-dark-800 flex flex-col justify-between">
            <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block mb-2 text-red-400">Zaległości Lokatorów</span>
            <div>
              <span className="text-xl md:text-2xl font-bold text-red-400 font-bold">
                {stats.underpayments.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
              </span>
              <span className="text-[9px] text-dark-500 block mt-1">Niedopłaty do uregulowania</span>
            </div>
          </div>

          <div className="bg-dark-900/60 p-4 rounded-xl border border-dark-800 flex flex-col justify-between">
            <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block mb-2 text-blue-400">Nadpłaty Lokatorów</span>
            <div>
              <span className="text-xl md:text-2xl font-bold text-blue-400">
                {stats.overpayments.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
              </span>
              <span className="text-[9px] text-dark-500 block mt-1">Nadwyżki wpłat</span>
            </div>
          </div>
        </div>

        {/* Detailed split visual bar */}
        <div className="bg-dark-950/40 p-4 rounded-xl border border-dark-850 space-y-3 font-sans">
          <span className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider block">Rozbicie Cash Flow według Kategorii</span>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/40 border border-dark-800">
              <span className="text-dark-400">🏠 Czynsz najmu (Umowy):</span>
              <span className="font-bold text-white">{rentRevenue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/40 border border-dark-800">
              <span className="text-dark-400">🏢 Czynsz administracyjny:</span>
              <span className="font-bold text-white">{stats.adminSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/40 border border-dark-800">
              <span className="text-dark-400">⚡ Opłaty za media:</span>
              <span className="font-bold text-white">{stats.utilitiesSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
            </div>
          </div>
        </div>

        {/* Wykaz Anomalii Płatności */}
        <div className="bg-dark-950/40 p-4 rounded-xl border border-dark-850 space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-dark-800/40 pb-2">
            <span className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider block flex items-center gap-1.5">
              ⚠️ Wykaz Anomalii Płatności (Niedopłaty i Nadpłaty)
            </span>
            <span className="text-[10px] text-dark-500 font-mono">
              Znaleziono: {filteredInvoices.filter(inv => (inv.receivedPayment || 0) !== inv.amount).length} anomalii
            </span>
          </div>

          {(() => {
            const anomalies = filteredInvoices.filter(inv => (inv.receivedPayment || 0) !== inv.amount);
            if (anomalies.length === 0) {
              return (
                <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3 text-center text-xs text-green-400">
                  ✅ Wszystkie wpłaty w tym okresie są w pełni zbilansowane. Brak niedopłat lub nadpłat!
                </div>
              );
            }

            return (
              <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1">
                {anomalies.map((inv) => {
                  const diff = (inv.receivedPayment || 0) - inv.amount;
                  const isUnderpaid = diff < 0;
                  const propertyName = allLandlordProperties.find(p => p.id === inv.property_id)?.title.split(",")[0] || "Mieszkanie";
                  const tenantName = allTenants.find(t => t.id === inv.tenant_id)?.name || "Lokator";
                  
                  let billingMonth = "";
                  if (inv.issueDate) {
                    const d = new Date(inv.issueDate);
                    billingMonth = d.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
                  } else {
                    billingMonth = inv.title;
                  }

                  return (
                    <div 
                      key={inv.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-all ${
                        isUnderpaid 
                          ? "bg-red-500/5 border-red-500/10 hover:border-red-500/20 text-red-300"
                          : "bg-green-500/5 border-green-500/10 hover:border-green-500/20 text-green-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white capitalize">{billingMonth}</span>
                          <span className="text-[10px] text-dark-500 font-mono">ID: {inv.id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-sans ${
                            isUnderpaid 
                              ? "bg-red-500/10 text-red-400"
                              : "bg-green-500/10 text-green-400"
                          }`}>
                            {isUnderpaid ? "Niedopłata" : "Nadpłata"}
                          </span>
                        </div>
                        <p className="text-[10px] text-dark-400">
                          Nieruchomość: <strong className="text-dark-300">{propertyName}</strong> | Lokator: <strong className="text-dark-300">{tenantName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-dark-500 block text-[9px]">Wymagane / Otrzymane:</span>
                          <span className="font-mono text-dark-350">
                            {inv.amount.toFixed(2)} / <strong className={isUnderpaid ? "text-red-400" : "text-green-400"}>{(inv.receivedPayment || 0).toFixed(2)}</strong> PLN
                          </span>
                        </div>
                        <div className={`text-right px-2.5 py-1 rounded-lg font-bold min-w-[90px] ${
                          isUnderpaid ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                        }`}>
                          {isUnderpaid ? "" : "+"}{diff.toFixed(2)} PLN
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Generator i Historia Raportów Finansowych (PDF) */}
        <hr className="border-dark-800/80 my-5" />
        <div className="space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-400" />
                Generator i Historia Raportów Finansowych (PDF)
              </h4>
              <p className="text-[10px] text-dark-400 mt-1 font-sans">
                Wygeneruj pełne zestawienie bilansu Cash Flow dopasowane do aktualnie wybranych filtrów powyżej.
              </p>
            </div>
            
            <button
              type="button"
              disabled={generatingReport}
              onClick={handleGenerateCashFlowReport}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 disabled:from-dark-800 disabled:to-dark-800 text-white rounded-xl text-xxs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-950/20 font-sans"
            >
              {generatingReport ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                  Generowanie...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-white" />
                  Generuj Raport Cash Flow (PDF)
                </>
              )}
            </button>
          </div>

          {/* Active criteria pill badge */}
          <div className="bg-dark-950/30 px-3 py-2 rounded-xl border border-dark-850 text-[10px] text-dark-300 flex flex-wrap gap-x-4 gap-y-1.5 font-mono">
            <span className="font-sans font-bold text-dark-400 uppercase tracking-wider">Kryteria wydruku:</span>
            <span>📍 Nieruchomość: <strong className="text-white font-sans">{
              filterPropertyId !== "all" 
                ? allLandlordProperties.find(p => p.id === filterPropertyId)?.title.split(",")[0] || "Mieszkanie"
                : "Wgląd Ogólny"
            }</strong></span>
            <span>👤 Lokator: <strong className="text-white font-sans">{
              filterTenantId !== "all"
                ? allTenants.find(t => t.id === filterTenantId)?.name || "Lokator"
                : "Wszyscy Lokatorzy"
            }</strong></span>
            <span>📅 Zakres: <strong className="text-white font-sans">{
              (filterStartDate || filterEndDate)
                ? `${filterStartDate || "od początku"} - ${filterEndDate || "teraz"}`
                : "Cały okres"
            }</strong></span>
          </div>

          {/* Snapshots register */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-dark-500 uppercase tracking-wider">Historia wygenerowanych raportów</h5>
            {cashFlowReports.length === 0 ? (
              <p className="text-[10px] text-dark-450 italic font-sans">Brak wcześniej zapisanych raportów dla tej sesji.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10px] font-sans">
                  <thead>
                    <tr className="border-b border-dark-800 text-dark-500 font-bold uppercase tracking-wider">
                      <th className="py-2">Nazwa Pliku Zestawienia</th>
                      <th className="py-2">Rozmiar</th>
                      <th className="py-2">Utworzono</th>
                      <th className="py-2 text-center" style={{ width: "90px" }}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowReports.map(report => (
                      <tr key={report.id} className="border-b border-dark-850/40 text-dark-300 hover:text-white transition-all">
                        <td className="py-2 font-mono text-[9px] truncate max-w-[200px]" title={report.file_name}>
                          {report.file_name.replace("Raport_CashFlow_", "").replace(".html", "").replace(/_/g, " ")}
                        </td>
                        <td className="py-2 font-mono text-[9px]">{report.file_size}</td>
                        <td className="py-2 text-dark-400">
                          {new Date(report.uploaded_at || report.uploadedAt).toLocaleString("pl-PL", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openDocumentFile(report.file_data, report.file_name)}
                              className="p-1.5 text-dark-400 hover:text-brand-400 hover:bg-dark-900 border border-dark-800 hover:border-brand-500 rounded transition-all cursor-pointer"
                              title="Podejrzyj i drukuj PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(report.id)}
                              className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-900 border border-dark-800 hover:border-red-500 rounded transition-all cursor-pointer"
                              title="Usuń raport z dysku"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expenses & Profitability Panel */}
      <div className="glass p-6 rounded-2xl border-brand-500/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800/80 pb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 font-sans">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            Analiza Wydatków Dodatkowych i Rentowności (ROI)
          </h3>
          <button
            onClick={() => setShowAddExpense(!showAddExpense)}
            className="py-1.5 px-3 bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-brand-500 text-white rounded-xl text-xxs font-bold transition-all flex items-center gap-1.5 self-start cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-brand-400" />
            Zarejestruj Koszt (Remont / Ubezpieczenie)
          </button>
        </div>

        {/* Profitability Summary Metrics */}
        <div className="grid gap-6 lg:grid-cols-3 font-sans">
          
          {/* ROI & ROE Circular Gauges & Inputs */}
          <div className="bg-dark-900/60 p-5 rounded-xl border border-dark-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Rentowność ROI / ROE</span>
                <button
                  type="button"
                  onClick={() => setShowRoiSettings(!showRoiSettings)}
                  className="px-2 py-0.5 bg-dark-950 hover:bg-dark-850 border border-dark-800 rounded text-[9px] font-bold text-brand-400 hover:text-white transition-all cursor-pointer"
                >
                  ⚙️ {showRoiSettings ? "Ukryj parametry" : "Dostosuj kapitał"}
                </button>
              </div>

              {showRoiSettings && (
                <div className="bg-dark-950/50 p-2.5 rounded-lg border border-dark-850 mb-3 space-y-2 text-xxs animate-fade-in">
                  <span className="font-bold text-dark-350 block mb-1">Parametry inwestycji dla ROE:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-dark-400 mb-0.5">Wartość lokalu (PLN):</label>
                      <input
                        type="number"
                        placeholder={resolvedPropertyValue}
                        value={customPropertyValue || ""}
                        onChange={(e) => handlePropertyValueChange(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded px-1.5 py-1 text-white text-[10px] font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-dark-400 mb-0.5">Kapitał własny (PLN):</label>
                      <input
                        type="number"
                        placeholder={resolvedEquityValue}
                        value={customEquityValue || ""}
                        onChange={(e) => handleEquityValueChange(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded px-1.5 py-1 text-white text-[10px] font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                  {roiError && (
                    <p className="text-[9px] text-red-400 mt-1 font-bold animate-pulse">
                      ⚠️ {roiError}
                    </p>
                  )}
                  <p className="text-[8px] text-dark-500 italic mt-1 leading-normal">
                    * Wprowadź własne kwoty, aby system precyzyjnie wyliczył ROE (Return on Equity). Domyślnie szacowane na podstawie stawek najmu i 30% wkładu.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* ROI Gauge */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-xl ${
                      realRoiPercentage >= 80 
                        ? 'border-green-500/30 bg-green-500/5 text-green-400 shadow-green-950/20' 
                        : realRoiPercentage >= 40 
                        ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 shadow-yellow-950/20' 
                        : 'border-red-500/30 bg-red-500/5 text-red-400 shadow-red-950/20'
                    }`}>
                      <span className="text-lg font-extrabold tracking-tight">{realRoiPercentage}%</span>
                      <span className="text-[7px] uppercase tracking-wide font-semibold opacity-85">Real ROI</span>
                    </div>
                  </div>
                  <span className="text-[8px] text-dark-400 font-semibold uppercase tracking-wider mt-2">Rentowność ROI</span>
                </div>

                {/* ROE Gauge */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-xl ${
                      realRoePercentage >= 10 
                        ? 'border-green-500/30 bg-green-500/5 text-green-400 shadow-green-950/20' 
                        : realRoePercentage >= 4 
                        ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 shadow-yellow-950/20' 
                        : 'border-red-500/30 bg-red-500/5 text-red-400 shadow-red-950/20'
                    }`}>
                      <span className="text-lg font-extrabold tracking-tight">{realRoePercentage}%</span>
                      <span className="text-[7px] uppercase tracking-wide font-semibold opacity-85">Real ROE</span>
                    </div>
                  </div>
                  <span className="text-[8px] text-dark-400 font-semibold uppercase tracking-wider mt-2">Zwrot z wkładu (ROE)</span>
                </div>
              </div>
            </div>

            <div className="border-t border-dark-850 pt-2.5 text-center">
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                realRoiPercentage >= 80 
                  ? 'bg-green-500/10 text-green-400' 
                  : realRoiPercentage >= 40 
                  ? 'bg-yellow-500/10 text-yellow-400' 
                  : 'bg-red-500/10 text-red-400 animate-pulse'
              }`}>
                {realRoiPercentage >= 80 
                  ? 'Wysoka rentowność operacyjna' 
                  : realRoiPercentage >= 40 
                  ? 'Umiarkowana rentowność' 
                  : 'Niska rentowność / Koszty'}
              </span>
            </div>
          </div>

          {/* Real NOI Breakdown */}
          <div className="bg-dark-900/60 p-5 rounded-xl border border-dark-800 flex flex-col justify-between space-y-3">
            <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block">Realny Zysk Operacyjny Netto</span>
            <div className="space-y-1.5 text-[10px] font-mono">
              <div className="flex justify-between items-center bg-dark-950/30 px-2 py-1 rounded">
                <span className="text-dark-400 font-sans">Przychód z najmu (Czynsz):</span>
                <span className="text-white font-bold">{rentRevenue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
              </div>
              <div className="flex justify-between items-center bg-dark-950/30 px-2 py-1 rounded">
                <span className="text-dark-400 font-sans">Czynsz administracyjny (Wpłata lokatora):</span>
                <span className="text-green-400 font-semibold">+{stats.adminSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
              </div>
              <div className="flex justify-between items-center bg-dark-950/30 px-2 py-1 rounded">
                <span className="text-dark-400 font-sans">Koszty wspólnoty (Czynsz adm. - koszt):</span>
                <span className="text-red-400 font-semibold">-{stats.adminSum.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
              </div>
              <div className="flex justify-between items-center bg-dark-950/30 px-2 py-1 rounded">
                <span className="text-dark-400 font-sans">Naprawy i konserwacja:</span>
                <span className="text-red-400 font-semibold">-{expenseStats.renovationExpenses.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
              </div>
              <div className="flex justify-between items-center bg-dark-950/30 px-2 py-1 rounded">
                <span className="text-dark-400 font-sans">Koszty ubezpieczeń:</span>
                <span className="text-red-400 font-semibold">-{expenseStats.insuranceExpenses.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
              </div>
              <div className="flex justify-between items-center bg-dark-950/30 px-2 py-1 rounded border-b border-dark-800 pb-1">
                <span className="text-dark-400 font-sans">Zryczałtowany podatek (8.5%):</span>
                <span className="text-red-400 font-semibold">-{flatTaxAmount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
              </div>
              <div className="flex justify-between items-center bg-brand-500/5 p-2 rounded border border-brand-500/20 text-xs">
                <span className="text-brand-300 font-bold font-sans flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  Realny Zysk Netto:
                </span>
                <span className={`font-bold font-mono ${realNetIncome >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {realNetIncome.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                </span>
              </div>
            </div>
          </div>

          {/* Vacancy Rate Widget */}
          <div className="bg-dark-900/60 p-5 rounded-xl border border-dark-800 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block mb-1">Wskaźnik Pustostanu (2026)</span>
                <p className="text-[9px] text-dark-450 leading-normal font-sans">
                  Stosunek dni bezumownych lokalu do całego roku kalendarzowego 2026.
                </p>
              </div>
              <div className={`text-xxs font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ${
                vacancyRate === 0 
                  ? "bg-green-500/10 text-green-400" 
                  : vacancyRate < 20 
                  ? "bg-yellow-500/10 text-yellow-400" 
                  : "bg-red-500/10 text-red-400"
              }`}>
                {vacancyRate}% Pustostan
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Radial Meter */}
              <div className="relative flex items-center justify-center shrink-0">
                <div className={`w-18 h-18 rounded-full border-4 flex flex-col items-center justify-center shadow-lg ${
                  vacancyRate === 0 
                    ? 'border-green-500/30 bg-green-500/5 text-green-400 shadow-green-950/10' 
                    : vacancyRate < 20 
                    ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 shadow-yellow-950/10' 
                    : 'border-red-500/30 bg-red-500/5 text-red-400 shadow-red-950/10'
                }`}>
                  <span className="text-base font-extrabold tracking-tight">{vacancyRate}%</span>
                  <span className="text-[6px] uppercase tracking-wide font-semibold opacity-85">Vacant</span>
                </div>
              </div>

              {/* Vacancy Text info */}
              <div className="space-y-1.5 flex-1 text-xxs font-sans">
                <div className="flex justify-between border-b border-dark-850 pb-1">
                  <span className="text-dark-400">Dni pustostanu:</span>
                  <strong className="text-white font-mono">{aggVacantDays} / {aggPossibleDays} dni</strong>
                </div>
                <div className="flex justify-between border-b border-dark-850 pb-1">
                  <span className="text-dark-400">Aktywny najem:</span>
                  <strong className="text-green-400 font-mono">{aggPossibleDays - aggVacantDays} dni</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Średnie obłożenie:</span>
                  <strong className="text-brand-300 font-mono">{100 - vacancyRate}%</strong>
                </div>
              </div>
            </div>

            {/* List details of properties */}
            <div className="bg-dark-950/30 p-2 rounded-lg border border-dark-850 text-[9px] space-y-1 font-mono">
              <span className="text-dark-500 uppercase tracking-wider block font-bold text-[8px] mb-1">Dni pustostanu w podziale na lokale:</span>
              {propertyVacancyStats.map(stat => (
                <div key={stat.propertyId} className="flex justify-between">
                  <span className="text-dark-400 truncate max-w-[130px]" title={stat.propertyTitle}>{stat.propertyTitle.split(",")[0]}:</span>
                  <span className={stat.vacantDays > 0 ? "text-yellow-400 font-bold" : "text-green-400"}>
                    {stat.vacantDays} dni ({stat.vacantRate}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aging Debts Timeline & Risk Exposure Panel */}
        <div className="bg-dark-900/60 p-5 rounded-xl border border-dark-800 space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-dark-800/80 pb-3">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Ekspozycja na Ryzyko Płatności (Aging Debts)
              </h4>
              <p className="text-[10px] text-dark-450 mt-0.5">
                Raport starzenia się zadłużeń dla niezapłaconych lub częściowo opłaconych rachunków.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-dark-450 block uppercase tracking-wider font-semibold">Całkowite zaległe zadłużenie:</span>
              <span className={`text-sm font-extrabold font-mono ${totalAgingDebt > 0 ? "text-red-400 animate-pulse" : "text-green-400"}`}>
                {totalAgingDebt.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
              </span>
            </div>
          </div>

          {/* Segmented Timeline visual bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] text-dark-400 font-semibold uppercase tracking-wider">
              <span>Podział długu na klasy ryzyka</span>
              <span className="font-mono">Suma: {totalAgingDebt.toFixed(2)} PLN</span>
            </div>
            <div className="h-3.5 w-full bg-dark-950 rounded-full overflow-hidden flex border border-dark-850">
              {totalAgingDebt === 0 ? (
                <div className="h-full w-full bg-green-500/20 text-green-400 flex items-center justify-center text-[8px] font-bold uppercase tracking-widest font-sans">
                  ✨ Wszystkie należności uregulowane w terminie
                </div>
              ) : (
                <>
                  {agingDebtsBrackets.low.total > 0 && (
                    <div 
                      style={{ width: `${(agingDebtsBrackets.low.total / totalAgingDebt) * 100}%` }}
                      className="h-full bg-green-500/80 hover:brightness-110 transition-all cursor-help border-r border-dark-950/20"
                      title={`Niskie ryzyko: ${agingDebtsBrackets.low.total.toFixed(2)} PLN`}
                    />
                  )}
                  {agingDebtsBrackets.medium.total > 0 && (
                    <div 
                      style={{ width: `${(agingDebtsBrackets.medium.total / totalAgingDebt) * 100}%` }}
                      className="h-full bg-yellow-500/80 hover:brightness-110 transition-all cursor-help border-r border-dark-950/20"
                      title={`Średnie ryzyko: ${agingDebtsBrackets.medium.total.toFixed(2)} PLN`}
                    />
                  )}
                  {agingDebtsBrackets.high.total > 0 && (
                    <div 
                      style={{ width: `${(agingDebtsBrackets.high.total / totalAgingDebt) * 100}%` }}
                      className="h-full bg-orange-500/80 hover:brightness-110 transition-all cursor-help border-r border-dark-950/20"
                      title={`Wysokie ryzyko: ${agingDebtsBrackets.high.total.toFixed(2)} PLN`}
                    />
                  )}
                  {agingDebtsBrackets.critical.total > 0 && (
                    <div 
                      style={{ width: `${(agingDebtsBrackets.critical.total / totalAgingDebt) * 100}%` }}
                      className="h-full bg-red-500/80 hover:brightness-110 transition-all cursor-help"
                      title={`Krytyczne: ${agingDebtsBrackets.critical.total.toFixed(2)} PLN`}
                    />
                  )}
                </>
              )}
            </div>

            {/* Bracket cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center">
              {Object.keys(agingDebtsBrackets).map(key => {
                const br = agingDebtsBrackets[key];
                const activeGlow = br.total > 0;
                let ringColor = "border-dark-800 bg-dark-950/20";
                if (activeGlow) {
                  if (key === "low") ringColor = "border-green-500/30 bg-green-500/5 shadow-lg shadow-green-950/10";
                  if (key === "medium") ringColor = "border-yellow-500/30 bg-yellow-500/5 shadow-lg shadow-yellow-950/10";
                  if (key === "high") ringColor = "border-orange-500/30 bg-orange-500/5 shadow-lg shadow-orange-950/10";
                  if (key === "critical") ringColor = "border-red-500/30 bg-red-500/5 shadow-lg shadow-red-950/10";
                }

                return (
                  <div key={key} className={`p-3 rounded-lg border transition-all ${ringColor}`}>
                    <span className="text-[8px] text-dark-400 uppercase tracking-wider font-bold block mb-1">{br.name}</span>
                    <span className={`text-xs font-bold font-mono block ${activeGlow ? (key === 'low' ? 'text-green-400' : key === 'medium' ? 'text-yellow-400' : key === 'high' ? 'text-orange-400' : 'text-red-400') : 'text-dark-500'}`}>
                      {br.total.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                    </span>
                    <span className="text-[8px] text-dark-500 block mt-0.5 font-sans font-medium">
                      {br.items.length} {br.items.length === 1 ? "rachunek" : br.items.length > 1 && br.items.length < 5 ? "rachunki" : "rachunków"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of overdue invoices grouped by brackets or in a neat timeline table */}
          <div className="space-y-2 pt-2">
            <span className="text-[9px] text-dark-400 font-semibold uppercase tracking-wider block">Wykaz zadłużeń na osi czasu</span>
            
            {agingInvoices.length === 0 ? (
              <div className="bg-dark-950/30 p-4 rounded-xl border border-dark-850/60 text-center flex flex-col items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400 mb-1.5" />
                <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Brak aktywnych zaległości!</p>
                <p className="text-[9px] text-dark-450 mt-0.5">Wszyscy najemcy opłacają faktury zgodnie z terminami płatności.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-dark-800">
                <table className="w-full text-left border-collapse text-[10px] font-sans text-dark-300">
                  <thead>
                    <tr className="bg-dark-900/40 border-b border-dark-800 text-[9px] font-bold text-dark-400 uppercase tracking-wider">
                      <th className="p-2.5">Najemca / Lokal</th>
                      <th className="p-2.5">Tytuł opłaty</th>
                      <th className="p-2.5">Termin</th>
                      <th className="p-2.5 text-center">Spóźnienie</th>
                      <th className="p-2.5 text-right">Kwota należności</th>
                      <th className="p-2.5 text-right">Zaległość</th>
                      <th className="p-2.5 text-center">Klasa ryzyka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-850/60 bg-dark-900/10 font-medium">
                    {(() => {
                      // Flatten and sort by overdue days descending
                      const sortedItems = [];
                      Object.keys(agingDebtsBrackets).forEach(key => {
                        agingDebtsBrackets[key].items.forEach(item => {
                          sortedItems.push({
                            ...item,
                            bracketKey: key
                          });
                        });
                      });
                      sortedItems.sort((a, b) => b.overdueDays - a.overdueDays);

                      return sortedItems.map((item, idx) => {
                        const inv = item.invoice;
                        const tName = allTenants.find(t => t.id === inv.tenant_id)?.name || "Lokator";
                        const pName = allLandlordProperties.find(p => p.id === inv.property_id)?.title.split(",")[0] || "Mieszkanie";
                        
                        let badgeColor = "bg-green-500/10 text-green-400 border border-green-500/20";
                        let riskLabel = "Niskie";
                        if (item.bracketKey === "medium") {
                          badgeColor = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse";
                          riskLabel = "Średnie";
                        } else if (item.bracketKey === "high") {
                          badgeColor = "bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse";
                          riskLabel = "Wysokie";
                        } else if (item.bracketKey === "critical") {
                          badgeColor = "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse";
                          riskLabel = "Krytyczne";
                        }

                        return (
                          <tr key={inv.id} className="hover:bg-dark-900/30 transition-colors">
                            <td className="p-2.5">
                              <span className="font-bold text-white block">{tName}</span>
                              <span className="text-[9px] text-dark-450 block">{pName}</span>
                            </td>
                            <td className="p-2.5 text-white">{inv.title}</td>
                            <td className="p-2.5 font-mono text-[9px]">{inv.due_date}</td>
                            <td className="p-2.5 text-center font-bold text-red-400 font-mono text-[10px]">
                              {item.overdueDays} {item.overdueDays === 1 ? "dzień" : "dni"}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold">
                              {inv.amount.toFixed(2)} PLN
                            </td>
                            <td className="p-2.5 text-right font-mono font-extrabold text-red-400 text-[11px]">
                              {item.outstandingAmount.toFixed(2)} PLN
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>
                                {riskLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
            <div className="glass max-w-xl w-full p-6 rounded-2xl border-brand-500/20 space-y-4 shadow-2xl relative">
              <button 
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans border-b border-dark-800 pb-3 text-brand-400">
                <PlusCircle className="w-4.5 h-4.5 text-brand-400" />
                Zarejestruj Koszt (Remont / Ubezpieczenie / Doposażenie)
              </h4>
              
              <form onSubmit={(e) => { if (handleAddExpense(e)) { setShowAddExpense(false); } }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Wybierz Mieszkanie *</label>
                    {filterPropertyId !== "all" ? (
                      <select
                        value={expensePropertyId}
                        disabled
                        className="w-full bg-dark-950 border border-dark-850 text-dark-500 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-not-allowed font-medium select-none"
                      >
                        <option value={filterPropertyId}>
                          {properties.find(p => p.id === filterPropertyId)?.title.split(",")[0] || "Wybrane Mieszkanie"}
                        </option>
                      </select>
                    ) : (
                      <select
                        value={expensePropertyId}
                        onChange={(e) => setExpensePropertyId(e.target.value)}
                        required
                        className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                      >
                        <option value="" disabled>-- Wybierz --</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>{p.title.split(",")[0]}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Kategoria Kosztu *</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                    >
                      <option value="renovation">🛠️ Remont i naprawy</option>
                      <option value="insurance">🛡️ Ubezpieczenie</option>
                      <option value="furnishing">🛋️ Doposażenie wnętrz</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Kwota Kosztu (PLN) *</label>
                    <input
                      type="number" required placeholder="np. 500"
                      value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Data poniesienia *</label>
                    <input
                      type="date" required
                      value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-800 rounded-lg px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Krótki opis wydatku *</label>
                  <input
                    type="text" required placeholder="np. Zakup nowych krzeseł kuchennych lub roczna składka ubezpieczenia lokalu"
                    value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                 <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Zapisz Koszt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Expenses List section */}
        <div className="space-y-3 font-sans">
          <span className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider block">Wydatki Dodatkowe Lokalu w Wybranym Okresie</span>
          
          {filteredExpenses.length === 0 ? (
            <p className="text-dark-500 text-xs py-4 text-center bg-dark-900/30 rounded-xl border border-dark-800">
              {expenses.length === 0 
                ? "Brak zarejestrowanych wydatków dodatkowych w systemie." 
                : "Brak wydatków spełniających wybrane kryteria filtracji."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-dark-800">
              <table className="w-full border-collapse text-left text-xs text-dark-300">
                <thead>
                  <tr className="bg-dark-900/40 border-b border-dark-800 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                    <th className="p-3">Data</th>
                    <th className="p-3">Mieszkanie</th>
                    <th className="p-3">Kategoria</th>
                    <th className="p-3">Krótki opis wydatku</th>
                    <th className="p-3 text-right">Kwota</th>
                    <th className="p-3 text-center">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 bg-dark-900/10">
                  {filteredExpenses.map((exp) => {
                    const prop = getPropertyById(exp.property_id);
                    return (
                      <tr key={exp.id} className="hover:bg-dark-900/30 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-white">{exp.date}</td>
                        <td className="p-3 text-white">{prop ? prop.title.split(",")[0] : "Nieruchomość"}</td>
                        <td className="p-3 font-semibold text-brand-300">
                          {exp.category === "renovation" ? "🛠️ Remont" : exp.category === "insurance" ? "🛡️ Ubezpieczenie" : "🛋️ Doposażenie"}
                        </td>
                        <td className="p-3 text-dark-300 max-w-[200px] truncate" title={exp.description}>
                          {exp.description}
                        </td>
                        <td className="p-3 text-right font-bold text-red-400 font-mono">
                          {exp.amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer ml-auto block"
                            title="Usuń wydatek"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Generate Invoice Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-2xl w-full p-6 rounded-2xl border-brand-500/20 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 border-b border-dark-800 pb-3 font-sans">
              <PlusCircle className="w-5 h-5 text-brand-400" />
              Wystaw Nowy Rachunek dla Lokatora
            </h3>

            {properties.length === 0 ? (
              <p className="text-sm text-yellow-500 bg-yellow-500/5 p-4 border border-yellow-500/20 rounded-xl">
                Błąd: Nie posiadasz mieszkań z przypisanymi lokatorami. Przypisz lokatora w zakładce "Nieruchomości", aby móc wystawiać faktury.
              </p>
            ) : (
              <form onSubmit={handleGenerateInvoice} className="grid gap-4 md:grid-cols-2 text-xs">
                <div>
                  <label className="block text-xxs font-semibold text-dark-400 uppercase tracking-wider mb-1">Mieszkanie (Tylko z lokatorami)</label>
                  <select 
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                  >
                    {properties.map(p => {
                      const ten = getUserById(p.tenant_id);
                      return (
                        <option key={p.id} value={p.id}>{p.title} ({ten ? ten.name : 'brak'})</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-dark-400 uppercase tracking-wider mb-1">Tytuł opłaty *</label>
                  <input 
                    type="text" required placeholder="np. Czynsz - Czerwiec 2026"
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-dark-400 uppercase tracking-wider mb-1">Czynsz najmu (Z umowy najmu - Tylko do odczytu)</label>
                  <input 
                    type="number" readOnly disabled
                    value={amountRent}
                    className="w-full bg-dark-950 border border-dark-850 text-dark-500 rounded-xl px-3 py-2 text-xs focus:outline-none cursor-not-allowed font-medium select-none"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-dark-400 uppercase tracking-wider mb-1">Czynsz administracyjny (PLN) *</label>
                  <input 
                    type="number" required placeholder="np. 300"
                    value={amountAdmin} onChange={(e) => setAmountAdmin(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none font-medium"
                  />
                  {adminFeeLoadedStatus && (
                    <span className="text-[10px] text-green-400 font-bold block mt-1.5 animate-pulse">
                      ✨ {adminFeeLoadedStatus}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-dark-400 uppercase tracking-wider mb-1">Opłata za media (PLN) *</label>
                  <input 
                    type="number" required placeholder="np. 150"
                    value={amountUtilities} onChange={(e) => setAmountUtilities(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none font-medium"
                  />
                  {mediaFeeLoadedStatus && (
                    <span className="text-[10px] text-brand-300 font-bold block mt-1.5 animate-pulse">
                      ✨ {mediaFeeLoadedStatus}
                    </span>
                  )}
                </div>

                <div className="flex flex-col justify-end bg-brand-500/5 p-3 rounded-xl border border-brand-500/20">
                  <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider block mb-1">Wyliczona suma (Razem)</span>
                  <span className="text-xl font-bold text-white tracking-tight">
                    {(Number(amountRent) + Number(amountAdmin) + Number(amountUtilities) || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                  </span>
                </div>

                <div>
                  <label className="block text-xxs font-semibold text-dark-400 uppercase tracking-wider mb-1">Termin płatności *</label>
                  <input 
                    type="date" required
                    value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xxs font-semibold text-dark-400 uppercase tracking-wider mb-1">Uwagi / Dodatkowe notatki</label>
                  <input 
                    type="text" placeholder="np. Standardowa opłata czynszowa wraz z ryczałtem na media."
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-dark-800">
                  <button 
                    type="button" onClick={() => setShowAddForm(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Generuj Rachunek
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Invoices List was moved to position 2 */}

      {/* Booking Payment Modal Window */}
      {showBookingModal && bookingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-lg w-full p-6 rounded-2xl border-brand-500/20 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => {
                setShowBookingModal(false);
                setBookingInvoice(null);
              }}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-dark-800 pb-3 text-brand-400">
              <CreditCard className="w-5 h-5 text-brand-400" />
              {bookingInvoice.receivedPayment > 0 ? "Edytuj zaksięgowaną płatność" : "Zaksięguj nową wpłatę"}
            </h3>

            {/* Invoice summary info */}
            <div className="bg-dark-900/40 p-3.5 rounded-xl border border-dark-800 space-y-2 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-dark-400">Rachunek:</span>
                <span className="font-semibold text-white">{bookingInvoice.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Mieszkanie:</span>
                <span className="text-white font-medium">{getPropertyById(bookingInvoice.property_id)?.title || "Nieruchomość"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Lokator:</span>
                <span className="text-white font-medium">{getUserById(bookingInvoice.tenant_id)?.name || "Lokator"}</span>
              </div>
              <div className="border-t border-dark-800/80 pt-2 flex justify-between font-medium">
                <span className="text-dark-400">Kwota do zapłaty (Razem):</span>
                <span className="text-brand-300 font-bold">{bookingInvoice.amount} PLN</span>
              </div>
            </div>

            <form onSubmit={handleBookPaymentSubmit} className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Kwota wpłacona przez lokatora (PLN) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={bookingAmount}
                  onChange={(e) => setBookingAmount(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-brand-500 focus:outline-none font-bold"
                  placeholder="Wpisz otrzymaną kwotę np. 2500"
                />
              </div>

              {/* Dynamic Discrepancy Preview */}
              {(() => {
                const entered = Number(bookingAmount) || 0;
                const total = bookingInvoice.amount;
                const diff = entered - total;

                if (diff === 0) {
                  return (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-green-500/20 px-2 py-0.5 rounded-full shrink-0">
                        Zgodna wpłata
                      </span>
                      <span>Rachunek zostanie oznaczony jako <strong>opłacony</strong>.</span>
                    </div>
                  );
                } else if (diff < 0) {
                  return (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-red-500/20 px-2 py-0.5 rounded-full shrink-0">
                          Niedopłata: {diff.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                        </span>
                        <span>Rachunek pozostanie <strong>nieopłacony</strong>.</span>
                      </div>
                      <p className="text-[10px] text-dark-400">
                        Lokator wpłacił mniej niż suma należności. Saldo zostanie zaktualizowane, a status pozostanie niezmieniony.
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-blue-500/20 px-2 py-0.5 rounded-full shrink-0">
                          Nadpłata: +{diff.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                        </span>
                        <span>Rachunek zostanie oznaczony jako <strong>opłacony</strong>.</span>
                      </div>
                      <p className="text-[10px] text-dark-400">
                        Lokator wpłacił więcej niż suma należności. Nadwyżka zostanie zaliczona w saldzie lokatora.
                      </p>
                    </div>
                  );
                }
              })()}

              <div>
                <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Rzeczywista data płatności *
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                />
                <p className="text-[10px] text-dark-500 mt-1">
                  Określa, kiedy przelew faktycznie wpłynął. Służy do dokładnego wyliczenia terminowości wpłat.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1.5">
                  Uwagi / komentarz do wpłaty
                </label>
                <textarea
                  rows="2"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="np. Częściowa płatność, reszta zostanie przelana wkrótce."
                  className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

               <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingInvoice(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                >
                  Zatwierdź wpłatę
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Report Wizard Modal */}
      {showInvoiceReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-xl w-full p-6 rounded-2xl border-brand-500/20 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => {
                setShowInvoiceReportModal(false);
                setReportSendingTenantId("");
              }}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer animate-none"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-dark-800 pb-3 text-brand-400">
              <FileText className="w-5 h-5 text-brand-400" />
              Kreator Raportu Rejestru Płatności
            </h3>

            {/* Current filters details */}
            <div className="bg-dark-900/40 p-3.5 rounded-xl border border-dark-800 space-y-2.5 text-xs text-left">
              <div className="flex justify-between border-b border-dark-850 pb-1.5 mb-1.5">
                <span className="font-semibold text-brand-300">Podsumowanie wyfiltrowanych danych:</span>
                <span className="text-dark-400">Liczba pozycji: <strong className="text-white">{filteredInvoices.length}</strong></span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Wybrane mieszkanie:</span>
                <span className="font-semibold text-white">
                  {filterPropertyId !== "all" 
                    ? allLandlordProperties.find(p => p.id === filterPropertyId)?.title.split(",")[0] || "Mieszkanie"
                    : "Wszystkie Lokale"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Wybrany najemca:</span>
                <span className="font-semibold text-white">
                  {filterTenantId !== "all" 
                    ? allTenants.find(t => t.id === filterTenantId)?.name || "Lokator"
                    : "Wszyscy Najemcy"}
                </span>
              </div>
              
              {/* Aggregated values */}
              {(() => {
                let totalInvoiced = 0;
                let totalPaid = 0;
                filteredInvoices.forEach(inv => {
                  totalInvoiced += inv.amount || 0;
                  totalPaid += inv.receivedPayment || 0;
                });
                const totalBalance = totalPaid - totalInvoiced;
                
                return (
                  <>
                    <div className="flex justify-between pt-1 border-t border-dark-850">
                      <span className="text-dark-400">Suma należności:</span>
                      <span className="font-bold font-mono text-white">{totalInvoiced.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Suma wpłat:</span>
                      <span className="font-bold font-mono text-green-400">{totalPaid.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-dark-850 font-bold">
                      <span className="text-brand-300">Bilans / Saldo końcowe:</span>
                      <span className={`font-mono ${totalBalance < 0 ? 'text-red-400' : totalBalance > 0 ? 'text-green-400' : 'text-white'}`}>
                        {totalBalance > 0 ? '+' : ''}{totalBalance.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Chat Send tenant selector */}
            {filterTenantId === "all" ? (
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-dark-500 uppercase tracking-wider font-sans">
                  Wybierz lokatora do wysłania czatem
                </label>
                <select
                  value={reportSendingTenantId}
                  onChange={(e) => setReportSendingTenantId(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="">-- Wybierz lokatora z listy --</option>
                  {(() => {
                    // Find all unique tenants present in the filtered invoices list
                    const tenantIdsInFiltered = [...new Set(filteredInvoices.map(inv => inv.tenant_id))];
                    return tenantIdsInFiltered.map(tId => {
                      const t = allTenants.find(ten => ten.id === tId);
                      if (!t) return null;
                      return <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>;
                    });
                  })()}
                </select>
                <p className="text-[10px] text-dark-500 italic mt-0.5">
                  Wysyłanie czatem wymaga wybrania lokatora, ponieważ filtrowanie obejmuje obecnie wielu najemców.
                </p>
              </div>
            ) : (
              <div className="bg-brand-500/10 p-3 rounded-xl border border-brand-500/20 text-xs text-left text-brand-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Opcja wysyłki czatem jest wstępnie skonfigurowana dla lokatora: <strong>{allTenants.find(t => t.id === filterTenantId)?.name}</strong>.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-dark-800 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceReportModal(false);
                  setReportSendingTenantId("");
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-dark-900 hover:bg-dark-800 text-dark-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Anuluj
              </button>
              
              <button
                type="button"
                disabled={isGeneratingInvoiceReport || (filterTenantId === "all" && !reportSendingTenantId)}
                onClick={handleGenerateAndSendInvoiceReport}
                className="w-full sm:w-auto px-4 py-2.5 bg-dark-805 hover:bg-brand-600 text-brand-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border border-brand-500/20 hover:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                title="Wysyła plik raportu w czacie do wybranego lokatora"
              >
                <Send className="w-3.5 h-3.5" /> Generuj i Wyślij Czatem
              </button>

              <button
                type="button"
                disabled={isGeneratingInvoiceReport}
                onClick={handleGenerateAndDownloadInvoiceReport}
                className="w-full sm:w-auto px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 shadow-md"
                title="Pobiera plik raportu bezpośrednio na Twój dysk"
              >
                <Download className="w-3.5 h-3.5" /> Generuj i Pobierz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Wizard Modal */}
      {showHistoryWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
          <div className="glass max-w-3xl w-full p-6 rounded-2xl border-brand-500/20 space-y-6 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setShowHistoryWizard(false)}
              className="absolute top-4 right-4 p-1.5 bg-dark-900 hover:bg-dark-800 text-dark-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="border-b border-dark-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
                <History className="w-5 h-5 text-brand-400" />
                Kreator Uzupełniania Danych Historycznych
              </h3>
              <p className="text-xxs text-dark-450 mt-1">Poprzedni lokatorzy, archiwalne czynsze, opłacone media i baseline'y liczników.</p>
            </div>

            {/* Tab Selectors */}
            <div className="flex overflow-x-auto whitespace-nowrap border-b border-dark-850 gap-1 sm:gap-2 text-xs pb-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setWizardTab("tenants")}
                className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  wizardTab === "tenants" 
                    ? "border-brand-500 text-white" 
                    : "border-transparent text-dark-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Lokatorzy i Umowy
              </button>
              
              <button
                type="button"
                onClick={() => setWizardTab("invoices")}
                className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  wizardTab === "invoices" 
                    ? "border-brand-500 text-white" 
                    : "border-transparent text-dark-400 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                Rachunki i Wpłaty
              </button>

              <button
                type="button"
                onClick={() => setWizardTab("meters")}
                className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  wizardTab === "meters" 
                    ? "border-brand-500 text-white" 
                    : "border-transparent text-dark-400 hover:text-white"
                }`}
              >
                <Database className="w-4 h-4" />
                Odczyty Liczników
              </button>
            </div>

            {/* Form Section */}
            {wizardTab === "tenants" && (
              <form onSubmit={handleHistTenantSubmit} className="space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-dark-800/40 text-brand-300">Dane Podstawowe Lokatora</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Imię i nazwisko *</label>
                        <input
                          type="text" required placeholder="np. Jan Kowalski"
                          list="existing-tenants-list"
                          value={histTenantName} onChange={(e) => setHistTenantName(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                        <datalist id="existing-tenants-list">
                          {allTenants.map(t => (
                            <option key={t.id} value={t.name} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Adres E-mail *</label>
                        <input
                          type="email" required placeholder="np. jan@lokator.pl"
                          value={histTenantEmail} onChange={(e) => setHistTenantEmail(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Telefon</label>
                          <input
                            type="text" placeholder="+48 600..."
                            value={histTenantPhone} onChange={(e) => setHistTenantPhone(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Dowód Osobisty</label>
                          <input
                            type="text" placeholder="ABC 123..."
                            value={histTenantIdCard} onChange={(e) => setHistTenantIdCard(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Adres korespondencyjny</label>
                        <input
                          type="text" placeholder="Adres zameldowania lokatora"
                          value={histTenantAddress} onChange={(e) => setHistTenantAddress(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-1 border-b border-dark-800/40 text-brand-300">Dane Współlokatora (Opcjonalnie)</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Imię i nazwisko współlokatora</label>
                        <input
                          type="text" placeholder="np. Maria Kowalska"
                          value={histRoommateName} onChange={(e) => setHistRoommateName(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">E-mail współlokatora</label>
                        <input
                          type="email" placeholder="np. maria@lokator.pl"
                          value={histRoommateEmail} onChange={(e) => setHistRoommateEmail(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Telefon</label>
                          <input
                            type="text" placeholder="+48 600..."
                            value={histRoommatePhone} onChange={(e) => setHistRoommatePhone(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Dowód współlokatora</label>
                          <input
                            type="text" placeholder="XYZ 987..."
                            value={histRoommateIdCard} onChange={(e) => setHistRoommateIdCard(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-900/40 p-4 rounded-xl border border-dark-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-brand-300">Powiązanie z Nieruchomością i Warunki Umowy</h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Wybierz Mieszkanie</label>
                      <select
                        value={histPropertyId} onChange={(e) => setHistPropertyId(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      >
                        <option value="none">-- Tylko rejestruj lokatora (bez przypisania) --</option>
                        {allLandlordProperties.map(p => (
                          <option key={p.id} value={p.id}>{p.title} ({p.address})</option>
                        ))}
                      </select>
                    </div>

                    {histPropertyId !== "none" && (
                      <>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Czynsz Najmu z Umowy (PLN)</label>
                          <input
                            type="number" placeholder="np. 2000"
                            value={histRentAmount} onChange={(e) => setHistRentAmount(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Dzień Płatności Czynszu</label>
                          <input
                            type="number" min="1" max="31" placeholder="10"
                            value={histPaymentDueDay} onChange={(e) => setHistPaymentDueDay(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Początek Umowy</label>
                          <input
                            type="date"
                            value={histLeaseStart} onChange={(e) => setHistLeaseStart(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Koniec Umowy</label>
                          <input
                            type="date"
                            value={histLeaseEnd} onChange={(e) => setHistLeaseEnd(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button" onClick={() => setShowHistoryWizard(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Zapisz Umowę i Lokatora
                  </button>
                </div>
              </form>
            )}

            {wizardTab === "invoices" && (
              <form onSubmit={handleHistInvoiceSubmit} className="space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Wybierz Nieruchomość *</label>
                    <select
                      value={histInvPropertyId} onChange={(e) => setHistInvPropertyId(e.target.value)}
                      required
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                    >
                      <option value="" disabled>-- Wybierz Mieszkanie --</option>
                      {allLandlordProperties.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Wybierz Lokatora *</label>
                    <select
                      value={histInvTenantId} onChange={(e) => setHistInvTenantId(e.target.value)}
                      required
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                    >
                      <option value="" disabled>-- Wybierz Lokatora --</option>
                      {allTenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Tytuł Opłaty (Faktury) *</label>
                    <input
                      type="text" required placeholder="np. Czynsz historyczny - Styczeń 2026"
                      value={histInvTitle} onChange={(e) => setHistInvTitle(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Rent z umowy</label>
                      <input
                        type="number" placeholder="2500"
                        value={histInvRent} onChange={(e) => setHistInvRent(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Administracyjne</label>
                      <input
                        type="number" placeholder="300"
                        value={histInvAdmin} onChange={(e) => setHistInvAdmin(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Media / Liczniki</label>
                      <input
                        type="number" placeholder="150"
                        value={histInvUtilities} onChange={(e) => setHistInvUtilities(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Data Wystawienia *</label>
                      <input
                        type="date" required
                        value={histInvIssueDate} onChange={(e) => setHistInvIssueDate(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Termin Płatności *</label>
                      <input
                        type="date" required
                        value={histInvDueDate} onChange={(e) => setHistInvDueDate(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-brand-500/5 p-3.5 rounded-xl border border-brand-500/20 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider block">Sumaryczna kwota należności</span>
                    <span className="text-lg font-bold text-white font-mono">
                      {(Number(histInvRent) + Number(histInvAdmin) + Number(histInvUtilities) || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                    </span>
                  </div>
                </div>

                <div className="bg-dark-900/40 p-4 rounded-xl border border-dark-800 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-brand-300">Status Wpłaty i Księgowanie Płatności</h4>
                  
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Status Płatności</label>
                      <select
                        value={histInvStatus} onChange={(e) => setHistInvStatus(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      >
                        <option value="paid">🟢 Zapłacona w całości</option>
                        <option value="partial">🟡 Zapłacona częściowo</option>
                        <option value="unpaid">🔴 Niezapłacona</option>
                      </select>
                    </div>

                    {histInvStatus !== "unpaid" && (
                      <>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">
                            Faktycznie otrzymana kwota *
                          </label>
                          <input
                            type="number"
                            required
                            value={histInvReceived}
                            onChange={(e) => setHistInvReceived(e.target.value)}
                            placeholder="np. 1500"
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 font-medium text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Rzeczywista Data Wpłaty *</label>
                          <input
                            type="date" required
                            value={histInvPaymentDate} onChange={(e) => setHistInvPaymentDate(e.target.value)}
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Notatki historyczne / komentarze</label>
                  <input
                    type="text" placeholder="np. Zaksięgowano przelew tradycyjny wsteczny."
                    value={histInvNotes} onChange={(e) => setHistInvNotes(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button" onClick={() => setShowHistoryWizard(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Zapisz Fakturę Historyczną
                  </button>
                </div>
              </form>
            )}

            {wizardTab === "meters" && (
              <form onSubmit={handleHistMeterSubmit} className="space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Nieruchomość *</label>
                    <select
                      value={histMeterPropertyId} onChange={(e) => setHistMeterPropertyId(e.target.value)}
                      required
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                    >
                      <option value="" disabled>-- Wybierz Mieszkanie --</option>
                      {allLandlordProperties.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Typ Licznika / Medium *</label>
                    <select
                      value={histMeterType} onChange={(e) => setHistMeterType(e.target.value)}
                      required
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                    >
                      <option value="electricity">💡 Energia elektryczna (prąd)</option>
                      <option value="gas">⛽ Gaz ziemny</option>
                      <option value="water_cold">💧 Zimna woda</option>
                      <option value="water_hot">🔥 Ciepła woda</option>
                      <option value="heating">♨️ Ogrzewanie (C.O.)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Numer Seryjny Licznika *</label>
                    <input
                      type="text" required placeholder="np. L-EL-9901"
                      value={histMeterNumber} onChange={(e) => setHistMeterNumber(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Stan Licznika *</label>
                      <input
                        type="number" step="any" required placeholder="np. 12450.5"
                        value={histMeterValue} onChange={(e) => setHistMeterValue(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider mb-1">Data Odczytu *</label>
                      <input
                        type="date" required
                        value={histMeterDate} onChange={(e) => setHistMeterDate(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/5 border border-green-500/20 text-green-400 p-3 rounded-xl flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Ten odczyt zostanie automatycznie zapisany jako <strong>Zatwierdzony</strong>. Stworzy on historyczny punkt odniesienia (baseline) dla dalszych wyliczeń zużycia mediów.
                  </span>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button" onClick={() => setShowHistoryWizard(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Zapisz Odczyt Historyczny
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
