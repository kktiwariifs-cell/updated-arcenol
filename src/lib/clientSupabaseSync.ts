import { supabase } from './supabaseClient';

export async function hydrateDbFromSupabase(db: any) {
  try {
    // 0. Business Profile / Corporate Settings
    try {
      const { data: bp, error: bpErr } = await supabase
        .from('arcenol_business_profile')
        .select('*')
        .eq('id', 'PRIMARY')
        .maybeSingle();

      if (!bpErr && bp) {
        db.businessProfile = {
          companyName: bp.companyName || bp.company_name || db.businessProfile?.companyName || 'Arcenol Energy Private Limited',
          shortName: bp.shortName || bp.short_name || db.businessProfile?.shortName || 'ARCENOL',
          establishedYear: bp.establishedYear || bp.established_year || db.businessProfile?.establishedYear || '2018',
          industrySector: bp.industrySector || bp.industry_sector || db.businessProfile?.industrySector || 'Energy Storage',
          contactEmail: bp.contactEmail || bp.contact_email || db.businessProfile?.contactEmail || 'ops-admin@arcenol.com',
          phone: bp.phone || db.businessProfile?.phone || '+91 79 4028 9200',
          website: bp.website || db.businessProfile?.website || 'www.arcenol.com',
          cin: bp.cin || db.businessProfile?.cin || 'U31900GJ2018PTC102145',
          gstin: bp.gstin || db.businessProfile?.gstin || '24AAHCA9192M1ZP',
          address: bp.address || db.businessProfile?.address || 'Arcenol Tower, Gujarat',
          manufacturingCapacity: bp.manufacturingCapacity || bp.manufacturing_capacity || db.businessProfile?.manufacturingCapacity || '12,000 MWh / Year',
          leadAcidOutput: bp.leadAcidOutput || bp.lead_acid_output || db.businessProfile?.leadAcidOutput || '260,000 MT / Year',
          depotsCount: Number(bp.depotsCount || bp.depots_count || db.businessProfile?.depotsCount || 5),
          primaryRegion: bp.primaryRegion || bp.primary_region || db.businessProfile?.primaryRegion || 'WEST_SOUTH',
          complianceOfficer: bp.complianceOfficer || bp.compliance_officer || db.businessProfile?.complianceOfficer || 'Dr. Ananya Sharma',
          nodePassphrase: bp.nodePassphrase || bp.node_passphrase || db.businessProfile?.nodePassphrase || 'ARC-NODE-SECURE',
          logo: bp.logo || db.businessProfile?.logo || '',
          loginLeftImage: bp.loginLeftImage || bp.login_left_image || db.businessProfile?.loginLeftImage || ''
        };
      }
    } catch (profileErr) {
      console.warn('[Client Supabase Sync] Business profile hydration warning:', profileErr);
    }

    // 1. Inventory
    try {
      const { data: inv, error: invErr } = await supabase.from('inventory').select('*');
      if (!invErr && Array.isArray(inv)) {
        db.inventory = inv.map((i: any) => ({
          id: String(i.id || i.code || `RM-${Math.random()}`),
          name: i.name || i.material_name || i.title || 'Material Item',
          code: i.code || i.sku || i.id,
          category: i.category || 'Cells',
          qty: Number(i.qty ?? i.quantity ?? i.stock ?? 0),
          unit: i.unit || 'Kg',
          supplier: i.supplier || i.vendor || 'Vendor',
          warehouse: i.warehouse || i.location || 'Raw Hub',
          rack: i.rack || 'A-1',
          price: Number(i.price ?? i.cost ?? 0),
          grn: i.grn || 'GRN-01',
          batch: i.batch || 'BATCH-01',
          minStock: Number(i.min_stock ?? i.minStock ?? 100),
          reorderLevel: Number(i.reorder_level ?? i.reorderLevel ?? 250),
          qcStatus: i.qc_status || i.qcStatus || 'APPROVED',
          status: i.status || 'AVAILABLE',
          reservedQty: Number(i.reserved_qty ?? i.reservedQty ?? 0),
          date: i.date || (i.created_at && typeof i.created_at === 'string' ? i.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
        }));
      }
    } catch (invCatchErr) {
      console.warn('[Client Supabase Sync] Error hydratng inventory:', invCatchErr);
    }

    // 2. Graded Cells
    try {
      const { data: graded, error: gradedErr } = await supabase.from('graded_cells').select('*');
      if (!gradedErr && Array.isArray(graded)) {
        db.gradedInventory = graded.map((c: any) => ({
          id: String(c.id),
          serial: c.serial,
          voltage: Number(c.voltage || 3.2),
          ir: Number(c.ir || 7.5),
          capacity: Number(c.capacity || 6000),
          cycleCount: Number(c.cycle_count || 0),
          temp: Number(c.temp || 24.5),
          grade: c.grade,
          engineer: c.engineer || 'Suresh P.',
          usage: c.usage || 'EV PACKS',
          supplier: c.supplier || 'Energy Plus',
          parentId: c.parent_id || null
        }));
      }
    } catch (gradedCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating graded cells:', gradedCatchErr);
    }

    // 3. WIP Inventory
    try {
      const { data: wip, error: wipErr } = await supabase.from('wip_inventory').select('*');
      if (!wipErr && Array.isArray(wip)) {
        db.wipInventory = wip.map((w: any) => ({
          id: String(w.id),
          name: w.name,
          qty: Number(w.qty || 0),
          stage: w.stage,
          lastUpdate: w.last_update || (w.created_at && typeof w.created_at === 'string' ? w.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          components: Array.isArray(w.components) ? w.components : []
        }));
      }
    } catch (wipCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating wip inventory:', wipCatchErr);
    }

    // 4. Warehouses
    try {
      const { data: whs, error: whsErr } = await supabase.from('warehouses').select('*');
      if (!whsErr && Array.isArray(whs)) {
        db.warehouses = whs.map((w: any) => w.name || w.location || String(w));
      }
    } catch (whCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating warehouses:', whCatchErr);
    }

    // 5. Customers / Dealers
    try {
      const { data: custs, error: custsErr } = await supabase.from('customers').select('*');
      if (!custsErr && Array.isArray(custs)) {
        const mappedCusts = custs.map((c: any) => ({
          id: String(c.id),
          company: c.company || c.name || c.company_name || 'Dealer',
          name: c.company || c.name || c.company_name || 'Dealer',
          category: c.category || 'Tier 1 Dealer',
          region: c.region || c.branch || 'Headquarters',
          branch: c.branch || c.region || 'Headquarters',
          gstin: c.gstin || 'N/A',
          contactPerson: c.contact_person || c.contactPerson || 'N/A',
          phone: c.phone || 'N/A',
          email: c.email || 'N/A',
          location: c.location || c.address || 'N/A',
          address: c.address || c.location || 'N/A',
          city: c.city || 'N/A',
          state: c.state || 'N/A',
          creditLimit: Number(c.credit_limit || c.creditLimit || 500000),
          outstandingBalance: Number(c.outstanding_balance || c.outstandingBalance || 0),
          status: c.status || 'ACTIVE'
        }));
        db.dealers = mappedCusts;
        db.customers = mappedCusts;
      }
    } catch (custCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating customers:', custCatchErr);
    }

    // 6. Invoices
    try {
      const { data: invs, error: invsErr } = await supabase.from('invoices').select('*');
      if (!invsErr && Array.isArray(invs)) {
        db.invoices = invs.map((i: any) => {
          const customerId = i.customer_id || i.customerId || i.dealerId || i.party_id || 'cust-001';
          const cust = (db.customers || []).find((c: any) => String(c.id) === String(customerId)) || (db.dealers || []).find((d: any) => String(d.id) === String(customerId) || d.company === customerId);
          const partyName = i.party_name || i.partyName || cust?.company || cust?.name || (customerId === 'cust-001' ? 'Electra Transit Pvt Ltd' : 'Walk-In Customer');
          
          const rawGoods = Array.isArray(i.goods) ? i.goods : (Array.isArray(i.items) ? i.items : []);
          const itemsArr = rawGoods.map((g: any) => ({
            model: g.model || g.modelId || 'BAT-72V-30A',
            modelId: g.modelId || g.model || 'BAT-72V-30A',
            name: g.description || g.name || 'E-Rickshaw Batteries (72V30A)',
            description: g.description || g.name || 'E-Rickshaw Batteries (72V30A)',
            qty: Number(g.qty || 1),
            price: Number(g.baseRate || g.price || 45000),
            serials: Array.isArray(g.serials) ? g.serials : []
          }));

          const subtotalVal = Number(i.subtotal || 0);
          const gstVal = Number(i.gst || i.tax || 0);
          const grandTotalVal = Number(i.grand_total || i.grandTotal || i.total || (subtotalVal + gstVal));
          const createdDate = i.date || (i.created_at ? i.created_at.split('T')[0] : (i.billedDate || new Date().toISOString().split('T')[0]));

          return {
            id: String(i.id),
            voucher_no: i.voucher_no || i.voucherNo || i.id,
            customerId: String(customerId),
            dealerId: String(customerId),
            partyName,
            customerName: partyName,
            billerSignature: i.biller_signature || i.billerSignature || 'Aravind Swamy',
            goods: itemsArr,
            items: itemsArr,
            subtotal: subtotalVal,
            discount: Number(i.discount || i.flat_discount || 0),
            gst: gstVal,
            tax: gstVal,
            grandTotal: grandTotalVal,
            total: grandTotalVal,
            paymentMode: i.payment_mode || i.paymentMode || 'Credit',
            date: createdDate,
            billedDate: createdDate,
            created_at: i.created_at || createdDate,
            status: i.status || 'UNPAID'
          };
        });
      }
    } catch (invsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating invoices:', invsCatchErr);
    }

    // 7. Complaints
    try {
      const { data: comps, error: compsErr } = await supabase.from('complaints').select('*');
      if (!compsErr && Array.isArray(comps)) {
        db.complaints = comps.map((c: any) => ({
          id: String(c.id),
          serial: c.serial,
          type: c.type,
          stage: c.stage,
          status: c.status,
          date: c.date,
          resolvedDate: c.resolved_date || c.resolvedDate,
          notes: c.notes,
          engineeringObservations: c.engineering_observations || c.engineeringObservations,
          rootCause: c.root_cause || c.rootCause,
          engineer: c.engineer,
          inspectionResult: c.inspection_result || c.inspectionResult
        }));
      }
    } catch (compsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating complaints:', compsCatchErr);
    }

    // 7.5 Warranty
    try {
      const { data: warr, error: warrErr } = await supabase.from('warranty').select('*');
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
    } catch (warrCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating warranty:', warrCatchErr);
    }

    // 8. Lead Inquiries
    try {
      const { data: leads, error: leadsErr } = await supabase.from('lead_inquiries').select('*');
      if (!leadsErr && Array.isArray(leads)) {
        db.leads = leads.map((l: any) => ({
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
          status: l.status || 'NEW',
          notes: l.notes || '',
          assignedExecutive: l.assigned_executive || l.assignedExecutive || 'Suresh Raina (North CRM Executive)',
          remarksLog: l.remarks_log || l.remarksLog || []
        }));
      }
    } catch (leadsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating lead inquiries:', leadsCatchErr);
    }

    // 9. Categories
    try {
      const { data: cats, error: catsErr } = await supabase.from('categories').select('*');
      if (!catsErr && Array.isArray(cats)) {
        db.categories = cats.map((c: any) => c.name || c.title || String(c));
      }
    } catch (catsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating categories:', catsCatchErr);
    }

    // 10. BOM Blueprints
    try {
      const { data: boms, error: bomsErr } = await supabase.from('bom_blueprints').select('*');
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
    } catch (bomsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating bom_blueprints:', bomsCatchErr);
    }

    // 11. Purchase Orders
    try {
      const { data: pos, error: posErr } = await supabase.from('purchase_orders').select('*');
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
    } catch (posCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating purchase_orders:', posCatchErr);
    }

    // 12. Procurement Entries & Gate Entries
    try {
      const { data: procs, error: procsErr } = await supabase.from('procurement_entries').select('*');
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
    } catch (procsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating procurement_entries:', procsCatchErr);
    }

    // 12b. Physical Stock Audits
    try {
      const { data: audits, error: auditErr } = await supabase.from('stock_audits').select('*');
      if (!auditErr && Array.isArray(audits)) {
        db.stockAudits = audits.map((a: any) => ({
          id: String(a.id),
          auditDate: a.audit_date || a.auditDate || new Date().toISOString().split('T')[0],
          warehouse: a.warehouse || 'Raw Hub',
          auditorName: a.auditor_name || a.auditorName || 'Store Auditor',
          auditorRole: a.auditor_role || a.auditorRole || 'Inventory Auditor',
          auditorSignature: a.auditor_signature || a.auditorSignature || 'Verified',
          status: a.status || 'PENDING_ADMIN_APPROVAL',
          items: a.items || [],
          approvedAt: a.approved_at || a.approvedAt || null,
          adminNotes: a.admin_notes || a.adminNotes || ''
        }));
      }
    } catch (auditCatchErr) {
      // Ignore if table not created
    }

    // 12c. Warehouse Transfers
    try {
      const { data: transfers, error: trErr } = await supabase.from('warehouse_transfers').select('*');
      if (!trErr && Array.isArray(transfers)) {
        db.warehouseTransfers = transfers.map((t: any) => ({
          id: String(t.id),
          transferDate: t.transfer_date || t.transferDate || new Date().toISOString().split('T')[0],
          sourceWarehouse: t.source_warehouse || t.sourceWarehouse || 'Raw Hub',
          destWarehouse: t.dest_warehouse || t.destWarehouse || 'Ahmedabad Warehouse',
          itemId: t.item_id || t.itemId || '',
          itemName: t.item_name || t.itemName || 'Raw Material',
          qtyTransferred: Number(t.qty_transferred || t.qtyTransferred || 0),
          unit: t.unit || 'Pcs',
          transporterName: t.transporter_name || t.transporterName || 'Internal Logistics',
          driverPhone: t.driver_phone || t.driverPhone || '',
          vehicleRegNo: t.vehicle_reg_no || t.vehicleRegNo || '',
          eWayBillNo: t.eway_bill_no || t.eWayBillNo || '',
          sealNumber: t.seal_number || t.sealNumber || '',
          status: t.status || 'DISPATCHED_IN_TRANSIT',
          dispatchedBy: t.dispatched_by || t.dispatchedBy || 'Store Keeper',
          receivedNotes: t.received_notes || t.receivedNotes || ''
        }));
      }
    } catch (trCatchErr) {
      // Ignore if table not created
    }
    // 17. Operator User Accounts
    try {
      const { data: users } = await supabase.from('arcenol_users').select('*');
      if (users && users.length > 0) {
        db.users = users.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          role: u.role,
          department: u.department || '',
          email: u.email,
          password: u.password || 'password123'
        }));
        // Keep auth store local storage in sync
        try {
          localStorage.setItem('arcenol_users_storage', JSON.stringify(db.users));
        } catch (e) {}
      }
    } catch (usersCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating arcenol_users:', usersCatchErr);
    }
  } catch (err) {
    console.warn('[Client Supabase Sync Warning]:', err);
  }
}

export async function syncInventoryRecordToSupabase(item: any) {
  try {
    const payload = {
      id: String(item.id || item.code || `RM-${Date.now()}`),
      name: item.name || 'Material Item',
      code: item.code || item.id || 'N/A',
      category: item.category || 'Cells',
      qty: Number(item.qty || 0),
      unit: item.unit || 'Kg',
      supplier: item.supplier || 'Vendor',
      warehouse: item.warehouse || 'Raw Hub',
      rack: item.rack || 'A-1',
      price: Number(item.price || 0),
      grn: item.grn || 'GRN-01',
      batch: item.batch || 'BATCH-01'
    };
    await supabase.from('inventory').upsert(payload, { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to sync inventory item to Supabase:', err);
    }
  }
}

export async function syncBulkInventoryToSupabase(items: any[]) {
  try {
    const payloads = items.map(item => ({
      id: String(item.id || item.code || `RM-${Date.now()}`),
      name: item.name || 'Material Item',
      code: item.code || item.id || 'N/A',
      category: item.category || 'Cells',
      qty: Number(item.qty || 0),
      unit: item.unit || 'Kg',
      supplier: item.supplier || 'Vendor',
      warehouse: item.warehouse || 'Raw Hub',
      rack: item.rack || 'A-1',
      price: Number(item.price || 0),
      grn: item.grn || 'GRN-01',
      batch: item.batch || 'BATCH-01'
    }));
    await supabase.from('inventory').upsert(payloads, { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to bulk sync inventory to Supabase:', err);
    }
  }
}

export async function deleteInventoryRecordFromSupabase(id: string) {
  try {
    await supabase.from('inventory').delete().eq('id', id);
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to delete inventory item from Supabase:', err);
    }
  }
}

export async function syncLeadRecordToSupabase(lead: any) {
  try {
    const payload = {
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
    await supabase.from('lead_inquiries').upsert(payload, { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to sync lead inquiry to Supabase:', err);
    }
  }
}

export async function deleteLeadRecordFromSupabase(id: string) {
  try {
    await supabase.from('lead_inquiries').delete().eq('id', id);
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to delete lead inquiry from Supabase:', err);
    }
  }
}

export async function syncBusinessProfileToSupabase(profile: any) {
  try {
    const payload = {
      id: 'PRIMARY',
      companyName: profile.companyName || 'Arcenol Energy Private Limited',
      shortName: profile.shortName || 'ARCENOL',
      establishedYear: profile.establishedYear || '2018',
      industrySector: profile.industrySector || 'Energy Storage',
      contactEmail: profile.contactEmail || 'ops-admin@arcenol.com',
      phone: profile.phone || '+91 79 4028 9200',
      website: profile.website || 'www.arcenol.com',
      cin: profile.cin || 'U31900GJ2018PTC102145',
      gstin: profile.gstin || '24AAHCA9192M1ZP',
      address: profile.address || 'Arcenol Tower, Gujarat',
      manufacturingCapacity: profile.manufacturingCapacity || '12,000 MWh / Year',
      leadAcidOutput: profile.leadAcidOutput || '260,000 MT / Year',
      depotsCount: Number(profile.depotsCount || 5),
      primaryRegion: profile.primaryRegion || 'WEST_SOUTH',
      complianceOfficer: profile.complianceOfficer || 'Dr. Ananya Sharma',
      nodePassphrase: profile.nodePassphrase || 'ARC-NODE-SECURE',
      logo: profile.logo || '',
      loginLeftImage: profile.loginLeftImage || ''
    };
    await supabase.from('arcenol_business_profile').upsert([payload], { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to sync business profile to Supabase:', err);
    }
  }
}

export async function syncPurchaseOrderToSupabase(po: any) {
  try {
    const payload = {
      id: String(po.id),
      material_id: po.materialId || po.material_id || null,
      material_name: po.materialName || po.material_name || 'Raw Material Component',
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
    await supabase.from('purchase_orders').upsert(payload, { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to sync purchase order to Supabase:', err);
    }
  }
}

export async function deletePurchaseOrderFromSupabase(id: string) {
  try {
    await supabase.from('purchase_orders').delete().eq('id', id);
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to delete purchase order from Supabase:', err);
    }
  }
}

export async function syncProcurementEntryToSupabase(proc: any) {
  try {
    const payload = {
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
    await supabase.from('procurement_entries').upsert(payload, { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to sync procurement entry to Supabase:', err);
    }
  }
}

export async function deleteClientRecord(tableName: string, id: string) {
  if (!tableName || !id) return;
  try {
    await supabase.from(tableName).delete().eq('id', id);
  } catch (err) {
    console.warn(`[Client Supabase Sync] Warning deleting from ${tableName}:`, err);
  }
}

export async function deleteClientRecordBatch(tableName: string, ids: string[]) {
  if (!tableName || !ids || ids.length === 0) return;
  try {
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      await supabase.from(tableName).delete().in('id', chunk);
    }
  } catch (err) {
    console.warn(`[Client Supabase Sync] Warning batch deleting from ${tableName}:`, err);
  }
}

export async function clearClientTable(tableName: string) {
  if (!tableName) return;
  try {
    await supabase.from(tableName).delete().neq('id', '___PURGE_ALL_NON_MATCHING___');
  } catch (err) {
    console.warn(`[Client Supabase Sync] Warning clearing table ${tableName}:`, err);
  }
}

export async function syncUserToSupabase(user: any) {
  if (!user || !user.id) return;
  try {
    const payload = {
      id: String(user.id),
      name: user.name || 'Operator',
      role: user.role || 'QUALITY_TEAM',
      department: user.department || '',
      email: user.email || '',
      password: user.password || 'password123',
      updated_at: new Date().toISOString()
    };
    await supabase.from('arcenol_users').upsert([payload], { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to sync user to Supabase:', err);
    }
  }
}

export async function syncUsersToSupabase(users: any[]) {
  if (!Array.isArray(users) || users.length === 0) return;
  try {
    const payloads = users.map(u => ({
      id: String(u.id),
      name: u.name || 'Operator',
      role: u.role || 'QUALITY_TEAM',
      department: u.department || '',
      email: u.email || '',
      password: u.password || 'password123',
      updated_at: new Date().toISOString()
    }));
    await supabase.from('arcenol_users').upsert(payloads, { onConflict: 'id' });
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to sync users to Supabase:', err);
    }
  }
}

export async function deleteUserFromSupabase(id: string) {
  if (!id) return;
  try {
    await supabase.from('arcenol_users').delete().eq('id', id);
  } catch (err: any) {
    if (!String(err?.message || err).includes('fetch failed')) {
      console.warn('Failed to delete user from Supabase:', err);
    }
  }
}


