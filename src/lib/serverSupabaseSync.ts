import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = "https://vuastgyyrscopjmnhaew.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_4bkEqRrvnIrfc-szu_CDpw_tCs9ouIP";

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
    customer_id: inv.dealerId || inv.customerId || inv.customer_id || 'cust-001',
    biller_signature: inv.biller_signature || inv.billerSignature || 'Authorized Signatory',
    goods: Array.isArray(inv.items) ? inv.items : (Array.isArray(inv.goods) ? inv.goods : []),
    subtotal: subtotalVal,
    discount: Number(inv.discount || 0),
    gst: taxVal,
    grand_total: totalVal,
    payment_mode: inv.paymentMode || inv.payment_mode || 'Credit',
    status: inv.status || 'UNPAID'
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
    voucher_type: v.type || v.voucher_type || 'PAYMENT',
    party_name: v.party || v.party_name || 'Vendor/Client',
    category: v.category || 'General',
    amount: Number(v.amount || 0),
    deposit_mode: v.mode || v.deposit_mode || 'Bank Deposit',
    settlement_status: v.status || v.settlement_status || 'Paid',
    payment_notes: v.notes || v.payment_notes || ''
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
    { name: 'procurement_entries', rows: () => Array.isArray(db.procurementEntries) ? db.procurementEntries.map(mapProcurementEntry) : [] }
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
      const { data: inv } = await supabaseServerClient.from('inventory').select('*');
      if (inv && inv.length > 0) {
        const remoteItems = inv.map(i => ({
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

        const remoteMap = new Map(remoteItems.map(item => [item.id, item]));
        const updatedDbList = [...remoteItems];
        if (Array.isArray(db.inventory)) {
          db.inventory.forEach((localItem: any) => {
            if (!remoteMap.has(localItem.id)) {
              updatedDbList.push(localItem);
            }
          });
        }
        db.inventory = updatedDbList;
      }
    } catch (e) {}

    // 2. Warehouses
    try {
      const { data: whs } = await supabaseServerClient.from('warehouses').select('*');
      if (whs && whs.length > 0) {
        db.warehouses = Array.from(new Set(whs.map(w => (typeof w === 'string' ? w : (w.name || String(w.id)))).filter(Boolean)));
      }
    } catch (e) {}

    // 3. Graded Cells
    try {
      const { data: cells } = await supabaseServerClient.from('graded_cells').select('*');
      if (cells && cells.length > 0) {
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
      const { data: wips } = await supabaseServerClient.from('wip_inventory').select('*');
      if (wips && wips.length > 0) {
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
      const existingLeadsMap = new Map((db.leads || []).map((item: any) => [String(item.id), item]));
      const { data: leads } = await supabaseServerClient.from('lead_inquiries').select('*');
      if (leads && leads.length > 0) {
        const fetchedIds = new Set(leads.map((l: any) => String(l.id)));
        const mappedLeads = leads.map(l => {
          const idStr = String(l.id);
          const existing = existingLeadsMap.get(idStr) as any;
          return {
            id: idStr,
            company: l.company || existing?.company || 'Unnamed Lead',
            category: l.category || existing?.category || 'Dealer',
            leadSource: l.source || l.leadSource || existing?.leadSource || 'Website',
            source: l.source || l.leadSource || existing?.source || 'Website',
            contactPerson: l.contact_person || l.contactPerson || existing?.contactPerson || '',
            phone: l.mobile || l.phone || existing?.phone || '',
            location: l.location || existing?.location || '',
            followUpDate: l.followup_date || l.followUpDate || existing?.followUpDate || new Date().toISOString().split('T')[0],
            followUpTime: l.followup_time || l.followUpTime || existing?.followUpTime || '10:00',
            requirement: l.requirement || existing?.requirement || '',
            status: String(l.status || existing?.status || 'NEW').toUpperCase(),
            notes: l.notes || existing?.notes || '',
            remarksLog: Array.isArray(l.remarks_log) ? l.remarks_log : (Array.isArray(l.remarksLog) ? l.remarksLog : (existing?.remarksLog || []))
          };
        });
        const localOnly = (db.leads || []).filter((item: any) => !fetchedIds.has(String(item.id)));
        db.leads = [...mappedLeads, ...localOnly];
      }
    } catch (e) {}

    // 6. Customers
    try {
      const { data: custs } = await supabaseServerClient.from('customers').select('*');
      if (custs && custs.length > 0) {
        db.dealers = custs.map(c => ({
          id: String(c.id),
          company: c.name,
          category: 'Tier 1 Dealer',
          gstin: c.gstin,
          phone: c.phone,
          email: `${(c.name || 'dealer').toLowerCase().replace(/\s/g, '')}@partner.com`,
          location: c.address,
          city: c.branch || 'Headquarters',
          state: 'Gujarat',
          region: 'West',
          contactPerson: c.contact_person,
          status: 'ACTIVE'
        }));
      }
    } catch (e) {}

    // 7. Invoices
    try {
      const { data: invs } = await supabaseServerClient.from('invoices').select('*');
      if (invs && invs.length > 0) {
        db.invoices = invs.map(inv => ({
          id: String(inv.id),
          dealerId: inv.customer_id,
          biller_signature: inv.biller_signature,
          items: Array.isArray(inv.goods) ? inv.goods : [],
          subtotal: Number(inv.subtotal || 0),
          discount: Number(inv.discount || 0),
          tax: Number(inv.gst || 0),
          total: Number(inv.grand_total || 0),
          payment_mode: inv.payment_mode || 'Credit',
          status: inv.status || 'UNPAID',
          date: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
      }
    } catch (e) {}

    // 8. Complaints
    try {
      const { data: cmps } = await supabaseServerClient.from('complaints').select('*');
      if (cmps && cmps.length > 0) {
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

    // 9. Subsidiaries
    try {
      const { data: subs } = await supabaseServerClient.from('arcenol_corporate_units').select('*');
      if (subs && subs.length > 0) {
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
      const { data: cats } = await supabaseServerClient.from('categories').select('*');
      if (cats && cats.length > 0) {
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
      const { data: boms } = await supabaseServerClient.from('bom_blueprints').select('*');
      if (boms && boms.length > 0) {
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
      const { data: vouchers } = await supabaseServerClient.from('accounting_vouchers').select('*');
      if (vouchers && vouchers.length > 0) {
        db.vouchers = vouchers.map((v: any) => ({
          id: String(v.id),
          voucherType: v.voucher_type,
          partyName: v.party_name,
          category: v.category,
          amount: Number(v.amount || 0),
          depositMode: v.deposit_mode,
          settlementStatus: v.settlement_status,
          paymentNotes: v.payment_notes,
          date: v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        db.vyaparRecords = vouchers.map((v: any) => ({
          id: String(v.id),
          type: v.voucher_type || 'Payment-In',
          partyId: 'external',
          partyName: v.party_name,
          date: v.created_at ? v.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          amount: Number(v.amount || 0),
          mode: v.deposit_mode || 'Bank',
          status: v.settlement_status || 'PAID',
          remarks: v.payment_notes || '',
          category: v.category || 'General'
        }));
      }
    } catch (e) {}

    // 13. Marketing
    try {
      const { data: camps } = await supabaseServerClient.from('marketing_campaigns').select('*');
      if (camps && camps.length > 0 && db.engagement) {
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
      const { data: bp } = await supabaseServerClient.from('arcenol_business_profile').select('*').eq('id', 'PRIMARY').maybeSingle();
      if (bp) {
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
      const { data: pos } = await supabaseServerClient.from('purchase_orders').select('*');
      if (pos && pos.length > 0) {
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

    // 16. Procurement Entries
    try {
      const { data: procs } = await supabaseServerClient.from('procurement_entries').select('*');
      if (procs && procs.length > 0) {
        db.procurementEntries = procs.map((p: any) => ({
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
          status: p.status || 'COMPLETED'
        }));
      }
    } catch (e) {}

  } catch (err: any) {
    console.warn("[SupabaseSync] Hydration warning:", err?.message || err);
  }
}
