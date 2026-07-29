import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  PackageCheck, PackageX, Truck, RefreshCcw, AlertTriangle, 
  Search, Factory, ChevronRight, MapPin, ClipboardList,
  BarChart3, PieChart as PieChartIcon, History, Zap, CheckCircle2,
  Box, Boxes, ArrowUpRight, X, Printer, QrCode, ShieldCheck, Tag, Loader2,
  Upload, Download, FileSpreadsheet, FileText, AlertCircle, Check
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { FormattedSerial } from '../lib/serialUtils';
import { cn } from '../lib/utils';
import { downloadElementAsPDF, printElement } from '../lib/pdfGenerator';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

export const FinishedGoods: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('All');

  // Interactive console status
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<string>('');
  const [actionWarehouse, setActionWarehouse] = useState<string>('');
  const [actionRack, setActionRack] = useState<string>('');
  const [actionBatch, setActionBatch] = useState<string>('');
  
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string>('');

  // Thermal Decal Label printing simulator state
  const [printState, setPrintState] = useState<'idle' | 'spooling' | 'routing' | 'printed'>('idle');

  // Bulk Import and Sync State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'text'>('file');
  const [pastedSerials, setPastedSerials] = useState('');
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsed' | 'submitting' | 'success' | 'error'>('idle');
  const [importErrorMsg, setImportErrorMsg] = useState('');
  
  // Importer default config fields (to fill missing info in CSV or pasted text)
  const [defaultModel, setDefaultModel] = useState('72V30A');
  const [defaultWarehouse, setDefaultWarehouse] = useState('Main Warehouse');
  const [defaultBatch, setDefaultBatch] = useState('HISTORIC-01');
  const [defaultStatus, setDefaultStatus] = useState('READY');

  // Print report modal state
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [fgCurrentPage, setFgCurrentPage] = useState(1);
  const [fgItemsPerPage, setFgItemsPerPage] = useState(20);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Zap className="animate-spin text-pink-500 mr-3" />
      <span className="font-black text-xs uppercase tracking-widest text-slate-400">Syncing with Finished Goods Vector...</span>
    </div>
  );

  const finishedGoods = data?.finishedGoods || [];
  const history = data?.productionHistory || [];

  const warehousesList: string[] = Array.from(new Set(((data?.warehouses as any[]) || []).map((w: any) => typeof w === 'object' && w !== null ? (w.name || String(w.id || '')) : String(w)).filter(Boolean)));

  const stats = {
    ready: finishedGoods.filter((i: any) => i.status === 'READY').length,
    hold: finishedGoods.filter((i: any) => i.status === 'HOLD').length,
    damaged: finishedGoods.filter((i: any) => i.status === 'DAMAGED').length,
    returned: finishedGoods.filter((i: any) => i.status === 'RETURNED').length,
    dispatchReady: finishedGoods.filter((i: any) => i.status === 'DISPATCH_READY').length,
  };

  const warehouseStats = warehousesList.map((w: string) => ({
    name: w,
    qty: finishedGoods.filter((i: any) => i.warehouse === w).length
  }));

  const productStats = (data?.products || []).map((p: any) => ({
    name: p.name,
    qty: finishedGoods.filter((i: any) => i.model === p.id).length
  }));

  const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

  const filteredGoods = finishedGoods.filter((item: any) => {
    const matchesSearch = item.serial.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = selectedWarehouse === 'All' || item.warehouse === selectedWarehouse;
    return matchesSearch && matchesWarehouse;
  });

  const totalFgPages = Math.ceil(filteredGoods.length / fgItemsPerPage) || 1;
  const paginatedGoods = filteredGoods.slice(
    (fgCurrentPage - 1) * fgItemsPerPage,
    fgCurrentPage * fgItemsPerPage
  );

  const handleOpenItem = (item: any) => {
    setSelectedItem(item);
    setActionStatus(item.status);
    setActionWarehouse(item.warehouse);
    setActionRack(item.rack || '');
    setActionBatch(item.batch || '');
    setPrintState('idle');
  };

  const handleUpdateFinishedGood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmittingAction(true);
    try {
      const response = await fetch(`/api/finishedGoods/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionStatus,
          warehouse: actionWarehouse,
          rack: actionRack,
          batch: actionBatch
        })
      });
      if (response.ok) {
        setSuccessToast(`SUCCESSFULLY REGISTERED CHANGES FOR ${selectedItem.serial}!`);
        setTimeout(() => setSuccessToast(''), 4000);
        await refetch();
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('[Finished Goods Console Dispatch Error]:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Simulated Label printing queue
  const [printingStatusMsg, setPrintingStatusMsg] = useState('');
  const handleSimulatePrint = () => {
    setPrintState('spooling');
    setTimeout(() => {
      setPrintState('routing');
      setTimeout(() => {
        setPrintState('printed');
        // Auto reset spooled states back to idle after a duration
        setTimeout(() => setPrintState('idle'), 5000);
      }, 1500);
    }, 1200);
  };

  // Bulk Importer Handlers
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            setImportErrorMsg('Excel sheet is empty.');
            setImportStatus('error');
            return;
          }
          
          const rawHeaders = sheetData[0].map(h => String(h || '').trim());
          const headers = rawHeaders.map(h => h.toLowerCase());
          const items: any[] = [];
          
          for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) continue;
            
            let serial = '';
            let model = defaultModel;
            let warehouse = defaultWarehouse;
            let batch = defaultBatch;
            let status = defaultStatus;
            let date = new Date().toISOString().substring(0, 10);
            let rack = 'BIN-01';
            
            headers.forEach((header, index) => {
              const val = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
              if (header.includes('serial') || header.includes('id') || header.includes('no')) {
                serial = val;
              } else if (header.includes('model') || header.includes('sku') || header.includes('product') || header.includes('cluster')) {
                model = val || defaultModel;
              } else if (header.includes('warehouse') || header.includes('hub') || header.includes('location')) {
                warehouse = val || defaultWarehouse;
              } else if (header.includes('batch') || header.includes('code')) {
                batch = val || defaultBatch;
              } else if (header.includes('status')) {
                status = val || defaultStatus;
              } else if (header.includes('date')) {
                date = val || date;
              } else if (header.includes('rack')) {
                rack = val || rack;
              }
            });
            
            if (serial) {
              items.push({ serial, model, warehouse, batch, status, date, rack });
            }
          }
          
          if (items.length === 0) {
            // Fallback: treat as a simple single-column list of serials
            const fallbackItems = sheetData.map(row => String(row[0] || '').trim()).filter(serial => serial.length > 2 && serial !== sheetData[0][0]).map(serial => ({
              serial,
              model: defaultModel,
              warehouse: defaultWarehouse,
              batch: defaultBatch,
              status: defaultStatus,
              date: new Date().toISOString().substring(0, 10),
              rack: 'BIN-01'
            }));

            if (fallbackItems.length === 0) {
              setImportErrorMsg('Could not parse any valid serial numbers from Excel.');
              setImportStatus('error');
            } else {
              setParsedItems(fallbackItems);
              setImportStatus('parsed');
              setImportErrorMsg('');
            }
          } else {
            setParsedItems(items);
            setImportStatus('parsed');
            setImportErrorMsg('');
          }
        } catch (err: any) {
          setImportErrorMsg(`Failed to parse Excel file: ${err.message || err}`);
          setImportStatus('error');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSVContent(text);
      };
      reader.readAsText(file);
    }
  };

  const parseCSVContent = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 1) {
        setImportErrorMsg('File is empty.');
        setImportStatus('error');
        return;
      }
      
      const firstLine = lines[0].trim();
      if (!firstLine) {
        setImportErrorMsg('File lacks dynamic headers.');
        setImportStatus('error');
        return;
      }

      // Parse headers
      const headers = firstLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      
      const items: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split and clean quotes
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        
        let serial = '';
        let model = defaultModel;
        let warehouse = defaultWarehouse;
        let batch = defaultBatch;
        let status = defaultStatus;
        let date = new Date().toISOString().substring(0, 10);
        let rack = 'BIN-01';
        
        headers.forEach((header, index) => {
          const val = values[index] || '';
          if (header.includes('serial') || header.includes('id') || header.includes('no')) {
            serial = val;
          } else if (header.includes('model') || header.includes('sku') || header.includes('product') || header.includes('cluster')) {
            model = val || defaultModel;
          } else if (header.includes('warehouse') || header.includes('hub') || header.includes('location')) {
            warehouse = val || defaultWarehouse;
          } else if (header.includes('batch') || header.includes('code')) {
            batch = val || defaultBatch;
          } else if (header.includes('status')) {
            status = val || defaultStatus;
          } else if (header.includes('date')) {
            date = val || date;
          } else if (header.includes('rack')) {
            rack = val || rack;
          }
        });
        
        if (serial) {
          items.push({ serial, model, warehouse, batch, status, date, rack });
        }
      }
      
      if (items.length === 0) {
        // Fallback: treat as a simple single-column list of serials
        const fallbackItems = lines.map(line => line.trim()).filter(line => line.length > 2).map(serial => ({
          serial,
          model: defaultModel,
          warehouse: defaultWarehouse,
          batch: defaultBatch,
          status: defaultStatus,
          date: new Date().toISOString().substring(0, 10),
          rack: 'BIN-01'
        }));

        if (fallbackItems.length === 0) {
          setImportErrorMsg('Could not parse any valid serial numbers from CSV.');
          setImportStatus('error');
        } else {
          setParsedItems(fallbackItems);
          setImportStatus('parsed');
          setImportErrorMsg('');
        }
      } else {
        setParsedItems(items);
        setImportStatus('parsed');
        setImportErrorMsg('');
      }
    } catch (err) {
      console.error(err);
      setImportErrorMsg('Failed to parse CSV file.');
      setImportStatus('error');
    }
  };

  const handlePastedTextParse = () => {
    if (!pastedSerials.trim()) return;
    
    // Split by newlines, commas, or semicolons
    const rawTokens = pastedSerials.split(/[\n,;]/);
    const items: any[] = [];
    
    rawTokens.forEach(token => {
      const serial = token.trim().replace(/^["']|["']$/g, '');
      if (serial && serial.length > 2) {
        items.push({
          serial,
          model: defaultModel,
          warehouse: defaultWarehouse,
          batch: defaultBatch,
          status: defaultStatus,
          date: new Date().toISOString().substring(0, 10),
          rack: 'BIN-01'
        });
      }
    });
    
    if (items.length === 0) {
      setImportErrorMsg('Could not find any valid serial codes in pasted text.');
      setImportStatus('error');
    } else {
      setParsedItems(items);
      setImportStatus('parsed');
      setImportErrorMsg('');
    }
  };

  const handleCommitBulkImport = async () => {
    if (parsedItems.length === 0) return;
    setImportStatus('submitting');
    
    try {
      const response = await fetch('/api/finishedGoods/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedItems })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuccessToast(`SUCCESSFULLY IMPORTED ${result.addedCount} NEW RECORDS!`);
        setTimeout(() => setSuccessToast(''), 4000);
        await refetch();
        setImportStatus('success');
        setTimeout(() => {
          setShowImportModal(false);
          resetImporter();
        }, 1500);
      } else {
        const errorData = await response.json();
        setImportErrorMsg(errorData.error || 'Server rejected bulk import.');
        setImportStatus('error');
      }
    } catch (err) {
      console.error(err);
      setImportErrorMsg('Network error committing bulk import.');
      setImportStatus('error');
    }
  };

  const resetImporter = () => {
    setImportStatus('idle');
    setParsedItems([]);
    setPastedSerials('');
    setImportErrorMsg('');
  };

  const handleDownloadExcelTemplate = () => {
    const headings = ['Serial ID', 'Product SKU', 'Warehouse Hub', 'Production Batch', 'Entry Date', 'Status'];
    const sampleRows = [
      ['ARC-72V30A-2026-000991', '72V30A', 'Main Warehouse', 'BATCH-C1', '2026-07-15', 'READY'],
      ['ARC-72V30A-2026-000992', '72V30A', 'Ahmedabad Warehouse', 'BATCH-C1', '2026-07-15', 'READY'],
      ['ARC-AUTO-2026-114422', 'BAT-AUTO-35', 'Service Warehouse', 'BATCH-B2', '2026-07-15', 'HOLD']
    ];
    const wsData = [headings, ...sampleRows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Battery Serials");
    XLSX.writeFile(wb, "arcenol_battery_serials_template.xlsx");
  };

  const handleDownloadCSVTemplate = () => {
    const headings = ['Serial ID', 'Product SKU', 'Warehouse Hub', 'Production Batch', 'Entry Date', 'Status'];
    const sampleRows = [
      ['ARC-72V30A-2026-000991', '72V30A', 'Main Warehouse', 'BATCH-C1', '2026-07-15', 'READY'],
      ['ARC-72V30A-2026-000992', '72V30A', 'Ahmedabad Warehouse', 'BATCH-C1', '2026-07-15', 'READY'],
      ['ARC-AUTO-2026-114422', 'BAT-AUTO-35', 'Service Warehouse', 'BATCH-B2', '2026-07-15', 'HOLD']
    ];
    const csvContent = [headings.join(','), ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "arcenol_battery_serials_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find linked warranty history if sold or active
  const linkedWarranty = data?.warranty?.find((w: any) => w.serial === selectedItem?.serial);

  return (
    <div className="space-y-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111827] text-white py-4 px-6 rounded-2xl shadow-2xl border border-[#0c9bbc]/30 flex items-center gap-3 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <p className="text-[10px] font-black tracking-widest uppercase text-emerald-400 font-mono">{successToast}</p>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Boxes size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Finished Goods Intelligence</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center">
             <Zap size={14} className="mr-2 text-[#0c9bbc] shadow-[0_0_8px_rgba(0,0,0,0.1)]" /> End-of-Line Audit & Logistics Dispatch Matrix
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="SCAN SERIAL / SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 pl-12 pr-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary-500 outline-none w-64 transition-all shadow-xl shadow-slate-200/50"
            />
          </div>
          <select 
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary-500 outline-none transition-all shadow-xl shadow-slate-200/50 cursor-pointer appearance-none"
          >
            <option value="All">All Warehouses</option>
            {warehousesList.map((w: string) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Stats Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {[
          { label: 'Ready Stock', value: stats.ready, icon: PackageCheck, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Hold Stock', value: stats.hold, icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Damaged', value: stats.damaged, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Returned', value: stats.returned, icon: RefreshCcw, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Dispatch Ready', value: stats.dispatchReady, icon: Truck, color: 'text-violet-500', bg: 'bg-violet-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 sm:p-5 lg:p-4 xl:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 hover:border-primary-200 transition-all group relative overflow-hidden shadow-xl shadow-slate-200/50 min-w-0">
             <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-all duration-700 pointer-events-none">
                <stat.icon size={100} />
             </div>
             <div className="flex justify-between items-start mb-6">
                <div className={cn("p-3 rounded-2xl mb-4 shadow-inner", stat.bg, stat.color)}>
                  <stat.icon size={20} />
                </div>
                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-primary-600 transition-colors" />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 truncate" title={stat.label}>{stat.label}</p>
             <p className="text-2xl sm:text-3xl lg:text-xl xl:text-3xl 2xl:text-4xl font-black text-slate-900 italic tracking-tighter truncate" title={stat.value.toString()}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Warehouse Wise Stock Bar Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                   <MapPin size={20} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-sans">Warehouse Node Distribution</h3>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Geospatial Stock Allocation</p>
                </div>
             </div>
             <PieChartIcon size={16} className="text-slate-300" />
          </div>
          
          <div className="h-[300px] w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={8} 
                  fontWeight={900} 
                  tickFormatter={(val) => val.toUpperCase()} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={8} fontWeight={900} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '10px', color: '#0f172a', fontWeight: 900 }}
                  itemStyle={{ color: '#0c9bbc' }}
                />
                <Bar dataKey="qty" fill="#009cbc" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Model Wise Mix */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center space-x-4">
                <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
                   <PieChartIcon size={20} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-sans">Product Inventory Mix</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ready Stock Composition</p>
                </div>
             </div>
          </div>

          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="qty"
                >
                  {productStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '10px', fontWeight: 900 }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Inventory Board */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="bg-slate-50 p-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-slate-100 no-print">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-50 text-[#0c9bbc] rounded-xl shadow-inner">
                 <Boxes size={20} />
              </div>
              <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Advanced Ready Stock Matrix</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Real-time Artifact Monitoring (Click row to open Control Center)</p>
              </div>
           </div>
           <div className="flex flex-wrap items-center gap-2.5">
              <button
                 type="button"
                 onClick={() => setShowImportModal(true)}
                 className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-primary-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                 <Upload size={13} /> Upload Old Records
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    const headings = ['Serial ID', 'Product Cluster', 'Warehouse Hub', 'Production Batch', 'Date Added', 'Status'];
                    const rows = filteredGoods.map((item: any) => [
                       item.serial,
                       item.model,
                       item.warehouse,
                       item.batchCode || item.batch || "N/A",
                       item.date,
                       item.status
                    ]);
                    const wsData = [headings, ...rows];
                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    XLSX.utils.book_append_sheet(wb, ws, "Battery Serials");
                    XLSX.writeFile(wb, `arcenol_battery_serials_${new Date().toISOString().substring(0,10)}.xlsx`);
                 }}
                 className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                 title="Export battery list as Excel Sheet"
              >
                 <FileSpreadsheet size={13} /> Export Excel
              </button>

              <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    const headings = ['Serial ID', 'Product Cluster', 'Warehouse Hub', 'Production Batch', 'Date Added', 'Status'];
                    const rows = filteredGoods.map((item: any) => [
                       item.serial,
                       item.model,
                       item.warehouse,
                       item.batchCode || item.batch || "N/A",
                       item.date,
                       item.status
                    ]);
                    const csvContent = [headings.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `arcenol_battery_serials_${new Date().toISOString().substring(0,10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                 }}
                 className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                 title="Export battery list as CSV File"
              >
                 <Download size={13} /> Export CSV
              </button>

              <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    setShowPrintReportModal(true);
                 }}
                 className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                 title="Export battery list as PDF Report"
              >
                 <Printer size={13} /> Export PDF
              </button>
           </div>
        </div>
        
        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-8 py-6">Unique Serial ID</th>
                <th className="px-8 py-6">Product Cluster</th>
                <th className="px-8 py-6">Warehouse Hub</th>
                <th className="px-8 py-6">Production Batch</th>
                <th className="px-8 py-6">Verification Link</th>
                <th className="px-8 py-6 text-right font-sans">Operational Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedGoods.map((item: any) => (
                <tr 
                  key={item.id} 
                  onClick={() => handleOpenItem(item)}
                  className="group hover:bg-slate-100/90 transition-all duration-300 cursor-pointer"
                >
                  <td className="px-8 py-6">
                    <FormattedSerial serial={item.serial} className="text-[12px] font-black text-slate-900 tracking-wider uppercase flex items-center gap-1.5" />
                    <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase italic tracking-wider">Entry: {item.date}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{item.model}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase leading-none opacity-60">
                      {data?.products.find((p:any) => p.id === item.model)?.name || "ArcPower Storage Matrix"}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-[11px] font-black text-slate-700 uppercase tracking-widest">
                       <MapPin size={12} className="mr-2 text-[#0c9bbc]" /> {item.warehouse}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase italic ml-5">Rack: {item.rack || "A-Floor"}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[11px] font-black text-slate-900 italic uppercase">{item.batch}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                       <div className="h-full bg-emerald-500 w-[92%] shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 mt-2 block tracking-widest uppercase">QC CERTIFIED</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className={cn(
                        "inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border",
                        item.status === 'READY' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        item.status === 'HOLD' ? "bg-amber-50 text-amber-750 border-amber-100" :
                        item.status === 'DAMAGED' ? "bg-rose-50 text-rose-700 border-rose-100 animate-pulse" :
                        item.status === 'RETURNED' ? "bg-sky-50 text-sky-700 border-sky-100" :
                        item.status === 'DISPATCH_READY' ? "bg-violet-50 text-violet-750 border-violet-100 shadow-[0_0_10px_rgba(139,92,246,0.1)]" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-1 shrink-0 font-sans cursor-pointer">
                         <QrCode size={12} /> Control
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          {/* Pagination Controls */}
          {filteredGoods.length > 0 && (
            <div className="bg-white px-8 py-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                <p className="text-xs text-slate-500 font-sans font-medium">
                  Showing <span className="font-bold text-slate-800">{Math.min((fgCurrentPage - 1) * fgItemsPerPage + 1, filteredGoods.length)}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(fgCurrentPage * fgItemsPerPage, filteredGoods.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredGoods.length}</span> finished goods
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
                  <select
                    value={fgItemsPerPage}
                    onChange={(e) => {
                      setFgItemsPerPage(Number(e.target.value));
                      setFgCurrentPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-primary-500/30"
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
                  disabled={fgCurrentPage === 1}
                  onClick={() => setFgCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  Prev
                </button>
                {Array.from({ length: totalFgPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setFgCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all cursor-pointer",
                        fgCurrentPage === pageNum
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
                  disabled={fgCurrentPage === totalFgPages}
                  onClick={() => setFgCurrentPage(p => Math.min(p + 1, totalFgPages))}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Production History & Batch Analysis */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl relative shadow-slate-200/50">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-50 text-[#0c9bbc] rounded-xl shadow-inner">
                 <History size={20} />
              </div>
              <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Production Execution Log</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Batch-Wise Transformation Analytics</p>
              </div>
           </div>
           
           <div className="flex items-center space-x-8">
              <div className="text-center font-mono">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Batches</p>
                 <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{history.length}</p>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="text-center font-mono animate-pulse">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Yield Efficiency</p>
                 <p className="text-2xl font-black text-[#0c9bbc] italic tracking-tighter">98.4%</p>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-50">
              <tr>
                <th className="px-8 py-6">Completion Hub</th>
                <th className="px-8 py-6">Artifact Model</th>
                <th className="px-8 py-6">Output Vector</th>
                <th className="px-8 py-6">Batch ID Artifact</th>
                <th className="px-8 py-6 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h: any) => (
                <tr key={h.id} className="hover:bg-slate-50 transition-all duration-300">
                  <td className="px-8 py-6">
                    <p className="text-[11px] font-black text-slate-900 italic tracking-widest uppercase">{h.date}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">Unit-Alpha-01</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[12px] font-black text-primary-600 uppercase tracking-widest leading-none">{h.model}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase truncate max-w-[200px] opacity-60">
                      {data?.products.find((p:any) => p.id === h.model)?.name || "ArcPower Matrix Spec"}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3 text-slate-900">
                       <p className="text-xl font-black italic tracking-tighter">{h.qty}</p>
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UNITS</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-mono text-slate-500 font-black shadow-inner">{h.id}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex items-center text-primary-600 text-[10px] font-black uppercase tracking-widest bg-primary-50 px-4 py-1.5 rounded-full border border-primary-100 shadow-sm">
                       <CheckCircle2 size={14} className="mr-2" /> {h.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {/* ==================== FULL-SCREEN FINISHED GOODS MANAGEMENT PORTAL ==================== */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col h-full w-full select-none overflow-y-auto" id="finished-goods-drawer">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col justify-between min-h-screen">
             
             {/* Dynamic Console Wrapper */}
             <div className="bg-white w-full shadow-2xl border border-slate-200/90 rounded-[2.5rem] p-6 sm:p-10 md:p-12 animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-10">
                
                {/* Section header */}
                <div className="flex justify-between items-start pb-6 border-b-2 border-slate-100">
                   <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-[#0c9bbc] tracking-widest block mb-2 leading-none">FINISHED GOODS INTELLIGENCE CENTRE</span>
                      <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter italic leading-none flex items-center gap-3">
                        <FormattedSerial serial={selectedItem.serial} className="font-black text-slate-900 tracking-wider flex items-center gap-2" />
                      </h1>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                         MODEL TYPE: <span className="font-black text-slate-700">{selectedItem.model}</span> • INITIALIZED ON {selectedItem.date}
                      </p>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setSelectedItem(null)}
                     className="p-3.5 text-slate-450 bg-white border border-slate-200 hover:text-slate-900 hover:border-slate-350 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 shrink-0"
                     title="Close Console"
                   >
                     <X size={20} />
                   </button>
                </div>

                {/* Primary Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 text-left">
                   
                   {/* COLUMN 1: Asset Configuration & Relocation (Span 12) */}
                   <form onSubmit={handleUpdateFinishedGood} className="lg:col-span-12 space-y-8">
                      {/* State status chooser */}
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono leading-none">OPERATIONAL LOGISTICS STATUS</label>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                              { code: 'READY', label: 'READY FOR TRADING', bg: 'hover:bg-emerald-50/50' },
                              { code: 'HOLD', label: 'QC HOLD STOCK', bg: 'hover:bg-amber-50/50' },
                              { code: 'DAMAGED', label: 'DAMAGED / INOPERATIVE', bg: 'hover:bg-rose-50/50' },
                              { code: 'RETURNED', label: 'CUSTOMER RETURNED', bg: 'hover:bg-sky-50/50' },
                              { code: 'DISPATCH_READY', label: 'DISPATCH STAGED', bg: 'hover:bg-violet-50/50' },
                              { code: 'SOLD', label: 'COMMERCIALLY SOLD', bg: 'hover:bg-slate-100/50' },
                            ].map(st => (
                              <button
                                key={st.code}
                                type="button"
                                onClick={() => setActionStatus(st.code)}
                                className={cn(
                                  "p-4 rounded-xl border text-[10px] font-black uppercase tracking-wider text-center transition-all active:scale-[0.97] cursor-pointer shadow-xs leading-snug",
                                  actionStatus === st.code
                                    ? st.code === 'READY' ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold shadow-md" :
                                      st.code === 'HOLD' ? "bg-amber-50 border-amber-500 text-amber-700 font-extrabold shadow-md" :
                                      st.code === 'DAMAGED' ? "bg-rose-50 border-rose-500 text-rose-700 font-extrabold shadow-md" :
                                      st.code === 'RETURNED' ? "bg-sky-50 border-sky-550 text-sky-700 font-extrabold shadow-md" :
                                      st.code === 'DISPATCH_READY' ? "bg-violet-50 border-violet-500 text-violet-750 font-extrabold shadow-md" :
                                      "bg-slate-150 border-slate-600 text-slate-800 font-extrabold shadow-sm"
                                    : "bg-white border-slate-200 text-slate-500 " + st.bg
                                )}
                              >
                                 {st.label}
                              </button>
                            ))}
                         </div>
                      </div>

                      {/* Moving Coordinates & Identity */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono leading-none">WAREHOUSE HUBS</label>
                            <div className="relative">
                               <select
                                 value={actionWarehouse}
                                 onChange={e => setActionWarehouse(e.target.value)}
                                 className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl py-4 px-4 pr-10 text-xs font-black text-slate-800 uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#0c9bbc]/20 transition-all shadow-sm"
                               >
                                 {warehousesList.map((wh: string) => (
                                   <option key={wh} value={wh}>{wh}</option>
                                 ))}
                               </select>
                               <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">
                                 ▼
                               </div>
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono leading-none">RACK BIN LOCATION</label>
                            <input
                              type="text"
                              value={actionRack}
                              onChange={e => setActionRack(e.target.value)}
                              className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black text-slate-850 uppercase outline-none focus:ring-2 focus:ring-[#0c9bbc]/20 transition-all shadow-sm font-mono"
                              placeholder="E.g., RA-12"
                              required
                            />
                         </div>
                      </div>

                      {/* Batch Identity Customizing */}
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono leading-none">BATCH PRODUCTION ASSIGNMENT</label>
                         <input
                           type="text"
                           value={actionBatch}
                           onChange={e => setActionBatch(e.target.value)}
                           className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black text-slate-850 uppercase outline-none focus:ring-2 focus:ring-[#0c9bbc]/20 transition-all shadow-sm font-mono"
                           placeholder="E.g., BATCH-24"
                           required
                         />
                      </div>

                      {/* Associated Warranty Status System */}
                      <div className="p-5 border border-slate-150 rounded-[1.5rem] bg-slate-50/50 space-y-4">
                         <div className="flex items-center gap-2">
                           <ShieldCheck className="text-[#0c9bbc]" size={18} />
                           <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider font-mono">Warranty Registry Handshake</span>
                         </div>
                         
                         {linkedWarranty ? (
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                             <div>
                               <span className="text-[9px] text-slate-400 block font-bold uppercase">WARRANTY STATUS</span>
                               <span className={cn(
                                 "font-black tracking-widest text-[10px] uppercase",
                                 linkedWarranty.status === 'ACTIVE' ? "text-emerald-600" : "text-amber-600"
                               )}>{linkedWarranty.status}</span>
                             </div>
                             <div>
                               <span className="text-[9px] text-slate-400 block font-bold uppercase">LAUNCH DATE</span>
                               <span className="font-extrabold text-slate-800">{linkedWarranty.startDate}</span>
                             </div>
                             <div>
                               <span className="text-[9px] text-slate-400 block font-bold uppercase">RECOVERABLE DURATION</span>
                               <span className="font-extrabold text-slate-800">{linkedWarranty.durationMonths} MONTHS</span>
                             </div>
                           </div>
                         ) : (
                           <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">
                             No explicit retail warranty records. Unit is fully stored under wholesale ready stock. Warranty handshakes register upon billing invoices inside Gujarat / Gandhinagar networks.
                           </p>
                         )}
                      </div>

                      {/* Submit actions */}
                      <div className="pt-6 border-t border-slate-100 flex gap-4">
                         <button
                           type="button"
                           onClick={() => setSelectedItem(null)}
                           className="flex-1 py-4 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-2xl font-black text-[10.5px] uppercase tracking-widest text-slate-505 transition-all cursor-pointer active:scale-95 leading-none shadow-xs"
                         >
                            Discard
                         </button>
                         <button
                           type="submit"
                           disabled={submittingAction}
                           className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-550/15 active:scale-95 disabled:opacity-50 leading-none"
                         >
                            {submittingAction ? <Loader2 className="animate-spin" size={14} /> : "✓ REGISTER CHANGES"}
                         </button>
                      </div>
                   </form>

                   {/* COLUMN 2: Thermal Decal Sticker & Barcode Machine (Span 5) */}
                   <div className="hidden">
                      <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block font-mono leading-none text-center self-start">
                         THERMAL LABEL PRINTER MATRIX
                      </span>

                      {/* Sticker Container */}
                      <div className="w-full bg-white text-slate-900 p-6 rounded-2xl border-4 border-dashed border-slate-300 shadow-lg relative font-mono text-[11px] select-text">
                         {/* Dashed cut lines help styling */}
                         <div className="absolute top-2 right-2 border border-slate-950 px-2 py-0.5 text-[8px] font-black uppercase rounded-sm">
                            PASSED
                         </div>

                         <div className="text-center pb-4 border-b border-slate-950">
                            <h4 className="text-sm font-black tracking-widest uppercase">ARCENOL POWER DECAL</h4>
                            <p className="text-[7.5px] text-slate-505 uppercase tracking-widest mt-1">BATTERY DIVISION • GUJARAT STATE INVENTORY</p>
                         </div>

                         <div className="space-y-2 py-4 border-b border-slate-350">
                            <div className="flex justify-between items-center">
                               <span>SERIAL ID:</span>
                               <FormattedSerial serial={selectedItem.serial} className="font-extrabold uppercase text-xs flex items-center gap-1" />
                            </div>
                            <div className="flex justify-between">
                               <span>SKU BATCH:</span>
                               <span className="font-extrabold uppercase">{actionBatch || selectedItem.batch}</span>
                            </div>
                            <div className="flex justify-between">
                               <span>MODEL NO:</span>
                               <span className="font-extrabold uppercase">{selectedItem.model}</span>
                            </div>
                            <div className="flex justify-between">
                               <span>RACK ASSIGN:</span>
                               <span className="font-extrabold uppercase">{actionRack.toUpperCase() || "A-FLOOR"}</span>
                            </div>
                            <div className="flex justify-between">
                               <span>DATE GEN:</span>
                               <span className="font-extrabold uppercase">{selectedItem.date}</span>
                            </div>
                         </div>

                         <div className="flex flex-col items-center justify-center pt-4 gap-3">
                            <div className="w-36 h-10 bg-slate-950 flex items-center justify-center rounded p-1 group">
                               {/* Stylized Barcode SVG vector */}
                               <div className="w-full h-full flex justify-between">
                                  {[3,1,2,4,1,3,2,1,4,2,3,1,4,1,2,3,1,4,2,1,3,4,1].map((bar, idx) => (
                                    <div 
                                      key={idx} 
                                      style={{ width: `${bar * 1.5}px` }} 
                                      className="h-full bg-white shrink-0" 
                                    />
                                  ))}
                               </div>
                            </div>
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">
                               ★ SECURITY BLOCKCHAIN HANDSHAKE APPROVED ★
                            </span>
                         </div>
                      </div>

                      {/* Printer Controls */}
                      <div className="w-full space-y-4">
                         <button
                           type="button"
                           onClick={handleSimulatePrint}
                           disabled={printState !== 'idle'}
                           className={cn(
                             "w-full py-4 text-[10.5px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer",
                             printState === 'idle' ? "bg-slate-900 border-2 border-slate-900 hover:bg-slate-800 text-white" :
                             printState === 'spooling' ? "bg-amber-500 text-white border-2 border-amber-500" :
                             printState === 'routing' ? "bg-[#0c9bbc] text-white border-2 border-[#0c9bbc]" :
                             "bg-emerald-600 text-white border-2 border-emerald-600"
                           )}
                         >
                            {printState === 'idle' && (
                              <>
                                <Printer size={15} /> SIMULATE PRINT LABEL
                              </>
                            )}
                            {printState === 'spooling' && (
                              <>
                                <Loader2 className="animate-spin" size={15} /> SPOOLING FILE SYSTEM...
                              </>
                            )}
                            {printState === 'routing' && (
                              <>
                                <Loader2 className="animate-spin" size={15} /> ROUTING DECALS TO GUJARAT...
                              </>
                            )}
                            {printState === 'printed' && (
                              <>
                                <CheckCircle2 size={15} /> ROUTED SUCCESSFULLY!
                              </>
                            )}
                         </button>

                         {/* Mini status telemetry display on label tool */}
                         <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-1.5 text-left text-[9px] font-mono">
                            <div className="flex justify-between text-slate-400">
                               <span>PRINTER HARDWARE STATUS:</span>
                               <span className="text-emerald-600 font-extrabold uppercase">● ONLINE</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                               <span>LAST ASSIGNED SPOOL:</span>
                               <span className="text-slate-800 font-extrabold uppercase">{selectedItem.serial || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                               <span>SPOOL ROUTING DESTINATION:</span>
                               <span className="text-slate-800 font-extrabold uppercase">Gandhinagar Casing Team</span>
                            </div>
                         </div>
                      </div>
                   </div>

                </div>

             </div>

             {/* Simple Engine Metadata Footer */}
             <div className="text-[8.5px] font-mono font-black text-slate-400 text-center uppercase tracking-widest select-none mt-8">
                Arcenol Logistics Engine - Signed action
             </div>
          </div>
        </div>
      )}

      {/* Import Old Records Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-3xl w-full overflow-hidden my-8 transform transition-all text-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#0c9bbc]/10 rounded-xl text-[#0c9bbc]">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Import Historic Battery Serials</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-mono">Excel Sheet or Copy-Pasted PDF Records</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  resetImporter();
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Importer Controls Defaults */}
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <span className="text-[9px] font-black text-primary-650 uppercase tracking-widest block mb-3 font-mono">Fallback Registry Configuration (for empty fields)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Default Model</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 outline-none"
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                  >
                    {data?.products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Default Warehouse</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 outline-none"
                    value={defaultWarehouse}
                    onChange={(e) => setDefaultWarehouse(e.target.value)}
                  >
                    {warehousesList.map((w: string) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Default Batch</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 outline-none"
                    value={defaultBatch}
                    onChange={(e) => setDefaultBatch(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Default Status</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-800 outline-none"
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value)}
                  >
                    <option value="READY">READY</option>
                    <option value="HOLD">HOLD</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="RETURNED">RETURNED</option>
                    <option value="DISPATCH_READY">DISPATCH READY</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Main Tabs */}
            <div className="px-6 pt-4 flex border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setImportTab('file'); resetImporter(); }}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer font-mono",
                  importTab === 'file' ? "border-[#0c9bbc] text-[#0c9bbc]" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Upload Excel/CSV File
              </button>
              <button
                type="button"
                onClick={() => { setImportTab('text'); resetImporter(); }}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer font-mono",
                  importTab === 'text' ? "border-[#0c9bbc] text-[#0c9bbc]" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Copy & Paste from PDF / Sheet
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {importStatus === 'idle' && (
                <div>
                  {importTab === 'file' ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-200 hover:border-[#0c9bbc]/45 transition-colors rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-slate-50">
                        <FileSpreadsheet className="text-[#0c9bbc] mb-3" size={32} />
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wide font-mono">Upload Battery Serials Spreadsheet</span>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-1.5 mb-4 max-w-sm">
                          Select an Excel (.xlsx/.xls) or CSV sheet containing columns like Serial ID, Product SKU, and Warehouse Hub.
                        </p>
                        
                        <input
                          type="file"
                          id="csv-file-input"
                          accept=".csv, .xlsx, .xls"
                          onChange={handleCSVUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="csv-file-input"
                          className="px-4 py-2 bg-[#0c9bbc] hover:bg-opacity-90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
                        >
                          Choose File (Excel/CSV)
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 gap-3">
                        <div className="flex items-center space-x-2.5">
                          <AlertCircle className="text-blue-500 shrink-0" size={16} />
                          <div>
                            <span className="text-[10px] font-black text-blue-800 uppercase tracking-wide block">Need a template?</span>
                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mt-0.5">Download our pre-structured templates to match headings perfectly.</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleDownloadExcelTemplate}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Download size={10} /> Excel Template
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadCSVTemplate}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Download size={10} /> CSV Template
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Paste Serial Numbers (One per line, or comma-separated)</label>
                        <textarea
                          rows={6}
                          placeholder={`e.g.\nAESPL  EV  28G26001044\nAESPL  EV  28G26001045\nAESPL  AUTO  28G26001049`}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white resize-none"
                          value={pastedSerials}
                          onChange={(e) => setPastedSerials(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handlePastedTextParse}
                        disabled={!pastedSerials.trim()}
                        className="w-full py-3 bg-[#0c9bbc] hover:bg-opacity-90 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} /> Parse & Review Serial List
                      </button>
                    </div>
                  )}
                </div>
              )}

              {importStatus === 'parsed' && (
                <div className="space-y-4 text-left">
                  <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="text-emerald-500" size={16} />
                      <div>
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide block">Validation Passed!</span>
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Parsed {parsedItems.length} records successfully. Ready to sync with central node.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetImporter}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-white text-slate-500 hover:text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      Clear & Reset
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left font-mono text-[10px] divide-y divide-slate-100">
                      <thead className="bg-slate-50 font-sans text-slate-500 text-[8px] font-black uppercase tracking-widest sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Serial ID</th>
                          <th className="px-4 py-2.5">Model</th>
                          <th className="px-4 py-2.5">Warehouse Hub</th>
                          <th className="px-4 py-2.5">Batch</th>
                          <th className="px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedItems.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-black text-slate-900 uppercase tracking-wide">{item.serial}</td>
                            <td className="px-4 py-2 text-slate-600 uppercase">{item.model}</td>
                            <td className="px-4 py-2 text-slate-600 uppercase">{item.warehouse}</td>
                            <td className="px-4 py-2 text-slate-500 uppercase">{item.batch}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        resetImporter();
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitBulkImport}
                      className="px-5 py-2 bg-[#0c9bbc] hover:bg-opacity-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={12} /> Commit & Sync Registry
                    </button>
                  </div>
                </div>
              )}

              {importStatus === 'submitting' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="animate-spin text-[#0c9bbc]" size={36} />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">Registering Serials in DB Block...</span>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">Adding verified records with unique keys. Please hold...</p>
                </div>
              )}

              {importStatus === 'success' && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-emerald-600">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">Registry Commit Successful!</span>
                  <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Battery stock updated and ready. Auto-closing...</p>
                </div>
              )}

              {importStatus === 'error' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 bg-rose-50 p-4 rounded-xl border border-rose-100 text-rose-700">
                    <AlertTriangle size={20} className="shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wide block">Import Error Encountered</span>
                      <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5">{importErrorMsg}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetImporter}
                    className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Printable Report Modal */}
      {showPrintReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-4xl w-full overflow-hidden my-8 transform transition-all print:my-0 print:border-none print:shadow-none print:rounded-none">
            {/* Modal Actions Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 no-print">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Generate PDF Registry Report</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-mono">High-Contrast Document Printer Matrix</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadElementAsPDF("finished-goods-printable-report", "Finished_Goods_Registry_Report.pdf")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Download Registry Report as PDF"
                >
                  <Download size={13} /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => printElement("finished-goods-printable-report", { title: "Finished_Goods_Registry_Report" })}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Print Report"
                >
                  <Printer size={13} /> Print
                </button>
                <button 
                  type="button"
                  onClick={() => setShowPrintReportModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Area Wrapper */}
            <div className="p-8 md:p-12 max-h-[75vh] overflow-y-auto bg-slate-50/40 print:bg-white print:max-h-none print:overflow-visible print:p-0 text-slate-900">
              <div id="finished-goods-printable-report" className="bg-white p-8 md:p-10 rounded-2xl border border-slate-200/80 shadow-sm max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
                {/* Printable Header */}
                <div className="border-b-2 border-slate-950 pb-6 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter italic text-slate-900 font-mono">ARCENOL POWER MATRIX ERP</h1>
                    <p className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest mt-1">LOGISTICS STACK // END-OF-LINE REGISTRY</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-3">
                      Generation Node IP: Client Sandbox Proxy<br />
                      Authorized User Email: kktiwariifs@gmail.com
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest font-mono">OFFICIAL REPORT</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-3">
                      DATE: {new Date().toISOString().substring(0, 10)}<br />
                      TIME: {new Date().toLocaleTimeString()}<br />
                      TOTAL COUNT: {filteredGoods.length} UNITS
                    </p>
                  </div>
                </div>

                {/* Subtitle / Filter Info */}
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-sans font-black">SEARCH QUALIFIER:</span>
                    <span className="text-slate-800 font-extrabold uppercase">{searchTerm || "ALL CODES"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-sans font-black">WAREHOUSE LIMITER:</span>
                    <span className="text-slate-800 font-extrabold uppercase">{selectedWarehouse}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[8px] font-sans font-black">REGISTRY INTEGRITY:</span>
                    <span className="text-[#0c9bbc] font-extrabold uppercase">★ 100% SECURE SYNCHRONIZED</span>
                  </div>
                </div>

                {/* Listing Table */}
                <div className="font-mono text-[10px]">
                  <table className="w-full text-left divide-y divide-slate-300">
                    <thead className="bg-slate-100 font-sans text-slate-700 text-[8px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">Serial ID</th>
                        <th className="px-4 py-3">Product SKU</th>
                        <th className="px-4 py-3">Warehouse Hub</th>
                        <th className="px-4 py-3">Production Batch</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredGoods.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50 print:bg-transparent">
                          <td className="px-4 py-3 font-black text-slate-900 uppercase tracking-wider">{item.serial}</td>
                          <td className="px-4 py-3 text-slate-700 font-semibold uppercase">{item.model}</td>
                          <td className="px-4 py-3 text-slate-600 uppercase">{item.warehouse}</td>
                          <td className="px-4 py-3 text-slate-500 uppercase">{item.batch || item.batchCode || "BULK-IMPORT"}</td>
                          <td className="px-4 py-3">
                            <span className="text-[8px] font-black uppercase font-sans tracking-wide">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Printable Footer Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-12 pt-12 border-t border-dashed border-slate-300 text-[9px] font-mono uppercase tracking-wider text-slate-500">
                  <div>
                    <div className="h-12 border-b border-slate-300 mb-2"></div>
                    <span>LOGISTICS OFFICER SIGNATURE</span>
                  </div>
                  <div className="text-right">
                    <div className="h-12 border-b border-slate-300 mb-2"></div>
                    <span>QUALITY AUDIT HANDSHAKE STAMP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
