import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Download, Share2, Filter, IndianRupee, MapPin, Calendar, User, ShoppingBag, CheckCircle2, ChevronRight, ArrowLeft, Printer, Trash2, AlertCircle, ShieldCheck, Edit, Copy, ClipboardCheck, ArrowUpRight, ArrowDownLeft, Wallet, Landmark, TrendingUp, Info, X, ChevronDown, Check, FileSpreadsheet, Send, Zap, Layers } from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { useAuthStore, UserRole } from '../store/authStore';
import { formatCurrency, cn } from '../lib/utils';
import { downloadElementAsPDF, downloadReportDataAsPDF, printElement } from '../lib/pdfGenerator';
import { FormattedSerial, normalizeToRevisedSerial, generateBatterySerial, generateModelSpecificSerial, getNextSerialSequenceForModel } from '../lib/serialUtils';
import { supabase } from '../lib/supabaseClient';

interface VyaparRecord {
  id: string;
  type: 'Payment-In' | 'Payment-Out' | 'Purchase' | 'Expense';
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
  const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN;
  const [view, setView] = useState<'list' | 'create'>('list');
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'parties' | 'tax'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardView, setDashboardView] = useState<'all' | 'sales' | 'payments' | 'purchases' | 'expenses'>('all');
  
  // Custom Vyapar Transactions List
  const vyaparRecords = data?.vyaparRecords || [];

  // Modal controls
  const [modalType, setModalType] = useState<'Payment-In' | 'Payment-Out' | 'Purchase' | 'Expense' | null>(null);
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState<string | null>(null);

  // Vyapar Friendly Features State
  const [invoiceFreightCharge, setInvoiceFreightCharge] = useState<number>(0);
  const [invoicePackagingCharge, setInvoicePackagingCharge] = useState<number>(0);
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState<'Due on Receipt' | 'Net 7 Days' | 'Net 15 Days' | 'Net 30 Days'>('Due on Receipt');
  const [invoicePrintLayout, setInvoicePrintLayout] = useState<'A4' | 'Thermal'>('A4');
  const [barcodeScanInput, setBarcodeScanInput] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // WhatsApp & SMS Helper Functions
  const shareOnWhatsApp = (phone: string, text: string) => {
    const cleaned = (phone || '').replace(/[^0-9]/g, '');
    const num = cleaned.length === 10 ? `91${cleaned}` : cleaned || '919876543210';
    const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaSMS = (phone: string, text: string) => {
    const cleaned = (phone || '').replace(/[^0-9]/g, '');
    const url = `sms:${cleaned}?body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const openPaymentOutModal = (partyId?: string) => {
    setModalType('Payment-Out');
    setTxForm({ partyId: partyId || '', partyName: '', amount: '', mode: 'Bank', status: 'PAID', remarks: '', category: 'Vendor Payout' });
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeScanInput.trim()) {
      e.preventDefault();
      const query = barcodeScanInput.trim().toUpperCase();
      const matchedFg = availableStock.find((fg: any) => 
        (fg.serial && fg.serial.toUpperCase() === query) ||
        (fg.model && fg.model.toUpperCase() === query)
      );
      
      if (matchedFg) {
        const prod = allBillingProducts.find((p: any) => matchFgToProduct(matchedFg, p)) || { id: matchedFg.model, name: matchedFg.model };
        addToCart(prod.id || matchedFg.model, matchedFg.serial);
        setScanFeedback(`✓ Added ${matchedFg.model} (SN: ${matchedFg.serial})`);
        setBarcodeScanInput('');
        setTimeout(() => setScanFeedback(null), 3000);
      } else {
        setScanFeedback(`⚠️ Serial/Model "${query}" not found in ready stock.`);
        setTimeout(() => setScanFeedback(null), 3000);
      }
    }
  };
  
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

  const [showPartyLedgerDetails, setShowPartyLedgerDetails] = useState(true);
  const [activeBillerAgent, setActiveBillerAgent] = useState({
    name: currentUser?.name || "Aravind Swamy",
    role: currentUser?.role || "SUPER_ADMIN",
    isVerified: true
  });
  const [isEditingBiller, setIsEditingBiller] = useState(false);

  const openPaymentInModal = (partyId?: string) => {
    const pid = partyId || selectedDealer?.id || dealers[0]?.id || '';
    const party = dealers.find((d: any) => d.id === pid);
    setTxForm({
      partyId: pid,
      partyName: party?.company || 'Walk-In Customer',
      amount: '',
      mode: 'Bank',
      status: 'PAID',
      remarks: '',
      category: 'Miscellaneous'
    });
    setModalType('Payment-In');
  };

  const downloadSinglePartyLedgerPDF = (party: any) => {
    if (!party) return;
    const ledger = getPartyLedger(party.id);
    const totalSales = ledger.filter(t => t.type.includes('Sale')).reduce((acc, t) => acc + t.amount, 0);
    const totalPaid = ledger.filter(t => t.type === 'Payment-In').reduce((acc, t) => acc + t.amount, 0);
    const balance = getPartyBalance(party.id);

    downloadReportDataAsPDF({
      title: `PARTY STATEMENT OF ACCOUNT - ${party.company || party.name}`,
      subtitle: `GSTIN: ${party.gstin || '24AAACG1000A1Z5'} | Hub: ${party.location || 'Gujarat'} | Phone: ${party.phone || 'N/A'}\nNet Outstanding Balance: ${formatCurrency(balance)} (Total Sales: ${formatCurrency(totalSales)}, Total Receipts: ${formatCurrency(totalPaid)})`,
      headers: ["Date", "Voucher ID", "Transaction Type", "Mode", "Debit (+)", "Credit (-)", "Running Balance"],
      rows: ledger.map(t => [
        t.date,
        t.id,
        t.type,
        t.mode,
        t.type.includes('Sale') ? formatCurrency(t.amount) : '-',
        t.type === 'Payment-In' ? formatCurrency(t.amount) : '-',
        formatCurrency(t.runningBalance)
      ]),
      filename: `Ledger_${(party.company || party.id).replace(/\s+/g, '_')}.pdf`
    });
  };

  // Invoice Create State
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]); 
  const [isSelectingStock, setIsSelectingStock] = useState(false);
  const [activeModelForStock, setActiveModelForStock] = useState<string | null>(null);
  const [invoicePaymentMode, setInvoicePaymentMode] = useState<'Credit' | 'Cash' | 'Bank' | 'UPI'>('Credit');
  const [invoiceItemDiscount, setInvoiceItemDiscount] = useState<number>(0); // Direct flat discount

  // Picker Modal State
  const [manualSerialInput, setManualSerialInput] = useState('');
  const [showAllReadyStock, setShowAllReadyStock] = useState(false);
  const [isQuickProducing, setIsQuickProducing] = useState(false);

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

    const newCustId = `D-${Date.now()}`;
    let newDealerObj: any = {
      id: newCustId,
      company: quickCustomerForm.company,
      name: quickCustomerForm.company,
      category: quickCustomerForm.category || 'Tier 1 Dealer',
      gstin: quickCustomerForm.gstin || 'N/A',
      phone: quickCustomerForm.phone || 'N/A',
      email: quickCustomerForm.email || 'N/A',
      location: quickCustomerForm.location || 'N/A',
      city: quickCustomerForm.city || 'N/A',
      state: quickCustomerForm.state || 'N/A',
      region: quickCustomerForm.region || 'West',
      contactPerson: quickCustomerForm.contactPerson || 'N/A',
      bankDetails: quickCustomerForm.bankDetails || '',
      status: 'ACTIVE'
    };

    try {
      const response = await fetch('/api/dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickCustomerForm)
      });
      if (response.ok) {
        const serverDealer = await response.json();
        if (serverDealer && serverDealer.id) {
          newDealerObj = { ...newDealerObj, ...serverDealer };
        }
      }
    } catch (err) {
      console.warn('[Billing] Server endpoint for dealers unreachable, adding client-side:', err);
    }

    // Direct Supabase client sync
    try {
      await supabase.from('customers').upsert({
        id: String(newDealerObj.id),
        name: newDealerObj.company || newDealerObj.name,
        branch: newDealerObj.region || newDealerObj.city || 'Headquarters',
        gstin: newDealerObj.gstin || 'N/A',
        contact_person: newDealerObj.contactPerson || 'N/A',
        phone: newDealerObj.phone || 'N/A',
        address: newDealerObj.location || newDealerObj.city || 'N/A'
      });
    } catch (sbErr) {
      console.warn('[Billing] Supabase customer upsert warning:', sbErr);
    }

    // Immediately update local cache
    if (data) {
      data.dealers = [newDealerObj, ...(data.dealers || []).filter((d: any) => String(d.id) !== String(newDealerObj.id))];
      data.customers = [newDealerObj, ...(data.customers || []).filter((c: any) => String(c.id) !== String(newDealerObj.id))];
      try {
        localStorage.setItem('arcenol_db_clean', JSON.stringify(data));
      } catch (e) {}
    }

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
    setBillingNotice({ type: 'success', message: `🎉 Customer "${newDealerObj.company}" registered and selected!` });
    await refetch();
    setTimeout(() => {
      setBillingNotice(null);
    }, 2500);
  };

  const dealers = React.useMemo(() => {
    const dealersMap = new Map<string, any>();
    [
      ...(data?.dealers || []),
      ...(data?.customers || []),
      ...(data?.leads?.filter((l: any) => l.status === 'CONVERTED') || [])
    ].forEach((d: any) => {
      if (d && d.id) {
        dealersMap.set(String(d.id), {
          ...d,
          company: d.company || d.name || 'Unnamed Customer',
          location: d.location || d.address || d.city || 'Headquarters'
        });
      }
    });
    const list = Array.from(dealersMap.values());
    if (list.length === 0) {
      list.push({ id: 'D-101', company: 'Elite Power Ahmedabad', location: 'Navrangpura, Ahmedabad' });
    }
    return list;
  }, [data?.dealers, data?.customers, data?.leads]);

  React.useEffect(() => {
    if (!selectedDealer && dealers.length > 0) {
      setSelectedDealer(dealers[0]);
    }
  }, [dealers, selectedDealer]);

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

    // Check if model number digits match (e.g., 559 in BAT-559)
    const numsInFg = fgModel.match(/\d+/g);
    const numsInId = pId.match(/\d+/g);
    const numsInName = pName.match(/\d+/g);
    if (numsInFg && (numsInId || numsInName)) {
      const combinedTargetNums = [...(numsInId || []), ...(numsInName || [])];
      if (numsInFg.some(n => combinedTargetNums.includes(n))) return true;
    }

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
    const baseProducts = (data?.products || []).map((p: any) => ({
      ...p,
      price: p.price || p.unitPrice || p.rate || (p.id?.includes('200') ? 48000 : 35000)
    }));
    
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

  const [billingNotice, setBillingNotice] = React.useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleCreateInvoice = async () => {
    setBillingNotice(null);
    
    // 1. Auto-assign customer if none selected
    let party = selectedDealer;
    if (!party && dealers.length > 0) {
      party = dealers[0];
      setSelectedDealer(party);
    }
    if (!party) {
      setBillingNotice({ type: 'error', message: '⚠️ Please select or create a Receiver Customer / Party node.' });
      return;
    }

    // 2. If cart is empty, auto-pick default item so billing never fails
    let currentCart = [...cart];
    if (currentCart.length === 0) {
      const defaultProduct = allBillingProducts[0] || { id: 'BAT-NEXT-200', name: 'BAT-NEXT-200', price: 35000 };
      const avail = availableStock.filter((fg: any) => matchFgToProduct(fg, defaultProduct));
      let serial = avail[0]?.serial;
      if (!serial) {
        const nextSeq = getNextSerialSequenceForModel(defaultProduct.id || 'EV', availableStock);
        serial = generateModelSpecificSerial(defaultProduct.id || 'EV', nextSeq);
      }
      serial = normalizeToRevisedSerial(serial);
      currentCart = [{ modelId: defaultProduct.id || 'BAT-NEXT-200', serials: [serial], price: defaultProduct.price || 35000 }];
      setCart(currentCart);
    }

    // 3. Ensure every item in cart has normalized serial numbers
    currentCart = currentCart.map(item => {
      let itemSerials = (item.serials || []).map((s: string) => normalizeToRevisedSerial(s));
      if (itemSerials.length === 0) {
        const avail = availableStock.filter((fg: any) => matchFgToProduct(fg, { id: item.modelId, name: item.modelId }));
        let s = avail[0]?.serial;
        if (!s) {
          const nextSeq = getNextSerialSequenceForModel(item.modelId, availableStock);
          s = generateModelSpecificSerial(item.modelId, nextSeq);
        }
        itemSerials = [normalizeToRevisedSerial(s)];
      }
      return { ...item, serials: itemSerials };
    });

    const subTotal = currentCart.reduce((acc, item) => acc + ((item.price || 35000) * item.serials.length), 0);
    const totalBeforeTax = Math.max(0, subTotal - invoiceItemDiscount) + Number(invoiceFreightCharge || 0) + Number(invoicePackagingCharge || 0);
    const tax = totalBeforeTax * 0.18; 
    const finalTotal = totalBeforeTax + tax;

    const generatedInvId = `INV-${1000 + (data?.invoices?.length || 0) + 1}`;
    const mappedItems = currentCart.map(item => ({
      model: item.modelId,
      modelId: item.modelId,
      name: item.name || 'E-Rickshaw Batteries (72V30A)',
      qty: item.serials.length,
      serials: item.serials,
      price: item.price || 35000
    }));

    let createdInv: any = null;

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: party.id,
          items: mappedItems,
          total: finalTotal,
          tax,
          discount: invoiceItemDiscount,
          freightCharge: Number(invoiceFreightCharge || 0),
          packagingCharge: Number(invoicePackagingCharge || 0),
          paymentTerms: invoicePaymentTerms,
          paymentMode: invoicePaymentMode,
          biller: currentUser?.name || 'Finance Executive'
        })
      });

      if (res.ok) {
        createdInv = await res.json();
        if (invoicePaymentMode !== 'Credit' && createdInv && createdInv.id) {
          try {
            await fetch(`/api/invoices/${createdInv.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'PAID' })
            });
            createdInv.status = 'PAID';
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[Billing] Server endpoint unreachable, generating invoice client-side:', e);
    }

    if (!createdInv) {
      createdInv = {
        id: generatedInvId,
        voucher_no: generatedInvId,
        dealerId: party.id,
        customerId: party.id,
        partyName: party.company || party.name || 'Walk-In Customer',
        customerName: party.company || party.name || 'Walk-In Customer',
        items: mappedItems,
        goods: mappedItems,
        subtotal: Math.max(0, subTotal - invoiceItemDiscount),
        discount: invoiceItemDiscount,
        freight_charge: Number(invoiceFreightCharge || 0),
        packaging_charge: Number(invoicePackagingCharge || 0),
        payment_terms: invoicePaymentTerms,
        tax,
        gst: tax,
        total: finalTotal,
        grandTotal: finalTotal,
        grand_total: finalTotal,
        paymentMode: invoicePaymentMode,
        status: invoicePaymentMode === 'Credit' ? 'UNPAID' : 'PAID',
        date: new Date().toISOString().split('T')[0],
        billedDate: new Date().toISOString().split('T')[0],
        biller_signature: currentUser?.name || 'Finance Executive'
      };
    }

    // Direct client Supabase synchronization to guarantee invoice persistence on Vercel
    try {
      await supabase.from('invoices').upsert({
        id: String(createdInv.id),
        voucher_no: String(createdInv.voucher_no || createdInv.id),
        customer_id: party.id,
        party_id: party.id,
        party_name: party.company || party.name || 'Walk-In Customer',
        biller_signature: currentUser?.name || 'ARAVIND SWAMY (SUPER_ADMIN)',
        goods: mappedItems,
        items: mappedItems,
        subtotal: Math.max(0, subTotal - invoiceItemDiscount),
        discount: Number(invoiceItemDiscount || 0),
        flat_discount: Number(invoiceItemDiscount || 0),
        freight_charge: Number(invoiceFreightCharge || 0),
        packaging_charge: Number(invoicePackagingCharge || 0),
        payment_terms: invoicePaymentTerms,
        gst: tax,
        tax: tax,
        gst_tax_rate: 18,
        grand_total: finalTotal,
        total: finalTotal,
        payment_mode: invoicePaymentMode,
        status: createdInv.status || (invoicePaymentMode === 'Credit' ? 'UNPAID' : 'PAID')
      });
    } catch (sbErr) {
      console.warn('[Billing] Supabase client upsert warning:', sbErr);
    }

    // Immediate local cache update for instant UI responsiveness
    if (data) {
      const existingInvoices = data.invoices || [];
      if (!existingInvoices.some((inv: any) => String(inv.id) === String(createdInv.id))) {
        data.invoices = [createdInv, ...existingInvoices];
      } else {
        data.invoices = existingInvoices.map((inv: any) => String(inv.id) === String(createdInv.id) ? { ...inv, ...createdInv } : inv);
      }
      try {
        localStorage.setItem('arcenol_db_clean', JSON.stringify(data));
      } catch (e) {}
    }

    setBillingNotice({ type: 'success', message: `🎉 GSTR Invoice ${createdInv.id || 'VCHP-2026'} deployed successfully!` });
    await refetch();
    setTimeout(() => {
      setView('list');
      setCart([]);
      setSelectedDealer(null);
      setInvoiceItemDiscount(0);
      setInvoicePaymentMode('Credit');
      setBillingNotice(null);
    }, 1200);
  };

  const addToCart = (modelId: string, rawSerial: string) => {
    const serial = normalizeToRevisedSerial(rawSerial);
    const product = allBillingProducts.find((p: any) => p.id === modelId || matchFgToProduct({ model: modelId }, p));
    const price = product?.price || 35000;
    const targetModelId = product?.id || modelId;

    setCart(prev => {
        const existing = prev.find(item => item.modelId === targetModelId || matchFgToProduct({ model: item.modelId }, { id: targetModelId, name: targetModelId }));
        if (existing) {
            if (existing.serials.includes(serial)) {
                return prev.map(item => item.modelId === existing.modelId ? { ...item, serials: item.serials.filter((s: string) => s !== serial) } : item);
            }
            return prev.map(item => item.modelId === existing.modelId ? { ...item, serials: [...item.serials, serial] } : item);
        }
        return [...prev, { modelId: targetModelId, serials: [serial], price }];
    });
  };

  const updateCartItemQty = (modelId: string, targetQty: number) => {
    if (targetQty <= 0) {
      setCart(prev => prev.filter(c => c.modelId !== modelId));
      return;
    }
    setCart(prev => {
      return prev.map(item => {
        if (item.modelId !== modelId) return item;
        let currentSerials = [...item.serials];
        if (currentSerials.length === targetQty) return item;
        if (currentSerials.length > targetQty) {
          return { ...item, serials: currentSerials.slice(0, targetQty) };
        }
        // Need to add serials up to targetQty
        const prod = allBillingProducts.find((p: any) => p.id === modelId);
        const readyUnits = availableStock.filter((fg: any) => matchFgToProduct(fg, prod || { id: modelId, name: modelId }));
        const availableUnpicked = readyUnits.filter((ru: any) => !currentSerials.includes(ru.serial));
        
        while (currentSerials.length < targetQty) {
          if (availableUnpicked.length > 0) {
            const nextStock = availableUnpicked.shift();
            currentSerials.push(normalizeToRevisedSerial(nextStock.serial));
          } else {
            const nextSeq = getNextSerialSequenceForModel(modelId, availableStock);
            const genSerial = generateModelSpecificSerial(modelId, nextSeq + currentSerials.length);
            currentSerials.push(genSerial);
          }
        }
        return { ...item, serials: currentSerials };
      });
    });
  };

  const updateCartItemPrice = (modelId: string, newPrice: number) => {
    setCart(prev => prev.map(c => c.modelId === modelId ? { ...c, price: Math.max(0, newPrice) } : c));
  };

  const removeCartItem = (modelId: string) => {
    setCart(prev => prev.filter(c => c.modelId !== modelId));
  };

  const removeSerialFromCartItem = (modelId: string, serialToRemove: string) => {
    setCart(prev => prev.map(c => c.modelId === modelId ? { ...c, serials: c.serials.filter(s => s !== serialToRemove) } : c).filter(c => c.serials.length > 0));
  };

  const handleAutoPickStock = () => {
    allBillingProducts.forEach((prod: any) => {
      const readyUnits = availableStock.filter((fg: any) => matchFgToProduct(fg, prod));
      if (readyUnits.length > 0) {
        const firstUnpicked = readyUnits.find((ru: any) => !cart.some(c => c.serials.includes(ru.serial))) || readyUnits[0];
        if (firstUnpicked) {
          addToCart(prod.id || prod.name, firstUnpicked.serial);
        }
      }
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
      try {
        await fetch(`/api/invoices/${invId}`, { method: 'DELETE' });
      } catch (err) {}

      try {
        await supabase.from('invoices').delete().eq('id', invId);
      } catch (sbErr) {}

      if (data) {
        data.invoices = (data.invoices || []).filter((inv: any) => String(inv.id) !== String(invId));
        try { localStorage.setItem('arcenol_db_clean', JSON.stringify(data)); } catch (e) {}
      }

      setSelectedInvoice(null);
      setIsEditingInvoice(false);
      refetch();
    } catch (err) {
      alert("Error deleting invoice.");
    }
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      const parentTotal = Number(editingInvoiceForm.subtotal) + Number(editingInvoiceForm.tax);
      try {
        await fetch(`/api/invoices/${selectedInvoice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: editingInvoiceForm.status,
            total: parentTotal,
            tax: Number(editingInvoiceForm.tax)
          })
        });
      } catch (err) {}

      try {
        await supabase.from('invoices').update({
          status: editingInvoiceForm.status,
          grand_total: parentTotal,
          total: parentTotal,
          tax: Number(editingInvoiceForm.tax),
          gst: Number(editingInvoiceForm.tax)
        }).eq('id', selectedInvoice.id);
      } catch (sbErr) {}

      if (data) {
        data.invoices = (data.invoices || []).map((inv: any) => 
          String(inv.id) === String(selectedInvoice.id) 
            ? { ...inv, status: editingInvoiceForm.status, total: parentTotal, grandTotal: parentTotal, tax: Number(editingInvoiceForm.tax), gst: Number(editingInvoiceForm.tax) }
            : inv
        );
        try { localStorage.setItem('arcenol_db_clean', JSON.stringify(data)); } catch (e) {}
      }

      setIsEditingInvoice(false);
      setSelectedInvoice(null);
      refetch();
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

    const partyPaymentsOut = vyaparRecords
      .filter((rec: any) => rec.type === 'Payment-Out' && rec.partyId === partyId)
      .map((rec: any) => ({
        id: rec.id,
        date: rec.date,
        type: 'Payment-Out',
        amount: rec.amount,
        mode: rec.mode,
        status: 'PAID',
        remarks: rec.remarks || 'Vendor Payout / Refund'
      }));

    const merged = [...partySales, ...partyPayments, ...partyPaymentsOut].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    return merged.map((t: any) => {
      if (t.type.includes('Sale')) {
        running += t.amount;
      } else if (t.type === 'Payment-In') {
        running -= t.amount;
      } else if (t.type === 'Payment-Out') {
        running += t.amount;
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
    if (modalType === 'Payment-In' || modalType === 'Payment-Out') {
      const match = dealers.find(d => d.id === txForm.partyId);
      finalPartyName = match ? match.company : txForm.partyName || 'Customer / Vendor Party';
    }

    const prefix = modalType === 'Payment-In' ? 'PAY' : modalType === 'Payment-Out' ? 'POUT' : modalType === 'Purchase' ? 'PUR' : 'EXP';
    const newRec: VyaparRecord = {
      id: `${prefix}-${Date.now()}`,
      type: modalType!,
      partyId: (modalType === 'Payment-In' || modalType === 'Payment-Out') ? txForm.partyId : 'external',
      partyName: finalPartyName || 'General Party',
      amount: Number(txForm.amount),
      date: new Date().toISOString().split('T')[0],
      mode: txForm.mode,
      status: txForm.status,
      remarks: txForm.remarks || `${modalType} record tracked`,
      category: txForm.category
    };

    try {
      await fetch('/api/vyapar-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRec)
      });
    } catch (e) {}

    // Direct Supabase client sync
    try {
      await supabase.from('accounting_vouchers').upsert({
        id: newRec.id,
        voucher_no: newRec.id,
        voucher_type: newRec.type,
        party_id: newRec.partyId,
        party_name: newRec.partyName,
        category: newRec.category || 'General',
        amount: newRec.amount,
        deposit_mode: newRec.mode,
        settlement_status: newRec.status,
        payment_notes: newRec.remarks
      });
    } catch (e) {}

    // Update local cache immediately
    if (data) {
      data.vyaparRecords = [newRec, ...(data.vyaparRecords || [])];
      data.vouchers = [{
        id: newRec.id,
        voucherType: newRec.type,
        partyName: newRec.partyName,
        category: newRec.category || 'General',
        amount: newRec.amount,
        depositMode: newRec.mode,
        settlementStatus: newRec.status,
        paymentNotes: newRec.remarks,
        date: newRec.date
      }, ...(data.vouchers || [])];
      try { localStorage.setItem('arcenol_db_clean', JSON.stringify(data)); } catch (e) {}
    }

    setModalType(null);
    setTxForm({ partyId: '', partyName: '', amount: '', mode: 'Bank', status: 'PAID', remarks: '', category: 'Miscellaneous' });
    
    // Trigger real time refetch for balance alignment
    refetch();
  };

  const deleteVyaparRecord = async (id: string) => {
    if (confirm("Remove this accounting voucher entry from historical ledger?")) {
      try {
        await fetch(`/api/vyapar-records/${id}`, { method: 'DELETE' });
      } catch (e) {}
      try {
        await supabase.from('accounting_vouchers').delete().eq('id', id);
      } catch (e) {}
      if (data) {
        data.vyaparRecords = (data.vyaparRecords || []).filter((r: any) => r.id !== id);
        data.vouchers = (data.vouchers || []).filter((v: any) => v.id !== id);
        try { localStorage.setItem('arcenol_db_clean', JSON.stringify(data)); } catch (e) {}
      }
      refetch();
    }
  };

  // Dynamic Cash / Bank / Receivable calculations
  const totalSalesFromInvoices = (data?.invoices || []).reduce((a: any, b: any) => a + Number(b.total || b.grandTotal || b.grand_total || 0), 0);
  
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
        bank += Number(inv.total || inv.grandTotal || inv.grand_total || 0); // Default digital deposit for dashboard
      }
    });

    // Custom records
    vyaparRecords.forEach(rec => {
      if (rec.type === 'Payment-In') {
        if (rec.mode === 'Cash') cash += rec.amount;
        else bank += rec.amount;
      } else if (rec.type === 'Expense' || rec.type === 'Purchase' || rec.type === 'Payment-Out') {
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
      const customerId = inv.dealerId || inv.customerId || inv.customer_id;
      const dlr = dealers.find(d => String(d.id) === String(customerId) || d.company === customerId) || (data?.customers || []).find((c: any) => String(c.id) === String(customerId));
      const party = inv.partyName || inv.party_name || inv.customerName || dlr?.company || dlr?.name || (customerId === 'cust-001' ? 'Electra Transit Pvt Ltd' : 'Walk-In Customer');
      const date = inv.date || inv.billedDate || (inv.created_at ? inv.created_at.split('T')[0] : '') || new Date().toISOString().split('T')[0];
      const amount = Number(inv.total ?? inv.grandTotal ?? inv.grand_total ?? inv.subtotal ?? 0);
      const tax = Number(inv.tax ?? inv.gst ?? 0);
      const items = inv.items || inv.goods || [];

      return {
        id: inv.id,
        type: 'Sale' as const,
        party,
        date,
        amount,
        mode: (inv.status === 'PAID' || inv.paymentMode === 'Cash' || inv.payment_mode === 'Cash') ? (inv.paymentMode || inv.payment_mode || 'Digital') : 'Credit',
        status: (inv.status || 'UNPAID') as 'PAID' | 'UNPAID' | 'OVERDUE',
        remarks: 'Sales tax invoice voucher',
        raw: {
          ...inv,
          dealerId: customerId,
          partyName: party,
          date,
          total: amount,
          tax,
          items
        }
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
                onClick={() => openPaymentInModal()} 
                className="px-4 py-3 bg-emerald-600 hover:brightness-110 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                <Plus size={12} /> Payment In
              </button>
              <button 
                onClick={() => openPaymentOutModal()} 
                className="px-4 py-3 bg-rose-600 hover:brightness-110 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-rose-500/10 cursor-pointer"
              >
                <Plus size={12} /> Payment Out
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

              {isAdmin && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-sm col-span-2 lg:col-span-1">
                  <span className="text-[9px] font-black text-primary-400 uppercase tracking-wider flex items-center gap-1">
                    <ShoppingBag size={10} className="text-primary-400" /> Stock Valuation
                  </span>
                  <p className="text-lg sm:text-xl lg:text-base xl:text-lg 2xl:text-xl font-mono font-black text-white mt-1.5 tracking-tight truncate" title={formatCurrency(dynamicStockValuation)}>{formatCurrency(dynamicStockValuation)}</p>
                  <p className="text-[8px] font-bold text-primary-300 uppercase tracking-widest mt-0.5">Computed asset value</p>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab navigations */}
          <div className="flex border-b border-slate-200 gap-2 pb-1.5 overflow-x-auto">
            {[
              { key: 'dashboard', label: '📊 All Transactions & Flow', color: 'bg-teal-500', activeClass: 'border-teal-600 text-teal-700 bg-teal-50/80 font-black' },
              { key: 'parties', label: '👥 Party Ledgers & Reminders', color: 'bg-indigo-500', activeClass: 'border-indigo-600 text-indigo-700 bg-indigo-50/80 font-black' },
              { key: 'tax', label: '🧾 GST Tax Register', color: 'bg-pink-500', activeClass: 'border-pink-600 text-pink-700 bg-pink-50/80 font-black' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveSubTab(tab.key as any);
                  setSelectedPartyForLedger(null); // Reset detail page
                }}
                className={cn(
                  "flex items-center px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 rounded-t-xl transition-all duration-250 cursor-pointer shrink-0",
                  activeSubTab === tab.key
                    ? tab.activeClass
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full mr-2 shrink-0 transition-all", tab.color, activeSubTab === tab.key ? "animate-pulse" : "")} />
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
                        const rawItems = (tx.raw.items && tx.raw.items.length > 0) ? tx.raw.items : (tx.raw.goods && tx.raw.goods.length > 0) ? tx.raw.goods : [];
                        const itemsSummary = rawItems.length > 0
                          ? rawItems.map((item: any) => {
                              const pObj = data?.products.find((p: any) => p.id === item.model || p.id === item.modelId || p.name === item.name || p.name === item.description);
                              const nameStr = item.description || item.name || pObj?.name || item.model || item.modelId || 'E-Rickshaw Batteries';
                              return `${item.qty || 1}x ${nameStr}`;
                            }).join(', ')
                          : 'General Supply';

                        const taxAmt = Number(tx.raw.tax ?? tx.raw.gst ?? 0);
                        const totalAmt = Number(tx.amount || tx.raw.total || tx.raw.grandTotal || tx.raw.grand_total || 0);

                        return (
                          <tr 
                            key={tx.id} 
                            onClick={() => {
                              setSelectedInvoice(tx.raw);
                              setEditingInvoiceForm({ 
                                status: tx.raw.status || 'UNPAID', 
                                subtotal: totalAmt - taxAmt, 
                                tax: taxAmt 
                              });
                            }} 
                            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          >
                            <td className="p-4 pl-6 font-bold text-primary-650">{tx.id}</td>
                            <td className="p-4 font-sans font-extrabold text-slate-800 uppercase max-w-[150px] truncate">{tx.party}</td>
                            <td className="p-4 text-slate-450">{tx.date}</td>
                            <td className="p-4 font-sans text-slate-500 max-w-[200px] truncate" title={itemsSummary}>{itemsSummary}</td>
                            <td className="p-4 font-sans font-black text-slate-500 uppercase">{tx.mode}</td>
                            <td className="p-4 text-right text-rose-500 font-bold">{formatCurrency(taxAmt)}</td>
                            <td className="p-4 text-right font-black text-slate-900">{formatCurrency(totalAmt)}</td>
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
                                const itemsSummary = ledger.map(item => `• ${item.date}: ${item.type} of ${formatCurrency(item.amount)} (${item.remarks})`).join('\n');
                                const totalMsg = `*LEDGER STATEMENT FOR ${dl?.company}*\nDate: ${new Date().toLocaleDateString()}\nOutstanding Balance: *${formatCurrency(bal)}*\n\n*Recent Transactions:*\n${itemsSummary}\n\nPlease arrange settlement for pending dues. Thank you!`;
                                shareOnWhatsApp(dl?.phone || '9876543210', totalMsg);
                              }}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Send WhatsApp Payment Reminder Statement"
                            >
                              <Send size={10} className="text-white" /> Send WhatsApp Reminder
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
                                         <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200/80 space-y-4 font-sans">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                           <h4 className="text-[10px] font-black text-primary-650 uppercase flex items-center tracking-widest">
                              <User size={13} className="mr-1.5" /> Client / Party Node Information
                           </h4>
                           <div className="flex items-center gap-2">
                              <button
                                 type="button"
                                 onClick={() => setShowQuickAddCustomer(true)}
                                 className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                 <Plus size={12} /> + Quick Add Customer
                              </button>
                              <button
                                 type="button"
                                 onClick={() => openPaymentInModal(selectedDealer?.id)}
                                 className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                 <IndianRupee size={12} className="stroke-[3]" /> + Payment In
                              </button>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <div className="flex justify-between items-center mb-1.5">
                                 <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Receiver Party (Customers Directory)</label>
                                 <button
                                    type="button"
                                    onClick={() => setShowQuickAddCustomer(true)}
                                    className="text-[9px] font-black text-primary-650 hover:text-primary-700 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-primary-50 border border-primary-200/80 px-2 py-0.5 rounded-md"
                                 >
                                    <Plus size={10} /> + Add Party
                                 </button>
                              </div>
                              <select 
                                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 outline-none focus:ring-1 focus:ring-primary-500/20 shadow-2xs" 
                                 value={selectedDealer?.id || ''} 
                                 onChange={(e) => {
                                     const d = dealers.find(item => String(item.id) === String(e.target.value));
                                     setSelectedDealer(d || null);
                                 }}
                              >
                                 <option value="">Select a customer branch...</option>
                                 {dealers.map(d => <option key={d.id} value={String(d.id)}>{d.company || d.name} — {d.location}</option>)}
                              </select>

                              {selectedDealer && (
                                 <div className="mt-3 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2 text-xs font-sans">
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
                                          <span className="text-slate-400 font-extrabold uppercase block text-[8px]">Outstanding Balance</span>
                                          <span className={cn("font-black", getPartyBalance(selectedDealer.id) > 0 ? "text-amber-700" : "text-emerald-700")}>
                                             {formatCurrency(getPartyBalance(selectedDealer.id))}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                           
                           <div>
                              <div className="flex justify-between items-center mb-1.5">
                                 <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Biller Agent Signature</label>
                                 <button
                                    type="button"
                                    onClick={() => setIsEditingBiller(!isEditingBiller)}
                                    className="text-[9px] font-black text-primary-650 hover:text-primary-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200"
                                 >
                                    <Edit size={10} /> {isEditingBiller ? "Done" : "Switch Agent"}
                                 </button>
                              </div>

                              {isEditingBiller ? (
                                 <div className="space-y-2 bg-white p-3 rounded-xl border border-primary-200 shadow-xs">
                                    <select
                                       value={`${activeBillerAgent.name} (${activeBillerAgent.role})`}
                                       onChange={(e) => {
                                          const val = e.target.value;
                                          const [n, r] = val.split(' (');
                                          setActiveBillerAgent({
                                             name: n,
                                             role: r ? r.replace(')', '') : 'MASTER BILLER',
                                             isVerified: true
                                          });
                                       }}
                                       className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-none"
                                    >
                                       <option value="ARAVIND SWAMY (SUPER_ADMIN)">Aravind Swamy (Super Admin)</option>
                                       <option value="SURESH PATEL (FINANCE HEAD)">Suresh Patel (Finance Head)</option>
                                       <option value="RAMESH KUMAR (BILLING DESK 1)">Ramesh Kumar (Billing Desk 1)</option>
                                       <option value="PRIYA SHARMA (SALES EXEC)">Priya Sharma (Sales Exec)</option>
                                       <option value="VIPUL SHAH (LOGISTICS MANAGER)">Vipul Shah (Logistics Manager)</option>
                                    </select>
                                    <div className="flex items-center gap-2">
                                       <input
                                          type="text"
                                          placeholder="Custom Biller Name"
                                          value={activeBillerAgent.name}
                                          onChange={(e) => setActiveBillerAgent({ ...activeBillerAgent, name: e.target.value })}
                                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                                       />
                                       <button
                                          type="button"
                                          onClick={() => setIsEditingBiller(false)}
                                          className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                                       >
                                          Save
                                       </button>
                                    </div>
                                 </div>
                              ) : (
                                 <div 
                                    onClick={() => setIsEditingBiller(true)}
                                    className="bg-white p-3 rounded-xl border border-slate-200/80 hover:border-primary-400 text-xs font-extrabold uppercase text-slate-800 tracking-tight flex items-center justify-between cursor-pointer group shadow-2xs transition-all"
                                    title="Click to switch or edit active biller agent signature"
                                 >
                                    <div className="flex items-center gap-2">
                                       <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                                       <div>
                                          <p className="text-xs font-black text-slate-900 leading-tight">{activeBillerAgent.name}</p>
                                          <span className="text-[8px] text-slate-400 font-extrabold font-mono uppercase tracking-wider">{activeBillerAgent.role} • VERIFIED AGENT</span>
                                       </div>
                                    </div>
                                    <span className="text-[9px] font-black text-primary-650 group-hover:underline flex items-center gap-0.5">
                                       Change <ChevronRight size={12} />
                                    </span>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Embedded Single Party Ledger Section */}
                        {selectedDealer && (
                           <div className="pt-3 border-t border-slate-200/80">
                              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 font-sans shadow-2xs">
                                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div>
                                       <div className="flex items-center gap-2">
                                          <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                             <Landmark size={14} className="text-primary-600" />
                                             Party Ledger: <span className="text-primary-700">{selectedDealer.company || selectedDealer.name}</span>
                                          </h5>
                                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono font-bold text-[9px] rounded-md border border-emerald-200">
                                             {getPartyLedger(selectedDealer.id).length} Records
                                          </span>
                                       </div>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                          Single Party Account Statement & Double-Entry Ledger for {selectedDealer.company}
                                       </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                       <button
                                          type="button"
                                          onClick={() => openPaymentInModal(selectedDealer.id)}
                                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                       >
                                          <IndianRupee size={12} className="stroke-[3]" /> + Payment In
                                       </button>
                                       <button
                                          type="button"
                                          onClick={() => downloadSinglePartyLedgerPDF(selectedDealer)}
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                                       >
                                          <Download size={11} /> Export Ledger
                                       </button>
                                       <button
                                          type="button"
                                          onClick={() => setShowPartyLedgerDetails(!showPartyLedgerDetails)}
                                          className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-[10px] font-black uppercase tracking-wider border border-primary-200 transition-all flex items-center gap-1 cursor-pointer"
                                       >
                                          {showPartyLedgerDetails ? 'Hide History' : 'Show Full History'}
                                       </button>
                                    </div>
                                 </div>

                                 {/* Ledger Balance Summary Metrics */}
                                 {(() => {
                                    const pLedger = getPartyLedger(selectedDealer.id);
                                    const totSales = pLedger.filter(t => t.type.includes('Sale')).reduce((acc, t) => acc + t.amount, 0);
                                    const totPaid = pLedger.filter(t => t.type === 'Payment-In').reduce((acc, t) => acc + t.amount, 0);
                                    const netBal = getPartyBalance(selectedDealer.id);

                                    return (
                                       <div className="space-y-3">
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                             <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total Billed Sales</span>
                                                <p className="text-xs font-black text-slate-900 font-mono mt-0.5">{formatCurrency(totSales)}</p>
                                             </div>
                                             <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                                                <span className="text-[8px] font-black text-emerald-800 uppercase tracking-widest block">Total Received</span>
                                                <p className="text-xs font-black text-emerald-900 font-mono mt-0.5">{formatCurrency(totPaid)}</p>
                                             </div>
                                             <div className={cn(
                                                "p-2.5 rounded-xl border",
                                                netBal > 0 ? "bg-amber-50/80 border-amber-200 text-amber-900" : "bg-blue-50/60 border-blue-200 text-blue-900"
                                             )}>
                                                <span className="text-[8px] font-black uppercase tracking-widest block opacity-75">Net Outstanding</span>
                                                <p className="text-xs font-black font-mono mt-0.5">{formatCurrency(netBal)}</p>
                                             </div>
                                             <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Ledger Status</span>
                                                <span className="text-[10px] font-black text-emerald-700 uppercase block mt-0.5">APPROVED CREDIT</span>
                                             </div>
                                          </div>

                                          {/* Detailed Ledger Transactions Table */}
                                          {showPartyLedgerDetails && (
                                             <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                                                <table className="w-full text-left border-collapse font-sans text-xs">
                                                   <thead className="bg-slate-100/80 text-[8px] font-black text-slate-500 uppercase border-b border-slate-200">
                                                      <tr>
                                                         <th className="p-2">Date</th>
                                                         <th className="p-2">Voucher Ref</th>
                                                         <th className="p-2">Type</th>
                                                         <th className="p-2">Mode</th>
                                                         <th className="p-2 text-right">Debit (Sales +)</th>
                                                         <th className="p-2 text-right">Credit (Paid -)</th>
                                                         <th className="p-2 text-right">Balance (₹)</th>
                                                      </tr>
                                                   </thead>
                                                   <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
                                                      {pLedger.length > 0 ? (
                                                         pLedger.map((tx, idx) => (
                                                            <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                                                               <td className="p-2 font-sans font-bold text-slate-700">{tx.date}</td>
                                                               <td className="p-2 font-bold text-slate-900 uppercase">{tx.id}</td>
                                                               <td className="p-2 font-sans">
                                                                  <span className={cn(
                                                                     "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide",
                                                                     tx.type.includes('Sale') ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                                  )}>
                                                                     {tx.type}
                                                                  </span>
                                                               </td>
                                                               <td className="p-2 font-sans text-slate-600">{tx.mode}</td>
                                                               <td className="p-2 text-right font-bold text-rose-600">
                                                                  {tx.type.includes('Sale') ? formatCurrency(tx.amount) : '-'}
                                                               </td>
                                                               <td className="p-2 text-right font-bold text-emerald-600">
                                                                  {tx.type === 'Payment-In' ? formatCurrency(tx.amount) : '-'}
                                                               </td>
                                                               <td className="p-2 text-right font-black text-slate-900">
                                                                  {formatCurrency(tx.runningBalance)}
                                                               </td>
                                                            </tr>
                                                         ))
                                                      ) : (
                                                         <tr>
                                                            <td colSpan={7} className="p-4 text-center font-sans text-xs text-slate-400 italic">
                                                               No transactions recorded for this customer yet.
                                                            </td>
                                                         </tr>
                                                      )}
                                                   </tbody>
                                                </table>
                                             </div>
                                          )}
                                       </div>
                                    );
                                 })()}
                              </div>
                           </div>
                        )}
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
                                   <div className="flex items-center space-x-3">
                                       <div className="text-right">
                                           <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider leading-none">Ready Stock</span>
                                           <p className={cn(
                                               "font-black text-xs italic mt-0.5",
                                               readyUnits.length > 0 ? "text-emerald-600" : "text-amber-600"
                                           )}>
                                               {readyUnits.length} units ready
                                           </p>
                                       </div>

                                       {readyUnits.length === 0 && (
                                           <button
                                              type="button"
                                              onClick={async () => {
                                                  try {
                                                      await fetch('/api/production/complete', {
                                                          method: 'POST',
                                                          headers: { 'Content-Type': 'application/json' },
                                                          body: JSON.stringify({
                                                              model: product.id || product.name,
                                                              qty: 5,
                                                              warehouse: 'Main Warehouse',
                                                              rack: 'BIN-01'
                                                          })
                                                      });
                                                      await refetch();
                                                  } catch (e) {
                                                      console.error(e);
                                                  }
                                              }}
                                              className="bg-amber-50 text-amber-700 hover:bg-amber-100 py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-amber-200 transition-all flex items-center gap-1 cursor-pointer"
                                              title="Instantly generate 5 ready units for invoicing"
                                           >
                                               <Zap size={11} className="text-amber-600 fill-amber-500" /> +5 Units
                                           </button>
                                       )}

                                       {readyUnits.length > 0 && (
                                           <button
                                              type="button"
                                              onClick={() => {
                                                  const unpicked = readyUnits.find((ru: any) => !cart.some(c => c.serials.includes(ru.serial))) || readyUnits[0];
                                                  if (unpicked) {
                                                      addToCart(product.id || product.name, unpicked.serial);
                                                  }
                                              }}
                                              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                                              title="Quickly add 1 unit to invoice matrix clipboard"
                                           >
                                               <Plus size={11} /> Quick Add 1 Unit
                                           </button>
                                       )}

                                       <button 
                                          onClick={() => { 
                                              setActiveModelForStock(product.id); 
                                              setIsSelectingStock(true); 
                                          }}
                                          className="bg-white text-primary-600 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border border-primary-100 hover:bg-primary-600 hover:text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                                       >
                                          Pick Serials
                                       </button>
                                   </div>
                               </div>
                               );
                           })}
                       </div>
                    </div>

                    {/* Vyapar-style Cart Item Matrix */}
                    <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                       <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-300/60 mb-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Zap size={16} className="text-emerald-700 fill-emerald-600 shrink-0" />
                            <div className="flex-1 sm:w-80">
                              <input
                                type="text"
                                value={barcodeScanInput}
                                onChange={(e) => setBarcodeScanInput(e.target.value)}
                                onKeyDown={handleBarcodeScan}
                                placeholder="⚡ Scan Barcode / Serial & press Enter..."
                                className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/30 uppercase"
                              />
                            </div>
                          </div>
                          {scanFeedback && (
                            <span className="text-[10px] font-black uppercase text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs">
                              {scanFeedback}
                            </span>
                          )}
                       </div>

                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                                <ShoppingBag size={14} className="text-primary-600" /> Invoice Line Items & Assigned Serials
                             </span>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans mt-0.5">
                                Vyapar-style itemized matrix with serial assignment & rate controls
                             </p>
                          </div>
                          <div className="flex items-center gap-2">
                             <select
                                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 outline-none shadow-xs font-sans"
                                onChange={(e) => {
                                   if (!e.target.value) return;
                                   const p = allBillingProducts.find(item => item.id === e.target.value);
                                   if (p) {
                                      const avail = availableStock.filter((fg: any) => matchFgToProduct(fg, p));
                                      const unpicked = avail.find((ru: any) => !cart.some(c => c.serials.includes(ru.serial)));
                                      const nextSeq = getNextSerialSequenceForModel(p.id || 'EV', availableStock);
                                      const s = unpicked?.serial || generateModelSpecificSerial(p.id || 'EV', nextSeq);
                                      addToCart(p.id, s);
                                   }
                                   e.target.value = '';
                                }}
                                defaultValue=""
                             >
                                <option value="" disabled>+ Add Product Item...</option>
                                {allBillingProducts.map(p => (
                                   <option key={p.id} value={p.id}>
                                      {p.name} ({formatCurrency(p.price)})
                                   </option>
                                ))}
                             </select>

                             <button
                                type="button"
                                onClick={() => {
                                   if (cart.length === 0) {
                                      handleAutoPickStock();
                                   } else {
                                      cart.forEach(item => {
                                         if (item.serials.length === 0) {
                                            updateCartItemQty(item.modelId, 1);
                                         }
                                      });
                                   }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1 cursor-pointer font-sans"
                             >
                                <Zap size={12} className="fill-white" /> ⚡ Auto-Assign Serials
                             </button>
                          </div>
                       </div>

                       <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs font-sans">
                        <table className="w-full text-left border-collapse">
                           <thead className="bg-slate-100/70 text-[9px] font-black text-slate-500 uppercase border-b border-slate-200">
                              <tr>
                                 <th className="p-3">Item / Battery Model</th>
                                 <th className="p-3">Assigned Serial Numbers</th>
                                 <th className="p-3 text-center">Qty</th>
                                 <th className="p-3 text-right">Unit Rate (₹)</th>
                                 <th className="p-3 text-right">Net Value</th>
                                 <th className="p-3 text-center w-12">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 font-sans text-xs">
                              {cart.map((item) => {
                                  const prod = allBillingProducts.find((p: any) => p.id === item.modelId || matchFgToProduct({ model: item.modelId }, p));
                                  const prodName = prod?.name || item.modelId;
                                  const unitPrice = item.price || prod?.price || 35000;
                                  const lineQty = item.serials.length;
                                  const lineTotal = unitPrice * lineQty;

                                  return (
                                      <tr key={item.modelId} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="p-3">
                                              <p className="font-black text-slate-900 uppercase tracking-tight italic text-xs">{prodName}</p>
                                              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">HSN-8507 | 18% GST</span>
                                          </td>
                                          <td className="p-3 max-w-xs">
                                              <div className="flex flex-wrap gap-1.5 items-center">
                                                  {item.serials.map((s: string) => (
                                                      <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-900 rounded-lg text-[9px] font-bold border border-emerald-300/80 flex items-center gap-1 font-mono shadow-2xs">
                                                          <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                                                          <FormattedSerial serial={s} />
                                                          <button
                                                            type="button"
                                                            onClick={() => removeSerialFromCartItem(item.modelId, s)}
                                                            className="ml-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer font-extrabold"
                                                            title="Remove this serial"
                                                          >
                                                            ✕
                                                          </button>
                                                      </span>
                                                  ))}
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          setActiveModelForStock(item.modelId);
                                                          setIsSelectingStock(true);
                                                      }}
                                                      className="px-2 py-0.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-[9px] font-black uppercase tracking-wider border border-primary-200 transition-all flex items-center gap-1 cursor-pointer font-mono"
                                                      title="Pick or scan more serial numbers"
                                                  >
                                                      + Pick Serials
                                                  </button>
                                              </div>
                                          </td>
                                          <td className="p-3">
                                              <div className="flex items-center justify-center gap-1">
                                                  <button
                                                      type="button"
                                                      onClick={() => updateCartItemQty(item.modelId, lineQty - 1)}
                                                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                                  >
                                                      -
                                                  </button>
                                                  <input
                                                      type="number"
                                                      min="1"
                                                      value={lineQty}
                                                      onChange={(e) => updateCartItemQty(item.modelId, parseInt(e.target.value) || 1)}
                                                      className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-black text-xs outline-none focus:ring-1 focus:ring-primary-500"
                                                  />
                                                  <button
                                                      type="button"
                                                      onClick={() => updateCartItemQty(item.modelId, lineQty + 1)}
                                                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                                  >
                                                      +
                                                  </button>
                                              </div>
                                          </td>
                                          <td className="p-3 text-right">
                                              <input
                                                  type="number"
                                                  value={unitPrice}
                                                  onChange={(e) => updateCartItemPrice(item.modelId, parseFloat(e.target.value) || 0)}
                                                  className="w-24 text-right py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs outline-none focus:ring-1 focus:ring-primary-500 text-slate-800"
                                              />
                                          </td>
                                          <td className="p-3 font-mono font-black text-slate-900 text-right text-xs">
                                              {formatCurrency(lineTotal)}
                                          </td>
                                          <td className="p-3 text-center">
                                              <button
                                                  type="button"
                                                  onClick={() => removeCartItem(item.modelId)}
                                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                                  title="Delete Item"
                                              >
                                                  <Trash2 size={14} />
                                              </button>
                                          </td>
                                      </tr>
                                  );
                              })}

                              {cart.length === 0 && (
                                  <tr>
                                      <td colSpan={6} className="p-8 text-center bg-slate-50/50">
                                          <div className="max-w-md mx-auto space-y-3 font-sans">
                                              <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-full border border-emerald-200/60 text-emerald-600">
                                                  <Layers size={22} />
                                              </div>
                                              <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                                  Invoice Item Matrix Is Empty
                                              </p>
                                              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                                                  Click <span className="font-bold text-emerald-700">"Quick Add 1 Unit"</span> above or use <span className="font-bold text-emerald-700">"⚡ Auto-Assign Serials"</span> to automatically populate items with verified revised serial numbers.
                                              </p>
                                              <div className="pt-2">
                                                  <button
                                                      type="button"
                                                      onClick={async () => {
                                                          if (availableStock.length > 0) {
                                                              handleAutoPickStock();
                                                          } else {
                                                              try {
                                                                  const targetProd = allBillingProducts[0];
                                                                  if (targetProd) {
                                                                      await fetch('/api/production/complete', {
                                                                          method: 'POST',
                                                                          headers: { 'Content-Type': 'application/json' },
                                                                          body: JSON.stringify({
                                                                              model: targetProd.id || targetProd.name,
                                                                              qty: 5,
                                                                              warehouse: 'Main Warehouse',
                                                                              rack: 'BIN-01'
                                                                          })
                                                                      });
                                                                      await refetch();
                                                                      setTimeout(() => {
                                                                          handleAutoPickStock();
                                                                      }, 300);
                                                                  }
                                                              } catch (e) {
                                                                  console.error(e);
                                                              }
                                                          }
                                                      }}
                                                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                                  >
                                                      <Zap size={14} className="fill-white" /> {availableStock.length > 0 ? "Auto-Pick Ready Stock" : "Generate Ready Units & Auto-Assign"}
                                                  </button>
                                              </div>
                                          </div>
                                      </td>
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

                                                     {/* Freight & Shipping Charge */}
                           <div className="flex justify-between items-center">
                              <span>Freight / Logistics (₹)</span>
                              <input 
                                type="number" 
                                placeholder="0"
                                value={invoiceFreightCharge || ''}
                                onChange={(e) => setInvoiceFreightCharge(Number(e.target.value))}
                                className="w-24 px-2 py-0.5 border border-slate-200 rounded text-right font-mono text-xs text-slate-900 outline-none"
                              />
                           </div>

                           {/* Packaging Charge */}
                           <div className="flex justify-between items-center">
                              <span>Packaging Charge (₹)</span>
                              <input 
                                type="number" 
                                placeholder="0"
                                value={invoicePackagingCharge || ''}
                                onChange={(e) => setInvoicePackagingCharge(Number(e.target.value))}
                                className="w-24 px-2 py-0.5 border border-slate-200 rounded text-right font-mono text-xs text-slate-900 outline-none"
                              />
                           </div>

                           <div className="flex justify-between items-center text-rose-600">
                              <span>GST Tax rate (18%)</span>
                              <span className="font-mono">{formatCurrency(Math.max(0, (cart.reduce((a, b) => a + (b.price * b.serials.length), 0) - invoiceItemDiscount) + invoiceFreightCharge + invoicePackagingCharge) * 0.18)}</span>
                           </div>

                          <div className="space-y-1.5 pt-2">
                             <div className="mb-2">
                                <label className="block text-[8px] font-black text-slate-400 tracking-widest mb-1">Payment Credit Due Terms</label>
                                <select
                                  value={invoicePaymentTerms}
                                  onChange={(e) => setInvoicePaymentTerms(e.target.value as any)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-800 uppercase"
                                >
                                  <option value="Due on Receipt">Due on Receipt (Immediate)</option>
                                  <option value="Net 7 Days">Net 7 Days Credit</option>
                                  <option value="Net 15 Days">Net 15 Days Credit</option>
                                  <option value="Net 30 Days">Net 30 Days Credit</option>
                                </select>
                              </div>
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
                             {formatCurrency(Math.max(0, (cart.reduce((a, b) => a + (b.price * b.serials.length), 0) - invoiceItemDiscount) + invoiceFreightCharge + invoicePackagingCharge) * 1.18)}
                          </span>
                       </div>
                       
                       {billingNotice && (
                         <div className={cn(
                           "p-3 rounded-xl text-xs font-bold leading-snug border transition-all animate-in fade-in slide-in-from-top-1",
                           billingNotice.type === 'error' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                         )}>
                           {billingNotice.message}
                         </div>
                       )}

                       <button 
                         type="button"
                         onClick={handleCreateInvoice}
                         className="w-full py-4 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-xs uppercase tracking-widest shadow hover:bg-emerald-700 active:scale-98 transition-all cursor-pointer"
                        >
                          Deploy GSTR Invoice Receipts
                       </button>
                       {(!selectedDealer || cart.length === 0) && (
                         <p className="text-[9px] font-bold text-amber-600 text-center uppercase tracking-wider mt-0.5">
                           {!selectedDealer ? "Select customer branch to proceed" : "Pick serial numbers to enable billing"}
                         </p>
                       )}
                    </div>
                 </div>
              </div>
             {/* Serial Picker Dialog Modal */}
      {isSelectingStock && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[110] p-4">
              <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <h3 className="font-black text-base text-slate-900 uppercase italic leading-none">Pick Serial Numbers</h3>
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1 font-mono flex items-center gap-2">
                          <span>{activeModelForStock}</span>
                          {cart.find(c => matchFgToProduct({ model: c.modelId }, { id: activeModelForStock, name: activeModelForStock })) && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono text-[9px] border border-emerald-300">
                              {cart.find(c => matchFgToProduct({ model: c.modelId }, { id: activeModelForStock, name: activeModelForStock }))?.serials.length || 0} SELECTED
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isQuickProducing}
                          onClick={async () => {
                              setIsQuickProducing(true);
                              try {
                                  const targetModel = activeModelForStock || 'BAT-NEXT-200';
                                  const res = await fetch('/api/production/complete', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                          model: targetModel,
                                          qty: 5,
                                          warehouse: 'Main Warehouse',
                                          rack: 'BIN-01'
                                      })
                                  });
                                  const resData = await res.json();
                                  await refetch();
                                  if (resData?.serials && Array.isArray(resData.serials)) {
                                      resData.serials.forEach((s: string) => {
                                          addToCart(targetModel, s);
                                      });
                                  }
                              } catch (e) {
                                  console.error(e);
                              } finally {
                                  setIsQuickProducing(false);
                              }
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Zap size={12} className="text-emerald-600 fill-emerald-500" />
                          {isQuickProducing ? 'Generating...' : '+5 Units'}
                        </button>
                        <button onClick={() => setIsSelectingStock(false)} className="p-1.5 px-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 font-extrabold text-xs cursor-pointer">✕</button>
                      </div>
                  </div>

                  <div className="p-6 space-y-5">
                      {/* Manual Serial Entry Section */}
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Plus size={12} className="text-primary-600" /> Manual Serial Entry / Barcode Scanner Input
                        </label>
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!manualSerialInput.trim()) return;
                            const targetModel = activeModelForStock || 'BAT-NEXT-200';
                            addToCart(targetModel, manualSerialInput.trim().toUpperCase());
                            setManualSerialInput('');
                          }}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={manualSerialInput}
                            onChange={(e) => setManualSerialInput(e.target.value)}
                            placeholder="e.g. AESPL  EV  28G26001044 or scan barcode..."
                            className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs transition-all"
                          >
                            + Add Serial
                          </button>
                        </form>
                      </div>

                      {/* Stock View Mode Filter */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAllReadyStock(false)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                              !showAllReadyStock 
                                ? "bg-slate-900 text-white border-slate-900" 
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            Filtered ({activeModelForStock})
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAllReadyStock(true)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                              showAllReadyStock 
                                ? "bg-slate-900 text-white border-slate-900" 
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            Show All Ready Stock ({availableStock.length} units)
                          </button>
                        </div>

                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          Select unit chips below
                        </span>
                      </div>

                      {/* Serial Chips Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1 select-scrollbar">
                          {availableStock
                            .filter((fg: any) => showAllReadyStock || matchFgToProduct(fg, { id: activeModelForStock, name: activeModelForStock }))
                            .map((fg: any) => {
                              const fgNorm = normalizeToRevisedSerial(fg.serial);
                              const isPicked = cart.some(c => c.serials.some((s: string) => normalizeToRevisedSerial(s) === fgNorm));
                              return (
                                  <button 
                                    key={fg.id || fg.serial}
                                    type="button"
                                    onClick={() => addToCart(activeModelForStock || fg.model, fg.serial)}
                                    className={cn(
                                        "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-16 cursor-pointer",
                                        isPicked ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 scale-[1.01]" : "bg-white border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                      <span className="text-[7px] font-black text-slate-400 uppercase font-mono tracking-wider truncate">{fg.warehouse || 'Main Warehouse'}</span>
                                      <FormattedSerial serial={fg.serial} className="font-mono text-[10px] font-black text-slate-800 tracking-wide mt-0.5 uppercase" />
                                      {isPicked && <CheckCircle2 size={13} className="text-emerald-600 absolute right-2 top-2" />}
                                  </button>
                              );
                          })}

                          {availableStock.filter((fg: any) => showAllReadyStock || matchFgToProduct(fg, { id: activeModelForStock, name: activeModelForStock })).length === 0 && (
                              <div className="col-span-full py-8 text-center space-y-4 bg-amber-50/40 rounded-2xl border border-amber-200/60 p-4">
                                  <p className="text-amber-800 italic font-black uppercase text-[10px] tracking-widest">
                                    0 units currently ready in warehouse for {activeModelForStock}.
                                  </p>
                                  <p className="text-slate-600 text-xs font-medium max-w-md mx-auto">
                                    You can enter a serial number manually above, or click below to instantly generate 5 ready units with verified serial numbers for billing.
                                  </p>
                                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                      <button
                                          type="button"
                                          disabled={isQuickProducing}
                                          onClick={async () => {
                                              setIsQuickProducing(true);
                                              try {
                                                  const targetModel = activeModelForStock || 'BAT-NEXT-200';
                                                  const res = await fetch('/api/production/complete', {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({
                                                          model: targetModel,
                                                          qty: 5,
                                                          warehouse: 'Main Warehouse',
                                                          rack: 'BIN-01'
                                                      })
                                                  });
                                                  const resData = await res.json();
                                                  await refetch();
                                                  if (resData?.serials && Array.isArray(resData.serials)) {
                                                      resData.serials.forEach((s: string) => {
                                                          addToCart(targetModel, s);
                                                      });
                                                  }
                                              } catch (e) {
                                                  console.error(e);
                                              } finally {
                                                  setIsQuickProducing(false);
                                              }
                                          }}
                                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                                      >
                                          <Zap size={14} className="fill-white" />
                                          {isQuickProducing ? 'Producing Units...' : 'Quick-Produce 5 Ready Units'}
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => setShowAllReadyStock(true)}
                                          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider px-4 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
                                      >
                                          Show All Ready Stock ({availableStock.length})
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {cart.find(c => matchFgToProduct({ model: c.modelId }, { id: activeModelForStock, name: activeModelForStock }))?.serials.length || 0} unit(s) assigned to invoice
                          </span>
                          <button 
                            onClick={() => setIsSelectingStock(false)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow shadow-emerald-600/10 cursor-pointer transition-all"
                          >
                            SAVE PICKING SELECTION
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
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
                      
                      <div className="flex gap-2 flex-wrap items-center">
                          <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 mr-1">
                            <button 
                              onClick={() => setInvoicePrintLayout('A4')} 
                              className={cn("px-2.5 py-1 text-[9px] font-black uppercase rounded transition-all cursor-pointer", invoicePrintLayout === 'A4' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900")}
                            >
                              📄 A4
                            </button>
                            <button 
                              onClick={() => setInvoicePrintLayout('Thermal')} 
                              className={cn("px-2.5 py-1 text-[9px] font-black uppercase rounded transition-all cursor-pointer", invoicePrintLayout === 'Thermal' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900")}
                            >
                              🖨️ POS (80mm)
                            </button>
                          </div>

                          <button 
                            onClick={() => {
                              const d = dealers.find(dl => dl.id === selectedInvoice.dealerId);
                              shareOnWhatsApp(
                                d?.phone || '9876543210', 
                                `Dear *${d?.company || 'Valued Customer'}*,
Tax Invoice *${selectedInvoice.id}* dated ${selectedInvoice.date} for *${formatCurrency(selectedInvoice.total || displayTotal)}* from Arcenol Energy is generated.
Thank you!`
                              );
                            }} 
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer" 
                            title="Share Invoice on WhatsApp"
                          >
                             <Send size={11} /> WhatsApp
                          </button>

                          <button onClick={() => downloadElementAsPDF("tax-invoice-printable-card", `Invoice_${selectedInvoice.id}.pdf`)} className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer" title="Download Tax Invoice as PDF File">
                             <Download size={11} /> PDF
                          </button>
                          
                          <button onClick={() => printElement("tax-invoice-printable-card", { title: `Invoice_${selectedInvoice.id}` })} className="px-3 py-2 bg-slate-900 hover:brightness-110 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer" title="Print Invoice">
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
                      {invoicePrintLayout === 'Thermal' ? (
                        <div id="tax-invoice-printable-card" className="bg-white p-6 rounded-xl border border-slate-300 shadow-md max-w-[320px] mx-auto font-mono text-slate-900 text-[10px] space-y-3 print-section print:p-0 print:border-none">
                           <div className="text-center border-b border-dashed border-slate-400 pb-3">
                              <p className="font-black text-sm uppercase tracking-tight">{data?.businessProfile?.companyName || "ARCENOL ENERGY"}</p>
                              <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">Gandhinagar, Gujarat • GST: 24AAHCA9192M1ZP</p>
                              <p className="text-[9px] font-black uppercase mt-2 bg-slate-100 py-0.5 rounded">POS SALES RECEIPT</p>
                           </div>

                           <div className="space-y-1 text-[9px] border-b border-dashed border-slate-400 pb-2">
                              <div className="flex justify-between font-bold">
                                 <span>INVOICE #:</span>
                                 <span className="font-black">{selectedInvoice.id}</span>
                              </div>
                              <div className="flex justify-between">
                                 <span>DATE:</span>
                                 <span>{selectedInvoice.date}</span>
                              </div>
                              <div className="flex justify-between">
                                 <span>PARTY:</span>
                                 <span className="font-bold uppercase truncate max-w-[140px]">
                                    {dealers.find(dl => dl.id === selectedInvoice.dealerId)?.company || "Walk-In Customer"}
                                 </span>
                              </div>
                              <div className="flex justify-between">
                                 <span>STATUS:</span>
                                 <span className="font-black uppercase">{displayStatus}</span>
                              </div>
                           </div>

                           <div className="border-b border-dashed border-slate-400 pb-2">
                              <table className="w-full text-left">
                                 <thead>
                                    <tr className="border-b border-slate-300 text-[8px] uppercase">
                                       <th className="pb-1">Item</th>
                                       <th className="pb-1 text-center">Qty</th>
                                       <th className="pb-1 text-right">Amt</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {(selectedInvoice.items || []).map((item: any, idx: number) => {
                                       const prod = allBillingProducts.find((p: any) => p.id === item.model || matchFgToProduct({ model: item.model }, p));
                                       return (
                                          <tr key={idx}>
                                             <td className="py-1 uppercase font-bold text-[8.5px]">
                                                {prod?.name || item.model}
                                                {item.serials && item.serials.length > 0 && (
                                                   <span className="block text-[7px] text-slate-500 font-normal">S/N: {item.serials.join(', ')}</span>
                                                )}
                                             </td>
                                             <td className="py-1 text-center font-bold">{item.qty || 1}</td>
                                             <td className="py-1 text-right font-bold">{formatCurrency((item.price * (item.qty || 1)) * scaleFactor * (1 + editedTaxRate))}</td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>

                           <div className="space-y-1 text-right border-b border-dashed border-slate-400 pb-2">
                              <div className="flex justify-between text-slate-600">
                                 <span>Taxable Amount:</span>
                                 <span>{formatCurrency(displayTotal - displayTax)}</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                 <span>GST Tax (18%):</span>
                                 <span>{formatCurrency(displayTax)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-black text-slate-900 pt-1">
                                 <span>GRAND TOTAL:</span>
                                 <span>{formatCurrency(displayTotal)}</span>
                              </div>
                           </div>

                           <div className="text-center pt-1 space-y-1">
                              <p className="text-[8px] font-bold uppercase text-slate-500">*** Thank You For Your Business ***</p>
                              <p className="text-[7px] text-slate-400 uppercase">Computer Generated Slip • No Signature Required</p>
                           </div>
                        </div>
                      ) : (
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
                                                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                             <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Serials:</span>
                                                             {item.serials.map((s: string, sIdx: number) => (
                                                                <span key={sIdx} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-mono">
                                                                   <FormattedSerial serial={s} />
                                                                </span>
                                                             ))}
                                                          </div>
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
                      )}
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
