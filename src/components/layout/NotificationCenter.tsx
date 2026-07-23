import React, { useState } from 'react';
import { Bell, MessageSquare, Mail, Smartphone, ShieldAlert, Clock, CheckCircle2, ChevronRight, X, AlertCircle } from 'lucide-react';
import { useERPData } from '../../hooks/useERPData';
import { cn } from '../../lib/utils';

export const NotificationCenter: React.FC = () => {
  const { data, refetch } = useERPData();
  const [isOpen, setIsOpen] = useState(false);
  
  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter((n: any) => n.status === 'UNREAD').length;

  const clearAll = async () => {
    await fetch('/api/notifications/clear', { method: 'POST' });
    refetch();
  };

  const getIcon = (type: string, channel: string) => {
    if (channel === 'WHATSAPP') return <MessageSquare size={14} className="text-emerald-500" />;
    if (channel === 'SMS') return <Smartphone size={14} className="text-blue-500" />;
    if (channel === 'EMAIL') return <Mail size={14} className="text-amber-500" />;
    
    switch (type) {
      case 'LOW_STOCK': return <ShieldAlert size={14} className="text-red-500" />;
      case 'FOLLOW_UP': return <Clock size={14} className="text-primary-500" />;
      case 'PAYMENT': return <CheckCircle2 size={14} className="text-emerald-500" />;
      default: return <AlertCircle size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-all relative group",
          isOpen ? "border-primary-500 ring-2 ring-primary-50" : "hover:border-primary-200"
        )}
      >
        <Bell size={20} className={cn("transition-colors", unreadCount > 0 ? "text-primary-600 animate-bounce" : "text-slate-400 group-hover:text-primary-600")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-[380px] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="p-5 border-b bg-slate-900 text-white flex justify-between items-center">
               <div>
                 <h4 className="font-black text-sm uppercase tracking-widest">Notification Engine</h4>
                 <p className="text-[10px] text-slate-400">Omni-channel Alerts & Events</p>
               </div>
               <button onClick={clearAll} className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-xs font-bold text-primary-400">
                 Clear Read
               </button>
            </div>
            
            <div className="max-h-[450px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
               {notifications.slice().reverse().map((n) => (
                 <div key={n.id} className={cn(
                   "p-4 hover:bg-slate-50 transition-colors flex items-start space-x-4",
                   n.status === 'UNREAD' ? "bg-primary-50/20" : ""
                 )}>
                    <div className="mt-1">
                       {getIcon(n.type, n.channel)}
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            {n.type.replace('_', ' ')} · {n.channel}
                          </p>
                          <span className="text-[9px] text-slate-300 font-bold">{new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <p className="text-xs font-black text-slate-900 leading-tight mb-1">{n.title}</p>
                       <p className="text-[11px] text-slate-500 leading-normal">{n.message}</p>
                    </div>
                 </div>
               ))}
               {notifications.length === 0 && (
                 <div className="py-20 text-center text-slate-400 italic">
                    <Bell size={40} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Station calm. No new alerts.</p>
                 </div>
               )}
            </div>
            
            <div className="p-4 border-t bg-slate-50 text-center">
               <button className="text-[10px] font-black text-primary-600 uppercase tracking-widest flex items-center justify-center mx-auto hover:underline">
                  View Full Event Log <ChevronRight size={12} className="ml-1" />
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
