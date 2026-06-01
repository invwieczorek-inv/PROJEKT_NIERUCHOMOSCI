export const MOCK_USERS = [
  {
    id: "u1",
    email: "krzysztof@wlasciciel.pl",
    passwordHash: "123",
    name: "Krzysztof",
    phone: "+48 501 234 567",
    role: "landlord",
    addressStreet: "Floriańska 12/3",
    postalCodeCity: "31-021 Kraków",
    createdAt: "2026-01-01T10:00:00.000Z"
  },
  {
    id: "u2",
    email: "jan@lokator.pl",
    passwordHash: "123",
    name: "Jan Kowalski",
    phone: "+48 602 987 654",
    role: "tenant",
    property_id: "m1",
    idCard: "ABC 123456",
    address: "Mickiewicza 4/12, Kraków",
    roommate: {
      name: "Maria Kowalska",
      phone: "+48 602 111 222",
      email: "maria@wspollokator.pl",
      idCard: "XYZ 987654"
    },
    createdAt: "2026-01-02T12:00:00.000Z"
  }
];

export const MOCK_PROPERTIES = [
  {
    id: "m1",
    landlord_id: "u1",
    tenant_id: "u2",
    title: "Mieszkanie Mickiewicza",
    address: "Mickiewicza 4/12",
    city: "Kraków",
    description: "Komfortowe mieszkanie w dogodnej lokalizacji. Ogrzewanie miejskie.",
    rentAmount: 2500,
    depositAmount: 2500,
    area: 54.2,
    landRegister: "KR1P/00084712/3",
    leaseStart: "2026-01-01",
    leaseEnd: "2026-12-31",
    paymentDueDay: 10,
    createdAt: "2026-01-01T11:00:00.000Z"
  },
  {
    id: "m2",
    landlord_id: "u1",
    tenant_id: null,
    title: "Kawalerka Słoneczna",
    address: "Floriańska 12/3",
    city: "Kraków",
    description: "Słoneczna kawalerka w centrum miasta.",
    rentAmount: 1800,
    depositAmount: 1800,
    area: 28.0,
    landRegister: "KR1P/00092304/9",
    leaseStart: null,
    leaseEnd: null,
    createdAt: "2026-02-15T09:00:00.000Z"
  }
];

export const MOCK_INVOICES = [
  {
    id: "inv_101",
    property_id: "m1",
    tenant_id: "u2",
    landlord_id: "u1",
    title: "Czynsz - Maj 2026",
    amountRent: 2500,
    amountAdmin: 0,
    amountUtilities: 0,
    amount: 2500,
    receivedPayment: 0,
    status: "unpaid",
    due_date: "2026-06-10",
    issueDate: "2026-05-27",
    notes: "Opłata czynszowa podstawowa.",
    createdAt: "2026-05-27T08:00:00.000Z"
  }
];

export const MOCK_METERS = [
  {
    id: "met-1",
    property_id: "m1",
    meter_type: "electricity",
    meter_number: "L-EL-9901",
    reading_value: 12450.5,
    reading_date: "2026-04-01",
    reported_by_id: "u1",
    status: "approved",
    createdAt: "2026-04-01T10:00:00.000Z"
  },
  {
    id: "met-2",
    property_id: "m1",
    meter_type: "electricity",
    meter_number: "L-EL-9901",
    reading_value: 12580.2,
    reading_date: "2026-05-01",
    reported_by_id: "u2",
    status: "approved",
    createdAt: "2026-05-01T18:30:00.000Z"
  }
];

export const MOCK_MESSAGES = [
  {
    id: "msg_1",
    property_id: "m1",
    sender_id: "u2",
    receiver_id: "u1",
    subject: "Usterki",
    text: "Cieknie kran w kuchni",
    timestamp: "2026-05-27T14:00:00.000Z",
    isRead: false
  }
];

export const MOCK_DOCUMENTS = [
  {
    id: "doc-1",
    property_id: "m1",
    tenant_id: "u2",
    document_type: "lease_agreement",
    file_name: "Umowa_Najmu_Mickiewicza.pdf",
    file_size: "1.2 KB",
    file_data: "data:application/pdf;base64,JVBERi0xLjQKJdPr6gogMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PiBlbmRvYmoKMiAwIG9iagogIDw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDMgMCBSIF0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmoKICA8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUgODQyIF0gL1Jlc291cmNlcyA8PCA+PiAvQ29udGVudHMgNCAwIFIgPj4gZW5kb2JqCjQgMCBvYmoKICA8PCAvTGVuZ3RoIDU5ID4+IHN0cmVhbQogIEJUIC9GMSAxMiBUZiA3MCA3MDAgVGQgKFN5bXVsYWNqYSB1bW93eSBuYWptdSB3IFJlbnRQb3J0YWwpIFRqIEVUIAogIGVuZHN0cmVhbSBlbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTkgMDAwMDAgbiAKMDAwMDAwMDExOCAwMDAwMCBuIAowMDAwMDAwMjIzIDAwMDAwIG4gCnRyYWlsZXIKICA8PCAvU2l6ZSA1IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgozMzMKJSVFT0YK",
    uploaded_at: "2026-01-02T14:00:00.000Z"
  }
];

export const MOCK_EXPENSES = [
  {
    id: "exp-1",
    property_id: "m1",
    category: "renovation",
    amount: 1200,
    date: "2026-05-15",
    description: "Remont hydrauliki w kuchni i malowanie przedpokoju",
    createdAt: "2026-05-15T10:00:00.000Z"
  },
  {
    id: "exp-2",
    property_id: "m1",
    category: "insurance",
    amount: 400,
    date: "2026-01-10",
    description: "Polisa ubezpieczeniowa mieszkania PZU",
    createdAt: "2026-01-10T12:00:00.000Z"
  },
  {
    id: "exp-3",
    property_id: "m1",
    category: "furnishing",
    amount: 600,
    date: "2026-02-20",
    description: "Kupno mikrofalówki i nowego krzesła obrotowego",
    createdAt: "2026-02-20T14:30:00.000Z"
  }
];

