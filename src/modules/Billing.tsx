import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Download, Share2, Filter, IndianRupee, MapPin, Calendar, User, ShoppingBag, CheckCircle2, ChevronRight, ArrowLeft, Printer, Trash2, AlertCircle, ShieldCheck, Edit, Copy, ClipboardCheck, ArrowUpRight, ArrowDownLeft, Wallet, Landmark, TrendingUp, Info, X, ChevronDown, Check, FileSpreadsheet, Send, Zap } from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { useAuthStore, UserRole } from '../store/authStore';
import { formatCurrency, cn } from '../lib/utils';
import { downloadElementAsPDF, downloadReportDataAsPDF } from '../lib/pdfGenerator';
import { FormattedSerial } from '../lib/serialUtils';

interface VyaparRecord {
  id: string;
  type: 'Payment-In' | 'Purchase' | 'Expense';
  partyId: string;
  partyName: string;
  date: string;
  amount: number;
  mode: 'Cash' | 'Bank' | 'UPI' | 'Cheque';
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  remarks: string;
  category?: string;
}

interface BillingProps {
  setActiveTab?: (tab: string) => void;
}

export const Billing: React.FC<BillingProps> = ({ setActiveTab }) => {
  const { data, loading, refetch } = useERPData();
  const { user: currentUser } = useAuthStore();
  const [view, setView] = useState<'list' | 'create'>('list');
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'parties' | 'tax'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardView, setDashboardView] = useState<'all' | 'sales' | 'payments' | 'purchases' | 'expenses'>('all');
  
  // Custom Vyapar Transactions List
  const vyaparRecords = data?.vyaparRecords || [];

  // Modal controls
  const [modalType, setModalType] = useState<'Payment-In' | 'Purchase' | 'Expense' | null>(null);
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<string | null>(null);
  
  // Create transaction form state
  const [txForm, setTxForm] = useState({
    partyId: '',
    partyName: '',
    amount: '',
    mode: 'Bank' as 'Cash' | 'Bank' | 'UPI' | 'Cheque',
    status: 'PAID' as 'PAID' | 'UNPAID',
    remarks: '',
    category: 'Miscellaneous'
  });

  // Invoice Create State
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]); 
  const [isSelectingStock, setIsSelectingStock] = useState(false);
  const [activeModelForStock, setActiveModelForStock] = useState<string | null>(null);
  const [invoicePaymentMode, setInvoicePaymentMode] = useState<'Credit' | 'Cash' | 'Bank' | 'UPI'>('Credit');
  const [invoiceItemDiscount, setInvoiceItemDiscount] = useState<number>(0); // Direct flat discount

  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    company: '',
    category: 'Tier 1 Dealer',
    gstin: '',
    phone: '',
    email: '',
    location: '',
    city: '',
    state: '',
    region: 'West',
    contactPerson: '',
    bankDetails: '',
    status: 'ACTIVE'
  });

  const handleQuickAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerForm.company) return;

    try {
      const response = await fetch('/api/dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickCustomerForm)
      });
      if (response.ok) {
        const newDealerObj = await response.json();
        await refetch();
        setSelectedDealer(newDealerObj);
        setShowQuickAddCustomer(false);
        setQuickCustomerForm({
          company: '',
          category: 'Tier 1 Dealer',
          gstin: '',
          phone: '',
          email: '',
          location: '',
          city: '',
          state: '',
          region: 'West',
          contactPerson: '',
          bankDetails: '',
          status: 'ACTIVE'
        });
      }
    } catch (err) {
      console.error('Error adding new customer:', err);
    }
  };

  const dealers = [
    ...(data?.dealers || []),
    ...(data?.leads?.filter((l: any) => l.status === 'CONVERTED') || [])
  ];
  if (dealers.length === 0) {
    dealers.push({ id: 'l1', company: 'Green Motors Ahmedabad', location: 'Ahmedabad, GJ' });
  }

  const matchFgToProduct = (fg: any, prod: any) => {
    if (!fg || !prod) return false;
    const fgModel = String(fg.model || fg.modelId || fg.name || '').trim().toUpperCase();
    const pId = String(prod.id || '').trim().toUpperCase();
    const pName = String(prod.name || '').trim().toUpperCase();

    if (!fgModel) return false;

    if (pId && fgModel === pId) return true;
    if (pName && fgModel === pName) return true;

    if (pId && (fgModel.includes(pId) || pId.includes(fgModel))) return true;
    if (pName && (fgModel.includes(pName) || pName.includes(fgModel))) return true;

    const cleanFg = fgModel.replace(/[^A-Z0-9]/g, '');
    const cleanId = pId.replace(/[^A-Z0-9]/g, '');
    const cleanName = pName.replace(/[^A-Z0-9]/g, '');

    if (cleanId && (cleanFg.includes(cleanId) || cleanId.includes(cleanFg))) return true;
    if (cleanName && (cleanFg.includes(cleanName) || cleanName.includes(cleanFg))) return true;

    const keywords = ["72V30A", "BAT-AUTO-35", "BAT-INV-150", "BAT-VRLA-100", "BAT-NEXT-200", "LIT-200", "PROD-EV-BIKE", "SCOOTER", "RICKSHAW", "INVERTER"];
    for (const kw of keywords) {
      if (fgModel.includes(kw) && (pId.includes(kw) || pName.includes(kw))) return true;
    }

    return false;
  };

  const availableStock = (data?.finishedGoods || []).filter((fg: any) => {
    const st = String(fg.status || 'READY').toUpperCase().trim();
    return !['SOLD', 'DISPATCHED', 'DAMAGED', 'HOLD', 'RETURNED'].includes(st);
  });

  const allBillingProducts = React.useMemo(() => {
    const baseProducts = [...(data?.products || [])];
    
    const unmappedFgModels = new Map<string, any>();
    (data?.finishedGoods || []).forEach((fg: any) => {
      if (!fg.model) return;
      const isMatched = baseProducts.some(p => matchFgToProduct(fg, p));
      if (!isMatched && !unmappedFgModels.has(fg.model)) {
        unmappedFgModels.set(fg.model, {
          id: fg.model,
          name: fg.model.toUpperCase().includes('BATTERY') ? fg.model : `${fg.model} BATTERY`,
          category: 'FINISHED GOODS INVENTORY',
          type: 'Battery Unit',
          price: 35000,
          isSynthetic: true
        });
      }
    });

    return [...baseProducts, ...Array.from(unmappedFgModels.values())];
  }, [data?.products, data?.finishedGoods]);

  const handleCreateInvoice = async () => {
    if (!selectedDealer || cart.length === 0) return;

    const subTotal = cart.reduce((acc, item) => acc + (item.price * item.serials.length), 0);
    const totalAfterDiscount = Math.max(0, subTotal - invoiceItemDiscount);
    const tax = totalAfterDiscount * 0.18; 
    const finalTotal = totalAfterDiscount + tax;

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealerId: selectedDealer.id,
        items: cart.map(item => ({
            model: item.modelId,
            qty: item.serials.length,
            serials: item.serials,
            price: item.price
        })),
        total: finalTotal,
        tax,
        biller: currentUser?.name || 'Finance Executive'
      })
    });

    if (res.ok) {
        const createdInv = await res.json();
        // If paid immediately, flip status on server/local simulation
        if (invoicePaymentMode !== 'Credit') {
          await fetch(`/api/invoices/${createdInv.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAID' })
          });
        }
        setView('list');
        setCart([]);
        setSelectedDealer(null);
        setInvoiceItemDiscount(0);
        setInvoicePaymentMode('Credit');
        refetch();
    }
  };

  const addToCart = (modelId: string, serial: string) => {
    const product = allBillingProducts.find((p: any) => p.id === modelId || matchFgToProduct({ model: modelId }, p));
    const price = product?.price || 0;
    const targetModelId = product?.id || modelId;

    setCart(prev => {
        const existing = prev.find(item => item.modelId === targetModelId);
        if (existing) {
            if (existing.serials.includes(serial)) {
                return prev.map(item => item.modelId === targetModelId ? { ...item, serials: item.serials.filter((s: string) => s !== serial) } : item);
            }
            return prev.map(item => item.modelId === targetModelId ? { ...item, serials: [...item.serials, serial] } : item);
        }
        return [...prev, { modelId: targetModelId, serials: [serial], price }];
    });
  };

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isEditingInvoice, setIsEditingInvoice] = useState<boolean>(false);
  const [editingInvoiceForm, setEditingInvoiceForm] = useState<any>({ status: 'UNPAID', subtotal: 0, tax: 0 });

  const displayStatus = isEditingInvoice ? editingInvoiceForm.status : (selectedInvoice?.status || 'UNPAID');
  const displayTax = isEditingInvoice ? editingInvoiceForm.tax : (selectedInvoice?.tax || 0);
  const displayTotal = isEditingInvoice 
    ? (Number(editingInvoiceForm.subtotal) + Number(editingInvoiceForm.tax)) 
    : (selectedInvoice?.total || 0);

  // Calculate scaling factor between actual items total and invoice valuation to dynamically adjust line item prices under edit modes
  const itemsSubtotal = (selectedInvoice?.items || []).reduce((acc: number, item: any) => acc + (item.price * (item.qty || 1)), 0);
  const editedNetSubtotal = Math.max(0, displayTotal - displayTax);
  const scaleFactor = itemsSubtotal > 0 ? (editedNetSubtotal / itemsSubtotal) : 1;
  const editedTaxRate = editedNetSubtotal > 0 ? (displayTax / editedNetSubtotal) : (displayTax > 0 ? 0.18 : 0);

  const handleDeleteInvoice = async (invId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete Invoice "${invId}"? Stock items will return to inventory.`)) return;
    try {
      const res = await fetch(`/api/invoices/${invId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedInvoice(null);
        setIsEditingInvoice(false);
        refetch();
      }
    } catch (err) {
      alert("Error deleting invoice.");
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      const parentTotal = Number(editingInvoiceForm.subtotal) + Number(editingInvoiceForm.tax);
      const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editingInvoiceForm.status,
          total: parentTotal,
          tax: Number(editingInvoiceForm.tax)
        })
      });
      if (res.ok) {
        setIsEditingInvoice(false);
        setSelectedInvoice(null);
        refetch();
      }
    } catch {
      alert("Error saving invoice changes.");
    }
  };

  // double-entry ledger calculation per customer/dealer
  const getPartyLedger = (partyId: string) => {
    const partySales = (data?.invoices || [])
      .filter((inv: any) => inv.dealerId === partyId)
      .map((inv: any) => ({
        id: inv.id,
        date: inv.date,
        type: 'Sale (Invoice)',
        amount: inv.total,
        mode: inv.status === 'PAID' ? 'Digital' : 'Credit',
        status: inv.status,
        remarks: 'Tax Invoice printed'
      }));

    const partyPayments = vyaparRecords
      .filter((rec: any) => rec.type === 'Payment-In' && rec.partyId === partyId)
      .map((rec: any) => ({
        id: rec.id,
        date: rec.date,
        type: 'Payment-In',
        amount: rec.amount,
        mode: rec.mode,
        status: 'PAID',
        remarks: rec.remarks || 'Collected Payment'
      }));

    const merged = [...partySales, ...partyPayments].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    return merged.map((t: any) => {
      if (t.type.includes('Sale')) {
        running += t.amount;
      } else if (t.type === 'Payment-In') {
        running -= t.amount;
      }
      return { ...t, runningBalance: running };
    });
  };

  const getPartyBalance = (partyId: string) => {
    const ledger = getPartyLedger(partyId);
    if (ledger.length === 0) return 0;
    return ledger[ledger.length - 1].runningBalance;
  };

  // Add Custom Transactions (Payments-In, Expenses, Purchases)
  const saveVyaparRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || Number(txForm.amount) <= 0) {
      alert("Please specify a valid numeric amount.");
      return;
    }

    let finalPartyName = txForm.partyName;
    if (modalType === 'Payment-In') {
      const match = dealers.find(d => d.id === txForm.partyId);
      finalPartyName = match ? match.company : 'Walk-In Customer';
    }

    const newRec: VyaparRecord = {
      id: `${modalType === 'Payment-In' ? 'PAY' : modalType === 'Purchase' ? 'PUR' : 'EXP'}-${Date.now()}`,
      type: modalType!,
      partyId: modalType === 'Payment-In' ? txForm.partyId : 'external',
      partyName: finalPartyName || 'General Party',
      amount: Number(txForm.amount),
      date: new Date().toISOString().split('T')[0],
      mode: txForm.mode,
      status: txForm.status,
      remarks: txForm.remarks || `${modalType} record tracked`,
      category: txForm.category
    };

    await fetch('/api/vyapar-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRec)
    });

    setModalType(null);
    setTxForm({ partyId: '', partyName: '', amount: '', mode: 'Bank', status: 'PAID', remarks: '', category: 'Miscellaneous' });
    
    // Trigger real time refetch for balance alignment
    refetch();
  };

  const deleteVyaparRecord = async (id: string) => {
    if (confirm("Remove this accounting voucher entry from historical ledger?")) {
      await fetch(`/api/vyapar-records/${id}`, {
        method: 'DELETE'
      });
      refetch();
    }
  };

  // Dynamic Cash / Bank / Receivable calculations
  const totalSalesFromInvoices = data?.invoices.reduce((a: any, b: any) => a + b.total, 0) || 0;
  
  // Unpaid/Credit sales (contribution to receivables)
  const calculateReceivables = () => {
    return dealers.reduce((acc, d) => {
      const bal = getPartyBalance(d.id);
      return bal > 0 ? acc + bal : acc;
    }, 0);
  };

  const calculatePayables = () => {
    return vyaparRecords
      .filter(rec => rec.type === 'Purchase' && rec.status === 'UNPAID')
      .reduce((a, b) => a + b.amount, 0);
  };

  // Cash flow simulation
  const cashInHandSeed = 94500;
  const bankBalanceSeed = 1865000;

  const calculateCashAndBank = () => {
    let cash = cashInHandSeed;
    let bank = bankBalanceSeed;

    // Real invoice effects
    (data?.invoices || []).forEach((inv: any) => {
      if (inv.status === 'PAID') {
        bank += inv.total; // Default digital deposit for dashboard
      }
    });

    // Custom records
    vyaparRecords.forEach(rec => {
      if (rec.type === 'Payment-In') {
        if (rec.mode === 'Cash') cash += rec.amount;
        else bank += rec.amount;
      } else if (rec.type === 'Expense' || rec.type === 'Purchase') {
        if (rec.status === 'PAID') {
          if (rec.mode === 'Cash') cash -= rec.amount;
          else bank -= rec.amount;
        }
      }
    });

    return { cash, bank };
  };

  const { cash: currentCash, bank: currentBank } = calculateCashAndBank();
  const currentReceivable = calculateReceivables();
  const currentPayable = calculatePayables();

  // Unified Transaction list
  const unifiedTransactions = [
    ...(data?.invoices || []).map((inv: any) => {
      const dlr = dealers.find(d => d.id === inv.dealerId);
      return {
        id: inv.id,
        type: 'Sale' as const,
        party: dlr?.company || 'Walk-In Customer',
        date: inv.date,
        amount: inv.total,
        mode: inv.status === 'PAID' ? 'Digital' : 'Credit',
        status: inv.status as 'PAID' | 'UNPAID' | 'OVERDUE',
        remarks: 'Sales tax invoice voucher',
        raw: inv
      };
    }),
    ...vyaparRecords.map(rec => ({
      id: rec.id,
      type: rec.type,
      party: rec.partyName,
      date: rec.date,
      amount: rec.amount,
      mode: rec.mode,
      status: rec.status === 'PAID' ? 'PAID' as const : 'UNPAID' as const,
      remarks: rec.remarks,
      raw: rec
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter unified stream
  const filteredTransactions = unifiedTransactions.filter(tx => {
    const term = searchTerm.toLowerCase();
    return tx.id.toLowerCase().includes(term) ||
           tx.party.toLowerCase().includes(term) ||
           (tx.remarks || '').toLowerCase().includes(term) ||
           tx.type.toLowerCase().includes(term);
  });

  // Calculate dynamic asset stock value
  const dynamicStockValuation = availableStock.reduce((acc: number, item: any) => {
    const prodPrice = data?.products.find((p: any) => p.id === item.model)?.price || 150000;
    return acc + prodPrice;
  }, 0) + 420000; // adding constant base components materials stock

  // GST Calculation Breakdown
  const gstOutwardCollected = (data?.invoices || []).reduce((a: any, b: any) => a + (b.tax || 0), 0);
  const gstInwardCredit = vyaparRecords
    .filter(r => r.type === 'Purchase')
    .reduce((a, b) => a + (b.amount * 0.18), 0); // Assuming average 18% inward GST on lead plates import
  const gstNetLiability = Math.max(0, gstOutwardCollected - gstInwardCredit);

  return (
    <div className="space-y-6 pb-12 transition-all">
      {view === 'list' ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-2">
                <Landmark className="text-primary-600 stroke-[2]" size={30} />
                Vyapar Accounting Console
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                GST Ledger, Double-Entry Party Statements, Dynamic Liquidity Accounts
              </p>
            </div>
            
            {/* Quick Action Vyapar Bar */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setView('create')} 
                className="px-4 py-3 bg-emerald-600 hover:brightness-110 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
              >
                <Plus size={12} /> Sale Invoice
              </button>
              <button 
                onClick={() => setModalType('Payment-In')} 
                className="px-4 py-3 bg-emerald-600 hover:brightness-110 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
              >
                <Plus size={12} /> Payment In
              </button>
              <button 
                onClick={() => setModalType('Purchase')} 
                className="px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
              >
                <Plus size={12} /> Purchase
              </button>
              <button 
                onClick={() => setModalType('Expense')} 
                className="px-4 py-3 bg-emerald-550 hover:brightness-110 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
              >
                <Plus size={12} /> Expense
              </button>
            </div>
          </div>

          {/* Vyapar Cash Book & Statement Ribbons */}
          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN) && (
            <div id="accounting-summary-boxes" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:scale-[1.01] transition-transform">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="text-emerald-500" size={10} /> Cash In Hand
                </span>
                <p className="text-lg sm:text-xl lg:text-base xl:text-lg 2xl:text-xl font-mono font-black text-slate-900 mt-1.5 tracking-tight truncate" title={formatCurrency(currentCash)}>{formatCurrency(currentCash)}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Physical office register</p>
              </div>
              
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:scale-[1.01] transition-transform">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Landmark className="text-blue-500" size={10} /> Bank balance
                </span>
                <p className="text-lg sm:text-xl lg:text-base xl:text-lg 2xl:text-xl font-mono font-black text-slate-900 mt-1.5 tracking-tight truncate" title={formatCurrency(currentBank)}>{formatCurrency(currentBank)}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">UPI, NetBanking & Cheques</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:scale-[1.01] hover:border-emerald-250 transition-transform">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="text-emerald-500" size={12} /> You'll Receive
                </span>
                <p className="text-lg sm:text-xl lg:text-base xl:text-lg 2xl:text-xl font-mono font-black text-emerald-600 mt-1.5 tracking-tight truncate" title={formatCurrency(currentReceivable)}>{formatCurrency(currentReceivable)}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Customers debit books</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:scale-[1.01] hover:border-red-250 transition-transform">
                <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownLeft className="text-rose-500" size={12} /> You'll Pay
                </span>
                <p className="text-lg sm:text-xl lg:text-base xl:text-lg 2xl:text-xl font-mono font-black text-rose-600 mt-1.5 tracking-tight truncate" title={formatCurrency(currentPayable)}>{formatCurrency(currentPayable)}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Suppliers credit ledger</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-sm col-span-2 lg:col-span-1">
                <span className="text-[9px] font-black text-primary-400 uppercase tracking-wider flex items-center gap-1">
                  <ShoppingBag size={10} className="text-primary-400" /> Stock Valuation
                </span>
                <p className="text-lg sm:text-xl lg:text-base xl:text-lg 2xl:text-xl font-mono font-black text-white mt-1.5 tracking-tight truncate" title={formatCurrency(dynamicStockValuation)}>{formatCurrency(dynamicStockValuation)}</p>
                <p className="text-[8px] font-bold text-primary-300 uppercase tracking-widest mt-0.5">Computed asset value</p>
              </div>
            </div>
          )}

          {/* Sub-tab navigations */}
          <div className="flex border-b border-slate-200">
            {[
              { key: 'dashboard', label: '📊 All Transactions & Flow' },
              { key: 'parties', label: '👥 Party Ledgers & Reminders' },
              { key: 'tax', label: '🧾 GST tax Register' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveSubTab(tab.key as any);
                  setSelectedPartyForLedger(null); // Reset detail page
                }}
                className={cn(
                  "px-6 py-4.5 text-xs font-black uppercase tracking-wider border-b-2 -mb-px transition-colors duration-250",
                  activeSubTab === tab.key
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-450 hover:text-slate-800"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rendering sub-tab views */}
          {activeSubTab === 'dashboard' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6">
              {/* Toolbar */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search vouchers, invoice ID, recipient party..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-10 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 placeholder:text-slate-400"
                  />
                </div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Filter size={12} /> Double-entry voucher books synced
                </div>
              </div>

              {/* Nested Table Type Selector */}
              <div className="px-6 pb-2 pt-1 border-b border-slate-100 flex gap-2 overflow-x-auto">
                {[
                  { value: 'all', label: '📊 All Flow Ledger' },
                  { value: 'sales', label: '🧾 Sale Invoices' },
                  { value: 'payments', label: '💰 Payments In' },
                  { value: 'purchases', label: '🛒 Raw Purchases' },
                  { value: 'expenses', label: '💸 Operational Expenses' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDashboardView(opt.value as any)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                      dashboardView === opt.value
                        ? "bg-slate-900 border-slate-950 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Transactions Ledger Tables */}
              <div className="overflow-x-auto">
                {dashboardView === 'all' && (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-105">
                      <tr>
                        <th className="p-4 pl-6">Voucher/Tx ID</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Party / Beneficiary</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Mode</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right pr-6">Deploy controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 font-mono text-[11px]">
                      {filteredTransactions.map(tx => (
                        <tr 
                          key={tx.id} 
                          onClick={() => {
                            if (tx.type === 'Sale') {
                              setSelectedInvoice(tx.raw);
                              setEditingInvoiceForm({ status: tx.raw.status || 'UNPAID', total: tx.raw.total || 0, tax: tx.raw.tax || 0 });
                            }
                          }}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="p-4 pl-6 font-bold text-primary-650 group-hover:underline">{tx.id}</td>
                          <td className="p-4 font-sans font-bold">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase",
                              tx.type === 'Sale' ? "bg-emerald-50 text-emerald-700" :
                              tx.type === 'Payment-In' ? "bg-blue-50 text-blue-700" :
                              tx.type === 'Purchase' ? "bg-slate-100 text-slate-700" :
                              "bg-amber-50 text-amber-700"
                            )}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-4 font-sans font-extrabold text-slate-800 uppercase max-w-[180px] truncate">{tx.party}</td>
                          <td className="p-4 text-slate-450">{tx.date}</td>
                          <td className="p-4 font-sans text-xs text-slate-500 font-bold">{tx.mode}</td>
                          <td className="p-4 font-black text-slate-900 leading-none">{formatCurrency(tx.amount)}</td>
                          <td className="p-4 font-sans">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                              tx.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-rose-50 text-rose-700 border border-rose-150"
                            )}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              {tx.type === 'Sale' ? (
                                <>
                                  <button onClick={() => setSelectedInvoice(tx.raw)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-800"><Printer size={13} /></button>
                                  <button onClick={(e) => handleDeleteInvoice(tx.id, e)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                                </>
                              ) : (
                                <button onClick={() => deleteVyaparRecord(tx.id)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-10 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                            No accounting ledger records match filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {dashboardView === 'sales' && (
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-105">
                      <tr>
                        <th className="p-4 pl-6">Invoice No</th>
                        <th className="p-4">Party / Customer</th>
                        <th className="p-4">Billed Date</th>
                        <th className="p-4 font-sans">Items Summary</th>
                        <th className="p-4">Mode</th>
                        <th className="p-4 text-right">Tax (GST)</th>
                        <th className="p-4 text-right">Total Amount</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right pr-6">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {filteredTransactions.filter(tx => tx.type === 'Sale').map(tx => {
                        const itemsSummary = tx.raw.items?.map((item: any) => {
                          const pObj = data?.products.find((p: any) => p.id === item.model);
                          return `${item.qty}x ${pObj?.name || item.model}`;
                        }).join(', ') || 'General Supply';

                        return (
                          <tr 
                            key={tx.id} 
                            onClick={() => {
                              setSelectedInvoice(tx.raw);
                              setEditingInvoiceForm({ 
                                status: tx.raw.status || 'UNPAID', 
                                subtotal: (tx.raw.total || 0) - (tx.raw.tax || 0), 
                                tax: tx.raw.tax || 0 
                              });
                            }} 
                            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          >
                            <td className="p-4 pl-6 font-bold text-primary-650">{tx.id}</td>
                            <td className="p-4 font-sans font-extrabold text-slate-800 uppercase max-w-[150px] truncate">{tx.party}</td>
                            <td className="p-4 text-slate-450">{tx.date}</td>
                            <td className="p-4 font-sans text-slate-500 max-w-[200px] truncate" title={itemsSummary}>{itemsSummary}</td>
                            <td className="p-4 font-sans font-black text-slate-500 uppercase">{tx.mode}</td>
                            <td className="p-4 text-right text-rose-500 font-bold">{formatCurrency(tx.raw.tax || 0)}</td>
                            <td className="p-4 text-right font-black text-slate-900">{formatCurrency(tx.amount)}</td>
                            <td className="p-4 text-center">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                                tx.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-rose-50 text-rose-700 border border-rose-150"
                              )}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="p-4 text-right pr-6" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-1.5">
                                <button onClick={() => setSelectedInvoice(tx.raw)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-800"><Printer size={13} /></button>
                                <button onClick={(e) => handleDeleteInvoice(tx.id, e)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTransactions.filter(tx => tx.type === 'Sale').length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                            No Sale Invoices match criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {dashboardView === 'payments' && (
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-105">
                      <tr>
                        <th className="p-4 pl-6">Voucher ID</th>
                        <th className="p-4">Party Company</th>
                        <th className="p-4">Paid Date</th>
                        <th className="p-4">Deposit Mode</th>
                        <th className="p-4 text-right">Amount Received</th>
                        <th className="p-4 font-sans">Payment Notes / Reference</th>
                        <th className="p-4 text-right pr-6">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {filteredTransactions.filter(tx => tx.type === 'Payment-In').map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 font-bold text-blue-650">{tx.id}</td>
                          <td className="p-4 font-sans font-extrabold text-slate-800 uppercase max-w-[180px] truncate">{tx.party}</td>
                          <td className="p-4 text-slate-450">{tx.date}</td>
                          <td className="p-4 font-sans font-black text-slate-500 uppercase">{tx.mode === 'Bank' ? 'Bank Deposit' : tx.mode === 'Cash' ? 'Cash Deposit' : tx.mode === 'UPI' ? 'UPI Transfer' : 'Cheque'}</td>
                          <td className="p-4 text-right font-black text-emerald-600">{formatCurrency(tx.amount)}</td>
                          <td className="p-4 font-sans text-slate-500 max-w-[240px] truncate">{tx.remarks}</td>
                          <td className="p-4 text-right pr-6">
                            <button onClick={() => deleteVyaparRecord(tx.id)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.filter(tx => tx.type === 'Payment-In').length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                            No Payment In receipts found in books.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {dashboardView === 'purchases' && (
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-105">
                      <tr>
                        <th className="p-4 pl-6">Purchase ID</th>
                        <th className="p-4">Recipient Vendor Name</th>
                        <th className="p-4">Raw Category</th>
                        <th className="p-4">Purchased Date</th>
                        <th className="p-4">Payment Mode</th>
                        <th className="p-4 font-sans">Settlement Status</th>
                        <th className="p-4 text-right">Amount Outward</th>
                        <th className="p-4 font-sans">Payment Notes / Reference</th>
                        <th className="p-4 text-right pr-6">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {filteredTransactions.filter(tx => tx.type === 'Purchase').map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 font-bold text-slate-650">{tx.id}</td>
                          <td className="p-4 font-sans font-extrabold text-slate-800 uppercase max-w-[180px] truncate">{tx.party}</td>
                          <td className="p-4 font-sans font-bold text-slate-500">{tx.raw.category === 'Raw Lead Modules' ? 'Raw Lead Graphene Plates' : tx.raw.category || 'Raw Material'}</td>
                          <td className="p-4 text-slate-450">{tx.date}</td>
                          <td className="p-4 font-sans font-sans font-black text-slate-500 uppercase">{tx.mode === 'Bank' ? 'Bank Deposit' : tx.mode === 'Cash' ? 'Cash Book' : tx.mode === 'UPI' ? 'UPI Transfer' : 'Cheque'}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                              tx.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-rose-50 text-rose-700 border border-rose-150"
                            )}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-rose-600">{formatCurrency(tx.amount)}</td>
                          <td className="p-4 font-sans text-slate-500 max-w-[200px] truncate">{tx.remarks}</td>
                          <td className="p-4 text-right pr-6">
                            <button onClick={() => deleteVyaparRecord(tx.id)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.filter(tx => tx.type === 'Purchase').length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                            No raw materials purchases found in books.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {dashboardView === 'expenses' && (
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-105">
                      <tr>
                        <th className="p-4 pl-6">Expense ID</th>
                        <th className="p-4">Payee / Recipient</th>
                        <th className="p-4 font-sans">Operational Expense Category</th>
                        <th className="p-4">Paid Date</th>
                        <th className="p-4">Paid Via</th>
                        <th className="p-4 font-sans">Settlement Status</th>
                        <th className="p-4 text-right">Amount Outward</th>
                        <th className="p-4 font-sans">Payment Notes / Reference</th>
                        <th className="p-4 text-right pr-6">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {filteredTransactions.filter(tx => tx.type === 'Expense').map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 font-bold text-amber-650">{tx.id}</td>
                          <td className="p-4 font-sans font-extrabold text-slate-800 uppercase max-w-[180px] truncate">{tx.party}</td>
                          <td className="p-4 font-sans font-bold text-slate-500">{tx.raw.category || 'Miscellaneous'}</td>
                          <td className="p-4 text-slate-450">{tx.date}</td>
                          <td className="p-4 font-sans font-black text-slate-500 uppercase">{tx.mode === 'Bank' ? 'Bank Deposit' : tx.mode === 'Cash' ? 'Cash Book' : tx.mode === 'UPI' ? 'UPI Transfer' : 'Cheque'}</td>
                          <td className="p-4 font-sans">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                              tx.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-rose-50 text-rose-700 border border-rose-150"
                            )}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-rose-600">{formatCurrency(tx.amount)}</td>
                          <td className="p-4 font-sans text-slate-500 max-w-[200px] truncate">{tx.remarks}</td>
                          <td className="p-4 text-right pr-6">
                            <button onClick={() => deleteVyaparRecord(tx.id)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.filter(tx => tx.type === 'Expense').length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                            No operational expense records found in books.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'parties' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans">
              
              {/* Directory Column */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Customer (Dealer) Books Directory</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search customer party..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-8 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary-500/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="divide-y divide-slate-100/60 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {dealers.filter(d => d.company.toLowerCase().includes(searchTerm.toLowerCase())).map(dl => {
                    const bal = getPartyBalance(dl.id);
                    return (
                      <button
                        key={dl.id}
                        onClick={() => setSelectedPartyForLedger(dl.id)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between border mt-1.5",
                          selectedPartyForLedger === dl.id
                            ? "bg-slate-900 border-slate-950 text-white"
                            : "bg-white border-transparent hover:bg-slate-50 text-slate-800"
                        )}
                      >
                        <div>
                          <p className="font-extrabold text-[12px] uppercase leading-snug truncate">{dl.company}</p>
                          <p className={cn("text-[9px] font-bold uppercase mt-0.5", selectedPartyForLedger === dl.id ? "text-slate-400" : "text-slate-450")}>{dl.location || 'Gujarat Main'}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-[11px] font-mono font-black", bal > 0 ? "text-emerald-500" : bal < 0 ? "text-amber-500" : "text-slate-400")}>
                            {bal > 0 ? `+${formatCurrency(bal)}` : formatCurrency(bal)}
                          </p>
                          <span className="text-[8px] font-black tracking-wider uppercase opacity-80 block">{bal > 0 ? 'To Receive' : 'Settled'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Statement / Ledger Book pane */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 min-h-[400px] flex flex-col justify-between">
                {selectedPartyForLedger ? (
                  (() => {
                    const dl = dealers.find(d => d.id === selectedPartyForLedger);
                    const ledger = getPartyLedger(selectedPartyForLedger);
                    const bal = getPartyBalance(selectedPartyForLedger);
                    return (
                      <div className="space-y-6">
                        {/* Header metadata */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150">
                          <div>
                            <span className="text-[9px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded uppercase border border-primary-100">Party Ledger Book</span>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1 leading-none">{dl?.company}</h3>
                            <p className="text-[9px] font-mono font-semibold text-slate-400 mt-1 uppercase">GSTIN: 24AAAPC{1000 + Number(dl?.id.match(/\d+/)?.[0] || 1)}K1ZO</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const itemsSummary = ledger.map(item => `${item.date}: ${item.type} of ${formatCurrency(item.amount)} (${item.remarks})`).join('\n');
                                const totalMsg = `LEDGER STATEMENT FOR ${dl?.company}\nDate: ${new Date().toLocaleDateString()}\nOutstanding Balance: ${formatCurrency(bal)}\n\nStatements:\n${itemsSummary}\n\nPlease settle any due invoice outstanding. Direct UPI payments accepted. Thank you.`;
                                navigator.clipboard.writeText(totalMsg);
                                alert("Full double-entry Party Ledger statement copied to system clipboard! You can paste in WhatsApp/Email to send directly.");
                              }}
                              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase hover:text-slate-900 transition-colors rounded-lg flex items-center gap-1"
                            >
                              <Send size={10} className="text-slate-450" /> Send Reminder Statement
                            </button>
                            <button
                              onClick={() => {
                                setModalType('Payment-In');
                                setTxForm(prev => ({ ...prev, partyId: selectedPartyForLedger || '' }));
                              }}
                              className="px-3 py-2 bg-blue-600 hover:brightness-110 text-white text-[10px] font-black uppercase rounded-lg shadow"
                            >
                              + Receive Payment
                            </button>
                          </div>
                        </div>

                        {/* Statement Table */}
                        <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/10">
                          <table className="w-full text-left border-collapse font-mono text-[10px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-450 font-black uppercase tracking-wider border-b border-slate-100 text-[8px]">
                                <th className="p-3 pl-4">Date</th>
                                <th className="p-3">Voucher Ref</th>
                                <th className="p-3">Type</th>
                                <th className="p-3 text-right">Debit / Sale (+)</th>
                                <th className="p-3 text-right">Credit / Rec (-)</th>
                                <th className="p-3 text-right pr-4">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {ledger.map((ld, i) => (
                                <tr key={i} className="hover:bg-slate-50/40">
                                  <td className="p-3 pl-4 text-slate-450">{ld.date}</td>
                                  <td className="p-3 font-bold text-primary-650">{ld.id}</td>
                                  <td className="p-3 font-sans font-bold uppercase text-slate-500">{ld.type}</td>
                                  <td className="p-3 text-right text-slate-920 font-bold">{ld.type.includes('Sale') ? formatCurrency(ld.amount) : '—'}</td>
                                  <td className="p-3 text-right text-emerald-600 font-bold">{ld.type === 'Payment-In' ? formatCurrency(ld.amount) : '—'}</td>
                                  <td className="p-3 text-right pr-4 font-black text-slate-900">{formatCurrency(ld.runningBalance)}</td>
                                </tr>
                              ))}
                              {ledger.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="p-10 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                                    No historical voucher records exist for this party ledger book.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary ledger state footer */}
                        <div className={cn(
                          "p-4 rounded-xl flex items-center justify-between text-xs font-black uppercase tracking-wider border",
                          bal > 0 ? "bg-red-50 text-rose-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        )}>
                          <span>Party balance status as of today:</span>
                          <span className="font-bold underline">{bal > 0 ? `To Receive: ${formatCurrency(bal)}` : 'SETTLED / IN ADVANCE'}</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                    <User className="stroke-[1.5] text-slate-300 mb-2 truncate" size={40} />
                    <p className="text-[11px] font-black uppercase tracking-widest leading-loose">Select a customer node from left pane</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-xs mt-0.5">Click any party to view automatic ledger transactions statements and compile fast remittances</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'tax' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-[14px] font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 leading-none">
                  <FileSpreadsheet className="text-primary-600" size={16} /> GST Registry Ledger (Q1-Q2 2026)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Automatic SGST / CGST split calculations, GSTR-1, and input tax credit audit files
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 border border-slate-250/20 rounded-xl text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Total Outward GST (Collected)</span>
                  <p className="text-xl font-mono font-black text-rose-600 mt-1">{formatCurrency(gstOutwardCollected)}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Split: {formatCurrency(gstOutwardCollected/2)} CGST + {formatCurrency(gstOutwardCollected/2)} SGST</p>
                </div>
                <div className="p-5 bg-slate-50 border border-slate-250/20 rounded-xl text-left">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Inward GST Credit (ITC)</span>
                  <p className="text-xl font-mono font-black text-emerald-600 mt-1">{formatCurrency(gstInwardCredit)}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Split: {formatCurrency(gstInwardCredit/2)} CGST + {formatCurrency(gstInwardCredit/2)} SGST</p>
                </div>
                <div className="p-5 bg-slate-900 text-white rounded-xl text-left">
                  <span className="text-[9px] font-extrabold text-primary-400 uppercase tracking-widest">Net GST Liability (Outward - Inward)</span>
                  <p className="text-xl font-mono font-black text-primary-400 mt-1">{formatCurrency(gstNetLiability)}</p>
                  <p className="text-[8px] font-bold text-slate-350 uppercase mt-1">Subject to adjustments on filing GSTR-3B</p>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 text-slate-450 text-[10px] font-bold">
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary-500" /> Fully synchronized with NIC E-Way Portal & GSTR-1 frameworks</span>
                <button
                  onClick={() => {
                    const fileContent = JSON.stringify({
                      biller: data?.businessProfile?.companyName || "Arcenol Corp",
                      gstin: "24AAACA0405R1ZX",
                      timestamp: new Date().toISOString(),
                      outwardSalesGST: gstOutwardCollected,
                      inwardPurchaseGST: gstInwardCredit,
                      netTaxLiability: gstNetLiability
                    }, null, 2);
                    const blob = new Blob([fileContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `GSTR-1_Report_${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:brightness-110 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow cursor-pointer self-start sm:self-center"
                >
                  <Download size={11} /> Export GSTR JSON Register
                </button>
                <button
                  onClick={() => {
                    downloadReportDataAsPDF({
                      title: "GSTR-1 GST Tax Liability Audit Register",
                      subtitle: "GSTIN: 24AAACA0405R1ZX | Registered Entity: Arcenol Energies",
                      headers: ["Metric Component", "Base Value (₹)", "Tax Rate (%)", "Calculated GST (₹)"],
                      rows: [
                        ["Outward Sales GST Collected", formatCurrency((data?.invoices || []).reduce((acc: number, i: any) => acc + (i.total || 0), 0)), "18%", formatCurrency(gstOutwardCollected)],
                        ["Inward Purchase Input Tax Credit", formatCurrency(vyaparRecords.filter(r => r.type === 'Purchase').reduce((acc, r) => acc + (r.amount || 0), 0)), "18%", formatCurrency(gstInwardCredit)],
                        ["Net Payable GST Tax Liability", "-", "-", formatCurrency(gstNetLiability)]
                      ],
                      filename: `GST_Tax_Liability_Report.pdf`
                    });
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow cursor-pointer self-start sm:self-center"
                  title="Download GST Report as PDF"
                >
                  <FileText size={11} /> Download GST PDF
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Create Sale Invoice form */
        <div className="animate-in slide-in-from-right duration-250 font-sans">
           <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b bg-slate-50 flex justify-between items-center text-slate-900 relative">
                 <div className="flex items-center space-x-4">
                    <button onClick={() => setView('list')} className="p-2.5 hover:bg-white rounded-xl border border-slate-200 transition-all bg-white">
                       <ArrowLeft size={16} className="text-primary-600" />
                    </button>
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight italic text-slate-900 leading-none">New Sale Invoice</h3>
                       <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Voucher Number: Auto-assigned GSTR series</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Biller ID Series</p>
                    <p className="font-mono font-black text-sm italic tracking-tight text-primary-600">VCHP-2026</p>
                 </div>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Left details */}
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                       <h4 className="text-[10px] font-black text-primary-650 uppercase flex items-center tracking-widest">
                          <User size={13} className="mr-1.5" /> Client / Party node Information
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                             <div className="flex justify-between items-center mb-2">
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Receiver Party (Customers Directory)</label>
                                <button
                                   type="button"
                                   onClick={() => setShowQuickAddCustomer(true)}
                                   className="text-[9px] font-black text-primary-650 hover:text-primary-700 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                   <Plus size={10} /> Quick Add Customer
                                </button>
                             </div>
                             <select 
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20" 
                                value={selectedDealer?.id || ''} 
                                onChange={(e) => {
                                    const d = dealers.find(item => item.id === e.target.value);
                                    setSelectedDealer(d);
                                }}
                             >
                                <option value="">Select a customer branch...</option>
                                {dealers.map(d => <option key={d.id} value={d.id}>{d.company} — {d.location}</option>)}
                             </select>
                             {selectedDealer && (
                                <div className="mt-3 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2 text-xs">
                                   <div className="flex justify-between items-center border-b border-emerald-200/50 pb-1.5">
                                      <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{selectedDealer.company || selectedDealer.name}</span>
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[8px] uppercase tracking-wider rounded border border-emerald-300">Party Details Fetched</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                      <div>
                                         <span className="text-slate-400 font-extrabold uppercase block text-[8px]">GSTIN Registration</span>
                                         <span className="font-black text-slate-800">{selectedDealer.gstin || selectedDealer.gst || `24AAACG${1000 + Number(selectedDealer.id?.match(/\d+/)?.[0] || 101)}A1Z5`}</span>
                                      </div>
                                      <div>
                                         <span className="text-slate-400 font-extrabold uppercase block text-[8px]">Location Hub</span>
                                         <span className="font-black text-slate-800">{selectedDealer.location || selectedDealer.address || "Main City Hub, Gujarat"}</span>
                                      </div>
                                      <div>
                                         <span className="text-slate-400 font-extrabold uppercase block text-[8px]">Contact Number</span>
                                         <span className="font-black text-slate-800">{selectedDealer.phone || selectedDealer.contact || "+91 98765 43210"}</span>
                                      </div>
                                      <div>
                                         <span className="text-slate-400 font-extrabold uppercase block text-[8px]">Ledger Status</span>
                                         <span className="font-black text-emerald-700">APPROVED CREDIT</span>
                                      </div>
                                   </div>
                                </div>
                             )}
                          </div>
                          
                          <div>
                             <label className="block text-[8px] font-black text-slate-400 mb-2 uppercase tracking-widest">Active Biller Agent Signature</label>
                             <div className="bg-white p-2.5 rounded-xl border border-slate-200/50 text-xs font-extrabold uppercase text-slate-800 tracking-tight flex items-center gap-1">
                                <ShieldCheck size={14} className="text-primary-600" />
                                {currentUser?.name || "Finance Executive"} ({currentUser?.role || "MASTER BILLER"})
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                       <h4 className="text-[10px] font-black text-slate-900 uppercase flex items-center tracking-widest">
                          <ShoppingBag size={13} className="mr-1.5 text-primary-600" /> Choose Goods & Serial Numbers (HSN-8507)
                       </h4>
                       <div className="space-y-3">
                           {allBillingProducts.map((product: any) => {
                               const readyUnits = availableStock.filter((fg: any) => matchFgToProduct(fg, product));
                               return (
                               <div key={product.id} className="p-4 bg-slate-50/40 rounded-xl border border-slate-100/80 flex justify-between items-center group transition-all">
                                   <div>
                                       <p className="font-black text-slate-900 uppercase text-xs italic leading-none">{product.name}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref base: {formatCurrency(product.price)} / Module</p>
                                   </div>
                                   <div className="flex items-center space-x-4">
                                       <div className="text-right">
                                           <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none">Ready Stock</span>
                                           <p className="font-black text-xs text-primary-600 italic mt-0.5">
                                               {readyUnits.length} units ready
                                           </p>
                                       </div>
                                       <button 
                                          onClick={() => { 
                                              setActiveModelForStock(product.id); 
                                              setIsSelectingStock(true); 
                                          }}
                                          className="bg-white text-primary-600 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border border-primary-100 hover:bg-primary-600 hover:text-white transition-all shadow-sm active:scale-95"
                                       >
                                          Pick Serials
                                       </button>
                                   </div>
                               </div>
                               );
                           })}
                       </div>
                    </div>

                    {/* Cart Summary Matrix */}
                    <div className="bg-slate-50/30 p-5 rounded-2xl border border-slate-100 font-mono text-[10px] space-y-3">
                       <span className="text-[8px] font-black text-slate-400 uppercase block tracking-widest">Selected Invoicing Artifacts</span>
                       <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="bg-white/50 text-[8px] font-black text-slate-400 uppercase border-b border-slate-100">
                              <tr>
                                 <th className="p-2">Description</th>
                                 <th className="p-2">Assigned Serials</th>
                                 <th className="p-2 text-right">Qty</th>
                                 <th className="p-2 text-right">Base rate</th>
                                 <th className="p-2 text-right">Net val</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100/60 font-mono">
                              {cart.map((item, idx) => {
                                  const prod = allBillingProducts.find((p: any) => p.id === item.modelId || matchFgToProduct({ model: item.modelId }, p));
                                  const prodName = prod?.name || item.modelId;
                                  const unitPrice = item.price || prod?.price || 35000;
                                  return (
                                      <tr key={idx} className="bg-white">
                                          <td className="p-2 font-black text-slate-800 uppercase tracking-tight text-xs">{prodName}</td>
                                          <td className="p-2">
                                              <div className="flex flex-wrap gap-1">
                                                  {item.serials.map((s: string) => (
                                                      <span key={s} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[8px] font-extrabold border border-emerald-200 flex items-center gap-1 font-mono">
                                                          <CheckCircle2 size={9} className="text-emerald-600" />
                                                          {s}
                                                      </span>
                                                  ))}
                                              </div>
                                          </td>
                                          <td className="p-2 text-right font-bold text-slate-700">{item.serials.length} PCS</td>
                                          <td className="p-2 text-right text-slate-500">{formatCurrency(unitPrice)}</td>
                                          <td className="p-2 font-black text-slate-900 text-right">{formatCurrency(unitPrice * item.serials.length)}</td>
                                      </tr>
                                  );
                              })}
                              {cart.length === 0 && (
                                  <tr>
                                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest py-10">Matrix clipboard is currently empty. Pick units above.</td>
                                  </tr>
                              )}
                           </tbody>
                        </table>
                       </div>
                    </div>
                 </div>

                 {/* Checkout / Summary sidebar */}
                 <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                       <h4 className="text-[10px] font-black text-slate-900 uppercase border-b border-slate-100 pb-3 tracking-widest flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-primary-600" /> Invoice Valuation Summary
                       </h4>
                       
                       <div className="space-y-3 pb-6 border-b border-slate-100 text-xs font-bold text-slate-450 uppercase tracking-wider">
                          <div className="flex justify-between items-center">
                             <span>Basis Sub-total</span>
                             <span className="text-slate-900 font-mono">{formatCurrency(cart.reduce((a, b) => a + (b.price * b.serials.length), 0))}</span>
                          </div>
                          
                          {/* Vyapar Discount option */}
                          <div className="space-y-1 pt-1">
                             <div className="flex justify-between items-center">
                                <span>Flat Discount (₹)</span>
                                <input 
                                  type="number" 
                                  placeholder="0"
                                  value={invoiceItemDiscount || ''}
                                  onChange={(e) => setInvoiceItemDiscount(Number(e.target.value))}
                                  className="w-24 px-2 py-0.5 border border-slate-200 rounded text-right font-mono text-xs text-slate-900 outline-none"
                                />
                             </div>
                          </div>

                          <div className="flex justify-between items-center text-rose-600">
                             <span>GST Tax rate (18%)</span>
                             <span className="font-mono">{formatCurrency(Math.max(0, cart.reduce((a, b) => a + (b.price * b.serials.length), 0) - invoiceItemDiscount) * 0.18)}</span>
                          </div>

                          <div className="space-y-1.5 pt-2">
                             <label className="block text-[8px] font-black text-slate-400 tracking-widest mb-1">Receipt terms / Mode</label>
                             <select
                               value={invoicePaymentMode}
                               onChange={(e) => setInvoicePaymentMode(e.target.value as any)}
                               className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-800 uppercase"
                             >
                               <option value="Credit">Credit (Mark Unpaid Ledger)</option>
                               <option value="Cash">Cash Deposit</option>
                               <option value="Bank">Bank Ledger Account</option>
                               <option value="UPI">Insta-UPI deposit</option>
                             </select>
                          </div>
                       </div>

                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Grand net</span>
                          <span className="text-2xl font-black text-primary-650 italic tracking-tighter">
                             {formatCurrency(Math.max(0, cart.reduce((a, b) => a + (b.price * b.serials.length), 0) - invoiceItemDiscount) * 1.18)}
                          </span>
                       </div>
                       
                       <button 
                         disabled={!selectedDealer || cart.length === 0}
                         onClick={handleCreateInvoice}
                         className="w-full py-4 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-xs uppercase tracking-widest shadow hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Deploy GSTR Invoice Receipts
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Serial Picker Dialog Modal */}
      {isSelectingStock && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[110] p-4">
              <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <h3 className="font-black text-base text-slate-900 uppercase italic leading-none">Pick Serial Numbers</h3>
                        <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest mt-1 font-mono">{activeModelForStock}</p>
                      </div>
                      <button onClick={() => setIsSelectingStock(false)} className="p-1 px-2.5 bg-white border border-slate-200 rounded hover:bg-slate-100 font-extrabold text-xs">✕</button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 select-scrollbar">
                          {availableStock.filter((fg: any) => matchFgToProduct(fg, { id: activeModelForStock, name: activeModelForStock })).map((fg: any) => {
                              const isPicked = cart.some(c => matchFgToProduct({ model: c.modelId }, { id: activeModelForStock, name: activeModelForStock }) && c.serials.includes(fg.serial));
                              return (
                                  <button 
                                    key={fg.id}
                                    type="button"
                                    onClick={() => addToCart(fg.model || activeModelForStock, fg.serial)}
                                    className={cn(
                                        "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-16",
                                        isPicked ? "bg-primary-50 border-primary-500 scale-[1.01]" : "bg-white border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                      <span className="text-[7px] font-black text-slate-400 uppercase font-mono tracking-wider">{fg.warehouse}</span>
                                      <FormattedSerial serial={fg.serial} className="font-mono text-[10px] font-black text-slate-800 tracking-wide mt-1 uppercase" />
                                      {isPicked && <CheckCircle2 size={13} className="text-primary-600 absolute right-2.5 top-2.5" />}
                                  </button>
                              );
                          })}
                          {availableStock.filter((fg: any) => matchFgToProduct(fg, { id: activeModelForStock, name: activeModelForStock })).length === 0 && (
                              <div className="col-span-full py-8 text-center space-y-4">
                                  <p className="text-slate-400 italic font-black uppercase text-[10px] tracking-widest">No available units ready for invoicing for {activeModelForStock}.</p>
                                  <p className="text-slate-500 text-xs font-medium max-w-sm mx-auto">Finished goods must pass assembly and QC testing in Production before they can be billed.</p>
                                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                      <button
                                          type="button"
                                          onClick={async () => {
                                              try {
                                                  const res = await fetch('/api/production/complete', {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({
                                                          model: activeModelForStock || 'BAT-NEXT-200',
                                                          qty: 1,
                                                          warehouse: 'Main Warehouse',
                                                          rack: 'BIN-01'
                                                      })
                                                  });
                                                  const resData = await res.json();
                                                  await refetch();
                                                  const newSerial = resData?.serials?.[0];
                                                  if (newSerial) {
                                                      addToCart(activeModelForStock || 'BAT-NEXT-200', newSerial);
                                                  }
                                              } catch (e) {
                                                  console.error(e);
                                              }
                                          }}
                                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                                      >
                                          <Zap size={14} /> Quick-Produce 1 Ready Unit
                                      </button>
                                      {setActiveTab && (
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setIsSelectingStock(false);
                                                  setActiveTab('production-hub');
                                              }}
                                              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                                          >
                                              <ClipboardCheck size={14} className="text-emerald-400" /> Open Production QC Hub
                                          </button>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                      <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button onClick={() => setIsSelectingStock(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-wider shadow shadow-emerald-600/10">Save Picking Selection</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Quick transactional creation modal overlays */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[115] p-4 text-sans">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tight leading-none">Record Voucher Entry</h3>
                <p className="text-[9px] font-black text-primary-650 uppercase tracking-widest mt-1.5 leading-none">Deploy accounting voucher directly to cash balance</p>
              </div>
              <button 
                onClick={() => setModalType(null)} 
                className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-450 hover:text-slate-900 transition-colors font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveVyaparRecord} className="p-6 space-y-4 text-left font-sans">
              {modalType === 'Payment-In' ? (
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Select Party Company</label>
                  <select
                    required
                    value={txForm.partyId}
                    onChange={(e) => setTxForm({ ...txForm, partyId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 font-sans"
                  >
                    <option value="">Choose party customer...</option>
                    {dealers.map(d => <option key={d.id} value={d.id}>{d.company} ({d.location || 'Central'})</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Party / Recipient vendor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g Lead-Tech Electrodes Ltd, Torrent Power"
                    value={txForm.partyName}
                    onChange={(e) => setTxForm({ ...txForm, partyName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 font-sans"
                  />
                </div>
              )}

              {modalType === 'Expense' && (
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Operational Expense Category</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 font-sans"
                  >
                    <option value="Electricity & Utility">Electricity & Utility</option>
                    <option value="Logistics/Freight">Logistics/Freight</option>
                    <option value="Factory salary/wage">Factory salary/wage</option>
                    <option value="Machinery Maintenance">Machinery Maintenance</option>
                    <option value="Office Stationery & snacks">Office Stationery & snacks</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              )}

              {modalType === 'Purchase' && (
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Raw Components Category</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 font-sans"
                  >
                    <option value="Raw Lead Modules">Raw Lead Graphene Plates</option>
                    <option value="Acid electrolyte canisters">Acid electrolyte canisters</option>
                    <option value="Polymer structural casings">Polymer structural casings</option>
                    <option value="Imported safety grids">Imported safety internal valves</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 font-mono outline-none focus:ring-2 focus:ring-primary-500/10"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Receipt Deposit mode</label>
                  <select
                    value={txForm.mode}
                    onChange={(e) => setTxForm({ ...txForm, mode: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 font-sans"
                  >
                    <option value="Bank">Bank Deposit</option>
                    <option value="Cash">Cash Book</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cheque">Physical Cheque</option>
                  </select>
                </div>
              </div>

              {modalType !== 'Payment-In' && (
                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Settlement Status</label>
                  <select
                    value={txForm.status}
                    onChange={(e) => setTxForm({ ...txForm, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 font-sans"
                  >
                    <option value="PAID">Paid (Decrease dynamic book balance)</option>
                    <option value="UNPAID">Pending Credit (Increase Payables)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 label-sans">Payment notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPI ID: 49301030 @ hdfc"
                  value={txForm.remarks}
                  onChange={(e) => setTxForm({ ...txForm, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none font-sans focus:ring-2 focus:ring-primary-500/10 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-white rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10"
                >
                  Confirm voucher transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Full Print Dialog Modal */}
      {selectedInvoice && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[120] p-4 overflow-y-auto">
              <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl my-8 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                  
                  {/* Top Print control menu bar */}
                  <div className="p-4.5 bg-slate-50 border-b border-slate-205 flex flex-wrap items-center justify-between gap-3 no-print">
                      <div className="flex items-center space-x-2">
                        <FileText size={18} className="text-primary-600" />
                        <div>
                           <h4 className="font-black text-slate-900 uppercase text-xs">A4 GST Invoice desk</h4>
                           <p className="text-[9px] text-slate-405 font-mono uppercase font-bold">{selectedInvoice.id} operational check</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                          <button onClick={() => downloadElementAsPDF("tax-invoice-printable-card", `Invoice_${selectedInvoice.id}.pdf`)} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer" title="Download Tax Invoice as PDF File">
                             <Download size={11} /> Download PDF
                          </button>
                          
                          <button onClick={() => window.print()} className="px-3 py-2 bg-slate-900 hover:brightness-110 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer" title="Print Invoice">
                             <Printer size={11} /> Print
                          </button>
                          
                          {!isEditingInvoice ? (
                            <button onClick={() => {
                               setEditingInvoiceForm({
                                  status: selectedInvoice.status || 'UNPAID',
                                  subtotal: (selectedInvoice.total || 0) - (selectedInvoice.tax || 0),
                                  tax: selectedInvoice.tax || 0
                               });
                               setIsEditingInvoice(true);
                            }} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                               <Edit size={11} /> Edit Field metrics
                            </button>
                          ) : (
                            <button onClick={handleUpdateInvoice} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                               <CheckCircle2 size={11} /> Save updates
                            </button>
                          )}

                          <button onClick={() => { setSelectedInvoice(null); setIsEditingInvoice(false); }} className="px-3 py-2 border border-slate-250 text-slate-500 rounded-lg text-[10px] bg-white hover:bg-slate-50">✕ Close</button>
                      </div>
                  </div>

                  {/* Quick Edit pane inline */}
                  {isEditingInvoice && (
                      <div className="p-5 bg-amber-50 border-b border-amber-100 grid grid-cols-3 gap-3 no-print">
                         <div>
                            <span className="text-[7.5px] font-black text-slate-400 block mb-1">PAYMENT STATUS</span>
                            <select 
                               className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] font-black"
                               value={editingInvoiceForm.status}
                               onChange={(e) => setEditingInvoiceForm({...editingInvoiceForm, status: e.target.value})}
                            >
                               <option value="PAID">PAID</option>
                               <option value="UNPAID">UNPAID</option>
                            </select>
                         </div>
                         <div>
                            <span className="text-[7.5px] font-black text-slate-400 block mb-1">EDIT VALUATION sub (₹)</span>
                            <input 
                               type="number"
                               className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] font-mono"
                               value={editingInvoiceForm.subtotal}
                               onChange={(e) => setEditingInvoiceForm({...editingInvoiceForm, subtotal: Number(e.target.value)})}
                            />
                         </div>
                         <div>
                            <span className="text-[7.5px] font-black text-slate-400 block mb-1">EDIT TAX COMP (₹)</span>
                            <input 
                               type="number"
                               className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] font-mono"
                               value={editingInvoiceForm.tax}
                               onChange={(e) => setEditingInvoiceForm({...editingInvoiceForm, tax: Number(e.target.value)})}
                            />
                         </div>
                      </div>
                  )}

                  {/* Tax Invoice Document Page */}
                  <div className="p-8 overflow-y-auto flex-grow bg-slate-50/50 print-section">
                      <div id="tax-invoice-printable-card" className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto print-section print:border-none print:shadow-none print:p-0">
                          {/* Invoice Letterhead */}
                          <div className="flex justify-between items-start pb-6 border-b border-slate-200 mb-6 font-sans">
                             <div>
                                <span className="text-lg sm:text-xl font-black italic text-slate-900 tracking-tight uppercase block leading-none">
                                   {data?.businessProfile?.companyName || "ARCENOL ENERGY SOLUTIONS"}
                                </span>
                                <span className="text-[11px] text-slate-605 font-bold uppercase block tracking-wider mt-2 leading-snug">
                                   Regd Off: Block G, Electron GIDC City, Gandhinagar - 382025
                                </span>
                                <span className="text-[11px] text-slate-605 font-bold uppercase tracking-wider block leading-snug mt-1">
                                   GSTIN: 24AAHCA9192M1ZP | State Code: 24 (Gujarat)
                                </span>
                             </div>
                             <div className="text-right">
                                <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase border border-primary-100">
                                   TAX INVOICE VOUCHER
                                </span>
                                <p className="font-mono font-black text-base text-slate-900 mt-2.5 tracking-wide">{selectedInvoice.id}</p>
                                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-1 uppercase">Date: {selectedInvoice.date}</p>
                             </div>
                          </div>

                          {/* Customer & billing profile */}
                          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-dashed border-slate-200 font-sans text-left">
                             <div>
                                <span className="text-[10px] sm:text-[11px] font-black text-slate-500 tracking-wider block mb-1.5 uppercase">Billed To (Party):</span>
                                <p className="font-extrabold text-slate-900 text-sm uppercase leading-tight">
                                   {(() => {
                                      const d = dealers.find(dl => dl.id === selectedInvoice.dealerId);
                                      return d?.company || "Walk-In Customer Entity";
                                   })()}
                                </p>
                                <p className="text-[11px] font-bold text-slate-605 uppercase tracking-wide mt-1.5">
                                   {(() => {
                                      const d = dealers.find(dl => dl.id === selectedInvoice.dealerId);
                                      return d?.location || "Gujarat Node Base";
                                   })()}
                                </p>
                                <p className="text-[10px] font-mono font-black text-slate-600 uppercase tracking-widest mt-1.5">
                                   GSTIN: 24AAAPC{1000 + Number(selectedInvoice.dealerId?.match(/\d+/)?.[0] || 5)}K1ZO
                                </p>
                             </div>
                             <div className="text-right font-sans text-[11px] text-slate-600 space-y-1">
                                <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Operational checks</span>
                                <p className="font-bold text-slate-800">Clearance: core treasury node</p>
                                <p className="font-mono text-slate-700">Logistics Code: FREIGHT-3930-GJ</p>
                                <p className={cn(
                                   "font-extrabold font-sans tracking-wide px-2 py-0.5 rounded inline-block text-[10px] sm:text-[11px]",
                                   displayStatus === "PAID" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-rose-50 text-rose-700 border border-rose-150"
                                )}>Status: {displayStatus}</p>
                             </div>
                          </div>

                          {/* Items table list */}
                          <div className="mb-6 font-mono text-[11px] sm:text-xs">
                              <table className="w-full text-left">
                                  <thead>
                                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sm:text-[11px] border-b border-slate-300">
                                          <th className="p-2 w-10 text-center">Sr</th>
                                          <th className="p-2">Description of Goods</th>
                                          <th className="p-2 text-center">Qty / UoM</th>
                                          <th className="p-2 text-right">Unit Rate</th>
                                          <th className="p-2 text-right">Taxable Amount</th>
                                          <th className="p-2 text-right font-bold">Total (18% Net)</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                      {(selectedInvoice.items || []).map((item: any, index: number) => {
                                          const prod = allBillingProducts.find((p: any) => p.id === item.model || matchFgToProduct({ model: item.model }, p));
                                          return (
                                              <tr key={index}>
                                                  <td className="p-2 text-center text-slate-500 font-bold">{index + 1}</td>
                                                  <td className="p-2 font-sans font-bold text-slate-800">
                                                      <span className="uppercase text-xs block">{prod?.name || item.model}</span>
                                                      {item.serials && item.serials.length > 0 && (
                                                          <span className="text-[9.5px] text-slate-500 font-mono tracking-wide mt-1 block leading-normal max-w-[280px]">
                                                             Serials: {item.serials.join(', ')}
                                                          </span>
                                                      )}
                                                  </td>
                                                  <td className="p-2 text-center font-bold text-slate-800">{item.qty || 1} PCS</td>
                                                  <td className="p-2 text-right text-slate-700">{formatCurrency(item.price * scaleFactor)}</td>
                                                  <td className="p-2 text-right font-bold text-slate-800">{formatCurrency(item.price * (item.qty || 1) * scaleFactor)}</td>
                                                  <td className="p-2 text-right font-black text-primary-600">{formatCurrency(item.price * (item.qty || 1) * scaleFactor * (1 + editedTaxRate))}</td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>

                          {/* Tax details breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-left">
                             <div className="text-[10px] sm:text-[11px] text-slate-600 font-sans leading-relaxed space-y-1">
                                <span className="font-extrabold text-slate-700 block mb-1.5 tracking-wider uppercase">GSTR Terms & Seals</span>
                                <p>1. Supply linked for emergency heavy transit battery dispatch.</p>
                                <p>2. Subject to Gandhinagar, Gujarat jurisdiction rules.</p>
                                <p>3. Digitally signed via authorized cryptokey active seal.</p>
                             </div>
                             <div className="space-y-1.5 font-mono text-[11px] sm:text-xs text-right">
                                <div className="flex justify-between text-slate-600 uppercase text-[10px] sm:text-[11px]">
                                    <span>Taxable Net sub-total (A)</span>
                                    <span className="text-slate-800 font-bold">{formatCurrency((displayTotal) - (displayTax))}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 uppercase text-[10px] sm:text-[11px]">
                                    <span>CGST 9% (State share)</span>
                                    <span className="text-slate-800 font-medium">{formatCurrency(displayTax / 2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-655 text-slate-600 uppercase text-[10px] sm:text-[11px]">
                                    <span>SGST 9% (Central share)</span>
                                    <span className="text-slate-800 font-medium">{formatCurrency(displayTax / 2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-250 text-slate-900 font-black italic text-xs sm:text-sm">
                                    <span>GRAND NET (₹)</span>
                                    <span className="text-primary-700 not-italic text-sm sm:text-sm font-black">{formatCurrency(displayTotal)}</span>
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showQuickAddCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden my-8 transform transition-all">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-500/10 rounded-xl text-primary-400">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Quick Register New Customer</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Instant B2B Portal & Billing Node Sync</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowQuickAddCustomer(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomerSubmit} className="p-6 sm:p-8 space-y-5 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spark Electro Ahmedabad"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 focus:bg-white"
                    value={quickCustomerForm.company}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, company: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Customer Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 focus:bg-white"
                    value={quickCustomerForm.category}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, category: e.target.value })}
                  >
                    <option value="Tier 1 Dealer">Tier 1 Dealer</option>
                    <option value="Tier 2 Dealer">Tier 2 Dealer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Certified Service Center">Certified Service Center</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 focus:bg-white"
                    value={quickCustomerForm.contactPerson}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, contactPerson: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">GSTIN Registry</label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 focus:bg-white"
                    value={quickCustomerForm.gstin}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 focus:bg-white"
                    value={quickCustomerForm.phone}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. amit@elitepower.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 focus:bg-white"
                    value={quickCustomerForm.email}
                    onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80 space-y-3.5">
                <span className="text-[9px] font-black text-primary-650 uppercase tracking-widest block">Geographic & Logistics Parameters</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Location / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. GIDC Metoda"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20"
                      value={quickCustomerForm.location}
                      onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajkot"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20"
                      value={quickCustomerForm.city}
                      onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Gujarat"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20"
                      value={quickCustomerForm.state}
                      onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, state: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider">Sales Region Zone</label>
                  <div className="flex gap-2 flex-wrap">
                    {['North', 'South', 'East', 'West', 'Central'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setQuickCustomerForm({ ...quickCustomerForm, region: r })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border uppercase tracking-wider cursor-pointer",
                          quickCustomerForm.region === r
                            ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {r} Zone
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-wider">Bank Details & Credit limit notes</label>
                <textarea
                  placeholder="e.g. HDFC A/C: 50100234... | Credit Limit: 5,00,000 INR"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 focus:bg-white"
                  value={quickCustomerForm.bankDetails}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, bankDetails: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCustomer(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-primary-600/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Register & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
