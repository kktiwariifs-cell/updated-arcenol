import React from 'react';
import { 
  Users, TrendingUp, DollarSign, AlertCircle, 
  ChevronRight, Award, ArrowUpRight, ArrowDownRight,
  UserCheck, CreditCard, MessageSquare, Target,
  Star, BarChart2, ShieldCheck, Zap,
  TrendingDown, Globe, MapPin, Activity, Download
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn, formatCurrency } from '../lib/utils';
import { downloadReportDataAsPDF } from '../lib/pdfGenerator';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';

export const DealerPerformance: React.FC = () => {
  const { data, loading } = useERPData();

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <Star className="animate-spin text-accent-500 mb-6" size={48} />
      <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Analyzing Performance Vectors...</span>
    </div>
  );

  const dealers = data?.dealers || [];
  const invoices = data?.invoices || [];
  const complaints = data?.complaints || [];

  // Advanced Aggregation
  const dealerStats = dealers.map((dealer: any) => {
    const dealerInvoices = invoices.filter((inv: any) => inv.dealerId === dealer.id || inv.dealerId === dealer.company);
    const dealerComplaints = complaints.filter((c: any) => {
       const warranty = data?.warranty?.find((w: any) => w.serial === c.serial);
       return warranty && (warranty.dealerId === dealer.id || warranty.dealerId === dealer.company);
    });
    
    const salesVolume = dealerInvoices.reduce((acc: number, inv: any) => acc + inv.total, 0);
    const outstanding = dealerInvoices.filter((inv: any) => inv.status === 'UNPAID').reduce((acc: number, inv: any) => acc + inv.total, 0);
    const complaintRatio = salesVolume > 0 ? (dealerComplaints.length / (salesVolume / 100000)).toFixed(2) : '0';
    
    return {
      ...dealer,
      salesVolume,
      outstanding,
      complaintRatio,
      complaintCount: dealerComplaints.length,
      growth: Math.floor(Math.random() * 20) + 5, // Mock growth
      lastPayment: "2 days ago"
    };
  }).sort((a: any, b: any) => b.rankingScore - a.rankingScore);

  const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

  return (
    <div className="space-y-12 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Channel Intelligence</h2>
          <div className="flex items-center mt-2 space-x-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
               <Globe size={14} className="mr-2 text-primary-600" /> Strategic Distribution Network
             </p>
             <span className="h-1 w-1 rounded-full bg-slate-200"></span>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
               Registered Nodes: {dealers.length}
             </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <button
             onClick={() => {
               downloadReportDataAsPDF({
                 title: "Dealer & Channel Partner Intelligence Audit",
                 subtitle: `Active Registered Channel Nodes: ${dealerStats.length} | Arcenol Energies`,
                 headers: ["Dealer / Enterprise", "Location", "Ranking Score", "Sales Volume (₹)", "Outstanding (₹)"],
                 rows: dealerStats.map((d: any) => [d.company, d.city || 'India', d.rankingScore, formatCurrency(d.salesVolume), formatCurrency(d.outstanding)]),
                 filename: `Dealer_Network_Performance_Report.pdf`
               });
             }}
             className="px-6 py-4 bg-slate-900 hover:bg-black text-white rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
             title="Download Dealer Performance Report as PDF File"
           >
             <Download size={14} className="text-sky-400" /> Download Network PDF
           </button>
           <div className="bg-white px-8 py-4 rounded-3xl border border-red-100 shadow-2xl shadow-red-100/10">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Network Outstanding</p>
              <p className="text-xl font-black text-red-500 italic tracking-tighter">
                 {formatCurrency(dealerStats.reduce((acc, d) => acc + d.outstanding, 0))}
              </p>
           </div>
        </div>
      </div>

      {/* Top Performers Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {dealerStats.slice(0, 4).map((dealer: any, i: number) => (
          <div key={dealer.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer shadow-xl shadow-slate-200/50">
             <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-10 transition-all duration-1000">
                <Award size={140} />
             </div>
             <div className="flex justify-between items-start mb-8">
                <div className="w-14 h-14 bg-primary-50 text-cyan-600 rounded-[1.5rem] flex items-center justify-center font-black italic text-xl border border-primary-100 shadow-xl shadow-primary-500/5">
                   #{i+1}
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact Score</p>
                   <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{dealer.rankingScore}</p>
                </div>
             </div>
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2 italic leading-none truncate">{dealer.company}</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center mb-8">
                <MapPin size={12} className="mr-2 text-primary-600" /> {dealer.city}
             </p>
             
             <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-8">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">30D Volume</p>
                   <p className="text-sm font-black text-slate-900 italic">{formatCurrency(dealer.salesVolume)}</p>
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Growth</p>
                   <p className="text-sm font-black text-emerald-600 flex items-center italic">
                      <TrendingUp size={14} className="mr-1" /> +{dealer.growth}%
                   </p>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Payment Performance Radar */}
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
           <div className="flex justify-between items-center mb-12">
              <div>
                 <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center">
                    <CreditCard size={22} className="mr-4 text-blue-600" /> Channel Payment Velocity
                 </h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3 underline decoration-blue-500 decoration-2 underline-offset-4">Outstanding vs Settlement Dynamics</p>
              </div>
           </div>

           <div className="h-[400px] w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealerStats.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="company" 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  fontWeight={900} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => val.split(' ')[0]}
                />
                <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', fontSize: '11px', fontWeight: 900, color: '#0f172a', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                />
                <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={30} />
                <Bar dataKey="salesVolume" name="Sales Volume" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Quality Risk Ratio */}
        <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col justify-between">
           <div>
              <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center mb-12">
                 <AlertCircle size={22} className="mr-4 text-red-500" /> Quality Risk Ratio
              </h3>
              <div className="space-y-10">
                 {dealerStats.slice(0, 5).map((dealer) => (
                   <div key={dealer.id} className="space-y-3 group">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                         <span className="text-slate-400 group-hover:text-slate-900 transition-colors">{dealer.company}</span>
                         <span className={cn(Number(dealer.complaintRatio) > 0.5 ? "text-red-500" : "text-emerald-600")}>
                            {dealer.complaintRatio} <span className="text-slate-400 text-[8px]">DENSITY</span>
                         </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                         <div 
                           className={cn(
                             "h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.05)]",
                             Number(dealer.complaintRatio) > 0.5 ? "bg-red-500" : "bg-emerald-500"
                           )} 
                           style={{ width: `${Math.min(100, Number(dealer.complaintRatio) * 100)}%` }}
                         ></div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
           
           <div className="mt-12 p-8 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Network Baseline</p>
              <p className="text-4xl font-black text-slate-900 italic tracking-tighter">0.42 <span className="text-sm text-slate-400 not-italic uppercase ml-2">ppm</span></p>
           </div>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
         <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Global Dealer Ranking Index</h3>
            <div className="flex items-center space-x-3 text-[10px] font-black text-primary-600 uppercase tracking-widest border border-primary-100 bg-primary-50 px-6 py-2.5 rounded-full">
               <Activity className="animate-pulse" size={16} /> Real-time Performance Sync
            </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left font-mono">
               <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                  <tr>
                     <th className="px-10 py-8">Node Index / Dealer</th>
                     <th className="px-10 py-8">Revenue Matrix</th>
                     <th className="px-10 py-8">Risk Index</th>
                     <th className="px-10 py-8">Growth Delta</th>
                     <th className="px-10 py-8 text-right">Impact Factor</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {dealerStats.map((dealer, i) => (
                     <tr key={dealer.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                        <td className="px-10 py-8">
                           <div className="flex items-center space-x-6">
                              <span className="text-sm font-black text-slate-300 italic">#{i+1}</span>
                              <div>
                                 <p className="text-[15px] font-black text-slate-900 uppercase tracking-tighter group-hover:text-primary-600 transition-colors leading-none">{dealer.company}</p>
                                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-3 tracking-widest italic">{dealer.id} • {dealer.category}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="space-y-2">
                              <p className="text-[13px] font-black text-slate-900 italic tracking-widest leading-none">{formatCurrency(dealer.salesVolume)}</p>
                              <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest">O/S: {formatCurrency(dealer.outstanding)}</p>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex items-center space-x-3">
                              <div className={cn("h-2 w-2 rounded-full", Number(dealer.complaintRatio) > 0.5 ? "bg-red-500 animate-pulse" : "bg-emerald-500")}></div>
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{dealer.complaintCount} Complaints</span>
                           </div>
                        </td>
                        <td className="px-10 py-8">
                           <div className="flex items-center text-emerald-600 text-[12px] font-black uppercase tracking-widest italic">
                              <TrendingUp size={16} className="mr-2" /> +{dealer.growth}%
                           </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                           <div className="flex items-center justify-end space-x-6">
                              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                 <div className="h-full bg-primary-600 shadow-[0_0_8px_rgba(8,145,178,0.2)]" style={{ width: `${dealer.rankingScore}%` }}></div>
                              </div>
                              <span className="text-xl font-black text-slate-900 italic tracking-tighter leading-none">{dealer.rankingScore}</span>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
