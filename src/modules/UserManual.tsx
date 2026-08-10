import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard,
  ShoppingCart, 
  Database, 
  Cpu, 
  Factory, 
  ShieldCheck, 
  Package, 
  Users, 
  Map,
  ReceiptIndianRupee, 
  Bookmark, 
  Smartphone,
  Wrench, 
  Bell,
  BarChart3,
  Lock,
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  UserCheck, 
  FileText,
  Truck,
  BookOpen,
  Download,
  Zap,
  HelpCircle as HelpIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore, UserRole } from '../store/authStore';
import { downloadElementAsPDF } from '../lib/pdfGenerator';

interface UserManualProps {
  setActiveTab?: (tab: string) => void;
  previousTab?: string;
}

const TAB_TO_STEP_MAP: Record<string, string> = {
  'dashboard': 'dashboard',
  'inventory-hub': 'store',
  'inventory': 'store',
  'production-hub': 'manufacturing',
  'production': 'manufacturing',
  'mrp': 'mrp',
  'finished-goods': 'finished-goods',
  'storekeeper': 'store',
  'crm': 'crm',
  'regional-sales': 'regional-sales',
  'dealer-performance': 'regional-sales',
  'billing': 'billing',
  'warranty': 'warranty',
  'engagement': 'engagement',
  'service': 'service',
  'alerts': 'alerts',
  'analytics': 'analytics',
  'management-kpi': 'analytics',
  'super-admin': 'super-admin'
};

const STEP_TAB_MAP: Record<string, { tab: string; label: string }> = {
  dashboard: { tab: 'dashboard', label: 'Executive Control Center' },
  procurement: { tab: 'inventory-hub', label: 'Stores & Procurement Hub' },
  store: { tab: 'inventory-hub', label: 'Warehousing & Raw Material Inventory' },
  mrp: { tab: 'mrp', label: 'MRP & Material Demand Planning' },
  manufacturing: { tab: 'production-hub', label: 'Production & Assembly Line' },
  quality: { tab: 'production-hub', label: 'Quality Control & Testing' },
  'finished-goods': { tab: 'finished-goods', label: 'Finished Goods Logistics' },
  crm: { tab: 'crm', label: 'CRM & Form-Captured Enquiry Ledger' },
  'regional-sales': { tab: 'regional-sales', label: 'Regional Sales & Territory' },
  billing: { tab: 'billing', label: 'GST Invoicing & Accounts' },
  warranty: { tab: 'warranty', label: 'Warranty & Claims Registry' },
  engagement: { tab: 'engagement', label: 'Customer Engagement & Loyalty' },
  service: { tab: 'service', label: 'RMA Service & Repair Center' },
  alerts: { tab: 'alerts', label: 'Operational System Alerts' },
  analytics: { tab: 'analytics', label: 'Analytics & Financial Intelligence' },
  'super-admin': { tab: 'super-admin', label: 'Super Admin Control Center' }
};

export const UserManual: React.FC<UserManualProps> = ({ setActiveTab, previousTab }) => {
  const { user } = useAuthStore();

  // Define permitted steps per role across all 16 operational panels
  const ROLE_STEPS_MAP: Record<UserRole, string[]> = {
    [UserRole.SUPER_ADMIN]: ['dashboard', 'procurement', 'store', 'mrp', 'manufacturing', 'quality', 'finished-goods', 'crm', 'regional-sales', 'billing', 'warranty', 'engagement', 'service', 'alerts', 'analytics', 'super-admin'],
    [UserRole.ADMIN]: ['dashboard', 'procurement', 'store', 'mrp', 'manufacturing', 'quality', 'finished-goods', 'crm', 'regional-sales', 'billing', 'warranty', 'engagement', 'service', 'alerts', 'analytics', 'super-admin'],
    [UserRole.STORE_KEEPER]: ['dashboard', 'procurement', 'store', 'finished-goods', 'alerts'],
    [UserRole.PRODUCTION_TEAM]: ['dashboard', 'mrp', 'manufacturing', 'quality', 'alerts'],
    [UserRole.QUALITY_TEAM]: ['dashboard', 'quality', 'alerts'],
    [UserRole.SALES_PERSON]: ['dashboard', 'crm', 'regional-sales', 'engagement', 'alerts'],
    [UserRole.BILLER]: ['dashboard', 'billing', 'alerts'],
    [UserRole.WARRANTY_TEAM]: ['dashboard', 'warranty', 'alerts'],
    [UserRole.SERVICE_TEAM]: ['dashboard', 'service', 'alerts'],
    [UserRole.PLANT_SERVICE_ENGINEER]: ['dashboard', 'service', 'alerts'],
  };

  const allowedStepIds = React.useMemo(() => {
    return user ? (ROLE_STEPS_MAP[user.role] || []) : ['dashboard', 'procurement', 'store', 'mrp', 'manufacturing', 'quality', 'finished-goods', 'crm', 'regional-sales', 'billing', 'warranty', 'engagement', 'service', 'alerts', 'analytics', 'super-admin'];
  }, [user?.role]);

  const initialStep = React.useMemo(() => {
    if (previousTab && TAB_TO_STEP_MAP[previousTab]) {
      const targetStep = TAB_TO_STEP_MAP[previousTab];
      if (allowedStepIds.includes(targetStep)) {
        return targetStep;
      }
    }
    return allowedStepIds[0] || 'dashboard';
  }, [previousTab, allowedStepIds]);

  const [activeStep, setActiveStep] = useState<string>(initialStep);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep activeStep in sync if the logged-in user changes role dynamically or switches tab
  useEffect(() => {
    if (allowedStepIds.length > 0 && !allowedStepIds.includes(activeStep)) {
      setActiveStep(allowedStepIds[0]);
    }
  }, [user?.role, allowedStepIds, activeStep]);

  // Flow Chart Operational Steps Metadata
  const stepsMetadata = [
    {
      id: 'dashboard',
      title: '1. EXECUTIVE DASHBOARD',
      icon: LayoutDashboard,
      color: 'border-slate-200 hover:border-sky-400 text-sky-800 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-sky-600 border-sky-600 bg-sky-50/70 text-sky-950 shadow-md',
      description: 'Executive KPIs, real-time conveyor metrics, quick action triggers, and plant status overview.',
      role: 'ALL ROLES'
    },
    {
      id: 'procurement',
      title: '2. PROCUREMENT & GRN',
      icon: ShoppingCart,
      color: 'border-slate-200 hover:border-blue-400 text-blue-650 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/70 text-blue-900 shadow-md',
      description: 'Material Request, Gate Entry, Inspection and Goods Receipt Note (GRN) handshake.',
      role: 'STORE_KEEPER / ADMIN'
    },
    {
      id: 'store',
      title: '3. WAREHOUSING LEDGER',
      icon: Database,
      color: 'border-slate-200 hover:border-cyan-500 text-cyan-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-cyan-600 border-cyan-600 bg-cyan-50/70 text-cyan-950 shadow-md',
      description: 'Bin allocation, storage of raw battery cells, dynamic grid calibration, and search reports.',
      role: 'STORE_KEEPER'
    },
    {
      id: 'mrp',
      title: '4. MRP SCHEDULING',
      icon: Cpu,
      color: 'border-slate-200 hover:border-sky-500 text-sky-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-sky-600 border-sky-600 bg-sky-50/70 text-sky-950 shadow-md',
      description: 'Demand forecasting, automated Bill of Materials (BOM) explosion, and material requisitions.',
      role: 'PRODUCTION_TEAM / ADMIN'
    },
    {
      id: 'manufacturing',
      title: '5. BATTERY ASSEMBLY',
      icon: Factory,
      color: 'border-slate-200 hover:border-emerald-500 text-emerald-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-md',
      description: 'Conveyor cycles, structural frame stacking, wiring routing, and real-time plant support.',
      role: 'PRODUCTION_TEAM'
    },
    {
      id: 'quality',
      title: '6. QUALITY CONTROL',
      icon: ShieldCheck,
      color: 'border-slate-200 hover:border-indigo-550 text-indigo-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-md',
      description: 'Terminal voltage verification, capacity load logs, internal impedance check, and approval stamping.',
      role: 'QUALITY_TEAM'
    },
    {
      id: 'finished-goods',
      title: '7. FINISHED GOODS LOGISTICS',
      icon: Package,
      color: 'border-slate-200 hover:border-teal-550 text-teal-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-teal-600 border-teal-600 bg-teal-50/75 text-teal-950 shadow-md',
      description: 'Barcoding, structural packaging lists, unique item serialization, and depot dispatching.',
      role: 'STORE_KEEPER / ADMIN'
    },
    {
      id: 'crm',
      title: '8. CRM & ENQUIRY LEDGER',
      icon: Users,
      color: 'border-slate-200 hover:border-amber-550 text-amber-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-amber-600 border-amber-600 bg-amber-50/70 text-amber-950 shadow-md',
      description: 'Form-captured enquiries, dealer registrations, GSTIN validation, and price quotations.',
      role: 'SALES_PERSON / ADMIN'
    },
    {
      id: 'regional-sales',
      title: '9. REGIONAL SALES FLOW',
      icon: Map,
      color: 'border-slate-200 hover:border-orange-500 text-orange-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-orange-600 border-orange-600 bg-orange-50/70 text-orange-950 shadow-md',
      description: 'Territory performance mapping, regional dealer quota allocations, and sales target tracking.',
      role: 'SALES_PERSON / ADMIN'
    },
    {
      id: 'billing',
      title: '10. GST INVOICING',
      icon: ReceiptIndianRupee,
      color: 'border-slate-200 hover:border-purple-550 text-purple-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-purple-600 border-purple-600 bg-purple-50/70 text-purple-950 shadow-md',
      description: 'Commercial GST tax invoices, CGST/SGST/IGST splits, rate overrides, and payment receipts.',
      role: 'BILLER / SUPER_ADMIN'
    },
    {
      id: 'warranty',
      title: '11. WARRANTY REGISTRY',
      icon: Bookmark,
      color: 'border-slate-200 hover:border-rose-550 text-rose-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-rose-600 border-rose-600 bg-rose-50/70 text-rose-950 shadow-md',
      description: 'Digital claims logging, serial activations, QR lookups, and automated expiry tracking.',
      role: 'WARRANTY_TEAM'
    },
    {
      id: 'engagement',
      title: '12. CUSTOMER ENGAGEMENT',
      icon: Smartphone,
      color: 'border-slate-200 hover:border-violet-500 text-violet-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-violet-600 border-violet-600 bg-violet-50/70 text-violet-950 shadow-md',
      description: 'Mobile app adoption stats, QR scan logs, mechanics loyalty rewards, and coupon redemptions.',
      role: 'SALES_PERSON / ADMIN'
    },
    {
      id: 'service',
      title: '13. RMA SERVICE PROCESS',
      icon: Wrench,
      color: 'border-slate-200 hover:border-red-500 text-red-700 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-red-600 border-red-600 bg-red-50/70 text-red-950 shadow-md',
      description: 'Central repairs tracking, diagnostic checklist, battery recycling logs, and scrap recovery.',
      role: 'SERVICE_TEAM / PLANT'
    },
    {
      id: 'alerts',
      title: '14. OPERATIONAL ALERTS',
      icon: Bell,
      color: 'border-slate-200 hover:border-yellow-500 text-yellow-800 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-yellow-600 border-yellow-600 bg-yellow-50/70 text-yellow-950 shadow-md',
      description: 'Real-time warning notifications, cross-module handshake logs, and supervisor overrides.',
      role: 'ALL ROLES'
    },
    {
      id: 'analytics',
      title: '15. ANALYTICS & INTELLIGENCE',
      icon: BarChart3,
      color: 'border-slate-200 hover:border-emerald-600 text-emerald-800 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-emerald-700 border-emerald-700 bg-emerald-50/70 text-emerald-950 shadow-md',
      description: 'Financial P&L performance, failure timeline trends, Pareto root causes, and export summaries.',
      role: 'SUPER_ADMIN / ADMIN'
    },
    {
      id: 'super-admin',
      title: '16. SUPER ADMIN CONTROL',
      icon: Lock,
      color: 'border-slate-200 hover:border-slate-600 text-slate-800 bg-white/85 shadow-2xs hover:shadow-xs',
      activeColor: 'ring-2 ring-slate-800 border-slate-800 bg-slate-100 text-slate-950 shadow-md',
      description: 'Supabase cloud database sync, global ERP constants, security credentials, and SQL runner.',
      role: 'SUPER_ADMIN'
    }
  ];

  const credentialsList = [
    { role: 'SUPER_ADMIN', name: 'Aravind Swamy', email: 'admin@arcenol.com', pass: 'admin123', scope: 'Complete Global Read/Write & System Parameters Override' },
    { role: 'ADMIN', name: 'Rohan Sharma', email: 'ops@arcenol.com', pass: 'password123', scope: 'Central Operations Control, Plant Sync & Approvals' },
    { role: 'STORE_KEEPER', name: 'Baldev Singh', email: 'store@arcenol.com', pass: 'password123', scope: 'Material Procurement, Bin Ledgers, Finished Goods Depot' },
    { role: 'PRODUCTION_TEAM', name: 'Vikram Patel', email: 'production@arcenol.com', pass: 'password123', scope: 'BOM Engineering, MRP Runs, Assembly Conveyor controls' },
    { role: 'QUALITY_TEAM', name: 'Anjali Verma', email: 'quality@arcenol.com', pass: 'password123', scope: 'Voltage testing logs, Load inspections, Quality clearances' },
    { role: 'SALES_PERSON', name: 'Suresh Raina', email: 'sales@arcenol.com', pass: 'password123', scope: 'CRM leads tracking, Distributor allocation, sales targets' },
    { role: 'BILLER', name: 'Nisha Gupta', email: 'finance@arcenol.com', pass: 'password123', scope: 'Tax invoices, ledger statements, GST reconciliation sheets' },
    { role: 'WARRANTY_TEAM', name: 'Deepak Chawla', email: 'warranty@arcenol.com', pass: 'password123', scope: 'Claims registration, dynamic validation, expiry parameters' },
    { role: 'SERVICE_TEAM', name: 'Harpreet Singh', email: 'service@arcenol.com', pass: 'password123', scope: 'RMA returns checking, maintenance ticketing, recycling metrics' },
    { role: 'PLANT_SERVICE_ENGINEER', name: 'Amit Trivedi', email: 'plant@arcenol.com', pass: 'password123', scope: 'Plant-level support diagnostics, site workorder checklists' }
  ];

  // Manual Detail Content Data
  const manualStepsDetails: Record<string, {
    title: string;
    flowCode: string;
    objectives: string[];
    roleInvolved: string;
    operations: { name: string; desc: string; inputs: string[] }[];
    checklist: string[];
    qaTips: string;
  }> = {
    dashboard: {
      title: "1. Executive Control Center & Plant Status Operations",
      flowCode: "EXEC-DASH-1.0",
      roleInvolved: "All Authorized Personnel / Management Executives",
      objectives: [
        "Monitor top-level plant KPIs (Active Warranties, Open RMA Tickets, Stock Valuation, Dealer Orders).",
        "Track live conveyor assembly line status and power utilization across factory units.",
        "Execute quick operational triggers for GRN creation, Tax Invoicing, Claim Logging, and CRM Lead additions.",
        "Switch active user roles dynamically for cross-departmental auditing."
      ],
      operations: [
        {
          name: "Executive KPI Card Audit",
          desc: "Analyze aggregated plant health metrics updated in real-time from inventory, billing, and warranty databases.",
          inputs: ["Time Horizon Filter", "Plant Division Unit"]
        },
        {
          name: "Quick Action Launchpad",
          desc: "Trigger high-priority workflows directly from the dashboard header without navigating sub-menus.",
          inputs: ["Target Workflow Action (GRN / Bill / Claim / Lead)"]
        },
        {
          name: "Conveyor Line Live Feed Inspection",
          desc: "Verify active assembly line conveyor speed, temperature, and WIP unit throughput across Plant 1 and Plant 2.",
          inputs: ["Assembly Line Selector (Line A / Line B)"]
        }
      ],
      checklist: [
        "Check that total active warranties reflect real-time retail activations.",
        "Audit open RMA tickets count to ensure warranty turnaround times stay under 48 hours.",
        "Confirm system operational status is marked green OPERATIONAL.",
        "Verify role-based view restrictions before sharing dashboard views."
      ],
      qaTips: "Use the Quick Action Launchpad for fast multi-module transactions during busy plant shifts. If conveyor speed drops below 0.8 m/s, alert the maintenance supervisor."
    },
    procurement: {
      title: "2. Raw Material Procurement & GRN Handshake Block",
      flowCode: "PROC-GRN-V1.0",
      roleInvolved: "Store Keeper / Operations Manager",
      objectives: [
        "Create Purchase Invoices or Material Indents for raw battery plates, containers, sulfuric acid, and lithium-ion cells.",
        "Record physical Gate Entry of transit containers.",
        "Perform initial materials verification and audit quality parameter stamps.",
        "Confirm Goods Receipt Note (GRN) logs to increase available stock values."
      ],
      operations: [
        {
          name: "Raw Material Indenting",
          desc: "Initiate purchasing parameters for specific batch orders. Set critical quantities for battery container boxes, separator grids, terminal blocks, and solvents.",
          inputs: ["Material Name", "Supplier Code", "Quantity Requisitioned", "Tax Rate Model"]
        },
        {
          name: "Material Gate Entry Posting",
          desc: "Note container arrivals at manufacturing gates. Input challan receipts, vehicle parameters, and supplier seal numbers.",
          inputs: ["Challan Serial Number", "Vehicle Registration Number", "Supplier Name", "E-Way Bill ID"]
        },
        {
          name: "Goods Receipt Note (GRN) Handshake",
          desc: "Audit the material quality on arrival. Record accepted vs. defective volumes. Post GRN to commit raw materials directly into Bin stock records.",
          inputs: ["Accepted Qty", "Damaged Qty", "Storage Rack Allocation", "Excise Slip Code"]
        }
      ],
      checklist: [
        "Inquire with manufacturer suppliers about lithium cell capacity ratings.",
        "Verify raw container box density parameters before posting Gate Entry.",
        "Attach supplier invoice copy during the GRN verification workflow.",
        "Submit rejected parts to Scrap Disposal Area in the system."
      ],
      qaTips: "Always match the physical supplier challan invoice index precisely against the ERP record. If discrepancies in raw casing weight exceed 1.5%, label the batch as 'HEAVY DEVIATION' and transfer it to local quarantine storage first."
    },
    store: {
      title: "3. Warehouse Management, Storage & Bin Ledger",
      flowCode: "WHSE-BIN-2.0",
      roleInvolved: "Store Keeper",
      objectives: [
        "Log systematic storage locations for lead-acid raw materials, electrolyte carboys, and lithium cell arrays.",
        "Integrate dynamic Storage Calibration controls to modify rack bounds and horizontal slot counts dynamically.",
        "Perform precision stock search filtering to isolate specific materials, racks or warehouses.",
        "Generate stock reports scoped strictly to the filtered or searched results rather than entire backends.",
        "Monitor stock replenishment levels and active utilization metrics on live dynamically configured grids."
      ],
      operations: [
        {
          name: "Dynamic Map Grid Calibration",
          desc: "Configure physical layout bounds in real-time. Use the Calibration panel to adjust vertical rack counts (A to Z) and horizontal slot counts to auto-recompute utilization capacity.",
          inputs: ["Racks Range (A-Z)", "Active Slots Columns Count"]
        },
        {
          name: "Precise Search Query Tracking",
          desc: "Leverage the smart main-registry omnibox to filter inventory items by stage code, physical rack location, warehouse depot, or SKU.",
          inputs: ["Search Keyword Query"]
        },
        {
          name: "Search-Responsive Inventory Reporting",
          desc: "Click 'Generate Stock Report' to export logs. The exporter compiles only materials currently matching search qualifiers to prevent data dumps.",
          inputs: ["Active Filter Criteria"]
        },
        {
          name: "Production Material Requisition (MRN) Issue",
          desc: "Dispense component stocks directly to the active battery assembly lines when requested by the production engineers.",
          inputs: ["Requisition ID", "Line Assembly Station", "Allocated Qty", "Operator ID"]
        }
      ],
      checklist: [
        "Align physical floor layout limits in the dynamic calibration controls before conducting visual map sweeps.",
        "Apply live filter terms in the registry search omnibox to verify particular rack occupancies.",
        "Use search-filtered stock report output for audit submissions to match exact physical sectors under count.",
        "Verify safety labels on hazardous electrolyte carboys before updating Bin counts.",
        "Maintain minimum safety stocks of separation grids at all times."
      ],
      qaTips: "Always calibrate the dynamic calibration grid layout to match physical warehouse blueprints. When preparing reports, filter by zone or material beforehand to keep printed documents short, fast, and highly directed."
    },
    mrp: {
      title: "4. Material Requirement Planning (MRP) Run Cycles",
      flowCode: "MRP-PLAN-V1.0",
      roleInvolved: "Production Team / Operations Analyst",
      objectives: [
        "Review market demand projections and active dealer purchase bookings.",
        "Calculate Bill of Materials (BOM) explosions for standard battery modules.",
        "Automate material allocations to prevent line assembly halts.",
        "Set up workorders with clear batch sizes and shift times."
      ],
      operations: [
        {
          name: "Bill of Materials (BOM) Expansion",
          desc: "Expand nested formulas for standard lead-acid vs lithium-ion packs. Specify exactly how many cells, grids, caps, acids, and terminals are consumed per pack.",
          inputs: ["Battery Model SKU", "Production Batch size", "Formula Version Node", "Process Scrap Factor"]
        },
        {
          name: "MRP Shortage Run Calculations",
          desc: "Calculate missing components based on active stock minus pending orders, and translate them directly into production indent orders.",
          inputs: ["Target Target Date", "Demand Stream Source", "Stock Safety Cover (days)", "Material Lead Time"]
        }
      ],
      checklist: [
        "Verify that active BOM formula codes have been certified by the R&D supervisor.",
        "Synchronize production schedules with warehouse availability tables.",
        "Check available power load ratings with site support staff before kicking off batch workorders.",
        "Specify secondary alternative ingredients for separator materials in case of logistics delays."
      ],
      qaTips: "If cells allocations are tight, run local forecasts against 'Just In Time' logistics records. Always append a 3% scrap buffer to structural casings during MRP computations to account for routing and hot-molding losses."
    },
    manufacturing: {
      title: "5. Battery Manufacturing Cycle & Conveyor Assembly",
      flowCode: "MFG-ASSY-3.2",
      roleInvolved: "Production Supervisor / Plant Engineers",
      objectives: [
        "Supervise active line conveyor belts assembling completed battery modules.",
        "Track active WIP logs (Work-in-Progress) across cell-stacking, weld routing, casing sealing, and acid filling.",
        "Manage real-time plant support workorders to resolve machine blockages.",
        "Track labor man-hours and energy efficiency per station run."
      ],
      operations: [
        {
          name: "Work-in-Progress (WIP) Logging",
          desc: "Move batches through progressive physical blocks. Log exact timestamps from stacking to final terminal laser sealing.",
          inputs: ["Shift Workorder ID", "Assembly Line ID", "Station Completed Status", "Cycle Duration"]
        },
        {
          name: "Plant Machine Diagnostics Logging",
          desc: "Register machine temperatures, conveyor belt cycle times, and solder robot calibration statistics.",
          inputs: ["Machine Asset ID", "Temperature Level (°C)", "Vibration Spectrum Rating", "Next Service Date"]
        }
      ],
      checklist: [
        "Ensure all robot solder alignments are calibrated within 0.05 mm precision indexes.",
        "Check that sulfuric acid dosing nozzles are free of crystallization build-up.",
        "Validate environmental static discharge bounds before initiating circuit welding stages.",
        "Post active operator numbers to Shift Logs."
      ],
      qaTips: "Keep standard machine temperatures strictly within 120°C - 160°C bounds. If a heat spike occurs on conveyor assembly module terminals, pause work and trigger an 'Internal Maintenance Workorder' immediately."
    },
    quality: {
      title: "6. Quality Assurance (QA) Parameters & Laboratory Checklist",
      flowCode: "QA-CERT-007",
      roleInvolved: "Quality Team",
      objectives: [
        "Perform high-precision parameter testing on completed battery units.",
        "Log terminal voltage (OCV), cell capacity ratings, and internal resistance boundaries.",
        "Mark units as 'CERTIFIED' or 'REJECTED/QUARANTINED'.",
        "Generate authentic QC Calibration Certificate records."
      ],
      operations: [
        {
          name: "Battery Diagnostic Quality Test",
          desc: "Log laboratory results for each physical unit. Test capacity ratings using load bank testers.",
          inputs: ["Serial Code (FG)", "Open Circuit Voltage (OCV)", "Internal Resistance (IR - mΩ)", "Discharge Curve Metric"]
        },
        {
          name: "Batch Quality Certification Release",
          desc: "Affix laboratory stamps if the pack meets strict electrical and physical tolerances.",
          inputs: ["Test Run Date", "Lab Tech Signoff ID", "Sealing Standard Passed (Y/N)", "Vibration Strain Status"]
        }
      ],
      checklist: [
        "Wipe terminal pins clean of acid residues before hooking up micro-ohm testers.",
        "Ensure batteries complete a full equilibrium window of 12 hours before final voltage audits.",
        "Double-check casing surfaces for weld micro-cracks under fluorescent scanner lamps.",
        "Reject any finished module logging an internal resistance higher than 15 mΩ."
      ],
      qaTips: "Always calibrate quality probes against an official standard battery cell every 100 tests. Never approve batteries displaying OCV drops below 12.65V, as they can cause rapid self-discharge in warehousing."
    },
    'finished-goods': {
      title: "7. Finished Goods (FG) Serialization and Logistics",
      flowCode: "FG-LOGIS-4.0",
      roleInvolved: "Store Keeper / FG Manager",
      objectives: [
        "Log certified battery packs into Finished Goods inventory.",
        "Affix barcode serial labels mapped to precise manufacturing indices.",
        "Manage dispatches or inter-warehouse transfers to state depots.",
        "Review packing lists and transport container logistics."
      ],
      operations: [
        {
          name: "Battery Serial Number Registration",
          desc: "Assign dynamic, tamper-evident barcodes mapped directly back to the cells batch codes.",
          inputs: ["Model SKU", "Assigned Serial PIN", "Packaging Box Category", "Weight Stamp (Kg)"]
        },
        {
          name: "Dispatch Planning Workflow",
          desc: "Deploy completed cargo trucks with authorized packing schedules. Handle transit documentation parameters.",
          inputs: ["Consignment Shipping ID", "Destination Depot Location", "Assigned Transport Agency", "Driver Mobile Number"]
        }
      ],
      checklist: [
        "Apply protective plastic caps onto exposed battery terminals before packaging.",
        "Include an official printed QC Validation Card in every outer shipping carton.",
        "Validate truck maximum load criteria before running pallet loaders.",
        "Perform instant barcode sweeps to confirm exact shipping counts."
      ],
      qaTips: "Include high-contrast 'FRAGILE' and 'CORROSIVE CHEMICALS' stickers on all outer boxes. Double-check that the assigned serial number matches the invoice ledger precisely prior to sealing transport panels."
    },
    crm: {
      title: "8. CRM, Form-Captured Enquiry Ledger & Dealer Management",
      flowCode: "CRM-ENQ-3.0",
      roleInvolved: "Sales Executives / Marketing Leads / Regional Directors",
      objectives: [
        "Access the Form-Captured Enquiry Ledger capturing live customer requirement inputs from web forms, B2B portals, and exhibitions.",
        "Convert raw inquiries into qualified dealer leads or direct corporate accounts.",
        "Onboard new battery dealers with GSTIN verification, credit limits, and regional territory tags.",
        "Generate formal price quotations and track pipeline status from Discovery to Won/Closed."
      ],
      operations: [
        {
          name: "Form-Captured Enquiry Ledger Audit",
          desc: "Review inbound web and portal inquiries in the Enquiry Ledger. Filter entries live by company, location, or contact person.",
          inputs: ["Enquiry Search Filter", "Requirement Specification", "Assigned Representative"]
        },
        {
          name: "Dealer Onboarding & GSTIN Verification",
          desc: "Register new dealership accounts. Input GSTIN numbers, bank details, credit limits, and geographic region tags.",
          inputs: ["Dealer Corporate Title", "GSTIN Registration No", "Credit Limit (INR)", "State / Territory Zone"]
        },
        {
          name: "Sales Quotation Builder",
          desc: "Compile custom price quotations for dealer orders including tax breakdowns, warranty terms, and estimated delivery dates.",
          inputs: ["Dealer ID", "Product SKUs & Quantities", "Discount Percentage", "Payment Terms"]
        }
      ],
      checklist: [
        "Verify GSTIN status on the official portal before approving dealer credit limits above ₹5,000,000.",
        "Ensure all Form-Captured Enquiry Ledger items receive initial contact within 2 hours of receipt.",
        "Cross-check finished goods inventory before committing quote delivery dates.",
        "Update lead follow-up timestamps after every phone or in-person meeting."
      ],
      qaTips: "Always check stock availability in Finished Goods before sending binding price quotations. If a lead remains stagnant in QUOTATION_SENT for over 7 days, trigger an automated follow-up notification."
    },
    'regional-sales': {
      title: "9. Regional Sales Analytics & Territory Flow Management",
      flowCode: "REG-SALES-2.1",
      roleInvolved: "Regional Sales Managers / Territory Directors",
      objectives: [
        "Visualize state-wise and region-wise battery distribution performance across North, South, East, and West zones.",
        "Allocate product quotas for newly launched battery models to high-performing regional dealers.",
        "Track sales targets against actual achievements for individual regional executives.",
        "Identify underserved geographic territories to expand dealer network density."
      ],
      operations: [
        {
          name: "Territory Performance Mapping",
          desc: "Analyze interactive sales maps highlighting revenue density, unit volume, and dealer coverage across state borders.",
          inputs: ["Region Selector (North/South/East/West)", "Product Family Filter"]
        },
        {
          name: "Regional Quota & Stock Allocation",
          desc: "Set monthly stock quotas for regional depots to ensure equitable distribution of high-demand battery models.",
          inputs: ["Target State / Depot", "Model SKU Allocation Qty", "Release Schedule"]
        }
      ],
      checklist: [
        "Review monthly regional sales variance reports before adjusting territory quotas.",
        "Ensure dealer ranking scores are updated based on payment history and order frequency.",
        "Align regional marketing drives with inventory availability in nearby warehouses."
      ],
      qaTips: "Focus regional sales efforts on states showing high EV battery adoption growth. Maintain at least 15% safety stock in regional depots to prevent stockouts during festival surges."
    },
    billing: {
      title: "10. Commercial Billing, GST Ledger Reconciliation & Invoicing",
      flowCode: "FIN-GST-1.1",
      roleInvolved: "Finance Biller / Accounts Specialist",
      objectives: [
        "Formulate official GST Tax Invoices for authorized buyer portals.",
        "Automate tax segment calculations (CGST, SGST, IGST) depending on dispatch source.",
        "Log payments against invoice balances.",
        "Directly tune billing metrics using the dynamic 'Edit Field Metrics' tool.",
        "Maintain absolute GSTR consistency between individual item rates and total invoices."
      ],
      operations: [
        {
          name: "GST Invoice Generation Builder",
          desc: "Generate official commercial invoices. Fetch dealer profiles and model SKUs to instantly compile pricing models.",
          inputs: ["Dealer Account Link", "Dispatch Depot ID", "Battery SKUs List & Qty", "Extra Transportation Cost"]
        },
        {
          name: "A4 GST Invoice Field Metrics Overrides",
          desc: "Calibrate and refine existing invoices directly. Use 'Edit Field Metrics' to modify payment statuses, Net Subtotal, and GST Tax. Changes instantly recalibrate the individual line-item unit rates using a linear scaling factor to guarantee math consistency across printed formats.",
          inputs: ["Invoice Status Selector", "New Taxable Net Subtotal", "Adjusted GST SGST/CGST Tax"]
        },
        {
          name: "Invoice Payment Entry Posting",
          desc: "Reconcile received wire bank transfers against unresolved dealer billing records. Adjust outstanding credit balances.",
          inputs: ["Invoice Reference", "Transaction Bank Reference", "Amount Received (INR)", "Payment Mode Channel"]
        }
      ],
      checklist: [
        "Verify HSN codes on heavy commercial batteries (typically HS Coding 8507) are exact on dispatch tax sheets.",
        "Apply correct tax percentages: 18% or 28% GST brackets based on current national statutes.",
        "When correcting invoice metrics through overrides, assure the item rates scale properly to match revised grand totals.",
        "Post invoices directly to regional accounting tables within 24 hours of dispatch.",
        "Perform instant audits of ledger balances before clearing new consignments."
      ],
      qaTips: "Check the state billing source: If delivery goes from Gujarat Depot to Maharashtra Dealer, enforce IGST parameters. Enforce split CGST & SGST models strictly for local intra-state consignments. After editing subtotal limits or tax parameters, verify that the A4 generator automatically refactors the item's custom unit rates to ensure absolute ledger harmony."
    },
    warranty: {
      title: "11. Warranty Registration and Claims Verification Node",
      flowCode: "WRNTY-CLAIM",
      roleInvolved: "Warranty Officer",
      objectives: [
        "Register retail serial codes during battery installations.",
        "Calculate clear warranty coverage periods.",
        "Validate incoming claims against operational parameters.",
        "Track claims validation parameters to prevent scam logging."
      ],
      operations: [
        {
          name: "Battery Retail Activation Registry",
          desc: "Register end-users with matching battery serial keys, date of retail purchase, and customer contact parameters.",
          inputs: ["Serial Number Label", "Retail Sale Date", "End customer Mobile", "Selling Dealer ID"]
        },
        {
          name: "Warranty Claim Validation Sweep",
          desc: "Evaluate claim eligibility based on installation date, physical symptoms, and laboratory charging check.",
          inputs: ["Claim ID", "Customer Battery Serial", "Visual Damage Status", "Open Circuit Voltage at Claim"]
        }
      ],
      checklist: [
        "Confirm that the battery barcode serial exists in the certified manufacturing catalog.",
        "Reject warranty requests showing deep external case bulges caused by system overcharging.",
        "Apply specified grace-period factors (e.g., 30 days post-expiry) for long-term customer relations.",
        "Log failure symptoms to help improve quality controls."
      ],
      qaTips: "Verify the battery registration date against dealer bulk dispatch sheets. If a battery is registered more than 365 days after the dealer delivery timestamp, query the distributor for stocking notes."
    },
    engagement: {
      title: "12. Customer Engagement, Loyalty Program & QR Rewards",
      flowCode: "CUST-ENG-1.5",
      roleInvolved: "Marketing Operations / Customer Experience Leads",
      objectives: [
        "Monitor retail end-user app adoption, daily active users, and QR code scan metrics.",
        "Manage the Mechanic & Dealer Loyalty Program where users earn points by scanning battery QR codes.",
        "Review and approve reward redemption requests (extended warranties, health audits, cashbacks).",
        "Publish promotional campaigns and analyze user satisfaction ratings."
      ],
      operations: [
        {
          name: "QR Code Scan & Registration Tracking",
          desc: "Track real-time QR code scans performed by customers and mechanics at the point of installation.",
          inputs: ["Serial / QR Code ID", "Scanner Geo-Location", "App User Profile"]
        },
        {
          name: "Loyalty Reward Claim Approval",
          desc: "Audit pending reward redemption claims submitted by mechanics and approve voucher issuance.",
          inputs: ["Claim ID", "User Account", "Points Deduction Value", "Approval Status"]
        }
      ],
      checklist: [
        "Verify that scanned serial numbers exist in the Finished Goods dispatch database before awarding loyalty points.",
        "Audit duplicate scan attempts to prevent fraudulent point accumulation.",
        "Process pending reward claims within 24 hours of submission."
      ],
      qaTips: "Flag any user account recording more than 15 QR scans per hour for security review to catch automated scanner scripts."
    },
    service: {
      title: "13. RMA Service Center Diagnostics & Maintenance Checklist",
      flowCode: "RMA-SERV-V2.5",
      roleInvolved: "Service Team / Plant Service Engineer",
      objectives: [
        "Issue RMA tickets for returned batteries.",
        "Utilize strict technical checklists to locate cell faults.",
        "Trigger replacement order approvals for verified failures.",
        "Track recycling records for scrap elements."
      ],
      operations: [
        {
          name: "RMA Diagnostic Checklist Log",
          desc: "Document initial inspections on returned batteries, covering parameters like acid color, box integrity, and terminals wear.",
          inputs: ["RMA Intake ID", "Electrolyte Density (g/cm³)", "Charge Acceptance (Amps)", "Visual Grid Corrosive Index"]
        },
        {
          name: "RMA Replacement / Scrap Decider",
          desc: "Direct failed units to heavy cell replacement repair lines or the Environment-Approved recycling scrap pool.",
          inputs: ["RMA Issue ID", "Action Decided (Repair/Replace/Scrap)", "Lead Metal Recovery (Kg)", "Scrap Certificate Number"]
        }
      ],
      checklist: [
        "Log hydrometer gravity parameters for every cell chamber before flushing electrolyte blocks.",
        "Perform dynamic discharge checks under simulated automotive load conditions.",
        "Log recovered lead weight accurately for governmental green credits dashboards.",
        "Clear repair tickets once technician test logs show stable parameter cycles."
      ],
      qaTips: "Ensure environmental safety gear is fully worn during acid handling. Clean and salvage terminals blocks from cells blocks that are otherwise directed to the recycling plant to optimize resource recovery."
    },
    alerts: {
      title: "14. Operational System Alerts & Cross-Module Audit Logs",
      flowCode: "SYS-ALERT-4.0",
      roleInvolved: "All System Users / Operations Supervisors",
      objectives: [
        "Monitor real-time system alerts triggered by critical operational thresholds (low stock, high RMA rate, payment delays).",
        "Review the audit log of cross-module handshakes and manual supervisor overrides.",
        "Acknowledge, resolve, or escalate high-priority operational warnings.",
        "Filter system notifications by domain channel (System, Quality, Finance, Sales, Logistics)."
      ],
      operations: [
        {
          name: "System Alert Processing & Resolution",
          desc: "Inspect incoming warning notifications, review root causes, and mark alerts as ACKNOWLEDGED or RESOLVED.",
          inputs: ["Alert ID", "Resolution Action Note", "Status Update"]
        },
        {
          name: "Audit Trail Handshake Verification",
          desc: "Examine chronological system event logs capturing automated state changes and manual override actions.",
          inputs: ["Module Scope Filter", "Date Range Window", "User ID Query"]
        }
      ],
      checklist: [
        "Investigate all HIGH severity alerts immediately upon appearance.",
        "Ensure manual parameter overrides are documented with clear operational justification.",
        "Clear resolved alerts to maintain a clean operational dashboard."
      ],
      qaTips: "Set up auto-escalation rules for critical alerts remaining unacknowledged for over 30 minutes during active plant shifts."
    },
    analytics: {
      title: "15. Business Analytics & Financial Intelligence",
      flowCode: "BI-ANALYTICS-3.0",
      roleInvolved: "Super Admin / Finance Director / Plant Manager",
      objectives: [
        "Analyze financial performance metrics including Gross Revenue, Operating Expense, Gross Margin, and Net Profit.",
        "Evaluate failure timeline trends and RMA cases across monthly production runs.",
        "Perform Pareto analysis on warranty failure root causes (BMS fault, Cell degradation, Acid leak, Terminal corrosion).",
        "Review dealer performance matrices and export structured analytical summaries."
      ],
      operations: [
        {
          name: "Financial Intelligence Dashboard Review",
          desc: "Inspect top-level P&L summaries, monthly cash flow charts, and expense category distributions.",
          inputs: ["Fiscal Year Quarter", "Comparison Basis"]
        },
        {
          name: "Quality & RMA Failure Analytics",
          desc: "Examine failure rate trends by battery SKU family to identify manufacturing batch defects.",
          inputs: ["Product Model SKU", "Failure Type Classification"]
        }
      ],
      checklist: [
        "Verify that financial revenue figures reconcile with posted GST Tax Invoices.",
        "Cross-reference failure timeline spikes with supplier raw material batch logs.",
        "Export monthly executive summary reports for board review."
      ],
      qaTips: "If a specific battery model shows an RMA rate exceeding 2.5%, initiate an immediate design review with the R&D engineering team."
    },
    'super-admin': {
      title: "16. Super Admin Control & Supabase Database Infrastructure",
      flowCode: "SYS-ADMIN-5.0",
      roleInvolved: "Super Admin / Lead Database Administrator",
      objectives: [
        "Manage real-time cloud synchronization between local state and Supabase PostgreSQL database.",
        "Configure global ERP environment settings (GST percentages, default warranty terms, currency formats).",
        "Manage user security accounts, role assignments, and credential reset policies.",
        "Execute administrative database backups, SQL schema migrations, and system security audits."
      ],
      operations: [
        {
          name: "Supabase Cloud Sync Management",
          desc: "Monitor live cloud synchronization status, execute manual database sync triggers, and review sync payloads.",
          inputs: ["Manual Sync Trigger", "Sync Target Table", "Conflict Resolution Policy"]
        },
        {
          name: "Global System Parameters Configuration",
          desc: "Update core ERP constants including tax rates, company profile metadata, and security passphrases.",
          inputs: ["GST Standard Rate (%)", "Default Warranty (Months)", "Admin Passphrase"]
        }
      ],
      checklist: [
        "Verify Supabase connection health before initiating major batch operations.",
        "Backup database schemas before executing manual SQL script updates.",
        "Audit user role permissions quarterly to enforce least-privilege security access."
      ],
      qaTips: "Always run SQL schema updates in a staging transaction first. Ensure administrative passphrases are rotated every 90 days."
    }
  };

  const visibleStepsMetadata = stepsMetadata.filter(s => allowedStepIds.includes(s.id));

  const filteredSteps = searchQuery.trim() === ''
    ? visibleStepsMetadata
    : visibleStepsMetadata.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const selectedStepData = manualStepsDetails[activeStep] || manualStepsDetails['dashboard'];

  return (
    <div id="user-manual-content-container" className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-slate-50 text-slate-800">
      
      {/* Pristine Light-Themed Header Banner with High-Contrast Text */}
      <div className="relative overflow-hidden bg-white border border-slate-350 rounded-2xl p-6 md:p-8 text-slate-900 shadow-sm">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.15)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-70"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="inline-flex items-center gap-1.5 text-[10px] bg-slate-100 border border-slate-300 text-slate-700 font-mono font-black py-1 px-3 rounded-full uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
                Document Key: AR-OPS-MNL-26
              </div>
              {user && (
                <div className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-mono font-black py-1 px-3 rounded-full uppercase tracking-wider border",
                  (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN)
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-amber-50 border-amber-300 text-amber-800"
                )}>
                  <span>🔒 Access Level:</span>
                  <span className="font-extrabold">{user.role.replace('_', ' ')} ({(user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) ? "FULL" : "RESTRICTED"})</span>
                </div>
              )}
            </div>
            <h2 className="text-3xl md:text-4.5xl font-extrabold tracking-tight text-slate-900 uppercase">
              Arcenol ERP <span className="text-sky-650 font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-700">OPERATIONS MANUAL</span>
            </h2>
            <p className="text-[13px] text-slate-600 font-medium max-w-2xl leading-relaxed">
              Complete step-by-step operations manual covering all 16 plant modules and user panels. Click any step block below to view precise screen walkthroughs, checklists, inputs, regulatory parameters, and supervisor guidelines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
             <button
                onClick={() => downloadElementAsPDF("user-manual-content-container", "Arcenol_ERP_Operations_Manual.pdf")}
                className="px-5 py-3.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
                id="print-user-manual-btn"
                title="Download User Manual as PDF File"
             >
                <Download size={14} className="text-sky-100" /> Download Manual PDF
             </button>
             <button
                onClick={() => window.print()}
                className="px-4 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                title="Print User Manual"
             >
                <BookOpen size={13} className="text-sky-400" /> Print
             </button>
             <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl shadow-3xs">
               <BookOpen size={18} className="text-sky-600 shrink-0" />
               <div className="font-mono text-left">
                 <div className="text-[9px] text-slate-500 uppercase tracking-widest font-black">DOCUMENT REVISION</div>
                 <div className="text-sm font-black text-slate-900 leading-none">V5.0 All-Panel Edition</div>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-300 p-4 rounded-xl shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">🔍</span>
          <input 
            type="text"
            placeholder="Search steps, operations, roles, or checkpoints across all panels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-300 pl-9 pr-4 py-2 rounded-lg text-xs font-bold leading-tight outline-none focus:ring-1 focus:ring-sky-500/40 focus:border-sky-500 focus:bg-white transition-all font-sans text-slate-800"
          />
        </div>
        <div className="text-[11px] text-slate-650 font-extrabold uppercase tracking-widest flex items-center gap-2">
          <span className="text-slate-600">Select any module card below to view handbook details</span>
          <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping"></span>
        </div>
      </div>

      {/* SECTION A: GRAPHICAL INTERACTIVE FLOW CHART (HIGHLY READABLE LIGHT SETUP) */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 text-[9px] font-mono text-slate-400 font-black tracking-normal uppercase">
          Dynamic Flow Engine-v5.0
        </div>
        
        <div className="flex items-center gap-2.5 mb-6 border-b border-slate-150 pb-4 select-none">
          <div className="w-2 h-5 bg-gradient-to-b from-sky-500 to-blue-600 rounded"></div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">
              Complete Ecosystem Operations Flowchart (All 16 Panel Modules)
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold leading-normal">
              Linear material, sales, billing, and operational process map. Click on any block to load official control values and checklist parameters below.
            </p>
          </div>
        </div>

        {/* The Live Interactive Grid connecting cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 relative z-10">
          {filteredSteps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === step.id;
            return (
              <div key={step.id} className="relative flex flex-col group">
                <button
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border text-xs transition-all duration-300 flex flex-col h-full justify-between relative cursor-pointer",
                    isSelected ? step.activeColor : step.color
                  )}
                  id={`manual-node-${step.id}`}
                >
                  <div className="flex items-start justify-between w-full pointer-events-none">
                    <div className={cn(
                      "p-2 rounded-lg transition-transform duration-300",
                      isSelected ? "bg-sky-600 text-white scale-105" : "bg-slate-100 text-slate-700"
                    )}>
                      <Icon size={16} />
                    </div>
                    <span className="text-[9px] font-mono font-black text-slate-500 tracking-tighter bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      PANEL {idx + 1}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 w-full pointer-events-none">
                    <h4 className="font-black text-[12px] tracking-tight text-slate-900 line-clamp-1">{step.title}</h4>
                    <p className="text-[11px] text-slate-650 font-normal leading-relaxed line-clamp-2">{step.description}</p>
                    <div className="text-[9px] text-sky-700 font-bold tracking-tight uppercase pt-2 font-mono flex items-center justify-between">
                      <span className="truncate max-w-[130px]">{step.role}</span>
                      <ChevronRight size={12} className={cn(
                        "transition-transform",
                        isSelected ? "text-sky-600 translate-x-0.5" : "text-slate-400 group-hover:translate-x-1"
                      )} />
                    </div>
                  </div>
                </button>

                {/* Draw graphical connector arrow between steps */}
                {idx < filteredSteps.length - 1 && (
                  <div className="hidden xl:flex absolute top-1/2 -translate-y-1/2 -right-3 z-20 w-4 items-center justify-center pointer-events-none">
                    <ArrowRight size={13} className="text-slate-400 opacity-60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION B: PLAYGROUND WALKTHROUGHS & STEPS DETAIL CORE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Selected Step Handbook Content */}
        <div className="lg:col-span-8 bg-white border border-slate-300 rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
          {selectedStepData ? (
            <div className="space-y-6 text-left">
              
              {/* Header block details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <span className="text-[10px] font-mono font-black bg-slate-100 text-slate-700 border border-slate-250 px-2.5 py-1 rounded-md uppercase">
                    PROCESS ID: {selectedStepData.flowCode}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2.5 uppercase text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-indigo-900">
                    {selectedStepData.title}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono font-bold mt-1.5 inline-flex items-center gap-1.5">
                    <UserCheck size={14} className="text-sky-600" />
                    Authorized Action Scope: <span className="text-slate-800 font-black">{selectedStepData.roleInvolved}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ISO 9001 Standard
                  </div>
                  {setActiveTab && STEP_TAB_MAP[activeStep] && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(STEP_TAB_MAP[activeStep].tab)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <Zap size={14} className="text-amber-300 fill-amber-300 shrink-0" />
                      <span>Open {STEP_TAB_MAP[activeStep].label}</span>
                      <ArrowRight size={13} className="shrink-0" />
                    </button>
                  )}
                </div>
              </div>

              {/* Functional Goals */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-mono">
                  Primary Flow Objectives
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedStepData.objectives.map((obj, i) => (
                    <div key={i} className="flex gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-[12px] text-slate-705 font-bold leading-relaxed">{obj}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ERP Technical Operation Handlers */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-mono">
                  ERP Screen Walkthrough Procedures
                </h4>
                <div className="space-y-4">
                  {selectedStepData.operations.map((op, i) => (
                    <div key={i} className="bg-slate-50/70 hover:bg-slate-50 border border-slate-250 p-4 md:p-5 rounded-xl transition duration-150 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">
                          {i + 1}. {op.name}
                        </span>
                        <span className="text-[9px] font-mono font-black text-sky-700 tracking-wider bg-sky-100/70 px-2.5 py-1 rounded border border-sky-200 uppercase">
                          EXPERT STEP
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-650 leading-relaxed font-semibold">
                        {op.desc}
                      </p>
                      
                      {/* Technical Input fields reference */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono block">Required Controller Inputs:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {op.inputs.map((inp, idx) => (
                            <span key={idx} className="bg-white px-2.5 py-1 text-[11px] font-mono text-slate-700 font-bold border border-slate-300 rounded shadow-3xs">
                              ⌨️ {inp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Light High-Contrast Operations Checklist Box */}
              <div className="space-y-3 bg-slate-50 text-slate-900 p-5 rounded-xl border border-slate-350">
                <div className="flex items-center gap-2 text-slate-900 border-b border-slate-250 pb-2.5 mb-2.5 select-none">
                  <FileText size={16} className="text-sky-650" />
                  <span className="text-xs font-black uppercase tracking-widest font-mono">Operations Checklist Rules</span>
                </div>
                <div className="space-y-2.5 select-text">
                  {selectedStepData.checklist.map((item, idx) => (
                    <div key={idx} className="flex gap-2.5 text-[12px] text-slate-800 font-semibold leading-relaxed">
                      <span className="text-sky-700 font-bold font-mono">[{idx + 1}]</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Industrial advice box */}
              <div className="border border-amber-300 bg-amber-50/50 p-4 rounded-xl flex gap-3 text-left">
                <span className="text-xl text-amber-600 select-none">⚠️</span>
                <div className="space-y-1">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-amber-800 font-mono">Warehouse & QC Field Advice</h5>
                  <p className="text-xs text-amber-950 font-bold leading-relaxed">
                    {selectedStepData.qaTips}
                  </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center p-12 text-slate-400">
              <HelpIcon size={40} className="mx-auto mb-4 animate-bounce text-slate-300" />
              <p className="font-extrabold uppercase text-xs tracking-wider">Please select any stage from the operations flowchart.</p>
            </div>
          )}
        </div>

        {/* Right Side: Role Clearance Reference Matrix */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white text-slate-900 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-300 relative overflow-hidden text-left">
            <div className="absolute right-0 top-0 p-3 opacity-2.5">
              <Truck size={80} className="text-slate-300" />
            </div>
            
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-200 pb-4 select-none">
              <UserCheck size={18} className="text-sky-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest font-mono text-slate-900">
                  {(!user || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) ? "User Account Matrix" : "Your Account Scope"}
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                  {(!user || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) 
                    ? "Login credentials to verify workorder procedures for each step." 
                    : "Your individual role clearance metrics and checklist permissions."}
                </p>
              </div>
            </div>

            {/* Scrolling grid of roles */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 select-text">
              {credentialsList
                .filter((cred) => !user || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN || cred.role === user.role)
                .map((cred) => (
                <div key={cred.role} className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl space-y-2 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                      {cred.role}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono select-none">
                      pass: <span className="text-slate-800 font-extrabold">{cred.pass}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-1 font-mono text-[11px] leading-normal border-b border-slate-150 pb-1.5">
                    <div className="font-black text-slate-900">{cred.name}</div>
                    <div className="text-[10px] text-slate-600 font-bold truncate">{cred.email}</div>
                  </div>

                  <p className="text-[10px] text-slate-650 leading-relaxed font-bold italic">
                    {cred.scope}
                  </p>
                </div>
              ))}
            </div>

            {/* Helpline and documentation contact */}
            <div className="bg-slate-100 border border-slate-250 p-4 rounded-xl text-[11px] space-y-2 mt-4 select-none">
              <div className="font-mono text-sky-800 font-black tracking-widest uppercase">Central Service Helpline</div>
              <p className="text-slate-600 leading-relaxed font-bold">
                If credentials lock, contact the Central Registrar at <span className="text-slate-900 font-extrabold">+91 79 4028 9200</span> or mail support at <span className="text-slate-900 font-extrabold">digicommunique@gmail.com</span>.
              </p>
            </div>
            
          </div>

          <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 shadow-xs text-left space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono border-b border-slate-200 pb-3 select-none">
              🔋 Dynamic Battery Standards
            </h4>
            
            <div className="space-y-3 font-semibold text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 bg-emerald-50 text-emerald-950 border border-emerald-250 rounded-xl space-y-1.5">
                <div className="font-black uppercase tracking-wider text-[11px] text-emerald-800 font-mono">Lithium-ion Pack Metrics</div>
                <p className="text-[11px] leading-relaxed">Charging voltage limits set to <span className="font-black text-emerald-700">4.2V</span> per cell. Operating temperatures must be verified strictly under <span className="font-black text-emerald-700">45°C</span> run caps during the assembly and charging test windows.</p>
              </div>

              <div className="p-3.5 bg-blue-50 text-blue-950 border border-blue-250 rounded-xl space-y-1.5">
                <div className="font-black uppercase tracking-wider text-[11px] text-blue-800 font-mono">Lead-Acid Pack Metrics</div>
                <p className="text-[11px] leading-relaxed">Specific gravity indicators set to <span className="font-black text-blue-700">1.280 g/cm³</span> for fully charged status cells. Acid filling process strictly demands de-mineralized water to retain log safety parameters.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
