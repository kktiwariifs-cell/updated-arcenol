import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Package, Search, Filter, Plus, ChevronRight, AlertTriangle, 
  ArrowUpRight, Download, History, BarChart3, Tag, Warehouse,
  Activity, ShieldCheck, Zap, Layers, Microscope, QrCode, Trash2,
  Database, Boxes, Thermometer, Beaker, TrendingUp, Calendar, MapPin, X,
  ClipboardList, ArrowRight, Printer, CheckCircle2, Sliders, RefreshCw, AlertCircle, Edit, Save,
  Upload, FileSpreadsheet, FileText, Check, Loader2, ShoppingCart, Truck, Clock, Phone, Building2
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn, formatCurrency } from '../lib/utils';
import { downloadReportDataAsPDF } from '../lib/pdfGenerator';
import { useAuthStore, UserRole } from '../store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';

export const Inventory: React.FC = () => {
  const { user } = useAuthStore();
  const { data, loading, refetch } = useERPData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'raw' | 'graded' | 'wip' | 'mrp' | 'warehouse' | 'categories'>('dashboard');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);

  // Purchase Order Management States
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState<'ALL' | 'Pending Supplier Confirmation' | 'In Transit' | 'Arrived at Gate' | 'GRN Received'>('ALL');
  const [isCreatePoModalOpen, setIsCreatePoModalOpen] = useState(false);
  const [poMaterialId, setPoMaterialId] = useState('');
  const [poMaterialName, setPoMaterialName] = useState('');
  const [poCategory, setPoCategory] = useState('RAW_MATERIAL');
  const [poVendor, setPoVendor] = useState('');
  const [poVendorContact, setPoVendorContact] = useState('');
  const [poQty, setPoQty] = useState<number>(1000);
  const [poUnit, setPoUnit] = useState('Pcs');
  const [poUnitCost, setPoUnitCost] = useState<number>(150);
  const [poEstDelivery, setPoEstDelivery] = useState('');
  const [poRemarks, setPoRemarks] = useState('');
  const [poIsSubmitting, setPoIsSubmitting] = useState(false);

  // Purchase Orders Data Memorandum
  const purchaseOrdersList = useMemo(() => {
    if (Array.isArray(data?.purchaseOrders) && data.purchaseOrders.length > 0) {
      return data.purchaseOrders;
    }
    return [
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
    ];
  }, [data?.purchaseOrders]);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrdersList.filter((po: any) => {
      const matchesSearch = !poSearch || 
        po.id.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.materialName.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.vendor.toLowerCase().includes(poSearch.toLowerCase()) ||
        (po.trackingNumber && po.trackingNumber.toLowerCase().includes(poSearch.toLowerCase()));
      const matchesStatus = poStatusFilter === 'ALL' || po.status === poStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrdersList, poSearch, poStatusFilter]);

  const handleUpdatePoStatus = async (poId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        alert(`✅ Purchase Order ${poId} status updated to "${newStatus}"!${newStatus === 'GRN Received' ? '\nStock has been automatically ingested into inventory.' : ''}`);
        refetch();
      }
    } catch (err) {
      alert(`Failed to update status for ${poId}`);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poMaterialName || !poVendor) {
      alert('Please enter Material Name and Vendor Name');
      return;
    }
    setPoIsSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: poMaterialId || `RM-${Date.now()}`,
          materialName: poMaterialName,
          category: poCategory,
          vendor: poVendor,
          vendorContact: poVendorContact,
          qty: poQty,
          unit: poUnit,
          unitCost: poUnitCost,
          estimatedDelivery: poEstDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          remarks: poRemarks
        })
      });
      if (res.ok) {
        alert(`✅ Purchase Order created successfully!`);
        setIsCreatePoModalOpen(false);
        setPoMaterialName('');
        setPoVendor('');
        setPoVendorContact('');
        setPoRemarks('');
        refetch();
      }
    } catch (err) {
      alert('Error creating Purchase Order');
    } finally {
      setPoIsSubmitting(false);
    }
  };

  // Category Management States
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormCode, setCategoryFormCode] = useState('');
  const [categoryFormDesc, setCategoryFormDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<any | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [categorySubmitError, setCategorySubmitError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Procurement Modal States
  const [isProcureModalOpen, setIsProcureModalOpen] = useState(false);
  const [procureType, setProcureType] = useState<'existing' | 'new'>('existing');
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('Cells');
  const [qty, setQty] = useState<number>(0);
  const [unit, setUnit] = useState('Pcs');
  const [supplier, setSupplier] = useState('');
  const [warehouse, setWarehouse] = useState('Raw Hub');
  const [rack, setRack] = useState('A-1');
  const [price, setPrice] = useState<number>(0);
  const [newMinStock, setNewMinStock] = useState<number>(100);
  const [newReorderLevel, setNewReorderLevel] = useState<number>(250);
  const [grn, setGrn] = useState('');
  const [batch, setBatch] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [eWayBill, setEWayBill] = useState('');
  const [exciseSlip, setExciseSlip] = useState('');
  const [acceptedQty, setAcceptedQty] = useState<number>(0);
  const [damagedQty, setDamagedQty] = useState<number>(0);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProcureId, setEditingProcureId] = useState<string | null>(null);

  // Cell Grading Form States
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [gradingParentId, setGradingParentId] = useState('RM-CELLS');
  const [cellSerial, setCellSerial] = useState('');
  const [cellVoltage, setCellVoltage] = useState(3.2);
  const [cellIR, setCellIR] = useState(7.5);
  const [cellCapacity, setCellCapacity] = useState(6000);
  const [cellCycleCount, setCellCycleCount] = useState(0);
  const [cellTemp, setCellTemp] = useState(24.5);
  const [qcEngineer, setQcEngineer] = useState(user?.name || 'Suresh P.');
  const [gradingSuccess, setGradingSuccess] = useState('');
  const [editingGradedId, setEditingGradedId] = useState<string | null>(null);

  // Warehouse Transfer States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<any>(null);
  const [transferQty, setTransferQty] = useState<number>(0);
  const [sourceWh, setSourceWh] = useState('');
  const [destWh, setDestWh] = useState('Production Warehouse');
  const [transferError, setTransferError] = useState('');

  // MRP Allocation Simulator States
  const [mrpProductModel, setMrpProductModel] = useState('');
  const [mrpQty, setMrpQty] = useState<number>(10);
  const [mrpResult, setMrpResult] = useState<any>(null);
  const [mrpLoading, setMrpLoading] = useState(false);
  const [mrpMessage, setMrpMessage] = useState('');

  // QR Label Preview State
  const [selectedQRItem, setSelectedQRItem] = useState<any>(null);

  // Flow Stages Modal States
  const [isFinalInventoryModalOpen, setIsFinalInventoryModalOpen] = useState(false);
  const [isSalesLedgerModalOpen, setIsSalesLedgerModalOpen] = useState(false);
  const [isRmaModalOpen, setIsRmaModalOpen] = useState(false);

  // States for interactive logic inside those modals
  const [fiSearch, setFiSearch] = useState('');
  const [fiFilterStatus, setFiFilterStatus] = useState('ALL');
  const [faModel, setFaModel] = useState('');
  const [faQty, setFaQty] = useState(1);
  const [faWarehouse, setFaWarehouse] = useState('Finished Goods Hub');
  const [faRack, setFaRack] = useState('FG-1');
  const [showFaForm, setShowFaForm] = useState(false);
  
  const [slSearch, setSlSearch] = useState('');
  const [igDealer, setIgDealer] = useState('');
  const [igProduct, setIgProduct] = useState('');
  const [igSerials, setIgSerials] = useState('');
  const [igTotal, setIgTotal] = useState(0);
  const [igTax, setIgTax] = useState(0);
  const [showIgForm, setShowIgForm] = useState(false);
  
  const [rmaSearch, setRmaSearch] = useState('');
  const [newRmaSerial, setNewRmaSerial] = useState('');
  const [newRmaType, setNewRmaType] = useState('Thermal Overrun');
  const [newRmaNotes, setNewRmaNotes] = useState('');
  const [rmaStatusFilter, setRmaStatusFilter] = useState('ALL');
  const [showRmaForm, setShowRmaForm] = useState(false);
  const [rmaRootCause, setRmaRootCause] = useState('');
  const [activeRmaId, setActiveRmaId] = useState<string | null>(null);

  const [subSearchProcure, setSubSearchProcure] = useState('');
  const [subSearchGrading, setSubSearchGrading] = useState('');

  // Pagination States for Data Sheets (20 entries per page default)
  const [rmCurrentPage, setRmCurrentPage] = useState(1);
  const [rmItemsPerPage, setRmItemsPerPage] = useState(20);
  const [gradedCurrentPage, setGradedCurrentPage] = useState(1);
  const [gradedItemsPerPage, setGradedItemsPerPage] = useState(20);
  const [poCurrentPage, setPoCurrentPage] = useState(1);
  const [poItemsPerPage, setPoItemsPerPage] = useState(20);

  useEffect(() => {
    setRmCurrentPage(1);
  }, [search, filterCategory]);

  useEffect(() => {
    setGradedCurrentPage(1);
  }, [subSearchGrading]);

  useEffect(() => {
    setPoCurrentPage(1);
  }, [poSearch, poStatusFilter]);

  // Edit & Delete Raw Material States
  const [isEditRmModalOpen, setIsEditRmModalOpen] = useState(false);
  const [editRmItem, setEditRmItem] = useState<any>(null);
  const [editRmName, setEditRmName] = useState('');
  const [editRmCode, setEditRmCode] = useState('');
  const [editRmCategory, setEditRmCategory] = useState('RAW_MATERIAL');
  const [editRmSupplier, setEditRmSupplier] = useState('');
  const [editRmBatch, setEditRmBatch] = useState('');
  const [editRmGrn, setEditRmGrn] = useState('');
  const [editRmPrice, setEditRmPrice] = useState(0);
  const [editRmWarehouse, setEditRmWarehouse] = useState('Raw Hub');
  const [editRmRack, setEditRmRack] = useState('A-1');
  const [editRmQty, setEditRmQty] = useState(0);
  const [editRmUnit, setEditRmUnit] = useState('Kg');
  const [editRmMinStock, setEditRmMinStock] = useState(100);
  const [editRmReorderLevel, setEditRmReorderLevel] = useState(250);
  const [editRmQcStatus, setEditRmQcStatus] = useState('APPROVED');
  const [editRmStatus, setEditRmStatus] = useState('ACTIVE');
  const [editRmError, setEditRmError] = useState('');
  const [isSavingRm, setIsSavingRm] = useState(false);

  // Delete Raw Material States
  const [isDeleteRmModalOpen, setIsDeleteRmModalOpen] = useState(false);
  const [deleteRmItem, setDeleteRmItem] = useState<any>(null);
  const [isDeletingRm, setIsDeletingRm] = useState(false);
  const [deleteRmError, setDeleteRmError] = useState('');

  const handleAddNewRmClick = () => {
    setEditRmItem({ id: '', isNew: true });
    setEditRmName('');
    setEditRmCode(`CD-${Math.floor(1000 + Math.random() * 9000)}`);
    setEditRmCategory('RAW_MATERIAL');
    setEditRmSupplier('Arcenol Metals');
    setEditRmBatch(`B-${Math.floor(100 + Math.random() * 900)}`);
    setEditRmGrn(`GRN-${Math.floor(1000 + Math.random() * 9000)}`);
    setEditRmPrice(150);
    setEditRmWarehouse('Raw Hub');
    setEditRmRack('A-1');
    setEditRmQty(100);
    setEditRmUnit('Kg');
    setEditRmMinStock(100);
    setEditRmReorderLevel(250);
    setEditRmQcStatus('APPROVED');
    setEditRmStatus('ACTIVE');
    setEditRmError('');
    setIsEditRmModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditRmItem(item);
    setEditRmName(item.name || '');
    setEditRmCode(item.code || '');
    setEditRmCategory(item.category || 'RAW_MATERIAL');
    setEditRmSupplier(item.supplier || '');
    setEditRmBatch(item.batch || '');
    setEditRmGrn(item.grn || '');
    setEditRmPrice(item.price || 0);
    setEditRmWarehouse(item.warehouse || 'Raw Hub');
    setEditRmRack(item.rack || 'A-1');
    setEditRmQty(item.qty || 0);
    setEditRmUnit(item.unit || 'Kg');
    setEditRmMinStock(item.minStock ?? 100);
    setEditRmReorderLevel(item.reorderLevel ?? 250);
    setEditRmQcStatus(item.qcStatus || 'APPROVED');
    setEditRmStatus(item.status || 'ACTIVE');
    setEditRmError('');
    setIsEditRmModalOpen(true);
  };

  const handleSaveRm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRmItem) return;
    setIsSavingRm(true);
    setEditRmError('');
    try {
      const payload = {
        existingItemId: editRmItem.isNew ? '' : editRmItem.id,
        name: editRmName,
        code: editRmCode,
        category: editRmCategory,
        supplier: editRmSupplier,
        batch: editRmBatch,
        grn: editRmGrn,
        price: editRmPrice,
        warehouse: editRmWarehouse,
        rack: editRmRack,
        qty: editRmQty,
        unit: editRmUnit,
        minStock: Number(editRmMinStock) || 100,
        reorderLevel: Number(editRmReorderLevel) || 250,
        qcStatus: editRmQcStatus,
        status: editRmStatus,
        setExactQty: true,
      };

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update raw material.');
      }

      await refetch();
      setIsEditRmModalOpen(false);
      setEditRmItem(null);
    } catch (err: any) {
      setEditRmError(err.message || 'Error updating raw material.');
    } finally {
      setIsSavingRm(false);
    }
  };

  const handleDeleteRm = async () => {
    if (!deleteRmItem) return;
    setIsDeletingRm(true);
    setDeleteRmError('');
    try {
      const res = await fetch(`/api/inventory/${deleteRmItem.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete raw material.');
      }

      await refetch();
      setIsDeleteRmModalOpen(false);
      setDeleteRmItem(null);
    } catch (err: any) {
      setDeleteRmError(err.message || 'Error deleting raw material.');
    } finally {
      setIsDeletingRm(false);
    }
  };

  // Bulk Import and Sync State for Raw Materials
  const [showRmImportModal, setShowRmImportModal] = useState(false);
  const [rmImportTab, setRmImportTab] = useState<'file' | 'text'>('file');
  const [pastedRmText, setPastedRmText] = useState('');
  const [parsedRmItems, setParsedRmItems] = useState<any[]>([]);
  const [rmImportStatus, setRmImportStatus] = useState<'idle' | 'parsed' | 'submitting' | 'success' | 'error'>('idle');
  const [rmImportErrorMsg, setRmImportErrorMsg] = useState('');
  const [rmSuccessToast, setRmSuccessToast] = useState('');
  
  // Importer default config fields (to fill missing info in CSV or pasted text for RM)
  const [defaultRmCategory, setDefaultRmCategory] = useState('RAW_MATERIAL');
  const [defaultRmWarehouse, setDefaultRmWarehouse] = useState('Raw Hub');
  const [defaultRmSupplier, setDefaultRmSupplier] = useState('Global Metals');
  const [defaultRmUnit, setDefaultRmUnit] = useState('Kg');

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (data?.inventory && data.inventory.length > 0 && !selectedExistingId) {
      setSelectedExistingId(data.inventory[0].id);
    }
    if (!mrpProductModel) {
      const firstModel = (data?.products && data.products.length > 0) ? data.products[0].id : '72V30A';
      setMrpProductModel(firstModel);
    }
  }, [data, selectedExistingId, mrpProductModel]);

  const handleAction = (actionName: string, callback: () => void | Promise<void>) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(async () => {
      await callback();
      setIsSyncing(false);
    }, 150);
  };

  const handleFetchMRP = async () => {
    const targetModel = mrpProductModel || (products && products.length > 0 ? (products[0].id || products[0].model_id) : '72V30A');
    const targetQty = mrpQty > 0 ? mrpQty : 10;
    
    if (!mrpProductModel) {
      setMrpProductModel(targetModel);
    }
    if (mrpQty <= 0) {
      setMrpQty(targetQty);
    }

    setMrpLoading(true);
    setMrpMessage('');
    try {
      const res = await fetch(`/api/mrp/calculate?modelId=${encodeURIComponent(targetModel)}&qty=${targetQty}`);
      if (res.ok) {
        const json = await res.json();
        setMrpResult(json);
      } else {
        const prod = (products || []).find((p: any) => p.id === targetModel || p.model_id === targetModel || p.name?.toLowerCase() === targetModel?.toLowerCase()) || (products && products[0]);
        if (prod) {
          const bomItems = prod.bom && prod.bom.length > 0 ? prod.bom : [
            { matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1 }, 
            { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
          ];
          const reqs = bomItems.map((item: any) => {
            const perUnit = Number(item.qty || 0) * (1 + ((Number(item.wastage || 0)) / 100));
            const total = perUnit * Number(targetQty || 0);
            const invItem = (data?.inventory || []).find((i: any) => i.id === item.matId || i.code === item.matId || (i.name && item.name && i.name.toLowerCase() === item.name.toLowerCase()));
            const avail = invItem ? Math.max(0, Number(invItem.qty || 0) - Number(invItem.reservedQty || 0)) : 0;
            return {
              ...item,
              perUnit,
              requiredTotal: total,
              available: avail,
              deficient: Math.max(0, total - avail)
            };
          });
          setMrpResult({ modelId: prod.id, modelName: prod.name, qty: targetQty, requirements: reqs });
        } else {
          setMrpMessage('Failed to calculate MRP requirements');
        }
      }
    } catch (e) {
      const prod = (products || []).find((p: any) => p.id === targetModel || p.model_id === targetModel || p.name?.toLowerCase() === targetModel?.toLowerCase()) || (products && products[0]);
      if (prod) {
        const bomItems = prod.bom && prod.bom.length > 0 ? prod.bom : [
          { matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1 }, 
          { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
        ];
        const reqs = bomItems.map((item: any) => {
          const perUnit = Number(item.qty || 0) * (1 + ((Number(item.wastage || 0)) / 100));
          const total = perUnit * Number(targetQty || 0);
          const invItem = (data?.inventory || []).find((i: any) => i.id === item.matId || i.code === item.matId || (i.name && item.name && i.name.toLowerCase() === item.name.toLowerCase()));
          const avail = invItem ? Math.max(0, Number(invItem.qty || 0) - Number(invItem.reservedQty || 0)) : 0;
          return {
            ...item,
            perUnit,
            requiredTotal: total,
            available: avail,
            deficient: Math.max(0, total - avail)
          };
        });
        setMrpResult({ modelId: prod.id, modelName: prod.name, qty: targetQty, requirements: reqs });
      } else {
        setMrpMessage('Error reaching server for calculation');
      }
    } finally {
      setMrpLoading(false);
    }
  };

  const handleExecuteProductionPlan = async (mode: 'RESERVE' | 'CONSUME') => {
    if (!mrpProductModel || mrpQty <= 0) return;
    setMrpLoading(true);
    try {
      const res = await fetch('/api/mrp/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: mrpProductModel, qty: mrpQty, mode })
      });
      const dataJson = await res.json();
      if (res.ok) {
        setMrpMessage(`Success: Created MRP Plan (${dataJson.id}) using ${mode} allocation.`);
        refetch();
        setMrpResult(null);
      } else {
        setMrpMessage(`Error: ${dataJson.message || dataJson.error}`);
      }
    } catch (err: any) {
      setMrpMessage('Production submission failed');
    } finally {
      setMrpLoading(false);
    }
  };

  const handleSubmitProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || qty <= 0) {
      setSubmitError('Please enter a valid quantity.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload: any = {
        qty,
        supplier: supplier || 'Arcenol Premium Vendor',
        batch: batch || `BAT-${Math.floor(100 + Math.random() * 900)}`,
        grn: grn || `GRN-${Math.floor(1000 + Math.random() * 9000).toString()}`,
        price: price || 150,
        warehouse,
        rack,
        unit,
        minStock: Number(newMinStock) || 100,
        reorderLevel: Number(newReorderLevel) || 250,
        challanNo: challanNo || `CH-${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleNo: vehicleNo || 'GJ-01-AB-1234',
        eWayBill: eWayBill || `EWB-${Math.floor(100000 + Math.random() * 900000)}`,
        exciseSlip: exciseSlip || `EXC-${Math.floor(1000 + Math.random() * 9000)}`,
        acceptedQty: Number(acceptedQty || qty || 0),
        damagedQty: Number(damagedQty || 0)
      };

      if (editingProcureId) {
        payload.existingItemId = editingProcureId;
        payload.setExactQty = true;
        payload.name = newName;
        payload.code = newCode;
        payload.category = newCategory;
      } else if (procureType === 'existing') {
        payload.existingItemId = selectedExistingId;
      } else {
        payload.name = newName;
        payload.code = newCode || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
        payload.category = newCategory;
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to submit inventory entry');
      }

      await refetch();
      setIsProcureModalOpen(false);
      setEditingProcureId(null);
      setQty(0);
      setNewName('');
      setNewCode('');
      setSupplier('');
      setBatch('');
      setGrn('');
      setChallanNo('');
      setVehicleNo('');
      setEWayBill('');
      setExciseSlip('');
      setAcceptedQty(0);
      setDamagedQty(0);
      setPrice(0);
    } catch (err: any) {
      setSubmitError(err.message || 'Error executing procurement REST transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditProcurement = (item: any) => {
    setEditingProcureId(item.id);
    setProcureType('new');
    setNewName(item.name || '');
    setNewCode(item.code || '');
    setNewCategory(item.category || 'Cells');
    setQty(item.qty || 0);
    setUnit(item.unit || 'Kg');
    setSupplier(item.supplier || '');
    setWarehouse(item.warehouse || 'Raw Hub');
    setRack(item.rack || 'A-1');
    setPrice(item.price || 0);
    setNewMinStock(item.minStock ?? 100);
    setNewReorderLevel(item.reorderLevel ?? 250);
    setGrn(item.grn || '');
    setBatch(item.batch || '');
    setChallanNo(item.challanNo || '');
    setVehicleNo(item.vehicleNo || '');
    setEWayBill(item.eWayBill || '');
    setExciseSlip(item.exciseSlip || '');
    setAcceptedQty(item.acceptedQty ?? item.qty ?? 0);
    setDamagedQty(item.damagedQty ?? 0);
    setSubmitError('');
    setIsProcureModalOpen(true);
  };

  const handleDeleteProcurement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this raw material/inventory item?')) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await refetch();
      } else {
        alert('Failed to delete inventory item.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Category CRUD Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) {
      setCategorySubmitError('Category name is required.');
      return;
    }
    setIsSavingCategory(true);
    setCategorySubmitError('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryFormName.trim(),
          code: categoryFormCode.trim() || `CAT-${categoryFormName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          description: categoryFormDesc.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || errJson.message || 'Failed to create inventory category.');
      }

      await refetch();
      setIsAddCategoryModalOpen(false);
      setCategoryFormName('');
      setCategoryFormCode('');
      setCategoryFormDesc('');
    } catch (err: any) {
      setCategorySubmitError(err.message || 'Error creating category.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !categoryFormName.trim()) {
      setCategorySubmitError('Category name is required.');
      return;
    }
    setIsSavingCategory(true);
    setCategorySubmitError('');

    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategory.id,
          oldName: editingCategory.name,
          name: categoryFormName.trim(),
          code: categoryFormCode.trim() || `CAT-${categoryFormName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          description: categoryFormDesc.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || errJson.message || 'Failed to update category.');
      }

      await refetch();
      setIsEditCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryFormName('');
      setCategoryFormCode('');
      setCategoryFormDesc('');
    } catch (err: any) {
      setCategorySubmitError(err.message || 'Error updating category.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsSavingCategory(true);
    setCategorySubmitError('');

    try {
      const res = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || errJson.message || 'Failed to delete category.');
      }

      await refetch();
      setIsDeleteCategoryModalOpen(false);
      setDeletingCategory(null);
    } catch (err: any) {
      setCategorySubmitError(err.message || 'Error deleting category.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: any) => {
    const isObj = typeof cat === 'object' && cat !== null;
    const catObj = isObj ? cat : { id: `cat-${cat}`, name: cat, code: `CAT-${String(cat).substring(0, 4).toUpperCase()}`, description: '' };
    setEditingCategory(catObj);
    setCategoryFormName(catObj.name || '');
    setCategoryFormCode(catObj.code || '');
    setCategoryFormDesc(catObj.description || '');
    setCategorySubmitError('');
    setIsEditCategoryModalOpen(true);
  };

  const handleStartDeleteCategory = (cat: any) => {
    const isObj = typeof cat === 'object' && cat !== null;
    const catObj = isObj ? cat : { id: `cat-${cat}`, name: cat, code: `CAT-${String(cat).substring(0, 4).toUpperCase()}`, description: '' };
    setDeletingCategory(catObj);
    setCategorySubmitError('');
    setIsDeleteCategoryModalOpen(true);
  };

  // Bulk Importer Handlers for Raw Materials
  const handleRmCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (sheetData.length < 1) {
            setRmImportErrorMsg('Excel sheet is empty.');
            setRmImportStatus('error');
            return;
          }
          
          const rawHeaders = sheetData[0].map(h => String(h || '').trim());
          const headers = rawHeaders.map(h => h.toLowerCase());
          const items: any[] = [];
          
          for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) continue;
            
            let name = '';
            let code = '';
            let category = defaultRmCategory;
            let qty = 0;
            let reservedQty = 0;
            let unit = defaultRmUnit;
            let supplier = defaultRmSupplier;
            let warehouse = defaultRmWarehouse;
            let rack = 'A-1';
            let batch = 'BATCH-01';
            let grn = 'GRN-AUTO';
            let price = 0;
            let minStock = 100;
            let reorderLevel = 250;
            let date = new Date().toISOString().substring(0, 10);
            
            headers.forEach((header, index) => {
              const val = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
              
              // 1. Precise mappings
              if (header === 'material category' || header === 'material name category' || header === 'material name' || header === 'item name' || header === 'material' || header === 'name' || header === 'material asset' || header === 'item' || header === 'asset') {
                name = val;
              } else if (header === 'code reference' || header === 'code' || header === 'sku' || header === 'part number' || header === 'part no' || header === 'model') {
                code = val;
              } else if (header === 'classification' || header === 'category' || header === 'class' || header === 'type' || header === 'group') {
                category = val || defaultRmCategory;
              } else if (header === 'qty in' || header === 'quantity' || header === 'qty' || header === 'stock' || header === 'active qty' || header === 'quantity active' || header === 'qty active') {
                qty = Number(val) || 0;
              } else if (header === 'allocated qty' || header === 'allocated' || header === 'reserved' || header === 'reserved qty' || header === 'hold qty') {
                reservedQty = Number(val) || 0;
              } else if (header === 'base unit' || header === 'unit' || header === 'uom' || header === 'measure' || header === 'measure unit') {
                unit = val || defaultRmUnit;
              } else if (header === 'supplier company' || header === 'supplier' || header === 'vendor' || header === 'vendor supplier') {
                supplier = val || defaultRmSupplier;
              } else if (header === 'destination warehouse' || header === 'warehouse' || header === 'warehouse hub' || header === 'hub' || header === 'location') {
                warehouse = val || defaultRmWarehouse;
              } else if (header === 'rack shelf address' || header === 'rack' || header === 'rack address' || header === 'bin' || header === 'shelf') {
                rack = val || rack;
              } else if (header === 'batch id' || header === 'batch' || header === 'lot' || header === 'lot batch') {
                batch = val || batch;
              } else if (header === 'grn reference match' || header === 'grn' || header === 'inward grn') {
                grn = val || grn;
              } else if (header === 'base supplier value' || header === 'price' || header === 'cost' || header === 'purchase price' || header === 'valuation' || header === 'value') {
                price = Number(val) || 0;
              } else if (header === 'minimum stock' || header === 'minimum stock (rol)' || header === 'min stock' || header === 'rol') {
                minStock = Number(val) || 100;
              } else if (header === 'reorder level' || header === 'reorder' || header === 'reorder level (rol)') {
                reorderLevel = Number(val) || 250;
              } else if (header === 'date' || header === 'entry date' || header === 'date added' || header === 'received date') {
                date = val || date;
              }
              // 2. Loose fallback mappings for unmapped fields
              else if (header.includes('material') || header.includes('name')) {
                if (!name) name = val;
              } else if (header.includes('code') || header.includes('sku')) {
                if (!code) code = val;
              } else if (header.includes('category') || header.includes('class') || header.includes('classification')) {
                if (!category) category = val || defaultRmCategory;
              } else if (header.includes('qty') || header.includes('quantity')) {
                if (header.includes('alloc') || header.includes('reserv')) {
                  if (!reservedQty) reservedQty = Number(val) || 0;
                } else {
                  if (!qty) qty = Number(val) || 0;
                }
              } else if (header.includes('unit')) {
                if (!unit) unit = val || defaultRmUnit;
              } else if (header.includes('supplier') || header.includes('vendor')) {
                if (!supplier) supplier = val || defaultRmSupplier;
              } else if (header.includes('warehouse') || header.includes('hub')) {
                if (!warehouse) warehouse = val || defaultRmWarehouse;
              } else if (header.includes('rack') || header.includes('shelf')) {
                if (!rack) rack = val;
              } else if (header.includes('batch') || header.includes('lot')) {
                if (!batch) batch = val;
              } else if (header.includes('grn')) {
                if (!grn) grn = val;
              } else if (header.includes('price') || header.includes('cost') || header.includes('value')) {
                if (!price) price = Number(val) || 0;
              } else if (header.includes('minimum') || header.includes('rol')) {
                minStock = Number(val) || 100;
              } else if (header.includes('reorder')) {
                reorderLevel = Number(val) || 250;
              }
            });
            
            if (name) {
              items.push({ name, code, category, qty, reservedQty, unit, supplier, warehouse, rack, batch, grn, price, minStock, reorderLevel, date });
            }
          }
          
          if (items.length === 0) {
            setRmImportErrorMsg(`Could not parse any valid raw material records. Detected Headers: ${JSON.stringify(rawHeaders)}. Please check your file content.`);
            setRmImportStatus('error');
          } else {
            setParsedRmItems(items);
            setRmImportStatus('parsed');
            setRmImportErrorMsg('');
          }
        } catch (err: any) {
          setRmImportErrorMsg(`Failed to parse Excel file: ${err.message || err}`);
          setRmImportStatus('error');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseRmCSVContent(text);
      };
      reader.readAsText(file);
    }
  };

  const parseRmCSVContent = (text: string) => {
    try {
      const cleanText = text.replace(/^\uFEFF/, '').trim();
      const lines = cleanText.split(/\r?\n/);
      if (lines.length < 1 || (lines.length === 1 && !lines[0])) {
        setRmImportErrorMsg('File is empty.');
        setRmImportStatus('error');
        return;
      }
      
      const firstLine = lines[0].trim();
      if (!firstLine) {
        setRmImportErrorMsg('File lacks dynamic headers.');
        setRmImportStatus('error');
        return;
      }

      // Auto-detect delimiter
      let delimiter = ',';
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;
      
      if (semicolonCount > commaCount && semicolonCount > tabCount) {
        delimiter = ';';
      } else if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
      }

      // Quote-aware CSV line parsing helper
      const parseCSVLineHelper = (lineStr: string, delim: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let insideQuote = false;
        for (let i = 0; i < lineStr.length; i++) {
          const char = lineStr[i];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === delim && !insideQuote) {
            result.push(cur.trim().replace(/^["']|["']$/g, ''));
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        return result;
      };

      // Parse headers and normalize
      const rawHeaders = parseCSVLineHelper(firstLine, delimiter);
      const headers = rawHeaders.map(h => h.trim().toLowerCase());
      
      const items: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLineHelper(line, delimiter);
        
        let name = '';
        let code = '';
        let category = defaultRmCategory;
        let qty = 0;
        let reservedQty = 0;
        let unit = defaultRmUnit;
        let supplier = defaultRmSupplier;
        let warehouse = defaultRmWarehouse;
        let rack = 'A-1';
        let batch = 'BATCH-01';
        let grn = 'GRN-AUTO';
        let price = 0;
        let date = new Date().toISOString().substring(0, 10);
        
        headers.forEach((header, index) => {
          const val = values[index] || '';
          
          // 1. Precise mappings
          if (header === 'material category' || header === 'material name category' || header === 'material name' || header === 'item name' || header === 'material' || header === 'name' || header === 'material asset' || header === 'item' || header === 'asset') {
            name = val;
          } else if (header === 'code reference' || header === 'code' || header === 'sku' || header === 'part number' || header === 'part no' || header === 'model') {
            code = val;
          } else if (header === 'classification' || header === 'category' || header === 'class' || header === 'type' || header === 'group') {
            category = val || defaultRmCategory;
          } else if (header === 'qty in' || header === 'quantity' || header === 'qty' || header === 'stock' || header === 'active qty' || header === 'quantity active' || header === 'qty active') {
            qty = Number(val) || 0;
          } else if (header === 'allocated qty' || header === 'allocated' || header === 'reserved' || header === 'reserved qty' || header === 'hold qty') {
            reservedQty = Number(val) || 0;
          } else if (header === 'base unit' || header === 'unit' || header === 'uom' || header === 'measure' || header === 'measure unit') {
            unit = val || defaultRmUnit;
          } else if (header === 'supplier company' || header === 'supplier' || header === 'vendor' || header === 'vendor supplier') {
            supplier = val || defaultRmSupplier;
          } else if (header === 'destination warehouse' || header === 'warehouse' || header === 'warehouse hub' || header === 'hub' || header === 'location') {
            warehouse = val || defaultRmWarehouse;
          } else if (header === 'rack shelf address' || header === 'rack' || header === 'rack address' || header === 'bin' || header === 'shelf') {
            rack = val || rack;
          } else if (header === 'batch id' || header === 'batch' || header === 'lot' || header === 'lot batch') {
            batch = val || batch;
          } else if (header === 'grn reference match' || header === 'grn' || header === 'inward grn') {
            grn = val || grn;
          } else if (header === 'base supplier value' || header === 'price' || header === 'cost' || header === 'purchase price' || header === 'valuation' || header === 'value') {
            price = Number(val) || 0;
          } else if (header === 'date' || header === 'entry date' || header === 'date added' || header === 'received date') {
            date = val || date;
          }
          // 2. Loose fallback mappings for unmapped fields
          else if (header.includes('material') || header.includes('name')) {
            if (!name) name = val;
          } else if (header.includes('code') || header.includes('sku')) {
            if (!code) code = val;
          } else if (header.includes('category') || header.includes('class') || header.includes('classification')) {
            if (!category) category = val || defaultRmCategory;
          } else if (header.includes('qty') || header.includes('quantity')) {
            if (header.includes('alloc') || header.includes('reserv')) {
              if (!reservedQty) reservedQty = Number(val) || 0;
            } else {
              if (!qty) qty = Number(val) || 0;
            }
          } else if (header.includes('unit')) {
            if (!unit) unit = val || defaultRmUnit;
          } else if (header.includes('supplier') || header.includes('vendor')) {
            if (!supplier) supplier = val || defaultRmSupplier;
          } else if (header.includes('warehouse') || header.includes('hub')) {
            if (!warehouse) warehouse = val || defaultRmWarehouse;
          } else if (header.includes('rack') || header.includes('shelf')) {
            if (!rack) rack = val;
          } else if (header.includes('batch') || header.includes('lot')) {
            if (!batch) batch = val;
          } else if (header.includes('grn')) {
            if (!grn) grn = val;
          } else if (header.includes('price') || header.includes('cost') || header.includes('value')) {
            if (!price) price = Number(val) || 0;
          }
        });
        
        if (name) {
          items.push({ name, code, category, qty, reservedQty, unit, supplier, warehouse, rack, batch, grn, price, date });
        }
      }
      
      if (items.length === 0) {
        setRmImportErrorMsg(`Could not parse any valid raw material records. Detected delimiter: "${delimiter}". Detected Headers: ${JSON.stringify(rawHeaders)}. Please check your file content.`);
        setRmImportStatus('error');
      } else {
        setParsedRmItems(items);
        setRmImportStatus('parsed');
        setRmImportErrorMsg('');
      }
    } catch (err) {
      console.error(err);
      setRmImportErrorMsg('Failed to parse CSV file.');
      setRmImportStatus('error');
    }
  };

  const handlePastedRmTextParse = () => {
    if (!pastedRmText.trim()) return;
    
    // Split by newlines
    const lines = pastedRmText.split(/\n/);
    const items: any[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Tokenize by tab, comma, or semicolon
      const tokens = trimmed.split(/[\t,;]/).map(t => t.trim().replace(/^["']|["']$/g, ''));
      const name = tokens[0] || '';
      const qtyStr = tokens[1] || '0';
      const code = tokens[2] || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
      
      if (name && name.length > 1) {
        items.push({
          name,
          qty: Number(qtyStr) || 0,
          code,
          category: defaultRmCategory,
          unit: defaultRmUnit,
          supplier: defaultRmSupplier,
          warehouse: defaultRmWarehouse,
          rack: 'A-1',
          batch: 'BATCH-01',
          grn: 'GRN-PASTE',
          price: 150,
          date: new Date().toISOString().substring(0, 10)
        });
      }
    });
    
    if (items.length === 0) {
      setRmImportErrorMsg('Could not find any valid raw material names in pasted text.');
      setRmImportStatus('error');
    } else {
      setParsedRmItems(items);
      setRmImportStatus('parsed');
      setRmImportErrorMsg('');
    }
  };

  const handleCommitRmBulkImport = async () => {
    if (parsedRmItems.length === 0) return;
    setRmImportStatus('submitting');
    
    try {
      const response = await fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedRmItems })
      });
      
      if (response.ok) {
        const result = await response.json();
        setRmSuccessToast(`SUCCESSFULLY IMPORTED ${result.addedCount} NEW RECORDS!`);
        setTimeout(() => setRmSuccessToast(''), 4000);
        await refetch();
        setRmImportStatus('success');
        setTimeout(() => {
          setShowRmImportModal(false);
          resetRmImporter();
        }, 1500);
      } else {
        const errorData = await response.json();
        setRmImportErrorMsg(errorData.error || 'Server rejected raw material bulk import.');
        setRmImportStatus('error');
      }
    } catch (err) {
      console.error(err);
      setRmImportErrorMsg('Network error committing bulk import.');
      setRmImportStatus('error');
    }
  };

  const resetRmImporter = () => {
    setRmImportStatus('idle');
    setParsedRmItems([]);
    setPastedRmText('');
    setRmImportErrorMsg('');
  };

  const handleDownloadRmExcelTemplate = () => {
    const headings = [
      'Material category',
      'code reference',
      'classification',
      'base unit',
      'supplier company',
      'batch ID',
      'GRN reference match',
      'base supplier value',
      'destination warehouse',
      'rack shelf address',
      'qty in',
      'allocated qty'
    ];
    const sampleRows = [
      ['Lithium Cells (3.2V 100Ah)', 'CELL-100AH', 'Cells', 'Pcs', 'Energy Plus Ltd', 'EP-2026', 'GRN-7722', 320, 'Raw Hub', 'C-10', 5000, 0],
      ['Fiberglass Casing Shell', 'SHELL-72V', 'Accessories', 'Pcs', 'PlateTech Shells', 'PT-2026', 'GRN-7723', 1200, 'Raw Hub', 'S-04', 150, 20],
      ['Premium Epoxy Paste', 'CHEM-EPX', 'Raw Material', 'Kg', 'Chemicals India Ltd', 'CH-2026', 'GRN-7724', 450, 'Raw Hub', 'A-02', 80, 0]
    ];
    const wsData = [headings, ...sampleRows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Raw Materials");
    XLSX.writeFile(wb, "arcenol_raw_materials_template.xlsx");
  };

  const handleDownloadRmCSVTemplate = () => {
    const headings = [
      'Material category',
      'code reference',
      'classification',
      'base unit',
      'supplier company',
      'batch ID',
      'GRN reference match',
      'base supplier value',
      'destination warehouse',
      'rack shelf address',
      'qty in',
      'allocated qty'
    ];
    const sampleRows = [
      ['Lithium Cells (3.2V 100Ah)', 'CELL-100AH', 'Cells', 'Pcs', 'Energy Plus Ltd', 'EP-2026', 'GRN-7722', '320', 'Raw Hub', 'C-10', '5000', '0'],
      ['Fiberglass Casing Shell', 'SHELL-72V', 'Accessories', 'Pcs', 'PlateTech Shells', 'PT-2026', 'GRN-7723', '1200', 'Raw Hub', 'S-04', '150', '20'],
      ['Premium Epoxy Paste', 'CHEM-EPX', 'Raw Material', 'Kg', 'Chemicals India Ltd', 'CH-2026', 'GRN-7724', '450', 'Raw Hub', 'A-02', '80', '0']
    ];
    const csvContent = [headings.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "arcenol_raw_materials_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmitCellGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellSerial.trim()) {
      setSubmitError('Serial reference is required');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');

    // Determine Grade based on technical limits
    let finalGrade = 'C';
    let usage = 'ESS / Storage Systems';
    if (cellVoltage >= 3.2 && cellIR <= 8.0 && cellCapacity >= 6000) {
      finalGrade = 'A';
      usage = 'Premium EV Battery Packs';
    } else if (cellVoltage >= 3.1 && cellIR <= 12.0 && cellCapacity >= 5500) {
      finalGrade = 'B';
      usage = 'Standard Solar Storage Packs';
    } else if (cellVoltage < 3.0 || cellIR > 15.0 || cellCapacity < 4500) {
      finalGrade = 'REJECT';
      usage = 'Scrap Reprocessing';
    }

    try {
      let res;
      if (editingGradedId) {
        res = await fetch(`/api/cells/grade/${editingGradedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cellData: {
              serial: cellSerial.toUpperCase(),
              grade: finalGrade,
              voltage: cellVoltage,
              ir: cellIR,
              capacity: cellCapacity,
              cycleCount: cellCycleCount,
              temp: cellTemp,
              engineer: qcEngineer,
              usage
            }
          })
        });
      } else {
        const parentItem = data?.inventory.find((i: any) => i.id === gradingParentId);
        res = await fetch('/api/cells/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: gradingParentId,
            cellData: {
              serial: cellSerial.toUpperCase(),
              name: `${parentItem?.name || 'Prismatic Cell'} (Graded)`,
              grade: finalGrade,
              voltage: cellVoltage,
              ir: cellIR,
              capacity: cellCapacity,
              cycleCount: cellCycleCount,
              temp: cellTemp,
              engineer: qcEngineer,
              usage,
              supplier: parentItem?.supplier || 'Arcenol Depot'
            }
          })
        });
      }

      if (!res.ok) throw new Error('Error saving cell data to graded vault.');
      
      setGradingSuccess(editingGradedId ? `SUCCESS: Updated graded cell ${cellSerial}` : `SUCCESS: Registered Node ${cellSerial} as Grade ${finalGrade} (${usage})`);
      setCellSerial('');
      setEditingGradedId(null);
      refetch();
      setTimeout(() => setGradingSuccess(''), 4000);
    } catch (err: any) {
      setSubmitError(err.message || 'Execution error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditGraded = (item: any) => {
    setEditingGradedId(item.id);
    setCellSerial(item.serial || '');
    setCellVoltage(item.voltage || 3.2);
    setCellIR(item.ir || 7.5);
    setCellCapacity(item.capacity || 6000);
    setCellCycleCount(item.cycleCount || 0);
    setCellTemp(item.temp || 24.5);
    setQcEngineer(item.engineer || user?.name || 'Suresh P.');
    setSubmitError('');
    setIsGradingModalOpen(true);
  };

  const handleDeleteGraded = async (id: string) => {
    if (!confirm('Are you sure you want to delete this graded cell record? The parent stock quantity will be returned.')) return;
    try {
      const res = await fetch(`/api/cells/grade/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await refetch();
      } else {
        alert('Failed to delete cell grading record.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWarehouseTransfer = async () => {
    if (!transferItem || transferQty <= 0) return;
    if (transferQty > transferItem.qty) {
      setTransferError('Cannot transfer more than available stock.');
      return;
    }
    setTransferError('');
    setIsSubmitting(true);

    try {
      // API call or simulation on local state
      // Deducting from source, adding to destination
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingItemId: transferItem.id,
          qty: -transferQty,
          warehouse: sourceWh
        })
      });

      if (!res.ok) throw new Error('Failed to deduct from source');

      const res2 = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: transferItem.name,
          code: transferItem.code,
          category: transferItem.category,
          unit: transferItem.unit,
          qty: transferQty,
          warehouse: destWh,
          supplier: transferItem.supplier,
          batch: transferItem.batch + '-TR',
          rack: 'TR-1'
        })
      });

      if (!res2.ok) throw new Error('Failed to credit to destination');

      await refetch();
      setIsTransferModalOpen(false);
      setTransferItem(null);
      setTransferQty(0);
    } catch (e: any) {
      setTransferError(e.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <div className="relative p-8 bg-slate-100 rounded-full animate-bounce">
        <Database className="text-primary-600" size={48} />
      </div>
      <span className="font-sans font-black text-xs uppercase tracking-[0.3em] text-slate-400 mt-6">Calibrating Arcenol ERP Material Matrix...</span>
    </div>
  );

  const inventory = data?.inventory || [];
  const gradedCells = data?.gradedInventory || [];
  const rawWarehouses = data?.warehouses || ["Main Warehouse", "Production Warehouse", "QC Warehouse", "Service Warehouse", "Scrap Warehouse"];
  const warehouses: string[] = Array.from(new Set(rawWarehouses.map((w: any) => typeof w === 'object' && w !== null ? (w.name || String(w.id || '')) : String(w)).filter(Boolean)));
  const products = useMemo(() => {
    const defaultBase = [
      { id: "72V30A", model_id: "72V30A", name: "E-Rickshaw Batteries (72V30A)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 45000 },
      { id: "BAT-AUTO-35", model_id: "BAT-AUTO-35", name: "Scooter Batteries (BAT-AUTO-35)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 32000 },
      { id: "PROD-EV-BIKE", model_id: "PROD-EV-BIKE", name: "Bike Batteries (PROD-EV-BIKE)", category: "CATEGORY 1 — EV BATTERY INVENTORY", type: "EV Battery Pack", price: 38000 },
      { id: "BAT-VRLA-100", model_id: "BAT-VRLA-100", name: "12V 100Ah (BAT-VRLA-100)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "Solar Battery", price: 14000 },
      { id: "BAT-INV-150", model_id: "BAT-INV-150", name: "24V 150Ah (BAT-INV-150)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "Tubular Battery", price: 18500 },
      { id: "PROD-SOLAR-48VESS", model_id: "PROD-SOLAR-48VESS", name: "48V ESS Packs (PROD-SOLAR-48VESS)", category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY", type: "ESS Battery Pack", price: 75000 },
      { id: "PROD-ESS-TELECOM", model_id: "PROD-ESS-TELECOM", name: "Telecom Batteries (PROD-ESS-TELECOM)", category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY", type: "Industrial Pack", price: 85000 }
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
            name: p.name || existing?.name || id
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
            price: 0
          });
        }
      });
    }

    return Array.from(map.values());
  }, [data?.products, data?.finishedGoods]);

  useEffect(() => {
    if (products && products.length > 0 && !mrpProductModel) {
      setMrpProductModel(products[0].id || products[0].model_id || '72V30A');
    }
  }, [products, mrpProductModel]);

  useEffect(() => {
    if (mrpProductModel) {
      handleFetchMRP();
    }
  }, [mrpProductModel]);

  // Sub-table searching/filtering
  const filteredProcureItems = inventory.filter((item: any) => {
    if (!subSearchProcure) return true;
    const term = subSearchProcure.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.code && item.code.toLowerCase().includes(term)) ||
      (item.supplier && item.supplier.toLowerCase().includes(term)) ||
      (item.batch && item.batch.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
  });

  const filteredGradingItems = gradedCells.filter((cell: any) => {
    if (!subSearchGrading) return true;
    const term = subSearchGrading.toLowerCase();
    return (
      (cell.serial && cell.serial.toLowerCase().includes(term)) ||
      (cell.grade && cell.grade.toLowerCase().includes(term)) ||
      (cell.engineer && cell.engineer.toLowerCase().includes(term)) ||
      (cell.usage && cell.usage.toLowerCase().includes(term))
    );
  });

  // Computed Values
  const totalValuation = inventory.reduce((acc: number, item: any) => acc + (item.qty * (item.price || 0)), 0);
  const rawStockQty = inventory.reduce((acc: number, i: any) => acc + i.qty, 0);
  const reservedQtySum = inventory.reduce((acc: number, i: any) => acc + (i.reservedQty || 0), 0);
  const lowMaterials = inventory.filter((item: any) => item.qty < (item.minStock || 0));
  
  // Graded distribution
  const gradeA = gradedCells.filter((c: any) => c.grade === 'A').length;
  const gradeB = gradedCells.filter((c: any) => c.grade === 'B').length;
  const gradeC = gradedCells.filter((c: any) => c.grade === 'C').length;
  const rejected = gradedCells.filter((c: any) => c.grade === 'REJECT').length;
  const totalGraded = gradedCells.length;

  const avgIR = totalGraded > 0 
    ? (gradedCells.reduce((acc: number, c: any) => acc + (c.ir || 0), 0) / totalGraded).toFixed(2)
    : "0.00";

  const supplierDefectsRatio = totalGraded > 0 
    ? ((rejected / totalGraded) * 100).toFixed(1)
    : "0.0";

  // Recharts Data Mapping
  const chartGradeData = [
    { name: 'Grade A Premium', value: gradeA || 20, fill: '#059669' },
    { name: 'Grade B Economy', value: gradeB || 12, fill: '#f59e0b' },
    { name: 'Grade C Secondary', value: gradeC || 8, fill: '#3b82f6' },
    { name: 'Rejected Scrap', value: rejected || 3, fill: '#ef4444' },
  ];

  const consumptionTrendData = [
    { month: 'Jan', cells: 4800, bms: 32 },
    { month: 'Feb', cells: 6200, bms: 45 },
    { month: 'Mar', cells: 7500, bms: 58 },
    { month: 'Apr', cells: 8200, bms: 60 },
    { month: 'May', cells: 9800, bms: 72 },
    { month: 'Jun', cells: 12000, bms: 88 },
  ];

  const filteredInventory = (inventory || []).filter((item: any) => {
    if (!item) return false;
    const nameStr = (item.name || '').toLowerCase();
    const idStr = (item.id || '').toLowerCase();
    const codeStr = (item.code || '').toLowerCase();
    const supplierStr = (item.supplier || '').toLowerCase();
    const batchStr = (item.batch || '').toLowerCase();
    const searchTerm = search.trim().toLowerCase();

    const matchesSearch = !searchTerm || 
      nameStr.includes(searchTerm) || 
      idStr.includes(searchTerm) || 
      codeStr.includes(searchTerm) ||
      supplierStr.includes(searchTerm) ||
      batchStr.includes(searchTerm);

    const itemCat = (item.category || '').trim();
    const filterCat = filterCategory.trim();

    const matchesCategory = filterCat === 'ALL' || 
      itemCat === filterCat || 
      itemCat.toLowerCase() === filterCat.toLowerCase() ||
      (filterCat.toLowerCase().includes('cell') && itemCat.toLowerCase().includes('cell')) ||
      (filterCat.toLowerCase().includes('raw') && (itemCat.toLowerCase().includes('raw') || itemCat.toLowerCase().includes('chem') || itemCat.toLowerCase().includes('sep')));

    return matchesSearch && matchesCategory;
  });

  const totalRmPages = Math.ceil(filteredInventory.length / rmItemsPerPage) || 1;
  const paginatedInventory = filteredInventory.slice(
    (rmCurrentPage - 1) * rmItemsPerPage,
    rmCurrentPage * rmItemsPerPage
  );

  const totalPoPages = Math.ceil(filteredPurchaseOrders.length / poItemsPerPage) || 1;
  const paginatedPOs = filteredPurchaseOrders.slice(
    (poCurrentPage - 1) * poItemsPerPage,
    poCurrentPage * poItemsPerPage
  );

  const totalGradedPages = Math.ceil(filteredGradingItems.length / gradedItemsPerPage) || 1;
  const paginatedGraded = filteredGradingItems.slice(
    (gradedCurrentPage - 1) * gradedItemsPerPage,
    gradedCurrentPage * gradedItemsPerPage
  );

  const rawCategories = (() => {
    const list: any[] = [];
    const seen = new Set<string>();
    
    const addCat = (c: any) => {
      if (!c) return;
      const name = typeof c === 'object' ? (c.name || '') : String(c);
      const cleanName = name.trim();
      if (!cleanName || seen.has(cleanName.toLowerCase())) return;
      seen.add(cleanName.toLowerCase());
      if (typeof c === 'object' && c.name) {
        list.push(c);
      } else {
        list.push({
          id: `cat-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: cleanName,
          code: `CAT-${cleanName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
          description: ''
        });
      }
    };

    if (Array.isArray(data?.categories)) data.categories.forEach(addCat);
    if (Array.isArray(data?.productCategories)) data.productCategories.forEach(addCat);

    if (list.length === 0) {
      [
        { id: "cat-1", name: "Category 1 — EV Battery Inventory", code: "CAT-EV", description: "EV Battery Packs and Assembly Modules" },
        { id: "cat-2", name: "Category 2 — Solar / Inverter Battery Inventory", code: "CAT-SOLAR", description: "Solar and Inverter High-Efficiency Batteries" },
        { id: "cat-3", name: "Category 3 — ESS / Industrial Battery Inventory", code: "CAT-ESS", description: "Energy Storage Systems & Industrial Power Units" },
        { id: "cat-4", name: "Category 4 — Raw Materials & Components", code: "CAT-RAW", description: "Raw Material stock including Lead, Oxide, Acid, and Separators" },
        { id: "cat-5", name: "Category 5 — Cells & Graded Stock", code: "CAT-CELLS", description: "Lithium-Ion and Graded Battery Cells" },
        { id: "cat-6", name: "Category 6 — Electronics & BMS", code: "CAT-ELEC", description: "Smart BMS, PCB circuits, and electronic controllers" },
        { id: "cat-7", name: "Category 7 — Accessories & Connectors", code: "CAT-ACC", description: "Chargers, connectors, adapters, and wiring harnesses" }
      ].forEach(addCat);
    }
    return list;
  })();

  const categoryList = rawCategories.map((c: any) => typeof c === 'object' ? (c.name ? c : { id: `cat-${c}`, name: String(c), code: 'CAT', description: '' }) : { id: `cat-${String(c)}`, name: String(c), code: `CAT-${String(c).substring(0, 4).toUpperCase()}`, description: '' });
  const baseCategoryNames = Array.from(new Set(categoryList.map((c: any) => c.name)));
  const itemCategories = Array.from(new Set((inventory || []).map((i: any) => i.category).filter(Boolean)));
  const categoryNames = Array.from(new Set([...baseCategoryNames, ...itemCategories]));
  const categories = ['ALL', ...categoryNames];

  const flowStages = [
    { title: "RAW MATERIAL PURCHASE", desc: "Certified vendor purchase tracking", metric: `${inventory.length} SKU Catalog`, icon: Tag, color: "text-blue-500", bg: "bg-blue-50", action: () => { setFilterCategory('ALL'); setActiveTab('raw'); } },
    { title: "INWARD / GRN ENTRY", desc: "Goods Receipt Arrival Verification", metric: `Draft GRNs: 3`, icon: ArrowUpRight, color: "text-indigo-500", bg: "bg-indigo-50", action: () => { setIsProcureModalOpen(true); } },
    { title: "QUALITY CHECK (QC) HOLD", desc: "Safety inspection quarantined lot", metric: `${inventory.filter((i:any) => i.qcStatus === 'HOLD').length} Holds`, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", action: () => { setFilterCategory('ALL'); setActiveTab('raw'); } },
    { title: "GRADE / CLASSIFICATION", desc: "Ohmic impedance capacity sorting", metric: `${gradedCells.length} Graded Cells`, icon: Zap, color: "text-emerald-500", bg: "bg-emerald-50", action: () => { setActiveTab('graded'); } },
    { title: "RAW MATERIAL STORAGE", desc: "Warehouse rack shelf assignment", metric: `${warehouses.length} Active Hubs`, icon: Warehouse, color: "text-purple-500", bg: "bg-purple-50", action: () => { setActiveTab('warehouse'); } },
    { title: "MRP RESERVATION & ALLOCATION", desc: "BOM dynamic locking mechanism", metric: `${reservedQtySum} Reserved items`, icon: Sliders, color: "text-cyan-500", bg: "bg-cyan-50", action: () => { setActiveTab('mrp'); } },
    { title: "SEMI-FINISHED INVENTORY", desc: "WIP welded modules & calibrated circuit", metric: `${data?.wipInventory?.length || 0} Batches Active`, icon: ClipboardList, color: "text-rose-500", bg: "bg-rose-50", action: () => { setActiveTab('wip'); } },
    { title: "FINAL PRODUCT INVENTORY", desc: "Pack assembly complete certified lots", metric: `${data?.finishedGoods?.length || 0} Finished Packs`, icon: CheckCircle2, color: "text-sky-500", bg: "bg-sky-50", action: () => { setIsFinalInventoryModalOpen(true); } },
    { title: "DISPATCH / SALES LEDGER", desc: "E-Way bills, outbound commercial invoices", metric: `${data?.invoices?.length || 0} Invoices Generated`, icon: History, color: "text-teal-500", bg: "bg-teal-50", action: () => { setIsSalesLedgerModalOpen(true); } },
    { title: "RMA SERVICE RETURN", desc: "Defective disassembly reprocessing line", metric: `${data?.complaints?.length || 0} Incidents Logs`, icon: RefreshCw, color: "text-pink-500", bg: "bg-pink-50", action: () => { setIsRmaModalOpen(true); } },
  ];

  return (
    <div className={cn("space-y-8 pb-20 transition-all duration-300", isSyncing && "opacity-60 blur-[1px]")}>
      
      {/* Header Banner */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-[9px] font-black uppercase tracking-wider">Arcenol Energy Solutions</span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">ERP Node ID: 399878B5</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic mt-2">
            Lithium-Ion Inventory Matrix
          </h2>
          <p className="text-slate-400 font-sans text-xs font-bold uppercase tracking-widest mt-1">
            Raw Materials, Chemical Processing, Lab Grade Cells & BOM MRP Management
          </p>
        </div>
        
        <div className="flex items-center flex-wrap gap-3">
          <button 
            type="button"
            onClick={() => refetch()}
            className="p-3 bg-slate-50 text-slate-500 rounded-2xl border border-slate-200 hover:text-slate-900 shadow-sm hover:bg-slate-100 transition-all active:scale-95 flex items-center"
            title="Refresh Data Logs"
          >
            <RefreshCw size={18} className="animate-spin-slow" />
          </button>
          
          <button 
            onClick={() => { setIsProcureModalOpen(true); setSubmitError(''); }}
            className="bg-primary-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center shadow-xl shadow-primary-500/10 hover:bg-primary-700 transition-all active:scale-95"
            id="btn_procure_inventory"
          >
            <Plus size={16} className="mr-2" /> Log Procurement
          </button>
          
          <button 
            onClick={() => setActiveTab('categories')}
            className="bg-amber-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center shadow-xl shadow-amber-500/10 hover:bg-amber-700 transition-all active:scale-95"
            id="btn_manage_categories_header"
          >
            <Tag size={16} className="mr-2" /> Manage Categories
          </button>
          
          <button 
            onClick={() => setIsGradingModalOpen(true)}
            className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center shadow-xl shadow-emerald-500/10 hover:bg-emerald-700 transition-all active:scale-95"
            id="btn_grading_lab"
          >
            <Microscope size={16} className="mr-2" /> QC Cell Testing
          </button>
        </div>
      </div>

      {/* Modern Horizontal Navigation Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-100/80 rounded-[2rem] border border-slate-200/50 w-full overflow-x-auto whitespace-nowrap scrollbar-none shadow-inner">
        {[
          { id: 'dashboard', label: 'Inventory Overview & KPI', icon: BarChart3 },
          { id: 'pos', label: 'Purchase Orders (POs)', icon: ShoppingCart },
          { id: 'raw', label: 'Raw Master Registry', icon: Package },
          { id: 'graded', label: 'Cell Grading Lab', icon: Zap },
          { id: 'mrp', label: 'MRP BOM Allocator', icon: ClipboardList },
          { id: 'wip', label: 'WIP Processing Line', icon: Sliders },
          { id: 'warehouse', label: 'Warehouse Hub & Transfer', icon: Warehouse },
          { id: 'categories', label: 'Manage Categories', icon: Tag }
        ].map(tab => (
          <button
            key={tab.id}
            id={`tab_${tab.id}`}
            onClick={() => handleAction(`Log switch to ${tab.label}`, () => setActiveTab(tab.id as any))}
            className={cn(
              "flex items-center px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300",
              activeTab === tab.id 
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50 scale-[1.01]" 
                : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
            )}
          >
            <tab.icon size={13} className="mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          
          {/* Interactive Inventory Pipeline Architecture */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <Layers size={180} />
             </div>
             
             <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div>
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-600 mr-2.5 animate-pulse"></span>
                      Integrated Inventory Pipeline Architecture
                   </h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      Arcenol Energy Solutions Pvt Ltd — End-to-End Battery Manufacturing Lifecycle Flow (Interactive Stage-wise Map)
                   </p>
                </div>
                <span className="text-[9px] bg-primary-50 text-primary-600 font-black px-3 py-1.5 rounded-xl border border-primary-100 uppercase tracking-widest shrink-0">
                   REAL-TIME PRODUCTION SYNCHRONIZED
                </span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
                {flowStages.map((stage, sIdx) => (
                   <div 
                      key={stage.title}
                      onClick={stage.action}
                      className="bg-slate-50 border border-slate-200/50 hover:bg-white hover:border-primary-200 hover:shadow-xl hover:shadow-slate-100 hover:scale-[1.03] transition-all duration-300 p-5 rounded-[1.8rem] flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                   >
                      <div className="absolute right-3 top-2 text-[22px] font-black italic select-none text-slate-100 group-hover:text-primary-100/30 transition-colors leading-none">
                         {(sIdx + 1).toString().padStart(2, '0')}
                      </div>
                      <div className="flex items-center space-x-3 mb-3 shrink-0">
                         <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:rotate-6", stage.bg, stage.color)}>
                            <stage.icon size={16} />
                         </div>
                         <h4 className="text-[11px] font-black text-slate-800 tracking-tight leading-snug group-hover:text-primary-600 transition-colors uppercase">
                            {stage.title}
                         </h4>
                      </div>
                      <div className="mt-2">
                         <p className="text-[9px] text-slate-400 font-medium leading-normal mb-3">
                            {stage.desc}
                         </p>
                         <p className="text-[10px] font-black text-slate-700 font-mono tracking-wide flex items-center bg-white/50 py-1.5 px-3 rounded-lg border border-slate-100 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0 animate-pulse"></span>
                            {stage.metric}
                         </p>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            
            <div className="bg-white p-4 sm:p-5 lg:p-4 xl:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 shadow-xs hover:border-primary-300 transition-all group min-w-0 overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Total Asset Value</p>
              <h4 className="text-lg sm:text-xl lg:text-base xl:text-xl 2xl:text-2xl font-black text-slate-800 mt-2 tracking-tighter italic font-mono truncate max-w-full block" title={formatCurrency(totalValuation)}>{formatCurrency(totalValuation)}</h4>
              <span className="text-[8px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-md font-bold uppercase mt-3 inline-block shrink-0">100% Audited</span>
            </div>

            <div className="bg-white p-4 sm:p-5 lg:p-4 xl:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all group min-w-0 overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Available Stock Qty</p>
              <h4 className="text-lg sm:text-xl lg:text-base xl:text-xl 2xl:text-2xl font-black text-slate-800 mt-2 tracking-tighter font-mono truncate max-w-full block" title={(rawStockQty).toLocaleString()}>{(rawStockQty).toLocaleString()}</h4>
              <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold uppercase mt-3 inline-block shrink-0">Active Stock</span>
            </div>

            <div className="bg-white p-4 sm:p-5 lg:p-4 xl:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all group min-w-0 overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">MRP Reserved Stock</p>
              <h4 className="text-lg sm:text-xl lg:text-base xl:text-xl 2xl:text-2xl font-black text-slate-800 mt-2 tracking-tighter font-mono truncate max-w-full block" title={reservedQtySum.toLocaleString()}>{reservedQtySum.toLocaleString()}</h4>
              <span className="text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-bold uppercase mt-3 inline-block shrink-0">Locked Qty</span>
            </div>

            <div className={cn(
              "p-4 sm:p-5 lg:p-4 xl:p-6 rounded-[1.5rem] sm:rounded-[2rem] border transition-all group min-w-0 overflow-hidden",
              lowMaterials.length > 0 ? "bg-red-50/40 border-red-200 hover:border-red-400" : "bg-white border-slate-200/80 hover:border-emerald-300"
            )}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Low Stock SKUs</p>
              <h4 className={cn("text-lg sm:text-xl lg:text-base xl:text-xl 2xl:text-2xl font-black mt-2 tracking-tighter font-mono truncate max-w-full block", lowMaterials.length > 0 ? "text-red-650" : "text-slate-800")} title={lowMaterials.length.toString()}>
                {lowMaterials.length}
              </h4>
              <span className={cn(
                "text-[8px] px-2 py-0.5 rounded-md font-bold uppercase mt-3 inline-block shrink-0",
                lowMaterials.length > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
              )}>Reorder Alerts</span>
            </div>

            <div className="bg-white p-4 sm:p-5 lg:p-4 xl:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all group min-w-0 overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Grade A Cells</p>
              <h4 className="text-lg sm:text-xl lg:text-base xl:text-xl 2xl:text-2xl font-black text-emerald-600 mt-2 tracking-tighter font-mono flex items-baseline gap-1 min-w-0" title={`${gradeA} Pcs`}>
                <span className="truncate">{gradeA}</span>
                <span className="text-[10px] text-slate-400 font-normal shrink-0">Pcs</span>
              </h4>
              <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold uppercase mt-3 inline-block shrink-0">Premium Grade</span>
            </div>

            <div className="bg-white p-4 sm:p-5 lg:p-4 xl:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200/80 shadow-xs hover:border-red-300 transition-all group min-w-0 overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Scrap Inventory Weight</p>
              <h4 className="text-lg sm:text-xl lg:text-base xl:text-xl 2xl:text-2xl font-black text-red-600 mt-2 tracking-tighter font-mono flex items-baseline gap-1 min-w-0" title={`${rejected} Pcs`}>
                <span className="truncate">{rejected}</span>
                <span className="text-[10px] text-slate-400 font-normal shrink-0">Pcs</span>
              </h4>
              <span className="text-[8px] bg-red-50 text-red-500 px-2 py-0.5 rounded-md font-bold uppercase mt-3 inline-block shrink-0">Wastage Pool</span>
            </div>

          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Visual 1: Material Consumption Trend */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Estimated Material Consumption Velocity</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monthly consumption of Lithium Cells (Pcs) & Smart BMS Units</p>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">H1 2026 Production</span>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={consumptionTrendData}>
                    <defs>
                      <linearGradient id="colorCells" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBms" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cells" name="Lithium Cells" stroke="#0891b2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCells)" />
                    <Area type="monotone" dataKey="bms" name="BMS Packs" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBms)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Visual 2: Cell Grade Distribution */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider mb-1">Testing Grade Distribution</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lithium cell sorting parameters in laboratory environment</p>
                
                <div className="h-[180px] mt-6 flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartGradeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartGradeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} Cells`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Average IR Level</p>
                  <p className="text-2xl font-black text-primary-600 mt-1 italic tracking-tight">{avgIR} <span className="text-xs not-italic text-slate-400">mΩ</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supplier Defect %</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 italic tracking-tight">{supplierDefectsRatio}%</p>
                </div>
              </div>
            </div>

          </div>

          {/* Active Stock Alerts and Thresholds */}
          <div className="bg-slate-900 text-slate-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 p-12 opacity-[0.03] text-white">
              <Boxes size={220} />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Critical Procurement Optimization</h3>
              <p className="text-xs text-slate-400 mt-1">
                There are currently {lowMaterials.length} materials running below safety reservation levels. Automatic purchase orders are queued.
              </p>
            </div>
            <div className="flex gap-4 relative z-10 shrink-0">
              <button 
                onClick={() => { setActiveTab('raw'); setFilterCategory('ALL'); }}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
              >
                Track Shortages
              </button>
              <button 
                onClick={() => { setIsProcureModalOpen(true); }}
                className="px-6 py-3.5 bg-primary-500 hover:bg-primary-600 text-black font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-primary-500/10"
              >
                Trigger Purchase ROL
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB: PURCHASE ORDERS & VENDOR SUPPLY TRACKING */}
      {activeTab === 'pos' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          
          {/* Header Banner */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <ShoppingCart size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Purchase Orders & Vendor Supply Tracking</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inward Logistics, Vendor Confirmations, Gate Entries & GRN Inspection Records</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  downloadReportDataAsPDF({
                    title: "Purchase Orders & Vendor Supply Report",
                    subtitle: "Arcenol Energy Solutions — Inward Logistics & Supply Commitments",
                    headers: ["PO ID", "Material Component", "Vendor", "Qty & Unit", "Total Value", "Status", "Estimated Delivery"],
                    rows: filteredPurchaseOrders.map((p: any) => [
                      p.id,
                      p.materialName,
                      p.vendor,
                      `${p.qty} ${p.unit}`,
                      `₹${(p.totalAmount || (p.qty * p.unitCost) || 0).toLocaleString()}`,
                      p.status,
                      p.estimatedDelivery
                    ]),
                    filename: `Purchase_Orders_Report_${new Date().toISOString().split('T')[0]}.pdf`
                  });
                }}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center gap-2"
              >
                <Download size={14} /> Export Report PDF
              </button>
              <button
                onClick={() => setIsCreatePoModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 transition-all active:scale-95 italic flex items-center gap-2"
              >
                <Plus size={16} /> + Create Purchase Order
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Active POs</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight italic">{purchaseOrdersList.length}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-1">Inward Pipeline</p>
            </div>

            <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100 shadow-sm">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Pending Confirmation</p>
              <p className="text-2xl font-black text-amber-700 tracking-tight italic">{purchaseOrdersList.filter((p: any) => p.status === 'Pending Supplier Confirmation').length}</p>
              <p className="text-[9px] font-bold text-amber-600/70 mt-1">Awaiting Supplier EDI</p>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 shadow-sm">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">In Transit</p>
              <p className="text-2xl font-black text-blue-700 tracking-tight italic">{purchaseOrdersList.filter((p: any) => p.status === 'In Transit').length}</p>
              <p className="text-[9px] font-bold text-blue-600/70 mt-1">On Highway Trucks</p>
            </div>

            <div className="bg-purple-50/50 p-6 rounded-[2rem] border border-purple-100 shadow-sm">
              <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1">Arrived at Gate</p>
              <p className="text-2xl font-black text-purple-700 tracking-tight italic">{purchaseOrdersList.filter((p: any) => p.status === 'Arrived at Gate').length}</p>
              <p className="text-[9px] font-bold text-purple-600/70 mt-1">Pending QC Entry</p>
            </div>

            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">GRN Received</p>
              <p className="text-2xl font-black text-emerald-700 tracking-tight italic">{purchaseOrdersList.filter((p: any) => p.status === 'GRN Received').length}</p>
              <p className="text-[9px] font-bold text-emerald-600/70 mt-1">Stock Ingested</p>
            </div>
          </div>

          {/* Search and Status Filter Toolbar */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 min-w-[280px] relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search PO ID, Material, Vendor, Tracking #"
                value={poSearch}
                onChange={e => setPoSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: 'All POs' },
                { id: 'Pending Supplier Confirmation', label: 'Pending Confirmation' },
                { id: 'In Transit', label: 'In Transit' },
                { id: 'Arrived at Gate', label: 'Arrived at Gate' },
                { id: 'GRN Received', label: 'GRN Received' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPoStatusFilter(f.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                    poStatusFilter === f.id
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* PO Cards Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-5 pl-8">PO Reference & Date</th>
                    <th className="p-5">Material Component</th>
                    <th className="p-5">Vendor Details</th>
                    <th className="p-5 text-right">Order Quantity</th>
                    <th className="p-5 text-right">Total Commitment</th>
                    <th className="p-5">Est. Delivery</th>
                    <th className="p-5">Status & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {paginatedPOs.map((po: any) => (
                    <tr key={po.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="p-5 pl-8">
                        <div className="font-mono font-black text-slate-900 text-xs italic">{po.id}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{po.orderDate}</div>
                        {po.trackingNumber && (
                          <div className="inline-block mt-1 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-slate-600">{po.trackingNumber}</div>
                        )}
                      </td>
                      <td className="p-5">
                        <p className="font-black text-slate-900 uppercase italic text-xs">{po.materialName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{po.category}</p>
                      </td>
                      <td className="p-5">
                        <div className="font-black text-slate-800 flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400" />
                          {po.vendor}
                        </div>
                        {po.vendorContact && (
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone size={10} className="text-slate-400" />
                            {po.vendorContact}
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <div className="font-mono font-black text-slate-900 text-sm">{po.qty.toLocaleString()}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">{po.unit}</div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="font-mono font-black text-primary-600 text-sm">
                          ₹{(po.totalAmount || (po.qty * po.unitCost) || 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-400">@ ₹{po.unitCost}/{po.unit}</div>
                      </td>
                      <td className="p-5">
                        <div className="font-mono font-black text-slate-800 text-xs flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {po.estimatedDelivery}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{po.remarks || 'Standard Order'}</p>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-2">
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider w-fit",
                            po.status === 'Pending Supplier Confirmation' && "bg-amber-100 text-amber-800 border border-amber-200",
                            po.status === 'In Transit' && "bg-blue-100 text-blue-800 border border-blue-200",
                            po.status === 'Arrived at Gate' && "bg-purple-100 text-purple-800 border border-purple-200",
                            po.status === 'GRN Received' && "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          )}>
                            {po.status === 'In Transit' && <Truck size={12} className="mr-1.5" />}
                            {po.status === 'Pending Supplier Confirmation' && <Clock size={12} className="mr-1.5" />}
                            {po.status === 'Arrived at Gate' && <ShieldCheck size={12} className="mr-1.5" />}
                            {po.status === 'GRN Received' && <CheckCircle2 size={12} className="mr-1.5" />}
                            {po.status}
                          </span>

                          {/* Action Status Progression Buttons */}
                          {po.status === 'Pending Supplier Confirmation' && (
                            <button
                              onClick={() => handleUpdatePoStatus(po.id, 'In Transit')}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider transition-all w-fit shadow-sm cursor-pointer"
                            >
                              Dispatch Order (In Transit)
                            </button>
                          )}
                          {po.status === 'In Transit' && (
                            <button
                              onClick={() => handleUpdatePoStatus(po.id, 'Arrived at Gate')}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black uppercase tracking-wider transition-all w-fit shadow-sm cursor-pointer"
                            >
                              Mark Arrived at Gate
                            </button>
                          )}
                          {po.status === 'Arrived at Gate' && (
                            <button
                              onClick={() => handleUpdatePoStatus(po.id, 'GRN Received')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider transition-all w-fit shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={12} /> Post QC GRN & Ingest Stock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredPurchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <ShoppingCart size={40} className="mx-auto opacity-20 mb-3" />
                        <p className="text-xs font-black uppercase tracking-widest">No Purchase Orders Found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PO Pagination Controls */}
          {filteredPurchaseOrders.length > 0 && (
            <div className="bg-white px-8 py-5 rounded-[2.5rem] border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                <p className="text-xs text-slate-500 font-sans font-medium">
                  Showing <span className="font-bold text-slate-800">{Math.min((poCurrentPage - 1) * poItemsPerPage + 1, filteredPurchaseOrders.length)}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(poCurrentPage * poItemsPerPage, filteredPurchaseOrders.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredPurchaseOrders.length}</span> purchase orders
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
                  <select
                    value={poItemsPerPage}
                    onChange={(e) => {
                      setPoItemsPerPage(Number(e.target.value));
                      setPoCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#00a3c4]/30"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-wrap gap-y-2">
                <button
                  type="button"
                  disabled={poCurrentPage === 1}
                  onClick={() => setPoCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  Prev
                </button>
                {Array.from({ length: totalPoPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPoCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all cursor-pointer",
                        poCurrentPage === pageNum
                          ? "bg-[#0c9bbc] text-white shadow-md shadow-cyan-500/15"
                          : "border border-slate-200 text-slate-600 hover:bg-white"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={poCurrentPage === totalPoPages}
                  onClick={() => setPoCurrentPage(p => Math.min(p + 1, totalPoPages))}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: RAW MATERIAL REGISTRY */}
      {activeTab === 'raw' && (
        <div className="animate-in fade-in duration-500 space-y-6">
          
          {/* Action Filter Bar */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200/80 flex flex-wrap items-center gap-4 shadow-sm justify-between">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder="Search raw material by code, name, supplier, or batch..."
                className="w-full bg-slate-50 border border-slate-200/50 rounded-2xl py-3.5 pl-14 pr-6 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-sans"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cat Class:</span>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-3 outline-none cursor-pointer"
                >
                  {categories.map(cat => <option key={cat} value={cat} className="bg-white">{cat}</option>)}
                </select>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-[10px] font-black uppercase tracking-widest rounded-xl px-3 py-2.5 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Configure & Manage Categories"
                >
                  <Tag size={13} className="text-amber-600" />
                  <span>Manage Categories</span>
                </button>
              </div>

              {/* DOWNLOAD & UPLOAD ACTION BUTTONS FOR RAW MATERIALS */}
              <button
                onClick={() => {
                  const headings = [
                    "Material category",
                    "code reference",
                    "classification",
                    "base unit",
                    "supplier company",
                    "batch ID",
                    "GRN reference match",
                    "base supplier value",
                    "destination warehouse",
                    "rack shelf address",
                    "qty in",
                    "allocated qty"
                  ];
                  const csvRows = filteredInventory.map(item => [
                    `"${item.name}"`,
                    `"${item.code || 'N/A'}"`,
                    `"${item.category || 'N/A'}"`,
                    `"${item.unit || 'Kg'}"`,
                    `"${item.supplier || 'N/A'}"`,
                    `"${item.batch || 'N/A'}"`,
                    `"${item.grn || 'Manual'}"`,
                    item.price || 150,
                    `"${item.warehouse || 'N/A'}"`,
                    `"${item.rack || 'A-1'}"`,
                    item.qty,
                    item.reservedQty || 0
                  ]);
                  const csvContent = [headings.join(','), ...csvRows.map(row => row.join(','))].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `arcenol_raw_materials_stock_${new Date().toISOString().substring(0,10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-4 py-3 border border-slate-200 hover:border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all flex items-center gap-2 cursor-pointer bg-white"
                title="Download Existing Raw Material Stock CSV"
              >
                <Download size={14} />
                Download CSV Stock
              </button>

              <button
                onClick={() => {
                  const headings = [
                    "Material category",
                    "code reference",
                    "classification",
                    "base unit",
                    "supplier company",
                    "batch ID",
                    "GRN reference match",
                    "base supplier value",
                    "destination warehouse",
                    "rack shelf address",
                    "qty in",
                    "allocated qty"
                  ];
                  const rows = filteredInventory.map(item => [
                    item.name,
                    item.code || 'N/A',
                    item.category || 'N/A',
                    item.unit || 'Kg',
                    item.supplier || 'N/A',
                    item.batch || 'N/A',
                    item.grn || 'Manual',
                    item.price || 150,
                    item.warehouse || 'N/A',
                    item.rack || 'A-1',
                    item.qty,
                    item.reservedQty || 0
                  ]);
                  const wsData = [headings, ...rows];
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(wsData);
                  XLSX.utils.book_append_sheet(wb, ws, "Raw Material Stock");
                  XLSX.writeFile(wb, `arcenol_raw_materials_stock_${new Date().toISOString().substring(0,10)}.xlsx`);
                }}
                className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
                title="Download Existing Raw Material Stock as Excel Sheet"
              >
                <FileSpreadsheet size={14} />
                Download Excel Stock
              </button>

              <button
                onClick={() => {
                  downloadReportDataAsPDF({
                    title: "Raw Material Inventory Stock Audit Report",
                    subtitle: `Total Material SKUs Logged: ${filteredInventory.length} | Arcenol Inventory Hub`,
                    headers: ["Material Name", "Category", "Batch ID", "Warehouse Location", "Stock On-Hand"],
                    rows: filteredInventory.map((item: any) => [
                      item.name,
                      item.category || 'Raw Material',
                      item.batch || 'N/A',
                      item.warehouse || 'Central WH',
                      `${item.qty} ${item.unit || 'Kg'}`
                    ]),
                    filename: `Raw_Material_Inventory_Audit.pdf`
                  });
                }}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
                title="Download Raw Material Stock Audit as PDF File"
              >
                <FileText size={14} />
                Download PDF Audit
              </button>

              <button
                onClick={() => setShowRmImportModal(true)}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                title="Upload Old Raw Material Inventory Records"
              >
                <Upload size={14} className="text-primary-400" />
                Upload Records
              </button>

              <button
                onClick={handleAddNewRmClick}
                className="px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-md text-white font-sans"
                title="Register a new Raw Material entry with MINIMUM STOCK (ROL) and REORDER LEVEL"
              >
                <Plus size={14} />
                Register New Material
              </button>
            </div>
          </div>

          {/* Table Container */}
          {/* Mobile Cards View */}
          <div className="block md:hidden divide-y divide-slate-100 px-6 py-4 bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xs mb-6">
             {paginatedInventory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                   No physical inventory records match query.
                </div>
             ) : (
                paginatedInventory.map((item: any) => {
                   const isLow = item.qty < (item.minStock || 0);
                   return (
                      <div key={item.id} className="py-5 flex flex-col space-y-4">
                         <div className="flex justify-between items-start gap-4">
                            <div>
                               <p className="text-xs font-black uppercase tracking-tight text-slate-900 text-left">{item.name}</p>
                               <span className="text-[9px] text-slate-400 font-medium uppercase mt-1 inline-block">Supplier: {item.supplier}</span>
                               <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{item.code || 'N/A'}</span>
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">B: {item.batch}</span>
                               </div>
                            </div>
                            <span className={cn(
                               "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest inline-flex items-center border shrink-0",
                               item.qcStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                               {item.qcStatus === 'APPROVED' ? <CheckCircle2 size={10} className="mr-1" /> : <AlertTriangle size={10} className="mr-1" />}
                               QC: {item.qcStatus || 'APPROVED'}
                            </span>
                         </div>

                         <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-b border-slate-50 py-3 text-left">
                            <div>
                               <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-sans font-bold">Node / Slot</span>
                               <span className="font-bold text-slate-700 block mt-1 uppercase text-[10px]">{item.warehouse}</span>
                               <span className="text-[9px] text-primary-500 font-black tracking-widest mt-1 block">RACK: {item.rack || 'A-1'}</span>
                            </div>
                            <div>
                               <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-sans font-bold">Active Quantity</span>
                               <span className={cn(
                                  "font-black text-sm italic mt-1 block",
                                  isLow ? "text-red-500" : "text-slate-900"
                               )}>
                                  {item.qty.toLocaleString()} <span className="text-[9px] not-italic text-slate-400 font-sans ml-0.5">{item.unit || 'Kg'}</span>
                               </span>
                               <span className="text-[8px] font-bold text-slate-400 block uppercase mt-0.5">Min: {item.minStock || 100}</span>
                            </div>
                         </div>

                         <div className="flex justify-between items-center pt-1">
                            <div>
                               <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-sans font-bold text-left">Valuation</span>
                               <span className="font-black italic text-slate-800 text-xs mt-0.5 block">
                                  {formatCurrency(item.qty * (item.price || 150))}
                               </span>
                            </div>
                            
                            <div className="flex items-center space-x-1.5">
                               <button 
                                  onClick={() => handleEditClick(item)}
                                  className="p-2 bg-slate-50 text-slate-400 hover:text-[#0c9bbc] rounded-lg border border-slate-200 transition-all cursor-pointer"
                                  title="Edit Material Asset"
                               >
                                  <Edit size={12} />
                               </button>
                               <button 
                                  onClick={() => {
                                     setDeleteRmItem(item);
                                     setDeleteRmError('');
                                     setIsDeleteRmModalOpen(true);
                                  }}
                                  className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
                                  title="Delete Material Asset"
                               >
                                  <Trash2 size={12} />
                               </button>
                               <button 
                                  onClick={() => setSelectedQRItem(item)}
                                  className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-lg border border-slate-200 transition-all cursor-pointer"
                                  title="Generate Barcode / QR Label"
                               >
                                  <QrCode size={12} />
                               </button>
                               <button 
                                  onClick={() => {
                                     setTransferItem(item);
                                     setSourceWh(item.warehouse);
                                     setTransferQty(0);
                                     setIsTransferModalOpen(true);
                                  }}
                                  className="p-2 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
                                  title="Transfer Warehouse Stock"
                               >
                                  <ArrowRight size={12} />
                               </button>
                            </div>
                         </div>
                      </div>
                   );
                })
             )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-5">Material Asset</th>
                    <th className="px-6 py-5">Product SKU Code</th>
                    <th className="px-6 py-5">Batch & GRN</th>
                    <th className="px-6 py-5">Gate Entry & Logistics</th>
                    <th className="px-6 py-5">QC Status</th>
                    <th className="px-6 py-5">Storage Location</th>
                    <th className="px-6 py-5">Active Quantity</th>
                    <th className="px-6 py-5">Valuation</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-900 text-xs">
                  {paginatedInventory.map((item: any) => {
                    const isLow = item.qty < (item.minStock || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-6">
                          <p className="font-sans font-black text-slate-900 tracking-tight text-[13px] uppercase group-hover:text-primary-600 transition-colors">{item.name}</p>
                          <span className="text-[9px] text-slate-400 font-medium uppercase mt-1 inline-block">{item.supplier}</span>
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold">{item.code || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-6">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-600 block">B: {item.batch}</span>
                            <span className="text-[8px] text-slate-400 font-bold block">GRN: {item.grn || 'Manual'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="space-y-0.5 font-mono text-[10px]">
                            <div className="flex items-center space-x-1 text-slate-800 font-extrabold">
                              <Truck size={12} className="text-[#0c9bbc]" />
                              <span>{item.vehicleNo || 'GJ-01-AB-1234'}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-bold">Challan: <span className="font-black text-slate-800">{item.challanNo || 'CH-2026-881'}</span></p>
                            <p className="text-[8px] text-slate-400">E-Way: {item.eWayBill || 'EWB-994820'}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center border",
                            item.qcStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            {item.qcStatus === 'APPROVED' ? <CheckCircle2 size={10} className="mr-1.5" /> : <AlertTriangle size={10} className="mr-1.5" />}
                            {item.qcStatus || 'APPROVED'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-0.5">
                            <p className="font-sans font-black text-slate-700 text-[10px] uppercase leading-none">{item.warehouse}</p>
                            <span className="text-[9px] text-primary-600 font-bold tracking-widest leading-none">RACK: {item.rack || 'A-1'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className={cn(
                              "text-sm font-black italic tracking-tighter leading-none",
                              isLow ? "text-red-500" : "text-slate-900"
                            )}>
                              {item.qty.toLocaleString()} <span className="text-[10px] not-italic font-bold text-slate-400 ml-0.5">{item.unit || 'Kg'}</span>
                            </p>
                            <span className="text-[8px] font-bold text-slate-400 block uppercase">Min ROL: {item.minStock || 100}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-black italic text-slate-800">
                          {formatCurrency(item.qty * (item.price || 150))}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleEditClick(item)}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-[#0c9bbc] rounded-xl border border-slate-200 hover:bg-cyan-50 transition-all shadow-sm cursor-pointer"
                              title="Edit Material Asset"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                setDeleteRmItem(item);
                                setDeleteRmError('');
                                setIsDeleteRmModalOpen(true);
                              }}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl border border-slate-200 hover:bg-red-50 transition-all shadow-sm cursor-pointer"
                              title="Delete Material Asset"
                            >
                              <Trash2 size={14} />
                            </button>
                            <button 
                              onClick={() => setSelectedQRItem(item)}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm cursor-pointer"
                              title="Generate Barcode / QR Label"
                            >
                              <QrCode size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                setTransferItem(item);
                                setSourceWh(item.warehouse);
                                setTransferQty(0);
                                setIsTransferModalOpen(true);
                              }}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-xl border border-slate-200 hover:bg-primary-50 transition-all shadow-sm cursor-pointer"
                              title="Transfer Warehouse Stock"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredInventory.length === 0 && (
                <div className="p-20 text-center">
                  <Boxes className="mx-auto text-slate-300 mb-4 animate-bounce" size={40} />
                  <p className="text-[11px] font-sans font-black text-slate-400 uppercase tracking-widest">No physical inventory records match query.</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredInventory.length > 0 && (
            <div className="bg-white px-8 py-5 rounded-[2.5rem] border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-4 text-left">
                <p className="text-xs text-slate-500 font-sans font-medium">
                  Showing <span className="font-bold text-slate-800">{Math.min((rmCurrentPage - 1) * rmItemsPerPage + 1, filteredInventory.length)}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(rmCurrentPage * rmItemsPerPage, filteredInventory.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredInventory.length}</span> raw material entries
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
                  <select
                    value={rmItemsPerPage}
                    onChange={(e) => {
                      setRmItemsPerPage(Number(e.target.value));
                      setRmCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#00a3c4]/30"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-wrap gap-y-2">
                <button
                  type="button"
                  disabled={rmCurrentPage === 1}
                  onClick={() => setRmCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  Prev
                </button>
                {Array.from({ length: totalRmPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  if (
                    totalRmPages > 5 &&
                    pageNum !== 1 &&
                    pageNum !== totalRmPages &&
                    Math.abs(pageNum - rmCurrentPage) > 1
                  ) {
                    if (pageNum === 2 && rmCurrentPage > 3) {
                      return <span key="ellipsis-start" className="px-2 text-slate-400 font-sans text-xs">...</span>;
                    }
                    if (pageNum === totalRmPages - 1 && rmCurrentPage < totalRmPages - 2) {
                      return <span key="ellipsis-end" className="px-2 text-slate-400 font-sans text-xs">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setRmCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all cursor-pointer",
                        rmCurrentPage === pageNum
                          ? "bg-[#0c9bbc] text-white shadow-md shadow-cyan-500/15"
                          : "border border-slate-200 text-slate-600 hover:bg-white"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={rmCurrentPage === totalRmPages}
                  onClick={() => setRmCurrentPage(p => Math.min(p + 1, totalRmPages))}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 3: CELL TESTING & GRADING LABORATORY */}
      {activeTab === 'graded' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          
          {/* Lab Warning / QC Environment Checklist */}
          <div className="p-4 bg-[#f0fdf4] rounded-[1.5rem] border border-[#d1fae5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 bg-[#d1fae5] text-[#065f46] rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left font-sans">
                <h4 className="font-extrabold text-[#065f46] text-xs uppercase tracking-wider">
                  ACTIVE QC ENVIRONMENT: LABORATORY STATUS CALIBRATION
                </h4>
                <p className="text-[10px] text-[#047857] leading-relaxed mt-0.5">
                  Electrochemistry chamber calibrated at standard <strong className="font-black">25°C ± 1°C</strong>. Absolute internal resistance sorting protocol is online.
                </p>
              </div>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <span className="inline-block px-5 py-2.5 bg-[#022c22] text-white rounded-full text-[9.5px] font-black uppercase tracking-widest leading-none select-none">
                CALIBRATED: ISO 9001/14001
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Lab Test Input Logs Form */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-3xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest mb-6 flex items-center gap-2">
                  <Microscope size={16} className="text-emerald-600" /> LOG LABORATORY CELL SPEC TEST
                </h3>
                
                <form onSubmit={handleSubmitCellGrading} className="space-y-4">
                  {submitError && (
                    <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-[11px] font-bold text-red-600 text-left">
                      {submitError}
                    </div>
                  )}

                  {gradingSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] font-bold text-emerald-600 flex items-center text-left">
                      <CheckCircle2 size={14} className="mr-2 flex-shrink-0" />
                      {gradingSuccess}
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">BATCH MASTER SUPPLY MATCH</label>
                    <div className="relative">
                      <select
                        value={gradingParentId}
                        onChange={e => setGradingParentId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-xs font-black outline-none appearance-none cursor-pointer text-slate-805"
                      >
                        {inventory.filter((i: any) => i.id.includes('CELL') || i.category.toLowerCase().includes('cell')).map((i: any) => (
                          <option key={i.id} value={i.id} className="bg-white">
                            {i.name} ({i.qty} Pcs left)
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400 text-[10px]">
                        ▼
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">CELL SERIAL BARCODE IDENTIFIER</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. CELL-A-2026-99"
                      value={cellSerial}
                      onChange={e => setCellSerial(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 transition-colors rounded-xl py-3.5 px-4 text-xs font-black outline-none font-mono uppercase text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">VOLTAGE (V)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={cellVoltage}
                        onChange={e => setCellVoltage(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 transition-colors rounded-xl py-3 px-4 text-xs font-black outline-none font-mono text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">IR RESISTANCE (MΩ)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        required
                        value={cellIR}
                        onChange={e => setCellIR(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 transition-colors rounded-xl py-3 px-4 text-xs font-black outline-none font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">CAPACITY (MAH)</label>
                      <input 
                        type="number" 
                        step="50"
                        required
                        value={cellCapacity || ''}
                        onChange={e => setCellCapacity(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 transition-colors rounded-xl py-3 px-4 text-xs font-black outline-none font-mono text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">CYCLE COUNT TESTED</label>
                      <input 
                        type="number" 
                        required
                        value={cellCycleCount}
                        onChange={e => setCellCycleCount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 transition-colors rounded-xl py-3 px-4 text-xs font-black outline-none font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">TEMP LOGS (°C)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        required
                        value={cellTemp}
                        onChange={e => setCellTemp(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 transition-colors rounded-xl py-3 px-4 text-xs font-black outline-none font-mono text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block font-sans">QC ENGINEER SIGN</label>
                      <input 
                        type="text" 
                        required
                        value={qcEngineer}
                        onChange={e => setQcEngineer(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 transition-colors rounded-xl py-3 px-4 text-xs font-black outline-none text-slate-800"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#009270] hover:bg-[#007a5d] text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md mt-4 disabled:opacity-50 cursor-pointer"
                  >
                    COMPUTE & RECORD CELL GRADE
                  </button>
                </form>
              </div>
            </div>

            {/* Laboratory Graded Repository */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
              <div className="p-6 border-b border-slate-150 flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">TECHNICAL GRADED REPOSITORY</h3>
                  <p className="text-[9px] text-[#009270] font-bold uppercase tracking-widest mt-0.5">ELECTRO-CHEMICAL METRICS OF ANALYZED LITHIUM CELLS</p>
                </div>
                <span className="text-[9.5px] font-black text-[#009270] bg-[#f0fdf4] border border-[#d1fae5] px-3.5 py-1.5 rounded-xl uppercase tracking-widest select-none leading-none">
                  Live Active Pool
                </span>
              </div>

              <div className="overflow-y-auto max-h-[460px] flex-1">
                <table className="w-full text-left font-mono text-slate-950 text-xs">
                  <thead className="bg-[#f8fafc] text-slate-500 text-[8.5px] font-black uppercase tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">SERIAL / DATE</th>
                      <th className="px-6 py-4">VOLTAGE</th>
                      <th className="px-6 py-4">INTERNAL RES (IR)</th>
                      <th className="px-6 py-4">CAPACITY</th>
                      <th className="px-6 py-4">ASSIGNED GRADE</th>
                      <th className="px-6 py-4 text-right">QC INSPECTOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gradedCells.map((cell: any) => (
                      <tr key={cell.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-5 text-left font-sans">
                          <p className="font-extrabold text-slate-900 text-[12px] tracking-tight uppercase leading-none">{cell.serial}</p>
                          <span className="text-[9.5px] text-slate-400 font-bold leading-none block mt-1.5">{cell.date}</span>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-800 text-xs">{cell.voltage}V</td>
                        <td className="px-6 py-5 font-bold text-[#0284c7] text-xs">{cell.ir} mΩ</td>
                        <td className="px-6 py-5 font-bold text-slate-850 text-xs">{cell.capacity} mAh</td>
                        <td className="px-6 py-5 text-left">
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider border text-center select-none",
                            cell.grade === 'A' ? "bg-emerald-50 text-emerald-600 border-emerald-150/60" :
                            cell.grade === 'B' ? "bg-amber-50 text-amber-600 border-amber-150/60" :
                            cell.grade === 'C' ? "bg-blue-50 text-blue-600 border-blue-150/60" :
                            "bg-red-50 text-red-650 border-red-150/60"
                          )}>
                            GRADE {cell.grade}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right font-sans text-[10.5px] uppercase font-extrabold text-slate-500">
                          {cell.engineer}
                        </td>
                      </tr>
                    ))}
                    {gradedCells.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center font-sans">
                          <Microscope className="mx-auto text-slate-200 mb-4 animate-pulse" size={40} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active graded items catalogued.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: MRP BOM AUTOMATIC ALLOCATION */}
      {activeTab === 'mrp' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Input Simulator Selection panel */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-6 text-left">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight font-sans">
                  MRP MATERIALS CALCULATOR
                </h3>
                <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
                  PRE-CALCULATE & VERIFY SAFETY MARGINS BASED ON MODEL BILL OF MATERIALS (BOM)
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">SELECT BATTERY MODEL TO MANUFACTURE</label>
                  <div className="relative">
                    <select
                      value={mrpProductModel || (data?.products && data.products.length > 0 ? data.products[0].id : "72V30A")}
                      onChange={e => {
                        const val = e.target.value;
                        setMrpProductModel(val);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3.5 px-4 pr-10 text-xs font-black text-slate-900 outline-none cursor-pointer uppercase appearance-none shadow-xs"
                    >
                      {(() => {
                        const categorized: Record<string, any[]> = {};
                        (products || []).forEach((p: any) => {
                          const catName = (p.category && String(p.category).trim()) || "General Battery Blueprints";
                          if (!categorized[catName]) {
                            categorized[catName] = [];
                          }
                          categorized[catName].push(p);
                        });

                        return Object.keys(categorized).map((catKey) => (
                          <optgroup key={catKey} label={catKey} className="font-bold text-slate-500 bg-slate-50">
                            {categorized[catKey].map((p: any) => (
                              <option key={p.id} value={p.id} className="bg-white text-slate-900 font-sans font-bold">
                                {(p.name || p.id).toUpperCase()} [{p.id}]
                              </option>
                            ))}
                          </optgroup>
                        ));
                      })()}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400 text-[10px]">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">SCHEDULED BATCH QTY (UNITS)</label>
                  <input 
                    type="number"
                    min="1"
                    value={mrpQty > 0 ? mrpQty : ''}
                    onChange={e => {
                      const val = e.target.value;
                      setMrpQty(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                      setMrpResult(null);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-xs font-black outline-none font-mono text-slate-900 shadow-xs"
                    placeholder="e.g. 100"
                  />
                </div>

                <button 
                  onClick={handleFetchMRP}
                  disabled={mrpLoading}
                  className="w-full bg-[#121c2b] hover:bg-[#1e2e46] text-white font-black text-xs uppercase tracking-widest py-4.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <Sliders size={16} /> SIMULATE BOM ALLOCATION
                </button>
              </div>

              {mrpMessage && (
                <div className="p-4 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl">
                  {mrpMessage}
                </div>
              )}
            </div>

            {/* Simulated Requirements Matrix */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
              <div className="p-8 border-b border-indigo-100 bg-[#f8fafc] flex justify-between items-center flex-wrap gap-4">
                <div className="text-left">
                  <h3 className="text-sm md:text-base font-black uppercase text-slate-900 tracking-wider">BOM Dynamic Requirements Report</h3>
                  <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">Automated resource reservations based on estimated yield factors</p>
                </div>
                <button 
                  type="button"
                  onClick={handleFetchMRP}
                  disabled={mrpLoading}
                  title="Click to run live MRP Phase II simulation"
                  className="text-[9.5px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 px-3.5 py-2 rounded-xl uppercase tracking-widest select-none transition-all cursor-pointer shadow-xs flex items-center gap-2 active:scale-95 leading-none"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  MRP Phase II Online {mrpLoading ? '(Calculating...)' : '(Live Active)'}
                </button>
              </div>

              <div className="overflow-x-auto flex-1 max-h-[380px] flex flex-col justify-center">
                {mrpResult ? (
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-[#f8fafc] text-slate-500 text-[8.5px] font-black uppercase tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">BOM Component Name</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Per Unit Qty</th>
                        <th className="px-6 py-4">Required Batch Qty</th>
                        <th className="px-6 py-4">Current Available</th>
                        <th className="px-6 py-4">Shortage Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mrpResult.requirements.map((reqm: any, index: number) => {
                        const isShort = reqm.deficient > 0;
                        return (
                          <tr key={index} className="hover:bg-slate-50/40">
                            <td className="px-6 py-4">
                              <p className="font-sans font-black text-slate-900 uppercase">{reqm.name}</p>
                              <span className="text-[8px] text-slate-400 font-bold block">CODE REF: {reqm.matId}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-wider rounded-md border border-slate-200/80">
                                {reqm.category || 'RAW MATERIAL'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-black">{reqm.perUnit.toFixed(2)} {reqm.unit}</td>
                            <td className="px-6 py-4 font-black text-slate-800 italic">{reqm.requiredTotal.toLocaleString()} {reqm.unit}</td>
                            <td className="px-6 py-4 font-black text-emerald-600">{reqm.available.toLocaleString()} {reqm.unit}</td>
                            <td className="px-6 py-4">
                              {isShort ? (
                                <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-wider rounded-md border border-red-100">
                                  Deficit: {reqm.deficient.toLocaleString()} {reqm.unit}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-100">
                                  Secure Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-16 text-center font-sans">
                    <Sliders className="mx-auto text-slate-300/80 animate-pulse mb-4" size={32} />
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      CONFIGURE MODEL AND PRESS "SIMULATE BOM ALLOCATION" TO GENERATE MAPPING.
                    </p>
                  </div>
                )}
              </div>

              {mrpResult && (
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="font-sans font-extrabold text-slate-900 text-xs uppercase">BOM Auto-allocation Trigger Flow</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Submit reservations to secure existing inventory</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleExecuteProductionPlan('RESERVE')}
                      className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                    >
                      Reserve Stock (Locked)
                    </button>
                    <button 
                      onClick={() => handleExecuteProductionPlan('CONSUME')}
                      className="px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-primary-500/10"
                    >
                      Consume Auto Deduct
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* TAB 5: WIP ASSEMBLIES */}
      {activeTab === 'wip' && (
        <div className="animate-in fade-in duration-500 space-y-6">
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Work in Progress (WIP) Semi-Finished Inventory</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active assembly queues, module welding, and live BMS calibration lines</p>
              </div>
              <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-100 uppercase">Operational Shopfloor</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data?.wipInventory || []).map((wip: any) => (
                <div key={wip.id} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200/50 hover:bg-white hover:border-primary-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[9px] bg-slate-100 text-slate-600 font-black tracking-wider uppercase px-2 py-0.5 rounded-md">REF: {wip.id}</span>
                        <h4 className="text-base font-sans font-black text-slate-900 tracking-tight uppercase italic mt-1.5">{wip.name}</h4>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-widest rounded-md border border-amber-100">{wip.stage}</span>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p className="text-[10px] uppercase font-black text-slate-400">Yield Configuration</p>
                      <p className="text-2xl font-black text-slate-800 italic">{wip.qty} <span className="text-xs not-italic text-slate-400">Packs Active</span></p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase italic">Last Updated: {wip.lastUpdate}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 pt-4 mt-4">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">BOM Raw Allocation Details</p>
                    <div className="flex flex-wrap gap-2">
                      {wip.components.map((c: any, index: number) => (
                        <span key={index} className="text-[9px] bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-bold uppercase">
                          {c.matId.split('-').pop()}: {c.qty.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: MULTI-WAREHOUSE NODES */}
      {activeTab === 'warehouse' && (
        <div className="animate-in fade-in duration-500 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {warehouses.map((wh: string, idx: number) => {
              // Calculate specific capacity mock percentages based on warehouse names
              const capPercentage = idx === 0 ? 82 : idx === 1 ? 45 : idx === 2 ? 60 : idx === 3 ? 30 : 15;
              return (
                <div key={wh} className="bg-white rounded-[2.5rem] p-8 border border-slate-200/80 hover:border-primary-200 hover:scale-[1.01] transition-all relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-500 group-hover:text-primary-600 transition-all flex items-center justify-center border border-slate-100">
                      <Warehouse size={22} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-right">NODE ID</span>
                      <span className="text-[11px] font-mono font-black text-slate-700 block text-right">WH-ARC-0{idx+1}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 uppercase italic tracking-tight mb-2">{wh}</h3>
                  <p className="text-xs text-slate-400 mb-6 font-bold uppercase tracking-wider">Arcenol Energy Logistics Core Group</p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                        <span>Capacity Loading</span>
                        <span className="text-slate-800">{capPercentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            capPercentage > 80 ? "bg-red-500" : "bg-primary-600"
                          )} 
                          style={{ width: `${capPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 pt-4 border-t border-slate-100">
                      <span>Sync Status</span>
                      <span className="text-emerald-600 flex items-center"><ShieldCheck size={11} className="mr-1" /> ONLINE</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 7: INVENTORY CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="animate-in fade-in duration-500 space-y-8 text-left">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[9px] font-black uppercase tracking-wider">Classification Engine</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Database Schema Synchronized</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight italic mt-2 uppercase">
                Inventory Category Matrix
              </h3>
              <p className="text-slate-400 font-sans text-xs font-bold uppercase tracking-widest mt-1">
                Configure Material & Product Group Schemas across ERP Nodes
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories or codes..."
                  className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c9bbc] w-64"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategoryFormName('');
                  setCategoryFormCode('');
                  setCategoryFormDesc('');
                  setCategorySubmitError('');
                  setIsAddCategoryModalOpen(true);
                }}
                className="bg-[#0c9bbc] hover:bg-[#0a7f9a] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center shadow-lg shadow-[#0c9bbc]/10 transition-all cursor-pointer active:scale-95"
                id="btn_add_category"
              >
                <Plus size={16} className="mr-2" /> Add Category
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryList
              .filter((cat: any) => {
                if (!categorySearch.trim()) return true;
                const term = categorySearch.toLowerCase();
                return (
                  cat.name.toLowerCase().includes(term) ||
                  (cat.code && cat.code.toLowerCase().includes(term)) ||
                  (cat.description && cat.description.toLowerCase().includes(term))
                );
              })
              .map((cat: any) => {
                const itemCount = inventory.filter((inv: any) => inv.category === cat.name || inv.category === cat.code).length;
                return (
                  <div key={cat.id || cat.name} className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-xs hover:border-[#0c9bbc] transition-all group flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-[10px] font-black uppercase rounded-xl tracking-wider border border-slate-200">
                          {cat.code || 'CAT-GEN'}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-2 text-slate-400 hover:text-[#0c9bbc] hover:bg-[#0c9bbc]/10 rounded-xl transition-colors cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartDeleteCategory(cat)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                        {cat.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-2 line-clamp-2">
                        {cat.description || 'Standard catalog material classification group.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <Boxes size={14} className="text-[#0c9bbc]" />
                        <span>{itemCount} SKUs Linked</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

       {/* MODAL 1: NEW PROCUREMENT */}
      {isProcureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[95vw] xl:max-w-7xl 2xl:max-w-[90vw] rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[95vh] mx-4">
            
            {/* Header Plate */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-[#0c9bbc]/10 text-[#0c9bbc] rounded-2xl shadow-inner">
                  <Database size={26} className="animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl md:text-3xl font-black font-sans text-slate-900 uppercase tracking-tight italic flex items-center gap-1">
                    {editingProcureId ? "EDIT PROCUREMENT ENTRY" : "INVENTORY PROCUREMENT ENTRY PLATE"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 font-sans">
                    {editingProcureId ? "MODIFY REQUISITION DETAILS AND MATERIAL SPECIFICATIONS" : "LOG RAW ARRIVAL MATERIALS OR REGISTER NEW CELL CODES INTO THE CENTRAL NODE"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsProcureModalOpen(false); setEditingProcureId(null); }} 
                className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-800 cursor-pointer border border-transparent hover:border-slate-200"
                id="close-procure-modal-top"
              >
                <X size={24} />
               </button>
            </div>

            {/* Split Screen Matrix */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-150">
              
              {/* Left Column: Form Intake Section */}
              <form 
                id="procure-form"
                onSubmit={handleSubmitProcurement} 
                className="flex-1 md:w-1/2 overflow-y-auto p-8 md:p-10 space-y-8 text-left"
              >
                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-650 font-mono">
                    ⚠️ {submitError}
                  </div>
                )}

                {/* Procurement Mode Tab Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">PROCUREMENT MODE</label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setProcureType('existing')}
                      className={cn(
                        "py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                        procureType === 'existing' 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/50 font-extrabold" 
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      RESTOCK EXISTING ITEM
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcureType('new')}
                      className={cn(
                        "py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                        procureType === 'new' 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/50 font-extrabold" 
                          : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      REGISTER NEW MATERIAL
                    </button>
                  </div>
                </div>

                {/* Matcher Product Selection / Registration Inputs */}
                {procureType === 'existing' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">SELECT MATCHER SKU</label>
                    <div className="relative">
                      <select
                        value={selectedExistingId}
                        onChange={(e) => setSelectedExistingId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-sans uppercase text-slate-800 appearance-none cursor-pointer shadow-3xs"
                      >
                        {inventory.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {item.name.toUpperCase()} ({item.code || item.id})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-slate-500">
                        ▼
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">MATERIAL NAME</label>
                        <input
                          type="text"
                          required
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Lead Alloy"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-bold text-slate-800 outline-none shadow-3xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">CODE REFERENCE</label>
                        <input
                          type="text"
                          required
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value)}
                          placeholder="e.g. LA-001"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">CLASSIFICATION CATEGORY</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-sans text-slate-800 cursor-pointer shadow-3xs"
                        >
                          {categoryNames.map((catName) => (
                            <option key={catName} value={catName}>{catName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">BASE UNIT</label>
                        <input
                          type="text"
                          required
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          placeholder="e.g. Kg, Pcs, Ltr"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-bold text-slate-800 outline-none shadow-3xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Gate Entry & Transport Logistics Section */}
                <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-sky-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <Truck className="text-[#0c9bbc]" size={18} />
                      <h4 className="text-xs font-black uppercase text-[#0c9bbc] tracking-wider font-mono">
                        MATERIAL GATE ENTRY POSTING & TRANSPORT DETAILS
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full border border-sky-200">
                      Store Keeper Handshake
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block font-sans">
                        CHALLAN SERIAL NUMBER
                      </label>
                      <input
                        type="text"
                        value={challanNo}
                        onChange={(e) => setChallanNo(e.target.value)}
                        placeholder="e.g. CH-2026-881"
                        className="w-full bg-white border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3 px-4 text-xs font-black font-mono uppercase text-slate-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block font-sans">
                        VEHICLE REGISTRATION NUMBER
                      </label>
                      <input
                        type="text"
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        placeholder="e.g. GJ-01-AB-1234"
                        className="w-full bg-white border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3 px-4 text-xs font-black font-mono uppercase text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block font-sans">
                        SUPPLIER NAME
                      </label>
                      <input
                        type="text"
                        required
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="e.g. Platinum Electronics Ltd"
                        className="w-full bg-white border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3 px-4 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block font-sans">
                        E-WAY BILL ID
                      </label>
                      <input
                        type="text"
                        value={eWayBill}
                        onChange={(e) => setEWayBill(e.target.value)}
                        placeholder="e.g. EWB-99482710"
                        className="w-full bg-white border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3 px-4 text-xs font-black font-mono uppercase text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block font-sans">
                        EXCISE SLIP CODE
                      </label>
                      <input
                        type="text"
                        value={exciseSlip}
                        onChange={(e) => setExciseSlip(e.target.value)}
                        placeholder="e.g. EXC-88321"
                        className="w-full bg-white border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3 px-4 text-xs font-black font-mono uppercase text-slate-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block font-sans">
                        ACCEPTED QTY
                      </label>
                      <input
                        type="number"
                        value={acceptedQty || ''}
                        onChange={(e) => setAcceptedQty(Number(e.target.value))}
                        placeholder={qty ? String(qty) : "0"}
                        className="w-full bg-white border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3 px-4 text-xs font-black font-mono text-emerald-700 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block font-sans">
                        DAMAGED QTY
                      </label>
                      <input
                        type="number"
                        value={damagedQty || ''}
                        onChange={(e) => setDamagedQty(Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3 px-4 text-xs font-black font-mono text-rose-700 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Vendor & Batch Group */}
                <div className="grid grid-cols-2 gap-6 pt-1">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">BATCH MASTER ID</label>
                    <input
                      type="text"
                      required
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="E.G. BATCH-72"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">GRN REFERENCE MATCH</label>
                    <input
                      type="text"
                      required
                      value={grn}
                      onChange={(e) => setGrn(e.target.value)}
                      placeholder="E.G. GRN-998"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                    />
                  </div>
                </div>

                {/* Depot Routing Group */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">DESTINATION WAREHOUSE HUB</label>
                    <div className="relative">
                      <select
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-sans text-slate-800 appearance-none cursor-pointer shadow-3xs"
                      >
                        {warehouses.map((wh: string) => (
                          <option key={wh} value={wh} className="bg-white">{wh}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-slate-500">
                        ▼
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">RACK SHELF ADDRESS</label>
                    <input
                      type="text"
                      required
                      value={rack}
                      onChange={(e) => setRack(e.target.value)}
                      placeholder="A-1"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                    />
                  </div>
                </div>

                {/* Stock Threshold Group */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">MINIMUM STOCK (ROL)</label>
                    <input
                      type="number"
                      required
                      value={newMinStock}
                      onChange={(e) => setNewMinStock(Number(e.target.value))}
                      placeholder="100"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">REORDER LEVEL</label>
                    <input
                      type="number"
                      required
                      value={newReorderLevel}
                      onChange={(e) => setNewReorderLevel(Number(e.target.value))}
                      placeholder="250"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-4 px-5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                    />
                  </div>
                </div>

                {/* Key Metric Allocated counter box (cyan bordered highlight row) */}
                <div className="p-6 bg-cyan-50/70 rounded-2xl border border-cyan-150/80 flex items-center justify-between shadow-2xs">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans">ALLOCATED QUANTITY INFLOW</h4>
                    <p className="text-[10px] text-[#0c9bbc] font-black uppercase tracking-widest mt-1.5 font-sans">PHYSICAL DEPTH LOAD OF INCOMING ASSETS</p>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={qty || ''}
                    onChange={(e) => setQty(Number(e.target.value))}
                    placeholder="0"
                    className="w-36 bg-white border border-[#2cbcdb]/40 hover:border-[#2cbcdb]/70 focus:border-[#0c9bbc] shadow-sm rounded-xl py-4 px-5 text-center text-sm font-black text-[#0a7f9a] outline-none font-mono"
                  />
                </div>
              </form>

              {/* Right Column: Inventory List/Table register section */}
              <div className="flex-1 md:w-1/2 overflow-y-auto p-8 md:p-10 bg-slate-50/50 flex flex-col space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70">
                  <div className="text-left">
                    <h4 className="text-sm md:text-base font-black text-slate-950 uppercase tracking-tight italic">INVENTORY PROCUREMENT REGISTER</h4>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mt-1">CENTRAL NODE RAW MATERIALS & CELL BATCHES</p>
                  </div>
                  <span className="text-xs bg-cyan-50 text-[#0c9bbc] border border-cyan-150/50 font-black px-4.5 py-2.5 rounded-xl uppercase tracking-widest shadow-2xs select-none">
                    LIVE STOCK POOL
                  </span>
                </div>

                {/* Compact Search bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-4.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search active raw materials catalog..."
                    value={subSearchProcure}
                    onChange={(e) => setSubSearchProcure(e.target.value)}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0c9bbc] transition-colors rounded-2xl py-4 pl-12 pr-6 text-sm font-bold outline-none shadow-3xs text-slate-800 placeholder-slate-400"
                  />
                  {subSearchProcure && (
                    <button 
                      onClick={() => setSubSearchProcure('')}
                      className="absolute right-4 top-4.5 text-slate-400 hover:text-slate-900 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Register Table Block */}
                <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-2xs flex-1 min-h-[350px] flex flex-col">
                  <div className="overflow-x-auto flex-1 max-h-[520px]">
                    <table className="w-full text-left font-mono text-xs text-slate-950 border-collapse">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4.5">MATERIAL ASSET</th>
                          <th className="px-6 py-4.5">CODE / BATCH</th>
                          <th className="px-6 py-4.5 text-right w-24">QTY</th>
                          <th className="px-6 py-4.5 text-right pr-6">VALUATION (₹)</th>
                          <th className="px-6 py-4.5 text-center w-28">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredProcureItems.map((item: any) => {
                          const isLow = item.qty < (item.minStock || 0);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-5.5 font-sans text-left">
                                <p className="font-extrabold text-slate-900 text-sm tracking-tight uppercase leading-snug">
                                  {item.name}
                                </p>
                                <span className="text-[11px] text-[#0c9bbc] font-black uppercase tracking-wider block mt-1.5">
                                  {item.supplier}
                                </span>
                              </td>
                              <td className="px-6 py-5.5 text-left">
                                <div className="space-y-1.5">
                                  <span className="inline-block text-[11px] font-mono font-black bg-slate-100 text-slate-700 px-2.5 py-1 border border-slate-200 rounded-md">
                                    {item.code || item.id}
                                  </span>
                                  <div className="text-[10px] text-slate-450 font-bold leading-none">
                                    B: {item.batch} | G: {item.grn}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5.5 text-right font-mono font-extrabold">
                                <span className={cn("text-xs", isLow ? "text-red-650" : "text-slate-800")}>
                                  {item.qty.toLocaleString()} {item.unit || 'Kg'}
                                </span>
                                {isLow && (
                                  <span className="block text-[9px] text-red-500 font-black uppercase tracking-widest mt-1 animate-pulse">
                                    LOW STOCK
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-5.5 text-right pr-6 font-mono font-extrabold text-slate-900">
                                <p className="text-xs">₹{((item.qty || 0) * (item.price || 0)).toLocaleString('en-IN')}</p>
                                <span className="block text-[9px] text-slate-400 font-bold tracking-wider mt-1">
                                  ₹{item.price || 0}/{item.unit || 'Kg'}
                                </span>
                              </td>
                              <td className="px-6 py-5.5 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleStartEditProcurement(item)}
                                    className="p-1.5 text-[#0c9bbc] hover:bg-cyan-50 rounded-lg transition-all cursor-pointer"
                                    title="Edit Procurement Record"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProcurement(item.id)}
                                    className="p-1.5 text-red-550 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="Delete Procurement Record"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredProcureItems.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center font-sans">
                              <Boxes className="mx-auto text-slate-200 mb-4 animate-pulse" size={42} />
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                NO MATCHING INTERNAL STOCK FINDINGS.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

                         <div className="p-8 px-10 border-t border-slate-150 bg-slate-50 flex justify-end space-x-4 shrink-0">
              <button
                type="button"
                onClick={() => { setIsProcureModalOpen(false); setEditingProcureId(null); }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-8 py-4 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-colors cursor-pointer"
                id="dismiss-procure-modal"
              >
                DISMISS MODE
              </button>
              <button
                type="submit"
                form="procure-form"
                onClick={handleSubmitProcurement}
                disabled={isSubmitting}
                className="bg-[#009dbb] hover:bg-[#0487a2] text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md shadow-[#009dbb]/25 cursor-pointer"
                id="commit-procure-modal"
              >
                {isSubmitting ? "SYNCING TRANSACTION..." : editingProcureId ? "SAVE CHANGES" : "COMMIT REST ENTRY"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: CELL GRADING & TESTING (QC CELL PORTAL) */}
      {isGradingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[95vw] xl:max-w-7xl 2xl:max-w-[90vw] rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[95vh] mx-4">
            
            {/* Header Plate */}
            <div className="p-8 md:p-10 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-emerald-100 text-[#009270] rounded-2xl shadow-inner">
                  <Microscope size={26} className="animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl md:text-3xl font-black font-sans text-slate-900 uppercase tracking-tight italic flex items-center">
                    {editingGradedId ? "EDIT CELL GRADING RECORD" : "QUALITY CONTROL CELL GRADING PANEL"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 font-sans">
                    {editingGradedId ? "MODIFY SPECIMEN METRICS AND CALIBRATE ASSIGNED GRADE" : "LOG CELL SPECS TO AUTOMATICALLY MATCH GRADE A, B, C OR REJECT SCRAP CATEGORIES"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsGradingModalOpen(false); setEditingGradedId(null); }} 
                className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-800 cursor-pointer border border-transparent hover:border-slate-200"
                id="close-grading-modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Split Screen Matrix */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-150">
              
              {/* Left Column: Form Intake Section */}
              <form 
                id="grading-form"
                onSubmit={handleSubmitCellGrading} 
                className="flex-1 md:w-1/2 overflow-y-auto p-8 md:p-10 space-y-8 text-left"
              >
                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-650 font-mono">
                    ⚠️ {submitError}
                  </div>
                )}

                {gradingSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-600 font-mono">
                    ✨ {gradingSuccess}
                  </div>
                )}

                {/* Base Unsorted Reference */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">BASE UNSORTED INVENTORY REFERENCE</label>
                  <div className="relative">
                    <select
                      value={gradingParentId}
                      onChange={e => setGradingParentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-black outline-none font-sans text-slate-850 appearance-none cursor-pointer shadow-3xs"
                    >
                      {inventory.filter((i: any) => i.id.includes('CELL') || i.category.toLowerCase().includes('cell')).map((i: any) => (
                        <option key={i.id} value={i.id} className="bg-white">
                          {i.name} ({i.qty} Pcs remaining in core raw stock)
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-slate-500">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Serial matching input */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">TESTED CELL SERIAL REFERENCE MATCH</label>
                  <input
                    type="text"
                    required
                    placeholder="E.G. CELL-A-2026-0042"
                    value={cellSerial}
                    onChange={e => setCellSerial(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                  />
                </div>

                {/* 2-Column: Volts & Resistance */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">REST VOLTAGE TESTED (V)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cellVoltage}
                      onChange={e => setCellVoltage(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">IR IMPEDANCE (MΩ)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={cellIR}
                      onChange={e => setCellIR(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                    />
                  </div>
                </div>

                {/* 2-Column: Capacity & Cycles */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">COULOMB CAPACITY TESTED (MAH)</label>
                    <input
                      type="number"
                      step="100"
                      required
                      value={cellCapacity}
                      onChange={e => setCellCapacity(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">SIMULATED CYCLES COUNT</label>
                    <input
                      type="number"
                      required
                      value={cellCycleCount}
                      onChange={e => setCellCycleCount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                    />
                  </div>
                </div>

                {/* 2-Column: Temperature & Certifier */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">ELECTRODES TEMP (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={cellTemp}
                      onChange={e => setCellTemp(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">LAB CERTIFIER SIGN</label>
                    <input
                      type="text"
                      required
                      value={qcEngineer}
                      onChange={e => setQcEngineer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#009270] transition-colors rounded-xl py-4 px-5 text-sm font-extrabold text-slate-800 outline-none shadow-3xs"
                    />
                  </div>
                </div>
              </form>

              {/* Right Column: Graded cells repository register section */}
              <div className="flex-1 md:w-1/2 overflow-y-auto p-8 md:p-10 bg-slate-50/50 flex flex-col space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/70">
                  <div className="text-left">
                    <h4 className="text-sm md:text-base font-black text-slate-950 uppercase tracking-tight italic">QUALITY CONTROL GRADED REPOSITORY</h4>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mt-1">ELECTRO-CHEMICAL METRICS OF ANALYZED LITHIUM CELLS</p>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-150/50 font-black px-4.5 py-2.5 rounded-xl uppercase tracking-widest shadow-2xs select-none">
                    LIVE VAULT POOL
                  </span>
                </div>

                {/* Graded search input */}
                <div className="relative">
                  <Search className="absolute left-4 top-4.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by serial number, grade, or specialist..."
                    value={subSearchGrading}
                    onChange={(e) => setSubSearchGrading(e.target.value)}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-[#009270] transition-colors rounded-2xl py-4 pl-12 pr-6 text-sm font-bold outline-none shadow-3xs text-slate-800 placeholder-slate-400"
                  />
                  {subSearchGrading && (
                    <button 
                      onClick={() => setSubSearchGrading('')}
                      className="absolute right-4 top-4.5 text-slate-400 hover:text-slate-900 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Graded table block */}
                <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-2xs flex-1 min-h-[350px] flex flex-col">
                  <div className="overflow-x-auto flex-1 max-h-[520px]">
                    <table className="w-full text-left font-mono text-xs text-slate-950 border-collapse">
                      <thead className="bg-[#f8fafc] text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4.5">SERIAL / DATE</th>
                          <th className="px-6 py-4.5">VOLTAGE</th>
                          <th className="px-6 py-4.5">INTERNAL RES (IR)</th>
                          <th className="px-6 py-4.5">CAPACITY</th>
                          <th className="px-6 py-4.5">ASSIGNED GRADE</th>
                          <th className="px-6 py-4.5 text-right pr-6">QC INSPECTOR</th>
                          <th className="px-6 py-4.5 text-center w-28">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {paginatedGraded.map((cell: any) => (
                          <tr key={cell.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5.5 font-sans text-left">
                              <p className="font-extrabold text-slate-900 text-sm tracking-tight uppercase leading-none">
                                {cell.serial}
                              </p>
                              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-2 block">
                                {cell.date || "2024-05-18"}
                              </span>
                            </td>
                            <td className="px-6 py-5.5 text-left font-bold text-slate-800 text-xs">
                              {cell.voltage}V
                            </td>
                            <td className="px-6 py-5.5 text-left font-bold text-[#0284c7] text-xs font-mono">
                              {cell.ir} mΩ
                            </td>
                            <td className="px-6 py-5.5 text-left font-bold text-slate-850 text-xs font-mono">
                              {cell.capacity} mAh
                            </td>
                            <td className="px-6 py-5.5 text-left">
                              <span className={cn(
                                "inline-block px-4 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border text-center select-none shadow-3xs",
                                cell.grade === 'A' ? "bg-emerald-50 text-emerald-600 border-emerald-150/60" :
                                cell.grade === 'B' ? "bg-amber-50 text-amber-600 border-amber-150/60" :
                                cell.grade === 'C' ? "bg-blue-50 text-blue-600 border-blue-150/60" :
                                "bg-red-50 text-red-650 border-red-150/60"
                              )}>
                                GRADE {cell.grade}
                              </span>
                            </td>
                            <td className="px-6 py-5.5 text-right pr-6 font-sans text-xs font-extrabold text-slate-500 uppercase leading-snug">
                              {cell.engineer || cell.inspector || "SURESH P."}
                            </td>
                            <td className="px-6 py-5.5 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditGraded(cell)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                  title="Edit Graded Cell"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGraded(cell.id)}
                                  className="p-1.5 text-red-550 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete Graded Cell"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredGradingItems.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-20 text-center font-sans">
                              <Microscope className="mx-auto text-slate-200 mb-4 animate-pulse" size={42} />
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                NO GRADED CELL SPECIMENS REGISTERED YET.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {filteredGradingItems.length > 0 && (
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-4 text-left">
                        <p className="text-[10px] text-slate-500 font-sans font-medium">
                          Showing <span className="font-bold text-slate-800">{Math.min((gradedCurrentPage - 1) * gradedItemsPerPage + 1, filteredGradingItems.length)}</span> to{' '}
                          <span className="font-bold text-slate-800">{Math.min(gradedCurrentPage * gradedItemsPerPage, filteredGradingItems.length)}</span> of{' '}
                          <span className="font-bold text-slate-800">{filteredGradingItems.length}</span> graded cells
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
                          <select
                            value={gradedItemsPerPage}
                            onChange={(e) => {
                              setGradedItemsPerPage(Number(e.target.value));
                              setGradedCurrentPage(1);
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500/30"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                        <button
                          type="button"
                          disabled={gradedCurrentPage === 1}
                          onClick={() => setGradedCurrentPage(p => Math.max(p - 1, 1))}
                          className="px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          Prev
                        </button>
                        {Array.from({ length: totalGradedPages }, (_, idx) => {
                          const pageNum = idx + 1;
                          if (
                            totalGradedPages > 4 &&
                            pageNum !== 1 &&
                            pageNum !== totalGradedPages &&
                            Math.abs(pageNum - gradedCurrentPage) > 1
                          ) {
                            if (pageNum === 2 && gradedCurrentPage > 2) {
                              return <span key="ellipsis-start-graded" className="px-1 text-slate-400 font-sans text-xs">...</span>;
                            }
                            if (pageNum === totalGradedPages - 1 && gradedCurrentPage < totalGradedPages - 1) {
                              return <span key="ellipsis-end-graded" className="px-1 text-slate-400 font-sans text-xs">...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setGradedCurrentPage(pageNum)}
                              className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all cursor-pointer",
                                gradedCurrentPage === pageNum
                                  ? "bg-[#009270] text-white shadow-md shadow-emerald-500/15"
                                  : "border border-slate-200 text-slate-600 hover:bg-white"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          disabled={gradedCurrentPage === totalGradedPages}
                          onClick={() => setGradedCurrentPage(p => Math.min(p + 1, totalGradedPages))}
                          className="px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Plate */}
            <div className="p-8 px-10 border-t border-slate-150 bg-slate-50 flex justify-end space-x-4 shrink-0">
              <button
                type="button"
                onClick={() => { setIsGradingModalOpen(false); setEditingGradedId(null); }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-8 py-4 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-colors cursor-pointer"
                id="dismiss-grading-modal"
              >
                CLOSE LAB PORTAL
              </button>
              <button
                type="submit"
                form="grading-form"
                onClick={handleSubmitCellGrading}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md shadow-emerald-600/25 cursor-pointer"
                id="commit-grading-modal"
              >
                {isSubmitting ? "AUTHORIZING..." : editingGradedId ? "SAVE CHANGES" : "AUTHORIZE & GRADE CELL"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: WAREHOUSE STOCK TRANSFER */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight italic">
                  Internal Node Stock Transfer Flow
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Move materials between central, production, or scrap warehouse blocks safely
                </p>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {transferError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
                  {transferError}
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-sans">Active Transfer Target Asset</p>
                <h4 className="text-sm font-sans font-black text-slate-900 uppercase mt-1 leading-none">{transferItem?.name}</h4>
                <p className="text-[10px] font-mono text-primary-600 mt-2 font-bold uppercase">Source: {sourceWh} (Rack: {transferItem?.rack})</p>
                <p className="text-[10px] font-mono text-slate-500 font-bold mt-1 uppercase">Available: {transferItem?.qty} {transferItem?.unit}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-sans">Transfer Destination Node</label>
                <select
                  value={destWh}
                  onChange={e => setDestWh(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-black outline-none font-sans"
                >
                  {warehouses.filter(w => w !== sourceWh).map(w => (
                    <option key={w} value={w} className="bg-white">{w}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Transfer Qty</label>
                <input
                  type="number"
                  min="1"
                  max={transferItem?.qty}
                  value={transferQty || ''}
                  onChange={e => setTransferQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-black outline-none font-mono"
                  placeholder={`Max: ${transferItem?.qty}`}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
              >
                Cancel Transfer
              </button>
              <button 
                onClick={handleWarehouseTransfer}
                disabled={isSubmitting || transferQty <= 0}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Perform Transfer Order
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOW STAGE MODAL 1: FINAL PRODUCT INVENTORY */}
      {isFinalInventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-sans font-black text-slate-950 uppercase tracking-wider text-[15px] flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-sky-500" /> Final Product Inventory Ledger
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">Pack Assembly Complete Certified Lots & Serialization Logs</p>
              </div>
              <button onClick={() => setIsFinalInventoryModalOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Search & Mode toggling */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex-1 flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search Serial, Model ID or Batch Code..."
                      value={fiSearch}
                      onChange={e => setFiSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-10 text-xs font-bold outline-none font-sans"
                    />
                  </div>
                  <select 
                    value={fiFilterStatus}
                    onChange={e => setFiFilterStatus(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 text-xs font-black font-sans"
                  >
                    <option value="ALL">ALL STATUS</option>
                    <option value="READY">READY FOR DISPATCH</option>
                    <option value="SOLD">SOLD & DEPLOYED</option>
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    setShowFaForm(!showFaForm);
                    if (!faModel && data?.products?.length > 0) {
                      setFaModel(data.products[0].id);
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> {showFaForm ? "Show Ledger List" : "Record Assembly Line Output"}
                </button>
              </div>

              {/* RECORD ASSEMBLY OUTPUT FORM */}
              {showFaForm ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3rem p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200/60 pb-2">Record Finished Assembly Pack Output</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Select Product Model</label>
                      <select
                        value={faModel}
                        onChange={e => setFaModel(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-black font-sans"
                      >
                        {data?.products?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Completed Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={faQty}
                        onChange={e => setFaQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Destination Warehouse</label>
                      <select
                        value={faWarehouse}
                        onChange={e => setFaWarehouse(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-black font-sans"
                      >
                        <option value="Production Warehouse">Production Warehouse</option>
                        <option value="Finished Goods Hub">Finished Goods Hub</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Target Shelf Address</label>
                      <input
                        type="text"
                        value={faRack}
                        onChange={e => setFaRack(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-black uppercase"
                        placeholder="e.g. FG-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={async () => {
                        if (!faModel) return;
                        setIsSubmitting(true);
                        try {
                          const res = await fetch('/api/production/complete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              model: faModel,
                              qty: faQty,
                              warehouse: faWarehouse,
                              rack: faRack
                            })
                          });
                          if (res.ok) {
                            refetch();
                            setShowFaForm(false);
                            setFaQty(1);
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Certify & Register {faQty} Finished Packs
                    </button>
                  </div>
                </div>
              ) : null}

              {/* FINISHED LEDGER LIST */}
              <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Serial Number</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Product / Model ID</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Batch Ref</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Warehouse / Rack</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Date Registered</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-xs">
                    {(data?.finishedGoods || []).filter((fg: any) => {
                      const matchSearch = 
                        fg.serial.toLowerCase().includes(fiSearch.toLowerCase()) ||
                        fg.model.toLowerCase().includes(fiSearch.toLowerCase()) ||
                        (fg.batch || '').toLowerCase().includes(fiSearch.toLowerCase());
                      const matchStatus = fiFilterStatus === 'ALL' || fg.status === fiFilterStatus;
                      return matchSearch && matchStatus;
                    }).map((fg: any) => (
                      <tr key={fg.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-black text-slate-900">{fg.serial}</td>
                        <td className="py-3.5 px-6">
                          <span className="font-semibold text-slate-800 block">{data?.products?.find((p: any) => p.id === fg.model)?.name || fg.model}</span>
                          <span className="text-[9px] font-mono text-slate-400 font-extrabold uppercase">{fg.model}</span>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[10px] text-slate-500 font-bold">{fg.batch}</td>
                        <td className="py-3.5 px-6">
                          <span className="font-medium text-slate-700 block">{fg.warehouse}</span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Shelf: {fg.rack}</span>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[10px] text-slate-500">{fg.date}</td>
                        <td className="py-3.5 px-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block",
                            fg.status === 'READY' ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-blue-50 text-blue-600 border border-blue-100"
                          )}>
                            {fg.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => {
                              setSelectedQRItem({
                                ...fg,
                                name: data?.products?.find((p: any) => p.id === fg.model)?.name || fg.model,
                                code: fg.model,
                                supplier: 'Arcenol Assembly Line'
                              });
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                            title="Generate QR Tag sticker"
                          >
                            <QrCode size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!data?.finishedGoods || data?.finishedGoods.length === 0) && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 uppercase text-[10px] font-black">
                          No finished assembly lots recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsFinalInventoryModalOpen(false)}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOW STAGE MODAL 2: DISPATCH / SALES LEDGER */}
      {isSalesLedgerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-sans font-black text-slate-955 uppercase tracking-wider text-[15px] flex items-center gap-2">
                  <History size={18} className="text-teal-500" /> Dispatch & Outbound Commercial Invoices
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">E-Way Bills, Outbound Shipments, Sales Tax Audit Trails</p>
              </div>
              <button onClick={() => setIsSalesLedgerModalOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search Dealer Company, Invoice Code, Shipment Serial..."
                    value={slSearch}
                    onChange={e => setSlSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-10 text-xs font-bold outline-none font-sans"
                  />
                </div>
                
                <button
                  onClick={() => {
                    setShowIgForm(!showIgForm);
                    if (!igDealer && data?.dealers?.length > 0) {
                      setIgDealer(data.dealers[0].id);
                    }
                    if (!igProduct && data?.products?.length > 0) {
                      setIgProduct(data.products[0].id);
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> {showIgForm ? "Show Invoices" : "Generate Commercial Invoice"}
                </button>
              </div>

              {/* GENERATE COMMERCIAL INVOICE FORM */}
              {showIgForm ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3rem p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200/60 pb-2">Generate Sales Invoice & Dispatch Clearance</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Select Dealer Customer</label>
                      <select
                        value={igDealer}
                        onChange={e => {
                          setIgDealer(e.target.value);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-black font-sans"
                      >
                        {data?.dealers?.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.company} ({d.city}, {d.state})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Select Product SKU</label>
                      <select
                        value={igProduct}
                        onChange={e => {
                          setIgProduct(e.target.value);
                          const p = data?.products?.find((item: any) => item.id === e.target.value);
                          if (p) {
                            setIgTotal(p.price || 15000);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-black font-sans"
                      >
                        {data?.products?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price || 0)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Dispatch Serialization Number(s) (Ready finished goods serial, comma-separated)</label>
                      <input
                        type="text"
                        value={igSerials}
                        onChange={e => setIgSerials(e.target.value)}
                        placeholder="e.g. AESPLEV28G26001044, AESPLEV28G26001045"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-black uppercase"
                      />
                      <span className="text-[9px] text-slate-400 block font-sans">Available READY serials: {(data?.finishedGoods || []).filter((fg: any) => fg.status === 'READY').map((fg: any) => fg.serial).join(', ') || 'No READY packs. Create finished packs first.'}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Total Price (INR)</label>
                      <input
                        type="number"
                        value={igTotal}
                        onChange={e => setIgTotal(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Goods & Services Tax (GST 18%)</label>
                      <input
                        type="number"
                        value={igTax || Math.round(igTotal * 0.18)}
                        onChange={e => setIgTax(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-black"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={async () => {
                        if (!igDealer || !igProduct) return;
                        const serialsArr = igSerials.split(',').map(s => s.trim()).filter(s => s.length > 0);
                        if (serialsArr.length === 0) {
                          alert("Please specify at least one valid ready finished product Serial Number.");
                          return;
                        }
                        setIsSubmitting(true);
                        try {
                          const res = await fetch('/api/invoices', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              dealerId: igDealer,
                              items: [{
                                modelId: igProduct,
                                qty: serialsArr.length,
                                price: Math.round(igTotal / serialsArr.length),
                                serials: serialsArr
                              }],
                              total: igTotal + (igTax || Math.round(igTotal * 0.18)),
                              tax: igTax || Math.round(igTotal * 0.18)
                            })
                          });
                          if (res.ok) {
                            refetch();
                            setShowIgForm(false);
                            setIgSerials('');
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Authorize Sale Outflow & Dispatch
                    </button>
                  </div>
                </div>
              ) : null}

              {/* INVOICES LIST */}
              <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Invoice / Bill ID</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Issue Date</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Dealer / Partner</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Line Items</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Value</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Audit Status</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Ledger Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-xs">
                    {(data?.invoices || []).filter((inv: any) => {
                      const d = data?.dealers?.find((dl: any) => dl.id === inv.dealerId);
                      const dCompany = d ? d.company : '';
                      const matchSearch = 
                        inv.id.toLowerCase().includes(slSearch.toLowerCase()) ||
                        dCompany.toLowerCase().includes(slSearch.toLowerCase()) ||
                        inv.dealerId.toLowerCase().includes(slSearch.toLowerCase());
                      return matchSearch;
                    }).map((inv: any) => {
                      const dl = data?.dealers?.find((d: any) => d.id === inv.dealerId);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-6 font-mono font-black text-slate-900">{inv.id}</td>
                          <td className="py-3.5 px-6 font-mono text-[10px] text-slate-500">{inv.date}</td>
                          <td className="py-3.5 px-6">
                            <span className="font-semibold text-slate-800 block">{dl?.company || inv.dealerId}</span>
                            <span className="text-[9px] font-sans text-slate-400 font-bold uppercase">{dl?.city}, {dl?.state}</span>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="space-y-1">
                              {inv.items?.map((item: any, idx: number) => (
                                <div key={idx} className="text-[10px]">
                                  <span className="font-bold text-slate-700">{data?.products?.find((p: any) => p.id === item.modelId)?.name || item.modelId}</span>
                                  <span className="text-slate-400 font-mono"> x{item.qty}</span>
                                  <div className="text-[8px] text-slate-400 font-mono">{item.serials?.join(', ')}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 font-mono font-black text-slate-950">{formatCurrency(inv.total)}</td>
                          <td className="py-3.5 px-6">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block",
                              inv.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                            )}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right space-x-1.5 font-sans">
                            {inv.status !== 'PAID' ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/invoices/${inv.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'PAID' })
                                    });
                                    if (res.ok) refetch();
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                              >
                                Mark Paid
                              </button>
                            ) : null}
                            <button
                              onClick={async () => {
                                if (confirm("Revoking invoice will restore finished goods and reverse dealer statistics. Proceed?")) {
                                  try {
                                    const res = await fetch(`/api/invoices/${inv.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (res.ok) refetch();
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-1.5 rounded-lg transition-colors inline-block"
                              title="Delete / Revoke Invoice"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!data?.invoices || data?.invoices.length === 0) && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 uppercase text-[10px] font-black">
                          No commercial sales invoices generated.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsSalesLedgerModalOpen(false)}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOW STAGE MODAL 3: RMA SERVICE RETURN */}
      {isRmaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-sans font-black text-slate-950 uppercase tracking-wider text-[15px] flex items-center gap-2">
                  <RefreshCw size={18} className="text-pink-500 animate-spin-slow" /> RMA / Tech Defect Service Returns
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1">Disassembly Diagnostics, Quality Audits, Reconditioning Logs</p>
              </div>
              <button onClick={() => setIsRmaModalOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex-1 flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search Serial, Ticket ID, Failure Notes..."
                      value={rmaSearch}
                      onChange={e => setRmaSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-10 text-xs font-bold outline-none font-sans"
                    />
                  </div>
                  <select 
                    value={rmaStatusFilter}
                    onChange={e => setRmaStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 text-xs font-black font-sans"
                  >
                    <option value="ALL">ALL STAGES</option>
                    <option value="REGISTERED">REGISTERED</option>
                    <option value="IN_INSPECTION">IN DIAGNOSTIC INSPECTION</option>
                    <option value="QC_PASSED">REPAIRED / QC PASSED</option>
                    <option value="CLOSED">CLOSED & RESOLVED</option>
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    setShowRmaForm(!showRmaForm);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> {showRmaForm ? "Show RMA Tickets" : "File Diagnostic RMA Ticket"}
                </button>
              </div>

              {/* DYNAMIC COMPLAINTS FORM */}
              {showRmaForm ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3rem p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200/60 pb-2">Log RMA Field Return Incident</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Unit Serial Number</label>
                      <input
                        type="text"
                        value={newRmaSerial}
                        onChange={e => setNewRmaSerial(e.target.value)}
                        placeholder="e.g. AESPLEV28G26001044"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono font-black uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Primary Symptom / Symptom Type</label>
                      <select
                        value={newRmaType}
                        onChange={e => setNewRmaType(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-black font-sans"
                      >
                        <option value="Thermal Overrun">Thermal Overrun / Overheating</option>
                        <option value="BMS Communication Fault">BMS Communication Loss</option>
                        <option value="Cell Imbalance Fault">Cell Imbalance & Voltage Sag</option>
                        <option value="Connector Corrosion">Physical Connector Oxidation</option>
                        <option value="Mechanical Deformity">Casing Deformity / Drop Impact</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-sans">Diagnosis Qualitative Notes</label>
                      <textarea
                        value={newRmaNotes}
                        onChange={e => setNewRmaNotes(e.target.value)}
                        placeholder="Technician teardown comments or customer field description..."
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-medium font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={async () => {
                        if (!newRmaSerial) {
                          alert("A valid product serial number is required.");
                          return;
                        }
                        setIsSubmitting(true);
                        try {
                          const res = await fetch('/api/complaints', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              serial: newRmaSerial,
                              type: newRmaType,
                              notes: newRmaNotes
                            })
                          });
                          if (res.ok) {
                            refetch();
                            setShowRmaForm(false);
                            setNewRmaSerial('');
                            setNewRmaNotes('');
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Authorize Diagnostic Intake
                    </button>
                  </div>
                </div>
              ) : null}

              {/* RESOLUTION DIAGNOSTIC POPUP FORM */}
              {activeRmaId ? (
                <div className="bg-amber-50 border border-amber-200 rounded-3rem p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
                  <h4 className="text-[11px] font-black text-amber-950 uppercase tracking-widest">Close Ticket & Log Root Cause Diagnostics</h4>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-amber-800 uppercase tracking-widest block">Engineering Root Cause Statement</label>
                    <input 
                      type="text"
                      value={rmaRootCause}
                      onChange={e => setRmaRootCause(e.target.value)}
                      placeholder="e.g. Swapped bad weld nickel strip in Row B; cell cycle retention OK."
                      className="w-full bg-white border border-amber-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => {
                        setActiveRmaId(null);
                        setRmaRootCause('');
                      }} 
                      className="bg-white border border-slate-200 text-slate-500 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!rmaRootCause) {
                          alert("Root cause analysis is required for QA compliance.");
                          return;
                        }
                        try {
                          const res = await fetch(`/api/complaints/${activeRmaId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              stage: 'CLOSED',
                              status: 'RESOLVED',
                              rootCause: rmaRootCause,
                              resolvedDate: new Date().toISOString().split('T')[0]
                            })
                          });
                          if (res.ok) {
                            refetch();
                            setActiveRmaId(null);
                            setRmaRootCause('');
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider"
                    >
                      Resolve & Lock Ticket
                    </button>
                  </div>
                </div>
              ) : null}

              {/* RMA INCIDENTS TABLE */}
              <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Ticket / Case ID</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Serial Number</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Log Date</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Defect Symptom</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Engineer Assigned</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Diagnostic Stage</th>
                      <th className="py-3.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Workflow Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans text-xs">
                    {(data?.complaints || []).filter((comp: any) => {
                      const matchSearch = 
                        comp.id.toLowerCase().includes(rmaSearch.toLowerCase()) ||
                        comp.serial.toLowerCase().includes(rmaSearch.toLowerCase()) ||
                        (comp.notes || '').toLowerCase().includes(rmaSearch.toLowerCase()) ||
                        (comp.type || '').toLowerCase().includes(rmaSearch.toLowerCase());
                      const matchStatus = rmaStatusFilter === 'ALL' || comp.stage === rmaStatusFilter;
                      return matchSearch && matchStatus;
                    }).map((comp: any) => (
                      <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-black text-slate-900">{comp.id}</td>
                        <td className="py-3.5 px-6 font-mono font-black text-slate-800">{comp.serial}</td>
                        <td className="py-3.5 px-6 font-mono text-[10px] text-slate-500">{comp.date}</td>
                        <td className="py-3.5 px-6">
                          <span className="font-semibold text-slate-800 block">{comp.type}</span>
                          <span className="text-[10px] text-slate-400 italic block truncate max-w-xs">{comp.notes}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-700 font-medium">{comp.engineer || 'Unassigned'}</td>
                        <td className="py-3.5 px-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block",
                            comp.stage === 'CLOSED' ? "bg-slate-100 text-slate-500 border border-slate-200" :
                            comp.stage === 'QC_PASSED' ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                            comp.stage === 'IN_INSPECTION' ? "bg-blue-50 text-blue-600 border border-blue-200" :
                            "bg-rose-50 text-rose-600 border border-rose-200"
                          )}>
                            {comp.stage?.replace('_', ' ')}
                          </span>
                          {comp.rootCause && (
                            <span className="text-[8px] text-emerald-600 block mt-1 font-sans font-semibold">Root: {comp.rootCause}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right space-x-1 font-sans">
                          {comp.stage === 'REGISTERED' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/complaints/${comp.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ stage: 'IN_INSPECTION', engineer: user?.name || 'Suresh P.' })
                                  });
                                  if (res.ok) refetch();
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                            >
                              Inspect
                            </button>
                          )}
                          {comp.stage === 'IN_INSPECTION' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/complaints/${comp.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ stage: 'QC_PASSED' })
                                  });
                                  if (res.ok) refetch();
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                            >
                              Pass QC
                            </button>
                          )}
                          {comp.stage !== 'CLOSED' && (
                            <button
                              onClick={() => {
                                setActiveRmaId(comp.id);
                                setRmaRootCause(comp.rootCause || '');
                              }}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!data?.complaints || data?.complaints.length === 0) && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 uppercase text-[10px] font-black">
                          No RMA Service Return Logs present.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsRmaModalOpen(false)}
                className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: QR & BARCODE PREVIEW LABEL CARD */}
      {selectedQRItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-6">
              <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-100">
                Print QR Tag Label
              </span>
              <button onClick={() => setSelectedQRItem(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={16} />
              </button>
            </div>

            {/* Print Area Preview */}
            <div className="w-full p-6 bg-slate-50 rounded-[2rem] border border-slate-200 flex flex-col items-center space-y-4 text-slate-900 border-dashed" id="qr-scannable-tag">
              <QRCodeSVG 
                value={`ARCENOL-SKU:${selectedQRItem.code || selectedQRItem.id}-BATCH:${selectedQRItem.batch}-GRN:${selectedQRItem.grn}-LOC:${selectedQRItem.warehouse}:${selectedQRItem.rack}`}
                size={160}
                bgColor="#f8fafc"
                fgColor="#0f172a"
              />
              
              <div className="text-center w-full">
                <h4 className="font-sans font-black text-slate-950 uppercase tracking-wider text-[13px] leading-tight">{selectedQRItem.name}</h4>
                <p className="font-mono text-[9px] text-slate-500 font-extrabold uppercase mt-1">INTERNAL SKU: {selectedQRItem.code || selectedQRItem.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full border-t border-slate-200/60 pt-4 text-left">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Warehouse Node</span>
                  <span className="text-[10px] font-sans font-black text-slate-900 uppercase block mt-1 leading-none">{selectedQRItem.warehouse}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Address Target</span>
                  <span className="text-[10px] font-mono font-black text-slate-900 uppercase block mt-1 leading-none">RACK {selectedQRItem.rack || 'A-1'}</span>
                </div>
                
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Batch Assigned</span>
                  <span className="text-[10px] font-mono font-black text-slate-900 uppercase block mt-1 leading-none">{selectedQRItem.batch}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Supplier</span>
                  <span className="text-[10px] font-sans font-black text-slate-900 uppercase block mt-1 leading-none truncate">{selectedQRItem.supplier}</span>
                </div>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-4 mt-6">
              <button 
                onClick={() => setSelectedQRItem(null)}
                className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center"
              >
                Dismiss Tag
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={13} /> Print Sticker
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 5: BULK UPLOAD RAW MATERIAL RECORDS */}
      {showRmImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[90vh] mx-4">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                  <Upload size={22} className="text-primary-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black font-sans text-slate-900 uppercase tracking-tight italic">
                    Bulk Import Raw Materials Stock
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    Register old, existing, or historic stock lists into Arcenol active ledger
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowRmImportModal(false); resetRmImporter(); }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Importer Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 text-left">
              
              {/* Tab Selector */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => { setRmImportTab('file'); resetRmImporter(); }}
                  className={cn(
                    "px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
                    rmImportTab === 'file' ? "border-slate-900 text-slate-900 font-black border-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <FileSpreadsheet size={14} />
                  Excel / CSV File Upload
                </button>
                <button
                  type="button"
                  onClick={() => { setRmImportTab('text'); resetRmImporter(); }}
                  className={cn(
                    "px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2",
                    rmImportTab === 'text' ? "border-slate-900 text-slate-900 font-black border-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <FileText size={14} />
                  Copy & Paste List
                </button>
              </div>

              {/* Status Banner */}
              {rmSuccessToast && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 animate-bounce" />
                  {rmSuccessToast}
                </div>
              )}
              {rmImportErrorMsg && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-500" />
                  {rmImportErrorMsg}
                </div>
              )}

              {/* Defaults & Fallbacks Configuration */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fallback Registry Config:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Default Category</label>
                    <select
                      value={defaultRmCategory}
                      onChange={e => setDefaultRmCategory(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-800 w-full outline-none focus:ring-1 focus:ring-slate-950"
                    >
                      {categoryNames.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Default Hub</label>
                    <input
                      type="text"
                      value={defaultRmWarehouse}
                      onChange={e => setDefaultRmWarehouse(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-800 w-full outline-none focus:ring-1 focus:ring-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Default Vendor</label>
                    <input
                      type="text"
                      value={defaultRmSupplier}
                      onChange={e => setDefaultRmSupplier(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-800 w-full outline-none focus:ring-1 focus:ring-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Measure Unit</label>
                    <input
                      type="text"
                      value={defaultRmUnit}
                      onChange={e => setDefaultRmUnit(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-800 w-full outline-none focus:ring-1 focus:ring-slate-950"
                    />
                  </div>
                </div>
              </div>

              {/* Tab 1: File Upload */}
              {rmImportTab === 'file' && rmImportStatus === 'idle' && (
                <div className="border-2 border-dashed border-slate-200 hover:border-primary-400 rounded-3xl p-12 transition-all flex flex-col items-center justify-center space-y-4 text-center group bg-slate-50/50 relative">
                  <div className="p-4 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-primary-500 transition-colors">
                    <Upload size={32} />
                  </div>
                  <div>
                    <p className="font-sans font-black text-slate-800 text-xs uppercase tracking-wider">Drag and drop your raw material Excel (.xlsx/.xls) or CSV file here</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Or click to select file from your system</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleRmCSVUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="rm-csv-uploader-input"
                  />
                  <div className="flex flex-col sm:flex-row gap-3 relative z-10 items-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById('rm-csv-uploader-input')?.click()}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 cursor-pointer shadow-sm"
                    >
                      Select File (Excel/CSV)
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadRmExcelTemplate}
                      className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={12} /> Download Excel Template
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadRmCSVTemplate}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={12} /> Download CSV Template
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Text Copy Paste */}
              {rmImportTab === 'text' && rmImportStatus === 'idle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Paste list of materials and quantities (format: Name [tab/comma] Quantity):</label>
                    <textarea
                      value={pastedRmText}
                      onChange={e => setPastedRmText(e.target.value)}
                      placeholder="e.g.&#10;Lead Alloy Grade-A, 1500, SKU-LA-NEW&#10;Premium Cobalt Powder, 450, SKU-COBALT"
                      rows={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-950 transition-all placeholder-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePastedRmTextParse}
                    disabled={!pastedRmText.trim()}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    Parse List
                  </button>
                </div>
              )}

              {/* Parsed List Preview */}
              {rmImportStatus === 'parsed' && parsedRmItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-ping"></span>
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Parsed {parsedRmItems.length} valid material rows. Ready to upload:</p>
                    </div>
                    <button
                      type="button"
                      onClick={resetRmImporter}
                      className="text-[9px] text-rose-600 font-black uppercase tracking-wider hover:underline"
                    >
                      Clear & Restart
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50/50">
                    <table className="w-full text-left font-mono text-[10px] border-collapse">
                      <thead className="bg-slate-100 uppercase text-[8px] font-black text-slate-500 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Material Name</th>
                          <th className="px-4 py-3">SKU Code</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Quantity</th>
                          <th className="px-4 py-3">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRmItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/50 text-slate-800">
                            <td className="px-4 py-2.5 font-bold">{item.name}</td>
                            <td className="px-4 py-2.5">{item.code}</td>
                            <td className="px-4 py-2.5 text-slate-500 uppercase font-bold text-[9px]">{item.category}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">{item.qty}</td>
                            <td className="px-4 py-2.5 text-slate-500">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Loading Spinner */}
              {rmImportStatus === 'submitting' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Writing records to database ledgers, generating transaction indices...</p>
                </div>
              )}

              {/* Success Result */}
              {rmImportStatus === 'success' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-lg border border-emerald-100">
                    <Check size={32} />
                  </div>
                  <h4 className="font-sans font-black text-slate-900 uppercase text-sm mt-2">Bulk Import Sync Successful!</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ledgers updated, stock amounts aggregated, pipeline synchronization complete.</p>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setShowRmImportModal(false); resetRmImporter(); }}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-300"
              >
                Close Importer
              </button>
              {rmImportStatus === 'parsed' && (
                <button
                  type="button"
                  onClick={handleCommitRmBulkImport}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check size={14} /> Commit Bulk Upload
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDIT RAW MATERIAL REGISTRY */}
      {isEditRmModalOpen && editRmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] mx-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                  <Edit size={22} className="text-primary-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black font-sans text-slate-900 uppercase tracking-tight italic">
                    {editRmItem.isNew ? 'Register New Raw Material Node' : 'Edit Material Registry Node'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {editRmItem.isNew ? 'Enter raw material meta parameters, MINIMUM STOCK (ROL), and REORDER LEVEL' : `Update structural meta parameters and core stock ledger definitions for ${editRmItem.id}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setIsEditRmModalOpen(false); setEditRmItem(null); }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveRm} className="flex-1 overflow-y-auto p-8 space-y-6 text-left">
              {editRmError && (
                <div className="p-4 bg-red-50 border border-red-150 rounded-xl text-xs font-bold text-red-600 font-mono">
                  ⚠️ {editRmError}
                </div>
              )}

              {/* Grid 1: Name and Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">MATERIAL NAME</label>
                  <input
                    type="text"
                    required
                    value={editRmName}
                    onChange={(e) => setEditRmName(e.target.value)}
                    placeholder="e.g. Lead Alloy"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-bold text-slate-800 outline-none shadow-3xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">CODE REFERENCE</label>
                  <input
                    type="text"
                    required
                    value={editRmCode}
                    onChange={(e) => setEditRmCode(e.target.value)}
                    placeholder="e.g. LA-001"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                  />
                </div>
              </div>

              {/* Grid 2: Classification and Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">CLASSIFICATION CATEGORY</label>
                  <select
                    value={editRmCategory}
                    onChange={(e) => setEditRmCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-sans text-slate-800 cursor-pointer shadow-3xs"
                  >
                    {categoryNames.map((catName) => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">BASE UNIT OF MEASURE</label>
                  <input
                    type="text"
                    required
                    value={editRmUnit}
                    onChange={(e) => setEditRmUnit(e.target.value)}
                    placeholder="e.g. Kg, Pcs, Ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-bold text-slate-800 outline-none shadow-3xs"
                  />
                </div>
              </div>

              {/* Grid 3: Vendor & Batch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">SUPPLIER COMPANY</label>
                  <input
                    type="text"
                    required
                    value={editRmSupplier}
                    onChange={(e) => setEditRmSupplier(e.target.value)}
                    placeholder="e.g. Platinum Electronics"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-bold text-slate-800 outline-none shadow-3xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">BATCH MASTER ID</label>
                  <input
                    type="text"
                    required
                    value={editRmBatch}
                    onChange={(e) => setEditRmBatch(e.target.value)}
                    placeholder="E.G. BATCH-72"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                  />
                </div>
              </div>

              {/* Grid 4: GRN and Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">GRN REFERENCE MATCH</label>
                  <input
                    type="text"
                    required
                    value={editRmGrn}
                    onChange={(e) => setEditRmGrn(e.target.value)}
                    placeholder="E.G. GRN-998"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">BASE SUPPLIER VALUE (₹)</label>
                  <input
                    type="number"
                    required
                    value={editRmPrice || ''}
                    onChange={(e) => setEditRmPrice(Number(e.target.value))}
                    placeholder="e.g. 150"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                  />
                </div>
              </div>

              {/* Grid 5: Warehouse and Rack Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">WAREHOUSE HUB LOCATION</label>
                  <div className="relative">
                    <select
                      value={editRmWarehouse}
                      onChange={(e) => setEditRmWarehouse(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-sans text-slate-800 appearance-none cursor-pointer shadow-3xs"
                    >
                      {warehouses.map((wh: string) => (
                        <option key={wh} value={wh} className="bg-white">{wh}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-slate-500">
                      ▼
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">RACK SHELF ADDRESS</label>
                  <input
                    type="text"
                    required
                    value={editRmRack}
                    onChange={(e) => setEditRmRack(e.target.value)}
                    placeholder="A-1"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono uppercase text-slate-800 shadow-3xs"
                  />
                </div>
              </div>

              {/* Grid 6: Physical Quantity and Min Stock / Reorder Trigger */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">PHYSICAL QUANTITY ACTIVE</label>
                  <input
                    type="number"
                    required
                    value={editRmQty}
                    onChange={(e) => setEditRmQty(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">MINIMUM STOCK (ROL)</label>
                  <input
                    type="number"
                    required
                    value={editRmMinStock}
                    onChange={(e) => setEditRmMinStock(Number(e.target.value))}
                    placeholder="100"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">REORDER LEVEL</label>
                  <input
                    type="number"
                    required
                    value={editRmReorderLevel}
                    onChange={(e) => setEditRmReorderLevel(Number(e.target.value))}
                    placeholder="250"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-mono text-slate-800 shadow-3xs"
                  />
                </div>
              </div>

              {/* Grid 7: QC Status and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">QUALITY QC STATUS</label>
                  <select
                    value={editRmQcStatus}
                    onChange={(e) => setEditRmQcStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-sans text-slate-800 cursor-pointer shadow-3xs"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">LEDGER RECORD STATUS</label>
                  <select
                    value={editRmStatus}
                    onChange={(e) => setEditRmStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4.5 text-sm font-black outline-none font-sans text-slate-800 cursor-pointer shadow-3xs"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions Plate */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl -mx-8 -mb-8">
                <button
                  type="button"
                  onClick={() => { setIsEditRmModalOpen(false); setEditRmItem(null); }}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRm}
                  className="px-6 py-3 bg-[#0c9bbc] hover:bg-[#0a7f9a] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingRm ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Saving Changes
                    </>
                  ) : (
                    <>
                      <Save size={13} /> Save Registry Node
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {isDeleteRmModalOpen && deleteRmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-black font-sans text-slate-900 uppercase tracking-tight text-center">
              De-register Material Node
            </h3>
            <p className="text-xs text-slate-500 font-medium text-center mt-2 leading-relaxed">
              Are you sure you want to permanently delete raw material <span className="font-bold text-slate-800">{deleteRmItem.name} ({deleteRmItem.code || deleteRmItem.id})</span>? 
              This will remove all associated stock balances, location indexing, and valuation ledger lines from active ERP registers. This action cannot be undone.
            </p>

            {deleteRmError && (
              <div className="w-full mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-left text-xs font-bold text-red-650 font-mono">
                ⚠️ {deleteRmError}
              </div>
            )}

            <div className="w-full grid grid-cols-2 gap-4 mt-6">
              <button 
                onClick={() => { setIsDeleteRmModalOpen(false); setDeleteRmItem(null); }}
                className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center cursor-pointer"
              >
                Keep Node
              </button>
              <button 
                onClick={handleDeleteRm}
                disabled={isDeletingRm}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeletingRm ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} /> Delete Node
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-8 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#0c9bbc]/10 text-[#0c9bbc] rounded-2xl">
                  <Tag size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                    Add Inventory Category
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    Define new material classification schema
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-6 mt-6">
              {categorySubmitError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 font-mono">
                  ⚠️ {categorySubmitError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormName}
                  onChange={(e) => setCategoryFormName(e.target.value)}
                  placeholder="e.g. Category 8 — Thermal Management"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4 text-sm font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                  Category Code
                </label>
                <input
                  type="text"
                  value={categoryFormCode}
                  onChange={(e) => setCategoryFormCode(e.target.value)}
                  placeholder="e.g. CAT-THERM"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4 text-sm font-bold text-slate-800 outline-none uppercase font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={categoryFormDesc}
                  onChange={(e) => setCategoryFormDesc(e.target.value)}
                  placeholder="Details regarding inventory types falling into this classification..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl p-4 text-xs font-semibold text-slate-800 outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-6 py-3 bg-[#0c9bbc] hover:bg-[#0a7f9a] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={13} /> Save Category
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CATEGORY */}
      {isEditCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-8 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[#0c9bbc]/10 text-[#0c9bbc] rounded-2xl">
                  <Edit size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                    Edit Category Schema
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    Modify classification attributes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditCategoryModalOpen(false); setEditingCategory(null); }}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-6 mt-6">
              {categorySubmitError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 font-mono">
                  ⚠️ {categorySubmitError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormName}
                  onChange={(e) => setCategoryFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4 text-sm font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                  Category Code
                </label>
                <input
                  type="text"
                  value={categoryFormCode}
                  onChange={(e) => setCategoryFormCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl py-3.5 px-4 text-sm font-bold text-slate-800 outline-none uppercase font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={categoryFormDesc}
                  onChange={(e) => setCategoryFormDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c9bbc] transition-all rounded-xl p-4 text-xs font-semibold text-slate-800 outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setIsEditCategoryModalOpen(false); setEditingCategory(null); }}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-6 py-3 bg-[#0c9bbc] hover:bg-[#0a7f9a] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={13} /> Update Category
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CATEGORY */}
      {isDeleteCategoryModalOpen && deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-black font-sans text-slate-900 uppercase tracking-tight text-center">
              Delete Inventory Category
            </h3>
            <p className="text-xs text-slate-500 font-medium text-center mt-2 leading-relaxed">
              Are you sure you want to delete category <span className="font-bold text-slate-800">{deletingCategory.name}</span>? 
              This will remove the classification schema from active registers and database indexes.
            </p>

            {categorySubmitError && (
              <div className="w-full mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-left text-xs font-bold text-red-600 font-mono">
                ⚠️ {categorySubmitError}
              </div>
            )}

            <div className="w-full grid grid-cols-2 gap-4 mt-6">
              <button 
                onClick={() => { setIsDeleteCategoryModalOpen(false); setDeletingCategory(null); }}
                className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center cursor-pointer"
              >
                Keep Category
              </button>
              <button 
                onClick={handleDeleteCategory}
                disabled={isSavingCategory}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSavingCategory ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} /> Delete Category
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PURCHASE ORDER */}
      {isCreatePoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ShoppingCart size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight italic">Generate Purchase Order (PO)</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inward Raw Material Supply Requisition</p>
                </div>
              </div>
              <button onClick={() => setIsCreatePoModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Material Component Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lithium Cells (3.7V 3Ah) or Smart BMS 72V"
                  value={poMaterialName}
                  onChange={e => setPoMaterialName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vendor / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Energy Plus Ltd"
                    value={poVendor}
                    onChange={e => setPoVendor(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vendor Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={poVendorContact}
                    onChange={e => setPoVendorContact(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={poQty}
                    onChange={e => setPoQty(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unit</label>
                  <input
                    type="text"
                    value={poUnit}
                    onChange={e => setPoUnit(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={poUnitCost}
                    onChange={e => setPoUnitCost(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Est. Delivery Date</label>
                  <input
                    type="date"
                    value={poEstDelivery}
                    onChange={e => setPoEstDelivery(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                  <select
                    value={poCategory}
                    onChange={e => setPoCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    {categoryNames.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Order Remarks / Specification</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Grade A 3.2V 100Ah LiFePO4 cells with test certificates required."
                  value={poRemarks}
                  onChange={e => setPoRemarks(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatePoModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poIsSubmitting}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {poIsSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
