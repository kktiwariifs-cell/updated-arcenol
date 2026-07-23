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
--    URL: https://vuastgyyrscopjmnhaew.supabase.co
--    Key: sb_publishable_4bkEqRrvnIrfc-szu_CDpw_tCs9ouIP
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
  branch text,
  gstin text,
  contact_person text,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- -------------------------------------------------------------------------
-- TABLE 10: SALES BILLING & INVOICING ARTIFACTS
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id text PRIMARY KEY,
  customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
  biller_signature text DEFAULT 'Aravind Swamy',
  goods jsonb DEFAULT '[]'::jsonb, -- Array of items chosen with assigned serial numbers
  subtotal numeric DEFAULT 0.00,
  discount numeric DEFAULT 0.00,
  gst numeric DEFAULT 0.00,
  grand_total numeric DEFAULT 0.00,
  payment_mode text DEFAULT 'Credit', -- 'Credit (Mark Unpaid Ledger)', 'Cash', 'Bank'
  status text DEFAULT 'UNPAID', -- 'UNPAID', 'PAID'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS biller_signature text DEFAULT 'Aravind Swamy';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS goods jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS gst numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS grand_total numeric DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'Credit';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status text DEFAULT 'UNPAID';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- -------------------------------------------------------------------------
-- TABLE 11: ACCOUNTING VOUCHERS (PAYMENTS, PURCHASES, EXPENSES)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_vouchers (
  id text PRIMARY KEY,
  voucher_type text NOT NULL, -- 'PAYMENT', 'PURCHASE', 'EXPENSE'
  party_name text,            -- Party Company / Recipient vendor Name
  category text,              -- Raw Components Category or Operational Expense Category
  amount numeric DEFAULT 0.00,
  deposit_mode text DEFAULT 'Bank Deposit', -- 'Bank Deposit', 'Cash', 'UPI'
  settlement_status text DEFAULT 'Paid',    -- 'Paid (Decrease dynamic book balance)', 'Unpaid'
  payment_notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS voucher_type text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS party_name text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0.00;
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS deposit_mode text DEFAULT 'Bank Deposit';
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'Paid';
ALTER TABLE public.accounting_vouchers ADD COLUMN IF NOT EXISTS payment_notes text;
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

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) FOR ANONYMOUS CRUD INTEGRATION
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.arcenol_corporate_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graded_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wip_inventory ENABLE ROW LEVEL SECURITY;
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
  ('bom-001', 'BAT-NEXT-200', 'High-Efficiency Inverter Battery 200Ah', 'Category 2 — Solar / Inverter Battery Inventory', '[{"matId": "mat-005", "qty": 200, "unit": "Pcs"}, {"matId": "mat-006", "qty": 1, "unit": "Pcs"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Work In Progress Runs (WIP Inventory)
INSERT INTO public.wip_inventory (id, name, qty, stage, last_update, components)
VALUES 
  ('wip-001', 'CELL PACK ASSEMBLY RUN 10', 10, 'WELDING', '2026-07-01', '[{"matId": "mat-005", "qty": 2000, "name": "Lithium Cells"}, {"matId": "mat-006", "qty": 10, "name": "BMS Module"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 8. Seed New Lead Inquiries & Reminders
INSERT INTO public.lead_inquiries (id, company, category, source, contact_person, mobile, location, followup_date, followup_time, requirement)
VALUES 
  ('lead-001', 'Modern EV Solutions', 'DEALER', 'WEBSITE', 'Aravind Swamy', '+91 9876543210', 'Chennai, Tamil Nadu', '2026-07-01', '10:00', 'Needs 100Ah battery pack solutions for 2-wheelers fleet rollouts.')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Customers
INSERT INTO public.customers (id, name, branch, gstin, contact_person, phone, address)
VALUES
  ('cust-001', 'Electra Transit Pvt Ltd', 'North Hub', '27AAACE1234F1Z0', 'Ramesh Dev', '+91 9900887766', 'Nagpur, Maharashtra'),
  ('cust-002', 'Sherpa Power Storage', 'Himalayan Branch', '02AAACS4321A1Z1', 'Dorjee Tensing', '+91 9112233445', 'Leh, Ladakh'),
  ('cust-003', 'Prime Tele-Infrastructure', 'South Circle', '33AAACP5555G1Z9', 'K. Raghavan', '+91 8877665544', 'Bengaluru, Karnataka')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Invoices
INSERT INTO public.invoices (id, customer_id, biller_signature, goods, subtotal, discount, gst, grand_total, payment_mode, status)
VALUES
  ('INV-10029', 'cust-001', 'Aravind Swamy', '[{"description": "E-Rickshaw Batteries", "qty": 2, "serials": ["ARC-72V30A-10091", "ARC-72V30A-10092"], "baseRate": 45000, "netVal": 90000}]'::jsonb, 90000, 1000, 16020, 105020, 'Credit', 'UNPAID')
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Accounting Vouchers
INSERT INTO public.accounting_vouchers (id, voucher_type, party_name, category, amount, deposit_mode, settlement_status, payment_notes)
VALUES
  ('VOUCH-P-001', 'PAYMENT', 'Electra Transit Pvt Ltd', 'Sales Deposit Receipt', 50000.00, 'Bank Deposit', 'Paid', 'UPI Reference: TXN994029103'),
  ('VOUCH-S-002', 'PURCHASE', 'Lead-Tech Electrodes Ltd', 'Raw Lead Graphene Plates', 125000.00, 'Bank Deposit', 'Paid', 'Cheque No: 910291 HDFC'),
  ('VOUCH-E-003', 'EXPENSE', 'Torrent Power Grid', 'Operational Utilities', 45000.00, 'Bank Deposit', 'Paid', 'Auto-debited grid bill May 2026')
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
  ('batch-001', 'E-Rickshaw Batteries (72V30A)', 'ARC-INV-', 50)
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

-- =========================================================================
-- DATABASE CONFIGURATION SUMMARY
-- =========================================================================
-- Tables Provisioned: 18 Core Scaled Entities
-- Security Setup: Enable Row-Level Security (RLS) with full Public Anonymous read/write policies on all tables
-- Target Key handshakes configured. Ready for deployment!
-- =========================================================================

