import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  CheckCircle2, 
  FileText, 
  HelpCircle, 
  ExternalLink, 
  Zap, 
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface PanelManualSection {
  title: string;
  code: string;
  category: string;
  description: string;
  objectives: string[];
  keySteps: { title: string; desc: string; inputs?: string[] }[];
  checklist: string[];
  qaTips: string;
}

export const PANEL_MANUALS: Record<string, PanelManualSection> = {
  crm: {
    title: "CRM, Lead Management & Bulk Import SOP",
    code: "SOP-CRM-V5.2",
    category: "Commercials & Pipeline",
    description: "End-to-end customer relationship management covering lead capture, bulk Excel (.xlsx) / CSV imports with automatic field mapping, interactive lead previews, follow-up scheduling, and quotation conversions.",
    objectives: [
      "Import multiple leads simultaneously from Microsoft Excel (.xlsx / .xls) and CSV sheets with automatic column detection.",
      "Track inquiries across lifecycle stages (New, Contacted, Interested, Quotation Sent, Converted, Lapsed, Dead).",
      "Log follow-up discussion timelines, next reminder dates, and WhatsApp links.",
      "Convert verified inquiries into active dealer accounts or commercial sales orders."
    ],
    keySteps: [
      {
        title: "Bulk Excel & CSV Import",
        desc: "Click 'Bulk Import (Excel / CSV)' to upload .xlsx, .xls, or .csv files, or paste CSV text directly. Review the interactive preview table with search filter and row deletions before syncing to the database.",
        inputs: ["Excel/CSV File (.xlsx/.xls/.csv)", "Sample Template Download", "Interactive Data Preview"]
      },
      {
        title: "Inquiry Capture & Specification",
        desc: "Register incoming phone, web, or Indiamart leads with required battery voltage (48V, 60V, 72V), capacity (24Ah, 30Ah, 40Ah), quantity, and target follow-up time.",
        inputs: ["Company Name", "Contact Person & Mobile", "Location/City", "Requirement Details", "Follow-up Date & Time"]
      },
      {
        title: "Follow-Up Timeline & Reminders",
        desc: "Use the Dual-Pane Inquiry Workspace to append timestamped remarks and schedule the next follow-up call. View today's agenda popup for instant morning briefings.",
        inputs: ["Remarks Summary", "Next Follow-up Date", "Next Follow-up Time", "Pipeline Status"]
      }
    ],
    checklist: [
      "Verify that column headers in uploaded Excel files match company, contact, phone, location, and requirement.",
      "Check today's follow-up agenda every morning to ensure zero missed callbacks.",
      "Follow up with leads in 'QUOTATION_SENT' stage within 48 hours.",
      "Assign converted leads to certified dealers or finance billing for dispatch."
    ],
    qaTips: "Always download the Excel Template (.xlsx) from the Bulk Upload modal to ensure your spreadsheet column headers align perfectly. Use the direct WhatsApp trigger on mobile for instantaneous dealer communications."
  },
  inventory: {
    title: "Stores, Warehousing & Physical Stock Audit SOP",
    code: "SOP-STORE-V4.5",
    category: "Stores & Logistics",
    description: "Raw materials warehousing, dynamic rack and bin calibration, physical stock audit reconciliation, discrepancy tracking, and filtered inventory reporting.",
    objectives: [
      "Calibrate dynamic warehouse visual map dimensions (A-Z racks and slot counts).",
      "Perform physical stock audits with barcode scanning, recorded counts, and auto-reconciliation of surpluses or shortages.",
      "Generate focused stock reports strictly matching search queries without unnecessary data dumps.",
      "Maintain minimum safety stock buffers for critical components."
    ],
    keySteps: [
      {
        title: "Dynamic Grid Calibration",
        desc: "Modify rack range and slot column bounds live on the warehouse map. System auto-recalculates total bin capacity and occupancy percentages.",
        inputs: ["Racks Range (A-Z)", "Active Slots Columns Count"]
      },
      {
        title: "Physical Stock Audit & Discrepancy Reconciliation",
        desc: "Conduct physical sweeps. Enter actual on-floor counted quantities. System computes variances, updates ledger stock upon supervisor authorization, and creates audit logs.",
        inputs: ["Physical Count", "Audit Reason / Notes", "Reconciliation Action"]
      },
      {
        title: "Material Indent & Issue (MRN)",
        desc: "Dispense raw cells, BMS boards, and enclosures directly to active assembly stations with digital Material Requisition Notes.",
        inputs: ["Material SKU", "Requisition Qty", "Assembly Line Destination"]
      }
    ],
    checklist: [
      "Perform quarterly physical stock audits and log discrepancies.",
      "Check hazardous electrolyte storage protocols before recording receipts.",
      "Maintain minimum safety stock of 100 units for lithium cells and BMS boards.",
      "Ensure Bin locations are updated whenever items are relocated."
    ],
    qaTips: "Filter by warehouse sector before clicking 'Export Stock Report' to produce concise, relevant PDF reports for audit teams."
  },
  production: {
    title: "Manufacturing Floor & Assembly Line SOP",
    code: "SOP-MFG-V4.0",
    category: "Production & Assembly",
    description: "Lithium-ion pack assembly operations across cell sorting, laser spot welding, BMS wiring harness installation, casing, and conveyor line telemetry.",
    objectives: [
      "Monitor conveyor throughput speeds and temperature sensors across Assembly Lines A & B.",
      "Track Work-in-Progress (WIP) batches at each station.",
      "Record operator shifts, machine diagnostics, and cycle durations.",
      "Prevent bottleneck buildup by balancing spot welding and sealing stations."
    ],
    keySteps: [
      {
        title: "Cell Capacity & IR Sorting",
        desc: "Grade incoming lithium cells by Internal Resistance (IR < 15 mΩ) and Open Circuit Voltage (OCV) before cell bracket insertion.",
        inputs: ["Cell Batch ID", "IR Tolerance Limit", "Voltage Band"]
      },
      {
        title: "Spot & Laser Welding",
        desc: "Perform precision nickel strip spot welding. Calibrate pulse energy and electrode pressure to prevent thermal cell damage.",
        inputs: ["Welding Energy (Joules)", "Pulse Duration (ms)", "Spot Count"]
      },
      {
        title: "BMS Integration & Final Casing",
        desc: "Connect balancing leads to Smart BMS. Verify NTC thermistor sensor placement before sealing enclosure with silicone gasket.",
        inputs: ["BMS Serial ID", "Thermal Sensor Check", "Seal Integrity Stamp"]
      }
    ],
    checklist: [
      "Inspect spot weld joints for pull strength (> 5 kgf) every 50 packs.",
      "Ensure anti-static wrist straps are worn during BMS wiring.",
      "Log conveyor motor temperatures every 2 hours during peak shifts.",
      "Maintain assembly room temperature between 20°C and 25°C."
    ],
    qaTips: "If conveyor line temperature exceeds 40°C, pause the station and trigger a maintenance inspection immediately."
  },
  mrp: {
    title: "Material Requirements Planning (MRP) SOP",
    code: "SOP-MRP-V3.8",
    category: "Planning & Engineering",
    description: "Automated BOM explosion, material demand forecasting, production batch scheduling, and indent generation to eliminate assembly downtime.",
    objectives: [
      "Explode multi-level Bill of Materials for lead-acid and lithium battery pack models.",
      "Compute raw material shortfalls against confirmed customer bookings.",
      "Generate automated procurement indents with lead-time buffers.",
      "Optimize production scheduling based on machine availability."
    ],
    keySteps: [
      {
        title: "BOM Configuration & Formula Maintenance",
        desc: "Maintain formulas per battery SKU including cells count, nickel strips, BMS, enclosure, wiring harness, and packaging boxes.",
        inputs: ["Model SKU", "Component List", "Scrap Factor Buffer (3%)"]
      },
      {
        title: "Demand Run & Shortage Computation",
        desc: "Execute MRP calculation run. Compare unallocated stock against active orders to highlight procurement deadlines.",
        inputs: ["Target Production Date", "Batch Size", "Safety Stock Days"]
      }
    ],
    checklist: [
      "Ensure BOM formulas reflect the latest engineering change notices (ECN).",
      "Include a 3% scrap allowance on enclosures and wiring components.",
      "Synchronize procurement lead times with verified vendor delivery schedules."
    ],
    qaTips: "Run the MRP engine every Monday morning to align raw material deliveries with the weekly production timetable."
  },
  billing: {
    title: "GST Invoicing, Accounts & Ledger SOP",
    code: "SOP-FIN-V4.2",
    category: "Finance & Accounts",
    description: "GST-compliant commercial tax invoicing, CGST/SGST/IGST automation, dynamic field metric calibrations, A4 printable invoice downloads, and receipt posting.",
    objectives: [
      "Generate commercial GST invoices with automated tax splitting based on customer state.",
      "Apply dynamic 'Edit Field Metrics' tool to adjust subtotal or tax while preserving line-item math consistency.",
      "Record bank wire transfers and reconcile outstanding dealer ledger balances.",
      "Generate printable A4 GST tax invoices with QR payment codes."
    ],
    keySteps: [
      {
        title: "Invoice Generation",
        desc: "Select dealer, dispatch warehouse, and battery SKUs. System automatically applies 18% or 28% GST and determines CGST/SGST vs IGST.",
        inputs: ["Dealer GSTIN", "Battery SKU & Qty", "HSN Code 8507", "Transport Charges"]
      },
      {
        title: "A4 Metric Overrides & Scaling",
        desc: "Use 'Edit Field Metrics' to adjust net total or status. System applies linear unit rate scaling to maintain 100% mathematical audit harmony.",
        inputs: ["Adjusted Subtotal", "Tax Modification", "Status (Paid/Unpaid/Partial)"]
      },
      {
        title: "Payment Receipt Posting",
        desc: "Record incoming NEFT/RTGS/UPI reference numbers to mark invoices as settled and update dealer credit limits.",
        inputs: ["Bank Reference No", "Amount Received", "Payment Date"]
      }
    ],
    checklist: [
      "Verify dealer GSTIN is valid on the GST portal before generating invoices.",
      "Ensure HSN 8507 is used for all lithium and lead-acid battery consignments.",
      "Verify IGST is applied for inter-state deliveries (e.g., Gujarat to Maharashtra)."
    ],
    qaTips: "Always review the printable A4 preview before issuing finalized tax invoices to ensure all tax breakdowns and terms match client purchase orders."
  },
  warranty: {
    title: "Warranty Activation & Claims Management SOP",
    code: "SOP-WRNTY-V4.0",
    category: "Post Sales & Quality",
    description: "Retail battery warranty registration, digital claims intake, QR validation, battery lifecycle tracking, and replacement approvals.",
    objectives: [
      "Register battery serial numbers during retail installation.",
      "Validate warranty validity, remaining coverage days, and grace periods.",
      "Audit incoming warranty claims for electrical defects vs physical damage.",
      "Approve warranty replacements or dispatch service engineers."
    ],
    keySteps: [
      {
        title: "Retail Serial Registration",
        desc: "Link battery serial barcode with end-user name, phone number, vehicle registration, and purchase date.",
        inputs: ["Serial Barcode", "Customer Mobile", "Sale Date", "Dealer Code"]
      },
      {
        title: "Digital Claim Intake & Validation",
        desc: "Input battery serial to verify active warranty status. Record reported defect (capacity loss, BMS cutoff, swelling).",
        inputs: ["Claim ID", "Serial Number", "Symptom Code", "Open Circuit Voltage"]
      }
    ],
    checklist: [
      "Confirm serial exists in the Finished Goods dispatch registry.",
      "Reject claims showing case puncture, water ingress, or external short circuit.",
      "Enforce standard 36-month or 60-month warranty parameters."
    ],
    qaTips: "Check dealer delivery date vs retail activation date. If the gap exceeds 12 months, request a copy of the physical dealer purchase invoice."
  },
  service: {
    title: "RMA Service Center & Battery Repair SOP",
    code: "SOP-SERV-V3.5",
    category: "RMA & Repairs",
    description: "RMA intake, root cause diagnostics, cell-level replacement, warranty turnaround tracking, and scrap metal recycling recovery.",
    objectives: [
      "Log RMA intake tickets for returned battery packs.",
      "Execute multi-point diagnostic checklist (electrolyte, voltage, BMS telemetry).",
      "Perform cell module repairs or approve pack replacement.",
      "Record lead and lithium scrap weights for environmental recycling compliance."
    ],
    keySteps: [
      {
        title: "RMA Ticket Creation & Intake",
        desc: "Receive pack at service depot. Tag physical unit with unique RMA barcode label and intake condition notes.",
        inputs: ["RMA ID", "Original Serial", "Customer Complaint", "Visual Inspection"]
      },
      {
        title: "Diagnostic Battery Health Check",
        desc: "Hook unit to diagnostic cycler. Test charging curve, individual cell balance delta (< 30 mV), and BMS firmware.",
        inputs: ["Cell Voltage Delta", "BMS Error Log", "Thermal Sensor Health"]
      },
      {
        title: "Repair or Scrap Disposition",
        desc: "Execute cell replacement or route defective materials to certified recycling pool. Issue formal closure report.",
        inputs: ["Action Decided", "Replaced Parts List", "Lead/Lithium Recovery (Kg)"]
      }
    ],
    checklist: [
      "Wear PPE (insulated gloves, safety glasses) during pack disassembly.",
      "Ensure cell voltage delta is under 20 mV before resealing repaired packs.",
      "Maintain complete disposal logs for governmental recycling credits."
    ],
    qaTips: "Always perform a 2-hour continuous discharge test on repaired packs prior to marking the RMA ticket as resolved."
  },
  superadmin: {
    title: "Super Admin Control & Data Retention SOP",
    code: "SOP-ADMIN-V5.0",
    category: "System Administration",
    description: "System parameters configuration, automated & manual data retention purge, Supabase cloud database synchronization, and user access control.",
    objectives: [
      "Configure data retention policies and purge historical records safely with audit logs.",
      "Monitor Supabase cloud database synchronization and schema integrity.",
      "Manage user accounts, credential assignments, and role-based permissions.",
      "Execute database backups and global tax/warranty parameter updates."
    ],
    keySteps: [
      {
        title: "Data Retention & Record Purge",
        desc: "Configure retention duration (30 days, 90 days, 1 year). Execute dry-run audits before executing permanent record purges.",
        inputs: ["Retention Policy Scope", "Dry Run Verification", "Supervisor Confirmation"]
      },
      {
        title: "Supabase Cloud Synchronization",
        desc: "Trigger manual database synchronization or inspect live payload handshakes across cloud nodes.",
        inputs: ["Sync Mode (Auto/Manual)", "Target Table Scope"]
      }
    ],
    checklist: [
      "Always verify database backup status before executing data purges.",
      "Audit role assignments quarterly to enforce least-privilege security.",
      "Ensure company business profile details (GST, address, logo) are up-to-date."
    ],
    qaTips: "Use the Dry Run option in Data Retention to review exact row counts slated for purge prior to executing permanent deletions."
  }
};

interface PanelManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  panelKey: string;
  onOpenFullManual?: () => void;
}

export const PanelManualModal: React.FC<PanelManualModalProps> = ({
  isOpen,
  onClose,
  panelKey,
  onOpenFullManual
}) => {
  if (!isOpen) return null;

  const manual = PANEL_MANUALS[panelKey] || PANEL_MANUALS['crm'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-5 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-150 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200 shadow-2xs shrink-0">
              <BookOpen size={22} />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200 uppercase tracking-wider">
                  {manual.code}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {manual.category}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight italic mt-0.5 truncate">
                {manual.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"
            title="Close SOP Guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-left text-xs">
          {/* Summary / Description */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-slate-700 font-medium leading-relaxed">
              {manual.description}
            </p>
          </div>

          {/* Objectives */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">
              Key Process Objectives
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {manual.objectives.map((obj, i) => (
                <div key={i} className="flex items-start space-x-2 p-3 bg-white border border-slate-200 rounded-xl shadow-3xs">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-slate-800 font-semibold leading-snug">{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Steps */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">
              Screen Walkthrough & Step Instructions
            </h4>
            <div className="space-y-3">
              {manual.keySteps.map((step, idx) => (
                <div key={idx} className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs uppercase">
                      {idx + 1}. {step.title}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded uppercase">
                      STEP {idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-650 leading-relaxed font-medium">
                    {step.desc}
                  </p>
                  {step.inputs && step.inputs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {step.inputs.map((inp, ii) => (
                        <span key={ii} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-3xs">
                          ⌨️ {inp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quality Checklist */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-emerald-900 font-black uppercase text-[11px] tracking-wider font-mono">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Operations & Quality Checklist</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {manual.checklist.map((chk, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-[11px] text-emerald-950 font-medium leading-relaxed">
                  <span className="text-emerald-700 font-bold font-mono">[{idx + 1}]</span>
                  <span>{chk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Field Tips */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-start space-x-3">
            <span className="text-lg text-amber-600">💡</span>
            <div>
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest font-mono block">
                Field Pro-Tip
              </span>
              <p className="text-[11px] text-amber-950 font-semibold leading-relaxed mt-0.5">
                {manual.qaTips}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-150 shrink-0">
          <div className="text-[11px] text-slate-500 font-semibold">
            ISO 9001:2015 Approved Plant Operational Procedure
          </div>
          <div className="flex items-center space-x-2">
            {onOpenFullManual && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullManual();
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <BookOpen size={13} className="text-sky-400" />
                <span>Full Operations Manual</span>
                <ChevronRight size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PanelManualButton: React.FC<{
  onClick: () => void;
  label?: string;
  className?: string;
}> = ({ onClick, label = "User Manual & SOP", className }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-3xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0",
        className
      )}
      title="Open Screen Walkthrough & SOP Manual"
    >
      <BookOpen size={13} className="text-sky-600 shrink-0" />
      <span>{label}</span>
    </button>
  );
};
