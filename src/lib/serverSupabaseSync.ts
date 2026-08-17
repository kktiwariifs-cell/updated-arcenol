import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = "https://zrycwwcnzaoqhhqkrhig.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_t8cKhGdESXfoBRnc0awuOA_XcyOk7tl";

function getSanitizedSupabaseUrl(rawUrl?: any): string {
  if (typeof rawUrl !== 'string') return DEFAULT_SUPABASE_URL;
  let trimmed = rawUrl.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return DEFAULT_SUPABASE_URL;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

function getSanitizedSupabaseKey(rawKey?: any): string {
  if (typeof rawKey !== 'string') return DEFAULT_SUPABASE_KEY;
  let trimmed = rawKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return DEFAULT_SUPABASE_KEY;
  }
  return trimmed;
}

const SUPABASE_URL = getSanitizedSupabaseUrl(process.env.VITE_SUPABASE_URL);
const SUPABASE_KEY = getSanitizedSupabaseKey(process.env.VITE_SUPABASE_ANON_KEY);

export const supabaseServerClient = (() => {
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  };
  try {
    return createClient(SUPABASE_URL, SUPABASE_KEY, options);
  } catch (err) {
    console.warn('[ServerSupabaseSync] Warning initializing client, falling back to default:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, options);
  }
})();

export function mapInventory(item: any) {
  return {
    id: String(item.id || item.code || `RM-${Date.now()}`),
    name: item.name || 'Material Item',
    code: item.code || item.id || 'N/A',
    category: item.category || 'RAW_MATERIAL',
    qty: Number(item.qty || 0),
    unit: item.unit || 'Kg',
    supplier: item.supplier || 'Vendor',
    warehouse: item.warehouse || 'Raw Hub',
    rack: item.rack || 'A-1',
    price: Number(item.price || 0),
    grn: item.grn || 'GRN-01',
    batch: item.batch || 'BATCH-01',
    min_stock: Number(item.minStock ?? item.min_stock ?? 100),
    reorder_level: Number(item.reorderLevel ?? item.reorder_level ?? 250),
    qc_status: item.qcStatus || item.qc_status || 'APPROVED',
    status: item.status || 'AVAILABLE',
    reserved_qty: Number(item.reservedQty ?? item.reserved_qty ?? 0),
    date: item.date || new Date().toISOString().split('T')[0]
  };
}

export function mapLead(lead: any) {
  return {
    id: String(lead.id),
    company: lead.company || 'Unnamed Lead',
    category: lead.category || 'Dealer',
    source: lead.leadSource || lead.source || 'Website',
    contact_person: lead.contactPerson || lead.contact_person || 'N/A',
    mobile: lead.phone || lead.mobile || 'N/A',
    location: lead.location || 'N/A',
    followup_date: lead.followUpDate || lead.followup_date || new Date().toISOString().split('T')[0],
    followup_time: lead.followUpTime || lead.followup_time || '10:00',
    requirement: lead.requirement || 'General Requirement',
    status: lead.status || 'NEW',
    notes: lead.notes || '',
    assigned_executive: lead.assignedExecutive || lead.assigned_executive || 'Suresh Raina (North CRM Executive)',
    remarks_log: lead.remarksLog || lead.remarks_log || []
  };
}

export function mapCustomer(d: any) {
  return {
    id: String(d.id),
    name: d.company || d.name || 'Unnamed Customer',
    branch: d.region || d.city || d.branch || 'Headquarters',
    gstin: d.gstin || 'N/A',
    contact_person: d.contactPerson || d.contact_person || 'N/A',
    phone: d.phone || 'N/A',
    address: d.location || d.address || 'N/A'
  };
}

export function mapWarehouse(wh: any) {
  const isObj = typeof wh === 'object' && wh !== null;
  const name = isObj ? wh.name : String(wh);
  return {
    id: isObj ? String(wh.id || name) : String(wh),
    name: name,
    racks: isObj ? (wh.racks || 6) : 6,
    slots: isObj ? (wh.slots || 8) : 8,
    valuation: isObj ? Number(wh.valuation || 0) : 0,
    items_count: isObj ? Number(wh.items_count || 0) : 0,
    status: isObj ? (wh.status || 'ACTIVE') : 'ACTIVE'
  };
}

export function mapGradedCell(cell: any) {
  return {
    id: String(cell.id),
    serial: cell.serial || `CELL-${Date.now()}`,
    voltage: Number(cell.voltage || 3.2),
    ir: Number(cell.ir || 7.5),
    capacity: Number(cell.capacity || 6000),
    cycle_count: Number(cell.cycleCount || cell.cycle_count || 0),
    temp: Number(cell.temp || 25.0),
    grade: cell.grade || 'A',
    engineer: cell.engineer || 'Suresh P.',
    usage: cell.usage || 'EV PACKS',
    supplier: cell.supplier || 'Energy Plus',
    parent_id: cell.parentId || cell.parent_id || null
  };
}

export function mapWip(w: any) {
  return {
    id: String(w.id),
    name: w.name || 'WIP Pack',
    qty: Number(w.qty || 0),
    stage: w.stage || 'WELDING',
    last_update: w.lastUpdate || w.last_update || new Date().toISOString().split('T')[0],
    components: Array.isArray(w.components) ? w.components : []
  };
}

export function mapInvoice(inv: any) {
  const totalVal = Number(inv.total || inv.grandTotal || inv.grand_total || 0);
  const taxVal = Number(inv.tax || inv.gst || 0);
  const subtotalVal = Number(inv.subtotal || (totalVal > taxVal ? totalVal - taxVal : totalVal));

  return {
    id: String(inv.id),
    voucher_no: inv.voucher_no || inv.voucherNo || inv.id || 'VCHP-2026',
    customer_id: inv.dealerId || inv.customerId || inv.customer_id || inv.party_id || 'cust-001',
    party_id: inv.dealerId || inv.customerId || inv.customer_id || inv.party_id || 'cust-001',
    party_name: inv.partyName || inv.party_name || inv.customerName || '',
    biller_signature: inv.biller_signature || inv.billerSignature || inv.biller || 'ARAVIND SWAMY (SUPER_ADMIN)',
    goods: Array.isArray(inv.items) ? inv.items : (Array.isArray(inv.goods) ? inv.goods : []),
    items: Array.isArray(inv.items) ? inv.items : (Array.isArray(inv.goods) ? inv.goods : []),
    subtotal: subtotalVal,
    discount: Number(inv.discount || inv.flat_discount || inv.flatDiscount || 0),
    flat_discount: Number(inv.flat_discount || inv.flatDiscount || inv.discount || 0),
    freight_charge: Number(inv.freight_charge || inv.freightCharge || inv.freight || 0),
    packaging_charge: Number(inv.packaging_charge || inv.packagingCharge || inv.packaging || 0),
    payment_terms: inv.payment_terms || inv.paymentTerms || 'Due on Receipt',
    gst: taxVal,
    tax: taxVal,
    gst_tax_rate: Number(inv.gst_tax_rate || inv.gstTaxRate || 18),
    grand_total: totalVal,
    total: totalVal,
    payment_mode: inv.paymentMode || inv.payment_mode || 'Credit',
    status: inv.status || 'UNPAID',
    date: inv.date || new Date().toISOString().split('T')[0]
  };
}

export function mapComplaint(c: any) {
  return {
    id: String(c.id),
    serial: c.serial || 'N/A',
    type: c.type || 'General Issue',
    stage: c.stage || 'REGISTERED',
    status: c.status || 'OPEN',
    date: c.date || new Date().toISOString().split('T')[0],
    resolved_date: c.resolvedDate || c.resolved_date || '',
    notes: c.notes || '',
    engineering_observations: c.engineeringObservations || c.engineering_observations || '',
    root_cause: c.rootCause || c.root_cause || 'SCRUTINY_PENDING',
    engineer: c.engineer || 'Unassigned',
    inspection_result: c.inspectionResult || c.inspection_result || null
  };
}

export function mapVoucher(v: any) {
  return {
    id: String(v.id),
    voucher_no: v.voucher_no || v.voucherNo || v.id,
    voucher_type: v.type || v.voucher_type || v.vtype || 'Payment-In',
    vtype: v.type || v.voucher_type || v.vtype || 'Payment-In',
    party_id: v.party_id || v.partyId || '',
    party_name: v.party || v.party_name || v.partyName || v.party_company || 'Vendor/Client',
    party_company: v.party || v.party_name || v.partyName || v.party_company || 'Vendor/Client',
    category: v.category || 'General',
    amount: Number(v.amount || 0),
    deposit_mode: v.mode || v.deposit_mode || v.depositMode || 'Bank Deposit',
    settlement_status: v.status || v.settlement_status || v.settlementStatus || 'Paid',
    payment_notes: v.notes || v.payment_notes || v.paymentNotes || v.remarks || '',
    reference_notes: v.notes || v.payment_notes || v.paymentNotes || v.remarks || '',
    remarks: v.remarks || v.notes || '',
    date: v.date || new Date().toISOString().split('T')[0]
  };
}

export function mapCorporateUnit(sub: any) {
  return {
    id: String(sub.id),
    name: sub.name || 'Corporate Unit',
    shortName: sub.shortName || sub.short_name || '',
    type: sub.type || 'PLANT',
    gstin: sub.gstin || '',
    cin: sub.cin || '',
    contactEmail: sub.contactEmail || sub.contact_email || '',
    phone: sub.phone || '',
    website: sub.website || '',
    address: sub.address || '',
    capacity: sub.capacity || '',
    manager: sub.manager || '',
    status: sub.status || 'ACTIVE'
  };
}

export function mapCategory(cat: any) {
  const isObj = typeof cat === 'object' && cat !== null;
  const id = isObj ? String(cat.id || `cat-${Date.now()}`) : `cat-${String(cat).toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const name = isObj ? cat.name : String(cat);
  const code = isObj ? (cat.code || `CAT-${name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`) : `CAT-${name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const description = isObj ? (cat.description || '') : '';
  return {
    id,
    name,
    code,
    description
  };
}

export function mapBusinessProfile(p: any) {
  return {
    id: 'PRIMARY',
    companyName: p.companyName || 'Arcenol Energy Private Limited',
    shortName: p.shortName || 'ARCENOL',
    establishedYear: p.establishedYear || '2018',
    industrySector: p.industrySector || 'Energy Storage',
    contactEmail: p.contactEmail || 'ops-admin@arcenol.com',
    phone: p.phone || '+91 79 4028 9200',
    website: p.website || 'www.arcenol.com',
    cin: p.cin || 'U31900GJ2018PTC102145',
    gstin: p.gstin || '24AAHCA9192M1ZP',
    address: p.address || 'Arcenol Tower, Gujarat',
    manufacturingCapacity: p.manufacturingCapacity || '12,000 MWh / Year',
    leadAcidOutput: p.leadAcidOutput || '260,000 MT / Year',
    depotsCount: Number(p.depotsCount || 5),
    primaryRegion: p.primaryRegion || 'WEST_SOUTH',
    complianceOfficer: p.complianceOfficer || 'Dr. Ananya Sharma',
    nodePassphrase: p.nodePassphrase || 'ARC-NODE-SECURE',
    logo: p.logo || '',
    loginLeftImage: p.loginLeftImage || ''
  };
}

export function mapBomBlueprint(product: any) {
  const id = String(product.id || product.model_id || `BAT-${Date.now()}`);
  return {
    id,
    model_id: id,
    name: product.name || 'Battery Model Blueprint',
    category_group: product.category || 'Uncategorized Blueprints',
    category: product.category || 'Uncategorized Blueprints',
    type: product.type || 'Battery',
    price: Number(product.price || 0),
    components: Array.isArray(product.bom) ? product.bom : []
  };
}

export function mapPurchaseOrder(po: any) {
  return {
    id: String(po.id),
    material_id: po.materialId || po.material_id || null,
    material_name: po.materialName || po.material_name || 'Raw Material',
    category: po.category || 'RAW_MATERIAL',
    vendor: po.vendor || 'Supplier Partner',
    vendor_contact: po.vendorContact || po.vendor_contact || '',
    qty: Number(po.qty || 0),
    unit: po.unit || 'Pcs',
    unit_cost: Number(po.unitCost || po.unit_cost || 0),
    total_amount: Number(po.totalAmount || po.total_amount || 0),
    order_date: po.orderDate || po.order_date || new Date().toISOString().split('T')[0],
    estimated_delivery: po.estimatedDelivery || po.estimated_delivery || new Date().toISOString().split('T')[0],
    status: po.status || 'Pending Supplier Confirmation',
    tracking_number: po.trackingNumber || po.tracking_number || '',
    remarks: po.remarks || ''
  };
}

export function mapProcurementEntry(proc: any) {
  return {
    id: String(proc.id),
    procurement_mode: proc.procurementMode || proc.procurement_mode || 'RESTOCK EXISTING ITEM',
    matcher_sku: proc.matcherSku || proc.matcher_sku || null,
    material_name: proc.materialName || proc.material_name || proc.name || 'Material Item',
    code_reference: proc.codeReference || proc.code_reference || proc.code || '',
    category: proc.category || 'RAW_MATERIAL',
    unit: proc.unit || 'Kg',
    challan_number: proc.challanNumber || proc.challan_number || '',
    vehicle_number: proc.vehicleNumber || proc.vehicle_number || '',
    supplier_name: proc.supplierName || proc.supplier_name || proc.supplier || '',
    eway_bill: proc.ewayBill || proc.eway_bill || '',
    excise_slip: proc.exciseSlip || proc.excise_slip || '',
    accepted_qty: Number(proc.acceptedQty || proc.accepted_qty || 0),
    damaged_qty: Number(proc.damagedQty || proc.damaged_qty || 0),
    batch_master_id: proc.batchMasterId || proc.batch_master_id || proc.batch || '',
    grn_reference: proc.grnReference || proc.grn_reference || proc.grn || '',
    destination_warehouse: proc.destinationWarehouse || proc.destination_warehouse || proc.warehouse || 'Raw Hub',
    rack_shelf: proc.rackShelf || proc.rack_shelf || proc.rack || 'A-1',
    min_stock: Number(proc.minStock || proc.min_stock || 100),
    reorder_level: Number(proc.reorderLevel || proc.reorder_level || 250),
    allocated_inflow: Number(proc.allocatedInflow || proc.allocated_inflow || 0),
    status: proc.status || 'COMPLETED'
  };
}

export function mapUser(u: any) {
  return {
    id: String(u.id),
    name: u.name || 'Operator',
    role: u.role || 'QUALITY_TEAM',
    department: u.department || '',
    email: u.email || '',
    password: u.password || 'password123',
    updated_at: new Date().toISOString()
  };
}

export function mapFinishedGood(fg: any) {
  return {
    id: String(fg.id || `fg-${Date.now()}`),
    model: fg.model || fg.modelId || '72V30A',
    serial: fg.serial || fg.serialNumber || 'AESPL  EV  28G26000001',
    batch: fg.batch || 'BATCH-A1',
    warehouse: fg.warehouse || 'Main Warehouse',
    rack: fg.rack || 'BIN-01',
    date: fg.date || new Date().toISOString().split('T')[0],
    status: fg.status || 'READY',
    test_results: fg.testResults || fg.test_results || {}
  };
}

export function mapProductionPlan(p: any) {
  return {
    id: String(p.id || `plan-${Date.now()}`),
    model_id: p.modelId || p.model_id || p.model || '72V30A',
    model_name: p.modelName || p.model_name || p.name || 'Battery Pack',
    target_qty: Number(p.targetQty || p.target_qty || p.qty || 0),
    completed_qty: Number(p.completedQty || p.completed_qty || 0),
    priority: p.priority || 'MEDIUM',
    start_date: p.startDate || p.start_date || p.date || new Date().toISOString().split('T')[0],
    target_date: p.targetDate || p.target_date || new Date().toISOString().split('T')[0],
    status: p.status || 'PLANNED',
    allocation_mode: p.allocationMode || p.allocation_mode || 'CONSUME',
    materials: Array.isArray(p.materials) ? p.materials : [],
    notes: p.notes || ''
  };
}

export function mapWarehouseTransfer(t: any) {
  return {
    id: String(t.id || `TRN-${Date.now()}`),
    transfer_no: t.transferNo || t.transfer_no || t.id,
    source_warehouse: t.sourceWarehouse || t.source_warehouse || 'Raw Hub',
    destination_warehouse: t.destinationWarehouse || t.destination_warehouse || 'Main Warehouse',
    items: Array.isArray(t.items) ? t.items : [],
    status: t.status || 'DISPATCHED_IN_TRANSIT',
    vehicle_no: t.vehicleNo || t.vehicle_no || t.vehicleNumber || '',
    driver_name: t.driverName || t.driver_name || '',
    driver_contact: t.driverContact || t.driver_contact || '',
    e_way_bill: t.eWayBillNo || t.e_way_bill || t.ewayBill || '',
    notes: t.notes || t.receivedNotes || '',
    transfer_date: t.transferDate || t.transfer_date || new Date().toISOString().split('T')[0]
  };
}

export function mapStockAudit(a: any) {
  return {
    id: String(a.id || `AUDIT-${Date.now()}`),
    audit_no: a.auditNo || a.audit_no || a.id,
    warehouse: a.warehouse || 'Main Warehouse',
    auditor: a.auditedBy || a.auditor || 'Warehouse Supervisor',
    audit_date: a.auditDate || a.audit_date || new Date().toISOString().split('T')[0],
    status: a.status || 'PENDING_APPROVAL',
    findings: Array.isArray(a.items) ? a.items : (Array.isArray(a.findings) ? a.findings : []),
    admin_notes: a.adminNotes || a.admin_notes || a.notes || ''
  };
}

/**
 * Upsert items in batch into Supabase
 */
export async function batchUpsert(tableName: string, rows: any[]) {
  if (!rows || rows.length === 0) return { count: 0 };
  try {
    const { data, error } = await supabaseServerClient
      .from(tableName)
      .upsert(rows)
      .select();
    if (error) {
      if (!error.message?.includes('fetch failed') && !error.message?.includes('Failed to fetch')) {
        console.warn(`[SupabaseSync] Notice upserting into ${tableName}:`, error.message);
      }
      return { count: 0, error: error.message };
    }
    return { count: data?.length || rows.length };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (!msg.includes('fetch failed') && !msg.includes('Failed to fetch')) {
      console.warn(`[SupabaseSync] Warning upserting into ${tableName}:`, msg);
    }
    return { count: 0, error: msg };
  }
}

/**
 * Delete item from Supabase
 */
export async function deleteRecord(tableName: string, id: string) {
  try {
    const { error } = await supabaseServerClient
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error && !error.message?.includes('fetch failed')) {
      console.warn(`[SupabaseSync] Warning deleting from ${tableName}:`, error.message);
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (!msg.includes('fetch failed') && !msg.includes('Failed to fetch')) {
      console.warn(`[SupabaseSync] Warning deleting from ${tableName}:`, msg);
    }
  }
}

/**
 * Delete batch of items from Supabase by IDs
 */
export async function deleteRecordsBatch(tableName: string, ids: string[]) {
  if (!ids || ids.length === 0) return;
  try {
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabaseServerClient
        .from(tableName)
        .delete()
        .in('id', chunk);
      if (error && !error.message?.includes('fetch failed')) {
        console.warn(`[SupabaseSync] Warning batch deleting from ${tableName}:`, error.message);
      }
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (!msg.includes('fetch failed') && !msg.includes('Failed to fetch')) {
      console.warn(`[SupabaseSync] Warning batch deleting from ${tableName}:`, msg);
    }
  }
}

/**
 * Clear all rows from a Supabase table for purge all operation
 */
export async function clearRemoteTable(tableName: string) {
  if (!tableName) return;
  try {
    const { error } = await supabaseServerClient
      .from(tableName)
      .delete()
      .neq('id', '___PURGE_ALL_NON_MATCHING___');
    if (error && !error.message?.includes('fetch failed')) {
      console.warn(`[SupabaseSync] Notice clearing ${tableName}:`, error.message);
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (!msg.includes('fetch failed') && !msg.includes('Failed to fetch')) {
      console.warn(`[SupabaseSync] Warning clearing ${tableName}:`, msg);
    }
  }
}

/**
 * Sync ALL ERP tables in memory to Supabase
 */
export async function syncAllERPToSupabase(db: any) {
  const results: Record<string, any> = {};

  const tablesToSync: Array<{ name: string; rows: () => any[] }> = [
    { name: 'inventory', rows: () => Array.isArray(db.inventory) ? db.inventory.map(mapInventory) : [] },
    { name: 'lead_inquiries', rows: () => Array.isArray(db.leads) ? db.leads.map(mapLead) : [] },
    { name: 'customers', rows: () => Array.isArray(db.dealers) ? db.dealers.map(mapCustomer) : [] },
    { name: 'warehouses', rows: () => Array.isArray(db.warehouses) ? db.warehouses.map(mapWarehouse) : [] },
    { name: 'graded_cells', rows: () => Array.isArray(db.gradedInventory) ? db.gradedInventory.map(mapGradedCell) : [] },
    { name: 'wip_inventory', rows: () => Array.isArray(db.wipInventory) ? db.wipInventory.map(mapWip) : [] },
    { name: 'invoices', rows: () => Array.isArray(db.invoices) ? db.invoices.map(mapInvoice) : [] },
    { name: 'accounting_vouchers', rows: () => Array.isArray(db.vouchers) ? db.vouchers.map(mapVoucher) : [] },
    { name: 'complaints', rows: () => Array.isArray(db.complaints) ? db.complaints.map(mapComplaint) : [] },
    { name: 'arcenol_corporate_units', rows: () => Array.isArray(db.subsidiaries) ? db.subsidiaries.map(mapCorporateUnit) : [] },
    { name: 'categories', rows: () => Array.isArray(db.categories) ? db.categories.map(mapCategory) : [] },
    { name: 'arcenol_business_profile', rows: () => db.businessProfile ? [mapBusinessProfile(db.businessProfile)] : [] },
    { name: 'purchase_orders', rows: () => Array.isArray(db.purchaseOrders) ? db.purchaseOrders.map(mapPurchaseOrder) : [] },
    { name: 'procurement_entries', rows: () => Array.isArray(db.procurementEntries) ? db.procurementEntries.map(mapProcurementEntry) : [] },
    { name: 'arcenol_users', rows: () => Array.isArray(db.users) ? db.users.map(mapUser) : [] },
    { name: 'finished_goods', rows: () => Array.isArray(db.finishedGoods) ? db.finishedGoods.map(mapFinishedGood) : [] },
    { name: 'production_plans', rows: () => Array.isArray(db.productionPlans) ? db.productionPlans.map(mapProductionPlan) : [] },
    { name: 'warehouse_transfers', rows: () => Array.isArray(db.warehouseTransfers) ? db.warehouseTransfers.map(mapWarehouseTransfer) : [] },
    { name: 'stock_audits', rows: () => Array.isArray(db.stockAudits) ? db.stockAudits.map(mapStockAudit) : [] }
  ];

  try {
    for (const item of tablesToSync) {
      const rows = item.rows();
      if (rows && rows.length > 0) {
        const res = await batchUpsert(item.name, rows);
        results[item.name] = res;
        if (res.error && (res.error.includes('fetch failed') || res.error.includes('Failed to fetch'))) {
          console.log(`[SupabaseSync] Remote Supabase connection offline; skipping remaining batch operations.`);
          break;
        }
      }
    }
  } catch (err: any) {
    console.warn("[SupabaseSync] Error during syncAllERPToSupabase:", err?.message || err);
  }

  console.log("[SupabaseSync] Sync completed across tables:", Object.keys(results));
  return results;
}

/**
 * Hydrate local db state from Supabase if remote records exist
 */
export async function hydrateFromSupabase(db: any) {
  try {
    // 1. Inventory
    try {
      const { data: inv, error: invErr } = await supabaseServerClient.from('inventory').select('*');
      if (!invErr && Array.isArray(inv)) {
        db.inventory = inv.map(i => ({
          id: String(i.id),
          name: i.name,
          code: i.code || i.id,
          category: i.category || 'RAW_MATERIAL',
          qty: Number(i.qty || 0),
          unit: i.unit || 'Kg',
          supplier: i.supplier || 'Vendor',
          warehouse: i.warehouse || 'Raw Hub',
          rack: i.rack || 'A-1',
          price: Number(i.price || 0),
          grn: i.grn || 'GRN-01',
          batch: i.batch || 'BATCH-01',
          minStock: Number(i.min_stock ?? i.minStock ?? 100),
          reorderLevel: Number(i.reorder_level ?? i.reorderLevel ?? 250),
          qcStatus: i.qc_status || i.qcStatus || 'APPROVED',
          status: i.status || 'AVAILABLE',
          reservedQty: Number(i.reserved_qty ?? i.reservedQty ?? 0),
          date: i.date || (i.created_at ? i.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
        }));
      }
    } catch (e) {}

    // 2. Warehouses
    try {
      const { data: whs, error: whsErr } = await supabaseServerClient.from('warehouses').select('*');
      if (!whsErr && Array.isArray(whs)) {
        db.warehouses = Array.from(new Set(whs.map(w => (typeof w === 'string' ? w : (w.name || String(w.id)))).filter(Boolean)));
      }
    } catch (e) {}

    // 3. Graded Cells
    try {
      const { data: cells, error: cellsErr } = await supabaseServerClient.from('graded_cells').select('*');
      if (!cellsErr && Array.isArray(cells)) {
        db.gradedInventory = cells.map(c => ({
          id: String(c.id),
          serial: c.serial,
          name: `${c.grade || 'A'} Graded Cell`,
          voltage: Number(c.voltage || 3.2),
          ir: Number(c.ir || 7.5),
          capacity: Number(c.capacity || 6000),
          cycleCount: Number(c.cycle_count || 0),
          temp: Number(c.temp || 25.0),
          grade: c.grade || 'A',
          engineer: c.engineer || 'Suresh P.',
          usage: c.usage || 'EV PACKS',
          supplier: c.supplier || 'Energy Plus',
          parentId: c.parent_id
        }));
      }
    } catch (e) {}

    // 4. WIP Inventory
    try {
      const { data: wips, error: wipsErr } = await supabaseServerClient.from('wip_inventory').select('*');
      if (!wipsErr && Array.isArray(wips)) {
        db.wipInventory = wips.map(w => ({
          id: String(w.id),
          name: w.name,
          type: "Semi-Finished",
          qty: Number(w.qty || 0),
          stage: w.stage || 'WELDING',
          lastUpdate: w.last_update || new Date().toISOString().split('T')[0],
          components: Array.isArray(w.components) ? w.components : []
        }));
      }
    } catch (e) {}

    // 5. Lead Inquiries
    try {
      const { data: leads, error: leadsErr } = await supabaseServerClient.from('lead_inquiries').select('*');
      if (!leadsErr && Array.isArray(leads)) {
        db.leads = leads.map(l => ({
          id: String(l.id),
          company: l.company || 'Unnamed Lead',
          category: l.category || 'Dealer',
          leadSource: l.source || l.leadSource || 'Website',
          source: l.source || l.leadSource || 'Website',
          contactPerson: l.contact_person || l.contactPerson || '',
          phone: l.mobile || l.phone || '',
          location: l.location || '',
          followUpDate: l.followup_date || l.followUpDate || new Date().toISOString().split('T')[0],
          followUpTime: l.followup_time || l.followUpTime || '10:00',
          requirement: l.requirement || '',
          status: String(l.status || 'NEW').toUpperCase(),
          notes: l.notes || '',
          remarksLog: Array.isArray(l.remarks_log) ? l.remarks_log : (Array.isArray(l.remarksLog) ? l.remarksLog : [])
        }));
      }
    } catch (e) {}

    // 6. Customers
    try {
      const { data: custs, error: custsErr } = await supabaseServerClient.from('customers').select('*');
      if (!custsErr && Array.isArray(custs)) {
        const mappedCusts = custs.map(c => ({
          id: String(c.id),
          company: c.company || c.name || 'Dealer',
          name: c.company || c.name || 'Dealer',
          category: c.category || 'Tier 1 Dealer',
          gstin: c.gstin || 'N/A',
          phone: c.phone || 'N/A',
          email: c.email || `${(c.name || 'dealer').toLowerCase().replace(/\s/g, '')}@partner.com`,
          location: c.address || c.location || 'N/A',
          city: c.city || c.branch || 'Headquarters',
          state: c.state || 'Gujarat',
          region: c.region || c.branch || 'West',
          contactPerson: c.contact_person || c.contactPerson || 'N/A',
          status: 'ACTIVE'
        }));
        db.dealers = mappedCusts;
        db.customers = mappedCusts;
      }
    } catch (e) {}

    // 7. Invoices
    try {
      const { data: invs, error: invsErr } = await supabaseServerClient.from('invoices').select('*');
      if (!invsErr && Array.isArray(invs)) {
        db.invoices = invs.map(inv => {
          const customerId = inv.customer_id || inv.customerId || inv.dealerId || 'cust-001';
          const cust = (db.customers || []).find((c: any) => c.id === customerId) || (db.dealers || []).find((d: any) => d.id === customerId || d.company === customerId);
          const partyName = inv.party_name || inv.partyName || cust?.company || cust?.name || (customerId === 'cust-001' ? 'Electra Transit Pvt Ltd' : 'Walk-In Customer');
          const rawGoods = Array.isArray(inv.goods) ? inv.goods : (Array.isArray(inv.items) ? inv.items : []);
          const itemsArr = rawGoods.map((g: any) => ({
            model: g.model || g.modelId || 'BAT-72V-30A',
            modelId: g.modelId || g.model || 'BAT-72V-30A',
            name: g.description || g.name || 'E-Rickshaw Batteries (72V30A)',
            description: g.description || g.name || 'E-Rickshaw Batteries (72V30A)',
            qty: Number(g.qty || 1),
            price: Number(g.baseRate || g.price || 45000),
            serials: Array.isArray(g.serials) ? g.serials : []
          }));
          const subtotalVal = Number(inv.subtotal || 0);
          const taxVal = Number(inv.tax ?? inv.gst ?? 0);
          const totalVal = Number(inv.total ?? inv.grand_total ?? inv.grandTotal ?? (subtotalVal + taxVal));
          const invoiceDate = inv.date || (inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

          return {
            id: String(inv.id),
            voucher_no: inv.voucher_no || inv.voucherNo || inv.id,
            dealerId: customerId,
            customer_id: customerId,
            partyName,
            party_name: partyName,
            customerName: partyName,
            biller_signature: inv.biller_signature || 'ARAVIND SWAMY (SUPER_ADMIN)',
            items: itemsArr,
            goods: itemsArr,
            subtotal: subtotalVal,
            discount: Number(inv.discount || inv.flat_discount || 0),
            freight_charge: Number(inv.freight_charge || inv.freightCharge || 0),
            packaging_charge: Number(inv.packaging_charge || inv.packagingCharge || 0),
            payment_terms: inv.payment_terms || inv.paymentTerms || 'Due on Receipt',
            tax: taxVal,
            gst: taxVal,
            total: totalVal,
            grand_total: totalVal,
            grandTotal: totalVal,
            paymentMode: inv.payment_mode || inv.paymentMode || 'Credit',
            payment_mode: inv.payment_mode || inv.paymentMode || 'Credit',
            status: inv.status || 'UNPAID',
            date: invoiceDate,
            billedDate: invoiceDate,
            created_at: inv.created_at || invoiceDate
          };
        });
      }
    } catch (e) {}

    // 8. Complaints
    try {
      const { data: cmps, error: cmpsErr } = await supabaseServerClient.from('complaints').select('*');
      if (!cmpsErr && Array.isArray(cmps)) {
        db.complaints = cmps.map(c => ({
          id: String(c.id),
          serial: c.serial,
          type: c.type,
          stage: c.stage,
          status: c.status,
          date: c.date,
          resolvedDate: c.resolved_date,
          notes: c.notes,
          engineeringObservations: c.engineering_observations,
          rootCause: c.root_cause,
          engineer: c.engineer,
          inspectionResult: c.inspection_result
        }));
      }
    } catch (e) {}

    // 8.5 Warranty
    try {
      const { data: warr, error: warrErr } = await supabaseServerClient.from('warranty').select('*');
      if (!warrErr && Array.isArray(warr)) {
        db.warranty = warr.map((w: any) => ({
          id: String(w.id),
          serial: w.serial,
          dealerId: w.dealer_id || w.dealerId,
          startDate: w.start_date || w.startDate,
          durationMonths: Number(w.duration_months || w.durationMonths || 36),
          status: w.status || 'ACTIVE',
          history: Array.isArray(w.history) ? w.history : []
        }));
      }
    } catch (e) {}

    // 9. Subsidiaries
    try {
      const { data: subs, error: subsErr } = await supabaseServerClient.from('arcenol_corporate_units').select('*');
      if (!subsErr && Array.isArray(subs)) {
        db.subsidiaries = subs.map(s => ({
          id: String(s.id),
          name: s.name,
          shortName: s.shortName || s.short_name || '',
          type: s.type,
          gstin: s.gstin,
          cin: s.cin,
          contactEmail: s.contactEmail || s.contact_email || '',
          phone: s.phone,
          website: s.website,
          address: s.address,
          capacity: s.capacity,
          manager: s.manager,
          status: s.status
        }));
      }
    } catch (e) {}

    // 10. Categories
    try {
      const { data: cats, error: catsErr } = await supabaseServerClient.from('categories').select('*');
      if (!catsErr && Array.isArray(cats)) {
        db.categories = cats.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          code: c.code || `CAT-${c.name.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          description: c.description || ''
        }));
        db.productCategories = cats.map((c: any) => c.name);
      }
    } catch (e) {}

    // 11. BOMs
    try {
      const { data: boms, error: bomsErr } = await supabaseServerClient.from('bom_blueprints').select('*');
      if (!bomsErr && Array.isArray(boms)) {
        const fetchedProducts = boms.map((b: any) => ({
          id: String(b.model_id || b.id),
          model_id: String(b.model_id || b.id),
          name: b.name,
          category: b.category_group || b.category || 'Uncategorized Blueprints',
          type: b.type || 'Battery',
          price: Number(b.price || 0),
          bom: Array.isArray(b.components)
            ? b.components.map((comp: any) => {
                const catalogItem = db.inventory?.find((i: any) => i.id === comp.matId || i.code === comp.matId);
                return {
                  matId: comp.matId || comp.id || comp.code || '',
                  name: comp.name || comp.materialName || comp.componentName || comp.material_name || comp.title || catalogItem?.name || comp.matId || 'Raw Material Component',
                  qty: Number(comp.qty || 1),
                  unit: comp.unit || catalogItem?.unit || 'Pcs',
                  wastage: Number(comp.wastage || 0)
                };
              })
            : []
        }));

        if (!db.products || db.products.length === 0) {
          db.products = fetchedProducts;
        } else {
          const productMap = new Map<string, any>();
          db.products.forEach((p: any) => {
            const key = String(p.id || p.model_id || '').trim();
            if (key) productMap.set(key, p);
          });
          fetchedProducts.forEach((p: any) => {
            const key = String(p.id || p.model_id || '').trim();
            if (key) {
              const existing = productMap.get(key);
              productMap.set(key, { ...existing, ...p });
            }
          });
          db.products = Array.from(productMap.values());
        }
      }
    } catch (e) {}

    // 12. Vouchers
    try {
      const { data: vouchers, error: vouchersErr } = await supabaseServerClient.from('accounting_vouchers').select('*');
      if (!vouchersErr && Array.isArray(vouchers)) {
        const mappedVouchers = vouchers.map((v: any) => ({
          id: String(v.id),
          voucher_no: v.voucher_no || v.voucherNo || v.id,
          voucherType: v.voucher_type || v.vtype || 'Payment-In',
          party_id: v.party_id || 'external',
          partyName: v.party_name || v.party || 'Vendor/Client',
          category: v.category || 'General',
          amount: Number(v.amount || 0),
          depositMode: v.deposit_mode || 'Bank',
          settlementStatus: v.settlement_status || 'PAID',
          paymentNotes: v.payment_notes || v.remarks || '',
          date: v.date || (v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
        }));

        const mappedVyapar = vouchers.map((v: any) => ({
          id: String(v.id),
          type: v.voucher_type || v.vtype || 'Payment-In',
          partyId: v.party_id || 'external',
          partyName: v.party_name || v.party || 'Vendor/Client',
          date: v.date || (v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          amount: Number(v.amount || 0),
          mode: v.deposit_mode || 'Bank',
          status: v.settlement_status || 'PAID',
          remarks: v.payment_notes || v.remarks || '',
          category: v.category || 'General'
        }));

        db.vouchers = mappedVouchers;
        db.vyaparRecords = mappedVyapar;
      }
    } catch (e) {}

    // 13. Marketing
    try {
      const { data: camps, error: campsErr } = await supabaseServerClient.from('marketing_campaigns').select('*');
      if (!campsErr && Array.isArray(camps) && db.engagement) {
        db.engagement.campaigns = camps.map((m: any) => ({
          id: String(m.id),
          title: m.title,
          desc: m.description,
          category: m.category_group,
          status: m.status
        }));
      }
    } catch (e) {}

    // 14. Business Profile
    try {
      const { data: bp, error: bpErr } = await supabaseServerClient.from('arcenol_business_profile').select('*').eq('id', 'PRIMARY').maybeSingle();
      if (!bpErr && bp) {
        db.businessProfile = {
          companyName: bp.companyName || db.businessProfile?.companyName || 'Arcenol Energy Private Limited',
          shortName: bp.shortName || db.businessProfile?.shortName || 'ARCENOL',
          establishedYear: bp.establishedYear || db.businessProfile?.establishedYear || '2018',
          industrySector: bp.industrySector || db.businessProfile?.industrySector || 'Energy Storage',
          contactEmail: bp.contactEmail || db.businessProfile?.contactEmail || 'ops-admin@arcenol.com',
          phone: bp.phone || db.businessProfile?.phone || '+91 79 4028 9200',
          website: bp.website || db.businessProfile?.website || 'www.arcenol.com',
          cin: bp.cin || db.businessProfile?.cin || 'U31900GJ2018PTC102145',
          gstin: bp.gstin || db.businessProfile?.gstin || '24AAHCA9192M1ZP',
          address: bp.address || db.businessProfile?.address || 'Arcenol Tower, Gujarat',
          manufacturingCapacity: bp.manufacturingCapacity || db.businessProfile?.manufacturingCapacity || '12,000 MWh / Year',
          leadAcidOutput: bp.leadAcidOutput || db.businessProfile?.leadAcidOutput || '260,000 MT / Year',
          depotsCount: Number(bp.depotsCount || db.businessProfile?.depotsCount || 5),
          primaryRegion: bp.primaryRegion || db.businessProfile?.primaryRegion || 'WEST_SOUTH',
          complianceOfficer: bp.complianceOfficer || db.businessProfile?.complianceOfficer || 'Dr. Ananya Sharma',
          nodePassphrase: bp.nodePassphrase || db.businessProfile?.nodePassphrase || 'ARC-NODE-SECURE',
          logo: bp.logo || db.businessProfile?.logo || '',
          loginLeftImage: bp.loginLeftImage || db.businessProfile?.loginLeftImage || ''
        };
      }
    } catch (e) {}

    // 15. Purchase Orders
    try {
      const { data: pos, error: posErr } = await supabaseServerClient.from('purchase_orders').select('*');
      if (!posErr && Array.isArray(pos)) {
        db.purchaseOrders = pos.map((p: any) => ({
          id: String(p.id),
          materialId: p.material_id || p.materialId || 'RM-GENERIC',
          materialName: p.material_name || p.materialName || 'Raw Material Component',
          category: p.category || 'RAW_MATERIAL',
          vendor: p.vendor || 'Energy Plus Ltd',
          vendorContact: p.vendor_contact || p.vendorContact || '+91 98765 43210',
          qty: Number(p.qty || 0),
          unit: p.unit || 'Pcs',
          unitCost: Number(p.unit_cost || p.unitCost || 0),
          totalAmount: Number(p.total_amount || p.totalAmount || (Number(p.qty || 0) * Number(p.unit_cost || p.unitCost || 0))),
          orderDate: p.order_date || p.orderDate || new Date().toISOString().split('T')[0],
          estimatedDelivery: p.estimated_delivery || p.estimatedDelivery || new Date().toISOString().split('T')[0],
          status: p.status || 'Pending Supplier Confirmation',
          trackingNumber: p.tracking_number || p.trackingNumber || `TRK-${p.id}`,
          remarks: p.remarks || ''
        }));
      }
    } catch (e) {}

    // 16. Procurement Entries & Gate Entries
    try {
      const { data: procs, error: procsErr } = await supabaseServerClient.from('procurement_entries').select('*');
      if (!procsErr && Array.isArray(procs)) {
        const mappedProcs = procs.map((p: any) => ({
          id: String(p.id),
          procurementMode: p.procurement_mode || p.procurementMode || 'RESTOCK EXISTING ITEM',
          matcherSku: p.matcher_sku || p.matcherSku || '',
          materialName: p.material_name || p.materialName || 'Material Asset',
          codeReference: p.code_reference || p.codeReference || '',
          category: p.category || 'RAW_MATERIAL',
          unit: p.unit || 'Kg',
          challanNumber: p.challan_number || p.challanNumber || '',
          vehicleNumber: p.vehicle_number || p.vehicleNumber || '',
          supplierName: p.supplier_name || p.supplierName || '',
          ewayBill: p.eway_bill || p.ewayBill || '',
          exciseSlip: p.excise_slip || p.exciseSlip || '',
          acceptedQty: Number(p.accepted_qty || p.acceptedQty || 0),
          damagedQty: Number(p.damaged_qty || p.damagedQty || 0),
          batchMasterId: p.batch_master_id || p.batchMasterId || '',
          grnReference: p.grn_reference || p.grnReference || '',
          destinationWarehouse: p.destination_warehouse || p.destinationWarehouse || 'Raw Hub',
          rackShelf: p.rack_shelf || p.rackShelf || 'A-1',
          minStock: Number(p.min_stock || p.minStock || 100),
          reorderLevel: Number(p.reorder_level || p.reorderLevel || 250),
          allocatedInflow: Number(p.allocated_inflow || p.allocatedInflow || 0),
          status: p.status || 'COMPLETED',
          entryTimestamp: p.created_at || new Date().toISOString()
        }));
        db.procurementEntries = mappedProcs;
        db.gateEntries = mappedProcs;
      }
    } catch (e) {}

    // 17. Operator User Accounts
    try {
      const { data: users, error: usersErr } = await supabaseServerClient.from('arcenol_users').select('*');
      if (!usersErr && Array.isArray(users) && users.length > 0) {
        db.users = users.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          role: u.role,
          department: u.department || '',
          email: u.email,
          password: u.password || 'password123'
        }));
      }
    } catch (e) {}

    // 18. Finished Goods
    try {
      const { data: fgs, error: fgsErr } = await supabaseServerClient.from('finished_goods').select('*');
      if (!fgsErr && Array.isArray(fgs) && fgs.length > 0) {
        db.finishedGoods = fgs.map((f: any) => ({
          id: String(f.id),
          model: f.model,
          serial: f.serial,
          batch: f.batch || 'BATCH-A1',
          warehouse: f.warehouse || 'Main Warehouse',
          rack: f.rack || 'BIN-01',
          date: f.date || (f.created_at ? f.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          status: f.status || 'READY',
          testResults: f.test_results || f.testResults || {}
        }));
      }
    } catch (e) {}

    // 19. Production Plans
    try {
      const { data: plans, error: plansErr } = await supabaseServerClient.from('production_plans').select('*');
      if (!plansErr && Array.isArray(plans)) {
        db.productionPlans = plans.map((p: any) => ({
          id: String(p.id),
          modelId: p.model_id || p.modelId,
          modelName: p.model_name || p.modelName,
          targetQty: Number(p.target_qty || p.targetQty || 0),
          completedQty: Number(p.completed_qty || p.completedQty || 0),
          priority: p.priority || 'MEDIUM',
          startDate: p.start_date || p.startDate,
          targetDate: p.target_date || p.targetDate,
          status: p.status || 'PLANNED',
          allocationMode: p.allocation_mode || p.allocationMode || 'CONSUME',
          materials: Array.isArray(p.materials) ? p.materials : [],
          notes: p.notes || ''
        }));
      }
    } catch (e) {}

    // 20. Warehouse Transfers
    try {
      const { data: trns, error: trnsErr } = await supabaseServerClient.from('warehouse_transfers').select('*');
      if (!trnsErr && Array.isArray(trns)) {
        db.warehouseTransfers = trns.map((t: any) => ({
          id: String(t.id),
          transferNo: t.transfer_no || t.transferNo || t.id,
          transferDate: t.transfer_date || t.transferDate || new Date().toISOString().split('T')[0],
          sourceWarehouse: t.source_warehouse || t.sourceWarehouse || 'Raw Hub',
          destinationWarehouse: t.destination_warehouse || t.destinationWarehouse || 'Main Warehouse',
          items: Array.isArray(t.items) ? t.items : [],
          status: t.status || 'DISPATCHED_IN_TRANSIT',
          vehicleNo: t.vehicle_no || t.vehicleNo || '',
          driverName: t.driver_name || t.driverName || '',
          driverContact: t.driver_contact || t.driverContact || '',
          eWayBillNo: t.e_way_bill || t.eWayBillNo || '',
          notes: t.notes || '',
          receivedNotes: t.notes || ''
        }));
      }
    } catch (e) {}

    // 21. Stock Audits
    try {
      const { data: audits, error: auditsErr } = await supabaseServerClient.from('stock_audits').select('*');
      if (!auditsErr && Array.isArray(audits)) {
        db.stockAudits = audits.map((a: any) => ({
          id: String(a.id),
          auditNo: a.audit_no || a.auditNo || a.id,
          warehouse: a.warehouse || 'Main Warehouse',
          auditedBy: a.auditor || a.auditedBy || 'Warehouse Supervisor',
          auditDate: a.audit_date || a.auditDate || new Date().toISOString().split('T')[0],
          status: a.status || 'PENDING_APPROVAL',
          items: Array.isArray(a.findings) ? a.findings : (Array.isArray(a.items) ? a.items : []),
          adminNotes: a.admin_notes || a.adminNotes || ''
        }));
      }
    } catch (e) {}

  } catch (err: any) {
    console.warn("[SupabaseSync] Hydration warning:", err?.message || err);
  }
}
