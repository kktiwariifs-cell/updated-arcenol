import React, { useState } from 'react';
import { Shield, ShieldAlert, BadgeCheck, Search, Info, Wrench, History, CheckCircle2, ChevronRight, ArrowLeft, PlusCircle, AlertCircle, Calendar, Zap, X, Printer, Download } from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn } from '../lib/utils';
import { downloadElementAsPDF } from '../lib/pdfGenerator';
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

  const handleDirectSearch = (serialToSearch: string) => {
    const term = serialToSearch.trim().toLowerCase().replace(/\s+/g, ' ');
    const warrantyRecord = data?.warranty?.find((w: any) => 
      w.serial.toLowerCase().replace(/\s+/g, ' ') === term || w.serial === serialToSearch
    );
    const fgItem = data?.finishedGoods?.find((fg: any) => 
      fg.serial.toLowerCase().replace(/\s+/g, ' ') === term || fg.serial === serialToSearch
    );
    
    if (warrantyRecord) {
      const dealer = data?.leads?.find((l: any) => l.id === warrantyRecord.dealerId);
      const product = data?.products?.find((p: any) => p.id === fgItem?.model);
      
      setResult({
        serial: warrantyRecord.serial,
        model: product?.name || fgItem?.model || '72V30A High Efficiency Pack',
        soldTo: dealer?.company || 'Authorized Dealer',
        dateSold: warrantyRecord.startDate,
        expiry: new Date(new Date(warrantyRecord.startDate).setFullYear(new Date(warrantyRecord.startDate).getFullYear() + 3)).toISOString().split('T')[0],
        status: warrantyRecord.status,
        history: warrantyRecord.history || []
      });
      setView('verify');
    } else if (fgItem) {
        setResult({
            serial: fgItem.serial,
            model: fgItem.model,
            soldTo: 'In Warehouse',
            dateSold: 'N/A',
            expiry: 'N/A',
            status: 'NOT_ACTIVATED',
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
                 <p className="text-3xl font-black">{data?.warranty.length || 0}</p>
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
                    {data?.warranty.length ? Math.round((data.warranty.filter((w: any) => w.status === 'ACTIVE').length / data.warranty.length) * 100) : 0}%
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
                   {data?.warranty.slice().reverse().map((w: any) => {
                      const dealer = data?.leads.find((l:any) => l.id === w.dealerId);
                      const complaints = data?.complaints.filter((c:any) => c.serial === w.serial);
                      return (
                        <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4 font-mono text-sm font-bold text-primary-600">{w.serial}</td>
                           <td className="px-6 py-4">
                              <p className="font-bold text-sm text-slate-900">{dealer?.company || 'Direct Sale'}</p>
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
                   })}
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
              <div className="dashboard-card py-24 text-center text-slate-500 max-w-2xl mx-auto">
                <AlertCircle size={64} className="mx-auto mb-6 text-red-500 opacity-20" />
                <h3 className="text-2xl font-bold text-slate-900">Serial Not Found</h3>
                <p className="mt-2 text-slate-500">The serial number <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">{search}</span> is not registered in our manufacturing or sales records.</p>
                <button onClick={() => setView('dashboard')} className="mt-8 btn-primary px-8">Try Another Search</button>
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
                      onClick={() => window.print()} 
                      className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Printer size={13} /> Print
                    </button>
                 </div>

              </div>
           </div>
        )}
    </div>
  );
};
