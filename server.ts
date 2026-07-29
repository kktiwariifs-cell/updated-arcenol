import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { 
  syncAllERPToSupabase, 
  hydrateFromSupabase, 
  batchUpsert, 
  deleteRecord, 
  mapInventory, 
  mapLead, 
  mapCustomer, 
  mapComplaint, 
  mapGradedCell, 
  mapWip, 
  mapInvoice,
  mapCorporateUnit,
  mapWarehouse,
  mapBusinessProfile,
  mapCategory,
  mapVoucher,
  mapBomBlueprint
} from "./src/lib/serverSupabaseSync";

function generateBatterySerial(gradeStr: string = "EV", seqNumber?: number | string): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const monthChar = String.fromCharCode(65 + now.getMonth());
  const year2 = String(now.getFullYear()).slice(-2);

  let gradeTag = "EV";
  if (gradeStr) {
    const upper = String(gradeStr).toUpperCase();
    if (upper.includes("AUTO")) gradeTag = "AUTO";
    else if (upper.includes("INV")) gradeTag = "INV";
    else if (upper.includes("ESS")) gradeTag = "ESS";
    else if (upper.includes("VRLA")) gradeTag = "VRLA";
    else if (upper.includes("EV")) gradeTag = "EV";
    else {
      const clean = upper.replace(/[^A-Z]/g, "");
      gradeTag = clean.slice(0, 4) || "EV";
    }
  }

  let numStr = "";
  if (seqNumber !== undefined && seqNumber !== null && String(seqNumber).trim() !== "") {
    const digitsOnly = String(seqNumber).replace(/[^0-9]/g, "");
    if (digitsOnly) {
      numStr = digitsOnly.padStart(6, "0");
    } else {
      numStr = String(Math.floor(1000 + Math.random() * 9000)).padStart(6, "0");
    }
  } else {
    numStr = String(Math.floor(1000 + Math.random() * 9000)).padStart(6, "0");
  }

  return `AESPL  ${gradeTag}  ${day}${monthChar}${year2}${numStr}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // In-memory data store (Simulating a database)
  let db = {
    inventory: [
      { id: "RM-LEAD", name: "Lead Alloy", code: "LA-001", category: "RAW_MATERIAL", supplier: "Global Metals", batch: "GM-001", qty: 25000, reservedQty: 0, minStock: 2000, reorderLevel: 5000, warehouse: "Raw Hub", rack: "L1", grn: "GRN-R-01", date: "2024-05-01", price: 180, unit: "Kg", qcStatus: "APPROVED", status: "ACTIVE", challanNo: "CH-2026-101", vehicleNo: "GJ-01-AB-1234", eWayBill: "EWB-994821", exciseSlip: "EXC-1001", acceptedQty: 25000, damagedQty: 0 },
      { id: "RM-OXIDE", name: "Lead Oxide", code: "LO-002", category: "RAW_MATERIAL", supplier: "Global Metals", batch: "GM-002", qty: 12000, reservedQty: 0, minStock: 1000, reorderLevel: 2500, warehouse: "Raw Hub", rack: "L2", grn: "GRN-R-02", date: "2024-05-01", price: 210, unit: "Kg", qcStatus: "APPROVED", status: "ACTIVE", challanNo: "CH-2026-102", vehicleNo: "GJ-01-CD-5678", eWayBill: "EWB-994822", exciseSlip: "EXC-1002", acceptedQty: 12000, damagedQty: 0 },
      { id: "RM-ACID", name: "Sulfuric Acid", code: "SA-092", category: "RAW_MATERIAL", supplier: "Chemical Ltd", batch: "CH-92", qty: 10000, reservedQty: 0, minStock: 800, reorderLevel: 1500, warehouse: "Raw Hub", rack: "A1", grn: "GRN-R-03", date: "2024-05-02", price: 45, unit: "Ltr", qcStatus: "APPROVED", status: "ACTIVE", challanNo: "CH-2026-103", vehicleNo: "GJ-18-XY-9012", eWayBill: "EWB-994823", exciseSlip: "EXC-1003", acceptedQty: 10000, damagedQty: 0 },
      { id: "RM-SEP-PE", name: "Separator (PE)", code: "SPE-01", category: "RAW_MATERIAL", supplier: "PlateTech", batch: "PT-01", qty: 15000, reservedQty: 0, minStock: 1000, reorderLevel: 3000, warehouse: "Raw Hub", rack: "S1", grn: "GRN-R-04", date: "2024-05-03", price: 8, unit: "Pcs", qcStatus: "APPROVED", status: "ACTIVE", challanNo: "CH-2026-104", vehicleNo: "GJ-27-MN-3456", eWayBill: "EWB-994824", exciseSlip: "EXC-1004", acceptedQty: 15000, damagedQty: 0 },
      { id: "RM-CELLS", name: "Lithium Cells (3.7V 3Ah)", code: "CELL-3.7", category: "Cells", supplier: "Energy Plus", batch: "EP-2024", qty: 50000, reservedQty: 0, minStock: 5000, reorderLevel: 10000, warehouse: "Raw Hub", rack: "C1", grn: "GRN-R-14", date: "2024-05-18", price: 250, unit: "Pcs", qcStatus: "APPROVED", status: "ACTIVE", challanNo: "CH-2026-105", vehicleNo: "MH-12-PQ-7890", eWayBill: "EWB-994825", exciseSlip: "EXC-1005", acceptedQty: 50000, damagedQty: 0 },
      { id: "RM-BMS-72V", name: "Smart BMS (72V 50A)", code: "BMS-72S", category: "Electronics", supplier: "TechCircuit", batch: "TC-72", qty: 1000, reservedQty: 0, minStock: 50, reorderLevel: 100, warehouse: "Raw Hub", rack: "B1", grn: "GRN-R-15", date: "2024-05-18", price: 2500, unit: "Pcs", qcStatus: "APPROVED", status: "ACTIVE", challanNo: "CH-2026-106", vehicleNo: "DL-01-RS-4321", eWayBill: "EWB-994826", exciseSlip: "EXC-1006", acceptedQty: 1000, damagedQty: 0 },
    ],
    gradedInventory: [
      { id: "g1", serial: "CELL-A-001", name: "3.2V 102Ah", supplier: "Energy Plus", grade: "A", voltage: 3.32, ir: 6.2, capacity: 6100, cycleCount: 0, temp: 24.5, date: "2024-05-18", engineer: "Suresh P.", usage: "Premium Products" },
      { id: "g2", serial: "CELL-B-002", name: "3.2V 102Ah", supplier: "Energy Plus", grade: "B", voltage: 3.28, ir: 7.1, capacity: 5800, cycleCount: 0, temp: 25.0, date: "2024-05-18", engineer: "Suresh P.", usage: "Economy Products" },
    ],
    wipInventory: [
      { id: "wip-01", name: "Cell Pack Assembly (72V 30Ah)", type: "Semi-Finished", qty: 12, stage: "CELL_SORTING_&_MATRIX_ALIGNMENT", lastUpdate: "2026-07-24", components: [{ matId: "RM-CELLS", qty: 2400 }] },
      { id: "wip-02", name: "Spot Welded Pack Matrix", type: "Semi-Finished", qty: 8, stage: "SPOT_WELDING_&_BUSBAR_JOINING", lastUpdate: "2026-07-24", components: [{ matId: "RM-CELLS", qty: 1600 }] },
      { id: "wip-03", name: "BMS Mounted Pack", type: "Semi-Finished", qty: 5, stage: "BMS_WIRING_&_SOLDERING", lastUpdate: "2026-07-24", components: [{ matId: "RM-CELLS", qty: 1000 }, { matId: "RM-BMS-72V", qty: 5 }] },
      { id: "wip-04", name: "Encapsulated Casing Pack", type: "Semi-Finished", qty: 4, stage: "CASING_&_POTTING", lastUpdate: "2026-07-24", components: [{ matId: "RM-CELLS", qty: 800 }] },
    ],
    wipStages: [
      "CELL_SORTING_&_MATRIX_ALIGNMENT",
      "SPOT_WELDING_&_BUSBAR_JOINING",
      "BMS_WIRING_&_SOLDERING",
      "CASING_&_POTTING",
      "QUALITY_CHECK"
    ],
    processingLogs: [],
    production: [],
    productionPlans: [] as any[],
    finishedGoods: [
      { id: "fg1", model: "72V30A", serial: "AESPL  EV  28G26001044", batch: "BATCH-A1", warehouse: "Ahmedabad Warehouse", rack: "BIN-01", date: "2026-07-28", status: "READY" },
      { id: "fg2", model: "72V30A", serial: "AESPL  EV  28G26001045", batch: "BATCH-A1", warehouse: "Main Warehouse", rack: "BIN-01", date: "2026-07-28", status: "READY" },
      { id: "fg3", model: "72V30A", serial: "AESPL  EV  28G26001046", batch: "BATCH-A1", warehouse: "Main Warehouse", rack: "BIN-10", date: "2026-07-28", status: "HOLD" },
      { id: "fg4", model: "72V30A", serial: "AESPL  EV  28G26001047", batch: "BATCH-A2", warehouse: "Ahmedabad Warehouse", rack: "BIN-15", date: "2026-07-28", status: "DAMAGED" },
      { id: "fg5", model: "72V30A", serial: "AESPL  EV  28G26001048", batch: "BATCH-A2", warehouse: "Service Warehouse", rack: "S-01", date: "2026-07-28", status: "RETURNED" },
      { id: "fg6", model: "BAT-AUTO-35", serial: "AESPL  AUTO  28G26001049", batch: "BATCH-B1", warehouse: "Main Warehouse", rack: "BIN-05", date: "2026-07-28", status: "READY" },
      { id: "fg6b", model: "BAT-AUTO-35", serial: "AESPL  AUTO  28G26001052", batch: "BATCH-B1", warehouse: "Ahmedabad Warehouse", rack: "BIN-08", date: "2026-07-28", status: "READY" },
      { id: "fg7", model: "BAT-INV-150", serial: "AESPL  INV  28G26001050", batch: "BATCH-C1", warehouse: "Main Warehouse", rack: "BIN-06", date: "2026-07-28", status: "READY" },
      { id: "fg8", model: "BAT-VRLA-100", serial: "AESPL  VRLA  28G26001051", batch: "BATCH-D1", warehouse: "Ahmedabad Warehouse", rack: "BIN-20", date: "2026-07-28", status: "READY" },
      { id: "fg9", model: "PROD-EV-BIKE", serial: "AESPL  EV  28G26001053", batch: "BATCH-E1", warehouse: "Main Warehouse", rack: "BIN-12", date: "2026-07-28", status: "READY" },
    ],
    purchaseOrders: [
      {
        id: "PO-2026-081",
        materialId: "RM-CELLS",
        materialName: "Lithium Cells (3.7V 3Ah)",
        category: "Cells",
        vendor: "Energy Plus Ltd",
        vendorContact: "+91 98765 43210",
        qty: 10000,
        unit: "Pcs",
        unitCost: 250,
        totalAmount: 2500000,
        orderDate: "2026-07-20",
        estimatedDelivery: "2026-07-28",
        status: "In Transit",
        trackingNumber: "TRK-EP-99812",
        remarks: "Priority supply for 72V30A E-Rickshaw Battery Batch A3"
      },
      {
        id: "PO-2026-082",
        materialId: "RM-BMS-72V",
        materialName: "Smart BMS (72V 50A)",
        category: "Electronics",
        vendor: "TechCircuit Electronics",
        vendorContact: "+91 91234 56789",
        qty: 500,
        unit: "Pcs",
        unitCost: 2500,
        totalAmount: 1250000,
        orderDate: "2026-07-22",
        estimatedDelivery: "2026-07-29",
        status: "Pending Supplier Confirmation",
        trackingNumber: "TRK-TC-4401",
        remarks: "Order confirmed via supplier EDI, awaiting dispatch tag."
      },
      {
        id: "PO-2026-083",
        materialId: "RM-LEAD",
        materialName: "Lead Alloy",
        category: "RAW_MATERIAL",
        vendor: "Global Metals Corp",
        vendorContact: "+91 99887 76655",
        qty: 5000,
        unit: "Kg",
        unitCost: 180,
        totalAmount: 900000,
        orderDate: "2026-07-18",
        estimatedDelivery: "2026-07-25",
        status: "Arrived at Gate",
        trackingNumber: "TRK-GM-1002",
        remarks: "Truck MH-12-PQ-8891 at Gate 2. Pending GRN & QC test."
      },
      {
        id: "PO-2026-080",
        materialId: "RM-ACID",
        materialName: "Sulfuric Acid",
        category: "RAW_MATERIAL",
        vendor: "Chemical Ltd",
        vendorContact: "+91 98980 12345",
        qty: 2000,
        unit: "Ltr",
        unitCost: 45,
        totalAmount: 90000,
        orderDate: "2026-07-10",
        estimatedDelivery: "2026-07-15",
        status: "GRN Received",
        trackingNumber: "TRK-CH-0092",
        remarks: "Received and verified into Raw Hub Rack A1 under GRN-R-03"
      }
    ],
    productionHistory: [
      { id: "ph1", model: "72V30A", qty: 2, serials: ["ARC-72V30A-2024-000101", "ARC-72V30A-2024-000102"], date: "2024-05-10", status: "COMPLETED" }
    ],
    warehouses: ["Main Warehouse", "Ahmedabad Warehouse", "Dealer Warehouse", "Service Warehouse", "Raw Hub"],
    notifications: [
      { id: "n1", type: "FOLLOW_UP", title: "Upcoming Follow-up", message: "Dealer: Green Motors Ahmedabad at 11:00 AM", date: new Date().toISOString(), status: "UNREAD", channel: "WHATSAPP" },
      { id: "n2", type: "LOW_STOCK", title: "Low Stock Alert: Cells", message: "Current stock: 450 units. Reorder point: 1000.", date: new Date().toISOString(), status: "UNREAD", channel: "SYSTEM" }
    ],
    leads: [
      { id: "l1", company: "Green Motors Ahmedabad", category: "Dealer", location: "Ahmedabad, GJ", contactPerson: "Rajesh Shah", phone: "9876543210", leadSource: "Website", requirement: "72V Battery Packs x 50", status: "QUOTATION_SENT", followUpDate: "2024-05-20", followUpTime: "11:00", notes: "Negotiating on bulk discount." },
      { id: "l2", company: "EV Solutions Delhi", category: "Distributor", location: "New Delhi, DL", contactPerson: "Aman Varma", phone: "9123456789", leadSource: "Exhibition", requirement: "Li-ion Cells Bulk Purchase", status: "INTERESTED", followUpDate: "2024-05-18", followUpTime: "15:30", notes: "Interested in the new smart BMS feature." },
    ],
    dealers: [
       { id: "D-101", company: "Elite Power Ahmedabad", category: "Tier 1 Dealer", gstin: "24AAAAA0000A1Z5", phone: "9988776655", email: "contact@elitepower.com", location: "Navrangpura", city: "Ahmedabad", state: "Gujarat", region: "West", contactPerson: "Amit Mehta", status: "ACTIVE", bankDetails: "HDFC A/C: 50100234...", rankingScore: 92, joinDate: "2023-01-15" },
       { id: "D-102", company: "Spark EV Rajkot", category: "Certified Service Center", gstin: "24BBBBB1111B1Z2", phone: "9900112233", email: "info@sparkev.in", location: "Metoda GIDC", city: "Rajkot", state: "Gujarat", region: "West", contactPerson: "Suresh Bhai", status: "ACTIVE", bankDetails: "ICICI A/C: 0023101...", rankingScore: 85, joinDate: "2023-03-20" },
       { id: "D-103", company: "Metro Batteries Delhi", category: "Tier 1 Dealer", gstin: "07AAAAA0000A1Z5", phone: "9811223344", email: "delhi@metro.com", location: "Okhla Industrial Area", city: "New Delhi", state: "Delhi", region: "North", contactPerson: "Vikram Singh", status: "ACTIVE", bankDetails: "SBI A/C: 334455...", rankingScore: 78, joinDate: "2023-06-10" },
       { id: "D-104", company: "South Solar Chennai", category: "Tier 2 Dealer", gstin: "33AAAAA0000A1Z5", phone: "9844556677", email: "sales@southsolar.com", location: "Adyar", city: "Chennai", state: "Tamil Nadu", region: "South", contactPerson: "Karthik R.", status: "ACTIVE", bankDetails: "Axis A/C: 998877...", rankingScore: 88, joinDate: "2023-02-05" },
       { id: "D-105", company: "East Energy Kolkata", category: "Distributor", gstin: "19AAAAA0000A1Z5", phone: "9833445566", email: "info@eastenergy.com", location: "Salt Lake", city: "Kolkata", state: "West Bengal", region: "East", contactPerson: "Pranab M.", status: "ACTIVE", bankDetails: "HDFC A/C: 112233...", rankingScore: 72, joinDate: "2023-11-25" },
    ],
    engagement: {
       stats: {
          activeAppUsers: 4280,
          qrScans30d: 12450,
          claimRequests: 142,
          avgRating: 4.8
       },
       funnel: [
          { label: "Unique QR Scans", value: 45200, percentage: 100 },
          { label: "App Download", value: 32400, percentage: 71 },
          { label: "Product Registration", value: 28800, percentage: 63 },
          { label: "Recurring Engagement", value: 12100, percentage: 26 }
       ],
       recentScans: [
          { id: "s1", model: "72V30A", user: "Ravi K.", location: "Mumbai", time: "2 mins ago" },
          { id: "s2", model: "BAT-AUTO-35", user: "Anonymous", location: "Pune", time: "5 mins ago" },
          { id: "s3", model: "BAT-VRLA-100", user: "Sonal S.", location: "Delhi", time: "12 mins ago" }
       ],
       campaigns: [
          { id: "c1", title: "Summer Solstice Double Warranty", desc: "Instantly doubles standard warranty for units registered in June/July.", category: "Solar / Inverter", status: "ACTIVE" },
          { id: "c2", title: "EV Monsoon Health Drive", desc: "Complementary premium state-of-health inspection coupon at certified centers.", category: "EV Battery", status: "ACTIVE" },
          { id: "c3", title: "Smart Inverter Exchange Rebate", desc: "Loyalty trade-in buyback incentive for residential systems.", category: "ESS / Industrial", status: "PAUSED" }
       ],
       batches: [
          { id: "batch-1", prefix: "ARC-INV-", qty: 50, productId: "72V30A", productName: "E-Rickshaw Batteries (72V30A)", date: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
          { id: "batch-2", prefix: "ARC-AUTO-", qty: 25, productId: "BAT-AUTO-35", productName: "Scooter Batteries (BAT-AUTO-35)", date: new Date(Date.now() - 2*24*60*60*1000).toISOString() }
       ]
    },
    invoices: [
      { id: "INV-1001", date: "2024-05-12", dealerId: "l1", items: [{ model: "72V30A", qty: 1, serials: ["ARC-72V30A-2024-000101"], price: 35000 }], total: 35000, status: "PAID", tax: 6300 },
      { id: "INV-1002", date: "2024-05-13", dealerId: "D-101", items: [{ model: "BAT-INV-150", qty: 5, serials: [], price: 18500 }], total: 92500, status: "UNPAID", tax: 16650 },
      { id: "INV-1003", date: "2024-05-14", dealerId: "D-102", items: [{ model: "72V30A", qty: 10, serials: [], price: 45000 }], total: 450000, status: "UNPAID", tax: 81000 },
      { id: "INV-1004", date: "2024-05-15", dealerId: "l1", items: [{ model: "BAT-AUTO-35", qty: 20, serials: [], price: 4500 }], total: 90000, status: "PAID", tax: 16200 },
    ],
    warranty: [
      { id: "w1", serial: "ARC-72V30A-2024-000101", dealerId: "l1", startDate: "2024-05-12", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w2", serial: "ARC-72V30A-2024-000102", dealerId: "l1", startDate: "2024-05-12", durationMonths: 36, status: "ACTIVE", history: [] },
    ],
    complaints: [
      { id: "C-1001", serial: "ARC-72V30A-2024-000101", type: "Low Range", stage: "CLOSED", status: "RESOLVED", date: "2024-05-10", resolvedDate: "2024-05-14", notes: "BMS firmware updated.", rootCause: "BMS Failure", engineer: "Suresh P.", inspectionResult: "Firmware drift detected" },
      { id: "C-1002", serial: "ARC-72V30A-2024-000102", type: "Dead on Arrival", stage: "REGISTERED", status: "OPEN", date: "2024-05-15", resolvedDate: "", notes: "Unit not turning on.", engineer: "Unassigned" },
      { id: "C-1003", serial: "ARC-72V30A-2024-000103", type: "Voltage Drop", stage: "UNDER_INSPECTION", status: "OPEN", date: "2024-05-16", resolvedDate: "", notes: "Sudden power cut.", engineer: "Ramesh K." },
      { id: "C-1004", serial: "ARC-AUTO-2024-112233", type: "No Backup", stage: "READY_FOR_DISPATCH", status: "OPEN", date: "2024-05-14", resolvedDate: "", notes: "Aging cells.", engineer: "Suresh P.", rootCause: "Cell Failure" },
      { id: "C-1005", serial: "ARC-INV-2024-445566", type: "High Temp", stage: "REPAIR_STARTED", status: "OPEN", date: "2024-05-12", resolvedDate: "", notes: "Fan not working.", engineer: "Anita D." },
      { id: "C-1006", serial: "OLD-GEN-BATT-9900", type: "Water Damage", stage: "CLOSED", status: "RESOLVED", date: "2024-05-08", resolvedDate: "2024-05-11", notes: "Seal leaked.", engineer: "Ramesh K.", rootCause: "Water Damage" },
    ],
    engineers: [
      { id: "E1", name: "Suresh P.", casesSolved: 42, avgTat: 3.2, rating: 4.8 },
      { id: "E2", name: "Ramesh K.", casesSolved: 38, avgTat: 4.1, rating: 4.5 },
      { id: "E3", name: "Anita D.", casesSolved: 25, avgTat: 3.8, rating: 4.9 },
      { id: "E4", name: "Vikram R.", casesSolved: 12, avgTat: 5.5, rating: 4.2 },
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
    categories: [
      { id: "cat-1", name: "Category 1 — EV Battery Inventory", code: "CAT-EV", description: "EV Battery Packs and Assembly Modules" },
      { id: "cat-2", name: "Category 2 — Solar / Inverter Battery Inventory", code: "CAT-SOLAR", description: "Solar and Inverter High-Efficiency Batteries" },
      { id: "cat-3", name: "Category 3 — ESS / Industrial Battery Inventory", code: "CAT-ESS", description: "Energy Storage Systems & Industrial Power Units" },
      { id: "cat-4", name: "Category 4 — Raw Materials & Components", code: "CAT-RAW", description: "Raw Material stock including Lead, Oxide, Acid, and Separators" },
      { id: "cat-5", name: "Category 5 — Cells & Graded Stock", code: "CAT-CELLS", description: "Lithium-Ion and Graded Battery Cells" },
      { id: "cat-6", name: "Category 6 — Electronics & BMS", code: "CAT-ELEC", description: "Smart BMS, PCB circuits, and electronic controllers" },
      { id: "cat-7", name: "Category 7 — Accessories & Connectors", code: "CAT-ACC", description: "Chargers, connectors, adapters, and wiring harnesses" }
    ],
    productCategories: [
      "Category 1 — EV Battery Inventory",
      "Category 2 — Solar / Inverter Battery Inventory",
      "Category 3 — ESS / Industrial Battery Inventory",
      "Category 4 — Raw Materials & Components",
      "Category 5 — Cells & Graded Stock",
      "Category 6 — Electronics & BMS",
      "Category 7 — Accessories & Connectors"
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
      logo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><defs><linearGradient id='grad' x1='0%' y1='100%' x2='100%' y2='0%'><stop offset='0%' stop-color='%23912551' /><stop offset='100%' stop-color='%23e38676' /></linearGradient></defs><rect width='100' height='100' rx='22' fill='%23111827' /><path d='M 30,70 L 50,30 L 70,70 M 38,54 L 62,54' fill='none' stroke='url(%23grad)' stroke-width='8' stroke-linecap='round' stroke-linejoin='round' /><path d='M 51,36 L 43,53 L 53,53 L 47,65 L 57,48 L 47,48 Z' fill='%23ffffff' /></svg>",
      loginLeftImage: ""
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

  // File-based persistence loading on startup
  const DB_FILE = path.join(process.cwd(), "db.json");
  if (fs.existsSync(DB_FILE)) {
    try {
      const saved = fs.readFileSync(DB_FILE, "utf8");
      db = { ...db, ...JSON.parse(saved) };
      console.log("[DB] Loaded existing data from db.json");
    } catch (e) {
      console.error("[DB] Failed to load db.json, using defaults", e);
    }
  }

  const saveDb = () => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    } catch (e) {
      console.error("[DB] Failed to save db.json", e);
    }
  };

  // Middleware to automatically persist mutations to db.json
  app.use((req, res, next) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      res.on("finish", () => {
        saveDb();
      });
    }
    next();
  });

  // API Routes
  app.get("/api/business-profile", (req, res) => {
    res.json((db as any).businessProfile);
  });

  app.post("/api/business-profile", (req, res) => {
    (db as any).businessProfile = { ...(db as any).businessProfile, ...req.body };
    batchUpsert('arcenol_business_profile', [mapBusinessProfile((db as any).businessProfile)]).catch(err => console.warn("Supabase profile sync warning:", err));
    res.json((db as any).businessProfile);
  });

  app.get("/api/data", async (req, res) => {
    try {
      await hydrateFromSupabase(db);
    } catch (err) {
      console.warn("[Server] Hydration warning in /api/data:", err);
    }
    if (db.engagement) {
      if (!(db.engagement as any).loyaltyUrl) {
        (db.engagement as any).loyaltyUrl = "https://arc-powercare.com/scan/v2";
      }
      if (!(db.engagement as any).campaigns) {
        (db.engagement as any).campaigns = [
          { id: "c1", title: "Summer Solstice Double Warranty", desc: "Instantly doubles standard warranty for units registered in June/July.", category: "Solar / Inverter", status: "ACTIVE" },
          { id: "c2", title: "EV Monsoon Health Drive", desc: "Complementary premium state-of-health inspection coupon at certified centers.", category: "EV Battery", status: "ACTIVE" },
          { id: "c3", title: "Smart Inverter Exchange Rebate", desc: "Loyalty trade-in buyback incentive for residential systems.", category: "ESS / Industrial", status: "PAUSED" }
        ];
      }
    }
    res.json(db);
  });

  // MRP Calculation Endpoint
  app.get("/api/mrp/calculate", (req, res) => {
    const { modelId, qty } = req.query;
    const reqModelId = String(modelId || '').trim();
    let product = db.products.find(p => 
      String(p.id).trim() === reqModelId || 
      String((p as any).model_id || '').trim() === reqModelId ||
      p.name.toLowerCase() === reqModelId.toLowerCase()
    );

    if (!product) {
      const defaultBase = [
        { id: "72V30A", model_id: "72V30A", name: "E-Rickshaw Batteries (72V30A)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 45000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
        { id: "BAT-AUTO-35", model_id: "BAT-AUTO-35", name: "Scooter Batteries (BAT-AUTO-35)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 32000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 150, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
        { id: "PROD-EV-BIKE", model_id: "PROD-EV-BIKE", name: "Bike Batteries (PROD-EV-BIKE)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 38000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 180, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
        { id: "BAT-VRLA-100", model_id: "BAT-VRLA-100", name: "12V 100Ah (BAT-VRLA-100)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "Solar Battery", price: 14000, bom: [{ matId: "RM-LEAD", name: "Lead Alloy", qty: 14, unit: "Kg", wastage: 2 }, { matId: "RM-OXIDE", name: "Lead Oxide", qty: 5, unit: "Kg", wastage: 2 }, { matId: "RM-ACID", name: "Sulfuric Acid", qty: 4.2, unit: "Ltr", wastage: 1 }] },
        { id: "BAT-INV-150", model_id: "BAT-INV-150", name: "24V 150Ah (BAT-INV-150)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "Tubular Battery", price: 18500, bom: [{ matId: "RM-LEAD", name: "Lead Alloy", qty: 18, unit: "Kg", wastage: 2 }, { matId: "RM-OXIDE", name: "Lead Oxide", qty: 6.5, unit: "Kg", wastage: 2 }, { matId: "RM-ACID", name: "Sulfuric Acid", qty: 5.5, unit: "Ltr", wastage: 1 }] },
        { id: "PROD-SOLAR-48VESS", model_id: "PROD-SOLAR-48VESS", name: "48V ESS Packs (PROD-SOLAR-48VESS)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "ESS Battery Pack", price: 75000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 320, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
        { id: "PROD-ESS-TELECOM", model_id: "PROD-ESS-TELECOM", name: "Telecom Batteries (PROD-ESS-TELECOM)", category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY", type: "Industrial Pack", price: 85000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 400, unit: "Pcs", wastage: 1 }] }
      ];
      product = defaultBase.find(p => p.id === reqModelId || p.model_id === reqModelId) || defaultBase[0];
    }

    const multiplier = Number(qty || 0);
    const requirements = (product.bom || []).map(item => {
      const perUnit = Number(item.qty || 0) * (1 + ((Number(item.wastage || 0)) / 100));
      const total = perUnit * multiplier;
      const targetMatId = String(item.matId || (item as any).id || '').trim();
      const targetMatName = String(item.name || (item as any).materialName || '').trim();
      
      const invItem = db.inventory.find(i => 
        String(i.id).trim() === targetMatId || 
        String(i.code).trim() === targetMatId || 
        (targetMatName && i.name.toLowerCase() === targetMatName.toLowerCase()) ||
        (targetMatId && i.name.toLowerCase() === targetMatId.toLowerCase())
      );
      
      const avail = invItem ? Math.max(0, Number(invItem.qty || 0) - Number(invItem.reservedQty || 0)) : 0;
      const category = invItem?.category || (item as any).category || (item as any).type || "RAW MATERIAL";

      return {
        ...item,
        category,
        perUnit,
        requiredTotal: total,
        available: avail,
        deficient: Math.max(0, total - avail)
      };
    });

    res.json({ modelId: product.id, modelName: product.name, qty: multiplier, requirements });
  });

  // Product Management Endpoints
  app.post("/api/products", async (req, res) => {
    const { id, name, category, type, price, bom } = req.body;
    let targetId = id ? String(id).trim() : '';
    if (!targetId) {
      targetId = `BAT-${Date.now()}`;
    }
    const newProduct = { 
      id: targetId, 
      model_id: targetId,
      name: String(name || 'Battery Blueprint').trim(), 
      category: category || "Uncategorized Blueprints", 
      type: type || "Battery", 
      price: Number(price || 0), 
      bom: Array.isArray(bom) ? bom : [] 
    };

    const existingIdx = db.products.findIndex(p => String(p.id).trim() === targetId || String((p as any).model_id || '').trim() === targetId);
    if (existingIdx !== -1) {
      db.products[existingIdx] = newProduct;
    } else {
      db.products.push(newProduct);
    }

    try {
      await batchUpsert('bom_blueprints', [mapBomBlueprint(newProduct)]);
    } catch (err) {
      console.warn("Supabase BOM upsert warning:", err);
    }

    res.json(newProduct);
  });

  app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const targetId = String(id).trim();
    let index = db.products.findIndex(p => String(p.id).trim() === targetId || String((p as any).model_id || '').trim() === targetId);
    
    const updatedProduct = {
      id: targetId,
      model_id: targetId,
      name: req.body.name ? String(req.body.name).trim() : (index !== -1 ? db.products[index].name : 'Battery Blueprint'),
      category: req.body.category || (index !== -1 ? db.products[index].category : "Uncategorized Blueprints"),
      type: req.body.type || (index !== -1 ? db.products[index].type : "Battery"),
      price: Number(req.body.price ?? (index !== -1 ? db.products[index].price : 0)),
      bom: Array.isArray(req.body.bom) ? req.body.bom : (index !== -1 ? db.products[index].bom : [])
    };

    if (index !== -1) {
      db.products[index] = updatedProduct;
    } else {
      db.products.push(updatedProduct);
    }

    try {
      await batchUpsert('bom_blueprints', [mapBomBlueprint(updatedProduct)]);
    } catch (err) {
      console.warn("Supabase BOM update warning:", err);
    }

    res.json(updatedProduct);
  });

  app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const targetId = String(id).trim();
    db.products = db.products.filter(p => String(p.id).trim() !== targetId && String((p as any).model_id || '').trim() !== targetId);
    try {
      await deleteRecord('bom_blueprints', targetId);
    } catch (err) {
      console.warn("Supabase delete BOM warning:", err);
    }
    res.json({ success: true });
  });

  app.post("/api/products/duplicate", async (req, res) => {
    const { sourceId, newId, newName } = req.body;
    const srcId = String(sourceId || '').trim();
    const source = db.products.find(p => String(p.id).trim() === srcId || String((p as any).model_id || '').trim() === srcId);
    if (!source) return res.status(404).json({ error: "Source product blueprint not found" });

    const targetNewId = String(newId || '').trim() || `${srcId}-COPY`;
    const targetNewName = String(newName || '').trim() || `Copy of ${source.name}`;

    const clone = JSON.parse(JSON.stringify(source));
    clone.id = targetNewId;
    clone.model_id = targetNewId;
    clone.name = targetNewName;
    db.products.push(clone);

    try {
      await batchUpsert('bom_blueprints', [mapBomBlueprint(clone)]);
    } catch (err) {
      console.warn("Supabase BOM duplicate warning:", err);
    }

    res.json(clone);
  });

  // Category Management Endpoints
  app.get("/api/categories", (req, res) => {
    res.json({
      success: true,
      categories: (db as any).categories || [],
      productCategories: (db as any).productCategories || []
    });
  });

  app.post("/api/categories", (req, res) => {
    const { name, code, description } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });
    
    if (!(db as any).categories) (db as any).categories = [];
    if (!(db as any).productCategories) (db as any).productCategories = [];
    
    const catName = String(name).trim();
    const existingIndex = (db as any).categories.findIndex((c: any) => 
      typeof c === 'object' ? c.name.toLowerCase() === catName.toLowerCase() : String(c).toLowerCase() === catName.toLowerCase()
    );
    
    if (existingIndex !== -1) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCat = {
      id: req.body.id || `cat-${Date.now()}`,
      name: catName,
      code: code || `CAT-${catName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
      description: description || ''
    };

    (db as any).categories.push(newCat);
    if (!(db as any).productCategories.includes(catName)) {
      (db as any).productCategories.push(catName);
    }

    batchUpsert('categories', [mapCategory(newCat)]).catch(err => console.warn("Supabase category sync warning:", err));

    res.json({ success: true, category: newCat, categories: (db as any).categories, productCategories: (db as any).productCategories });
  });

  app.put(["/api/categories", "/api/categories/:id"], (req, res) => {
    const id = req.params.id || req.body.id;
    const { oldName, newName, name, code, description } = req.body;
    const finalName = name || newName || oldName;

    if (!finalName) return res.status(400).json({ error: "Category name is required" });
    if (!(db as any).categories) (db as any).categories = [];
    if (!(db as any).productCategories) (db as any).productCategories = [];

    let catIndex = -1;
    if (id) {
      catIndex = (db as any).categories.findIndex((c: any) => typeof c === 'object' && String(c.id) === String(id));
    }
    if (catIndex === -1 && oldName) {
      catIndex = (db as any).categories.findIndex((c: any) => typeof c === 'object' ? c.name === oldName : String(c) === oldName);
    }

    if (catIndex !== -1) {
      const prevCat = (db as any).categories[catIndex];
      const prevName = typeof prevCat === 'object' ? prevCat.name : prevCat;

      const updatedCat = {
        id: typeof prevCat === 'object' ? prevCat.id : (id || `cat-${Date.now()}`),
        name: finalName,
        code: code || (typeof prevCat === 'object' ? prevCat.code : `CAT-${finalName.substring(0, 4).toUpperCase()}`),
        description: typeof description !== 'undefined' ? description : (typeof prevCat === 'object' ? prevCat.description : '')
      };

      (db as any).categories[catIndex] = updatedCat;

      // Update productCategories array
      const pIdx = (db as any).productCategories.indexOf(prevName);
      if (pIdx !== -1) {
        (db as any).productCategories[pIdx] = finalName;
      } else if (!(db as any).productCategories.includes(finalName)) {
        (db as any).productCategories.push(finalName);
      }

      // Update inventory items and products using old name
      if (prevName && prevName !== finalName) {
        db.inventory.forEach(i => {
          if (i.category === prevName) i.category = finalName;
        });
        db.products.forEach(p => {
          if (p.category === prevName) p.category = finalName;
        });
      }

      batchUpsert('categories', [mapCategory(updatedCat)]).catch(err => console.warn("Supabase category sync warning:", err));

      res.json({ success: true, category: updatedCat, categories: (db as any).categories, productCategories: (db as any).productCategories });
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  });

  app.delete(["/api/categories/:id", "/api/categories/name/:name"], (req, res) => {
    const target = req.params.id || req.params.name;
    const decodedTarget = decodeURIComponent(target || '');
    
    if (!(db as any).categories) (db as any).categories = [];
    if (!(db as any).productCategories) (db as any).productCategories = [];

    let catIndex = (db as any).categories.findIndex((c: any) => typeof c === 'object' && String(c.id) === decodedTarget);
    if (catIndex === -1) {
      catIndex = (db as any).categories.findIndex((c: any) => (typeof c === 'object' ? c.name : String(c)) === decodedTarget);
    }

    if (catIndex !== -1) {
      const removed = (db as any).categories.splice(catIndex, 1)[0];
      const removedName = typeof removed === 'object' ? removed.name : removed;
      const removedId = typeof removed === 'object' ? removed.id : decodedTarget;

      const pIdx = (db as any).productCategories.indexOf(removedName);
      if (pIdx !== -1) {
        (db as any).productCategories.splice(pIdx, 1);
      }

      deleteRecord('categories', removedId).catch(err => console.warn("Supabase category delete warning:", err));

      res.json({ success: true, removed, categories: (db as any).categories, productCategories: (db as any).productCategories });
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  });

  // Customer Engagement API Routes
  app.post("/api/engagement/simulate", (req, res) => {
    if (!db.engagement) {
      db.engagement = {
        stats: { activeAppUsers: 4280, qrScans30d: 12450, claimRequests: 142, avgRating: 4.8 },
        funnel: [
          { label: "Unique QR Scans", value: 45200, percentage: 100 },
          { label: "App Download", value: 32400, percentage: 71 },
          { label: "Product Registration", value: 28800, percentage: 63 },
          { label: "Recurring Engagement", value: 12100, percentage: 26 }
        ],
        recentScans: [
          { id: "s1", model: "BAT-INV-150", user: "Ravi K.", location: "Mumbai", time: "2 mins ago" },
          { id: "s2", model: "BAT-AUTO-35", user: "Anonymous", location: "Pune", time: "5 mins ago" },
          { id: "s3", model: "BAT-VRLA-100", user: "Sonal S.", location: "Delhi", time: "12 mins ago" }
        ]
      } as any;
    }

    const { model, user, location } = req.body;

    let selectedModel = model;
    if (!selectedModel) {
      const products = db.products || [];
      if (products.length > 0) {
        selectedModel = products[Math.floor(Math.random() * products.length)].id;
      } else {
        selectedModel = "BAT-INV-150";
      }
    }

    let selectedUser = user;
    if (!selectedUser) {
      const names = ["Aravind Nair", "Priya Patel", "Vikram Sen", "Meera Joshi", "Rohan Gupta", "Deepa Rao", "Anonymous"];
      selectedUser = names[Math.floor(Math.random() * names.length)];
    }

    let selectedLocation = location;
    if (!selectedLocation) {
      const cities = ["Bengaluru", "Mumbai", "New Delhi", "Ahmedabad", "Chennai", "Kolkata", "Hyderabad", "Pune"];
      selectedLocation = cities[Math.floor(Math.random() * cities.length)];
    }

    const newScan = {
      id: "scan-" + Date.now(),
      model: selectedModel,
      user: selectedUser,
      location: selectedLocation,
      time: "Just now"
    };

    db.engagement.recentScans = [newScan, ...db.engagement.recentScans].slice(0, 8);

    db.engagement.stats.qrScans30d = (db.engagement.stats.qrScans30d || 0) + 1;
    if (Math.random() > 0.4) {
      db.engagement.stats.activeAppUsers = (db.engagement.stats.activeAppUsers || 0) + Math.floor(Math.random() * 3) + 1;
    }

    const funnel = db.engagement.funnel;
    if (funnel && funnel.length >= 4) {
      funnel[0].value += 1;
      if (Math.random() > 0.25) funnel[1].value += 1;
      if (Math.random() > 0.4) funnel[2].value += 1;
      if (Math.random() > 0.6) funnel[3].value += 1;

      const baseVal = funnel[0].value || 1;
      funnel.forEach(step => {
        step.percentage = Math.round((step.value / baseVal) * 100);
      });
    }

    db.notifications.push({
      id: "notif-scan-" + Date.now(),
      type: "ENGAGEMENT",
      title: "DTC RESOURCE HANDSHAKE",
      message: `Direct-to-consumer QR scan registered for unit ${selectedModel} in ${selectedLocation} by user ${selectedUser}. App metrics synchronized.`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    res.json({ success: true, engagement: db.engagement });
  });

  app.post("/api/engagement/url", (req, res) => {
    const { loyaltyUrl } = req.body;
    if (!db.engagement) {
      db.engagement = {} as any;
    }
    (db.engagement as any).loyaltyUrl = loyaltyUrl;
    res.json({ success: true, loyaltyUrl: (db.engagement as any).loyaltyUrl });
  });

  app.post("/api/engagement/campaign/toggle", (req, res) => {
    const { campaignId } = req.body;
    if (!db.engagement) {
      db.engagement = {} as any;
    }
    if (!(db.engagement as any).campaigns) {
      (db.engagement as any).campaigns = [
        { id: "c1", title: "Summer Solstice Double Warranty", desc: "Instantly doubles standard warranty for units registered in June/July.", category: "Solar / Inverter", status: "ACTIVE" },
        { id: "c2", title: "EV Monsoon Health Drive", desc: "Complementary premium state-of-health inspection coupon at certified centers.", category: "EV Battery", status: "ACTIVE" },
        { id: "c3", title: "Smart Inverter Exchange Rebate", desc: "Loyalty trade-in buyback incentive for residential systems.", category: "ESS / Industrial", status: "PAUSED" }
      ];
    }
    const cmp = (db.engagement as any).campaigns.find((c: any) => c.id === campaignId);
    if (cmp) {
      cmp.status = cmp.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    }
    res.json({ success: true, campaigns: (db.engagement as any).campaigns });
  });

  app.post("/api/engagement/campaign/add", (req, res) => {
    const { title, desc, category } = req.body;
    if (!db.engagement) {
      db.engagement = {} as any;
    }
    if (!(db.engagement as any).campaigns) {
      (db.engagement as any).campaigns = [
        { id: "c1", title: "Summer Solstice Double Warranty", desc: "Instantly doubles standard warranty for units registered in June/July.", category: "Solar / Inverter", status: "ACTIVE" },
        { id: "c2", title: "EV Monsoon Health Drive", desc: "Complementary premium state-of-health inspection coupon at certified centers.", category: "EV Battery", status: "ACTIVE" },
        { id: "c3", title: "Smart Inverter Exchange Rebate", desc: "Loyalty trade-in buyback incentive for residential systems.", category: "ESS / Industrial", status: "PAUSED" }
      ];
    }
    const newCamp = {
      id: "c-" + Date.now(),
      title,
      desc,
      category,
      status: "ACTIVE"
    };
    (db.engagement as any).campaigns.push(newCamp);
    res.json({ success: true, campaigns: (db.engagement as any).campaigns });
  });

  app.post("/api/engagement/campaign/delete", (req, res) => {
    const { campaignId } = req.body;
    if (db.engagement && (db.engagement as any).campaigns) {
      (db.engagement as any).campaigns = (db.engagement as any).campaigns.filter((c: any) => c.id !== campaignId);
    }
    res.json({ success: true, campaigns: (db.engagement as any).campaigns || [] });
  });

  app.post("/api/engagement/batch/add", (req, res) => {
    const { prefix, qty, productId } = req.body;
    if (!db.engagement) {
      db.engagement = {} as any;
    }
    if (!(db.engagement as any).batches) {
      (db.engagement as any).batches = [];
    }
    const product = db.products.find(p => p.id === productId);
    const productName = product ? `${product.name} (${product.id})` : productId;

    const newBatch = {
      id: "batch-" + Date.now(),
      prefix: prefix || "ARC-",
      qty: Number(qty) || 50,
      productId,
      productName,
      date: new Date().toISOString()
    };
    (db.engagement as any).batches.push(newBatch);
    res.json({ success: true, batches: (db.engagement as any).batches });
  });

  // Create Production Plan with Allocation
  app.post("/api/mrp/plan", (req, res) => {
    const { modelId, qty, mode } = req.body; // mode: 'RESERVE' or 'CONSUME'
    const product = db.products.find(p => p.id === modelId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const multiplier = Number(qty);
    const requirements = (product.bom || []).map(item => ({
      ...item,
      total: item.qty * (1 + ((item.wastage || 0) / 100)) * multiplier
    }));

    // Check for blocking unavailability
    const criticalMissing = requirements.filter(reqm => {
      const invItem = db.inventory.find(i => i.id === reqm.matId);
      return !invItem || (invItem.qty - invItem.reservedQty) < reqm.total;
    });

    if (criticalMissing.length > 0) {
      return res.status(403).json({ 
        error: "MATERIAL_UNAVAILABLE", 
        message: "Insufficient raw materials to start production.",
        missing: criticalMissing.map(m => ({ name: m.name, required: m.total }))
      });
    }

    // Allocate materials
    requirements.forEach(reqm => {
      const invItem = db.inventory.find(i => i.id === reqm.matId);
      if (invItem) {
        if (mode === 'CONSUME') {
          invItem.qty -= reqm.total;
        } else {
          invItem.reservedQty += reqm.total;
        }
      }
    });

    const planId = `PLAN-${Date.now()}`;
    const plan = {
      id: planId,
      modelId,
      modelName: product.name,
      qty: multiplier,
      status: mode === 'CONSUME' ? 'STARTED' : 'PLANNED',
      allocationMode: mode,
      materials: requirements,
      date: new Date().toISOString()
    };

    db.productionPlans.push(plan);
    res.json(plan);
  });

  app.post("/api/mrp/complete-plan", (req, res) => {
    const { planId, warehouse, rack } = req.body;
    const planIndex = db.productionPlans.findIndex(p => p.id === planId);
    if (planIndex === -1) return res.status(404).json({ error: "Plan not found" });

    const plan = db.productionPlans[planIndex];
    if (plan.status === 'COMPLETED') return res.status(400).json({ error: "Plan already completed" });

    // If was in reserve mode, now consume it
    if (plan.allocationMode === 'RESERVE') {
      plan.materials.forEach((reqm: any) => {
        const invItem = db.inventory.find(i => i.id === reqm.matId);
        if (invItem) {
          invItem.reservedQty -= reqm.total;
          invItem.qty -= reqm.total;
        }
      });
    }

    // Generate finished goods
    const serials = [];
    for (let i = 0; i < plan.qty; i++) {
        const serial = generateBatterySerial(plan.modelId, 1000 + i + 1);
        serials.push(serial);
        db.finishedGoods.push({
            id: `fg-${Date.now()}-${i}`,
            model: plan.modelId,
            serial,
            batch: `BATCH-${plan.id}`,
            warehouse,
            rack,
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

    res.json({ status: "success", plan });
  });

  app.post("/api/invoices", (req, res) => {
    const { dealerId, items, total, tax } = req.body;
    const invId = `INV-${1000 + db.invoices.length + 1}`;
    
    // Find Dealer for Regional Analysis
    const dealer = db.dealers.find(d => d.id === dealerId || d.company === dealerId);
    
    const invoice = {
      id: invId,
      date: new Date().toISOString().split('T')[0],
      dealerId: dealer ? dealer.id : dealerId,
      items,
      total,
      tax,
      status: "UNPAID"
    };

    db.invoices.push(invoice);
    batchUpsert('invoices', [mapInvoice(invoice)]).catch(err => console.warn("Supabase invoice sync warning:", err));

    // Update Dealer Stats
    if (dealer) {
        dealer.rankingScore = Math.min(100, (dealer.rankingScore || 50) + 1);
        // Add more logic here for growth etc.
    }

    // Trigger Notification: New Sale
    db.notifications.push({
      id: `n-${Date.now()}`,
      type: "PAYMENT",
      title: "New Invoice Generated",
      message: `Invoice ${invId} for ${dealer?.company || dealerId} - Amount: ${total}`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    // Process each item to update stock and activate warranty
    items.forEach((item: any) => {
      item.serials.forEach((serial: string) => {
        // 1. Update Finished Goods Status
        const fgItem = db.finishedGoods.find(fg => fg.serial === serial);
        if (fgItem) fgItem.status = "SOLD";

        // 2. Activate Warranty
        db.warranty.push({
          id: `W-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          serial,
          dealerId: dealer ? dealer.id : dealerId,
          startDate: invoice.date,
          durationMonths: 36, // Default 3 years
          status: "ACTIVE",
          history: []
        });
      });
    });

    res.json(invoice);
  });

  app.put("/api/invoices/:id", (req, res) => {
    const { id } = req.params;
    const { status, total, tax, items } = req.body;
    const invoice = db.invoices.find(inv => inv.id === id);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (status) invoice.status = status;
    if (typeof total !== 'undefined') invoice.total = total;
    if (typeof tax !== 'undefined') invoice.tax = tax;
    if (items) invoice.items = items;

    // Trigger Notification: Invoice updated
    db.notifications.push({
      id: `n-${Date.now()}`,
      type: "PAYMENT",
      title: `Invoice ${id} Updated`,
      message: `Invoice status changed to ${status || invoice.status} - Total: ${invoice.total}`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    batchUpsert('invoices', [mapInvoice(invoice)]).catch(err => console.warn("Supabase invoice sync warning:", err));

    res.json(invoice);
  });

  app.delete("/api/invoices/:id", (req, res) => {
    const { id } = req.params;
    const index = db.invoices.findIndex(inv => inv.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const [deletedInvoice] = db.invoices.splice(index, 1);

    // Dynamic reversal: update active serial numbers in stocks back to "READY" and remove warranties
    if (deletedInvoice && deletedInvoice.items) {
      deletedInvoice.items.forEach((item: any) => {
        if (item.serials && Array.isArray(item.serials)) {
          item.serials.forEach((serial: string) => {
            // Revert status of product to READY
            const fgItem = db.finishedGoods.find(fg => fg.serial === serial);
            if (fgItem) {
              fgItem.status = "READY";
            }
            // Remove associated warranty
            const wIdx = db.warranty.findIndex(w => w.serial === serial);
            if (wIdx !== -1) {
              db.warranty.splice(wIdx, 1);
            }
          });
        }
      });
    }

    // Trigger Notification: Invoice Deleted
    db.notifications.push({
      id: `n-${Date.now()}`,
      type: "ALERT",
      title: `Invoice ${id} Revoked/Deleted`,
      message: `Invoice ${id} was deleted from database. Material stock status has been reversed.`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    deleteRecord('invoices', id).catch(err => console.warn("Supabase invoice delete warning:", err));
    res.json({ success: true, message: `Invoice ${id} deleted successfully` });
  });

  app.put(["/api/inventory", "/api/inventory/:id"], (req, res) => {
    const id = req.params.id || req.body.id || req.body.existingItemId;
    const { name, code, category, supplier, batch, qty, minStock, reorderLevel, warehouse, rack, grn, price, unit, qcStatus, status, reservedQty, challanNo, vehicleNo, eWayBill, exciseSlip, acceptedQty, damagedQty } = req.body;
    
    let item: any;
    if (id) {
      item = db.inventory.find(i => i.id === id);
    }

    if (item) {
      if (typeof qty !== 'undefined') item.qty = Number(qty);
      if (name) item.name = name;
      if (code) item.code = code;
      if (category) item.category = category;
      if (supplier) item.supplier = supplier;
      if (batch) item.batch = batch;
      if (grn) item.grn = grn;
      if (typeof price !== 'undefined') item.price = Number(price);
      if (warehouse) item.warehouse = warehouse;
      if (rack) item.rack = rack;
      if (qcStatus) item.qcStatus = qcStatus;
      if (status) item.status = status;
      if (unit) item.unit = unit;
      if (typeof minStock !== 'undefined') item.minStock = Number(minStock);
      if (typeof reorderLevel !== 'undefined') item.reorderLevel = Number(reorderLevel);
      if (typeof reservedQty !== 'undefined') item.reservedQty = Number(reservedQty);
      if (typeof challanNo !== 'undefined') item.challanNo = challanNo;
      if (typeof vehicleNo !== 'undefined') item.vehicleNo = vehicleNo;
      if (typeof eWayBill !== 'undefined') item.eWayBill = eWayBill;
      if (typeof exciseSlip !== 'undefined') item.exciseSlip = exciseSlip;
      if (typeof acceptedQty !== 'undefined') item.acceptedQty = Number(acceptedQty);
      if (typeof damagedQty !== 'undefined') item.damagedQty = Number(damagedQty);
    } else {
      const safeId = id || ("RM-" + (name || Date.now().toString()).toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 15));
      item = {
        id: safeId,
        name: name || 'Material Item',
        code: code || `CD-${Math.floor(100 + Math.random() * 900)}`,
        category: category || "RAW_MATERIAL",
        supplier: supplier || "Generic Supplier",
        batch: batch || `B-${Math.floor(100 + Math.random() * 900)}`,
        qty: Number(qty || 0),
        status: status || "ACTIVE",
        reservedQty: Number(reservedQty || 0),
        minStock: Number(minStock || 100),
        reorderLevel: Number(reorderLevel || 250),
        warehouse: warehouse || "Raw Hub",
        rack: rack || "A1",
        grn: grn || `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        price: Number(price || 0),
        unit: unit || "Kg",
        qcStatus: qcStatus || "APPROVED",
        challanNo: challanNo || `CH-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleNo: vehicleNo || "GJ-01-AB-1234",
        eWayBill: eWayBill || `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
        exciseSlip: exciseSlip || `EXC-${Math.floor(1000 + Math.random() * 9000)}`,
        acceptedQty: Number(acceptedQty || qty || 0),
        damagedQty: Number(damagedQty || 0)
      };
      db.inventory.push(item);
    }

    batchUpsert('inventory', [mapInventory(item)]).catch(err => console.warn("Supabase inventory sync warning:", err));
    res.json(item);
  });

  app.post("/api/inventory", (req, res) => {
    const { existingItemId, name, code, category, supplier, batch, qty, minStock, reorderLevel, warehouse, rack, grn, price, unit, qcStatus, status, setExactQty, challanNo, vehicleNo, eWayBill, exciseSlip, acceptedQty, damagedQty } = req.body;
    
    let item: any;
    if (existingItemId) {
      item = db.inventory.find(i => i.id === existingItemId);
      if (item) {
        if (setExactQty) {
          item.qty = Number(qty || 0);
        } else {
          item.qty += Number(qty || 0);
        }
        if (name) item.name = name;
        if (code) item.code = code;
        if (category) item.category = category;
        if (supplier) item.supplier = supplier;
        if (batch) item.batch = batch;
        if (grn) item.grn = grn;
        if (typeof price !== 'undefined') item.price = Number(price);
        if (warehouse) item.warehouse = warehouse;
        if (rack) item.rack = rack;
        if (qcStatus) item.qcStatus = qcStatus;
        if (status) item.status = status;
        if (unit) item.unit = unit;
        if (typeof minStock !== 'undefined') item.minStock = Number(minStock);
        if (typeof reorderLevel !== 'undefined') item.reorderLevel = Number(reorderLevel);
        if (typeof challanNo !== 'undefined') item.challanNo = challanNo;
        if (typeof vehicleNo !== 'undefined') item.vehicleNo = vehicleNo;
        if (typeof eWayBill !== 'undefined') item.eWayBill = eWayBill;
        if (typeof exciseSlip !== 'undefined') item.exciseSlip = exciseSlip;
        if (typeof acceptedQty !== 'undefined') item.acceptedQty = Number(acceptedQty);
        if (typeof damagedQty !== 'undefined') item.damagedQty = Number(damagedQty);
      } else {
        return res.status(404).json({ error: "Inventory item template not found" });
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
        status: status || "ACTIVE",
        reservedQty: 0,
        minStock: Number(minStock || 100),
        reorderLevel: Number(reorderLevel || 250),
        warehouse: warehouse || "Raw Hub",
        rack: rack || "A1",
        grn: grn || `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        price: Number(price || 0),
        unit: unit || "Kg",
        qcStatus: "APPROVED",
        challanNo: challanNo || `CH-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleNo: vehicleNo || "GJ-01-AB-1234",
        eWayBill: eWayBill || `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
        exciseSlip: exciseSlip || `EXC-${Math.floor(1000 + Math.random() * 9000)}`,
        acceptedQty: Number(acceptedQty || qty || 0),
        damagedQty: Number(damagedQty || 0)
      };
      db.inventory.push(item);
    }

    // Check for Low Stock
    if (item.qty < item.minStock) {
      db.notifications.push({
        id: `n-${Date.now()}`,
        type: "LOW_STOCK",
        title: `Low Stock Alert: ${item.name}`,
        message: `Current inventory level for ${item.name} is ${item.qty}. Need reorder.`,
        date: new Date().toISOString(),
        status: "UNREAD",
        channel: "SYSTEM"
      });
    }

    // Sync with Supabase asynchronously
    batchUpsert('inventory', [mapInventory(item)]).catch(err => console.warn("Supabase inventory sync warning:", err));

    res.json(item);
  });

  // Purchase Orders APIs
  app.get("/api/purchase-orders", (req, res) => {
    res.json(db.purchaseOrders || []);
  });

  app.post("/api/purchase-orders", (req, res) => {
    const { materialId, materialName, category, vendor, vendorContact, qty, unit, unitCost, estimatedDelivery, remarks, trackingNumber } = req.body;
    const poId = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    
    const newPO = {
      id: poId,
      materialId: materialId || `RM-${Date.now()}`,
      materialName: materialName || "Raw Material",
      category: category || "RAW_MATERIAL",
      vendor: vendor || "Arcenol Supply Partner",
      vendorContact: vendorContact || "+91 98765 00000",
      qty: Number(qty || 100),
      unit: unit || "Pcs",
      unitCost: Number(unitCost || 100),
      totalAmount: Number(qty || 100) * Number(unitCost || 100),
      orderDate: new Date().toISOString().split('T')[0],
      estimatedDelivery: estimatedDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: "Pending Supplier Confirmation",
      trackingNumber: trackingNumber || `TRK-ARC-${Math.floor(1000 + Math.random() * 9000)}`,
      remarks: remarks || "Generated via MRP Reorder Request"
    };

    if (!db.purchaseOrders) db.purchaseOrders = [];
    db.purchaseOrders.unshift(newPO);

    // Push notification
    db.notifications.unshift({
      id: `n-${Date.now()}`,
      type: "SYSTEM",
      title: `New PO Created: ${poId}`,
      message: `Purchase Order ${poId} generated for ${newPO.materialName} (${newPO.qty} ${newPO.unit}) to ${newPO.vendor}.`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    res.json(newPO);
  });

  app.put("/api/purchase-orders/:id", (req, res) => {
    const { id } = req.params;
    if (!db.purchaseOrders) db.purchaseOrders = [];
    const index = db.purchaseOrders.findIndex((p: any) => p.id === id);
    if (index === -1) return res.status(404).json({ error: "Purchase Order not found" });

    const updated = {
      ...db.purchaseOrders[index],
      ...req.body,
      id,
      totalAmount: (Number(req.body.qty ?? db.purchaseOrders[index].qty)) * (Number(req.body.unitCost ?? db.purchaseOrders[index].unitCost))
    };
    db.purchaseOrders[index] = updated;
    res.json(updated);
  });

  app.delete("/api/purchase-orders/:id", (req, res) => {
    const { id } = req.params;
    if (!db.purchaseOrders) db.purchaseOrders = [];
    db.purchaseOrders = db.purchaseOrders.filter((p: any) => p.id !== id);
    res.json({ success: true, id });
  });

  app.patch("/api/purchase-orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!db.purchaseOrders) db.purchaseOrders = [];
    const po = db.purchaseOrders.find((p: any) => p.id === id);
    if (!po) return res.status(404).json({ error: "Purchase Order not found" });

    po.status = status;
    if (remarks) po.remarks = remarks;

    // If status is "GRN Received", add or update the inventory quantity
    if (status === "GRN Received") {
      let invItem = db.inventory.find((i: any) => i.id === po.materialId || i.code === po.materialId || (i.name && i.name.toLowerCase() === po.materialName.toLowerCase()));
      if (invItem) {
        invItem.qty += Number(po.qty || 0);
        invItem.grn = `GRN-${po.id}`;
      } else {
        invItem = {
          id: po.materialId || `RM-${Date.now()}`,
          name: po.materialName,
          code: `CD-${Math.floor(100 + Math.random() * 900)}`,
          category: po.category || "RAW_MATERIAL",
          supplier: po.vendor,
          batch: `B-PO-${po.id}`,
          qty: Number(po.qty || 0),
          status: "ACTIVE",
          reservedQty: 0,
          minStock: 100,
          reorderLevel: 250,
          warehouse: "Raw Hub",
          rack: "A1",
          grn: `GRN-${po.id}`,
          date: new Date().toISOString().split('T')[0],
          price: Number(po.unitCost || 0),
          unit: po.unit || "Pcs",
          qcStatus: "APPROVED",
          challanNo: `CH-${Math.floor(1000 + Math.random() * 9000)}`,
          vehicleNo: "GJ-01-AB-1234",
          eWayBill: `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
          exciseSlip: `EXC-${Math.floor(1000 + Math.random() * 9000)}`,
          acceptedQty: Number(po.qty || 0),
          damagedQty: 0
        };
        db.inventory.push(invItem);
      }
    }

    res.json(po);
  });

  app.post("/api/inventory/bulk", (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid data format. Expected 'items' array." });
    }

    const added: any[] = [];

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
        reservedQty: Number(item.reservedQty || 0),
        minStock: Number(item.minStock || 100),
        reorderLevel: Number(item.reorderLevel || 250),
        warehouse: item.warehouse || "Raw Hub",
        rack: item.rack || "A-1",
        grn: item.grn || `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
        date: item.date || new Date().toISOString().split('T')[0],
        price: Number(item.price || 0),
        unit: item.unit || "Pcs",
        qcStatus: item.qcStatus || "APPROVED",
        challanNo: item.challanNo || `CH-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleNo: item.vehicleNo || "GJ-01-AB-1234",
        eWayBill: item.eWayBill || `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
        exciseSlip: item.exciseSlip || `EXC-${Math.floor(1000 + Math.random() * 9000)}`,
        acceptedQty: Number(item.acceptedQty || item.qty || 0),
        damagedQty: Number(item.damagedQty || 0)
      };

      db.inventory.push(newItem);
      added.push(newItem);
    });

    if (added.length > 0) {
      db.notifications.push({
        id: `rm-bulk-notif-${Date.now()}`,
        type: "ENGAGEMENT",
        title: `Bulk Imported ${added.length} Raw Materials`,
        message: `Successfully registered ${added.length} old/historic raw material records into inventory ledger.`,
        date: new Date().toISOString(),
        status: "UNREAD",
        channel: "SYSTEM"
      });

      // Sync bulk array to Supabase
      batchUpsert('inventory', added.map(mapInventory)).catch(err => console.warn("Supabase bulk inventory sync warning:", err));
    }

    res.json({ addedCount: added.length, items: added });
  });

  app.post("/api/inventory/bulk-reorder", (req, res) => {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "INVALID_PARAMETERS", message: "Orders list is required and should be an array" });
    }
    
    let updatedCount = 0;
    orders.forEach((ord: any) => {
      const item = db.inventory.find(i => i.id === ord.id);
      if (item) {
        item.qty += Number(ord.reorderQty || 0);
        updatedCount++;
      }
    });

    db.notifications.push({
      id: `n-${Date.now()}`,
      type: "BULK_REORDER",
      title: "Bulk Reorder Dispatched",
      message: `Authorized replenishment of ${updatedCount} low-stock material nodes. Raw ledger balances adjusted.`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    res.json({ success: true, updatedItemsCount: updatedCount });
  });

  app.delete("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const index = db.inventory.findIndex(i => i.id === id);
    if (index !== -1) {
      db.inventory.splice(index, 1);
      deleteRecord('inventory', id).catch(err => console.warn("Supabase inventory delete warning:", err));
      res.json({ success: true, message: "Inventory item deleted successfully" });
    } else {
      res.status(404).json({ error: "Inventory item not found" });
    }
  });

  app.post("/api/warehouses", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Warehouse name is required" });
    if (db.warehouses.includes(name)) {
      return res.status(400).json({ error: "Warehouse already exists" });
    }
    db.warehouses.push(name);
    batchUpsert('warehouses', [mapWarehouse(name)]).catch(err => console.warn("Supabase warehouse sync warning:", err));
    res.json({ success: true, warehouses: db.warehouses });
  });

  app.put("/api/warehouses", (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: "Both old and new names are required" });
    const idx = db.warehouses.indexOf(oldName);
    if (idx === -1) return res.status(404).json({ error: "Warehouse not found" });
    if (db.warehouses.includes(newName) && oldName !== newName) {
      return res.status(400).json({ error: "Warehouse already exists" });
    }
    db.warehouses[idx] = newName;
    // Update occurrences in inventory
    db.inventory.forEach(i => {
      if (i.warehouse === oldName) i.warehouse = newName;
    });
    // Update occurrences in finished goods
    db.finishedGoods.forEach(fg => {
      if (fg.warehouse === oldName) fg.warehouse = newName;
    });
    deleteRecord('warehouses', oldName).catch(() => {});
    batchUpsert('warehouses', [mapWarehouse(newName)]).catch(err => console.warn("Supabase warehouse sync warning:", err));
    res.json({ success: true, warehouses: db.warehouses });
  });

  app.delete("/api/warehouses/:name", (req, res) => {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);
    const idx = db.warehouses.indexOf(decodedName);
    if (idx === -1) return res.status(404).json({ error: "Warehouse not found" });
    db.warehouses.splice(idx, 1);
    // Reassign occurrences to "Unassigned" or a fallback warehouse
    db.inventory.forEach(i => {
      if (i.warehouse === decodedName) i.warehouse = "Unassigned";
    });
    db.finishedGoods.forEach(fg => {
      if (fg.warehouse === decodedName) fg.warehouse = "Unassigned";
    });
    deleteRecord('warehouses', decodedName).catch(err => console.warn("Supabase warehouse delete warning:", err));
    res.json({ success: true, warehouses: db.warehouses });
  });

  app.post("/api/processing", (req, res) => {
    const { inputId, outputBatches, processingDegree } = req.body;
    const rawItem = db.inventory.find(i => i.id === inputId);
    
    if (!rawItem) return res.status(404).json({ error: "Raw material not found" });

    const totalOutputQty = outputBatches.reduce((acc: number, b: any) => acc + b.qty, 0);
    rawItem.qty -= totalOutputQty;

    outputBatches.forEach((batch: any) => {
      db.gradedInventory.push({
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        parentId: inputId,
        name: `${batch.grade} Graded - ${rawItem.name}`,
        processingDegree,
        ...batch,
        date: new Date().toISOString().split('T')[0]
      });
    });

    db.processingLogs.push({
      id: Date.now().toString(),
      inputId,
      processingDegree,
      outputBatches,
      date: new Date().toISOString()
    });

    res.json({ status: "success" });
  });

  app.post("/api/production", (req, res) => {
    const entry = { id: Date.now().toString(), ...req.body };
    // Auto-update stock logic could go here
    db.production.push(entry);
    res.json(entry);
  });

  app.post("/api/production/complete", (req, res) => {
    const { model, qty, warehouse, rack } = req.body;
    const serials = [];
    const batch = `BATCH-${new Date().toISOString().slice(0, 10)}`;
    
    // Generate serials and add to finished goods
    for (let i = 0; i < qty; i++) {
      const serial = generateBatterySerial(model, 1000 + i + 1);
      serials.push(serial);
      db.finishedGoods.push({
        id: `fg-${Date.now()}-${i}`,
        model,
        serial,
        batch,
        warehouse,
        rack,
        date: new Date().toISOString().split('T')[0],
        status: "READY"
      });
    }

    // Record in history
    db.productionHistory.push({
      id: `ph-${Date.now()}`,
      model,
      qty,
      serials,
      date: new Date().toISOString().split('T')[0],
      status: "COMPLETED"
    });

    // Auto-deduct Logic (Precise identification)
    const product = db.products.find(p => p.id === model);
    if (product) {
      (product.bom || []).forEach(bomItem => {
        const invItem = db.inventory.find(inv => inv.id === bomItem.matId);
        if (invItem) {
          const totalQty = (bomItem.qty * (1 + (bomItem.wastage || 0) / 100)) * qty;
          invItem.qty -= totalQty;
        }
      });
    }

    res.json({ status: "success", serials });
  });

  app.post("/api/leads", (req, res) => {
    const lead = { id: Date.now().toString(), status: 'NEW', ...req.body };
    db.leads.push(lead);

    // Trigger Lead Notification
    db.notifications.push({
        id: `n-${Date.now()}`,
        type: "FOLLOW_UP",
        title: "New Opportunity captured",
        message: `${lead.company} is interested in ${lead.requirement}. Follow up set for ${lead.followUpDate}.`,
        date: new Date().toISOString(),
        status: "UNREAD",
        channel: "SMS"
    });

    batchUpsert('lead_inquiries', [mapLead(lead)]).catch(err => console.warn("Supabase lead sync warning:", err));

    res.json(lead);
  });

  app.put("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    const index = db.leads.findIndex(l => l.id === id);
    if (index !== -1) {
      db.leads[index] = { ...db.leads[index], ...req.body };
      batchUpsert('lead_inquiries', [mapLead(db.leads[index])]).catch(err => console.warn("Supabase lead sync warning:", err));
      res.json(db.leads[index]);
    } else {
      res.status(404).json({ error: "Lead not found" });
    }
  });

  app.delete("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    db.leads = db.leads.filter(l => l.id !== id);
    deleteRecord('lead_inquiries', id).catch(err => console.warn("Supabase lead delete warning:", err));
    res.json({ success: true });
  });

  app.post("/api/dealers", (req, res) => {
    const dealer = { id: `D-${Math.floor(100 + Math.random() * 900)}`, status: 'ACTIVE', ...req.body };
    db.dealers.push(dealer);
    batchUpsert('customers', [mapCustomer(dealer)]).catch(err => console.warn("Supabase customer sync warning:", err));
    res.json(dealer);
  });

  app.delete("/api/dealers/:id", (req, res) => {
    const { id } = req.params;
    db.dealers = db.dealers.filter(d => d.id !== id);
    deleteRecord('customers', id).catch(err => console.warn("Supabase customer delete warning:", err));
    res.json({ success: true });
  });

  app.put("/api/dealers/:id", (req, res) => {
    const { id } = req.params;
    const index = db.dealers.findIndex(d => d.id === id);
    if (index !== -1) {
      db.dealers[index] = { ...db.dealers[index], ...req.body };
      batchUpsert('customers', [mapCustomer(db.dealers[index])]).catch(err => console.warn("Supabase customer sync warning:", err));
      res.json(db.dealers[index]);
    } else {
      res.status(404).json({ error: "Dealer not found" });
    }
  });

  app.post("/api/leads/convert/:id", (req, res) => {
    const { id } = req.params;
    const leadIndex = db.leads.findIndex(l => l.id === id);
    if (leadIndex === -1) return res.status(404).json({ error: "Lead not found" });
    const lead = db.leads[leadIndex];
    
    // Create dealer
    const dealer = {
      id: `D-${Math.floor(100 + Math.random() * 900)}`,
      company: lead.company,
      category: lead.category === 'Dealer' ? 'Tier 1 Dealer' : lead.category,
      phone: lead.phone,
      email: `${lead.company.toLowerCase().replace(/\s/g, '')}@partner.com`,
      location: lead.location.split(',')[0],
      city: lead.location.split(',')[0],
      state: lead.location.split(',')[1]?.trim() || 'Gujarat',
      region: 'West', // Default
      contactPerson: lead.contactPerson,
      status: 'ACTIVE',
      gstin: 'PENDING_REGISTRATION',
      bankDetails: 'Not Provided',
      rankingScore: 50, // Initial score
      joinDate: new Date().toISOString().split('T')[0]
    };
    
    db.dealers.push(dealer);
    lead.status = 'CONVERTED';

    batchUpsert('lead_inquiries', [mapLead(lead)]).catch(err => console.warn("Supabase lead sync warning:", err));
    batchUpsert('customers', [mapCustomer(dealer)]).catch(err => console.warn("Supabase customer sync warning:", err));
    
    res.json({ success: true, dealer });
  });

  app.post("/api/complaints", (req, res) => {
    const { serial, type, notes } = req.body;
    const complaint = {
      id: `C-${1000 + db.complaints.length + 1}`,
      serial,
      type,
      notes,
      date: new Date().toISOString().split('T')[0],
      stage: "REGISTERED" as string,
      status: "OPEN",
      engineer: "Unassigned",
      rootCause: "",
      inspectionResult: "",
      resolvedDate: ""
    };
    db.complaints.push(complaint);
    
    // Add to warranty history if exists
    const warranty = db.warranty.find(w => w.serial === serial);
    if (warranty) {
      if (!warranty.history) warranty.history = [];
      warranty.history.push({ 
        date: complaint.date, 
        type: "CLAIM_FILED", 
        description: `${type}: ${notes}` 
      });
    }
    
    batchUpsert('complaints', [mapComplaint(complaint)]).catch(err => console.warn("Supabase complaint sync warning:", err));

    res.json(complaint);
  });

  app.patch("/api/complaints/:id", (req, res) => {
    const { id } = req.params;
    const index = db.complaints.findIndex(c => c.id === id);
    if (index !== -1) {
      db.complaints[index] = { ...db.complaints[index], ...req.body };
      
      // Notify on significant stage changes
      if (['QC_PASSED', 'CLOSED'].includes(req.body.stage)) {
        db.notifications.push({
          id: `n-${Date.now()}`,
          type: "SERVICE_DELAY",
          title: `Service Update: ${id}`,
          message: `Unit ${db.complaints[index].serial} is now in stage ${req.body.stage}.`,
          date: new Date().toISOString(),
          status: "UNREAD",
          channel: "WHATSAPP"
        });
      }

      // If status is closed, update warranty history
      if (req.body.stage === 'CLOSED' || req.body.status === 'RESOLVED') {
          const serial = db.complaints[index].serial;
          const warranty = db.warranty.find(w => w.serial === serial);
          if (warranty && warranty.history) {
              warranty.history.push({
                  date: new Date().toISOString().split('T')[0],
                  type: "CLAIM_RESOLVED",
                  description: `Fixed: ${db.complaints[index].rootCause}`
              });
          }
      }

      batchUpsert('complaints', [mapComplaint(db.complaints[index])]).catch(err => console.warn("Supabase complaint sync warning:", err));

      res.json(db.complaints[index]);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.delete("/api/complaints/:id", (req, res) => {
    const { id } = req.params;
    const index = db.complaints.findIndex(c => c.id === id);
    if (index !== -1) {
      const deleted = db.complaints.splice(index, 1);
      deleteRecord('complaints', id).catch(err => console.warn("Supabase complaint delete warning:", err));
      res.json({ success: true, deleted: deleted[0] });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.post("/api/cells/grade", (req, res) => {
    const { parentId, cellData } = req.body;
    const rawItem = db.inventory.find(i => i.id === parentId);
    if (!rawItem) return res.status(404).json({ error: "Inventory node not found" });

    // Deduct from raw stock
    rawItem.qty -= 1;

    const entry = {
      id: `g-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      parentId,
      name: rawItem.name,
      supplier: rawItem.supplier,
      date: new Date().toISOString().split('T')[0],
      ...cellData
    };

    db.gradedInventory.push(entry);
    batchUpsert('graded_cells', [mapGradedCell(entry)]).catch(err => console.warn("Supabase cell sync warning:", err));
    res.json(entry);
  });

  app.put("/api/cells/grade/:id", (req, res) => {
    const { id } = req.params;
    const { cellData } = req.body;
    const entryIndex = db.gradedInventory.findIndex(g => g.id === id);
    if (entryIndex === -1) return res.status(404).json({ error: "Graded entry not found" });
    db.gradedInventory[entryIndex] = {
      ...db.gradedInventory[entryIndex],
      ...cellData
    };
    batchUpsert('graded_cells', [mapGradedCell(db.gradedInventory[entryIndex])]).catch(err => console.warn("Supabase cell sync warning:", err));
    res.json(db.gradedInventory[entryIndex]);
  });

  app.delete("/api/cells/grade/:id", (req, res) => {
    const { id } = req.params;
    const entryIndex = db.gradedInventory.findIndex(g => g.id === id);
    if (entryIndex === -1) return res.status(404).json({ error: "Graded entry not found" });
    const deleted = db.gradedInventory.splice(entryIndex, 1)[0] as any;
    
    // Add quantity back to raw stock
    const rawItem = db.inventory.find(i => i.id === deleted.parentId);
    if (rawItem) {
      rawItem.qty += 1;
    }
    deleteRecord('graded_cells', id).catch(err => console.warn("Supabase cell delete warning:", err));
    res.json({ success: true });
  });

  app.get("/api/production/wip", (req, res) => {
    res.json(db.wipInventory);
  });

  app.post("/api/production/wip/stages", (req, res) => {
    const { stage } = req.body;
    if (stage) {
      const normalStage = String(stage).toUpperCase().trim().replace(/\s+/g, '_');
      if (!db.wipStages) {
        db.wipStages = [
          "CELL_SORTING_&_MATRIX_ALIGNMENT",
          "SPOT_WELDING_&_BUSBAR_JOINING",
          "BMS_WIRING_&_SOLDERING",
          "CASING_&_POTTING",
          "QUALITY_CHECK"
        ];
      }
      if (!db.wipStages.includes(normalStage)) {
        db.wipStages.push(normalStage);
      }
      res.json({ success: true, stage: normalStage, stages: db.wipStages });
    } else {
      res.status(400).json({ error: "MISSING_STAGE", message: "Stage is required" });
    }
  });

  app.put("/api/production/wip/stages", (req, res) => {
    const { oldStage, newStage } = req.body;
    if (!oldStage || !newStage) {
      return res.status(400).json({ error: "MISSING_DATA", message: "Both oldStage and newStage are required" });
    }
    const formattedNewStage = String(newStage).toUpperCase().trim().replace(/\s+/g, '_');
    if (!db.wipStages) {
      db.wipStages = [
        "CELL_SORTING_&_MATRIX_ALIGNMENT",
        "SPOT_WELDING_&_BUSBAR_JOINING",
        "BMS_WIRING_&_SOLDERING",
        "CASING_&_POTTING",
        "QUALITY_CHECK"
      ];
    }
    
    // Replace in wipStages
    const idx = db.wipStages.indexOf(oldStage);
    if (idx !== -1) {
      db.wipStages[idx] = formattedNewStage;
    } else if (!db.wipStages.includes(formattedNewStage)) {
      db.wipStages.push(formattedNewStage);
    }

    // Update all WIP inventory items carrying the old stage
    db.wipInventory.forEach((wip: any) => {
      if (wip.stage === oldStage) {
        wip.stage = formattedNewStage;
        wip.lastUpdate = new Date().toISOString().split('T')[0];
        batchUpsert('wip_inventory', [mapWip(wip)]).catch(err => console.warn("Supabase WIP sync warning:", err));
      }
    });

    res.json({ success: true, oldStage, newStage: formattedNewStage, stages: db.wipStages });
  });

  app.delete("/api/production/wip/stages", (req, res) => {
    const stageToDelete = req.query.stage || req.body.stage;
    if (!stageToDelete) {
      return res.status(400).json({ error: "MISSING_STAGE", message: "Stage parameter is required" });
    }
    if (db.wipStages) {
      db.wipStages = db.wipStages.filter((st: string) => st !== stageToDelete);
    }
    res.json({ success: true, deletedStage: stageToDelete, stages: db.wipStages });
  });

  app.post("/api/production/wip/update-stage", (req, res) => {
    const { wipId, stage } = req.body;
    const wipItem = db.wipInventory.find((w: any) => w.id === wipId);
    if (wipItem) {
      wipItem.stage = stage;
      wipItem.lastUpdate = new Date().toISOString().split('T')[0];
      batchUpsert('wip_inventory', [mapWip(wipItem)]).catch(err => console.warn("Supabase WIP sync warning:", err));
      res.json(wipItem);
    } else {
      res.status(404).json({ error: "NOT_FOUND", message: "WIP item not found" });
    }
  });

  app.post("/api/production/wip/start", (req, res) => {
    const { name, qty, components, stage } = req.body;
    
    // Deduct components from inventory
    if (components && Array.isArray(components)) {
      components.forEach((comp: any) => {
        const invItem = db.inventory.find(i => i.id === comp.matId);
        if (invItem) invItem.qty = Math.max(0, invItem.qty - comp.qty);
      });
    }

    const defaultStage = stage || (db.wipStages && db.wipStages[0]) || "WELDING";

    const wip = {
      id: `wip-${Math.floor(100 + Math.random() * 899 + 100)}`,
      name,
      type: "Semi-Finished",
      qty,
      stage: defaultStage,
      lastUpdate: new Date().toISOString().split('T')[0],
      components: components || []
    };

    db.wipInventory.push(wip);
    batchUpsert('wip_inventory', [mapWip(wip)]).catch(err => console.warn("Supabase WIP sync warning:", err));
    res.json(wip);
  });

  app.put("/api/production/wip/:id", (req, res) => {
    const { id } = req.params;
    const { name, qty, stage } = req.body;
    const wip = db.wipInventory.find(w => w.id === id);
    if (!wip) return res.status(404).json({ error: "WIP batch not found" });
    
    if (name) wip.name = name;
    if (typeof qty !== 'undefined') wip.qty = Number(qty);
    if (stage) wip.stage = stage;
    wip.lastUpdate = new Date().toISOString().split('T')[0];
    batchUpsert('wip_inventory', [mapWip(wip)]).catch(err => console.warn("Supabase WIP sync warning:", err));
    
    res.json(wip);
  });

  app.delete("/api/production/wip/:id", (req, res) => {
    const { id } = req.params;
    const index = db.wipInventory.findIndex(w => w.id === id);
    if (index === -1) return res.status(404).json({ error: "WIP batch not found" });
    
    const [deleted] = db.wipInventory.splice(index, 1);
    
    // Return components back to inventory on delete
    if (deleted.components && Array.isArray(deleted.components)) {
      deleted.components.forEach((comp: any) => {
        const invItem = db.inventory.find(i => i.id === comp.matId);
        if (invItem) invItem.qty += comp.qty;
      });
    }
    
    deleteRecord('wip_inventory', id).catch(err => console.warn("Supabase WIP delete warning:", err));
    res.json({ success: true });
  });

  // --- DIRECT SYNC GATEWAY ENDPOINTS ---
  app.post("/api/sync/customer/register-warranty", (req, res) => {
    const { serial, customerName, email, phone } = req.body;
    if (!serial) return res.status(400).json({ error: "Serial is required" });

    // Validate or create finished good
    let fg = db.finishedGoods.find(item => item.serial === serial);
    if (!fg) {
      // Auto-generate finished good node so user's arbitrary keyboard entries always sync
      fg = {
        id: `fg-sync-${Date.now()}`,
        model: "72V30A",
        serial,
        batch: "BATCH-SYNC-ONLINE",
        warehouse: "Main Warehouse",
        rack: "AUTO-BIN",
        date: new Date().toISOString().split('T')[0],
        status: "SOLD"
      };
      db.finishedGoods.push(fg);
    } else {
      fg.status = "SOLD";
    }

    // Check if warranty exists, otherwise append
    let w = db.warranty.find(item => item.serial === serial);
    if (!w) {
      w = {
        id: `W-CS-${Date.now()}`,
        serial,
        dealerId: "Direct Customer Gateway",
        startDate: new Date().toISOString().split('T')[0],
        durationMonths: 36,
        status: "ACTIVE",
        history: []
      };
      db.warranty.push(w);
    }

    if (!w.history) w.history = [];
    w.history.push({
      date: new Date().toISOString().split('T')[0],
      type: "CUSTOMER_REGISTERED",
      description: `Registered directly via user companion app. Customer: ${customerName || 'Anonymous'} (${phone || 'No phone'})`
    });

    // Notify Operator Panel
    db.notifications.push({
      id: `notif-sync-${Date.now()}`,
      type: "ENGAGEMENT",
      title: "Direct Customer Warranty Registered",
      message: `Customer ${customerName || 'Anonymous'} synced serial ${serial} via downloaded smartphone app!`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    // Append to live engagement scans so manager sees user maps
    if (db.engagement) {
      if (!db.engagement.stats) {
        db.engagement.stats = { activeAppUsers: 4280, qrScans30d: 12450, claimRequests: 142, avgRating: 4.8 };
      }
      db.engagement.stats.qrScans30d = (db.engagement.stats.qrScans30d || 0) + 1;
      db.engagement.stats.activeAppUsers = (db.engagement.stats.activeAppUsers || 0) + 1;
      
      const newScan = {
        id: "scan-" + Date.now(),
        model: fg.model || "72V30A",
        user: customerName || "Anonymous Consumer",
        location: "Web Portal Sync",
        time: "Just now"
      };
      db.engagement.recentScans = [newScan, ...db.engagement.recentScans].slice(0, 8);
    }

    res.json({ success: true, finishedGood: fg, warranty: w });
  });

  app.post("/api/sync/logistics/scan", (req, res) => {
    const { itemId, deltaQty, notes, action } = req.body; // action: 'ADD' or 'SUB'
    const item = db.inventory.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: "Inventory item not found" });

    const change = Number(deltaQty) || 0;
    if (action === 'SUB') {
      item.qty = Math.max(0, item.qty - change);
    } else {
      item.qty += change;
    }

    db.notifications.push({
      id: `notif-sc-${Date.now()}`,
      type: "LOW_STOCK",
      title: "Warehouse Physical Scanner Sync",
      message: `${notes || 'Storekeeper barcode transaction'}: Tuned ${item.name} (-/+ ${change} ${item.unit || 'units'}). Balanced stock: ${item.qty}`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    res.json({ success: true, item });
  });

  app.post("/api/notifications/clear", (req, res) => {
    db.notifications.forEach(n => n.status = 'READ');
    res.json({ status: "success" });
  });

  app.patch("/api/finishedGoods/:id", (req, res) => {
    const { id } = req.params;
    const { status, warehouse, rack, batch } = req.body;
    const item = db.finishedGoods.find(fg => fg.id === id);

    if (!item) {
      return res.status(404).json({ error: "Finished good not found" });
    }

    if (status) item.status = status;
    if (warehouse) item.warehouse = warehouse;
    if (rack) item.rack = rack;
    if (batch) item.batch = batch;

    // Trigger Notification: Finished Good Updated
    db.notifications.push({
      id: `fg-notif-${Date.now()}`,
      type: "ENGAGEMENT",
      title: `Finished Good ${item.serial} Updated`,
      message: `Serial ${item.serial} updated: relocated to ${item.warehouse} (Rack: ${item.rack}), Status: ${item.status}.`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    res.json(item);
  });

  app.post("/api/finishedGoods/bulk", (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid data format. Expected 'items' array." });
    }

    const added: any[] = [];
    const skipped: any[] = [];

    items.forEach((item: any) => {
      const serial = String(item.serial || "").trim();
      if (!serial) {
        skipped.push({ ...item, reason: "Empty serial number" });
        return;
      }

      // Check for duplicate serials
      const exists = db.finishedGoods.some(fg => fg.serial.toLowerCase() === serial.toLowerCase());
      if (exists) {
        skipped.push({ ...item, reason: "Duplicate Serial ID in database" });
        return;
      }

      const newItem = {
        id: `fg-bulk-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        model: item.model || "72V30A",
        serial,
        batch: item.batch || "BULK-IMPORT",
        warehouse: item.warehouse || "Main Warehouse",
        rack: item.rack || "BIN-01",
        date: item.date || new Date().toISOString().substring(0, 10),
        status: item.status || "READY"
      };

      db.finishedGoods.push(newItem);
      added.push(newItem);
    });

    // Create system notification for bulk import
    if (added.length > 0) {
      db.notifications.push({
        id: `fg-bulk-notif-${Date.now()}`,
        type: "ENGAGEMENT",
        title: `Bulk Imported ${added.length} Battery Serials`,
        message: `Successfully registered ${added.length} old/historic battery serial numbers into active matrix.`,
        date: new Date().toISOString(),
        status: "UNREAD",
        channel: "SYSTEM"
      });
    }

    res.json({ success: true, addedCount: added.length, skippedCount: skipped.length, added, skipped });
  });

  // Custom Synced State Routes for multi-device live sync
  app.post("/api/warranty-checks", (req, res) => {
    (db as any).warrantyChecks = (db as any).warrantyChecks || [];
    (db as any).warrantyChecks.unshift(req.body);
    res.json((db as any).warrantyChecks);
  });

  app.post("/api/diagnostic-logs", (req, res) => {
    (db as any).diagnosticLogs = (db as any).diagnosticLogs || [];
    (db as any).diagnosticLogs.unshift(req.body);
    res.json((db as any).diagnosticLogs);
  });

  app.post("/api/vyapar-records", (req, res) => {
    (db as any).vyaparRecords = (db as any).vyaparRecords || [];
    (db as any).vyaparRecords.unshift(req.body);
    
    // Maintain db.vouchers
    (db as any).vouchers = (db as any).vouchers || [];
    const vObj = {
      id: req.body.id,
      voucherType: req.body.type,
      partyName: req.body.partyName,
      category: req.body.category || 'General',
      amount: req.body.amount,
      depositMode: req.body.mode,
      settlementStatus: req.body.status,
      paymentNotes: req.body.remarks,
      date: req.body.date
    };
    (db as any).vouchers.unshift(vObj);

    // Sync to Supabase
    batchUpsert('accounting_vouchers', [mapVoucher(req.body)]).catch(err => console.warn("Supabase voucher sync warning:", err));

    res.json((db as any).vyaparRecords);
  });

  app.delete("/api/vyapar-records/:id", (req, res) => {
    const { id } = req.params;
    (db as any).vyaparRecords = (db as any).vyaparRecords || [];
    (db as any).vyaparRecords = (db as any).vyaparRecords.filter((r: any) => r.id !== id);

    (db as any).vouchers = (db as any).vouchers || [];
    (db as any).vouchers = (db as any).vouchers.filter((v: any) => v.id !== id);

    deleteRecord('accounting_vouchers', id).catch(err => console.warn("Supabase voucher delete warning:", err));

    res.json({ success: true });
  });

  app.post("/api/subsidiaries", (req, res) => {
    (db as any).subsidiaries = (db as any).subsidiaries || [];
    (db as any).subsidiaries.push(req.body);
    batchUpsert('arcenol_corporate_units', [mapCorporateUnit(req.body)]).catch(err => console.warn("Supabase subsidiary sync warning:", err));
    res.json(req.body);
  });

  app.post("/api/subsidiaries/sync", (req, res) => {
    (db as any).subsidiaries = req.body;
    batchUpsert('arcenol_corporate_units', ((db as any).subsidiaries || []).map(mapCorporateUnit)).catch(err => console.warn("Supabase subsidiary sync warning:", err));
    res.json({ success: true });
  });

  app.put("/api/subsidiaries/:id", (req, res) => {
    const { id } = req.params;
    (db as any).subsidiaries = (db as any).subsidiaries || [];
    const index = (db as any).subsidiaries.findIndex((s: any) => s.id === id);
    if (index !== -1) {
      (db as any).subsidiaries[index] = { ...(db as any).subsidiaries[index], ...req.body };
    }
    const updated = (db as any).subsidiaries[index] || req.body;
    batchUpsert('arcenol_corporate_units', [mapCorporateUnit(updated)]).catch(err => console.warn("Supabase subsidiary sync warning:", err));
    res.json(updated);
  });

  app.delete("/api/subsidiaries/:id", (req, res) => {
    const { id } = req.params;
    (db as any).subsidiaries = (db as any).subsidiaries || [];
    (db as any).subsidiaries = (db as any).subsidiaries.filter((s: any) => s.id !== id);
    deleteRecord('arcenol_corporate_units', id).catch(err => console.warn("Supabase subsidiary delete warning:", err));
    res.json({ success: true });
  });

  app.post("/api/wh-layout", (req, res) => {
    (db as any).whLayoutConfig = req.body;
    res.json((db as any).whLayoutConfig);
  });

  app.post("/api/users", (req, res) => {
    (db as any).users = (db as any).users || [];
    (db as any).users.push(req.body);
    res.json(req.body);
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    (db as any).users = (db as any).users || [];
    const index = (db as any).users.findIndex((u: any) => u.id === id);
    if (index !== -1) {
      (db as any).users[index] = { ...(db as any).users[index], ...req.body };
    }
    res.json((db as any).users[index] || req.body);
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    (db as any).users = (db as any).users || [];
    (db as any).users = (db as any).users.filter((u: any) => u.id !== id);
    res.json({ success: true });
  });

  app.post("/api/users/reset", (req, res) => {
    (db as any).users = req.body;
    res.json((db as any).users);
  });

  // Supabase Global Sync Endpoint
  app.post("/api/supabase/sync-all", async (req, res) => {
    try {
      const summary = await syncAllERPToSupabase(db);
      res.json({ success: true, summary });
    } catch (err: any) {
      console.error("[Server] Supabase sync-all error:", err);
      res.status(500).json({ error: err.message || "Failed to sync with Supabase" });
    }
  });

  // Auto Hydrate and Sync on boot
  hydrateFromSupabase(db).then(() => {
    syncAllERPToSupabase(db).catch(err => console.warn("[Server] Boot Supabase sync warning:", err));
  });

  // Keep server in-memory DB continuously hydrated from Supabase every 3 seconds
  setInterval(() => {
    hydrateFromSupabase(db).catch(() => {});
  }, 3000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
