import React, { useState, useEffect } from "react";
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
  addMeterReading
} from "../../utils/storage";
import { CreditCard, Plus, Check, Calendar, PlusCircle, AlertTriangle, CheckCircle, FileText, Info, X, Sparkles, Trash2, Coins, TrendingUp, History, UserPlus, Database, Layers } from "lucide-react";


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

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingInvoice, setBookingInvoice] = useState(null);
  const [bookingAmount, setBookingAmount] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

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

  useEffect(() => {
    setInvoices(getInvoices().sort((a, b) => new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt)));
    setExpenses(getExpenses().sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    const props = getPropertiesByLandlord(landlordId).filter(p => p.tenant_id !== null);
    setProperties(props);
    
    // For historical imports
    const allProps = getPropertiesByLandlord(landlordId);
    setAllLandlordProperties(allProps);
    setAllTenants(getUsers().filter(u => u.role === "tenant"));

    if (props.length > 0) {
      setSelectedPropertyId(props[0].id);
      setAmountRent(props[0].rentAmount);
      setAmountAdmin("250"); // sensible default
      setAmountUtilities("150"); // sensible default
      setExpensePropertyId(props[0].id);
    }
  }, [landlordId]);

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
      const newTenant = addTenant({
        name: histTenantName.trim(),
        email: histTenantEmail.trim(),
        phone: histTenantPhone.trim(),
        idCard: histTenantIdCard.trim(),
        address: histTenantAddress.trim(),
        roommate: histRoommateName.trim() ? {
          name: histRoommateName.trim(),
          phone: histRoommatePhone.trim(),
          email: histRoommateEmail.trim(),
          idCard: histRoommateIdCard.trim()
        } : null
      });

      if (histPropertyId !== "none") {
        updatePropertyTenant(
          histPropertyId,
          newTenant.id,
          histLeaseStart || null,
          histLeaseEnd || null,
          histRentAmount ? Number(histRentAmount) : null,
          histPaymentDueDay ? Number(histPaymentDueDay) : 10
        );
      }

      setSuccessMsg(`Pomyślnie dodano lokatora ${newTenant.name}!`);
      
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
      let status = "unpaid";
      if (histInvStatus === "paid") {
        received = total;
        status = "paid";
      } else if (histInvStatus === "partial") {
        received = Number(histInvReceived || 0);
        status = received >= total ? "paid" : "unpaid";
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
        const feeObj = pendingFees[selectedPropertyId];
 
        if (feeObj && feeObj.month === targetMonth) {
          setAmountAdmin(String(feeObj.amount));
          setAdminFeeLoadedStatus(`Automatycznie wczytano z szybkich akcji (${feeObj.amount} zł za ${feeObj.month})`);
        } else if (feeObj) {
          setAmountAdmin(String(feeObj.amount));
          setAdminFeeLoadedStatus(`Automatycznie wczytano z szybkich akcji (${feeObj.amount} zł)`);
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
      const feeObj = pendingFees[selectedPropertyId];
      if (feeObj && feeObj.month === targetMonth) {
        setAmountAdmin(String(feeObj.amount));
        setAdminFeeLoadedStatus(`Automatycznie wczytano z szybkich akcji (${feeObj.amount} zł za ${feeObj.month})`);
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
        const feeObj = pendingFees[selectedPropertyId];
        if (feeObj && feeObj.month === targetMonth) {
          setAmountAdmin(String(feeObj.amount));
          setAdminFeeLoadedStatus(`Automatycznie wczytano z szybkich akcji (${feeObj.amount} zł za ${feeObj.month})`);
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
    if (!amountRent || Number(amountRent) < 0) {
      setErrorMsg("Czynsz najmu z umowy musi być poprawną kwotą.");
      return;
    }
    if (!amountAdmin || Number(amountAdmin) < 0) {
      setErrorMsg("Czynsz administracyjny musi być poprawną kwotą.");
      return;
    }
    if (!amountUtilities || Number(amountUtilities) < 0) {
      setErrorMsg("Opłata za media musi być poprawną kwotą.");
      return;
    }
    if (!dueDate) {
      setErrorMsg("Podaj termin płatności.");
      return;
    }

    try {
      const prop = getPropertyById(selectedPropertyId);
      if (!prop || !prop.tenant_id) {
        throw new Error("Wybrany lokal nie ma przypisanego lokatora.");
      }

      const totalAmount = Number(amountRent) + Number(amountAdmin) + Number(amountUtilities);

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
      return;
    }
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      setErrorMsg("Wpisz poprawną kwotę kosztu.");
      return;
    }
    if (!expenseDate) {
      setErrorMsg("Podaj datę poniesienia kosztu.");
      return;
    }
    if (!expenseDesc.trim()) {
      setErrorMsg("Wpisz krótki opis kosztu.");
      return;
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
    } catch (err) {
      setErrorMsg(err.message);
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

      {/* Cash Flow Panel & Filters */}
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
        <div className="grid gap-6 md:grid-cols-3 font-sans">
          {/* ROI Circular Gauge / Large badge */}
          <div className="bg-dark-900/60 p-5 rounded-xl border border-dark-800 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block mb-3">Stopa Rentowności Netto (ROI)</span>
            <div className="relative flex items-center justify-center">
              <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-xl ${
                profitabilityPercentage >= 80 
                  ? 'border-green-500/30 bg-green-500/5 text-green-400 shadow-green-950/20' 
                  : profitabilityPercentage >= 50 
                  ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 shadow-yellow-950/20' 
                  : 'border-red-500/30 bg-red-500/5 text-red-400 shadow-red-950/20'
              }`}>
                <span className="text-3xl font-extrabold tracking-tight">{profitabilityPercentage}%</span>
                <span className="text-[9px] uppercase tracking-wide font-semibold opacity-85 mt-0.5">ROI Rent</span>
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-xxs font-semibold px-2 py-0.5 rounded-full ${
                profitabilityPercentage >= 80 
                  ? 'bg-green-500/10 text-green-400' 
                  : profitabilityPercentage >= 50 
                  ? 'bg-yellow-500/10 text-yellow-400' 
                  : 'bg-red-500/10 text-red-400 animate-pulse'
              }`}>
                {profitabilityPercentage >= 80 
                  ? 'Wysoka rentowność operacyjna' 
                  : profitabilityPercentage >= 50 
                  ? 'Umiarkowana rentowność' 
                  : 'Niska rentowność / Koszty'}
              </span>
            </div>
          </div>

          {/* Comparison breakdown */}
          <div className="md:col-span-2 bg-dark-900/60 p-5 rounded-xl border border-dark-800 flex flex-col justify-between space-y-4">
            <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block">Zestawienie Rentowności Inwestycji</span>
            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div className="bg-dark-950/40 p-3 rounded-lg border border-dark-850">
                <span className="text-dark-400 block mb-1">Przychód z najmu:</span>
                <span className="text-base font-bold text-white font-mono">
                  {rentRevenue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                </span>
                <span className="text-[9px] text-dark-500 block mt-1">Suma czynszów najmu</span>
              </div>

              <div className="bg-dark-950/40 p-3 rounded-lg border border-dark-850">
                <span className="text-dark-400 block mb-1">Koszty operacyjne:</span>
                <span className="text-base font-bold text-red-400 font-mono">
                  {expenseStats.totalExpenses.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                </span>
                <span className="text-[9px] text-dark-500 block mt-1">Remont + ubezpieczenie + dopos.</span>
              </div>

<div className="bg-dark-950/40 p-3 rounded-lg border border-dark-850">
                <span className="text-dark-400 block mb-1">Zysk operacyjny netto:</span>
                <span className={`text-base font-bold font-mono ${netRentalIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {netRentalIncome.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                </span>
                <span className="text-[9px] text-dark-500 block mt-1">Bilans końcowy lokalu</span>
              </div>
            </div>

            <div className="bg-dark-950/20 p-2.5 rounded-lg border border-dark-850/50 text-xxs text-dark-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span>
                <strong>Rentowność operacyjna (ROI)</strong> wyliczana jest jako stosunek zysku operacyjnego netto (czynsz najmu minus wydatki dodatkowe) do przychodów z czynszu najmu za wybrane filtry.
              </span>
            </div>
          </div>
        </div>

        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
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
              
              <form onSubmit={(e) => { handleAddExpense(e); setShowAddExpense(false); }} className="space-y-4">
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

                <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
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

                <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-dark-800">
                  <button 
                    type="button" onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                  >
                    Generuj Rachunek
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-400" />
          Rejestr Płatności
        </h3>

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
                        <button
                          onClick={() => {
                            setBookingInvoice(inv);
                            setBookingAmount(inv.receivedPayment || inv.amount);
                            setBookingDate(inv.paymentDate || new Date().toISOString().split('T')[0]);
                            setBookingNotes(inv.notes || "");
                            setShowBookingModal(true);
                          }}
                          className={`py-1 px-2.5 border rounded-xl text-xxs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer ${
                            inv.receivedPayment > 0
                              ? 'bg-brand-500/10 hover:bg-brand-500/25 border-brand-500/20 text-brand-300'
                              : 'bg-green-500/10 hover:bg-green-500/25 border-green-500/20 text-green-400'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          {inv.receivedPayment > 0 ? "Edytuj wpłatę" : "Zaksięguj wpłatę"}
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

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingInvoice(null);
                  }}
                  className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
                >
                  Zatwierdź wpłatę
                </button>
              </div>
            </form>
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
            <div className="flex border-b border-dark-850 gap-2 text-xs">
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
                          value={histTenantName} onChange={(e) => setHistTenantName(e.target.value)}
                          className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-1.5 text-white focus:border-brand-500 focus:outline-none"
                        />
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

                <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button" onClick={() => setShowHistoryWizard(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
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
                            {histInvStatus === "paid" ? "Otrzymana kwota (Tylko do odczytu)" : "Faktycznie otrzymana kwota *"}
                          </label>
                          <input
                            type="number"
                            required
                            disabled={histInvStatus === "paid"}
                            value={histInvStatus === "paid" ? (Number(histInvRent) + Number(histInvAdmin) + Number(histInvUtilities) || "") : histInvReceived}
                            onChange={(e) => setHistInvReceived(e.target.value)}
                            placeholder="np. 1500"
                            className={`w-full border rounded-xl px-3 py-1.5 font-medium focus:outline-none ${
                              histInvStatus === "paid"
                                ? "bg-dark-950 border-dark-850 text-dark-500 cursor-not-allowed select-none"
                                : "bg-dark-900 border-dark-800 text-white focus:border-brand-500"
                            }`}
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

                <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button" onClick={() => setShowHistoryWizard(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
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

                <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                  <button
                    type="button" onClick={() => setShowHistoryWizard(false)}
                    className="px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-xs font-bold text-white hover:bg-dark-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold glass-glow-brand cursor-pointer"
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
