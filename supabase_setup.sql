-- =========================================================================
-- ARCENOL ENERGY - SUPABASE DATABASE SCHEMAS & INITIALIZATION BLUEPRINT
-- FILE: supabase_setup.sql
-- =========================================================================
-- Instructions:
-- 1. Log in to your Supabase Dashboard (https://supabase.com).
-- 2. Open your project, and click on the "SQL Editor" tab on the left sidebar.
-- 3. Click "New Query" to open an SQL query editor page.
-- 4. Copy and paste the entire script below into the editor.
-- 5. Click the "Run" button at the bottom right.
-- 6. Connect your application by updating your environment variable keys with:
--    URL: https://zrycwwcnzaoqhhqkrhig.supabase.co
--    Key: sb_publishable_t8cKhGdESXfoBRnc0awuOA_XcyOk7tl
-- =========================================================================

-- -------------------------------------------------------------------------
-- TABLE 1: CORPORATE UNITS (PRE-EXISTING REFERENCE)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arcenol_corporate_units (
  id text PRIMARY KEY,
  name text NOT NULL,
  "shortName" text,
  type text,
  gstin text,
  cin text,
  "contactEmail" text,
  phone text,
  website text,
  address text,
  capacity text,
  manager text,
  status text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 2: WAREHOUSES & LOGISTICS NODES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
  id text PRIMARY KEY,
  name text NOT NULL,
  racks integer DEFAULT 6,
  slots integer DEFAULT 8,
  valuation numeric DEFAULT 0.00,
  items_count integer DEFAULT 0,
  status text DEFAULT 'ACTIVE',
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 3: INVENTORY PROCUREMENT (RAW STOCK & MATERIALS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  category text NOT NULL,
  qty numeric DEFAULT 0.00,
  unit text DEFAULT 'Kg',
  supplier text,
  warehouse text,
  rack text DEFAULT 'A-1',
  price numeric DEFAULT 0.00,
  grn text,
  batch text,
  min_stock numeric DEFAULT 100,
  reorder_level numeric DEFAULT 250,
  qc_status text DEFAULT 'APPROVED',
  status text DEFAULT 'AVAILABLE',
  reserved_qty numeric DEFAULT 0,
  date text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS min_stock numeric DEFAULT 100;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reorder_level numeric DEFAULT 250;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS qc_status text DEFAULT 'APPROVED';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS status text DEFAULT 'AVAILABLE';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reserved_qty numeric DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS date text;

-- -------------------------------------------------------------------------
-- TABLE 4: QUALITY CONTROL CELL GRADING PANEL (CELL REPOSITORY)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.graded_cells (
  id text PRIMARY KEY,
  serial text UNIQUE NOT NULL,
  voltage numeric DEFAULT 3.20,
  ir numeric DEFAULT 7.50,
  capacity numeric DEFAULT 6000,
  cycle_count integer DEFAULT 0,
  temp numeric DEFAULT 24.50,
  grade text NOT NULL,
  engineer text DEFAULT 'Suresh P.',
  usage text DEFAULT 'EV PACKS',
  supplier text,
  parent_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 5: PROCESS INITIATION & WIP RUNS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wip_inventory (
  id text PRIMARY KEY,
  name text NOT NULL,
  qty numeric DEFAULT 0.00,
  stage text NOT NULL,
  last_update text,
  components jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 5A: WIP PROCESS STAGES REGISTRY
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wip_process_stages (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 5B: PROCESS INITIATION & MATERIAL ISSUES
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.process_initiations (
  id text PRIMARY KEY,
  inventory_target_type text NOT NULL,
  magnitude_count numeric DEFAULT 0,
  initial_wip_stage text NOT NULL,
  components jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'INITIATED',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 5C: MRP MATERIALS CALCULATOR
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mrp_calculations (
  id text PRIMARY KEY,
  battery_model text NOT NULL,
  scheduled_batch_qty numeric DEFAULT 0,
  allocated_components jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'SIMULATED',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 6: BLUEPRINT CATEGORIES (INVENTORY & NODE GROUP MAPPINGS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- -------------------------------------------------------------------------
-- TABLE 7: BOM MATRIX CONFIGURATOR (BLUEPRINTS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bom_blueprints (
  id text PRIMARY KEY,
  model_id text NOT NULL,
  name text NOT NULL,
  category_group text DEFAULT 'Uncategorized',
  components jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 8: NEW LEAD INQUIRIES & REMINDERS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_inquiries (
  id text PRIMARY KEY,
  company text NOT NULL,
  category text NOT NULL,
  source text NOT NULL,
  contact_person text,
  mobile text,
  location text,
  followup_date text,
  followup_time text,
  requirement text,
  status text DEFAULT 'NEW',
  notes text,
  remarks_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lead_inquiries ADD COLUMN IF NOT EXISTS followup_date text;
ALTER TABLE public.lead_inquiries ADD COLUMN IF NOT EXISTS followup_time text;
ALTER TABLE public.lead_inquiries ADD COLUMN IF NOT EXISTS status text DEFAULT 'NEW';
ALTER TABLE public.lead_inquiries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.lead_inquiries ADD COLUMN IF NOT EXISTS remarks_log jsonb DEFAULT '[]'::jsonb;

-- -------------------------------------------------------------------------
-- TABLE 8B: LEAD FOLLOW-UP LOGS & INTERACTION TIMELINE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_followup_logs (
  id text PRIMARY KEY,
  lead_id text REFERENCES public.lead_inquiries(id) ON DELETE CASCADE,
  discussion_summary text NOT NULL,
  followup_date text,
  followup_time text,
  logged_by text DEFAULT 'Sales Representative',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 9: RECEIVER PARTY (CUSTOMERS DIRECTORY)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  company text,
  branch text,
  gstin text,
  contact_person text,
  phone text,
  address text,
  city text,
  state text,
  location_hub text,
  ledger_status text DEFAULT 'APPROVED CREDIT',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS location_hub text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS ledger_status text DEFAULT 'APPROVED CREDIT';

-- -------------------------------------------------------------------------
-- TABLE 10: SALES BILLING & INVOICING ARTIFACTS (NEW SALE INVOICE)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id text PRIMARY KEY,
  voucher_no text DEFAULT 'VCHP-2026',
  customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
  party_id text,
  party_name text,
  biller_signature text DEFAULT 'ARAVIND SWAMY (SUPER_ADMIN)',
  goods jsonb DEFAULT '[]'::jsonb, -- Array of items chosen with assigned serial numbers
  items jsonb DEFAULT '[]'::jsonb, -- Model-level or SKU-level breakdown
  assigned_serials jsonb DEFAULT '[]'::jsonb, -- Barcode serial numbers assigned to invoice
  subtotal numeric DEFAULT 0.00,
  discount numeric DEFAULT 0.00,
  flat_discount numeric DEFAULT 0.00,
  freight_charge numeric DEFAULT 0.00, -- Freight / Logistics Charge (₹)
  packaging_charge numeric DEFAULT 0.00, -- Packaging Charge (₹)
  payment_terms text DEFAULT 'Due on Receipt', -- 'Due on Receipt', 'Net 7 Days', 'Net 15 Days', 'Net 30 Days'
  gst numeric DEFAULT 0.00,
  tax numeric DEFAULT 0.00,
  gst_tax_rate numeric DEFAULT 18.00,
  grand_total numeric DEFAULT 0.00,
  total numeric DEFAULT 0.00,
  payment_mode text DEFAULT 'Credit', -- 'Credit (Mark Unpaid Ledger)', 'Cash', 'Bank'
  status text DEFAULT 'UNPAID', -- 'UNPAID', 'PAID'
  date text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voucher_no text DEFAULT 'VCHP-2026';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS party_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS party_name text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS biller_signature text DEFAULT 'ARAVIND SWAMY (SUPER_ADMIN)';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS goods jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS assigned_serials jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS flat_discount numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS freight_charge numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS packaging_charge numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'Due on Receipt';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS gst numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS gst_tax_rate numeric DEFAULT 18.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS grand_total numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'Credit';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status text DEFAULT 'UNPAID';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- -------------------------------------------------------------------------
-- TABLE 11: ACCOUNTING VOUCHERS (2-RECORD PAYMENT IN & 3-RECORD PURCHASES / EXPENSES)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_vouchers (
  id text PRIMARY KEY,
  voucher_no text,
  voucher_type text NOT NULL, -- 'Payment-In', 'Purchase', 'Expense', 'PAYMENT', 'PURCHASE', 'EXPENSE'
  vtype text,                 -- Alias for voucher_type
  party_id text,              -- Select Party Customer / Vendor ID
  party_name text,            -- Party Company / Recipient vendor Name
  party_company text,         -- Alias for party_name
  category text,              -- Raw Components Category or Operational Expense Category
  amount numeric DEFAULT 0.00,
  deposit_mode text DEFAULT 'Bank Deposit', -- 'Bank Deposit', 'Cash', 'UPI', 'Cheque'
  settlement_status text DEFAULT 'Paid (Decrease dynamic book balance)', -- Settlement Status
  payment_notes text,         -- Reference / Notes (e.g. 'UPI ID: 49301030 @ hdfc')
  reference_notes text,       -- Alias for payment_notes
  remarks text,               -- Remarks / Log
  date text,                  -- Transaction date
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS voucher_no text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS voucher_type text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS vtype text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS party_id text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS party_name text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS party_company text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0.00;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS deposit_mode text DEFAULT 'Bank Deposit';
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'Paid (Decrease dynamic book balance)';
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS payment_notes text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS reference_notes text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS date text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- -------------------------------------------------------------------------
-- TABLE 12: DTC HANDSHAKE SCANS (POST-SALE ENGAGEMENTS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dtc_scans (
  id text PRIMARY KEY,
  battery_model text NOT NULL,
  user_identifier text,
  location text,
  scanned_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 13: MARKETING CAMPAIGNS & PROMOTIONAL OFFERS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id text PRIMARY KEY,
  title text NOT NULL,
  category_group text NOT NULL,
  description text,
  status text DEFAULT 'ACTIVE',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 14: BATCH QR TRACKING LABEL REGISTERS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_qr_labels (
  id text PRIMARY KEY,
  blueprint_name text NOT NULL,
  prefix text DEFAULT 'ARC-INV-',
  quantity integer DEFAULT 50,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 15: RMA HELP DESK (INSTANT PLANT TICKETS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plant_tickets (
  id text PRIMARY KEY,
  serial_reference text NOT NULL,
  issue_classification text NOT NULL,
  symptoms text,
  status text DEFAULT 'OPEN',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 16: COMPLAINTS & DIAGNOSTIC CONTROL (DIAGNOSTIC ARTIFACT CONTROL UNIT)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
  id text PRIMARY KEY,
  serial text NOT NULL,
  type text NOT NULL, -- issue_classification (e.g. 'Low Range', 'Dead on Arrival', 'No Backup')
  stage text NOT NULL DEFAULT 'REGISTERED', -- 'REGISTERED', 'RECEIVED', 'UNDER_INSPECTION', 'REPAIR_STARTED', 'WAITING_FOR_PARTS', 'TESTING', 'QC_PASSED', 'READY_FOR_DISPATCH', 'DELIVERED', 'CLOSED'
  status text DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED', 'CLOSED'
  date text, -- Registration Dt (e.g. '2024-05-10')
  resolved_date text,
  notes text, -- Technical Field Notes / Symptom Description (e.g. 'BMS firmware updated.')
  engineering_observations text, -- (e.g. 'Technician Suresh P. is actively scrutinizing...')
  root_cause text DEFAULT 'PENDING SCRUTINY', -- Root Cause Matrix (RCA) (e.g. 'BMS Failure')
  engineer text DEFAULT 'Unassigned',
  inspection_result text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 17: DIAGNOSTIC COMMAND HISTORICAL LEDGER (AUDIT OVERRIDES)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diagnostic_ledger (
  id text PRIMARY KEY,
  complaint_id text REFERENCES public.complaints(id) ON DELETE CASCADE,
  serial text NOT NULL,
  stage text NOT NULL,
  root_cause text,
  notes text, -- Technical Field Notes / Commit Notes
  engineer text DEFAULT 'System Operator',
  timestamp text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 18: CORPORATE BUSINESS PROFILE / SUPER ADMIN REGISTRY
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arcenol_business_profile (
  id text PRIMARY KEY, -- Will always be 'PRIMARY'
  "companyName" text NOT NULL,
  "shortName" text,
  "establishedYear" text,
  "industrySector" text,
  "contactEmail" text,
  phone text,
  website text,
  cin text,
  gstin text,
  address text,
  "manufacturingCapacity" text,
  "leadAcidOutput" text,
  "depotsCount" integer DEFAULT 5,
  "primaryRegion" text DEFAULT 'WEST_SOUTH',
  "complianceOfficer" text,
  "nodePassphrase" text,
  logo text,
  "loginLeftImage" text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 19: PURCHASE ORDERS (GENERATE PURCHASE ORDER / INWARD REQUISITIONS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id text PRIMARY KEY,
  material_id text,
  material_name text NOT NULL,
  category text DEFAULT 'RAW_MATERIAL',
  vendor text NOT NULL,
  vendor_contact text,
  qty numeric DEFAULT 0.00,
  unit text DEFAULT 'Pcs',
  unit_cost numeric DEFAULT 0.00,
  total_amount numeric DEFAULT 0.00,
  order_date text,
  estimated_delivery text,
  status text DEFAULT 'Pending Supplier Confirmation',
  tracking_number text,
  remarks text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS material_id text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS material_name text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS category text DEFAULT 'RAW_MATERIAL';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS vendor text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS vendor_contact text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS qty numeric DEFAULT 0.00;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Pcs';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0.00;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0.00;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS order_date text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS estimated_delivery text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending Supplier Confirmation';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- -------------------------------------------------------------------------
-- TABLE 20: PROCUREMENT ENTRIES (INVENTORY PROCUREMENT REGISTER & GATE ENTRIES)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procurement_entries (
  id text PRIMARY KEY,
  procurement_mode text DEFAULT 'RESTOCK EXISTING ITEM',
  matcher_sku text,
  material_name text NOT NULL,
  code_reference text,
  category text DEFAULT 'RAW_MATERIAL',
  unit text DEFAULT 'Kg',
  challan_number text,
  vehicle_number text,
  supplier_name text,
  eway_bill text,
  excise_slip text,
  accepted_qty numeric DEFAULT 0.00,
  damaged_qty numeric DEFAULT 0.00,
  batch_master_id text,
  grn_reference text,
  destination_warehouse text DEFAULT 'Raw Hub',
  rack_shelf text DEFAULT 'A-1',
  min_stock numeric DEFAULT 100,
  reorder_level numeric DEFAULT 250,
  allocated_inflow numeric DEFAULT 0.00,
  status text DEFAULT 'COMPLETED',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS procurement_mode text DEFAULT 'RESTOCK EXISTING ITEM';
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS matcher_sku text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS material_name text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS code_reference text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS category text DEFAULT 'RAW_MATERIAL';
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Kg';
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS challan_number text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS vehicle_number text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS eway_bill text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS excise_slip text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS accepted_qty numeric DEFAULT 0.00;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS damaged_qty numeric DEFAULT 0.00;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS batch_master_id text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS grn_reference text;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS destination_warehouse text DEFAULT 'Raw Hub';
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS rack_shelf text DEFAULT 'A-1';
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS min_stock numeric DEFAULT 100;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS reorder_level numeric DEFAULT 250;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS allocated_inflow numeric DEFAULT 0.00;
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS status text DEFAULT 'COMPLETED';
ALTER TABLE public.procurement_entries ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) FOR ANONYMOUS CRUD INTEGRATION
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.arcenol_corporate_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wip_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wip_process_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_initiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrp_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dtc_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_qr_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcenol_business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent collision
DROP POLICY IF EXISTS "Allow public access to all records" ON public.arcenol_corporate_units;
DROP POLICY IF EXISTS "Allow public select" ON public.arcenol_corporate_units;
DROP POLICY IF EXISTS "Allow public insert" ON public.arcenol_corporate_units;
DROP POLICY IF EXISTS "Allow public update" ON public.arcenol_corporate_units;
DROP POLICY IF EXISTS "Allow public delete" ON public.arcenol_corporate_units;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public select" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public insert" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public update" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public delete" ON public.warehouses;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.inventory;
DROP POLICY IF EXISTS "Allow public select" ON public.inventory;
DROP POLICY IF EXISTS "Allow public insert" ON public.inventory;
DROP POLICY IF EXISTS "Allow public update" ON public.inventory;
DROP POLICY IF EXISTS "Allow public delete" ON public.inventory;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.graded_cells;
DROP POLICY IF EXISTS "Allow public select" ON public.graded_cells;
DROP POLICY IF EXISTS "Allow public insert" ON public.graded_cells;
DROP POLICY IF EXISTS "Allow public update" ON public.graded_cells;
DROP POLICY IF EXISTS "Allow public delete" ON public.graded_cells;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.wip_inventory;
DROP POLICY IF EXISTS "Allow public select" ON public.wip_inventory;
DROP POLICY IF EXISTS "Allow public insert" ON public.wip_inventory;
DROP POLICY IF EXISTS "Allow public update" ON public.wip_inventory;
DROP POLICY IF EXISTS "Allow public delete" ON public.wip_inventory;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.categories;
DROP POLICY IF EXISTS "Allow public select" ON public.categories;
DROP POLICY IF EXISTS "Allow public insert" ON public.categories;
DROP POLICY IF EXISTS "Allow public update" ON public.categories;
DROP POLICY IF EXISTS "Allow public delete" ON public.categories;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.bom_blueprints;
DROP POLICY IF EXISTS "Allow public select" ON public.bom_blueprints;
DROP POLICY IF EXISTS "Allow public insert" ON public.bom_blueprints;
DROP POLICY IF EXISTS "Allow public update" ON public.bom_blueprints;
DROP POLICY IF EXISTS "Allow public delete" ON public.bom_blueprints;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.lead_inquiries;
DROP POLICY IF EXISTS "Allow public select" ON public.lead_inquiries;
DROP POLICY IF EXISTS "Allow public insert" ON public.lead_inquiries;
DROP POLICY IF EXISTS "Allow public update" ON public.lead_inquiries;
DROP POLICY IF EXISTS "Allow public delete" ON public.lead_inquiries;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.lead_followup_logs;
DROP POLICY IF EXISTS "Allow public select" ON public.lead_followup_logs;
DROP POLICY IF EXISTS "Allow public insert" ON public.lead_followup_logs;
DROP POLICY IF EXISTS "Allow public update" ON public.lead_followup_logs;
DROP POLICY IF EXISTS "Allow public delete" ON public.lead_followup_logs;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.customers;
DROP POLICY IF EXISTS "Allow public select" ON public.customers;
DROP POLICY IF EXISTS "Allow public insert" ON public.customers;
DROP POLICY IF EXISTS "Allow public update" ON public.customers;
DROP POLICY IF EXISTS "Allow public delete" ON public.customers;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.invoices;
DROP POLICY IF EXISTS "Allow public select" ON public.invoices;
DROP POLICY IF EXISTS "Allow public insert" ON public.invoices;
DROP POLICY IF EXISTS "Allow public update" ON public.invoices;
DROP POLICY IF EXISTS "Allow public delete" ON public.invoices;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.accounting_vouchers;
DROP POLICY IF EXISTS "Allow public select" ON public.accounting_vouchers;
DROP POLICY IF EXISTS "Allow public insert" ON public.accounting_vouchers;
DROP POLICY IF EXISTS "Allow public update" ON public.accounting_vouchers;
DROP POLICY IF EXISTS "Allow public delete" ON public.accounting_vouchers;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.dtc_scans;
DROP POLICY IF EXISTS "Allow public select" ON public.dtc_scans;
DROP POLICY IF EXISTS "Allow public insert" ON public.dtc_scans;
DROP POLICY IF EXISTS "Allow public update" ON public.dtc_scans;
DROP POLICY IF EXISTS "Allow public delete" ON public.dtc_scans;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Allow public select" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Allow public insert" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Allow public update" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Allow public delete" ON public.marketing_campaigns;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.batch_qr_labels;
DROP POLICY IF EXISTS "Allow public select" ON public.batch_qr_labels;
DROP POLICY IF EXISTS "Allow public insert" ON public.batch_qr_labels;
DROP POLICY IF EXISTS "Allow public update" ON public.batch_qr_labels;
DROP POLICY IF EXISTS "Allow public delete" ON public.batch_qr_labels;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.plant_tickets;
DROP POLICY IF EXISTS "Allow public select" ON public.plant_tickets;
DROP POLICY IF EXISTS "Allow public insert" ON public.plant_tickets;
DROP POLICY IF EXISTS "Allow public update" ON public.plant_tickets;
DROP POLICY IF EXISTS "Allow public delete" ON public.plant_tickets;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.complaints;
DROP POLICY IF EXISTS "Allow public select" ON public.complaints;
DROP POLICY IF EXISTS "Allow public insert" ON public.complaints;
DROP POLICY IF EXISTS "Allow public update" ON public.complaints;
DROP POLICY IF EXISTS "Allow public delete" ON public.complaints;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.diagnostic_ledger;
DROP POLICY IF EXISTS "Allow public select" ON public.diagnostic_ledger;
DROP POLICY IF EXISTS "Allow public insert" ON public.diagnostic_ledger;
DROP POLICY IF EXISTS "Allow public update" ON public.diagnostic_ledger;
DROP POLICY IF EXISTS "Allow public delete" ON public.diagnostic_ledger;

DROP POLICY IF EXISTS "Allow public select" ON public.arcenol_business_profile;
DROP POLICY IF EXISTS "Allow public insert" ON public.arcenol_business_profile;
DROP POLICY IF EXISTS "Allow public update" ON public.arcenol_business_profile;
DROP POLICY IF EXISTS "Allow public delete" ON public.arcenol_business_profile;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public select" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public insert" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public update" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow public delete" ON public.purchase_orders;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.procurement_entries;
DROP POLICY IF EXISTS "Allow public select" ON public.procurement_entries;
DROP POLICY IF EXISTS "Allow public insert" ON public.procurement_entries;
DROP POLICY IF EXISTS "Allow public update" ON public.procurement_entries;
DROP POLICY IF EXISTS "Allow public delete" ON public.procurement_entries;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.wip_process_stages;
DROP POLICY IF EXISTS "Allow public select" ON public.wip_process_stages;
DROP POLICY IF EXISTS "Allow public insert" ON public.wip_process_stages;
DROP POLICY IF EXISTS "Allow public update" ON public.wip_process_stages;
DROP POLICY IF EXISTS "Allow public delete" ON public.wip_process_stages;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.process_initiations;
DROP POLICY IF EXISTS "Allow public select" ON public.process_initiations;
DROP POLICY IF EXISTS "Allow public insert" ON public.process_initiations;
DROP POLICY IF EXISTS "Allow public update" ON public.process_initiations;
DROP POLICY IF EXISTS "Allow public delete" ON public.process_initiations;

DROP POLICY IF EXISTS "Allow public access to all records" ON public.mrp_calculations;
DROP POLICY IF EXISTS "Allow public select" ON public.mrp_calculations;
DROP POLICY IF EXISTS "Allow public insert" ON public.mrp_calculations;
DROP POLICY IF EXISTS "Allow public update" ON public.mrp_calculations;
DROP POLICY IF EXISTS "Allow public delete" ON public.mrp_calculations;

-- Create full CRUD public anonymous policies explicitly to avoid wildcard warnings
-- 1. arcenol_corporate_units
CREATE POLICY "Allow public select" ON public.arcenol_corporate_units FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.arcenol_corporate_units FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.arcenol_corporate_units FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.arcenol_corporate_units FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 2. warehouses
CREATE POLICY "Allow public select" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.warehouses FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.warehouses FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.warehouses FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 3. inventory
CREATE POLICY "Allow public select" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.inventory FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.inventory FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.inventory FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 4. graded_cells
CREATE POLICY "Allow public select" ON public.graded_cells FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.graded_cells FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.graded_cells FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.graded_cells FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 5. wip_inventory
CREATE POLICY "Allow public select" ON public.wip_inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.wip_inventory FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.wip_inventory FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.wip_inventory FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 6. categories
CREATE POLICY "Allow public select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.categories FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.categories FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.categories FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 7. bom_blueprints
CREATE POLICY "Allow public select" ON public.bom_blueprints FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.bom_blueprints FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.bom_blueprints FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.bom_blueprints FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 8. lead_inquiries
CREATE POLICY "Allow public select" ON public.lead_inquiries FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.lead_inquiries FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.lead_inquiries FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.lead_inquiries FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 8B. lead_followup_logs
CREATE POLICY "Allow public select" ON public.lead_followup_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.lead_followup_logs FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.lead_followup_logs FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.lead_followup_logs FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 9. customers
CREATE POLICY "Allow public select" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.customers FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.customers FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.customers FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 10. invoices
CREATE POLICY "Allow public select" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.invoices FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.invoices FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.invoices FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 11. accounting_vouchers
CREATE POLICY "Allow public select" ON public.accounting_vouchers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.accounting_vouchers FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.accounting_vouchers FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.accounting_vouchers FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 12. dtc_scans
CREATE POLICY "Allow public select" ON public.dtc_scans FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.dtc_scans FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.dtc_scans FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.dtc_scans FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 13. marketing_campaigns
CREATE POLICY "Allow public select" ON public.marketing_campaigns FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.marketing_campaigns FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.marketing_campaigns FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.marketing_campaigns FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 14. batch_qr_labels
CREATE POLICY "Allow public select" ON public.batch_qr_labels FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.batch_qr_labels FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.batch_qr_labels FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.batch_qr_labels FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 15. plant_tickets
CREATE POLICY "Allow public select" ON public.plant_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.plant_tickets FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.plant_tickets FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.plant_tickets FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 16. complaints
CREATE POLICY "Allow public select" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.complaints FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.complaints FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.complaints FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 17. diagnostic_ledger
CREATE POLICY "Allow public select" ON public.diagnostic_ledger FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.diagnostic_ledger FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.diagnostic_ledger FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.diagnostic_ledger FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 18. arcenol_business_profile
CREATE POLICY "Allow public select" ON public.arcenol_business_profile FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.arcenol_business_profile FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.arcenol_business_profile FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.arcenol_business_profile FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 19. purchase_orders
CREATE POLICY "Allow public select" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.purchase_orders FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.purchase_orders FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.purchase_orders FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 20. procurement_entries
CREATE POLICY "Allow public select" ON public.procurement_entries FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.procurement_entries FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.procurement_entries FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.procurement_entries FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 21. wip_process_stages
CREATE POLICY "Allow public select" ON public.wip_process_stages FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.wip_process_stages FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.wip_process_stages FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.wip_process_stages FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 22. process_initiations
CREATE POLICY "Allow public select" ON public.process_initiations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.process_initiations FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.process_initiations FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.process_initiations FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 23. mrp_calculations
CREATE POLICY "Allow public select" ON public.mrp_calculations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.mrp_calculations FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public update" ON public.mrp_calculations FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Allow public delete" ON public.mrp_calculations FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- -------------------------------------------------------------------------
-- SECURITY HARDENING: SECURE EXISTING FUNCTIONS
-- -------------------------------------------------------------------------
-- Revoke execution permissions on rls_auto_enable from public, anon, and authenticated roles
-- and convert to SECURITY INVOKER to prevent unauthorized execution.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
    EXECUTE 'ALTER FUNCTION public.rls_auto_enable() SECURITY INVOKER';
  END IF;
END $$;

-- =========================================================================
-- SEED MOCK DATA (ON CONFLICT DO NOTHING TO AVOID DUPLICATIONS)
-- =========================================================================

-- 0. Seed Arcenol Corporate Business Profile
INSERT INTO public.arcenol_business_profile (
  id, "companyName", "shortName", "establishedYear", "industrySector", 
  "contactEmail", phone, website, cin, gstin, address, 
  "manufacturingCapacity", "leadAcidOutput", "depotsCount", "primaryRegion", 
  "complianceOfficer", "nodePassphrase", logo, "loginLeftImage"
) VALUES (
  'PRIMARY', 
  'Arcenol Energy Solutions Private Limited', 
  'ARCENOL', 
  '2018', 
  'B2B Energy Storage & Power Infrastructure', 
  'ops-admin@arcenol.com', 
  '+91 79 4028 9200', 
  'www.arcenol.com', 
  'U31900GJ2018PTC102145', 
  '24AAHCA9192M1ZP', 
  'Arcenol Tower, Block G, GIDC Electron City, Gandhinagar, Gujarat - 382025', 
  '12,000 MWh / Year', 
  '260,000 Metric Tons / Year', 
  5, 
  'WEST_SOUTH', 
  'Dr. Ananya Sharma, Ph.D.', 
  'ARC-NODE-SECURE', 
  'data:image/svg+xml;utf8,<svg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 100 100'' width=''100'' height=''100''><defs><linearGradient id=''grad'' x1=''0%'' y1=''100%'' x2=''100%'' y2=''0%''><stop offset=''0%'' stop-color=''%23912551'' /><stop offset=''100%'' stop-color=''%23e38676'' /></linearGradient></defs><rect width=''100'' height=''100'' rx=''22'' fill=''%23111827'' /><path d=''M 30,70 L 50,30 L 70,70 M 38,54 L 62,54'' fill=''none'' stroke=''url(%23grad)'' stroke-width=''8'' stroke-linecap=''round'' stroke-linejoin=''round'' /><path d=''M 51,36 L 43,53 L 53,53 L 47,65 L 57,48 L 47,48 Z'' fill=''%23ffffff'' /></svg>',
  ''
) ON CONFLICT (id) DO NOTHING;

-- 1. Seed Arcenol Corporate Units
INSERT INTO public.arcenol_corporate_units (id, name, "shortName", type, gstin, cin, "contactEmail", phone, website, address, capacity, manager, status)
VALUES 
  ('ARC-HQ-01', 'Arcenol Corporate Headquarters', 'CENTRAL HEADQUARTERS', 'HEADQUARTERS', '24AAAAC1234A1Z1', 'L31901GJ1995PLC026131', 'corporate@arcenol.com', '+91 79 4028 9200', 'www.arcenol.com', 'Arcenol Tower, GIDC Zone 2, Sector 11, Gandhinagar, Gujarat - 382011', '5,000 MWh / Year', 'Siddharth Arcenol', 'ACTIVE'),
  ('ARC-PL-02', 'Ahmedabad GIDC Mega Assembly Unit-2', 'MEGA ASSEMBLY-2', 'PLANT', '24AAAAC1234A2Z2', 'L31901GJ1995PLC026132', 'ahmedabad-plant2@arcenol.com', '+91 79 2530 0112', 'www.arcenol.com', 'Plot 412, Phase II, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat - 382445', '12,000 MWh / Year', 'Baldev Singh', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Warehouses
INSERT INTO public.warehouses (id, name, racks, slots, valuation, items_count, status)
VALUES 
  ('Main Warehouse', 'MAIN WAREHOUSE', 6, 8, 0.00, 0, 'ACTIVE'),
  ('Ahmedabad Warehouse', 'AHMEDABAD WAREHOUSE', 6, 8, 0.00, 0, 'ACTIVE'),
  ('Dealer Warehouse', 'DEALER WAREHOUSE', 6, 8, 0.00, 0, 'ACTIVE'),
  ('Service Warehouse', 'SERVICE WAREHOUSE', 6, 8, 0.00, 0, 'ACTIVE'),
  ('Raw Hub', 'RAW HUB', 6, 8, 22590000.00, 6, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Inventory (Raw Materials Catalog)
INSERT INTO public.inventory (id, name, code, category, qty, unit, supplier, warehouse, rack, price, grn, batch)
VALUES 
  ('mat-001', 'Lead Alloy', 'LA-001', 'Cells', 25000, 'Kg', 'Global Metals', 'Raw Hub', 'A-1', 180, 'GRN-R-01', 'GM-001'),
  ('mat-002', 'Lead Oxide', 'LO-002', 'Cells', 12000, 'Kg', 'Global Metals', 'Raw Hub', 'A-2', 210, 'GRN-R-02', 'GM-002'),
  ('mat-003', 'Sulfuric Acid', 'SA-092', 'Chemicals', 10000, 'Ltr', 'Chemicals Ltd', 'Raw Hub', 'B-1', 45, 'GRN-R-03', 'CH-92'),
  ('mat-004', 'Separator (PE)', 'SPE-01', 'Separators', 15000, 'Pcs', 'PlateTech', 'Raw Hub', 'B-2', 8, 'GRN-R-04', 'PT-01'),
  ('mat-005', 'Lithium Cells (3.7V 3Ah)', 'CELL-3.7', 'Cells', 50000, 'Pcs', 'Energy Plus', 'Raw Hub', 'C-1', 250, 'GRN-R-14', 'EP-2024'),
  ('mat-006', 'Smart BMS (72V 50A)', 'BMS-72S', 'BMS', 1000, 'Pcs', 'TechCircuit', 'Raw Hub', 'D-1', 2500, 'GRN-R-15', 'TC-72')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Quality Control Graded Cell Repository
INSERT INTO public.graded_cells (id, serial, voltage, ir, capacity, cycle_count, temp, grade, engineer, usage, supplier, parent_id)
VALUES 
  ('grad-001', 'CELL-A-001', 3.32, 6.2, 6100, 0, 24.50, 'Grade A', 'Suresh P.', 'EV PACKS', 'Energy Plus', 'mat-005'),
  ('grad-002', 'CELL-B-002', 3.28, 7.1, 5800, 0, 24.50, 'Grade B', 'Suresh P.', 'STORAGE', 'Energy Plus', 'mat-005')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Blueprint Categories (Inventory & Material Categories)
INSERT INTO public.categories (id, name, code, description)
VALUES 
  ('cat-1', 'Category 1 — EV Battery Inventory', 'CAT-EV', 'EV Battery Packs and Assembly Modules'),
  ('cat-2', 'Category 2 — Solar / Inverter Battery Inventory', 'CAT-SOLAR', 'Solar and Inverter High-Efficiency Batteries'),
  ('cat-3', 'Category 3 — ESS / Industrial Battery Inventory', 'CAT-ESS', 'Energy Storage Systems & Industrial Power Units'),
  ('cat-4', 'Category 4 — Raw Materials & Components', 'CAT-RAW', 'Raw Material stock including Lead, Oxide, Acid, and Separators'),
  ('cat-5', 'Category 5 — Cells & Graded Stock', 'CAT-CELLS', 'Lithium-Ion and Graded Battery Cells'),
  ('cat-6', 'Category 6 — Electronics & BMS', 'CAT-ELEC', 'Smart BMS, PCB circuits, and electronic controllers'),
  ('cat-7', 'Category 7 — Accessories & Connectors', 'CAT-ACC', 'Chargers, connectors, adapters, and wiring harnesses')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  description = EXCLUDED.description;

-- 6. Seed BOM Blueprints
INSERT INTO public.bom_blueprints (id, model_id, name, category_group, components)
VALUES 
  ('bom-001', 'BAT-72V-30A', 'E-Rickshaw Batteries (72V30A)', 'Category 1 — EV Battery Inventory', '[{"matId": "mat-005", "name": "Lithium Cells (3.7V 3Ah)", "batch_qty": 2000, "qty": 200, "unit": "Pcs", "tolerance_percent": 0.5, "effective_demand": "2000 Pcs"}, {"matId": "mat-006", "name": "Smart BMS (72V 50A)", "batch_qty": 10, "qty": 1, "unit": "Pcs", "tolerance_percent": 0.0, "effective_demand": "10 Pcs"}]'::jsonb),
  ('bom-002', 'BAT-NEXT-200', 'High-Efficiency Inverter Battery 200Ah', 'Category 2 — Solar / Inverter Battery Inventory', '[{"matId": "mat-005", "name": "Lithium Cells (3.7V 3Ah)", "batch_qty": 200, "qty": 200, "unit": "Pcs", "tolerance_percent": 0.5, "effective_demand": "200 Pcs"}, {"matId": "mat-006", "name": "Smart BMS", "batch_qty": 1, "qty": 1, "unit": "Pcs", "tolerance_percent": 0.0, "effective_demand": "1 Pc"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed WIP Process Stages Registry
INSERT INTO public.wip_process_stages (id, code, name, display_order)
VALUES
  ('stage-1', 'STAGE_CELL_SORTING', 'CELL SORTING & MATRIX ALIGNMENT', 1),
  ('stage-2', 'STAGE_SPOT_WELDING', 'SPOT WELDING & BUSBAR JOINING', 2),
  ('stage-3', 'STAGE_BMS_WIRING', 'BMS WIRING & SOLDERING', 3),
  ('stage-4', 'STAGE_CASING_POTTING', 'CASING & POTTING', 4),
  ('stage-5', 'STAGE_QUALITY_CHECK', 'QUALITY CHECK', 5)
ON CONFLICT (id) DO NOTHING;

-- 7B. Seed Work In Progress Runs (Semi-Finished Logical Stock)
INSERT INTO public.wip_inventory (id, name, qty, stage, last_update, components)
VALUES 
  ('wip-001', 'CELL PACK ASSEMBLY (72V 30AH)', 12, 'CELL SORTING & MATRIX ALIGNMENT', '2026-07-24', '[{"matId": "mat-005", "qty": 24000, "name": "Lithium Cells"}, {"matId": "mat-006", "qty": 12, "name": "BMS Module"}]'::jsonb),
  ('wip-002', 'SPOT WELDED PACK MATRIX', 8, 'SPOT WELDING & BUSBAR JOINING', '2026-07-24', '[{"matId": "mat-005", "qty": 16000, "name": "Lithium Cells"}, {"matId": "busbar-01", "qty": 128, "name": "Copper Busbars"}]'::jsonb),
  ('wip-003', 'BMS MOUNTED PACK', 5, 'BMS WIRING & SOLDERING', '2026-07-24', '[{"matId": "mat-006", "qty": 5, "name": "Smart BMS 72V 50A"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7C. Seed Process Initiations
INSERT INTO public.process_initiations (id, inventory_target_type, magnitude_count, initial_wip_stage, components, status)
VALUES
  ('proc-init-001', 'CELL PACK ASSEMBLY (72V 30AH)', 10, 'CELL SORTING & MATRIX ALIGNMENT', '[{"material": "Lithium Cells (3.7V 3Ah)", "batch_formula": "200 Pcs x 10", "required_qty": "2,000 Pcs"}, {"material": "Smart BMS (72V 50A)", "batch_formula": "1 Pc x 10", "required_qty": "10 Pcs"}]'::jsonb, 'INITIATED')
ON CONFLICT (id) DO NOTHING;

-- 7D. Seed MRP Materials Calculator
INSERT INTO public.mrp_calculations (id, battery_model, scheduled_batch_qty, allocated_components, status)
VALUES
  ('mrp-001', 'E-RICKSHAW BATTERIES [72V30A]', 10, '[{"material": "Lithium Cells (3.7V 3Ah)", "required_qty": "2,000 Pcs", "stock_available": "50,000 Pcs", "balance": "48,000 Pcs"}, {"material": "Smart BMS (72V 50A)", "required_qty": "10 Pcs", "stock_available": "1,000 Pcs", "balance": "990 Pcs"}]'::jsonb, 'ENGINE READY')
ON CONFLICT (id) DO NOTHING;

-- 8. Seed New Lead Inquiries & Reminders
INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784531732680', 'PATEL PATEL', 'Retail', 'Indiamart / B2B', 'PATEL PATEL', '9173023179', 'vadodara', '2026-07-20', '10:00', 'lead alocate to shaineel call tomorrow', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784542396069', 'Pareshbhai', 'Retail', 'Indiamart / B2B', 'Pareshbhai', '09033332005', 'Bhavnagar', '2026-07-22', '10:00', 'bataege inform price', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784715041508', 'ATS electric vehicles', 'Dealer', 'Cold Call', 'ATS electric vehicles', '7600010551', 'ahmedabad', '2026-08-11', '11:01', 'already sent proposal call back', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: dekh k bataege
[Follow-up 2026-07-25]: dekh k cal karege
[Follow-up 2026-07-30]: call karege already sent proposal', '[{"date":"2026-07-23","text":"dekh k bataege","time":"09:31","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:01"},{"date":"2026-07-25","text":"dekh k cal karege","time":"16:40","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"11:01"},{"date":"2026-07-30","text":"call karege already sent proposal","time":"17:36","nextFollowUpDate":"2026-08-11","nextFollowUpTime":"11:01"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784715189255', 'J D E bike zone', 'Dealer', 'Cold Call', 'J D E bike zone', '7046573095', 'ahmedabad', '2026-08-13', '10:00', 'sent proposal requirement hogi to bolege', 'QUOTATION_SENT', '[Follow-up 2026-07-30]: sent reminder jarurat hogi to bolege', '[{"date":"2026-07-30","text":"sent reminder jarurat hogi to bolege","time":"16:06","nextFollowUpDate":"2026-08-13","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784715748778', 'pranvi motors', 'Dealer', 'Cold Call', 'pranvi motors', '8155011817', 'ahmedabad', '2026-07-28', '11:00', 'always disco the call', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: not attend
[Follow-up 2026-07-24]: switched off', '[{"date":"2026-07-23","text":"not attend","time":"09:30","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"11:00"},{"date":"2026-07-24","text":"switched off","time":"15:30","nextFollowUpDate":"2026-07-28","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784716437277', 'omkaar e-vehicles', 'Dealer', 'Cold Call', 'omkaar e-vehicles', '8866843636', 'naroda ,ahmedabad', '2026-08-11', '00:00', 'sent proposal not attend', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: yet not seen dekh k bataege
[Follow-up 2026-07-25]: sent proposal call back
[Follow-up 2026-07-30]: sent reminder', '[{"date":"2026-07-23","text":"yet not seen dekh k bataege","time":"09:35","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"00:00"},{"date":"2026-07-25","text":"sent proposal call back","time":"16:39","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"00:00"},{"date":"2026-07-30","text":"sent reminder","time":"17:36","nextFollowUpDate":"2026-08-11","nextFollowUpTime":"00:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784718734397', 'AB enterprises', 'Dealer', 'Cold Call', 'AB enterprises', '9824255770', 'ahmedabad', '2027-07-24', '10:00', 'always disco the call', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: call forwarded
[Follow-up 2026-07-24]: not want', '[{"date":"2026-07-23","text":"call forwarded","time":"09:36","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:00"},{"date":"2026-07-24","text":"not want","time":"15:31","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784719374197', 'kyte energy', 'Dealer', 'Cold Call', 'kyte energy', '9825038383', 'ahmedabad', '2026-08-20', '11:00', 'sent proposal call back tomorrow', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: call tomorrow sent proposal reminder
[Follow-up 2026-07-24]: call back
[Follow-up 2026-07-29]: call back', '[{"date":"2026-07-23","text":"call tomorrow sent proposal reminder","time":"15:46","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"11:00"},{"date":"2026-07-24","text":"call back","time":"15:50","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"11:00"},{"date":"2026-07-29","text":"call back","time":"12:31","nextFollowUpDate":"2026-08-20","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784720408942', 'joy e-bikes', 'Dealer', 'Cold Call', 'joy e-bikes', '8200140684', 'ghatlodiya ,ahmedabad', '2026-08-02', '10:00', 'sent proposal ,call back', 'NEGOTIATION', '[Follow-up 2026-07-23]: price issue', '[{"date":"2026-07-23","text":"price issue","time":"09:47","nextFollowUpDate":"2026-08-02","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l-1784722912098', 'okinawa and joy e-bikes', 'Dealer', 'Cold Call', 'okinawa and joy e-bikes', '9104448668', 'surat', '2026-08-08', '10:00', 'sent proposal remidner cal not attend call back', 'NEGOTIATION', '[Follow-up 2026-07-23]: not attend
[Follow-up 2026-07-25]: sent proposal call back
[Follow-up 2026-07-30]: sent proposal call back', '[{"date":"2026-07-23","text":"not attend","time":"09:51","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:00"},{"date":"2026-07-25","text":"sent proposal call back","time":"16:40","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:00"},{"date":"2026-07-30","text":"sent proposal call back","time":"13:19","nextFollowUpDate":"2026-08-08","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l1', 'Green Motors Ahmedabad', 'Dealer', 'Website', 'Rajesh Shah', '9876543210', 'Ahmedabad, GJ', '2024-05-20', '11:00', '72V Battery Packs x 50', 'INTERESTED', 'Negotiating on bulk discount.', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('l2', 'EV Solutions Delhi', 'Distributor', 'Exhibition', 'Aman Varma', '9123456789', 'New Delhi, DL', '2024-05-18', '15:30', 'Li-ion Cells Bulk Purchase', 'NEW', 'Interested in the new smart BMS feature.', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-001', 'Modern EV Solutions', 'DEALER', 'WEBSITE', 'Aravind Swamy', '+91 9876543210', 'Chennai, Tamil Nadu', '2026-07-01', '10:00', 'Needs 100Ah battery pack solutions for 2-wheelers fleet rollouts.', 'INTERESTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784721780688', 'testdc', 'Dealer', 'Website', 'dcdcdc', '7894561230', 'Noida', '2026-07-22', '10:00', 'need 15000ah battery', 'INTERESTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784778912419', 'Kiran', 'Retail', 'Indiamart / B2B', 'Kiran', '08849305429', 'Anand', '2027-07-31', '10:00', 'not attend', 'CONTACTED', '[Follow-up 2026-07-24]: switched off
[Follow-up 2026-07-25]: call back
[Follow-up 2026-07-28]: call disco
[Follow-up 2026-07-31]: retail already purchased', '[{"date":"2026-07-24","text":"switched off","time":"15:19","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:00"},{"date":"2026-07-25","text":"call back","time":"15:38","nextFollowUpDate":"2026-07-28","nextFollowUpTime":"10:00"},{"date":"2026-07-28","text":"call disco","time":"12:09","nextFollowUpDate":"2026-07-31","nextFollowUpTime":"10:00"},{"date":"2026-07-31","text":"retail already purchased","time":"16:15","nextFollowUpDate":"2027-07-31","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784783650789', 'adinath electric vehicles', 'Dealer', 'Website', 'adinath electric vehicles', '9998064671', 'surat , gujarat', '2026-07-27', '10:43', 'busy', 'CONTACTED', '[Follow-up 2026-07-23]: cal disco
[Follow-up 2026-07-24]: call disco.', '[{"date":"2026-07-23","text":"cal disco","time":"15:49","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:43"},{"date":"2026-07-24","text":"call disco.","time":"15:50","nextFollowUpDate":"2026-07-27","nextFollowUpTime":"10:43"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784783988701', 'okinawa and joy e-bikes', 'Dealer', 'Website', 'okinawa and joy e-bikes', '9104448668', 'surat', '2026-07-27', '10:00', 'General Requirement', 'CONTACTED', '[Follow-up 2026-07-23]: sent proposal reminder', '[{"date":"2026-07-23","text":"sent proposal reminder","time":"15:55","nextFollowUpDate":"2026-07-27","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784095049', 'okinawa  and joy e-bikes', 'Dealer', 'Website', 'okinawa and joy e-bikes', '9104448668', 'surat', '2026-08-11', '10:51', 'sent proposal not attend', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: sent reminder 2 se 3 din me update dege
[Follow-up 2026-07-25]: sent reminder update karege
[Follow-up 2026-07-30]: sent reminder alreay', '[{"date":"2026-07-23","text":"sent reminder 2 se 3 din me update dege","time":"15:37","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:51"},{"date":"2026-07-25","text":"sent reminder update karege","time":"17:25","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:51"},{"date":"2026-07-30","text":"sent reminder alreay","time":"16:32","nextFollowUpDate":"2026-08-11","nextFollowUpTime":"10:51"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784198606', 'surat  ev mall', 'Dealer', 'Website', 'surat ev mall', '8160054809', 'surat , gujarat', '2026-07-28', '10:53', 'General Requirement', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: call disco.
[Follow-up 2026-07-24]: not attend', '[{"date":"2026-07-23","text":"call disco.","time":"15:59","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:53"},{"date":"2026-07-24","text":"not attend","time":"15:40","nextFollowUpDate":"2026-07-28","nextFollowUpTime":"10:53"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784357551', 'auto point okaya electric vehicles', 'Dealer', 'Website', 'auto point okaya electric vehicles', '9106996545', 'surat , gujarat', '2026-07-28', '10:55', 'sent proposal not interested', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: switched off
[Follow-up 2026-07-24]: always swithed off', '[{"date":"2026-07-23","text":"switched off","time":"15:59","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:55"},{"date":"2026-07-24","text":"always swithed off","time":"15:40","nextFollowUpDate":"2026-07-28","nextFollowUpTime":"10:55"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784481153', 'futurist karayanam', 'Dealer', 'Website', 'futurist karayanam', '8460276508', 'surat, gujarat', '2026-07-26', '10:57', 'not interested call disco', 'CONTACTED', '[Follow-up 2026-07-23]: call disco
[Follow-up 2026-07-24]: call back
[Follow-up 2026-07-25]: cal back
[Follow-up 2026-07-25]: call back', '[{"date":"2026-07-23","text":"call disco","time":"15:23","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:57"},{"date":"2026-07-24","text":"call back","time":"15:27","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:57"},{"date":"2026-07-25","text":"cal back","time":"16:33","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:57"},{"date":"2026-07-25","text":"call back","time":"17:48","nextFollowUpDate":"2026-07-26","nextFollowUpTime":"10:57"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784600529', 'sarkar auto point', 'Dealer', 'Website', 'sarkar auto point', '9879257309', 'surat ,gujarat', '2026-08-03', '10:59', 'e-rickshaws', 'CONTACTED', '[Follow-up 2026-07-23]: busy hai bad me bat karege
[Follow-up 2026-07-24]: BUSY HAI call karege
[Follow-up 2026-07-25]: sent proposal dekh k batege
[Follow-up 2026-07-29]: deal only 3 wheeler sent price
[Follow-up 2026-07-30]: deal only 3 wheeler
[Follow-up 2026-07-31]: sent proposal reminder call back 3 wheeler', '[{"date":"2026-07-23","text":"busy hai bad me bat karege","time":"15:24","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:59"},{"date":"2026-07-24","text":"BUSY HAI call karege","time":"15:18","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:59"},{"date":"2026-07-25","text":"sent proposal dekh k batege","time":"15:38","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"10:59"},{"date":"2026-07-29","text":"deal only 3 wheeler sent price","time":"12:44","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:59"},{"date":"2026-07-30","text":"deal only 3 wheeler","time":"17:53","nextFollowUpDate":"2026-07-31","nextFollowUpTime":"10:59"},{"date":"2026-07-31","text":"sent proposal reminder call back 3 wheeler","time":"16:13","nextFollowUpDate":"2026-08-03","nextFollowUpTime":"10:59"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784727987', 'electron auto motors', 'Dealer', 'Website', 'electron auto motors', '7622006668', 'surat , gujarat', '2026-07-26', '11:01', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: not want
[Follow-up 2026-07-23]: not want', '[{"date":"2026-07-23","text":"not want","time":"15:26","nextFollowUpDate":"2026-07-23","nextFollowUpTime":"11:01"},{"date":"2026-07-23","text":"not want","time":"15:27","nextFollowUpDate":"2026-07-26","nextFollowUpTime":"11:01"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784817492', 'royal ev tech', 'Dealer', 'Website', 'royal ev tech', '9081768004', 'surat , gujarat', '2026-07-22', '10:30', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784784924127', 'shree jalaram electric vehicles', 'Dealer', 'Website', 'shree jalaram electric vehicles', '9924093397', 'surat , gujarat', '2026-07-21', '10:00', 'not interested price issue', 'NEGOTIATION', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784785089758', 'nitya e-mobility', 'Dealer', 'Website', 'nitya e-mobility', '8866221148', 'rajkot , gujara', '2026-07-22', '10:14', 'not interested', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784785318659', 'gajanan ev and solar', 'Dealer', 'Website', 'gajanan ev and solar', '7621886555', 'rajkot , gujarat', '2626-07-21', '11:00', 'not interested price issue', 'NEGOTIATION', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784786484036', 'ampere electric scooter', 'Dealer', 'Website', 'ampere electric scooter', '7942875177', 'rajkot , gujarat', '2026-07-22', '10:14', 'incoming not available', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784786576736', 'shiv shakti auto agency', 'Dealer', 'Website', 'shiv shakti auto agency', '9925725734', 'rajkot , gujarat', '2026-08-13', '10:00', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: requirement hogi to bolege yet not require
[Follow-up 2026-07-30]: reuirement hoga to bolege sent reminder', '[{"date":"2026-07-23","text":"requirement hogi to bolege yet not require","time":"15:29","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:00"},{"date":"2026-07-30","text":"reuirement hoga to bolege sent reminder","time":"16:04","nextFollowUpDate":"2026-08-13","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784786679528', 'akshar & shree ji e-bikes', 'Dealer', 'Website', 'akshar & shree ji e-bikes', '7984423892', 'rajkot , gujarat', '2026-07-21', '10:00', 'busy call disco', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784786816957', 'shiv e vehicles', 'Dealer', 'Website', 'shiv e vehicles', '9925612346', 'rajkot , gujarat', '2026-07-22', '11:00', 'incoming call', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784787004921', 'siddhivinayak zelio', 'Dealer', 'Website', 'siddhivinayak zelio', '8200382005', 'rajkot, gujarat', '2027-07-25', '00:39', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-23]: not attend
[Follow-up 2026-07-24]: call back
[Follow-up 2026-07-25]: no requiremt', '[{"date":"2026-07-23","text":"not attend","time":"15:33","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"00:39"},{"date":"2026-07-24","text":"call back","time":"15:47","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"00:39"},{"date":"2026-07-25","text":"no requiremt","time":"16:33","nextFollowUpDate":"2027-07-25","nextFollowUpTime":"00:39"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784787375861', 'jalaram auto point', 'Dealer', 'Website', 'jalaram auto point', '8530500009', 'rajkot , gujarat', '2026-07-22', '10:14', 'no requirement', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784787491181', 'adhya e-mobility llp', 'Dealer', 'Website', 'adhya e-mobility llp', '7575075126', 'rajkot , gujarat', '2026-07-21', '12:00', 'sent proposal', 'QUOTATION_SENT', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784787652068', 'bgauss electric scooters', 'Dealer', 'Website', 'bgauss electric scooters', '7574000123', 'mehsana , gujarat', '2027-07-24', '11:00', 'not attend', 'CONTACTED', '[Follow-up 2026-07-23]: not attend
[Follow-up 2026-07-24]: no require', '[{"date":"2026-07-23","text":"not attend","time":"15:43","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"11:00"},{"date":"2026-07-24","text":"no require","time":"15:49","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784787767115', 'pure ev electric scooters', 'Dealer', 'Website', 'pure ev electric scooters', '9879900198', 'mehsana , gujarat', '2026-07-21', '09:30', 'no requirement', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784787870562', 'bhagwati battery', 'Dealer', 'Website', 'bhagwati battery', '9978494073', 'mehsana , gujarat', '2027-07-24', '10:30', 'not interested', 'CONTACTED', '[Follow-up 2026-07-23]: not intrested
[Follow-up 2026-07-23]: not intrested
[Follow-up 2026-07-24]: not intrested', '[{"date":"2026-07-23","text":"not intrested","time":"15:19","nextFollowUpDate":"2026-07-23","nextFollowUpTime":"10:30"},{"date":"2026-07-23","text":"not intrested","time":"15:20","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:30"},{"date":"2026-07-24","text":"not intrested","time":"15:27","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"10:30"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784787968440', 'satish battery center', 'Dealer', 'Website', 'satish battery center', '9408221149', 'mehsana , guujarat', '2026-07-22', '11:00', 'dealers of battery', 'QUOTATION_SENT', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784788107674', 'umiya power solutions', 'Dealer', 'Website', 'umiya power solutions', '9998499444', 'mehsana , gujarat', '2027-07-25', '11:58', 'not interested', 'CONTACTED', '[Follow-up 2026-07-23]: not intrested
[Follow-up 2026-07-23]: nnot intrested
[Follow-up 2026-07-25]: not intrested', '[{"date":"2026-07-23","text":"not intrested","time":"15:19","nextFollowUpDate":"2026-07-23","nextFollowUpTime":"11:58"},{"date":"2026-07-23","text":"nnot intrested","time":"15:21","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:58"},{"date":"2026-07-25","text":"not intrested","time":"17:24","nextFollowUpDate":"2027-07-25","nextFollowUpTime":"11:58"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784788228833', 'ujas auto agency', 'Dealer', 'Website', 'ujas auto agency', '6352405062', 'mehsana, gujarat', '2026-07-21', '10:00', 'sent proposal', 'QUOTATION_SENT', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784788331123', 'green e-bikes', 'Dealer', 'Website', 'green e-bikes', '9104340095', 'mehsana , gujarat', '2026-07-22', '10:14', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784788419410', 'tirusai autolink', 'Dealer', 'Website', 'tirusai autolink', '7026600377', 'mehsana , gujarat', '2027-07-25', '12:03', 'not reachable', 'CONTACTED', '[Follow-up 2026-07-23]: not in service
[Follow-up 2026-07-23]: not in service
[Follow-up 2026-07-24]: not in service
[Follow-up 2026-07-25]: not in service', '[{"date":"2026-07-23","text":"not in service","time":"15:19","nextFollowUpDate":"2026-07-23","nextFollowUpTime":"12:03"},{"date":"2026-07-23","text":"not in service","time":"15:20","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"12:03"},{"date":"2026-07-24","text":"not in service","time":"15:26","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"12:03"},{"date":"2026-07-25","text":"not in service","time":"16:38","nextFollowUpDate":"2027-07-25","nextFollowUpTime":"12:03"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784788680877', 'matter', 'Dealer', 'Website', 'matter', '8238082320', 'mehsana , gujarat', '2026-07-22', '10:14', 'company number', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784788769485', 'green go international electrics', 'Dealer', 'Website', 'green go international electrics', '6367658202', 'mehsana , gujarat', '2026-07-20', '10:00', 'switched off', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784788846441', 'shayona tvs', 'Dealer', 'Website', 'shayona tvs', '9081085550', 'mehsana , gujarat', '2027-07-31', '10:00', 'not reachable', 'CONTACTED', '[Follow-up 2026-07-23]: switched off
[Follow-up 2026-07-24]: switched off
[Follow-up 2026-07-29]: switched off always
[Follow-up 2026-07-30]: call back
[Follow-up 2026-07-31]: tvs we not provide', '[{"date":"2026-07-23","text":"switched off","time":"15:34","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"10:00"},{"date":"2026-07-24","text":"switched off","time":"15:48","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"10:00"},{"date":"2026-07-29","text":"switched off always","time":"12:30","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:00"},{"date":"2026-07-30","text":"call back","time":"17:52","nextFollowUpDate":"2026-07-31","nextFollowUpTime":"10:00"},{"date":"2026-07-31","text":"tvs we not provide","time":"16:07","nextFollowUpDate":"2027-07-31","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789007908', 'chetak electric scooters', 'Dealer', 'Website', 'chetak electric scooters', '9168627000', 'gandhinagar', '2027-07-23', '10:00', 'not require', 'CONTACTED', '[Follow-up 2026-07-23]: no require', '[{"date":"2026-07-23","text":"no require","time":"15:49","nextFollowUpDate":"2027-07-23","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789130117', 'mihir e bikes', 'Dealer', 'Website', 'mihir e bikes', '9974107071', 'gandhinagar', '2026-07-20', '10:00', 'sent proposal will inform', 'QUOTATION_SENT', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789257898', 'agwan motors pvt ltd', 'Dealer', 'Website', 'agwan motors pvt ltd', '8929711991', 'gandhinagar', '2026-07-19', '10:00', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789332031', 'varun e bikes', 'Dealer', 'Website', 'varun e bikes', '9824206223', 'gandhinagar', '2026-07-19', '11:00', 'sent proposal', 'QUOTATION_SENT', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789402676', 'amaron pitstop', 'Dealer', 'Website', 'amaron pitshop', '9227715302', 'gandhinagar', '2027-07-24', '11:00', 'not interested', 'CONTACTED', '[Follow-up 2026-07-23]: not intrested
[Follow-up 2026-07-24]: not intrested', '[{"date":"2026-07-23","text":"not intrested","time":"15:40","nextFollowUpDate":"2026-07-24","nextFollowUpTime":"11:00"},{"date":"2026-07-24","text":"not intrested","time":"15:48","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789549180', 'gajjar auto battery', 'Dealer', 'Website', 'gajjar auto battery', '9712974352', 'gandhinagar', '2027-07-25', '10:00', 'not want', 'CONTACTED', '[Follow-up 2026-07-23]: not want
[Follow-up 2026-07-25]: ni', '[{"date":"2026-07-23","text":"not want","time":"15:20","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:00"},{"date":"2026-07-25","text":"ni","time":"16:28","nextFollowUpDate":"2027-07-25","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789647419', 'thomas battery', 'Dealer', 'Website', 'thomas battery', '7698570353', 'gandhinagar', '2026-07-20', '10:00', 'not interested', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789754875', 'forext battery', 'Dealer', 'Website', 'forext battery', '9594439345', 'gandhinagar', '2027-07-25', '10:00', 'not interested call disco', 'CONTACTED', '[Follow-up 2026-07-23]: not deal in lithoum battery
[Follow-up 2026-07-25]: not deal in lithium', '[{"date":"2026-07-23","text":"not deal in lithoum battery","time":"16:00","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:00"},{"date":"2026-07-25","text":"not deal in lithium","time":"17:19","nextFollowUpDate":"2027-07-25","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789867467', 'oreva e-bikes', 'Dealer', 'Website', 'oreva e-bikes', '9429621309', 'gandhinagar', '2026-07-20', '10:00', 'sent proposal', 'QUOTATION_SENT', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784789971543', 'bansari automobiles', 'Dealer', 'Website', 'bansari automobiles', '9904991009', 'gandhinagar', '2026-07-19', '11:00', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790044037', 'royal honda', 'Dealer', 'Website', 'royal honda', '9825039767', 'gandhinagar', '2026-07-20', '10:00', 'company number', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790143427', 'hero electric bikes', 'Dealer', 'Website', 'hero electric bikes', '9426282922', 'gandhinagar', '2026-07-20', '12:00', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790267753', 'go green e-bikes', 'Dealer', 'Website', 'go green e-bikes', '8849208239', 'navsari , gujarat', '2026-07-20', '10:00', 'sent proposal', 'QUOTATION_SENT', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790374199', 'bajaj chetak electric', 'Dealer', 'Website', 'bajaj chetak electric', '9173067676', 'navsari , gujarat', '2026-07-22', '10:00', 'busy', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790501159', 'hero electric', 'Dealer', 'Website', 'hero electric', '9898487022', 'navsari , gujarat', '2026-07-21', '01:00', 'incoming call not available', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790608060', 'aarvi power solutions', 'Dealer', 'Website', 'aarvi power solutions', '9624178411', 'navsari , gujarat', '2026-07-21', '11:00', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790715122', 'tvs mangaldeep motors llp', 'Dealer', 'Website', 'tvs mangaldeep motors llp', '9355068664', 'navsari , gujarat', '2026-07-19', '12:00', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790817933', 'all ev services', 'Dealer', 'Website', 'all ev services', '9924472668', 'navsari , gujarat', '2026-07-26', '12:43', 'price issue', 'NEGOTIATION', '[Follow-up 2026-07-23]: sent reminder price issue', '[{"date":"2026-07-23","text":"sent reminder price issue","time":"16:03","nextFollowUpDate":"2026-07-26","nextFollowUpTime":"12:43"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784790994026', 'metro motors', 'Dealer', 'Website', 'metro motors', '9289922250', 'navsari , gujarat', '2027-07-23', '10:00', 'company number', 'CONTACTED', '[Follow-up 2026-07-23]: company number', '[{"date":"2026-07-23","text":"company number","time":"16:04","nextFollowUpDate":"2027-07-23","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784799205695', 'riddhi e-vehicles', 'Dealer', 'Website', 'riddhi e-vehicles', '9016300975', 'anand , gujarat', '2027-07-23', '10:00', 'no requirement', 'CONTACTED', '[Follow-up 2026-07-23]: no requirement', '[{"date":"2026-07-23","text":"no requirement","time":"16:06","nextFollowUpDate":"2027-07-23","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784799286204', 'om auto battery', 'Dealer', 'Website', 'om auto battery', '9687319777', 'anand , gujarat', '2026-07-19', '10:00', 'busy', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784799384349', 'bhavya auto', 'Dealer', 'Website', 'bhavya auto', '9104006108', 'anand , gujarat', '2026-07-20', '10:14', 'busy another call not interested', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784799886669', 'e-future generation next', 'Dealer', 'Website', 'e-future generation next', '8200660586', 'anand , gujarat', '2026-07-20', '10:00', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784799978560', 'kiran electric scooter', 'Dealer', 'Website', 'kiran electric scooter', '9870020451', 'anand , gujarat', '2026-07-21', '12:00', 'not attend', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784800087325', 'aaditya ev hub', 'Dealer', 'Website', 'aaditya ev hub', '9909908843', 'anand , gujarat', '2026-07-22', '10:00', 'not yet want', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784871734581', 'ami batteries', 'Dealer', 'Website', 'ami batteries', '9913169292', 'bhavnagar, gujarat', '2026-08-29', '10:00', 'not attend', 'CONTACTED', '[Follow-up 2026-07-25]: call back
[Follow-up 2026-07-29]: wrong number', '[{"date":"2026-07-25","text":"call back","time":"15:10","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"10:00"},{"date":"2026-07-29","text":"wrong number","time":"11:50","nextFollowUpDate":"2026-08-29","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784871814774', 'raza auto e-bikes & battery', 'Dealer', 'Website', 'raza auto e-bikes & battery', '9428172300', 'bhavnagar, gujarat', '2026-08-12', '10:00', 'busy another call', 'CONTACTED', '[Follow-up 2026-07-25]: call after 10 august', '[{"date":"2026-07-25","text":"call after 10 august","time":"16:10","nextFollowUpDate":"2026-08-12","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784871880869', 'icon battery care', 'Dealer', 'Website', 'icon battery care', '9978347191', 'bhavnagar, gujarat', '2026-08-09', '10:00', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-25]: sent proposal requirement hogi to bolege', '[{"date":"2026-07-25","text":"sent proposal requirement hogi to bolege","time":"15:12","nextFollowUpDate":"2026-08-09","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784871960606', 'kamdhenu autoworld g lite', 'Dealer', 'Website', 'kamdhenu autoworld g lite', '7874783800', 'bhavnagar, gujarat', '2026-07-26', '10:00', 'call disco', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872043778', 'bapasitaram e-vehicles', 'Dealer', 'Website', 'bapasitaram e-vehicles', '9265400465', 'bhavnagar, gujarat', '2026-07-26', '10:00', 'ev me kam nahi karte hai', 'NEGOTIATION', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872125017', 'mehta automobiles', 'Dealer', 'Website', 'mehta automobiles', '7624938775', 'bhavnagar, gujarat', '2026-09-30', '10:00', 'switched off', 'CONTACTED', '[Follow-up 2026-07-25]: call disco.
[Follow-up 2026-07-28]: not attend
[Follow-up 2026-07-30]: not deal in lithium battery', '[{"date":"2026-07-25","text":"call disco.","time":"15:16","nextFollowUpDate":"2026-07-28","nextFollowUpTime":"10:00"},{"date":"2026-07-28","text":"not attend","time":"12:02","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:00"},{"date":"2026-07-30","text":"not deal in lithium battery","time":"10:33","nextFollowUpDate":"2026-09-30","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872219631', 'gujarat enterprises', 'Dealer', 'Website', 'gujarat enterprises', '9499722972', 'bhavnagar, gujarat', '2027-07-30', '10:00', 'not attend', 'CONTACTED', '[Follow-up 2026-07-25]: call disco', '[{"date":"2026-07-25","text":"call disco","time":"16:15","nextFollowUpDate":"2027-07-30","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872353836', 'satnam battery & e-bike', 'Dealer', 'Website', 'satnam battery & e-bikes', '9904568508', 'porbandar , gujarat', '2027-07-25', '10:00', 'work only lead acid', 'CONTACTED', '[Follow-up 2026-07-25]: work only lead', '[{"date":"2026-07-25","text":"work only lead","time":"16:38","nextFollowUpDate":"2027-07-25","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872424221', 'life battery', 'Dealer', 'Website', 'life battery', '9825408990', 'porbandar , gujarat', '2026-07-26', '10:00', 'auto battery k nahi h', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872555366', 'regal moto corp', 'Dealer', 'Website', 'regal moto corp', '8347917591', 'porbandar , gujarat', '2026-07-26', '10:00', 'busy another call', 'CONTACTED', '', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872634619', 'chamunda e-bikes', 'Dealer', 'Website', 'chamunda e-bikes', '9327059455', 'porbandar , gujarat', '2027-07-31', '10:00', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-25]: sent proposal call back
[Follow-up 2026-07-29]: sent proposal already not attend
[Follow-up 2026-07-30]: sent reminder
[Follow-up 2026-07-31]: lead acid me hi kam karte hai', '[{"date":"2026-07-25","text":"sent proposal call back","time":"15:20","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"10:00"},{"date":"2026-07-29","text":"sent proposal already not attend","time":"12:38","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:00"},{"date":"2026-07-30","text":"sent reminder","time":"17:52","nextFollowUpDate":"2026-07-31","nextFollowUpTime":"10:00"},{"date":"2026-07-31","text":"lead acid me hi kam karte hai","time":"16:22","nextFollowUpDate":"2027-07-31","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872749844', 'halar battery', 'Dealer', 'Website', 'halar battery', '8849948004', 'jamnagar', '2027-07-24', '11:28', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: sent proposal not yet require', '[{"date":"2026-07-24","text":"sent proposal not yet require","time":"15:33","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"11:28"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872827221', 'exide care', 'Dealer', 'Website', 'exide care', '80675110335', 'jamnagar', '2026-07-26', '11:00', 'not attend', 'CONTACTED', '[Follow-up 2026-07-24]: not reachable
[Follow-up 2026-07-25]: call back', '[{"date":"2026-07-24","text":"not reachable","time":"15:20","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:00"},{"date":"2026-07-25","text":"call back","time":"17:48","nextFollowUpDate":"2026-07-26","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784872957014', 'galaxy ev', 'Dealer', 'Website', 'galaxy ev', '8200983.317', 'bharuch , gujarat', '2027-07-24', '11:00', 'not interested', 'CONTACTED', '[Follow-up 2026-07-24]: not intrested', '[{"date":"2026-07-24","text":"not intrested","time":"15:22","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873028121', 'uma battery', 'Dealer', 'Website', 'uma battery', '9978589569', 'bharuch , gujarat', '2027-07-24', '11:00', 'not want', 'CONTACTED', '[Follow-up 2026-07-24]: not want', '[{"date":"2026-07-24","text":"not want","time":"15:20","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873099810', 'green earth e-bike', 'Dealer', 'Website', 'green earth e-bike', '9723416000', 'bharuch , gujarat', '2026-09-29', '11:00', 'sent proposal already price issue', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: not attend
[Follow-up 2026-07-25]: call bacj
[Follow-up 2026-07-29]: call disco', '[{"date":"2026-07-24","text":"not attend","time":"15:21","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:00"},{"date":"2026-07-25","text":"call bacj","time":"16:08","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"11:00"},{"date":"2026-07-29","text":"call disco","time":"12:02","nextFollowUpDate":"2026-09-29","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873167601', 'jay somnath battery', 'Dealer', 'Website', 'jay somnath battery', '9033040029', 'bharuch , gujarat', '2026-08-02', '11:30', 'price issue', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: price issue', '[{"date":"2026-07-24","text":"price issue","time":"15:33","nextFollowUpDate":"2026-08-02","nextFollowUpTime":"11:30"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873236484', 'urja battery', 'Dealer', 'Website', 'urja battery', '9428887171', 'bharuch , gujarat', '2026-07-28', '11:30', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: sent proposal', '[{"date":"2026-07-24","text":"sent proposal","time":"15:35","nextFollowUpDate":"2026-07-28","nextFollowUpTime":"11:30"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873299188', 'electric one', 'Dealer', 'Website', 'electric one', '9998783333', 'bharuch , gujarat', '2027-07-24', '11:30', 'not want', 'CONTACTED', '[Follow-up 2026-07-24]: not want', '[{"date":"2026-07-24","text":"not want","time":"15:23","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"11:30"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873360630', 'acute electronics', 'Dealer', 'Website', 'acute electronics', '9825350994', 'bharuch , gujarat', '2026-11-05', '11:25', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: sent proposal already not attend
[Follow-up 2026-07-25]: sent proposal not attend
[Follow-up 2026-08-05]: sent reminder call krege', '[{"date":"2026-07-24","text":"sent proposal already not attend","time":"15:22","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:25"},{"date":"2026-07-25","text":"sent proposal not attend","time":"15:10","nextFollowUpDate":"2026-08-05","nextFollowUpTime":"11:25"},{"date":"2026-08-05","text":"sent reminder call krege","time":"13:05","nextFollowUpDate":"2026-11-05","nextFollowUpTime":"11:25"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873459860', 'jay maa e-bike', 'Dealer', 'Website', 'jay maa e-bikes', '9737617010', 'bharuch , gujara', '2026-08-08', '11:25', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: sent proposal call back
[Follow-up 2026-07-29]: sent proposal reminder call back
[Follow-up 2026-07-31]: sent proposal reminder call back not attend', '[{"date":"2026-07-24","text":"sent proposal call back","time":"15:41","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"11:25"},{"date":"2026-07-29","text":"sent proposal reminder call back","time":"12:30","nextFollowUpDate":"2026-07-31","nextFollowUpTime":"11:25"},{"date":"2026-07-31","text":"sent proposal reminder call back not attend","time":"16:19","nextFollowUpDate":"2026-08-08","nextFollowUpTime":"11:25"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873545506', 'yogi auto battery', 'Dealer', 'Website', 'yogi auto battery', '9426858241', 'bharuch , gujara', '2026-09-01', '11:00', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: sent proposal abhi nahi dekha dekh k bolege
[Follow-up 2026-07-29]: dekh k bolege already sent proposal
[Follow-up 2026-07-29]: sent proposal already not attend bharuch dealer
[Follow-up 2026-08-01]: inhe same day solution chahiye samjaya lekin nahi samaj rae k koi nahi rukta hai', '[{"date":"2026-07-24","text":"sent proposal abhi nahi dekha dekh k bolege","time":"15:42","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"11:00"},{"date":"2026-07-29","text":"dekh k bolege already sent proposal","time":"12:34","nextFollowUpDate":"2026-07-29","nextFollowUpTime":"11:00"},{"date":"2026-07-29","text":"sent proposal already not attend bharuch dealer","time":"13:11","nextFollowUpDate":"2026-08-01","nextFollowUpTime":"11:00"},{"date":"2026-08-01","text":"inhe same day solution chahiye samjaya lekin nahi samaj rae k koi nahi rukta hai","time":"13:03","nextFollowUpDate":"2026-09-01","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873632586', 'patel battery', 'Dealer', 'Website', 'patel battery', '9913270382', 'bharuch , gujarat', '2027-07-24', '11:30', 'not interested call disco', 'CONTACTED', '[Follow-up 2026-07-24]: not intrested', '[{"date":"2026-07-24","text":"not intrested","time":"15:42","nextFollowUpDate":"2027-07-24","nextFollowUpTime":"11:30"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873759711', 'krishna green energy', 'Dealer', 'Website', 'krishna green battery', '9825019796', 'bhuj , gujarat', '2026-08-26', '11:00', 'busy another call', 'CONTACTED', '[Follow-up 2026-07-24]: 9825019792 sun vision venture pvt proposal
[Follow-up 2026-07-25]: call back', '[{"date":"2026-07-24","text":"9825019792 sun vision venture pvt proposal","time":"15:53","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:00"},{"date":"2026-07-25","text":"call back","time":"17:27","nextFollowUpDate":"2026-08-26","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873848878', 'kachchh battery center', 'Dealer', 'Website', 'kachchh battery center', '8200571171', 'bhuj , gujarat', '2026-07-28', '10:00', 'not attend', 'CONTACTED', '[Follow-up 2026-07-25]: call back', '[{"date":"2026-07-25","text":"call back","time":"17:19","nextFollowUpDate":"2026-07-28","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784873920782', 'shyam e-bike', 'Dealer', 'Website', 'shyam e-bike', '9909036489', 'bhuj , gujarat', '2026-08-11', '10:00', 'busy another call', 'CONTACTED', '[Follow-up 2026-07-24]: call back
[Follow-up 2026-07-25]: call back
[Follow-up 2026-07-30]: call forwarded', '[{"date":"2026-07-24","text":"call back","time":"15:53","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:00"},{"date":"2026-07-25","text":"call back","time":"17:25","nextFollowUpDate":"2026-07-30","nextFollowUpTime":"10:00"},{"date":"2026-07-30","text":"call forwarded","time":"17:36","nextFollowUpDate":"2026-08-11","nextFollowUpTime":"10:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784874073927', 'shree hari e-bike', 'Dealer', 'Website', 'shree hari e-bike', '9726681019', 'bhuj , gujarat', '2026-07-27', '11:00', 'not reachable', 'CONTACTED', '[Follow-up 2026-07-24]: not reachable', '[{"date":"2026-07-24","text":"not reachable","time":"15:42","nextFollowUpDate":"2026-07-27","nextFollowUpTime":"11:00"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784874212576', 'jay mata ji battery sales & services', 'Dealer', 'Website', 'jay mata ji battery sales & services', '9099646382', 'bhuj , gujarat', '2026-08-24', '11:20', 'sent proposal', 'QUOTATION_SENT', '[Follow-up 2026-07-24]: yet no requirement bolege', '[{"date":"2026-07-24","text":"yet no requirement bolege","time":"15:44","nextFollowUpDate":"2026-08-24","nextFollowUpTime":"11:20"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784874305819', 'rajarshi ev', 'Dealer', 'Website', 'rajarshi ev', '8071936936', 'bhuj , gujarat', '2026-07-27', '11:26', 'not reachable', 'CONTACTED', '[Follow-up 2026-07-24]: call back
[Follow-up 2026-07-25]: wrong number
[Follow-up 2026-07-25]: wrong number', '[{"date":"2026-07-24","text":"call back","time":"15:53","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:26"},{"date":"2026-07-25","text":"wrong number","time":"17:26","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"11:26"},{"date":"2026-07-25","text":"wrong number","time":"17:26","nextFollowUpDate":"2026-07-27","nextFollowUpTime":"11:26"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement, status, notes, remarks_log)
VALUES ('lead-1784874376010', 'pure ev', 'Dealer', 'Website', 'pure ev', '9274148833', 'bhuj , gujarat', '2026-07-27', '10:30', 'busy another call', 'CONTACTED', '[Follow-up 2026-07-24]: call disco.
[Follow-up 2026-07-25]: call back', '[{"date":"2026-07-24","text":"call disco.","time":"15:55","nextFollowUpDate":"2026-07-25","nextFollowUpTime":"10:30"},{"date":"2026-07-25","text":"call back","time":"17:44","nextFollowUpDate":"2026-07-27","nextFollowUpTime":"10:30"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  company = EXCLUDED.company,
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  contact_person = EXCLUDED.contact_person,
  mobile = EXCLUDED.mobile,
  location = EXCLUDED.location,
  followup_date = EXCLUDED.followup_date,
  followup_time = EXCLUDED.followup_time,
  requirement = EXCLUDED.requirement,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  remarks_log = EXCLUDED.remarks_log;

-- 9. Seed Customers
INSERT INTO public.customers (id, name, company, branch, gstin, contact_person, phone, address, city, state, location_hub, ledger_status)
VALUES
  ('cust-001', 'Electra Transit Pvt Ltd', 'Electra Transit Pvt Ltd', 'North Hub', '27AAACE1234F1Z0', 'Ramesh Dev', '+91 9900887766', 'Nagpur, Maharashtra', 'Nagpur', 'Maharashtra', 'North Hub', 'APPROVED CREDIT'),
  ('cust-002', 'Sherpa Power Storage', 'Sherpa Power Storage', 'Himalayan Branch', '02AAACS4321A1Z1', 'Dorjee Tensing', '+91 9112233445', 'Leh, Ladakh', 'Leh', 'Ladakh', 'Himalayan Branch', 'APPROVED CREDIT'),
  ('cust-003', 'Prime Tele-Infrastructure', 'Prime Tele-Infrastructure', 'South Circle', '33AAACP5555G1Z9', 'K. Raghavan', '+91 8877665544', 'Bengaluru, Karnataka', 'Bengaluru', 'Karnataka', 'South Circle', 'APPROVED CREDIT'),
  ('cust-004', 'Elite Power Ahmedabad', 'Elite Power Ahmedabad', 'Navrangpura', '24AAAAA0000A1Z5', 'Biren Patel', '+91 9988776655', 'Navrangpura, Ahmedabad, Gujarat', 'Ahmedabad', 'Gujarat', 'West Hub', 'APPROVED CREDIT')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Invoices (Sale Invoices)
INSERT INTO public.invoices (id, customer_id, party_id, party_name, biller_signature, goods, items, subtotal, discount, flat_discount, gst, tax, gst_tax_rate, grand_total, total, payment_mode, status, voucher_no, date)
VALUES
  ('INV-10029', 'cust-001', 'cust-001', 'Electra Transit Pvt Ltd', 'ARAVIND SWAMY (SUPER_ADMIN)', '[{"description": "E-Rickshaw Batteries", "qty": 2, "serials": ["ARC-72V30A-10091", "ARC-72V30A-10092"], "baseRate": 45000, "netVal": 90000}]'::jsonb, '[{"model": "BAT-72V-30A", "description": "E-Rickshaw Batteries", "qty": 2, "serials": ["ARC-72V30A-10091", "ARC-72V30A-10092"], "baseRate": 45000, "netVal": 90000}]'::jsonb, 90000, 1000, 1000, 16020, 16020, 18, 105020, 105020, 'Credit', 'UNPAID', 'INV-10029', '2026-07-25'),
  ('VCHP-2026-001', 'cust-004', 'cust-004', 'Elite Power Ahmedabad', 'ARAVIND SWAMY (SUPER_ADMIN)', '[{"description": "E-Rickshaw Batteries", "qty": 2, "serials": ["ARC-72V30A-10091", "ARC-72V30A-10092"], "baseRate": 45000, "netVal": 90000}]'::jsonb, '[{"model": "BAT-72V-30A", "description": "E-Rickshaw Batteries", "qty": 2, "serials": ["ARC-72V30A-10091", "ARC-72V30A-10092"], "baseRate": 45000, "netVal": 90000}]'::jsonb, 90000, 0, 0, 16200, 16200, 18, 106200, 106200, 'Credit (Mark Unpaid Ledger)', 'UNPAID', 'VCHP-2026-001', '2026-07-28')
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Accounting Vouchers (2-Record Payment In & 3-Record Purchases / Expenses)
INSERT INTO public.accounting_vouchers (id, voucher_no, voucher_type, vtype, party_id, party_name, party_company, category, amount, deposit_mode, settlement_status, payment_notes, reference_notes, remarks, date)
VALUES
  ('VOUCH-PAY-101', 'VOUCH-PAY-101', 'Payment-In', 'Payment-In', 'cust-004', 'Elite Power Ahmedabad', 'Elite Power Ahmedabad', 'Sales Deposit Receipt', 50000.00, 'Bank Deposit', 'Paid (Decrease dynamic book balance)', 'UPI ID: 49301030 @ hdfc', 'UPI ID: 49301030 @ hdfc', 'Customer deposit payment received', '2026-07-28'),
  ('VOUCH-PUR-102', 'VOUCH-PUR-102', 'Purchase', 'Purchase', 'vendor-101', 'Lead-Tech Electrodes Ltd', 'Lead-Tech Electrodes Ltd', 'Raw Lead Graphene Plates', 125000.00, 'Bank Deposit', 'Paid (Decrease dynamic book balance)', 'Cheque No: 910291 HDFC Bank', 'Cheque No: 910291 HDFC Bank', 'Inward raw material invoice purchase', '2026-07-27'),
  ('VOUCH-EXP-103', 'VOUCH-EXP-103', 'Expense', 'Expense', 'vendor-102', 'Torrent Power Grid', 'Torrent Power Grid', 'Operational Utilities', 45000.00, 'Bank Deposit', 'Paid (Decrease dynamic book balance)', 'Auto-debited grid bill May 2026', 'Auto-debited grid bill May 2026', 'Monthly electricity grid utility charge', '2026-07-26')
ON CONFLICT (id) DO NOTHING;

-- 12. Seed DTC Handshake Scans
INSERT INTO public.dtc_scans (id, battery_model, user_identifier, location)
VALUES
  ('scan-001', 'E-Rickshaw Batteries (72V30A)', 'Ramesh Dev', 'Nagpur, MH'),
  ('scan-002', 'Scooter Batteries (48V24A)', 'Suresh Kumar', 'Pune, MH')
ON CONFLICT (id) DO NOTHING;

-- 13. Seed Marketing Campaigns
INSERT INTO public.marketing_campaigns (id, title, category_group, description)
VALUES
  ('camp-01', 'Smart Monsoon Energy SOH Rebate', 'EV Battery Module', 'Detail specific perks or discounts customers unlock immediately on dynamic QR lookup registration and battery health checklist completion.')
ON CONFLICT (id) DO NOTHING;

-- 14. Seed Batch QR Tracking Label Registers
INSERT INTO public.batch_qr_labels (id, blueprint_name, prefix, quantity)
VALUES
  ('batch-001', 'E-Rickshaw Batteries (72V30A)', 'AESPL EV', 50)
ON CONFLICT (id) DO NOTHING;

-- 15. Seed RMA Help Desk Tickets
INSERT INTO public.plant_tickets (id, serial_reference, issue_classification, symptoms)
VALUES
  ('tkt-001', 'ARC-72V30A-2024-000101', 'Low Range / Backup Loss', 'Tested capacity drops abnormally below 65% SOH within 100 cycles.')
ON CONFLICT (id) DO NOTHING;

-- 16. Seed Complaints & Service Tickets
INSERT INTO public.complaints (id, serial, type, stage, status, date, resolved_date, notes, engineering_observations, root_cause, engineer, inspection_result)
VALUES
  ('C-1001', 'ARC-72V30A-2024-000101', 'Low Range', 'CLOSED', 'RESOLVED', '2024-05-10', '2024-05-14', 'BMS firmware updated.', 'Technician Suresh P. is actively scrutinizing the circuit matrix and cell chemistry for potential delta drift.', 'BMS Failure', 'Suresh P.', 'Firmware drift detected'),
  ('C-1002', 'ARC-72V30A-2024-000102', 'Dead on Arrival', 'REGISTERED', 'OPEN', '2024-05-15', '', 'Unit not turning on.', 'Awaiting physical transfer from dealer collection depot.', 'PENDING SCRUTINY', 'Unassigned', NULL),
  ('C-1003', 'ARC-72V30A-2024-000103', 'Voltage Drop', 'UNDER_INSPECTION', 'OPEN', '2024-05-16', '', 'Sudden power cut.', 'Scrutinizing thermistors and fuse ratings.', 'PENDING SCRUTINY', 'Ramesh K.', NULL),
  ('C-1004', 'ARC-AUTO-2024-112233', 'No Backup', 'READY_FOR_DISPATCH', 'OPEN', '2024-05-14', '', 'Aging cells.', 'Cell balance calibrated and pack capacity tested green.', 'Cell Failure', 'Suresh P.', NULL),
  ('C-1005', 'ARC-INV-2024-445566', 'High Temp', 'REPAIR_STARTED', 'OPEN', '2024-05-12', '', 'Fan not working.', 'Replacing passive heatsinks with active thermal management.', 'PENDING SCRUTINY', 'Anita D.', NULL)
ON CONFLICT (id) DO NOTHING;

-- 17. Seed Diagnostic Command Historical Ledger
INSERT INTO public.diagnostic_ledger (id, complaint_id, serial, stage, root_cause, notes, engineer, timestamp)
VALUES
  ('LOG-C1004-1', 'C-1004', 'ARC-AUTO-2024-112233', 'UNDER_INSPECTION', 'Cell Failure', 'Initial scrutiny. Detected swelling on anode module layer.', 'Suresh P.', '2026-06-16 14:32:00'),
  ('LOG-C1004-2', 'C-1004', 'ARC-AUTO-2024-112233', 'READY_FOR_DISPATCH', 'Cell Failure', 'Aging cells. Replaced cell pack layer and confirmed capacity safety margins.', 'Suresh P.', '2026-06-17 09:12:15'),
  ('LOG-C1005-1', 'C-1005', 'ARC-INV-2024-445566', 'REPAIR_STARTED', 'BMS Failure', 'Thermal compound degradation causing heat build up. Fan controller bypassed.', 'Anita D.', '2026-06-16 11:20:44'),
  ('LOG-C1003-1', 'C-1003', 'ARC-72V30A-2024-000103', 'UNDER_INSPECTION', 'Voltage Drop', 'Resistance balancing audit underway.', 'Ramesh K.', '2026-06-17 08:30:10')
ON CONFLICT (id) DO NOTHING;

-- 18. Seed Purchase Orders (Inward Requisitions / POS Generate PO)
INSERT INTO public.purchase_orders (
  id, material_id, material_name, category, vendor, vendor_contact, qty, unit, unit_cost, total_amount, order_date, estimated_delivery, status, tracking_number, remarks
) VALUES 
  ('PO-2026-081', 'RM-CELLS', 'Lithium Cells (3.7V 3Ah)', 'Cells', 'Energy Plus Ltd', '+91 98765 43210', 10000, 'Pcs', 250, 2500000, '2026-07-20', '2026-07-28', 'In Transit', 'TRK-EP-99812', 'Priority supply for 72V30A E-Rickshaw Battery Batch A3'),
  ('PO-2026-082', 'RM-BMS-72V', 'Smart BMS (72V 50A)', 'Electronics', 'TechCircuit Electronics', '+91 91234 56789', 500, 'Pcs', 2500, 1250000, '2026-07-22', '2026-07-29', 'Pending Supplier Confirmation', 'TRK-TC-4401', 'Order confirmed via supplier EDI, awaiting dispatch tag.'),
  ('PO-2026-083', 'RM-LEAD', 'Lead Alloy', 'RAW_MATERIAL', 'Global Metals Corp', '+91 99887 76655', 5000, 'Kg', 180, 900000, '2026-07-18', '2026-07-25', 'Arrived at Gate', 'TRK-GM-1002', 'Truck MH-12-PQ-8891 at Gate 2. Pending GRN & QC test.'),
  ('PO-2026-080', 'RM-ACID', 'Sulfuric Acid', 'RAW_MATERIAL', 'Chemical Ltd', '+91 98980 12345', 2000, 'Ltr', 45, 90000, '2026-07-10', '2026-07-15', 'GRN Received', 'TRK-CH-0092', 'Received and verified into Raw Hub Rack A1 under GRN-R-03')
ON CONFLICT (id) DO NOTHING;

-- 19. Seed Procurement Entries (Inward Raw Material Arrivals & Transport Details)
INSERT INTO public.procurement_entries (
  id, procurement_mode, matcher_sku, material_name, code_reference, category, unit, challan_number, vehicle_number, supplier_name, eway_bill, excise_slip, accepted_qty, damaged_qty, batch_master_id, grn_reference, destination_warehouse, rack_shelf, min_stock, reorder_level, allocated_inflow, status
) VALUES 
  ('PROC-2026-001', 'RESTOCK EXISTING ITEM', 'LA-001', 'Lead Alloy', 'CD-4511', 'RAW_MATERIAL', 'Kg', 'CH-2026-881', 'GJ-01-AB-1234', 'Platinum Electronics Ltd', 'EWB-99482710', 'EXC-88321', 1000, 0, 'B-394', 'GRN-3128', 'Raw Hub', 'A-1', 100, 250, 1000, 'COMPLETED'),
  ('PROC-2026-002', 'REGISTER NEW MATERIAL', 'CELL-3.7', 'Lithium Cells (3.7V 3Ah)', 'CELL-3.7', 'Cells', 'Pcs', 'CH-2026-902', 'MH-12-PQ-8891', 'Energy Plus Ltd', 'EWB-8820192', 'EXC-99102', 10000, 0, 'EP-2024', 'GRN-R-14', 'Raw Hub', 'C-1', 100, 250, 10000, 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- DATABASE CONFIGURATION SUMMARY
-- =========================================================================
-- Tables Provisioned: 20 Core Scaled Entities
-- Security Setup: Enable Row-Level Security (RLS) with full Public Anonymous read/write policies on all tables
-- Target Key handshakes configured. Ready for deployment!
-- =========================================================================

