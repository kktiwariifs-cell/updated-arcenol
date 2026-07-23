import React from 'react';
import { 
  Bell, AlertTriangle, Clock, ShieldAlert, 
  Wrench, IndianRupee, Zap, Truck, 
  ArrowRight, Info, Mail, Phone,
  CheckCircle2, AlertCircle, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

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

export const Alerts: React.FC = () => {
  const alertSystems: AlertType[] = [
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

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Bell size={120} className="text-slate-400" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Operational Alert Vector</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center">
             <Zap size={12} className="mr-2 text-primary-600" /> Real-time System Notifications & Trigger Responses
          </p>
        </div>

        <div className="flex items-center space-x-4 relative z-10">
           <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-3">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">3 Critical Triggers</span>
           </div>
           <button className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">Clear All</button>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {alertSystems.map((alert) => (
          <div 
            key={alert.id}
            className={cn(
              "p-8 rounded-[2.5rem] border transition-all duration-500 group relative overflow-hidden",
              "bg-white hover:bg-slate-50/50 shadow-xl shadow-slate-200/40",
              alert.borderClass.replace('border-white/20', 'border-slate-100')
            )}
          >
            {/* Background Glow */}
            <div className={cn("absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-5 rounded-full transition-all duration-700 group-hover:opacity-10", alert.bgClass)}></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
               <div className={cn("p-5 rounded-3xl", alert.bgClass, alert.colorClass)}>
                  <alert.icon size={28} />
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System ID</p>
                  <p className="text-xs font-mono text-slate-900 font-black opacity-30">{alert.id}</p>
               </div>
            </div>

            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase border tracking-widest",
                    alert.priority === 'CRITICAL' ? "bg-red-50 text-red-600 border-red-100" :
                    alert.priority === 'HIGH' ? "bg-orange-50 text-orange-600 border-orange-100" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {alert.priority}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Clock size={10} className="mr-1" /> {alert.time}
                  </span>
               </div>
               
               <h3 className="text-xl font-black text-slate-900 italic tracking-tight uppercase mb-3 leading-tight transition-colors group-hover:text-primary-600">
                  {alert.title}
               </h3>
               
               <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 opacity-80 group-hover:opacity-100 transition-opacity">
                  {alert.description}
               </p>

               <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                  <button className={cn(
                    "flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                    "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100"
                  )}>
                     Ignore
                  </button>
                  <div className="w-4"></div>
                  <button className={cn(
                    "flex-[2] py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                    alert.bgClass, alert.colorClass,
                    alert.priority === 'CRITICAL' ? "shadow-red-500/10" : "shadow-primary-500/10"
                  )}>
                     {alert.actionText} <ArrowRight size={14} />
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

      {/* Alert Summary Matrix */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 relative overflow-hidden shadow-2xl shadow-slate-200/50">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Notification Velocity</p>
               <div className="flex items-end gap-3">
                  <p className="text-5xl font-black text-slate-900 italic tracking-tighter">24</p>
                  <span className="text-primary-600 text-[10px] font-black uppercase mb-3">+12% LAST 24H</span>
               </div>
            </div>
            
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Mean Time to Resolve</p>
               <div className="flex items-end gap-3">
                  <p className="text-5xl font-black text-slate-900 italic tracking-tighter">4.2h</p>
                  <span className="text-blue-600 text-[10px] font-black uppercase mb-3">OPTIMIZED</span>
               </div>
            </div>

            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Critical Thresholds</p>
               <div className="flex items-end gap-3">
                  <p className="text-5xl font-black text-red-500 italic tracking-tighter">03</p>
                  <span className="text-red-500/50 text-[10px] font-black uppercase mb-3 animate-pulse">ACTION REQUIRED</span>
               </div>
            </div>

            <div className="flex items-center justify-end">
               <button className="px-10 py-5 bg-primary-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-2xl shadow-primary-500/20">
                  Deploy Resolution Team
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};
