import React from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Package, 
  Activity, ShieldOff, CreditCard, Box,
  ArrowUpRight, ArrowDownRight, Zap, PieChart as PieIcon,
  ShoppingBag, Trash2, CheckCircle2, AlertCircle,
  BarChart, Target, Globe, Filter
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn, formatCurrency } from '../lib/utils';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export const ManagementKPI: React.FC = () => {
  const { data, loading } = useERPData();

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <Target className="animate-spin text-accent-500 mb-6" size={48} />
      <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Synthesizing Business Intelligence...</span>
    </div>
  );

  // Advanced KPI Calculations
  const totalRevenue = (data?.invoices || []).reduce((acc: number, b: any) => acc + b.total, 0);
  const inventoryValue = (data?.inventory || []).reduce((acc: number, i: any) => acc + (i.qty * i.price), 0);
  const outstandingAmount = (data?.invoices || []).filter((b: any) => b.status === 'UNPAID').reduce((acc: number, b: any) => acc + b.total, 0);
  
  const totalProduction = (data?.productionHistory || []).reduce((acc: number, p: any) => acc + p.qty, 0);
  const productionEfficiency = 96.2; // Targeted KPI
  
  const totalWarranties = data?.warranty?.length || 0;
  const complaints = data?.complaints || [];
  const failureRate = totalProduction > 0 ? ((complaints.length / totalProduction) * 100).toFixed(2) : '0';

  const pendingService = complaints.filter((s: any) => s.status === 'OPEN').length;

  // Strategic Insights
  const fastMoving = [
    { name: '72V Lithium Core', sales: 1240, growth: '+22%', trend: 'up' },
    { name: 'ARC Smart BMS', sales: 980, growth: '+15%', trend: 'up' },
    { name: '48V Energy Node', sales: 750, growth: '+12%', trend: 'up' }
  ];

  const deadStock = (data?.inventory || [])
    .filter((i: any) => i.qty > i.minStock * 4)
    .slice(0, 3)
    .map((i: any) => ({ name: i.name, value: i.qty * i.price, age: '180+ Days' }));

  const revenueData = [
    { name: 'Week 1', rev: 4200000, target: 4000000 },
    { name: 'Week 2', rev: 5500000, target: 4000000 },
    { name: 'Week 3', rev: 4100000, target: 4000000 },
    { name: 'Week 4', rev: 6345000, target: 4000000 },
  ];

  const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

  return (
    <div className="space-y-12 pb-20 transition-all duration-500">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Executive Intelligence</h2>
          <div className="flex items-center mt-2 space-x-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
               <Target size={14} className="mr-2 text-primary-600" /> Strategic Revenue & Asset Scrutiny
             </p>
             <span className="h-1 w-1 rounded-full bg-slate-200"></span>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">
               Live Performance: Optimized
             </p>
          </div>
        </div>
      </div>

      {/* Hero Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Revenue (MTD)', value: formatCurrency(totalRevenue), sub: '+24.6% vs Forecast', icon: DollarSign, color: 'text-primary-600', bColor: 'bg-primary-50' },
          { label: 'Asset Valuation', value: formatCurrency(inventoryValue), sub: 'Inventory Turn: 4.2x', icon: Box, color: 'text-blue-600', bColor: 'bg-blue-50' },
          { label: 'O/S Receivables', value: formatCurrency(outstandingAmount), sub: 'DSO: 14 Days', icon: CreditCard, color: 'text-red-600', bColor: 'bg-red-50' },
          { label: 'Production Yield', value: `${productionEfficiency}%`, sub: 'Peak Efficiency', icon: Activity, color: 'text-emerald-600', bColor: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer shadow-xl shadow-slate-200/50">
             <div className={cn("absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-all", stat.color)}>
                <stat.icon size={120} />
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">{stat.label}</p>
             <p className="text-3xl font-black text-slate-900 italic tracking-tighter mb-4 truncate">{stat.value}</p>
             <span className={cn("px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest", stat.color, stat.bColor)}>
                {stat.sub}
             </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Revenue Velocity Chart */}
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
           <div className="flex justify-between items-center mb-12">
              <div>
                 <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center">
                    <TrendingUp size={22} className="mr-4 text-primary-600" /> Revenue Velocity Stream
                 </h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3 underline decoration-primary-600 decoration-2 underline-offset-4">Performance vs Quota Mapping</p>
              </div>
           </div>

           <div className="h-[400px] w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  fontWeight={900} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/100000}L`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', fontSize: '11px', fontWeight: 900, color: '#0f172a', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0891b2' }}
                />
                <Area type="monotone" dataKey="rev" stroke="#0891b2" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                <Line type="monotone" dataKey="target" stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Tactical Risk Column */}
        <div className="space-y-8">
           {/* Warranty Failure Alert Card */}
           <div className="bg-white p-10 rounded-[3rem] border border-red-100 relative overflow-hidden group shadow-2xl shadow-red-100/20">
              <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
                 <ShieldOff size={160} className="text-red-500" />
              </div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-6 animate-pulse italic">Critical Risk Factor</p>
              <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">Failure Rate</h3>
              <div className="flex items-end gap-3 mb-8">
                 <p className="text-6xl font-black text-red-500 italic tracking-tighter">{failureRate}%</p>
                 <span className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">THRESHOLD: 1.5%</span>
              </div>
              <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                 <div className="h-full bg-red-500 shadow-[0_0_10px_#ef4444]" style={{ width: `${Math.min(100, Number(failureRate) * 10)}%` }}></div>
              </div>
           </div>

           {/* Service Latency Hub */}
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
              <div className="flex justify-between items-start mb-8">
                 <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    <Activity size={28} />
                 </div>
                 <div className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">
                    Live Tickets
                 </div>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Service Case Scrutiny</p>
              <p className="text-5xl font-black text-slate-900 italic tracking-tighter underline decoration-blue-500 decoration-4">{pendingService}</p>
              <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Average Resolution: 72 Hours</p>
           </div>
        </div>
      </div>

      {/* Strategic Asset Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 font-mono">
        {/* Fast Moving Inventory */}
        <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/40">
           <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Alpha Velocity Assets</h3>
              <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl border border-primary-100">
                 <TrendingUp size={22} />
              </div>
           </div>
           <div className="p-10 space-y-6">
              {fastMoving.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:border-primary-200 transition-all">
                   <div className="flex items-center space-x-6">
                      <div className="h-14 w-14 bg-white text-primary-600 rounded-2xl flex items-center justify-center font-black italic text-xl border border-slate-200 shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-all duration-500">#{i+1}</div>
                      <div>
                         <p className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">{item.name}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase mt-3 tracking-widest italic">Velocity Coefficient: Optimal</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">{item.sales}</p>
                      <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest block mt-2">{item.growth}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Inventory Liquidity Table */}
        <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/40 flex flex-col">
           <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Liquidity Risk Matrix</h3>
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                 <Trash2 size={22} />
              </div>
           </div>
           <div className="p-10 flex-1 space-y-6">
              {deadStock.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:border-red-200 transition-all">
                   <div className="flex items-center space-x-6">
                      <div className="h-14 w-14 bg-white text-red-500 rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm">
                         <Box size={20} />
                      </div>
                      <div>
                         <p className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">{item.name}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase mt-3 tracking-widest italic">Retention: <span className="text-red-500">{item.age}</span></p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-2xl font-black text-red-500 italic tracking-tighter leading-none">{formatCurrency(item.value)}</p>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-2">Evaluation Exposure</span>
                   </div>
                </div>
              ))}
              {deadStock.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                   <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 mb-6 font-black text-emerald-600 italic text-3xl">OK</div>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">All Artifacts Meeting Liquidity Thresholds</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
