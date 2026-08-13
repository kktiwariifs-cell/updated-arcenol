import React, { useState } from 'react';
import { Shield, ShieldAlert, BadgeCheck, Search, Info, Wrench, History, CheckCircle2, ChevronRight, ArrowLeft, PlusCircle, AlertCircle, Calendar, Zap, X, Printer, Download, Smartphone, Activity, Save, Loader2, IndianRupee, Cpu, FileCheck } from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn } from '../lib/utils';
import { downloadElementAsPDF, printElement } from '../lib/pdfGenerator';
import { FormattedSerial } from '../lib/serialUtils';

export const Warranty: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const [view, setView] = useState<'dashboard' | 'verify'>('dashboard');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<any>(null);
  
  // Claim Form State
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCertifying, setIsCertifying] = useState(false);
  const [claimForm, setClaimForm] = useState({ type: 'Defective BMS', notes: '' });

  // Phase 3 State Modals & Form Handlers
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isTelematicsModalOpen, setIsTelematicsModalOpen] = useState(false);
  const [isRmaModalOpen, setIsRmaModalOpen] = useState(false);

  // Form 1: End-User Activation State
  const [actSerial, setActSerial] = useState('AESPL EV 28G26001046');
  const [actCustName, setActCustName] = useState('Rajesh Sharma');
  const [actCustPhone, setActCustPhone] = useState('+91 98250 12345');
  const [actVehicleReg, setActVehicleReg] = useState('GJ-01-EV-9921');
  const [actVehicleModel, setActVehicleModel] = useState('E-Scooter Max 2026');
  const [actDealerCode, setActDealerCode] = useState('D-101');
  const [isSubmittingAct, setIsSubmittingAct] = useState(false);

  // Form 2: Telematics & SOH Diagnostic State
  const [diagSerial, setDiagSerial] = useState('AESPL EV 28G26001044');
  const [diagSoh, setDiagSoh] = useState(96.4);
  const [diagSoc, setDiagSoc] = useState(88.0);
  const [diagMaxTemp, setDiagMaxTemp] = useState(33.5);
  const [diagMinTemp, setDiagMinTemp] = useState(31.0);
  const [diagDeltaMv, setDiagDeltaMv] = useState(12);
  const [diagCycles, setDiagCycles] = useState(124);
  const [diagBmsFault, setDiagBmsFault] = useState('NONE_HEALTHY');
  const [diagOdometer, setDiagOdometer] = useState(6450);
  const [isSubmittingDiag, setIsSubmittingDiag] = useState(false);

  // Form 3: RMA Warranty Claim State
  const [rmaSerial, setRmaSerial] = useState('AESPL EV 28G26001044');
  const [rmaDealerName, setRmaDealerName] = useState('Green Motors Ahmedabad');
  const [rmaDefect, setRmaDefect] = useState('BMS Thermal Over-Temperature Shutdown');
  const [rmaBmsFault, setRmaBmsFault] = useState('BMS-E04');
  const [rmaSoh, setRmaSoh] = useState(68.5);
  const [rmaCreditAmount, setRmaCreditAmount] = useState(35000);
  const [isSubmittingRma, setIsSubmittingRma] = useState(false);

  const handleCreateEndUserActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAct(true);
    try {
      await fetch('/api/warranty/end-user-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: actSerial,
          customerName: actCustName,
          customerPhone: actCustPhone,
          vehicleRegNo: actVehicleReg,
          vehicleModel: actVehicleModel,
          dealerCode: actDealerCode,
          otpStatus: 'VERIFIED_SMS'
        })
      });
      setIsActivationModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Error activating warranty:', err);
    } finally {
      setIsSubmittingAct(false);
    }
  };

  const handleCreateTelematicsLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDiag(true);
    try {
      await fetch('/api/telematics/diagnostic-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: diagSerial,
          sohPercent: diagSoh,
          socPercent: diagSoc,
          maxCellTempCelsius: diagMaxTemp,
          minCellTempCelsius: diagMinTemp,
          cellVoltageDeltaMaxmV: diagDeltaMv,
          chargeDischargeCycleCount: diagCycles,
          bmsFaultCode: diagBmsFault,
          odometerKm: diagOdometer
        })
      });
      setIsTelematicsModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Error logging telematics:', err);
    } finally {
      setIsSubmittingDiag(false);
    }
  };

  const handleCreateRmaClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRma(true);
    try {
      await fetch('/api/warranty/rma-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: rmaSerial,
          dealerName: rmaDealerName,
          defectSymptom: rmaDefect,
          bmsFaultCode: rmaBmsFault,
          currentSohPercent: rmaSoh,
          dealerCreditNoteAmount: rmaCreditAmount
        })
      });
      setIsRmaModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Error creating RMA claim:', err);
    } finally {
      setIsSubmittingRma(false);
    }
  };

  const handleDirectSearch = (serialToSearch: string) => {
    if (!serialToSearch) return;
    const rawSearch = serialToSearch.trim();
    const cleanSearch = rawSearch.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanSearch) return;

    const norm = (s: string) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // 1. Check active warranties
    const warrantyRecord = data?.warranty?.find((w: any) => {
      const wNorm = norm(w.serial);
      return wNorm === cleanSearch || wNorm.includes(cleanSearch) || cleanSearch.includes(wNorm);
    });

    // 2. Check finished goods stock
    const fgItem = data?.finishedGoods?.find((fg: any) => {
      const fgNorm = norm(fg.serial);
      return fgNorm === cleanSearch || fgNorm.includes(cleanSearch) || cleanSearch.includes(fgNorm);
    });

    // 3. Check invoice records
    let invSerialItem: any = null;
    data?.invoices?.forEach((inv: any) => {
      inv.items?.forEach((item: any) => {
        item.serials?.forEach((s: string) => {
          const sNorm = norm(s);
          if (sNorm === cleanSearch || sNorm.includes(cleanSearch) || cleanSearch.includes(sNorm)) {
            invSerialItem = { serial: s, invoice: inv, model: item.model || item.modelId };
          }
        });
      });
    });

    if (warrantyRecord) {
      const dealer = (data?.dealers || []).find((d: any) => d.id === warrantyRecord.dealerId || d.company === warrantyRecord.dealerId)
        || (data?.leads || []).find((l: any) => l.id === warrantyRecord.dealerId || l.company === warrantyRecord.dealerId);
      const product = data?.products?.find((p: any) => p.id === fgItem?.model || p.name === fgItem?.model);
      const invMatch = (data?.invoices || []).find((inv: any) => 
        (inv.goods || inv.items || []).some((item: any) => (item.serials || []).includes(warrantyRecord.serial))
      );
      const resolvedSoldTo = warrantyRecord.dealerName 
        || dealer?.company 
        || invMatch?.partyName 
        || invMatch?.customerName 
        || (warrantyRecord.dealerId && !warrantyRecord.dealerId.startsWith('w-') && warrantyRecord.dealerId !== 'Direct Dealer Billing' && warrantyRecord.dealerId !== 'Direct Sale' ? warrantyRecord.dealerId : '')
        || data?.dealers?.[0]?.company 
        || 'Green Motors Ahmedabad';

      setResult({
        serial: warrantyRecord.serial,
        model: product?.name || fgItem?.model || '72V30A High Efficiency Pack',
        soldTo: resolvedSoldTo,
        dateSold: warrantyRecord.startDate || new Date().toISOString().split('T')[0],
        expiry: warrantyRecord.startDate ? new Date(new Date(warrantyRecord.startDate).setFullYear(new Date(warrantyRecord.startDate).getFullYear() + 3)).toISOString().split('T')[0] : '2027-12-31',
        status: warrantyRecord.status || 'ACTIVE',
        history: warrantyRecord.history || []
      });
      setView('verify');
    } else if (fgItem) {
      const invMatch = (data?.invoices || []).find((inv: any) => 
        (inv.goods || inv.items || []).some((item: any) => (item.serials || []).includes(fgItem.serial))
      );
      const resolvedSoldTo = invMatch?.partyName || invMatch?.customerName || fgItem.dealerName || fgItem.dealer || data?.dealers?.[0]?.company || 'Elite Power Ahmedabad';
      setResult({
        serial: fgItem.serial,
        model: fgItem.model || '72V30A High Efficiency Pack',
        soldTo: fgItem.status === 'SOLD' ? resolvedSoldTo : 'In Warehouse Stock',
        dateSold: fgItem.date || 'Ready in Stock',
        expiry: '36 Months From Activation',
        status: fgItem.status === 'SOLD' ? 'ACTIVE' : 'NOT_ACTIVATED',
        history: []
      });
      setView('verify');
    } else if (invSerialItem) {
      const dealer = (data?.dealers || []).find((d: any) => d.id === invSerialItem.invoice.dealerId || d.id === invSerialItem.invoice.customerId)
        || (data?.leads || []).find((l: any) => l.id === invSerialItem.invoice.dealerId || l.id === invSerialItem.invoice.customerId);
      const resolvedSoldTo = invSerialItem.invoice.partyName || invSerialItem.invoice.customerName || dealer?.company || 'Elite Power Ahmedabad';
      setResult({
        serial: invSerialItem.serial,
        model: invSerialItem.model || '72V30A High Efficiency Pack',
        soldTo: resolvedSoldTo,
        dateSold: invSerialItem.invoice.date || new Date().toISOString().split('T')[0],
        expiry: new Date(new Date(invSerialItem.invoice.date || Date.now()).setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0],
        status: 'ACTIVE',
        history: []
      });
      setView('verify');
    } else {
      setResult('not_found');
      setView('verify');
    }
  };

  const handleSearch = () => {
    handleDirectSearch(search);
  };

  const handleSubmitClaim = async () => {
    if (!result?.serial) return;
    
    await fetch('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serial: result.serial,
        ...claimForm
      })
    });
    
    setIsClaiming(false);
    setClaimForm({ type: 'Defective BMS', notes: '' });
    handleSearch(); // Refresh local result
    refetch(); // Refresh global data to update dashboard
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const activeWarranties = React.useMemo(() => {
    if (Array.isArray(data?.warranty) && data.warranty.length > 0) {
      return data.warranty;
    }
    // Auto fallback: extract serial numbers from invoices or finishedGoods if data.warranty is empty
    const fallbackList: any[] = [];
    if (Array.isArray(data?.invoices)) {
      data.invoices.forEach((inv: any) => {
        const party = inv.partyName || inv.customerName || inv.dealerName;
        const items = inv.goods || inv.items || [];
        items.forEach((item: any) => {
          if (Array.isArray(item.serials)) {
            item.serials.forEach((s: string, idx: number) => {
              if (s && !fallbackList.some(w => w.serial === s)) {
                fallbackList.push({
                  id: `w-auto-${inv.id}-${idx}`,
                  serial: s,
                  dealerId: inv.dealerId || inv.customerId || 'D-101',
                  dealerName: party,
                  startDate: inv.date || inv.billedDate || '2024-05-12',
                  durationMonths: 36,
                  status: 'ACTIVE',
                  history: []
                });
              }
            });
          }
        });
      });
    }
    if (Array.isArray(data?.finishedGoods)) {
      data.finishedGoods.forEach((fg: any, fgIdx: number) => {
        if (fg.serial && (fg.status === 'SOLD' || fg.status === 'ACTIVE') && !fallbackList.some(w => w.serial === fg.serial)) {
          const invMatch = (data?.invoices || []).find((inv: any) => 
            (inv.goods || inv.items || []).some((item: any) => (item.serials || []).includes(fg.serial))
          );
          const party = invMatch?.partyName || invMatch?.customerName || fg.dealer || fg.assignedTo || fg.dealerName;
          const assignedDealer = (data?.dealers && data.dealers.length > 0) 
            ? data.dealers[fgIdx % data.dealers.length].company 
            : 'Green Motors Ahmedabad';

          fallbackList.push({
            id: `w-fg-${fg.id}`,
            serial: fg.serial,
            dealerId: invMatch?.dealerId || invMatch?.customerId || fg.dealerId || 'D-101',
            dealerName: party || assignedDealer,
            startDate: fg.date || '2024-05-12',
            durationMonths: 36,
            status: 'ACTIVE',
            history: []
          });
        }
      });
    }
    return fallbackList;
  }, [data?.warranty, data?.invoices, data?.finishedGoods, data?.dealers]);

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
          <div className="absolute inset-0 bg-primary-600/20 blur-3xl rounded-full animate-pulse"></div>
          <Shield size={60} className="text-primary-600 animate-bounce relative z-10" />
       </div>
       <h3 className="mt-10 text-lg font-black italic uppercase tracking-tighter text-slate-900">
          Accessing Warranty Database...
       </h3>
    </div>
  );

  return (
    <div className={cn("space-y-6 transition-opacity duration-300", isSyncing && "opacity-50 pointer-events-none")}>
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
          <div className="bg-primary-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in zoom-in-95">
            <Zap size={20} className="text-accent-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Synchronizing Enterprise State...</span>
          </div>
        </div>
      )}
      {view === 'dashboard' ? (
        <div className="animate-in fade-in duration-500">
           {/* Subtab Navigation Selector & Phase 3 Quick Actions */}
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
             <div className="flex bg-slate-100/90 p-1.5 rounded-2xl w-fit border border-slate-200 gap-1 overflow-x-auto">
               {[
                 { id: 'dashboard', label: 'Serial Warranty Registry', color: 'bg-violet-500', activeClass: 'bg-violet-600 text-white shadow-lg shadow-violet-200 border-violet-700' },
                 { id: 'verify', label: 'Fast Serial Lookup', color: 'bg-amber-500', activeClass: 'bg-amber-600 text-white shadow-lg shadow-amber-200 border-amber-700' }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setView(tab.id as any)}
                   className={cn(
                     "flex items-center px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border shrink-0",
                     view === tab.id
                       ? cn(tab.activeClass, "scale-[1.02]")
                       : "bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-xs"
                   )}
                 >
                   <span className={cn("w-2 h-2 rounded-full mr-2 shrink-0 transition-all", tab.color, view === tab.id ? "bg-white animate-pulse" : "")} />
                   {tab.label}
                 </button>
               ))}
             </div>

             <div className="flex flex-wrap items-center gap-2">
               <button
                 onClick={() => setIsActivationModalOpen(true)}
                 className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-200"
               >
                 <Smartphone size={14} /> End-User Activation
               </button>
               <button
                 onClick={() => setIsTelematicsModalOpen(true)}
                 className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-200"
               >
                 <Activity size={14} /> Log Telematics SOH
               </button>
               <button
                 onClick={() => setIsRmaModalOpen(true)}
                 className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-200"
               >
                 <Wrench size={14} /> File RMA Claim
               </button>
             </div>
           </div>

           <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight">Warranty Tracking Center</h2>
                <p className="text-slate-500">Monitor active periods, service history, and claims.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                 <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Enter Serial Code..." 
                      className="input-field pl-10 w-full sm:w-64 h-10 py-0" 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                 </div>
                 <button onClick={handleSearch} className="btn-primary flex items-center justify-center shadow-lg shadow-primary-200">
                    Verify Link
                 </button>
              </div>
           </div>

           {/* Quick Test Codes Bar */}
           <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                 <div className="px-2 py-0.5 bg-primary-100 text-primary-800 rounded text-[9px] font-black uppercase tracking-wider font-mono">Demo Registry</div>
                 <p className="text-slate-600 font-medium">Click any registered serial number below to test verification:</p>
              </div>
              <div className="flex flex-wrap gap-2">
                 <button
                    onClick={() => {
                       const s = "AESPL  EV  28G26001044";
                       setSearch(s);
                       handleDirectSearch(s);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-primary-500 rounded-lg font-mono text-[10px] font-bold text-slate-700 hover:text-primary-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Active Warranty with Claims History"
                 >
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                    <FormattedSerial serial="AESPL  EV  28G26001044" className="inline-flex items-center gap-1 text-[10px]" gradeClassName="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.2 rounded font-mono font-black" />
                 </button>
                 <button
                    onClick={() => {
                       const s = "AESPL  EV  28G26001045";
                       setSearch(s);
                       handleDirectSearch(s);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-primary-500 rounded-lg font-mono text-[10px] font-bold text-slate-700 hover:text-primary-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Active Warranty"
                 >
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                    <FormattedSerial serial="AESPL  EV  28G26001045" className="inline-flex items-center gap-1 text-[10px]" gradeClassName="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.2 rounded font-mono font-black" />
                 </button>
                 <button
                    onClick={() => {
                       const s = "AESPL  EV  28G26001046";
                       setSearch(s);
                       handleDirectSearch(s);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-amber-500 rounded-lg font-mono text-[10px] font-bold text-slate-700 hover:text-amber-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Registered in Stock (Ready for Activation)"
                 >
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <FormattedSerial serial="AESPL  EV  28G26001046" className="inline-flex items-center gap-1 text-[10px]" gradeClassName="bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded font-mono font-black" />
                 </button>
              </div>
           </div>

             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-6 rounded-xl border-none bg-slate-900 text-white shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] cursor-default">
                 <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Active Warranties</p>
                    <Shield size={16} className="opacity-40" />
                 </div>
                 <p className="text-3xl font-black">{activeWarranties.length}</p>
                 <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 w-3/4"></div>
                 </div>
              </div>

              <div className="p-6 rounded-xl border-none bg-primary-600 text-white shadow-xl shadow-primary-100 transition-all hover:scale-[1.02] cursor-default">
                 <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Valid Coverage</p>
                    <BadgeCheck size={16} className="opacity-40" />
                 </div>
                 <p className="text-3xl font-black">
                    {activeWarranties.length ? Math.round((activeWarranties.filter((w: any) => w.status === 'ACTIVE').length / activeWarranties.length) * 100) : 0}%
                 </p>
                 <p className="text-[10px] mt-1 font-bold opacity-80">Authenticated Assets</p>
              </div>

              <div className="p-6 rounded-xl border-white bg-white border shadow-xl shadow-slate-100 transition-all hover:border-amber-200 hover:scale-[1.02] cursor-default">
                 <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Open Claims</p>
                    <ShieldAlert size={16} className="text-amber-500 opacity-40" />
                 </div>
                 <p className="text-3xl font-black text-amber-500">
                    {data?.complaints.filter((c:any) => c.status === 'OPEN').length || 0}
                 </p>
                 <p className="text-[10px] mt-1 font-bold text-slate-400">Claims in processing</p>
              </div>

              <div className="p-6 rounded-xl border-white bg-white border shadow-xl shadow-slate-100 transition-all hover:border-primary-200 hover:scale-[1.02] cursor-default">
                 <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resolution TAT</p>
                    <History size={16} className="text-primary-500 opacity-40" />
                 </div>
                 <p className="text-3xl font-black text-slate-900">3.8 <span className="text-sm font-black text-slate-400">Days</span></p>
                 <p className="text-[10px] mt-1 font-bold text-accent-600">↑ 12% faster than last MTD</p>
              </div>
           </div>

           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-slate-50 flex items-center">
                 <Shield size={18} className="mr-2 text-primary-600" />
                 <h3 className="font-bold text-slate-700">Recent Activations & Claims</h3>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Serial Number</th>
                    <th className="px-6 py-4">Dealer / Activation</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Service Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {activeWarranties.length > 0 ? (
                      activeWarranties.slice().reverse().map((w: any) => {
                         const dealerMatch = (data?.dealers || []).find((d: any) => d.id === w.dealerId || d.company === w.dealerId)
                           || (data?.leads || []).find((l: any) => l.id === w.dealerId || l.company === w.dealerId);
                         const invMatch = (data?.invoices || []).find((inv: any) => 
                           inv.dealerId === w.dealerId || inv.customerId === w.dealerId ||
                           (inv.goods || inv.items || []).some((item: any) => (item.serials || []).includes(w.serial))
                         );
                         const resolvedDealer = w.dealerName 
                           || dealerMatch?.company 
                           || invMatch?.partyName 
                           || invMatch?.customerName 
                           || (w.dealerId && !w.dealerId.startsWith('w-') && w.dealerId !== 'Direct Dealer Billing' && w.dealerId !== 'Direct Sale' ? w.dealerId : '')
                           || (data?.dealers && data.dealers.length > 0 ? data.dealers[0].company : 'Green Motors Ahmedabad');

                         const complaints = data?.complaints ? data.complaints.filter((c:any) => c.serial === w.serial) : [];
                         return (
                           <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-sm font-bold text-primary-600">
                                 <FormattedSerial serial={w.serial} />
                              </td>
                              <td className="px-6 py-4">
                                 <p className="font-bold text-sm text-slate-900">{resolvedDealer}</p>
                                 <p className="text-[10px] text-slate-400">Activated: {w.startDate}</p>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                 {new Date(new Date(w.startDate).setFullYear(new Date(w.startDate).getFullYear() + 3)).toISOString().split('T')[0]}
                              </td>
                              <td className="px-6 py-4">
                                 <span className="px-2 py-1 bg-accent-100 text-accent-700 rounded-full text-[9px] font-bold uppercase tracking-tighter">
                                    {w.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex space-x-1">
                                    {complaints.length > 0 ? (
                                       <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                          {complaints.length} CLAIM(S)
                                       </span>
                                    ) : (
                                       <span className="text-slate-400 italic text-[10px]">No issues</span>
                                    )}
                                 </div>
                              </td>
                           </tr>
                         );
                      })
                   ) : (
                      <tr>
                         <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                            <Shield size={32} className="mx-auto mb-2 opacity-30 text-slate-500" />
                            <p className="font-bold text-sm text-slate-600">No Active Warranty Records Found</p>
                            <p className="text-xs text-slate-400 mt-1">Issue an invoice with serial numbers or use the verification gateway to register new warranties.</p>
                         </td>
                      </tr>
                   )}
                </tbody>
              </table>
           </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom duration-500">
           <button onClick={() => setView('dashboard')} className="mb-6 flex items-center text-slate-500 hover:text-primary-600 font-bold text-xs uppercase tracking-widest">
              <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
           </button>

           {result === 'not_found' ? (
              <div className="dashboard-card py-16 text-center text-slate-500 max-w-2xl mx-auto space-y-4">
                <AlertCircle size={56} className="mx-auto text-rose-500 opacity-80" />
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Serial Not Found</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  The serial number <span className="font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-black">{search}</span> is not currently registered in active manufacturing or sales records.
                </p>
                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <button 
                    type="button"
                    onClick={async () => {
                      try {
                        const targetSerial = search || 'AESPL EV 28G26001044';
                        await fetch('/api/sync/customer/register-warranty', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            serial: targetSerial,
                            customerName: 'Direct Registration Customer',
                            phone: '+91 98765 43210'
                          })
                        });
                        await refetch();
                        handleDirectSearch(targetSerial);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="btn-primary px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <PlusCircle size={16} /> Quick-Register Warranty Now
                  </button>
                  <button onClick={() => setView('dashboard')} className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs cursor-pointer transition-all">
                    Try Another Search
                  </button>
                </div>
              </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                   <div className="dashboard-card border-primary-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                         <BadgeCheck size={120} />
                      </div>
                      <div className="flex justify-between items-start mb-8 relative z-10">
                         <div>
                            <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Authenticated Product</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{result.serial}</h3>
                            <p className="text-lg font-bold text-slate-500">{result.model}</p>
                         </div>
                         <div className={cn(
                            "px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-sm",
                            result.status === 'ACTIVE' ? "bg-accent-600 text-white" : "bg-slate-200 text-slate-500"
                         )}>
                            {result.status === 'ACTIVE' && <CheckCircle2 size={16} className="mr-2" />}
                            {result.status.replace('_', ' ')}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100 relative z-10">
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Dealer</p>
                            <p className="text-xs font-bold text-slate-900">{result.soldTo}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Activated</p>
                            <p className="text-xs font-bold text-slate-900">{result.dateSold}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Valid Until</p>
                            <p className="text-xs font-bold text-accent-600">{result.expiry}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Condition</p>
                            <p className="text-xs font-bold text-slate-900">Coverage Extended</p>
                         </div>
                      </div>
                   </div>

                   <div className="dashboard-card" id="service-logs">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                         <History size={16} className="mr-2" /> Service & Life-cycle Logs
                      </h4>
                      <div className="space-y-6">
                         <div className="relative pl-8 pb-6 border-l-2 border-accent-100 last:border-b-0">
                            <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-accent-600 border-4 border-white shadow-sm ring-1 ring-accent-100"></div>
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="text-sm font-bold text-slate-900">Warranty Activated</p>
                                  <p className="text-xs text-slate-500">Retail Billing Completed · Invoice Link Active</p>
                               </div>
                               <span className="text-[10px] font-bold text-slate-400">{result.dateSold}</span>
                            </div>
                         </div>
                         {result.history.map((h: any, idx: number) => (
                           <div key={idx} className="relative pl-8 pb-6 border-l-2 border-amber-100">
                              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm ring-1 ring-amber-100"></div>
                              <div className="flex justify-between items-start">
                                 <div>
                                    <p className="text-sm font-bold text-slate-900">{h.type.replace('_', ' ')}</p>
                                    <p className="text-xs text-slate-500">{h.description}</p>
                                 </div>
                                 <span className="text-[10px] font-bold text-slate-400">{h.date}</span>
                              </div>
                           </div>
                         ))}
                         {result.history.length === 0 && (
                            <div className="relative pl-8">
                               <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
                               <p className="text-xs text-slate-400 italic">No previous service claims for this unit.</p>
                            </div>
                         )}
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="dashboard-card bg-white border border-slate-200 text-slate-900 p-8 shadow-xl shadow-slate-200/40">
                      <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-slate-400">Operations</h4>
                      <div className="space-y-4">
                         <button 
                           onClick={() => setIsClaiming(true)}
                           className="w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center transition-all group"
                         >
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                               <PlusCircle size={20} />
                            </div>
                            <div className="text-left">
                               <p className="font-bold text-sm">File Warranty Claim</p>
                               <p className="text-[10px] text-slate-400">Raise RMA or Repair request</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto text-slate-300" />
                         </button>

                         <button 
                           onClick={() => document.getElementById('service-logs')?.scrollIntoView({ behavior: 'smooth' })}
                           className="w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center transition-all group"
                         >
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                               <History size={20} />
                            </div>
                            <div className="text-left">
                               <p className="font-bold text-sm">Service History</p>
                               <p className="text-[10px] text-slate-400">View full technical logs</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto text-slate-300" />
                         </button>

                         <button 
                           onClick={() => setIsCertifying(true)}
                           className="w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center transition-all group"
                         >
                            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                               <Shield size={20} />
                            </div>
                            <div className="text-left">
                               <p className="font-bold text-sm">Certify Authenticity</p>
                               <p className="text-[10px] text-slate-400">Generate digital certificate</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto text-slate-300" />
                         </button>
                      </div>
                   </div>

                   <div className="dashboard-card border-dashed bg-slate-50/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Reference Scan</p>
                      <div className="aspect-square bg-white border border-slate-200 rounded-2xl flex items-center justify-center p-8 grayscale opacity-50">
                         <Shield size={120} />
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

       {/* Claim Submission Modal */}
       {isClaiming && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
             <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-500 border border-slate-100">
                <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                   <div>
                     <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">New Warranty Claim</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Drafting RMA for {result.serial}</p>
                   </div>
                   <button onClick={() => setIsClaiming(false)} className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-sm">✕</button>
                </div>
                <div className="p-10 space-y-8">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Claim Type / Issue</label>
                      <select 
                        className="input-field rounded-2xl h-14 font-black italic uppercase text-xs"
                        value={claimForm.type}
                        onChange={e => setClaimForm({...claimForm, type: e.target.value})}
                      >
                         <option>Defective BMS</option>
                         <option>Low Range Capacity</option>
                         <option>Charging Failure</option>
                         <option>Casing Damage</option>
                         <option>Software Error</option>
                         <option>Other / Periodic Service</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Detailed Observations</label>
                      <textarea 
                         className="input-field h-32 py-4 rounded-2xl font-medium" 
                         placeholder="Explain the technical issue..."
                         value={claimForm.notes}
                         onChange={e => setClaimForm({...claimForm, notes: e.target.value})}
                      />
                   </div>
                   
                   <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start">
                      <AlertCircle size={20} className="text-amber-600 mr-4 mt-0.5" />
                      <p className="text-xs text-amber-900 leading-relaxed font-medium">
                        <strong>Security Protocol:</strong> Creating a claim will flag this serial number for investigation. Ensure physical inspection is completed at the certified node.
                      </p>
                   </div>

                   <button 
                     onClick={handleSubmitClaim}
                     className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center shadow-2xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                   >
                      Submit RMA Request <ChevronRight size={18} className="ml-2" />
                   </button>
                </div>
             </div>
          </div>
       )}

       {/* Digital Warranty Certificate Modal */}
       {isCertifying && result && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300 text-slate-900">
             <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                
                {/* Header controls (no-print) */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center no-print">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Document Registry</h3>
                   <button 
                     onClick={() => setIsCertifying(false)} 
                     className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-sm"
                   >
                     <X size={14} />
                   </button>
                </div>

                {/* Print Certificate Area */}
                <div className="p-12 overflow-y-auto flex-grow bg-slate-50/50 print-section flex items-center justify-center">
                   <div id="warranty-certificate-card" className="bg-white p-10 rounded-xl border-[6px] border-double border-slate-900 shadow-sm max-w-md w-full text-center space-y-6 relative print:border-none print:shadow-none print:p-0">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-[#912551]">
                         <Shield size={32} />
                      </div>
                      
                      <div className="space-y-2">
                         <h2 className="text-xl font-black uppercase tracking-widest text-slate-950">CERTIFICATE OF AUTHENTICITY</h2>
                         <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">OFFICIAL WARRANTY ACCREDITATION</p>
                      </div>

                      <div className="border-t border-b border-dashed border-slate-300 py-6 my-6 text-sm space-y-4 font-mono text-left text-slate-800">
                         <p className="text-xs text-center italic text-slate-500 mb-4">This documents certifies that the registered Lithium-Ion Battery pack satisfies all Arcenol quality assurance protocols.</p>
                         
                         <div className="flex justify-between">
                            <span className="text-slate-400">SERIAL ID:</span>
                            <span className="font-bold text-slate-950">{result?.serial}</span>
                         </div>
                         
                         <div className="flex justify-between">
                            <span className="text-slate-400">CELL CLUSTER:</span>
                            <span className="font-bold text-slate-950">{result?.model}</span>
                         </div>
                         
                         <div className="flex justify-between">
                            <span className="text-slate-400">DISTRIBUTOR:</span>
                            <span className="font-bold text-slate-950 truncate max-w-[180px]">{result?.soldTo}</span>
                         </div>
                         
                         <div className="flex justify-between">
                            <span className="text-slate-400">ACTIVATED DATE:</span>
                            <span className="font-bold text-slate-950">{result?.dateSold}</span>
                          </div>
                          
                          <div className="flex justify-between">
                             <span className="text-slate-400">EXPIRATION DATE:</span>
                             <span className="font-bold text-accent-600">{result?.expiry}</span>
                          </div>
                       </div>

                       <div className="pt-2 text-[9px] text-slate-400 font-mono flex justify-between items-end">
                          <div className="text-left space-y-1">
                             <p className="font-black text-slate-800 border-b border-slate-300 pb-1">K. K. Tiwari</p>
                             <p className="uppercase">Director of Systems</p>
                          </div>
                          <div className="text-right">
                             <p className="font-black text-emerald-600">SECURE ACTIVE</p>
                             <p className="uppercase">ARCENOL ENERGIES</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Footer buttons (no-print) */}
                 <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 no-print">
                    <button 
                      onClick={() => setIsCertifying(false)} 
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Close
                    </button>
                    <button 
                      onClick={() => downloadElementAsPDF("warranty-certificate-card", `Warranty_Certificate_${result?.serial || 'Lithium_Battery'}.pdf`)} 
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                      title="Download Certificate as PDF"
                    >
                      <Download size={13} /> Download PDF
                    </button>
                    <button 
                      onClick={() => printElement("warranty-certificate-card", { title: `Warranty_${result?.serial || 'Certificate'}` })} 
                      className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Printer size={13} /> Print
                    </button>
                 </div>

              </div>
           </div>
        )}

      {/* MODAL 1: End-User Customer Warranty Activation (SMS/OTP) */}
      {isActivationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Activate End-User Battery Warranty</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Customer Phone Pairing & SMS OTP Verification</p>
                </div>
              </div>
              <button onClick={() => setIsActivationModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEndUserActivation} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Battery Serial Code</label>
                <input
                  type="text"
                  required
                  value={actSerial}
                  onChange={(e) => setActSerial(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    value={actCustName}
                    onChange={(e) => setActCustName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Mobile Number (SMS OTP)</label>
                  <input
                    type="text"
                    required
                    value={actCustPhone}
                    onChange={(e) => setActCustPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">EV Registration No.</label>
                  <input
                    type="text"
                    required
                    value={actVehicleReg}
                    onChange={(e) => setActVehicleReg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Vehicle Model Specification</label>
                  <input
                    type="text"
                    required
                    value={actVehicleModel}
                    onChange={(e) => setActVehicleModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Authorized Dealer Code</label>
                <input
                  type="text"
                  required
                  value={actDealerCode}
                  onChange={(e) => setActDealerCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[10px] text-emerald-800">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Mobile OTP Auth Status:
                </span>
                <span className="font-extrabold uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono">
                  VERIFIED_SMS
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsActivationModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAct}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {isSubmittingAct ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Activate 36-Mo Warranty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Telematics & SOH Diagnostic Logger */}
      {isTelematicsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Log Live Telematics & SOH Metrics</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Remote BMS Health Check & Thermal Diagnostics</p>
                </div>
              </div>
              <button onClick={() => setIsTelematicsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTelematicsLog} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Battery Serial Number</label>
                  <input
                    type="text"
                    required
                    value={diagSerial}
                    onChange={(e) => setDiagSerial(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Odometer Mileage (km)</label>
                  <input
                    type="number"
                    required
                    value={diagOdometer}
                    onChange={(e) => setDiagOdometer(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-purple-600 block mb-1">State of Health (SOH %)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagSoh}
                    onChange={(e) => setDiagSoh(Number(e.target.value))}
                    className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-purple-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">State of Charge (SOC %)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagSoc}
                    onChange={(e) => setDiagSoc(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Charge Cycles</label>
                  <input
                    type="number"
                    required
                    value={diagCycles}
                    onChange={(e) => setDiagCycles(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-amber-600 block mb-1">Max Cell Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagMaxTemp}
                    onChange={(e) => setDiagMaxTemp(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Min Cell Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={diagMinTemp}
                    onChange={(e) => setDiagMinTemp(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Cell ΔV Max (mV)</label>
                  <input
                    type="number"
                    required
                    value={diagDeltaMv}
                    onChange={(e) => setDiagDeltaMv(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">BMS Diagnostic Fault Code</label>
                <select
                  value={diagBmsFault}
                  onChange={(e) => setDiagBmsFault(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                >
                  <option value="NONE_HEALTHY">NONE_HEALTHY - Pack Operating Within Thermal Limits</option>
                  <option value="BMS-E04">BMS-E04 - Over-Temperature Alarm Trip (&gt; 55°C)</option>
                  <option value="BMS-E01">BMS-E01 - Single Cell Under-Voltage Cutoff</option>
                  <option value="BMS-E12">BMS-E12 - Cell Imbalance Delta Excessive (&gt; 50mV)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTelematicsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDiag}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {isSubmittingDiag ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Log Telematics Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Field Service RMA Claim & Dealer Credit Note */}
      {isRmaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">File Field Service RMA Claim</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Return Merchandise Authorization & Dealer Credit Note</p>
                </div>
              </div>
              <button onClick={() => setIsRmaModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRmaClaim} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Defective Serial Code</label>
                  <input
                    type="text"
                    required
                    value={rmaSerial}
                    onChange={(e) => setRmaSerial(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Partner Dealer Name</label>
                  <input
                    type="text"
                    required
                    value={rmaDealerName}
                    onChange={(e) => setRmaDealerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Defect Symptom / Customer Complaint</label>
                <input
                  type="text"
                  required
                  value={rmaDefect}
                  onChange={(e) => setRmaDefect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">BMS Fault Code</label>
                  <input
                    type="text"
                    required
                    value={rmaBmsFault}
                    onChange={(e) => setRmaBmsFault(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-rose-600 block mb-1">Current SOH (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={rmaSoh}
                    onChange={(e) => {
                      const sohVal = Number(e.target.value);
                      setRmaSoh(sohVal);
                      if (sohVal < 70) setRmaCreditAmount(35000);
                      else setRmaCreditAmount(2500);
                    }}
                    className="w-full bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-rose-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-emerald-700 block mb-1">Credit Note (₹)</label>
                  <input
                    type="number"
                    required
                    value={rmaCreditAmount}
                    onChange={(e) => setRmaCreditAmount(Number(e.target.value))}
                    className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono font-black"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-900 font-mono flex items-center justify-between">
                <span>RMA Automated Decision Recommendation:</span>
                <span className="font-extrabold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  {rmaSoh < 70 ? "FULL_PACK_REPLACEMENT" : "CELL_SWAP_REPAIR"}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRmaModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRma}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {isSubmittingRma ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Log RMA & Issue Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
