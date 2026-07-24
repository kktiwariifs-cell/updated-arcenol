import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Filter, Plus, ChevronRight, AlertTriangle, 
  ArrowUpRight, Download, History, BarChart3, Tag, Warehouse,
  Activity, ShieldCheck, Zap, Layers, Microscope, QrCode, Trash2,
  Database, Boxes, Thermometer, Beaker, TrendingUp, Calendar, MapPin,
  ClipboardList, PackagePlus, Truck, RefreshCcw, LayoutDashboard,
  Box, AlertCircle, Move, RotateCcw, X, Lock, Unlock, FileText, Sliders, Check, Edit, Save
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn, formatCurrency } from '../lib/utils';
import { useAuthStore, UserRole } from '../store/authStore';

export const StoreKeeperDashboard: React.FC<{ activeTab?: string }> = ({ activeTab }) => {
  const { user } = useAuthStore();
  const { data, loading, refetch } = useERPData();
  const [activeView, setActiveView] = useState<'overview' | 'raw-material'>(
    activeTab === 'raw-material-dashboard' ? 'raw-material' : 'overview'
  );

  useEffect(() => {
    setActiveView(activeTab === 'raw-material-dashboard' ? 'raw-material' : 'overview');
  }, [activeTab]);
  const [search, setSearch] = useState('');

  // States for active action drawer and stock report
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form states for selected material action
  const [actionWarehouse, setActionWarehouse] = useState('');
  const [actionRack, setActionRack] = useState('');
  const [actionQcStatus, setActionQcStatus] = useState('');
  const [actionStatus, setActionStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [qtyChangeMode, setQtyChangeMode] = useState<'add' | 'set'>('add');
  const [qtyChangeVal, setQtyChangeVal] = useState<number>(0);

  // Bulk Reorder State
  const [bulkReorderModalOpen, setBulkReorderModalOpen] = useState(false);
  const [bulkReorderItems, setBulkReorderItems] = useState<any[]>([]);
  const [reorderingInProgress, setReorderingInProgress] = useState(false);

  // States for adding warehouse
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [addingWarehouse, setAddingWarehouse] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [numRacks, setNumRacks] = useState<number>(6);
  const [numSlots, setNumSlots] = useState<number>(8);

  useEffect(() => {
    if (data?.whLayoutConfig) {
      if (data.whLayoutConfig.racks) setNumRacks(data.whLayoutConfig.racks);
      if (data.whLayoutConfig.slots) setNumSlots(data.whLayoutConfig.slots);
    }
  }, [data?.whLayoutConfig]);
  const [showCapacityMap, setShowCapacityMap] = useState(false);
  const [selectedCapacityWarehouse, setSelectedCapacityWarehouse] = useState<string>('');

  // States for editing/deleting warehouses
  const [editingWarehouseName, setEditingWarehouseName] = useState<string | null>(null);
  const [editingWarehouseValue, setEditingWarehouseValue] = useState('');
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);

  const handleEditWarehouse = (name: string) => {
    setEditingWarehouseName(name);
    setEditingWarehouseValue(name);
  };

  const handleSaveEditWarehouse = async (oldName: string) => {
    if (!editingWarehouseValue.trim()) return;
    setIsSavingWarehouse(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: editingWarehouseValue.trim() })
      });
      if (res.ok) {
        setEditingWarehouseName(null);
        if (refetch) await refetch();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update warehouse");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  const handleDeleteWarehouse = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will set its items to Unassigned.`)) return;
    try {
      const res = await fetch(`/api/warehouses/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (refetch) await refetch();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete warehouse");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouseName.trim()) return;
    setAddingWarehouse(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWarehouseName.trim() })
      });
      if (res.ok) {
        setNewWarehouseName('');
        setShowAddWarehouse(false);
        if (refetch) {
          await refetch();
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to add warehouse');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding warehouse. Please retry.');
    } finally {
      setAddingWarehouse(false);
    }
  };

  // States for inline editing database items in Capacity Map
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineForm, setInlineForm] = useState({
    id: '',
    name: '',
    code: '',
    category: 'RAW_MATERIAL',
    qty: 0,
    unit: 'Kg',
    price: 0,
    warehouse: '',
    rack: '',
    minStock: 100,
    reorderLevel: 250,
    qcStatus: 'APPROVED',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });
  const [savingInline, setSavingInline] = useState(false);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you absolutely sure you want to delete and purge this material item from the database? This cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedItem(null);
        setIsInlineEditing(false);
        if (refetch) {
          await refetch();
        }
      } else {
        alert('Failed to delete item');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting item');
    }
  };

  const handleSaveInlineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInline(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingItemId: inlineForm.id,
          name: inlineForm.name,
          code: inlineForm.code,
          category: inlineForm.category,
          warehouse: inlineForm.warehouse,
          rack: inlineForm.rack,
          qty: inlineForm.qty,
          setExactQty: true,
          price: inlineForm.price,
          unit: inlineForm.unit,
          minStock: Number(inlineForm.minStock) || 100,
          reorderLevel: Number(inlineForm.reorderLevel) || 250,
          qcStatus: inlineForm.qcStatus,
          status: inlineForm.status
        })
      });
      if (res.ok) {
        setIsInlineEditing(false);
        setSelectedItem(null);
        if (refetch) {
          await refetch();
        }
      } else {
        alert('Failed to save changes');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving changes');
    } finally {
      setSavingInline(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <div className="relative">
        <Database className="animate-pulse text-primary-500 mb-6" size={64} />
        <div className="absolute inset-0 bg-primary-400/20 blur-xl animate-ping rounded-full scale-50"></div>
      </div>
      <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Initiating Logistics Interface...</span>
    </div>
  );

  const inventory = data?.inventory || [];
  const filteredInventory = inventory.filter((item: any) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(query) ||
      (item.code || '').toLowerCase().includes(query) ||
      (item.rack || '').toLowerCase().includes(query) ||
      (item.warehouse || '').toLowerCase().includes(query)
    );
  });
  const wip = data?.wipInventory || [];
  const finishedGoods = data?.finishedGoods || [];
  const rawWarehouses = data?.warehouses || [];
  const warehouses: string[] = Array.from(new Set(rawWarehouses.map((w: any) => typeof w === 'object' && w !== null ? (w.name || String(w.id || '')) : String(w)).filter(Boolean)));

  // Toggle activation directly from table row
  const handleToggleActivation = async (item: any) => {
    try {
      const isItemActive = item.status !== 'INACTIVE';
      const nextStatus = isItemActive ? 'INACTIVE' : 'ACTIVE';
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingItemId: item.id,
          status: nextStatus,
          qty: 0,
          setExactQty: false
        })
      });
      if (res.ok && refetch) {
        await refetch();
      }
    } catch (err) {
      console.error('Error toggling raw material status:', err);
    }
  };

  // Submit edits from action drawer
  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmittingAction(true);
    try {
      const payload: any = {
        existingItemId: selectedItem.id,
        warehouse: actionWarehouse,
        rack: actionRack,
        qcStatus: actionQcStatus,
        status: actionStatus,
        qty: Number(qtyChangeVal) || 0,
        setExactQty: qtyChangeMode === 'set'
      };
      
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error('Failed to update material');
      }
      
      if (refetch) {
        await refetch();
      }
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
      alert('Error committing changes. Please retry.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenBulkReorder = () => {
    const lowItems = inventory.filter((item: any) => item.qty < (item.minStock || 0));
    const initialOrders = lowItems.map((item: any) => {
      const suggested = Math.max(10, (item.reorderLevel || (item.minStock * 2)) - item.qty);
      return {
        ...item,
        reorderQty: suggested,
        isSelected: true,
      };
    });
    setBulkReorderItems(initialOrders);
    setBulkReorderModalOpen(true);
  };

  const handleSubmitBulkReorder = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeOrders = bulkReorderItems.filter(item => item.isSelected && item.reorderQty > 0);
    if (activeOrders.length === 0) {
      alert("Please select at least one material node with a valid reorder quantity.");
      return;
    }
    setReorderingInProgress(true);
    try {
      const res = await fetch('/api/inventory/bulk-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: activeOrders.map(item => ({
            id: item.id,
            reorderQty: Number(item.reorderQty)
          }))
        })
      });
      if (res.ok) {
        if (refetch) {
          await refetch();
        }
        setBulkReorderModalOpen(false);
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to dispatch bulk reorder');
      }
    } catch (err) {
      console.error('Error submitting bulk reorder:', err);
      alert('Error submitting bulk reorder. Please check network connection.');
    } finally {
      setReorderingInProgress(false);
    }
  };

  // Metrics Calculation
  const totalRawItems = inventory.reduce((acc: number, item: any) => acc + item.qty, 0);
  const lowStockItems = inventory.filter((item: any) => item.qty < (item.minStock || 0));
  const pendingMaterials = inventory.filter((item: any) => item.grn === 'PENDING' || item.qcStatus === 'PENDING');
  
  const warehouseStock = warehouses.map((wh: string) => {
    const raw = inventory.filter((i: any) => i.warehouse === wh).reduce((acc: number, item: any) => acc + (item.qty * (item.price || 0)), 0);
    const fg = finishedGoods.filter((i: any) => i.warehouse === wh).length;
    return { name: wh, rawValue: raw, fgCount: fg };
  });

  return (
    <div className="space-y-8 pb-20 select-none">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center">
             {activeView === 'overview' ? 'Store Keeper Command' : 'Raw Material Matrix'}
          </h2>
          <div className="flex items-center mt-3 space-x-4">
             <div className="flex items-center bg-primary-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic shadow-lg shadow-primary-500/20">
                <ShieldCheck size={12} className="mr-1.5" /> Security Level: AUTH
             </div>
             <span className="h-1 w-1 rounded-full bg-slate-300"></span>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active Warehouses: {warehouses.length}
             </p>
          </div>
        </div>
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200">
           <button 
             onClick={() => setActiveView('overview')}
             className={cn(
               "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeView === 'overview' ? "bg-white text-primary-600 shadow-xl shadow-slate-200/50 scale-105" : "text-slate-500 hover:text-slate-900"
             )}
           >
             <LayoutDashboard size={14} className="inline mr-2 mb-0.5" /> Store Overview
           </button>
           <button 
             onClick={() => setActiveView('raw-material')}
             className={cn(
               "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeView === 'raw-material' ? "bg-white text-primary-600 shadow-xl shadow-slate-200/50 scale-105" : "text-slate-500 hover:text-slate-900"
             )}
           >
             <Package size={14} className="inline mr-2 mb-0.5" /> Raw Materials
           </button>
        </div>
      </div>

      {activeView === 'overview' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
          {/* Top Line Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-primary-200 transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl group-hover:scale-110 transition-transform">
                     <Boxes size={24} />
                  </div>
                  <TrendingUp size={16} className="text-emerald-500" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Inventory Qty</p>
               <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">{totalRawItems.toLocaleString()}</h3>
               <div className="mt-4 flex items-center text-[10px] font-bold text-slate-400">
                  <span className="text-emerald-600 font-black mr-2">+12.4%</span> vs last month
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-red-200 transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl group-hover:scale-110 transition-transform">
                     <AlertTriangle size={24} />
                  </div>
                  <AlertCircle size={16} className="text-red-500 animate-pulse" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Low Stock Alerts</p>
               <h3 className="text-4xl font-black text-red-600 italic tracking-tighter">{lowStockItems.length}</h3>
               <div className="mt-4 flex items-center text-[10px] font-bold text-red-400">
                  Critical reorder required now
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-amber-200 transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                     <ClipboardList size={24} />
                  </div>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pending Materials</p>
               <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">{pendingMaterials.length}</h3>
               <div className="mt-4 flex items-center text-[10px] font-bold text-slate-400">
                  Awaiting Quality Clearance
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-blue-200 transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                     <RotateCcw size={24} />
                  </div>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Work In Progress</p>
               <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">{wip.length}</h3>
               <div className="mt-4 flex items-center text-[10px] font-bold text-slate-400">
                  Materials in production lines
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Warehouse Wise Stock */}
            <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-10 shadow-slate-200/40">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">WAREHOUSE DISTRIBUTION</h3>
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={() => setShowAddWarehouse(prev => !prev)}
                       className="text-[10.5px] font-extrabold text-[#0c9bbc] uppercase tracking-widest hover:bg-[#d1f3f8] px-4.5 py-2.5 bg-[#ecfbfd] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                       id="add-warehouse-toggle-btn"
                     >
                        <Plus size={11} className="stroke-[#0c9bbc] stroke-[3]" /> Add Warehouse
                     </button>
                     <button 
                        type="button"
                        onClick={() => {
                          if (warehouses && warehouses.length > 0) {
                            setSelectedCapacityWarehouse(selectedCapacityWarehouse || warehouses[0]);
                          }
                          setShowCapacityMap(true);
                        }}
                        className="text-[10.5px] font-extrabold text-[#0c9bbc] uppercase tracking-widest hover:bg-[#d1f3f8] px-4.5 py-2.5 bg-[#ecfbfd] rounded-xl transition-colors cursor-pointer"
                        id="view-capacity-map-btn"
                      >
                        View Capacity Map
                      </button>
                  </div>
               </div>
               {showAddWarehouse && (
                  <form onSubmit={handleAddWarehouse} className="mb-7 p-6 rounded-[1.5rem] bg-[#ecfbfd]/90 border border-[#cbeef3]/80 animate-in slide-in-from-top-4 duration-300">
                     <p className="text-[10px] font-extrabold text-[#0c9bbc] uppercase tracking-widest mb-3 block font-mono">Register New Logistics Node</p>
                     <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text"
                          value={newWarehouseName}
                          onChange={e => setNewWarehouseName(e.target.value)}
                          placeholder="E.g., Chennai Warehouse, Northern Hub"
                          className="flex-1 bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0c9bbc]/20 font-mono"
                          required
                          disabled={addingWarehouse}
                          id="new-warehouse-name-input"
                        />
                        <button
                          type="submit"
                          disabled={addingWarehouse}
                          className="px-6 py-3 bg-[#009dbb] hover:bg-[#0487a2] text-white rounded-xl text-[10.5px] font-extrabold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1 shadow-md shadow-[#009dbb]/15 cursor-pointer"
                          id="register-node-btn"
                        >
                           {addingWarehouse ? <RefreshCcw size={12} className="animate-spin" /> : <span className="font-extrabold text-sm mr-1">+</span>}
                           Register Node
                        </button>
                     </div>
                  </form>
               )}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {warehouseStock.map((wh, idx) => {
                    const isEditing = editingWarehouseName === wh.name;
                    return (
                    <div key={wh.name} className="p-7 rounded-[2.25rem] bg-slate-50/50 border border-slate-100 flex flex-col justify-between group hover:bg-white hover:border-[#edfbfc] hover:shadow-2xl hover:shadow-slate-200/40 transition-all">
                      <div className="flex items-center justify-between mb-4">
                         <div className="p-3 bg-[#ecfbfd] text-[#009dbb] rounded-xl shadow-xs transition-colors group-hover:bg-[#009dbb] group-hover:text-white">
                            <Warehouse size={18} />
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mr-1">Node-0{idx+1}</span>
                           <button 
                             type="button"
                             onClick={() => handleEditWarehouse(wh.name)}
                             className="p-1.5 text-slate-400 hover:text-[#0c9bbc] hover:bg-[#ecfbfd] rounded-lg transition-all cursor-pointer"
                             title="Rename Warehouse"
                             id={`edit-warehouse-${idx}`}
                           >
                             <Edit size={12} />
                           </button>
                           <button 
                             type="button"
                             onClick={() => handleDeleteWarehouse(wh.name)}
                             className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                             title="Delete Warehouse"
                             id={`delete-warehouse-${idx}`}
                           >
                             <Trash2 size={12} />
                           </button>
                         </div>
                      </div>
                      {isEditing ? (
                         <div className="flex items-center gap-2 mb-3">
                            <input 
                              type="text"
                              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#0c9bbc]/20 font-sans"
                              value={editingWarehouseValue}
                              onChange={e => setEditingWarehouseValue(e.target.value)}
                            />
                            <button 
                              type="button"
                              onClick={() => handleSaveEditWarehouse(wh.name)}
                              className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-xs cursor-pointer"
                              disabled={isSavingWarehouse}
                            >
                              <Check size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setEditingWarehouseName(null)}
                              className="p-2 text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                         </div>
                      ) : (
                         <p className="text-xl font-bold text-slate-900 mb-1 text-left">{wh.name}</p>
                      )}
                      <div className="mt-4 border-t border-slate-100/65 pt-4 space-y-3">
                         <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider">
                            <span className="text-slate-400">Raw Valuation</span>
                            <span className="text-slate-800 text-xs font-bold">{formatCurrency(wh.rawValue)}</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider">
                            <span className="text-slate-400">FG Serialized</span>
                            <span className="text-slate-800 text-xs font-bold">{wh.fgCount} UNITS</span>
                         </div>
                      </div>
                    </div>
                    );
                  })}
               </div>
            </div>

            {/* Critical Low Stock Alerter */}
            <div className="traditional-mandala-card rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
               {/* Traditional Mandalas from Image 5 */}
               <div className="absolute top-0 left-0 w-24 h-24 opacity-[0.08] pointer-events-none transform -translate-x-6 -translate-y-6 select-none">
                  <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1.2">
                     <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
                     <circle cx="50" cy="50" r="38" />
                     <circle cx="50" cy="50" r="30" strokeDasharray="1 1" />
                     <circle cx="50" cy="50" r="22" />
                     <circle cx="50" cy="50" r="14" />
                     <circle cx="50" cy="50" r="6" />
                     {Array.from({ length: 16 }).map((_, i) => {
                        const angle = (i * 360) / 16;
                        return (
                           <g key={i} transform={`rotate(${angle} 50 50)`}>
                              <path d="M50 50 C48 35, 52 35, 50 50" />
                              <path d="M50 50 C46 20, 54 20, 50 50" strokeWidth="0.5" />
                              <circle cx="50" cy="18" r="1.2" fill="#7c1d3c" />
                           </g>
                        );
                     })}
                  </svg>
               </div>
               <div className="absolute right-0 bottom-0 w-28 h-28 opacity-[0.08] pointer-events-none transform translate-x-8 translate-y-8 select-none">
                  <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1.2">
                     <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
                     <circle cx="50" cy="50" r="38" />
                     <circle cx="50" cy="50" r="30" strokeDasharray="1 1" />
                     <circle cx="50" cy="50" r="22" />
                     <circle cx="50" cy="50" r="14" />
                     <circle cx="50" cy="50" r="6" />
                     {Array.from({ length: 16 }).map((_, i) => {
                        const angle = (i * 360) / 16;
                        return (
                           <g key={i} transform={`rotate(${angle} 50 50)`}>
                              <path d="M50 50 C48 35, 52 35, 50 50" />
                              <path d="M50 50 C46 20, 54 20, 50 50" strokeWidth="0.5" />
                              <circle cx="50" cy="18" r="1.2" fill="#7c1d3c" />
                           </g>
                        );
                     })}
                  </svg>
               </div>

               <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 text-[#7c1d3c]">
                  <AlertTriangle size={240} />
               </div>
               <div className="relative z-10">
                  <h3 className="text-xl font-black text-[#7c1d3c] uppercase italic tracking-widest flex items-center mb-8">
                     <AlertCircle size={20} className="mr-3 text-[#7c1d3c]" /> Red-Zone Stock
                  </h3>
                  <div className="space-y-6">
                     {lowStockItems.slice(0, 4).map(item => (
                       <div key={item.id} className="flex items-center justify-between p-4 bg-white/90 rounded-2xl border border-[#7c1d3c]/15 hover:bg-white transition-all group animate-in slide-in-from-bottom-2 duration-300 shadow-sm">
                          <div>
                             <p className="text-xs font-black uppercase tracking-tight text-left text-[#3c0c1b]">{item.name}</p>
                             <p className="text-[9px] font-bold text-[#5a3a44] uppercase tracking-widest mt-1 text-left">
                                {item.qty} {item.unit} / <span className="text-red-700 font-black">Min {item.minStock}</span>
                             </p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedItem(item);
                              setActionWarehouse(item.warehouse || '');
                              setActionRack(item.rack || '');
                              setActionQcStatus(item.qcStatus || 'APPROVED');
                              setActionStatus(item.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
                              setQtyChangeMode('add');
                              setQtyChangeVal(0);
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:scale-110 transition-transform border border-red-200"
                          >
                             <PackagePlus size={16} />
                          </button>
                       </div>
                     ))}
                     {lowStockItems.length > 4 && (
                        <p className="text-[10px] font-black text-center text-[#7c1d3c]/70 hover:text-[#7c1d3c] uppercase tracking-widest mt-6 cursor-pointer hover:underline">
                           +{lowStockItems.length - 4} More Critical Alerts
                        </p>
                     )}
                  </div>
                  <button 
                     onClick={handleOpenBulkReorder}
                     type="button"
                     className="w-full mt-10 py-4 bg-[#7c1d3c] hover:bg-[#62142d] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#7c1d3c]/20 active:scale-95 cursor-pointer"
                  >
                     Bulk Reorder Authorization
                  </button>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
           {/* Detailed Filters Component etc */}
           <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 flex flex-wrap items-center gap-6 shadow-xl shadow-slate-200/40 mb-8">
              <div className="flex-1 min-w-[280px] relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={20} />
                 <input 
                   type="text" 
                   value={search} 
                   onChange={e => setSearch(e.target.value)}
                   placeholder="Search Material Stage / Rack / SKU..."
                   className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 pl-16 pr-6 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary-500/30 transition-all italic tracking-wide"
                 />
              </div>
              <div className="flex items-center space-x-3">
                 <button className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-400 hover:text-primary-600 transition-all">
                    <Filter size={18} />
                 </button>
                 <button 
                   type="button"
                   onClick={() => setReportModalOpen(true)}
                   className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition-all flex items-center gap-2"
                   id="btn-generate-report"
                 >
                    <FileText size={14} />
                    Generate Stock Report
                 </button>
              </div>
           </div>

           {/* Comprehensive Product Stage Table */}
           <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/40 relative">
              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-slate-100 px-6 py-4">
                 {filteredInventory.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                       No physical inventory records match query.
                    </div>
                 ) : (
                    filteredInventory.map((item: any) => {
                       const isItemActive = item.status !== 'INACTIVE';
                       return (
                          <div key={item.id} className={cn(
                             "py-4 flex flex-col space-y-4",
                             !isItemActive && "opacity-75"
                          )}>
                             <div className="flex justify-between items-start gap-4">
                                <div>
                                   <p className={cn(
                                      "text-xs font-black uppercase tracking-tight text-slate-900 text-left",
                                      !isItemActive && "line-through decoration-slate-300 text-slate-400"
                                   )}>{item.name}</p>
                                   <div className="flex items-center space-x-2 mt-1.5">
                                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] rounded font-black border border-blue-100 uppercase tracking-widest font-sans">RAW</span>
                                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black italic">{item.code}</span>
                                   </div>
                                </div>
                                <button 
                                   type="button"
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleActivation(item);
                                   }}
                                   className={cn(
                                      "px-2 py-1 rounded text-[8px] font-black uppercase transition-all select-none hover:scale-105 active:scale-95 border shrink-0",
                                      isItemActive 
                                         ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                         : "bg-slate-100 text-slate-500 border-slate-300"
                                   )}
                                >
                                   {isItemActive ? "🟢 Active" : "🔴 Inactive"}
                                </button>
                             </div>

                             <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-b border-slate-50 py-3 text-left">
                                <div>
                                   <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-sans font-bold">Warehouse Node</span>
                                   <span className="font-bold text-slate-700 flex items-center mt-1 uppercase text-[10px]">
                                      <MapPin size={12} className="mr-1 text-slate-400 shrink-0" /> {item.warehouse}
                                   </span>
                                   <span className="text-[9px] text-primary-500 font-black tracking-widest mt-1 block">RACK: {item.rack}</span>
                                </div>
                                <div>
                                   <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-sans font-bold">In Stock Metric</span>
                                   <span className={cn(
                                      "font-black text-sm italic mt-1 block",
                                      item.qty < (item.minStock || 0) ? "text-red-500" : "text-slate-900"
                                   )}>
                                      {item.qty.toLocaleString()} <span className="text-[9px] not-italic text-slate-400 font-sans ml-0.5">{item.unit}</span>
                                   </span>
                                </div>
                             </div>

                             <div className="flex justify-between items-center pt-1">
                                <span className={cn(
                                   "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest inline-flex items-center",
                                   item.qcStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                )}>
                                   {item.qcStatus === 'APPROVED' ? <ShieldCheck size={10} className="mr-1" /> : <Beaker size={10} className="mr-1" />}
                                   QC: {item.qcStatus}
                                </span>
                                
                                <button 
                                   type="button"
                                   onClick={() => {
                                      setSelectedItem(item);
                                      setActionWarehouse(item.warehouse || '');
                                      setActionRack(item.rack || '');
                                      setActionQcStatus(item.qcStatus || 'APPROVED');
                                      setActionStatus(item.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
                                      setQtyChangeMode('add');
                                      setQtyChangeVal(0);
                                   }}
                                   className="px-3.5 py-1.5 bg-slate-50 text-slate-500 hover:bg-primary-600 hover:text-white rounded-xl border border-slate-100 transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                                >
                                   <Move size={12} /> Manage
                                </button>
                             </div>
                          </div>
                       );
                    })
                 )}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                 <table className="w-full text-left font-mono">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                       <tr>
                          <th className="px-10 py-8">Material Master / Stage</th>
                          <th className="px-10 py-8">Warehouse Location</th>
                          <th className="px-10 py-8">Stock Metric</th>
                          <th className="px-10 py-8">Condition / QC</th>
                          <th className="px-10 py-8 text-right font-bold">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-900">
                       {filteredInventory.map((item: any) => {
                           const isItemActive = item.status !== 'INACTIVE';
                           return (
                             <tr key={item.id} className={cn(
                                "group hover:bg-slate-50/85 transition-all duration-300",
                                !isItemActive && "bg-slate-50/30 opacity-75"
                             )}>
                                <td className="px-10 py-8">
                                   <div className="flex items-center space-x-4">
                                      <div className={cn(
                                         "h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                                         isItemActive 
                                           ? "bg-slate-100 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600" 
                                           : "bg-slate-200/50 text-slate-400"
                                      )}>
                                         <Box size={24} />
                                      </div>
                                      <div>
                                         <div className="flex items-center space-x-2">
                                            <p className={cn(
                                              "text-[13px] font-black uppercase tracking-tight leading-none mb-0",
                                              isItemActive ? "text-slate-900" : "text-slate-400 line-through decoration-slate-300"
                                            )}>{item.name}</p>
                                            
                                            {/* Row level rapid activation toggle */}
                                            <button 
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleActivation(item);
                                              }}
                                              className={cn(
                                                "px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all select-none hover:scale-105 active:scale-95 border",
                                                isItemActive 
                                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                                  : "bg-slate-100 text-slate-500 border-slate-300"
                                              )}
                                              title="Toggle raw material active status"
                                              id={`activate-btn-${item.id}`}
                                            >
                                               {isItemActive ? "🟢 Active" : "🔴 Inactive"}
                                            </button>
                                         </div>
                                         <div className="flex items-center space-x-3 mt-2 font-black">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] rounded border border-blue-100 uppercase tracking-widest">RAW MATERIAL</span>
                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest italic">{item.code}</span>
                                         </div>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-10 py-8">
                                   <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center">
                                      <MapPin size={14} className="mr-2 text-slate-400" /> {item.warehouse}
                                   </p>
                                   <p className="text-[10px] text-primary-500 font-bold mt-1 tracking-[0.2em] bg-primary-50 w-fit px-2 py-0.5 rounded">RACK: {item.rack}</p>
                                </td>
                                <td className="px-10 py-8">
                                   <div className="space-y-1">
                                      <p className={cn(
                                        "text-lg font-black italic tracking-tighter leading-none text-left",
                                         item.qty < (item.minStock || 0) ? "text-red-500" : "text-slate-900"
                                      )}>
                                         {item.qty.toLocaleString()} <span className="text-[9px] not-italic text-slate-400 ml-1">{item.unit}</span>
                                      </p>
                                      <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
                                         <div 
                                           className={cn("h-full transition-all", item.qty < (item.minStock || 0) ? "bg-red-500" : "bg-emerald-500")}
                                           style={{ width: `${Math.min(100, (item.qty / ((item.reorderLevel || 1) * 1.5)) * 100)}%` }}
                                         ></div>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-10 py-8">
                                   <span className={cn(
                                      "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center",
                                      item.qcStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                   )}>
                                      {item.qcStatus === 'APPROVED' ? <ShieldCheck size={10} className="mr-1.5" /> : <Beaker size={10} className="mr-1.5" />}
                                      {item.qcStatus}
                                   </span>
                                </td>
                                <td className="px-10 py-8 text-right">
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       setSelectedItem(item);
                                       setActionWarehouse(item.warehouse || '');
                                       setActionRack(item.rack || '');
                                       setActionQcStatus(item.qcStatus || 'APPROVED');
                                       setActionStatus(item.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
                                       setQtyChangeMode('add');
                                       setQtyChangeVal(0);
                                     }}
                                     className="p-3 bg-slate-50 text-slate-400 hover:bg-primary-600 hover:text-white rounded-xl transition-all active:scale-90"
                                     title="Manage logistics metrics/location"
                                     id={`act-move-btn-${item.id}`}
                                   >
                                      <Move size={16} />
                                   </button>
                                </td>
                             </tr>
                           );
                         })}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Material Movement Activity */}
           <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-2xl shadow-slate-200/40">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center">
                    <Activity size={24} className="mr-4 text-primary-600" /> Material Movement Logs
                 </h3>
                 <button className="p-3 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:text-primary-600 transition-all">
                    <History size={20} />
                 </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { type: 'INCOMING', mat: 'Lead Oxide', qty: '+500 Kg', node: 'Warehouse Hub 1', color: 'text-emerald-500' },
                   { type: 'CONSUMED', mat: 'Lithium Cells', qty: '-2400 Pcs', node: 'Production Line A', color: 'text-red-500' },
                   { type: 'TRANSFER', mat: 'Smart BMS', qty: '50 Pcs', node: 'Raw Hub -> Pune', color: 'text-blue-500' }
                 ].map((log, i) => (
                   <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center space-x-4">
                      <div className={cn("p-3 rounded-xl bg-white shadow-sm flex items-center justify-center", log.color)}>
                         {log.type === 'INCOMING' ? <Truck size={20} /> : log.type === 'CONSUMED' ? <RefreshCcw size={20} /> : <Move size={20} />}
                      </div>
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{log.type}</p>
                         <p className="text-xs font-black text-slate-900 text-left">{log.mat}</p>
                         <div className="flex items-center mt-2">
                            <span className={cn("text-[10px] font-black mr-2", log.color)}>{log.qty}</span>
                            <span className="text-[9px] text-slate-400 font-bold italic truncate max-w-[80px]">{log.node}</span>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* ==================== INTERACTIVE WAREHOUSE CAPACITY MAP MODAL ==================== */}
      {showCapacityMap && (() => {
        const currentCapWh = selectedCapacityWarehouse || (warehouses && warehouses.length > 0 ? warehouses[0] : '');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto select-none" id="capacity-map-modal">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="bg-slate-950 text-white p-6 md:p-8 flex justify-between items-center relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-1/3 h-full opacity-25 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.15)_0%,transparent_70%)] pointer-events-none"></div>
                 <div className="flex items-center space-x-3.5 relative z-10 text-left">
                    <div className="p-3 bg-[#0e90ac] rounded-2xl text-white shadow-lg shadow-[#009dbb]/30">
                       <Boxes size={22} className="animate-pulse" />
                    </div>
                    <div>
                       <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 block mb-0.5">PHYSICAL LOGISTICS MAP</span>
                       <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight italic text-white">
                          WAREHOUSE INFRASTRUCTURE & CAPACITY MATRIX
                       </h3>
                       <p className="text-[10px] text-slate-400 font-medium font-sans">
                          Dynamic multi-rack cell visualization mapping, physical bay conditions, and real-time inventory levels.
                       </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setShowCapacityMap(false)}
                   className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-white relative z-10 font-bold cursor-pointer"
                   id="close-capacity-map-btn"
                 >
                   <X size={20} />
                 </button>
              </div>

              {/* Modal Body Content */}
              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto max-h-[75vh]">
                 {/* Left column: Sidebar controls & warehouse utility stats */}
                 <div className="lg:col-span-4 space-y-6">
                    {/* Select Warehouse Node */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left">
                       <label className="text-[10.5px] font-black uppercase text-[#0c9bbc] tracking-widest block mb-3.5 font-mono">SELECT WAREHOUSE DEPOT</label>
                       <div className="space-y-2">
                          {warehouses.map((wh: string, idx: number) => {
                             const isSelected = currentCapWh === wh;
                             const warehouseValue = inventory
                                .filter((i: any) => i.warehouse === wh)
                                .reduce((acc: number, item: any) => acc + (item.qty * (item.price || 0)), 0);
                             const activeCount = inventory.filter((i: any) => i.warehouse === wh && i.status !== 'INACTIVE').length;
                             return (
                                <button
                                   key={wh}
                                   type="button"
                                   onClick={() => setSelectedCapacityWarehouse(wh)}
                                   className={cn(
                                      "w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group",
                                      isSelected 
                                         ? "bg-gradient-to-r from-[#009dbb] to-[#0488a5] border-[#009dbb] text-white shadow-md shadow-[#009dbb]/15 font-bold" 
                                         : "bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-800"
                                   )}
                                   id={`warehouse-tab-${idx}`}
                                >
                                   <div className="flex items-center space-x-3 truncate">
                                      <div className={cn(
                                         "p-2 rounded-lg shrink-0",
                                         isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-[#edfbfc]"
                                      )}>
                                         <Warehouse size={14} />
                                      </div>
                                      <div className="truncate">
                                         <span className="text-xs font-black uppercase block tracking-tight">{wh}</span>
                                         <span className={cn(
                                            "text-[9px] font-bold block mt-0.5",
                                            isSelected ? "text-cyan-100" : "text-slate-400"
                                         )}>
                                            Value: {formatCurrency(warehouseValue)}
                                         </span>
                                      </div>
                                   </div>
                                   <div className={cn(
                                      "text-[9px] font-mono font-black py-0.5 px-2 rounded-full",
                                      isSelected ? "bg-white/20 text-white" : "bg-cyan-50 text-[#0c9bbc]"
                                   )}>
                                      {activeCount} Items
                                   </div>
                                </button>
                             );
                          })}
                       </div>
                    </div>

                    {/* Warehousing Utilization Gauges */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left space-y-4">
                       <div>
                          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest font-mono">Utilization Metrics</h4>
                          <p className="text-[11px] text-slate-500 font-semibold leading-normal mt-1">Based on dynamic {numRacks * numSlots}-compartment physical layout grid.</p>
                       </div>

                       {/* Calculate exact occupancies */}
                       {(() => {
                          const whItems = inventory.filter((i: any) => i.warehouse === currentCapWh);
                          // Standardize matching - let's count unique valid rack codes of form A1, B4, C3, etc.
                          const gridOccupiedItems = whItems.filter((i: any) => {
                             if (!i.rack || i.status === 'INACTIVE') return false;
                             const rClean = i.rack.trim().toUpperCase();
                             const maxLetter = String.fromCharCode(64 + numRacks);
                             const match = rClean.match(/^([A-Z])([0-9]+)$/);
                             if (!match) return false;
                             const rLetter = match[1];
                             const rNum = parseInt(match[2], 10);
                             return rLetter >= 'A' && rLetter <= maxLetter && rNum >= 1 && rNum <= numSlots;
                          });
                          const occupiedSlots = gridOccupiedItems.length;
                          const totalSlots = numRacks * numSlots;
                          const pct = Math.min(100, Math.round((occupiedSlots / totalSlots) * 100));
                          
                          return (
                             <div className="space-y-4">
                                <div className="space-y-2">
                                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                      <span className="text-slate-400">Total System Spaces</span>
                                      <span className="text-slate-900">{totalSlots} Slots</span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                      <span className="text-slate-400">Occupied Bays</span>
                                      <span className="text-slate-900 font-bold text-primary-600">{occupiedSlots} Bays</span>
                                   </div>
                                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                      <span className="text-slate-400">Available Bays</span>
                                      <span className="text-slate-900 font-semibold text-emerald-600">{totalSlots - occupiedSlots} Bays</span>
                                   </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-200">
                                   <div className="flex justify-between items-center text-[11px]">
                                      <span className="font-black uppercase tracking-wider text-slate-600">Density Ratio</span>
                                      <span className={cn(
                                         "font-black font-mono text-xs px-2 py-0.5 rounded-lg",
                                         pct > 80 ? "bg-red-100 text-red-650" : pct > 50 ? "bg-amber-100 text-amber-655" : "bg-emerald-100 text-emerald-850"
                                      )}>{pct}%</span>
                                   </div>
                                   <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden p-0.5 animate-pulse">
                                      <div 
                                         className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-primary-600"
                                         )}
                                         style={{ width: `${Math.max(4, pct)}%` }}
                                      ></div>
                                   </div>
                                </div>
                             </div>
                          );
                       })()}
                    </div>

                    {/* Real-time Environmental Thresholds */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left space-y-3">
                       <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest font-mono">
                          📊 Live Sensors & Alerts
                       </h4>
                       <div className="grid grid-cols-2 gap-3 font-mono">
                          <div className="bg-white border p-3 rounded-xl">
                             <span className="text-[8px] font-black text-slate-400 block uppercase">Temperature</span>
                             <span className="text-sm font-black mt-1 block">22.4°C</span>
                             <span className="text-[8px] font-black text-emerald-500 uppercase mt-0.5 block">Normal Limit</span>
                          </div>
                          <div className="bg-white border p-3 rounded-xl">
                             <span className="text-[8px] font-black text-slate-400 block uppercase">Dry Humidity</span>
                             <span className="text-sm font-black mt-1 block">34% <span className="text-[10px] text-slate-400 font-normal">RH</span></span>
                             <span className="text-[8px] font-black text-emerald-500 uppercase mt-0.5 block">Static Safe</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Right column: Interactive Visual Floor Grid Map & Compartment Inspector */}
                 <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
                    {/* Visual Map Layout */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 relative">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-left mb-6 flex items-center justify-between">
                          <span>Physical Storage Floor Layout (Racks A to {String.fromCharCode(64 + numRacks)})</span>
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Node Status</span>
                       </p>

                       {/* Storage Grid Calibration Controls */}
                       <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-0.5">
                             <span className="text-[8px] font-black uppercase text-primary-600 tracking-widest font-mono block">Dynamic Calibration Controls</span>
                             <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Configure Physical Layout Grid Dimensions</h4>
                             <p className="text-[9.5px] text-slate-500 font-semibold font-sans">Adjust vertical rack levels (A-Z) and horizontal compartment slot count in real-time.</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                             <div className="flex items-center space-x-1.5">
                                <span className="text-[8.5px] font-mono font-black uppercase text-slate-500">Racks:</span>
                                <select
                                   value={numRacks}
                                   onChange={async (e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setNumRacks(val);
                                      await fetch('/api/wh-layout', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify({ racks: val, slots: numSlots })
                                      });
                                      refetch();
                                   }}
                                    className="bg-white border border-slate-250 rounded-lg py-1 px-1.5 text-[10px] font-black text-slate-800 font-mono outline-none focus:ring-1 focus:ring-primary-500 shadow-sm"
                                >
                                   {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16].map(num => (
                                      <option key={num} value={num}>{num} (A-{String.fromCharCode(64 + num)})</option>
                                   ))}
                                </select>
                             </div>
                             <div className="flex items-center space-x-1.5">
                                <span className="text-[8.5px] font-mono font-black uppercase text-slate-500">Slots:</span>
                                <select
                                   value={numSlots}
                                   onChange={async (e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setNumSlots(val);
                                      await fetch('/api/wh-layout', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify({ racks: numRacks, slots: val })
                                      });
                                      refetch();
                                   }}
                                    className="bg-white border border-slate-250 rounded-lg py-1 px-1.5 text-[10px] font-black text-slate-800 font-mono outline-none focus:ring-1 focus:ring-primary-500 shadow-sm"
                                >
                                   {[4, 6, 8, 10, 12, 16, 20].map(num => (
                                      <option key={num} value={num}>{num} Slots</option>
                                   ))}
                                </select>
                             </div>
                          </div>
                       </div>

                       {/* The Dynamic Interactive Grid */}
                       {(() => {
                          const whItems = inventory.filter((i: any) => i.warehouse === currentCapWh && i.status !== 'INACTIVE');
                          
                          // Let's create an active compartment map
                          // key: e.g. "A1", value: full item object
                          const compartmentMap: Record<string, any> = {};
                          
                          whItems.forEach((item: any) => {
                             if (item.rack) {
                                const cleanR = item.rack.trim().toUpperCase();
                                compartmentMap[cleanR] = item;
                             }
                          });

                          // Visual grid: iterate over Racks (A to F) and for each render slots (1 to 8)
                          const racks = Array.from({ length: numRacks }, (_, i) => String.fromCharCode(65 + i));
                          const slots = Array.from({ length: numSlots }, (_, i) => i + 1);

                          return (
                             <div className="space-y-4">
                                <div className="overflow-x-auto pb-2 scrollbar-thin" id="grid-scroll-container">
                                   <div className="min-w-[650px] space-y-3.5">
                                      {racks.map((rackCode) => (
                                         <div key={rackCode} className="flex items-center space-x-3">
                                            {/* Rack Row Name Label */}
                                            <div className="w-14 h-12 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center font-mono select-none shrink-0 border border-slate-850 shadow-sm">
                                               <span className="text-[9px] leading-tight text-slate-400 font-normal uppercase">RACK</span>
                                               <span className="text-base font-black leading-none">{rackCode}</span>
                                            </div>

                                            {/* Racks list 1 to 8 slots */}
                                            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${numSlots}, minmax(0, 1fr))` }}>
                                               {slots.map((slotNum) => {
                                                  const slotCode = `${rackCode}${slotNum}`;
                                                  const hasItem = compartmentMap[slotCode];
                                                  const isSelected = (window as any)._activeCompartment === slotCode;
                                                  
                                                  // Handle color codes according to QC status or custom style
                                                  let slotStyles = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300";
                                                  let qcText = "";
                                                  if (hasItem) {
                                                     const qc = hasItem.qcStatus || 'APPROVED';
                                                     if (qc === 'APPROVED') {
                                                        slotStyles = "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70";
                                                        qcText = "🟢";
                                                     } else if (qc === 'REJECTED') {
                                                        slotStyles = "bg-red-50 border-red-300 text-red-800 hover:bg-red-100/70";
                                                        qcText = "🔴";
                                                     } else {
                                                        slotStyles = "bg-amber-50 border-amber-300 text-amber-805 hover:bg-amber-100/75";
                                                        qcText = "🟡";
                                                     }
                                                  }

                                                  return (
                                                     <button
                                                        key={slotCode}
                                                        type="button"
                                                        onClick={() => {
                                                           (window as any)._activeCompartment = slotCode;
                                                           setSelectedItem(hasItem || { _emptySlotCode: slotCode, _emptyWarehouse: currentCapWh });
                                                        }}
                                                        className={cn(
                                                           "h-12 rounded-xl border flex flex-col items-center justify-center text-[10px] font-black transition-all font-mono hover:scale-105 active:scale-95 shadow-3xs relative group",
                                                           slotStyles,
                                                           isSelected ? "ring-2 ring-primary-600 scale-105 shadow-md bg-sky-50 border-sky-350" : ""
                                                        )}
                                                        id={`slot-box-${slotCode}`}
                                                     >
                                                        <span className="text-[11px] uppercase tracking-tight">{slotCode}</span>
                                                        {hasItem ? (
                                                           <span className="text-[7.5px] font-bold tracking-tighter truncate max-w-[65px] mt-0.5 font-sans leading-none block">
                                                              {hasItem.name}
                                                           </span>
                                                        ) : (
                                                           <span className="text-[8.5px] font-extrabold text-slate-400 tracking-wider mt-0.5 leading-none block uppercase">
                                                              EMPTY
                                                           </span>
                                                        )}

                                                        {/* Beautiful tooltips */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 bg-slate-905 text-white text-[9.5px] rounded-lg p-2.5 w-44 shadow-xl border border-slate-700 pointer-events-none select-none text-left">
                                                           <div className="font-black flex justify-between">
                                                              <span>Compartment: {slotCode}</span>
                                                              <span>{qcText}</span>
                                                           </div>
                                                           {hasItem ? (
                                                              <div className="mt-1 space-y-0.5 font-medium">
                                                                 <p className="text-white truncate font-black">{hasItem.name}</p>
                                                                 <p className="text-slate-400">SKU: {hasItem.code}</p>
                                                                 <p className="text-white font-black text-indigo-200">Qty: {hasItem.qty.toLocaleString()} {hasItem.unit}</p>
                                                                 <p className="text-emerald-400 font-bold">Val: {formatCurrency(hasItem.qty * (hasItem.price || 0))}</p>
                                                              </div>
                                                           ) : (
                                                              <p className="mt-1 text-slate-400 font-semibold">Ready for bin storage assignment.</p>
                                                           )}
                                                        </div>
                                                     </button>
                                                  );
                                               })}
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                </div>

                                {/* Custom Grid Scroll Pointer & Track Controls */}
                                 <div className="flex items-center justify-between mt-3 px-1 text-slate-400">
                                    <button 
                                       type="button" 
                                       className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-600 font-bold text-xs select-none cursor-pointer" 
                                       onClick={() => {
                                          const el = document.getElementById('grid-scroll-container');
                                          if (el) el.scrollBy({ left: -160, behavior: 'smooth' });
                                       }}
                                    >
                                       ◀
                                    </button>
                                    <div className="flex-1 mx-4 bg-slate-100 rounded-full h-1.5 relative overflow-hidden">
                                       <div className="absolute left-[30%] w-[40%] bg-[#0e90ac]/40 hover:bg-[#0e90ac]/60 h-full rounded-full transition-all"></div>
                                    </div>
                                    <button 
                                       type="button" 
                                       className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg text-slate-600 font-bold text-xs select-none cursor-pointer" 
                                       onClick={() => {
                                          const el = document.getElementById('grid-scroll-container');
                                          if (el) el.scrollBy({ left: 160, behavior: 'smooth' });
                                       }}
                                    >
                                       ▶
                                    </button>
                                 </div>

                                 {/* Handle miscellaneous/custom rack formats */}
                                {(() => {
                                   const nonGridItems = whItems.filter((i: any) => {
                                      if (!i.rack) return true;
                                      const rClean = i.rack.trim().toUpperCase();
                                      const maxLetter = String.fromCharCode(64 + numRacks);
                                      const match = rClean.match(/^([A-Z])([0-9]+)$/);
                                      if (!match) return true;
                                      const rLetter = match[1];
                                      const rNum = parseInt(match[2], 10);
                                      const isWithinGrid = rLetter >= 'A' && rLetter <= maxLetter && rNum >= 1 && rNum <= numSlots;
                                      return !isWithinGrid;
                                   });
                                   if (nonGridItems.length === 0) return null;
                                   return (
                                      <div className="pt-4 border-t border-slate-200 text-left">
                                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono block mb-2">Custom Rack Allocations (&gt; 1 slot or custom tag names)</span>
                                         <div className="flex flex-wrap gap-2">
                                            {nonGridItems.map((item: any) => (
                                               <button
                                                  key={item.id}
                                                  type="button"
                                                  onClick={() => setSelectedItem(item)}
                                                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-mono leading-none font-bold text-slate-705 flex items-center gap-1.5 transition-all hover:scale-105"
                                               >
                                                  <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-black text-[9px] uppercase">{item.rack || "NO RACK"}</span>
                                                  <span className="truncate max-w-[120px]">{item.name}</span>
                                                  <span className="text-primary-650 font-black">({item.qty.toLocaleString()})</span>
                                               </button>
                                            ))}
                                         </div>
                                      </div>
                                   );
                                })()}
                             </div>
                          );
                       })()}
                    </div>

                    {/* Inspector / Detail box of selected grid compartment */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl text-left" id="compartment-detail-pane">
                       {selectedItem ? (
                          <div className="space-y-4">
                             {selectedItem._emptySlotCode && !isInlineEditing ? (
                                // Showing empty compartment layout
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                   <div>
                                      <div className="inline-flex items-center gap-1.5 text-[9px] font-mono font-black bg-emerald-50 text-emerald-800 border border-emerald-250 px-2.5 py-1 rounded-full uppercase">
                                         <Check size={10} /> Compartment Empty & Sanitized
                                      </div>
                                      <h4 className="text-base font-black text-slate-900 mt-1 uppercase font-mono">
                                         COMPARTMENT UNIT: {selectedItem._emptySlotCode}
                                      </h4>
                                      <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-lg mt-1">
                                         This shelving location inside <span className="text-slate-800 font-extrabold">{selectedItem._emptyWarehouse}</span> is currently sanitized, structurally certified, and available for bin storage allocation.
                                      </p>
                                   </div>
                                   <div className="flex gap-2">
                                      <button
                                         type="button"
                                         onClick={() => {
                                            setInlineForm({
                                               id: '',
                                               name: 'New Material',
                                               code: `CD-${Math.floor(100 + Math.random() * 900)}`,
                                               category: 'RAW_MATERIAL',
                                               qty: 100,
                                               unit: 'Kg',
                                               price: 15,
                                               warehouse: selectedItem._emptyWarehouse,
                                               rack: selectedItem._emptySlotCode,
                                               minStock: 100,
                                               reorderLevel: 250,
                                               qcStatus: 'APPROVED',
                                               status: 'ACTIVE'
                                            });
                                            setIsInlineEditing(true);
                                         }}
                                         className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors"
                                      >
                                         Create Item Here
                                      </button>
                                      <button
                                         type="button"
                                         onClick={() => {
                                            setSelectedItem(null);
                                            setShowCapacityMap(false);
                                            setActiveView('raw-material');
                                         }}
                                         className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors"
                                      >
                                         Assign Existing Material
                                      </button>
                                   </div>
                                </div>
                             ) : isInlineEditing ? (
                                // Inline Editing Form for Capacity Map Items
                                <form onSubmit={handleSaveInlineEdit} className="space-y-4 animate-in fade-in duration-300">
                                   <div className="flex items-center justify-between border-b pb-2">
                                      <h4 className="text-xs font-black uppercase text-primary-600 font-mono tracking-wider">
                                         {inlineForm.id ? 'Edit Compartment Item Details' : 'Register New Material in Slot'}
                                      </h4>
                                      <span className="text-[10px] font-mono font-bold text-slate-400">ID: {inlineForm.id || 'NEW_SLOT_ITEM'}</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* Name */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Material Name</label>
                                         <input 
                                            type="text"
                                            value={inlineForm.name}
                                            onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary-500 font-sans"
                                            required
                                         />
                                      </div>
                                      {/* Code */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">SKU Catalog Key</label>
                                         <input 
                                            type="text"
                                            value={inlineForm.code}
                                            onChange={e => setInlineForm(p => ({ ...p, code: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary-500"
                                            required
                                         />
                                      </div>
                                      {/* Stock Qty */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Physical Quantity</label>
                                         <div className="flex gap-1">
                                            <input 
                                               type="number"
                                               value={inlineForm.qty}
                                               onChange={e => setInlineForm(p => ({ ...p, qty: Number(e.target.value) }))}
                                               className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary-500"
                                               required
                                            />
                                            <input 
                                               type="text"
                                               value={inlineForm.unit}
                                               onChange={e => setInlineForm(p => ({ ...p, unit: e.target.value }))}
                                               placeholder="unit"
                                               className="w-14 bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-mono font-bold text-slate-850 outline-none text-center"
                                            />
                                         </div>
                                      </div>
                                   </div>

                                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                      {/* Price */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Price per Unit (₹)</label>
                                         <input 
                                            type="number"
                                            value={inlineForm.price}
                                            onChange={e => setInlineForm(p => ({ ...p, price: Number(e.target.value) }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-slate-805 outline-none focus:ring-1 focus:ring-primary-500"
                                            required
                                         />
                                      </div>
                                      {/* Warehouse */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Warehouse Node</label>
                                         <select
                                            value={inlineForm.warehouse}
                                            onChange={e => setInlineForm(p => ({ ...p, warehouse: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-mono font-bold text-slate-800 outline-none"
                                         >
                                            {warehouses.map((wh: string) => (
                                               <option key={wh} value={wh}>{wh}</option>
                                            ))}
                                         </select>
                                      </div>
                                      {/* Rack */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Rack Index</label>
                                         <input 
                                            type="text"
                                            value={inlineForm.rack}
                                            onChange={e => setInlineForm(p => ({ ...p, rack: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary-500"
                                            required
                                         />
                                      </div>
                                      {/* QC Status */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block font-black">QC Status</label>
                                         <select
                                            value={inlineForm.qcStatus}
                                            onChange={e => setInlineForm(p => ({ ...p, qcStatus: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-mono font-bold text-slate-800 outline-none"
                                         >
                                            {['APPROVED', 'HOLD', 'PENDING', 'REJECTED'].map(qc => (
                                               <option key={qc} value={qc}>{qc}</option>
                                            ))}
                                         </select>
                                      </div>
                                      {/* Minimum Stock (ROL) */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block font-black">MINIMUM STOCK (ROL)</label>
                                         <input
                                            type="number"
                                            value={inlineForm.minStock}
                                            onChange={e => setInlineForm(p => ({ ...p, minStock: Number(e.target.value) }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="100"
                                            required
                                         />
                                      </div>
                                      {/* Reorder Level */}
                                      <div className="space-y-1">
                                         <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider block font-black">REORDER LEVEL</label>
                                         <input
                                            type="number"
                                            value={inlineForm.reorderLevel}
                                            onChange={e => setInlineForm(p => ({ ...p, reorderLevel: Number(e.target.value) }))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary-500"
                                            placeholder="250"
                                            required
                                         />
                                      </div>
                                   </div>

                                   <div className="pt-2 flex justify-end gap-2.5 font-mono">
                                      <button
                                         type="button"
                                         onClick={() => setIsInlineEditing(false)}
                                         className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                      >
                                         Cancel
                                      </button>
                                      <button
                                         type="submit"
                                         disabled={savingInline}
                                         className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1.5"
                                      >
                                         {savingInline ? <RefreshCcw className="animate-spin" size={11} /> : <Check size={11} />}
                                         Save Changes
                                      </button>
                                   </div>
                                </form>
                             ) : (
                                // Showing selected item layout with edit and delete controls
                                <div className="space-y-4">
                                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
                                      <div>
                                         <div className="inline-flex items-center gap-1 text-[9px] font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                                            Compartment Code: {selectedItem.rack || "Custom"}
                                         </div>
                                         <h4 className="text-lg font-black text-slate-900 mt-1 uppercase italic tracking-tight">
                                            {selectedItem.name}
                                         </h4>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <span className={cn(
                                            "px-2.5 py-1 text-[10px] font-mono font-black uppercase border rounded-lg mr-2",
                                            selectedItem.qcStatus === 'APPROVED' ? "bg-emerald-50 border-emerald-200 text-emerald-750" :
                                            selectedItem.qcStatus === 'REJECTED' ? "bg-red-50 border-red-200 text-red-750" :
                                            "bg-amber-50 border-amber-250 text-amber-750"
                                         )}>
                                            QC Clear Status: {selectedItem.qcStatus || 'APPROVED'}
                                         </span>
                                         
                                         {/* Edit Button */}
                                         <button
                                            type="button"
                                            onClick={() => {
                                               setInlineForm({
                                                  id: selectedItem.id,
                                                  name: selectedItem.name,
                                                  code: selectedItem.code,
                                                  category: selectedItem.category || 'RAW_MATERIAL',
                                                  qty: selectedItem.qty,
                                                  unit: selectedItem.unit || 'Kg',
                                                  price: selectedItem.price || 0,
                                                  warehouse: selectedItem.warehouse || '',
                                                  rack: selectedItem.rack || '',
                                                  minStock: selectedItem.minStock ?? 100,
                                                  reorderLevel: selectedItem.reorderLevel ?? 250,
                                                  qcStatus: selectedItem.qcStatus || 'APPROVED',
                                                  status: selectedItem.status || 'ACTIVE'
                                               });
                                               setIsInlineEditing(true);
                                            }}
                                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 border border-indigo-150"
                                            title="Edit Slot Item Details"
                                         >
                                            Edit Details
                                         </button>

                                         {/* Delete Slot Button */}
                                         <button
                                            type="button"
                                            onClick={() => handleDeleteItem(selectedItem.id)}
                                            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 border border-red-150"
                                            title="Purge Item from Database"
                                         >
                                            Delete/Clear Slot
                                         </button>
                                         
                                         {/* Manage Button */}
                                         <button
                                            type="button"
                                            onClick={() => {
                                               // Let's hook with the active state
                                               setActionWarehouse(selectedItem.warehouse || '');
                                               setActionRack(selectedItem.rack || '');
                                               setActionQcStatus(selectedItem.qcStatus || 'APPROVED');
                                               setActionStatus(selectedItem.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
                                               setQtyChangeMode('set');
                                               setQtyChangeVal(selectedItem.qty);
                                               // Open Drawer and close modal
                                               setSelectedItem(selectedItem);
                                               setShowCapacityMap(false);
                                            }}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
                                         >
                                            Stock Adjustments
                                         </button>
                                      </div>
                                   </div>

                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-[11px] leading-relaxed">
                                      <div className="bg-white border p-3.5 rounded-xl">
                                         <span className="text-[8px] text-slate-400 block uppercase font-black">SKU Catalog Key</span>
                                         <span className="font-black text-slate-900 mt-1 block">{selectedItem.code}</span>
                                      </div>
                                      <div className="bg-white border p-3.5 rounded-xl">
                                         <span className="text-[8px] text-slate-400 block uppercase font-black">Physical quantity</span>
                                         <span className="font-black text-slate-900 mt-1 block text-primary-650 text-xs">
                                            {selectedItem.qty.toLocaleString()} {selectedItem.unit}
                                         </span>
                                      </div>
                                      <div className="bg-white border p-3.5 rounded-xl">
                                         <span className="text-[8px] text-slate-400 block uppercase font-black">Book Valuation</span>
                                         <span className="font-black text-slate-900 mt-1 block text-emerald-650 text-xs text-left">
                                            {formatCurrency(selectedItem.qty * (selectedItem.price || 0))}
                                         </span>
                                      </div>
                                   </div>
                                </div>
                             )}
                          </div>
                       ) : (
                          <div className="text-center py-6 text-slate-400 font-mono text-xs font-bold uppercase select-none">
                             💡 Select any compartment slot in the layout grid above to inspect storage logs.
                          </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Modal Footer Banner */}
              <div className="bg-slate-50 p-6 md:px-8 border-t border-slate-200 text-left flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
                 <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block text-left">
                    AUTHORIZED SYSTEM SESSION: {user?.name || "Baldev Singh"} ({user?.role || "STORE_KEEPER"})
                 </span>
                 <div className="flex gap-3">
                    <button
                       type="button"
                       onClick={() => setShowCapacityMap(false)}
                       className="px-5 py-2.5 text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl transition-all"
                    >
                       Close Matrix
                    </button>
                 </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== STOCK AUDIT REPORT MODAL ==================== */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto" id="report-modal">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
            {/* Header */}
            <div className="bg-slate-900 text-white p-8 flex justify-between items-center select-none no-print">
              <div className="flex items-center space-x-3">
                 <div className="p-2 bg-primary-600 rounded-xl text-white">
                    <FileText size={20} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black uppercase tracking-wider italic">Corporate Stock Valuation & Audit Report</h3>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Arcenol Energy Solutions - Live Warehouse Logistics</p>
                 </div>
              </div>
              <button 
                onClick={() => setReportModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-white"
                id="close-report-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Document Content */}
            <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] font-mono text-slate-800 print-section" id="printable-stock-report">
               {/* Corporate Letterhead Header */}
               <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-start">
                  <div className="text-left">
                     <h2 className="text-xl font-black text-slate-900 tracking-tighter">ARCENOL ENERGY SOLUTIONS PVT LTD</h2>
                     <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Block G, GIDC Electron City, Gandhinagar, Gujarat</p>
                     <p className="text-[9px] text-slate-400 font-bold">CIN: U31900GJ2018PTC102145 | GSTIN: 24AAHCA9192M1ZP</p>
                  </div>
                  <div className="text-right">
                     <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black uppercase tracking-[0.1em]">LIVE LOGISTICS SHIELD</span>
                     <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Generated On</p>
                     <p className="text-[11px] font-black text-slate-900">{new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</p>
                  </div>
               </div>

               {/* Key Audit KPI summary blocks */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">TOTAL SKUS</span>
                     <span className="text-lg font-black text-slate-900">{filteredInventory.length} Items Listed</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">TOTAL VALUATION</span>
                     <span className="text-lg font-black text-primary-600">
                        {formatCurrency(filteredInventory.reduce((acc: number, item: any) => acc + (item.qty * (item.price || 0)), 0))}
                     </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">RED STOCKS (DEFICIT)</span>
                     <span className="text-lg font-black text-red-500">
                        {filteredInventory.filter((item: any) => item.qty < (item.minStock || 0)).length} SKUs
                     </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ASSIGNED HUBS</span>
                     <span className="text-lg font-black text-slate-700">
                        {Array.from(new Set(filteredInventory.map((item: any) => item.warehouse))).length} Nodes Active
                     </span>
                  </div>
               </div>

               {/* Materials audit index */}
               <div className="space-y-3 text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DETAILED LOGISTICS LEDGER INDEX</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                     <table className="w-full text-left font-mono text-[10px]">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                           <tr>
                              <th className="p-3">CODE</th>
                              <th className="p-3">MATERIAL NAME</th>
                              <th className="p-3">WAREHOUSE / RACK</th>
                              <th className="p-3 text-right">STOCK LEVEL</th>
                              <th className="p-3 text-right">UNIT PRICE</th>
                              <th className="p-3 text-right">VALUATION</th>
                              <th className="p-3">QC STATUS</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                           {filteredInventory.map((item: any) => {
                             const valuation = item.qty * (item.price || 0);
                             const isLow = item.qty < (item.minStock || 0);
                             const isItemActive = item.status !== 'INACTIVE';
                             return (
                               <tr key={item.id} className={cn("hover:bg-slate-50/50", !isItemActive && "opacity-60 bg-slate-100/40")}>
                                  <td className="p-3 font-bold text-slate-500">{item.code}</td>
                                  <td className="p-3 font-black text-slate-800">
                                     {item.name} {!isItemActive && <span className="text-[8px] text-red-500 font-bold px-1 rounded bg-red-50 border border-red-100">LOCKED</span>}
                                  </td>
                                  <td className="p-3 text-slate-600">{item.warehouse} ({item.rack})</td>
                                  <td className={cn("p-3 text-right font-bold", isLow ? "text-red-600" : "text-slate-800")}>
                                     {item.qty.toLocaleString()} {item.unit}
                                  </td>
                                  <td className="p-3 text-right text-slate-500">{formatCurrency(item.price || 0)}</td>
                                  <td className="p-3 text-right font-black text-slate-900">{formatCurrency(valuation)}</td>
                                  <td className="p-3">
                                     <span className={cn(
                                       "px-1.5 py-0.5 rounded text-[8px] font-bold block w-fit text-center",
                                       item.qcStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                     )}>
                                        {item.qcStatus}
                                     </span>
                                  </td>
                               </tr>
                             )
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Certification Signoff and security warning */}
               <div className="border-t border-dashed border-slate-300 pt-8 flex flex-col sm:flex-row justify-between text-[10px] text-slate-400 gap-6">
                  <div className="text-left">
                     <p className="font-bold uppercase">SECURITY VALIDATION STATEMENT</p>
                     <p className="max-w-md mt-1 leading-relaxed">This report is built automatically by the Arcenol cloud server node. Values and transaction logs are signed with cryptographic validation. Unauthorized exports or local ledger alterations are flagged as infrastructure anomalies.</p>
                  </div>
                  <div className="text-right sm:self-end">
                     <p className="font-bold text-slate-700 uppercase">AUDITED & APPROVED BY</p>
                     <div className="h-10 mt-2 border-b border-slate-300 w-48 ml-auto"></div>
                     <p className="mt-1 font-bold text-slate-500">Warehouse Head Operations</p>
                  </div>
               </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex flex-wrap gap-2 justify-end no-print">
               <button
                 type="button"
                 onClick={() => {
                   const headings = ['Code', 'Name', 'Warehouse', 'Rack', 'Quantity', 'Unit', 'Price', 'Valuation', 'QC Status', 'Active Status'];
                   const rows = filteredInventory.map((i: any) => [
                     i.code,
                     i.name,
                     i.warehouse,
                     i.rack,
                     i.qty,
                     i.unit,
                     i.price,
                     i.qty * (i.price || 0),
                     i.qcStatus,
                     i.status !== 'INACTIVE' ? 'ACTIVE' : 'INACTIVE'
                   ]);
                   const csvContent = [headings.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
                   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                   const url = URL.createObjectURL(blob);
                   const link = document.createElement("a");
                   link.setAttribute("href", url);
                   link.setAttribute("download", `arcenol_raw_materials_audit_${new Date().toISOString().substring(0,10)}.csv`);
                   document.body.appendChild(link);
                   link.click();
                   document.body.removeChild(link);
                 }}
                 className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 transition-colors"
                 id="export-csv-btn"
               >
                  <Download size={13} />
                  Export as CSV Spreadsheet
               </button>
               <button
                 type="button"
                 onClick={() => {
                    window.print();
                 }}
                 className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                 id="print-report-btn"
               >
                  <PrinterIcon size={13} />
                  Print Corporate Report
               </button>
            </div>
          </div>
        </div>
      )}

       {/* ==================== INDIVIDUAL RAW MATERIAL MANAGEMENT DRAWER ==================== */}
      {selectedItem && !selectedItem._emptySlotCode && !showCapacityMap && (
        <div className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col h-full w-full select-none overflow-y-auto" id="actions-drawer">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-16 flex flex-col justify-between min-h-screen">
             
             {/* Main Card Console Container */}
             <div className="bg-white w-full shadow-2xl border border-slate-200/90 rounded-[2.5rem] p-6 sm:p-10 md:p-14 animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-8 md:gap-10 text-left">
                
                {/* Header Row */}
                <div className="flex justify-between items-start pb-6 border-b-2 border-slate-950/10">
                   <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-[#0c9bbc] tracking-widest block mb-2 leading-none">MATERIAL MANAGEMENT NETWORK</span>
                      <h1 className="text-3xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter italic leading-none">{selectedItem.name}</h1>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setSelectedItem(null)}
                     className="p-3 text-slate-400 bg-white border border-slate-200 hover:text-slate-955 hover:border-slate-350 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 shrink-0"
                     id="close-drawer-btn"
                     title="Close Console"
                   >
                     <X size={20} />
                   </button>
                </div>

                {/* Subtitle Properties Grid / Banner Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 sm:p-8 bg-slate-50/50 border border-slate-200 rounded-[1.75rem]">
                   <div className="text-left space-y-1">
                      <span className="text-slate-400 font-extrabold font-mono block text-[9.5px] uppercase tracking-wider leading-none">SKU CODE</span>
                      <span className="font-black text-slate-950 text-base sm:text-lg font-mono">{selectedItem.code}</span>
                   </div>
                   <div className="text-left sm:border-l border-slate-200 sm:pl-8 space-y-1">
                      <span className="text-slate-400 font-extrabold font-mono block text-[9.5px] uppercase tracking-wider leading-none">RACK LOCATION</span>
                      <span className="font-black text-slate-950 text-base sm:text-lg font-mono">{selectedItem.rack}</span>
                   </div>
                   <div className="text-left sm:border-l border-slate-200 sm:pl-8 space-y-1">
                      <span className="text-slate-400 font-extrabold font-mono block text-[9.5px] uppercase tracking-wider leading-none">CURRENT STOCK</span>
                      <span className="font-black text-slate-950 text-lg sm:text-xl font-mono text-[#009cbc]">
                        {selectedItem.qty.toLocaleString()} <span className="text-xs font-black text-slate-400">{selectedItem.unit}</span>
                      </span>
                   </div>
                </div>

                {/* Main Interactive Form with Multi-Column Desktop Precision */}
                <form onSubmit={handleUpdateMaterial} className="space-y-8 text-left">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                      
                      {/* LEFT COLUMN: States & Classification */}
                      <div className="space-y-8">
                         {/* Activation Status */}
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block font-mono leading-none">RAW MATERIAL ACTIVATION STATE</label>
                            <div className="flex items-center justify-between p-5 border border-slate-200 rounded-[1.5rem] bg-[#fdfefe] hover:border-[#0c9bbc]/30 transition-all shadow-xs">
                               <div className="flex items-center space-x-4">
                                  <div className={cn(
                                     "w-12 h-12 border-2 flex items-center justify-center rounded-2xl shrink-0 transition-colors",
                                     actionStatus === 'ACTIVE' 
                                       ? "bg-[#e8f7f4] border-[#d2efe9] text-[#12aa89]" 
                                       : "bg-rose-50 border-rose-150 text-rose-650"
                                  )}>
                                     {actionStatus === 'ACTIVE' ? <Unlock size={20} /> : <Lock size={20} />}
                                  </div>
                                  <div className="text-left">
                                     <div className="flex items-center gap-2">
                                       <span className={cn(
                                         "w-2.5 h-2.5 rounded-full shrink-0 animate-pulse",
                                         actionStatus === 'ACTIVE' ? "bg-[#12aa89]" : "bg-rose-500"
                                       )}></span>
                                       <span className="text-xs font-black uppercase block text-slate-900 font-mono tracking-tight leading-none">
                                          {actionStatus === 'ACTIVE' ? "ACTIVE & UNLOCKED" : "LOCKED / DEACTIVATED"}
                                        </span>
                                     </div>
                                     <span className="text-[10px] font-semibold text-slate-400 block mt-1.5 leading-normal max-w-[280px]">
                                        {actionStatus === 'ACTIVE' 
                                          ? "Included in automatic allocation pipelines and production runs." 
                                          : "Deactivated. Hidden from available materials for active production jobs."}
                                     </span>
                                  </div>
                               </div>
                               <button
                                 type="button"
                                 onClick={() => setActionStatus(prev => prev === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                                 className={cn(
                                   "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0c9bbc]/20",
                                   actionStatus === 'ACTIVE' ? "bg-[#0c9bbc]" : "bg-slate-200"
                                 )}
                                 id="toggle-activation-switch"
                               >
                                  <span
                                    className={cn(
                                      "pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out mt-[2px]",
                                      actionStatus === 'ACTIVE' ? "translate-x-5" : "translate-x-0.5"
                                    )}
                                  />
                               </button>
                            </div>
                         </div>

                         {/* Condition QC Code */}
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block font-mono leading-none">CONDITION & QC STATE</label>
                            <div className="grid grid-cols-2 gap-3">
                               {['APPROVED', 'HOLD', 'PENDING', 'REJECTED'].map(qc => (
                                 <button
                                   key={qc}
                                   type="button"
                                   onClick={() => setActionQcStatus(qc)}
                                   className={cn(
                                     "py-4 px-4 rounded-2xl border text-[10.5px] font-black uppercase tracking-wider text-center transition-all active:scale-[0.97] cursor-pointer shadow-xs",
                                     actionQcStatus === qc
                                       ? qc === 'APPROVED' ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold shadow-sm" :
                                         qc === 'REJECTED' ? "bg-rose-50 border-rose-500 text-rose-700 font-extrabold shadow-sm" :
                                         qc === 'HOLD' ? "bg-amber-50 border-amber-500 text-amber-700 font-extrabold shadow-sm" :
                                         "bg-sky-50 border-sky-500 text-sky-700 font-extrabold shadow-sm"
                                       : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                   )}
                                   id={`qc-btn-${qc}`}
                                 >
                                    {qc}
                                 </button>
                               ))}
                            </div>
                         </div>
                      </div>

                      {/* RIGHT COLUMN: Warehouse, Coordinates, and Qty Adjust */}
                      <div className="space-y-8">
                         {/* Relocation Details */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block font-mono leading-none">WAREHOUSE LOCATION</label>
                               <div className="relative">
                                  <select
                                    value={actionWarehouse}
                                    onChange={e => setActionWarehouse(e.target.value)}
                                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl py-3.5 px-4 pr-10 text-xs font-black text-slate-900 uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#0c9bbc]/20 transition-all shadow-xs"
                                    id="select-warehouse"
                                  >
                                    {warehouses.map((wh: string) => (
                                      <option key={wh} value={wh}>{wh}</option>
                                    ))}
                                  </select>
                                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold text-[10px]">
                                    ▼
                                  </div>
                               </div>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider block font-mono leading-none">RACK INDEX</label>
                               <input
                                 type="text"
                                 value={actionRack}
                                 onChange={e => setActionRack(e.target.value)}
                                 className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-900 uppercase outline-none focus:ring-2 focus:ring-[#0c9bbc]/20 transition-all shadow-xs"
                                 placeholder="E.g., L3"
                                 required
                                 id="input-rack"
                               />
                            </div>
                         </div>

                         {/* Stock Adjustment Controls */}
                         <div className="p-5 bg-[#f4fbfd] border border-[#d1f7fc]/50 rounded-[2rem] space-y-4 shadow-xs">
                            <div className="flex justify-between items-center gap-2">
                              <label className="text-[10px] font-black text-[#009cbc] uppercase tracking-wider block font-mono leading-none">INVENTORY ADJUSTMENTS</label>
                              <div className="flex bg-slate-250/50 rounded-xl p-0.5 border border-slate-200 text-[10px] font-bold uppercase select-none">
                                <button
                                  type="button"
                                  onClick={() => { setQtyChangeMode('add'); setQtyChangeVal(0); }}
                                  className={cn(
                                    "px-3.5 py-1.5 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer", 
                                    qtyChangeMode === 'add' 
                                      ? "bg-[#0c9bbc] text-white shadow-sm" 
                                      : "text-slate-500 hover:text-slate-800"
                                  )}
                                  id="mode-add-btn"
                                >
                                  Offset (+/-)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setQtyChangeMode('set'); setQtyChangeVal(selectedItem.qty); }}
                                  className={cn(
                                    "px-3.5 py-1.5 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer", 
                                    qtyChangeMode === 'set' 
                                      ? "bg-[#0c9bbc] text-white shadow-sm" 
                                      : "text-slate-500 hover:text-slate-800"
                                  )}
                                  id="mode-set-btn"
                                >
                                  Override
                                </button>
                              </div>
                            </div>

                            <div className="relative flex items-center">
                               <input 
                                 type="number"
                                 value={qtyChangeVal}
                                 onChange={e => setQtyChangeVal(Number(e.target.value))}
                                 className="w-full bg-white border border-slate-250 rounded-2xl py-4 pl-4 pr-16 text-sm font-black text-slate-955 focus:ring-2 focus:ring-[#0c9bbc]/20 outline-none transition-all shadow-xs font-mono"
                                 placeholder={qtyChangeMode === 'add' ? "Offset quantity (e.g. 500, -200)" : "Exact new quantity"}
                                 id="qty-change-input"
                               />
                               <span className="absolute right-4 text-[11px] font-black text-slate-400 uppercase select-none font-mono tracking-wider">{selectedItem.unit}</span>
                            </div>
                            
                            <p className="text-[8.5px] font-black text-[#64748b] uppercase tracking-widest leading-relaxed mt-1 italic">
                               {qtyChangeMode === 'add' 
                                 ? "POSITIVE NUMBERS INCREMENT STOCK; NEGATIVE NUMBERS SUBTRACT. SAFE AND AUDITED."
                                 : "DIRECTLY OVERRIDES CURRENT PHYSICAL COUNT INSIDE THE SELECTED RACK."}
                            </p>
                         </div>
                      </div>
                   </div>

                   {/* Absolute Bottom Submission Actions */}
                   <div className="pt-8 border-t border-slate-100 flex gap-4 mt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="flex-1 py-4 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-2xl font-black text-[10.5px] uppercase tracking-widest text-[#64748b] transition-all cursor-pointer active:scale-95 leading-none shadow-xs"
                        id="cancel-changes-btn"
                      >
                         Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingAction}
                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-550/15 active:scale-95 disabled:opacity-50 leading-none"
                        id="commit-changes-btn"
                      >
                         {submittingAction ? <RefreshCcw className="animate-spin" size={13} /> : <span className="font-extrabold text-[13px] mr-0.5">✓</span>}
                         Commit Changes
                      </button>
                   </div>
                </form>
             </div>
             
             {/* Simple Engine Metadata Footer */}
             <div className="text-[8.5px] font-mono font-black text-slate-400 text-center uppercase tracking-widest select-none mt-8">
                Arcenol Logistics Engine - Signed action
             </div>
          </div>
        </div>
      )}

      {/* ==================== BULK REORDER AUTHORIZATION MODAL ==================== */}
      {bulkReorderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto select-none" id="bulk-reorder-modal">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl flex flex-col my-8 select-text animate-in zoom-in-95 duration-300 text-left">
            
            {/* Header Banner */}
            <div className="bg-red-950 text-white p-8 flex justify-between items-center relative overflow-hidden">
               <div className="flex items-center space-x-4 relative z-10">
                  <div className="p-3 bg-red-600 rounded-2xl text-white">
                     <Truck size={24} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-wider italic font-sans leading-none flex items-center">
                        Reorder Authorization Terminal
                     </h3>
                     <p className="text-[9.5px] uppercase tracking-widest font-mono text-indigo-200 mt-2.5 font-bold leading-none">
                        BALANCES AUTOMATIC RECONCILIATION & DISPATCH PROCUREMENTS
                     </p>
                  </div>
               </div>
               <button 
                  type="button"
                  onClick={() => setBulkReorderModalOpen(false)}
                  className="text-[9.5px] font-black text-red-200 bg-red-900/50 hover:bg-red-900/80 uppercase tracking-widest px-4.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 leading-none"
               >
                  DISMISS
               </button>
            </div>

            {/* Subtext Panel */}
            <div className="p-8 border-b border-rose-100/50 bg-rose-50/20 text-left select-none">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <span className="text-[10px] font-black tracking-widest uppercase text-red-500 font-mono leading-none">RED-ZONE ANALYSIS ACTIVE</span>
                     <h4 className="text-xs font-bold text-slate-800 uppercase italic">
                        System detected <strong className="text-red-500 font-black">{bulkReorderItems.length} material lines</strong> below critical minimum thresholds.
                     </h4>
                  </div>
                  <div className="text-right font-mono">
                     <span className="text-[8.5px] text-slate-500 font-black uppercase block">Ledger Currency</span>
                     <span className="text-sm font-black text-slate-900">INR (₹)</span>
                  </div>
               </div>
            </div>

            {/* Material List Table */}
            <div className="flex-1 p-8 overflow-y-auto max-h-[380px] bg-white">
               <div className="border border-slate-150 rounded-[2rem] overflow-hidden">
                  <table className="w-full text-left font-mono">
                     <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 select-none">
                        <tr>
                           <th className="px-6 py-4.5 w-12 text-center">
                              <input 
                                 type="checkbox"
                                 checked={bulkReorderItems.length > 0 && bulkReorderItems.every(i => i.isSelected)}
                                 onChange={(e) => {
                                    const val = e.target.checked;
                                    setBulkReorderItems(prev => prev.map(item => ({ ...item, isSelected: val })));
                                 }}
                                 className="h-4 w-4 rounded accent-red-650 border-slate-300 pointer-events-auto cursor-pointer"
                              />
                           </th>
                           <th className="px-6 py-4.5">Material SKU / Category</th>
                           <th className="px-6 py-4.5 text-center">Current Count</th>
                           <th className="px-6 py-4.5 text-center">Min Threshold / Target</th>
                           <th className="px-6 py-4.5 text-right w-44">Reorder Quantity</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                        {bulkReorderItems.length === 0 ? (
                           <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-widest font-mono">
                                 No materials actively in Red-Zone or below minimum threshold limits.
                              </td>
                           </tr>
                        ) : (
                           bulkReorderItems.map((item, index) => (
                              <tr key={item.id} className={cn("hover:bg-slate-50/50 transition-colors group", !item.isSelected && "opacity-50 bg-slate-50/20")}>
                                 <td className="px-6 py-4.5 text-center">
                                    <input 
                                       type="checkbox"
                                       checked={item.isSelected}
                                       onChange={(e) => {
                                          const val = e.target.checked;
                                          setBulkReorderItems(prev => prev.map((it, idx) => idx === index ? { ...it, isSelected: val } : it));
                                       }}
                                       className="h-4 w-4 rounded accent-red-655 border-slate-300 cursor-pointer pointer-events-auto"
                                    />
                                 </td>
                                 <td className="px-6 py-4.5 text-left">
                                    <div className="font-sans font-black text-slate-900 uppercase text-[11px] leading-tight">
                                       {item.name}
                                    </div>
                                    <div className="text-[8.5px] text-slate-400 font-mono font-black mt-1 uppercase tracking-wider flex items-center">
                                       <span className="bg-slate-100 text-slate-650 border border-slate-200 text-[8px] font-bold px-1.5 py-0.5 rounded mr-1.5">
                                          {item.id}
                                       </span>
                                       {item.category}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4.5 text-center font-extrabold text-slate-900">
                                    {item.qty} <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                                 </td>
                                 <td className="px-6 py-4.5 text-center">
                                    <div className="font-bold text-slate-900">
                                       Min: <span className="text-red-500 font-extrabold">{item.minStock}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 uppercase mt-0.5 font-sans">
                                       Target: {item.reorderLevel || (item.minStock * 2)} {item.unit}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4.5 text-right flex items-center justify-end gap-1.5">
                                    <input 
                                       type="number"
                                       value={item.reorderQty}
                                       disabled={!item.isSelected}
                                       min={1}
                                       onChange={(e) => {
                                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                          setBulkReorderItems(prev => prev.map((it, idx) => idx === index ? { ...it, reorderQty: val } : it));
                                       }}
                                       className="w-24 bg-slate-50 border border-slate-250 rounded-xl px-2.5 py-1.5 text-right font-black font-mono text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-40"
                                    />
                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{item.unit}</span>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Footer containing action buttons */}
            <div className="bg-slate-50 p-8 border-t border-slate-200 select-none">
               <form onSubmit={handleSubmitBulkReorder} className="flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="text-left font-mono">
                     <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">
                        ESTIMATED RECONSTRUCTION BUDGET
                     </span>
                     <span className="text-2xl font-black text-slate-900 mt-2 block italic leading-none">
                        {formatCurrency(
                           bulkReorderItems
                              .filter(i => i.isSelected)
                              .reduce((acc, item) => acc + (Number(item.reorderQty || 0) * (item.price || 120)), 0)
                        )}
                     </span>
                  </div>
                  <div className="flex gap-4 w-full sm:w-auto">
                     <button
                        type="button"
                        onClick={() => setBulkReorderModalOpen(false)}
                        className="px-6 py-3.5 border border-slate-250 hover:bg-slate-100 rounded-2xl text-[10.5px] font-black uppercase tracking-widest text-slate-500 bg-white transition-all cursor-pointer active:scale-95 leading-none shadow-xs"
                     >
                        Cancel
                     </button>
                     <button
                        type="submit"
                        disabled={reorderingInProgress || bulkReorderItems.filter(i => i.isSelected).length === 0}
                        className="px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-red-600/25 active:scale-95 disabled:opacity-50 leading-none"
                     >
                        {reorderingInProgress ? <RefreshCcw className="animate-spin" size={13} /> : <Check size={14} />}
                        Authorize & Replenish Stock
                     </button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper components for missing print icon in lucide
const PrinterIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/>
    <rect x="6" y="14" width="12" height="8" rx="1"/>
  </svg>
);
