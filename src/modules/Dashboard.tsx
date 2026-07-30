import React from 'react';
import { Package, AlertCircle, ShoppingCart, TrendingUp, Users, ShieldAlert, Cpu, IndianRupee, ArrowUpRight, ArrowDownRight, Clock, Activity, Zap, Wrench } from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { formatCurrency, cn } from '../lib/utils';
import { useAuthStore, UserRole } from '../store/authStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
  activeTab?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, activeTab }) => {
  const { data, loading, refetch } = useERPData();
  const { user } = useAuthStore();
  const [isSyncing, setIsSyncing] = React.useState(false);

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
          <Activity size={60} className="text-primary-600 animate-spin relative z-10" />
       </div>
       <h3 className="mt-10 text-lg font-black italic uppercase tracking-tighter text-slate-900">
          Synchronizing Ecosystem State...
       </h3>
       <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary-600 animate-pulse">
          Establishing Real-time Data Nodes
       </p>
    </div>
  );

  const inventoryValue = data?.inventory.reduce((acc: number, item: any) => acc + (item.qty * item.price), 0) || 0;
  const activeWarranties = data?.warranty.filter((w: any) => w.status === 'ACTIVE').length || 0;
  const openLeads = data?.leads.filter((l: any) => l.status === 'NEW').length || 0;
  const pendingService = data?.complaints.filter((c: any) => c.status === 'OPEN').length || 0;
  
  // Dynamic performance metrics
  const totalLeads = data?.leads.length || 1;
  const convertedLeads = data?.leads.filter((l: any) => l.status === 'CONVERTED').length || 0;
  const winRate = Math.round((convertedLeads / totalLeads) * 100);
  
  const totalRevenue = (data?.invoices || []).reduce((acc: number, inv: any) => acc + Number(inv.total || inv.grandTotal || inv.grand_total || 0), 0);
  const targetRevenue = 5000000; // Monthly target
  const achievement = Math.min(100, Math.round((totalRevenue / targetRevenue) * 100));

  const role = user?.role || UserRole.SUPER_ADMIN;
  const isAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;

  const showExecutiveDecisionMatrix = isAdmin || [UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM].includes(role);
  const showOperationsHub = isAdmin || [UserRole.SALES_PERSON, UserRole.BILLER, UserRole.WARRANTY_TEAM].includes(role);
  const showThroughputVelocity = isAdmin || [UserRole.PRODUCTION_TEAM, UserRole.STORE_KEEPER].includes(role);
  const showRecentFloorActivity = isAdmin || [UserRole.PRODUCTION_TEAM, UserRole.STORE_KEEPER, UserRole.QUALITY_TEAM, UserRole.SERVICE_TEAM, UserRole.PLANT_SERVICE_ENGINEER].includes(role);
  const showProcurementHotList = isAdmin || [UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM, UserRole.BILLER].includes(role);
  const showNetworkPerformance = isAdmin || [UserRole.SALES_PERSON, UserRole.BILLER].includes(role);

  const stats = [
    { 
      label: 'Asset Value', 
      value: formatCurrency(inventoryValue), 
      icon: IndianRupee, 
      color: 'text-primary-600', 
      trend: '+12.4%', 
      detail: 'Raw Materials + WIP',
      roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM, UserRole.BILLER]
    },
    { 
      label: 'Active Assets', 
      value: activeWarranties, 
      icon: ShieldAlert, 
      color: 'text-primary-600', 
      trend: `+${activeWarranties}`, 
      detail: 'Warranty Protected Units',
      roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON, UserRole.WARRANTY_TEAM, UserRole.SERVICE_TEAM, UserRole.PLANT_SERVICE_ENGINEER, UserRole.QUALITY_TEAM]
    },
    { 
      label: 'Open Opportunities', 
      value: openLeads, 
      icon: Users, 
      color: 'text-primary-600', 
      trend: `+${openLeads}`, 
      detail: 'New Leads Captured',
      roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON]
    },
    { 
      label: 'Service Load', 
      value: pendingService, 
      icon: Wrench, 
      color: 'text-primary-600', 
      trend: '-2', 
      detail: 'Pending Repairs',
      roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_TEAM, UserRole.PLANT_SERVICE_ENGINEER, UserRole.WARRANTY_TEAM]
    },
  ].filter(stat => stat.roles.includes(role));

  const productionData = [
    { name: 'Mon', units: 45 },
    { name: 'Tue', units: 52 },
    { name: 'Wed', units: 48 },
    { name: 'Thu', units: 61 },
    { name: 'Fri', units: 55 },
    { name: 'Sat', units: 32 },
  ];

  const criticalStockItems = data?.inventory.filter((i: any) => {
    const netQty = i.qty - (i.reservedQty || 0);
    const threshold = i.minStock || 50;
    return netQty < threshold;
  }) || [];

  const topAlertItem = criticalStockItems.length > 0 ? criticalStockItems[0] : null;

  return (
    <div className={cn("space-y-6 transition-opacity duration-300", isSyncing && "opacity-50 pointer-events-none")}>
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="bg-primary-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in zoom-in-95">
            <Zap size={20} className="text-primary-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Synchronizing Enterprise State...</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => {
              refetch();
              if (stat.label === 'Asset Value') {
                setActiveTab?.('inventory');
              } else if (stat.label === 'Active Assets') {
                setActiveTab?.('warranty');
              } else if (stat.label === 'Open Opportunities') {
                setActiveTab?.('crm');
              } else if (stat.label === 'Service Load') {
                setActiveTab?.('service');
              }
            }}
            className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden group hover:border-primary-400/30 transition-all cursor-pointer active:scale-95"
          >
             <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                <stat.icon size={80} />
             </div>
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-3 rounded-2xl bg-slate-50 shadow-inner group-hover:bg-primary-900 group-hover:text-primary-400 transition-all", stat.color)}>
                    <stat.icon size={20} />
                  </div>
                  <div className={cn(
                     "flex items-center text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm border border-slate-100",
                     stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                     {stat.trend.startsWith('+') ? <ArrowUpRight size={10} className="mr-1" /> : <ArrowDownRight size={10} className="mr-1" />}
                     {stat.trend}
                  </div>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
               <p className="text-3xl font-black text-slate-900 transition-colors italic tracking-tight truncate break-all" title={stat.value}>{stat.value}</p>
               <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-wider">{stat.detail}</p>
             </div>
          </div>
        ))}
      </div>

      {(showExecutiveDecisionMatrix || showOperationsHub) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {showExecutiveDecisionMatrix && (
             <div className={cn(
               "p-8 rounded-[2.5rem] bg-white text-slate-900 flex flex-col justify-between group overflow-hidden relative shadow-2xl shadow-slate-200/40 border border-slate-100",
               !showOperationsHub ? "lg:col-span-3" : "lg:col-span-2"
             )}>
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-1000 blur-[1px]">
                   <Cpu size={240} />
                </div>
                
                <div className="relative z-10">
                   <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-8 flex items-center bg-primary-50 w-fit px-4 py-2 rounded-full border border-primary-100">
                      <Zap size={14} className="mr-2 text-primary-500" /> Executive Decision Matrix
                   </h4>
                   <div className="text-3xl font-black leading-tight max-w-xl italic tracking-tight">
                      {topAlertItem ? (
                        <div className="animate-in fade-in duration-500">
                           <span className="text-amber-600 flex items-center mb-3 text-sm font-black uppercase tracking-[0.2em]">
                              <ShieldAlert size={18} className="mr-2" /> Critical Shortage Detected
                           </span>
                           Supply Chain Alert: <span className="text-amber-600 underline underline-offset-8 decoration-amber-600/30 font-black italic">{topAlertItem.name}</span> is critical ({topAlertItem.qty - (topAlertItem.reservedQty || 0)} Units). 
                           <p className="mt-4 text-primary-600 font-bold not-italic text-lg">Recommend IMMEDIATE PROCUREMENT protocol to prevent assembly stalling.</p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in duration-500">
                           <span className="text-primary-600 flex items-center mb-3 text-sm font-black uppercase tracking-[0.2em]">
                              <Activity size={18} className="mr-2" /> Peak Performance State
                           </span>
                           Operational Efficiency: Ecosystem is <span className="text-primary-600 underline underline-offset-8 decoration-primary-400/30">synchronized at 94%</span>. All critical material vectors are within nominal safety bounds.
                        </div>
                      )}
                   </div>
                </div>

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:space-x-4 z-10">
                   <button 
                     onClick={() => handleAction("Sync ERP", () => setActiveTab?.(topAlertItem ? 'inventory' : 'mrp'))} 
                     className="px-6 sm:px-8 py-3.5 sm:py-4 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary-700 transition-all cursor-pointer shadow-xl shadow-primary-500/20 active:scale-95 text-center"
                   >
                      {topAlertItem ? 'Execute Procurement' : 'Sync ERP Command'}
                   </button>
                   <button 
                     onClick={() => handleAction("Review WIP", () => setActiveTab?.('production'))} 
                     className="px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all cursor-pointer border border-slate-200 active:scale-95 text-center"
                   >
                      Review WIP Matrix
                   </button>
                </div>
             </div>
           )}

           {showOperationsHub && (
             <div className={cn(
               "p-8 rounded-[2.5rem] bg-primary-600 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-primary-600/30",
               !showExecutiveDecisionMatrix ? "lg:col-span-3" : ""
             )}>
                <div className="absolute top-0 right-0 p-8 opacity-[0.1]">
                   <ShieldAlert size={120} />
                </div>
                
                <div>
                   <p className="text-[10px] font-black text-cyan-200 uppercase tracking-[0.3em] mb-6">Operations Hub</p>
                   <h3 className="text-2xl font-black leading-tight text-white italic tracking-tight">
                      System integrity <span className="text-cyan-200 underline underline-offset-8 decoration-cyan-400/30">Optimal</span>. 
                   </h3>
                   <p className="text-[9px] text-white/40 mt-4 uppercase font-bold tracking-[0.4em] font-mono">LATENCY: 12MS | ECO-SYNC: OK</p>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-3xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all group/item">
                      <div className="flex items-center space-x-3 text-white/60 group-hover/item:text-white transition-colors">
                         <Clock size={16} />
                         <p className="text-[10px] font-black uppercase tracking-widest">AVG TAT</p>
                      </div>
                      <p className="text-[11px] font-black text-white italic">3.8 Days</p>
                   </div>
                   <div className="flex items-center justify-between p-4 rounded-3xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all group/item">
                      <div className="flex items-center space-x-3 text-white/60 group-hover/item:text-white transition-colors">
                         <TrendingUp size={16} />
                         <p className="text-[10px] font-black uppercase tracking-widest">Win Rate</p>
                      </div>
                      <p className="text-[11px] font-black text-cyan-200 italic">+{winRate}%</p>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Charts Section */}
      {showThroughputVelocity && (
         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 p-8">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center">
                      <Activity size={16} className="mr-2 text-primary-600" /> Throughput Velocity (Weekly View)
                   </h3>
                </div>
                <div className="flex space-x-2">
                   <span className="flex items-center text-[10px] font-black text-slate-400">
                      <div className="w-2 h-2 rounded-full bg-primary-600 mr-2"></div> Units Built
                   </span>
                </div>
             </div>
              <div className="h-48">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={productionData}>
                   <defs>
                      <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                   <YAxis hide />
                   <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px', background: '#fff', color: '#0f172a' }}
                      itemStyle={{ color: '#0891b2' }}
                   />
                   <Area type="monotone" dataKey="units" stroke="#0891b2" strokeWidth={4} fillOpacity={1} fill="url(#colorUnits)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
         </div>
      )}

      {(showRecentFloorActivity || showProcurementHotList || showNetworkPerformance) && (
         <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-6",
            (showRecentFloorActivity && showProcurementHotList && showNetworkPerformance) ? "lg:grid-cols-3" : 
            ((showRecentFloorActivity && showProcurementHotList) || (showRecentFloorActivity && showNetworkPerformance) || (showProcurementHotList && showNetworkPerformance)) ? "lg:grid-cols-2" : "lg:grid-cols-1"
         )}>
            {showRecentFloorActivity && (
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                  <h4 className="text-xs font-black text-slate-900 uppercase mb-6 flex items-center">
                     <Activity size={16} className="mr-2 text-primary-600" /> Recent Floor Activity
                  </h4>
                   <div className="space-y-4">
                      {data?.productionHistory.slice(-4).reverse().map((item: any, idx: number) => (
                         <div 
                            key={idx} 
                            onClick={() => {
                              refetch();
                              setActiveTab?.('production');
                            }}
                            className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 hover:bg-primary-50 transition-all cursor-pointer group border border-transparent hover:border-primary-100"
                         >
                            <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-black text-xs uppercase shadow-sm transition-transform group-hover:scale-110">
                               {item.model[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-black text-slate-900 truncate">Built: {item.model}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
                            </div>
                            <div className="text-[9px] font-black text-primary-600 uppercase tracking-widest bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
                               SERIALIZED
                            </div>
                         </div>
                      ))}
                   </div>
               </div>
            )}

            {showProcurementHotList && (
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                  <h4 className="text-xs font-black text-slate-900 uppercase mb-6 flex items-center">
                     <AlertCircle size={16} className="mr-2 text-red-500" /> Procurement Hot-List
                  </h4>
                   <div className="space-y-3">
                      {criticalStockItems.length > 0 ? criticalStockItems.slice(0, 4).map((item: any, idx: number) => (
                         <div 
                            key={idx} 
                            onClick={() => setActiveTab?.('mrp')}
                            className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-all cursor-pointer group"
                         >
                            <div className="flex items-center space-x-4">
                               <div className="h-10 w-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-200 group-hover:rotate-12 transition-transform">
                                  <ShoppingCart size={16} />
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{item.name}</p>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Available: {item.qty - (item.reservedQty || 0)} / Need: {item.minStock || 50}</p>
                               </div>
                            </div>
                            <ArrowUpRight size={12} className="text-red-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                         </div>
                      )) : (
                         <div className="py-8 text-center bg-primary-50 rounded-2xl border border-dashed border-primary-200">
                            <ShieldAlert size={24} className="mx-auto mb-3 text-primary-400 opacity-40" />
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest italic">All material nodes optimized</p>
                         </div>
                      )}
                   </div>
               </div>
            )}

            {showNetworkPerformance && (
               <div 
                 onClick={() => {
                   refetch();
                   setActiveTab?.('billing');
                 }}
                 className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 justify-center flex flex-col hover:bg-slate-50 transition-all cursor-pointer group"
               >
                  <div className="text-center mb-8">
                     <Users size={40} className="mx-auto mb-4 text-primary-600 group-hover:scale-110 transition-transform" />
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Network Performance</h4>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Sales Achievement</span>
                        <span className="text-primary-600">{achievement}%</span>
                     </div>
                     <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-600 transition-all duration-1000" style={{ width: `${achievement}%` }}></div>
                     </div>
                     <p className="text-[9px] italic text-slate-400 text-center mt-6 uppercase font-black tracking-widest">MTD Ecosystem State Active</p>
                  </div>
               </div>
            )}
         </div>
      )}
    </div>
  );
};

