import { hydrateDbFromSupabase, syncInventoryRecordToSupabase, syncBulkInventoryToSupabase, deleteInventoryRecordFromSupabase, syncLeadRecordToSupabase, deleteLeadRecordFromSupabase, syncBusinessProfileToSupabase } from './clientSupabaseSync';

const INITIAL_DB = {
  inventory: [] as any[],
  gradedInventory: [] as any[],
  wipInventory: [] as any[],
  wipStages: ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"],
  processingLogs: [] as any[],
  production: [] as any[],
  productionPlans: [] as any[],
  finishedGoods: [] as any[],
  productionHistory: [] as any[],
  warehouses: ["Main Warehouse", "Ahmedabad Warehouse", "Dealer Warehouse", "Service Warehouse", "Raw Hub"],
  notifications: [] as any[],
  leads: [] as any[],
  dealers: [] as any[],
  engagement: {
    stats: {
      activeAppUsers: 0,
      qrScans30d: 0,
      claimRequests: 0,
      avgRating: 0
    },
    funnel: [
      { label: "Unique QR Scans", value: 0, percentage: 0 },
      { label: "App Download", value: 0, percentage: 0 },
      { label: "Product Registration", value: 0, percentage: 0 },
      { label: "Recurring Engagement", value: 0, percentage: 0 }
    ],
    recentScans: [] as any[]
  },
  invoices: [] as any[],
  warranty: [] as any[],
  complaints: [] as any[],
  engineers: [
    { id: "E1", name: "Suresh P.", casesSolved: 0, avgTat: 0, rating: 5.0 },
    { id: "E2", name: "Ramesh K.", casesSolved: 0, avgTat: 0, rating: 5.0 },
    { id: "E3", name: "Anita D.", casesSolved: 0, avgTat: 0, rating: 5.0 },
    { id: "E4", name: "Vikram R.", casesSolved: 0, avgTat: 0, rating: 5.0 },
  ],
  serviceStages: [
    "REGISTERED", "RECEIVED", "UNDER_INSPECTION", "REPAIR_STARTED", "WAITING_FOR_PARTS", "TESTING", "QC_PASSED", "READY_FOR_DISPATCH", "DELIVERED", "CLOSED"
  ],
  failureCategories: ["Cell Failure", "BMS Failure", "Charger Failure", "Water Damage", "Voltage Drop"],
  products: [
    {
      id: "72V30A",
      name: "E-Rickshaw Batteries",
      category: "CATEGORY 1 — EV BATTERY INVENTORY",
      type: "EV Battery Pack",
      price: 45000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1, subBom: [
          { name: "Cathode Active Material", qty: 0.5, unit: "kg" },
          { name: "Anode Active Material", qty: 0.3, unit: "kg" },
          { name: "Electrolyte", qty: 0.1, unit: "L" },
          { name: "Separator", qty: 2, unit: "m2" }
        ]},
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "BAT-AUTO-35",
      name: "Scooter Batteries",
      category: "CATEGORY 1 — EV BATTERY INVENTORY",
      type: "EV Battery Pack",
      price: 32000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 150, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-EV-BIKE",
      name: "Bike Batteries",
      category: "CATEGORY 1 — EV BATTERY INVENTORY",
      type: "EV Battery Pack",
      price: 38000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 180, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "BAT-VRLA-100",
      name: "12V 100Ah",
      category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
      type: "Solar Battery",
      price: 14000,
      bom: [
        { matId: "RM-LEAD", name: "Lead Calcium Alloy", qty: 14.00, unit: "Kg", wastage: 2 },
        { matId: "RM-OXIDE", name: "Lead Oxide", qty: 5.00, unit: "Kg", wastage: 2 },
        { matId: "RM-ACID", name: "Sulfuric Acid", qty: 4.20, unit: "Ltr", wastage: 1 }
      ]
    },
    {
      id: "BAT-INV-150",
      name: "24V 150Ah",
      category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
      type: "Tubular Battery",
      price: 18500,
      bom: [
        { matId: "RM-LEAD", name: "Lead Alloy", qty: 18.00, unit: "Kg", wastage: 2 },
        { matId: "RM-OXIDE", name: "Lead Oxide", qty: 6.50, unit: "Kg", wastage: 2 },
        { matId: "RM-ACID", name: "Sulfuric Acid", qty: 5.50, unit: "Ltr", wastage: 1 }
      ]
    },
    {
      id: "PROD-SOLAR-48VESS",
      name: "48V ESS Packs",
      category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
      type: "ESS Battery Pack",
      price: 75000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 320, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ESS-TELECOM",
      name: "Telecom Batteries",
      category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
      type: "Industrial Pack",
      price: 85000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 400, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 2, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ESS-RACK",
      name: "Rack ESS",
      category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
      type: "Industrial Pack",
      price: 120000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 500, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 2, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ESS-UPS",
      name: "Industrial UPS",
      category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
      type: "Industrial Pack",
      price: 150000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 600, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 3, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ACC-CHARGER",
      name: "Chargers",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 3500,
      bom: [
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ACC-BMS",
      name: "BMS",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 2500,
      bom: [
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ACC-CONNECTOR",
      name: "Connectors",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 500,
      bom: []
    },
    {
      id: "PROD-ACC-ADAPTER",
      name: "Adapters",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 1200,
      bom: []
    }
  ],
  productCategories: [
    "CATEGORY 1 — EV BATTERY INVENTORY",
    "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
    "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
    "CATEGORY 4 — ACCESSORIES INVENTORY"
  ],
  businessProfile: {
    companyName: "Arcenol Energy Solutions Private Limited",
    shortName: "ARCENOL",
    establishedYear: "2018",
    industrySector: "B2B Energy Storage & Power Infrastructure",
    contactEmail: "ops-admin@arcenol.com",
    phone: "+91 79 4028 9200",
    website: "www.arcenol.com",
    cin: "U31900GJ2018PTC102145",
    gstin: "24AAHCA9192M1ZP",
    address: "Arcenol Tower, Block G, GIDC Electron City, Gandhinagar, Gujarat - 382025",
    manufacturingCapacity: "12,000 MWh / Year",
    leadAcidOutput: "260,000 Metric Tons / Year",
    depotsCount: 5,
    primaryRegion: "WEST_SOUTH",
    complianceOfficer: "Dr. Ananya Sharma, Ph.D.",
    nodePassphrase: "ARC-NODE-SECURE",
    logo: ""
  },
  warrantyChecks: [
    { id: "wc-1", serial: "ARC-72V30A-2024-000101", date: new Date(Date.now() - 1*24*60*60*1000).toLocaleDateString(), status: "ACTIVE WARRANTY", durationRemaining: "24 months left", foundInDb: true, model: "E-Rickshaw Batteries" },
    { id: "wc-2", serial: "ARC-72V30A-2024-000102", date: new Date(Date.now() - 3*24*60*60*1000).toLocaleDateString(), status: "ACTIVE WARRANTY", durationRemaining: "24 months left", foundInDb: true, model: "E-Rickshaw Batteries" },
    { id: "wc-3", serial: "ARC-UNKNOWN-X9", date: new Date(Date.now() - 4*24*60*60*1000).toLocaleDateString(), status: "NOT_FOUND / EXPIRED", durationRemaining: "N/A", foundInDb: false, model: "Unknown Blueprints" }
  ],
  loyaltyClaims: [
    { id: "cl-1", rewardName: "Extended 6m Warranty Certificate", customer: "Aditya Sharma", pointsSpent: 500, couponCode: "ARC-REWARD-EXT6M", date: new Date(Date.now() - 12*60*60*1000).toLocaleDateString(), status: "APPROVED" },
    { id: "cl-2", rewardName: "Complementary Annual Health Audit", customer: "Aditya Sharma", pointsSpent: 800, couponCode: "ARC-REWARD-AUDIT1", date: new Date(Date.now() - 2*24*60*60*1000).toLocaleDateString(), status: "PENDING" }
  ],
  diagnosticLogs: [
    { id: 'LOG-C1004-1', nodeId: 'C-1004', serial: 'ARC-AUTO-2024-112233', timestamp: '2026-06-16 14:32:00', stage: 'UNDER_INSPECTION', rootCause: 'Cell Failure', notes: 'Initial scrutiny. Detected swelling on anode module layer.', engineer: 'Suresh P.' },
    { id: 'LOG-C1004-2', nodeId: 'C-1004', serial: 'ARC-AUTO-2024-112233', timestamp: '2026-06-17 09:12:15', stage: 'READY_FOR_DISPATCH', rootCause: 'Cell Failure', notes: 'Aging cells. Replaced cell pack layer and confirmed capacity safety margins.', engineer: 'Suresh P.' },
    { id: 'LOG-C1005-1', nodeId: 'C-1005', serial: 'ARC-INV-2024-445566', timestamp: '2026-06-16 11:20:44', stage: 'REPAIR_STARTED', rootCause: 'BMS Failure', notes: 'Thermal compound degradation causing heat build up. Fan controller bypassed.', engineer: 'Anita D.' },
    { id: 'LOG-C1003-1', nodeId: 'C-1003', serial: 'ARC-72V30A-2024-000103', timestamp: '2026-06-17 08:30:10', stage: 'UNDER_INSPECTION', rootCause: 'Voltage Drop', notes: 'Resistance balancing audit underway.', engineer: 'Ramesh K.' }
  ],
  vyaparRecords: [
    { id: 'PAY-1001', type: 'Payment-In', partyId: 'l1', partyName: 'Green Motors Ahmedabad', date: '2026-06-08', amount: 120000, mode: 'UPI', status: 'PAID', remarks: 'Voucher payment for battery order' },
    { id: 'EXP-1001', type: 'Expense', partyId: 'external', partyName: 'Torrent Power Ltd', date: '2026-06-05', amount: 14500, mode: 'Bank', status: 'PAID', category: 'Electricity & Utility', remarks: 'Factory direct main connection line' },
    { id: 'PUR-1001', type: 'Purchase', partyId: 'vendor-1', partyName: 'Lead-Tech Electrodes Ltd', date: '2026-06-03', amount: 320000, mode: 'Bank', status: 'PAID', category: 'Raw Components', remarks: 'Lead plates grid supply block' },
    { id: 'EXP-1002', type: 'Expense', partyId: 'external', partyName: 'Universal Express Freight', date: '2026-06-02', amount: 8500, mode: 'Cash', status: 'PAID', category: 'Logistics/Freight', remarks: 'Express shipping to Nagpur logistics depot' }
  ],
  subsidiaries: [
    {
      id: 'SUB-1',
      name: 'Arcenol Energy Solutions Pvt Ltd (Gandhinagar HQ)',
      shortName: 'ARCENOL',
      type: 'Headquarters & Primary Production',
      gstin: '24AAHCA9192M1ZP',
      cin: 'U31900GJ2018PTC102145',
      contactEmail: 'ops-admin@arcenol.com',
      phone: '+91 79 4028 9200',
      website: 'www.arcenol.com',
      address: 'Arcenol Tower, Block G, GIDC Electron City, Gandhinagar, Gujarat - 382025',
      capacity: '12,000 MWh / Year',
      manager: 'Dr. Ananya Sharma, Ph.D.',
      status: 'ACTIVE'
    },
    {
      id: 'SUB-2',
      name: 'Arcenol Power Storage Systems (Nagpur Hub)',
      shortName: 'ARC-NAG',
      type: 'Regional Logistics & Depot',
      gstin: '27AAHCA9192M1ZR',
      cin: 'U31900GJ2018PTC102146',
      contactEmail: 'nagpur-depot@arcenol.com',
      phone: '+91 71 2289 1234',
      website: 'www.arcenol.com',
      address: 'Mihan SEZ, Nagpur, Maharashtra - 440025',
      capacity: '8,000 MWh / Year',
      manager: 'Shekhar Rao, M.Tech',
      status: 'ACTIVE'
    },
    {
      id: 'SUB-3',
      name: 'Arcenol Graphene R&D Division (Bengaluru)',
      shortName: 'ARC-TECH',
      type: 'Research & Testing Lab',
      gstin: '29AAHCA9192M1ZT',
      cin: 'U31900GJ2018PTC102147',
      contactEmail: 'tech-hub@arcenol.com',
      phone: '+91 80 4912 0088',
      website: 'www.arcenol.com',
      address: 'Whitefield Industrial Area, Bengaluru, Karnataka - 560066',
      capacity: '2,500 MWh / Year',
      manager: 'Dr. Devendra Gowda',
      status: 'ACTIVE'
    },
    {
      id: 'SUB-4',
      name: 'Arcenol Battery Recycling Node (Chennai)',
      shortName: 'ARC-RECYC',
      type: 'Compliance & Reclamation Unit',
      gstin: '33AAHCA9192M1ZS',
      cin: 'U31900GJ2018PTC102148',
      contactEmail: 'recycling-chennai@arcenol.com',
      phone: '+91 44 2715 9011',
      website: 'www.arcenol.com',
      address: 'SIPCOT Industrial Park, Sriperumbudur, Chennai, Tamil Nadu - 602105',
      capacity: '4,000 MWh / Year',
      manager: 'K. Ramanujam',
      status: 'AUDITING'
    }
  ],
  whLayoutConfig: { racks: 6, slots: 8 },
  users: [
    { id: 'usr-sap-001', name: 'Aravind Swamy', role: 'SUPER_ADMIN', department: 'Superordinate Operations', email: 'admin@arcenol.com', password: 'admin123' },
    { id: 'usr-admin-002', name: 'Rohan Sharma', role: 'ADMIN', department: 'Central Operations', email: 'ops@arcenol.com', password: 'password123' },
    { id: 'usr-sk-003', name: 'Baldev Singh', role: 'STORE_KEEPER', department: 'Material Logistics', email: 'store@arcenol.com', password: 'password123' },
    { id: 'usr-prod-004', name: 'Vikram Patel', role: 'PRODUCTION_TEAM', department: 'Manufacturing', email: 'production@arcenol.com', password: 'password123' },
    { id: 'usr-qc-005', name: 'Anjali Verma', role: 'QUALITY_TEAM', department: 'Quality Control', email: 'quality@arcenol.com', password: 'password123' },
    { id: 'usr-crm-006', name: 'Suresh Raina', role: 'SALES_PERSON', department: 'CRM / Sales Team', email: 'sales@arcenol.com', password: 'password123' },
    { id: 'usr-biller-007', name: 'Nisha Gupta', role: 'BILLER', department: 'Finance Hub', email: 'finance@arcenol.com', password: 'password123' },
    { id: 'usr-warm-008', name: 'Deepak Chawla', role: 'WARRANTY_TEAM', department: 'Warranty Claims', email: 'warranty@arcenol.com', password: 'password123' },
    { id: 'usr-rma-009', name: 'Harpreet Singh', role: 'SERVICE_TEAM', department: 'RMA Center', email: 'service@arcenol.com', password: 'password123' },
    { id: 'usr-pse-010', name: 'Amit Trivedi', role: 'PLANT_SERVICE_ENGINEER', department: 'Plant Support', email: 'plant@arcenol.com', password: 'password123' }
  ]
};

function getLocalDB() {
  if (typeof window === 'undefined') return INITIAL_DB;
  const stored = localStorage.getItem('arcenol_db_clean');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.wipStages) {
        parsed.wipStages = ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"];
        localStorage.setItem('arcenol_db_clean', JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      console.error("Error reading arcenol_db_clean from localstorage, resetting:", e);
    }
  }
  localStorage.setItem('arcenol_db_clean', JSON.stringify(INITIAL_DB));
  return INITIAL_DB;
}

function saveLocalDB(db: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('arcenol_db_clean', JSON.stringify(db));
}

async function handleMockRequest(urlStr: string, init?: RequestInit): Promise<Response> {
  const db = getLocalDB();
  const options = init || {};
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : null;

  let responseData: any = { success: true };
  let status = 200;

  try {
    if (urlStr.includes('/api/data')) {
      await hydrateDbFromSupabase(db);
      saveLocalDB(db);
      responseData = db;
    } else if (urlStr.includes('/api/business-profile')) {
      if (method === 'GET') {
        if (!db.businessProfile?.logo) {
          await hydrateDbFromSupabase(db);
        }
        responseData = db.businessProfile;
      } else {
        db.businessProfile = { ...db.businessProfile, ...body };
        saveLocalDB(db);
        syncBusinessProfileToSupabase(db.businessProfile).catch(err => console.warn('Supabase profile sync warning:', err));
        responseData = db.businessProfile;
      }
    } else if (urlStr.includes('/api/notifications/clear')) {
      db.notifications = db.notifications.map((n: any) => ({ ...n, status: 'READ' }));
      saveLocalDB(db);
    } else if (urlStr.includes('/api/leads/convert/')) {
      const id = urlStr.split('/api/leads/convert/')[1];
      const lead = db.leads.find((l: any) => l.id === id);
      if (lead) {
        lead.status = 'CONVERTED';
        const dealerId = `D-${Date.now()}`;
        const newDealer = {
          id: dealerId,
          company: lead.company,
          category: 'Tier 1 Dealer',
          gstin: '24GSTIN' + Math.floor(100000 + Math.random() * 900000) + 'A1Z5',
          phone: lead.phone,
          email: `${(lead.contactPerson || 'partner').toLowerCase().replace(/\s+/g, '')}@${(lead.company || 'dealer').toLowerCase().replace(/[^a-z]/g, '')}.com`,
          location: lead.location,
          city: lead.location?.split(',')[0] || lead.location || 'Headquarters',
          state: lead.location?.split(',')[1]?.trim() || 'Gujarat',
          region: 'West',
          contactPerson: lead.contactPerson,
          status: 'ACTIVE',
          bankDetails: 'N/A',
          rankingScore: 80,
          joinDate: new Date().toISOString().split('T')[0]
        };
        db.dealers.push(newDealer);
        saveLocalDB(db);
        syncLeadRecordToSupabase(lead);
        responseData = { success: true, dealer: newDealer };
      }
    } else if (urlStr.includes('/api/leads/')) {
      const id = urlStr.split('/api/leads/')[1];
      if (method === 'DELETE') {
        db.leads = db.leads.filter((l: any) => l.id !== id);
        deleteLeadRecordFromSupabase(id);
        responseData = { success: true };
      } else if ((method === 'PUT' || method === 'POST') && body) {
        let updatedLead: any = null;
        db.leads = db.leads.map((l: any) => {
          if (l.id === id) {
            updatedLead = { ...l, ...body, status: body.status || l.status || 'NEW' };
            return updatedLead;
          }
          return l;
        });
        if (updatedLead) {
          syncLeadRecordToSupabase(updatedLead);
          responseData = updatedLead;
        } else {
          responseData = { error: 'NOT_FOUND' };
        }
      }
      saveLocalDB(db);
    } else if (urlStr.includes('/api/leads')) {
      if (method === 'POST' && body) {
        const newLead = {
          id: body.id || `lead-${Date.now()}`,
          company: body.company || 'Unnamed Lead',
          category: body.category || 'Dealer',
          leadSource: body.leadSource || body.source || 'Website',
          source: body.leadSource || body.source || 'Website',
          contactPerson: body.contactPerson || '',
          phone: body.phone || '',
          location: body.location || '',
          followUpDate: body.followUpDate || new Date().toISOString().split('T')[0],
          followUpTime: body.followUpTime || '10:00',
          requirement: body.requirement || '',
          notes: body.notes || '',
          status: body.status || 'NEW',
          remarksLog: body.remarksLog || []
        };
        db.leads.push(newLead);
        saveLocalDB(db);
        syncLeadRecordToSupabase(newLead);
        responseData = newLead;
      }
    } else if (urlStr.includes('/api/dealers/')) {
      const id = urlStr.split('/api/dealers/')[1];
      if (method === 'DELETE') {
        db.dealers = db.dealers.filter((d: any) => d.id !== id);
      } else if (method === 'PUT' && body) {
        db.dealers = db.dealers.map((d: any) => d.id === id ? { ...d, ...body } : d);
      }
      saveLocalDB(db);
    } else if (urlStr.includes('/api/dealers')) {
      if (method === 'POST' && body) {
        const newDealer = { 
          ...body, 
          id: `D-${Date.now()}`,
          rankingScore: 75,
          joinDate: new Date().toISOString().split('T')[0]
        };
        db.dealers.push(newDealer);
        saveLocalDB(db);
        responseData = newDealer;
      }
    } else if (urlStr.includes('/api/invoices')) {
      if (method === 'POST' && body) {
        const total = body.items.reduce((acc: number, item: any) => acc + (item.qty * item.price), 0);
        const newInvoice = {
          id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().split('T')[0],
          dealerId: body.dealerId,
          items: body.items,
          total: total,
          status: 'UNPAID',
          tax: Math.round(total * 0.18)
        };
        db.invoices.push(newInvoice);
        saveLocalDB(db);
        responseData = newInvoice;
      }
    } else if (urlStr.includes('/api/inventory/bulk')) {
      if (method === 'POST' && body) {
        const { items } = body;
        const added: any[] = [];
        if (items && Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = String(item.name || "").trim();
            if (!name) return;
            const code = String(item.code || "").trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
            const safeId = "RM-" + name.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 15) + "-" + Math.floor(Math.random() * 100000);
            const newItem = {
              id: safeId,
              name,
              code,
              category: item.category || "Cells",
              supplier: item.supplier || "Generic Supplier",
              batch: item.batch || "BATCH-01",
              qty: Number(item.qty || 0),
              status: item.status || "ACTIVE",
              reservedQty: 0,
              minStock: Number(item.minStock || 100),
              reorderLevel: Number(item.reorderLevel || 250),
              warehouse: item.warehouse || "Raw Hub",
              rack: item.rack || "A-1",
              grn: item.grn || `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
              date: item.date || new Date().toISOString().split('T')[0],
              price: Number(item.price || 0),
              unit: item.unit || "Pcs",
              qcStatus: item.qcStatus || "APPROVED"
            };
            db.inventory.push(newItem);
            added.push(newItem);
          });
        }
        if (added.length > 0) {
          if (!db.notifications) db.notifications = [];
          db.notifications.push({
            id: `rm-bulk-notif-${Date.now()}`,
            type: "ENGAGEMENT",
            title: `Bulk Imported ${added.length} Raw Materials`,
            message: `Successfully registered ${added.length} old/historic raw material records into inventory ledger.`,
            date: new Date().toISOString(),
            status: "UNREAD",
            channel: "SYSTEM"
          });
          syncBulkInventoryToSupabase(added);
        }
        saveLocalDB(db);
        responseData = { addedCount: added.length, items: added };
      }
    } else if (urlStr.includes('/api/inventory/bulk-reorder')) {
      if (method === 'POST' && body) {
        const { orders } = body;
        let updatedCount = 0;
        const reorderedItems: any[] = [];
        if (orders && Array.isArray(orders)) {
          orders.forEach((ord: any) => {
            const item = db.inventory.find((i: any) => i.id === ord.id);
            if (item) {
              item.qty += Number(ord.reorderQty || 0);
              updatedCount++;
              reorderedItems.push(item);
            }
          });
        }
        if (!db.notifications) db.notifications = [];
        db.notifications.push({
          id: `n-${Date.now()}`,
          type: "BULK_REORDER",
          title: "Bulk Reorder Dispatched",
          message: `Authorized replenishment of ${updatedCount} low-stock material nodes. Raw ledger balances adjusted.`,
          date: new Date().toISOString(),
          status: "UNREAD",
          channel: "SYSTEM"
        });
        saveLocalDB(db);
        if (reorderedItems.length > 0) syncBulkInventoryToSupabase(reorderedItems);
        responseData = { success: true, updatedItemsCount: updatedCount };
      }
    } else if (urlStr.includes('/api/inventory/')) {
      const id = urlStr.split('/api/inventory/')[1];
      if (method === 'DELETE') {
        const index = db.inventory.findIndex((i: any) => i.id === id);
        if (index !== -1) {
          db.inventory.splice(index, 1);
          saveLocalDB(db);
          deleteInventoryRecordFromSupabase(id);
          responseData = { success: true };
        } else {
          responseData = { error: "NOT_FOUND" };
        }
      }
    } else if (urlStr.includes('/api/inventory')) {
      if ((method === 'POST' || method === 'PUT') && body) {
        const { existingItemId, name, code, category, supplier, batch, qty, minStock, reorderLevel, warehouse, rack, grn, price, unit } = body;
        let item: any;
        if (existingItemId) {
          item = db.inventory.find((i: any) => i.id === existingItemId);
          if (item) {
            item.qty += Number(qty || 0);
            if (supplier) item.supplier = supplier;
            if (batch) item.batch = batch;
            if (grn) item.grn = grn;
            if (typeof price !== 'undefined') item.price = Number(price);
            if (warehouse) item.warehouse = warehouse;
            if (rack) item.rack = rack;
          }
        } else {
          const safeId = "RM-" + (name || Date.now().toString()).toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 15);
          item = {
            id: safeId,
            name,
            code: code || `CD-${Math.floor(100 + Math.random() * 900)}`,
            category: category || "RAW_MATERIAL",
            supplier: supplier || "Generic Supplier",
            batch: batch || `B-${Math.floor(100 + Math.random() * 900)}`,
            qty: Number(qty || 0),
            reservedQty: 0,
            minStock: Number(minStock || 100),
            reorderLevel: Number(reorderLevel || 250),
            warehouse: warehouse || "Raw Hub",
            rack: rack || "A1",
            grn: grn || `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString().split('T')[0],
            price: Number(price || 0),
            unit: unit || "Kg",
            qcStatus: "APPROVED"
          };
          db.inventory.push(item);
        }

        if (item && item.qty < item.minStock) {
          db.notifications.push({
            id: `n-${Date.now()}`,
            type: "LOW_STOCK",
            title: `Low Stock Alert: ${item?.name}`,
            message: `Current inventory level for ${item?.name} is ${item?.qty}. Need reorder.`,
            date: new Date().toISOString(),
            status: "UNREAD",
            channel: "SYSTEM"
          });
        }

        saveLocalDB(db);
        if (item) syncInventoryRecordToSupabase(item);
        responseData = item || { error: "NOT_FOUND" };
      }
    } else if (urlStr.includes('/api/complaints/')) {
      const id = urlStr.split('/api/complaints/')[1];
      if (method === 'PUT' && body) {
        db.complaints = db.complaints.map((c: any) => c.id === id ? { ...c, ...body } : c);
        saveLocalDB(db);
      }
    } else if (urlStr.includes('/api/complaints')) {
      if (method === 'POST' && body) {
        const newComplaint = {
          ...body,
          id: `C-${Math.floor(1001 + Math.random() * 8999)}`,
          status: 'OPEN',
          stage: 'REGISTERED',
          date: new Date().toISOString().split('T')[0],
          resolvedDate: '',
          engineer: 'Unassigned'
        };
        db.complaints.push(newComplaint);
        saveLocalDB(db);
        responseData = newComplaint;
      }
    } else if (urlStr.includes('/api/production/wip/stages')) {
      if (method === 'GET') {
        responseData = db.wipStages || ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"];
      } else if (method === 'POST' && body) {
        const { stage } = body;
        if (stage) {
          const normalStage = String(stage).toUpperCase().trim().replace(/\s+/g, '_');
          if (!db.wipStages) {
            db.wipStages = ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"];
          }
          if (!db.wipStages.includes(normalStage)) {
            db.wipStages.push(normalStage);
            saveLocalDB(db);
          }
          responseData = { success: true, stage: normalStage, stages: db.wipStages };
        }
      }
    } else if (urlStr.includes('/api/production/wip/update-stage')) {
      if (method === 'POST' && body) {
        const { wipId, stage } = body;
        const wipItem = db.wipInventory?.find((w: any) => w.id === wipId);
        if (wipItem) {
          wipItem.stage = stage;
          wipItem.lastUpdate = new Date().toISOString().split('T')[0];
          saveLocalDB(db);
          responseData = wipItem;
        } else {
          status = 404;
          responseData = { error: "NOT_FOUND", message: "WIP Process item not found" };
        }
      }
    } else if (urlStr.includes('/api/production/wip/start')) {
      if (method === 'POST' && body) {
        const { planId, name, qty, components, stage } = body;
        if (planId) {
          const plan = db.productionPlans.find((p: any) => p.id === planId);
          if (plan) {
            plan.status = 'STARTED';
            saveLocalDB(db);
            responseData = plan;
          }
        } else {
          // Deduct ingredients from raw inventory count safely 
          if (components && Array.isArray(components)) {
            components.forEach((comp: any) => {
              const invItem = db.inventory.find((i: any) => i.id === comp.matId);
              if (invItem) {
                invItem.qty = Math.max(0, invItem.qty - (comp.qty || 0));
              }
            });
          }
          const defaultStage = stage || (db.wipStages && db.wipStages[0]) || "WELDING";
          const newWip = {
            id: `wip-${Math.floor(100 + Math.random() * 899 + 100)}`,
            name: name || "Cell Pack Assembly",
            type: "Semi-Finished",
            qty: Number(qty) || 1,
            stage: defaultStage,
            lastUpdate: new Date().toISOString().split('T')[0],
            components: components || []
          };
          if (!db.wipInventory) {
            db.wipInventory = [];
          }
          db.wipInventory.push(newWip);
          saveLocalDB(db);
          responseData = newWip;
        }
      }
    } else if (urlStr.includes('/api/production/complete')) {
      if (method === 'POST' && body) {
        const { planId, warehouse, rack } = body;
        const plan = db.productionPlans.find((p: any) => p.id === planId);
        if (plan && plan.status !== 'COMPLETED') {
          // Consume items if in RESERVE mode
          if (plan.allocationMode === 'RESERVE') {
            plan.materials.forEach((reqm: any) => {
              const invItem = db.inventory.find((i: any) => i.id === reqm.matId);
              if (invItem) {
                invItem.reservedQty = Math.max(0, invItem.reservedQty - reqm.total);
                invItem.qty = Math.max(0, invItem.qty - reqm.total);
              }
            });
          }
          const serials: string[] = [];
          for (let i = 0; i < plan.qty; i++) {
            const serial = `ARC-${plan.modelId}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
            serials.push(serial);
            db.finishedGoods.push({
              id: `fg-${Date.now()}-${i}`,
              model: plan.modelId,
              serial,
              batch: `BATCH-${plan.id}`,
              warehouse: warehouse || 'Main Warehouse',
              rack: rack || 'BIN-01',
              date: new Date().toISOString().split('T')[0],
              status: "READY"
            });
          }
          plan.status = 'COMPLETED';
          db.productionHistory.push({
            id: `ph-${Date.now()}`,
            model: plan.modelId,
            qty: plan.qty,
            serials,
            date: new Date().toISOString().split('T')[0],
            status: "COMPLETED"
          });
          saveLocalDB(db);
          responseData = plan;
        }
      }
    } else if (urlStr.includes('/api/processing')) {
      if (method === 'POST' && body) {
        const { inputId, outputBatches, processingDegree } = body;
        db.processingLogs.push({
          id: `log-${Date.now()}`,
          inputId,
          outputBatches,
          processingDegree,
          timestamp: new Date().toISOString()
        });
        saveLocalDB(db);
      }
    } else if (urlStr.includes('/api/products/duplicate')) {
      if (method === 'POST' && body) {
        const { sourceId, newId, newName } = body;
        const source = db.products.find((p: any) => p.id === sourceId);
        if (source) {
          const clone = JSON.parse(JSON.stringify(source));
          clone.id = newId;
          clone.name = newName;
          db.products.push(clone);
          saveLocalDB(db);
          responseData = clone;
        }
      }
    } else if (urlStr.includes('/api/mrp/calculate')) {
      const url = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      const modelId = url.searchParams.get('modelId');
      const qty = url.searchParams.get('qty');
      const product = db.products.find((p: any) => p.id === modelId);
      if (!product) {
        status = 404;
        responseData = { error: "Product not found" };
      } else {
        const multiplier = Number(qty || 0);
        const requirements = (product.bom || []).map((item: any) => {
          const perUnit = item.qty * (1 + ((item.wastage || 0) / 100));
          const total = perUnit * multiplier;
          const invItem = db.inventory.find((i: any) => i.id === item.matId);
          return {
            ...item,
            perUnit,
            requiredTotal: total,
            available: invItem ? invItem.qty - invItem.reservedQty : 0,
            deficient: Math.max(0, total - (invItem ? invItem.qty - invItem.reservedQty : 0))
          };
        });
        responseData = { modelId, modelName: product.name, qty: multiplier, requirements };
      }
    } else if (urlStr.includes('/api/products/')) {
      const parts = urlStr.split('/api/products/');
      const id = parts[parts.length - 1];
      if (method === 'PUT' && body) {
        const index = db.products.findIndex((p: any) => p.id === id);
        if (index !== -1) {
          db.products[index] = { ...db.products[index], ...body, id };
          saveLocalDB(db);
          responseData = db.products[index];
        } else {
          status = 404;
          responseData = { error: "Product not found" };
        }
      } else if (method === 'DELETE') {
        db.products = db.products.filter((p: any) => p.id !== id);
        saveLocalDB(db);
        responseData = { success: true };
      }
    } else if (urlStr.includes('/api/products')) {
      if (method === 'POST' && body) {
        const { id, name, category, type, price, bom } = body;
        if (db.products.find((p: any) => p.id === id)) {
          status = 400;
          responseData = { error: "Product ID already exists" };
        } else {
          const newProduct = { id, name, category: category || "Uncategorized Blueprints", type: type || "Battery", price, bom: bom || [] };
          db.products.push(newProduct);
          saveLocalDB(db);
          responseData = newProduct;
        }
      }
    } else if (urlStr.includes('/api/categories/')) {
      const parts = urlStr.split('/api/categories/');
      const target = decodeURIComponent(parts[parts.length - 1] || '');
      if (method === 'DELETE') {
        if (!db.productCategories) db.productCategories = [];
        if (!db.categories) db.categories = [];

        const pIdx = db.productCategories.indexOf(target);
        if (pIdx !== -1) db.productCategories.splice(pIdx, 1);

        const cIdx = db.categories.findIndex((c: any) => (typeof c === 'object' ? c.name : String(c)) === target || (typeof c === 'object' && String(c.id) === target));
        if (cIdx !== -1) db.categories.splice(cIdx, 1);

        db.products.forEach((p: any) => {
          if (p.category === target) {
            p.category = "Uncategorized Blueprints";
          }
        });
        saveLocalDB(db);
        responseData = { success: true, categories: db.categories, productCategories: db.productCategories };
      }
    } else if (urlStr.includes('/api/categories')) {
      if (!db.productCategories) db.productCategories = [];
      if (!db.categories) db.categories = [];

      if (method === 'POST' && body) {
        const { name, code, description } = body;
        if (!name) {
          status = 400;
          responseData = { error: "Category name is required" };
        } else {
          const catName = name.trim();
          const existsInProd = db.productCategories.includes(catName);
          const existsInCats = db.categories.some((c: any) => (typeof c === 'object' ? c.name : String(c)) === catName);

          if (existsInProd || existsInCats) {
            status = 400;
            responseData = { error: "Category already exists" };
          } else {
            db.productCategories.push(catName);
            const newCatObj = {
              id: body.id || `cat-${Date.now()}`,
              name: catName,
              code: code || `CAT-${catName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
              description: description || ''
            };
            db.categories.push(newCatObj);
            saveLocalDB(db);
            responseData = { success: true, category: newCatObj, categories: db.categories, productCategories: db.productCategories };
          }
        }
      } else if (method === 'PUT' && body) {
        const { oldName, newName, name, code, description } = body;
        const finalName = (name || newName || oldName || '').trim();
        if (!finalName) {
          status = 400;
          responseData = { error: "Category name is required" };
        } else {
          const prevName = oldName || finalName;
          const pIdx = db.productCategories.indexOf(prevName);
          if (pIdx !== -1) {
            db.productCategories[pIdx] = finalName;
          } else if (!db.productCategories.includes(finalName)) {
            db.productCategories.push(finalName);
          }

          const cIdx = db.categories.findIndex((c: any) => (typeof c === 'object' ? c.name : String(c)) === prevName);
          if (cIdx !== -1) {
            db.categories[cIdx] = {
              ...db.categories[cIdx],
              name: finalName,
              code: code || db.categories[cIdx].code,
              description: typeof description !== 'undefined' ? description : db.categories[cIdx].description
            };
          }

          db.products.forEach((p: any) => {
            if (p.category === prevName) {
              p.category = finalName;
            }
          });
          saveLocalDB(db);
          responseData = { success: true, categories: db.categories, productCategories: db.productCategories };
        }
      }
    } else if (urlStr.includes('/api/mrp/plan')) {
      if (method === 'POST' && body) {
        const { modelId, qty, mode } = body;
        const product = db.products.find((p: any) => p.id === modelId);
        if (product) {
          const multiplier = Number(qty);
          const requirements = product.bom.map((item: any) => ({
            ...item,
            total: item.qty * (1 + ((item.wastage || 0) / 100)) * multiplier
          }));

          // Deduct from inventory
          requirements.forEach((reqm: any) => {
            const invItem = db.inventory.find((i: any) => i.id === reqm.matId);
            if (invItem) {
              if (mode === 'CONSUME') {
                invItem.qty = Math.max(0, invItem.qty - reqm.total);
              } else {
                invItem.reservedQty += reqm.total;
              }
            }
          });

          const plan = {
            id: `PLAN-${Date.now()}`,
            modelId,
            modelName: product.name,
            qty: multiplier,
            status: mode === 'CONSUME' ? 'STARTED' : 'PLANNED',
            allocationMode: mode,
            materials: requirements,
            date: new Date().toISOString()
          };
          db.productionPlans.push(plan);
          saveLocalDB(db);
          responseData = plan;
        }
      }
    }
  } catch (error) {
    console.error("Local mock server error handling request:", error);
    status = 500;
    responseData = { error: "MOCK_SERVER_ERR", message: String(error) };
  }

  return new Response(JSON.stringify(responseData), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
// Automatically intercept standard fetches in browser environments
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  // Check if we are on a static host with NO backend server (like Vercel, Netlify, GitHub Pages)
  const isStaticHosting = 
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('surge.sh') ||
    // If the hostname is not GCP Cloud Run (*.run.app) and not local development
    (!window.location.hostname.includes('run.app') && 
     !window.location.hostname.includes('localhost') && 
     !window.location.hostname.includes('127.0.0.1') && 
     !window.location.port);

  const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    if (urlStr.includes('/api/')) {
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && !contentType.includes('text/html')) {
          if (urlStr.includes('/api/data') && !urlStr.includes('/api/data/')) {
            try {
              const clone = response.clone();
              const data = await clone.json();
              localStorage.setItem('arcenol_db_clean', JSON.stringify(data));
            } catch (err) {
              // Ignore json parse error of clone
            }
          }
          return response;
        }
        // If API route failed or returned HTML fallback (e.g. on Vercel/static host), fallback to client Supabase mock
        return await handleMockRequest(urlStr, init);
      } catch (err) {
        return await handleMockRequest(urlStr, init);
      }
    }
    return originalFetch(input, init);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true
    });
  } catch (err) {
    console.error("Failed to redefine window.fetch with Object.defineProperty, trying on Window.prototype", err);
    try {
      Object.defineProperty(Window.prototype, 'fetch', {
        value: customFetch,
        configurable: true,
        writable: true
      });
    } catch (errProto) {
      console.error("Failed to redefine on Window.prototype too, falling back to assignment", errProto);
      try {
        (window as any).fetch = customFetch;
      } catch (errAssign) {
        console.error("Failed standard assignment, using globalThis", errAssign);
        try {
          (globalThis as any).fetch = customFetch;
        } catch (errGlobal) {
          console.error("Failed globalThis configuration", errGlobal);
        }
      }
    }
  }
}

export {};
