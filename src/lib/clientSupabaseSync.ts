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
      if (invErr) {
        console.warn('[Client Supabase Sync] Inventory query notice:', invErr);
      }
      if (inv && inv.length > 0) {
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
      const { data: graded } = await supabase.from('graded_cells').select('*');
      if (graded && graded.length > 0) {
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
      const { data: wip } = await supabase.from('wip_inventory').select('*');
      if (wip && wip.length > 0) {
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
      const { data: whs } = await supabase.from('warehouses').select('*');
      if (whs && whs.length > 0) {
        db.warehouses = whs.map((w: any) => w.name || w.location || String(w));
      }
    } catch (whCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating warehouses:', whCatchErr);
    }

    // 5. Customers / Dealers
    try {
      const { data: custs } = await supabase.from('customers').select('*');
      if (custs && custs.length > 0) {
        db.dealers = custs.map((c: any) => ({
          id: String(c.id),
          company: c.company || c.name || c.company_name || 'Dealer',
          category: c.category || 'Tier 1 Dealer',
          region: c.region || c.branch || 'Headquarters',
          gstin: c.gstin || 'N/A',
          contactPerson: c.contact_person || c.contactPerson || 'N/A',
          phone: c.phone || 'N/A',
          email: c.email || 'N/A',
          location: c.location || c.address || 'N/A',
          city: c.city || 'N/A',
          state: c.state || 'N/A',
          creditLimit: Number(c.credit_limit || c.creditLimit || 500000),
          outstandingBalance: Number(c.outstanding_balance || c.outstandingBalance || 0),
          status: c.status || 'ACTIVE'
        }));
      }
    } catch (custCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating customers:', custCatchErr);
    }

    // 6. Invoices
    try {
      const { data: invs } = await supabase.from('invoices').select('*');
      if (invs && invs.length > 0) {
        db.invoices = invs.map((i: any) => ({
          id: String(i.id),
          customerId: i.customer_id || i.customerId,
          billerSignature: i.biller_signature || i.billerSignature,
          goods: Array.isArray(i.goods) ? i.goods : [],
          subtotal: Number(i.subtotal || 0),
          discount: Number(i.discount || 0),
          gst: Number(i.gst || 0),
          grandTotal: Number(i.grand_total || i.grandTotal || 0),
          paymentMode: i.payment_mode || i.paymentMode,
          status: i.status
        }));
      }
    } catch (invsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating invoices:', invsCatchErr);
    }

    // 7. Complaints
    try {
      const { data: comps } = await supabase.from('complaints').select('*');
      if (comps && comps.length > 0) {
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

    // 8. Lead Inquiries
    try {
      const existingLeadsMap = new Map((db.leads || []).map((item: any) => [String(item.id), item]));
      const { data: leads } = await supabase.from('lead_inquiries').select('*');
      if (leads && leads.length > 0) {
        const fetchedIds = new Set(leads.map((l: any) => String(l.id)));
        const mappedLeads = leads.map((l: any) => {
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
            status: l.status || existing?.status || 'NEW',
            notes: l.notes || existing?.notes || '',
            remarksLog: l.remarks_log || l.remarksLog || existing?.remarksLog || []
          };
        });
        const localOnly = (db.leads || []).filter((item: any) => !fetchedIds.has(String(item.id)));
        db.leads = [...mappedLeads, ...localOnly];
      }
    } catch (leadsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating lead inquiries:', leadsCatchErr);
    }

    // 9. Categories
    try {
      const { data: cats } = await supabase.from('categories').select('*');
      if (cats && cats.length > 0) {
        db.categories = cats.map((c: any) => c.name || c.title || String(c));
      }
    } catch (catsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating categories:', catsCatchErr);
    }

    // 10. BOM Blueprints
    try {
      const { data: boms } = await supabase.from('bom_blueprints').select('*');
      if (boms && boms.length > 0) {
        db.products = boms.map((b: any) => ({
          id: String(b.model_id || b.id),
          name: b.name,
          category: b.category_group || b.category,
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
      }
    } catch (bomsCatchErr) {
      console.warn('[Client Supabase Sync] Error hydrating bom_blueprints:', bomsCatchErr);
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
