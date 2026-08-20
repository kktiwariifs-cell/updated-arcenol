import React, { useState, useMemo } from 'react';
import { 
  Bell, AlertTriangle, Clock, ShieldAlert, 
  Wrench, IndianRupee, Zap, Truck, 
  ArrowRight, Info, Mail, Phone,
  CheckCircle2, AlertCircle, ChevronRight, Activity, Trash2, Sparkles, Filter
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn } from '../lib/utils';
import { FullEventLogModal } from '../components/layout/FullEventLogModal';
import { PanelManualButton, PanelManualModal } from '../components/PanelManualModal';

interface AlertType {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  icon: any;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  actionText: string;
}

export const Alerts: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const { data, refetch } = useERPData();
  const [showFullEventLog, setShowFullEventLog] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [ignoredAlerts, setIgnoredAlerts] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  const defaultAlerts: AlertType[] = [
    {
      id: 'AL-001',
      type: 'LOW_STOCK',
      title: 'Lithium Cell Depletion Critical',
      description: 'Inventory levels for RM-CELLS dropped below 15% safety buffer. Production at risk.',
      time: '2 mins ago',
      priority: 'CRITICAL',
      icon: AlertTriangle,
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/20',
      actionText: 'Dispatch PO'
    },
    {
      id: 'AL-002',
      type: 'FOLLOW_UP',
      title: 'Regional Dealer Follow-up',
      description: 'Dealer "NexGen Energy" has not responded to the Q3 procurement contract.',
      time: '15 mins ago',
      priority: 'MEDIUM',
      icon: Phone,
      colorClass: 'text-blue-500',
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/20',
      actionText: 'Initiate Call'
    },
    {
      id: 'AL-003',
      type: 'WARRANTY_EXPIRY',
      title: 'Batch B-1102 Warranty Lapse',
      description: '450 units of Battery SKU-72V nearing warranty expiration in 48 hours.',
      time: '1 hour ago',
      priority: 'HIGH',
      icon: ShieldAlert,
      colorClass: 'text-purple-500',
      bgClass: 'bg-purple-500/10',
      borderClass: 'border-purple-500/20',
      actionText: 'Notify CRM'
    },
    {
      id: 'AL-004',
      type: 'SERVICE_DELAY',
      title: 'Service Node Latency Detected',
      description: 'Mumbai Hub service turnaround time exceeded 72 hours for ticket #SR-9921.',
      time: '3 hours ago',
      priority: 'CRITICAL',
      icon: Clock,
      colorClass: 'text-red-500',
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/20',
      actionText: 'Escalate Task'
    },
    {
      id: 'AL-005',
      type: 'PAYMENT_REMINDER',
      title: 'Outstanding Dealer Credit',
      description: 'Outstanding balance of ₹12.40L for Ahmedabad Hub is 12 days overdue.',
      time: '5 hours ago',
      priority: 'HIGH',
      icon: IndianRupee,
      colorClass: 'text-indigo-500',
      bgClass: 'bg-indigo-500/10',
      borderClass: 'border-indigo-500/20',
      actionText: 'Send Notice'
    },
    {
      id: 'AL-006',
      type: 'HIGH_FAILURE',
      title: 'BMS Voltage Instability Report',
      description: 'Production Batch A-22 showing 4.2% failure rate in QC testing phase.',
      time: 'Yesterday',
      priority: 'CRITICAL',
      icon: Zap,
      colorClass: 'text-rose-500',
      bgClass: 'bg-rose-500/10',
      borderClass: 'border-rose-500/20',
      actionText: 'Halt Line'
    },
    {
      id: 'AL-007',
      type: 'PENDING_DISPATCH',
      title: 'Dispatch Queue Overflow',
      description: '12 orders pending dispatch for over 24 hours. Loading bay bottleneck detected.',
      time: '2 days ago',
      priority: 'MEDIUM',
      icon: Truck,
      colorClass: 'text-emerald-500',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/20',
      actionText: 'Clear Bay'
    }
  ];

  const visibleAlerts = useMemo(() => {
    let list = defaultAlerts.filter(a => !ignoredAlerts.includes(a.id));
    if (activeFilter !== 'ALL') {
      list = list.filter(a => a.priority === activeFilter);
    }
    return list;
  }, [defaultAlerts, ignoredAlerts, activeFilter]);

  const criticalCount = visibleAlerts.filter(a => a.priority === 'CRITICAL').length;

  const handleClearAll = async () => {
    try {
      setIgnoredAlerts(defaultAlerts.map(a => a.id));
      await fetch('/api/notifications/clear-all', { method: 'POST' });
      await refetch();
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  };

  const handleIgnore = (id: string) => {
    setIgnoredAlerts(prev => [...prev, id]);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Bell size={120} className="text-slate-400" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full md:w-auto">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Operational Alert Vector</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center">
               <Zap size={12} className="mr-2 text-primary-600 shrink-0" /> Real-time System Notifications & Trigger Responses
            </p>
          </div>
          <div className="md:hidden self-start">
            <PanelManualButton onClick={() => setShowManualModal(true)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
           <div className="hidden md:block">
             <PanelManualButton onClick={() => setShowManualModal(true)} />
           </div>

           {criticalCount > 0 && (
             <div className="px-3.5 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2.5 shadow-2xs">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{criticalCount} Critical Triggers</span>
             </div>
           )}

           <button 
             onClick={() => setShowFullEventLog(true)}
             className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
           >
             <Activity size={13} /> View Full Event Log
           </button>

           <button 
             onClick={handleClearAll}
             className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xs cursor-pointer active:scale-95"
           >
             Clear All
           </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: `All Alerts (${defaultAlerts.length - ignoredAlerts.length})` },
          { id: 'CRITICAL', label: 'Critical Only' },
          { id: 'HIGH', label: 'High Priority' },
          { id: 'MEDIUM', label: 'Medium' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as any)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap",
              activeFilter === filter.id 
                ? "bg-slate-900 text-white border-slate-900 shadow-2xs" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Alerts Grid */}
      {visibleAlerts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleAlerts.map((alert) => (
            <div 
              key={alert.id}
              className={cn(
                "p-6 sm:p-8 rounded-[2rem] border transition-all duration-500 group relative overflow-hidden",
                "bg-white hover:bg-slate-50/50 shadow-xl shadow-slate-200/40",
                alert.borderClass.replace('border-white/20', 'border-slate-100')
              )}
            >
              {/* Background Glow */}
              <div className={cn("absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-5 rounded-full transition-all duration-700 group-hover:opacity-10", alert.bgClass)}></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                 <div className={cn("p-4 rounded-2xl", alert.bgClass, alert.colorClass)}>
                    <alert.icon size={26} />
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">System ID</p>
                    <p className="text-xs font-mono text-slate-900 font-black opacity-40">{alert.id}</p>
                 </div>
              </div>

              <div className="relative z-10">
                 <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase border tracking-widest",
                      alert.priority === 'CRITICAL' ? "bg-red-50 text-red-600 border-red-200" :
                      alert.priority === 'HIGH' ? "bg-orange-50 text-orange-600 border-orange-200" :
                      "bg-blue-50 text-blue-600 border-blue-200"
                    )}>
                      {alert.priority}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Clock size={10} className="mr-1" /> {alert.time}
                    </span>
                 </div>
                 
                 <h3 className="text-lg font-black text-slate-900 italic tracking-tight uppercase mb-2 leading-tight transition-colors group-hover:text-primary-600">
                    {alert.title}
                 </h3>
                 
                 <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 opacity-90 group-hover:opacity-100 transition-opacity">
                    {alert.description}
                 </p>

                 <div className="flex items-center justify-between border-t border-slate-100 pt-5 gap-3">
                    <button 
                      onClick={() => handleIgnore(alert.id)}
                      className={cn(
                        "flex-1 py-3 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer",
                        "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                      )}
                    >
                       Dismiss
                    </button>
                    <button 
                      onClick={() => setShowFullEventLog(true)}
                      className={cn(
                        "flex-[2] py-3 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md cursor-pointer",
                        alert.bgClass, alert.colorClass,
                        alert.priority === 'CRITICAL' ? "shadow-red-500/10" : "shadow-primary-500/10"
                      )}
                    >
                       {alert.actionText} <ArrowRight size={13} />
                    </button>
                 </div>
              </div>

              {/* Severity Meter */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-100">
                 <div className={cn(
                   "w-full transition-all duration-1000",
                   alert.priority === 'CRITICAL' ? "bg-red-500 h-full" :
                   alert.priority === 'HIGH' ? "bg-orange-500 h-[60%]" :
                   "bg-blue-500 h-[30%]"
                 )}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">All Vectors Clear</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">No pending active operational alerts for the selected criteria.</p>
          <button
            onClick={() => setIgnoredAlerts([])}
            className="mt-5 px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-slate-800"
          >
            Restore Dismissed Alerts
          </button>
        </div>
      )}

      {/* Alert Summary Matrix */}
      <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 relative overflow-hidden shadow-xl shadow-slate-200/50">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Notification Velocity</p>
               <div className="flex items-end gap-3">
                  <p className="text-4xl sm:text-5xl font-black text-slate-900 italic tracking-tighter">24</p>
                  <span className="text-primary-600 text-[10px] font-black uppercase mb-2">+12% LAST 24H</span>
               </div>
            </div>
            
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Mean Time to Resolve</p>
               <div className="flex items-end gap-3">
                  <p className="text-4xl sm:text-5xl font-black text-slate-900 italic tracking-tighter">4.2h</p>
                  <span className="text-blue-600 text-[10px] font-black uppercase mb-2">OPTIMIZED</span>
               </div>
            </div>

            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Critical Thresholds</p>
               <div className="flex items-end gap-3">
                  <p className="text-4xl sm:text-5xl font-black text-red-500 italic tracking-tighter">{criticalCount.toString().padStart(2, '0')}</p>
                  <span className="text-red-500/70 text-[10px] font-black uppercase mb-2 animate-pulse">ACTION READY</span>
               </div>
            </div>

            <div className="flex items-center justify-start lg:justify-end">
               <button 
                 onClick={() => setShowFullEventLog(true)}
                 className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 cursor-pointer"
               >
                  Open Full Audit Stream
               </button>
            </div>
         </div>
      </div>

      {/* Embedded Full Event Log & Audit Stream Modal */}
      <FullEventLogModal 
        isOpen={showFullEventLog}
        onClose={() => setShowFullEventLog(false)}
        setActiveTab={setActiveTab}
      />

      {/* Embedded Contextual Panel Manual Modal */}
      <PanelManualModal 
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        panelKey="dashboard"
        onOpenFullManual={() => setActiveTab?.('user-manual')}
      />
    </div>
  );
};
