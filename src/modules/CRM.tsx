import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Search,
  MapPin,
  User,
  Phone,
  Calendar,
  Clock,
  Plus,
  MoreVertical,
  Filter,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  MessageSquare,
  Map,
  FileText,
  ChevronRight,
  BadgeCheck,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Zap,
  Edit,
  Copy,
  Printer,
  ClipboardCheck,
  Trash2,
  X,
  History,
  PlusCircle,
  Download,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { downloadReportDataAsPDF } from "../lib/pdfGenerator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useERPData } from "../hooks/useERPData";
import { cn } from "../lib/utils";

export const MARKETING_EXECUTIVES = [
  { id: "exec-1", name: "Suresh Raina", role: "North CRM Executive", email: "sales@arcenol.com", phone: "+91 98112 33445" },
  { id: "exec-2", name: "Priya Sharma", role: "West Marketing Lead", email: "priya@arcenol.com", phone: "+91 98220 11223" },
  { id: "exec-3", name: "Amit Trivedi", role: "Plant & B2B Sales Specialist", email: "amit@arcenol.com", phone: "+91 99887 66554" },
  { id: "exec-4", name: "Rajesh Kumar", role: "South Regional Head", email: "rajesh@arcenol.com", phone: "+91 98440 55667" },
  { id: "exec-5", name: "Anjali Verma", role: "East Commercial Exec", email: "anjali@arcenol.com", phone: "+91 98330 44556" },
  { id: "exec-6", name: "Vikram Malhotra", role: "Central Field Executive", email: "vikram@arcenol.com", phone: "+91 98210 99887" },
];

const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "ORDER_RECEIVED",
  "CONVERTED",
  "LAPSED",
  "DEAD",
];

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700 border border-slate-200",
  CONTACTED: "bg-blue-100 text-blue-700 border border-blue-200",
  INTERESTED: "bg-amber-100 text-amber-700 border border-amber-200",
  QUOTATION_SENT: "bg-purple-100 text-purple-700 border border-purple-200",
  NEGOTIATION: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  ORDER_RECEIVED: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  CONVERTED: "bg-primary-100 text-primary-700 border border-primary-200",
  LAPSED: "bg-amber-500/20 text-amber-900 border border-amber-400 font-extrabold",
  DEAD: "bg-rose-500/20 text-rose-900 border border-rose-400 font-extrabold",
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "🟢 New Inquiry",
  CONTACTED: "🔵 Begin Follow-up",
  INTERESTED: "🟡 Spark Interest",
  QUOTATION_SENT: "🟣 Quote Proposed",
  NEGOTIATION: "💼 Negotiation",
  ORDER_RECEIVED: "📦 Order Received",
  CONVERTED: "👑 Certify Partner",
  LAPSED: "⏳ Lapsed Deal (Unattended)",
  DEAD: "💀 Dead Deal (Closed/Lost)",
};

export const CRM: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const [activeSubTab, setActiveSubTab] = useState<
    "enquiries" | "leads" | "dealers" | "performance"
  >("enquiries");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddDealer, setShowAddDealer] = useState(false);
  const [showTerritoryMap, setShowTerritoryMap] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<
    "All" | "North" | "South" | "West" | "East" | "Central"
  >("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStage, setActiveStage] = useState<string | "ALL">("ALL");
  const [copiedLead, setCopiedLead] = useState<any>(null);
  const [copiedDealer, setCopiedDealer] = useState<any>(null);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [editingDealer, setEditingDealer] = useState<any>(null);
  const [viewingDealer, setViewingDealer] = useState<any>(null);

  // Marketing Executive Reassignment Modal State
  const [reassigningLead, setReassigningLead] = useState<any>(null);
  const [selectedExecForAssign, setSelectedExecForAssign] = useState<string>("");

  // Non-blocking modal & toast states
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [deletingDealerId, setDeletingDealerId] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const [isSyncing, setIsSyncing] = useState(false);

  // Follow-up interaction log states
  const [newRemarkText, setNewRemarkText] = useState("");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpTime, setNewFollowUpTime] = useState("10:00");

  // Today's follow up schedule alert states
  const [showTodaysPopup, setShowTodaysPopup] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  useEffect(() => {
    if (loading || !data?.leads) return;
    if (hasAutoOpened) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const todaysFollowUps = data.leads.filter(
      (l: any) => l.status !== "CONVERTED" && l.followUpDate === todayStr
    );

    if (todaysFollowUps.length > 0) {
      setShowTodaysPopup(true);
      setHasAutoOpened(true);
    }
  }, [data?.leads, loading, hasAutoOpened]);

  const handleAction = (
    actionName: string,
    callback: () => void | Promise<void>,
  ) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(async () => {
      await callback();
      setIsSyncing(false);
    }, 100);
  };

  const handleCopyLead = (l: any) => {
    const rawData = {
      company: l.company || "",
      category: l.category || "Dealer",
      location: l.location || "",
      contactPerson: l.contactPerson || "",
      phone: l.phone || "",
      requirement: l.requirement || "",
      leadSource: l.leadSource || "Website",
      notes: l.notes || "",
    };
    setCopiedLead(rawData);
    try {
      navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
    } catch (e) {}
    showToast(`Lead "${l.company || 'Record'}" copied! Click '+ NEW INQUIRY' to paste clone.`);
  };

  const handlePasteLead = () => {
    if (!copiedLead) return;
    setForm({
      ...form,
      company: `${copiedLead.company} (CLONE)`,
      category: copiedLead.category,
      location: copiedLead.location,
      contactPerson: copiedLead.contactPerson,
      phone: copiedLead.phone,
      requirement: copiedLead.requirement,
      leadSource: copiedLead.leadSource,
      notes: copiedLead.notes,
    });
    showToast(`Pasted lead configuration for ${copiedLead.company}.`);
  };

  const handleCopyDealer = (d: any) => {
    const rawData = {
      company: d.company || "",
      category: d.category || "Tier 1 Dealer",
      gstin: d.gstin || "",
      phone: d.phone || "",
      email: d.email || "",
      location: d.location || "",
      contactPerson: d.contactPerson || "",
      bankDetails: d.bankDetails || "Not Provided",
      status: d.status || "ACTIVE",
    };
    setCopiedDealer(rawData);
    try {
      navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
    } catch (e) {}
    showToast(`Partner "${d.company || 'Dealer'}" copied! Click '+ NEW DEALER' to paste clone.`);
  };

  const handlePasteDealer = () => {
    if (!copiedDealer) return;
    setDealerForm({
      ...dealerForm,
      company: `${copiedDealer.company} (CLONE)`,
      category: copiedDealer.category,
      gstin: copiedDealer.gstin,
      phone: copiedDealer.phone,
      email: copiedDealer.email,
      location: copiedDealer.location,
      contactPerson: copiedDealer.contactPerson,
      bankDetails: copiedDealer.bankDetails,
      status: copiedDealer.status,
    });
    showToast(`Pasted partner configuration for ${copiedDealer.company}.`);
  };

  const handleAppendRemark = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    if (!newRemarkText.trim()) {
      showToast("Please enter remark notes before appending.", "error");
      return;
    }
    if (!newFollowUpDate) {
      showToast("Please select the next follow-up date.", "error");
      return;
    }

    const logEntry = {
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      text: newRemarkText.trim(),
      nextFollowUpDate: newFollowUpDate,
      nextFollowUpTime: newFollowUpTime || "10:00",
    };

    const currentLog = editingLead.remarksLog || [];
    const updatedLog = [...currentLog, logEntry];

    // Update the editingLead state immediately
    setEditingLead({
      ...editingLead,
      remarksLog: updatedLog,
      followUpDate: newFollowUpDate,
      followUpTime: newFollowUpTime || "10:00",
      notes: editingLead.notes 
        ? `${editingLead.notes}\n[Follow-up ${logEntry.date}]: ${logEntry.text}`
        : `[Follow-up ${logEntry.date}]: ${logEntry.text}`
    });

    setNewRemarkText("");
    showToast("Remark appended to interaction log!", "info");
  };

  const handleStartEditLead = (lead: any) => {
    setEditingLead({ ...lead });
    setNewRemarkText("");
    const todayStr = new Date().toISOString().split("T")[0];
    setNewFollowUpDate(lead.followUpDate || todayStr);
    setNewFollowUpTime(lead.followUpTime || "10:00");
  };

  const handleSaveEditLead = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (!editingLead) return;
    try {
      await fetch(`/api/leads/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLead),
      });
      showToast(`Lead workspace for "${editingLead.company || 'Inquiry'}" saved successfully!`);
      setEditingLead(null);
      refetch();
    } catch (err) {
      showToast("Failed to save lead updates.", "error");
    }
  };

  const handleSaveEditDealer = async (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (!editingDealer) return;
    try {
      await fetch(`/api/dealers/${editingDealer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDealer),
      });
      showToast(`Certified Partner profile for "${editingDealer.company || 'Dealer'}" saved!`);
      setEditingDealer(null);
      refetch();
    } catch (err) {
      showToast("Failed to save dealer updates.", "error");
    }
  };

  const handlePrintCRMReport = () => {
    const dealersList = data?.dealers || [];
    const leadsList = data?.leads || [];
    downloadReportDataAsPDF({
      title: `CRM ${activeSubTab === 'dealers' ? 'Certified Partners' : 'Enquiries & Pipeline'} Report`,
      subtitle: `Total Records Logged: ${activeSubTab === 'dealers' ? dealersList.length : leadsList.length}`,
      headers: ["Company / Contact", "Category", "Location / Region", "Status", "Contact Details"],
      rows: activeSubTab === 'dealers' 
        ? dealersList.map((d: any) => [d.company || 'Partner', d.category || 'Tier 1 Dealer', d.location || 'India', d.status || 'ACTIVE', `${d.phone || 'N/A'} (${d.contactPerson || 'Rep'})`])
        : leadsList.map((l: any) => [l.company || 'Lead Entry', l.category || 'Enquiry', l.location || 'India', l.status || 'NEW', `${l.phone || 'N/A'} (${l.contactPerson || 'N/A'})`]),
      filename: `CRM_${activeSubTab}_Report.pdf`
    });
  };

  const [dealerForm, setDealerForm] = useState({
    company: "",
    category: "Tier 1 Dealer",
    gstin: "",
    phone: "",
    email: "",
    location: "",
    contactPerson: "",
    bankDetails: "",
    status: "ACTIVE",
  });

  const [form, setForm] = useState({
    company: "",
    category: "Dealer",
    location: "",
    contactPerson: "",
    phone: "",
    followUpDate: new Date().toISOString().split("T")[0],
    followUpTime: "10:00",
    requirement: "",
    leadSource: "Website",
    notes: "",
    assignedExecutive: "Suresh Raina (North CRM Executive)",
  });

  const handleAssignExecutive = async (leadId: string, executiveName: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedExecutive: executiveName }),
      });
      showToast(`Reassigned lead to executive: ${executiveName}`, "success");
      setReassigningLead(null);
      refetch();
    } catch (e) {
      showToast("Failed to assign marketing executive.", "error");
    }
  };

  const handleAutoMarkLapsedDeals = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const overdueUnattended = (data?.leads || []).filter(
      (l: any) =>
        l.status !== "CONVERTED" &&
        l.status !== "DEAD" &&
        l.status !== "LAPSED" &&
        l.followUpDate &&
        l.followUpDate < todayStr
    );

    if (overdueUnattended.length === 0) {
      showToast("No unattended overdue deals found to mark as lapsed.", "info");
      return;
    }

    setIsSyncing(true);
    let updatedCount = 0;
    for (const lead of overdueUnattended) {
      try {
        await fetch(`/api/leads/${lead.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "LAPSED" }),
        });
        updatedCount++;
      } catch (e) {}
    }
    setIsSyncing(false);
    showToast(`Marked ${updatedCount} overdue deal(s) as 'Lapsed Deal'`, "success");
    refetch();
  };

  const handleAdd = async () => {
    if (!form.company.trim()) {
      showToast("Please enter a company or entity name.", "error");
      return;
    }
    const payload = {
      ...form,
      status: "NEW",
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(`New inquiry for "${form.company}" created!`);
        setShowAdd(false);
        setForm({
          company: "",
          category: "Dealer",
          location: "",
          contactPerson: "",
          phone: "",
          followUpDate: new Date().toISOString().split("T")[0],
          followUpTime: "10:00",
          requirement: "",
          leadSource: "Website",
          notes: "",
          assignedExecutive: "Suresh Raina (North CRM Executive)",
        });
        refetch();
      } else {
        showToast("Failed to create new lead inquiry.", "error");
      }
    } catch (e) {
      showToast("Network error creating lead inquiry.", "error");
    }
  };

  const handleAddDealer = async () => {
    const newCustId = `D-${Date.now()}`;
    let newDealerObj: any = {
      id: newCustId,
      company: dealerForm.company || "Unnamed Partner",
      name: dealerForm.company || "Unnamed Partner",
      category: dealerForm.category || "Tier 1 Dealer",
      gstin: dealerForm.gstin || "N/A",
      phone: dealerForm.phone || "N/A",
      email: dealerForm.email || "N/A",
      location: dealerForm.location || "N/A",
      contactPerson: dealerForm.contactPerson || "N/A",
      bankDetails: dealerForm.bankDetails || "",
      status: dealerForm.status || "ACTIVE"
    };

    try {
      const res = await fetch("/api/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealerForm),
      });
      if (res.ok) {
        const serverRes = await res.json();
        if (serverRes && serverRes.id) {
          newDealerObj = { ...newDealerObj, ...serverRes };
        }
      }
    } catch (err) {}

    try {
      await supabase.from("customers").upsert({
        id: String(newDealerObj.id),
        name: newDealerObj.company || newDealerObj.name,
        branch: newDealerObj.location || "Headquarters",
        gstin: newDealerObj.gstin || "N/A",
        contact_person: newDealerObj.contactPerson || "N/A",
        phone: newDealerObj.phone || "N/A",
        address: newDealerObj.location || "N/A"
      });
    } catch (sbErr) {}

    if (data) {
      data.dealers = [newDealerObj, ...(data.dealers || []).filter((d: any) => String(d.id) !== String(newDealerObj.id))];
      data.customers = [newDealerObj, ...(data.customers || []).filter((c: any) => String(c.id) !== String(newDealerObj.id))];
      try { localStorage.setItem("arcenol_db_clean", JSON.stringify(data)); } catch (e) {}
    }

    showToast(`Certified Partner "${newDealerObj.company}" registered!`);
    setShowAddDealer(false);
    setDealerForm({
      company: "",
      category: "Tier 1 Dealer",
      gstin: "",
      phone: "",
      email: "",
      location: "",
      contactPerson: "",
      bankDetails: "",
      status: "ACTIVE",
    });
    refetch();
  };

  const handleUpdateStatus = async (id: string, stage: string) => {
    await fetch(`/api/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: stage }),
    });
    showToast(`Lead stage updated to ${stage.replace('_', ' ')}!`, "info");
    refetch();
  };

  const handleDeleteLead = (id: string) => {
    setDeletingLeadId(id);
  };

  const confirmDeleteLead = async () => {
    if (!deletingLeadId) return;
    const targetLead = data?.leads?.find((l: any) => l.id === deletingLeadId);
    const compName = targetLead?.company || 'Lead';
    try {
      await fetch(`/api/leads/${deletingLeadId}`, { method: "DELETE" });
      showToast(`Lead "${compName}" deleted from pipeline.`, "info");
      setDeletingLeadId(null);
      refetch();
    } catch (e) {
      showToast("Failed to delete lead.", "error");
    }
  };

  const handleDeleteDealer = (id: string) => {
    setDeletingDealerId(id);
  };

  const confirmDeleteDealer = async () => {
    if (!deletingDealerId) return;
    const targetDealer = data?.dealers?.find((d: any) => d.id === deletingDealerId);
    const compName = targetDealer?.company || 'Dealer';
    try {
      await fetch(`/api/dealers/${deletingDealerId}`, { method: "DELETE" });
      showToast(`Certified Partner "${compName}" deleted from registry.`, "info");
      setDeletingDealerId(null);
      refetch();
    } catch (e) {
      showToast("Failed to delete dealer.", "error");
    }
  };

  const handleConvertLead = (id: string) => {
    setConvertingLeadId(id);
  };

  const confirmConvertLead = async () => {
    if (!convertingLeadId) return;
    const targetLead = data?.leads?.find((l: any) => l.id === convertingLeadId);
    const compName = targetLead?.company || 'Lead';
    try {
      await fetch(`/api/leads/convert/${convertingLeadId}`, { method: "POST" });
      showToast(`Lead "${compName}" successfully converted to Certified Dealer!`, "success");
      setConvertingLeadId(null);
      setActiveSubTab("dealers");
      refetch();
    } catch (e) {
      showToast("Failed to convert lead.", "error");
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-600/20 blur-3xl rounded-full animate-pulse"></div>
          <Users
            size={60}
            className="text-primary-600 animate-bounce relative z-10"
          />
        </div>
        <h3 className="mt-10 text-lg font-black italic uppercase tracking-tighter text-slate-900">
          Accessing Lead Database...
        </h3>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary-600 animate-pulse">
          Establishing Secure Node Pipeline
        </p>
      </div>
    );

  const filteredDealers = (data?.dealers || []).filter(
    (d: any) =>
      (d.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredLeads = (data?.leads || []).filter((l: any) => {
    const matchesSearch =
      (l.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.location || "").toLowerCase().includes(searchTerm.toLowerCase());
    const leadStage = l.status || "NEW";
    const matchesStage = activeStage === "ALL" || leadStage === activeStage;
    return matchesSearch && matchesStage;
  });

  const rawEnquiries =
    (data?.leads || []).filter((l: any) => (l.status || "NEW") === "NEW");
  const filteredEnquiries = rawEnquiries.filter((l: any) => {
    return (
      (l.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((l.requirement || "").toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const totalEnquiries = rawEnquiries.length;
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueEnquiries = rawEnquiries.filter(
    (l: any) => l.followUpDate && l.followUpDate < todayStr,
  ).length;
  const todayEnquiries = rawEnquiries.filter(
    (l: any) => l.followUpDate && l.followUpDate === todayStr,
  ).length;
  const websiteEnquiries = rawEnquiries.filter(
    (l: any) => l.leadSource === "Website",
  ).length;

  const getFollowUpStatus = (dateStr: string) => {
    if (!dateStr)
      return {
        label: "Scheduled",
        style: "bg-slate-100 text-slate-500 border-slate-200",
      };
    const today = new Date().toISOString().split("T")[0];
    if (dateStr < today) {
      return {
        label: "Overdue Follow-up",
        style: "bg-red-55 border-red-100 text-red-700",
      };
    } else if (dateStr === today) {
      return {
        label: "Action Needed Today",
        style: "bg-amber-100 border-amber-200 text-amber-700 animate-pulse",
      };
    } else {
      return {
        label: "Upcoming Activity",
        style: "bg-indigo-50 border-indigo-100 text-indigo-700",
      };
    }
  };

  const sources = [
    "Website",
    "Exhibition",
    "Cold Call",
    "Referral",
    "Indiamart / B2B",
    "Social Media",
  ];
  const channelMatrix = sources.map((src) => {
    const srcLeads =
      data?.leads?.filter((l: any) => l.leadSource === src) || [];
    const newCount = srcLeads.filter((l: any) => l.status === "NEW").length;
    const activeCount = srcLeads.filter(
      (l: any) => l.status !== "NEW" && l.status !== "CONVERTED",
    ).length;
    const categories =
      Array.from(new Set(srcLeads.map((l: any) => l.category)))
        .slice(0, 2)
        .join(", ") || "N/A";
    const total = srcLeads.length;
    const conversionRate =
      total > 0
        ? Math.round(
            (srcLeads.filter((l: any) => l.status === "CONVERTED").length /
              total) *
              100,
          )
        : 0;

    return {
      source: src,
      categories,
      newCount,
      activeCount,
      conversionRate,
    };
  });

  return (
    <div
      className={cn(
        "space-y-6 transition-opacity duration-300",
        isSyncing && "opacity-50 pointer-events-none",
      )}
    >
      {editingLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[2rem] border border-slate-200 shadow-2xl flex flex-col overflow-hidden mx-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">
                  Inquiry Workspace & Follow-Up Log
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Update corporate specifications, append interaction logs, and schedule reminders
                </p>
              </div>
              <button
                onClick={() => setEditingLead(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Dual-Pane) */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
              {/* Left Column: Core Profile Info */}
              <div className="p-6 border-r border-slate-100 overflow-y-auto space-y-5 text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                  <User size={13} className="mr-1.5 text-slate-400" /> Corporate Profile & Specs
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Company / Entity Name
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold text-[#111827] bg-slate-50/50 text-xs py-2.5"
                      value={editingLead.company || ""}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          company: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Contact Person
                      </label>
                      <input
                        required
                        className="input-field rounded-xl font-bold text-[#111827] bg-slate-50/50 text-xs py-2.5"
                        value={editingLead.contactPerson || ""}
                        onChange={(e) =>
                          setEditingLead({
                            ...editingLead,
                            contactPerson: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Phone Number
                      </label>
                      <input
                        required
                        className="input-field rounded-xl font-bold text-[#111827] bg-slate-50/50 text-xs py-2.5"
                        value={editingLead.phone || ""}
                        onChange={(e) =>
                          setEditingLead({
                            ...editingLead,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Location
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold text-[#111827] bg-slate-50/50 text-xs py-2.5"
                      value={editingLead.location || ""}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Initial Requirements Specifications
                    </label>
                    <textarea
                      className="input-field rounded-xl font-medium text-[#111827] bg-slate-50/50 text-xs p-3 h-24 resize-none leading-relaxed"
                      value={editingLead.requirement || ""}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          requirement: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Assigned Marketing / Sales Executive
                    </label>
                    <select
                      className="input-field rounded-xl font-bold text-[#111827] bg-slate-50/50 text-xs py-2.5"
                      value={editingLead.assignedExecutive || "Suresh Raina (North CRM Executive)"}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          assignedExecutive: e.target.value,
                        })
                      }
                    >
                      {MARKETING_EXECUTIVES.map((exec) => (
                        <option key={exec.id} value={`${exec.name} (${exec.role})`}>
                          {exec.name} — {exec.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Pipeline Stage
                    </label>
                    <select
                      className="input-field rounded-xl font-bold text-[#111827] bg-slate-50/50 text-xs py-2.5"
                      value={editingLead.status || "NEW"}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          status: e.target.value,
                        })
                      }
                    >
                      {LEAD_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s] || s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      General Notes
                    </label>
                    <textarea
                      className="input-field rounded-xl font-medium text-[#111827] bg-slate-50/50 text-xs p-3 h-20 resize-none leading-relaxed"
                      value={editingLead.notes || ""}
                      onChange={(e) =>
                        setEditingLead({
                          ...editingLead,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Remarks Log & Interaction Timeline */}
              <div className="p-6 bg-slate-50/30 overflow-y-auto flex flex-col h-full text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center shrink-0">
                  <History size={13} className="mr-1.5 text-slate-400" /> Interactions Timeline
                </h4>

                {/* Scrollable list of past logs */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 scrollbar-thin">
                  {(() => {
                    const timeline: any[] = [];
                    
                    // Add original notes/requirement if present
                    if (editingLead.requirement) {
                      timeline.push({
                        date: "Initial Capture",
                        time: "10:00",
                        text: `Requirement logged: ${editingLead.requirement}`,
                        nextFollowUpDate: editingLead.followUpDate,
                        nextFollowUpTime: editingLead.followUpTime,
                        isInitial: true
                      });
                    }

                    // Add logs from remarksLog
                    if (editingLead.remarksLog && Array.isArray(editingLead.remarksLog)) {
                      timeline.push(...editingLead.remarksLog);
                    }

                    if (timeline.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          No interactions logged yet.
                        </div>
                      );
                    }

                    // Render in reverse chronological order (newest on top)
                    return timeline.slice().reverse().map((log: any, index: number) => (
                      <div key={index} className="relative pl-5 border-l-2 border-slate-200 pb-1 text-left">
                        <div className={cn(
                          "absolute -left-[6px] top-1.5 w-2.5 h-2.5 rounded-full border-2",
                          log.isInitial ? "bg-slate-400 border-white shadow-xs" : "bg-emerald-500 border-white shadow-xs"
                        )} />
                        
                        <div className="bg-white border border-slate-150 p-3 rounded-xl hover:shadow-2xs transition-shadow">
                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 font-mono">
                            <span>{log.date} @ {log.time}</span>
                            {log.nextFollowUpDate && (
                              <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                Next: {log.nextFollowUpDate}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed break-words font-medium">
                            {log.text}
                          </p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Add New Interaction Form Panel */}
                <div className="border-t border-slate-100 pt-4 mt-auto shrink-0 bg-white/50 backdrop-blur-xs p-1 rounded-xl">
                  <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center">
                    <PlusCircle size={13} className="mr-1.5 text-emerald-600" /> Log New Follow-up Discussion
                  </h5>
                  <div className="space-y-3">
                    <div>
                      <textarea
                        placeholder="Type follow-up discussion summary..."
                        className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:bg-white transition-all rounded-xl p-2.5 text-xs font-medium text-slate-800 h-16 outline-none resize-none shadow-3xs"
                        value={newRemarkText}
                        onChange={(e) => setNewRemarkText(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Next Follow-up Date
                        </label>
                        <input
                          type="date"
                          className="w-full bg-white border border-slate-200 focus:border-emerald-500 transition-all rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                          value={newFollowUpDate}
                          onChange={(e) => setNewFollowUpDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Next Follow-up Time
                        </label>
                        <input
                          type="time"
                          className="w-full bg-white border border-slate-200 focus:border-emerald-500 transition-all rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                          value={newFollowUpTime}
                          onChange={(e) => setNewFollowUpTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAppendRemark}
                      disabled={!newRemarkText.trim()}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus size={11} /> Append Remark & Set Follow-up Date
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 rounded-b-[2rem]">
              <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping" />
                Active follow-up date: <span className="text-slate-800 ml-1 font-extrabold">{editingLead.followUpDate}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditLead}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer"
                >
                  Save Workspace Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTodaysPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] mx-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 animate-bounce">
                  <Clock size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-black font-sans text-slate-900 uppercase tracking-tight italic">
                    Today's Follow-up Agenda
                  </h3>
                  <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-0.5">
                    Action required for {data?.leads?.filter((l: any) => l.status !== "CONVERTED" && l.followUpDate === todayStr).length} inquiries today ({todayStr})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTodaysPopup(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(() => {
                const todays = data?.leads?.filter((l: any) => l.status !== "CONVERTED" && l.followUpDate === todayStr) || [];
                if (todays.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm font-bold uppercase tracking-wide">All clear! No follow-ups scheduled for today.</p>
                    </div>
                  );
                }
                return todays.map((lead: any) => {
                  const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
                  return (
                    <div key={lead.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            {lead.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono flex items-center font-bold">
                            <Clock size={11} className="mr-1 text-slate-400" /> {lead.followUpTime || "10:00"}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">{lead.company}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <p className="text-slate-600 flex items-center font-medium">
                            <User size={12} className="mr-1.5 text-slate-400" /> {lead.contactPerson}
                          </p>
                          <p className="text-slate-500 flex items-center font-mono">
                            <Phone size={12} className="mr-1.5 text-slate-400" /> {lead.phone}
                          </p>
                        </div>
                        {lead.requirement && (
                          <p className="text-[11px] text-slate-500 italic bg-white/80 border border-slate-100 p-2 rounded-lg mt-1 line-clamp-2">
                            "{lead.requirement}"
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-stretch gap-2 shrink-0 sm:w-36">
                        <button
                          onClick={() => {
                            setShowTodaysPopup(false);
                            handleStartEditLead(lead);
                          }}
                          className="flex-1 py-2 bg-[#009270] hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <MessageSquare size={11} /> Log Remarks
                        </button>
                        <button
                          onClick={() => window.open(`https://wa.me/${cleanPhone}`, "_blank")}
                          className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <Phone size={11} className="text-emerald-500" /> WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-2 rounded-b-[2rem] shrink-0">
              <button
                onClick={() => setShowTodaysPopup(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-300 transition-all cursor-pointer"
              >
                Close Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDealer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight italic text-[#111827]">
                  Edit Certified Partner
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Update dealer profiles and compliance records
                </p>
              </div>
              <button
                onClick={() => setEditingDealer(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <AlertCircle size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDealer} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Dealer Name
                  </label>
                  <input
                    required
                    className="input-field rounded-xl font-bold text-[#111827]"
                    value={editingDealer.company}
                    onChange={(e) =>
                      setEditingDealer({
                        ...editingDealer,
                        company: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Contact Person
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold text-[#111827]"
                      value={editingDealer.contactPerson}
                      onChange={(e) =>
                        setEditingDealer({
                          ...editingDealer,
                          contactPerson: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Phone Number
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold text-[#111827]"
                      value={editingDealer.phone}
                      onChange={(e) =>
                        setEditingDealer({
                          ...editingDealer,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      className="input-field rounded-xl font-bold text-[#111827]"
                      value={editingDealer.email}
                      onChange={(e) =>
                        setEditingDealer({
                          ...editingDealer,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Location Address
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold text-[#111827]"
                      value={editingDealer.location}
                      onChange={(e) =>
                        setEditingDealer({
                          ...editingDealer,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      GSTIN
                    </label>
                    <input
                      className="input-field rounded-xl font-bold text-[#111827]"
                      value={editingDealer.gstin || ""}
                      onChange={(e) =>
                        setEditingDealer({
                          ...editingDealer,
                          gstin: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Bank Account & IFSC
                    </label>
                    <input
                      className="input-field rounded-xl font-bold text-[#111827]"
                      value={editingDealer.bankDetails || ""}
                      onChange={(e) =>
                        setEditingDealer({
                          ...editingDealer,
                          bankDetails: e.target.value,
                        })
                      }
                      placeholder="HDFC Bank... A/C: ..."
                    />
                  </div>
                </div>
              </div>
              <div className="pt-6 sticky bottom-0 bg-white pb-6">
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all cursor-pointer shadow-emerald-500/10"
                >
                  Save Partner Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingDealer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight italic text-[#111827]">
                  Partner Profile Dossier
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {viewingDealer.company}
                </p>
              </div>
              <button
                onClick={() => setViewingDealer(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <AlertCircle size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Decorative Initials Header */}
              <div className="flex items-center space-x-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-primary-600/10">
                  {viewingDealer.company[0]}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight">
                    {viewingDealer.company}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary-100 text-primary-800 border border-primary-200">
                      {viewingDealer.category}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                        viewingDealer.status === "ACTIVE"
                          ? "bg-accent-100 text-accent-800 border-accent-200"
                          : "bg-slate-100 text-slate-500 border-slate-200",
                      )}
                    >
                      {viewingDealer.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Info Segment */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 select-none">
                  Contact Person & Direct Line
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Key Representative
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-center">
                      <User size={13} className="mr-1.5 text-slate-400" />{" "}
                      {viewingDealer.contactPerson}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Registered Contact
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-center col-span-2 shadow-3xs bg-white/70 p-2 border border-slate-250">
                      <Phone size={13} className="mr-1.5 text-slate-400" />{" "}
                      {viewingDealer.phone}
                    </span>
                  </div>
                  <div className="col-span-2 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Corporate Email Address
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-center font-mono">
                      <FileText size={13} className="mr-1.5 text-slate-400" />{" "}
                      {viewingDealer.email}
                    </span>
                  </div>
                  <div className="col-span-2 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Registered Office Address
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex items-start leading-relaxed">
                      <MapPin
                        size={13}
                        className="mr-1.5 text-slate-400 mt-0.5 shrink-0"
                      />{" "}
                      {viewingDealer.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compliance & Fin Segments */}
              <div className="space-y-4 pt-2">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 select-none">
                  Taxation & Settlement Escrows
                </h5>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block mb-1 font-mono">
                      GST REGISTRATION NUMBER (GSTIN)
                    </span>
                    <span className="text-xs font-bold font-mono text-blue-900 border border-blue-200/50 bg-white/75 px-3 py-1.5 rounded-lg inline-block mt-1 shadow-3xs uppercase">
                      {viewingDealer.gstin || "NOT SPECIFIED"}
                    </span>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mb-1 font-mono">
                      BANK SETTLEMENT DETAIL
                    </span>
                    <div className="text-xs font-bold text-emerald-950 font-mono bg-white/75 border border-emerald-200/50 p-3.5 rounded-lg leading-relaxed mt-1.5 shadow-3xs">
                      {viewingDealer.bankDetails ||
                        "No escrow or account configurations mapped."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sticky bottom-0 bg-white border-t mt-auto flex gap-3">
              <button
                onClick={() => setViewingDealer(null)}
                className="flex-1 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Dismiss Dossier
              </button>
              <button
                onClick={() => {
                  setEditingDealer(viewingDealer);
                  setViewingDealer(null);
                }}
                className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit size={12} /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
          <div className="bg-primary-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in zoom-in-95">
            <Zap size={20} className="text-accent-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Syncing Network Intelligence...
            </span>
          </div>
        </div>
      )}
      {/* Header & Internal Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit mb-4 border border-slate-200 relative z-10 backdrop-blur-sm overflow-x-auto max-w-full">
            <button
              onClick={() =>
                handleAction("View Enquiries", () =>
                  setActiveSubTab("enquiries"),
                )
              }
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                activeSubTab === "enquiries"
                  ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              New Enquiries
            </button>
            <button
              onClick={() =>
                handleAction("View Pipeline", () => setActiveSubTab("leads"))
              }
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                activeSubTab === "leads"
                  ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              Lead Pipeline
            </button>
            <button
              onClick={() =>
                handleAction("View Dealers", () => setActiveSubTab("dealers"))
              }
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                activeSubTab === "dealers"
                  ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              Dealer Registry
            </button>
            <button
              onClick={() =>
                handleAction("View Analytics", () =>
                  setActiveSubTab("performance"),
                )
              }
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                activeSubTab === "performance"
                  ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              Dealer Performance
            </button>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">
            {activeSubTab === "enquiries"
              ? "New Lead Enquiry Ledger"
              : activeSubTab === "leads"
                ? "Lead & Opportunity Pipeline"
                : activeSubTab === "dealers"
                  ? "Certified Dealer & Partner Registry"
                  : "Network Intelligence & Performance"}
          </h2>
        </div>
        <div>
          {activeSubTab === "enquiries" || activeSubTab === "leads" ? (
            <button
              onClick={() =>
                handleAction("Add Inquiry", () => setShowAdd(true))
              }
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-600/20 flex items-center hover:bg-emerald-700 transition-all border border-transparent active:scale-95"
            >
              <Plus size={16} className="mr-2 text-emerald-200" /> New Inquiry
            </button>
          ) : activeSubTab === "dealers" ? (
            <button
              onClick={() =>
                handleAction("Add Partner", () => setShowAddDealer(true))
              }
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-600/20 flex items-center hover:bg-emerald-700 transition-all border border-transparent active:scale-95"
            >
              <Plus size={16} className="mr-2 text-emerald-200" /> Register Partner
            </button>
          ) : (
            <div className="flex space-x-3">
              <button className="px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-slate-50 transition-all shadow-sm">
                <Filter size={16} className="mr-2 text-slate-400" /> Filter
                Analysis
              </button>
              <button
                onClick={handlePrintCRMReport}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 flex items-center hover:bg-black transition-all border border-transparent active:scale-95 cursor-pointer"
                id="crm-pdf-print-btn"
                title="Download CRM Report as PDF File"
              >
                <Download size={16} className="mr-2 text-sky-400" /> Download
                PDF Report
              </button>
            </div>
          )}
        </div>
      </div>

      {activeSubTab === "enquiries" ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-all duration-300">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">
                  Captured Enquiries
                </p>
                <Users size={16} className="text-primary-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">
                {totalEnquiries}
              </p>
              <p className="text-[10px] mt-1 font-bold text-slate-400 uppercase tracking-wider">
                Awaiting Initial Action
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-all duration-300">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">
                  Action Pending Today
                </p>
                <Clock
                  size={16}
                  className={cn(
                    "text-amber-500",
                    todayEnquiries > 0 && "animate-pulse",
                  )}
                />
              </div>
              <p
                className={cn(
                  "text-3xl font-black",
                  todayEnquiries > 0 ? "text-amber-600" : "text-slate-900",
                )}
              >
                {String(todayEnquiries).padStart(2, "0")}
              </p>
              <p className="text-[10px] mt-1 font-bold text-amber-600 uppercase tracking-wider">
                Reminders due within 24h
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-all duration-300">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">
                  Overdue Reminders
                </p>
                <AlertCircle
                  size={16}
                  className={cn(
                    "text-red-500",
                    overdueEnquiries > 0 && "animate-bounce",
                  )}
                />
              </div>
              <p
                className={cn(
                  "text-3xl font-black",
                  overdueEnquiries > 0 ? "text-red-600" : "text-slate-900",
                )}
              >
                {String(overdueEnquiries).padStart(2, "0")}
              </p>
              <p className="text-[10px] mt-1 font-bold text-red-500 uppercase tracking-wider">
                Urgent response needed
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-all duration-300">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">
                  Website Channel Share
                </p>
                <Globe size={16} className="text-primary-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">
                {totalEnquiries > 0
                  ? Math.round((websiteEnquiries / totalEnquiries) * 100)
                  : 0}
                %
              </p>
              <p className="text-[10px] mt-1 font-bold text-primary-600 uppercase tracking-wider">
                {websiteEnquiries} Web Enquiries
              </p>
            </div>
          </div>

          {/* New Lead Inquiry Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b bg-slate-50/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-[#111827] uppercase tracking-widest flex items-center">
                  <FileText size={16} className="mr-2 text-primary-600" />{" "}
                  Form-Captured Enquiry Ledger
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Direct synchronization with initial customer requirement
                  inputs
                </p>
              </div>
              <div className="relative w-full md:w-80">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Filter entries live..."
                  className="input-field pl-10 h-10 py-0 text-xs rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-[9px] font-black uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">Ref</th>
                    <th className="px-6 py-4">Corporate Info</th>
                    <th className="px-6 py-4">Representative / Contact</th>
                    <th className="px-6 py-4">Requirements Specification</th>
                    <th className="px-6 py-4">Response Schedule</th>
                    <th className="px-6 py-4 text-center">
                      Engagement Automation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEnquiries.map((lead: any, idx: number) => {
                    const schedule = getFollowUpStatus(lead.followUpDate);
                    const cleanPhone = (lead.phone || "").replace(
                      /[^0-9]/g,
                      "",
                    );
                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/40 transition-colors"
                      >
                        <td className="px-6 py-4 text-center">
                          <span className="font-mono text-xs font-black text-slate-400 bg-slate-100/70 border border-slate-200 px-2 py-1 rounded-md">
                            ENQ-{String(idx + 1).padStart(2, "0")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-black text-sm text-slate-900 leading-tight">
                              {lead.company}
                            </p>
                            <div className="flex items-center space-x-1.5 mt-1.5">
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100">
                                {lead.category || "Dealer"}
                              </span>
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#e0f7fa] text-[#006064] border border-[#b2ebf2]">
                                {lead.leadSource || "Website"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800 flex items-center">
                              <User
                                size={12}
                                className="mr-1.5 text-slate-400"
                              />{" "}
                              {lead.contactPerson}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500 font-mono flex items-center">
                              <Phone
                                size={12}
                                className="mr-1.5 text-slate-400"
                              />{" "}
                              {lead.phone}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center">
                              <MapPin
                                size={12}
                                className="mr-1.5 text-slate-400"
                              />{" "}
                              {lead.location}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[280px]">
                            <p className="text-xs text-slate-600 italic bg-amber-50/20 border border-amber-100/50 border-dashed p-3 rounded-lg leading-relaxed">
                              "
                              {lead.requirement ||
                                "No specific requirements logged."}
                              "
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center text-xs font-bold text-slate-700 font-mono">
                              <Calendar
                                size={13}
                                className="mr-1.5 text-slate-400"
                              />{" "}
                              {lead.followUpDate}
                            </div>
                            <div className="flex items-center text-[10px] font-semibold text-slate-400 font-mono">
                              <Clock
                                size={12}
                                className="mr-1.5 text-slate-400"
                              />{" "}
                              {lead.followUpTime || "10:00"}
                            </div>
                            <span
                              className={cn(
                                "inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                schedule.style,
                              )}
                            >
                              {schedule.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-2">
                            <div className="inline-flex rounded-xl border border-slate-200/70 p-1 bg-white shadow-3xs space-x-1">
                              <button
                                onClick={() =>
                                  window.open(
                                    `https://wa.me/${cleanPhone}`,
                                    "_blank",
                                  )
                                }
                                title="WhatsApp Quick Schedule"
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-emerald-100"
                              >
                                <MessageSquare size={13} />
                              </button>
                              <button
                                onClick={() => handleStartEditLead(lead)}
                                title="Edit Details"
                                className="p-2 text-slate-400 hover:text-amber-650 hover:bg-amber-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-amber-100"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                title="Delete Inquiry"
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-100"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Action dropdown */}
                            <select
                              className="text-[9px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer shadow-3xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                              value={lead.status}
                              onChange={(e) =>
                                handleUpdateStatus(lead.id, e.target.value)
                              }
                            >
                              {LEAD_STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {STAGE_LABELS[s] || s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEnquiries.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-20 text-center text-slate-400"
                      >
                        <div className="h-14 w-14 bg-slate-100 rounded-xl mx-auto flex items-center justify-center mb-3">
                          <Users size={22} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          No matching enquiries found.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Channel Acquisition & Affinity Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b bg-slate-50/40">
              <h3 className="text-sm font-black text-[#111827] uppercase tracking-widest flex items-center">
                <Target size={16} className="mr-2 text-primary-600" /> Channel
                Acquisition & Conversion Matrix
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Cross-referencing inquiry channels to conversion rates
                automatically
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-[9px] font-black uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Inquiry Acquisition Channel</th>
                    <th className="px-6 py-4">Target Segments Profile</th>
                    <th className="px-6 py-4 text-center">
                      Unopened Enquiries
                    </th>
                    <th className="px-6 py-4 text-center">
                      Nurturing Pipeline
                    </th>
                    <th className="px-6 py-4 text-right">
                      Conversion Efficiency
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {channelMatrix.map((matrix, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/45 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-primary-500 mr-2.5" />
                          <span className="text-xs font-black text-slate-800">
                            {matrix.source}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-500 italic">
                          {matrix.categories}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "text-xs font-black font-mono px-2.5 py-1 rounded-md",
                            matrix.newCount > 0
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-slate-50 text-slate-400",
                          )}
                        >
                          {matrix.newCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black font-mono bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md">
                          {matrix.activeCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-emerald-600 font-mono">
                        {matrix.conversionRate}%
                        <div className="w-16 h-1 bg-slate-100 rounded-full inline-block ml-3 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${matrix.conversionRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === "leads" ? (
        <>
          {/* CRM Dashboard Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-xl border-slate-100 bg-white border shadow-xl shadow-slate-200/40 transition-all hover:scale-[1.02] cursor-default group">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400 group-hover:text-primary-600 transition-colors">
                  Total Leads
                </p>
                <Users
                  size={16}
                  className="text-slate-400 group-hover:text-primary-600 transition-colors"
                />
              </div>
              <p className="text-3xl font-black text-slate-900">
                {data?.leads?.length || 0}
              </p>
              <p className="text-[10px] mt-1 font-bold text-slate-400 uppercase tracking-wider">
                Active & Archived
              </p>
            </div>

            <div className="p-5 rounded-xl border-slate-100 bg-white border shadow-xl shadow-slate-200/40 transition-all hover:border-primary-200 hover:scale-[1.02] cursor-default">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  New Inquiries
                </p>
                <MessageSquare
                  size={16}
                  className="text-primary-500 opacity-40"
                />
              </div>
              <p className="text-3xl font-black text-primary-600">
                {data?.leads?.filter((l: any) => (l.status || "NEW") === "NEW").length || 0}
              </p>
              <p className="text-[10px] mt-1 font-bold text-slate-400">
                Awaiting response
              </p>
            </div>

            <div
              onClick={() => setShowTodaysPopup(true)}
              className="p-5 rounded-xl border-emerald-100 bg-emerald-50/20 border shadow-xl shadow-slate-100 transition-all hover:border-emerald-300 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 group-hover:text-emerald-800">
                  Follow-ups Today
                </p>
                <Clock size={16} className="text-emerald-500 animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-3xl font-black text-slate-900">
                {String(data?.leads?.filter((l: any) => (l.status || "NEW") !== "CONVERTED" && l.status !== "DEAD" && l.followUpDate === todayStr).length || 0).padStart(2, '0')}{" "}
                <span className="text-xs font-black text-emerald-600">TODAY</span>
              </p>
              <p className="text-[10px] mt-1 font-bold text-emerald-700">
                Click to view schedule
              </p>
            </div>

            <div
              onClick={() => setActiveStage("LAPSED")}
              className="p-5 rounded-xl border-amber-200 bg-amber-500/10 border shadow-xl shadow-amber-500/5 transition-all hover:border-amber-400 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">
                  Lapsed Deals
                </p>
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <p className="text-3xl font-black text-amber-900">
                {String(data?.leads?.filter((l: any) => l.status === "LAPSED").length || 0).padStart(2, '0')}
              </p>
              <p className="text-[10px] mt-1 font-bold text-amber-800 uppercase tracking-wider">
                Unattended overdue
              </p>
            </div>

            <div
              onClick={() => setActiveStage("DEAD")}
              className="p-5 rounded-xl border-rose-200 bg-rose-500/10 border shadow-xl shadow-rose-500/5 transition-all hover:border-rose-400 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest mb-1">
                  Dead Deals
                </p>
                <XCircle size={16} className="text-rose-600" />
              </div>
              <p className="text-3xl font-black text-rose-900">
                {String(data?.leads?.filter((l: any) => l.status === "DEAD").length || 0).padStart(2, '0')}
              </p>
              <p className="text-[10px] mt-1 font-bold text-rose-800 uppercase tracking-wider">
                Closed / Not in use
              </p>
            </div>

            <div className="p-5 rounded-xl border-none bg-primary-600 text-white shadow-2xl shadow-primary-500/10 transition-all hover:scale-[1.02] cursor-default">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">
                  Converted
                </p>
                <BadgeCheck size={16} className="opacity-70" />
              </div>
              <p className="text-3xl font-black">
                {data?.leads?.filter((l: any) => l.status === "CONVERTED").length || 0}
              </p>
              <p className="text-[10px] mt-1 font-bold opacity-80 uppercase tracking-widest">
                Certified Partners
              </p>
            </div>
          </div>

          {/* Lead Stage Flow Visualization */}
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveStage("ALL")}
              className={cn(
                "flex-none px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                activeStage === "ALL"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
              )}
            >
              All Stages ({data?.leads?.length || 0})
            </button>
            {LEAD_STAGES.map((stage) => {
              const count =
                data?.leads?.filter((l: any) => (l.status || "NEW") === stage).length || 0;
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={cn(
                    "flex-none px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                    activeStage === stage
                      ? STAGE_COLORS[stage] + " ring-1 ring-primary-200"
                      : "bg-white text-slate-500 border-slate-200",
                  )}
                >
                  {stage.replace("_", " ")} ({count})
                </button>
              );
            })}
          </div>

          {/* Lead Search & Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by company, person, location or assigned executive..."
                  className="input-field pl-10 h-10 py-0 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                onClick={handleAutoMarkLapsedDeals}
                title="Automatically mark all overdue unattended follow-ups as Lapsed Deals"
                className="px-4 py-2 bg-amber-500/10 text-amber-900 border border-amber-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all flex items-center shrink-0 cursor-pointer"
              >
                <AlertTriangle size={14} className="mr-1.5 text-amber-600" /> Auto-Mark Overdue Lapsed
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Lead / Company Info</th>
                    <th className="px-6 py-4">Assigned Executive</th>
                    <th className="px-6 py-4">Location & Source</th>
                    <th className="px-6 py-4">Requirement</th>
                    <th className="px-6 py-4">Next Follow-up</th>
                    <th className="px-6 py-4">Current Stage</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads?.map((lead: any) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center font-bold text-sm mr-3">
                            {lead.company[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">
                              {lead.company}
                            </p>
                            <div className="flex items-center text-[10px] text-slate-500 mt-0.5">
                              <User size={10} className="mr-1" />{" "}
                              {lead.contactPerson} |{" "}
                              <Phone size={10} className="mx-1" /> {lead.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200">
                            <UserCheck size={12} className="mr-1.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {lead.assignedExecutive || "Unassigned"}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReassigningLead(lead);
                              setSelectedExecForAssign(lead.assignedExecutive || "Suresh Raina (North CRM Executive)");
                            }}
                            title="Assign or Change Marketing Executive"
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-all cursor-pointer border border-transparent hover:border-emerald-200"
                          >
                            <UserPlus size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="flex items-center text-xs text-slate-600">
                            <MapPin size={10} className="mr-1 text-slate-400" />{" "}
                            {lead.location}
                          </span>
                          <span className="text-[10px] font-bold text-primary-600 mt-1 uppercase">
                            {lead.leadSource} / {lead.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-600 line-clamp-1 italic">
                          {lead.requirement ||
                            "No specific requirements noted."}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center text-xs font-bold text-amber-600">
                            <Calendar size={12} className="mr-1" />{" "}
                            {lead.followUpDate}
                          </div>
                          <div className="flex items-center text-[10px] text-slate-400">
                            <Clock size={10} className="mr-1" />{" "}
                            {lead.followUpTime}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          className={cn(
                            "text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border focus:ring-0 cursor-pointer shadow-3xs",
                            STAGE_COLORS[lead.status] || "bg-slate-100 text-slate-600 border-slate-200",
                          )}
                          value={lead.status}
                          onChange={(e) =>
                            handleUpdateStatus(lead.id, e.target.value)
                          }
                        >
                          {LEAD_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_LABELS[s] || s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
                              if (!cleanPhone) {
                                showToast("No phone number available for WhatsApp", "info");
                                return;
                              }
                              window.open(`https://wa.me/${cleanPhone}`, "_blank");
                            }}
                            title="WhatsApp / Message"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 bg-white border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            <MessageSquare size={14} />
                          </button>
                          {lead.status !== "CONVERTED" && (
                            <button
                              type="button"
                              onClick={() => handleConvertLead(lead.id)}
                              title="Convert to Certified Partner"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 bg-white border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                            >
                              <BadgeCheck size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyLead(lead)}
                            title="Copy Lead Config"
                            className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 bg-white border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditLead(lead)}
                            title="Edit Lead Details & Log Remarks"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id)}
                            title="Delete Lead"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLeads?.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-400 italic"
                      >
                        No leads found in this stage.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === "dealers" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Dealer Search & Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b flex items-center space-x-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search dealers by name, person or GSTIN..."
                  className="input-field pl-10 h-10 py-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Dealer / Business Info</th>
                    <th className="px-6 py-4">Contact & Location</th>
                    <th className="px-6 py-4">Business Details (GSTIN)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDealers?.map((dealer: any) => (
                    <tr
                      key={dealer.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm mr-3">
                            {dealer.company[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">
                              {dealer.company}
                            </p>
                            <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                              {dealer.category}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">
                            {dealer.contactPerson}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            {dealer.phone} • {dealer.email}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase truncate max-w-[200px]">
                            {dealer.location}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 font-mono">
                            GST: {dealer.gstin}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                            A/C: {dealer.bankDetails || "Not Provided"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                            dealer.status === "ACTIVE"
                              ? "bg-accent-50 text-accent-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {dealer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setViewingDealer(dealer)}
                            title="View Partner Dossier"
                            className="p-2 text-slate-400 hover:text-accent-600 transition-colors bg-white border border-slate-100 rounded-lg cursor-pointer"
                          >
                            <FileText size={16} />
                          </button>
                          <button onClick={() => {}} className="hidden">
                            None
                          </button>
                          <button
                            onClick={() => handleCopyDealer(dealer)}
                            title="Copy Dealer Config"
                            className="p-2 text-slate-400 hover:text-emerald-700 transition-colors bg-white border border-slate-100 rounded-lg cursor-pointer"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => setEditingDealer(dealer)}
                            title="Edit Dealer Details"
                            className="p-2 text-slate-400 hover:text-amber-700 transition-colors bg-white border border-slate-100 rounded-lg cursor-pointer"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDealer(dealer.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white border border-slate-100 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* PERFORMANCE DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                label: "AVG Dealer Score",
                value: "88/100",
                trend: "+2 vs last period",
                icon: Target,
                trendUp: true,
              },
              {
                label: "Active Network",
                value: data?.dealers?.length || 242,
                trend: "+12 vs last period",
                icon: Globe,
                trendUp: true,
              },
              {
                label: "Total Sales Value",
                value: "₹2.2Cr",
                trend: "+18% vs last period",
                icon: IndianRupee,
                trendUp: true,
              },
              {
                label: "Return Ratio",
                value: "0.4%",
                trend: "-0.1% vs last period",
                icon: TrendingUp,
                trendUp: false,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/40 group hover:border-accent-400/30 transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {stat.label}
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-primary-950 group-hover:text-accent-400 transition-colors">
                    <stat.icon size={18} />
                  </div>
                </div>
                <p className="text-4xl font-black text-[#111827] tracking-tight italic">
                  {stat.value}
                </p>
                <p
                  className={cn(
                    "text-[10px] mt-4 font-black flex items-center uppercase tracking-widest",
                    stat.trendUp ? "text-accent-600" : "text-amber-500",
                  )}
                >
                  {stat.trendUp ? (
                    <ArrowUpRight size={12} className="mr-1" />
                  ) : (
                    <ArrowDownRight size={12} className="mr-1" />
                  )}
                  {stat.trend}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-xl font-black text-[#111827] tracking-tight italic uppercase">
                  Top Dealer Sales Distribution
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Operational intelligence across primary hubs
                </p>
              </div>
              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                {["7D", "30D", "90D", "1Y"].map((d) => (
                  <button
                    key={d}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                      d === "30D"
                        ? "bg-primary-950 text-white"
                        : "text-slate-400 hover:text-slate-900",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "AutoPower", value: 4500000 },
                    { name: "Bright Bat", value: 1200000 },
                    { name: "Industrial", value: 2800000 },
                    { name: "Energy Sol", value: 3100000 },
                    { name: "Apex Grid", value: 1800000 },
                  ]}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 900 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 900 }}
                    tickFormatter={(v) => `₹${v / 100000}L`}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                      padding: "12px",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#db2777"
                    radius={[8, 8, 0, 0]}
                    barSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40">
              <h3 className="text-sm font-black text-[#111827] tracking-widest uppercase mb-6 flex items-center">
                <BadgeCheck size={16} className="mr-2 text-accent-500" />{" "}
                Critical Network Alerts
              </h3>
              <div className="space-y-4">
                {[
                  {
                    dealer: "AutoPower Solutions",
                    alert: "Low inventory sync lag (4h+)",
                    priority: "HIGH",
                  },
                  {
                    dealer: "Bright Bat Systems",
                    alert: "Warranty claim spike detected",
                    priority: "MEDIUM",
                  },
                  {
                    dealer: "Energy Sol Hub",
                    alert: "Payment reconciliation pending",
                    priority: "LOW",
                  },
                ].map((alert, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-accent-200 transition-all"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        {alert.dealer}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 italic mt-0.5">
                        {alert.alert}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[8px] font-black px-2 py-1 rounded-lg border",
                        alert.priority === "HIGH"
                          ? "text-red-500 border-red-100 bg-red-50"
                          : "text-amber-500 border-amber-100 bg-amber-50",
                      )}
                    >
                      {alert.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden group hover:border-primary-200 transition-all">
              <div className="absolute top-0 right-0 p-12 text-primary-50 opacity-[0.05] rotate-12 group-hover:rotate-0 transition-transform duration-700">
                <TrendingUp size={240} />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm font-black text-primary-600 tracking-widest uppercase mb-6 flex items-center">
                  <Zap size={16} className="mr-2" /> Strategic Insight
                </h3>
                <p className="text-2xl font-black italic leading-tight tracking-tight max-w-md text-slate-900">
                  Your Tier-1 network has shown{" "}
                  <span className="text-primary-600 underline decoration-primary-600/20 underline-offset-4">
                    24% growth
                  </span>{" "}
                  in the North-Indian territory.
                </p>
                <p className="text-sm font-bold text-slate-500 mt-4 leading-relaxed text-slate-400">
                  Recommend prioritizing stock allocation for 'SuperFlow' series
                  to AutoPower & Energy Sol as they approach peak sell-through
                  capacity.
                </p>
                <button 
                  onClick={() => setShowTerritoryMap(true)}
                  type="button"
                  className="mt-8 px-8 py-4 bg-primary-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-600/20 hover:bg-primary-700 hover:shadow-primary-600/35 transition-all cursor-pointer active:scale-95 duration-200"
                >
                  Review Territory Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Sidebar Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 z-[100] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-full md:h-[90vh] rounded-[2.5rem] border border-slate-200 shadow-5xl animate-in zoom-in-95 duration-350 overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-8 pb-5 flex justify-between items-start text-left relative">
              <div className="pr-12">
                <h1 className="text-2xl md:text-3xl font-black text-slate-950 uppercase tracking-tighter italic leading-none">
                  NEW LEAD INQUIRY
                </h1>
                <p className="text-[10px] font-black tracking-widest text-[#64748b] uppercase mt-2.5 leading-tight">
                  CAPTURE INITIAL REQUIREMENT AND FOLLOW-UP PLAN.
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="p-3 text-slate-400 bg-white border border-slate-200 hover:text-slate-900 hover:border-slate-350 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Separator */}
            <div className="px-8 mb-6">
              <div className="border-b-2 border-slate-950/90 w-full"></div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAction("Saving Inquiry", () => handleAdd());
              }}
              className="px-8 pb-10 space-y-7 flex-1 text-left flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Draft clipboard paste button if copied */}
                {copiedLead && (
                  <button
                    type="button"
                    onClick={handlePasteLead}
                    className="w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer flex items-center justify-center shadow-sm border border-emerald-200 mb-4"
                  >
                    <ClipboardCheck
                      size={13}
                      className="mr-2 text-emerald-600 animate-pulse"
                    />{" "}
                    Paste Lead Draft
                  </button>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Lead Information */}
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60">
                    <div className="flex items-center space-x-2 border-l-4 border-[#009cbc] pl-3 leading-none h-4">
                      <p className="text-[10.5px] font-black text-[#009cbc] uppercase tracking-wider leading-none">
                        Lead Information
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                          Company / Entity Name
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 italic focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs"
                          value={form.company}
                          onChange={(e) =>
                            setForm({ ...form, company: e.target.value })
                          }
                          placeholder="e.g. Modern EV Solutions"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                            Entity Category
                          </label>
                          <div className="relative">
                            <select
                              className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-900 italic uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#009cbc]/20 transition-all shadow-xs pr-10"
                              value={form.category}
                              onChange={(e) =>
                                setForm({ ...form, category: e.target.value })
                              }
                            >
                              <option value="Dealer">Dealer</option>
                              <option value="Distributor">Distributor</option>
                              <option value="OEM">OEM</option>
                              <option value="Retail">Retail</option>
                              <option value="Sub Dealer">Sub Dealer</option>
                              <option value="Other">Other</option>
                            </select>
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold text-[10px]">
                              ▼
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                            Lead Source
                          </label>
                          <div className="relative">
                            <select
                              className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-900 italic uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#009cbc]/20 transition-all shadow-xs pr-10"
                              value={form.leadSource}
                              onChange={(e) =>
                                setForm({ ...form, leadSource: e.target.value })
                              }
                            >
                              <option value="Website">Website</option>
                              <option value="Exhibition">Exhibition</option>
                              <option value="Cold Call">Cold Call</option>
                              <option value="Referral">Referral</option>
                              <option value="Indiamart / B2B">Indiamart / B2B</option>
                              <option value="Social Media">Social Media</option>
                            </select>
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold text-[10px]">
                              ▼
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Contact */}
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60">
                    <div className="flex items-center space-x-2 border-l-4 border-[#009cbc] pl-3 leading-none h-4">
                      <p className="text-[10.5px] font-black text-[#009cbc] uppercase tracking-wider leading-none">
                        Primary Contact
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                          Contact Person
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 italic focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs"
                          value={form.contactPerson}
                          onChange={(e) =>
                            setForm({ ...form, contactPerson: e.target.value })
                          }
                          placeholder="Full Name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                          Mobile / WhatsApp
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 italic focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs font-mono"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          placeholder="+91 XXXX"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                          Location / Territory
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 italic focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs"
                          value={form.location}
                          onChange={(e) =>
                            setForm({ ...form, location: e.target.value })
                          }
                          placeholder="City, State"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                          Assigned Marketing / Sales Executive
                        </label>
                        <select
                          className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs"
                          value={form.assignedExecutive}
                          onChange={(e) =>
                            setForm({ ...form, assignedExecutive: e.target.value })
                          }
                        >
                          {MARKETING_EXECUTIVES.map((exec) => (
                            <option key={exec.id} value={`${exec.name} (${exec.role})`}>
                              {exec.name} — {exec.role}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up Automation */}
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60">
                    <div className="flex items-center space-x-2 border-l-4 border-[#009cbc] pl-3 leading-none h-4">
                      <p className="text-[10.5px] font-black text-[#009cbc] uppercase tracking-wider leading-none">
                        Follow-up Automation
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                            Follow-up Date
                          </label>
                          <input
                            required
                            type="date"
                            className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs font-mono"
                            value={form.followUpDate}
                            onChange={(e) =>
                              setForm({ ...form, followUpDate: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                            Follow-up Time
                          </label>
                          <input
                            required
                            type="time"
                            className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs font-mono"
                            value={form.followUpTime}
                            onChange={(e) =>
                              setForm({ ...form, followUpTime: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
                          Specific Requirement
                        </label>
                        <textarea
                          className="w-full bg-white border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs h-24"
                          value={form.requirement}
                          onChange={(e) =>
                            setForm({ ...form, requirement: e.target.value })
                          }
                          placeholder="e.g. Needs 100Ah battery for 2-wheelers..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-emerald-600/20 text-center leading-none cursor-pointer outline-none font-sans"
                >
                  CREATE INQUIRY & SET REMINDER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dealer Sidebar Modal */}
      {showAddDealer && (
        <div className="fixed inset-0 bg-slate-900/60 flex justify-end z-50 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[#111827] tracking-tight italic">
                  Register Certified Dealer
                </h3>
                {copiedDealer && (
                  <button
                    type="button"
                    onClick={handlePasteDealer}
                    className="mt-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center shadow-sm border border-emerald-200"
                  >
                    <ClipboardCheck
                      size={12}
                      className="mr-1.5 text-emerald-650 animate-pulse"
                    />{" "}
                    Paste Dealer Draft
                  </button>
                )}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Official Business & Compliance Records
                </p>
              </div>
              <button
                onClick={() => setShowAddDealer(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <AlertCircle size={20} className="text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAction("Saving Partner", () => handleAddDealer());
              }}
              className="p-6 space-y-6"
            >
              <div className="space-y-4">
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest border-l-4 border-primary-600 pl-3">
                  Business Identity
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Business / Dealer Name
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold"
                      value={dealerForm.company}
                      onChange={(e) =>
                        setDealerForm({
                          ...dealerForm,
                          company: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Business Category
                    </label>
                    <select
                      className="input-field rounded-xl font-bold"
                      value={dealerForm.category}
                      onChange={(e) =>
                        setDealerForm({
                          ...dealerForm,
                          category: e.target.value,
                        })
                      }
                    >
                      <option>Tier 1 Dealer</option>
                      <option>Tier 2 Dealer</option>
                      <option>Sub-Dealer</option>
                      <option>Certified Service Center</option>
                      <option>Exclusive Showroom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      GSTIN (Compliance)
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-mono uppercase font-bold"
                      value={dealerForm.gstin}
                      onChange={(e) =>
                        setDealerForm({ ...dealerForm, gstin: e.target.value })
                      }
                      placeholder="24AAAAA0000A1Z5"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest border-l-4 border-primary-600 pl-3">
                  Contact & Logistical Info
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Primary Contact
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold"
                      value={dealerForm.contactPerson}
                      onChange={(e) =>
                        setDealerForm({
                          ...dealerForm,
                          contactPerson: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Phone Number
                    </label>
                    <input
                      required
                      className="input-field rounded-xl font-bold"
                      value={dealerForm.phone}
                      onChange={(e) =>
                        setDealerForm({ ...dealerForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Email Address
                    </label>
                    <input
                      required
                      type="email"
                      className="input-field rounded-xl font-bold"
                      value={dealerForm.email}
                      onChange={(e) =>
                        setDealerForm({ ...dealerForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Full Business Address
                    </label>
                    <textarea
                      required
                      className="input-field rounded-xl h-20 font-medium"
                      value={dealerForm.location}
                      onChange={(e) =>
                        setDealerForm({
                          ...dealerForm,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest border-l-4 border-primary-600 pl-3">
                  Banking & Credits
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Bank Account & IFSC
                    </label>
                    <input
                      className="input-field rounded-xl font-bold"
                      value={dealerForm.bankDetails}
                      onChange={(e) =>
                        setDealerForm({
                          ...dealerForm,
                          bankDetails: e.target.value,
                        })
                      }
                      placeholder="HDFC Bank... A/C: ..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 sticky bottom-0 bg-white pb-6">
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all shadow-emerald-500/10"
                >
                  Complete Dealer Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== INTERACTIVE TERRITORY MAP MODAL ==================== */}
      {showTerritoryMap && (() => {
        const getTerritory = (locationStr: string = "") => {
          const loc = (locationStr || "").toLowerCase();
          if (
            loc.includes("delhi") ||
            loc.includes("punjab") ||
            loc.includes("haryana") ||
            loc.includes("up") ||
            loc.includes("uttar") ||
            loc.includes("jammu") ||
            loc.includes("himachal") ||
            loc.includes("noida") ||
            loc.includes("gurgaon") ||
            loc.includes("jaipur") ||
            loc.includes("rajasthan") ||
            loc.includes("chandigarh") ||
            loc.includes("north") ||
            loc.includes("ludhiana") ||
            loc.includes("kanpur") ||
            loc.includes("lucknow")
          ) {
            return "North";
          }
          if (
            loc.includes("mumbai") ||
            loc.includes("pune") ||
            loc.includes("gujarat") ||
            loc.includes("ahmedabad") ||
            loc.includes("maharashtra") ||
            loc.includes("goa") ||
            loc.includes("surat") ||
            loc.includes("nagpur") ||
            loc.includes("west") ||
            loc.includes("vadodara") ||
            loc.includes("nashik") ||
            loc.includes("thane")
          ) {
            return "West";
          }
          if (
            loc.includes("bangalore") ||
            loc.includes("bengaluru") ||
            loc.includes("chennai") ||
            loc.includes("tamil") ||
            loc.includes("hyderabad") ||
            loc.includes("andhra") ||
            loc.includes("telangana") ||
            loc.includes("karnataka") ||
            loc.includes("kerala") ||
            loc.includes("coimbatore") ||
            loc.includes("kochi") ||
            loc.includes("south") ||
            loc.includes("mysore") ||
            loc.includes("vizag") ||
            loc.includes("trivandrum")
          ) {
            return "South";
          }
          if (
            loc.includes("kolkata") ||
            loc.includes("west bengal") ||
            loc.includes("bihar") ||
            loc.includes("patna") ||
            loc.includes("odisha") ||
            loc.includes("bhubaneswar") ||
            loc.includes("assam") ||
            loc.includes("guwahati") ||
            loc.includes("jharkhand") ||
            loc.includes("ranchi") ||
            loc.includes("east") ||
            loc.includes("cuttack")
          ) {
            return "East";
          }
          return "Central";
        };

        const activeDealersList = (data?.dealers || []).filter((d: any) => {
          if (selectedTerritory === "All") return true;
          return getTerritory(d.location) === selectedTerritory;
        });

        const activeLeadsList = (data?.leads || []).filter((l: any) => {
          if (selectedTerritory === "All") return true;
          return getTerritory(l.location) === selectedTerritory;
        });

        const totalRegionDealers = activeDealersList.length;
        const totalRegionLeads = activeLeadsList.length;
        const convertedLeadsCount = activeLeadsList.filter((l: any) => l.status === "CONVERTED").length;
        const activeRegionConversionRate = activeLeadsList.length > 0 
          ? Math.round((convertedLeadsCount / activeLeadsList.length) * 100) 
          : 0;

        const territoryDetails = {
          All: {
            title: "Pan-Indian Territory",
            color: "border-slate-300 text-slate-800 bg-slate-50",
            glowColor: "shadow-slate-500/10",
            badge: "bg-slate-100 text-slate-700",
            insight: "Showing consolidating nationwide CRM framework. Filter by clicking on specific geographic zones to analyze regional logistics, active pipeline leads, and local market capture forecasts."
          },
          North: {
            title: "Northern Territory",
            color: "border-rose-400 text-rose-800 bg-rose-50/70",
            glowColor: "shadow-rose-500/10",
            badge: "bg-rose-100 text-rose-700",
            insight: "Our peak performance market cluster centered in Delhi NCR. Highly recommended to expedite 'SuperFlow' shipments to alleviate local sell-through pressure."
          },
          South: {
            title: "Southern Territory",
            color: "border-cyan-400 text-cyan-800 bg-cyan-50/70",
            glowColor: "shadow-cyan-500/10",
            badge: "bg-cyan-100 text-cyan-700",
            insight: "Mature enterprise segment with consistent performance. High dealer engagement rates. Focus: schedule periodic site evaluation audits."
          },
          West: {
            title: "Western Territory",
            color: "border-amber-400 text-amber-800 bg-amber-50/70",
            glowColor: "shadow-amber-500/10",
            badge: "bg-amber-100 text-amber-700",
            insight: "Heavy industrial growth belt driven by Maharashtra & Gujarat. Excellent website enquiry pipeline; consider setting up local showroom support."
          },
          East: {
            title: "Eastern Territory",
            color: "border-purple-400 text-purple-800 bg-purple-50/70",
            glowColor: "shadow-purple-500/10",
            badge: "bg-purple-100 text-purple-700",
            insight: "Highly promising target zone showing organic inbound traffic. B2B leads from Bihar and Bengal are surging. Good opportunity for expanding dealership network."
          },
          Central: {
            title: "Central Territory",
            color: "border-emerald-400 text-emerald-800 bg-emerald-50/70",
            glowColor: "shadow-emerald-500/10",
            badge: "bg-emerald-100 text-emerald-700",
            insight: "Key transit route and retail node grid. High volume of OEM bulk enquiries. Recommend monitoring weekly payment clearing rates to ensure liquidity."
          },
        };

        const activeInfo = territoryDetails[selectedTerritory];

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[110] animate-in fade-in duration-300" id="territory-map-overlay">
            <div className="bg-white w-full max-w-6xl h-full md:h-[90vh] rounded-[3rem] border border-slate-200 overflow-hidden shadow-5xl flex flex-col my-4 animate-in zoom-in-95 duration-350 text-left">
              
              {/* Header Banner */}
              <div className="bg-slate-900 text-white p-8 pb-7 flex justify-between items-center relative overflow-hidden shrink-0 select-none">
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="p-3 bg-primary-600 rounded-2xl text-white">
                    <Map size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wider italic font-sans leading-none flex items-center">
                      Sales Territory Intelligence
                    </h3>
                    <p className="text-[9.5px] uppercase tracking-widest font-mono text-slate-400 mt-2.5 font-bold leading-none">
                      GEOGRAPHICAL DEALER NODES & ACTIVE SALES PIPELINE MATRIX
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowTerritoryMap(false)}
                  className="text-[9.5px] font-black text-slate-300 bg-slate-800 hover:bg-slate-750 hover:text-white uppercase tracking-widest px-4.5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 leading-none shrink-0"
                >
                  Close Terminal
                </button>
              </div>

              {/* Territory Selector Tabs */}
              <div className="px-8 border-b border-slate-100 bg-slate-50/50 p-4 shrink-0 flex flex-wrap gap-2 select-none">
                {(["All", "North", "West", "Central", "East", "South"] as const).map((terr) => {
                  const itemsCount = (data?.dealers || []).filter((d: any) => terr === "All" || getTerritory(d.location) === terr).length;
                  const isSelected = selectedTerritory === terr;
                  return (
                    <button
                      key={terr}
                      type="button"
                      onClick={() => setSelectedTerritory(terr)}
                      className={cn(
                        "px-4.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95 border",
                        isSelected
                          ? "bg-primary-600 text-white border-primary-650 shadow-md shadow-primary-650/10"
                          : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                      )}
                    >
                      <span>{terr === "All" ? "Pan-India" : `${terr} Zone`}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 text-[8.5px] font-bold rounded-md leading-none",
                        isSelected ? "bg-primary-700/60 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        {itemsCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Grid Content */}
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50/20">
                
                {/* Left Panel - The Interactive SVG Map Representation */}
                <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
                  
                  {/* Map Visual Stage */}
                  <div className="bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden aspect-[5/6] w-full flex flex-col justify-between">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.6)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
                    
                    {/* Corner Tech Decor */}
                    <div className="absolute top-4 left-4 text-[7px] font-mono font-black text-slate-500 tracking-widest select-none leading-none">
                      SYS://GEO.IN_MATRIX
                    </div>
                    <div className="absolute top-4 right-4 text-[7px] font-mono font-black text-slate-500 tracking-widest select-none leading-none">
                      GRID SCALE: 1:40
                    </div>

                    <div className="text-left relative z-15 select-none">
                      <span className="text-[8px] bg-primary-950 text-primary-400 border border-primary-900 px-2 py-0.5 rounded-md font-mono font-black uppercase tracking-widest">
                        VECTOR FORECAST
                      </span>
                      <h4 className="text-xs font-black text-slate-300 uppercase tracking-wide mt-2">
                        Geographical Cluster Grid
                      </h4>
                    </div>

                    {/* INTERACTIVE COMPASS / SCHEMATIC SVG MAP */}
                    <div className="w-full relative flex items-center justify-center py-4 select-none">
                      <svg viewBox="0 0 400 460" className="w-[85%] h-auto max-h-[350px] transition-all">
                        {/* Define glowing drop-shadow filters */}
                        <defs>
                          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="6" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Background schematic lines */}
                        <circle cx="200" cy="220" r="160" fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 8" />
                        <circle cx="200" cy="220" r="100" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                        <line x1="200" y1="20" x2="200" y2="420" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 4" />
                        <line x1="20" y1="220" x2="380" y2="220" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 4" />

                        {/* North Region */}
                        <g 
                          onClick={() => setSelectedTerritory("North")}
                          className="cursor-pointer transition-all group"
                        >
                          <path 
                            d="M 170 110 L 270 70 L 310 130 L 250 210 L 170 170 Z" 
                            fill={selectedTerritory === "North" ? "rgba(239, 68, 68, 0.45)" : "rgba(51, 65, 85, 0.15)"} 
                            stroke={selectedTerritory === "North" ? "#ef4444" : "#475569"} 
                            strokeWidth={selectedTerritory === "North" ? "2" : "1"}
                            filter={selectedTerritory === "North" ? "url(#neon-glow)" : undefined}
                            className="transition-all duration-300 group-hover:fill-red-500/25"
                          />
                          <text x="215" y="130" fill={selectedTerritory === "North" ? "#fecaca" : "#94a3b8"} fontSize="11" fontWeight="900" textAnchor="middle" className="font-mono uppercase tracking-widest leading-none">
                            NORTH
                          </text>
                        </g>

                        {/* West Region */}
                        <g 
                          onClick={() => setSelectedTerritory("West")}
                          className="cursor-pointer transition-all group"
                        >
                          <path 
                            d="M 90 200 L 180 180 L 210 260 L 140 310 L 80 270 Z" 
                            fill={selectedTerritory === "West" ? "rgba(245, 158, 11, 0.45)" : "rgba(51, 65, 85, 0.15)"} 
                            stroke={selectedTerritory === "West" ? "#f59e0b" : "#475569"} 
                            strokeWidth={selectedTerritory === "West" ? "2" : "1"}
                            filter={selectedTerritory === "West" ? "url(#neon-glow)" : undefined}
                            className="transition-all duration-300 group-hover:fill-amber-500/25"
                          />
                          <text x="135" y="245" fill={selectedTerritory === "West" ? "#fef3c7" : "#94a3b8"} fontSize="11" fontWeight="900" textAnchor="middle" className="font-mono uppercase tracking-widest leading-none">
                            WEST
                          </text>
                        </g>

                        {/* Central Region */}
                        <g 
                          onClick={() => setSelectedTerritory("Central")}
                          className="cursor-pointer transition-all group"
                        >
                          <path 
                            d="M 185 190 L 255 195 L 265 275 L 195 280 Z" 
                            fill={selectedTerritory === "Central" ? "rgba(16, 185, 129, 0.45)" : "rgba(51, 65, 85, 0.15)"} 
                            stroke={selectedTerritory === "Central" ? "#10b981" : "#475569"} 
                            strokeWidth={selectedTerritory === "Central" ? "2" : "1"}
                            filter={selectedTerritory === "Central" ? "url(#neon-glow)" : undefined}
                            className="transition-all duration-300 group-hover:fill-emerald-500/25"
                          />
                          <text x="225" y="240" fill={selectedTerritory === "Central" ? "#d1fae5" : "#94a3b8"} fontSize="10" fontWeight="900" textAnchor="middle" className="font-mono uppercase tracking-widest leading-none">
                            CENTRAL
                          </text>
                        </g>

                        {/* East Region */}
                        <g 
                          onClick={() => setSelectedTerritory("East")}
                          className="cursor-pointer transition-all group"
                        >
                          <path 
                            d="M 270 160 L 360 150 L 385 240 L 285 245 Z" 
                            fill={selectedTerritory === "East" ? "rgba(168, 85, 247, 0.45)" : "rgba(51, 65, 85, 0.15)"} 
                            stroke={selectedTerritory === "East" ? "#a855f7" : "#475569"} 
                            strokeWidth={selectedTerritory === "East" ? "2" : "1"}
                            filter={selectedTerritory === "East" ? "url(#neon-glow)" : undefined}
                            className="transition-all duration-300 group-hover:fill-purple-500/25"
                          />
                          <text x="315" y="200" fill={selectedTerritory === "East" ? "#f3e8ff" : "#94a3b8"} fontSize="11" fontWeight="900" textAnchor="middle" className="font-mono uppercase tracking-widest leading-none">
                            EAST
                          </text>
                        </g>

                        {/* South Region */}
                        <g 
                          onClick={() => setSelectedTerritory("South")}
                          className="cursor-pointer transition-all group"
                        >
                          <path 
                            d="M 180 295 L 260 290 L 270 380 L 220 425 L 175 365 Z" 
                            fill={selectedTerritory === "South" ? "rgba(6, 182, 212, 0.45)" : "rgba(51, 65, 85, 0.15)"} 
                            stroke={selectedTerritory === "South" ? "#06b6d4" : "#475569"} 
                            strokeWidth={selectedTerritory === "South" ? "2" : "1"}
                            filter={selectedTerritory === "South" ? "url(#neon-glow)" : undefined}
                            className="transition-all duration-300 group-hover:fill-cyan-500/25"
                          />
                          <text x="220" y="355" fill={selectedTerritory === "South" ? "#cffafe" : "#94a3b8"} fontSize="11" fontWeight="900" textAnchor="middle" className="font-mono uppercase tracking-widest leading-none">
                            SOUTH
                          </text>
                        </g>

                        {/* Rendering dynamic blinking nodes for our real active dealers */}
                        {(data?.dealers || []).slice(0, 10).map((dl: any, i: number) => {
                          const terr = getTerritory(dl.location);
                          let cx = 200;
                          let cy = 240;
                          let color = "#3b82f6";
                          
                          if (terr === "North") { cx = 220 + (i * 8 % 30); cy = 110 + (i * 12 % 35); color = "#ef4444"; }
                          else if (terr === "West") { cx = 130 + (i * 7 % 25); cy = 230 + (i * 11 % 30); color = "#f59e0b"; }
                          else if (terr === "Central") { cx = 220 + (i * 6 % 15); cy = 235 + (i * 8 % 15); color = "#10b981"; }
                          else if (terr === "East") { cx = 310 + (i * 9 % 30); cy = 190 + (i * 13 % 35); color = "#a855f7"; }
                          else if (terr === "South") { cx = 215 + (i * 11 % 25); cy = 345 + (i * 9 % 40); color = "#06b6d4"; }

                          return (
                            <g key={dl.id} className="cursor-pointer">
                              <circle cx={cx} cy={cy} r="4" fill={color} />
                              <circle cx={cx} cy={cy} r="8" fill="none" stroke={color} strokeWidth="1" className="animate-ping" style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: `${1.5 + (i % 3) * 0.5}s` }} />
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Dynamic Map Mini Legend */}
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-[8.5px] font-mono tracking-widest uppercase font-black text-slate-400 select-none">
                      <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                        <span>North</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                        <span>West</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                        <span>Central</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />
                        <span>East</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 rounded-full bg-cyan-500 inline-block" />
                        <span>South</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 gap-4 text-center sticky bottom-0 select-none">
                    <div className="bg-slate-55 border border-slate-200/60 p-4.5 rounded-2xl">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Nodes</span>
                      <span className="text-lg font-black text-slate-900 font-mono mt-1.5 block">{totalRegionDealers}</span>
                    </div>
                    <div className="bg-slate-55 border border-slate-200/60 p-4.5 rounded-2xl">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Leads</span>
                      <span className="text-lg font-black text-slate-900 font-mono mt-1.5 block">{totalRegionLeads}</span>
                    </div>
                    <div className="bg-slate-55 border border-slate-200/60 p-4.5 rounded-2xl">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Conv %</span>
                      <span className="text-lg font-black text-slate-900 font-mono mt-1.5 block">{activeRegionConversionRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Strategic Intelligence Feed */}
                <div className="lg:col-span-7 flex flex-col space-y-6">
                  
                  {/* Automated Strategic Insight based on Territory */}
                  <div className={cn("p-6 rounded-[2rem] border text-left flex items-start space-x-4 shadow-sm relative", activeInfo.color, activeInfo.glowColor)}>
                    <div className="mt-1 text-inherit">
                      <Zap size={18} className="animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest">{activeInfo.title} Intel Report</h4>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed mt-2.5">
                        {activeInfo.insight}
                      </p>
                    </div>
                  </div>

                  {/* Registered Dealership Nodes List */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 flex flex-col min-h-[180px] max-h-[260px] overflow-hidden">
                    <div className="flex justify-between items-center mb-4 select-none">
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center">
                        <Users size={14} className="mr-2 text-primary-500" />
                        Dealership Nodes ({totalRegionDealers})
                      </h4>
                      <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest font-black">
                        LATEST RECONCILIATION
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 text-left">
                      {activeDealersList.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center py-8 text-center select-none">
                          <span className="text-[9.5px] uppercase font-mono font-black text-slate-400 tracking-widest">
                            No active dealers registered in this territory.
                          </span>
                        </div>
                      ) : (
                        activeDealersList.map((dl: any) => (
                          <div 
                            key={dl.id}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-150 group hover:border-[#009cbc]/50 transition-colors flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-4">
                              <h5 className="text-xs font-black text-slate-900 uppercase truncate">
                                {dl.company}
                              </h5>
                              <div className="flex items-center text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase space-x-2">
                                <span className={cn("px-1.5 py-0.5 rounded text-[8px] leading-none", dl.category?.includes("Tier 1") ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700")}>
                                  {dl.category || "Dealer"}
                                </span>
                                <span>•</span>
                                <span className="truncate">{dl.location}</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono font-black border border-slate-200 bg-white shadow-xs px-2.5 py-1 rounded-lg text-slate-600 uppercase shrink-0">
                              {dl.status || "ACTIVE"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Active Pipeline Leads List */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 flex flex-col min-h-[180px] max-h-[260px] overflow-hidden">
                    <div className="flex justify-between items-center mb-4 select-none">
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center">
                        <Target size={14} className="mr-2 text-primary-500" />
                        Inquiry & Pipeline Leads ({totalRegionLeads})
                      </h4>
                      <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest font-black">
                        LIVE ENQUIRY LOGS
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 text-left">
                      {activeLeadsList.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center py-8 text-center select-none">
                          <span className="text-[9.5px] uppercase font-mono font-black text-slate-400 tracking-widest">
                            No active pipeline leads or inquiries logged in this territory.
                          </span>
                        </div>
                      ) : (
                        activeLeadsList.map((ld: any) => (
                          <div 
                            key={ld.id}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-150 group hover:border-primary-200/50 transition-colors flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-4">
                              <h5 className="text-xs font-black text-slate-900 uppercase truncate">
                                {ld.company}
                              </h5>
                              <div className="flex items-center text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase space-x-2">
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[8px] leading-none">
                                  {ld.leadSource || "Website"}
                                </span>
                                <span>•</span>
                                <span className="truncate">{ld.location}</span>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[8.5px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 border",
                              STAGE_COLORS[ld.status] || "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                              {ld.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* TOAST NOTIFICATION FLOATING BANNER */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 no-print">
          <div
            className={cn(
              "px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs font-black uppercase tracking-wider backdrop-blur-md",
              toast.type === "success" &&
                "bg-emerald-900/90 text-emerald-100 border-emerald-500/30 shadow-emerald-950/20",
              toast.type === "info" &&
                "bg-slate-900/90 text-slate-100 border-slate-700/50 shadow-slate-950/20",
              toast.type === "error" &&
                "bg-rose-900/90 text-rose-100 border-rose-500/30 shadow-rose-950/20",
            )}
          >
            {toast.type === "success" && (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            )}
            {toast.type === "info" && (
              <Info size={18} className="text-cyan-400 shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertTriangle size={18} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-white/50 hover:text-white cursor-pointer p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETE LEAD */}
      {deletingLeadId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 no-print">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 mx-4 text-left">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base uppercase tracking-tight">
                  Confirm Delete Lead
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Are you sure you want to permanently delete this lead record?
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLeadId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLead}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/20 cursor-pointer transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETE DEALER */}
      {deletingDealerId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 no-print">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 mx-4 text-left">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base uppercase tracking-tight">
                  Delete Dealer Profile
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Are you sure you want to remove this dealer from the registry?
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDealerId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDealer}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/20 cursor-pointer transition-all"
              >
                Delete Dealer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR CONVERT LEAD TO DEALER */}
      {convertingLeadId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 no-print">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 mx-4 text-left">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                <BadgeCheck size={22} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base uppercase tracking-tight">
                  Convert to Certified Partner
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  This will convert the lead into an active dealer entry in the Dealer Registry.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConvertingLeadId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmConvertLead}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
              >
                Convert Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN MARKETING EXECUTIVE MODAL */}
      {reassigningLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 no-print">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 mx-4 text-left">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base uppercase tracking-tight">
                    Assign Marketing Executive
                  </h4>
                  <p className="text-xs text-slate-500 font-bold">
                    Target Lead: <span className="text-emerald-700 font-black">{reassigningLead.company}</span> ({reassigningLead.contactPerson})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassigningLead(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Select Regional Marketing / CRM Executive
              </label>
              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {MARKETING_EXECUTIVES.map((exec) => {
                  const execFull = `${exec.name} (${exec.role})`;
                  const isSelected = selectedExecForAssign === execFull;
                  return (
                    <button
                      key={exec.id}
                      type="button"
                      onClick={() => setSelectedExecForAssign(execFull)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-500/10 text-emerald-950 font-bold"
                          : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700",
                      )}
                    >
                      <div>
                        <p className="text-xs font-black">{exec.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{exec.role} • {exec.phone}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassigningLead(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAssignExecutive(reassigningLead.id, selectedExecForAssign)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
