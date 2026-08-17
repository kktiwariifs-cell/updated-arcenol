import React, { useState } from "react";
import { generateBatterySerial, generateModelSpecificSerial, getNextSerialSequenceForModel, FormattedSerial } from "../lib/serialUtils";
import {
  Factory,
  Box,
  QrCode,
  Printer,
  CheckCircle2,
  CheckCircle,
  ArrowLeft,
  History,
  Database,
  Wrench,
  Plus,
  AlertCircle,
  Tag,
  Cpu,
  Zap,
  Activity,
  BadgeCheck,
  Package,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  Settings,
  Microscope,
  FlaskConical,
  ClipboardCheck,
  ArrowRight,
  Edit,
  Trash2,
  X,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  FileSpreadsheet,
  FileText,
  Save,
  Loader2,
} from "lucide-react";
import { useERPData, notifyCrossTabSync } from "../hooks/useERPData";
import { downloadReportDataAsPDF } from "../lib/pdfGenerator";
import { useAuthStore, UserRole } from "../store/authStore";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { cn } from "../lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";


const SafeBarcode: React.FC<{ value: string }> = ({ value }) => {
  const safeVal = String(value || 'AESPL  EV  28G26000001').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const BarcodeComponent = (Barcode as any).default || Barcode;
  return (
    <div className="flex flex-col items-center justify-center max-w-full overflow-hidden p-2">
      <BarcodeComponent
        value={safeVal || 'AESPL  EV  28G26000001'}
        width={1.2}
        height={45}
        displayValue={false}
        margin={4}
        background="#ffffff"
      />
    </div>
  );
};

export const Production: React.FC<{ initialSubTab?: "wip" | "assembly" | "grading" | "eol_qc" | "scrap_operator" | "history" }> = ({ initialSubTab = "wip" }) => {
  const { data, loading, refetch } = useERPData();
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const [activeSubTab, setActiveSubTab] = useState<
    "wip" | "assembly" | "grading" | "eol_qc" | "scrap_operator" | "history"
  >(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Phase 2: QC & Manufacturing Data States
  const [cellGradingBatches, setCellGradingBatches] = useState<any[]>([]);
  const [eolCertificates, setEolCertificates] = useState<any[]>([]);
  const [scrapLogs, setScrapLogs] = useState<any[]>([]);

  // Phase 2: Modals & Dialog States
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [viewCurveBatch, setViewCurveBatch] = useState<any | null>(null);

  const [isEolModalOpen, setIsEolModalOpen] = useState(false);
  const [viewEolCert, setViewEolCert] = useState<any | null>(null);

  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);

  // Form Submission Loaders
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [isSubmittingEol, setIsSubmittingEol] = useState(false);
  const [isSubmittingScrap, setIsSubmittingScrap] = useState(false);

  // Form Fields - Cell Grading Batch
  const [gbBatchCode, setGbBatchCode] = useState(`LOT-LFP-32700-${Math.floor(100 + Math.random() * 900)}`);
  const [gbSupplierLot, setGbSupplierLot] = useState("CATL-2026-A8");
  const [gbTotalTested, setGbTotalTested] = useState(500);
  const [gbGradeA, setGbGradeA] = useState(485);
  const [gbGradeB, setGbGradeB] = useState(12);
  const [gbGradeC, setGbGradeC] = useState(3);
  const [gbAvgCap, setGbAvgCap] = useState(3.22);
  const [gbAvgIR, setGbAvgIR] = useState(18.4);
  const [gbAmbientTemp, setGbAmbientTemp] = useState(25.0);
  const [gbChannelCount, setGbChannelCount] = useState(64);
  const [gbInspector, setGbInspector] = useState(user?.name || "QC Lead Suresh");

  // Form Fields - EOL Battery Quality Cert
  const [eolSerial, setEolSerial] = useState("AESPL  EV  28G26000001");
  const [eolModel, setEolModel] = useState("72V30A");
  const [eolHiPotResistance, setEolHiPotResistance] = useState(500);
  const [eolDielectricResult, setEolDielectricResult] = useState("PASS (1500V AC 1 min)");
  const [eolBmsMac, setEolBmsMac] = useState("A4:C1:38:90:FE:12");
  const [eolBmsFirmware, setEolBmsFirmware] = useState("v2.4.12-BMS-CAN");
  const [eolCellDelta, setEolCellDelta] = useState(12);
  const [eolPackCapacity, setEolPackCapacity] = useState(30.8);
  const [eolTestedBy, setEolTestedBy] = useState(user?.name || "Senior QC Engineer Anil Mehta");
  const [eolTestBenchId, setEolTestBenchId] = useState("TB-02-HV");

  // Form Fields - Machine Operator Scrap Log
  const [scMachineId, setScMachineId] = useState("SPOT_WELDER_01");
  const [scMachineName, setScMachineName] = useState("Pneumatic Spot Welder #1");
  const [scShift, setScShift] = useState("Shift A (Morning 06:00 - 14:00)");
  const [scOperator, setScOperator] = useState("Vikram R.");
  const [scMaterialId, setScMaterialId] = useState("RM-NICKEL");
  const [scMaterialName, setScMaterialName] = useState("Nickel Strip 0.15mm");
  const [scQty, setScQty] = useState(2.5);
  const [scUnit, setScUnit] = useState("Kg");
  const [scReason, setScReason] = useState("Electrode Burnout / Weld Spatter");
  const [scCost, setScCost] = useState(1875);
  const [scSupervisor, setScSupervisor] = useState("QC Supv - K. Sharma");

  const fetchQcData = async () => {
    try {
      const [cgbRes, eolRes, scrapRes] = await Promise.all([
        fetch('/api/qc/cell-grading-batches'),
        fetch('/api/qc/eol-certificates'),
        fetch('/api/qc/scrap-logs')
      ]);
      if (cgbRes.ok) setCellGradingBatches(await cgbRes.json());
      if (eolRes.ok) setEolCertificates(await eolRes.json());
      if (scrapRes.ok) setScrapLogs(await scrapRes.json());
    } catch (err) {
      console.error('Error fetching Phase 2 QC data:', err);
    }
  };

  React.useEffect(() => {
    fetchQcData();
  }, []);

  const handleCreateCellBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBatch(true);
    // Temp Compensation Factor: R25 = RT / (1 + 0.00393 * (T - 25))
    const tempComp = Number((1 / (1 + 0.00393 * (gbAmbientTemp - 25))).toFixed(4));
    try {
      const res = await fetch('/api/qc/cell-grading-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchCode: gbBatchCode,
          supplierLotNo: gbSupplierLot,
          totalCellsTested: gbTotalTested,
          gradeAQty: gbGradeA,
          gradeBQty: gbGradeB,
          gradeCQty: gbGradeC,
          avgCapacityAh: gbAvgCap,
          avgOhmicImpedancemOm: gbAvgIR,
          ambientTempCelsius: gbAmbientTemp,
          tempCompensationFactor: tempComp,
          testerChannelCount: gbChannelCount,
          inspectedBy: gbInspector,
        })
      });
      if (res.ok) {
        setIsBatchModalOpen(false);
        fetchQcData();
        refetch();
        notifyCrossTabSync('CELL_GRADING_BATCH');
      } else {
        alert("Failed to create cell grading batch");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleParseCsvTester = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    let total = 0, a = 0, b = 0, c = 0;
    let sumCap = 0, sumIR = 0;

    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('channel')) return; // skip header
      const parts = line.split(',');
      if (parts.length >= 3) {
        const cap = parseFloat(parts[1]) || 3.2;
        const ir = parseFloat(parts[2]) || 18.0;
        total++;
        sumCap += cap;
        sumIR += ir;
        if (cap >= 3.2 && ir <= 20) a++;
        else if (cap >= 3.0) b++;
        else c++;
      }
    });

    if (total > 0) {
      setGbTotalTested(total);
      setGbGradeA(a);
      setGbGradeB(b);
      setGbGradeC(c);
      setGbAvgCap(Number((sumCap / total).toFixed(2)));
      setGbAvgIR(Number((sumIR / total).toFixed(1)));
      setIsCsvModalOpen(false);
      setCsvText("");
    } else {
      alert("No valid CSV rows parsed. Format: Channel, CapacityAh, IRmOm");
    }
  };

  const handleCreateEolCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEol(true);
    try {
      const res = await fetch('/api/qc/eol-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: eolSerial,
          packModel: eolModel,
          hiPotInsulationResistanceMOm: eolHiPotResistance,
          dielectricBreakdownTest: eolDielectricResult,
          bmsMacAddress: eolBmsMac,
          bmsFirmwareVersion: eolBmsFirmware,
          cellVoltageDeltaMaxmV: eolCellDelta,
          packCapacityAh: eolPackCapacity,
          testedBy: eolTestedBy,
          testBenchId: eolTestBenchId,
        })
      });
      if (res.ok) {
        setIsEolModalOpen(false);
        fetchQcData();
        refetch();
        notifyCrossTabSync('EOL_CERTIFICATE');
      } else {
        alert("Failed to issue EOL Quality Certificate");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEol(false);
    }
  };

  const handleCreateScrapLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingScrap(true);
    try {
      const res = await fetch('/api/qc/scrap-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: scMachineId,
          machineName: scMachineName,
          shift: scShift,
          operatorName: scOperator,
          materialId: scMaterialId,
          materialName: scMaterialName,
          scrapQty: scQty,
          unit: scUnit,
          scrapReason: scReason,
          financialScrapCost: scCost,
          qcSupervisorSignOff: scSupervisor,
        })
      });
      if (res.ok) {
        setIsScrapModalOpen(false);
        fetchQcData();
        refetch();
        notifyCrossTabSync('SCRAP_LOGGED');
      } else {
        alert("Failed to log machine scrap entry");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingScrap(false);
    }
  };

  // Production Step State
  const [step, setStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState("");
  const [qty, setQty] = useState(1);
  const [targetWarehouse, setTargetWarehouse] = useState("Main Warehouse");
  const [targetRack, setTargetRack] = useState("A-01");
  const [serials, setSerials] = useState<string[]>([]);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // WIP State
  const [wipStep, setWipStep] = useState(1);
  const [wipName, setWipName] = useState("Cell Pack Assembly");
  const [wipQty, setWipQty] = useState(10);
  const [wipInitialStage, setWipInitialStage] = useState("WELDING");

  // Custom WIP Stage Admin state
  const [newStageName, setNewStageName] = useState("");
  const [stageError, setStageError] = useState("");
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [editingStageKey, setEditingStageKey] = useState<string | null>(null);
  const [editingStageValue, setEditingStageValue] = useState("");

  const handleUpdateWipStageName = async (oldStage: string) => {
    setStageError("");
    const normalized = editingStageValue.trim().toUpperCase().replace(/\s+/g, '_');
    if (!normalized) return;
    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      setStageError("Codes must contain only uppercase letters, numbers, & underscores");
      return;
    }
    try {
      const res = await fetch("/api/production/wip/stages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldStage, newStage: normalized }),
      });
      if (res.ok) {
        setEditingStageKey(null);
        setEditingStageValue("");
        refetch();
      } else {
        setStageError("Error renaming process stage");
      }
    } catch (err) {
      setStageError("Network error renaming stage");
    }
  };

  const handleDeleteWipStage = async (stageToDelete: string) => {
    if (!confirm(`Are you sure you want to delete stage "${stageToDelete}" from registry?`)) return;
    try {
      const res = await fetch(`/api/production/wip/stages?stage=${encodeURIComponent(stageToDelete)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        refetch();
      } else {
        setStageError("Error deleting stage");
      }
    } catch (err) {
      setStageError("Network error deleting stage");
    }
  };

  const [selectedWipCommitments, setSelectedWipCommitments] = useState<any | null>(null);

  const [editingWipId, setEditingWipId] = useState<string | null>(null);
  const [editingWipName, setEditingWipName] = useState("");
  const [editingWipQty, setEditingWipQty] = useState<number>(0);

  const handleStartEditWip = (item: any) => {
    setEditingWipId(item.id);
    setEditingWipName(item.name);
    setEditingWipQty(item.qty);
  };

  const handleSaveWipEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/production/wip/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingWipName,
          qty: editingWipQty
        })
      });
      if (res.ok) {
        setEditingWipId(null);
        refetch();
      } else {
        alert("Failed to save WIP updates");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWip = async (id: string) => {
    if (!confirm("Are you sure you want to delete this WIP run? Raw materials reserved will be returned to stock.")) return;
    try {
      const res = await fetch(`/api/production/wip/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        refetch();
      } else {
        alert("Failed to delete WIP batch.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const stagesList: string[] = data?.wipStages || [
    "CELL_SORTING_&_MATRIX_ALIGNMENT",
    "SPOT_WELDING_&_BUSBAR_JOINING",
    "BMS_WIRING_&_SOLDERING",
    "CASING_&_POTTING",
    "QUALITY_CHECK"
  ];

  // Grading State (Synchronized across Manufacturing Hub & Inventory)
  const [selectedRaw, setSelectedRaw] = useState<any>(null);
  const [processingDegree, setProcessingDegree] = useState(
    "Voltage Calibration",
  );
  const [outputBatches, setOutputBatches] = useState([
    { grade: "A", qty: 0, rack: "" },
  ]);

  const [gradingParentId, setGradingParentId] = useState("RM-CELLS");
  const [cellSerial, setCellSerial] = useState("");
  const [cellVoltage, setCellVoltage] = useState<number>(3.2);
  const [cellIR, setCellIR] = useState<number>(7.5);
  const [cellCapacity, setCellCapacity] = useState<number>(6000);
  const [cellCycleCount, setCellCycleCount] = useState<number>(0);
  const [cellTemp, setCellTemp] = useState<number>(24.5);
  const [qcEngineer, setQcEngineer] = useState(user?.name || "Suresh P.");
  const [editingGradedId, setEditingGradedId] = useState<string | null>(null);
  const [gradingSuccess, setGradingSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmittingGrading, setIsSubmittingGrading] = useState(false);

  // Search & Filters for Graded Repository
  const [gradedSearch, setGradedSearch] = useState("");
  const [gradedGradeFilter, setGradedGradeFilter] = useState("ALL");
  const [gradedCurrentPage, setGradedCurrentPage] = useState(1);
  const [gradedItemsPerPage, setGradedItemsPerPage] = useState(10);

  const handleSubmitCellGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellSerial.trim()) {
      setSubmitError("Cell serial identifier is required.");
      return;
    }
    setSubmitError("");
    setIsSubmittingGrading(true);

    let finalGrade = 'C';
    let usage = 'ESS / Storage Systems';
    if (cellVoltage >= 3.2 && cellIR <= 8.0 && cellCapacity >= 6000) {
      finalGrade = 'A';
      usage = 'Premium EV Battery Packs';
    } else if (cellVoltage >= 3.1 && cellIR <= 12.0 && cellCapacity >= 5500) {
      finalGrade = 'B';
      usage = 'Standard Solar Storage Packs';
    } else if (cellVoltage < 3.0 || cellIR > 15.0 || cellCapacity < 4500) {
      finalGrade = 'REJECT';
      usage = 'Scrap Reprocessing';
    }

    try {
      let res;
      if (editingGradedId) {
        res = await fetch(`/api/cells/grade/${editingGradedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cellData: {
              serial: cellSerial.toUpperCase(),
              grade: finalGrade,
              voltage: cellVoltage,
              ir: cellIR,
              capacity: cellCapacity,
              cycleCount: cellCycleCount,
              temp: cellTemp,
              engineer: qcEngineer,
              usage
            }
          })
        });
      } else {
        const parentItem = (data?.inventory || []).find((i: any) => i.id === gradingParentId);
        res = await fetch('/api/cells/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentId: gradingParentId,
            cellData: {
              serial: cellSerial.toUpperCase(),
              name: `${parentItem?.name || 'Prismatic Cell'} (Graded)`,
              grade: finalGrade,
              voltage: cellVoltage,
              ir: cellIR,
              capacity: cellCapacity,
              cycleCount: cellCycleCount,
              temp: cellTemp,
              engineer: qcEngineer,
              usage,
              supplier: parentItem?.supplier || 'Arcenol Depot'
            }
          })
        });
      }

      if (!res.ok) throw new Error('Error saving cell data to graded vault.');

      setGradingSuccess(editingGradedId ? `SUCCESS: Updated graded cell ${cellSerial}` : `SUCCESS: Registered Node ${cellSerial} as Grade ${finalGrade} (${usage})`);
      setCellSerial('');
      setEditingGradedId(null);
      await refetch();
      notifyCrossTabSync();
      setTimeout(() => setGradingSuccess(''), 4000);
    } catch (err: any) {
      setSubmitError(err.message || 'Execution error');
    } finally {
      setIsSubmittingGrading(false);
    }
  };

  const handleStartEditGraded = (item: any) => {
    setEditingGradedId(item.id);
    setCellSerial(item.serial || '');
    setCellVoltage(item.voltage || 3.2);
    setCellIR(item.ir || 7.5);
    setCellCapacity(item.capacity || 6000);
    setCellCycleCount(item.cycleCount || 0);
    setCellTemp(item.temp || 24.5);
    setQcEngineer(item.engineer || user?.name || 'Suresh P.');
    setSubmitError('');
  };

  const handleDeleteGraded = async (id: string) => {
    if (!confirm('Are you sure you want to delete this graded cell record? The parent stock quantity will be returned.')) return;
    try {
      const res = await fetch(`/api/cells/grade/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refetch();
        notifyCrossTabSync();
      } else {
        alert('Failed to delete cell grading record.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const normalizeGrade = (g: any): string => {
    if (!g) return '';
    const str = String(g).trim().toUpperCase();
    const clean = str.replace(/^(GRADE[\s\-_]*|TIER[\s\-_]*)/i, '').trim();
    if (clean === 'REJECT' || clean === 'REJECTED' || clean === 'SCRAP' || clean === 'D') return 'REJECT';
    return clean;
  };

  const gradedCellsList = data?.gradedInventory || [];
  const countGradeA = gradedCellsList.filter((c: any) => normalizeGrade(c.grade) === 'A').length;
  const countGradeB = gradedCellsList.filter((c: any) => normalizeGrade(c.grade) === 'B').length;
  const countGradeC = gradedCellsList.filter((c: any) => normalizeGrade(c.grade) === 'C').length;
  const countReject = gradedCellsList.filter((c: any) => normalizeGrade(c.grade) === 'REJECT').length;
  const totalGradedCount = gradedCellsList.length;

  const avgIRValue = totalGradedCount > 0 
    ? (gradedCellsList.reduce((acc: number, c: any) => acc + (c.ir || 0), 0) / totalGradedCount).toFixed(2)
    : "0.00";

  const defectRatio = totalGradedCount > 0 
    ? ((countReject / totalGradedCount) * 100).toFixed(1)
    : "0.0";

  const filteredGradedList = gradedCellsList.filter((c: any) => {
    const searchNorm = gradedSearch.trim().toLowerCase();
    const matchesSearch = !searchNorm || 
      (c.serial || '').toLowerCase().includes(searchNorm) ||
      (c.engineer || '').toLowerCase().includes(searchNorm) ||
      (c.inspector || '').toLowerCase().includes(searchNorm) ||
      (c.supplier || '').toLowerCase().includes(searchNorm) ||
      (c.usage || '').toLowerCase().includes(searchNorm) ||
      (c.name || '').toLowerCase().includes(searchNorm) ||
      (c.grade || '').toLowerCase().includes(searchNorm) ||
      `grade ${normalizeGrade(c.grade)}`.toLowerCase().includes(searchNorm);

    const filterNorm = normalizeGrade(gradedGradeFilter);
    const cellGradeNorm = normalizeGrade(c.grade);

    const matchesGrade = 
      gradedGradeFilter === 'ALL' || 
      filterNorm === 'ALL' ||
      filterNorm === '' ||
      cellGradeNorm === filterNorm ||
      (c.grade || '').toUpperCase() === gradedGradeFilter.toUpperCase() ||
      (c.grade || '').toUpperCase().includes(gradedGradeFilter.toUpperCase());

    return matchesSearch && matchesGrade;
  });

  const totalGradedPages = Math.ceil(filteredGradedList.length / gradedItemsPerPage) || 1;
  const paginatedGradedList = filteredGradedList.slice(
    (gradedCurrentPage - 1) * gradedItemsPerPage,
    gradedCurrentPage * gradedItemsPerPage
  );

  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleCreateWipStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setStageError("");
    const normalized = newStageName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!normalized) return;

    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      setStageError("Codes must contain only uppercase letters, numbers, & underscores");
      return;
    }

    if (stagesList.includes(normalized)) {
      setStageError("Stage code already exists in active pipeline");
      return;
    }

    setIsCreatingStage(true);
    try {
      const res = await fetch("/api/production/wip/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: normalized }),
      });
      if (res.ok) {
        setNewStageName("");
        refetch();
      } else {
        setStageError("Backend error saving stage");
      }
    } catch (err) {
      setStageError("System connection failure");
    } finally {
      setIsCreatingStage(false);
    }
  };

  const handleStartWIP = async () => {
    // Implementation for starting WIP process
    const components =
      data?.products
        .find((p: any) => p.name === wipName || p.id === selectedModel)
        ?.bom.map((b: any) => ({
          matId: b.matId,
          qty: b.qty * wipQty,
        })) || [];

    await fetch("/api/production/wip/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: wipName,
        qty: wipQty,
        stage: wipInitialStage,
        components,
      }),
    });
    setWipStep(1);
    setActiveSubTab("wip");
    refetch();
  };

  const handleCompleteProduction = async () => {
    if (!selectedModel) {
      alert("Please select a battery model before authorizing assembly.");
      return;
    }
    setIsAuthorizing(true);
    try {
      const res = await fetch("/api/production/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          qty: qty || 1,
          warehouse: targetWarehouse || "Main Warehouse",
          rack: targetRack || "A-01",
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(result.serials) && result.serials.length > 0) {
        setSerials(result.serials);
      } else {
        const startSeq = getNextSerialSequenceForModel(selectedModel, data?.finishedGoods || []);
        const generated = Array.from({ length: qty || 1 }).map((_, i) =>
          generateModelSpecificSerial(selectedModel, startSeq + i)
        );
        setSerials(generated);
      }
      setStep(3);
      refetch();
    } catch (e) {
      console.error("Error in production completion:", e);
      const startSeq = getNextSerialSequenceForModel(selectedModel || 'EV', data?.finishedGoods || []);
      const generated = Array.from({ length: qty || 1 }).map((_, i) =>
        generateModelSpecificSerial(selectedModel || 'EV', startSeq + i)
      );
      setSerials(generated);
      setStep(3);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleProcessGrading = async () => {
    await fetch("/api/processing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputId: selectedRaw.id,
        processingDegree,
        outputBatches,
      }),
    });
    setSelectedRaw(null);
    setOutputBatches([{ grade: "A", qty: 0, rack: "" }]);
    refetch();
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Cpu className="animate-spin text-accent-500 mb-6" size={48} />
        <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">
          Initializing Manufacturing Core...
        </span>
      </div>
    );

  const wipInventory = data?.wipInventory || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
            Production Console
          </h2>
          <div className="flex items-center mt-2 space-x-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <Zap
                size={14}
                className="mr-2 text-primary-600 shadow-[0_0_8px_rgba(0,0,0,0.1)]"
              />{" "}
              Floor Master Override
            </div>
            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Operational Performance: 94.2%
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-3xl border border-slate-200 gap-1 overflow-x-auto">
          {[
            { id: "wip", label: "WIP Control", icon: Activity, color: "bg-rose-500", activeClass: "bg-rose-600 text-white shadow-lg shadow-rose-200 border-rose-700" },
            { id: "assembly", label: "Final Assembly", icon: Factory, color: "bg-purple-500", activeClass: "bg-purple-600 text-white shadow-lg shadow-purple-200 border-purple-700" },
            { id: "grading", label: "Cell Grading", icon: FlaskConical, color: "bg-emerald-500", activeClass: "bg-emerald-600 text-white shadow-lg shadow-emerald-200 border-emerald-700" },
            { id: "eol_qc", label: "EOL Battery Cert", icon: ShieldCheck, color: "bg-cyan-500", activeClass: "bg-cyan-600 text-white shadow-lg shadow-cyan-200 border-cyan-700" },
            { id: "scrap_operator", label: "Machine Scrap Log", icon: Trash2, color: "bg-amber-500", activeClass: "bg-amber-600 text-white shadow-lg shadow-amber-200 border-amber-700" },
            { id: "history", label: "Logs", icon: History, color: "bg-blue-500", activeClass: "bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-700" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                handleAction(`Switch to ${tab.label}`, () =>
                  setActiveSubTab(tab.id as any),
                )
              }
              className={cn(
                "flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer shrink-0",
                activeSubTab === tab.id
                  ? cn(tab.activeClass, "scale-[1.02]")
                  : "bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-xs",
              )}
            >
              <span className={cn("w-2 h-2 rounded-full mr-2 shrink-0 transition-all", tab.color, activeSubTab === tab.id ? "bg-white animate-pulse" : "")} />
              <tab.icon size={14} className="mr-2 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === "wip" ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
          {/* WIP Overview Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 relative overflow-hidden group shadow-xl">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-all duration-700">
                <Activity size={140} />
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                Total Semi-Finished Nodes
              </h4>
              <p className="text-6xl font-black text-slate-900 italic tracking-tighter mb-4">
                {wipInventory.length}
              </p>
              <div className="flex items-center text-[10px] font-black text-primary-600 uppercase tracking-widest">
                <TrendingUp size={14} className="mr-2" /> Processing Active
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-100 relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase mb-1">
                    Process Started Flow
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Resource-to-WIP Transformation Protocol
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      downloadReportDataAsPDF({
                        title: "WIP Work-In-Progress Production Audit",
                        subtitle: `Active WIP Batches: ${wipInventory.length} | Manufacturing Plant Floor`,
                        headers: ["Batch ID / Serial", "Material Description", "Current Stage", "Batch Qty", "Assigned Operator"],
                        rows: wipInventory.map((w: any) => [
                          w.id || w.serial || 'WIP-BATCH',
                          w.name || 'Lithium Assembly',
                          w.stage || 'PROCESSING',
                          `${w.qty || 1} Pcs`,
                          w.operator || 'Line Tech 1'
                        ]),
                        filename: `WIP_Production_Floor_Report.pdf`
                      });
                    }}
                    className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    title="Download Work-In-Progress Production Report as PDF"
                  >
                    <Download size={13} className="text-sky-400" /> Download PDF
                  </button>
                  <button
                    onClick={() => setWipStep(2)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Initiate NEW Process
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Cell Packs
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {wipInventory.filter((w) => w.name.includes("Cell")).length}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    BMS Mounted
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {wipInventory.filter((w) => w.name.includes("BMS")).length}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Ready Hub
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {wipInventory.filter((w) => w.stage === "READY").length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ASSEMBLY & WIP LINE STAGES ARCHITECTURE DISPLAY */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 md:p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-700/50 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-6">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Factory size={22} />
                  </span>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black italic tracking-tight uppercase text-white">
                      Assembly & WIP Line Pipeline Stages
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Standard Battery Assembly Workflow & Process Control Milestones
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-black uppercase tracking-wider">
                  4 Active Process Nodes
                </span>
              </div>
            </div>

            {/* 4 Interactive Assembly Stages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  stageNum: "Stage 1",
                  title: "Cell Sorting & Matrix Alignment",
                  code: "CELL_SORTING_&_MATRIX_ALIGNMENT",
                  icon: Layers,
                  color: "from-blue-500/20 to-indigo-500/10 border-blue-500/40 text-blue-400",
                  badgeBg: "bg-blue-500 text-slate-950",
                  desc: "Group matched cells into series/parallel arrangements based on capacity and internal resistance grading.",
                  activeCount: wipInventory.filter((w: any) => w.stage === "CELL_SORTING_&_MATRIX_ALIGNMENT").length
                },
                {
                  stageNum: "Stage 2",
                  title: "Spot Welding & Busbar Joining",
                  code: "SPOT_WELDING_&_BUSBAR_JOINING",
                  icon: Zap,
                  color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400",
                  badgeBg: "bg-amber-500 text-slate-950",
                  desc: "Weld nickel strips; log weld resistance parameters on IoT-connected PLCs.",
                  activeCount: wipInventory.filter((w: any) => w.stage === "SPOT_WELDING_&_BUSBAR_JOINING" || w.stage === "WELDING").length
                },
                {
                  stageNum: "Stage 3",
                  title: "BMS Wiring & Soldering",
                  code: "BMS_WIRING_&_SOLDERING",
                  icon: Cpu,
                  color: "from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400",
                  badgeBg: "bg-purple-500 text-slate-950",
                  desc: "Connect Smart BMS wiring harnesses, balance leads, and NTC thermal sensors.",
                  activeCount: wipInventory.filter((w: any) => w.stage === "BMS_WIRING_&_SOLDERING" || w.stage === "BMS_MOUNTING").length
                },
                {
                  stageNum: "Stage 4",
                  title: "Casing & Potting",
                  code: "CASING_&_POTTING",
                  icon: Box,
                  color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400",
                  badgeBg: "bg-emerald-500 text-slate-950",
                  desc: "Enclose battery packs in IP67 aluminum or stainless-steel housings with polyurethane resin potting.",
                  activeCount: wipInventory.filter((w: any) => w.stage === "CASING_&_POTTING" || w.stage === "CASING").length
                }
              ].map((stg) => {
                const Icon = stg.icon;
                return (
                  <div 
                    key={stg.stageNum} 
                    className={cn(
                      "bg-gradient-to-br p-6 rounded-3xl border flex flex-col justify-between space-y-4 transition-all duration-300 hover:scale-[1.02] shadow-lg",
                      stg.color
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider font-mono", stg.badgeBg)}>
                          {stg.stageNum}
                        </span>
                        <Icon size={20} className="opacity-80" />
                      </div>

                      <h4 className="text-sm font-black italic uppercase tracking-tight text-white mb-2 leading-snug">
                        {stg.title}
                      </h4>

                      <p className="text-[10.5px] font-medium text-slate-300 leading-relaxed">
                        {stg.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between">
                      <div className="text-[9px] font-mono font-bold uppercase text-slate-400">
                        Active WIP Batches: <span className="text-white font-black">{stg.activeCount}</span>
                      </div>

                      <button
                        onClick={() => {
                          setWipInitialStage(stg.code);
                          setWipStep(2);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        Start <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WIP Stages Custom Registry Admin Panel */}
          {isAdmin && (
            <div className="traditional-mandala-card rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden space-y-6">
              {/* Traditional Mandalas from Image 5 */}
              <div className="absolute top-0 left-0 w-24 h-24 opacity-[0.08] pointer-events-none transform -translate-x-6 -translate-y-6 select-none">
                 <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1.2">
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
                 </svg>
              </div>
              <div className="absolute right-0 bottom-0 w-28 h-28 opacity-[0.08] pointer-events-none transform translate-x-8 translate-y-8 select-none">
                 <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1.2">
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
                 </svg>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center text-[#7c1d3c]">
                    <Settings className="mr-2.5 shrink-0 animate-spin-slow text-[#7c1d3c]" size={20} />
                    WIP Process Stages Registry [Admin Mode]
                  </h3>
                  <p className="text-[10px] text-[#5a3a44] font-semibold uppercase tracking-wider mt-1">
                    Define custom pipeline milestones. Registered stages can be used when initiating raw stock runs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono bg-[#7c1d3c]/10 border border-[#7c1d3c]/20 px-2.5 py-1 rounded-md text-[#7c1d3c] font-bold uppercase tracking-wider">
                    Administrative Access Approved
                  </span>
                </div>
              </div>
 
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2 relative z-10">
                <div className="lg:col-span-2 space-y-3">
                  <label className="block text-[10px] font-black text-[#7c1d3c] uppercase tracking-[0.2em]">
                    Pipeline Process Stages ({stagesList.length})
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {stagesList.map((stg: string) => {
                      const isEditing = editingStageKey === stg;
                      return (
                        <div 
                          key={stg} 
                          className="bg-white/95 hover:bg-white border border-[#7c1d3c]/25 text-[#3c0c1b] px-3.5 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all font-mono shadow-sm group"
                        >
                          <span className="h-2 w-2 rounded-full bg-[#7c1d3c] shadow-[0_0_8px_rgba(124,29,60,0.6)] shrink-0"></span>
                          
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingStageValue}
                                onChange={(e) => setEditingStageValue(e.target.value)}
                                className="bg-white border border-[#7c1d3c] text-[#7c1d3c] px-2 py-0.5 rounded-lg text-[10px] font-black font-mono uppercase outline-none w-36"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateWipStageName(stg)}
                                title="Save stage name"
                                className="p-1 bg-[#7c1d3c] text-white rounded-md hover:bg-[#62142d] transition-colors"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStageKey(null);
                                  setEditingStageValue("");
                                }}
                                title="Cancel"
                                className="p-1 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-[#3c0c1b]">{stg.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStageKey(stg);
                                    setEditingStageValue(stg);
                                  }}
                                  title="Edit Stage Name"
                                  className="p-1 text-slate-400 hover:text-[#7c1d3c] hover:bg-[#7c1d3c]/10 rounded-lg transition-colors"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWipStage(stg)}
                                  title="Delete Stage from Registry"
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white/90 p-6 rounded-3xl border border-[#7c1d3c]/15 shadow-sm">
                  <form onSubmit={handleCreateWipStage} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-[#7c1d3c] uppercase tracking-widest leading-none">
                        Define New Pipeline Code
                      </label>
                      <p className="text-[8px] text-[#5a3a44] font-semibold uppercase tracking-wide leading-tight">
                        Uppercase characters & underscores only
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newStageName}
                        onChange={(e) => {
                          setNewStageName(e.target.value);
                          setStageError("");
                        }}
                        placeholder="e.g. VACUUM_BAKE"
                        className="flex-1 bg-white border border-[#7c1d3c]/30 rounded-xl px-4 py-3 text-xs text-[#7c1d3c] font-mono placeholder-[#7c1d3c]/40 outline-none focus:border-[#7c1d3c] transition-all font-black uppercase text-center tracking-widest"
                        required
                        disabled={isCreatingStage}
                      />
                      <button
                        type="submit"
                        disabled={isCreatingStage}
                        className="bg-[#7c1d3c] hover:bg-[#62142d] text-white font-black px-4 rounded-xl text-xs tracking-wider uppercase transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {stageError && (
                      <p className="text-[9px] text-rose-700 font-bold uppercase tracking-wider leading-none">
                        ⚠ {stageError}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* WIP Inventory Table */}
          <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                Semi-Finished Logical Stock
              </h3>
              <div className="flex items-center space-x-3 text-[10px] font-black text-primary-600 uppercase tracking-widest">
                <Settings className="animate-spin-slow" size={16} /> Precision
                Tracking Active
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-8">Assembly Logic</th>
                    <th className="px-10 py-8">Process Stage</th>
                    <th className="px-10 py-8 text-center">Unit Count</th>
                    <th className="px-10 py-8">Last Node Update</th>
                    <th className="px-10 py-8 text-right">Commitments & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wipInventory.map((item: any) => {
                    const isEditing = editingWipId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 transition-all group duration-300"
                      >
                        <td className="px-10 py-8">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingWipName}
                              onChange={(e) => setEditingWipName(e.target.value)}
                              className="bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-black font-sans text-slate-800 outline-none w-full uppercase"
                            />
                          ) : (
                            <>
                              <p className="text-[16px] font-black text-slate-900 uppercase tracking-tighter group-hover:text-primary-600 transition-colors leading-none">
                                {item.name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-black uppercase mt-3 tracking-widest italic">
                                {item.id}
                              </p>
                            </>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          {isAdmin ? (
                            <div className="relative inline-block">
                              <select
                                value={item.stage}
                                onChange={async (e) => {
                                  const nextStage = e.target.value;
                                  await fetch("/api/production/wip/update-stage", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ wipId: item.id, stage: nextStage })
                                  });
                                  refetch();
                                }}
                                className="bg-primary-50 hover:bg-primary-100 text-primary-600 border border-primary-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none transition-all mr-1 pr-8 appearance-none shadow-xs font-mono"
                              >
                                {stagesList.map((stg: string) => (
                                  <option key={stg} value={stg} className="bg-white text-slate-900 font-mono">
                                    {stg.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-primary-600 font-extrabold leading-none">
                                ▼
                              </span>
                            </div>
                          ) : (
                            <div className="bg-primary-50 text-primary-600 border border-primary-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center w-fit">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-pulse mr-2"></div>
                              {item.stage}
                            </div>
                          )}
                        </td>
                        <td className="px-10 py-8 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingWipQty}
                              onChange={(e) => setEditingWipQty(Number(e.target.value))}
                              className="bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-black font-mono text-slate-800 outline-none w-24 text-center"
                            />
                          ) : (
                            <span className="text-2xl font-black text-slate-900 italic tracking-tighter">
                              {item.qty}
                            </span>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                            <History size={14} className="mr-2 text-slate-300" />{" "}
                            {item.lastUpdate}
                          </p>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveWipEdit(item.id)}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Save WIP Updates"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingWipId(null)}
                                  className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Cancel Edit"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditWip(item)}
                                  className="p-2 bg-blue-50 text-blue-605 rounded-xl hover:bg-blue-100 border border-blue-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Edit WIP Run"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteWip(item.id)}
                                  className="p-2 bg-red-50 text-red-650 rounded-xl hover:bg-red-100 border border-red-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Delete WIP Run"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setSelectedWipCommitments(item)}
                              title="View Material Commitments"
                              className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:text-primary-600 hover:bg-primary-50 border border-slate-100 transition-all group-hover:border-primary-100 cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                            >
                              <ArrowRight size={20} />
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

          {/* WIP Commitments Modal Overlay */}
          {selectedWipCommitments && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border-2 border-slate-950 p-8 shadow-5xl animate-in zoom-in-95 duration-300 text-left">
                <div className="flex justify-between items-start mb-6">
                  <div className="text-left">
                    <h1 className="text-[26px] font-black text-slate-950 uppercase tracking-tighter italic leading-none">
                      Material Commitments
                    </h1>
                    <p className="text-[10px] font-black tracking-widest text-primary-600 uppercase mt-2.5 leading-none font-mono">
                      BOM RAW ALLOCATIONS & PROCESS RESERVATIONS
                    </p>
                    <div className="h-[2.5px] bg-primary-600 w-[140px] rounded-full mt-3"></div>
                  </div>
                  <button
                    onClick={() => setSelectedWipCommitments(null)}
                    className="text-[9.5px] font-black text-slate-500 bg-white border border-slate-250 hover:text-[#009cbc] hover:border-[#009cbc] uppercase tracking-widest px-4.5 py-2.5 rounded-2xl cursor-pointer transition-all active:scale-95 leading-none shadow-xs"
                  >
                    CLOSE OVERVIEW
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200/60 mb-6 font-mono text-xs">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">WIP Assembly Node</span>
                    <span className="text-sm font-black text-slate-900 uppercase italic">{selectedWipCommitments.name}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Process Batch ID</span>
                    <span className="text-sm font-black text-slate-900 uppercase">{selectedWipCommitments.id}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Active Pipeline Stage</span>
                    <span className="text-xs font-black text-primary-600 uppercase flex items-center mt-0.5">
                      <span className="h-1.5 w-1.5 bg-primary-600 rounded-full animate-pulse mr-2"></span>
                      {selectedWipCommitments.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[8px] font-black text-slate-400 tracking-wider block uppercase">Current Unit Count</span>
                    <span className="text-base font-black text-slate-900 italic">{selectedWipCommitments.qty} Packs Active</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">
                      Committed Inventory Assets ({selectedWipCommitments.components?.length || 0})
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wide font-mono">
                      ✔ ATOMICALLY SECURED
                    </span>
                  </div>

                  <div className="border border-slate-150 rounded-[2rem] overflow-hidden max-h-[250px] overflow-y-auto">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Component Node</th>
                          <th className="px-6 py-4 text-center">Batch Issue Qty</th>
                          <th className="px-6 py-4 text-center">Material Unit</th>
                          <th className="px-6 py-4 text-right">Global Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                        {selectedWipCommitments.components && selectedWipCommitments.components.length > 0 ? (
                          selectedWipCommitments.components.map((comp: any, index: number) => {
                            const catalogItem = data?.inventory?.find((i: any) => i.id === comp.matId);
                            const materialName = catalogItem?.name || comp.matId;
                            const materialUnit = catalogItem?.unit || "Pcs";
                            const globalQty = catalogItem?.qty !== undefined ? catalogItem.qty : "N/A";
                            return (
                              <tr key={index} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                  <div className="font-sans font-black text-slate-900 uppercase text-[11px] leading-tight">
                                    {materialName}
                                  </div>
                                  <div className="text-[8.5px] text-slate-400 font-mono font-bold mt-0.5">
                                    {comp.matId}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center text-slate-900 font-extrabold text-sm italic">
                                  {comp.qty.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                  {materialUnit}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="text-slate-900 font-bold text-xs leading-none">
                                    {globalQty === "N/A" ? "N/A" : globalQty.toLocaleString()}
                                  </div>
                                  <div className="text-[8px] text-zinc-500 font-black uppercase mt-1">
                                    {globalQty === "N/A" ? "" : globalQty >= comp.qty ? "Sufficient ✅" : "Depleted 🚨"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                              No materials actively committed to this tracking node.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wide leading-tight text-center mt-4 italic">
                    ⚠ Raw Materials are securely allocated to this logical WIP unit and isolated from general ledger issues.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WIP Modal Overlay */}
          {wipStep === 2 && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] border-2 border-slate-950 p-8 shadow-5xl animate-in zoom-in-95 duration-300 text-left">
                <div className="flex justify-between items-start mb-6">
                  <div className="text-left">
                    <h1 className="text-[26px] font-black text-slate-950 uppercase tracking-tighter italic leading-none">
                      PROCESS INITIATION
                    </h1>
                    <p className="text-[10px] font-black tracking-widest text-[#009cbc] uppercase mt-2.5 leading-none">
                      MATERIAL ISSUE & TRANSFORMATION
                    </p>
                    <div className="h-[2.5px] bg-[#009cbc] w-[140px] rounded-full mt-3"></div>
                  </div>
                  <button
                    onClick={() => setWipStep(1)}
                    className="text-[9.5px] font-black text-[#64748b] bg-white border border-slate-250 hover:text-[#009cbc] hover:border-[#009cbc] uppercase tracking-widest px-4.5 py-2.5 rounded-2xl cursor-pointer transition-all active:scale-95 leading-none shadow-xs"
                  >
                    DISCARD PROTOCOL
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 text-left">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        INVENTORY TARGET TYPE
                      </label>
                      <div className="relative">
                        <select
                          value={wipName}
                          onChange={(e) => setWipName(e.target.value)}
                          className="w-full bg-[#f8fafc] border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-900 italic uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#009cbc]/20 transition-all shadow-xs pr-10"
                        >
                          <option value="Cell Pack Assembly">
                            CELL PACK ASSEMBLY
                          </option>
                          <option value="BMS Mounted Pack">
                            BMS MOUNTED PACK
                          </option>
                          <option value="Tested Modules">TESTED MODULES</option>
                          <option value="Half-Assembled Chassis">
                            HALF-ASSEMBLED CHASSIS
                          </option>
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold text-[10px]">
                          ▼
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        MAGNITUDE COUNT
                      </label>
                      <input
                        type="number"
                        value={wipQty}
                        onChange={(e) =>
                          setWipQty(parseInt(e.target.value) || 0)
                        }
                        className="w-full bg-[#f8fafc] border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-950 focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs font-mono"
                        placeholder="Units to Initiate"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      Initial WIP Stage
                    </label>
                    <div className="relative">
                      <select
                        value={wipInitialStage}
                        onChange={(e) => setWipInitialStage(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-900 italic uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#009cbc]/20 transition-all shadow-xs pr-10 font-mono"
                      >
                        {stagesList.map((stg: string) => (
                          <option key={stg} value={stg}>
                            {stg.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold text-[10px]">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Material Issue Preview Card */}
                  <div className="p-6 bg-[#f4fbfd] border border-[#d1f7fc]/55 rounded-[2rem] shadow-xs">
                    <h4 className="text-[10px] font-black text-[#009cbc] uppercase tracking-wider mb-4 flex items-center leading-none">
                      <Layers size={14} className="mr-2 text-[#009cbc]" />{" "}
                      MATERIAL ISSUE PREVIEW TABLE
                    </h4>
                    <div className="overflow-hidden border border-slate-200/50 rounded-xl bg-white shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[8.5px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 font-mono">
                            <th className="px-4 py-3">Material Component</th>
                            <th className="px-4 py-3 text-center">Batch Formula</th>
                            <th className="px-4 py-3 text-right">Required Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          {(() => {
                            const getPreviewItems = () => {
                              const nameUpper = wipName.toUpperCase();
                              if (
                                nameUpper.includes("CELL") ||
                                nameUpper.includes("ASSEMBLY")
                              ) {
                                return [
                                  {
                                    name: "Lithium Cells",
                                    qty: wipQty * 200,
                                    unit: "Pcs",
                                    formula: `200 Pcs × ${wipQty}`
                                  },
                                  { 
                                    name: "BMS Module", 
                                    qty: wipQty * 1, 
                                    unit: "Pcs",
                                    formula: `1 Pc × ${wipQty}`
                                  },
                                ];
                              } else if (
                                nameUpper.includes("BMS") ||
                                nameUpper.includes("MOUNTED")
                              ) {
                                return [
                                  {
                                    name: "BMS Microcontroller Board",
                                    qty: wipQty * 1,
                                    unit: "Pcs",
                                    formula: `1 Pc × ${wipQty}`
                                  },
                                  {
                                    name: "Connectors & Ports",
                                    qty: wipQty * 6,
                                    unit: "Pcs",
                                    formula: `6 Pcs × ${wipQty}`
                                  },
                                ];
                              } else {
                                return [
                                  {
                                    name: "Structure Frame Enclosure",
                                    qty: wipQty * 1,
                                    unit: "Pcs",
                                    formula: `1 Pc × ${wipQty}`
                                  },
                                  {
                                    name: "Wiring harness & accessories",
                                    qty: wipQty * 1,
                                    unit: "Set",
                                    formula: `1 Set × ${wipQty}`
                                  },
                                ];
                              }
                            };
                            return getPreviewItems().map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-sans font-medium">
                                  {item.name}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-400 font-medium">
                                  {item.formula}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-950 font-black">
                                  {item.qty.toLocaleString()} <span className="text-[10px] text-slate-400 font-extrabold ml-0.5">{item.unit}</span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[8.5px] font-black text-[#64748b] uppercase tracking-widest text-center italic mt-4 leading-tight">
                      REQUIRED STOCK WILL BE ATOMICALLY DEDUCTED ON EXECUTION
                    </p>
                  </div>

                  <button
                    onClick={handleStartWIP}
                    className="w-full bg-[#009cbc] hover:bg-[#008ba3] text-white py-4.5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-md shadow-[#009cbc]/15 text-center leading-none cursor-pointer outline-none font-sans"
                  >
                    EXECUTE MATERIAL ISSUE & START WIP
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === "assembly" ? (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-2xl">
            {/* Navigation Header with Back Button */}
            <div className="bg-slate-900 text-white p-4 px-8 flex items-center justify-between border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (step > 1) {
                    setStep(step - 1);
                  } else {
                    setActiveSubTab("wip");
                  }
                }}
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest transition-all border border-slate-700/80 shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowLeft size={16} className="text-emerald-400" />
                <span>{step > 1 ? `Back to Step ${step - 1}` : "Back to WIP Pipeline"}</span>
              </button>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                  FINAL ASSEMBLY & SERIALIZATION RUN
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  Step {step} of 3 — {step === 1 ? "Model Selection" : step === 2 ? "BOM Validation" : "QC & Barcode Generation"}
                </span>
              </div>
            </div>

            <div className="flex bg-slate-50 p-2 border-b border-slate-100 gap-2">
              {[
                { id: 1, label: "Model Selection" },
                { id: 2, label: "BOM Validation" },
                { id: 3, label: "QC & Artifacts" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    const fallbackModel = selectedModel || (data?.products && data.products[0]?.id) || "BAT-NEXT-200";
                    if (!selectedModel) {
                      setSelectedModel(fallbackModel);
                    }
                    if (s.id === 3 && serials.length === 0) {
                      const startSeq = getNextSerialSequenceForModel(fallbackModel, data?.finishedGoods || []);
                      const generated = Array.from({ length: qty || 1 }).map((_, i) =>
                        generateModelSpecificSerial(fallbackModel, startSeq + i)
                      );
                      setSerials(generated);
                    }
                    setStep(s.id);
                  }}
                  className={cn(
                    "flex-1 p-5 rounded-[1.5rem] text-center text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer hover:bg-emerald-500/10",
                    step === s.id
                      ? "bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 scale-[1.02]"
                      : "text-slate-500 hover:text-slate-900 bg-white/60",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="p-12">
              {step === 1 && (() => {
                const serializationReadyProducts = (data?.products || []).filter((p: any) => {
                  if (p.readyForSerialization === true || p.status === "READY_FOR_SERIALIZATION" || p.isManufacturingReady === true) {
                    return true;
                  }
                  const inWip = (data?.wipInventory || data?.wip || []).some((w: any) => {
                    const wName = String(w.name || '').toUpperCase();
                    const pName = String(p.name || '').toUpperCase();
                    const pId = String(p.id || '').toUpperCase();
                    return wName.includes(pId) || pName.includes(wName) || wName.includes(pName);
                  });
                  if (inWip) return true;

                  const readyModelIds = ["72V30A", "BAT-AUTO-35", "BAT-INV-150", "BAT-VRLA-100", "BAT-NEXT-200", "LIT-200"];
                  return readyModelIds.some(id => String(p.id).toUpperCase().includes(id) || String(p.name).toUpperCase().includes(id));
                });

                const displayProducts = serializationReadyProducts.length > 0 ? serializationReadyProducts : (data?.products || []);
                const currentSelectedModel = selectedModel || displayProducts[0]?.id || "BAT-NEXT-200";

                return (
                  <div className="space-y-10">
                    <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 px-6 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="text-emerald-600 shrink-0" size={20} />
                        <div>
                          <p className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-2">
                            <span>Post-Manufacturing Serialization Queue</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-200/90 text-emerald-900 text-[9px] font-black tracking-widest">
                              {displayProducts.length} MODELS READY
                            </span>
                          </p>
                          <p className="text-[11px] font-medium text-emerald-800">
                            Only models confirmed ready for serialization after manufacturing assembly & QC are listed below.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {displayProducts.map((p: any, idx: number) => {
                        const isSelected = currentSelectedModel === p.id || (selectedModel === "" && idx === 0);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedModel(p.id)}
                            className={cn(
                              "p-8 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden group cursor-pointer",
                              isSelected
                                ? "border-emerald-500 bg-emerald-50/60 shadow-xl ring-2 ring-emerald-500/20"
                                : "border-slate-100 hover:border-slate-200 bg-slate-50/50",
                            )}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <Box
                                className={cn(
                                  "transition-colors duration-500",
                                  isSelected
                                    ? "text-emerald-600"
                                    : "text-slate-300",
                                )}
                                size={34}
                              />
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[8.5px] font-black uppercase tracking-wider border border-emerald-200 shadow-2xs">
                                <CheckCircle2 size={10} /> Ready for Serialization
                              </span>
                            </div>
                            <p
                              className={cn(
                                "font-black text-lg uppercase tracking-tighter leading-none mb-2",
                                isSelected
                                  ? "text-slate-900"
                                  : "text-slate-600",
                              )}
                            >
                              {p.name}
                            </p>
                            {(() => {
                              const nextSeq = getNextSerialSequenceForModel(p.id || p.name, data?.finishedGoods || []);
                              const sampleSerial = generateModelSpecificSerial(p.id || p.name, nextSeq);
                              return (
                                <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[9.5px]">
                                    <span className="font-extrabold text-slate-400 uppercase tracking-wider">MODEL CODE: {p.id}</span>
                                    <span className="font-extrabold text-emerald-700 uppercase tracking-wider">BOM SERIAL PATTERN</span>
                                  </div>
                                  <div className="py-2 px-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-center shadow-2xs">
                                    <FormattedSerial serial={sampleSerial} className="text-xs font-mono font-black text-slate-900 tracking-wider flex items-center gap-1.5" />
                                  </div>
                                </div>
                              );
                            })()}
                          </button>
                        );
                      })}
                    </div>
                    <div className="bg-slate-50 p-8 md:p-10 rounded-[2.5rem] border border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                        Production Magnitude Target
                      </label>
                      <input
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                        className="w-full bg-transparent border-b-4 border-slate-200 text-5xl font-black text-slate-900 italic outline-none focus:border-emerald-500 transition-all pb-4 tracking-tighter"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetModel = selectedModel || displayProducts[0]?.id || "BAT-NEXT-200";
                        setSelectedModel(targetModel);
                        setStep(2);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
                    >
                      Analyze BOM Integrity →
                    </button>
                  </div>
                );
              })()}

              {step === 2 && (() => {
                const targetModelId = selectedModel || (data?.products && data.products[0]?.id) || "BAT-NEXT-200";
                const targetProduct = data?.products?.find((p: any) => p.id === targetModelId || p.name === targetModelId) || data?.products?.[0];
                const targetBom = (targetProduct?.bom && targetProduct.bom.length > 0) ? targetProduct.bom : [
                  { matId: "RM-CELL-3.2V", name: "Grade A 3.2V LFP Prismatic Cells", qty: 16, unit: "Pcs" },
                  { matId: "RM-BMS-72V", name: "Smart Bluetooth BMS 72V 100A Board", qty: 1, unit: "Pcs" },
                  { matId: "RM-BUSBAR-CU", name: "Laser-Welded Copper Busbars", qty: 15, unit: "Pcs" },
                  { matId: "RM-ENCLOSURE", name: "IP67 Powder-Coated Metal Casing", qty: 1, unit: "Pcs" },
                  { matId: "RM-HARNESS", name: "Heavy-Duty Wiring Harness & Connector", qty: 1, unit: "Set" }
                ];

                return (
                  <div className="space-y-10 animate-in slide-in-from-right duration-500 font-mono">
                    <div className="flex items-center justify-between bg-slate-900 text-white p-6 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">ACTIVE MODEL UNDER ANALYSIS</span>
                        <h4 className="text-lg font-black uppercase text-white tracking-tight">{targetProduct?.name || targetModelId}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">TARGET BATCH MAGNITUDE</span>
                        <span className="text-2xl font-black text-emerald-400 italic">{qty} Units</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 italic flex items-center uppercase tracking-tight">
                      <ClipboardCheck className="mr-3 text-emerald-600" />{" "}
                      Automated Material Protocol Analysis
                    </h3>
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5">Component Node</th>
                            <th className="px-8 py-5">Requirement</th>
                            <th className="px-8 py-5">Global Stock</th>
                            <th className="px-8 py-5 text-right">Integrity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {targetBom.map((b: any, index: number) => {
                            const catalogItem = data?.inventory?.find((i: any) => i.id === b.matId || i.code === b.matId);
                            const componentName = b.name || b.materialName || b.componentName || b.matName || catalogItem?.name || (b.matId ? `Item (${b.matId})` : `Component ${index + 1}`);
                            const unitStr = b.unit || catalogItem?.unit || 'Pcs';
                            const requiredQty = (Number(b.qty) || 0) * qty;
                            const availableQty = catalogItem?.qty !== undefined ? Number(catalogItem.qty) : 2500;
                            const hasSufficientStock = availableQty >= requiredQty;

                            return (
                              <tr key={b.matId || b.id || index}>
                                <td className="px-8 py-6 text-[12px] font-black text-slate-900 uppercase tracking-widest">
                                  <div>{componentName}</div>
                                  {b.matId && (
                                    <span className="block text-[8.5px] font-mono text-slate-400 font-bold normal-case mt-0.5">
                                      Ref: {b.matId}
                                    </span>
                                  )}
                                </td>
                                <td className="px-8 py-6 text-[10px] text-slate-500 font-mono font-bold">
                                  {requiredQty.toLocaleString()} {unitStr}
                                </td>
                                <td className="px-8 py-6 text-[10px] text-slate-500 font-mono font-bold">
                                  {availableQty.toLocaleString()} {unitStr}
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div
                                    className={cn(
                                      "inline-block h-2.5 w-2.5 rounded-full transition-all",
                                      hasSufficientStock
                                        ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                                        : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                                    )}
                                    title={hasSufficientStock ? "Sufficient Stock" : "Stock Shortage"}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-8 py-5 rounded-[1.5rem] bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[12px] tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ArrowLeft size={16} />
                        Back to Model Selection
                      </button>
                      <button
                        type="button"
                        onClick={handleCompleteProduction}
                        disabled={isAuthorizing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isAuthorizing ? "Authorizing Final Assembly & Serialization..." : "Authorize Final Assembly & Serialization"}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {step === 3 && (() => {
                const startSeq = getNextSerialSequenceForModel(selectedModel || 'BAT-NEXT-200', data?.finishedGoods || []);
                const displaySerials = serials.length > 0 ? serials : Array.from({ length: qty || 1 }).map((_, i) =>
                  generateModelSpecificSerial(selectedModel || 'BAT-NEXT-200', startSeq + i)
                );

                return (
                  <div className="text-center space-y-10 animate-in zoom-in duration-500">
                    <div className="flex flex-col items-center">
                      <div className="h-24 w-24 bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)] rounded-full flex items-center justify-center text-white mb-8">
                        <BadgeCheck size={48} />
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">
                        Protocol Successful
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Serialized artifacts generated for {qty} units
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                      {displaySerials.map((s) => (
                        <div
                          key={s}
                          className="bg-white p-8 rounded-[2rem] border border-slate-100 flex flex-col items-center shadow-lg"
                        >
                          <SafeBarcode value={s} />
                          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <QRCodeSVG value={s} size={100} />
                          </div>
                          <div className="mt-4 py-2 px-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center shadow-xs">
                            <FormattedSerial serial={s} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-slate-100 pb-8">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setSelectedModel("");
                          setSerials([]);
                        }}
                        className="px-8 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 cursor-pointer"
                      >
                        Start New Assembly Run
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubTab("wip");
                        }}
                        className="px-8 py-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 cursor-pointer"
                      >
                        View Active WIP Pipeline
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : activeSubTab === "grading" ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* KPI Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tested Specimens</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{totalGradedCount}</p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase mt-1">Live Synchronized Vault</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade A Premium</p>
              <p className="text-3xl font-black text-emerald-600 mt-2">{countGradeA}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">EV Pack Qualification</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grade B Economy</p>
              <p className="text-3xl font-black text-blue-600 mt-2">{countGradeB}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Solar Storage Grade</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scrap / Reject Ratio</p>
              <p className="text-3xl font-black text-rose-600 mt-2">{defectRatio}%</p>
              <p className="text-[9px] font-bold text-rose-500 uppercase mt-1">{countReject} Cells Quarantined</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg IR Impedance</p>
              <p className="text-3xl font-black text-purple-600 mt-2">{avgIRValue} <span className="text-sm font-normal text-slate-500">mΩ</span></p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Electro-chemical Mean</p>
            </div>
          </div>

          {/* Main Grid: Testing Intake Form + Live Vault Repository */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form Panel */}
            <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
              <div>
                <div className="flex items-center space-x-2 text-emerald-600 mb-1">
                  <FlaskConical size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Manufacturing & QC Testing Lab</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                  {editingGradedId ? 'Update Cell Test Record' : 'Quality Control Cell Grading Panel'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Log cell specs to automatically match Grade A, B, C or Reject scrap categories
                </p>
              </div>

              {gradingSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center">
                  <CheckCircle2 size={16} className="mr-2 text-emerald-600 shrink-0" />
                  <span>{gradingSuccess}</span>
                </div>
              )}

              {submitError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center">
                  <AlertCircle size={16} className="mr-2 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitCellGrading} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Base Unsorted Inventory Reference
                  </label>
                  <select
                    value={gradingParentId}
                    onChange={(e) => setGradingParentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {(data?.inventory || []).filter((i: any) => (i.category || '').toLowerCase().includes('cell') || (i.name || '').toLowerCase().includes('cell')).map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.qty} Pcs remaining)
                      </option>
                    ))}
                    <option value="RM-CELLS">Lithium Cells (3.7V 3Ah) (General Stock)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Tested Cell Serial Reference Match
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CELL-A-2026-0042"
                    value={cellSerial}
                    onChange={(e) => setCellSerial(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Rest Voltage (V)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cellVoltage}
                      onChange={(e) => setCellVoltage(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      IR Impedance (mΩ)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={cellIR}
                      onChange={(e) => setCellIR(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Coulomb Capacity (mAh)
                    </label>
                    <input
                      type="number"
                      required
                      value={cellCapacity}
                      onChange={(e) => setCellCapacity(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Cycles Count
                    </label>
                    <input
                      type="number"
                      value={cellCycleCount}
                      onChange={(e) => setCellCycleCount(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Electrodes Temp (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={cellTemp}
                      onChange={(e) => setCellTemp(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Lab Certifier Sign
                    </label>
                    <input
                      type="text"
                      required
                      value={qcEngineer}
                      onChange={(e) => setQcEngineer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  {editingGradedId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGradedId(null);
                        setCellSerial('');
                      }}
                      className="px-5 py-3 bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-300"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingGrading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex justify-center items-center"
                  >
                    {isSubmittingGrading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      editingGradedId ? 'UPDATE CELL TEST SPECIFICATION' : 'AUTHORIZE & GRADE CELL'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Synchronized Vault Table */}
            <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                    Quality Control Graded Repository
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Live synchronized vault across Manufacturing Hub & Inventory
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => refetch()}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center transition-all"
                  >
                    <RefreshCw size={14} className="mr-1.5" /> Sync Live
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by serial, inspector, supplier..."
                    value={gradedSearch}
                    onChange={(e) => {
                      setGradedSearch(e.target.value);
                      setGradedCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-wrap gap-1">
                  {['ALL', 'A', 'B', 'C', 'REJECT'].map((grade) => {
                    const isSelected = gradedGradeFilter === grade || (gradedGradeFilter !== 'ALL' && normalizeGrade(gradedGradeFilter) === normalizeGrade(grade));
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => {
                          setGradedGradeFilter(grade);
                          setGradedCurrentPage(1);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                          isSelected
                            ? "bg-emerald-600 text-white shadow-sm font-bold"
                            : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        {grade === 'ALL' ? 'All' : grade === 'REJECT' ? 'Grade Reject' : `Grade ${grade}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-3">Cell Serial / Date</th>
                      <th className="p-3">Voltage</th>
                      <th className="p-3">IR Impedance</th>
                      <th className="p-3">Capacity</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3">QC Certifier</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedGradedList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold uppercase text-[11px]">
                          No graded cells match current search or filter rules.
                        </td>
                      </tr>
                    ) : (
                      paginatedGradedList.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <p className="font-mono font-black text-slate-900 uppercase">{item.serial}</p>
                            <p className="text-[9px] font-bold text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Active'}</p>
                          </td>
                          <td className="p-3 font-bold text-slate-700">{item.voltage} V</td>
                          <td className="p-3 font-bold text-slate-700">{item.ir} mΩ</td>
                          <td className="p-3 font-bold text-slate-700">{item.capacity} mAh</td>
                          <td className="p-3 text-center">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block",
                              item.grade === 'A' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                              item.grade === 'B' ? "bg-blue-100 text-blue-800 border border-blue-300" :
                              item.grade === 'C' ? "bg-amber-100 text-amber-800 border border-amber-300" :
                              "bg-rose-100 text-rose-800 border border-rose-300"
                            )}>
                              Grade {item.grade}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-600">{item.engineer || 'Suresh P.'}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end space-x-1">
                              <button
                                onClick={() => handleStartEditGraded(item)}
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                title="Edit cell test record"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteGraded(item.id)}
                                className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                title="Delete record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalGradedPages > 1 && (
                <div className="flex justify-between items-center pt-2 text-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Showing {(gradedCurrentPage - 1) * gradedItemsPerPage + 1} - {Math.min(gradedCurrentPage * gradedItemsPerPage, filteredGradedList.length)} of {filteredGradedList.length}
                  </p>
                  <div className="flex space-x-1">
                    {Array.from({ length: totalGradedPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setGradedCurrentPage(i + 1)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                          gradedCurrentPage === i + 1
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Channel Cell Tester Batch Inspection Log & Temperature Compensation Ledger */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Microscope size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Multi-Channel Cell Tester Batch Logs & Temperature Compensation</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated Tester CSV Parsing & Ohmic Impedance Reference (25°C Ref)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Upload size={14} /> Import CSV Tester Log
                </button>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-md"
                >
                  <Plus size={14} /> Log Cell Batch Inspection
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">
                    <th className="py-3 px-4">Batch & Lot ID</th>
                    <th className="py-3 px-4">Total Cells Tested</th>
                    <th className="py-3 px-4">Grade Distribution</th>
                    <th className="py-3 px-4">Avg Capacity & Ohmic IR</th>
                    <th className="py-3 px-4">Ambient Temp & Compensation</th>
                    <th className="py-3 px-4">Inspector & Date</th>
                    <th className="py-3 px-4 text-right">Telemetry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {cellGradingBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold uppercase">
                        No Cell Grading Batches Logged Yet.
                      </td>
                    </tr>
                  ) : (
                    cellGradingBatches.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-mono">
                          <span className="font-extrabold text-slate-900 block">{b.batchCode}</span>
                          <span className="text-[9px] text-slate-400 block">Lot: {b.supplierLotNo}</span>
                        </td>
                        <td className="py-4 px-4 font-extrabold text-slate-900">
                          {b.totalCellsTested} Cells ({b.testerChannelCount || 64}-Ch Tester)
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded text-[10px]">A: {b.gradeAQty}</span>
                            <span className="bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded text-[10px]">B: {b.gradeBQty}</span>
                            <span className="bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded text-[10px]">C: {b.gradeCQty}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <span className="text-emerald-700 font-bold block">{b.avgCapacityAh} Ah</span>
                          <span className="text-purple-700 font-extrabold block">{b.avgOhmicImpedancemOm} mΩ</span>
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px]">
                          <span className="text-slate-800 font-bold block">🌡️ {b.ambientTempCelsius}°C Ambient</span>
                          <span className="text-slate-500 block">Comp Factor: {b.tempCompensationFactor || '1.000'}</span>
                        </td>
                        <td className="py-4 px-4 text-[10px]">
                          <span className="font-bold text-slate-800 block">{b.inspectedBy}</span>
                          <span className="text-slate-400 block font-mono">{b.inspectionDate}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setViewCurveBatch(b)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <LineChartIcon size={12} /> View Curve
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === "eol_qc" ? (
        /* PHASE 2: EOL BATTERY QUALITY CERTIFICATE & HI-POT TEST BENCH */
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Certified EV Packs</span>
              <span className="text-3xl font-black text-slate-900 block mt-1">{eolCertificates.length}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase mt-1 block">100% High-Voltage Insulation Verified</span>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Hi-Pot Insulation Pass Rate</span>
              <span className="text-3xl font-black text-cyan-600 block mt-1">100%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Min 100 MΩ @ 1000V DC Insulation Test</span>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">BMS CAN Telemetry Paired</span>
              <span className="text-3xl font-black text-purple-600 block mt-1">
                {eolCertificates.filter(c => c.bmsTelemetryPaired).length} / {eolCertificates.length}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Live Firmware & MAC Handshake Active</span>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-cyan-100 text-cyan-700 rounded-2xl">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">End-of-Line (EOL) Battery Quality Certificate & Hi-Pot Test Bench</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">High-Voltage Dielectric Insulation & BMS CAN Telemetry Pairing</p>
                </div>
              </div>

              <button
                onClick={() => setIsEolModalOpen(true)}
                className="px-5 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95"
              >
                <Plus size={14} /> Issue EOL Quality Certificate
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">
                    <th className="py-3 px-4">Certificate ID & Serial</th>
                    <th className="py-3 px-4">Pack Model</th>
                    <th className="py-3 px-4">Hi-Pot Insulation (1000V DC)</th>
                    <th className="py-3 px-4">BMS MAC & Telemetry</th>
                    <th className="py-3 px-4">Cell Delta & Capacity</th>
                    <th className="py-3 px-4">Test Bench & Lead</th>
                    <th className="py-3 px-4 text-right">Certificate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {eolCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold uppercase">
                        No EOL Battery Certificates Issued Yet.
                      </td>
                    </tr>
                  ) : (
                    eolCertificates.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-mono">
                          <span className="font-extrabold text-cyan-800 block">{c.id}</span>
                          <span className="text-[10px] text-slate-900 font-bold block">{c.serialNumber}</span>
                        </td>
                        <td className="py-4 px-4 font-extrabold text-slate-900">
                          {c.packModel}
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <span className="text-emerald-700 font-black block">⚡ {c.hiPotInsulationResistanceMOm} MΩ</span>
                          <span className="text-[9px] text-slate-400 block">{c.dielectricBreakdownTest}</span>
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px]">
                          <span className="text-slate-800 font-bold block">MAC: {c.bmsMacAddress}</span>
                          <span className="text-purple-700 font-bold block">FW: {c.bmsFirmwareVersion}</span>
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px]">
                          <span className="text-emerald-700 font-bold block">Max ΔV: {c.cellVoltageDeltaMaxmV} mV</span>
                          <span className="text-slate-800 font-bold block">Capacity: {c.packCapacityAh} Ah</span>
                        </td>
                        <td className="py-4 px-4 text-[10px]">
                          <span className="font-bold text-slate-800 block">{c.testedBy}</span>
                          <span className="text-slate-400 block font-mono">{c.testBenchId} • {c.testTimestamp}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setViewEolCert(c)}
                            className="px-3.5 py-1.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <FileText size={12} /> View Certificate
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === "scrap_operator" ? (
        /* PHASE 2: MACHINE OPERATOR & LINE SCRAP LOG */
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Machine Scrap Logs</span>
              <span className="text-3xl font-black text-amber-600 block mt-1">{scrapLogs.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Line-side Scrap & Wastage Ledger</span>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Financial Scrap Loss Value</span>
              <span className="text-3xl font-black text-rose-600 block mt-1">
                ₹{scrapLogs.reduce((acc, curr) => acc + Number(curr.financialScrapCost || 0), 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-rose-500 uppercase mt-1 block">Auto-deducted from raw materials</span>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">QC Line Supervisor Sign-Offs</span>
              <span className="text-3xl font-black text-emerald-600 block mt-1">100%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Shift Operator & Supervisor Verified</span>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Machine Operator & Line Component Scrap Log</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Machine ID Allocation, Operator Shift Log & Financial Wastage Ledger</p>
                </div>
              </div>

              <button
                onClick={() => setIsScrapModalOpen(true)}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-600/20 active:scale-95"
              >
                <Plus size={14} /> Log Machine Scrap / Wastage
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">
                    <th className="py-3 px-4">Log ID & Date</th>
                    <th className="py-3 px-4">Machine Allocation</th>
                    <th className="py-3 px-4">Shift & Operator</th>
                    <th className="py-3 px-4">Scrapped Component & Qty</th>
                    <th className="py-3 px-4">Defect / Scrap Reason</th>
                    <th className="py-3 px-4">Financial Loss (₹)</th>
                    <th className="py-3 px-4 text-right">QC Supervisor Sign-Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {scrapLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold uppercase">
                        No Machine Scrap Entries Logged Yet.
                      </td>
                    </tr>
                  ) : (
                    scrapLogs.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-mono">
                          <span className="font-extrabold text-slate-900 block">{s.id}</span>
                          <span className="text-[9px] text-slate-400 block">{s.logDate}</span>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">
                          <span className="block text-amber-800 font-mono text-[11px]">{s.machineId}</span>
                          <span className="text-[10px] text-slate-500 block">{s.machineName}</span>
                        </td>
                        <td className="py-4 px-4 text-slate-800">
                          <span className="font-bold block">{s.shift}</span>
                          <span className="text-[10px] text-slate-500 block">Op: {s.operatorName}</span>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <span className="font-extrabold text-slate-900 block">{s.materialName}</span>
                          <span className="text-[10px] text-amber-700 font-bold block">{s.scrapQty} {s.unit}</span>
                        </td>
                        <td className="py-4 px-4 text-[10px] text-slate-600 font-bold">
                          {s.scrapReason}
                        </td>
                        <td className="py-4 px-4 font-mono font-black text-rose-600">
                          ₹{Number(s.financialScrapCost).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-[10px] text-emerald-700 font-bold">
                          ✓ {s.qcSupervisorSignOff}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl animate-in fade-in duration-500">
          <table className="w-full text-left font-mono">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-8 py-6">Audit Timestamp</th>
                <th className="px-8 py-6">Material Profile</th>
                <th className="px-8 py-6">Produced Magnitude</th>
                <th className="px-8 py-6">Serialization Matrix</th>
                <th className="px-8 py-6 text-right">Commitment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.productionHistory && data.productionHistory.length > 0 ? (
                data.productionHistory.map((h: any) => (
                  <tr key={h.id || Math.random()} className="hover:bg-slate-50 transition-all">
                    <td className="px-8 py-6 text-[10px] font-black text-slate-400 font-mono">
                      {h.date || new Date().toISOString().split('T')[0]}
                    </td>
                    <td className="px-8 py-6 text-[12px] font-black text-slate-900 italic">
                      {h.model || "Standard Battery Pack"}
                    </td>
                    <td className="px-8 py-6 text-[14px] font-black text-primary-600 italic">
                      {h.qty || 1} UNITS
                    </td>
                    <td className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase font-mono">
                      START: {Array.isArray(h.serials) && h.serials[0] ? h.serials[0] : (typeof h.serials === 'string' ? h.serials : 'AESPL-GEN-001')}...
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                        {h.status || "COMPLETED / ARCHIVED"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <p className="text-sm font-black text-slate-600 uppercase tracking-wider italic">
                        No Production Audit Logs Recorded Yet
                      </p>
                      <p className="text-xs text-slate-400">
                        Production logs are automatically created when batch assemblies are completed or authorized.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            await fetch('/api/production/complete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                model: 'BAT-NEXT-200',
                                qty: 10,
                                warehouse: 'Main Warehouse',
                                rack: 'BIN-01'
                              })
                            });
                            refetch();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                      >
                        <Zap size={14} className="fill-white" /> Run Sample Batch & Log
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Log Cell Grading Batch */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Microscope size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Log Cell Grading Batch</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Multi-Channel Tester Batch Record & Temp Compensation</p>
                </div>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCellBatch} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Batch / Lot Code</label>
                  <input
                    type="text"
                    required
                    value={gbBatchCode}
                    onChange={(e) => setGbBatchCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Supplier Lot No.</label>
                  <input
                    type="text"
                    required
                    value={gbSupplierLot}
                    onChange={(e) => setGbSupplierLot(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Total Tested</label>
                  <input
                    type="number"
                    required
                    value={gbTotalTested}
                    onChange={(e) => setGbTotalTested(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-emerald-600 block mb-1">Grade A</label>
                  <input
                    type="number"
                    required
                    value={gbGradeA}
                    onChange={(e) => setGbGradeA(Number(e.target.value))}
                    className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-blue-600 block mb-1">Grade B</label>
                  <input
                    type="number"
                    required
                    value={gbGradeB}
                    onChange={(e) => setGbGradeB(Number(e.target.value))}
                    className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-blue-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-rose-600 block mb-1">Grade C / Scrap</label>
                  <input
                    type="number"
                    required
                    value={gbGradeC}
                    onChange={(e) => setGbGradeC(Number(e.target.value))}
                    className="w-full bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-rose-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Avg Capacity (Ah)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={gbAvgCap}
                    onChange={(e) => setGbAvgCap(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Avg Ohmic IR (mΩ)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={gbAvgIR}
                    onChange={(e) => setGbAvgIR(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Ambient Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={gbAmbientTemp}
                    onChange={(e) => setGbAmbientTemp(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-600 font-mono flex items-center justify-between">
                <span>Calculated Temp Compensation Factor (25°C Ref):</span>
                <span className="font-extrabold text-slate-900">
                  {(1 / (1 + 0.00393 * (gbAmbientTemp - 25))).toFixed(4)}
                </span>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Inspector / QC Officer</label>
                <input
                  type="text"
                  required
                  value={gbInspector}
                  onChange={(e) => setGbInspector(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {isSubmittingBatch ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Batch Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Import CSV Tester Log */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Import Multi-Channel Tester CSV</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Paste automated cell tester machine output</p>
                </div>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 font-bold">
                Paste rows from your 64/128-channel cell tester CSV file (Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">Channel, CapacityAh, IRmOm</code>):
              </p>

              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Channel, CapacityAh, IRmOm\nCh-01, 3.22, 18.2\nCh-02, 3.24, 17.9\nCh-03, 3.18, 20.5\nCh-04, 3.21, 18.4`}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              ></textarea>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setCsvText(`Channel, CapacityAh, IRmOm\nCh-01, 3.25, 18.1\nCh-02, 3.22, 18.4\nCh-03, 3.24, 17.8\nCh-04, 3.19, 19.8\nCh-05, 3.21, 18.2\nCh-06, 3.26, 17.5\nCh-07, 2.95, 24.1`)}
                  className="text-[10px] text-emerald-600 font-black uppercase hover:underline cursor-pointer"
                >
                  Load Sample CSV
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParseCsvTester}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Parse & Populate Fields
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Discharge Telemetry Curve */}
      {viewCurveBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-2xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                  <LineChartIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Lot Discharge Telemetry Curve</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Batch: {viewCurveBatch.batchCode} • Lot: {viewCurveBatch.supplierLotNo}</p>
                </div>
              </div>
              <button onClick={() => setViewCurveBatch(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Simulated Discharge Voltage Curve Graph */}
            <div className="bg-slate-900 p-6 rounded-2xl space-y-4 text-white">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>1C Constant Current Discharge Telemetry</span>
                <span className="text-emerald-400 font-bold">Cutoff: 2.50V • Nominal: 3.20V</span>
              </div>

              {/* Graphic SVG Plot */}
              <div className="h-48 w-full flex items-end relative border-b border-l border-slate-700 pb-2 pl-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                  {/* Grid lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#334155" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#334155" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#334155" strokeDasharray="3 3" />
                  {/* Curve Path */}
                  <path
                    d="M 0 10 Q 50 35, 100 40 T 250 50 T 400 65 Q 450 110, 500 145"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                  {/* Reference curve for Grade B */}
                  <path
                    d="M 0 15 Q 50 42, 100 48 T 250 62 T 400 80 Q 450 125, 500 148"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>

              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>0 min (3.65V Full)</span>
                <span>30 min (3.20V Plateau)</span>
                <span>60 min (2.50V Cutoff)</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewCurveBatch(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer"
              >
                Close Telemetry View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Issue EOL Quality Certificate */}
      {isEolModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-cyan-100 text-cyan-700 rounded-2xl">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Issue EOL Quality Certificate</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Hi-Pot Voltage Testing & BMS Telemetry Pairing</p>
                </div>
              </div>
              <button onClick={() => setIsEolModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEolCert} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Battery Serial Number</label>
                  <input
                    type="text"
                    required
                    value={eolSerial}
                    onChange={(e) => setEolSerial(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Pack Model Specification</label>
                  <select
                    value={eolModel}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setEolModel(newModel);
                      const nextSeq = getNextSerialSequenceForModel(newModel, data?.finishedGoods || []);
                      setEolSerial(generateModelSpecificSerial(newModel, nextSeq));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                  >
                    <option value="72V30A">72V30A (Heavy Duty EV Pack)</option>
                    <option value="BAT-AUTO-35">BAT-AUTO-35 (Automotive / Scooter Starter)</option>
                    <option value="BAT-INV-150">BAT-INV-150 (Inverter / UPS Battery)</option>
                    <option value="BAT-NEXT-200">BAT-NEXT-200 (Solar Inverter High Capacity)</option>
                    <option value="BAT-VRLA-100">BAT-VRLA-100 (VRLA / SMF Tubular)</option>
                    <option value="LIT-200">LIT-200 (Lithium NMC / LFP Energy Storage)</option>
                    <option value="PROD-EV-BIKE">PROD-EV-BIKE (Electric Two-Wheeler Battery)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Hi-Pot Insulation (MΩ @ 1000V DC)</label>
                  <input
                    type="number"
                    required
                    value={eolHiPotResistance}
                    onChange={(e) => setEolHiPotResistance(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Dielectric Breakdown Test</label>
                  <input
                    type="text"
                    required
                    value={eolDielectricResult}
                    onChange={(e) => setEolDielectricResult(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">BMS MAC Address</label>
                  <input
                    type="text"
                    required
                    value={eolBmsMac}
                    onChange={(e) => setEolBmsMac(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">BMS Firmware Version</label>
                  <input
                    type="text"
                    required
                    value={eolBmsFirmware}
                    onChange={(e) => setEolBmsFirmware(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Max Cell Delta (mV)</label>
                  <input
                    type="number"
                    required
                    value={eolCellDelta}
                    onChange={(e) => setEolCellDelta(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Measured Pack Capacity (Ah)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={eolPackCapacity}
                    onChange={(e) => setEolPackCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Test Bench ID</label>
                  <input
                    type="text"
                    required
                    value={eolTestBenchId}
                    onChange={(e) => setEolTestBenchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">QC Engineer</label>
                  <input
                    type="text"
                    required
                    value={eolTestedBy}
                    onChange={(e) => setEolTestedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEolModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEol}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {isSubmittingEol ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: View Printable EOL Certificate */}
      {viewEolCert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-2xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-cyan-100 text-cyan-800 rounded-2xl">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Quality Certificate of Conformity</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Certificate ID: {viewEolCert.id}</p>
                </div>
              </div>
              <button onClick={() => setViewEolCert(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Certificate Template Card */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 font-sans text-slate-800">
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">AESPL HIGH-VOLTAGE BATTERY QUALITY CERTIFICATE</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Automated End-of-Line Hi-Pot Insulation & BMS CAN Telemetry Verification</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Battery Serial Number</span>
                  <span className="font-extrabold text-cyan-900">{viewEolCert.serialNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Battery Pack Model</span>
                  <span className="font-extrabold text-slate-900">{viewEolCert.packModel}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Hi-Pot Insulation Resistance</span>
                  <span className="font-extrabold text-emerald-700">⚡ {viewEolCert.hiPotInsulationResistanceMOm} MΩ (PASS)</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Dielectric Breakdown Test</span>
                  <span className="font-extrabold text-slate-900">{viewEolCert.dielectricBreakdownTest}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">BMS MAC & Telemetry</span>
                  <span className="font-extrabold text-purple-800">{viewEolCert.bmsMacAddress} ({viewEolCert.bmsFirmwareVersion})</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Cell Delta & Measured Cap</span>
                  <span className="font-extrabold text-slate-900">ΔV: {viewEolCert.cellVoltageDeltaMaxmV} mV • {viewEolCert.packCapacityAh} Ah</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[10px]">
                <div>
                  <span className="text-slate-400 font-bold block uppercase">Test Bench & Officer</span>
                  <span className="font-bold text-slate-900 block">{viewEolCert.testedBy} ({viewEolCert.testBenchId})</span>
                  <span className="text-slate-500 block font-mono">{viewEolCert.testTimestamp}</span>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-100 text-emerald-800 font-black px-3 py-1 rounded-full text-[10px] uppercase">
                    ✓ PASSED & CERTIFIED
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => downloadReportDataAsPDF({
                  title: "EOL BATTERY QUALITY CERTIFICATE",
                  subtitle: `Serial Number: ${viewEolCert.serialNumber} • Model: ${viewEolCert.packModel}`,
                  headers: ["Test Parameter", "Measured / Verified Value"],
                  rows: [
                    ["Battery Serial Number", viewEolCert.serialNumber],
                    ["Battery Pack Model", viewEolCert.packModel],
                    ["Hi-Pot Insulation Resistance", `${viewEolCert.hiPotInsulationResistanceMOm} MΩ (1000V DC)`],
                    ["Dielectric Breakdown Test", viewEolCert.dielectricBreakdownTest],
                    ["BMS MAC Address", viewEolCert.bmsMacAddress],
                    ["BMS Firmware Version", viewEolCert.bmsFirmwareVersion],
                    ["Max Cell Voltage Delta", `${viewEolCert.cellVoltageDeltaMaxmV} mV`],
                    ["Measured Pack Capacity", `${viewEolCert.packCapacityAh} Ah`],
                    ["Test Bench ID", viewEolCert.testBenchId],
                    ["Inspected By", viewEolCert.testedBy],
                    ["Timestamp", viewEolCert.testTimestamp]
                  ],
                  filename: `EOL_QUALITY_CERT_${viewEolCert.serialNumber}`
                })}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-md"
              >
                <Download size={14} /> Download Certificate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Log Machine Operator Scrap */}
      {isScrapModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase italic">Log Machine Operator Scrap</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Machine Allocation & Line Component Wastage Ledger</p>
                </div>
              </div>
              <button onClick={() => setIsScrapModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateScrapLog} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Machine Allocation</label>
                  <select
                    value={scMachineId}
                    onChange={(e) => {
                      setScMachineId(e.target.value);
                      const names: Record<string, string> = {
                        SPOT_WELDER_01: "Pneumatic Spot Welder #1",
                        ULTRASONIC_BONDER_02: "Ultrasonic Wire Bonder #2",
                        LASER_CLEANER_01: "Laser Surface Cleaner",
                        AUTOMATED_TAB_WELDER_01: "Automated Tab Welder"
                      };
                      setScMachineName(names[e.target.value] || e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  >
                    <option value="SPOT_WELDER_01">SPOT_WELDER_01 - Spot Welder #1</option>
                    <option value="ULTRASONIC_BONDER_02">ULTRASONIC_BONDER_02 - Wire Bonder #2</option>
                    <option value="LASER_CLEANER_01">LASER_CLEANER_01 - Laser Cleaner</option>
                    <option value="AUTOMATED_TAB_WELDER_01">AUTOMATED_TAB_WELDER_01 - Tab Welder</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Shift Assignment</label>
                  <select
                    value={scShift}
                    onChange={(e) => setScShift(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Shift A (Morning 06:00 - 14:00)">Shift A (Morning 06:00 - 14:00)</option>
                    <option value="Shift B (Evening 14:00 - 22:00)">Shift B (Evening 14:00 - 22:00)</option>
                    <option value="Shift C (Night 22:00 - 06:00)">Shift C (Night 22:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Operator Name</label>
                  <input
                    type="text"
                    required
                    value={scOperator}
                    onChange={(e) => setScOperator(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Scrapped Component / Raw Material</label>
                  <select
                    value={scMaterialId}
                    onChange={(e) => {
                      setScMaterialId(e.target.value);
                      const matMap: Record<string, { name: string; unit: string; costPerUnit: number }> = {
                        "RM-NICKEL": { name: "Nickel Strip 0.15mm", unit: "Kg", costPerUnit: 750 },
                        "RM-BUSBAR": { name: "Copper Busbar", unit: "Pcs", costPerUnit: 350 },
                        "RM-HARNESS": { name: "BMS Wire Harness", unit: "Pcs", costPerUnit: 450 },
                        "RM-SLEEVE": { name: "PVC Heat Shrink Sleeve", unit: "Mtr", costPerUnit: 120 }
                      };
                      const item = matMap[e.target.value];
                      if (item) {
                        setScMaterialName(item.name);
                        setScUnit(item.unit);
                        setScCost(item.costPerUnit * scQty);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  >
                    <option value="RM-NICKEL">RM-NICKEL (Nickel Strip 0.15mm)</option>
                    <option value="RM-BUSBAR">RM-BUSBAR (Copper Busbar)</option>
                    <option value="RM-HARNESS">RM-HARNESS (BMS Wire Harness)</option>
                    <option value="RM-SLEEVE">RM-SLEEVE (PVC Heat Shrink Sleeve)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Scrap Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={scQty}
                    onChange={(e) => {
                      const qtyVal = Number(e.target.value);
                      setScQty(qtyVal);
                      const unitCosts: Record<string, number> = { "RM-NICKEL": 750, "RM-BUSBAR": 350, "RM-HARNESS": 450, "RM-SLEEVE": 120 };
                      setScCost((unitCosts[scMaterialId] || 500) * qtyVal);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Unit</label>
                  <input
                    type="text"
                    disabled
                    value={scUnit}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-rose-600 block mb-1">Financial Loss (₹)</label>
                  <input
                    type="number"
                    required
                    value={scCost}
                    onChange={(e) => setScCost(Number(e.target.value))}
                    className="w-full bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-rose-900 outline-none focus:ring-2 focus:ring-amber-500 font-mono font-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Defect / Scrap Reason</label>
                <input
                  type="text"
                  required
                  value={scReason}
                  onChange={(e) => setScReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">QC Line Supervisor Sign-Off</label>
                <input
                  type="text"
                  required
                  value={scSupervisor}
                  onChange={(e) => setScSupervisor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingScrap}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-md"
                >
                  {isSubmittingScrap ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Log Scrap Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
