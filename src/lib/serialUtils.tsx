import React from 'react';

export type TransactionDomain = 
  | 'PURCHASE'
  | 'SALE'
  | 'BILLING'
  | 'OPERATIONAL'
  | 'PRODUCTION'
  | 'INVENTORY'
  | 'QUALITY'
  | 'SERVICE'
  | 'CRM'
  | 'EPR';

export type EntityType =
  // Purchase
  | 'PURCHASE_ORDER'
  | 'AUTO_PO'
  | 'GATE_INWARD'
  | 'GATE_PASS'
  | 'VENDOR_BILL'
  | 'VENDOR_PAYMENT'
  | 'MATERIAL_RECEIPT'
  // Sale
  | 'SALES_ORDER'
  | 'SALES_INVOICE'
  | 'QUOTATION'
  | 'DELIVERY_CHALLAN'
  | 'POS_SALE'
  | 'DISPATCH_ALLOCATION'
  // Billing
  | 'TAX_INVOICE'
  | 'PROFORMA_INVOICE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'PAYMENT_VOUCHER'
  | 'RECEIPT_VOUCHER'
  | 'JOURNAL_VOUCHER'
  | 'ACCOUNTING_VOUCHER'
  | 'EWAY_BILL'
  | 'VYAPAR_RECORD'
  // Operational & Manufacturing
  | 'WORK_ORDER'
  | 'PRODUCTION_BATCH'
  | 'WIP_LOT'
  | 'BATTERY_SERIAL'
  | 'FINISHED_GOOD'
  | 'RAW_MATERIAL'
  | 'STOCK_TRANSFER'
  | 'STOCK_AUDIT'
  | 'CELL_GRADING'
  | 'EOL_CERTIFICATE'
  | 'SCRAP_LOG'
  | 'TELEMATICS_LOG'
  | 'WARRANTY_REGISTRATION'
  | 'RMA_CLAIM'
  | 'EPR_RECORD'
  | 'CRM_LEAD'
  | 'COMPLAINT_TICKET'
  | 'WAREHOUSE_BIN';

/**
 * Generates battery serial number following standard pattern: AESPL  EV  28G26000001
 * - AESPL: Arcenol energy solutions pvt ltd
 * - EV: battery Grade (EV, AUTO, INV, VRLA, etc.)
 * - 28: 2-digit present date of month
 * - G: 1-character month in alphabetical order (A=Jan, B=Feb, ... G=Jul, L=Dec)
 * - 26: 2-digit year (e.g. 26 for 2026)
 * - 001044: 6-digit battery sequence/number
 */
export function normalizeToRevisedSerial(serial: string, fallbackGrade: string = 'EV'): string {
  if (!serial) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthChar = String.fromCharCode(65 + now.getMonth());
    const yr = String(now.getFullYear()).slice(-2);
    const seq = String(Math.floor(1000 + Math.random() * 9000)).padStart(6, '0');
    return `AESPL  ${fallbackGrade}  ${day}${monthChar}${yr}${seq}`;
  }
  const clean = String(serial).trim();

  // If already matches standard revised pattern with spaces: e.g. "AESPL  EV  28G26000001" or "AESPL EV 28G26000001"
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
      grade = modelOrGrade.replace(/[^A-Z]/g, '').slice(0, 4) || fallbackGrade || 'EV';
    }

    // Now extract date/seq parts
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

  // Unspaced pattern e.g. "AESPLEV28G26000001" or "AESPLINV31G26001265"
  const unspaced = clean.match(/^AESPL([A-Z]{2,4})(\d{2}[A-Z]\d+)$/i);
  if (unspaced) {
    return `AESPL  ${unspaced[1].toUpperCase()}  ${unspaced[2].toUpperCase()}`;
  }

  return clean;
}

export function getProductClusterTag(modelIdOrSerial: string = "EV"): string {
  const upper = String(modelIdOrSerial || "").trim().toUpperCase();
  if (upper.includes("AUTO") || upper.includes("SCOOTER") || upper.includes("CAR") || upper.includes("STARTER")) return "AUTO";
  if (upper.includes("INV") || upper.includes("NEXT") || upper.includes("SOLAR") || upper.includes("INVERTER") || upper.includes("BATNEXT") || upper.includes("UPS")) return "INV";
  if (upper.includes("ESS") || upper.includes("CONTAINER") || upper.includes("STORAGE")) return "ESS";
  if (upper.includes("VRLA") || upper.includes("LEAD") || upper.includes("SMF") || upper.includes("TUBULAR")) return "VRLA";
  if (upper.includes("LIT") || upper.includes("NMC") || upper.includes("LFP") || upper.includes("LI-ION") || upper.includes("PRISMATIC")) return "LIT";
  if (upper.includes("EV") || upper.includes("72V") || upper.includes("60V") || upper.includes("48V") || upper.includes("RICK") || upper.includes("BIKE")) return "EV";
  const clean = upper.replace(/[^A-Z]/g, "");
  return clean.slice(0, 4) || "EV";
}

/**
 * Generates battery serial number following standard pattern: AESPL  <CLUSTER>  28G26000001
 * - AESPL: Arcenol energy solutions pvt ltd
 * - CLUSTER: battery Grade/Cluster (EV, AUTO, INV, VRLA, LIT, ESS)
 * - 28: 2-digit present date of month
 * - G: 1-character month in alphabetical order (A=Jan, B=Feb, ... G=Jul, L=Dec)
 * - 26: 2-digit year (e.g. 26 for 2026)
 * - 000001: 6-digit battery sequence/number
 */
export function generateBatterySerial(gradeOrModelStr: string = "EV", seqNumber?: number | string): string {
  const gradeTag = getProductClusterTag(gradeOrModelStr);
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const monthChar = String.fromCharCode(65 + now.getMonth());
  const year2 = String(now.getFullYear()).slice(-2);

  let numStr = "000001";
  if (seqNumber !== undefined && seqNumber !== null && String(seqNumber).trim() !== "") {
    const digitsOnly = String(seqNumber).replace(/[^0-9]/g, "");
    if (digitsOnly) {
      numStr = digitsOnly.padStart(6, "0");
    }
  }

  return `AESPL  ${gradeTag}  ${day}${monthChar}${year2}${numStr}`;
}

/**
 * Calculates the next serial sequence number for a given product model.
 * Ensures serial numbers start afresh from 1 for each distinct product type / model.
 */
export function getNextSerialSequenceForModel(
  modelId: string, 
  existingItems: Array<{ model?: string; modelId?: string; serial?: string; serialNumber?: string }> = []
): number {
  if (!existingItems || !Array.isArray(existingItems) || existingItems.length === 0) {
    return 1;
  }
  
  const targetModel = String(modelId || '').trim().toLowerCase();
  
  // Find all items matching this specific product model
  const matchingItems = existingItems.filter(item => {
    const itemModel = String(item.model || item.modelId || '').trim().toLowerCase();
    if (!itemModel) return false;
    return itemModel === targetModel || itemModel.includes(targetModel) || targetModel.includes(itemModel);
  });

  if (matchingItems.length === 0) {
    return 1;
  }

  // Extract sequence numbers from existing serials for this specific model
  let maxSeq = 0;
  matchingItems.forEach(item => {
    const s = item.serial || item.serialNumber || '';
    const match = s.match(/(\d{6})$/) || s.match(/(\d{4,6})$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  });

  return maxSeq > 0 ? maxSeq + 1 : matchingItems.length + 1;
}

/**
 * Ensures each distinct battery product / model has its own independent serial number sequence (starting from 000001).
 * Detects legacy sequential numbering that crossed multiple models and normalizes them so each product model counts independently.
 */
export function ensureIndependentProductSerials<T extends { model?: string; modelId?: string; serial?: string; serialNumber?: string }>(
  items: T[]
): T[] {
  if (!Array.isArray(items)) return items;
  
  // Track sequence count per distinct product model
  const modelSeqMap = new Map<string, number>();
  
  return items.map(item => {
    const rawModel = item.model || item.modelId || '72V30A';
    const modelKey = String(rawModel).trim().toUpperCase();
    const currentSeq = (modelSeqMap.get(modelKey) || 0) + 1;
    modelSeqMap.set(modelKey, currentSeq);

    const s = String(item.serial || item.serialNumber || '').trim();
    const cluster = getProductClusterTag(rawModel || s);
    
    // Detect if this serial belongs to legacy continuous cross-product series (e.g. 001044..001052)
    const isLegacyCrossProductSeq = /00104[0-9]/i.test(s) || /00105[0-9]/i.test(s) || /28G260010\d{2}/i.test(s);
    
    let finalSerial = s;
    if (!s || isLegacyCrossProductSeq) {
      finalSerial = generateModelSpecificSerial(rawModel, currentSeq);
    } else {
      finalSerial = normalizeToRevisedSerial(s, cluster);
    }

    return {
      ...item,
      serial: finalSerial,
      ...(item.serialNumber !== undefined ? { serialNumber: finalSerial } : {})
    };
  });
}

/**
 * Generates a finished product serial number starting afresh for each product type/model cluster.
 */
export function generateModelSpecificSerial(
  modelId: string,
  seqNumber: number | string = 1,
  customDate?: Date
): string {
  const d = customDate || new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const monthChar = String.fromCharCode(65 + d.getMonth());
  const year2 = String(d.getFullYear()).slice(-2);

  // Grade/Cluster normalization based on model
  const gradeTag = getProductClusterTag(modelId);

  const digitsOnly = String(seqNumber).replace(/[^0-9]/g, "");
  const numStr = digitsOnly ? digitsOnly.padStart(6, "0") : "000001";

  return `AESPL  ${gradeTag}  ${day}${monthChar}${year2}${numStr}`;
}

/**
 * Universal Unique ID, Serial Number & Transaction ID Generator
 * Generates clean, sequential, audit-compliant identifiers across all ERP domains
 */
export function generateUniqueTransactionId(entityType: EntityType | string, customSuffix?: string | number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = customSuffix !== undefined && customSuffix !== null && String(customSuffix).trim() !== ''
    ? String(customSuffix).replace(/[^A-Z0-9]/gi, '')
    : String(Math.floor(1000 + Math.random() * 9000));

  switch (entityType) {
    // 1. PURCHASE
    case 'PURCHASE_ORDER':
      return `PO-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'AUTO_PO':
      return `PO-${year}-AUTO-${randomSuffix.padStart(4, '0')}`;
    case 'GATE_INWARD':
    case 'GATE_PASS':
      return `GATE-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'MATERIAL_RECEIPT':
      return `MRN-${year}${month}-${randomSuffix.padStart(4, '0')}`;
    case 'VENDOR_BILL':
      return `VBILL-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'VENDOR_PAYMENT':
      return `VPAY-${year}-${randomSuffix.padStart(4, '0')}`;

    // 2. SALE
    case 'SALES_ORDER':
      return `SO-AESPL-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'SALES_INVOICE':
    case 'TAX_INVOICE':
      return `INV-${year}${month}-${randomSuffix.padStart(4, '0')}`;
    case 'QUOTATION':
      return `QUOT-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'DELIVERY_CHALLAN':
      return `DC-${year}${month}-${randomSuffix.padStart(4, '0')}`;
    case 'POS_SALE':
      return `POS-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'DISPATCH_ALLOCATION':
      return `DISP-${year}-${randomSuffix.padStart(4, '0')}`;

    // 3. BILLING & FINANCIAL
    case 'PROFORMA_INVOICE':
      return `PI-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'CREDIT_NOTE':
      return `CN-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'DEBIT_NOTE':
      return `DN-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'PAYMENT_VOUCHER':
    case 'RECEIPT_VOUCHER':
      return `RCPT-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'JOURNAL_VOUCHER':
      return `JV-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'ACCOUNTING_VOUCHER':
    case 'VYAPAR_RECORD':
      return `BILL-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'EWAY_BILL':
      return `EWB-${dateStr}-${randomSuffix.padStart(6, '0')}`;

    // 4. OPERATIONAL & MANUFACTURING
    case 'WORK_ORDER':
      return `WO-AESPL-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'PRODUCTION_BATCH':
      return `PROD-${year}${month}-${randomSuffix.padStart(4, '0')}`;
    case 'WIP_LOT':
      return `WIP-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'BATTERY_SERIAL':
      return generateBatterySerial('EV', randomSuffix);
    case 'FINISHED_GOOD':
      return `FG-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'RAW_MATERIAL':
      return `SKU-RM-${randomSuffix.padStart(4, '0')}`;
    case 'STOCK_TRANSFER':
      return `TRN-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'STOCK_AUDIT':
      return `AUDIT-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'CELL_GRADING':
      return `CGB-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'EOL_CERTIFICATE':
      return `EOL-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'SCRAP_LOG':
      return `SCRAP-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'TELEMATICS_LOG':
      return `DIAG-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'WARRANTY_REGISTRATION':
      return `WREG-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'RMA_CLAIM':
      return `RMA-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'EPR_RECORD':
      return `EPR-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'CRM_LEAD':
      return `LEAD-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'COMPLAINT_TICKET':
      return `CMP-${year}-${randomSuffix.padStart(4, '0')}`;
    case 'WAREHOUSE_BIN':
      return `BIN-${randomSuffix.toUpperCase()}`;

    default: {
      const prefix = String(entityType).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'TXN';
      return `${prefix}-${year}-${randomSuffix.padStart(4, '0')}`;
    }
  }
}

/**
 * Ensures any entered or uploaded data record has a valid, non-empty,
 * standardized Serial Number, Unique ID, and Transaction ID.
 */
export function ensureRecordIdentity<T extends Record<string, any>>(
  record: T,
  entityType: EntityType | string,
  options: {
    fallbackGrade?: string;
    index?: number;
    partyId?: string;
  } = {}
): T & { id: string; transactionId?: string; serialNumber?: string; serial?: string; voucher_no?: string; poNumber?: string } {
  if (!record || typeof record !== 'object') {
    return { id: generateUniqueTransactionId(entityType, options.index) } as any;
  }

  const result: any = { ...record };
  const currentYear = new Date().getFullYear();
  const suffix = options.index !== undefined ? options.index + 1 : Math.floor(1000 + Math.random() * 9000);

  // 1. Ensure ID
  if (!result.id || String(result.id).trim() === '' || result.id === 'undefined' || result.id === 'null') {
    result.id = generateUniqueTransactionId(entityType, suffix);
  }

  // 2. Domain Specific Serial / Transaction Number Enhancements
  switch (entityType) {
    case 'PURCHASE_ORDER':
    case 'AUTO_PO': {
      if (!result.poNumber) result.poNumber = result.id.startsWith('PO-') ? result.id : `PO-${currentYear}-${suffix}`;
      if (!result.trackingNumber) result.trackingNumber = `TRK-ARC-${Math.floor(1000 + Math.random() * 9000)}`;
      break;
    }

    case 'GATE_INWARD':
    case 'GATE_PASS': {
      if (!result.gatePassNo) result.gatePassNo = `GP-${currentYear}-${suffix}`;
      if (!result.challanNo) result.challanNo = `CH-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!result.weighbridgeSlipNo) result.weighbridgeSlipNo = `WB-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
      break;
    }

    case 'TAX_INVOICE':
    case 'SALES_INVOICE': {
      if (!result.voucher_no) result.voucher_no = result.id;
      if (!result.invoiceNumber) result.invoiceNumber = result.id;
      if (!result.eWayBill && result.total > 50000) {
        result.eWayBill = `EWB-${currentYear}${Math.floor(100000 + Math.random() * 900000)}`;
      }
      break;
    }

    case 'VYAPAR_RECORD':
    case 'ACCOUNTING_VOUCHER':
    case 'PAYMENT_VOUCHER':
    case 'RECEIPT_VOUCHER': {
      if (!result.voucherNumber) result.voucherNumber = result.id;
      if (!result.voucher_no) result.voucher_no = result.id;
      if (!result.refNo) result.refNo = `REF-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
      break;
    }

    case 'BATTERY_SERIAL':
    case 'FINISHED_GOOD': {
      const rawSerial = result.serial || result.serialNumber || result.serial_no || result.id;
      const normalized = normalizeToRevisedSerial(rawSerial, options.fallbackGrade || result.model || 'EV');
      result.serial = normalized;
      result.serialNumber = normalized;
      if (!result.batch) result.batch = `BATCH-${new Date().toISOString().substring(0, 10)}`;
      break;
    }

    case 'RAW_MATERIAL': {
      if (!result.code) result.code = `SKU-RM-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!result.grn) result.grn = `GRN-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!result.batch) result.batch = `LOT-${currentYear}-${Math.floor(100 + Math.random() * 900)}`;
      if (!result.challanNo) result.challanNo = `CH-${Math.floor(1000 + Math.random() * 9000)}`;
      break;
    }

    case 'STOCK_TRANSFER': {
      if (!result.transferId) result.transferId = result.id;
      if (!result.sealNumber) result.sealNumber = `SEAL-${Math.floor(100000 + Math.random() * 900000)}`;
      if (!result.eWayBillNo) result.eWayBillNo = `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      break;
    }

    case 'STOCK_AUDIT': {
      if (!result.auditId) result.auditId = result.id;
      break;
    }

    case 'CELL_GRADING': {
      if (!result.batchCode) result.batchCode = `CGB-${currentYear}-${suffix}`;
      if (!result.supplierLotNo) result.supplierLotNo = `CATL-LOT-${Math.floor(100 + Math.random() * 900)}`;
      break;
    }

    case 'EOL_CERTIFICATE': {
      if (result.serialNumber || result.serial) {
        result.serialNumber = normalizeToRevisedSerial(result.serialNumber || result.serial, options.fallbackGrade || 'EV');
      }
      break;
    }

    case 'WARRANTY_REGISTRATION': {
      if (result.serialNumber || result.serial) {
        result.serialNumber = normalizeToRevisedSerial(result.serialNumber || result.serial, options.fallbackGrade || 'EV');
        result.serial = result.serialNumber;
      }
      break;
    }

    case 'RMA_CLAIM': {
      if (result.serialNumber || result.serial) {
        result.serialNumber = normalizeToRevisedSerial(result.serialNumber || result.serial, options.fallbackGrade || 'EV');
      }
      if (!result.creditNoteNo) result.creditNoteNo = `CN-${currentYear}-${Math.floor(100 + Math.random() * 900)}`;
      break;
    }

    case 'CRM_LEAD': {
      if (!result.leadId) result.leadId = result.id;
      break;
    }
  }

  // Assign transaction timestamp if missing
  if (!result.createdAt && !result.date && !result.entryDate && !result.orderDate && !result.invoiceDate) {
    result.createdAt = new Date().toISOString();
  }

  return result;
}

/**
 * Bulk Importer Normalizer:
 * Validates and injects uniform Serial Numbers / Unique IDs / Transaction IDs for an entire batch of uploaded records.
 */
export function normalizeUploadedBatch<T extends Record<string, any>>(
  rows: T[],
  entityType: EntityType | string,
  options: {
    fallbackGrade?: string;
    defaultWarehouse?: string;
    defaultSupplier?: string;
  } = {}
): T[] {
  if (!Array.isArray(rows)) return [];

  const seenIds = new Set<string>();
  const seenSerials = new Set<string>();

  return rows.map((row, idx) => {
    const item = ensureRecordIdentity(row, entityType, {
      fallbackGrade: options.fallbackGrade || (row as any).model || 'EV',
      index: idx
    });

    // Prevent ID collision in uploaded batch
    while (seenIds.has(item.id)) {
      item.id = generateUniqueTransactionId(entityType, idx + Math.floor(Math.random() * 100000));
    }
    seenIds.add(item.id);

    // If battery / serialized good, prevent duplicate serial collision in uploaded batch
    if (item.serial) {
      let candidate = normalizeToRevisedSerial(item.serial, options.fallbackGrade || item.model || 'EV');
      if (seenSerials.has(candidate.toLowerCase())) {
        candidate = generateBatterySerial(item.model || options.fallbackGrade || 'EV', idx + 1000);
      }
      seenSerials.add(candidate.toLowerCase());
      item.serial = candidate;
      if (item.serialNumber) item.serialNumber = candidate;
    }

    return item;
  });
}

export function parseBatterySerial(serial: string) {
  if (!serial) return { prefix: 'AESPL', grade: 'EV', suffix: '31G26001044' };
  
  const norm = normalizeToRevisedSerial(serial);

  // Pattern with spaces: e.g. "AESPL  EV  28G26000001" or "AESPL EV 28G26000001"
  const spaceParts = norm.split(/\s+/);
  if (spaceParts.length >= 3 && spaceParts[0].toUpperCase() === 'AESPL') {
    return {
      prefix: spaceParts[0],
      grade: spaceParts[1],
      suffix: spaceParts.slice(2).join(' ')
    };
  }

  if (spaceParts.length === 2 && spaceParts[0].toUpperCase() === 'AESPL') {
    return {
      prefix: spaceParts[0],
      grade: spaceParts[1],
      suffix: ''
    };
  }
  
  return { prefix: norm, grade: 'EV', suffix: '' };
}

export interface FormattedSerialProps {
  serial: string;
  className?: string;
  gradeClassName?: string;
}

export const FormattedSerial: React.FC<FormattedSerialProps> = ({
  serial,
  className = "font-mono text-sm tracking-wider text-slate-900 inline-flex items-center gap-2",
  gradeClassName = "font-black text-slate-950 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md uppercase font-extrabold shadow-2xs"
}) => {
  const { prefix, grade, suffix } = parseBatterySerial(serial);

  if (!grade) {
    return <span className={className}>{serial}</span>;
  }

  return (
    <span className={className}>
      <span className="font-bold text-slate-700">{prefix}</span>
      <strong className={gradeClassName}>{grade}</strong>
      <span className="font-bold text-slate-700">{suffix}</span>
    </span>
  );
};

export interface TransactionBadgeProps {
  id: string;
  type?: 'PURCHASE' | 'SALE' | 'BILLING' | 'OPERATIONAL' | 'GENERAL';
  label?: string;
  className?: string;
}

export const TransactionBadge: React.FC<TransactionBadgeProps> = ({
  id,
  type = 'GENERAL',
  label,
  className = ''
}) => {
  const colorMap = {
    PURCHASE: 'bg-amber-50 text-amber-800 border-amber-200',
    SALE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    BILLING: 'bg-blue-50 text-blue-800 border-blue-200',
    OPERATIONAL: 'bg-purple-50 text-purple-800 border-purple-200',
    GENERAL: 'bg-slate-50 text-slate-800 border-slate-200'
  };

  const currentStyle = colorMap[type] || colorMap.GENERAL;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border shadow-xs ${currentStyle} ${className}`}>
      {label && <span className="text-[10px] font-sans font-black uppercase tracking-wider opacity-75">{label}:</span>}
      <span>{id || 'N/A'}</span>
    </span>
  );
};

