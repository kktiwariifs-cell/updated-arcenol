import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  AlertCircle,
  Trash2,
  CheckCheck,
  Search,
  Activity,
  Zap,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useERPData } from '../../hooks/useERPData';
import { cn } from '../../lib/utils';
import { FullEventLogModal } from './FullEventLogModal';

interface NotificationCenterProps {
  setActiveTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ setActiveTab }) => {
  const { data, refetch } = useERPData();
  const [isOpen, setIsOpen] = useState(false);
  const [showFullLogModal, setShowFullLogModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'SYSTEM' | 'CRITICAL'>('ALL');
  
  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter((n: any) => n.status === 'UNREAD').length;

  const filteredNotifications = useMemo(() => {
    let list = [...notifications];
    if (activeFilter === 'UNREAD') {
      list = list.filter((n: any) => n.status === 'UNREAD');
    } else if (activeFilter === 'SYSTEM') {
      list = list.filter((n: any) => n.channel === 'SYSTEM' || n.type === 'SYSTEM' || n.type === 'ENGAGEMENT');
    } else if (activeFilter === 'CRITICAL') {
      list = list.filter((n: any) => 
        n.priority === 'CRITICAL' || n.type === 'LOW_STOCK' || (n.title && n.title.toLowerCase().includes('critical'))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((n: any) => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.message && n.message.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q)) ||
        (n.channel && n.channel.toLowerCase().includes(q))
      );
    }

    return list.slice().reverse();
  }, [notifications, activeFilter, searchQuery]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/clear', { method: 'POST' });
      await refetch();
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await fetch('/api/notifications/clear-all', { method: 'POST' });
      await refetch();
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const markSingleRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      await refetch();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const dismissSingle = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      await refetch();
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const getIcon = (type: string, channel: string, priority?: string) => {
    if (priority === 'CRITICAL' || type === 'LOW_STOCK') {
      return <ShieldAlert size={14} className="text-red-500" />;
    }
    if (channel === 'WHATSAPP') return <MessageSquare size={14} className="text-emerald-500" />;
    if (channel === 'SMS') return <Smartphone size={14} className="text-blue-500" />;
    if (channel === 'EMAIL') return <Mail size={14} className="text-amber-500" />;
    
    switch (type) {
      case 'FOLLOW_UP': return <Clock size={14} className="text-primary-500" />;
      case 'PAYMENT': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'ENGAGEMENT': return <Radio size={14} className="text-indigo-500" />;
      case 'PRODUCTION': return <Zap size={14} className="text-amber-500" />;
      default: return <AlertCircle size={14} className="text-slate-400" />;
    }
  };

  const getChannelBadge = (channel: string) => {
    const c = (channel || 'SYSTEM').toUpperCase();
    if (c === 'WHATSAPP') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (c === 'SMS') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (c === 'EMAIL') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button 
        id="notification-center-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 w-10 rounded-xl bg-white border flex items-center justify-center transition-all relative group cursor-pointer shadow-2xs",
          isOpen ? "border-primary-500 ring-2 ring-primary-100 bg-primary-50/20" : "border-slate-200 hover:border-primary-300 hover:bg-slate-50"
        )}
        title="Open Notification Center & System Events"
      >
        <Bell 
          size={18} 
          className={cn(
            "transition-transform group-hover:scale-110", 
            unreadCount > 0 ? "text-primary-600 animate-bounce" : "text-slate-500 group-hover:text-primary-600"
          )} 
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-2xs" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Container with guaranteed top clearance */}
          <div 
            id="notification-center-popover"
            className="fixed sm:absolute left-2.5 sm:left-auto right-2.5 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-20px)] sm:w-[410px] max-w-[420px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-top-3 duration-250 flex flex-col max-h-[85vh] sm:max-h-[600px]"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-600/30 text-primary-400 border border-primary-500/30 rounded-xl">
                  <Activity size={18} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-xs sm:text-sm uppercase tracking-widest text-white">Notification Engine</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500/80 text-white text-[8px] font-black rounded-full">
                        {unreadCount} UNREAD
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Omni-channel alerts & system audit logs</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={markAllRead} 
                  className="px-2.5 py-1 hover:bg-white/10 rounded-lg transition-all text-[10px] font-black text-primary-300 hover:text-white uppercase tracking-wider cursor-pointer"
                  title="Mark all notifications as read"
                >
                  Mark Read
                </button>
                <button 
                  onClick={clearAllNotifications} 
                  className="px-2.5 py-1 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  title="Clear view"
                >
                  Clear View
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Filter Tabs & Search */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search alert stream..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {[
                  { id: 'ALL', label: `All (${notifications.length})` },
                  { id: 'UNREAD', label: `Unread (${unreadCount})` },
                  { id: 'SYSTEM', label: 'System' },
                  { id: 'CRITICAL', label: 'Critical' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border",
                      activeFilter === tab.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Notification Stream Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin bg-slate-50/50">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((n: any) => {
                  const isUnread = n.status === 'UNREAD';
                  const nDate = new Date(n.date || n.timestamp || Date.now());
                  const timeFormatted = nDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        if (isUnread) markSingleRead(n.id);
                        setIsOpen(false);
                        setShowFullLogModal(true);
                      }}
                      className={cn(
                        "p-3.5 sm:p-4 hover:bg-white transition-all flex items-start space-x-3 cursor-pointer group relative",
                        isUnread ? "bg-primary-50/25 border-l-4 border-primary-500" : "bg-white/80"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl border mt-0.5 shrink-0",
                        isUnread ? "bg-primary-50 border-primary-200 text-primary-600" : "bg-slate-100 border-slate-200 text-slate-500"
                      )}>
                        {getIcon(n.type, n.channel, n.priority)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", getChannelBadge(n.channel))}>
                            {n.type?.replace('_', ' ') || 'SYSTEM'} · {n.channel || 'SYSTEM'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold ml-2 shrink-0 flex items-center gap-1">
                            <Clock size={10} /> {timeFormatted}
                          </span>
                        </div>

                        <p className={cn("text-xs font-black leading-snug mb-0.5 group-hover:text-primary-600 transition-colors", isUnread ? "text-slate-900" : "text-slate-700")}>
                          {n.title || 'System Notification'}
                        </p>
                        
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>

                      {/* Quick item dismiss / mark read on hover */}
                      <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {isUnread && (
                          <button
                            onClick={(e) => markSingleRead(n.id, e)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Mark Read"
                          >
                            <CheckCheck size={13} />
                          </button>
                        )}
                        <button
                          onClick={(e) => dismissSingle(n.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-14 text-center text-slate-400 italic px-4">
                  <Bell size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Station Clear</p>
                  <p className="text-[11px] text-slate-400 mt-1">No active notifications or matching events.</p>
                </div>
              )}
            </div>
            
            {/* Footer with ACTIVE 'VIEW FULL EVENT LOG >' Button */}
            <div className="p-3 border-t border-slate-200 bg-white text-center flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold pl-1">
                {notifications.length} total event records
              </span>

              <button 
                id="view-full-event-log-btn"
                onClick={() => {
                  setIsOpen(false);
                  setShowFullLogModal(true);
                }}
                className="px-3.5 py-1.5 bg-primary-50 hover:bg-primary-600 text-primary-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:shadow-sm active:scale-95 border border-primary-200 hover:border-primary-600 group"
              >
                <span>View Full Event Log</span>
                <ChevronRight size={13} className="ml-1 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Comprehensive Full Event Log & Audit Stream Modal */}
      <FullEventLogModal 
        isOpen={showFullLogModal}
        onClose={() => setShowFullLogModal(false)}
        setActiveTab={setActiveTab}
      />
    </div>
  );
};
