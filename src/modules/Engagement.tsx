import React, { useState } from 'react';
import { 
  Smartphone, 
  QrCode, 
  ShieldCheck, 
  Star, 
  Share2, 
  ArrowRight,
  Bell,
  Wrench,
  Award,
  MapPin,
  Plus,
  RefreshCcw,
  Zap,
  ChevronRight,
  ChevronLeft,
  Battery,
  X,
  Trash2,
  CheckCircle,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Printer,
  Download,
  AlertCircle
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { generateBatterySerial, generateModelSpecificSerial, getNextSerialSequenceForModel, getProductClusterTag } from '../lib/serialUtils';
import { printElement } from '../lib/pdfGenerator';

export const Engagement: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modals state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isBatchQRModalOpen, setIsBatchQRModalOpen] = useState(false);
  const [isEditUrlModalOpen, setIsEditUrlModalOpen] = useState(false);
  const [isAddCampaignOpen, setIsAddCampaignOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Form states
  const [loyaltyUrlInput, setLoyaltyUrlInput] = useState('');
  const [newCampaign, setNewCampaign] = useState({ title: '', desc: '', category: 'EV Battery' });
  const [batchParams, setBatchParams] = useState({ productId: '', qty: 50, prefix: 'AESPL  EV' });
  const [simParams, setSimParams] = useState({ model: '', user: '', location: '' });
  
  // Mock Mobile App internal states
  const [phoneTab, setPhoneTab] = useState<'HOME' | 'WARRANTY' | 'SERVICE' | 'REWARDS' | 'DEALERS'>('HOME');
  const [mockPoints, setMockPoints] = useState(1250);
  const [unlockedRewards, setUnlockedRewards] = useState<string[]>([]);
  
  // Warranty search on phone
  const [phoneSerial, setPhoneSerial] = useState('');
  const [searchedWarranty, setSearchedWarranty] = useState<any>(null);
  
  // Service submission on phone
  const [phoneService, setPhoneService] = useState({ serial: 'AESPL  EV  28G26000001', type: 'Low Range', notes: '' });
  const [phoneServiceSubmitted, setPhoneServiceSubmitted] = useState(false);

  // Warranty checks logs linked to Image 2 lookups
  const warrantyChecks = data?.warrantyChecks || [];

  // Rewards claims logs linked to Image 3 claims
  const loyaltyClaims = data?.loyaltyClaims || [];

  // Generated batch QRs list for display/print
  const [generatedSerials, setGeneratedSerials] = useState<string[]>([]);

  // DTC App Download Hub & Sticker Generator States
  const [downloadPlatform, setDownloadPlatform] = useState<'ANDROID' | 'IOS' | 'PWA'>('ANDROID');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [stickerTheme, setStickerTheme] = useState<'slate' | 'crimson' | 'emerald'>('slate');
  const [stickerSerial, setStickerSerial] = useState<string>(generateModelSpecificSerial('EV', 1));
  const [isPreviewPrintOpen, setIsPreviewPrintOpen] = useState<boolean>(false);

  const triggerMockDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadSuccess(false);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          setDownloadSuccess(true);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  const handleAction = (callback: () => void | Promise<void>) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(async () => {
      await callback();
      setIsSyncing(false);
    }, 800);
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
       <div className="relative">
          <div className="absolute inset-0 bg-[#e38676]/20 blur-3xl rounded-full animate-pulse"></div>
          <Smartphone size={60} className="text-[#912551] animate-bounce relative z-10" />
       </div>
       <h3 className="mt-10 text-lg font-black italic uppercase tracking-tighter text-slate-900">
          Loading Engagement Portal...
       </h3>
       <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#912551] animate-pulse">
          Direct-to-Consumer Core Handshake
       </p>
    </div>
  );

  const engagement = data?.engagement || {
    stats: { activeAppUsers: 4280, qrScans30d: 12450, claimRequests: 142, avgRating: 4.8 },
    funnel: [
      { label: "Unique QR Scans", value: 45200, percentage: 100 },
      { label: "App Download", value: 32400, percentage: 71 },
      { label: "Product Registration", value: 28800, percentage: 63 },
      { label: "Recurring Engagement", value: 12100, percentage: 26 }
    ],
    recentScans: [
      { id: "s1", model: "BAT-INV-150", user: "Ravi K.", location: "Mumbai", time: "2 mins ago" },
      { id: "s2", model: "BAT-AUTO-35", user: "Anonymous", location: "Pune", time: "5 mins ago" },
      { id: "s3", model: "BAT-VRLA-100", user: "Sonal S.", location: "Delhi", time: "12 mins ago" }
    ],
    loyaltyUrl: "https://arc-powercare.com/scan/v2",
    campaigns: [
      { id: "c1", title: "Summer Solstice Double Warranty", desc: "Instantly doubles standard warranty for units registered in June/July.", category: "Solar / Inverter", status: "ACTIVE" },
      { id: "c2", title: "EV Monsoon Health Drive", desc: "Complementary premium state-of-health inspection coupon at certified centers.", category: "EV Battery", status: "ACTIVE" },
      { id: "c3", title: "Smart Inverter Exchange Rebate", desc: "Loyalty trade-in buyback incentive for residential systems.", category: "ESS / Industrial", status: "PAUSED" }
    ]
  };

  const [consoleTab, setConsoleTab] = useState<'scans' | 'campaigns' | 'batches' | 'tickets' | 'warranty' | 'rewards' | 'partners'>('scans');

  const loyaltyUrl = engagement.loyaltyUrl || "https://arc-powercare.com/scan/v2";
  const campaigns = engagement.campaigns || [];
  const batches = engagement.batches || [];
  
  // Handle Simulated QR Scan
  const triggerSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSimulateModalOpen(false);
    
    handleAction(async () => {
      try {
        const res = await fetch('/api/engagement/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(simParams)
        });
        if (res.ok) {
          refetch();
          // Reset sim configs
          setSimParams({ model: '', user: '', location: '' });
        }
      } catch (err) {
        console.error("Simulation failure", err);
      }
    });
  };

  // Save Loyalty Destination URL
  const saveLoyaltyUrl = async () => {
    if (!loyaltyUrlInput.trim()) return;
    setIsEditUrlModalOpen(false);
    handleAction(async () => {
      try {
        const res = await fetch('/api/engagement/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loyaltyUrl: loyaltyUrlInput.trim() })
        });
        if (res.ok) {
          refetch();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Toggle Campaign Status
  const toggleCampaign = async (campaignId: string) => {
    handleAction(async () => {
      try {
        const res = await fetch('/api/engagement/campaign/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId })
        });
        if (res.ok) {
          refetch();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Submit New Campaign
  const addCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.title.trim()) return;
    setIsAddCampaignOpen(false);
    handleAction(async () => {
      try {
        const res = await fetch('/api/engagement/campaign/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCampaign)
        });
        if (res.ok) {
          setNewCampaign({ title: '', desc: '', category: 'EV Battery' });
          refetch();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Delete Campaign
  const deleteCampaign = async (campaignId: string) => {
    handleAction(async () => {
      try {
        const res = await fetch('/api/engagement/campaign/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId })
        });
        if (res.ok) {
          refetch();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Generate Batch QRs Locally and on the Server
  const generateBatchQRs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchParams.productId) return;
    
    // Generate sequential serials starting afresh for each product type/model
    const serialsList: string[] = [];
    const targetModel = batchParams.productId || batchParams.prefix || 'EV';
    const startSeq = getNextSerialSequenceForModel(targetModel, data?.finishedGoods || []);
    for (let i = 0; i < batchParams.qty; i++) {
      serialsList.push(generateModelSpecificSerial(targetModel, startSeq + i));
    }
    setGeneratedSerials(serialsList);

    // Save batch run to persistent backend
    handleAction(async () => {
      try {
        const res = await fetch('/api/engagement/batch/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchParams)
        });
        if (res.ok) {
          refetch();
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  // Phone check warranty
  const checkPhoneWarranty = () => {
    const serial = phoneSerial.trim().toUpperCase();
    if (!serial) return;
    
    // Check in real active warranty systems or fallback
    const warrantList = data?.warranty || [];
    const match = warrantList.find((w: any) => w.serial.toUpperCase() === serial);
    
    let resultObj: any;
    if (match) {
      resultObj = {
        serial,
        model: match.model || "BAT-INV-150 High Capacity",
        registered: match.startDate,
        status: "ACTIVE WARRANTY",
        expires: "24 months left",
        verified: true,
        durationRemaining: "24 months left",
        foundInDb: true,
        date: new Date().toLocaleDateString()
      };
    } else {
      resultObj = {
        serial,
        model: "ARC-Smart Pro Battery Unit",
        registered: "Today (Newly registered)",
        status: "ACTIVE WARRANTY",
        expires: "36 months coverage",
        verified: true,
        durationRemaining: "36 months coverage",
        foundInDb: true,
        date: new Date().toLocaleDateString(),
        note: "Unit verified via secure direct handshake"
      };
    }
    setSearchedWarranty(resultObj);

    // Save to the IoT Warranty checks registry
    const newAudit = {
      id: "wc-" + Date.now(),
      serial,
      date: new Date().toLocaleDateString(),
      status: match ? "ACTIVE WARRANTY" : "SECURELY REGISTERED",
      durationRemaining: match ? "24 months left" : "36 months coverage",
      foundInDb: !!match,
      model: resultObj.model
    };

    fetch('/api/warranty-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAudit)
    }).then(() => {
      refetch();
    });
  };

  // Phone submit customer service complaint
  const submitPhoneComplaint = async () => {
    if (!phoneService.notes.trim()) return;
    handleAction(async () => {
      try {
        const payload = {
          serial: phoneService.serial,
          type: phoneService.type,
          notes: phoneService.notes,
          engineer: "Unassigned"
        };
        const res = await fetch('/api/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setPhoneServiceSubmitted(true);
          refetch();
          setPhoneService({ serial: 'AESPL  EV  28G26000001', type: 'Low Range', notes: '' });
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const getProductsList = () => {
    return data?.products || [
      { id: "BAT-INV-150", name: "Inverter SuperFlow 150" },
      { id: "BAT-AUTO-35", name: "Autonomous Power Pack 35" },
      { id: "BAT-VRLA-100", name: "Heavy Duty VRLA 100" }
    ];
  };

  return (
    <div className={cn("space-y-8 pb-12 transition-opacity duration-300", isSyncing && "opacity-[0.85] pointer-events-none")}>
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm">
          <div className="bg-[#912551] text-white px-8 py-5 rounded-[2rem] shadow-3xl flex items-center space-x-4 animate-in zoom-in-95 border border-white/15">
            <Zap size={22} className="text-[#e38676] animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest italic">Syncing DTC Network...</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <h2 className="text-4xl font-black text-[#111827] tracking-tighter italic uppercase leading-none">Customer Engagement Deck</h2>
           <p className="text-xs font-black text-[#912551] uppercase tracking-[0.2em] mt-3 underline decoration-[#e38676] underline-offset-4 decoration-2">QR-Linked Mobile Ecosystem & Direct-to-Consumer Core</p>
        </div>
        <div className="flex flex-wrap gap-4">
           <button 
             onClick={() => {
               setSimParams({ model: getProductsList()[0]?.id || '', user: '', location: '' });
               setIsSimulateModalOpen(true);
             }}
             className="px-6 py-3 bg-[#e38676]/10 text-[#912551] border border-[#e38676]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-[#e38676]/25 transition-all shadow-md active:scale-95 italic"
           >
              <Zap size={14} className="mr-2 animate-bounce text-[#912551]" /> Simulate Customer Scan
           </button>
           <button 
             onClick={() => setIsCampaignModalOpen(true)}
             className="px-6 py-3 bg-white border border-slate-200 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-slate-50 transition-all shadow-md active:scale-95 italic"
           >
              <Share2 size={14} className="mr-2 text-slate-400" /> Marketing Campaigns
           </button>
           <button 
             onClick={() => {
               setBatchParams({ productId: getProductsList()[0]?.id || '', qty: 50, prefix: 'AESPL  EV' });
               setGeneratedSerials([]);
               setIsBatchQRModalOpen(true);
             }}
             className="px-6 py-3 bg-[#912551] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-[#721c40] transition-all shadow-xl active:scale-95 italic"
           >
              <QrCode size={14} className="mr-2 text-[#e38676] shadow-[0_0_8px_rgba(227,134,118,0.5)]" /> Generate Batch QRs
           </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Active App Users', value: engagement.stats.activeAppUsers.toLocaleString(), icon: Smartphone, trend: '+14% Active', color: 'text-sky-600', bg: 'bg-sky-50' },
           { label: 'QR Scans (Last 30d)', value: engagement.stats.qrScans30d.toLocaleString(), icon: QrCode, trend: '99.4% Accurate', color: 'text-amber-600', bg: 'bg-amber-50' },
           { label: 'Registered Claims', value: engagement.stats.claimRequests, icon: ShieldCheck, trend: 'Fully Insured', color: 'text-[#912551]', bg: 'bg-[#912551]/10' },
           { label: 'Avg Customer Rating', value: `${engagement.stats.avgRating}/5`, icon: Star, trend: 'Outstanding', color: 'text-yellow-600', bg: 'bg-yellow-50' }
         ].map((stat, i) => (
           <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-2xl relative overflow-hidden group hover:border-[#912551]/20 transition-all cursor-default">
              <div className="flex justify-between items-start mb-6">
                 <div className={cn("p-4 rounded-2xl group-hover:bg-slate-950 group-hover:text-white transition-all shadow-inner", stat.bg, stat.color)}>
                    <stat.icon size={20} />
                 </div>
                 <span className="text-[9px] font-black uppercase tracking-widest text-[#912551] bg-[#e38676]/10 px-2.5 py-1 rounded-lg">
                    {stat.trend}
                 </span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{stat.value}</p>
           </div>
         ))}
      </div>

      {/* MAIN PORTAL AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* MOBILE MOCKUP */}
         <div className="hidden">
            <div className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Live Mobile App Simulator</div>
            
            <div className="relative h-[720px] bg-[#0c1b3d] rounded-[3.5rem] border-[12px] border-[#152747] shadow-3xl overflow-hidden flex flex-col group relative">
               {/* Sound notch/camera */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-[#152747] rounded-b-3xl z-40 flex items-center justify-center">
                  <div className="h-1.5 w-12 bg-slate-900 rounded-full"></div>
               </div>
               
               {/* Internal container */}
               <div className="px-6 pt-10 pb-6 h-full flex flex-col overflow-y-auto no-scrollbar relative z-30 select-none">
                  {/* Phone Header back button */}
                  {phoneTab !== 'HOME' && (
                     <button 
                        onClick={() => {
                           setPhoneTab('HOME');
                           setSearchedWarranty(null);
                           setPhoneServiceSubmitted(false);
                        }} 
                        className="mt-2 mb-4 self-start flex items-center text-slate-400 hover:text-white text-xs font-black uppercase tracking-wide transition-all"
                     >
                        <ChevronLeft size={16} className="mr-1" /> Back
                     </button>
                  )}

                  {/* TAB: HOME SCREEN */}
                  {phoneTab === 'HOME' && (
                     <div className="space-y-6 flex-1 flex flex-col justify-between">
                        {/* Greeting bar */}
                        <div>
                           <div className="flex justify-between items-center mb-6">
                              <div>
                                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">ECO-CUSTOMER</p>
                                 <p className="text-white text-2xl font-black tracking-tight mt-1">Aditya Sharma</p>
                              </div>
                              <div className="p-3 rounded-2xl bg-white/10 text-white relative border border-white/5 shadow-md">
                                 <Bell size={16} />
                                 <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-[#0c1b3d]"></span>
                              </div>
                           </div>

                           {/* Active Device Card */}
                           <div className="bg-gradient-to-br from-white/10 to-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md shadow-lg">
                              <div className="flex items-center space-x-4">
                                 <div className="h-12 w-12 bg-[#912551] rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                                    <Battery size={24} className="rotate-90 text-[#e38676]" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-[#e38676] uppercase tracking-widest leading-none mb-1">Registered Device</p>
                                    <h4 className="text-white font-black text-sm tracking-tight truncate">INV-150 SuperFlow</h4>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-emerald-400 font-black text-base tracking-tight leading-none">98%</p>
                                    <p className="text-[7px] font-black text-[#e38676] uppercase tracking-widest mt-1">Healthy</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Bento Menu Grid */}
                        <div className="bg-white rounded-t-[2.5rem] p-6 -mx-6 flex-1 mt-6 space-y-6 flex flex-col justify-between">
                           <div>
                              <div className="grid grid-cols-2 gap-4">
                                 {[
                                   { tab: 'WARRANTY', label: 'Warranty Check', icon: ShieldCheck, bg: 'bg-[#e7f9f0]', color: 'text-emerald-600' },
                                   { tab: 'SERVICE', label: 'Book Service', icon: Wrench, bg: 'bg-[#f1f5f9]', color: 'text-slate-700' },
                                   { tab: 'REWARDS', label: `Rewards (${mockPoints}pt)`, icon: Award, bg: 'bg-amber-50', color: 'text-amber-600' },
                                   { tab: 'DEALERS', label: 'Dealers Map', icon: MapPin, bg: 'bg-indigo-5', color: 'text-indigo-600' }
                                 ].map((item, i) => (
                                   <div 
                                     key={i} 
                                     onClick={() => setPhoneTab(item.tab as any)}
                                     className={cn(
                                       "h-28 rounded-3xl flex flex-col items-center justify-center space-y-3 cursor-pointer p-4 shadow-sm border border-transparent hover:scale-105 active:scale-95 transition-all text-center",
                                       item.bg
                                     )}
                                   >
                                      <item.icon size={24} className={item.color} />
                                      <span className={cn("text-[10px] font-black uppercase tracking-tight leading-none", item.color)}>{item.label}</span>
                                   </div>
                                 ))}
                              </div>

                              {/* Simple Promotion banner inside mobile */}
                              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#912551]/10 to-[#e38676]/10 border border-[#e38676]/20 flex items-center justify-between">
                                 <div className="space-y-1">
                                    <p className="text-[8px] font-black text-[#912551] uppercase tracking-widest">Active Campaign Offering</p>
                                    <p className="text-slate-800 font-extrabold text-[11px] leading-tight">Summer Solstice Gold Double Warranty</p>
                                 </div>
                                 <ChevronRight size={14} className="text-[#912551]" />
                              </div>
                           </div>

                           {/* Active Status bar */}
                           <div className="text-center pt-2">
                              <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Direct Secure Client Connection v2.10</p>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* TAB: WARRANTY */}
                  {phoneTab === 'WARRANTY' && (
                     <div className="flex-1 bg-white rounded-[2rem] p-6 text-slate-800 space-y-6 flex flex-col justify-between">
                        <div className="space-y-5">
                           <div>
                              <span className="text-[9px] font-black text-[#912551] uppercase tracking-widest bg-[#912551]/10 px-2.5 py-1 rounded-full">Secure Warranty Check</span>
                              <h4 className="text-xl font-black text-slate-900 italic tracking-tighter mt-2 leading-none uppercase">Verify IoT Authenticity</h4>
                           </div>
                           
                           <div className="space-y-3">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-normal">Enter Battery Unit Code (Serial No):</p>
                              <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-black tracking-widest focus:ring-2 focus:ring-[#912551]/20 outline-none uppercase"
                                    placeholder="e.g. AESPL  EV  28G26000001"
                                    value={phoneSerial}
                                    onChange={(e) => setPhoneSerial(e.target.value)}
                                 />
                                 <button 
                                    onClick={checkPhoneWarranty}
                                    className="p-3 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl font-black text-[10px] transition-all uppercase tracking-widest"
                                 >
                                    Verify
                                 </button>
                              </div>
                           </div>

                           {/* Suggestions checklist */}
                           <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sample active warranty serials:</p>
                              <div className="flex flex-wrap gap-1.5">
                                 {(data?.warranty || []).slice(0, 3).map((w: any) => (
                                    <button 
                                       key={w.serial}
                                       onClick={() => {
                                          setPhoneSerial(w.serial);
                                          setSearchedWarranty(null);
                                       }}
                                       className="text-[9px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition-all font-mono"
                                    >
                                       {w.serial}
                                    </button>
                                 ))}
                              </div>
                           </div>

                           {/* Results display */}
                           {searchedWarranty && (
                              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-md space-y-3 animate-in slide-in-from-bottom-2">
                                 <div className="flex items-center text-emerald-700 space-x-2">
                                    <CheckCircle size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Authentic Registered Node</span>
                                 </div>
                                 <div className="space-y-1 text-slate-700 text-xs text-left">
                                    <p className="font-extrabold text-slate-950 uppercase">{searchedWarranty.model}</p>
                                    <p className="text-[10px]">Registered: <span className="font-extrabold">{searchedWarranty.registered}</span></p>
                                    <p className="text-[10px]">Status: <span className="font-black text-emerald-600 uppercase">{searchedWarranty.status}</span></p>
                                    <p className="text-[10px]">Warranty Left: <span className="font-extrabold text-[#912551]">{searchedWarranty.expires}</span></p>
                                 </div>
                              </div>
                           )}
                        </div>
                        <button 
                           onClick={() => setPhoneTab('HOME')} 
                           className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                           Close Warranty Console
                        </button>
                     </div>
                  )}

                  {/* TAB: SERVICE */}
                  {phoneTab === 'SERVICE' && (
                     <div className="flex-1 bg-white rounded-[2rem] p-6 text-slate-800 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                           <div>
                              <span className="text-[9px] font-black text-[#912551] uppercase tracking-widest bg-[#912551]/10 px-2.5 py-1 rounded-full">RMA Help Desk</span>
                              <h4 className="text-xl font-black text-slate-900 italic tracking-tighter mt-2 leading-none uppercase">Instant Plant Ticket</h4>
                           </div>

                           {!phoneServiceSubmitted ? (
                              <div className="space-y-4">
                                 {/* Serial input */}
                                 <div className="space-y-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Assign Serial Reference</label>
                                    <select 
                                       className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-extrabold outline-none"
                                       value={phoneService.serial}
                                       onChange={(e) => setPhoneService({...phoneService, serial: e.target.value})}
                                    >
                                       {(data?.warranty || []).map((w: any) => (
                                          <option key={w.serial} value={w.serial}>{w.serial}</option>
                                       ))}
                                    </select>
                                 </div>

                                 {/* Issue Type input */}
                                 <div className="space-y-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Issue Classification</label>
                                    <select 
                                       className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-extrabold outline-none"
                                       value={phoneService.type}
                                       onChange={(e) => setPhoneService({...phoneService, type: e.target.value})}
                                    >
                                       <option value="Low Range">Low Range / Backup Loss</option>
                                       <option value="Dead on Arrival">Dead on Arrival UNIT</option>
                                       <option value="Voltage Drop">Voltage Cut-off Drops</option>
                                       <option value="High Temp">BMS High Heat Alarms</option>
                                    </select>
                                 </div>

                                 {/* Problem notes */}
                                 <div className="space-y-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Describe symptoms</label>
                                    <textarea 
                                       className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-[#912551] outline-none"
                                       rows={3}
                                       placeholder="Provide direct symptoms details for our plant technicians..."
                                       value={phoneService.notes}
                                       onChange={(e) => setPhoneService({...phoneService, notes: e.target.value})}
                                    />
                                 </div>

                                 <button 
                                    disabled={!phoneService.notes.trim()}
                                    onClick={submitPhoneComplaint}
                                    className="w-full py-4 bg-[#912551] hover:bg-[#721c40] disabled:opacity-40 text-white rounded-xl font-black text-[10px] transition-all uppercase tracking-widest filter drop-shadow-md"
                                 >
                                    Register Ticket
                                 </button>
                              </div>
                           ) : (
                              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in zoom-in-95">
                                 <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle size={24} />
                                 </div>
                                 <div>
                                    <h5 className="font-black text-slate-900 uppercase text-xs">Complaint Active!</h5>
                                    <p className="text-[10px] text-slate-400 mt-2">Ticket dispatched live to plant dashboard for immediate engineer allocation.</p>
                                 </div>
                                 <button 
                                    onClick={() => setPhoneServiceSubmitted(false)}
                                    className="text-[10px] font-black text-emerald-600 underline focus:outline-none"
                                 >
                                    Register Another
                                 </button>
                              </div>
                           )}
                        </div>
                        <button 
                           onClick={() => setPhoneTab('HOME')} 
                           className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                           Close Desk
                        </button>
                     </div>
                  )}

                  {/* TAB: REWARDS */}
                  {phoneTab === 'REWARDS' && (
                     <div className="flex-1 bg-white rounded-[2rem] p-6 text-slate-800 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                           <div className="text-center bg-[#912551]/5 py-5 px-4 rounded-3xl border border-[#912551]/10">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ECO-LOYALTY VALUE</p>
                              <div className="flex items-center justify-center mt-2 text-3xl font-black italic tracking-tighter text-[#912551]">
                                 <Award size={28} className="mr-2 text-[#e38676]" /> {mockPoints} <span className="text-[10px] font-black uppercase ml-1 not-italic text-slate-400 tracking-widest">PTS</span>
                              </div>
                              <p className="text-[8px] text-slate-400 font-bold mt-1.5">Claim rewards generated through sustainability scans!</p>
                           </div>

                           <div className="space-y-3.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Available claims</p>
                              {[
                                 { id: "r1", label: "Extended 6m Warranty Certificate", pts: 500, code: "ARC-REWARD-EXT6M" },
                                 { id: "r2", label: "Complementary Annual Health Audit", pts: 800, code: "ARC-REWARD-AUDIT1" },
                                 { id: "r3", label: "Copper Terminal Free Accessories", pts: 400, code: "ARC-REWARD-TERMCOP" }
                              ].map((reward) => {
                                 const claimed = unlockedRewards.includes(reward.id);
                                 const canClaim = mockPoints >= reward.pts;
                                 return (
                                    <div key={reward.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all text-left flex justify-between items-center gap-3">
                                       <div className="space-y-1 min-w-0">
                                          <p className="font-extrabold text-slate-900 text-[11px] leading-tight truncate">{reward.label}</p>
                                          {claimed ? (
                                             <p className="text-[10px] font-mono text-emerald-600 uppercase font-black tracking-wide bg-emerald-50 px-2 py-0.5 rounded-md inline-block">Code: {reward.code}</p>
                                          ) : (
                                             <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{reward.pts} PTS REQUIRED</p>
                                          )}
                                       </div>
                                       {!claimed ? (
                                          <button 
                                             disabled={!canClaim}
                                             onClick={() => {
                                                setMockPoints(prev => prev - reward.pts);
                                                setUnlockedRewards(prev => [...prev, reward.id]);
                                             }}
                                             className="px-4 py-2 bg-[#912551] text-white disabled:opacity-30 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#721c40] shrink-0"
                                          >
                                             Claim
                                          </button>
                                       ) : (
                                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 rounded-lg p-2 uppercase tracking-wide shrink-0">Claimed</span>
                                       )}
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                        <button 
                           onClick={() => setPhoneTab('HOME')} 
                           className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                           Close Rewards Deck
                        </button>
                     </div>
                  )}

                  {/* TAB: DEALERS */}
                  {phoneTab === 'DEALERS' && (
                     <div className="flex-1 bg-white rounded-[2rem] p-6 text-slate-800 space-y-6 flex flex-col justify-between">
                        <div className="space-y-4">
                           <div>
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Verify Retail Hubs</span>
                              <h4 className="text-xl font-black text-slate-900 italic tracking-tighter mt-2 leading-none uppercase">Nearest Partners</h4>
                           </div>

                           <div className="space-y-4 max-h-[360px] overflow-y-auto no-scrollbar">
                              {(data?.dealers || [
                                 { company: "Elite Power Ahmedabad", category: "Tier 1", location: "Navrangpura", select: true },
                                 { company: "Spark EV Rajkot", category: "Certified Service Center", location: "Metoda GIDC" }
                              ]).map((dealer: any, i: number) => (
                                 <div key={i} className="p-4 rounded-2xl bg-indigo-5/30 border border-indigo-100 space-y-2">
                                    <div className="flex justify-between items-start">
                                       <h5 className="font-black text-slate-900 text-[11px] uppercase tracking-tight">{dealer.company}</h5>
                                       <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{dealer.category || 'DEALER'}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold flex items-center">
                                       <MapPin size={12} className="mr-1 inline text-[#912551]" /> {dealer.location}, {dealer.city || 'GJ'}
                                    </p>
                                    <div className="flex justify-between items-center text-[9px] pt-1">
                                       <span className="text-slate-400">Score: {dealer.rankingScore ? `${dealer.rankingScore}/100` : '92/100'}</span>
                                       <a href={`tel:${dealer.phone || '9900112233'}`} className="font-black text-indigo-600 hover:underline uppercase">Call Inspector</a>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <button 
                           onClick={() => setPhoneTab('HOME')} 
                           className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                           Close Maps Deck
                        </button>
                     </div>
                  )}
               </div>

               {/* Lock Screen/Home Button Mock */}
               <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-32 bg-[#152747] rounded-full z-40"></div>
            </div>
         </div>

         {/* ANALYTICS & DIRECT CONTROLS */}
         <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-2xl relative overflow-hidden group">
               <h3 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase mb-6 group-hover:text-[#912551] transition-colors leading-none">QR App Conversion Pipeline</h3>
               
               <div className="space-y-6">
                  {engagement.funnel.map((step: any, i: number) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between items-end">
                          <div>
                             <span className="text-xs font-black text-[#111827] uppercase tracking-wider">{step.label}</span>
                             <span className="text-[10px] font-bold text-slate-400 ml-2">({step.value.toLocaleString()})</span>
                          </div>
                          <span className="text-sm font-black text-[#912551] italic tracking-tighter">{step.percentage}%</span>
                       </div>
                       <div className="h-4.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 shadow-md",
                              i === 0 ? "bg-[#912551]/95" : i === 1 ? "bg-[#912551]/80" : i === 2 ? "bg-[#e38676]" : "bg-[#e38676]/65"
                            )}
                            style={{ width: `${step.percentage}%` }}
                          ></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* QR CODE REDIRECT CONTROL */}
               <div className="bg-[#f8fafc] rounded-[2.5rem] p-10 border border-slate-100 flex flex-col items-center text-center justify-between space-y-6 relative overflow-hidden group">
                     <span className="absolute top-4 left-6 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">DIRECT WARRANTY GATEWAY</span>
                     <div 
                       onClick={() => handleAction(() => {})}
                       className="bg-white p-6 rounded-3xl shadow-xl border border-slate-50 relative group cursor-pointer hover:scale-105 active:scale-95 transition-all mt-3"
                     >
                        <QRCodeSVG value={loyaltyUrl} size={110} />
                        <div className="absolute -top-3 -right-3 h-8 w-8 bg-[#912551] rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg animate-bounce">
                           <Zap size={14} className="text-[#e38676]" />
                        </div>
                     </div>
                  <div>
                     <h4 className="text-lg font-black text-[#111827] italic tracking-tight uppercase leading-none">Instant Loyalty Trigger</h4>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[280px] break-all">Redirect: <span className="text-[#912551] block underline underline-offset-4 decoration-[#e38676] mt-1">{loyaltyUrl}</span></p>
                  </div>
                  <div className="flex space-x-3 w-full pt-1">
                     <button 
                       onClick={() => {
                         setLoyaltyUrlInput(loyaltyUrl);
                         setIsEditUrlModalOpen(true);
                       }}
                       className="flex-1 px-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-[#912551] transition-all shadow-sm active:scale-95 text-center italic"
                     >
                       Edit Destination
                     </button>
                     <button 
                       onClick={() => {
                         setNewCampaign({ title: '', desc: '', category: 'EV Battery' });
                         setIsAddCampaignOpen(true);
                         setIsCampaignModalOpen(true); // Ensures campaigns list of modal behaves well
                       }}
                       className="flex-1 px-4 py-3.5 bg-[#912551] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-[#721c40] transition-all shadow-xl active:scale-95 text-center italic"
                     >
                       Add Offer
                     </button>
                  </div>
               </div>

               {/* REAL-TIME SCAN ACTIVITY LOGGER */}
               <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl relative">
                  <span className="absolute top-4 left-6 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Eco Handshake Log</span>
                  <h4 className="text-sm font-black text-[#111827] uppercase tracking-widest mb-6 flex items-center mt-3 pl-1">
                     <RefreshCcw size={16} className="mr-2 text-[#912551] animate-spin" style={{ animationDuration: '3s' }} /> Real-time activity
                  </h4>
                  <div className="space-y-4 max-h-[220px] overflow-y-auto no-scrollbar">
                     {engagement.recentScans.map((scan: any) => (
                       <div 
                         key={scan.id} 
                         onClick={() => {
                           setPhoneSerial(scan.model);
                           setPhoneTab('WARRANTY');
                         }}
                         className="flex items-center space-x-4 p-2 hover:bg-slate-50 rounded-2xl cursor-pointer duration-300 active:scale-95 group"
                       >
                          <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#912551]/5 group-hover:text-[#912551] transition-all shadow-inner">
                             <Smartphone size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight group-hover:text-[#912551] transition-colors">{scan.model}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{scan.user} • {scan.location}</p>
                          </div>
                          <span className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded shrink-0">{scan.time}</span>
                       </div>
                     ))}
                  </div>
                  <button 
                    onClick={() => {
                      setPhoneTab('DEALERS');
                    }}
                    className="w-full mt-6 py-3.5 bg-slate-50 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-[#912551]/5 hover:text-[#912551] transition-all border border-dashed border-slate-200 uppercase"
                  >
                     Check Verification Matrix
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* CUSTOMER DIRECT APP INSTALLER & SERIAL PACKAGING GATEWAY */}
      <div className="traditional-mandala-card rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden my-8">
         {/* Traditional Mandalas from Image 5 */}
         <div className="absolute top-0 left-0 w-32 h-32 opacity-[0.09] pointer-events-none transform -translate-x-10 -translate-y-10 select-none">
            <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1">
               <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
               <circle cx="50" cy="50" r="38" />
               <circle cx="50" cy="50" r="30" strokeDasharray="1 1" />
               <circle cx="50" cy="50" r="22" />
               <circle cx="50" cy="50" r="14" />
               <circle cx="50" cy="50" r="6" />
               {Array.from({ length: 16 }).map((_, i) => {
                  const angle = (i * 360) / 16;
                  return (
                     <g key={i} transform={`rotate(${angle} 50 50)`}>
                        <path d="M50 50 C48 35, 52 35, 50 50" />
                        <path d="M50 50 C46 20, 54 20, 50 50" strokeWidth="0.5" />
                        <circle cx="50" cy="18" r="1.2" fill="#7c1d3c" />
                     </g>
                  );
               })}
               {Array.from({ length: 32 }).map((_, i) => {
                  const angle = (i * 360) / 32;
                  return (
                     <line key={i} x1="50" y1="5" x2="50" y2="8" transform={`rotate(${angle} 50 50)`} />
                  );
               })}
            </svg>
         </div>

         <div className="absolute right-0 top-1/2 w-40 h-40 opacity-[0.09] pointer-events-none transform translate-x-20 -translate-y-1/2 select-none">
            <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1">
               <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
               <circle cx="50" cy="50" r="38" />
               <circle cx="50" cy="50" r="30" strokeDasharray="1 1" />
               <circle cx="50" cy="50" r="22" />
               <circle cx="50" cy="50" r="14" />
               <circle cx="50" cy="50" r="6" />
               {Array.from({ length: 16 }).map((_, i) => {
                  const angle = (i * 360) / 16;
                  return (
                     <g key={i} transform={`rotate(${angle} 50 50)`}>
                        <path d="M50 50 C48 35, 52 35, 50 50" />
                        <path d="M50 50 C46 20, 54 20, 50 50" strokeWidth="0.5" />
                        <circle cx="50" cy="18" r="1.2" fill="#7c1d3c" />
                     </g>
                  );
               })}
               {Array.from({ length: 32 }).map((_, i) => {
                  const angle = (i * 360) / 32;
                  return (
                     <line key={i} x1="50" y1="5" x2="50" y2="8" transform={`rotate(${angle} 50 50)`} />
                  );
               })}
            </svg>
         </div>

         <div className="relative z-10 space-y-8">
            <div className="border-b border-[#7c1d3c]/20 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 text-left">
               <div>
                  <span className="text-[9px] font-black text-[#7c1d3c] uppercase tracking-[0.25em] bg-[#7c1d3c]/10 px-3 py-1 rounded-full border border-[#7c1d3c]/20">Direct To Consumer Gateway</span>
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mt-3 leading-none flex items-center text-[#7c1d3c]">
                     <Smartphone className="mr-2.5 text-[#7c1d3c]" size={22} /> DTC Customer App & Installer Station
                  </h3>
               </div>
               <p className="text-[10.5px] font-semibold text-[#5a3a44] max-w-sm leading-relaxed">
                  Design, preview, and generate real installer packages for end customers. They can download this directly to bypass traditional app store friction or scan from physical battery decals!
               </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
               {/* 1. Installer & Platform Station Code */}
               <div className="lg:col-span-7 bg-white/90 border border-[#7c1d3c]/15 shadow-md rounded-3xl p-8 space-y-6">
                  <div className="flex justify-between items-center">
                     <p className="text-xs font-black uppercase tracking-wider text-[#7c1d3c]">Platform Release Center</p>
                     <span className="text-[9px] font-mono font-black text-[#7c1d3c] tracking-widest bg-[#7c1d3c]/10 border border-[#7c1d3c]/20 px-2.5 py-0.5 rounded-md">RELEASE v2.10.4</span>
                  </div>

                  {/* Sub-tabs for Android, iOS, PWA */}
                  <div className="grid grid-cols-3 bg-[#fbf4df]/60 rounded-2xl p-1.5 border border-[#7c1d3c]/15 gap-1.5 shadow-inner">
                     <button 
                        onClick={() => { setDownloadPlatform('ANDROID'); setDownloadSuccess(false); setDownloadProgress(0); }}
                        className={cn(
                           "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                           downloadPlatform === 'ANDROID' ? "bg-[#7c1d3c] text-white shadow" : "text-[#7c1d3c]/70 hover:text-[#7c1d3c] hover:bg-white/50"
                        )}
                     >
                        Android APK
                     </button>
                     <button 
                        onClick={() => { setDownloadPlatform('IOS'); setDownloadSuccess(false); setDownloadProgress(0); }}
                        className={cn(
                           "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                           downloadPlatform === 'IOS' ? "bg-[#7c1d3c] text-white shadow" : "text-[#7c1d3c]/70 hover:text-[#7c1d3c] hover:bg-white/50"
                        )}
                     >
                        Apple iOS
                     </button>
                     <button 
                        onClick={() => { setDownloadPlatform('PWA'); setDownloadSuccess(false); setDownloadProgress(0); }}
                        className={cn(
                           "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                           downloadPlatform === 'PWA' ? "bg-[#7c1d3c] text-white shadow" : "text-[#7c1d3c]/70 hover:text-[#7c1d3c] hover:bg-white/50"
                        )}
                     >
                        Web Standalone
                     </button>
                  </div>

                  {/* Interactive Details Pane based on active Platform Tab */}
                  <div className="space-y-4 min-h-[185px] flex flex-col justify-between">
                     {downloadPlatform === 'ANDROID' && (
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <h4 className="text-sm font-black text-[#7c1d3c] uppercase tracking-tight">Direct APK Sideload Package</h4>
                              <p className="text-[11px] text-[#5a3a44] leading-relaxed">
                                 Sideload our optimized Android APK built for raw speed and offline IoT caching. Direct hardware pairing via NFC / Bluetooth is fully supported.
                              </p>
                           </div>

                           <div className="p-4 rounded-2xl bg-white/95 border border-[#7c1d3c]/15 space-y-3">
                              <p className="text-[9px] font-black text-[#7c1d3c] uppercase tracking-widest">INSTALLATION STEPS FOR CUSTOMERS:</p>
                              <ul className="text-[11px] text-[#5a3a44] list-decimal pl-4.5 space-y-1">
                                 <li>Download the direct APK installer block using the trigger below.</li>
                                 <li>Toggle <span className="text-[#7c1d3c] font-black">"Allow installation from Unknown Sources"</span> inside Security Settings.</li>
                                 <li>Tap the downloaded package and register via the QR decal printed on your battery.</li>
                              </ul>
                           </div>
                        </div>
                     )}

                     {downloadPlatform === 'IOS' && (
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <h4 className="text-sm font-black text-[#7c1d3c] uppercase tracking-tight">Safari Standalone Bookmark configuration</h4>
                              <p className="text-[11px] text-[#5a3a44] leading-relaxed">
                                 Apple devices install securely using Safari's independent application protocol. No jailbreak or App Store account is required!
                              </p>
                           </div>

                           <div className="p-4 rounded-2xl bg-white/95 border border-[#7c1d3c]/15 space-y-3">
                              <p className="text-[9px] font-black text-[#7c1d3c] uppercase tracking-widest">HOW TO DOWNLOAD & SAVE:</p>
                              <ul className="text-[11px] text-[#5a3a44] list-decimal pl-4.5 space-y-1">
                                 <li>Open the unique loyalty gateway URL in <span className="text-[#7c1d3c] font-bold">Safari</span>.</li>
                                 <li>Tap the central <span className="font-bold text-[#7c1d3c]">"Share"</span> icon at the bottom browser panel.</li>
                                 <li>Select <span className="text-[#7c1d3c] font-extrabold">"Add to Home Screen"</span> to download. It runs in a zero-chrome dedicated window container!</li>
                              </ul>
                           </div>
                        </div>
                     )}

                     {downloadPlatform === 'PWA' && (
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <h4 className="text-sm font-black text-[#7c1d3c] uppercase tracking-tight">Desktop & Tablets Progressive PWA Handshake</h4>
                              <p className="text-[11px] text-[#5a3a44] leading-relaxed">
                                 PWA provides local database synchronization for dealer counters or managers using dual layouts.
                              </p>
                           </div>

                           <div className="p-4 rounded-2xl bg-white/95 border border-[#7c1d3c]/15 space-y-3">
                              <p className="text-[9px] font-black text-[#7c1d3c] uppercase tracking-widest">PWA DESKTOP INTEGRATION BENEFITS:</p>
                              <ul className="text-[11px] text-[#5a3a44] list-disc pl-4.5 space-y-1">
                                 <li>Full offline support: keeps caching battery logs even when disconnected from cellular towers.</li>
                                 <li>Frictionless updates: automatic hot-pull from the cloud server on reboot.</li>
                              </ul>
                           </div>
                        </div>
                     )}

                     {/* Action Controls with Dynamic Progress Bar */}
                     <div className="pt-4 border-t border-[#7c1d3c]/20 flex items-center justify-between gap-4 flex-wrap">
                        {isDownloading ? (
                           <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-wider text-[#7c1d3c]">
                                 <span>Compiling Secure Package...</span>
                                 <span>{downloadProgress}%</span>
                              </div>
                              <div className="h-2 w-full bg-[#fbf4df] rounded-full overflow-hidden border border-[#7c1d3c]/20">
                                 <div className="h-full bg-gradient-to-r from-[#7c1d3c] to-[#912551] transition-all" style={{ width: `${downloadProgress}%` }}></div>
                              </div>
                           </div>
                        ) : downloadSuccess ? (
                           <div className="flex-1 flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl">
                              <div className="flex items-center text-emerald-800 gap-2 font-black text-[10px] uppercase tracking-wider">
                                 <CheckCircle size={14} className="text-emerald-600 animate-bounce" /> App installer download complete!
                              </div>
                              <button 
                                 onClick={() => setDownloadSuccess(false)}
                                 className="text-[9px] font-black uppercase text-[#7c1d3c] hover:underline"
                              >
                                 Clear
                              </button>
                           </div>
                        ) : (
                           <div className="flex items-center gap-4 w-full">
                              <button 
                                 onClick={triggerMockDownload}
                                 className="flex-1 py-4 bg-[#7c1d3c] hover:bg-[#62142d] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center shadow-lg"
                              >
                                 <Download size={14} className="mr-2 text-white" />
                                 {downloadPlatform === 'ANDROID' ? "Download PowerCare.apk" : downloadPlatform === 'IOS' ? "Download iOS Config" : "Deploy Standalone Web Builder"}
                              </button>

                              {/* Badges for design details */}
                              <div className="hidden sm:flex gap-2">
                                 <div className="px-3 py-2.5 rounded-xl border border-[#7c1d3c]/15 bg-white text-center select-none shrink-0 min-w-[70px]">
                                    <span className="block text-[7px] font-black text-[#7c1d3c]/60 uppercase leading-none">PKG Size</span>
                                    <span className="block text-xs font-mono font-bold text-[#7c1d3c] mt-1">14.2 MB</span>
                                 </div>
                                 <div className="px-3 py-2.5 rounded-xl border border-[#7c1d3c]/15 bg-white text-center select-none shrink-0 min-w-[70px]">
                                    <span className="block text-[7px] font-black text-[#7c1d3c]/60 uppercase leading-none">Security</span>
                                    <span className="block text-xs font-mono font-bold text-emerald-600 mt-1">PASS</span>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* 2. Battery Decal / QR Sticker Generator */}
               <div className="lg:col-span-5 bg-white/90 border border-[#7c1d3c]/15 shadow-md rounded-3xl p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-1 text-left">
                     <p className="text-xs font-black uppercase tracking-wider text-[#7c1d3c]">Sticker CASE Decal Generator</p>
                     <p className="text-[10px] text-[#5a3a44] font-semibold">Generate heavy-duty print decals for battery boxes with direct links</p>
                  </div>

                  <div className="space-y-3.5">
                     <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-black uppercase tracking-wider text-[#7c1d3c] block">Decal Design theme</label>
                        <div className="grid grid-cols-3 gap-2">
                           <button 
                              onClick={() => setStickerTheme('slate')}
                              className={cn(
                                 "py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all",
                                 stickerTheme === 'slate' ? "bg-[#7c1d3c] border-[#7c1d3c] text-white shadow" : "border-[#7c1d3c]/20 text-[#7c1d3c]/70 hover:text-[#7c1d3c] hover:bg-white"
                              )}
                           >
                              Carbon Slate
                           </button>
                           <button 
                              onClick={() => setStickerTheme('crimson')}
                              className={cn(
                                 "py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all",
                                 stickerTheme === 'crimson' ? "bg-rose-700 border-rose-800 text-white shadow" : "border-[#7c1d3c]/20 text-[#7c1d3c]/70 hover:text-[#7c1d3c] hover:bg-white"
                              )}
                           >
                              Lithium Crimson
                           </button>
                           <button 
                              onClick={() => setStickerTheme('emerald')}
                              className={cn(
                                 "py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all",
                                 stickerTheme === 'emerald' ? "bg-emerald-700 border-emerald-800 text-white shadow" : "border-[#7c1d3c]/20 text-[#7c1d3c]/70 hover:text-[#7c1d3c] hover:bg-white"
                              )}
                           >
                              Eco Emerald
                           </button>
                        </div>
                     </div>

                     <div className="space-y-2 text-left">
                        <div className="flex items-center justify-between">
                           <label className="text-[9px] font-black uppercase tracking-wider text-[#7c1d3c] block">Select Battery Model / Cluster</label>
                           <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Cluster: {getProductClusterTag(stickerSerial)}
                           </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                           {[
                              { id: '72V30A', label: '72V30A (EV)', cluster: 'EV' },
                              { id: 'BAT-AUTO-35', label: 'AUTO 35Ah', cluster: 'AUTO' },
                              { id: 'BAT-INV-150', label: 'INV 150Ah', cluster: 'INV' },
                              { id: 'BAT-NEXT-200', label: 'NEXT 200Ah', cluster: 'INV' },
                              { id: 'BAT-VRLA-100', label: 'VRLA 100Ah', cluster: 'VRLA' },
                              { id: 'LIT-200', label: 'LIT 200Ah', cluster: 'LIT' },
                           ].map((item) => {
                              const isCurrentCluster = getProductClusterTag(stickerSerial) === item.cluster;
                              return (
                                 <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                       const seq = getNextSerialSequenceForModel(item.id, data?.finishedGoods || []);
                                       setStickerSerial(generateModelSpecificSerial(item.id, seq));
                                    }}
                                    className={cn(
                                       "px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all text-center truncate",
                                       isCurrentCluster
                                          ? "bg-[#7c1d3c] text-white border-[#7c1d3c] shadow-sm font-black"
                                          : "bg-white text-slate-700 border-slate-200 hover:border-[#7c1d3c]/40 hover:text-[#7c1d3c]"
                                    )}
                                 >
                                    {item.label}
                                 </button>
                               );
                           })}
                        </div>
                     </div>

                     <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-black uppercase tracking-wider text-[#7c1d3c] block">Battery Serial Number</label>
                        <input 
                           type="text" 
                           value={stickerSerial}
                           onChange={(e) => setStickerSerial(e.target.value.toUpperCase())}
                           className="w-full bg-white border border-[#7c1d3c]/30 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none text-[#7c1d3c] focus:border-[#7c1d3c]"
                           placeholder="e.g. AESPL  EV  28G26000001"
                        />
                     </div>
                  </div>

                  {/* Decal live preview badge */}
                  <div className={cn(
                     "p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                     stickerTheme === 'slate' && "bg-slate-50 border-slate-200 text-slate-800",
                     stickerTheme === 'crimson' && "bg-rose-50 border-rose-200 text-rose-800",
                     stickerTheme === 'emerald' && "bg-emerald-50 border-emerald-200 text-emerald-800"
                  )}>
                     <div className="space-y-2 text-left min-w-0">
                        <span className="text-[7.5px] font-black uppercase tracking-[0.25em] text-[#7c1d3c]">POWERCARE DIGITAL INSURED</span>
                        <h5 className={cn(
                           "font-black text-[11.5px] uppercase tracking-tight truncate leading-none mt-1",
                           stickerTheme === 'slate' && "text-slate-900",
                           stickerTheme === 'crimson' && "text-rose-950",
                           stickerTheme === 'emerald' && "text-emerald-950"
                        )}>{stickerSerial || generateModelSpecificSerial('EV', 1)}</h5>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">SCAN FOR WARRANTY & SERVICE</p>
                        <div className="pt-2 text-[7px] font-mono font-bold text-slate-500 flex items-center gap-1 leading-none border-t border-slate-200 select-none uppercase">
                           <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              stickerTheme === 'slate' && "bg-slate-500",
                              stickerTheme === 'crimson' && "bg-rose-500",
                              stickerTheme === 'emerald' && "bg-emerald-500"
                           )}></span> Direct IoT Decal Link
                        </div>
                     </div>
                     <div className="p-2 bg-white rounded-xl shadow shrink-0 border border-slate-100">
                        <QRCodeSVG value={`${loyaltyUrl}?serial=${stickerSerial}`} size={56} />
                     </div>
                  </div>

                  <button 
                     onClick={() => setIsPreviewPrintOpen(true)}
                     className="w-full py-3.5 bg-white hover:bg-[#fbf4df]/40 text-[#7c1d3c] rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-[#7c1d3c]/40 active:scale-95 italic font-sans"
                  >
                     <Printer size={12} className="text-[#7c1d3c]" /> Print Chassis Labelling Tags
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* ENTERPRISE ENGAGEMENT DATA CONSOLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 shadow-2xl space-y-8 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 gap-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center">
               <Sliders size={20} className="mr-2 text-[#912551]" /> Customer Handshake & Campaigns Console
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest underline decoration-[#912551] underline-offset-4 decoration-2">Ecosystem wide data tables & real-time monitoring</p>
          </div>
          <div className="flex border border-slate-200 rounded-2xl p-1.5 bg-slate-50 gap-1.5 shrink-0 self-start md:self-auto">
             {[
                { id: 'scans', label: 'Simulate Scans Logs' },
                { id: 'campaigns', label: 'Campaigns & Offers' },
                { id: 'batches', label: 'Batch QR Runs' }
             ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setConsoleTab(tab.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none",
                    consoleTab === tab.id 
                      ? "bg-[#912551] text-white shadow-lg shadow-[#912551]/20 font-sans" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  )}
                >
                   {tab.label}
                </button>
             ))}
          </div>
        </div>

        {/* Tab content Scans Logs */}
        {consoleTab === 'scans' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
               <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Simulate DTC Handshake Scan Telemetry</h4>
                  <p className="text-[11px] font-bold text-slate-600 mt-0.5">Capturing direct customer IoT handshakes triggered via physical QR codes</p>
               </div>
               <button 
                  onClick={() => {
                     setSimParams({ model: getProductsList()[0]?.id || '', user: '', location: '' });
                     setIsSimulateModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center shadow-md transition-all italic"
               >
                  <Zap size={12} className="mr-1 text-[#e38676]" /> Ingest Scan Handshake
               </button>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest">
                    <th className="py-4.5 px-6">Scan ID</th>
                    <th className="py-4.5 px-6">Battery Model</th>
                    <th className="py-4.5 px-6">Customer Identifier</th>
                    <th className="py-4.5 px-6">Geographic Location</th>
                    <th className="py-4.5 px-6">Timestamp</th>
                    <th className="py-4.5 px-6 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {engagement.recentScans?.map((scan: any, idx: number) => (
                    <tr key={scan.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-400">{scan.id || `S-00${9 - idx}`}</td>
                      <td className="py-4 px-6 font-mono text-xs font-extrabold text-[#912551] uppercase tracking-tight">{scan.model}</td>
                      <td className="py-4 px-6 font-extrabold text-xs text-slate-800">{scan.user || 'Anonymous User'}</td>
                      <td className="py-4 px-6 text-xs font-bold text-slate-550">{scan.location || 'Unknown Node'}</td>
                      <td className="py-4 px-6 text-xs text-slate-400 font-mono font-medium">{scan.time || 'Just now'}</td>
                      <td className="py-4 px-6 text-right">
                         <span className="inline-flex items-center text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 shadow-xs">
                            <CheckCircle2 size={10} className="mr-1 text-emerald-500 fill-emerald-100" /> Handshake Verified
                         </span>
                      </td>
                    </tr>
                  ))}
                  {(!engagement.recentScans || engagement.recentScans.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                         No handshakes recorded in live network loop.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab content Campaigns */}
        {consoleTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
               <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ecosystem Marketing Campaigns & Offers</h4>
                  <p className="text-[11px] font-bold text-slate-600 mt-0.5">Active customer loyalty incentives associated with QR registration gateways</p>
               </div>
               <button 
                  onClick={() => {
                     setNewCampaign({ title: '', desc: '', category: 'EV Battery' });
                     setIsAddCampaignOpen(true);
                     setIsCampaignModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center shadow-md transition-all italic"
               >
                  <Plus size={12} className="mr-1" /> Establish Campaign Node
               </button>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest">
                    <th className="py-4.5 px-6">Campaign ID</th>
                    <th className="py-4.5 px-6">Campaign Name</th>
                    <th className="py-4.5 px-6">Category Group</th>
                    <th className="py-4.5 px-6">Inbound Description</th>
                    <th className="py-4.5 px-6">Telemetry Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {campaigns.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4.5 px-6 font-mono text-xs font-bold text-slate-400 uppercase">{c.id}</td>
                      <td className="py-4.5 px-6 font-extrabold text-xs text-slate-900 group-hover:text-[#912551] transition-colors">{c.title}</td>
                      <td className="py-4.5 px-6">
                         <span className="text-[9px] font-black uppercase tracking-wider bg-[#e38676]/10 text-[#912551] px-2 py-0.5 rounded-lg border border-[#e38676]/20">
                            {c.category}
                         </span>
                      </td>
                      <td className="py-4.5 px-6 text-xs font-medium text-slate-500 max-w-sm truncate" title={c.desc}>{c.desc}</td>
                      <td className="py-4.5 px-6">
                         <span className={cn(
                            "inline-flex items-center text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-xs animate-in zoom-in-95",
                            c.status === "ACTIVE" 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-amber-50 text-amber-500 border-amber-150"
                         )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5 animate-pulse", c.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-400")}></span>
                            {c.status}
                         </span>
                      </td>
                      <td className="py-4.5 px-6 text-right">
                         <div className="flex items-center justify-end space-x-2">
                           <button 
                             onClick={() => toggleCampaign(c.id)}
                             className={cn(
                               "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border",
                               c.status === "ACTIVE" ? "bg-amber-50 text-amber-655 hover:bg-amber-100 border-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100"
                             )}
                           >
                              {c.status === "ACTIVE" ? "Pause" : "Live"}
                           </button>
                           <button 
                             onClick={() => deleteCampaign(c.id)}
                             className="p-1 px-2.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors border border-slate-100"
                             title="Delete Campaign Node"
                           >
                              <Trash2 size={12} />
                           </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-black uppercase tracking-widest text-slate-405">
                         No campaign offers established.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab content Batches */}
        {consoleTab === 'batches' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
               <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Instant Batch QR Label Generator Logs</h4>
                  <p className="text-[11px] font-bold text-slate-600 mt-0.5">Physical serialization runs mapping individual items back to manufacturer ERP records</p>
               </div>
               <button 
                  onClick={() => {
                     setBatchParams({ productId: getProductsList()[0]?.id || '', qty: 50, prefix: 'AESPL  EV' });
                     setGeneratedSerials([]);
                     setIsBatchQRModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center shadow-md transition-all italic animate-pulse"
               >
                  <QrCode size={12} className="mr-1 text-[#e38676]" /> Trigger Batch Generator
               </button>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest">
                    <th className="py-4.5 px-6">Run ID</th>
                    <th className="py-4.5 px-6">Ecosystem Prefix</th>
                    <th className="py-4.5 px-6">Identified Product Type</th>
                    <th className="py-4.5 px-6">Serialized Qty</th>
                    <th className="py-4.5 px-6">Issued Date</th>
                    <th className="py-4.5 px-6 text-right">Ecosystem Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {batches.map((batch: any, idx: number) => (
                    <tr key={batch.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4.5 px-6 font-mono text-xs font-bold text-slate-400 uppercase">{batch.id || `batch-${idx + 1}`}</td>
                      <td className="py-4.5 px-6 font-mono text-xs font-extrabold text-[#912551]">{batch.prefix || 'AESPL  EV'}</td>
                      <td className="py-4.5 px-6 text-xs font-bold text-slate-800">{batch.productName || batch.productId}</td>
                      <td className="py-4.5 px-6 text-xs font-mono font-black text-slate-900">{batch.qty || 50} Units</td>
                      <td className="py-4.5 px-6 text-xs text-slate-400 font-mono font-medium">
                         {batch.date ? new Date(batch.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Active recently'}
                      </td>
                      <td className="py-4.5 px-6 text-right">
                         <button 
                           onClick={() => {
                              // Re-generate visually
                              setBatchParams({ productId: batch.productId, qty: batch.qty, prefix: batch.prefix || 'AESPL  EV' });
                              // Fill local serials list
                              const list = [];
                              const targetModel = batch.productId || batch.prefix || 'EV';
                              for(let i=0; i < batch.qty; i++) {
                                 list.push(generateModelSpecificSerial(targetModel, 1 + i));
                              }
                              setGeneratedSerials(list);
                              setIsBatchQRModalOpen(true);
                           }}
                           className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-150 transition-colors"
                         >
                            Load codes
                         </button>
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                         No manufacturing serialization runs generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: MARKETING CAMPAIGNS & PROMOTIONS (MOCKUP 1 INTERACTION) */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[130] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-3xl w-full max-w-3xl overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Header matching Image 1 exactly */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Marketing campaigns & offers</h3>
                <p className="text-[10px] font-black text-[#912551] uppercase tracking-widest mt-2 font-mono">Loyalty drive integrations for direct customer scans</p>
                <div className="h-0.5 w-40 bg-[#e38676] mt-3"></div>
              </div>
              <button 
                onClick={() => {
                  setIsCampaignModalOpen(false);
                  setIsAddCampaignOpen(false);
                }}
                className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[480px] overflow-y-auto bg-slate-50/50">
              {!isAddCampaignOpen ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pr-1">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active ecosystem campaigns & offers</h4>
                     <button 
                       onClick={() => setIsAddCampaignOpen(true)}
                       className="px-5 py-3 bg-[#912551] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#721c40] transition-all flex items-center shadow-md italic"
                     >
                        <Plus size={14} className="mr-1.5 text-[#e38676]" /> Post Campaign Offer
                     </button>
                  </div>

                  <div className="divide-y divide-slate-150/65 border border-slate-150 rounded-[2rem] bg-white overflow-hidden shadow-inner">
                     {campaigns.map((c: any) => (
                        <div key={c.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all gap-6">
                           <div className="space-y-1">
                              <div className="flex items-center space-x-3">
                                 <h5 className="font-extrabold text-[13px] text-slate-900 uppercase tracking-tight">{c.title}</h5>
                                 <span className="text-[8px] font-black text-[#912551] bg-[#e38676]/10 px-2 py-0.5 rounded uppercase border border-[#e38676]/15">{c.category}</span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium max-w-xl">{c.desc}</p>
                           </div>
                           <div className="flex items-center space-x-3 shrink-0">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                                c.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-450"
                              )}>
                                 {c.status}
                              </span>
                              <button 
                                onClick={() => toggleCampaign(c.id)}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xs border",
                                  c.status === "ACTIVE" ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100"
                                )}
                              >
                                 {c.status === "ACTIVE" ? "Pause" : "Live"}
                              </button>
                              <button 
                                onClick={() => deleteCampaign(c.id)}
                                className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 bg-slate-50 rounded-xl transition-all border border-slate-150"
                              >
                                 <Trash2 size={13} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={addCampaign} className="space-y-6 p-8 rounded-[2rem] bg-white border border-slate-150 shadow-md">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic border-b border-slate-200 pb-3">Create Promotion Offer Campaign</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Campaign Title</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-900 focus:ring-1 focus:ring-[#912551] outline-none"
                          placeholder="e.g. Smart Monsoon Energy SOH Rebate"
                          value={newCampaign.title}
                          onChange={(e) => setNewCampaign({...newCampaign, title: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target category group</label>
                        <select 
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-900 outline-none"
                          value={newCampaign.category}
                          onChange={(e) => setNewCampaign({...newCampaign, category: e.target.value})}
                        >
                           <option value="EV Battery">EV Battery Module</option>
                           <option value="Solar / Inverter">Solar / Inverter Storage</option>
                           <option value="ESS / Industrial">ESS & Industrial Matrix</option>
                           <option value="Accessories">Accessories & Auxiliary</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Campaign brief Description</label>
                     <textarea 
                       required
                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
                       rows={3}
                       placeholder="Detail specific perks or discounts customers unlock immediately on dynamic QR lookup registration..."
                       value={newCampaign.desc}
                       onChange={(e) => setNewCampaign({...newCampaign, desc: e.target.value})}
                     />
                  </div>

                  <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
                     <button 
                       type="button"
                       onClick={() => setIsAddCampaignOpen(false)}
                       className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 font-sans"
                     >
                        Cancel
                     </button>
                     <button 
                       type="submit"
                       className="px-8 py-2.5 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl text-[10px] font-black uppercase tracking-widest filter drop-shadow-md italic"
                     >
                        Establish Campaign Node
                     </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  setIsCampaignModalOpen(false);
                  setIsAddCampaignOpen(false);
                }}
                className="px-8 py-3 bg-slate-950 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all font-sans"
              >
                Close Deck Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH QR GENERATOR */}
      {isBatchQRModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[130] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-3xl w-full max-w-4xl overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Header precisely as detailed in Image 2 */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Instant batch QR label generator</h3>
                <p className="text-[10px] font-black text-[#912551] uppercase tracking-widest mt-2 font-mono">Generate and download secure physical tracking tags for manufacturing runs</p>
                <div className="h-0.5 w-40 bg-[#e38676] mt-3"></div>
              </div>
              <button 
                onClick={() => setIsBatchQRModalOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[480px] overflow-y-auto bg-slate-50/50">
              <form onSubmit={generateBatchQRs} className="p-6 rounded-[2rem] bg-white border border-slate-150 grid grid-cols-1 md:grid-cols-12 gap-5 shadow-sm">
                 <div className="space-y-2 md:col-span-5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Inventory Blueprint</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-3.5 text-xs font-black text-slate-800 outline-none"
                      value={batchParams.productId}
                      onChange={(e) => {
                        const prodId = e.target.value;
                        const clusterTag = getProductClusterTag(prodId);
                        setBatchParams({
                          ...batchParams,
                          productId: prodId,
                          prefix: `AESPL  ${clusterTag}`
                        });
                      }}
                    >
                       <option value="">Select Blueprint</option>
                       {getProductsList().map((p: any) => (
                         <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                       ))}
                    </select>
                 </div>

                 <div className="space-y-2 md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Batch Serial Prefix / Grade</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-3 text-xs font-black text-slate-900 outline-none uppercase font-mono"
                      placeholder="e.g. AESPL  EV"
                      value={batchParams.prefix}
                      onChange={(e) => setBatchParams({...batchParams, prefix: e.target.value})}
                    />
                 </div>

                 <div className="space-y-2 md:col-span-4 flex flex-col justify-end">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Quantity & Trigger</label>
                    <div className="flex gap-3">
                       <input 
                         type="number"
                         min={1}
                         max={100}
                         required
                         className="w-20 bg-slate-50 border border-slate-205 rounded-xl px-3 py-3 text-xs font-mono font-black text-slate-900 outline-none text-[#912551] text-center"
                         value={batchParams.qty}
                         onChange={(e) => setBatchParams({...batchParams, qty: parseInt(e.target.value) || 0})}
                       />
                       <button 
                         type="submit"
                         className="flex-1 py-3 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic flex items-center justify-center shadow-lg shadow-[#912551]/20 group"
                       >
                          <QrCode size={14} className="mr-2 text-[#e38676] group-hover:rotate-12 transition-transform" /> Generate tags
                       </button>
                    </div>
                 </div>
              </form>

              {/* QR cards list */}
              {generatedSerials.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#912551]/5 p-5 rounded-2xl border border-[#912551]/10 gap-4">
                     <p className="text-[10px] font-black text-[#912551] uppercase tracking-widest flex items-center">
                        <CheckCircle2 size={16} className="mr-2 text-emerald-600 shrink-0" /> SUCCESSFULLY SERIALIZED {generatedSerials.length} CODES INTO SYSTEM REGISTRY
                     </p>
                     <div className="flex space-x-2 shrink-0">
                        <button 
                           type="button"
                           onClick={() => printElement("generated-batch-qr-container", { title: "Batch_QR_Labels" })}
                           className="px-4 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center transition-all shadow-sm"
                        >
                           <Printer size={12} className="mr-1.5" /> Print batch
                        </button>
                        <button 
                           type="button"
                           onClick={() => {
                              const csvRows = [["Serial Number", "Validation Link"]];
                              generatedSerials.forEach(s => {
                                 csvRows.push([s, `${loyaltyUrl}?serial=${s}`]);
                              });
                              const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(r => r.map(x => `"${x}"`).join(",")).join("\n");
                              const encodedUri = encodeURI(csvContent);
                              const link = document.createElement("a");
                              link.setAttribute("href", encodedUri);
                              link.setAttribute("download", `serialized_batch_export_${new Date().toISOString().substring(0,10)}.csv`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                           }}
                           className="px-4 py-2.5 bg-[#912551] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#721c40] flex items-center transition-all shadow-sm"
                        >
                           <Download size={12} className="mr-1.5 text-[#e38676]" /> Export CSV
                        </button>
                     </div>
                  </div>

                  <div id="generated-batch-qr-container" className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                     {generatedSerials.map((s, i) => (
                        <div key={i} className="bg-white p-4 rounded-3xl border border-slate-150 flex flex-col items-center text-center space-y-3 shadow-md hover:scale-105 transition-transform">
                           <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                              <QRCodeSVG value={`${loyaltyUrl}?serial=${s}`} size={72} />
                           </div>
                           <p className="text-[8px] font-black text-slate-500 font-mono tracking-tighter truncate w-full">{s}</p>
                        </div>
                     ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Close button matching Image 2 */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsBatchQRModalOpen(false)}
                className="px-8 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all font-sans"
              >
                Close generator Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT DESTINATION URL */}
      {isEditUrlModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[130] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-150 shadow-3xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950 tracking-tighter uppercase italic leading-none">Redirect loyalty link</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Direct scan address endpoint mapping</p>
              </div>
              <button 
                onClick={() => setIsEditUrlModalOpen(false)}
                className="p-2.5 text-slate-400 hover:text-slate-900 bg-slate-150 rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Loyalty Hub Destination Address</label>
                 <input 
                   type="url"
                   className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-[#912551] outline-none"
                   placeholder="e.g. https://brand.com/scan/handshake"
                   value={loyaltyUrlInput}
                   onChange={(e) => setLoyaltyUrlInput(e.target.value)}
                 />
                 <p className="text-[8px] text-slate-400 font-bold leading-normal pl-1">Scanning an active QR label immediately routes customer handshakes to this secure domain.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button 
                onClick={() => setIsEditUrlModalOpen(false)}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 font-sans"
              >
                Cancel
              </button>
              <button 
                onClick={saveLoyaltyUrl}
                className="px-8 py-3 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all italic"
              >
                Apply Link Redirect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SIMULATE REGISTERED SCAN (MOCKUP 3 INTERACTION) */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[130] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-3xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">
            {/* Header precisely as styled in Image 3 */}
            <div className="p-8 border-b border-slate-150 flex items-center justify-between bg-white relative">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none font-sans">Simulate DTC Handshake scan</h3>
                <p className="text-[10px] font-black text-[#912551] uppercase tracking-widest mt-2">Inject direct QR scans into live network metrics</p>
                <div className="h-0.5 w-40 bg-[#e38676] mt-3"></div>
              </div>
              <button 
                onClick={() => setIsSimulateModalOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content matching Image 3 structure */}
            <form onSubmit={triggerSimulation} className="p-8 space-y-5 bg-slate-50/50">
              <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Simulate Battery Model</label>
                 <select 
                   className="w-full bg-white border border-slate-205 rounded-xl px-4 py-3.5 text-xs font-black text-slate-800 outline-none"
                   value={simParams.model}
                   onChange={(e) => setSimParams({...simParams, model: e.target.value})}
                 >
                    {getProductsList().map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Simulate User Identifier</label>
                 <input 
                   type="text"
                   className="w-full bg-white border border-slate-205 rounded-xl px-4 py-3.5 text-xs font-extrabold text-slate-900 outline-none placeholder:text-slate-355"
                   placeholder="e.g. Ramesh Dev (Leave blank for random)"
                   value={simParams.user}
                   onChange={(e) => setSimParams({...simParams, user: e.target.value})}
                 />
              </div>

              <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Simulate Customer Location</label>
                 <input 
                   type="text"
                   className="w-full bg-white border border-slate-205 rounded-xl px-4 py-3.5 text-xs font-extrabold text-[#111827] outline-none placeholder:text-slate-355"
                   placeholder="e.g. Nagpur, MH (Leave blank for random)"
                   value={simParams.location}
                   onChange={(e) => setSimParams({...simParams, location: e.target.value})}
                 />
              </div>

              {/* Action Buttons matching Image 3 */}
              <div className="flex justify-end pt-4 border-t border-slate-150 space-x-3.5">
                 <button 
                   type="button"
                   onClick={() => setIsSimulateModalOpen(false)}
                   className="px-6 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[10.5px] font-black uppercase tracking-widest text-[#912551] font-sans"
                 >
                    Cancel
                 </button>
                 <button 
                   type="submit"
                   className="px-8 py-3 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest shadow-lg shadow-[#912551]/25 transition-all italic flex items-center"
                 >
                    <Zap size={14} className="mr-1 text-[#e38676]" /> Execute Scan
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PRINTABLE CHASSIS STICKER PREVIEW */}
      {isPreviewPrintOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[130] p-6 animate-in fade-in duration-300 text-slate-900">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-3xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between no-print">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Chassis Sticker Print Sheet</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ready-to-print industrial battery serial labels</p>
              </div>
              <button 
                onClick={() => setIsPreviewPrintOpen(false)}
                className="p-2.5 text-slate-400 hover:text-slate-950 bg-slate-100 rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Print Area Preview */}
            <div className="p-8 space-y-6 bg-slate-50/50 max-h-[420px] overflow-y-auto no-scrollbar">
              <p className="text-[11px] text-slate-500 text-center leading-relaxed font-semibold no-print">
                Below is the printable physical layout for heavy-duty metal chassis labels. Printed tags can be pasted on battery casing for instant direct customer App pairing.
              </p>

              {/* A grid of several stickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-section">
                {[1, 2, 3, 4].map((num) => {
                  const serialSuffix = (() => {
                    const digitsMatch = stickerSerial.match(/\d+$/);
                    if (digitsMatch) {
                      const baseNum = parseInt(digitsMatch[0], 10);
                      const prefixPart = stickerSerial.slice(0, stickerSerial.length - digitsMatch[0].length);
                      const incremented = String(baseNum + num - 1).padStart(digitsMatch[0].length, '0');
                      return `${prefixPart}${incremented}`;
                    }
                    return `${stickerSerial} #${num}`;
                  })();
                  return (
                    <div 
                      key={num} 
                      className={cn(
                        "p-4 rounded-xl border border-dashed flex flex-col justify-between space-y-3 bg-white text-left select-none relative",
                        stickerTheme === 'slate' && "border-slate-300 text-slate-950",
                        stickerTheme === 'crimson' && "border-rose-300 text-slate-950",
                        stickerTheme === 'emerald' && "border-emerald-300 text-slate-950"
                      )}
                    >
                      {/* Brand Label corner */}
                      <div className="flex justify-between items-center">
                        <span className="text-[7px] font-black text-[#912551] uppercase tracking-wide">ARCENOL POWERCARE</span>
                        <span className="text-[6.5px] font-bold text-slate-400">TAG #{num}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-slate-900 font-mono tracking-tight truncate uppercase">{serialSuffix}</p>
                          <p className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">Scan to Verify & Register</p>
                        </div>
                        <div className="p-1 bg-slate-50 rounded border border-slate-100 shrink-0">
                          <QRCodeSVG value={`${loyaltyUrl}?serial=${serialSuffix}`} size={36} />
                        </div>
                      </div>
                      <div className="text-[6px] font-black text-slate-400 tracking-widest text-center border-t border-slate-105 pt-1 uppercase">
                 ★ Certified Eco-System Node ★
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center no-print">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Format: 4x Decal Sheets</span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setIsPreviewPrintOpen(false)}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-350 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-705 font-sans"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="px-8 py-3 bg-[#912551] hover:bg-[#721c40] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all italic"
                >
                  Trigger Spool Print
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
