import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  Download, 
  Clock, 
  CheckCircle2, 
  Search, 
  FileSpreadsheet, 
  RotateCcw, 
  X,
  Layers,
  FileText,
  Eye,
  Filter,
  Check
} from 'lucide-react';
import { useAuthStore, UserRole } from '../../store/authStore';
import { useERPData } from '../../hooks/useERPData';

interface SectionMeta {
  key: string;
  name: string;
  category: string;
  description: string;
  dateKey: string;
}

const SECTION_CONFIGS: SectionMeta[] = [
  // Sales & CRM
  { key: 'leads', name: 'CRM Inquiries & Sales Leads', category: 'Sales & CRM', description: 'Prospective clients, inquiries, follow-up logs, and quotations', dateKey: 'followUpDate' },
  { key: 'invoices', name: 'Sales & Commercial Invoices', category: 'Sales & CRM', description: 'Tax invoices, billing slips, and dealer dispatch invoices', dateKey: 'date' },
  { key: 'vyaparRecords', name: 'Financial Vouchers & Payments', category: 'Sales & CRM', description: 'Bank receipts, voucher logs, vendor payouts, and expenses', dateKey: 'date' },
  
  // Stores & Logistics
  { key: 'purchaseOrders', name: 'Purchase Orders & Supplier Inward', category: 'Stores & Logistics', description: 'Procurement PO requests, supplier orders, and inward delivery schedules', dateKey: 'orderDate' },
  { key: 'gateEntries', name: 'Security Gate Passes & Materials', category: 'Stores & Logistics', description: 'Security gate check-in passes, supplier challan notes, and material inward records', dateKey: 'entryTimestamp' },
  { key: 'stockAudits', name: 'Physical Stock Audits & Discrepancies', category: 'Stores & Logistics', description: 'Stock verification cycle counts, variance logs, and reconciliation records', dateKey: 'auditDate' },
  { key: 'warehouseTransfers', name: 'Warehouse Transfers & Dispatch', category: 'Stores & Logistics', description: 'Inter-warehouse transfers, gate transfers, and logistics movements', dateKey: 'transferDate' },
  { key: 'inventory', name: 'Raw Material Inventory Items', category: 'Stores & Logistics', description: 'Raw material SKU components, batches, and lead plate stock records', dateKey: 'date' },
  
  // Manufacturing & Quality
  { key: 'productionHistory', name: 'Production Work Orders & Manufacturing Logs', category: 'Manufacturing & Quality', description: 'Completed manufacturing runs, assembly work orders, and pack build logs', dateKey: 'date' },
  { key: 'wipInventory', name: 'WIP Assembly Batches', category: 'Manufacturing & Quality', description: 'Work-in-progress floor batches, stage transitions, and assembly progress', dateKey: 'lastUpdate' },
  { key: 'cellGradingBatches', name: 'Cell Grading & Batch Telemetry', category: 'Manufacturing & Quality', description: 'Battery cell grading sessions, voltage/IR test runs, and grading batches', dateKey: 'inspectionDate' },
  { key: 'gradedInventory', name: 'Individual Graded Cell Records', category: 'Manufacturing & Quality', description: 'Individual cell serial test logs, internal resistance metrics, and grades', dateKey: 'date' },
  { key: 'eolCertificates', name: 'End-of-Line (EOL) Quality Certificates', category: 'Manufacturing & Quality', description: 'Final pack EOL automated test records and compliance certificates', dateKey: 'testTimestamp' },
  { key: 'scrapLogs', name: 'Production Scrap & Defect Logs', category: 'Manufacturing & Quality', description: 'Rejected cells, assembly scrap logs, and defect analysis records', dateKey: 'logDate' },
  
  // Customer Service & RMA
  { key: 'complaints', name: 'RMA Customer Complaints & Service Tickets', category: 'Customer Service & RMA', description: 'Service RMA requests, customer warranty claims, and ticket updates', dateKey: 'date' },
  { key: 'diagnosticLogs', name: 'RMA Diagnostic History Logs', category: 'Customer Service & RMA', description: 'Depot technician diagnostic logs, root cause analysis, and repair traces', dateKey: 'timestamp' },
  { key: 'warrantyChecks', name: 'Public Warranty Verification History', category: 'Customer Service & RMA', description: 'Customer portal QR code lookups and serial verification logs', dateKey: 'date' },
  { key: 'loyaltyClaims', name: 'Customer Loyalty Reward Claims', category: 'Customer Service & RMA', description: 'Customer portal loyalty reward redemptions and coupon claims', dateKey: 'date' },
  { key: 'notifications', name: 'Operational Alerts & Notifications', category: 'System Logs', description: 'Real-time alert notices, stock threshold notifications, and system events', dateKey: 'date' }
];

export const DataRetentionPurge: React.FC = () => {
  const { user } = useAuthStore();
  const { data: erpData, refetch } = useERPData();

  // Active view: 'sections' | 'explorer' | 'audit_logs'
  const [activeSubTab, setActiveSubTab] = useState<'sections' | 'explorer' | 'audit_logs'>('sections');
  
  // Target Section Selection
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>('leads');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Purge Criteria State
  const [purgeMode, setPurgeMode] = useState<'OLDER_THAN_DAYS' | 'BEFORE_DATE' | 'STATUS_ONLY' | 'ALL'>('OLDER_THAN_DAYS');
  const [olderThanDays, setOlderThanDays] = useState<number>(90);
  const [customBeforeDate, setCustomBeforeDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [purgeNotes, setPurgeNotes] = useState<string>('');

  // Selected row IDs for selective purge
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);

  // Modals & Feedback
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmInputText, setConfirmInputText] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; message: string } | null>(null);

  // Purge Audit Logs from server
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  // Safe date formatter
  const formatLogDate = (val: any): string => {
    if (!val) return 'N/A';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleString();
    } catch {
      return String(val);
    }
  };

  // Safe text helper
  const formatSafeText = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/purge-logs');
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json?.purgeLogs) ? json.purgeLogs : []);
        setAuditLogs(list);
      } else {
        setAuditLogs([]);
      }
    } catch (e) {
      console.warn('Failed to load audit logs:', e);
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'audit_logs') {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  // Helper to extract timestamp from any record
  const getRecordDate = (item: any): Date | null => {
    if (!item || typeof item !== 'object') return null;
    const candidateKeys = [
      'date', 'orderDate', 'order_date', 'entryTimestamp', 'entry_timestamp', 
      'auditDate', 'audit_date', 'transferDate', 'transfer_date', 'inspectionDate', 
      'inspection_date', 'testTimestamp', 'test_timestamp', 'logDate', 'log_date', 
      'createdAt', 'created_at', 'followUpDate', 'followup_date', 'startDate', 
      'start_date', 'timestamp', 'lastUpdate', 'resolvedDate', 'joinDate'
    ];
    for (const k of candidateKeys) {
      if (item[k]) {
        const parsed = new Date(item[k]);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  };

  // Compute stats across all sections from ERP data
  const sectionStats = useMemo(() => {
    const now = Date.now();
    const statsMap: Record<string, { total: number; older90: number; older180: number; oldestStr: string; newestStr: string }> = {};

    SECTION_CONFIGS.forEach(sec => {
      const items = (erpData && erpData[sec.key]) || [];
      const total = Array.isArray(items) ? items.length : 0;
      let older90 = 0;
      let older180 = 0;
      let minTime: number | null = null;
      let maxTime: number | null = null;

      if (Array.isArray(items)) {
        items.forEach(item => {
          const d = getRecordDate(item);
          if (d) {
            const time = d.getTime();
            if (minTime === null || time < minTime) minTime = time;
            if (maxTime === null || time > maxTime) maxTime = time;
            const diffDays = (now - time) / (1000 * 60 * 60 * 24);
            if (diffDays >= 90) older90++;
            if (diffDays >= 180) older180++;
          }
        });
      }

      statsMap[sec.key] = {
        total,
        older90,
        older180,
        oldestStr: minTime ? new Date(minTime).toISOString().split('T')[0] : 'N/A',
        newestStr: maxTime ? new Date(maxTime).toISOString().split('T')[0] : 'N/A'
      };
    });

    return statsMap;
  }, [erpData]);

  // Overall Global System Record Counts
  const globalSummary = useMemo(() => {
    let grandTotal = 0;
    let grandOlder90 = 0;
    let grandOlder180 = 0;

    Object.values(sectionStats).forEach((s: { total: number; older90: number; older180: number; oldestStr: string; newestStr: string }) => {
      grandTotal += s.total;
      grandOlder90 += s.older90;
      grandOlder180 += s.older180;
    });

    return {
      totalRecords: grandTotal,
      recordsOlder90: grandOlder90,
      recordsOlder180: grandOlder180,
      totalSections: SECTION_CONFIGS.length
    };
  }, [sectionStats]);

  // Current Target Section Meta & Items
  const currentSectionMeta = SECTION_CONFIGS.find(s => s.key === selectedSectionKey) || SECTION_CONFIGS[0];
  const currentRawItems: any[] = useMemo(() => {
    const items = erpData && erpData[selectedSectionKey];
    return Array.isArray(items) ? items : [];
  }, [erpData, selectedSectionKey]);

  // Filtered Items based on Purge Criteria
  const matchedPurgeItems = useMemo(() => {
    const now = Date.now();
    let cutOffTime: number | null = null;

    if (purgeMode === 'OLDER_THAN_DAYS') {
      cutOffTime = now - (olderThanDays * 24 * 60 * 60 * 1000);
    } else if (purgeMode === 'BEFORE_DATE' && customBeforeDate) {
      cutOffTime = new Date(customBeforeDate).getTime();
    }

    return currentRawItems.filter(item => {
      if (purgeMode === 'ALL') return true;

      // Status check
      if (statusFilter !== 'ALL') {
        const itemStatus = String(item.status || item.stage || item.qcStatus || item.qc_status || '').toUpperCase();
        if (itemStatus !== statusFilter.toUpperCase()) {
          return false;
        }
      }

      if (purgeMode === 'STATUS_ONLY') return true;

      // Date check
      if (cutOffTime !== null) {
        const d = getRecordDate(item);
        if (d && d.getTime() <= cutOffTime) {
          return true;
        }
        return false;
      }

      return true;
    });
  }, [currentRawItems, purgeMode, olderThanDays, customBeforeDate, statusFilter]);

  // Search filtered rows for Explorer View
  const explorerRows = useMemo(() => {
    if (!searchQuery.trim()) return currentRawItems;
    const q = searchQuery.toLowerCase();
    return currentRawItems.filter(row => {
      const str = JSON.stringify(row).toLowerCase();
      return str.includes(q);
    });
  }, [currentRawItems, searchQuery]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    if (!Array.isArray(auditLogs)) return [];
    if (!auditSearchQuery.trim()) return auditLogs;
    const q = auditSearchQuery.toLowerCase();
    return auditLogs.filter(log => {
      const text = `${formatSafeText(log.id)} ${formatSafeText(log.performedBy)} ${formatSafeText(log.sectionLabel)} ${formatSafeText(log.section)} ${formatSafeText(log.criteriaDescription)} ${formatSafeText(log.notes)}`.toLowerCase();
      return text.includes(q);
    });
  }, [auditLogs, auditSearchQuery]);

  // Available unique status list for current section
  const availableStatuses = useMemo(() => {
    const s = new Set<string>();
    currentRawItems.forEach(item => {
      const st = item.status || item.stage || item.qcStatus || item.qc_status;
      if (st && typeof st === 'string') s.add(st);
    });
    return Array.from(s);
  }, [currentRawItems]);

  // Handle Purge Execution
  const handleExecutePurge = async () => {
    if (matchedPurgeItems.length === 0) {
      setPurgeResult({ success: false, message: 'No records match the selected retention criteria to purge.' });
      return;
    }

    setIsPurging(true);
    setPurgeResult(null);

    try {
      const payload = {
        section: selectedSectionKey,
        mode: purgeMode,
        beforeDate: purgeMode === 'BEFORE_DATE' ? customBeforeDate : undefined,
        olderThanDays: purgeMode === 'OLDER_THAN_DAYS' ? olderThanDays : undefined,
        statusFilter: statusFilter !== 'ALL' ? statusFilter : undefined,
        performedBy: user?.name ? `${user.name} (${user.email})` : 'Super Admin',
        adminRole: user?.role || 'SUPER_ADMIN',
        notes: purgeNotes || `Retention purge executed for ${currentSectionMeta.name}`
      };

      const res = await fetch('/api/admin/purge-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPurgeResult({
          success: true,
          message: `Purge completed: Permanently removed ${json.totalDeletedCount} record(s) from ${currentSectionMeta.name}.`
        });
        setShowConfirmModal(false);
        setConfirmInputText('');
        setSelectedRowIds([]);
        await refetch();
        fetchAuditLogs();
      } else {
        setPurgeResult({
          success: false,
          message: json.error || 'Failed to complete purge operation.'
        });
      }
    } catch (err: any) {
      setPurgeResult({
        success: false,
        message: err?.message || 'Network error while executing purge.'
      });
    } finally {
      setIsPurging(false);
    }
  };

  // Handle Purge of Specific Selected Rows
  const handleExecuteSelectivePurge = async () => {
    if (selectedRowIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to permanently delete ${selectedRowIds.length} selected record(s) from ${currentSectionMeta.name}?`)) {
      return;
    }

    setIsPurging(true);
    setPurgeResult(null);

    try {
      const payload = {
        section: selectedSectionKey,
        mode: 'SELECTED_IDS',
        selectedIds: selectedRowIds,
        performedBy: user?.name ? `${user.name} (${user.email})` : 'Super Admin',
        adminRole: user?.role || 'SUPER_ADMIN',
        notes: `Selective purge of ${selectedRowIds.length} specific records from ${currentSectionMeta.name}`
      };

      const res = await fetch('/api/admin/purge-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPurgeResult({
          success: true,
          message: `Successfully purged ${json.totalDeletedCount} selected record(s).`
        });
        setSelectedRowIds([]);
        await refetch();
        fetchAuditLogs();
      } else {
        setPurgeResult({
          success: false,
          message: json.error || 'Failed to delete selected records.'
        });
      }
    } catch (err: any) {
      setPurgeResult({ success: false, message: err?.message || 'Error deleting records.' });
    } finally {
      setIsPurging(false);
    }
  };

  // Handle Single Item Delete
  const handleDeleteSingleItem = async (itemId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete record "${itemId}" from ${currentSectionMeta.name}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/delete-record-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: selectedSectionKey,
          id: itemId,
          performedBy: user?.name ? `${user.name} (${user.email})` : 'Super Admin',
          adminRole: user?.role || 'SUPER_ADMIN'
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPurgeResult({
          success: true,
          message: `Record ${itemId} deleted successfully.`
        });
        await refetch();
        fetchAuditLogs();
      } else {
        alert(json.error || 'Failed to delete record.');
      }
    } catch (err: any) {
      alert('Error deleting record: ' + err.message);
    }
  };

  // Clear Audit Logs
  const handleClearAuditLogs = async () => {
    if (!window.confirm('Are you sure you want to clear the purge audit log history? This action is logged.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/purge-logs/clear', { method: 'POST' });
      if (res.ok) {
        setAuditLogs([]);
        setPurgeResult({ success: true, message: 'Purge audit log history reset successfully.' });
      }
    } catch (e) {
      alert('Failed to clear audit logs.');
    }
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(matchedPurgeItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `arcenol_backup_${selectedSectionKey}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV Summary
  const handleExportCSV = () => {
    if (matchedPurgeItems.length === 0) return;
    const headers = Object.keys(matchedPurgeItems[0]).filter(k => typeof matchedPurgeItems[0][k] !== 'object');
    const csvRows = [
      headers.join(','),
      ...matchedPurgeItems.map(row => 
        headers.map(h => {
          const val = row[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `arcenol_records_${selectedSectionKey}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Audit Logs as CSV
  const handleExportAuditLogsCSV = () => {
    if (auditLogs.length === 0) return;
    const csvRows = [
      'Audit ID,Timestamp,Administrator,Role,Target Section,Records Purged,Criteria,Notes,Status',
      ...auditLogs.map(l => [
        `"${formatSafeText(l.id)}"`,
        `"${formatLogDate(l.timestamp)}"`,
        `"${formatSafeText(l.performedBy)}"`,
        `"${formatSafeText(l.adminRole)}"`,
        `"${formatSafeText(l.sectionLabel || l.section)}"`,
        `"${formatSafeText(l.recordsDeletedCount)}"`,
        `"${formatSafeText(l.criteriaDescription).replace(/"/g, '""')}"`,
        `"${formatSafeText(l.notes).replace(/"/g, '""')}"`,
        `"${formatSafeText(l.status || 'COMPLETED')}"`
      ].join(','))
    ];
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `arcenol_purge_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Restore Default Baseline Data
  const handleRestoreDefaults = async () => {
    if (!window.confirm(`Restore sample baseline records for ${currentSectionMeta.name}? This will seed standard starter entries.`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/restore-starter-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: selectedSectionKey })
      });
      if (res.ok) {
        alert(`Sample baseline data restored for ${currentSectionMeta.name}`);
        await refetch();
      }
    } catch (e) {
      alert('Failed to restore sample data');
    }
  };

  // Filter sections by category
  const categoriesList = ['ALL', 'Sales & CRM', 'Stores & Logistics', 'Manufacturing & Quality', 'Customer Service & RMA', 'System Logs'];
  const displayedSections = SECTION_CONFIGS.filter(s => selectedCategoryFilter === 'ALL' || s.category === selectedCategoryFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 rounded-[2.5rem] p-8 border border-rose-500/20 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-300 text-[10px] font-black uppercase tracking-widest">
              <ShieldAlert size={14} className="animate-pulse" />
              Administrative Data Governance
            </div>
            <h2 className="text-2xl lg:text-3xl font-black italic tracking-tight uppercase">
              Data Retention &amp; Record Purge Center
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
              Maintain optimal ERP performance and regulatory compliance. Securely purge obsolete records, cold sales inquiries, completed work orders, and historical audit logs with automated retention policies and cryptographic audit trails.
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Records</div>
              <div className="text-xl font-black text-white font-mono">{globalSummary.totalRecords}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Modules</div>
              <div className="text-xl font-black text-white font-mono">{globalSummary.totalSections}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">&gt; 90 Days Old</div>
              <div className="text-xl font-black text-amber-300 font-mono">{globalSummary.recordsOlder90}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">&gt; 180 Days Old</div>
              <div className="text-xl font-black text-rose-400 font-mono">{globalSummary.recordsOlder180}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('sections')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'sections'
                ? 'bg-white text-slate-900 shadow-md border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers size={15} className={activeSubTab === 'sections' ? 'text-rose-600' : 'text-slate-400'} />
            Modules &amp; Purge Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('explorer')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'explorer'
                ? 'bg-white text-slate-900 shadow-md border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search size={15} className={activeSubTab === 'explorer' ? 'text-rose-600' : 'text-slate-400'} />
            Records Explorer ({currentRawItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('audit_logs')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'audit_logs'
                ? 'bg-white text-slate-900 shadow-md border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock size={15} className={activeSubTab === 'audit_logs' ? 'text-rose-600' : 'text-slate-400'} />
            Purge Audit Log ({Array.isArray(auditLogs) ? auditLogs.length : 0})
          </button>
        </div>

        {/* Action Status Feedback */}
        {purgeResult && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${
            purgeResult.success 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {purgeResult.success ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
            <span>{purgeResult.message}</span>
            <button type="button" onClick={() => setPurgeResult(null)} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: SECTIONS & PURGE ENGINE */}
      {activeSubTab === 'sections' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column: Section Selector Grid */}
          <div className="xl:col-span-5 space-y-4">
            
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                    selectedCategoryFilter === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Section Cards List */}
            <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
              {displayedSections.map(sec => {
                const stat = sectionStats[sec.key] || { total: 0, older90: 0, older180: 0, oldestStr: 'N/A', newestStr: 'N/A' };
                const isSelected = selectedSectionKey === sec.key;

                return (
                  <div
                    key={sec.key}
                    onClick={() => {
                      setSelectedSectionKey(sec.key);
                      setSelectedRowIds([]);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/50 border-rose-400 shadow-md ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                            {sec.category}
                          </span>
                          {stat.older90 > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800">
                              {stat.older90} older &gt;90d
                            </span>
                          )}
                        </div>
                        <h4 className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-rose-950 font-extrabold' : 'text-slate-800'}`}>
                          {sec.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {sec.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black font-mono text-slate-900">
                          {stat.total}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Records
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Oldest: <strong className="text-slate-600 font-bold">{stat.oldestStr}</strong></span>
                      <span>Newest: <strong className="text-slate-600 font-bold">{stat.newestStr}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Purge Configuration Console */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-hidden">
              
              {/* Console Header */}
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                    Active Section Configuration
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                    {currentSectionMeta.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentSectionMeta.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    title="Restore Starter Samples"
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Restore Defaults</span>
                  </button>
                </div>
              </div>

              {/* Console Body */}
              <div className="p-8 space-y-8">
                
                {/* 1. Retention Mode Strategy */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-700 font-mono block">
                    1. Select Retention Rule / Purge Strategy
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    <button
                      type="button"
                      onClick={() => setPurgeMode('OLDER_THAN_DAYS')}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        purgeMode === 'OLDER_THAN_DAYS'
                          ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase text-slate-900">Preset Age Threshold</div>
                        {purgeMode === 'OLDER_THAN_DAYS' && <CheckCircle2 size={16} className="text-rose-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Purge records older than 30, 60, 90, 180, or 365 days</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurgeMode('BEFORE_DATE')}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        purgeMode === 'BEFORE_DATE'
                          ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase text-slate-900">Custom Cut-off Date</div>
                        {purgeMode === 'BEFORE_DATE' && <CheckCircle2 size={16} className="text-rose-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Delete all records logged prior to a specific calendar date</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurgeMode('STATUS_ONLY')}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        purgeMode === 'STATUS_ONLY'
                          ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase text-slate-900">Status / Condition Filter</div>
                        {purgeMode === 'STATUS_ONLY' && <CheckCircle2 size={16} className="text-rose-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Purge based on record state (e.g. Closed, Cancelled, Resolved)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurgeMode('ALL')}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        purgeMode === 'ALL'
                          ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black uppercase text-red-700">Complete Section Reset</div>
                        {purgeMode === 'ALL' && <AlertTriangle size={16} className="text-red-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Wipe all records in this section (Use with extreme caution)</p>
                    </button>
                  </div>
                </div>

                {/* 2. Specific Strategy Parameters */}
                <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-6">
                  
                  {purgeMode === 'OLDER_THAN_DAYS' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-600 font-mono block">
                        Retention Age Window (Days)
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[30, 60, 90, 180, 365].map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setOlderThanDays(days)}
                            className={`py-2.5 px-2 rounded-xl text-xs font-black uppercase font-mono cursor-pointer transition-all ${
                              olderThanDays === days
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            &gt; {days} Days
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {purgeMode === 'BEFORE_DATE' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-600 font-mono block">
                        Cut-off Date (Purge all records prior to this date)
                      </label>
                      <input
                        type="date"
                        value={customBeforeDate}
                        onChange={(e) => setCustomBeforeDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  )}

                  {/* Status / Condition Filter */}
                  {availableStatuses.length > 0 && purgeMode !== 'ALL' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-600 font-mono block">
                        Optional Status Qualification Filter
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                      >
                        <option value="ALL">All Statuses (No status restriction)</option>
                        {availableStatuses.map(st => (
                          <option key={st} value={st}>Only records with status: {st}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Audit Purge Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-600 font-mono block">
                      Administrative Reason / Regulatory Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual ledger audit clean-up, GDPR/EPR compliance archive..."
                      value={purgeNotes}
                      onChange={(e) => setPurgeNotes(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                {/* 3. Live Impact Summary Box */}
                <div className="p-6 rounded-2xl border bg-gradient-to-br from-rose-50/50 to-orange-50/30 border-rose-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-950 font-black text-sm uppercase tracking-tight">
                      <AlertTriangle size={18} className="text-rose-600" />
                      Calculated Purge Impact Assessment
                    </div>
                    <div className="px-3 py-1 bg-white rounded-full border border-rose-200 text-xs font-black text-rose-900 font-mono">
                      {matchedPurgeItems.length} of {currentRawItems.length} records match
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Records to Delete</div>
                      <div className="text-xl font-black text-rose-600 font-mono mt-0.5">{matchedPurgeItems.length}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Records Retained</div>
                      <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">{currentRawItems.length - matchedPurgeItems.length}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-rose-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Affected Section</div>
                      <div className="text-xs font-black text-slate-800 truncate mt-1">{currentSectionMeta.name}</div>
                    </div>
                  </div>

                  {matchedPurgeItems.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleExportJSON}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                        >
                          <Download size={14} className="text-slate-500" />
                          Export JSON Backup
                        </button>
                        <button
                          type="button"
                          onClick={handleExportCSV}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                        >
                          <FileSpreadsheet size={14} className="text-slate-500" />
                          Export CSV
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={matchedPurgeItems.length === 0 || isPurging}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                        Authorize &amp; Purge {matchedPurgeItems.length} Records
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECORDS EXPLORER */}
      {activeSubTab === 'explorer' && (
        <div className="space-y-6">
          
          {/* Explorer Bar */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedSectionKey}
                onChange={(e) => {
                  setSelectedSectionKey(e.target.value);
                  setSelectedRowIds([]);
                }}
                className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {SECTION_CONFIGS.map(sec => (
                  <option key={sec.key} value={sec.key}>
                    {sec.name} ({sectionStats[sec.key]?.total || 0})
                  </option>
                ))}
              </select>

              {/* Search Bar */}
              <div className="relative w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            {/* Bulk Selection Actions */}
            <div className="flex items-center gap-2">
              {selectedRowIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteSelectivePurge}
                  disabled={isPurging}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer transition-all"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedRowIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={handleExportJSON}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Download size={14} />
                Export Full Section
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.length > 0 && selectedRowIds.length === explorerRows.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRowIds(explorerRows.map(r => String(r.id || r.serial || r.code)));
                          } else {
                            setSelectedRowIds([]);
                          }
                        }}
                        className="rounded accent-rose-600"
                      />
                    </th>
                    <th className="p-4">Record Identifier</th>
                    <th className="p-4">Date / Timestamp</th>
                    <th className="p-4">Status / Stage</th>
                    <th className="p-4">Key Properties</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {explorerRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        No records found for the active query in {currentSectionMeta.name}.
                      </td>
                    </tr>
                  ) : (
                    explorerRows.map((row, idx) => {
                      const rowId = String(row.id || row.serial || row.code || `row-${idx}`);
                      const isSelected = selectedRowIds.includes(rowId);
                      const recDate = getRecordDate(row);
                      const recStatus = row.status || row.stage || row.qcStatus || row.qc_status || 'N/A';

                      return (
                        <tr key={rowId} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRowIds(prev => [...prev, rowId]);
                                } else {
                                  setSelectedRowIds(prev => prev.filter(id => id !== rowId));
                                }
                              }}
                              className="rounded accent-rose-600"
                            />
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-900">
                            {rowId}
                          </td>
                          <td className="p-4 font-mono text-slate-600">
                            {recDate ? recDate.toISOString().split('T')[0] : 'N/A'}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-slate-100 text-slate-800 border border-slate-200">
                              {recStatus}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 max-w-xs truncate">
                            {row.name || row.company || row.materialName || row.productName || row.notes || row.remarks || JSON.stringify(row).substring(0, 50)}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedRowDetail(row)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="View Raw JSON"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleItem(rowId)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PURGE AUDIT LOGS */}
      {activeSubTab === 'audit_logs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
                  <Clock className="text-rose-600" size={20} />
                  Purge &amp; Data Cleansing Audit Trail
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Cryptographic compliance record of all purge operations performed by administrators.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search logs by admin, module..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 shadow-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportAuditLogsCSV}
                  disabled={!Array.isArray(auditLogs) || auditLogs.length === 0}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Export Audit CSV"
                >
                  <FileSpreadsheet size={14} className="text-slate-500" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={fetchAuditLogs}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                  title="Refresh Audit Logs"
                >
                  <RotateCcw size={14} className={isLoadingLogs ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>

                {auditLogs && auditLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAuditLogs}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 cursor-pointer transition-all flex items-center gap-1.5"
                    title="Clear Audit History"
                  >
                    <Trash2 size={14} />
                    <span>Clear History</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Administrator</th>
                    <th className="p-4">Target Section(s)</th>
                    <th className="p-4">Retention Filter / Criteria</th>
                    <th className="p-4 text-center">Records Removed</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Clock size={32} className="mx-auto text-slate-300 stroke-1" />
                          <p className="font-bold text-slate-600">
                            {isLoadingLogs ? 'Loading audit trail logs...' : (auditSearchQuery ? 'No audit records match your search filter.' : 'No historical purge operations recorded yet.')}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            When administrators execute batch purges or single item deletions, complete immutable audit trails appear here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log: any, idx: number) => (
                      <tr key={log.id || `audit-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                          {formatLogDate(log.timestamp)}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{formatSafeText(log.performedBy) || 'Administrator'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{formatSafeText(log.adminRole) || 'SUPER_ADMIN'}</div>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {formatSafeText(log.sectionLabel || log.section) || 'ERP Modules'}
                        </td>
                        <td className="p-4 text-slate-600 max-w-sm">
                          <div>{formatSafeText(log.criteriaDescription) || 'Administrative Purge'}</div>
                          {log.notes && <div className="text-[10px] text-slate-400 italic mt-0.5">{formatSafeText(log.notes)}</div>}
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-black font-mono bg-rose-50 text-rose-700 border border-rose-200">
                            -{log.recordsDeletedCount ?? 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {formatSafeText(log.status) || 'COMPLETED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 max-w-lg w-full p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Confirm Permanent Record Purge
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Irreversible Administrative Operation
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2 text-xs text-rose-900">
              <p className="font-bold">
                You are about to permanently delete <span className="underline font-black">{matchedPurgeItems.length} records</span> from:
              </p>
              <p className="font-mono font-black text-slate-900 bg-white p-2 rounded-xl border border-rose-200">
                {currentSectionMeta.name} ({selectedSectionKey})
              </p>
              <p className="text-[11px] text-slate-600 pt-1">
                Criteria: {purgeMode === 'OLDER_THAN_DAYS' ? `Older than ${olderThanDays} days` : purgeMode === 'BEFORE_DATE' ? `Before ${customBeforeDate}` : purgeMode === 'ALL' ? 'Complete Section Reset' : `Status: ${statusFilter}`}
              </p>
            </div>

            {matchedPurgeItems.length > 5 && (
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-600 font-mono block">
                  Security Confirmation: Type <span className="text-rose-600 font-black">DELETE</span> to proceed
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmInputText('');
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-all"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={isPurging || (matchedPurgeItems.length > 5 && confirmInputText !== 'DELETE')}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20 cursor-pointer transition-all flex items-center gap-2"
              >
                {isPurging ? 'Purging Records...' : `Confirm & Delete (${matchedPurgeItems.length})`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DETAIL JSON MODAL */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 max-w-2xl w-full p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
                  Record Metadata Inspector
                </h4>
                <p className="text-[10px] font-mono text-slate-400">
                  ID: {selectedRowDetail.id || selectedRowDetail.serial || selectedRowDetail.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl max-h-96 overflow-y-auto">
              <pre>{JSON.stringify(selectedRowDetail, null, 2)}</pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
