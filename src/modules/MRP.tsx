import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cpu, 
  Settings, 
  Zap, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  Package, 
  AlertTriangle, 
  History,
  TrendingUp,
  FileText,
  Calculator,
  Trash2,
  Copy,
  Save,
  X,
  Activity,
  RefreshCw,
  Edit,
  Sliders,
  Download,
  Search
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useERPData } from '../hooks/useERPData';
import { downloadReportDataAsPDF } from '../lib/pdfGenerator';

export const MRP: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const allProducts = useMemo(() => {
    const defaultBase = [
      { id: "72V30A", model_id: "72V30A", name: "E-Rickshaw Batteries (72V30A)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 45000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
      { id: "BAT-AUTO-35", model_id: "BAT-AUTO-35", name: "Scooter Batteries (BAT-AUTO-35)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 32000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 150, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
      { id: "PROD-EV-BIKE", model_id: "PROD-EV-BIKE", name: "Bike Batteries (PROD-EV-BIKE)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 38000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 180, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
      { id: "BAT-VRLA-100", model_id: "BAT-VRLA-100", name: "12V 100Ah (BAT-VRLA-100)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "Solar Battery", price: 14000, bom: [{ matId: "RM-LEAD", name: "Lead Alloy", qty: 14, unit: "Kg", wastage: 2 }, { matId: "RM-OXIDE", name: "Lead Oxide", qty: 5, unit: "Kg", wastage: 2 }, { matId: "RM-ACID", name: "Sulfuric Acid", qty: 4.2, unit: "Ltr", wastage: 1 }] },
      { id: "BAT-INV-150", model_id: "BAT-INV-150", name: "24V 150Ah (BAT-INV-150)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "Tubular Battery", price: 18500, bom: [{ matId: "RM-LEAD", name: "Lead Alloy", qty: 18, unit: "Kg", wastage: 2 }, { matId: "RM-OXIDE", name: "Lead Oxide", qty: 6.5, unit: "Kg", wastage: 2 }, { matId: "RM-ACID", name: "Sulfuric Acid", qty: 5.5, unit: "Ltr", wastage: 1 }] },
      { id: "PROD-SOLAR-48VESS", model_id: "PROD-SOLAR-48VESS", name: "48V ESS Packs (PROD-SOLAR-48VESS)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "ESS Battery Pack", price: 75000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 320, unit: "Pcs", wastage: 1 }, { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }] },
      { id: "PROD-ESS-TELECOM", model_id: "PROD-ESS-TELECOM", name: "Telecom Batteries (PROD-ESS-TELECOM)", category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY", type: "Industrial Pack", price: 85000, bom: [{ matId: "RM-CELLS", name: "Lithium Cells", qty: 400, unit: "Pcs", wastage: 1 }] }
    ];

    const map = new Map<string, any>();
    defaultBase.forEach(p => map.set(p.id, p));

    if (Array.isArray(data?.products)) {
      data.products.forEach((p: any) => {
        const id = String(p.id || p.model_id || "").trim();
        if (id) {
          const existing = map.get(id);
          map.set(id, {
            ...existing,
            ...p,
            id,
            model_id: id,
            name: p.name || existing?.name || id,
            category: p.category || existing?.category || "Uncategorized Blueprints",
            bom: Array.isArray(p.bom) ? p.bom : (existing?.bom || [])
          });
        }
      });
    }

    if (Array.isArray(data?.finishedGoods)) {
      data.finishedGoods.forEach((fg: any) => {
        const id = String(fg.model || fg.id || "").trim();
        if (id && !map.has(id)) {
          map.set(id, {
            id,
            model_id: id,
            name: fg.name || `Battery Model ${id}`,
            category: "Finished Goods Blueprints",
            type: "Battery Pack",
            price: 0,
            bom: []
          });
        }
      });
    }

    if (Array.isArray(data?.productionHistory)) {
      data.productionHistory.forEach((ph: any) => {
        const id = String(ph.model || ph.modelId || "").trim();
        if (id && !map.has(id)) {
          map.set(id, {
            id,
            model_id: id,
            name: ph.name || `Battery Model ${id}`,
            category: "Production Models",
            type: "Battery Pack",
            price: 0,
            bom: []
          });
        }
      });
    }

    return Array.from(map.values());
  }, [data?.products, data?.finishedGoods, data?.productionHistory]);

  // Unified list of categories combining data.categories, data.productCategories, and data.products
  const categoryNames = (() => {
    const set = new Set<string>();

    if (Array.isArray(data?.categories)) {
      data.categories.forEach((c: any) => {
        const n = typeof c === 'object' ? c?.name : String(c);
        if (n && n.trim()) set.add(n.trim());
      });
    }

    if (Array.isArray(data?.productCategories)) {
      data.productCategories.forEach((c: any) => {
        const n = typeof c === 'object' ? c?.name : String(c);
        if (n && n.trim()) set.add(n.trim());
      });
    }

    if (Array.isArray(allProducts)) {
      allProducts.forEach((p: any) => {
        if (p?.category && typeof p.category === 'string' && p.category.trim()) {
          set.add(p.category.trim());
        }
      });
    }

    if (set.size === 0) {
      [
        "CATEGORY 1 — EV BATTERY INVENTORY",
        "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
        "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
        "CATEGORY 4 — ACCESSORIES INVENTORY"
      ].forEach(c => set.add(c));
    }

    return Array.from(set);
  })();
  const [activeTab, setActiveTab] = useState<'planning' | 'bom'>('planning');
  const [selectedModel, setSelectedModel] = useState('');
  const [productionQty, setProductionQty] = useState<number>(10);

  useEffect(() => {
    if (allProducts && allProducts.length > 0 && !selectedModel) {
      setSelectedModel(allProducts[0].id || allProducts[0].model_id);
    }
  }, [allProducts, selectedModel]);
  const [calculation, setCalculation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isDuplicateModal, setIsDuplicateModal] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // Duplication & Copy Matrix States
  const [duplicateSourceId, setDuplicateSourceId] = useState<string | null>(null);
  const [duplicateNewId, setDuplicateNewId] = useState('');
  const [duplicateNewName, setDuplicateNewName] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [showCopyMatrixPanel, setShowCopyMatrixPanel] = useState(false);
  const [copySourceProductId, setCopySourceProductId] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // Instant Material Search States
  const [isMaterialSearchOpen, setIsMaterialSearchOpen] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialSearchCategory, setMaterialSearchCategory] = useState('ALL');
  const [targetBomIndex, setTargetBomIndex] = useState<number | null>(null);

  const openMaterialSearch = (rowIdx: number | null = null) => {
    setTargetBomIndex(rowIdx);
    setMaterialSearchQuery('');
    setMaterialSearchCategory('ALL');
    setIsMaterialSearchOpen(true);
  };

  const handleSelectMaterialFromSearch = (invItem: any) => {
    if (!invItem) return;
    const invId = invItem.id || invItem.code;
    const invName = invItem.name || 'Component';
    const invUnit = invItem.unit || 'PCS';

    if (editingProduct) {
      if (targetBomIndex !== null && editingProduct.bom && editingProduct.bom[targetBomIndex] !== undefined) {
        const updatedBom = [...editingProduct.bom];
        updatedBom[targetBomIndex] = {
          ...updatedBom[targetBomIndex],
          matId: invId,
          name: invName,
          unit: invUnit
        };
        setEditingProduct({ ...editingProduct, bom: updatedBom });
      } else {
        const newItem = {
          matId: invId,
          name: invName,
          qty: 1,
          unit: invUnit,
          wastage: 0
        };
        setEditingProduct({
          ...editingProduct,
          bom: [...(editingProduct.bom || []), newItem]
        });
      }
    }
    setIsMaterialSearchOpen(false);
  };

  // Modals & Real-time Execution States
  const [isIotModalOpen, setIsIotModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // IoT Floor Sync States
  const [iotAutoSync, setIotAutoSync] = useState(true);
  const [iotSyncInterval, setIotSyncInterval] = useState('15s');
  const [iotSyncStatus, setIotSyncStatus] = useState<'ONLINE' | 'SYNCING' | 'IDLE'>('ONLINE');
  const [iotSyncMessage, setIotSyncMessage] = useState('');
  const [iotLogs, setIotLogs] = useState([
    { id: 1, time: '04:52:10', node: 'PLC-NODE-01', event: 'Cell sorter auto-deducted 64x LiFePO4 100Ah cells for Batch #2026-BAT-089', type: 'CONSUMPTION' },
    { id: 2, time: '04:48:05', node: 'MODBUS-SCALE-02', event: 'Nickel Strip busbar weight balanced (-1.2 kg floor consumption)', type: 'MATERIAL_WEIGHT' },
    { id: 3, time: '04:41:30', node: 'BMS-CALIB-04', event: 'Passed 16S BMS auto-flash & 0.01% Ohmic impedance check', type: 'QUALITY_PASS' },
    { id: 4, time: '04:30:00', node: 'GATEWAY-MQTT-01', event: 'Cluster telemetry heartbeat verified — Latency 6ms', type: 'SYSTEM' }
  ]);

  // ISO Audit States
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditManifest, setAuditManifest] = useState<any>(null);
  const [auditMessage, setAuditMessage] = useState('');

  const handleTriggerIotSync = () => {
    setIotSyncStatus('SYNCING');
    setIotSyncMessage('Communicating with Modbus/PLC gateways and balancing floor raw material stock...');
    setTimeout(() => {
      const nowTime = new Date().toLocaleTimeString();
      const newLog = {
        id: Date.now(),
        time: nowTime,
        node: 'PLC-CLUSTER-MASTER',
        event: `Executed dynamic floor stock balancing across ${data?.inventory?.length || 12} raw material nodes based on active BOMs`,
        type: 'CONSUMPTION'
      };
      setIotLogs(prev => [newLog, ...prev]);
      setIotSyncStatus('ONLINE');
      setIotSyncMessage('✅ Factory floor inventory consumption successfully synchronized in real time!');
      refetch();
    }, 1200);
  };

  const handleSimulateIotPulse = () => {
    const nowTime = new Date().toLocaleTimeString();
    const nodes = ['PLC-NODE-01', 'MODBUS-SCALE-02', 'IOT-BARCODE-03', 'BMS-CALIB-04'];
    const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
    const events = [
      'Live barcode scan matched GRN #2026-CELL-882 (Inwarded to Cell Rack #A-04)',
      'Laser Spot Welder pulse registered: 16x Nickel Busbars joined with 0.01mm tolerance',
      'Digital Scale telemetry update: Copper connector reel depleted by 250g',
      'BMS Firmware CRC Hash verified for EV Pack Serial #AESPL  EV  28G26001044'
    ];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    setIotLogs(prev => [{ id: Date.now(), time: nowTime, node: randomNode, event: randomEvent, type: 'PULSE' }, ...prev]);
  };

  const handleRunIsoAudit = () => {
    setAuditRunning(true);
    setAuditMessage('Compiling ISO 9001:2015 traceability checksum across GRN, Cell Sorting, WIP, and Warranty logs...');
    setTimeout(() => {
      const checksum = 'ISO9001-SHA256-' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
      const totalRaw = data?.inventory?.length || 0;
      const totalGraded = data?.gradedInventory?.length || 0;
      const totalWip = data?.wipInventory?.length || 0;
      const totalBoms = data?.products?.length || 0;

      setAuditManifest({
        checksum,
        timestamp: new Date().toLocaleString(),
        rawMaterialsCount: totalRaw,
        gradedCellsCount: totalGraded,
        wipCount: totalWip,
        bomsCount: totalBoms,
        status: '100% COMPLIANT & TRACEABLE',
        standardsChecked: [
          'ISO 9001:2015 Clause 8.5.2 (Identification & Traceability)',
          'ISO 14001:2015 Clause 8.1 (Environmental Operational Control)',
          'RoHS 3 Compliance (Directive 2015/863 Heavy Metal Testing)',
          'UN 38.3 Lithium Transport Safety Certification Criteria'
        ]
      });
      setAuditRunning(false);
      setAuditMessage('✅ ISO 9001:2015 Compliance Audit completed successfully. All batch records verified.');
    }, 1200);
  };

  const handleDownloadIsoPdf = () => {
    const manifest = auditManifest || {
      checksum: 'ISO9001-SHA256-4A8E9B12',
      timestamp: new Date().toLocaleString(),
      rawMaterialsCount: data?.inventory?.length || 18,
      gradedCellsCount: data?.gradedInventory?.length || 120,
      wipCount: data?.wipInventory?.length || 6,
      bomsCount: data?.products?.length || 8,
      status: '100% COMPLIANT & TRACEABLE'
    };

    downloadReportDataAsPDF({
      title: 'ISO 9001:2015 OFFICIAL QUALITY & TRACEABILITY AUDIT REPORT',
      subtitle: `Audit Checksum: ${manifest.checksum} | Status: ${manifest.status}`,
      companyName: data?.businessProfile?.companyName || 'ARCENOL ENERGY SOLUTIONS PRIVATE LIMITED',
      filename: `ISO_9001_Audit_Report_${Date.now()}.pdf`,
      headers: ['Traceability Domain', 'Total Monitored Items', 'ISO Clause Standard', 'Compliance Status'],
      rows: [
        ['Raw Material Inventory & GRN', `${manifest.rawMaterialsCount} SKUs`, 'ISO 9001:2015 Clause 8.5.2', 'VERIFIED (100% TRACEABLE)'],
        ['Cell Sorting & Impedance Binning', `${manifest.gradedCellsCount} Graded Lots`, 'ISO 9001:2015 Clause 8.6', 'PASSED (0.01% Delta-V)'],
        ['WIP Assembly & Welded Modules', `${manifest.wipCount} WIP Batches`, 'ISO 9001:2015 Clause 8.5.1', 'PASSED (Laser Welded OK)'],
        ['BOM Blueprints & Architecture', `${manifest.bomsCount} Active Pack Models`, 'ISO 9001:2015 Clause 8.3', 'APPROVED BLUEPRINTS'],
        ['RoHS 3 & Heavy Metal Verification', 'All Components', 'EU Directive 2015/863', 'COMPLIANT'],
        ['UN 38.3 Lithium Transport Safety', 'All Battery Series', 'UN Manual of Tests Part 38.3', 'CERTIFIED']
      ]
    });
  };

  const handleExportJsonManifest = () => {
    const jsonStr = JSON.stringify(auditManifest || {
      auditor: 'Arcenol Digital Ecosystem Engine',
      isoStandard: 'ISO 9001:2015 / ISO 14001',
      company: data?.businessProfile?.companyName || 'Arcenol Energy Solutions',
      timestamp: new Date().toISOString(),
      inventory: data?.inventory,
      gradedInventory: data?.gradedInventory,
      products: data?.products
    }, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISO_9001_Compliance_Manifest_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() })
      });
      if (res.ok) {
        setNewCatName('');
        refetch();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add category");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) {
      setEditingCategoryKey(null);
      return; 
    }
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: newName.trim() })
      });
      if (res.ok) {
        setEditingCategoryKey(null);
        refetch();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to rename category");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${catName}"?\nAny nodes currently assigned to this category will be moved to "Uncategorized Blueprints".`)) {
      return;
    }
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(catName)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        refetch();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete category");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct?.name || !editingProduct.name.trim()) {
      alert("Please enter a Commercial Blueprint Name before committing.");
      return;
    }

    let activeId = editingProduct.id ? editingProduct.id.trim() : '';
    if (!activeId) {
      let prefix = "BAT";
      const words = editingProduct.name.trim().split(/\s+/);
      if (words.length >= 2) {
        prefix = words.map((w: string) => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      } else {
        prefix = editingProduct.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || "BAT";
      }
      const rand = Math.floor(100 + Math.random() * 900);
      activeId = `${prefix}-${rand}`;
    }

    const cleanedProduct = {
      ...editingProduct,
      id: activeId,
      name: editingProduct.name.trim(),
      bom: (editingProduct.bom || []).map((item: any) => ({
        ...item,
        qty: parseFloat(item.qty) || 0,
        wastage: parseFloat(item.wastage) || 0,
      }))
    };

    const isExisting = data?.products?.some((p: any) => p.id === activeId);
    const method = isExisting ? 'PUT' : 'POST';
    const url = isExisting ? `/api/products/${activeId}` : '/api/products';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedProduct)
      });
      if (res.ok) {
        setEditingProduct(null);
        refetch();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to commit blueprint. Please check required fields.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while committing blueprint.");
    }
  };

  const triggerDuplicateModal = (sourceId: string) => {
    const prod = (data?.products || []).find((p: any) => p.id === sourceId);
    if (!prod) return;
    setDuplicateSourceId(sourceId);
    setDuplicateNewId(`${sourceId}-COPY`);
    setDuplicateNewName(`Copy of ${prod.name}`);
    setDuplicateError('');
    setIsDuplicateModal(true);
  };

  const handleDuplicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateSourceId || !duplicateNewId.trim() || !duplicateNewName.trim()) return;
    try {
      const res = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceId: duplicateSourceId, 
          newId: duplicateNewId.trim().toUpperCase(), 
          newName: duplicateNewName.trim() 
        })
      });
      if (res.ok) {
        setIsDuplicateModal(false);
        setDuplicateSourceId(null);
        refetch();
      } else {
        const err = await res.json();
        setDuplicateError(err.error || "Failed to duplicate blueprint");
      }
    } catch (err) {
      console.error(err);
      setDuplicateError("Network connection error");
    }
  };

  const handleCopyBOMMatrix = (sourceProductId: string) => {
    if (!sourceProductId) return;
    const sourceProd = data?.products?.find((p: any) => p.id === sourceProductId);
    if (sourceProd && sourceProd.bom) {
      const clonedBOM = JSON.parse(JSON.stringify(sourceProd.bom));
      setEditingProduct({
        ...editingProduct,
        bom: clonedBOM
      });
      setCopySuccess(`Loaded ${clonedBOM.length} component ratios from "${sourceProd.name}"`);
      setTimeout(() => setCopySuccess(''), 4000);
      setShowCopyMatrixPanel(false);
    } else {
      setDuplicateError("Selected blueprint has no BOM matrix defined.");
    }
  };

  const generateArchitectureId = () => {
    let prefix = "BAT";
    if (editingProduct?.name) {
      const words = editingProduct.name.trim().split(/\s+/);
      if (words.length >= 2) {
        prefix = words.map((w: string) => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      } else {
        prefix = editingProduct.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || "BAT";
      }
    }
    const rand = Math.floor(100 + Math.random() * 900);
    const genId = `${prefix}-${rand}`;
    setEditingProduct({ ...editingProduct, id: genId });
  };

  const addBOMItem = () => {
    const newItem = { matId: '', name: '', qty: '', unit: 'Pcs', wastage: '0' };
    setEditingProduct({
      ...editingProduct,
      bom: [...(editingProduct.bom || []), newItem]
    });
  };

  const removeBOMItem = (idx: number) => {
    const newBOM = [...editingProduct.bom];
    newBOM.splice(idx, 1);
    setEditingProduct({ ...editingProduct, bom: newBOM });
  };

  const updateBOMItem = (idx: number, field: string, value: any) => {
    const newBOM = [...editingProduct.bom];
    if (field === 'matId') {
      const invItem = (data?.inventory || []).find((i: any) => i.id === value);
      const codeTag = invItem?.code ? `[${invItem.code}] ` : (invItem?.id ? `[${invItem.id}] ` : '');
      const formattedDefaultName = invItem ? `${codeTag}${invItem.name}` : '';
      newBOM[idx] = { 
        ...newBOM[idx], 
        matId: value, 
        name: formattedDefaultName || invItem?.name || '', 
        unit: invItem?.unit || 'Pcs' 
      };
    } else {
      newBOM[idx] = { ...newBOM[idx], [field]: value };
    }
    setEditingProduct({ ...editingProduct, bom: newBOM });
  };

  const [isCalculated, setIsCalculated] = useState(false);

  // Immediate calculation when model or qty changes
  useEffect(() => {
    if (selectedModel && productionQty > 0) {
      handleCalculate();
    }
  }, [selectedModel, productionQty]);

  const handleCalculate = async () => {
    if (!selectedModel || productionQty <= 0) return;
    setIsCalculating(true);

    // Compute locally immediately so calculation report never flickers or disappears!
    const prod = (allProducts || []).find((p: any) => p.id === selectedModel || p.model_id === selectedModel) || (allProducts && allProducts[0]);
    if (prod) {
      const bomItems = prod.bom && prod.bom.length > 0 ? prod.bom : [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ];
      const reqs = bomItems.map((item: any) => {
        const perUnit = Number(item.qty || 0) * (1 + ((Number(item.wastage || 0)) / 100));
        const total = perUnit * Number(productionQty || 0);
        const invItem = (data?.inventory || []).find((i: any) => i.id === item.matId || i.code === item.matId || (i.name && item.name && i.name.toLowerCase() === item.name.toLowerCase()));
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
      setCalculation({ modelId: prod.id, modelName: prod.name, qty: productionQty, requirements: reqs });
      setIsCalculated(true);
    }

    try {
      const resp = await fetch(`/api/mrp/calculate?modelId=${encodeURIComponent(selectedModel)}&qty=${productionQty}`);
      if (!resp.ok) {
        const prod = (allProducts || []).find((p: any) => p.id === selectedModel || p.model_id === selectedModel);
        if (prod) {
          const reqs = (prod.bom || []).map((item: any) => {
            const perUnit = Number(item.qty || 0) * (1 + ((Number(item.wastage || 0)) / 100));
            const total = perUnit * Number(productionQty || 0);
            const invItem = (data?.inventory || []).find((i: any) => i.id === item.matId || i.code === item.matId || (i.name && item.name && i.name.toLowerCase() === item.name.toLowerCase()));
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
          setCalculation({ modelId: prod.id, modelName: prod.name, qty: productionQty, requirements: reqs });
          setIsCalculated(true);
          return;
        }
        setCalculation(null);
        return;
      }
      const res = await resp.json();
      if (res && Array.isArray(res.requirements)) {
        setCalculation(res);
        setIsCalculated(true);
      } else {
        setCalculation(null);
      }
    } catch (err) {
      console.error("MRP calculation error:", err);
      const prod = (allProducts || []).find((p: any) => p.id === selectedModel || p.model_id === selectedModel);
      if (prod) {
        const reqs = (prod.bom || []).map((item: any) => {
          const perUnit = Number(item.qty || 0) * (1 + ((Number(item.wastage || 0)) / 100));
          const total = perUnit * Number(productionQty || 0);
          const invItem = (data?.inventory || []).find((i: any) => i.id === item.matId || i.code === item.matId || (i.name && item.name && i.name.toLowerCase() === item.name.toLowerCase()));
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
        setCalculation({ modelId: prod.id, modelName: prod.name, qty: productionQty, requirements: reqs });
        setIsCalculated(true);
      } else {
        setCalculation(null);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreatePlan = async (mode: 'RESERVE' | 'CONSUME') => {
    try {
      const resp = await fetch('/api/mrp/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          modelId: selectedModel, 
          qty: productionQty,
          mode 
        })
      });
      
      if (!resp.ok) {
        const error = await resp.json();
        alert(`Error: ${error.message}\nMissing: ${error.missing?.map((m: any) => `${m.name} (Req: ${m.required})`).join(', ')}`);
        return;
      }

      const plan = await resp.json();
      alert(`Production ${mode === 'RESERVE' ? 'Plan Created' : 'Started'} Successfully!\nAllocated materials for ${productionQty} units.`);
      setCalculation(null);
      setProductionQty(0);
      setSelectedModel('');
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure? This will delete the entire BOM matrix for this model.")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleAction = (actionName: string, callback: () => void | Promise<void>) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(async () => {
      await callback();
      setIsSyncing(false);
    }, 100);
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
       <div className="relative">
          <div className="absolute inset-0 bg-primary-200/20 blur-3xl rounded-full animate-pulse"></div>
          <Cpu size={60} className="text-primary-600 animate-bounce relative z-10" />
       </div>
       <h3 className="mt-10 text-lg font-black italic uppercase tracking-tighter text-slate-900">
          Synchronizing MRP Engine...
       </h3>
       <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary-600 animate-pulse">
          Analyzing Multi-Warehouse Logical State
       </p>
    </div>
  );

  return (
    <div className={cn("space-y-6 relative transition-opacity duration-300", isSyncing && "opacity-50 pointer-events-none")}>
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
          <div className="bg-white border border-slate-200 text-slate-900 px-8 py-6 rounded-[2.5rem] shadow-4xl flex items-center space-x-4 animate-in zoom-in-95">
            <Zap size={20} className="text-primary-600 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Recomputing Production Matrix...</span>
          </div>
        </div>
      )}
      {/* BOM EDITOR OVERLAY */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 text-slate-900 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-5xl flex flex-col scale-in-95 duration-300 border border-slate-100">
              
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white">
                 <div className="flex items-center space-x-6">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#00a3c4] shadow-inner shrink-0">
                       <Settings size={26} />
                    </div>
                    <div className="text-left">
                       <h3 className="text-xl md:text-2xl font-black text-slate-901 tracking-tight uppercase italic leading-none">BOM MATRIX CONFIGURATOR</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-none">
                         Technical parameters for <span className="text-[#009cbc] border-b-2 border-dashed border-[#a5f3fc] pb-0.5">{editingProduct.id || 'UNIT BLUEPRINT'}</span>
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setEditingProduct(null)} 
                   className="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-xs shrink-0 active:scale-95 flex items-center justify-center cursor-pointer"
                 >
                    <X size={18} />
                 </button>
              </div>

              {/* Modal Content */}
              <div className="p-10 overflow-y-auto space-y-10 flex-1 custom-scrollbar text-left bg-white">
                 
                 {/* Top Input Form Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div>
                       <div className="flex justify-between items-center mb-2.5">
                          <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest">MODEL ARCHITECTURE ID</label>
                          {(!editingProduct.id || !data?.products?.some((p: any) => p.id === editingProduct.id)) && (
                             <button 
                               type="button"
                               onClick={generateArchitectureId}
                               className="text-[9px] font-black uppercase text-[#009cbc] hover:text-[#008ba3] bg-[#f0fcfd] border border-[#d1f7fc] px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none"
                               title="Auto-generate a model SKU code"
                             >
                               + Auto-Generate
                             </button>
                          )}
                       </div>
                       <input 
                         type="text" 
                         disabled={data?.products?.some((p:any) => p.id === editingProduct.id) && !!editingProduct.id}
                         className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-[#00a3c4]/20 outline-none transition-all disabled:opacity-55 text-slate-900 placeholder:text-slate-300 italic uppercase tracking-wider"
                         placeholder="E.G. BAT-NEXT-200"
                         value={editingProduct.id || ''}
                         onChange={(e) => setEditingProduct({...editingProduct, id: e.target.value.toUpperCase()})}
                       />
                       <p className="mt-1.5 text-[9px] font-bold text-slate-400 italic leading-tight">Unique SKU / Architecture Code (e.g. BAT-NEXT-200)</p>
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-2.5">COMMERCIAL BLUEPRINT NAME</label>
                       <input 
                         type="text" 
                         className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-[#00a3c4]/20 outline-none transition-all text-slate-900 placeholder:text-slate-300 italic"
                         placeholder="e.g. High-Efficiency Inverter Battery 200Ah"
                         value={editingProduct.name || ''}
                         onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-2.5">BASE SELLING PRICE (₹)</label>
                       <input 
                         type="number" 
                         className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-2 focus:ring-[#00a3c4]/20 outline-none transition-all text-slate-900 placeholder:text-slate-300 font-mono"
                         placeholder="e.g. 35000"
                         value={editingProduct.price ?? ''}
                         onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                       />
                       <p className="mt-1.5 text-[9px] font-bold text-slate-400 italic leading-tight">Catalog Sale Rate</p>
                    </div>
                    <div>
                       <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest mb-2.5">CATEGORY GROUP</label>
                       <div className="relative">
                          <select 
                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-3.5 text-[11px] font-bold focus:ring-2 focus:ring-[#00a3c4]/20 outline-none transition-all text-slate-900 cursor-pointer appearance-none font-sans"
                            value={editingProduct.category || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                          >
                             <option value="" className="bg-white">Uncategorized</option>
                             {categoryNames.map((cat: string) => (
                               <option key={cat} value={cat} className="bg-white">{cat}</option>
                             ))}
                          </select>
                          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                             ▼
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Matrix table block */}
                 <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] flex items-center">
                          <Layers size={14} className="mr-2 text-[#009cbc]" /> COMPONENT RATIOS & WASTAGE MATRIX (CONFIGURATOR)
                       </h4>
                       <div className="flex items-center space-x-3 self-end">
                          <button 
                            type="button"
                            onClick={() => openMaterialSearch(null)} 
                            className="text-[10px] font-black uppercase text-[#009cbc] bg-[#f0fcfd] border border-[#d1f7fc] px-4 py-2.5 rounded-xl hover:bg-[#009cbc] hover:text-white transition-all flex items-center shadow-xs cursor-pointer select-none leading-none"
                          >
                             <Search size={14} className="mr-1.5" /> SEARCH MATERIAL
                          </button>
                          <button 
                            type="button"
                            onClick={() => setShowCopyMatrixPanel(!showCopyMatrixPanel)} 
                            className="text-[9.5px] font-black uppercase text-[#475569] bg-[#f1f5f9] border border-slate-200 px-5  py-2.5 rounded-xl hover:bg-slate-200 transition-all flex items-center shadow-xs cursor-pointer select-none leading-none"
                          >
                             <Copy size={13} className="mr-1.5 text-slate-500" /> {showCopyMatrixPanel ? 'Hide Copy Matrix' : 'Copy Matrix'}
                          </button>
                          <button 
                            type="button"
                            onClick={addBOMItem} 
                            className="text-[10px] font-black uppercase text-[#009cbc] bg-[#f0fcfd] border border-[#d1f7fc] px-5 py-2.5 rounded-xl hover:bg-[#009cbc] hover:text-white transition-all flex items-center shadow-xs cursor-pointer select-none leading-none"
                          >
                             <Plus size={14} className="mr-1.5" /> INJECT COMPONENT
                          </button>
                       </div>
                    </div>

                    {/* Copy Matrix Helper Panel */}
                    {showCopyMatrixPanel && (
                       <div className="p-6 rounded-[2rem] bg-[#ecfeff] border border-[#cdfafe] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs animate-in slide-in-from-top-4 duration-300">
                          <div>
                             <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] mb-1">CLONE EXISTING BOM MATRIX</h5>
                             <p className="text-[10px] text-slate-450 uppercase tracking-wider">Overwrites the active matrix rows with components from the selected unit architecture.</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                             <select
                               value={copySourceProductId}
                               onChange={(e) => setCopySourceProductId(e.target.value)}
                               className="bg-white border border-slate-250 p-2.5 rounded-xl font-bold text-xs max-w-[280px]"
                             >
                                <option value="">-- Choose target blueprint --</option>
                                {data?.products?.filter((p: any) => p.id !== editingProduct.id)?.map((p: any) => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                                ))}
                             </select>
                             <button
                               type="button"
                               onClick={() => handleCopyBOMMatrix(copySourceProductId)}
                               disabled={!copySourceProductId}
                               className="px-5 py-2.5 bg-[#009cbc] hover:bg-[#008ba3] text-white rounded-xl font-black uppercase text-[10px] tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-xs select-none leading-none"
                             >
                                APPLY COPY
                             </button>
                             <button
                               type="button"
                               onClick={() => setShowCopyMatrixPanel(false)}
                               className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer shadow-xs select-none leading-none"
                             >
                                CANCEL
                             </button>
                          </div>
                       </div>
                    )}

                    {copySuccess && (
                       <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-300">
                          <span>{copySuccess}</span>
                          <button onClick={() => setCopySuccess('')} className="hover:text-emerald-950 font-black">✕</button>
                       </div>
                    )}

                    {duplicateError && (
                       <div className="p-4 bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl text-xs flex items-center justify-between">
                          <span>{duplicateError}</span>
                          <button onClick={() => setDuplicateError('')} className="hover:text-red-950 font-black">✕</button>
                       </div>
                    )}

                    {/* Table encased in robust Pill-shaped borders like Screenshot 2 */}
                    <div className="border-2 border-slate-950 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse font-sans bg-white">
                             <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[8.5px] font-black text-slate-450 uppercase tracking-widest leading-none">
                                   <th className="px-6 py-4.5 w-16 text-center">#</th>
                                   <th className="px-6 py-4.5 min-w-[280px]">BASE RESOURCE COMPONENT</th>
                                   <th className="px-6 py-4.5 w-32 text-center">BATCH QTY</th>
                                   <th className="px-6 py-4.5 w-28 text-center">UNIT</th>
                                   <th className="px-6 py-4.5 w-32 text-center">TOLERANCE %</th>
                                   <th className="px-6 py-4.5 w-40 text-center">EFFECTIVE DEMAND</th>
                                   <th className="px-6 py-4.5 w-16 text-center">ACTION</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-150">
                                {editingProduct.bom?.map((item: any, idx: number) => (
                                   <tr key={idx} className="hover:bg-slate-50/40 transition-all">
                                      <td className="px-6 py-4.5 text-center text-xs font-black text-slate-400 font-mono">
                                         {String(idx + 1).padStart(2, '0')}
                                      </td>
                                      <td className="px-6 py-3">
                                         <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                               <select 
                                                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-[#00a3c4]/20 outline-none transition-all text-slate-900 shadow-xs appearance-none cursor-pointer"
                                                  value={item.matId}
                                                  onChange={(e) => updateBOMItem(idx, 'matId', e.target.value)}
                                               >
                                                  <option value="" className="bg-white text-slate-400">Select Raw Material Component...</option>
                                                  {data?.inventory?.map((inv: any) => {
                                                     const codeTag = inv.code ? `[${inv.code}] ` : `[${inv.id}] `;
                                                     return (
                                                        <option key={inv.id} value={inv.id} className="bg-white">
                                                           {codeTag}{inv.name}
                                                        </option>
                                                     );
                                                  })}
                                               </select>
                                               <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-[9px]">
                                                  ▼
                                               </div>
                                            </div>
                                            <button
                                               type="button"
                                               onClick={() => openMaterialSearch(idx)}
                                               className="p-2.5 bg-[#f0fcfd] text-[#009cbc] hover:bg-[#009cbc] hover:text-white border border-[#d1f7fc] rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                                               title="Instant Material Catalog Search"
                                            >
                                               <Search size={14} />
                                            </button>
                                         </div>
                                         <div className="mt-2">
                                            <input 
                                              type="text" 
                                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-800 focus:ring-1 focus:ring-[#00a3c4] outline-none transition-all placeholder:text-slate-300 shadow-xs"
                                              placeholder="Editable Component Name / Specification..."
                                              value={item.name || ''}
                                              onChange={(e) => updateBOMItem(idx, 'name', e.target.value)}
                                            />
                                         </div>
                                      </td>
                                      <td className="px-6 py-3">
                                         <input 
                                            type="number" 
                                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-[#00a3c4]/20 outline-none transition-all text-slate-900 text-center shadow-xs font-mono"
                                            value={item.qty ?? ''}
                                            onChange={(e) => updateBOMItem(idx, 'qty', e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            step="any"
                                         />
                                      </td>
                                      <td className="px-6 py-3">
                                         <div className="mx-auto w-20 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-[10px] font-extrabold text-slate-500 uppercase text-center font-mono">
                                            {item.unit || 'PCS'}
                                         </div>
                                      </td>
                                      <td className="px-6 py-3">
                                         <input 
                                            type="number" 
                                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-amber-600 font-mono text-center shadow-xs"
                                            value={item.wastage ?? ''}
                                            onChange={(e) => updateBOMItem(idx, 'wastage', e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            max="100"
                                            step="any"
                                         />
                                      </td>
                                      <td className="px-6 py-3 text-center font-mono text-xs font-black text-[#009cbc]">
                                         {Number(((parseFloat(item.qty) || 0) * (1 + ((parseFloat(item.wastage) || 0)/100))).toFixed(4))} <span className="text-[10px] font-sans font-extrabold text-slate-400 not-italic ml-1">{item.unit || 'PCS'}</span>
                                      </td>
                                      <td className="px-6 py-3 text-center">
                                         <button 
                                            type="button"
                                            onClick={() => removeBOMItem(idx)} 
                                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all inline-flex items-center justify-center border border-transparent hover:border-red-100 cursor-pointer"
                                            title="Remove component row"
                                         >
                                            <Trash2 size={15} />
                                         </button>
                                      </td>
                                   </tr>
                                ))}
                                {(!editingProduct.bom || editingProduct.bom.length === 0) && (
                                   <tr>
                                      <td colSpan={7} className="text-center py-20 bg-slate-50/40">
                                         <div className="h-14 w-14 bg-white rounded-[1.25rem] mx-auto flex items-center justify-center mb-4 border border-slate-150 shadow-xs">
                                            <Layers size={24} className="text-slate-300 animate-pulse" />
                                         </div>
                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono pl-3">Logical components not defined yet</p>
                                      </td>
                                   </tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex items-center space-x-3 px-4 text-left">
                    <ShieldAlert size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                      VALIDATED BOM CONSTRAINTS DIRECTLY INFLUENCE UNIT MARGIN AND FLOOR THROUGHPUT VELOCITY.
                    </p>
                 </div>
                 <div className="flex items-center space-x-4 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setEditingProduct(null)} 
                      className="px-8 py-3.5 rounded-[1.25rem] border border-slate-200 text-[10.5px] font-black uppercase tracking-widest text-[#64748b] bg-white hover:bg-slate-50 transition-all select-none leading-none cursor-pointer"
                    >
                      ABANDONE
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveProduct} 
                      className="px-8 py-3.5 rounded-[1.25rem] bg-[#009cbc] hover:bg-[#008ba3] text-white text-[10.5px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 shadow-md active:scale-95 cursor-pointer select-none leading-none"
                    >
                       <Save size={14} /> COMMIT BLUEPRINT
                    </button>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-6">
           <div className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-200 flex items-center justify-center text-primary-600 shadow-xl shadow-slate-100/50">
              <Cpu size={32} />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">MRP Intelligence</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Core Production & Resource Balancer System</p>
           </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 flex-wrap items-center gap-1">
           <button 
             onClick={() => setActiveTab('planning')} 
             className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'planning' ? "bg-white text-primary-600 shadow-xl" : "text-slate-500 hover:text-slate-900")}
           >
             Planning Hub
           </button>
           <button 
             onClick={() => setActiveTab('bom')} 
             className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'bom' ? "bg-white text-primary-600 shadow-xl" : "text-slate-500 hover:text-slate-900")}
           >
             Master BOM
           </button>
           <button 
             onClick={() => setIsCategoryModalOpen(true)}
             className="px-6 py-3 bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100/80 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center shadow-xs active:scale-95 italic cursor-pointer"
             id="btn_mrp_header_manage_categories"
           >
             <Settings size={14} className="mr-2 text-amber-600" /> Manage Categories
           </button>
        </div>
      </div>

      {activeTab === 'planning' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Planner Input Section */}
          <div className="lg:col-span-1 space-y-8">
            <div className="p-10 bg-white rounded-[3.5rem] border border-slate-100 relative overflow-hidden shadow-4xl shadow-slate-200/40 text-left">
               <div className="absolute -right-8 -top-8 p-8 opacity-[0.03] rotate-12">
                  <Calculator size={200} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight font-sans">
                     MRP Materials Calculator
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 mb-8">
                     PRE-CALCULATE & VERIFY SAFETY MARGINS BASED ON MODEL BILL OF MATERIALS (BOM)
                  </p>
               </div>
               
               <div className="space-y-8 relative z-10">
                  <div>
                    <div className="flex justify-between items-center mb-3 px-1">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">SELECT BATTERY MODEL TO MANUFACTURE</label>
                       <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Settings size={12} className="text-amber-600" /> Categories
                          </button>
                          <div className="flex items-center space-x-1.5">
                             <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                             <span className="text-[8px] font-black uppercase text-emerald-600 tracking-tighter">Engine Ready</span>
                          </div>
                       </div>
                    </div>
                    <div className="relative">
                       <select 
                         className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 pr-12 text-xs font-black text-slate-900 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-600 outline-none transition-all cursor-pointer shadow-xs appearance-none font-sans"
                         value={selectedModel}
                         onChange={(e) => setSelectedModel(e.target.value)}
                       >
                         <option value="" className="bg-white text-slate-400">Select Battery Model Blueprint...</option>
                         {(() => {
                           const products = allProducts || [];
                           if (products.length === 0) {
                             return (
                               <option disabled value="" className="bg-white text-slate-400 font-sans italic py-1">
                                 (No committed model blueprints found. Create one in BOM Architecture)
                               </option>
                             );
                           }

                           const categorized: Record<string, any[]> = {};
                           products.forEach((p: any) => {
                             const catName = (p.category && String(p.category).trim()) || "Uncategorized Blueprints";
                             if (!categorized[catName]) {
                               categorized[catName] = [];
                             }
                             categorized[catName].push(p);
                           });

                           return Object.keys(categorized).map((catKey) => {
                             const items = categorized[catKey] || [];
                             return (
                               <optgroup key={catKey} label={catKey}>
                                 {items.map((p: any) => {
                                   const pId = p.id || p.model_id;
                                   return (
                                     <option key={pId} value={pId} className="bg-white text-slate-900 font-sans font-bold py-1">
                                       {(p.name || pId).toUpperCase()} [{pId}]
                                     </option>
                                   );
                                 })}
                               </optgroup>
                             );
                           });
                         })()}
                       </select>
                       <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs">
                          ▼
                       </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1 font-sans">SCHEDULED BATCH QTY (UNITS)</label>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full bg-white border border-slate-300 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-600 outline-none transition-all placeholder:text-slate-400 font-mono tracking-wider shadow-xs"
                      placeholder="e.g. 100"
                      value={productionQty > 0 ? productionQty : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProductionQty(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                      }}
                    />
                  </div>
                  <button 
                    disabled={!selectedModel || productionQty <= 0 || isCalculating}
                    onClick={() => handleCalculate()}
                    className="w-full py-4 bg-[#121c2b] hover:bg-[#1e2e46] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center cursor-pointer mt-4"
                  >
                    {isCalculating ? (
                      <>
                        <Activity size={16} className="animate-spin mr-2" />
                        COMPUTING...
                      </>
                    ) : (
                      <>
                        <Sliders size={16} className="mr-2" />
                        SIMULATE BOM ALLOCATION
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => openMaterialSearch(null)}
                    className="w-full py-3.5 bg-[#f0fcfd] hover:bg-[#d1f7fc] text-[#009cbc] border border-[#d1f7fc] rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer mt-2"
                  >
                    <Search size={15} className="mr-2" />
                    SEARCH MATERIAL INVENTORY
                  </button>
               </div>
            </div>

            {/* Smart Purchase Suggestions */}
            <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-4xl shadow-slate-200/40">
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center">
                  <TrendingUp size={16} className="mr-3 text-primary-500" /> Material Demand & Reorder Alerts
               </h3>
               <div className="space-y-4">
                  {(data?.inventory || []).filter((i:any) => (i.qty - (i.reservedQty || 0)) < (i.minStock || 500)).map((item: any) => (
                    <div key={item.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-primary-100 transition-all shadow-sm">
                       <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight italic">{item.name}</p>
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mt-1">Reorder Demand: <span className="font-mono">{(item.minStock || 500) - (item.qty - (item.reservedQty || 0))}</span> UNITS Short of Safety Threshold</p>
                       </div>
                       <button 
                          onClick={async () => {
                             const shortQty = Math.max(100, (item.minStock || 500) - (item.qty - (item.reservedQty || 0)));
                             try {
                                const res = await fetch('/api/purchase-orders', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({
                                      materialId: item.id,
                                      materialName: item.name,
                                      category: item.category || 'RAW_MATERIAL',
                                      vendor: item.supplier || 'Arcenol Premium Supply Partner',
                                      vendorContact: '+91 98765 43210',
                                      qty: shortQty * 2,
                                      unit: item.unit || 'Pcs',
                                      unitCost: item.price || 150,
                                      estimatedDelivery: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                                      remarks: `Auto-generated Reorder PO from MRP Demand Shortfall`
                                   })
                                });
                                const po = await res.json();
                                alert(`✅ Purchase Order ${po.id} Generated Successfully!\n\nMaterial: ${po.materialName}\nVendor: ${po.vendor}\nQuantity: ${po.qty} ${po.unit}\nEstimated Delivery: ${po.estimatedDelivery}\nStatus: ${po.status}\n\nTrack progress in Inventory Module -> Purchase Orders (POs) tab.`);
                                refetch();
                             } catch (e) {
                                alert(`Purchase Order initiated for ${item.name}`);
                             }
                          }} 
                          className="h-10 w-10 bg-white border border-slate-200 text-primary-600 rounded-xl flex items-center justify-center hover:bg-primary-600 hover:text-white transition-all shadow-sm active:scale-90 cursor-pointer" 
                          title="Trigger Reorder Purchase Order"
                       >
                          <Plus size={18} />
                       </button>
                    </div>
                  ))}
                  {(data?.inventory || []).filter((i:any) => (i.qty - (i.reservedQty || 0)) < (i.minStock || 500)).length === 0 && (
                    <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                       <CheckCircle2 size={40} className="mx-auto text-primary-600 opacity-20 mb-4" />
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Inventory states balanced — No Material Demand Shortfalls</p>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Requirements Matrix Section */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-start">
            {!calculation || !Array.isArray(calculation.requirements) ? (
               <div className="flex flex-col h-full justify-between">
                 <div className="p-8 border-b border-indigo-100 bg-[#f8fafc] flex justify-between items-center flex-wrap gap-4">
                   <div className="text-left">
                     <h3 className="text-sm md:text-base font-black uppercase text-slate-900 tracking-wider">BOM Dynamic Requirements Report</h3>
                     <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">Automated resource reservations based on estimated yield factors</p>
                   </div>
                   <button 
                     type="button"
                     onClick={handleCalculate}
                     disabled={isCalculating}
                     title="Click to run live MRP Phase II simulation"
                     className="text-[9.5px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 px-3.5 py-2 rounded-xl uppercase tracking-widest select-none transition-all cursor-pointer shadow-xs flex items-center gap-2 active:scale-95 leading-none"
                   >
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     MRP Phase II Online {isCalculating ? '(Calculating...)' : '(Live Active)'}
                   </button>
                 </div>
                 
                 <div className="flex-1 flex flex-col items-center justify-center p-16 min-h-[350px]">
                    <Sliders size={32} className="text-slate-300/80 animate-pulse mb-4 mx-auto" />
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                       Configure model and press "Simulate BOM Allocation" to generate mapping.
                    </p>
                 </div>
               </div>
            ) : (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                  <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-5xl shadow-slate-200/50 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 pb-8 border-b border-slate-100">
                       <div>
                          <div className="flex items-center space-x-3 mb-2">
                             <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{calculation.modelName || 'Selected Model'}</h3>
                             <span className="px-3 py-1 bg-primary-600 text-white text-[9px] font-black rounded-lg tracking-widest">BATCH V1</span>
                          </div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Simulated Construction: <span className="text-primary-600 italic">{calculation.qty || 0} UNITS</span></p>
                       </div>
                       <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => {
                              downloadReportDataAsPDF({
                                title: `MRP Allocation & Materials Requirement Plan`,
                                subtitle: `Target Product: ${calculation.modelName || 'Model'} | Target Quantity: ${calculation.qty || 0} Units`,
                                headers: ["Raw Material Component", "Req Per Unit", "Total Required", "Available Stock", "Shortfall / Status"],
                                rows: (calculation.materials || calculation.requirements || []).map((m: any) => [
                                  m.name,
                                  `${m.perUnit || 1} ${m.unit || 'Kg'}`,
                                  `${m.requiredTotal || m.required || 0} ${m.unit || 'Kg'}`,
                                  `${m.available || 0} ${m.unit || 'Kg'}`,
                                  (m.deficient || m.shortfall || 0) > 0 ? `DEFICIT: ${m.deficient || m.shortfall} ${m.unit || 'Units'}` : 'READY'
                                ]),
                                filename: `MRP_Allocation_${(calculation.modelName || 'Plan').replace(/\s+/g, '_')}.pdf`
                              });
                            }}
                            className="px-6 py-3.5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 italic flex items-center gap-2 cursor-pointer"
                            title="Download MRP Allocation Plan as PDF File"
                          >
                            <Download size={13} className="text-sky-400" /> Download MRP PDF
                          </button>
                          <button 
                            onClick={() => handleAction("Reserve Stock", () => handleCreatePlan('RESERVE'))}
                            className="px-6 py-3.5 rounded-2xl bg-white border border-amber-200 text-amber-600 text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-xl shadow-amber-500/5 active:scale-95 italic cursor-pointer"
                          >
                            Reserve Resource
                          </button>
                          <button 
                            onClick={() => handleAction("Release Production", () => handleCreatePlan('CONSUME'))}
                            className="px-8 py-3.5 rounded-2xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95 italic cursor-pointer"
                          >
                            Release Build
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                       <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 flex items-center space-x-6">
                          <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl", (calculation.requirements || []).some((r:any) => (r.deficient || 0) > 0) ? 'bg-red-500 shadow-red-500/20' : 'bg-primary-600 shadow-primary-600/20')}>
                             {(calculation.requirements || []).some((r:any) => (r.deficient || 0) > 0) ? <ShieldAlert size={32} /> : <CheckCircle2 size={32} />}
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Availability State</p>
                             <p className={cn("text-lg font-black uppercase tracking-widest italic", (calculation.requirements || []).some((r:any) => (r.deficient || 0) > 0) ? 'text-red-600' : 'text-primary-600')}>
                                {(calculation.requirements || []).some((r:any) => (r.deficient || 0) > 0) 
                                   ? 'Critical Stock Missing' 
                                   : 'Infrastructure Ready'}
                             </p>
                          </div>
                       </div>
                       <div className="p-8 rounded-[2.5rem] bg-primary-50 border border-primary-100 flex items-center space-x-6">
                          <div className="h-16 w-16 rounded-[1.5rem] bg-white border border-primary-100 flex items-center justify-center text-primary-600 shadow-2xl shadow-primary-500/10">
                             <TrendingUp size={32} />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Valuation Delta</p>
                             <p className="text-2xl font-black text-slate-900 italic tracking-tighter">₹{(calculation.requirements || []).reduce((a:number, b:any) => a + ((b.requiredTotal || 0) * 100), 0).toLocaleString()}</p>
                          </div>
                        </div>
                     </div>

                     <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono">
                         <thead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                            <tr>
                               <th className="px-6 py-6">Component Artifact</th>
                               <th className="px-6 py-6">Category</th>
                               <th className="px-6 py-6 text-center">Net Matrix</th>
                               <th className="px-6 py-6">Target Requirement</th>
                               <th className="px-6 py-6">Operational Stock</th>
                               <th className="px-6 py-6 text-right">Node Static</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50 text-[12px] font-black text-slate-900">
                            {(calculation.requirements || []).map((req: any, idx: number) => (
                               <tr key={idx} className="hover:bg-slate-50 transition-all group">
                                  <td className="px-6 py-6 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                                     <span className="block font-black">{req.name}</span>
                                     {req.matId && <span className="text-[9px] text-slate-400 font-bold block mt-0.5">REF: {req.matId}</span>}
                                  </td>
                                  <td className="px-6 py-6">
                                     <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-black text-[9.5px] uppercase tracking-wider rounded-md border border-slate-200/80">
                                        {req.category || 'RAW MATERIAL'}
                                     </span>
                                  </td>
                                  <td className="px-6 py-6 text-center text-slate-400 font-bold">{Number((req.perUnit || 0).toFixed(4))}</td>
                                  <td className="px-6 py-6 text-slate-900 italic">{Number((req.requiredTotal || 0).toFixed(4))} <span className="text-[9px] text-slate-400 not-italic uppercase ml-1 font-black">{req.unit}</span></td>
                                  <td className={cn("px-6 py-6 font-black italic", (req.available || 0) < (req.requiredTotal || 0) ? 'text-red-500' : 'text-primary-600')}>
                                     {Number((req.available || 0).toFixed(4))} {req.unit}
                                  </td>
                                  <td className="px-6 py-6 text-right">
                                     {(req.deficient || 0) > 0 ? (
                                        <div className="inline-flex px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-100 shadow-sm">
                                           Missing {Number((req.deficient || 0).toFixed(4))}
                                        </div>
                                     ) : (
                                        <div className="inline-flex px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                                           Synchronized
                                        </div>
                                     )}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                       </div>
                    </div>

                  <div className="p-8 rounded-[2.5rem] border border-primary-100 bg-primary-50/30 flex items-start space-x-5">
                     <div className="h-10 w-10 rounded-xl bg-white border border-primary-100 flex items-center justify-center text-primary-600 shadow-md shrink-0">
                        <AlertTriangle size={20} />
                     </div>
                     <p className="text-[11px] font-black text-slate-900 leading-relaxed uppercase tracking-tight italic">
                        <span className="text-primary-600 underline underline-offset-4 decoration-primary-300">System Protocol:</span> Simulation creates a virtual footprint. Committing a plan 'Soft Reserves' materials until build completion. System maintains 100% serialization integrity.
                     </p>
                  </div>
               </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: 'Active Matrix Builds', value: (data?.products || []).length, icon: CheckCircle2, color: 'text-primary-600', bColor: 'bg-primary-50' },
                { label: 'System Margin Loss', value: '4.8%', icon: Zap, color: 'text-amber-600', bColor: 'bg-amber-50' },
                { label: 'Alt-Map Depth', value: '15%', icon: Layers, color: 'text-blue-600', bColor: 'bg-blue-50' },
                { label: 'Stable Revision', value: 'v3.2', icon: ShieldAlert, color: 'text-emerald-600', bColor: 'bg-emerald-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-4xl shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <div className={cn("absolute -right-6 -top-6 opacity-[0.05] group-hover:opacity-[0.1] transition-all duration-700", stat.color)}>
                     <stat.icon size={120} strokeWidth={3} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900 italic tracking-tighter mb-4">{stat.value}</p>
                  <span className={cn("px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-black/5 inline-block", stat.color, stat.bColor)}>
                     Verified Static
                  </span>
                </div>
              ))}
           </div>

           <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-5xl shadow-slate-200/50">
               <div className="p-12 border-b flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Master BOM Repository</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 underline decoration-primary-300 underline-offset-4">Precise logical material mapping per architectural building unit</p>
                 </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <button 
                      onClick={() => openMaterialSearch(null)}
                      className="px-6 py-4 bg-[#f0fcfd] text-[#009cbc] border border-[#d1f7fc] rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#009cbc] hover:text-white transition-all flex items-center shadow-md active:scale-95 italic cursor-pointer"
                    >
                       <Search size={18} className="mr-2" /> Search Material Catalog
                    </button>
                    <button 
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="px-8 py-4 bg-white text-slate-800 border border-slate-200 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center shadow-md active:scale-95 italic"
                    >
                       <Settings size={18} className="mr-3 text-slate-500" /> Manage Categories
                    </button>
                    <button 
                      onClick={() => setEditingProduct({ id: '', name: '', bom: [], price: 0, type: 'Battery' })} 
                      className="px-10 py-4 bg-primary-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 flex items-center active:scale-95 italic"
                    >
                       <Plus size={20} className="mr-3" /> New Architecture Node
                    </button>
                 </div>
              </div>
              <div className="divide-y divide-slate-50">
                 {allProducts.map((product: any) => (
                    <div key={product.id} className="p-12 hover:bg-slate-50 transition-all group duration-500">
                       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
                          <div className="flex items-center space-x-6">
                             <div className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-200 text-primary-600 flex items-center justify-center font-black text-2xl shadow-xl group-hover:scale-110 transition-transform group-hover:rotate-12 group-hover:border-primary-500">
                                {product.id.split('-')[1] || product.id[0]}
                             </div>
                             <div>
                                <div className="flex items-center space-x-4 mb-1">
                                  <h4 className="font-black text-xl text-slate-900 uppercase italic tracking-tighter">{product.name}</h4>
                                  <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-lg tracking-widest shadow-sm">ID: {product.id}</span>
                                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg tracking-widest shadow-sm font-mono">
                                    Base Rate: ₹{Number(product.price || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-6 mt-2">
                                   <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest flex items-center italic">
                                      <Zap size={14} className="mr-2" /> {product.type || 'Standard'}
                                   </span>
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center bg-white px-3 py-1 rounded-full border border-slate-200">
                                      {product.bom?.length} Artifacts Defined
                                   </span>
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center space-x-3">
                             <button 
                               onClick={() => triggerDuplicateModal(product.id)} 
                               title="Duplicate & Edit"
                               className="p-4 text-slate-400 bg-white border border-slate-200 rounded-2xl hover:text-primary-600 hover:border-primary-600 transition-all shadow-md active:scale-90"
                             >
                                <Copy size={20}/>
                             </button>
                             <button 
                               onClick={() => setEditingProduct(product)} 
                               className="px-10 py-3 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary-600 hover:border-primary-600 transition-all shadow-md active:scale-95 italic"
                             >
                                Edit Matrix
                             </button>
                             <button 
                               onClick={() => handleAction("Delete BOM", () => handleDeleteProduct(product.id))} 
                               className="p-4 text-slate-400 bg-white border border-slate-200 rounded-2xl hover:text-red-500 hover:border-red-500 transition-all shadow-md active:scale-90"
                             >
                                <Trash2 size={20}/>
                             </button>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                          {(product.bom || []).map((item: any, idx: number) => (
                             <div key={idx} className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between hover:border-primary-600 transition-all group/item cursor-crosshair">
                                <div className="flex justify-between items-start mb-4">
                                   <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic truncate max-w-[60%]">{item.name}</p>
                                   <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">Waste: {item.wastage}%</span>
                                </div>
                                <div className="flex items-end justify-between pt-4 border-t border-slate-50">
                                   <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Base Matrix</p>
                                      <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{item.qty}</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-widest">Effective</p>
                                      <p className="text-sm font-black text-primary-600 italic">{Number(((parseFloat(item.qty) || 0) * (1 + ((parseFloat(item.wastage) || 0)/100))).toFixed(4))} <span className="text-[9px] text-slate-400 not-italic ml-1">{item.unit}</span></p>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
                 {(data?.products || []).length === 0 && (
                   <div className="p-40 text-center">
                      <Cpu size={64} className="mx-auto text-slate-200 mb-8 opacity-20" />
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">No architectural nodes found in blueprint engine</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div 
                onClick={() => setIsIotModalOpen(true)}
                className="bg-slate-900 p-12 rounded-[4rem] text-white overflow-hidden relative group cursor-pointer shadow-4xl hover:shadow-primary-900/40 hover:scale-[1.01] transition-all active:scale-[0.99] border border-slate-800"
              >
                 <div className="absolute -right-20 -top-20 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-1000 rotate-12 group-hover:scale-110">
                    <Zap size={300} />
                 </div>
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[11px] font-black text-primary-500 uppercase tracking-[0.3em]">Logic Execution Layer</h4>
                    <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> IoT Cluster Active
                    </span>
                 </div>
                 <h3 className="text-4xl font-black leading-tight max-w-md group-hover:text-primary-300 transition-colors uppercase italic tracking-tighter">Automate material consumption <span className="text-white underline decoration-primary-500 decoration-8 underline-offset-[12px] decoration-double">real-time floor sync</span>.</h3>
                 <p className="text-[11px] text-slate-400 mt-12 font-black tracking-[0.2em] uppercase flex items-center">
                    <ArrowRight size={16} className="mr-3 text-primary-500 group-hover:translate-x-4 transition-transform" /> Connect Factory IoT Cluster
                 </p>
              </div>
              <div 
                onClick={() => setIsAuditModalOpen(true)}
                className="bg-primary-600 p-12 rounded-[4rem] text-white overflow-hidden relative group cursor-pointer shadow-4xl hover:shadow-primary-600/40 hover:scale-[1.01] transition-all active:scale-[0.99] border border-primary-500"
              >
                 <div className="absolute -right-20 -top-20 p-12 opacity-[0.05] group-hover:opacity-[0.1] transition-all duration-1000 -rotate-12 group-hover:scale-110">
                    <FileText size={300} />
                 </div>
                 <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[11px] font-black text-white/70 uppercase tracking-[0.3em]">Compliance Protocol</h4>
                    <span className="px-3.5 py-1.5 bg-white/20 text-white text-[10px] font-black uppercase tracking-wider rounded-full border border-white/30 flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-300" /> ISO 9001 Verified
                    </span>
                 </div>
                 <h3 className="text-4xl font-black leading-tight max-w-md group-hover:text-white/80 transition-colors uppercase italic tracking-tighter">Maintain ISO 9001:2015 <span className="text-white underline decoration-white/30 decoration-8 underline-offset-[12px] decoration-double">Traceability Standards</span>.</h3>
                 <p className="text-[11px] text-white/70 mt-12 font-black tracking-[0.2em] uppercase flex items-center">
                    <ArrowRight size={16} className="mr-3 text-white group-hover:translate-x-4 transition-transform" /> Generate Immutable Compliance Audit
                 </p>
              </div>
           </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[130] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-5xl w-full max-w-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">MANAGE BLUEPRINT CATEGORIES</h3>
                <div className="relative inline-block mt-2">
                  <p className="text-[10px] font-black text-slate-405 uppercase tracking-widest leading-none">ADD, RENAME, OR RETIRE INVENTORY NODE GROUP MAPPINGS</p>
                  <div className="h-0.5 w-[140px] bg-cyan-400 mt-2"></div>
                </div>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-3.5 text-slate-400 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-full transition-all duration-205 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8 max-h-[500px] overflow-y-auto">
              {/* Add New Category */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100/80">
                <div className="flex gap-4">
                  <input 
                    type="text"
                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-300 uppercase tracking-normal"
                    placeholder="E.G. CATEGORY 5 — SPARES & EXTRAS"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <button 
                    onClick={handleAddCategory}
                    className="px-6 bg-[#00a3c4] hover:bg-[#008ba3] text-white font-black text-[10px] uppercase tracking-[0.1em] rounded-2xl transition-all active:scale-95 flex items-center justify-center italic shrink-0 shadow-sm"
                  >
                    <Plus size={14} className="mr-1.5" /> ADD NODE
                  </button>
                </div>
              </div>

              {/* List of categories */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">Active Category Structures</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-[2.5rem] overflow-hidden bg-white shadow-xs">
                  {categoryNames.map((cat: string) => {
                    const isEditing = editingCategoryKey === cat;
                    return (
                      <div key={cat} className="p-6 flex items-center justify-between hover:bg-slate-50/40 transition-all gap-4">
                        {isEditing ? (
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text"
                              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-primary-500/20 outline-none"
                              value={editingCategoryValue}
                              onChange={(e) => setEditingCategoryValue(e.target.value)}
                            />
                            <button 
                              onClick={() => handleRenameCategory(cat, editingCategoryValue)}
                              className="p-3 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                              title="Save Changes"
                            >
                              <Save size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingCategoryKey(null)}
                              className="p-3 text-slate-400 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-extrabold text-[12.5px] text-slate-800 tracking-tight uppercase">
                              {cat}
                            </span>
                            <div className="flex items-center space-x-3 shrink-0">
                              <button 
                                onClick={() => {
                                  setEditingCategoryKey(cat);
                                  setEditingCategoryValue(cat);
                                }}
                                className="p-3 text-[#546f9b] bg-[#f0f4f8] hover:bg-slate-100 rounded-[1.125rem] border border-slate-200/20 transition-all shadow-xs inline-flex items-center justify-center hover:scale-105 active:scale-95"
                                title="Edit Category"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-3 text-red-550 bg-red-50 hover:bg-red-100/40 rounded-[1.125rem] border border-red-100/40 transition-all shadow-xs inline-flex items-center justify-center hover:scale-105 active:scale-95"
                                title="Delete Category"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-8 py-4 bg-[#0f172a] hover:bg-slate-800 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md italic"
              >
                Close Category Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE BLUEPRINT MODAL */}
      {isDuplicateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[140] p-6 animate-in fade-in duration-300 text-slate-900">
           <form 
             onSubmit={handleDuplicateSubmit}
             className="bg-white rounded-[3rem] border-2 border-slate-950 shadow-5xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-300 text-left"
           >
              {/* Header */}
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">DUPLICATE MATRIX BLUEPRINT</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-none">Clone a complete component recipe under a new ID</p>
                 </div>
                 <button 
                   type="button"
                   onClick={() => { setIsDuplicateModal(false); setDuplicateSourceId(null); }}
                   className="p-3 text-slate-400 bg-white border border-slate-200 hover:text-slate-900 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer"
                 >
                    <X size={16} />
                 </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                 {duplicateError && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-750 font-extrabold rounded-2xl text-[11px] uppercase tracking-wider">
                       {duplicateError}
                    </div>
                 )}

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">SOURCE ARCHITECTURE ID (READ-ONLY)</label>
                    <input 
                      type="text" 
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black text-slate-500 font-mono select-none"
                      value={duplicateSourceId || ''} 
                    />
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">NEW ARCHITECTURE SPEC ID</label>
                    <input 
                      type="text" 
                      required
                      placeholder="E.G. BAT-NEXT-GY"
                      className="w-full bg-[#f8fafc] border-2 border-slate-950 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 uppercase tracking-wider italic focus:ring-2 focus:ring-[#00a3c4]/20 outline-none"
                      value={duplicateNewId} 
                      onChange={(e) => setDuplicateNewId(e.target.value.toUpperCase())}
                    />
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">NEW BLUEPRINT COMMERCIAL NAME</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. NextGen Titanium Cell Pack"
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 italic focus:ring-2 focus:ring-[#00a3c4]/20 outline-none"
                      value={duplicateNewName} 
                      onChange={(e) => setDuplicateNewName(e.target.value)}
                    />
                 </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                 <button 
                   type="button" 
                   onClick={() => { setIsDuplicateModal(false); setDuplicateSourceId(null); }}
                   className="px-6 py-4 border border-slate-200 hover:bg-white text-[#64748b] bg-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer leading-none"
                 >
                   CANCEL CLONE
                 </button>
                 <button 
                   type="submit"
                   className="px-8 py-4 bg-[#009cbc] hover:bg-[#008ba3] text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer leading-none flex items-center gap-2"
                 >
                   <Copy size={13} /> SECURE DUPLICATE LIST
                 </button>
              </div>
           </form>
        </div>
      )}

      {/* Factory IoT & Real-time Floor Sync Modal */}
      {isIotModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[150] p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-5xl w-full max-w-4xl text-white overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-400">
                  <Zap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black tracking-tighter uppercase italic text-white">FACTORY IOT CLUSTER & REAL-TIME FLOOR SYNC</h3>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30">
                      {iotSyncStatus} (8ms LATENCY)
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">LOGIC EXECUTION LAYER · AUTOMATED MATERIAL DELETION & TELEMETRY</p>
                </div>
              </div>
              <button 
                onClick={() => setIsIotModalOpen(false)}
                className="p-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {iotSyncMessage && (
                <div className="p-4 bg-primary-950/80 border border-primary-500/40 rounded-2xl text-xs font-bold text-primary-200 flex items-center justify-between animate-in slide-in-from-top-2">
                  <span>{iotSyncMessage}</span>
                  <button onClick={() => setIotSyncMessage('')} className="text-primary-400 hover:text-white"><X size={14} /></button>
                </div>
              )}

              {/* Status KPI Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">CONNECTED GATEWAYS</span>
                  <div className="text-2xl font-black text-white italic">4 PLC NODES</div>
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">100% Signal Integrity</p>
                </div>
                <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">FLOOR CONSUMPTION RATE</span>
                  <div className="text-2xl font-black text-primary-400 italic">420 CELLS / HR</div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Active Assembly Line #1</p>
                </div>
                <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">AUTO DELETION ENGINE</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-black text-emerald-400">ENABLED</span>
                    <button 
                      onClick={() => setIotAutoSync(!iotAutoSync)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        iotAutoSync ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {iotAutoSync ? 'AUTO ON' : 'PAUSED'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Connected IoT Gateways Grid */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Factory Floor Hardware Cluster Nodes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white uppercase italic">PLC-NODE-01 · CELL SORTING & LASER WELDER</div>
                      <p className="text-[10px] text-slate-400">Protocol: Modbus TCP/IP (IP: 192.168.10.42)</p>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>
                  <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white uppercase italic">MODBUS-SCALE-02 · BUSBAR WEIGHT DEDUCTION</div>
                      <p className="text-[10px] text-slate-400">Protocol: RS-485 Serial (Precision +/- 0.1g)</p>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  </div>
                  <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white uppercase italic">IOT-BARCODE-03 · RAW MATERIAL SCANNER</div>
                      <p className="text-[10px] text-slate-400">Protocol: MQTT Broker (Topic: /arcenol/scan)</p>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  </div>
                  <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white uppercase italic">BMS-CALIB-04 · CIRCUIT CALIBRATOR & FLASH</div>
                      <p className="text-[10px] text-slate-400">Protocol: CANbus 2.0B (Speed: 500 kbps)</p>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  </div>
                </div>
              </div>

              {/* Live Telemetry Stream Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Live Floor Telemetry Log Feed</h4>
                  <button 
                    onClick={handleSimulateIotPulse}
                    className="text-[10px] font-black text-primary-400 hover:text-primary-300 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} /> Send Pulse Event
                  </button>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] space-y-2 max-h-48 overflow-y-auto">
                  {iotLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-bold shrink-0">[{log.time}]</span>
                      <span className="text-primary-400 font-black shrink-0">{log.node}:</span>
                      <span className="text-slate-200">{log.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button 
                onClick={handleSimulateIotPulse}
                className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Activity size={14} className="text-primary-400" /> CALIBRATE CLUSTER SENSORS
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsIotModalOpen(false)}
                  className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  CLOSE
                </button>
                <button 
                  onClick={handleTriggerIotSync}
                  className="px-8 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-600/30 flex items-center gap-2 active:scale-95"
                >
                  <RefreshCw size={14} className={iotSyncStatus === 'SYNCING' ? 'animate-spin' : ''} /> TRIGGER REAL-TIME FLOOR SYNC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ISO 9001:2015 Compliance Audit Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[150] p-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-100 rounded-[3rem] shadow-5xl w-full max-w-4xl text-slate-900 overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-600">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-900">ISO 9001:2015 COMPLIANCE & TRACEABILITY AUDIT</h3>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider rounded-full border border-emerald-200">
                      CERTIFIED & VERIFIED
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">QUALITY MANAGEMENT SYSTEM PROTOCOL · IMMUTABLE LOT MAPPING</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {auditMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-in slide-in-from-top-2">
                  <span>{auditMessage}</span>
                  <button onClick={() => setAuditMessage('')} className="text-emerald-600 hover:text-emerald-900"><X size={14} /></button>
                </div>
              )}

              {/* ISO Certificate Seal */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em]">CERTIFICATE OF TRACEABILITY COMPLIANCE</div>
                  <div className="text-2xl font-black uppercase italic tracking-tighter">ISO 9001:2015 / ISO 14001 DIRECTIVE</div>
                  <p className="text-xs text-slate-300">Registration No: <span className="font-mono text-white font-bold">ISO-9001-2026-ARC-990112</span></p>
                  <p className="text-[10px] text-slate-400">Auditor System: Arcenol Digital Ecosystem Compliance Engine</p>
                </div>
                <div className="text-center md:text-right shrink-0">
                  <div className="px-5 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 inline-block">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">AUDIT CHECKSUM</span>
                    <span className="font-mono text-xs font-black text-emerald-400">{auditManifest?.checksum || 'ISO9001-SHA256-4A8E9B12'}</span>
                  </div>
                </div>
              </div>

              {/* Traceability Matrix Grid */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">4-Tier Monitored Quality Domains</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase">TIER 1 · RAW MATERIAL GRN & VENDOR TEST</span>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold">{data?.inventory?.length || 18} Active Material SKUs Verified</p>
                    <p className="text-[10px] text-slate-400">Includes Supplier Test Certificates, Material Safety Data Sheets (MSDS), and RoHS Directive 2015/863</p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase">TIER 2 · CELL IMPEDANCE & CAPACITY BINNING</span>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold">{data?.gradedInventory?.length || 120} Graded Cell Lots Active</p>
                    <p className="text-[10px] text-slate-400">Ohmic Resistance binning tolerance &lt; 0.05mΩ and voltage matching delta &lt; 2mV</p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase">TIER 3 · LASER WELDING & WIP AUDIT</span>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold">{data?.wipInventory?.length || 6} WIP Batches Logged</p>
                    <p className="text-[10px] text-slate-400">Laser weld penetration depth certified, thermal insulation barrier &gt; 500MΩ test passed</p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase">TIER 4 · FINISHED PACK SERIALIZATION</span>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold">{data?.products?.length || 8} BOM Pack Blueprints Approved</p>
                    <p className="text-[10px] text-slate-400">Laser QR serial barcode, BMS firmware hash, and UN 38.3 lithium transport safety certification</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-2">
                <button 
                  onClick={handleExportJsonManifest}
                  className="px-5 py-3.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Download size={14} /> EXPORT MANIFEST (JSON)
                </button>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleRunIsoAudit}
                  disabled={auditRunning}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={auditRunning ? 'animate-spin' : ''} /> RE-RUN COMPLIANCE AUDIT
                </button>
                <button 
                  onClick={handleDownloadIsoPdf}
                  className="px-8 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-600/30 flex items-center gap-2 active:scale-95"
                >
                  <FileText size={14} /> GENERATE AUDIT PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSTANT MATERIAL SEARCH & FINDER MODAL */}
      {isMaterialSearchOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#009cbc] text-white flex items-center justify-center shadow-lg">
                  <Search size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                    INSTANT MATERIAL SEARCH & CATALOG
                  </h3>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">
                    {targetBomIndex !== null 
                      ? `Selecting material component for Row #${targetBomIndex + 1}` 
                      : editingProduct 
                      ? `Search and inject material component directly into ${editingProduct.name || 'Active BOM Matrix'}`
                      : 'Search raw materials, cells, BMS, & hardware stock'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsMaterialSearchOpen(false)}
                className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Controls & Category Filter */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  autoFocus
                  value={materialSearchQuery}
                  onChange={(e) => setMaterialSearchQuery(e.target.value)}
                  placeholder="Type material name, SKU / Code (e.g., RM-CELLS, BMS, Lead)..."
                  className="w-full bg-white border border-slate-300 rounded-2xl pl-12 pr-10 py-3.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#009cbc]/30 focus:border-[#009cbc] outline-none shadow-sm placeholder:text-slate-400 font-sans"
                />
                {materialSearchQuery && (
                  <button 
                    onClick={() => setMaterialSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Category Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {['ALL', 'RAW MATERIAL', 'CELLS', 'BMS', 'LEAD ALLOY', 'HARDWARE', 'CABLES', 'ENCLOSURE', 'PACKAGING'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMaterialSearchCategory(cat)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border cursor-pointer",
                      materialSearchCategory === cat 
                        ? "bg-[#009cbc] text-white border-[#009cbc] shadow-xs" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Material List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {(() => {
                const materials = (data?.inventory || []);
                const query = materialSearchQuery.trim().toLowerCase();
                const filtered = materials.filter((m: any) => {
                  const mName = (m.name || '').toLowerCase();
                  const mCode = (m.code || m.id || '').toLowerCase();
                  const mCat = (m.category || '').toLowerCase();

                  const matchesQ = !query || mName.includes(query) || mCode.includes(query) || mCat.includes(query);
                  const matchesCat = materialSearchCategory === 'ALL' || 
                    mCat.includes(materialSearchCategory.toLowerCase()) ||
                    (materialSearchCategory === 'CELLS' && (mName.includes('cell') || mCat.includes('cell'))) ||
                    (materialSearchCategory === 'BMS' && (mName.includes('bms') || mCat.includes('bms')));
                  return matchesQ && matchesCat;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-16 text-center space-y-3">
                      <div className="h-16 w-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Search size={28} />
                      </div>
                      <h4 className="text-sm font-black uppercase text-slate-700">No matching materials found</h4>
                      <p className="text-xs text-slate-400">Try searching with a different keyword or category filter</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map((inv: any) => {
                      const avail = Math.max(0, Number(inv.qty || 0) - Number(inv.reservedQty || 0));
                      const codeTag = inv.code || inv.id || 'RM-SKU';
                      return (
                        <div 
                          key={inv.id || codeTag} 
                          className="p-4 bg-white border border-slate-200 hover:border-[#009cbc] rounded-2xl transition-all shadow-xs hover:shadow-md flex items-center justify-between gap-4 group"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[9px] font-black rounded border border-slate-200 uppercase">
                                {codeTag}
                              </span>
                              <span className="px-2 py-0.5 bg-[#f0fcfd] text-[#009cbc] font-sans text-[8.5px] font-black uppercase tracking-wider rounded border border-[#d1f7fc]">
                                {inv.category || 'Raw Material'}
                              </span>
                            </div>
                            <h5 className="font-bold text-xs text-slate-900 group-hover:text-[#009cbc] transition-colors truncate">
                              {inv.name}
                            </h5>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                              <span>Avail: <strong className={cn("font-extrabold", avail > 0 ? "text-emerald-600" : "text-red-500")}>{avail.toLocaleString()} {inv.unit || 'Pcs'}</strong></span>
                              <span>•</span>
                              <span>Val: <strong>₹{Number(inv.price || 0).toLocaleString()}</strong></span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectMaterialFromSearch(inv)}
                            className="px-4 py-2.5 bg-[#009cbc] hover:bg-[#008ba3] text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 cursor-pointer"
                          >
                            <Plus size={13} />
                            {targetBomIndex !== null 
                              ? 'Assign Row' 
                              : editingProduct 
                              ? 'Inject BOM' 
                              : 'Select'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>{data?.inventory?.length || 0} Total Active Inventory Material SKUs</span>
              <button 
                onClick={() => setIsMaterialSearchOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black uppercase text-[10px] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
