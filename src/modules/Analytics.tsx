import React, { useState } from 'react';
import { 
  TrendingUp, Activity, UserCheck, ShieldAlert, BarChart3, PieChart as PieIcon, 
  Map, Target, ArrowUpRight, ArrowDownRight, IndianRupee, Layers, Zap, AlertTriangle,
  Users, CheckCircle2, History, Truck, Milestone, BadgeCheck, ShieldCheck, FileText, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Cell, Pie, Legend 
} from 'recharts';
import { useERPData } from '../hooks/useERPData';
import { formatCurrency, cn } from '../lib/utils';
import { downloadReportDataAsPDF } from '../lib/pdfGenerator';

export const Analytics: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const [activeTab, setActiveTab] = useState<'sales' | 'production' | 'warranty' | 'dealer'>('sales');

  const complaints = data?.complaints || [];
  const failureDistribution = data?.failureCategories.map((cat: string) => ({
    name: cat,
    value: complaints.filter((c: any) => c.rootCause === cat).length
  })).filter((f: any) => f.value > 0);

  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCasesMap: { [key: string]: number } = {};
  allMonths.forEach(m => { monthCasesMap[m] = 0; });

  complaints.forEach((c: any) => {
    const rawDate = c.date || c.created_at || c.loggedDate;
    if (!rawDate) return;
    const cDate = new Date(rawDate);
    if (isNaN(cDate.getTime())) return;
    const m = cDate.toLocaleString('default', { month: 'short' });
    if (m in monthCasesMap) {
      monthCasesMap[m] += 1;
    }
  });

  const failureTimeline = allMonths.slice(0, 7).map(m => ({
    month: m,
    cases: monthCasesMap[m] || 0
  }));

  const [isSyncing, setIsSyncing] = useState(false);

  const handleAction = (actionName: string, callback: () => void | Promise<void>) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(async () => {
      try {
        await callback();
      } catch (e) {
        console.error(e);
      }
      setIsSyncing(false);
    }, 400); // 400ms visual confirmation transition
  };

  if (loading || isSyncing) return (
    <div className="p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
       <div className="inline-block p-6 bg-accent-50 rounded-3xl relative overflow-hidden">
          <Activity size={40} className="text-accent-600 animate-spin relative z-10" />
          <div className="absolute inset-0 bg-accent-600/5 animate-pulse"></div>
       </div>
       <p className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-accent-950 animate-pulse">
          {isSyncing ? 'Synchronizing Strategic ERP Matrix...' : 'Processing Business Intelligence...'}
       </p>
       <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">
          Cross-Module Data Validation in Progress
       </p>
    </div>
  );

  // Dynamic Sales Trend synchronized with real invoices
  const invoicesList = data?.invoices || [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthSales: { [key: string]: number } = {};
  monthNames.forEach(m => { monthSales[m] = 0; });
  
  invoicesList.forEach((inv: any) => {
    const invDate = new Date(inv.date || inv.billedDate || inv.created_at || Date.now());
    const mName = invDate.toLocaleString('default', { month: 'short' });
    const tot = Number(inv.total || inv.grandTotal || inv.grand_total || 0);
    if (mName in monthSales) {
      monthSales[mName] += tot;
    }
  });

  const salesData = monthNames.slice(0, 7).map(m => ({
    month: m,
    sales: monthSales[m] || 0,
    target: (monthSales[m] || 0) > 0 ? Math.round((monthSales[m] || 0) * 1.1) : 0
  }));

  const failureData = failureDistribution;
  const COLORS = ['#083344', '#0891b2', '#06b6d4', '#22d3ee', '#164e63'];

  // Calculate real metrics directly from database state
  const totalInvoiceRev = invoicesList.reduce((acc: number, inv: any) => acc + Number(inv.total || inv.grandTotal || inv.grand_total || 0), 0);
  const avgOrderVal = invoicesList.length > 0 ? Math.round(totalInvoiceRev / invoicesList.length) : 0;

  // Real region aggregation from invoices & dealers
  const regionSalesMap: { [region: string]: number } = {};
  invoicesList.forEach((inv: any) => {
    const dealer = (data?.dealers || []).find((d: any) => d.id === inv.dealerId || d.id === inv.customerId) 
      || (data?.leads || []).find((l: any) => l.id === inv.dealerId || l.id === inv.customerId);
    const regionName = dealer?.state ? `${dealer.city ? dealer.city + ', ' : ''}${dealer.state}` : (inv.partyName || 'Direct Billing');
    const amount = Number(inv.total || inv.grandTotal || inv.grand_total || 0);
    regionSalesMap[regionName] = (regionSalesMap[regionName] || 0) + amount;
  });

  const sortedRegions = Object.entries(regionSalesMap).sort((a, b) => b[1] - a[1]);
  const topRegionName = sortedRegions.length > 0 ? sortedRegions[0][0] : 'N/A';
  const topRegionSalesPct = totalInvoiceRev > 0 && sortedRegions.length > 0
    ? `${Math.round((sortedRegions[0][1] / totalInvoiceRev) * 100)}% Sales`
    : '0% Sales';

  const totalProducedUnits = (data?.finishedGoods?.length || 0) + (data?.productionHistory || []).reduce((acc: number, p: any) => acc + Number(p.qty || 1), 0);
  const dailyAverageProduced = totalProducedUnits > 0 ? Math.round(totalProducedUnits / 30) : 0;
  
  const damagedUnits = (data?.finishedGoods || []).filter((fg: any) => fg.status === 'DAMAGED' || fg.status === 'HOLD').length;
  const rejectionRateStr = totalProducedUnits > 0 ? `${((damagedUnits / totalProducedUnits) * 100).toFixed(1)}%` : '0%';

  const totalDealersCount = (data?.dealers || []).length;
  const totalLeadsCount = (data?.leads || []).length;
  const convertedLeadsCount = (data?.leads || []).filter((l: any) => ['CONVERTED', 'DEALER', 'WON', 'ACTIVE'].includes(l.status)).length;
  const activeCRMLeadsCount = totalLeadsCount - convertedLeadsCount;
  const leadConversionRateStr = totalLeadsCount > 0 ? `${Math.round((convertedLeadsCount / totalLeadsCount) * 100)}%` : '0%';

  const openComplaintsCount = complaints.filter((c: any) => c.status === 'OPEN').length;
  const closedComplaintsCount = complaints.filter((c: any) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const failureIncidenceStr = totalProducedUnits > 0 ? `${((complaints.length / totalProducedUnits) * 100).toFixed(1)}%` : '0%';
  const topFailureModeObj = failureDistribution.length > 0 ? failureDistribution[0] : null;

  const statsCards = {
    sales: [
       { title: 'Total Revenue', value: formatCurrency(totalInvoiceRev), icon: IndianRupee, color: 'text-accent-600' },
       { title: 'Avg Order Value', value: formatCurrency(avgOrderVal), icon: Target, color: 'text-accent-600' },
       { title: 'Total Invoices', value: invoicesList.length.toString(), icon: TrendingUp, color: 'text-accent-500' },
       { title: 'Top Sales Region', value: topRegionName, value2: topRegionSalesPct, icon: Map, color: 'text-accent-700' },
    ],
    production: [
       { title: 'Total Produced', value: totalProducedUnits, icon: Layers, color: 'text-slate-800' },
       { title: 'Daily Average', value: dailyAverageProduced, icon: Activity, color: 'text-accent-600' },
       { title: 'Rejection / Hold Rate', value: rejectionRateStr, icon: AlertTriangle, color: 'text-amber-600' },
       { title: 'Ready Inventory', value: (data?.finishedGoods || []).filter((fg: any) => fg.status === 'READY').length.toString(), icon: Zap, color: 'text-accent-600' },
    ],
    dealer: [
       { title: 'Dealer Network Size', value: totalDealersCount, value2: 'Verified Channels', icon: Users, color: 'text-accent-600' },
       { title: 'Active CRM Leads', value: activeCRMLeadsCount, icon: History, color: 'text-amber-600' },
       { title: 'Lead Conversion Rate', value: leadConversionRateStr, icon: BadgeCheck, color: 'text-accent-600' },
       { title: 'Top Channel', value: topRegionName, icon: Truck, color: 'text-accent-700' },
    ],
    warranty: [
       { title: 'Failure Incidence', value: failureIncidenceStr, icon: ShieldCheck, color: 'text-accent-600' },
       { title: 'Top Failure Mode', value: topFailureModeObj ? topFailureModeObj.name : 'None', value2: topFailureModeObj ? `${topFailureModeObj.value} Cases` : '0 Cases', icon: AlertTriangle, color: 'text-red-500' },
       { title: 'Open Service / RMA', value: openComplaintsCount, icon: Zap, color: 'text-amber-500' },
       { title: 'Resolved Cases', value: closedComplaintsCount, icon: Activity, color: 'text-blue-500' },
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 flex items-center">
             <BarChart3 className="mr-2 text-accent-600" /> Executive Command Centre
          </h2>
          <p className="text-slate-500 text-sm">Real-time KPIs, cross-module analytics & growth tracking.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
               const activeStats = (statsCards[activeTab as keyof typeof statsCards] || statsCards.sales);
               downloadReportDataAsPDF({
                  title: `Executive Command Centre Analytics (${activeTab.toUpperCase()} Matrix)`,
                  subtitle: `Generated for Executive Leadership | Arcenol Power ERP`,
                  headers: ["KPI Metric Vector", "Recorded Value", "Growth / Deviation Trend", "Status"],
                  rows: activeStats.map((s: any) => [s.title, s.value, s.growth || s.value2 || 'STABLE', 'OPTIMAL']),
                  filename: `Executive_Analytics_${activeTab}_Report.pdf`
               });
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Download Executive Analytics Report as PDF"
          >
            <Download size={13} className="text-sky-400" /> Download PDF Report
          </button>
          
          <div className="flex p-1 bg-white border border-slate-100 shadow-sm rounded-xl">
             {(['sales', 'production', 'warranty', 'dealer'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer",
                    activeTab === tab ? "bg-sky-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab}
                </button>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {(statsCards[activeTab as keyof typeof statsCards] || statsCards.sales).map((stat: any, idx: number) => (
           <div 
             key={idx} 
             onClick={() => alert(`Detailed Metric Report: ${stat.title}\nCurrent Performance: ${stat.value}`)}
             className="dashboard-card group hover:border-primary-100 transition-all cursor-pointer active:scale-[0.98]"
           >
              <div className="flex justify-between items-start mb-4">
                 <div className={cn("p-2 rounded-xl bg-slate-50 shadow-inner group-hover:bg-primary-50 transition-all", stat.color)}>
                    <stat.icon size={20} />
                 </div>
                 {stat.growth && (
                    <span className={cn(
                       "flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-lg",
                       stat.growth.startsWith('+') ? "text-accent-600 bg-accent-50" : "text-red-600 bg-red-50"
                    )}>
                       {stat.growth.startsWith('+') ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
                       {stat.growth}
                    </span>
                 )}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              {stat.value2 && <p className="text-[10px] font-bold text-slate-500 mt-1">{stat.value2}</p>}
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Narrative Chart */}
         <div className="lg:col-span-2 dashboard-card border-none bg-white shadow-xl shadow-slate-200/50">
            <h4 className="text-xs font-black text-slate-400 uppercase mb-8 flex items-center">
               <TrendingUp size={16} className="mr-2 text-primary-600" /> 
               {activeTab === 'sales' && 'Revenue Achievement (FY 2025-26)'}
               {activeTab === 'production' && 'Output Consistency Stream'}
               {activeTab === 'dealer' && 'Channel Expansion Velocity'}
               {activeTab === 'warranty' && 'Failure Analysis Timeline (RMA Frequency)'}
            </h4>
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'sales' || activeTab === 'dealer' ? (
                     <AreaChart data={salesData}>
                        <defs>
                           <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} hide />
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px' }}
                           cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '5 5' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                        {activeTab === 'sales' && <Area type="monotone" dataKey="target" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="10 10" fill="transparent" />}
                     </AreaChart>
                  ) : activeTab === 'warranty' ? (
                    <BarChart data={failureTimeline}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} allowDecimals={false} />
                       <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px' }}
                       />
                       <Bar dataKey="cases" name="RMA Cases" fill="#f59e0b" radius={[8, 8, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  ) : (
                     <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} hide />
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                           dataKey="sales" 
                           fill={activeTab === 'production' ? '#0f172a' : '#ef4444'} 
                           radius={[8, 8, 0, 0]} 
                           maxBarSize={40} 
                        />
                     </BarChart>
                  )}
               </ResponsiveContainer>
            </div>
         </div>

         {/* Distribution / Side Analytics */}
         <div className="space-y-6">
            <div 
               onClick={() => alert(`Strategic Component Analysis:\n${activeTab === 'warranty' ? 'Failure Root Causes' : 'Inventory Types'}`)}
               className="dashboard-card cursor-pointer hover:shadow-lg transition-all active:scale-[0.99] group"
            >
               <h4 className="text-xs font-black text-white/40 uppercase mb-6 flex items-center group-hover:text-accent-400 transition-colors">
                  <PieIcon size={16} className="mr-2 text-accent-400" /> {activeTab === 'warranty' ? 'Failure Category Mix' : 'Inventory Distribution'}
               </h4>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={activeTab === 'warranty' ? failureDistribution : [
                              { name: 'Raw Material', value: data?.inventory.length || 0 },
                              { name: 'Graded', value: data?.gradedInventory.length || 0 },
                              { name: 'Finished', value: data?.finishedGoods.length || 0 },
                           ]}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {(activeTab === 'warranty' ? failureDistribution : [1,2,3]).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '10px', fontWeight: 800 }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }} />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div 
               onClick={() => alert(`Ecosystem Operational Health:\n- Invoices: ${invoicesList.length}\n- Open Service Cases: ${openComplaintsCount}\n- Status: ${openComplaintsCount > 5 ? 'STRESSED' : 'OPTIMAL'}`)}
               className="dashboard-card bg-slate-900 border-none text-white overflow-hidden relative cursor-pointer hover:bg-slate-800 transition-all active:scale-[0.99] group"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={80} />
               </div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Operational Health</p>
               <h5 className="text-xl font-black">Status: {openComplaintsCount > 5 ? 'STRESSED' : 'OPTIMAL'}</h5>
               <p className="text-[10px] text-accent-400 font-bold mt-1">Resolution Rate: {complaints.length > 0 ? `${Math.round((closedComplaintsCount / complaints.length) * 100)}%` : '100%'}</p>
               
               <div className="mt-6 flex space-x-2">
                  <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10">
                     <p className="text-[8px] font-black text-slate-500 uppercase">Invoices</p>
                     <p className="text-sm font-black">{invoicesList.length}</p>
                  </div>
                  <div className="flex-1 bg-white/10 p-3 rounded-xl border border-white/10 text-amber-500">
                     <p className="text-[8px] font-black text-slate-500 uppercase">Service</p>
                     <p className="text-sm font-black">{complaints.length}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-1 dashboard-card">
            <h4 className="text-xs font-black text-slate-400 uppercase mb-6">Top Regional Insights</h4>
             {sortedRegions.length > 0 ? (
                <div className="space-y-4">
                   {sortedRegions.map(([regName, amount], idx) => {
                      const pct = totalInvoiceRev > 0 ? Math.round((amount / totalInvoiceRev) * 100) : 0;
                      return (
                         <div 
                            key={idx} 
                            onClick={() => alert(`Regional Deep Dive: ${regName}\nShare: ${pct}%\nTotal Revenue: ${formatCurrency(amount)}`)}
                            className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 cursor-pointer active:scale-[0.98] group"
                         >
                            <div>
                               <p className="text-xs font-black text-slate-900 group-hover:text-primary-600 transition-colors">{regName}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pct > 40 ? 'HIGH VOLUME' : 'ACTIVE'}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-black text-primary-600">{formatCurrency(amount)}</p>
                               <p className="text-[9px] font-bold text-accent-500">{pct}% of total</p>
                            </div>
                         </div>
                      );
                   })}
                </div>
             ) : (
                <div className="py-12 text-center text-slate-400">
                   <Map size={28} className="mx-auto mb-2 text-slate-300" />
                   <p className="text-xs font-bold text-slate-600">No Regional Sales Recorded</p>
                   <p className="text-[10px] text-slate-400 mt-1">Invoices will automatically populate location trends.</p>
                </div>
             )}
         </div>

         <div className="lg:col-span-2 dashboard-card border-none bg-primary-600 text-white shadow-2xl shadow-primary-200 p-8 flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-5 -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-700">
               <Zap size={240} />
            </div>
            
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                  <h4 className="text-xs font-black text-primary-200 uppercase tracking-widest flex items-center">
                     <ShieldCheck size={16} className="mr-2" /> Management Decision Matrix
                  </h4>
                  <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-accent-400">
                     Systems Nominal
                  </div>
               </div>
               
               <p className="text-2xl font-black leading-tight max-w-xl">
                  {(data?.inventory || []).some((i: any) => Number(i.qty) < 50) ? (
                    <>Supply Chain Alert: <span className="text-amber-300 underline underline-offset-4 decoration-amber-300/30 font-black">{(data.inventory.find((i: any) => Number(i.qty) < 50)).name}</span> stock is low ({(data.inventory.find((i: any) => Number(i.qty) < 50)).qty} units). Recommend <span className="italic text-primary-200">restocking</span>.</>
                  ) : openComplaintsCount > 0 ? (
                    <>Quality Alert: <span className="text-red-300 underline underline-offset-4 font-black">{openComplaintsCount} open service case(s)</span> pending resolution. Shift engineering priority to service center.</>
                  ) : totalInvoiceRev > 0 ? (
                    <>Operations Nominal: Recorded total revenue at <span className="text-accent-300 underline underline-offset-4 font-black">{formatCurrency(totalInvoiceRev)}</span> across <span className="text-white">{invoicesList.length} invoice(s)</span>.</>
                  ) : (
                    <>System Ready: All ERP modules active. Ready for production logging, dealer registration, and billing.</>
                  )}
               </p>
            </div>

            <div className="mt-12 flex flex-wrap gap-8 z-10">
               <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md">
                     <IndianRupee size={22} className="text-primary-100" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-primary-200 uppercase tracking-widest leading-none mb-1">Inventory Asset Valuation</p>
                     <p className="text-xl font-black">
                        {formatCurrency((data?.inventory || []).reduce((a: number, b: any) => a + (Number(b.qty || 0) * Number(b.price || 0)), 0))}
                     </p>
                  </div>
               </div>
               <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md">
                     <Target size={22} className="text-primary-100" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-primary-200 uppercase tracking-widest leading-none mb-1">Lead Conversion Rate</p>
                     <p className="text-xl font-black">
                        {leadConversionRateStr}
                     </p>
                  </div>
               </div>

                <div className="flex-1 flex justify-end items-end space-x-3">
                   <button 
                      onClick={() => handleAction("Sync ERP", async () => { await refetch(); })}
                      className="px-6 py-3 bg-white text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-primary-50 transition-all active:scale-95 cursor-pointer border border-primary-100 flex items-center"
                   >
                      <Zap size={12} className="mr-2 text-amber-500" /> Sync ERP
                   </button>
                   <button 
                      onClick={() => handleAction("Export Matrix", () => { window.print(); })}
                      className="px-6 py-3 bg-primary-700 text-white border border-primary-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-primary-800 transition-all active:scale-95 cursor-pointer flex items-center"
                   >
                      <FileText size={14} className="mr-2" /> Export Matrix
                   </button>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};
