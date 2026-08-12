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

function normalizeToRevisedSerial(serial: string): string {
  if (!serial) return 'AESPL  EV  31G26001044';
  const clean = String(serial).trim();

  // If already matches standard revised pattern with spaces: e.g. "AESPL  EV  28G26001044" or "AESPL EV 28G26001044"
  const spaceMatch = clean.match(/^AESPL\s+([A-Z0-9]+)\s+([0-9]{2}[A-Z][0-9]{2,8})$/i);
  if (spaceMatch) {
    const grade = spaceMatch[1].toUpperCase();
    const suffix = spaceMatch[2].toUpperCase();
    return `AESPL  ${grade}  ${suffix}`;
  }

  // Handle hyphenated pattern e.g. "AESPL-BATNEXT200-26-1265" or "AESPL-72V30A-2026-9790" or "AESPL-EV-26-1265"
  const hyphenParts = clean.split('-');
  if (hyphenParts.length >= 2 && hyphenParts[0].toUpperCase() === 'AESPL') {
    const modelOrGrade = hyphenParts[1].toUpperCase();
    let grade = 'EV';
    if (modelOrGrade.includes('AUTO')) grade = 'AUTO';
    else if (modelOrGrade.includes('INV') || modelOrGrade.includes('NEXT') || modelOrGrade.includes('SOLAR') || modelOrGrade.includes('INVERTER') || modelOrGrade.includes('BATNEXT')) grade = 'INV';
    else if (modelOrGrade.includes('ESS')) grade = 'ESS';
    else if (modelOrGrade.includes('VRLA')) grade = 'VRLA';
    else if (modelOrGrade.includes('EV') || modelOrGrade.includes('72V') || modelOrGrade.includes('LIT') || modelOrGrade.includes('BIKE')) grade = 'EV';
    else {
      grade = modelOrGrade.replace(/[^A-Z]/g, '').slice(0, 4) || 'EV';
    }

    const rest = hyphenParts.slice(2).join('');
    const digits = rest.replace(/[^0-9]/g, '');
    let year = '26';
    let seq = digits;
    if (digits.length >= 6) {
      seq = digits.slice(-6);
    } else if (digits.length > 0) {
      seq = digits.padStart(6, '0');
    } else {
      seq = '001044';
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthChar = String.fromCharCode(65 + now.getMonth());

    return `AESPL  ${grade}  ${day}${monthChar}${year}${seq}`;
  }

  // Handle ARC- style: e.g. "ARC-72V30A-2026-183880"
  const arcParts = clean.split('-');
  if (arcParts.length >= 2 && arcParts[0].toUpperCase() === 'ARC') {
    const modelOrGrade = arcParts[1].toUpperCase();
    let grade = 'EV';
    if (modelOrGrade.includes('AUTO')) grade = 'AUTO';
    else if (modelOrGrade.includes('INV') || modelOrGrade.includes('NEXT') || modelOrGrade.includes('SOLAR')) grade = 'INV';
    else if (modelOrGrade.includes('VRLA')) grade = 'VRLA';
    else if (modelOrGrade.includes('ESS')) grade = 'ESS';

    const rest = arcParts.slice(2).join('');
    const digits = rest.replace(/[^0-9]/g, '');
    const seq = digits ? digits.slice(-6).padStart(6, '0') : '001044';

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthChar = String.fromCharCode(65 + now.getMonth());

    return `AESPL  ${grade}  ${day}${monthChar}26${seq}`;
  }

  // Unspaced pattern e.g. "AESPLEV28G26001044" or "AESPLINV31G26001265"
  const unspaced = clean.match(/^AESPL([A-Z]{2,4})(\d{2}[A-Z]\d+)$/i);
  if (unspaced) {
    return `AESPL  ${unspaced[1].toUpperCase()}  ${unspaced[2].toUpperCase()}`;
  }

  return clean;
}

function generateBatterySerial(gradeStr: string = "EV", seqNumber?: number | string): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const monthChar = String.fromCharCode(65 + now.getMonth());
  const year2 = String(now.getFullYear()).slice(-2);

  let gradeTag = "EV";
  if (gradeStr) {
    const upper = String(gradeStr).toUpperCase();
    if (upper.includes("AUTO")) gradeTag = "AUTO";
    else if (upper.includes("INV") || upper.includes("NEXT") || upper.includes("SOLAR") || upper.includes("INVERTER") || upper.includes("BATNEXT")) gradeTag = "INV";
    else if (upper.includes("ESS")) gradeTag = "ESS";
    else if (upper.includes("VRLA")) gradeTag = "VRLA";
    else if (upper.includes("EV") || upper.includes("72V") || upper.includes("LIT") || upper.includes("NMC") || upper.includes("RICK") || upper.includes("BIKE")) gradeTag = "EV";
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
      { id: "fg7b", model: "BAT-INV-150", serial: "AESPL  INV  28G26001056", batch: "BATCH-C1", warehouse: "Ahmedabad Warehouse", rack: "BIN-07", date: "2026-07-28", status: "READY" },
      { id: "fg8", model: "BAT-VRLA-100", serial: "AESPL  VRLA  28G26001051", batch: "BATCH-D1", warehouse: "Ahmedabad Warehouse", rack: "BIN-20", date: "2026-07-28", status: "READY" },
      { id: "fg8b", model: "BAT-VRLA-100", serial: "AESPL  VRLA  28G26001057", batch: "BATCH-D1", warehouse: "Main Warehouse", rack: "BIN-21", date: "2026-07-28", status: "READY" },
      { id: "fg9", model: "PROD-EV-BIKE", serial: "AESPL  EV  28G26001053", batch: "BATCH-E1", warehouse: "Main Warehouse", rack: "BIN-12", date: "2026-07-28", status: "READY" },
      { id: "fg9b", model: "PROD-EV-BIKE", serial: "AESPL  EV  28G26001058", batch: "BATCH-E1", warehouse: "Ahmedabad Warehouse", rack: "BIN-13", date: "2026-07-28", status: "READY" },
      { id: "fg10", model: "BAT-NEXT-200", serial: "AESPL  INV  28G26001054", batch: "BATCH-F1", warehouse: "Main Warehouse", rack: "BIN-14", date: "2026-07-28", status: "READY" },
      { id: "fg11", model: "BAT-NEXT-200", serial: "AESPL  INV  28G26001055", batch: "BATCH-F1", warehouse: "Ahmedabad Warehouse", rack: "BIN-15", date: "2026-07-28", status: "READY" },
      { id: "fg12", model: "LIT-200", serial: "AESPL  INV  28G26001059", batch: "BATCH-G1", warehouse: "Main Warehouse", rack: "BIN-18", date: "2026-07-28", status: "READY" },
      { id: "fg12b", model: "LIT-200", serial: "AESPL  INV  28G26001060", batch: "BATCH-G1", warehouse: "Ahmedabad Warehouse", rack: "BIN-19", date: "2026-07-28", status: "READY" },
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
      { id: "ph1", model: "72V30A", qty: 2, serials: ["AESPL  EV  28G26001044", "AESPL  EV  28G26001045"], date: "2024-05-10", status: "COMPLETED" }
    ],
    warehouses: ["Main Warehouse", "Ahmedabad Warehouse", "Dealer Warehouse", "Service Warehouse", "Raw Hub"],
    notifications: [
      { id: "n1", type: "FOLLOW_UP", title: "Upcoming Follow-up", message: "Dealer: Green Motors Ahmedabad at 11:00 AM", date: new Date().toISOString(), status: "UNREAD", channel: "WHATSAPP" },
      { id: "n2", type: "LOW_STOCK", title: "Low Stock Alert: Cells", message: "Current stock: 450 units. Reorder point: 1000.", date: new Date().toISOString(), status: "UNREAD", channel: "SYSTEM" }
    ],
    leads: [
        {
                "id": "l-1784531732680",
                "company": "PATEL PATEL",
                "category": "Retail",
                "location": "vadodara",
                "contactPerson": "PATEL PATEL",
                "phone": "9173023179",
                "leadSource": "Indiamart / B2B",
                "requirement": "lead alocate to shaineel call tomorrow",
                "status": "CONTACTED",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 04:57:54.002475+00"
        },
        {
                "id": "l-1784542396069",
                "company": "Pareshbhai",
                "category": "Retail",
                "location": "Bhavnagar",
                "contactPerson": "Pareshbhai",
                "phone": "09033332005",
                "leadSource": "Indiamart / B2B",
                "requirement": "bataege inform price",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 04:58:27.823613+00"
        },
        {
                "id": "l-1784715041508",
                "company": "ATS electric vehicles",
                "category": "Dealer",
                "location": "ahmedabad",
                "contactPerson": "ATS electric vehicles",
                "phone": "7600010551",
                "leadSource": "Cold Call",
                "requirement": "already sent proposal call back",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-11",
                "followUpTime": "11:01",
                "notes": "[Follow-up 2026-07-23]: dekh k bataege\n[Follow-up 2026-07-25]: dekh k cal karege\n[Follow-up 2026-07-30]: call karege already sent proposal",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "dekh k bataege",
                                "time": "09:31",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:01"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "dekh k cal karege",
                                "time": "16:40",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "11:01"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "call karege already sent proposal",
                                "time": "17:36",
                                "nextFollowUpDate": "2026-08-11",
                                "nextFollowUpTime": "11:01"
                        }
                ],
                "createdAt": "2026-07-23 03:58:28.744924+00"
        },
        {
                "id": "l-1784715189255",
                "company": "J D E bike zone",
                "category": "Dealer",
                "location": "ahmedabad",
                "contactPerson": "J D E bike zone",
                "phone": "7046573095",
                "leadSource": "Cold Call",
                "requirement": "sent proposal requirement hogi to bolege",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-13",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-30]: sent reminder jarurat hogi to bolege",
                "remarksLog": [
                        {
                                "date": "2026-07-30",
                                "text": "sent reminder jarurat hogi to bolege",
                                "time": "16:06",
                                "nextFollowUpDate": "2026-08-13",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 04:58:45.238183+00"
        },
        {
                "id": "l-1784715748778",
                "company": "pranvi motors",
                "category": "Dealer",
                "location": "ahmedabad",
                "contactPerson": "pranvi motors",
                "phone": "8155011817",
                "leadSource": "Cold Call",
                "requirement": "always disco the call",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-28",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-24]: switched off",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not attend",
                                "time": "09:30",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "switched off",
                                "time": "15:30",
                                "nextFollowUpDate": "2026-07-28",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-23 04:00:39.08537+00"
        },
        {
                "id": "l-1784716437277",
                "company": "omkaar e-vehicles",
                "category": "Dealer",
                "location": "naroda ,ahmedabad",
                "contactPerson": "omkaar e-vehicles",
                "phone": "8866843636",
                "leadSource": "Cold Call",
                "requirement": "sent proposal not attend",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-11",
                "followUpTime": "00:00",
                "notes": "[Follow-up 2026-07-23]: yet not seen dekh k bataege\n[Follow-up 2026-07-25]: sent proposal call back\n[Follow-up 2026-07-30]: sent reminder",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "yet not seen dekh k bataege",
                                "time": "09:35",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "00:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "sent proposal call back",
                                "time": "16:39",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "00:00"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "sent reminder",
                                "time": "17:36",
                                "nextFollowUpDate": "2026-08-11",
                                "nextFollowUpTime": "00:00"
                        }
                ],
                "createdAt": "2026-07-23 04:05:29.662592+00"
        },
        {
                "id": "l-1784718734397",
                "company": "AB enterprises",
                "category": "Dealer",
                "location": "ahmedabad",
                "contactPerson": "AB enterprises",
                "phone": "9824255770",
                "leadSource": "Cold Call",
                "requirement": "always disco the call",
                "status": "QUOTATION_SENT",
                "followUpDate": "2027-07-24",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: call forwarded\n[Follow-up 2026-07-24]: not want",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "call forwarded",
                                "time": "09:36",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "not want",
                                "time": "15:31",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 04:06:45.458777+00"
        },
        {
                "id": "l-1784719374197",
                "company": "kyte energy",
                "category": "Dealer",
                "location": "ahmedabad",
                "contactPerson": "kyte energy",
                "phone": "9825038383",
                "leadSource": "Cold Call",
                "requirement": "sent proposal call back tomorrow",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-20",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-23]: call tomorrow sent proposal reminder\n[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-29]: call back",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "call tomorrow sent proposal reminder",
                                "time": "15:46",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "call back",
                                "time": "15:50",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "call back",
                                "time": "12:31",
                                "nextFollowUpDate": "2026-08-20",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-23 04:58:51.574428+00"
        },
        {
                "id": "l-1784720408942",
                "company": "joy e-bikes",
                "category": "Dealer",
                "location": "ghatlodiya ,ahmedabad",
                "contactPerson": "joy e-bikes",
                "phone": "8200140684",
                "leadSource": "Cold Call",
                "requirement": "sent proposal ,call back",
                "status": "NEGOTIATION",
                "followUpDate": "2026-08-02",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: price issue",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "price issue",
                                "time": "09:47",
                                "nextFollowUpDate": "2026-08-02",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 04:17:42.239453+00"
        },
        {
                "id": "l-1784722912098",
                "company": "okinawa and joy e-bikes",
                "category": "Dealer",
                "location": "surat",
                "contactPerson": "okinawa and joy e-bikes",
                "phone": "9104448668",
                "leadSource": "Cold Call",
                "requirement": "sent proposal remidner cal not attend call back",
                "status": "NEGOTIATION",
                "followUpDate": "2026-08-08",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-25]: sent proposal call back\n[Follow-up 2026-07-30]: sent proposal call back",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not attend",
                                "time": "09:51",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "sent proposal call back",
                                "time": "16:40",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "sent proposal call back",
                                "time": "13:19",
                                "nextFollowUpDate": "2026-08-08",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 04:21:24.974274+00"
        },
        {
                "id": "l1",
                "company": "Green Motors Ahmedabad",
                "category": "Dealer",
                "location": "Ahmedabad, GJ",
                "contactPerson": "Rajesh Shah",
                "phone": "9876543210",
                "leadSource": "Website",
                "requirement": "72V Battery Packs x 50",
                "status": "INTERESTED",
                "followUpDate": "2024-05-20",
                "followUpTime": "11:00",
                "notes": "Negotiating on bulk discount.",
                "remarksLog": [],
                "createdAt": "2026-07-22 11:46:26.43661+00"
        },
        {
                "id": "l2",
                "company": "EV Solutions Delhi",
                "category": "Distributor",
                "location": "New Delhi, DL",
                "contactPerson": "Aman Varma",
                "phone": "9123456789",
                "leadSource": "Exhibition",
                "requirement": "Li-ion Cells Bulk Purchase",
                "status": "NEW",
                "followUpDate": "2024-05-18",
                "followUpTime": "15:30",
                "notes": "Interested in the new smart BMS feature.",
                "remarksLog": [],
                "createdAt": "2026-07-22 11:46:26.43661+00"
        },
        {
                "id": "lead-001",
                "company": "Modern EV Solutions",
                "category": "DEALER",
                "location": "Chennai, Tamil Nadu",
                "contactPerson": "Aravind Swamy",
                "phone": "+91 9876543210",
                "leadSource": "WEBSITE",
                "requirement": "Needs 100Ah battery pack solutions for 2-wheelers fleet rollouts.",
                "status": "INTERESTED",
                "followUpDate": "2026-07-01",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-01 07:44:26.950739+00"
        },
        {
                "id": "lead-1784721780688",
                "company": "testdc",
                "category": "Dealer",
                "location": "Noida",
                "contactPerson": "dcdcdc",
                "phone": "7894561230",
                "leadSource": "Website",
                "requirement": "need 15000ah battery",
                "status": "INTERESTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-22 12:03:01.084406+00"
        },
        {
                "id": "lead-1784778912419",
                "company": "Kiran",
                "category": "Retail",
                "location": "Anand",
                "contactPerson": "Kiran",
                "phone": "08849305429",
                "leadSource": "Indiamart / B2B",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2027-07-31",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-24]: switched off\n[Follow-up 2026-07-25]: call back\n[Follow-up 2026-07-28]: call disco\n[Follow-up 2026-07-31]: retail already purchased",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "switched off",
                                "time": "15:19",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "15:38",
                                "nextFollowUpDate": "2026-07-28",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-28",
                                "text": "call disco",
                                "time": "12:09",
                                "nextFollowUpDate": "2026-07-31",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-31",
                                "text": "retail already purchased",
                                "time": "16:15",
                                "nextFollowUpDate": "2027-07-31",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 03:55:14.8941+00"
        },
        {
                "id": "lead-1784783650789",
                "company": "adinath electric vehicles",
                "category": "Dealer",
                "location": "surat , gujarat",
                "contactPerson": "adinath electric vehicles",
                "phone": "9998064671",
                "leadSource": "Website",
                "requirement": "busy",
                "status": "CONTACTED",
                "followUpDate": "2026-07-27",
                "followUpTime": "10:43",
                "notes": "[Follow-up 2026-07-23]: cal disco\n[Follow-up 2026-07-24]: call disco.",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "cal disco",
                                "time": "15:49",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:43"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "call disco.",
                                "time": "15:50",
                                "nextFollowUpDate": "2026-07-27",
                                "nextFollowUpTime": "10:43"
                        }
                ],
                "createdAt": "2026-07-23 05:14:10.879881+00"
        },
        {
                "id": "lead-1784783988701",
                "company": "okinawa and joy e-bikes",
                "category": "Dealer",
                "location": "surat",
                "contactPerson": "okinawa and joy e-bikes",
                "phone": "9104448668",
                "leadSource": "Website",
                "requirement": "General Requirement",
                "status": "CONTACTED",
                "followUpDate": "2026-07-27",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: sent proposal reminder",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "sent proposal reminder",
                                "time": "15:55",
                                "nextFollowUpDate": "2026-07-27",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 05:22:13.763768+00"
        },
        {
                "id": "lead-1784784095049",
                "company": "okinawa  and joy e-bikes",
                "category": "Dealer",
                "location": "surat",
                "contactPerson": "okinawa and joy e-bikes",
                "phone": "9104448668",
                "leadSource": "Website",
                "requirement": "sent proposal not attend",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-11",
                "followUpTime": "10:51",
                "notes": "[Follow-up 2026-07-23]: sent reminder 2 se 3 din me update dege\n[Follow-up 2026-07-25]: sent reminder update karege\n[Follow-up 2026-07-30]: sent reminder alreay",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "sent reminder 2 se 3 din me update dege",
                                "time": "15:37",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:51"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "sent reminder update karege",
                                "time": "17:25",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:51"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "sent reminder alreay",
                                "time": "16:32",
                                "nextFollowUpDate": "2026-08-11",
                                "nextFollowUpTime": "10:51"
                        }
                ],
                "createdAt": "2026-07-23 05:21:35.118278+00"
        },
        {
                "id": "lead-1784784198606",
                "company": "surat  ev mall",
                "category": "Dealer",
                "location": "surat , gujarat",
                "contactPerson": "surat ev mall",
                "phone": "8160054809",
                "leadSource": "Website",
                "requirement": "General Requirement",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-28",
                "followUpTime": "10:53",
                "notes": "[Follow-up 2026-07-23]: call disco.\n[Follow-up 2026-07-24]: not attend",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "call disco.",
                                "time": "15:59",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:53"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "not attend",
                                "time": "15:40",
                                "nextFollowUpDate": "2026-07-28",
                                "nextFollowUpTime": "10:53"
                        }
                ],
                "createdAt": "2026-07-23 05:23:18.66353+00"
        },
        {
                "id": "lead-1784784357551",
                "company": "auto point okaya electric vehicles",
                "category": "Dealer",
                "location": "surat , gujarat",
                "contactPerson": "auto point okaya electric vehicles",
                "phone": "9106996545",
                "leadSource": "Website",
                "requirement": "sent proposal not interested",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-28",
                "followUpTime": "10:55",
                "notes": "[Follow-up 2026-07-23]: switched off\n[Follow-up 2026-07-24]: always swithed off",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "switched off",
                                "time": "15:59",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:55"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "always swithed off",
                                "time": "15:40",
                                "nextFollowUpDate": "2026-07-28",
                                "nextFollowUpTime": "10:55"
                        }
                ],
                "createdAt": "2026-07-23 05:25:57.610518+00"
        },
        {
                "id": "lead-1784784481153",
                "company": "futurist karayanam",
                "category": "Dealer",
                "location": "surat, gujarat",
                "contactPerson": "futurist karayanam",
                "phone": "8460276508",
                "leadSource": "Website",
                "requirement": "not interested call disco",
                "status": "CONTACTED",
                "followUpDate": "2026-07-26",
                "followUpTime": "10:57",
                "notes": "[Follow-up 2026-07-23]: call disco\n[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: cal back\n[Follow-up 2026-07-25]: call back",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "call disco",
                                "time": "15:23",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:57"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "call back",
                                "time": "15:27",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:57"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "cal back",
                                "time": "16:33",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:57"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "17:48",
                                "nextFollowUpDate": "2026-07-26",
                                "nextFollowUpTime": "10:57"
                        }
                ],
                "createdAt": "2026-07-23 05:28:01.21351+00"
        },
        {
                "id": "lead-1784784600529",
                "company": "sarkar auto point",
                "category": "Dealer",
                "location": "surat ,gujarat",
                "contactPerson": "sarkar auto point",
                "phone": "9879257309",
                "leadSource": "Website",
                "requirement": "e-rickshaws",
                "status": "CONTACTED",
                "followUpDate": "2026-08-03",
                "followUpTime": "10:59",
                "notes": "[Follow-up 2026-07-23]: busy hai bad me bat karege\n[Follow-up 2026-07-24]: BUSY HAI call karege\n[Follow-up 2026-07-25]: sent proposal dekh k batege\n[Follow-up 2026-07-29]: deal only 3 wheeler sent price\n[Follow-up 2026-07-30]: deal only 3 wheeler\n[Follow-up 2026-07-31]: sent proposal reminder call back 3 wheeler",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "busy hai bad me bat karege",
                                "time": "15:24",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:59"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "BUSY HAI call karege",
                                "time": "15:18",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:59"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "sent proposal dekh k batege",
                                "time": "15:38",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "10:59"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "deal only 3 wheeler sent price",
                                "time": "12:44",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:59"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "deal only 3 wheeler",
                                "time": "17:53",
                                "nextFollowUpDate": "2026-07-31",
                                "nextFollowUpTime": "10:59"
                        },
                        {
                                "date": "2026-07-31",
                                "text": "sent proposal reminder call back 3 wheeler",
                                "time": "16:13",
                                "nextFollowUpDate": "2026-08-03",
                                "nextFollowUpTime": "10:59"
                        }
                ],
                "createdAt": "2026-07-23 05:30:00.590297+00"
        },
        {
                "id": "lead-1784784727987",
                "company": "electron auto motors",
                "category": "Dealer",
                "location": "surat , gujarat",
                "contactPerson": "electron auto motors",
                "phone": "7622006668",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-26",
                "followUpTime": "11:01",
                "notes": "[Follow-up 2026-07-23]: not want\n[Follow-up 2026-07-23]: not want",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not want",
                                "time": "15:26",
                                "nextFollowUpDate": "2026-07-23",
                                "nextFollowUpTime": "11:01"
                        },
                        {
                                "date": "2026-07-23",
                                "text": "not want",
                                "time": "15:27",
                                "nextFollowUpDate": "2026-07-26",
                                "nextFollowUpTime": "11:01"
                        }
                ],
                "createdAt": "2026-07-23 05:32:08.048083+00"
        },
        {
                "id": "lead-1784784817492",
                "company": "royal ev tech",
                "category": "Dealer",
                "location": "surat , gujarat",
                "contactPerson": "royal ev tech",
                "phone": "9081768004",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:30",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 05:33:37.562907+00"
        },
        {
                "id": "lead-1784784924127",
                "company": "shree jalaram electric vehicles",
                "category": "Dealer",
                "location": "surat , gujarat",
                "contactPerson": "shree jalaram electric vehicles",
                "phone": "9924093397",
                "leadSource": "Website",
                "requirement": "not interested price issue",
                "status": "NEGOTIATION",
                "followUpDate": "2026-07-21",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 05:35:24.190195+00"
        },
        {
                "id": "lead-1784785089758",
                "company": "nitya e-mobility",
                "category": "Dealer",
                "location": "rajkot , gujara",
                "contactPerson": "nitya e-mobility",
                "phone": "8866221148",
                "leadSource": "Website",
                "requirement": "not interested",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:14",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 05:38:09.822228+00"
        },
        {
                "id": "lead-1784785318659",
                "company": "gajanan ev and solar",
                "category": "Dealer",
                "location": "rajkot , gujarat",
                "contactPerson": "gajanan ev and solar",
                "phone": "7621886555",
                "leadSource": "Website",
                "requirement": "not interested price issue",
                "status": "NEGOTIATION",
                "followUpDate": "2626-07-21",
                "followUpTime": "11:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 05:41:58.738957+00"
        },
        {
                "id": "lead-1784786484036",
                "company": "ampere electric scooter",
                "category": "Dealer",
                "location": "rajkot , gujarat",
                "contactPerson": "ampere electric scooter",
                "phone": "7942875177",
                "leadSource": "Website",
                "requirement": "incoming not available",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:14",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:01:24.111722+00"
        },
        {
                "id": "lead-1784786576736",
                "company": "shiv shakti auto agency",
                "category": "Dealer",
                "location": "rajkot , gujarat",
                "contactPerson": "shiv shakti auto agency",
                "phone": "9925725734",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-13",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: requirement hogi to bolege yet not require\n[Follow-up 2026-07-30]: reuirement hoga to bolege sent reminder",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "requirement hogi to bolege yet not require",
                                "time": "15:29",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "reuirement hoga to bolege sent reminder",
                                "time": "16:04",
                                "nextFollowUpDate": "2026-08-13",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 06:02:56.822062+00"
        },
        {
                "id": "lead-1784786679528",
                "company": "akshar & shree ji e-bikes",
                "category": "Dealer",
                "location": "rajkot , gujarat",
                "contactPerson": "akshar & shree ji e-bikes",
                "phone": "7984423892",
                "leadSource": "Website",
                "requirement": "busy call disco",
                "status": "CONTACTED",
                "followUpDate": "2026-07-21",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:04:39.612285+00"
        },
        {
                "id": "lead-1784786816957",
                "company": "shiv e vehicles",
                "category": "Dealer",
                "location": "rajkot , gujarat",
                "contactPerson": "shiv e vehicles",
                "phone": "9925612346",
                "leadSource": "Website",
                "requirement": "incoming call",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "11:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:06:57.041344+00"
        },
        {
                "id": "lead-1784787004921",
                "company": "siddhivinayak zelio",
                "category": "Dealer",
                "location": "rajkot, gujarat",
                "contactPerson": "siddhivinayak zelio",
                "phone": "8200382005",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2027-07-25",
                "followUpTime": "00:39",
                "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: no requiremt",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not attend",
                                "time": "15:33",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "00:39"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "call back",
                                "time": "15:47",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "00:39"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "no requiremt",
                                "time": "16:33",
                                "nextFollowUpDate": "2027-07-25",
                                "nextFollowUpTime": "00:39"
                        }
                ],
                "createdAt": "2026-07-23 06:10:04.997593+00"
        },
        {
                "id": "lead-1784787375861",
                "company": "jalaram auto point",
                "category": "Dealer",
                "location": "rajkot , gujarat",
                "contactPerson": "jalaram auto point",
                "phone": "8530500009",
                "leadSource": "Website",
                "requirement": "no requirement",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:14",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:16:15.94369+00"
        },
        {
                "id": "lead-1784787491181",
                "company": "adhya e-mobility llp",
                "category": "Dealer",
                "location": "rajkot , gujarat",
                "contactPerson": "adhya e-mobility llp",
                "phone": "7575075126",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-21",
                "followUpTime": "12:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:18:11.258424+00"
        },
        {
                "id": "lead-1784787652068",
                "company": "bgauss electric scooters",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "bgauss electric scooters",
                "phone": "7574000123",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2027-07-24",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-24]: no require",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not attend",
                                "time": "15:43",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "no require",
                                "time": "15:49",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-23 06:20:52.201593+00"
        },
        {
                "id": "lead-1784787767115",
                "company": "pure ev electric scooters",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "pure ev electric scooters",
                "phone": "9879900198",
                "leadSource": "Website",
                "requirement": "no requirement",
                "status": "CONTACTED",
                "followUpDate": "2026-07-21",
                "followUpTime": "09:30",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:22:47.207655+00"
        },
        {
                "id": "lead-1784787870562",
                "company": "bhagwati battery",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "bhagwati battery",
                "phone": "9978494073",
                "leadSource": "Website",
                "requirement": "not interested",
                "status": "CONTACTED",
                "followUpDate": "2027-07-24",
                "followUpTime": "10:30",
                "notes": "[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-24]: not intrested",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not intrested",
                                "time": "15:19",
                                "nextFollowUpDate": "2026-07-23",
                                "nextFollowUpTime": "10:30"
                        },
                        {
                                "date": "2026-07-23",
                                "text": "not intrested",
                                "time": "15:20",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:30"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "not intrested",
                                "time": "15:27",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "10:30"
                        }
                ],
                "createdAt": "2026-07-23 06:24:30.659936+00"
        },
        {
                "id": "lead-1784787968440",
                "company": "satish battery center",
                "category": "Dealer",
                "location": "mehsana , guujarat",
                "contactPerson": "satish battery center",
                "phone": "9408221149",
                "leadSource": "Website",
                "requirement": "dealers of battery",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-22",
                "followUpTime": "11:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:26:08.522149+00"
        },
        {
                "id": "lead-1784788107674",
                "company": "umiya power solutions",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "umiya power solutions",
                "phone": "9998499444",
                "leadSource": "Website",
                "requirement": "not interested",
                "status": "CONTACTED",
                "followUpDate": "2027-07-25",
                "followUpTime": "11:58",
                "notes": "[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-23]: nnot intrested\n[Follow-up 2026-07-25]: not intrested",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not intrested",
                                "time": "15:19",
                                "nextFollowUpDate": "2026-07-23",
                                "nextFollowUpTime": "11:58"
                        },
                        {
                                "date": "2026-07-23",
                                "text": "nnot intrested",
                                "time": "15:21",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:58"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "not intrested",
                                "time": "17:24",
                                "nextFollowUpDate": "2027-07-25",
                                "nextFollowUpTime": "11:58"
                        }
                ],
                "createdAt": "2026-07-23 06:28:27.758592+00"
        },
        {
                "id": "lead-1784788228833",
                "company": "ujas auto agency",
                "category": "Dealer",
                "location": "mehsana, gujarat",
                "contactPerson": "ujas auto agency",
                "phone": "6352405062",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-21",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:30:28.939649+00"
        },
        {
                "id": "lead-1784788331123",
                "company": "green e-bikes",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "green e-bikes",
                "phone": "9104340095",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:14",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:32:11.203802+00"
        },
        {
                "id": "lead-1784788419410",
                "company": "tirusai autolink",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "tirusai autolink",
                "phone": "7026600377",
                "leadSource": "Website",
                "requirement": "not reachable",
                "status": "CONTACTED",
                "followUpDate": "2027-07-25",
                "followUpTime": "12:03",
                "notes": "[Follow-up 2026-07-23]: not in service\n[Follow-up 2026-07-23]: not in service\n[Follow-up 2026-07-24]: not in service\n[Follow-up 2026-07-25]: not in service",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not in service",
                                "time": "15:19",
                                "nextFollowUpDate": "2026-07-23",
                                "nextFollowUpTime": "12:03"
                        },
                        {
                                "date": "2026-07-23",
                                "text": "not in service",
                                "time": "15:20",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "12:03"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "not in service",
                                "time": "15:26",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "12:03"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "not in service",
                                "time": "16:38",
                                "nextFollowUpDate": "2027-07-25",
                                "nextFollowUpTime": "12:03"
                        }
                ],
                "createdAt": "2026-07-23 06:33:39.489014+00"
        },
        {
                "id": "lead-1784788680877",
                "company": "matter",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "matter",
                "phone": "8238082320",
                "leadSource": "Website",
                "requirement": "company number",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:14",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:38:00.971024+00"
        },
        {
                "id": "lead-1784788769485",
                "company": "green go international electrics",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "green go international electrics",
                "phone": "6367658202",
                "leadSource": "Website",
                "requirement": "switched off",
                "status": "CONTACTED",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:39:29.578429+00"
        },
        {
                "id": "lead-1784788846441",
                "company": "shayona tvs",
                "category": "Dealer",
                "location": "mehsana , gujarat",
                "contactPerson": "shayona tvs",
                "phone": "9081085550",
                "leadSource": "Website",
                "requirement": "not reachable",
                "status": "CONTACTED",
                "followUpDate": "2027-07-31",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: switched off\n[Follow-up 2026-07-24]: switched off\n[Follow-up 2026-07-29]: switched off always\n[Follow-up 2026-07-30]: call back\n[Follow-up 2026-07-31]: tvs we not provide",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "switched off",
                                "time": "15:34",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "switched off",
                                "time": "15:48",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "switched off always",
                                "time": "12:30",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "call back",
                                "time": "17:52",
                                "nextFollowUpDate": "2026-07-31",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-31",
                                "text": "tvs we not provide",
                                "time": "16:07",
                                "nextFollowUpDate": "2027-07-31",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 06:40:46.539341+00"
        },
        {
                "id": "lead-1784789007908",
                "company": "chetak electric scooters",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "chetak electric scooters",
                "phone": "9168627000",
                "leadSource": "Website",
                "requirement": "not require",
                "status": "CONTACTED",
                "followUpDate": "2027-07-23",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: no require",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "no require",
                                "time": "15:49",
                                "nextFollowUpDate": "2027-07-23",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 06:43:27.998326+00"
        },
        {
                "id": "lead-1784789130117",
                "company": "mihir e bikes",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "mihir e bikes",
                "phone": "9974107071",
                "leadSource": "Website",
                "requirement": "sent proposal will inform",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:45:30.20873+00"
        },
        {
                "id": "lead-1784789257898",
                "company": "agwan motors pvt ltd",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "agwan motors pvt ltd",
                "phone": "8929711991",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-19",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:47:37.984047+00"
        },
        {
                "id": "lead-1784789332031",
                "company": "varun e bikes",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "varun e bikes",
                "phone": "9824206223",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-19",
                "followUpTime": "11:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:48:52.112792+00"
        },
        {
                "id": "lead-1784789402676",
                "company": "amaron pitstop",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "amaron pitshop",
                "phone": "9227715302",
                "leadSource": "Website",
                "requirement": "not interested",
                "status": "CONTACTED",
                "followUpDate": "2027-07-24",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-24]: not intrested",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not intrested",
                                "time": "15:40",
                                "nextFollowUpDate": "2026-07-24",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-24",
                                "text": "not intrested",
                                "time": "15:48",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-23 06:50:02.751357+00"
        },
        {
                "id": "lead-1784789549180",
                "company": "gajjar auto battery",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "gajjar auto battery",
                "phone": "9712974352",
                "leadSource": "Website",
                "requirement": "not want",
                "status": "CONTACTED",
                "followUpDate": "2027-07-25",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: not want\n[Follow-up 2026-07-25]: ni",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not want",
                                "time": "15:20",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "ni",
                                "time": "16:28",
                                "nextFollowUpDate": "2027-07-25",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 06:52:29.270704+00"
        },
        {
                "id": "lead-1784789647419",
                "company": "thomas battery",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "thomas battery",
                "phone": "7698570353",
                "leadSource": "Website",
                "requirement": "not interested",
                "status": "CONTACTED",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:54:07.499722+00"
        },
        {
                "id": "lead-1784789754875",
                "company": "forext battery",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "forext battery",
                "phone": "9594439345",
                "leadSource": "Website",
                "requirement": "not interested call disco",
                "status": "CONTACTED",
                "followUpDate": "2027-07-25",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: not deal in lithoum battery\n[Follow-up 2026-07-25]: not deal in lithium",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "not deal in lithoum battery",
                                "time": "16:00",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "not deal in lithium",
                                "time": "17:19",
                                "nextFollowUpDate": "2027-07-25",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 06:55:54.956228+00"
        },
        {
                "id": "lead-1784789867467",
                "company": "oreva e-bikes",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "oreva e-bikes",
                "phone": "9429621309",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:57:47.544975+00"
        },
        {
                "id": "lead-1784789971543",
                "company": "bansari automobiles",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "bansari automobiles",
                "phone": "9904991009",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-19",
                "followUpTime": "11:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 06:59:31.626319+00"
        },
        {
                "id": "lead-1784790044037",
                "company": "royal honda",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "royal honda",
                "phone": "9825039767",
                "leadSource": "Website",
                "requirement": "company number",
                "status": "CONTACTED",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 07:00:44.120463+00"
        },
        {
                "id": "lead-1784790143427",
                "company": "hero electric bikes",
                "category": "Dealer",
                "location": "gandhinagar",
                "contactPerson": "hero electric bikes",
                "phone": "9426282922",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-20",
                "followUpTime": "12:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 07:02:23.514068+00"
        },
        {
                "id": "lead-1784790267753",
                "company": "go green e-bikes",
                "category": "Dealer",
                "location": "navsari , gujarat",
                "contactPerson": "go green e-bikes",
                "phone": "8849208239",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 07:04:27.840083+00"
        },
        {
                "id": "lead-1784790374199",
                "company": "bajaj chetak electric",
                "category": "Dealer",
                "location": "navsari , gujarat",
                "contactPerson": "bajaj chetak electric",
                "phone": "9173067676",
                "leadSource": "Website",
                "requirement": "busy",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 07:06:14.279431+00"
        },
        {
                "id": "lead-1784790501159",
                "company": "hero electric",
                "category": "Dealer",
                "location": "navsari , gujarat",
                "contactPerson": "hero electric",
                "phone": "9898487022",
                "leadSource": "Website",
                "requirement": "incoming call not available",
                "status": "CONTACTED",
                "followUpDate": "2026-07-21",
                "followUpTime": "01:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 07:08:21.245929+00"
        },
        {
                "id": "lead-1784790608060",
                "company": "aarvi power solutions",
                "category": "Dealer",
                "location": "navsari , gujarat",
                "contactPerson": "aarvi power solutions",
                "phone": "9624178411",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-21",
                "followUpTime": "11:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 07:10:08.142869+00"
        },
        {
                "id": "lead-1784790715122",
                "company": "tvs mangaldeep motors llp",
                "category": "Dealer",
                "location": "navsari , gujarat",
                "contactPerson": "tvs mangaldeep motors llp",
                "phone": "9355068664",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-19",
                "followUpTime": "12:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 07:11:55.206107+00"
        },
        {
                "id": "lead-1784790817933",
                "company": "all ev services",
                "category": "Dealer",
                "location": "navsari , gujarat",
                "contactPerson": "all ev services",
                "phone": "9924472668",
                "leadSource": "Website",
                "requirement": "price issue",
                "status": "NEGOTIATION",
                "followUpDate": "2026-07-26",
                "followUpTime": "12:43",
                "notes": "[Follow-up 2026-07-23]: sent reminder price issue",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "sent reminder price issue",
                                "time": "16:03",
                                "nextFollowUpDate": "2026-07-26",
                                "nextFollowUpTime": "12:43"
                        }
                ],
                "createdAt": "2026-07-23 07:13:38.034754+00"
        },
        {
                "id": "lead-1784790994026",
                "company": "metro motors",
                "category": "Dealer",
                "location": "navsari , gujarat",
                "contactPerson": "metro motors",
                "phone": "9289922250",
                "leadSource": "Website",
                "requirement": "company number",
                "status": "CONTACTED",
                "followUpDate": "2027-07-23",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: company number",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "company number",
                                "time": "16:04",
                                "nextFollowUpDate": "2027-07-23",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 07:16:34.109452+00"
        },
        {
                "id": "lead-1784799205695",
                "company": "riddhi e-vehicles",
                "category": "Dealer",
                "location": "anand , gujarat",
                "contactPerson": "riddhi e-vehicles",
                "phone": "9016300975",
                "leadSource": "Website",
                "requirement": "no requirement",
                "status": "CONTACTED",
                "followUpDate": "2027-07-23",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-23]: no requirement",
                "remarksLog": [
                        {
                                "date": "2026-07-23",
                                "text": "no requirement",
                                "time": "16:06",
                                "nextFollowUpDate": "2027-07-23",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-23 09:33:25.830615+00"
        },
        {
                "id": "lead-1784799286204",
                "company": "om auto battery",
                "category": "Dealer",
                "location": "anand , gujarat",
                "contactPerson": "om auto battery",
                "phone": "9687319777",
                "leadSource": "Website",
                "requirement": "busy",
                "status": "CONTACTED",
                "followUpDate": "2026-07-19",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 09:34:46.28793+00"
        },
        {
                "id": "lead-1784799384349",
                "company": "bhavya auto",
                "category": "Dealer",
                "location": "anand , gujarat",
                "contactPerson": "bhavya auto",
                "phone": "9104006108",
                "leadSource": "Website",
                "requirement": "busy another call not interested",
                "status": "CONTACTED",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:14",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 09:36:24.431582+00"
        },
        {
                "id": "lead-1784799886669",
                "company": "e-future generation next",
                "category": "Dealer",
                "location": "anand , gujarat",
                "contactPerson": "e-future generation next",
                "phone": "8200660586",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-20",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 09:44:46.759089+00"
        },
        {
                "id": "lead-1784799978560",
                "company": "kiran electric scooter",
                "category": "Dealer",
                "location": "anand , gujarat",
                "contactPerson": "kiran electric scooter",
                "phone": "9870020451",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-21",
                "followUpTime": "12:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 09:46:18.643958+00"
        },
        {
                "id": "lead-1784800087325",
                "company": "aaditya ev hub",
                "category": "Dealer",
                "location": "anand , gujarat",
                "contactPerson": "aaditya ev hub",
                "phone": "9909908843",
                "leadSource": "Website",
                "requirement": "not yet want",
                "status": "CONTACTED",
                "followUpDate": "2026-07-22",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-23 09:48:07.410349+00"
        },
        {
                "id": "lead-1784871734581",
                "company": "ami batteries",
                "category": "Dealer",
                "location": "bhavnagar, gujarat",
                "contactPerson": "ami batteries",
                "phone": "9913169292",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-08-29",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: call back\n[Follow-up 2026-07-29]: wrong number",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "15:10",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "wrong number",
                                "time": "11:50",
                                "nextFollowUpDate": "2026-08-29",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 05:42:14.762686+00"
        },
        {
                "id": "lead-1784871814774",
                "company": "raza auto e-bikes & battery",
                "category": "Dealer",
                "location": "bhavnagar, gujarat",
                "contactPerson": "raza auto e-bikes & battery",
                "phone": "9428172300",
                "leadSource": "Website",
                "requirement": "busy another call",
                "status": "CONTACTED",
                "followUpDate": "2026-08-12",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: call after 10 august",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "call after 10 august",
                                "time": "16:10",
                                "nextFollowUpDate": "2026-08-12",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 05:43:34.918041+00"
        },
        {
                "id": "lead-1784871880869",
                "company": "icon battery care",
                "category": "Dealer",
                "location": "bhavnagar, gujarat",
                "contactPerson": "icon battery care",
                "phone": "9978347191",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-09",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: sent proposal requirement hogi to bolege",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "sent proposal requirement hogi to bolege",
                                "time": "15:12",
                                "nextFollowUpDate": "2026-08-09",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 05:44:41.045316+00"
        },
        {
                "id": "lead-1784871960606",
                "company": "kamdhenu autoworld g lite",
                "category": "Dealer",
                "location": "bhavnagar, gujarat",
                "contactPerson": "kamdhenu autoworld g lite",
                "phone": "7874783800",
                "leadSource": "Website",
                "requirement": "call disco",
                "status": "CONTACTED",
                "followUpDate": "2026-07-26",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-24 05:46:00.751405+00"
        },
        {
                "id": "lead-1784872043778",
                "company": "bapasitaram e-vehicles",
                "category": "Dealer",
                "location": "bhavnagar, gujarat",
                "contactPerson": "bapasitaram e-vehicles",
                "phone": "9265400465",
                "leadSource": "Website",
                "requirement": "ev me kam nahi karte hai",
                "status": "NEGOTIATION",
                "followUpDate": "2026-07-26",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-24 05:47:23.916587+00"
        },
        {
                "id": "lead-1784872125017",
                "company": "mehta automobiles",
                "category": "Dealer",
                "location": "bhavnagar, gujarat",
                "contactPerson": "mehta automobiles",
                "phone": "7624938775",
                "leadSource": "Website",
                "requirement": "switched off",
                "status": "CONTACTED",
                "followUpDate": "2026-09-30",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: call disco.\n[Follow-up 2026-07-28]: not attend\n[Follow-up 2026-07-30]: not deal in lithium battery",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "call disco.",
                                "time": "15:16",
                                "nextFollowUpDate": "2026-07-28",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-28",
                                "text": "not attend",
                                "time": "12:02",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "not deal in lithium battery",
                                "time": "10:33",
                                "nextFollowUpDate": "2026-09-30",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 05:48:45.152717+00"
        },
        {
                "id": "lead-1784872219631",
                "company": "gujarat enterprises",
                "category": "Dealer",
                "location": "bhavnagar, gujarat",
                "contactPerson": "gujarat enterprises",
                "phone": "9499722972",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2027-07-30",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: call disco",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "call disco",
                                "time": "16:15",
                                "nextFollowUpDate": "2027-07-30",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 05:50:19.75882+00"
        },
        {
                "id": "lead-1784872353836",
                "company": "satnam battery & e-bike",
                "category": "Dealer",
                "location": "porbandar , gujarat",
                "contactPerson": "satnam battery & e-bikes",
                "phone": "9904568508",
                "leadSource": "Website",
                "requirement": "work only lead acid",
                "status": "CONTACTED",
                "followUpDate": "2027-07-25",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: work only lead",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "work only lead",
                                "time": "16:38",
                                "nextFollowUpDate": "2027-07-25",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 05:52:33.983983+00"
        },
        {
                "id": "lead-1784872424221",
                "company": "life battery",
                "category": "Dealer",
                "location": "porbandar , gujarat",
                "contactPerson": "life battery",
                "phone": "9825408990",
                "leadSource": "Website",
                "requirement": "auto battery k nahi h",
                "status": "CONTACTED",
                "followUpDate": "2026-07-26",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-24 05:53:44.348066+00"
        },
        {
                "id": "lead-1784872555366",
                "company": "regal moto corp",
                "category": "Dealer",
                "location": "porbandar , gujarat",
                "contactPerson": "regal moto corp",
                "phone": "8347917591",
                "leadSource": "Website",
                "requirement": "busy another call",
                "status": "CONTACTED",
                "followUpDate": "2026-07-26",
                "followUpTime": "10:00",
                "notes": "",
                "remarksLog": [],
                "createdAt": "2026-07-24 05:55:55.50244+00"
        },
        {
                "id": "lead-1784872634619",
                "company": "chamunda e-bikes",
                "category": "Dealer",
                "location": "porbandar , gujarat",
                "contactPerson": "chamunda e-bikes",
                "phone": "9327059455",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2027-07-31",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: sent proposal call back\n[Follow-up 2026-07-29]: sent proposal already not attend\n[Follow-up 2026-07-30]: sent reminder\n[Follow-up 2026-07-31]: lead acid me hi kam karte hai",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "sent proposal call back",
                                "time": "15:20",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "sent proposal already not attend",
                                "time": "12:38",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "sent reminder",
                                "time": "17:52",
                                "nextFollowUpDate": "2026-07-31",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-31",
                                "text": "lead acid me hi kam karte hai",
                                "time": "16:22",
                                "nextFollowUpDate": "2027-07-31",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 05:57:14.763842+00"
        },
        {
                "id": "lead-1784872749844",
                "company": "halar battery",
                "category": "Dealer",
                "location": "jamnagar",
                "contactPerson": "halar battery",
                "phone": "8849948004",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2027-07-24",
                "followUpTime": "11:28",
                "notes": "[Follow-up 2026-07-24]: sent proposal not yet require",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "sent proposal not yet require",
                                "time": "15:33",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "11:28"
                        }
                ],
                "createdAt": "2026-07-24 05:59:09.973606+00"
        },
        {
                "id": "lead-1784872827221",
                "company": "exide care",
                "category": "Dealer",
                "location": "jamnagar",
                "contactPerson": "exide care",
                "phone": "80675110335",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-26",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-24]: not reachable\n[Follow-up 2026-07-25]: call back",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "not reachable",
                                "time": "15:20",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "17:48",
                                "nextFollowUpDate": "2026-07-26",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-24 06:00:27.349269+00"
        },
        {
                "id": "lead-1784872957014",
                "company": "galaxy ev",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "galaxy ev",
                "phone": "8200983.317",
                "leadSource": "Website",
                "requirement": "not interested",
                "status": "CONTACTED",
                "followUpDate": "2027-07-24",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-24]: not intrested",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "not intrested",
                                "time": "15:22",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-24 06:02:37.140531+00"
        },
        {
                "id": "lead-1784873028121",
                "company": "uma battery",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "uma battery",
                "phone": "9978589569",
                "leadSource": "Website",
                "requirement": "not want",
                "status": "CONTACTED",
                "followUpDate": "2027-07-24",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-24]: not want",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "not want",
                                "time": "15:20",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-24 06:03:48.254022+00"
        },
        {
                "id": "lead-1784873099810",
                "company": "green earth e-bike",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "green earth e-bike",
                "phone": "9723416000",
                "leadSource": "Website",
                "requirement": "sent proposal already price issue",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-09-29",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-24]: not attend\n[Follow-up 2026-07-25]: call bacj\n[Follow-up 2026-07-29]: call disco",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "not attend",
                                "time": "15:21",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "call bacj",
                                "time": "16:08",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "call disco",
                                "time": "12:02",
                                "nextFollowUpDate": "2026-09-29",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-24 06:04:59.949608+00"
        },
        {
                "id": "lead-1784873167601",
                "company": "jay somnath battery",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "jay somnath battery",
                "phone": "9033040029",
                "leadSource": "Website",
                "requirement": "price issue",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-02",
                "followUpTime": "11:30",
                "notes": "[Follow-up 2026-07-24]: price issue",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "price issue",
                                "time": "15:33",
                                "nextFollowUpDate": "2026-08-02",
                                "nextFollowUpTime": "11:30"
                        }
                ],
                "createdAt": "2026-07-24 06:06:07.723168+00"
        },
        {
                "id": "lead-1784873236484",
                "company": "urja battery",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "urja battery",
                "phone": "9428887171",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-07-28",
                "followUpTime": "11:30",
                "notes": "[Follow-up 2026-07-24]: sent proposal",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "sent proposal",
                                "time": "15:35",
                                "nextFollowUpDate": "2026-07-28",
                                "nextFollowUpTime": "11:30"
                        }
                ],
                "createdAt": "2026-07-24 06:07:16.621747+00"
        },
        {
                "id": "lead-1784873299188",
                "company": "electric one",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "electric one",
                "phone": "9998783333",
                "leadSource": "Website",
                "requirement": "not want",
                "status": "CONTACTED",
                "followUpDate": "2027-07-24",
                "followUpTime": "11:30",
                "notes": "[Follow-up 2026-07-24]: not want",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "not want",
                                "time": "15:23",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "11:30"
                        }
                ],
                "createdAt": "2026-07-24 06:08:19.323324+00"
        },
        {
                "id": "lead-1784873360630",
                "company": "acute electronics",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "acute electronics",
                "phone": "9825350994",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-11-05",
                "followUpTime": "11:25",
                "notes": "[Follow-up 2026-07-24]: sent proposal already not attend\n[Follow-up 2026-07-25]: sent proposal not attend\n[Follow-up 2026-08-05]: sent reminder call krege",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "sent proposal already not attend",
                                "time": "15:22",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:25"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "sent proposal not attend",
                                "time": "15:10",
                                "nextFollowUpDate": "2026-08-05",
                                "nextFollowUpTime": "11:25"
                        },
                        {
                                "date": "2026-08-05",
                                "text": "sent reminder call krege",
                                "time": "13:05",
                                "nextFollowUpDate": "2026-11-05",
                                "nextFollowUpTime": "11:25"
                        }
                ],
                "createdAt": "2026-07-24 06:09:20.761109+00"
        },
        {
                "id": "lead-1784873459860",
                "company": "jay maa e-bike",
                "category": "Dealer",
                "location": "bharuch , gujara",
                "contactPerson": "jay maa e-bikes",
                "phone": "9737617010",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-08",
                "followUpTime": "11:25",
                "notes": "[Follow-up 2026-07-24]: sent proposal call back\n[Follow-up 2026-07-29]: sent proposal reminder call back\n[Follow-up 2026-07-31]: sent proposal reminder call back not attend",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "sent proposal call back",
                                "time": "15:41",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "11:25"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "sent proposal reminder call back",
                                "time": "12:30",
                                "nextFollowUpDate": "2026-07-31",
                                "nextFollowUpTime": "11:25"
                        },
                        {
                                "date": "2026-07-31",
                                "text": "sent proposal reminder call back not attend",
                                "time": "16:19",
                                "nextFollowUpDate": "2026-08-08",
                                "nextFollowUpTime": "11:25"
                        }
                ],
                "createdAt": "2026-07-24 06:10:59.990594+00"
        },
        {
                "id": "lead-1784873545506",
                "company": "yogi auto battery",
                "category": "Dealer",
                "location": "bharuch , gujara",
                "contactPerson": "yogi auto battery",
                "phone": "9426858241",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-09-01",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-24]: sent proposal abhi nahi dekha dekh k bolege\n[Follow-up 2026-07-29]: dekh k bolege already sent proposal\n[Follow-up 2026-07-29]: sent proposal already not attend bharuch dealer\n[Follow-up 2026-08-01]: inhe same day solution chahiye samjaya lekin nahi samaj rae k koi nahi rukta hai",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "sent proposal abhi nahi dekha dekh k bolege",
                                "time": "15:42",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "dekh k bolege already sent proposal",
                                "time": "12:34",
                                "nextFollowUpDate": "2026-07-29",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-29",
                                "text": "sent proposal already not attend bharuch dealer",
                                "time": "13:11",
                                "nextFollowUpDate": "2026-08-01",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-08-01",
                                "text": "inhe same day solution chahiye samjaya lekin nahi samaj rae k koi nahi rukta hai",
                                "time": "13:03",
                                "nextFollowUpDate": "2026-09-01",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-24 06:12:25.629923+00"
        },
        {
                "id": "lead-1784873632586",
                "company": "patel battery",
                "category": "Dealer",
                "location": "bharuch , gujarat",
                "contactPerson": "patel battery",
                "phone": "9913270382",
                "leadSource": "Website",
                "requirement": "not interested call disco",
                "status": "CONTACTED",
                "followUpDate": "2027-07-24",
                "followUpTime": "11:30",
                "notes": "[Follow-up 2026-07-24]: not intrested",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "not intrested",
                                "time": "15:42",
                                "nextFollowUpDate": "2027-07-24",
                                "nextFollowUpTime": "11:30"
                        }
                ],
                "createdAt": "2026-07-24 06:13:52.711056+00"
        },
        {
                "id": "lead-1784873759711",
                "company": "krishna green energy",
                "category": "Dealer",
                "location": "bhuj , gujarat",
                "contactPerson": "krishna green battery",
                "phone": "9825019796",
                "leadSource": "Website",
                "requirement": "busy another call",
                "status": "CONTACTED",
                "followUpDate": "2026-08-26",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-24]: 9825019792 sun vision venture pvt proposal\n[Follow-up 2026-07-25]: call back",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "9825019792 sun vision venture pvt proposal",
                                "time": "15:53",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "17:27",
                                "nextFollowUpDate": "2026-08-26",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-24 06:15:59.832301+00"
        },
        {
                "id": "lead-1784873848878",
                "company": "kachchh battery center",
                "category": "Dealer",
                "location": "bhuj , gujarat",
                "contactPerson": "kachchh battery center",
                "phone": "8200571171",
                "leadSource": "Website",
                "requirement": "not attend",
                "status": "CONTACTED",
                "followUpDate": "2026-07-28",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-25]: call back",
                "remarksLog": [
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "17:19",
                                "nextFollowUpDate": "2026-07-28",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 06:17:28.998834+00"
        },
        {
                "id": "lead-1784873920782",
                "company": "shyam e-bike",
                "category": "Dealer",
                "location": "bhuj , gujarat",
                "contactPerson": "shyam e-bike",
                "phone": "9909036489",
                "leadSource": "Website",
                "requirement": "busy another call",
                "status": "CONTACTED",
                "followUpDate": "2026-08-11",
                "followUpTime": "10:00",
                "notes": "[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: call back\n[Follow-up 2026-07-30]: call forwarded",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "call back",
                                "time": "15:53",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "17:25",
                                "nextFollowUpDate": "2026-07-30",
                                "nextFollowUpTime": "10:00"
                        },
                        {
                                "date": "2026-07-30",
                                "text": "call forwarded",
                                "time": "17:36",
                                "nextFollowUpDate": "2026-08-11",
                                "nextFollowUpTime": "10:00"
                        }
                ],
                "createdAt": "2026-07-24 06:18:40.899605+00"
        },
        {
                "id": "lead-1784874073927",
                "company": "shree hari e-bike",
                "category": "Dealer",
                "location": "bhuj , gujarat",
                "contactPerson": "shree hari e-bike",
                "phone": "9726681019",
                "leadSource": "Website",
                "requirement": "not reachable",
                "status": "CONTACTED",
                "followUpDate": "2026-07-27",
                "followUpTime": "11:00",
                "notes": "[Follow-up 2026-07-24]: not reachable",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "not reachable",
                                "time": "15:42",
                                "nextFollowUpDate": "2026-07-27",
                                "nextFollowUpTime": "11:00"
                        }
                ],
                "createdAt": "2026-07-24 06:21:14.058102+00"
        },
        {
                "id": "lead-1784874212576",
                "company": "jay mata ji battery sales & services",
                "category": "Dealer",
                "location": "bhuj , gujarat",
                "contactPerson": "jay mata ji battery sales & services",
                "phone": "9099646382",
                "leadSource": "Website",
                "requirement": "sent proposal",
                "status": "QUOTATION_SENT",
                "followUpDate": "2026-08-24",
                "followUpTime": "11:20",
                "notes": "[Follow-up 2026-07-24]: yet no requirement bolege",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "yet no requirement bolege",
                                "time": "15:44",
                                "nextFollowUpDate": "2026-08-24",
                                "nextFollowUpTime": "11:20"
                        }
                ],
                "createdAt": "2026-07-24 06:23:32.691624+00"
        },
        {
                "id": "lead-1784874305819",
                "company": "rajarshi ev",
                "category": "Dealer",
                "location": "bhuj , gujarat",
                "contactPerson": "rajarshi ev",
                "phone": "8071936936",
                "leadSource": "Website",
                "requirement": "not reachable",
                "status": "CONTACTED",
                "followUpDate": "2026-07-27",
                "followUpTime": "11:26",
                "notes": "[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: wrong number\n[Follow-up 2026-07-25]: wrong number",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "call back",
                                "time": "15:53",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:26"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "wrong number",
                                "time": "17:26",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "11:26"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "wrong number",
                                "time": "17:26",
                                "nextFollowUpDate": "2026-07-27",
                                "nextFollowUpTime": "11:26"
                        }
                ],
                "createdAt": "2026-07-24 06:25:05.955643+00"
        },
        {
                "id": "lead-1784874376010",
                "company": "pure ev",
                "category": "Dealer",
                "location": "bhuj , gujarat",
                "contactPerson": "pure ev",
                "phone": "9274148833",
                "leadSource": "Website",
                "requirement": "busy another call",
                "status": "CONTACTED",
                "followUpDate": "2026-07-27",
                "followUpTime": "10:30",
                "notes": "[Follow-up 2026-07-24]: call disco.\n[Follow-up 2026-07-25]: call back",
                "remarksLog": [
                        {
                                "date": "2026-07-24",
                                "text": "call disco.",
                                "time": "15:55",
                                "nextFollowUpDate": "2026-07-25",
                                "nextFollowUpTime": "10:30"
                        },
                        {
                                "date": "2026-07-25",
                                "text": "call back",
                                "time": "17:44",
                                "nextFollowUpDate": "2026-07-27",
                                "nextFollowUpTime": "10:30"
                        }
                ],
                "createdAt": "2026-07-24 06:26:16.117718+00"
        }
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
          { id: "batch-1", prefix: "AESPL  EV", qty: 50, productId: "72V30A", productName: "E-Rickshaw Batteries (72V30A)", date: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
          { id: "batch-2", prefix: "AESPL  AUTO", qty: 25, productId: "BAT-AUTO-35", productName: "Scooter Batteries (BAT-AUTO-35)", date: new Date(Date.now() - 2*24*60*60*1000).toISOString() }
       ]
    },
    invoices: [
      { id: "INV-1001", date: "2024-05-12", dealerId: "l1", items: [{ model: "72V30A", qty: 1, serials: ["AESPL  EV  28G26001044"], price: 35000 }], total: 35000, status: "PAID", tax: 6300 },
      { id: "INV-1002", date: "2024-05-13", dealerId: "D-101", items: [{ model: "BAT-INV-150", qty: 5, serials: [], price: 18500 }], total: 92500, status: "UNPAID", tax: 16650 },
      { id: "INV-1003", date: "2024-05-14", dealerId: "D-102", items: [{ model: "72V30A", qty: 10, serials: [], price: 45000 }], total: 450000, status: "UNPAID", tax: 81000 },
      { id: "INV-1004", date: "2024-05-15", dealerId: "l1", items: [{ model: "BAT-AUTO-35", qty: 20, serials: [], price: 4500 }], total: 90000, status: "PAID", tax: 16200 },
    ],
    warranty: [
      { id: "w1", serial: "AESPL  EV  28G26001044", dealerId: "l1", startDate: "2024-05-12", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w2", serial: "AESPL  EV  28G26001045", dealerId: "l1", startDate: "2024-05-12", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w3", serial: "AESPL  INV  31G260001265", dealerId: "l1", startDate: "2026-07-30", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w4", serial: "AESPL  INV  31G260005059", dealerId: "l1", startDate: "2026-07-30", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w5", serial: "AESPL  INV  31G260009790", dealerId: "l1", startDate: "2026-07-30", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w6", serial: "AESPL  INV  31G260003265", dealerId: "l1", startDate: "2026-07-30", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w7", serial: "AESPL  INV  31G260001814", dealerId: "l1", startDate: "2026-07-30", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w8", serial: "AESPL  INV  31G260007532", dealerId: "l1", startDate: "2026-07-30", durationMonths: 36, status: "ACTIVE", history: [] },
      { id: "w9", serial: "AESPL  INV  31G260004192", dealerId: "l1", startDate: "2026-07-30", durationMonths: 36, status: "ACTIVE", history: [] },
    ],
    complaints: [
      { id: "C-1001", serial: "AESPL  EV  28G26001044", type: "Low Range", stage: "CLOSED", status: "RESOLVED", date: "2024-05-10", resolvedDate: "2024-05-14", notes: "BMS firmware updated.", rootCause: "BMS Failure", engineer: "Suresh P.", inspectionResult: "Firmware drift detected" },
      { id: "C-1002", serial: "AESPL  EV  28G26001045", type: "Dead on Arrival", stage: "REGISTERED", status: "OPEN", date: "2024-05-15", resolvedDate: "", notes: "Unit not turning on.", engineer: "Unassigned" },
      { id: "C-1003", serial: "AESPL  EV  28G26001046", type: "Voltage Drop", stage: "UNDER_INSPECTION", status: "OPEN", date: "2024-05-16", resolvedDate: "", notes: "Sudden power cut.", engineer: "Ramesh K." },
      { id: "C-1004", serial: "AESPL  AUTO  28G26001049", type: "No Backup", stage: "READY_FOR_DISPATCH", status: "OPEN", date: "2024-05-14", resolvedDate: "", notes: "Aging cells.", engineer: "Suresh P.", rootCause: "Cell Failure" },
      { id: "C-1005", serial: "AESPL  INV  28G26001050", type: "High Temp", stage: "REPAIR_STARTED", status: "OPEN", date: "2024-05-12", resolvedDate: "", notes: "Fan not working.", engineer: "Anita D." },
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
        id: "BAT-NEXT-200",
        name: "High-Efficiency Inverter Battery 200Ah",
        category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
        type: "Inverter Battery Pack",
        price: 48000,
        bom: [
          { matId: "RM-CELLS", name: "Lithium Cells", qty: 240, unit: "Pcs", wastage: 1 },
          { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
        ]
      },
      {
        id: "LIT-200",
        name: "Lithium Ion NMC Battery 200Ah",
        category: "CATEGORY 1 — EV BATTERY INVENTORY",
        type: "Li-Ion Module",
        price: 52000,
        bom: [
          { matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1 },
          { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
        ]
      },
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
      { id: "wc-1", serial: "AESPL  EV  28G26001044", date: new Date(Date.now() - 1*24*60*60*1000).toLocaleDateString(), status: "ACTIVE WARRANTY", durationRemaining: "24 months left", foundInDb: true, model: "E-Rickshaw Batteries" },
      { id: "wc-2", serial: "AESPL  EV  28G26001045", date: new Date(Date.now() - 3*24*60*60*1000).toLocaleDateString(), status: "ACTIVE WARRANTY", durationRemaining: "24 months left", foundInDb: true, model: "E-Rickshaw Batteries" },
      { id: "wc-3", serial: "ARC-UNKNOWN-X9", date: new Date(Date.now() - 4*24*60*60*1000).toLocaleDateString(), status: "NOT_FOUND / EXPIRED", durationRemaining: "N/A", foundInDb: false, model: "Unknown Blueprints" }
    ],
    loyaltyClaims: [
      { id: "cl-1", rewardName: "Extended 6m Warranty Certificate", customer: "Aditya Sharma", pointsSpent: 500, couponCode: "ARC-REWARD-EXT6M", date: new Date(Date.now() - 12*60*60*1000).toLocaleDateString(), status: "APPROVED" },
      { id: "cl-2", rewardName: "Complementary Annual Health Audit", customer: "Aditya Sharma", pointsSpent: 800, couponCode: "ARC-REWARD-AUDIT1", date: new Date(Date.now() - 2*24*60*60*1000).toLocaleDateString(), status: "PENDING" }
    ],
    diagnosticLogs: [
      { id: 'LOG-C1006-1', nodeId: 'C-1006', serial: 'OLD-GEN-BATT-9900', timestamp: '2024-05-08 11:00:00', stage: 'REGISTERED', rootCause: 'Water Damage', notes: 'Ticket registered. Old gen battery unit received with moisture exposure.', engineer: 'Ramesh K.' },
      { id: 'LOG-C1006-2', nodeId: 'C-1006', serial: 'OLD-GEN-BATT-9900', timestamp: '2024-05-11 14:20:00', stage: 'CLOSED', rootCause: 'Water Damage', notes: 'Enclosure seal replaced, circuitry dried and stress-tested. Case resolved.', engineer: 'Ramesh K.' },
      { id: 'LOG-C1001-1', nodeId: 'C-1001', serial: 'AESPL  EV  28G26001044', timestamp: '2024-05-10 09:15:00', stage: 'UNDER_INSPECTION', rootCause: 'BMS Failure', notes: 'Initial inspection. Low battery range reported by client.', engineer: 'Suresh P.' },
      { id: 'LOG-C1001-2', nodeId: 'C-1001', serial: 'AESPL  EV  28G26001044', timestamp: '2024-05-14 16:45:00', stage: 'CLOSED', rootCause: 'BMS Failure', notes: 'BMS firmware updated and recalibrated. Performance verified.', engineer: 'Suresh P.' },
      { id: 'LOG-C1002-1', nodeId: 'C-1002', serial: 'AESPL  EV  28G26001045', timestamp: '2024-05-15 10:30:00', stage: 'REGISTERED', rootCause: 'Dead on Arrival', notes: 'Unit received at service depot. Awaiting technician assignment.', engineer: 'Unassigned' },
      { id: 'LOG-C1004-1', nodeId: 'C-1004', serial: 'AESPL  AUTO  28G26001049', timestamp: '2026-06-16 14:32:00', stage: 'UNDER_INSPECTION', rootCause: 'Cell Failure', notes: 'Initial scrutiny. Detected swelling on anode module layer.', engineer: 'Suresh P.' },
      { id: 'LOG-C1004-2', nodeId: 'C-1004', serial: 'AESPL  AUTO  28G26001049', timestamp: '2026-06-17 09:12:15', stage: 'READY_FOR_DISPATCH', rootCause: 'Cell Failure', notes: 'Aging cells. Replaced cell pack layer and confirmed capacity safety margins.', engineer: 'Suresh P.' },
      { id: 'LOG-C1005-1', nodeId: 'C-1005', serial: 'AESPL  INV  28G26001050', timestamp: '2026-06-16 11:20:44', stage: 'REPAIR_STARTED', rootCause: 'BMS Failure', notes: 'Thermal compound degradation causing heat build up. Fan controller bypassed.', engineer: 'Anita D.' },
      { id: 'LOG-C1003-1', nodeId: 'C-1003', serial: 'AESPL  EV  28G26001046', timestamp: '2026-06-17 08:30:10', stage: 'UNDER_INSPECTION', rootCause: 'Voltage Drop', notes: 'Resistance balancing audit underway.', engineer: 'Ramesh K.' }
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
      prefix: prefix || "AESPL  EV",
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
    const { dealerId, items, total, tax, discount, freightCharge, packagingCharge, paymentTerms, paymentMode, biller } = req.body;
    const invId = `INV-${1000 + db.invoices.length + 1}`;
    
    // Find Dealer for Regional Analysis
    const dealer = db.dealers.find(d => d.id === dealerId || d.company === dealerId);
    
    const invoice = {
      id: invId,
      voucher_no: invId,
      date: new Date().toISOString().split('T')[0],
      dealerId: dealer ? dealer.id : dealerId,
      partyName: dealer ? dealer.company : (dealerId || 'Walk-In Customer'),
      items: items || [],
      goods: items || [],
      subtotal: Math.max(0, (total || 0) - (tax || 0)),
      discount: discount || 0,
      flat_discount: discount || 0,
      freight_charge: freightCharge || 0,
      packaging_charge: packagingCharge || 0,
      payment_terms: paymentTerms || 'Due on Receipt',
      total: total || 0,
      grand_total: total || 0,
      tax: tax || 0,
      gst: tax || 0,
      paymentMode: paymentMode || 'Credit',
      status: paymentMode === 'Credit' ? "UNPAID" : "PAID",
      biller: biller || 'ARAVIND SWAMY (SUPER_ADMIN)'
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
    const { materialId, materialName, category, vendor, vendorContact, qty, unit, unitCost, estimatedDelivery, remarks, trackingNumber, raisedByRole, isStoreKeeperRaised, status } = req.body;
    const poId = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    
    const isSk = raisedByRole === 'STORE_KEEPER' || isStoreKeeperRaised || status === 'Pending Admin Approval';
    const poStatus = isSk ? "Pending Admin Approval" : (status || "Pending Supplier Confirmation");

    const newPO = {
      id: poId,
      materialId: materialId || `RM-${Date.now()}`,
      materialName: materialName || "Raw Material",
      category: category || "RAW_MATERIAL",
      vendor: vendor || (isSk ? "Awaiting Admin Supplier Order" : "Arcenol Supply Partner"),
      vendorContact: vendorContact || "+91 98765 00000",
      qty: Number(qty || 100),
      unit: unit || "Pcs",
      unitCost: Number(unitCost || 100),
      totalAmount: Number(qty || 100) * Number(unitCost || 100),
      orderDate: new Date().toISOString().split('T')[0],
      estimatedDelivery: estimatedDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: poStatus,
      raisedByRole: isSk ? "STORE_KEEPER" : "ADMIN",
      isStoreKeeperRaised: Boolean(isSk),
      trackingNumber: trackingNumber || `TRK-ARC-${Math.floor(1000 + Math.random() * 9000)}`,
      remarks: remarks || (isSk ? "Low Stock Reorder Request raised by Store Keeper - Awaiting Admin Order" : "Generated via MRP Reorder Request")
    };

    if (!db.purchaseOrders) db.purchaseOrders = [];
    db.purchaseOrders.unshift(newPO);

    // Push notification
    db.notifications.unshift({
      id: `n-${Date.now()}`,
      type: "SYSTEM",
      title: isSk ? `Low Stock PO Request Raised: ${poId}` : `New PO Created: ${poId}`,
      message: isSk 
        ? `Store Keeper raised low stock PO ${poId} for ${newPO.materialName} (${newPO.qty} ${newPO.unit}). Pending Admin order placement.`
        : `Purchase Order ${poId} generated for ${newPO.materialName} (${newPO.qty} ${newPO.unit}) to ${newPO.vendor}.`,
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
    const { orders, raisedByRole, isStoreKeeperRaised } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "INVALID_PARAMETERS", message: "Orders list is required and should be an array" });
    }

    if (!db.purchaseOrders) db.purchaseOrders = [];
    let updatedCount = 0;

    const isSk = raisedByRole === 'STORE_KEEPER' || isStoreKeeperRaised !== false;

    orders.forEach((ord: any, idx: number) => {
      const item = db.inventory.find(i => i.id === ord.id);
      const qtyToReorder = Number(ord.reorderQty || 10);

      if (isSk) {
        // Create PO pending Admin approval
        const poId = `PO-SK-${Date.now()}-${idx + 1}`;
        const newPO = {
          id: poId,
          materialId: ord.id,
          materialName: item?.name || ord.name || "Raw Material Component",
          category: item?.category || "RAW_MATERIAL",
          vendor: item?.supplier || "Awaiting Admin Supplier Assignment",
          vendorContact: "+91 98765 00000",
          qty: qtyToReorder,
          unit: item?.unit || "Pcs",
          unitCost: Number(item?.price || 100),
          totalAmount: qtyToReorder * Number(item?.price || 100),
          orderDate: new Date().toISOString().split('T')[0],
          estimatedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          status: "Pending Admin Approval",
          raisedByRole: "STORE_KEEPER",
          isStoreKeeperRaised: true,
          trackingNumber: `TRK-SK-${Math.floor(1000 + Math.random() * 9000)}`,
          remarks: "Low Stock Reorder Request raised by Store Keeper - Awaiting Admin Order"
        };
        db.purchaseOrders.unshift(newPO);
        updatedCount++;
      } else {
        // Admin directly updating inventory stock
        if (item) {
          item.qty += qtyToReorder;
          updatedCount++;
        }
      }
    });

    db.notifications.unshift({
      id: `n-${Date.now()}`,
      type: "BULK_REORDER",
      title: isSk ? "Low Stock PO Requests Submitted to Admin" : "Bulk Reorder Dispatched",
      message: isSk 
        ? `Store Keeper raised low stock PO requests for ${updatedCount} materials. Pending Admin supplier order placement.`
        : `Authorized replenishment of ${updatedCount} low-stock material nodes. Raw ledger balances adjusted.`,
      date: new Date().toISOString(),
      status: "UNREAD",
      channel: "SYSTEM"
    });

    res.json({ success: true, updatedItemsCount: updatedCount, isStoreKeeperRaised: isSk });
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

  app.post("/api/leads/batch", (req, res) => {
    const leadsToImport = Array.isArray(req.body) ? req.body : req.body.leads || [];
    if (!Array.isArray(leadsToImport) || leadsToImport.length === 0) {
      return res.status(400).json({ error: "No leads provided" });
    }

    const processedLeads = [];
    for (const item of leadsToImport) {
      const leadId = item.id || `lead-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const leadObj = {
        id: String(leadId),
        company: item.company || 'Unnamed Lead',
        category: item.category || 'Dealer',
        location: item.location || 'Gujarat, India',
        contactPerson: item.contactPerson || item.contact_person || item.company,
        phone: item.phone || item.mobile || 'N/A',
        leadSource: item.leadSource || item.source || 'Website',
        requirement: item.requirement || 'General Requirement',
        status: item.status || 'NEW',
        followUpDate: item.followUpDate || item.followup_date || new Date().toISOString().split('T')[0],
        followUpTime: item.followUpTime || item.followup_time || '10:00',
        notes: item.notes || '',
        remarksLog: (() => {
          if (Array.isArray(item.remarksLog)) return item.remarksLog;
          if (Array.isArray(item.remarks_log)) return item.remarks_log;
          if (typeof item.remarks_log === 'string') {
            try { return JSON.parse(item.remarks_log); } catch (e) { return []; }
          }
          return [];
        })(),
        createdAt: item.createdAt || item.created_at || new Date().toISOString()
      };

      const existingIdx = db.leads.findIndex((l: any) => l.id === leadObj.id);
      if (existingIdx !== -1) {
        db.leads[existingIdx] = { ...db.leads[existingIdx], ...leadObj };
      } else {
        db.leads.push(leadObj);
      }
      processedLeads.push(leadObj);
    }

    batchUpsert('lead_inquiries', processedLeads.map(mapLead)).catch(err => console.warn("Supabase batch lead sync warning:", err));

    res.json({ success: true, count: processedLeads.length, leads: processedLeads });
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
    const { serial: rawSerial, customerName, email, phone } = req.body;
    if (!rawSerial) return res.status(400).json({ error: "Serial is required" });
    const serial = normalizeToRevisedSerial(rawSerial);

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

  app.get("/api/users", (req, res) => {
    res.json((db as any).users || []);
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
      (db as any).users[index] = { ...(db as any).users[index], ...req.body, id };
    } else {
      (db as any).users.push({ id, ...req.body });
    }
    const target = (db as any).users.find((u: any) => u.id === id);
    res.json(target || { id, ...req.body });
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
