import React from 'react';
import { 
  Map, Globe, TrendingUp, Compass, 
  MapPin, Activity, Zap, ArrowUpRight,
  Database, BarChart3, PieChart as PieIcon,
  Navigation, Users, ShieldCheck, Box,
  Layers, Filter, Search, MoreHorizontal
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn, formatCurrency } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ComposedChart, Line, Area
} from 'recharts';

export const RegionalSales: React.FC = () => {
  const { data, loading } = useERPData();

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <Globe className="animate-spin text-accent-500 mb-6" size={48} />
      <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Mapping Global Sales Flux...</span>
    </div>
  );

  const dealers = data?.dealers || [];
  const invoices = data?.invoices || [];
  const warranty = data?.warranty || [];
  
  // Aggregate Regional Data
  const regions: string[] = Array.from(new Set(dealers.map((d: any) => d.region))).filter(Boolean) as string[];
  const states: string[] = Array.from(new Set(dealers.map((d: any) => d.state))).filter(Boolean) as string[];
  const cities: string[] = Array.from(new Set(dealers.map((d: any) => d.city))).filter(Boolean) as string[];

  const regionData = regions.map(region => {
    const regionalDealers = dealers.filter((d: any) => d.region === region);
    const regionalInvoices = invoices.filter((inv: any) => 
       regionalDealers.some(d => d.id === inv.dealerId || d.company === inv.dealerId)
    );
    const sales = regionalInvoices.reduce((acc: number, inv: any) => acc + inv.total, 0);
    const dealerCount = regionalDealers.length;
    const warrantyCount = warranty.filter((w: any) => 
       regionalDealers.some(d => d.id === w.dealerId || d.company === w.dealerId)
    ).length;

    return { name: region, sales, dealers: dealerCount, warranty: warrantyCount };
  }).sort((a, b) => b.sales - a.sales);

  const stateData = states.map(state => {
    const stateDealers = dealers.filter((d: any) => d.state === state);
    const stateInvoices = invoices.filter((inv: any) => 
       stateDealers.some(d => d.id === inv.dealerId || d.company === inv.dealerId)
    );
    const sales = stateInvoices.reduce((acc: number, inv: any) => acc + inv.total, 0);
    const dealerDensity = stateDealers.length;
    const warrantyDensity = warranty.filter((w: any) => 
       stateDealers.some(d => d.id === w.dealerId || d.company === w.dealerId)
    ).length;
    return { name: state, sales, dealerDensity, warrantyDensity };
  }).sort((a, b) => b.sales - a.sales);

  const cityData = cities.map(city => {
    const cityDealers = dealers.filter((d: any) => d.city === city);
    const cityInvoices = invoices.filter((inv: any) => 
       cityDealers.some(d => d.id === inv.dealerId || d.company === inv.dealerId)
    );
    const sales = cityInvoices.reduce((acc: number, inv: any) => acc + inv.total, 0);
    return { name: city, sales };
  }).sort((a, b) => b.sales - a.sales).slice(0, 10);

  const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

  return (
    <div className="space-y-12 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Geospatial Intelligence</h2>
          <div className="flex items-center mt-2 space-x-4">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
               <Navigation size={14} className="mr-2 text-accent-600" /> Multi-Region Distribution Flow
             </div>
             <span className="h-1 w-1 rounded-full bg-slate-300"></span>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
               Market Clusters: {cities.length}
             </p>
          </div>
        </div>
      </div>

      {/* Strategic Density Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         {[
            { label: 'Market Nodes', value: dealers.length, icon: Users, color: 'text-accent-500', bColor: 'bg-accent-500/10', note: 'Dealers Active' },
            { label: 'Cluster Regions', value: regions.length, icon: Globe, color: 'text-blue-500', bColor: 'bg-blue-500/10', note: 'Cross-Territory' },
            { label: 'Warranty Footprint', value: warranty.length, icon: ShieldCheck, color: 'text-emerald-500', bColor: 'bg-emerald-500/10', note: 'Active Protect' },
            { label: 'Total Volume', value: formatCurrency(invoices.reduce((a, b) => a + b.total, 0)), icon: Zap, color: 'text-amber-500', bColor: 'bg-amber-500/10', note: 'Gross Revenue' },
         ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer shadow-xl shadow-slate-200/50">
               <div className={cn("absolute -right-4 -top-4 opacity-[0.05] group-hover:opacity-20 transition-all", stat.color)}>
                  <stat.icon size={120} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{stat.label}</p>
               <p className="text-3xl font-black text-slate-900 italic tracking-tighter mb-4">{stat.value}</p>
               <span className={cn("px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest", stat.color, stat.bColor)}>
                  {stat.note}
               </span>
            </div>
         ))}
      </div>

      {/* High Fidelity Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Regional Performance Matrix */}
         <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center mb-12">
               <BarChart3 size={22} className="mr-4 text-accent-600" /> Regional Revenue Matrix
            </h3>
            <div className="h-[400px] w-full font-mono">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} layout="vertical" margin={{ left: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                     <XAxis type="number" hide />
                     <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        fontWeight={900} 
                        axisLine={false} 
                        tickLine={false} 
                        width={90}
                        tickFormatter={(val) => val.toUpperCase()}
                     />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '11px', fontWeight: 900, color: '#0f172a' }}
                        cursor={{ fill: '#f8fafc' }}
                     />
                     <Bar dataKey="sales" fill="#0891b2" radius={[0, 8, 8, 0]} barSize={35} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Density Overlap Analysis */}
         <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center mb-12">
               <Activity size={22} className="mr-4 text-blue-600" /> Market Density Vector
            </h3>
            <div className="h-[400px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={regionData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                     <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        fontWeight={900} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => val.toUpperCase()}
                     />
                     <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} yAxisId="left" />
                     <YAxis orientation="right" stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} yAxisId="right" />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', fontWeight: 900, color: '#0f172a' }}
                     />
                     <Bar yAxisId="left" dataKey="dealers" name="Dealer Core" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={25} />
                     <Line yAxisId="right" type="monotone" dataKey="warranty" name="Warranty Density" stroke="#dc2626" strokeWidth={3} dot={{ fill: '#dc2626', r: 5 }} />
                  </ComposedChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Node Level Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* State Matrix */}
         <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">State-Level Scrutiny</h3>
               <Layers size={20} className="text-slate-400" />
            </div>
            <div className="overflow-x-auto font-mono">
               <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-200">
                     <tr>
                        <th className="px-10 py-6">State Entity</th>
                        <th className="px-10 py-6">Density (D/W)</th>
                        <th className="px-10 py-6 text-right">Revenue Value</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {stateData.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all group duration-300">
                           <td className="px-10 py-8">
                              <div className="text-[13px] font-black text-slate-900 uppercase tracking-widest">{s.name}</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase mt-2 italic flex items-center">
                                 <div className="w-1.5 h-1.5 rounded-full bg-accent-600 mr-2"></div> ACTIVE NODE
                              </div>
                           </td>
                           <td className="px-10 py-8">
                              <div className="flex items-center space-x-6 text-[11px] font-black">
                                 <div className="flex flex-col">
                                    <span className="text-blue-600 italic">{s.dealerDensity}D</span>
                                    <span className="text-[8px] text-slate-400 uppercase">Dealers</span>
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-emerald-600 italic">{s.warrantyDensity}W</span>
                                    <span className="text-[8px] text-slate-400 uppercase">Warranty</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-10 py-8 text-right">
                              <p className="text-xl font-black text-slate-900 italic tracking-tighter">{formatCurrency(s.sales)}</p>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* City Hub Matrix */}
         <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50 flex flex-col">
            <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Top Cluster Hubs</h3>
               <Compass size={20} className="text-slate-400" />
            </div>
            <div className="p-10 flex-1 space-y-6">
               {cityData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:border-accent-200 transition-all group hover:scale-[1.02] shadow-sm">
                     <div className="flex items-center space-x-6">
                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-xl italic text-accent-600 shadow-md group-hover:bg-accent-600 group-hover:text-white transition-all duration-500">
                           #{i+1}
                        </div>
                        <div>
                           <p className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">{c.name}</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Strategic Cluster Point</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 leading-none">Cluster Volume</p>
                        <p className="text-xl font-black text-slate-900 italic tracking-tighter">{formatCurrency(c.sales)}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};
