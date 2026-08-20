import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Trash2, 
  CheckCheck, 
  Download, 
  Printer, 
  X, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Zap, 
  Clock, 
  Database, 
  Layers, 
  Radio, 
  ShieldAlert, 
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Mail,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { useERPData } from '../../hooks/useERPData';
import { cn } from '../../lib/utils';
import { downloadElementAsPDF, printElement } from '../../lib/pdfGenerator';

interface FullEventLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab?: (tab: string) => void;
}

export const FullEventLogModal: React.FC<FullEventLogModalProps> = ({ isOpen, onClose, setActiveTab }) => {
  const { data, refetch } = useERPData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'feed' | 'table'>('feed');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(null);

  const notifications = data?.notifications || [];

  // Filter & Search Logic
  const filteredEvents = useMemo(() => {
    let list = [...notifications];

    // Channel filter
    if (selectedChannel !== 'ALL') {
      list = list.filter((n: any) => 
        (n.channel && n.channel.toUpperCase() === selectedChannel) ||
        (n.type && n.type.toUpperCase() === selectedChannel)
      );
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      list = list.filter((n: any) => n.status === selectedStatus);
    }

    // Severity / Priority filter
    if (selectedSeverity !== 'ALL') {
      list = list.filter((n: any) => {
        const p = (n.priority || (n.type === 'LOW_STOCK' || n.type === 'CRITICAL' ? 'CRITICAL' : 'INFO')).toUpperCase();
        return p === selectedSeverity;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((n: any) => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.message && n.message.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q)) ||
        (n.channel && n.channel.toLowerCase().includes(q)) ||
        (n.id && n.id.toLowerCase().includes(q))
      );
    }

    // Sort order
    list.sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.timestamp || 0).getTime();
      const dateB = new Date(b.date || b.timestamp || 0).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [notifications, selectedChannel, selectedStatus, selectedSeverity, searchQuery, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n: any) => n.status === 'UNREAD').length;
    const critical = notifications.filter((n: any) => 
      n.priority === 'CRITICAL' || n.type === 'LOW_STOCK' || (n.title && n.title.toLowerCase().includes('critical'))
    ).length;
    const systemTriggers = notifications.filter((n: any) => 
      n.channel === 'SYSTEM' || n.type === 'ENGAGEMENT' || n.type === 'SYSTEM'
    ).length;
    return { total, unread, critical, systemTriggers };
  }, [notifications]);

  // Actions
  const handleMarkAllRead = async () => {
    setIsProcessing(true);
    try {
      await fetch('/api/notifications/clear', { method: 'POST' });
      await refetch();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all event logs and notifications? This will reset the event stream.')) {
      return;
    }
    setIsProcessing(true);
    try {
      await fetch('/api/notifications/clear-all', { method: 'POST' });
      await refetch();
      setSelectedEventDetails(null);
    } catch (err) {
      console.error('Failed to clear event logs:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissSingle = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      await refetch();
      if (selectedEventDetails?.id === id) {
        setSelectedEventDetails(null);
      }
    } catch (err) {
      console.error('Failed to dismiss event:', err);
    }
  };

  const handleMarkSingleRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      await refetch();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleSimulateEvent = async () => {
    setIsProcessing(true);
    try {
      const sampleEvents = [
        { type: 'SYSTEM', title: 'Real-time Telematics Sync', message: 'Connected BMS nodes reported 99.8% health packet reception across 12 live packs.', channel: 'SYSTEM', priority: 'INFO' },
        { type: 'INVENTORY', title: 'Lithium Cell Reorder Threshold Reached', message: 'Safety buffer for RM-CELLS-3.2V breached reorder minimum at 850 units.', channel: 'SYSTEM', priority: 'CRITICAL' },
        { type: 'PRODUCTION', title: 'Batch Production Stage 4 Verified', message: 'Automated QC optical inspection passed with 0 defects on line 2.', channel: 'SYSTEM', priority: 'INFO' },
        { type: 'BILLING', title: 'Tax Invoice Generated', message: 'Tax Invoice #INV-2026-894 generated and synchronized to GST ledger.', channel: 'WHATSAPP', priority: 'MEDIUM' },
        { type: 'SERVICE', title: 'RMA Ticket Diagnostics Complete', message: 'End-user warranty repair #RMA-9022 verified and dispatched.', channel: 'SMS', priority: 'MEDIUM' }
      ];
      const randomEvent = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      await fetch('/api/notifications/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(randomEvent)
      });
      await refetch();
    } catch (err) {
      console.error('Failed to simulate event:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    if (filteredEvents.length === 0) {
      alert('No events available to export with current filters.');
      return;
    }
    const headers = ['Event ID', 'Date & Time', 'Channel', 'Type', 'Priority', 'Status', 'Title', 'Message'];
    const rows = filteredEvents.map((evt: any) => [
      evt.id || '',
      new Date(evt.date || evt.timestamp || Date.now()).toLocaleString(),
      evt.channel || 'SYSTEM',
      evt.type || 'GENERAL',
      evt.priority || 'INFO',
      evt.status || 'UNREAD',
      `"${(evt.title || '').replace(/"/g, '""')}"`,
      `"${(evt.message || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `arcenol_system_event_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventIcon = (type: string, channel: string, priority?: string) => {
    if (priority === 'CRITICAL' || type === 'LOW_STOCK') {
      return <AlertTriangle size={16} className="text-red-500 shrink-0" />;
    }
    if (channel === 'WHATSAPP') return <MessageSquare size={16} className="text-emerald-500 shrink-0" />;
    if (channel === 'SMS') return <Smartphone size={16} className="text-blue-500 shrink-0" />;
    if (channel === 'EMAIL') return <Mail size={16} className="text-amber-500 shrink-0" />;

    switch (type) {
      case 'FOLLOW_UP': return <Clock size={16} className="text-primary-500 shrink-0" />;
      case 'PAYMENT': return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
      case 'ENGAGEMENT': return <Radio size={16} className="text-indigo-500 shrink-0" />;
      case 'PRODUCTION': return <Zap size={16} className="text-amber-500 shrink-0" />;
      default: return <Activity size={16} className="text-slate-500 shrink-0" />;
    }
  };

  const getChannelBadge = (channel: string) => {
    const c = (channel || 'SYSTEM').toUpperCase();
    if (c === 'WHATSAPP') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (c === 'SMS') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (c === 'EMAIL') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getPriorityBadge = (priority?: string, type?: string) => {
    const p = (priority || (type === 'LOW_STOCK' ? 'CRITICAL' : 'INFO')).toUpperCase();
    if (p === 'CRITICAL') return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
    if (p === 'HIGH') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (p === 'MEDIUM') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="full-event-log-container"
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-900 animate-in zoom-in-95 duration-300"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-primary-600/30 text-primary-400 border border-primary-500/30 rounded-2xl shrink-0">
              <Activity size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight italic">
                  Full System Event Log & Audit Stream
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Live Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Real-time chronological telemetry, automated state changes, and omni-channel alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateEvent}
              disabled={isProcessing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Generate a sample test alert in the log stream"
            >
              <Sparkles size={13} className="text-amber-400" /> Simulate Alert
            </button>
            <button
              onClick={handleMarkAllRead}
              disabled={isProcessing || stats.unread === 0}
              className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCheck size={13} /> Mark All Read
            </button>
            <button
              onClick={handleClearAll}
              disabled={isProcessing || stats.total === 0}
              className="px-3 py-2 bg-rose-600/90 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Clear entire log buffer"
            >
              <Trash2 size={13} /> Clear Full View
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Dialog (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Events</p>
              <p className="text-lg font-black text-slate-900 italic mt-0.5">{stats.total}</p>
            </div>
            <Database size={18} className="text-primary-500 opacity-60" />
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Unread</p>
              <p className="text-lg font-black text-emerald-600 italic mt-0.5">{stats.unread}</p>
            </div>
            <Radio size={18} className="text-emerald-500 opacity-60 animate-pulse" />
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Critical Incidents</p>
              <p className="text-lg font-black text-red-600 italic mt-0.5">{stats.critical}</p>
            </div>
            <ShieldAlert size={18} className="text-red-500 opacity-60" />
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auto Triggers</p>
              <p className="text-lg font-black text-blue-600 italic mt-0.5">{stats.systemTriggers}</p>
            </div>
            <Zap size={18} className="text-blue-500 opacity-60" />
          </div>
        </div>

        {/* Filter & Control Bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, event message, channel, or serial..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters & Export Options */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Channel Filter */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
            >
              <option value="ALL">All Channels</option>
              <option value="SYSTEM">System</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="LOW_STOCK">Stock Alerts</option>
              <option value="FOLLOW_UP">Follow-ups</option>
              <option value="PAYMENT">Payments</option>
              <option value="ENGAGEMENT">Engagement</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNREAD">Unread Only</option>
              <option value="READ">Read Only</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('feed')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  viewMode === 'feed' ? "bg-white text-primary-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Feed Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  viewMode === 'table' ? "bg-white text-primary-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Data Grid
              </button>
            </div>

            {/* Export Actions */}
            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Download CSV spreadsheet of current filtered events"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" /> Export CSV
            </button>
            <button
              onClick={() => printElement('full-event-log-container', { title: 'System Event Log' })}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Print Event Log"
            >
              <Printer size={13} className="text-slate-600" /> Print
            </button>
          </div>
        </div>

        {/* Event List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50 space-y-3 min-h-[350px]">
          {filteredEvents.length > 0 ? (
            viewMode === 'feed' ? (
              <div className="space-y-3">
                {filteredEvents.map((evt: any) => {
                  const isUnread = evt.status === 'UNREAD';
                  const evtDate = new Date(evt.date || evt.timestamp || Date.now());
                  const formattedTime = evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const formattedDate = evtDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <div 
                      key={evt.id}
                      onClick={() => setSelectedEventDetails(evt)}
                      className={cn(
                        "p-4 sm:p-5 rounded-2xl bg-white border transition-all duration-200 hover:shadow-md cursor-pointer relative group",
                        isUnread ? "border-primary-300 ring-1 ring-primary-100 bg-primary-50/10" : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                          <div className={cn(
                            "p-2.5 rounded-xl border mt-0.5 shrink-0",
                            isUnread ? "bg-primary-50 border-primary-200 text-primary-600" : "bg-slate-50 border-slate-200 text-slate-500"
                          )}>
                            {getEventIcon(evt.type, evt.channel, evt.priority)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border", getChannelBadge(evt.channel))}>
                                {evt.type?.replace('_', ' ') || 'SYSTEM'} · {evt.channel || 'SYSTEM'}
                              </span>
                              <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border", getPriorityBadge(evt.priority, evt.type))}>
                                {evt.priority || (evt.type === 'LOW_STOCK' ? 'CRITICAL' : 'INFO')}
                              </span>
                              {isUnread && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-2xs">
                                  NEW
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-semibold ml-auto flex items-center gap-1">
                                <Clock size={11} /> {formattedDate} at {formattedTime}
                              </span>
                            </div>

                            <h4 className="text-sm font-black text-slate-900 tracking-tight mb-1 group-hover:text-primary-600 transition-colors">
                              {evt.title || 'System Notification'}
                            </h4>
                            
                            <p className="text-xs text-slate-600 leading-relaxed break-words">
                              {evt.message || 'No additional event details.'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-start opacity-80 group-hover:opacity-100">
                          {isUnread && (
                            <button
                              onClick={(e) => handleMarkSingleRead(evt.id, e)}
                              className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Mark as Read"
                            >
                              <CheckCheck size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDismissSingle(evt.id, e)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Dismiss & Remove Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* High-Density Table Mode */
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-[9px] tracking-wider">
                        <th className="p-3">Status</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Channel / Type</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Event Title & Summary</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvents.map((evt: any) => {
                        const isUnread = evt.status === 'UNREAD';
                        const evtDate = new Date(evt.date || evt.timestamp || Date.now());
                        return (
                          <tr 
                            key={evt.id} 
                            onClick={() => setSelectedEventDetails(evt)}
                            className={cn(
                              "hover:bg-slate-50 transition-colors cursor-pointer",
                              isUnread ? "bg-primary-50/20 font-bold" : ""
                            )}
                          >
                            <td className="p-3">
                              {isUnread ? (
                                <span className="w-2.5 h-2.5 bg-primary-500 rounded-full inline-block animate-pulse"></span>
                              ) : (
                                <span className="w-2.5 h-2.5 bg-slate-300 rounded-full inline-block"></span>
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                              {evtDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", getChannelBadge(evt.channel))}>
                                {evt.channel || 'SYSTEM'}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border", getPriorityBadge(evt.priority, evt.type))}>
                                {evt.priority || (evt.type === 'LOW_STOCK' ? 'CRITICAL' : 'INFO')}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-black text-slate-900">{evt.title}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{evt.message}</p>
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {isUnread && (
                                  <button
                                    onClick={() => handleMarkSingleRead(evt.id)}
                                    className="p-1 hover:bg-emerald-100 text-slate-400 hover:text-emerald-700 rounded transition-colors"
                                    title="Mark Read"
                                  >
                                    <CheckCheck size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDismissSingle(evt.id)}
                                  className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* Empty State */
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Activity size={32} className="opacity-40" />
              </div>
              <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                Event Log Clean & Calibrated
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No active notifications or matching event records found for the selected filter parameters.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedChannel('ALL');
                    setSelectedStatus('ALL');
                    setSelectedSeverity('ALL');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  onClick={handleSimulateEvent}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Simulate Sample Alert
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Showing <strong className="text-slate-900">{filteredEvents.length}</strong> of <strong className="text-slate-900">{notifications.length}</strong> events</span>
            {selectedStatus !== 'ALL' && <span className="text-primary-600 font-bold">• Filter: {selectedStatus}</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {setActiveTab && (
              <button
                onClick={() => {
                  onClose();
                  setActiveTab('alerts');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              >
                Operational Vector Tab <ExternalLink size={12} />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
            >
              Close Event Log
            </button>
          </div>
        </div>
      </div>

      {/* Single Event Detail Popup if clicked */}
      {selectedEventDetails && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                {getEventIcon(selectedEventDetails.type, selectedEventDetails.channel, selectedEventDetails.priority)}
                <h4 className="font-black text-sm uppercase tracking-wider">Event Payload Inspector</h4>
              </div>
              <button 
                onClick={() => setSelectedEventDetails(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Title</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">{selectedEventDetails.title}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</p>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 leading-relaxed">
                  {selectedEventDetails.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Channel</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedEventDetails.channel || 'SYSTEM'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type / Node</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedEventDetails.type || 'GENERAL'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</p>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {new Date(selectedEventDetails.date || selectedEventDetails.timestamp || Date.now()).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedEventDetails.status || 'UNREAD'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {selectedEventDetails.status === 'UNREAD' && (
                  <button
                    onClick={() => {
                      handleMarkSingleRead(selectedEventDetails.id);
                      setSelectedEventDetails({ ...selectedEventDetails, status: 'READ' });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Mark As Read
                  </button>
                )}
                <button
                  onClick={() => handleDismissSingle(selectedEventDetails.id)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
