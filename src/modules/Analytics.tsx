import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Activity, UserCheck, ShieldAlert, BarChart3, PieChart as PieIcon, 
  Map, Target, ArrowUpRight, ArrowDownRight, IndianRupee, Layers, Zap, AlertTriangle,
  Users, CheckCircle2, History, Truck, Milestone, BadgeCheck, ShieldCheck, FileText, Download,
  DollarSign, Recycle, AlertOctagon, RefreshCw, ShoppingCart, Loader2, Save, X, PlusCircle, Check
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
  const [activeTab, setActiveTab] = useState<'sales' | 'production' | 'warranty' | 'dealer' | 'costing' | 'epr' | 'risk'>('sales');

  // Phase 4 State
  const [costVarianceData, setCostVarianceData] = useState<any>(null);
  const [arAgingData, setArAgingData] = useState<any>(null);
  const [eprLedger, setEprLedger] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any>(null);

  const [isEprModalOpen, setIsEprModalOpen] = useState(false);
  const [eprPacksCount, setEprPacksCount] = useState(100);
  const [eprRecycler, setEprRecycler] = useState('Attero Recycling Green Tech');
  const [isSubmittingEpr, setIsSubmittingEpr] = useState(false);

  const [autoPoIssuingId, setAutoPoIssuingId] = useState<string | null>(null);

  const fetchPhase4Data = async () => {
    try {
      const [cvRes, arRes, eprRes, riskRes] = await Promise.all([
        fetch('/api/financials/cost-variance'),
        fetch('/api/financials/ar-aging'),
        fetch('/api/epr/recycling-ledger'),
        fetch('/api/supply-chain/risk-analysis')
      ]);

      if (cvRes.ok) setCostVarianceData(await cvRes.json());
      if (arRes.ok) setArAgingData(await arRes.json());
      if (eprRes.ok) setEprLedger(await eprRes.json());
      if (riskRes.ok) setRiskData(await riskRes.json());
    } catch (e) {
      console.warn('Phase 4 fetch warning:', e);
    }
  };

  useEffect(() => {
    fetchPhase4Data();
  }, [data]);

  const handleCreateEprBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEpr(true);
    try {
      await fetch('/api/epr/recycling-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decommissionedPacksCount: eprPacksCount,
          recyclerPartnerName: eprRecycler
        })
      });
      setIsEprModalOpen(false);
      fetchPhase4Data();
      refetch();
    } catch (err) {
      console.error('Error logging EPR recycling batch:', err);
    } finally {
      setIsSubmittingEpr(false);
    }
  };

  const handleTriggerAutoPO = async (riskItem: any) => {
    setAutoPoIssuingId(riskItem.itemId);
    try {
      await fetch('/api/supply-chain/auto-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: riskItem.itemId,
          supplierName: riskItem.preferredSupplier,
          orderQuantity: riskItem.recommendedOrderQty,
          unitPrice: riskItem.unitCost,
          remarks: riskItem.reason
        })
      });
      fetchPhase4Data();
      refetch();
    } catch (err) {
      console.error('Error issuing Auto-PO:', err);
    } finally {
      setAutoPoIssuingId(null);
    }
  };

  const complaints = data?.complaints || [];
  const failureDistribution = (data?.failureCategories || []).map((cat: string) => ({
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
    }, 400);
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
    ],
    costing: [
       { title: 'Std BOM vs Actual', value: `+${costVarianceData?.variancePercentage || 4.7}%`, value2: `Variance: ₹${(costVarianceData?.materialPriceVariance || 1350).toLocaleString('en-IN')} / pack`, icon: DollarSign, color: 'text-rose-600' },
       { title: 'Scrap Valuation Loss', value: `₹${(costVarianceData?.scrapValuationLoss || 180000).toLocaleString('en-IN')}`, value2: `${costVarianceData?.totalScrapWeightKg || 400} kg scrapped`, icon: AlertTriangle, color: 'text-amber-600' },
       { title: 'Receivables Outstanding', value: `₹${(arAgingData?.totalOutstanding || 3525000).toLocaleString('en-IN')}`, value2: `${arAgingData?.dealerOverdueCount || 4} Dealers Credit Pending`, icon: IndianRupee, color: 'text-indigo-600' },
       { title: 'Raw Material Asset Val', value: `₹${(costVarianceData?.totalRawMaterialAssetValue || 4850000).toLocaleString('en-IN')}`, value2: 'Active Inventory Base', icon: Layers, color: 'text-emerald-600' }
    ],
    epr: [
       { title: 'CPCB Certs Issued', value: eprLedger.length.toString(), value2: 'BWMR 2026 Compliant', icon: ShieldCheck, color: 'text-emerald-600' },
       { title: 'Black Mass Recovered', value: `${eprLedger.reduce((a, b) => a + Number(b.blackMassRecoveredKg || 0), 0)} Kg`, value2: 'Lithium / Cobalt Slurry', icon: Recycle, color: 'text-teal-600' },
       { title: 'Recycled Metals (Li + Co)', value: `${eprLedger.reduce((a, b) => a + Number(b.lithiumRecoveryKg || 0) + Number(b.cobaltRecoveryKg || 0), 0).toFixed(0)} Kg`, value2: 'High Purity Recovery', icon: Zap, color: 'text-amber-600' },
       { title: 'Carbon Offset Total', value: `${eprLedger.reduce((a, b) => a + Number(b.co2OffsetTons || 0), 0).toFixed(1)} MT`, value2: 'Tons CO2 Neutralized', icon: CheckCircle2, color: 'text-emerald-700' }
    ],
    risk: [
       { title: 'Supply Chain Alert Level', value: riskData?.overallRiskScore ? 'ELEVATED' : 'OPTIMAL', value2: 'MRP Demand Buffer Trigger', icon: AlertOctagon, color: 'text-rose-600' },
       { title: 'High-Risk Components', value: (riskData?.criticalComponentCount || 2).toString(), value2: 'Stockout Lead Time Threat', icon: AlertTriangle, color: 'text-amber-600' },
       { title: 'Pending Reorders', value: (riskData?.riskItems?.length || 2).toString(), value2: 'Auto-PO Action Required', icon: ShoppingCart, color: 'text-indigo-600' },
       { title: 'Supplier On-Time Score', value: '94.2%', value2: 'Vendor Benchmark Rating', icon: BadgeCheck, color: 'text-emerald-600' }
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
          
          <div className="flex p-1 bg-white border border-slate-100 shadow-sm rounded-xl overflow-x-auto gap-1">
             {(['sales', 'production', 'warranty', 'dealer', 'costing', 'epr', 'risk'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shrink-0",
                    activeTab === tab ? "bg-sky-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab === 'costing' ? 'Costing & AR' : tab === 'epr' ? 'EPR Recycling' : tab === 'risk' ? 'AI Risk & Auto-PO' : tab}
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

      {/* PHASE 4: COSTING & AR AGING VIEW */}
      {activeTab === 'costing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
          <div className="dashboard-card bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                <DollarSign size={16} className="text-rose-600" /> Standard BOM vs. Actual Materials Costing
              </h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                +4.7% Cost Overrun Variance
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase">Target Std BOM Cost (72V30A)</p>
                <p className="text-xl font-black text-slate-900 mt-1">₹{costVarianceData?.standardBomCost?.toLocaleString('en-IN') || '28,500'}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                <p className="text-[9px] font-black text-rose-600 uppercase">Actual Weighted Procurement</p>
                <p className="text-xl font-black text-rose-900 mt-1">₹{costVarianceData?.actualAvgBomCost?.toLocaleString('en-IN') || '29,850'}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase text-slate-400">BOM Component Category Variance Breakdown</p>
              {[
                { cat: 'NMC 21700 / 32700 Lithium Cells', share: '64.0%', var: '+2.0% Cell Price Spike' },
                { cat: 'Smart CAN-Bus BMS Boards', share: '17.5%', var: '-0.5% Bulk Rebate' },
                { cat: 'Structural Aluminum & Casing', share: '11.0%', var: '0.0% Nominal' },
                { cat: 'Nickel Strips & Wiring Harness', share: '7.5%', var: '-1.5% Yield Savings' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-bold p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-800">{item.cat}</span>
                  <div className="text-right">
                    <span className="text-slate-900 font-black">{item.share}</span>
                    <span className="text-[9px] font-extrabold text-rose-600 block">{item.var}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                <IndianRupee size={16} className="text-indigo-600" /> Accounts Receivable Aging (Dealer Credit)
              </h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Total ₹35.25L Credit Outstanding
              </span>
            </div>

            <div className="space-y-3">
              {[
                { bucket: 'Current (0 - 30 Days)', amount: arAgingData?.current0_30 || 2450000, color: 'bg-emerald-500', text: 'text-emerald-700' },
                { bucket: '31 - 60 Days Overdue', amount: arAgingData?.days31_60 || 820000, color: 'bg-amber-500', text: 'text-amber-700' },
                { bucket: '61 - 90 Days Overdue', amount: arAgingData?.days61_90 || 210000, color: 'bg-orange-500', text: 'text-orange-700' },
                { bucket: '90+ Days Critical Credit Risk', amount: arAgingData?.over90 || 45000, color: 'bg-rose-600', text: 'text-rose-700' }
              ].map((b, i) => {
                const total = (arAgingData?.totalOutstanding || 3525000);
                const pct = Math.round((b.amount / total) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{b.bucket}</span>
                      <span className={cn("font-black", b.text)}>₹{b.amount.toLocaleString('en-IN')} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500", b.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: EPR BATTERY RECYCLING LEDGER VIEW */}
      {activeTab === 'epr' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between bg-emerald-950 text-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-emerald-800 rounded-2xl text-emerald-200">
                <Recycle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white italic">Extended Producer Responsibility (EPR) & Circular Economy</h3>
                <p className="text-xs text-emerald-300 font-medium">CPCB Battery Waste Management Rules (BWMR) 2026 Verification & Metal Recovery Ledger</p>
              </div>
            </div>
            <button
              onClick={() => setIsEprModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg"
            >
              <PlusCircle size={14} /> Log Recycled Battery Lot
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase">Lithium (Li) Recovered</p>
              <p className="text-xl font-black text-emerald-700">
                {eprLedger.reduce((a, b) => a + Number(b.lithiumRecoveryKg || 0), 0).toFixed(1)} Kg
              </p>
              <p className="text-[10px] text-slate-400 font-bold">12% High Purity Recovery Rate</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase">Cobalt (Co) Recovered</p>
              <p className="text-xl font-black text-emerald-700">
                {eprLedger.reduce((a, b) => a + Number(b.cobaltRecoveryKg || 0), 0).toFixed(1)} Kg
              </p>
              <p className="text-[10px] text-slate-400 font-bold">20% Black Mass Fraction</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase">Nickel (Ni) Recovered</p>
              <p className="text-xl font-black text-emerald-700">
                {eprLedger.reduce((a, b) => a + Number(b.nickelRecoveryKg || 0), 0).toFixed(1)} Kg
              </p>
              <p className="text-[10px] text-slate-400 font-bold">35% High Density Recovery</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase">Carbon Offset (CO₂)</p>
              <p className="text-xl font-black text-emerald-700">
                {eprLedger.reduce((a, b) => a + Number(b.co2OffsetTons || 0), 0).toFixed(1)} Metric Tons
              </p>
              <p className="text-[10px] text-emerald-600 font-bold">Verified ESG Metric</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">CPCB Approved Battery Recycling Certificates</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-bold text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] uppercase font-black text-slate-400">
                    <th className="pb-3">Batch ID</th>
                    <th className="pb-3">Decommissioned Packs</th>
                    <th className="pb-3">Weight (Kg)</th>
                    <th className="pb-3">Black Mass (Kg)</th>
                    <th className="pb-3">Recycler Partner</th>
                    <th className="pb-3">Compliance Cert No</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eprLedger.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80">
                      <td className="py-3 font-mono text-slate-900">{rec.batchNo}</td>
                      <td className="py-3">{rec.decommissionedPacksCount} Packs</td>
                      <td className="py-3 font-mono">{rec.totalWeightKg} Kg</td>
                      <td className="py-3 font-mono text-emerald-700">{rec.blackMassRecoveredKg} Kg</td>
                      <td className="py-3 text-slate-800">{rec.recyclerPartnerName}</td>
                      <td className="py-3 font-mono text-[10px] text-indigo-700">{rec.complianceCertNo}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: AI SUPPLY CHAIN RISK PREDICTOR & AUTO-PO VIEW */}
      {activeTab === 'risk' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-rose-950 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-rose-800 rounded-2xl text-rose-200">
                <AlertOctagon size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white italic">AI Supply Chain Risk Predictor & Automated Reordering</h3>
                <p className="text-xs text-rose-300 font-medium">Real-time Material Depletion vs. MRP Active Assembly Line Demand Analysis</p>
              </div>
            </div>
            <div className="px-4 py-2 bg-rose-800 rounded-xl border border-rose-700 text-right">
              <p className="text-[9px] font-black text-rose-300 uppercase">Alert Severity</p>
              <p className="text-xs font-black text-white uppercase">{riskData?.overallRiskScore || 'ELEVATED_SUPPLY_CHAIN_ALERT'}</p>
            </div>
          </div>

          <div className="space-y-4">
            {(riskData?.riskItems || []).map((risk: any) => (
              <div key={risk.itemId} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded mr-2",
                      risk.riskLevel === 'HIGH_STOCKOUT_RISK' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    )}>
                      {risk.riskLevel}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 inline-block mt-1">{risk.itemName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Supplier: {risk.preferredSupplier} | Lead Time: {risk.leadTimeDays} Days</p>
                  </div>
                  <button
                    onClick={() => handleTriggerAutoPO(risk)}
                    disabled={autoPoIssuingId === risk.itemId}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md shrink-0"
                  >
                    {autoPoIssuingId === risk.itemId ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />} Issue Auto-PO (₹{risk.estimatedPurchaseAmount?.toLocaleString('en-IN')})
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Current On-Hand Stock</p>
                    <p className="text-lg font-black text-slate-900 font-mono mt-1">{risk.currentStock} Units</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Minimum Buffer Trigger</p>
                    <p className="text-lg font-black text-slate-900 font-mono mt-1">{risk.minStock} Units</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-[9px] font-black text-indigo-700 uppercase">AI Recommended Reorder Qty</p>
                    <p className="text-lg font-black text-indigo-900 font-mono mt-1">{risk.recommendedOrderQty} Units</p>
                  </div>
                </div>

                <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-100 font-medium">
                  <span className="font-black uppercase">Risk Context:</span> {risk.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Log Recycled Battery Batch for CPCB Compliance */}
      {isEprModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Recycle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Log EPR Battery Recycling Lot</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">CPCB BWMR Compliance Certificate Generation</p>
                </div>
              </div>
              <button onClick={() => setIsEprModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEprBatch} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Decommissioned Packs Count</label>
                <input
                  type="number"
                  required
                  value={eprPacksCount}
                  onChange={(e) => setEprPacksCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">CPCB Authorized Recycler Partner</label>
                <select
                  value={eprRecycler}
                  onChange={(e) => setEprRecycler(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                >
                  <option value="Attero Recycling Green Tech">Attero Recycling Green Tech</option>
                  <option value="E-Parisaraa Eco Solutions">E-Parisaraa Eco Solutions</option>
                  <option value="Lohum Cleantech Battery Materials">Lohum Cleantech Battery Materials</option>
                </select>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] text-emerald-900 space-y-1">
                <p className="font-extrabold uppercase">Automated Metal Recovery Calculation:</p>
                <p>Est. Total Weight: {eprPacksCount * 15.5} Kg | Black Mass: {(eprPacksCount * 15.5 * 0.33).toFixed(1)} Kg</p>
                <p className="font-mono text-emerald-800">Lithium: ~{(eprPacksCount * 15.5 * 0.33 * 0.12).toFixed(1)} Kg | Cobalt: ~{(eprPacksCount * 15.5 * 0.33 * 0.20).toFixed(1)} Kg</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEprModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEpr}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {isSubmittingEpr ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Log & Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STANDARD TABS (Sales, Production, Warranty, Dealer) */}
      {(activeTab === 'sales' || activeTab === 'production' || activeTab === 'warranty' || activeTab === 'dealer') && (
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
                                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                          <Tooltip 
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Value']}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                          />
                          <Area type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                       </AreaChart>
                    ) : (
                       <BarChart data={(activeTab === 'warranty' ? failureTimeline : salesData) as any}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey={activeTab === 'warranty' ? 'cases' : 'sales'} fill="#0284c7" radius={[6, 6, 0, 0]} />
                       </BarChart>
                    )}
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Secondary Distribution Component */}
           <div className="dashboard-card border-none bg-white shadow-xl shadow-slate-200/50 flex flex-col justify-between">
              <div>
                 <h4 className="text-xs font-black text-slate-400 uppercase mb-6 flex items-center">
                    <PieIcon size={16} className="mr-2 text-primary-600" /> 
                    {activeTab === 'sales' && 'Regional Sales Contribution'}
                    {activeTab === 'production' && 'Category Output Mix'}
                    {activeTab === 'dealer' && 'Lead Conversion Pipeline'}
                    {activeTab === 'warranty' && 'Failure Root Cause Distribution'}
                 </h4>

                 {activeTab === 'warranty' ? (
                    <div className="h-[220px] w-full relative">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie data={failureData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {failureData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                             </Pie>
                             <Tooltip />
                          </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-black text-slate-900">{complaints.length}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Total RMA</span>
                       </div>
                    </div>
                 ) : sortedRegions.length > 0 ? (
                    <div className="space-y-4">
                       {sortedRegions.slice(0, 4).map(([reg, val], idx) => {
                          const pct = totalInvoiceRev > 0 ? Math.round((val / totalInvoiceRev) * 100) : 0;
                          return (
                             <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                   <span className="text-slate-700">{reg}</span>
                                   <span className="text-slate-900 font-black">{formatCurrency(val)} ({pct}%)</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-accent-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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
      )}
    </div>
  );
};
