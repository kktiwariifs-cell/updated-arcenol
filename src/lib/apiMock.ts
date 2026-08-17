import { 
  hydrateDbFromSupabase, 
  syncInventoryRecordToSupabase, 
  syncBulkInventoryToSupabase, 
  deleteInventoryRecordFromSupabase, 
  syncLeadRecordToSupabase, 
  deleteLeadRecordFromSupabase, 
  syncBusinessProfileToSupabase,
  deleteClientRecordBatch,
  clearClientTable,
  deleteClientRecord
} from './clientSupabaseSync';
import { generateBatterySerial, generateModelSpecificSerial, getNextSerialSequenceForModel, ensureIndependentProductSerials } from './serialUtils';

const INITIAL_DB = {
  inventory: [] as any[],
  gradedInventory: [] as any[],
  wipInventory: [] as any[],
  wipStages: [
    "CELL_SORTING_&_MATRIX_ALIGNMENT",
    "SPOT_WELDING_&_BUSBAR_JOINING",
    "BMS_WIRING_&_SOLDERING",
    "CASING_&_POTTING",
    "QUALITY_CHECK"
  ],
  processingLogs: [] as any[],
  production: [] as any[],
  productionPlans: [] as any[],
  finishedGoods: [
    { id: "fg1", model: "72V30A", serial: "AESPL  EV  28G26000001", batch: "BATCH-A1", warehouse: "Ahmedabad Warehouse", rack: "BIN-01", date: "2026-07-28", status: "READY" },
    { id: "fg2", model: "72V30A", serial: "AESPL  EV  28G26000002", batch: "BATCH-A1", warehouse: "Main Warehouse", rack: "BIN-01", date: "2026-07-28", status: "READY" },
    { id: "fg3", model: "72V30A", serial: "AESPL  EV  28G26000003", batch: "BATCH-A1", warehouse: "Main Warehouse", rack: "BIN-10", date: "2026-07-28", status: "HOLD" },
    { id: "fg4", model: "72V30A", serial: "AESPL  EV  28G26000004", batch: "BATCH-A2", warehouse: "Ahmedabad Warehouse", rack: "BIN-15", date: "2026-07-28", status: "DAMAGED" },
    { id: "fg5", model: "72V30A", serial: "AESPL  EV  28G26000005", batch: "BATCH-A2", warehouse: "Service Warehouse", rack: "S-01", date: "2026-07-28", status: "RETURNED" },
    { id: "fg6", model: "BAT-AUTO-35", serial: "AESPL  AUTO  28G26000001", batch: "BATCH-B1", warehouse: "Main Warehouse", rack: "BIN-05", date: "2026-07-28", status: "READY" },
    { id: "fg6b", model: "BAT-AUTO-35", serial: "AESPL  AUTO  28G26000002", batch: "BATCH-B1", warehouse: "Ahmedabad Warehouse", rack: "BIN-08", date: "2026-07-28", status: "READY" },
    { id: "fg7", model: "BAT-INV-150", serial: "AESPL  INV  28G26000001", batch: "BATCH-C1", warehouse: "Main Warehouse", rack: "BIN-06", date: "2026-07-28", status: "READY" },
    { id: "fg7b", model: "BAT-INV-150", serial: "AESPL  INV  28G26000002", batch: "BATCH-C1", warehouse: "Ahmedabad Warehouse", rack: "BIN-07", date: "2026-07-28", status: "READY" },
    { id: "fg8", model: "BAT-VRLA-100", serial: "AESPL  VRLA  28G26000001", batch: "BATCH-D1", warehouse: "Ahmedabad Warehouse", rack: "BIN-20", date: "2026-07-28", status: "READY" },
    { id: "fg8b", model: "BAT-VRLA-100", serial: "AESPL  VRLA  28G26000002", batch: "BATCH-D1", warehouse: "Main Warehouse", rack: "BIN-21", date: "2026-07-28", status: "READY" },
    { id: "fg9", model: "PROD-EV-BIKE", serial: "AESPL  EV  28G26000001", batch: "BATCH-E1", warehouse: "Main Warehouse", rack: "BIN-12", date: "2026-07-28", status: "READY" },
    { id: "fg9b", model: "PROD-EV-BIKE", serial: "AESPL  EV  28G26000002", batch: "BATCH-E1", warehouse: "Ahmedabad Warehouse", rack: "BIN-13", date: "2026-07-28", status: "READY" },
    { id: "fg10", model: "BAT-NEXT-200", serial: "AESPL  INV  28G26000001", batch: "BATCH-F1", warehouse: "Main Warehouse", rack: "BIN-14", date: "2026-07-28", status: "READY" },
    { id: "fg11", model: "BAT-NEXT-200", serial: "AESPL  INV  28G26000002", batch: "BATCH-F1", warehouse: "Ahmedabad Warehouse", rack: "BIN-15", date: "2026-07-28", status: "READY" },
    { id: "fg12", model: "LIT-200", serial: "AESPL  LIT  28G26000001", batch: "BATCH-G1", warehouse: "Main Warehouse", rack: "BIN-18", date: "2026-07-28", status: "READY" },
    { id: "fg12b", model: "LIT-200", serial: "AESPL  LIT  28G26000002", batch: "BATCH-G1", warehouse: "Ahmedabad Warehouse", rack: "BIN-19", date: "2026-07-28", status: "READY" },
  ],
  productionHistory: [] as any[],
  stockAudits: [] as any[],
  gateEntries: [] as any[],
  warehouseTransfers: [] as any[],
  purchaseOrders: [] as any[],
  warehouses: ["Main Warehouse", "Ahmedabad Warehouse", "Dealer Warehouse", "Service Warehouse", "Raw Hub"],
  notifications: [] as any[],
  leads: [
    {
        "id": "l-1784531732680",
        "company": "PATEL PATEL",
        "category": "Retail",
        "location": "vadodara",
        "contactPerson": "PATEL PATEL",
        "phone": "9173023179",
        "leadSource": "Indiamart / B2B",
        "requirement": "lead alocate to shaineel call tomorrow",
        "status": "CONTACTED",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 04:57:54.002475+00"
    },
    {
        "id": "l-1784542396069",
        "company": "Pareshbhai",
        "category": "Retail",
        "location": "Bhavnagar",
        "contactPerson": "Pareshbhai",
        "phone": "09033332005",
        "leadSource": "Indiamart / B2B",
        "requirement": "bataege inform price",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 04:58:27.823613+00"
    },
    {
        "id": "l-1784715041508",
        "company": "ATS electric vehicles",
        "category": "Dealer",
        "location": "ahmedabad",
        "contactPerson": "ATS electric vehicles",
        "phone": "7600010551",
        "leadSource": "Cold Call",
        "requirement": "already sent proposal call back",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-11",
        "followUpTime": "11:01",
        "notes": "[Follow-up 2026-07-23]: dekh k bataege\n[Follow-up 2026-07-25]: dekh k cal karege\n[Follow-up 2026-07-30]: call karege already sent proposal",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "dekh k bataege",
                "time": "09:31",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:01"
            },
            {
                "date": "2026-07-25",
                "text": "dekh k cal karege",
                "time": "16:40",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "11:01"
            },
            {
                "date": "2026-07-30",
                "text": "call karege already sent proposal",
                "time": "17:36",
                "nextFollowUpDate": "2026-08-11",
                "nextFollowUpTime": "11:01"
            }
        ],
        "createdAt": "2026-07-23 03:58:28.744924+00"
    },
    {
        "id": "l-1784715189255",
        "company": "J D E bike zone",
        "category": "Dealer",
        "location": "ahmedabad",
        "contactPerson": "J D E bike zone",
        "phone": "7046573095",
        "leadSource": "Cold Call",
        "requirement": "sent proposal requirement hogi to bolege",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-13",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-30]: sent reminder jarurat hogi to bolege",
        "remarksLog": [
            {
                "date": "2026-07-30",
                "text": "sent reminder jarurat hogi to bolege",
                "time": "16:06",
                "nextFollowUpDate": "2026-08-13",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 04:58:45.238183+00"
    },
    {
        "id": "l-1784715748778",
        "company": "pranvi motors",
        "category": "Dealer",
        "location": "ahmedabad",
        "contactPerson": "pranvi motors",
        "phone": "8155011817",
        "leadSource": "Cold Call",
        "requirement": "always disco the call",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-28",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-24]: switched off",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not attend",
                "time": "09:30",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-24",
                "text": "switched off",
                "time": "15:30",
                "nextFollowUpDate": "2026-07-28",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-23 04:00:39.08537+00"
    },
    {
        "id": "l-1784716437277",
        "company": "omkaar e-vehicles",
        "category": "Dealer",
        "location": "naroda ,ahmedabad",
        "contactPerson": "omkaar e-vehicles",
        "phone": "8866843636",
        "leadSource": "Cold Call",
        "requirement": "sent proposal not attend",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-11",
        "followUpTime": "00:00",
        "notes": "[Follow-up 2026-07-23]: yet not seen dekh k bataege\n[Follow-up 2026-07-25]: sent proposal call back\n[Follow-up 2026-07-30]: sent reminder",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "yet not seen dekh k bataege",
                "time": "09:35",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "00:00"
            },
            {
                "date": "2026-07-25",
                "text": "sent proposal call back",
                "time": "16:39",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "00:00"
            },
            {
                "date": "2026-07-30",
                "text": "sent reminder",
                "time": "17:36",
                "nextFollowUpDate": "2026-08-11",
                "nextFollowUpTime": "00:00"
            }
        ],
        "createdAt": "2026-07-23 04:05:29.662592+00"
    },
    {
        "id": "l-1784718734397",
        "company": "AB enterprises",
        "category": "Dealer",
        "location": "ahmedabad",
        "contactPerson": "AB enterprises",
        "phone": "9824255770",
        "leadSource": "Cold Call",
        "requirement": "always disco the call",
        "status": "QUOTATION_SENT",
        "followUpDate": "2027-07-24",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: call forwarded\n[Follow-up 2026-07-24]: not want",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "call forwarded",
                "time": "09:36",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-24",
                "text": "not want",
                "time": "15:31",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 04:06:45.458777+00"
    },
    {
        "id": "l-1784719374197",
        "company": "kyte energy",
        "category": "Dealer",
        "location": "ahmedabad",
        "contactPerson": "kyte energy",
        "phone": "9825038383",
        "leadSource": "Cold Call",
        "requirement": "sent proposal call back tomorrow",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-20",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-23]: call tomorrow sent proposal reminder\n[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-29]: call back",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "call tomorrow sent proposal reminder",
                "time": "15:46",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-24",
                "text": "call back",
                "time": "15:50",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-29",
                "text": "call back",
                "time": "12:31",
                "nextFollowUpDate": "2026-08-20",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-23 04:58:51.574428+00"
    },
    {
        "id": "l-1784720408942",
        "company": "joy e-bikes",
        "category": "Dealer",
        "location": "ghatlodiya ,ahmedabad",
        "contactPerson": "joy e-bikes",
        "phone": "8200140684",
        "leadSource": "Cold Call",
        "requirement": "sent proposal ,call back",
        "status": "NEGOTIATION",
        "followUpDate": "2026-08-02",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: price issue",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "price issue",
                "time": "09:47",
                "nextFollowUpDate": "2026-08-02",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 04:17:42.239453+00"
    },
    {
        "id": "l-1784722912098",
        "company": "okinawa and joy e-bikes",
        "category": "Dealer",
        "location": "surat",
        "contactPerson": "okinawa and joy e-bikes",
        "phone": "9104448668",
        "leadSource": "Cold Call",
        "requirement": "sent proposal remidner cal not attend call back",
        "status": "NEGOTIATION",
        "followUpDate": "2026-08-08",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-25]: sent proposal call back\n[Follow-up 2026-07-30]: sent proposal call back",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not attend",
                "time": "09:51",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-25",
                "text": "sent proposal call back",
                "time": "16:40",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-30",
                "text": "sent proposal call back",
                "time": "13:19",
                "nextFollowUpDate": "2026-08-08",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 04:21:24.974274+00"
    },
    {
        "id": "l1",
        "company": "Green Motors Ahmedabad",
        "category": "Dealer",
        "location": "Ahmedabad, GJ",
        "contactPerson": "Rajesh Shah",
        "phone": "9876543210",
        "leadSource": "Website",
        "requirement": "72V Battery Packs x 50",
        "status": "INTERESTED",
        "followUpDate": "2024-05-20",
        "followUpTime": "11:00",
        "notes": "Negotiating on bulk discount.",
        "remarksLog": [],
        "createdAt": "2026-07-22 11:46:26.43661+00"
    },
    {
        "id": "l2",
        "company": "EV Solutions Delhi",
        "category": "Distributor",
        "location": "New Delhi, DL",
        "contactPerson": "Aman Varma",
        "phone": "9123456789",
        "leadSource": "Exhibition",
        "requirement": "Li-ion Cells Bulk Purchase",
        "status": "NEW",
        "followUpDate": "2024-05-18",
        "followUpTime": "15:30",
        "notes": "Interested in the new smart BMS feature.",
        "remarksLog": [],
        "createdAt": "2026-07-22 11:46:26.43661+00"
    },
    {
        "id": "lead-001",
        "company": "Modern EV Solutions",
        "category": "DEALER",
        "location": "Chennai, Tamil Nadu",
        "contactPerson": "Aravind Swamy",
        "phone": "+91 9876543210",
        "leadSource": "WEBSITE",
        "requirement": "Needs 100Ah battery pack solutions for 2-wheelers fleet rollouts.",
        "status": "INTERESTED",
        "followUpDate": "2026-07-01",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-01 07:44:26.950739+00"
    },
    {
        "id": "lead-1784721780688",
        "company": "testdc",
        "category": "Dealer",
        "location": "Noida",
        "contactPerson": "dcdcdc",
        "phone": "7894561230",
        "leadSource": "Website",
        "requirement": "need 15000ah battery",
        "status": "INTERESTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-22 12:03:01.084406+00"
    },
    {
        "id": "lead-1784778912419",
        "company": "Kiran",
        "category": "Retail",
        "location": "Anand",
        "contactPerson": "Kiran",
        "phone": "08849305429",
        "leadSource": "Indiamart / B2B",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2027-07-31",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-24]: switched off\n[Follow-up 2026-07-25]: call back\n[Follow-up 2026-07-28]: call disco\n[Follow-up 2026-07-31]: retail already purchased",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "switched off",
                "time": "15:19",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "15:38",
                "nextFollowUpDate": "2026-07-28",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-28",
                "text": "call disco",
                "time": "12:09",
                "nextFollowUpDate": "2026-07-31",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-31",
                "text": "retail already purchased",
                "time": "16:15",
                "nextFollowUpDate": "2027-07-31",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 03:55:14.8941+00"
    },
    {
        "id": "lead-1784783650789",
        "company": "adinath electric vehicles",
        "category": "Dealer",
        "location": "surat , gujarat",
        "contactPerson": "adinath electric vehicles",
        "phone": "9998064671",
        "leadSource": "Website",
        "requirement": "busy",
        "status": "CONTACTED",
        "followUpDate": "2026-07-27",
        "followUpTime": "10:43",
        "notes": "[Follow-up 2026-07-23]: cal disco\n[Follow-up 2026-07-24]: call disco.",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "cal disco",
                "time": "15:49",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:43"
            },
            {
                "date": "2026-07-24",
                "text": "call disco.",
                "time": "15:50",
                "nextFollowUpDate": "2026-07-27",
                "nextFollowUpTime": "10:43"
            }
        ],
        "createdAt": "2026-07-23 05:14:10.879881+00"
    },
    {
        "id": "lead-1784783988701",
        "company": "okinawa and joy e-bikes",
        "category": "Dealer",
        "location": "surat",
        "contactPerson": "okinawa and joy e-bikes",
        "phone": "9104448668",
        "leadSource": "Website",
        "requirement": "General Requirement",
        "status": "CONTACTED",
        "followUpDate": "2026-07-27",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: sent proposal reminder",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "sent proposal reminder",
                "time": "15:55",
                "nextFollowUpDate": "2026-07-27",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 05:22:13.763768+00"
    },
    {
        "id": "lead-1784784095049",
        "company": "okinawa  and joy e-bikes",
        "category": "Dealer",
        "location": "surat",
        "contactPerson": "okinawa and joy e-bikes",
        "phone": "9104448668",
        "leadSource": "Website",
        "requirement": "sent proposal not attend",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-11",
        "followUpTime": "10:51",
        "notes": "[Follow-up 2026-07-23]: sent reminder 2 se 3 din me update dege\n[Follow-up 2026-07-25]: sent reminder update karege\n[Follow-up 2026-07-30]: sent reminder alreay",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "sent reminder 2 se 3 din me update dege",
                "time": "15:37",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:51"
            },
            {
                "date": "2026-07-25",
                "text": "sent reminder update karege",
                "time": "17:25",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:51"
            },
            {
                "date": "2026-07-30",
                "text": "sent reminder alreay",
                "time": "16:32",
                "nextFollowUpDate": "2026-08-11",
                "nextFollowUpTime": "10:51"
            }
        ],
        "createdAt": "2026-07-23 05:21:35.118278+00"
    },
    {
        "id": "lead-1784784198606",
        "company": "surat  ev mall",
        "category": "Dealer",
        "location": "surat , gujarat",
        "contactPerson": "surat ev mall",
        "phone": "8160054809",
        "leadSource": "Website",
        "requirement": "General Requirement",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-28",
        "followUpTime": "10:53",
        "notes": "[Follow-up 2026-07-23]: call disco.\n[Follow-up 2026-07-24]: not attend",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "call disco.",
                "time": "15:59",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:53"
            },
            {
                "date": "2026-07-24",
                "text": "not attend",
                "time": "15:40",
                "nextFollowUpDate": "2026-07-28",
                "nextFollowUpTime": "10:53"
            }
        ],
        "createdAt": "2026-07-23 05:23:18.66353+00"
    },
    {
        "id": "lead-1784784357551",
        "company": "auto point okaya electric vehicles",
        "category": "Dealer",
        "location": "surat , gujarat",
        "contactPerson": "auto point okaya electric vehicles",
        "phone": "9106996545",
        "leadSource": "Website",
        "requirement": "sent proposal not interested",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-28",
        "followUpTime": "10:55",
        "notes": "[Follow-up 2026-07-23]: switched off\n[Follow-up 2026-07-24]: always swithed off",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "switched off",
                "time": "15:59",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:55"
            },
            {
                "date": "2026-07-24",
                "text": "always swithed off",
                "time": "15:40",
                "nextFollowUpDate": "2026-07-28",
                "nextFollowUpTime": "10:55"
            }
        ],
        "createdAt": "2026-07-23 05:25:57.610518+00"
    },
    {
        "id": "lead-1784784481153",
        "company": "futurist karayanam",
        "category": "Dealer",
        "location": "surat, gujarat",
        "contactPerson": "futurist karayanam",
        "phone": "8460276508",
        "leadSource": "Website",
        "requirement": "not interested call disco",
        "status": "CONTACTED",
        "followUpDate": "2026-07-26",
        "followUpTime": "10:57",
        "notes": "[Follow-up 2026-07-23]: call disco\n[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: cal back\n[Follow-up 2026-07-25]: call back",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "call disco",
                "time": "15:23",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:57"
            },
            {
                "date": "2026-07-24",
                "text": "call back",
                "time": "15:27",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:57"
            },
            {
                "date": "2026-07-25",
                "text": "cal back",
                "time": "16:33",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:57"
            },
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "17:48",
                "nextFollowUpDate": "2026-07-26",
                "nextFollowUpTime": "10:57"
            }
        ],
        "createdAt": "2026-07-23 05:28:01.21351+00"
    },
    {
        "id": "lead-1784784600529",
        "company": "sarkar auto point",
        "category": "Dealer",
        "location": "surat ,gujarat",
        "contactPerson": "sarkar auto point",
        "phone": "9879257309",
        "leadSource": "Website",
        "requirement": "e-rickshaws",
        "status": "CONTACTED",
        "followUpDate": "2026-08-03",
        "followUpTime": "10:59",
        "notes": "[Follow-up 2026-07-23]: busy hai bad me bat karege\n[Follow-up 2026-07-24]: BUSY HAI call karege\n[Follow-up 2026-07-25]: sent proposal dekh k batege\n[Follow-up 2026-07-29]: deal only 3 wheeler sent price\n[Follow-up 2026-07-30]: deal only 3 wheeler\n[Follow-up 2026-07-31]: sent proposal reminder call back 3 wheeler",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "busy hai bad me bat karege",
                "time": "15:24",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:59"
            },
            {
                "date": "2026-07-24",
                "text": "BUSY HAI call karege",
                "time": "15:18",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:59"
            },
            {
                "date": "2026-07-25",
                "text": "sent proposal dekh k batege",
                "time": "15:38",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "10:59"
            },
            {
                "date": "2026-07-29",
                "text": "deal only 3 wheeler sent price",
                "time": "12:44",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:59"
            },
            {
                "date": "2026-07-30",
                "text": "deal only 3 wheeler",
                "time": "17:53",
                "nextFollowUpDate": "2026-07-31",
                "nextFollowUpTime": "10:59"
            },
            {
                "date": "2026-07-31",
                "text": "sent proposal reminder call back 3 wheeler",
                "time": "16:13",
                "nextFollowUpDate": "2026-08-03",
                "nextFollowUpTime": "10:59"
            }
        ],
        "createdAt": "2026-07-23 05:30:00.590297+00"
    },
    {
        "id": "lead-1784784727987",
        "company": "electron auto motors",
        "category": "Dealer",
        "location": "surat , gujarat",
        "contactPerson": "electron auto motors",
        "phone": "7622006668",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-26",
        "followUpTime": "11:01",
        "notes": "[Follow-up 2026-07-23]: not want\n[Follow-up 2026-07-23]: not want",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not want",
                "time": "15:26",
                "nextFollowUpDate": "2026-07-23",
                "nextFollowUpTime": "11:01"
            },
            {
                "date": "2026-07-23",
                "text": "not want",
                "time": "15:27",
                "nextFollowUpDate": "2026-07-26",
                "nextFollowUpTime": "11:01"
            }
        ],
        "createdAt": "2026-07-23 05:32:08.048083+00"
    },
    {
        "id": "lead-1784784817492",
        "company": "royal ev tech",
        "category": "Dealer",
        "location": "surat , gujarat",
        "contactPerson": "royal ev tech",
        "phone": "9081768004",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:30",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 05:33:37.562907+00"
    },
    {
        "id": "lead-1784784924127",
        "company": "shree jalaram electric vehicles",
        "category": "Dealer",
        "location": "surat , gujarat",
        "contactPerson": "shree jalaram electric vehicles",
        "phone": "9924093397",
        "leadSource": "Website",
        "requirement": "not interested price issue",
        "status": "NEGOTIATION",
        "followUpDate": "2026-07-21",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 05:35:24.190195+00"
    },
    {
        "id": "lead-1784785089758",
        "company": "nitya e-mobility",
        "category": "Dealer",
        "location": "rajkot , gujara",
        "contactPerson": "nitya e-mobility",
        "phone": "8866221148",
        "leadSource": "Website",
        "requirement": "not interested",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:14",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 05:38:09.822228+00"
    },
    {
        "id": "lead-1784785318659",
        "company": "gajanan ev and solar",
        "category": "Dealer",
        "location": "rajkot , gujarat",
        "contactPerson": "gajanan ev and solar",
        "phone": "7621886555",
        "leadSource": "Website",
        "requirement": "not interested price issue",
        "status": "NEGOTIATION",
        "followUpDate": "2626-07-21",
        "followUpTime": "11:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 05:41:58.738957+00"
    },
    {
        "id": "lead-1784786484036",
        "company": "ampere electric scooter",
        "category": "Dealer",
        "location": "rajkot , gujarat",
        "contactPerson": "ampere electric scooter",
        "phone": "7942875177",
        "leadSource": "Website",
        "requirement": "incoming not available",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:14",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:01:24.111722+00"
    },
    {
        "id": "lead-1784786576736",
        "company": "shiv shakti auto agency",
        "category": "Dealer",
        "location": "rajkot , gujarat",
        "contactPerson": "shiv shakti auto agency",
        "phone": "9925725734",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-13",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: requirement hogi to bolege yet not require\n[Follow-up 2026-07-30]: reuirement hoga to bolege sent reminder",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "requirement hogi to bolege yet not require",
                "time": "15:29",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-30",
                "text": "reuirement hoga to bolege sent reminder",
                "time": "16:04",
                "nextFollowUpDate": "2026-08-13",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 06:02:56.822062+00"
    },
    {
        "id": "lead-1784786679528",
        "company": "akshar & shree ji e-bikes",
        "category": "Dealer",
        "location": "rajkot , gujarat",
        "contactPerson": "akshar & shree ji e-bikes",
        "phone": "7984423892",
        "leadSource": "Website",
        "requirement": "busy call disco",
        "status": "CONTACTED",
        "followUpDate": "2026-07-21",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:04:39.612285+00"
    },
    {
        "id": "lead-1784786816957",
        "company": "shiv e vehicles",
        "category": "Dealer",
        "location": "rajkot , gujarat",
        "contactPerson": "shiv e vehicles",
        "phone": "9925612346",
        "leadSource": "Website",
        "requirement": "incoming call",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "11:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:06:57.041344+00"
    },
    {
        "id": "lead-1784787004921",
        "company": "siddhivinayak zelio",
        "category": "Dealer",
        "location": "rajkot, gujarat",
        "contactPerson": "siddhivinayak zelio",
        "phone": "8200382005",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2027-07-25",
        "followUpTime": "00:39",
        "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: no requiremt",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not attend",
                "time": "15:33",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "00:39"
            },
            {
                "date": "2026-07-24",
                "text": "call back",
                "time": "15:47",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "00:39"
            },
            {
                "date": "2026-07-25",
                "text": "no requiremt",
                "time": "16:33",
                "nextFollowUpDate": "2027-07-25",
                "nextFollowUpTime": "00:39"
            }
        ],
        "createdAt": "2026-07-23 06:10:04.997593+00"
    },
    {
        "id": "lead-1784787375861",
        "company": "jalaram auto point",
        "category": "Dealer",
        "location": "rajkot , gujarat",
        "contactPerson": "jalaram auto point",
        "phone": "8530500009",
        "leadSource": "Website",
        "requirement": "no requirement",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:14",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:16:15.94369+00"
    },
    {
        "id": "lead-1784787491181",
        "company": "adhya e-mobility llp",
        "category": "Dealer",
        "location": "rajkot , gujarat",
        "contactPerson": "adhya e-mobility llp",
        "phone": "7575075126",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-21",
        "followUpTime": "12:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:18:11.258424+00"
    },
    {
        "id": "lead-1784787652068",
        "company": "bgauss electric scooters",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "bgauss electric scooters",
        "phone": "7574000123",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2027-07-24",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-23]: not attend\n[Follow-up 2026-07-24]: no require",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not attend",
                "time": "15:43",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-24",
                "text": "no require",
                "time": "15:49",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-23 06:20:52.201593+00"
    },
    {
        "id": "lead-1784787767115",
        "company": "pure ev electric scooters",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "pure ev electric scooters",
        "phone": "9879900198",
        "leadSource": "Website",
        "requirement": "no requirement",
        "status": "CONTACTED",
        "followUpDate": "2026-07-21",
        "followUpTime": "09:30",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:22:47.207655+00"
    },
    {
        "id": "lead-1784787870562",
        "company": "bhagwati battery",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "bhagwati battery",
        "phone": "9978494073",
        "leadSource": "Website",
        "requirement": "not interested",
        "status": "CONTACTED",
        "followUpDate": "2027-07-24",
        "followUpTime": "10:30",
        "notes": "[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-24]: not intrested",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not intrested",
                "time": "15:19",
                "nextFollowUpDate": "2026-07-23",
                "nextFollowUpTime": "10:30"
            },
            {
                "date": "2026-07-23",
                "text": "not intrested",
                "time": "15:20",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:30"
            },
            {
                "date": "2026-07-24",
                "text": "not intrested",
                "time": "15:27",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "10:30"
            }
        ],
        "createdAt": "2026-07-23 06:24:30.659936+00"
    },
    {
        "id": "lead-1784787968440",
        "company": "satish battery center",
        "category": "Dealer",
        "location": "mehsana , guujarat",
        "contactPerson": "satish battery center",
        "phone": "9408221149",
        "leadSource": "Website",
        "requirement": "dealers of battery",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-22",
        "followUpTime": "11:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:26:08.522149+00"
    },
    {
        "id": "lead-1784788107674",
        "company": "umiya power solutions",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "umiya power solutions",
        "phone": "9998499444",
        "leadSource": "Website",
        "requirement": "not interested",
        "status": "CONTACTED",
        "followUpDate": "2027-07-25",
        "followUpTime": "11:58",
        "notes": "[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-23]: nnot intrested\n[Follow-up 2026-07-25]: not intrested",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not intrested",
                "time": "15:19",
                "nextFollowUpDate": "2026-07-23",
                "nextFollowUpTime": "11:58"
            },
            {
                "date": "2026-07-23",
                "text": "nnot intrested",
                "time": "15:21",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:58"
            },
            {
                "date": "2026-07-25",
                "text": "not intrested",
                "time": "17:24",
                "nextFollowUpDate": "2027-07-25",
                "nextFollowUpTime": "11:58"
            }
        ],
        "createdAt": "2026-07-23 06:28:27.758592+00"
    },
    {
        "id": "lead-1784788228833",
        "company": "ujas auto agency",
        "category": "Dealer",
        "location": "mehsana, gujarat",
        "contactPerson": "ujas auto agency",
        "phone": "6352405062",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-21",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:30:28.939649+00"
    },
    {
        "id": "lead-1784788331123",
        "company": "green e-bikes",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "green e-bikes",
        "phone": "9104340095",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:14",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:32:11.203802+00"
    },
    {
        "id": "lead-1784788419410",
        "company": "tirusai autolink",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "tirusai autolink",
        "phone": "7026600377",
        "leadSource": "Website",
        "requirement": "not reachable",
        "status": "CONTACTED",
        "followUpDate": "2027-07-25",
        "followUpTime": "12:03",
        "notes": "[Follow-up 2026-07-23]: not in service\n[Follow-up 2026-07-23]: not in service\n[Follow-up 2026-07-24]: not in service\n[Follow-up 2026-07-25]: not in service",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not in service",
                "time": "15:19",
                "nextFollowUpDate": "2026-07-23",
                "nextFollowUpTime": "12:03"
            },
            {
                "date": "2026-07-23",
                "text": "not in service",
                "time": "15:20",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "12:03"
            },
            {
                "date": "2026-07-24",
                "text": "not in service",
                "time": "15:26",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "12:03"
            },
            {
                "date": "2026-07-25",
                "text": "not in service",
                "time": "16:38",
                "nextFollowUpDate": "2027-07-25",
                "nextFollowUpTime": "12:03"
            }
        ],
        "createdAt": "2026-07-23 06:33:39.489014+00"
    },
    {
        "id": "lead-1784788680877",
        "company": "matter",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "matter",
        "phone": "8238082320",
        "leadSource": "Website",
        "requirement": "company number",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:14",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:38:00.971024+00"
    },
    {
        "id": "lead-1784788769485",
        "company": "green go international electrics",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "green go international electrics",
        "phone": "6367658202",
        "leadSource": "Website",
        "requirement": "switched off",
        "status": "CONTACTED",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:39:29.578429+00"
    },
    {
        "id": "lead-1784788846441",
        "company": "shayona tvs",
        "category": "Dealer",
        "location": "mehsana , gujarat",
        "contactPerson": "shayona tvs",
        "phone": "9081085550",
        "leadSource": "Website",
        "requirement": "not reachable",
        "status": "CONTACTED",
        "followUpDate": "2027-07-31",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: switched off\n[Follow-up 2026-07-24]: switched off\n[Follow-up 2026-07-29]: switched off always\n[Follow-up 2026-07-30]: call back\n[Follow-up 2026-07-31]: tvs we not provide",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "switched off",
                "time": "15:34",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-24",
                "text": "switched off",
                "time": "15:48",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-29",
                "text": "switched off always",
                "time": "12:30",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-30",
                "text": "call back",
                "time": "17:52",
                "nextFollowUpDate": "2026-07-31",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-31",
                "text": "tvs we not provide",
                "time": "16:07",
                "nextFollowUpDate": "2027-07-31",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 06:40:46.539341+00"
    },
    {
        "id": "lead-1784789007908",
        "company": "chetak electric scooters",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "chetak electric scooters",
        "phone": "9168627000",
        "leadSource": "Website",
        "requirement": "not require",
        "status": "CONTACTED",
        "followUpDate": "2027-07-23",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: no require",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "no require",
                "time": "15:49",
                "nextFollowUpDate": "2027-07-23",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 06:43:27.998326+00"
    },
    {
        "id": "lead-1784789130117",
        "company": "mihir e bikes",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "mihir e bikes",
        "phone": "9974107071",
        "leadSource": "Website",
        "requirement": "sent proposal will inform",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:45:30.20873+00"
    },
    {
        "id": "lead-1784789257898",
        "company": "agwan motors pvt ltd",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "agwan motors pvt ltd",
        "phone": "8929711991",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-19",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:47:37.984047+00"
    },
    {
        "id": "lead-1784789332031",
        "company": "varun e bikes",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "varun e bikes",
        "phone": "9824206223",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-19",
        "followUpTime": "11:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:48:52.112792+00"
    },
    {
        "id": "lead-1784789402676",
        "company": "amaron pitstop",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "amaron pitshop",
        "phone": "9227715302",
        "leadSource": "Website",
        "requirement": "not interested",
        "status": "CONTACTED",
        "followUpDate": "2027-07-24",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-23]: not intrested\n[Follow-up 2026-07-24]: not intrested",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not intrested",
                "time": "15:40",
                "nextFollowUpDate": "2026-07-24",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-24",
                "text": "not intrested",
                "time": "15:48",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-23 06:50:02.751357+00"
    },
    {
        "id": "lead-1784789549180",
        "company": "gajjar auto battery",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "gajjar auto battery",
        "phone": "9712974352",
        "leadSource": "Website",
        "requirement": "not want",
        "status": "CONTACTED",
        "followUpDate": "2027-07-25",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: not want\n[Follow-up 2026-07-25]: ni",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not want",
                "time": "15:20",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-25",
                "text": "ni",
                "time": "16:28",
                "nextFollowUpDate": "2027-07-25",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 06:52:29.270704+00"
    },
    {
        "id": "lead-1784789647419",
        "company": "thomas battery",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "thomas battery",
        "phone": "7698570353",
        "leadSource": "Website",
        "requirement": "not interested",
        "status": "CONTACTED",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:54:07.499722+00"
    },
    {
        "id": "lead-1784789754875",
        "company": "forext battery",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "forext battery",
        "phone": "9594439345",
        "leadSource": "Website",
        "requirement": "not interested call disco",
        "status": "CONTACTED",
        "followUpDate": "2027-07-25",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: not deal in lithoum battery\n[Follow-up 2026-07-25]: not deal in lithium",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "not deal in lithoum battery",
                "time": "16:00",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-25",
                "text": "not deal in lithium",
                "time": "17:19",
                "nextFollowUpDate": "2027-07-25",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 06:55:54.956228+00"
    },
    {
        "id": "lead-1784789867467",
        "company": "oreva e-bikes",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "oreva e-bikes",
        "phone": "9429621309",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:57:47.544975+00"
    },
    {
        "id": "lead-1784789971543",
        "company": "bansari automobiles",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "bansari automobiles",
        "phone": "9904991009",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-19",
        "followUpTime": "11:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 06:59:31.626319+00"
    },
    {
        "id": "lead-1784790044037",
        "company": "royal honda",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "royal honda",
        "phone": "9825039767",
        "leadSource": "Website",
        "requirement": "company number",
        "status": "CONTACTED",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 07:00:44.120463+00"
    },
    {
        "id": "lead-1784790143427",
        "company": "hero electric bikes",
        "category": "Dealer",
        "location": "gandhinagar",
        "contactPerson": "hero electric bikes",
        "phone": "9426282922",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-20",
        "followUpTime": "12:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 07:02:23.514068+00"
    },
    {
        "id": "lead-1784790267753",
        "company": "go green e-bikes",
        "category": "Dealer",
        "location": "navsari , gujarat",
        "contactPerson": "go green e-bikes",
        "phone": "8849208239",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 07:04:27.840083+00"
    },
    {
        "id": "lead-1784790374199",
        "company": "bajaj chetak electric",
        "category": "Dealer",
        "location": "navsari , gujarat",
        "contactPerson": "bajaj chetak electric",
        "phone": "9173067676",
        "leadSource": "Website",
        "requirement": "busy",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 07:06:14.279431+00"
    },
    {
        "id": "lead-1784790501159",
        "company": "hero electric",
        "category": "Dealer",
        "location": "navsari , gujarat",
        "contactPerson": "hero electric",
        "phone": "9898487022",
        "leadSource": "Website",
        "requirement": "incoming call not available",
        "status": "CONTACTED",
        "followUpDate": "2026-07-21",
        "followUpTime": "01:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 07:08:21.245929+00"
    },
    {
        "id": "lead-1784790608060",
        "company": "aarvi power solutions",
        "category": "Dealer",
        "location": "navsari , gujarat",
        "contactPerson": "aarvi power solutions",
        "phone": "9624178411",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-21",
        "followUpTime": "11:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 07:10:08.142869+00"
    },
    {
        "id": "lead-1784790715122",
        "company": "tvs mangaldeep motors llp",
        "category": "Dealer",
        "location": "navsari , gujarat",
        "contactPerson": "tvs mangaldeep motors llp",
        "phone": "9355068664",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-19",
        "followUpTime": "12:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 07:11:55.206107+00"
    },
    {
        "id": "lead-1784790817933",
        "company": "all ev services",
        "category": "Dealer",
        "location": "navsari , gujarat",
        "contactPerson": "all ev services",
        "phone": "9924472668",
        "leadSource": "Website",
        "requirement": "price issue",
        "status": "NEGOTIATION",
        "followUpDate": "2026-07-26",
        "followUpTime": "12:43",
        "notes": "[Follow-up 2026-07-23]: sent reminder price issue",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "sent reminder price issue",
                "time": "16:03",
                "nextFollowUpDate": "2026-07-26",
                "nextFollowUpTime": "12:43"
            }
        ],
        "createdAt": "2026-07-23 07:13:38.034754+00"
    },
    {
        "id": "lead-1784790994026",
        "company": "metro motors",
        "category": "Dealer",
        "location": "navsari , gujarat",
        "contactPerson": "metro motors",
        "phone": "9289922250",
        "leadSource": "Website",
        "requirement": "company number",
        "status": "CONTACTED",
        "followUpDate": "2027-07-23",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: company number",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "company number",
                "time": "16:04",
                "nextFollowUpDate": "2027-07-23",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 07:16:34.109452+00"
    },
    {
        "id": "lead-1784799205695",
        "company": "riddhi e-vehicles",
        "category": "Dealer",
        "location": "anand , gujarat",
        "contactPerson": "riddhi e-vehicles",
        "phone": "9016300975",
        "leadSource": "Website",
        "requirement": "no requirement",
        "status": "CONTACTED",
        "followUpDate": "2027-07-23",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-23]: no requirement",
        "remarksLog": [
            {
                "date": "2026-07-23",
                "text": "no requirement",
                "time": "16:06",
                "nextFollowUpDate": "2027-07-23",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-23 09:33:25.830615+00"
    },
    {
        "id": "lead-1784799286204",
        "company": "om auto battery",
        "category": "Dealer",
        "location": "anand , gujarat",
        "contactPerson": "om auto battery",
        "phone": "9687319777",
        "leadSource": "Website",
        "requirement": "busy",
        "status": "CONTACTED",
        "followUpDate": "2026-07-19",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 09:34:46.28793+00"
    },
    {
        "id": "lead-1784799384349",
        "company": "bhavya auto",
        "category": "Dealer",
        "location": "anand , gujarat",
        "contactPerson": "bhavya auto",
        "phone": "9104006108",
        "leadSource": "Website",
        "requirement": "busy another call not interested",
        "status": "CONTACTED",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:14",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 09:36:24.431582+00"
    },
    {
        "id": "lead-1784799886669",
        "company": "e-future generation next",
        "category": "Dealer",
        "location": "anand , gujarat",
        "contactPerson": "e-future generation next",
        "phone": "8200660586",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-20",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 09:44:46.759089+00"
    },
    {
        "id": "lead-1784799978560",
        "company": "kiran electric scooter",
        "category": "Dealer",
        "location": "anand , gujarat",
        "contactPerson": "kiran electric scooter",
        "phone": "9870020451",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-21",
        "followUpTime": "12:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 09:46:18.643958+00"
    },
    {
        "id": "lead-1784800087325",
        "company": "aaditya ev hub",
        "category": "Dealer",
        "location": "anand , gujarat",
        "contactPerson": "aaditya ev hub",
        "phone": "9909908843",
        "leadSource": "Website",
        "requirement": "not yet want",
        "status": "CONTACTED",
        "followUpDate": "2026-07-22",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-23 09:48:07.410349+00"
    },
    {
        "id": "lead-1784871734581",
        "company": "ami batteries",
        "category": "Dealer",
        "location": "bhavnagar, gujarat",
        "contactPerson": "ami batteries",
        "phone": "9913169292",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-08-29",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: call back\n[Follow-up 2026-07-29]: wrong number",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "15:10",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-29",
                "text": "wrong number",
                "time": "11:50",
                "nextFollowUpDate": "2026-08-29",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 05:42:14.762686+00"
    },
    {
        "id": "lead-1784871814774",
        "company": "raza auto e-bikes & battery",
        "category": "Dealer",
        "location": "bhavnagar, gujarat",
        "contactPerson": "raza auto e-bikes & battery",
        "phone": "9428172300",
        "leadSource": "Website",
        "requirement": "busy another call",
        "status": "CONTACTED",
        "followUpDate": "2026-08-12",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: call after 10 august",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "call after 10 august",
                "time": "16:10",
                "nextFollowUpDate": "2026-08-12",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 05:43:34.918041+00"
    },
    {
        "id": "lead-1784871880869",
        "company": "icon battery care",
        "category": "Dealer",
        "location": "bhavnagar, gujarat",
        "contactPerson": "icon battery care",
        "phone": "9978347191",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-09",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: sent proposal requirement hogi to bolege",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "sent proposal requirement hogi to bolege",
                "time": "15:12",
                "nextFollowUpDate": "2026-08-09",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 05:44:41.045316+00"
    },
    {
        "id": "lead-1784871960606",
        "company": "kamdhenu autoworld g lite",
        "category": "Dealer",
        "location": "bhavnagar, gujarat",
        "contactPerson": "kamdhenu autoworld g lite",
        "phone": "7874783800",
        "leadSource": "Website",
        "requirement": "call disco",
        "status": "CONTACTED",
        "followUpDate": "2026-07-26",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-24 05:46:00.751405+00"
    },
    {
        "id": "lead-1784872043778",
        "company": "bapasitaram e-vehicles",
        "category": "Dealer",
        "location": "bhavnagar, gujarat",
        "contactPerson": "bapasitaram e-vehicles",
        "phone": "9265400465",
        "leadSource": "Website",
        "requirement": "ev me kam nahi karte hai",
        "status": "NEGOTIATION",
        "followUpDate": "2026-07-26",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-24 05:47:23.916587+00"
    },
    {
        "id": "lead-1784872125017",
        "company": "mehta automobiles",
        "category": "Dealer",
        "location": "bhavnagar, gujarat",
        "contactPerson": "mehta automobiles",
        "phone": "7624938775",
        "leadSource": "Website",
        "requirement": "switched off",
        "status": "CONTACTED",
        "followUpDate": "2026-09-30",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: call disco.\n[Follow-up 2026-07-28]: not attend\n[Follow-up 2026-07-30]: not deal in lithium battery",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "call disco.",
                "time": "15:16",
                "nextFollowUpDate": "2026-07-28",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-28",
                "text": "not attend",
                "time": "12:02",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-30",
                "text": "not deal in lithium battery",
                "time": "10:33",
                "nextFollowUpDate": "2026-09-30",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 05:48:45.152717+00"
    },
    {
        "id": "lead-1784872219631",
        "company": "gujarat enterprises",
        "category": "Dealer",
        "location": "bhavnagar, gujarat",
        "contactPerson": "gujarat enterprises",
        "phone": "9499722972",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2027-07-30",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: call disco",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "call disco",
                "time": "16:15",
                "nextFollowUpDate": "2027-07-30",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 05:50:19.75882+00"
    },
    {
        "id": "lead-1784872353836",
        "company": "satnam battery & e-bike",
        "category": "Dealer",
        "location": "porbandar , gujarat",
        "contactPerson": "satnam battery & e-bikes",
        "phone": "9904568508",
        "leadSource": "Website",
        "requirement": "work only lead acid",
        "status": "CONTACTED",
        "followUpDate": "2027-07-25",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: work only lead",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "work only lead",
                "time": "16:38",
                "nextFollowUpDate": "2027-07-25",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 05:52:33.983983+00"
    },
    {
        "id": "lead-1784872424221",
        "company": "life battery",
        "category": "Dealer",
        "location": "porbandar , gujarat",
        "contactPerson": "life battery",
        "phone": "9825408990",
        "leadSource": "Website",
        "requirement": "auto battery k nahi h",
        "status": "CONTACTED",
        "followUpDate": "2026-07-26",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-24 05:53:44.348066+00"
    },
    {
        "id": "lead-1784872555366",
        "company": "regal moto corp",
        "category": "Dealer",
        "location": "porbandar , gujarat",
        "contactPerson": "regal moto corp",
        "phone": "8347917591",
        "leadSource": "Website",
        "requirement": "busy another call",
        "status": "CONTACTED",
        "followUpDate": "2026-07-26",
        "followUpTime": "10:00",
        "notes": "",
        "remarksLog": [],
        "createdAt": "2026-07-24 05:55:55.50244+00"
    },
    {
        "id": "lead-1784872634619",
        "company": "chamunda e-bikes",
        "category": "Dealer",
        "location": "porbandar , gujarat",
        "contactPerson": "chamunda e-bikes",
        "phone": "9327059455",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2027-07-31",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: sent proposal call back\n[Follow-up 2026-07-29]: sent proposal already not attend\n[Follow-up 2026-07-30]: sent reminder\n[Follow-up 2026-07-31]: lead acid me hi kam karte hai",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "sent proposal call back",
                "time": "15:20",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-29",
                "text": "sent proposal already not attend",
                "time": "12:38",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-30",
                "text": "sent reminder",
                "time": "17:52",
                "nextFollowUpDate": "2026-07-31",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-31",
                "text": "lead acid me hi kam karte hai",
                "time": "16:22",
                "nextFollowUpDate": "2027-07-31",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 05:57:14.763842+00"
    },
    {
        "id": "lead-1784872749844",
        "company": "halar battery",
        "category": "Dealer",
        "location": "jamnagar",
        "contactPerson": "halar battery",
        "phone": "8849948004",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2027-07-24",
        "followUpTime": "11:28",
        "notes": "[Follow-up 2026-07-24]: sent proposal not yet require",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "sent proposal not yet require",
                "time": "15:33",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "11:28"
            }
        ],
        "createdAt": "2026-07-24 05:59:09.973606+00"
    },
    {
        "id": "lead-1784872827221",
        "company": "exide care",
        "category": "Dealer",
        "location": "jamnagar",
        "contactPerson": "exide care",
        "phone": "80675110335",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-26",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-24]: not reachable\n[Follow-up 2026-07-25]: call back",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "not reachable",
                "time": "15:20",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "17:48",
                "nextFollowUpDate": "2026-07-26",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-24 06:00:27.349269+00"
    },
    {
        "id": "lead-1784872957014",
        "company": "galaxy ev",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "galaxy ev",
        "phone": "8200983.317",
        "leadSource": "Website",
        "requirement": "not interested",
        "status": "CONTACTED",
        "followUpDate": "2027-07-24",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-24]: not intrested",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "not intrested",
                "time": "15:22",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-24 06:02:37.140531+00"
    },
    {
        "id": "lead-1784873028121",
        "company": "uma battery",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "uma battery",
        "phone": "9978589569",
        "leadSource": "Website",
        "requirement": "not want",
        "status": "CONTACTED",
        "followUpDate": "2027-07-24",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-24]: not want",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "not want",
                "time": "15:20",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-24 06:03:48.254022+00"
    },
    {
        "id": "lead-1784873099810",
        "company": "green earth e-bike",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "green earth e-bike",
        "phone": "9723416000",
        "leadSource": "Website",
        "requirement": "sent proposal already price issue",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-09-29",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-24]: not attend\n[Follow-up 2026-07-25]: call bacj\n[Follow-up 2026-07-29]: call disco",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "not attend",
                "time": "15:21",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-25",
                "text": "call bacj",
                "time": "16:08",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-29",
                "text": "call disco",
                "time": "12:02",
                "nextFollowUpDate": "2026-09-29",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-24 06:04:59.949608+00"
    },
    {
        "id": "lead-1784873167601",
        "company": "jay somnath battery",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "jay somnath battery",
        "phone": "9033040029",
        "leadSource": "Website",
        "requirement": "price issue",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-02",
        "followUpTime": "11:30",
        "notes": "[Follow-up 2026-07-24]: price issue",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "price issue",
                "time": "15:33",
                "nextFollowUpDate": "2026-08-02",
                "nextFollowUpTime": "11:30"
            }
        ],
        "createdAt": "2026-07-24 06:06:07.723168+00"
    },
    {
        "id": "lead-1784873236484",
        "company": "urja battery",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "urja battery",
        "phone": "9428887171",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-07-28",
        "followUpTime": "11:30",
        "notes": "[Follow-up 2026-07-24]: sent proposal",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "sent proposal",
                "time": "15:35",
                "nextFollowUpDate": "2026-07-28",
                "nextFollowUpTime": "11:30"
            }
        ],
        "createdAt": "2026-07-24 06:07:16.621747+00"
    },
    {
        "id": "lead-1784873299188",
        "company": "electric one",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "electric one",
        "phone": "9998783333",
        "leadSource": "Website",
        "requirement": "not want",
        "status": "CONTACTED",
        "followUpDate": "2027-07-24",
        "followUpTime": "11:30",
        "notes": "[Follow-up 2026-07-24]: not want",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "not want",
                "time": "15:23",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "11:30"
            }
        ],
        "createdAt": "2026-07-24 06:08:19.323324+00"
    },
    {
        "id": "lead-1784873360630",
        "company": "acute electronics",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "acute electronics",
        "phone": "9825350994",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-11-05",
        "followUpTime": "11:25",
        "notes": "[Follow-up 2026-07-24]: sent proposal already not attend\n[Follow-up 2026-07-25]: sent proposal not attend\n[Follow-up 2026-08-05]: sent reminder call krege",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "sent proposal already not attend",
                "time": "15:22",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:25"
            },
            {
                "date": "2026-07-25",
                "text": "sent proposal not attend",
                "time": "15:10",
                "nextFollowUpDate": "2026-08-05",
                "nextFollowUpTime": "11:25"
            },
            {
                "date": "2026-08-05",
                "text": "sent reminder call krege",
                "time": "13:05",
                "nextFollowUpDate": "2026-11-05",
                "nextFollowUpTime": "11:25"
            }
        ],
        "createdAt": "2026-07-24 06:09:20.761109+00"
    },
    {
        "id": "lead-1784873459860",
        "company": "jay maa e-bike",
        "category": "Dealer",
        "location": "bharuch , gujara",
        "contactPerson": "jay maa e-bikes",
        "phone": "9737617010",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-08",
        "followUpTime": "11:25",
        "notes": "[Follow-up 2026-07-24]: sent proposal call back\n[Follow-up 2026-07-29]: sent proposal reminder call back\n[Follow-up 2026-07-31]: sent proposal reminder call back not attend",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "sent proposal call back",
                "time": "15:41",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "11:25"
            },
            {
                "date": "2026-07-29",
                "text": "sent proposal reminder call back",
                "time": "12:30",
                "nextFollowUpDate": "2026-07-31",
                "nextFollowUpTime": "11:25"
            },
            {
                "date": "2026-07-31",
                "text": "sent proposal reminder call back not attend",
                "time": "16:19",
                "nextFollowUpDate": "2026-08-08",
                "nextFollowUpTime": "11:25"
            }
        ],
        "createdAt": "2026-07-24 06:10:59.990594+00"
    },
    {
        "id": "lead-1784873545506",
        "company": "yogi auto battery",
        "category": "Dealer",
        "location": "bharuch , gujara",
        "contactPerson": "yogi auto battery",
        "phone": "9426858241",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-09-01",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-24]: sent proposal abhi nahi dekha dekh k bolege\n[Follow-up 2026-07-29]: dekh k bolege already sent proposal\n[Follow-up 2026-07-29]: sent proposal already not attend bharuch dealer\n[Follow-up 2026-08-01]: inhe same day solution chahiye samjaya lekin nahi samaj rae k koi nahi rukta hai",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "sent proposal abhi nahi dekha dekh k bolege",
                "time": "15:42",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-29",
                "text": "dekh k bolege already sent proposal",
                "time": "12:34",
                "nextFollowUpDate": "2026-07-29",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-29",
                "text": "sent proposal already not attend bharuch dealer",
                "time": "13:11",
                "nextFollowUpDate": "2026-08-01",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-08-01",
                "text": "inhe same day solution chahiye samjaya lekin nahi samaj rae k koi nahi rukta hai",
                "time": "13:03",
                "nextFollowUpDate": "2026-09-01",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-24 06:12:25.629923+00"
    },
    {
        "id": "lead-1784873632586",
        "company": "patel battery",
        "category": "Dealer",
        "location": "bharuch , gujarat",
        "contactPerson": "patel battery",
        "phone": "9913270382",
        "leadSource": "Website",
        "requirement": "not interested call disco",
        "status": "CONTACTED",
        "followUpDate": "2027-07-24",
        "followUpTime": "11:30",
        "notes": "[Follow-up 2026-07-24]: not intrested",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "not intrested",
                "time": "15:42",
                "nextFollowUpDate": "2027-07-24",
                "nextFollowUpTime": "11:30"
            }
        ],
        "createdAt": "2026-07-24 06:13:52.711056+00"
    },
    {
        "id": "lead-1784873759711",
        "company": "krishna green energy",
        "category": "Dealer",
        "location": "bhuj , gujarat",
        "contactPerson": "krishna green battery",
        "phone": "9825019796",
        "leadSource": "Website",
        "requirement": "busy another call",
        "status": "CONTACTED",
        "followUpDate": "2026-08-26",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-24]: 9825019792 sun vision venture pvt proposal\n[Follow-up 2026-07-25]: call back",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "9825019792 sun vision venture pvt proposal",
                "time": "15:53",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:00"
            },
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "17:27",
                "nextFollowUpDate": "2026-08-26",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-24 06:15:59.832301+00"
    },
    {
        "id": "lead-1784873848878",
        "company": "kachchh battery center",
        "category": "Dealer",
        "location": "bhuj , gujarat",
        "contactPerson": "kachchh battery center",
        "phone": "8200571171",
        "leadSource": "Website",
        "requirement": "not attend",
        "status": "CONTACTED",
        "followUpDate": "2026-07-28",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-25]: call back",
        "remarksLog": [
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "17:19",
                "nextFollowUpDate": "2026-07-28",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 06:17:28.998834+00"
    },
    {
        "id": "lead-1784873920782",
        "company": "shyam e-bike",
        "category": "Dealer",
        "location": "bhuj , gujarat",
        "contactPerson": "shyam e-bike",
        "phone": "9909036489",
        "leadSource": "Website",
        "requirement": "busy another call",
        "status": "CONTACTED",
        "followUpDate": "2026-08-11",
        "followUpTime": "10:00",
        "notes": "[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: call back\n[Follow-up 2026-07-30]: call forwarded",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "call back",
                "time": "15:53",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "17:25",
                "nextFollowUpDate": "2026-07-30",
                "nextFollowUpTime": "10:00"
            },
            {
                "date": "2026-07-30",
                "text": "call forwarded",
                "time": "17:36",
                "nextFollowUpDate": "2026-08-11",
                "nextFollowUpTime": "10:00"
            }
        ],
        "createdAt": "2026-07-24 06:18:40.899605+00"
    },
    {
        "id": "lead-1784874073927",
        "company": "shree hari e-bike",
        "category": "Dealer",
        "location": "bhuj , gujarat",
        "contactPerson": "shree hari e-bike",
        "phone": "9726681019",
        "leadSource": "Website",
        "requirement": "not reachable",
        "status": "CONTACTED",
        "followUpDate": "2026-07-27",
        "followUpTime": "11:00",
        "notes": "[Follow-up 2026-07-24]: not reachable",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "not reachable",
                "time": "15:42",
                "nextFollowUpDate": "2026-07-27",
                "nextFollowUpTime": "11:00"
            }
        ],
        "createdAt": "2026-07-24 06:21:14.058102+00"
    },
    {
        "id": "lead-1784874212576",
        "company": "jay mata ji battery sales & services",
        "category": "Dealer",
        "location": "bhuj , gujarat",
        "contactPerson": "jay mata ji battery sales & services",
        "phone": "9099646382",
        "leadSource": "Website",
        "requirement": "sent proposal",
        "status": "QUOTATION_SENT",
        "followUpDate": "2026-08-24",
        "followUpTime": "11:20",
        "notes": "[Follow-up 2026-07-24]: yet no requirement bolege",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "yet no requirement bolege",
                "time": "15:44",
                "nextFollowUpDate": "2026-08-24",
                "nextFollowUpTime": "11:20"
            }
        ],
        "createdAt": "2026-07-24 06:23:32.691624+00"
    },
    {
        "id": "lead-1784874305819",
        "company": "rajarshi ev",
        "category": "Dealer",
        "location": "bhuj , gujarat",
        "contactPerson": "rajarshi ev",
        "phone": "8071936936",
        "leadSource": "Website",
        "requirement": "not reachable",
        "status": "CONTACTED",
        "followUpDate": "2026-07-27",
        "followUpTime": "11:26",
        "notes": "[Follow-up 2026-07-24]: call back\n[Follow-up 2026-07-25]: wrong number\n[Follow-up 2026-07-25]: wrong number",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "call back",
                "time": "15:53",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:26"
            },
            {
                "date": "2026-07-25",
                "text": "wrong number",
                "time": "17:26",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "11:26"
            },
            {
                "date": "2026-07-25",
                "text": "wrong number",
                "time": "17:26",
                "nextFollowUpDate": "2026-07-27",
                "nextFollowUpTime": "11:26"
            }
        ],
        "createdAt": "2026-07-24 06:25:05.955643+00"
    },
    {
        "id": "lead-1784874376010",
        "company": "pure ev",
        "category": "Dealer",
        "location": "bhuj , gujarat",
        "contactPerson": "pure ev",
        "phone": "9274148833",
        "leadSource": "Website",
        "requirement": "busy another call",
        "status": "CONTACTED",
        "followUpDate": "2026-07-27",
        "followUpTime": "10:30",
        "notes": "[Follow-up 2026-07-24]: call disco.\n[Follow-up 2026-07-25]: call back",
        "remarksLog": [
            {
                "date": "2026-07-24",
                "text": "call disco.",
                "time": "15:55",
                "nextFollowUpDate": "2026-07-25",
                "nextFollowUpTime": "10:30"
            },
            {
                "date": "2026-07-25",
                "text": "call back",
                "time": "17:44",
                "nextFollowUpDate": "2026-07-27",
                "nextFollowUpTime": "10:30"
            }
        ],
        "createdAt": "2026-07-24 06:26:16.117718+00"
    }
],
  dealers: [
    { id: "D-101", company: "Elite Power Ahmedabad", category: "Tier 1 Dealer", gstin: "24AAAAA0000A1Z5", phone: "9988776655", email: "contact@elitepower.com", location: "Navrangpura", city: "Ahmedabad", state: "Gujarat", region: "West", contactPerson: "Amit Mehta", status: "ACTIVE", bankDetails: "HDFC A/C: 50100234...", rankingScore: 92, joinDate: "2023-01-15" },
    { id: "D-102", company: "Spark EV Rajkot", category: "Certified Service Center", gstin: "24BBBBB1111B1Z2", phone: "9900112233", email: "info@sparkev.in", location: "Metoda GIDC", city: "Rajkot", state: "Gujarat", region: "West", contactPerson: "Suresh Bhai", status: "ACTIVE", bankDetails: "ICICI A/C: 0023101...", rankingScore: 85, joinDate: "2023-03-20" },
    { id: "D-103", company: "Metro Batteries Delhi", category: "Tier 1 Dealer", gstin: "07AAAAA0000A1Z5", phone: "9811223344", email: "delhi@metro.com", location: "Okhla Industrial Area", city: "New Delhi", state: "Delhi", region: "North", contactPerson: "Vikram Singh", status: "ACTIVE", bankDetails: "SBI A/C: 334455...", rankingScore: 78, joinDate: "2023-06-10" },
    { id: "D-104", company: "South Solar Chennai", category: "Tier 2 Dealer", gstin: "33AAAAA0000A1Z5", phone: "9844556677", email: "sales@southsolar.com", location: "Adyar", city: "Chennai", state: "Tamil Nadu", region: "South", contactPerson: "Karthik R.", status: "ACTIVE", bankDetails: "Axis A/C: 998877...", rankingScore: 88, joinDate: "2023-02-05" },
    { id: "D-105", company: "East Energy Kolkata", category: "Distributor", gstin: "19AAAAA0000A1Z5", phone: "9833445566", email: "info@eastenergy.com", location: "Salt Lake", city: "Kolkata", state: "West Bengal", region: "East", contactPerson: "Pranab M.", status: "ACTIVE", bankDetails: "HDFC A/C: 112233...", rankingScore: 72, joinDate: "2023-11-25" },
  ],
  engagement: {
    stats: {
      activeAppUsers: 0,
      qrScans30d: 0,
      claimRequests: 0,
      avgRating: 0
    },
    funnel: [
      { label: "Unique QR Scans", value: 0, percentage: 0 },
      { label: "App Download", value: 0, percentage: 0 },
      { label: "Product Registration", value: 0, percentage: 0 },
      { label: "Recurring Engagement", value: 0, percentage: 0 }
    ],
    recentScans: [] as any[]
  },
  invoices: [
    {
      id: "INV-10029",
      dealerId: "cust-001",
      customerId: "cust-001",
      partyName: "Electra Transit Pvt Ltd",
      customerName: "Electra Transit Pvt Ltd",
      date: "2026-07-28",
      billedDate: "2026-07-28",
      created_at: "2026-07-28T10:00:00.000Z",
      items: [
        {
          model: "BAT-72V-30A",
          modelId: "BAT-72V-30A",
          name: "E-Rickshaw Batteries (72V30A)",
          description: "E-Rickshaw Batteries",
          qty: 2,
          price: 45000,
          serials: ["AESPL  EV  28G26000001", "AESPL  EV  28G26000002"]
        }
      ],
      goods: [
        {
          description: "E-Rickshaw Batteries",
          qty: 2,
          serials: ["AESPL  EV  28G26000001", "AESPL  EV  28G26000002"],
          baseRate: 45000,
          netVal: 90000
        }
      ],
      subtotal: 90000,
      discount: 1000,
      gst: 16020,
      tax: 16020,
      grandTotal: 105020,
      total: 105020,
      paymentMode: "Credit",
      status: "UNPAID"
    },
    {
      id: "INV-1001",
      dealerId: "l1",
      customerId: "l1",
      partyName: "Electra Transit Pvt Ltd",
      customerName: "Electra Transit Pvt Ltd",
      date: "2026-07-25",
      billedDate: "2026-07-25",
      created_at: "2026-07-25T10:00:00.000Z",
      items: [{ model: "BAT-72V-30A", modelId: "BAT-72V-30A", name: "E-Rickshaw Batteries (72V30A)", qty: 1, serials: ["AESPL  EV  28G26000001"], price: 35000 }],
      goods: [{ description: "E-Rickshaw Batteries", qty: 1, serials: ["AESPL  EV  28G26000001"], baseRate: 35000, netVal: 35000 }],
      subtotal: 35000,
      gst: 6300,
      tax: 6300,
      grandTotal: 41300,
      total: 41300,
      paymentMode: "Digital",
      status: "PAID"
    }
  ],
  warranty: [] as any[],
  complaints: [
    { id: "C-1001", serial: "AESPL  EV  28G26000001", type: "Low Range", stage: "CLOSED", status: "RESOLVED", date: "2024-05-10", resolvedDate: "2024-05-14", notes: "BMS firmware updated.", rootCause: "BMS Failure", engineer: "Suresh P.", inspectionResult: "Firmware drift detected" },
    { id: "C-1002", serial: "AESPL  EV  28G26000002", type: "Dead on Arrival", stage: "REGISTERED", status: "OPEN", date: "2024-05-15", resolvedDate: "", notes: "Unit not turning on.", engineer: "Unassigned" },
    { id: "C-1003", serial: "AESPL  EV  28G26000003", type: "Voltage Drop", stage: "UNDER_INSPECTION", status: "OPEN", date: "2024-05-16", resolvedDate: "", notes: "Sudden power cut.", engineer: "Ramesh K." },
    { id: "C-1004", serial: "AESPL  AUTO  28G26000001", type: "No Backup", stage: "READY_FOR_DISPATCH", status: "OPEN", date: "2024-05-14", resolvedDate: "", notes: "Aging cells.", engineer: "Suresh P.", rootCause: "Cell Failure" },
    { id: "C-1005", serial: "AESPL  INV  28G26000001", type: "High Temp", stage: "REPAIR_STARTED", status: "OPEN", date: "2024-05-12", resolvedDate: "", notes: "Fan not working.", engineer: "Anita D." },
    { id: "C-1006", serial: "OLD-GEN-BATT-9900", type: "Water Damage", stage: "CLOSED", status: "RESOLVED", date: "2024-05-08", resolvedDate: "2024-05-11", notes: "Seal leaked.", engineer: "Ramesh K.", rootCause: "Water Damage" }
  ],
  engineers: [
    { id: "E1", name: "Suresh P.", casesSolved: 1, avgTat: 4, rating: 5.0 },
    { id: "E2", name: "Ramesh K.", casesSolved: 1, avgTat: 3, rating: 5.0 },
    { id: "E3", name: "Anita D.", casesSolved: 0, avgTat: 2, rating: 5.0 },
    { id: "E4", name: "Vikram R.", casesSolved: 0, avgTat: 2, rating: 5.0 },
  ],
  serviceStages: [
    "REGISTERED", "RECEIVED", "UNDER_INSPECTION", "REPAIR_STARTED", "WAITING_FOR_PARTS", "TESTING", "QC_PASSED", "READY_FOR_DISPATCH", "DELIVERED", "CLOSED"
  ],
  failureCategories: ["Cell Failure", "BMS Failure", "Charger Failure", "Water Damage", "Voltage Drop"],
  products: [
    {
      id: "BAT-NEXT-200",
      name: "High-Efficiency Inverter Battery 200Ah",
      category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
      type: "Inverter Battery Pack",
      price: 48000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 240, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "LIT-200",
      name: "Lithium Ion NMC Battery 200Ah",
      category: "CATEGORY 1 — EV BATTERY INVENTORY",
      type: "Li-Ion Module",
      price: 52000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "72V30A",
      name: "E-Rickshaw Batteries",
      category: "CATEGORY 1 — EV BATTERY INVENTORY",
      type: "EV Battery Pack",
      price: 45000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 200, unit: "Pcs", wastage: 1, subBom: [
          { name: "Cathode Active Material", qty: 0.5, unit: "kg" },
          { name: "Anode Active Material", qty: 0.3, unit: "kg" },
          { name: "Electrolyte", qty: 0.1, unit: "L" },
          { name: "Separator", qty: 2, unit: "m2" }
        ]},
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "BAT-AUTO-35",
      name: "Scooter Batteries",
      category: "CATEGORY 1 — EV BATTERY INVENTORY",
      type: "EV Battery Pack",
      price: 32000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 150, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-EV-BIKE",
      name: "Bike Batteries",
      category: "CATEGORY 1 — EV BATTERY INVENTORY",
      type: "EV Battery Pack",
      price: 38000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 180, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "BAT-VRLA-100",
      name: "12V 100Ah",
      category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
      type: "Solar Battery",
      price: 14000,
      bom: [
        { matId: "RM-LEAD", name: "Lead Calcium Alloy", qty: 14.00, unit: "Kg", wastage: 2 },
        { matId: "RM-OXIDE", name: "Lead Oxide", qty: 5.00, unit: "Kg", wastage: 2 },
        { matId: "RM-ACID", name: "Sulfuric Acid", qty: 4.20, unit: "Ltr", wastage: 1 }
      ]
    },
    {
      id: "BAT-INV-150",
      name: "24V 150Ah",
      category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
      type: "Tubular Battery",
      price: 18500,
      bom: [
        { matId: "RM-LEAD", name: "Lead Alloy", qty: 18.00, unit: "Kg", wastage: 2 },
        { matId: "RM-OXIDE", name: "Lead Oxide", qty: 6.50, unit: "Kg", wastage: 2 },
        { matId: "RM-ACID", name: "Sulfuric Acid", qty: 5.50, unit: "Ltr", wastage: 1 }
      ]
    },
    {
      id: "PROD-SOLAR-48VESS",
      name: "48V ESS Packs",
      category: "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
      type: "ESS Battery Pack",
      price: 75000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 320, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ESS-TELECOM",
      name: "Telecom Batteries",
      category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
      type: "Industrial Pack",
      price: 85000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 400, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 2, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ESS-RACK",
      name: "Rack ESS",
      category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
      type: "Industrial Pack",
      price: 120000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 500, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 2, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ESS-UPS",
      name: "Industrial UPS",
      category: "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
      type: "Industrial Pack",
      price: 150000,
      bom: [
        { matId: "RM-CELLS", name: "Lithium Cells", qty: 600, unit: "Pcs", wastage: 1 },
        { matId: "RM-BMS-72V", name: "BMS", qty: 3, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ACC-CHARGER",
      name: "Chargers",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 3500,
      bom: [
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ACC-BMS",
      name: "BMS",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 2500,
      bom: [
        { matId: "RM-BMS-72V", name: "BMS", qty: 1, unit: "Pcs", wastage: 0 }
      ]
    },
    {
      id: "PROD-ACC-CONNECTOR",
      name: "Connectors",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 500,
      bom: []
    },
    {
      id: "PROD-ACC-ADAPTER",
      name: "Adapters",
      category: "CATEGORY 4 — ACCESSORIES INVENTORY",
      type: "Accessory",
      price: 1200,
      bom: []
    }
  ],
  productCategories: [
    "CATEGORY 1 — EV BATTERY INVENTORY",
    "CATEGORY 2 — SOLAR / INVERTER BATTERY INVENTORY",
    "CATEGORY 3 — ESS / INDUSTRIAL BATTERY INVENTORY",
    "CATEGORY 4 — ACCESSORIES INVENTORY"
  ],
  businessProfile: {
    companyName: "Arcenol Energy Solutions Private Limited",
    shortName: "ARCENOL",
    establishedYear: "2018",
    industrySector: "B2B Energy Storage & Power Infrastructure",
    contactEmail: "ops-admin@arcenol.com",
    phone: "+91 79 4028 9200",
    website: "www.arcenol.com",
    cin: "U31900GJ2018PTC102145",
    gstin: "24AAHCA9192M1ZP",
    address: "Arcenol Tower, Block G, GIDC Electron City, Gandhinagar, Gujarat - 382025",
    manufacturingCapacity: "12,000 MWh / Year",
    leadAcidOutput: "260,000 Metric Tons / Year",
    depotsCount: 5,
    primaryRegion: "WEST_SOUTH",
    complianceOfficer: "Dr. Ananya Sharma, Ph.D.",
    nodePassphrase: "ARC-NODE-SECURE",
    logo: ""
  },
  warrantyChecks: [
    { id: "wc-1", serial: "AESPL  EV  28G26000001", date: new Date(Date.now() - 1*24*60*60*1000).toLocaleDateString(), status: "ACTIVE WARRANTY", durationRemaining: "24 months left", foundInDb: true, model: "E-Rickshaw Batteries" },
    { id: "wc-2", serial: "AESPL  EV  28G26000002", date: new Date(Date.now() - 3*24*60*60*1000).toLocaleDateString(), status: "ACTIVE WARRANTY", durationRemaining: "24 months left", foundInDb: true, model: "E-Rickshaw Batteries" },
    { id: "wc-3", serial: "ARC-UNKNOWN-X9", date: new Date(Date.now() - 4*24*60*60*1000).toLocaleDateString(), status: "NOT_FOUND / EXPIRED", durationRemaining: "N/A", foundInDb: false, model: "Unknown Blueprints" }
  ],
  loyaltyClaims: [
    { id: "cl-1", rewardName: "Extended 6m Warranty Certificate", customer: "Aditya Sharma", pointsSpent: 500, couponCode: "ARC-REWARD-EXT6M", date: new Date(Date.now() - 12*60*60*1000).toLocaleDateString(), status: "APPROVED" },
    { id: "cl-2", rewardName: "Complementary Annual Health Audit", customer: "Aditya Sharma", pointsSpent: 800, couponCode: "ARC-REWARD-AUDIT1", date: new Date(Date.now() - 2*24*60*60*1000).toLocaleDateString(), status: "PENDING" }
  ],
  diagnosticLogs: [
    { id: 'LOG-C1006-1', nodeId: 'C-1006', serial: 'OLD-GEN-BATT-9900', timestamp: '2024-05-08 11:00:00', stage: 'REGISTERED', rootCause: 'Water Damage', notes: 'Ticket registered. Old gen battery unit received with moisture exposure.', engineer: 'Ramesh K.' },
    { id: 'LOG-C1006-2', nodeId: 'C-1006', serial: 'OLD-GEN-BATT-9900', timestamp: '2024-05-11 14:20:00', stage: 'CLOSED', rootCause: 'Water Damage', notes: 'Enclosure seal replaced, circuitry dried and stress-tested. Case resolved.', engineer: 'Ramesh K.' },
    { id: 'LOG-C1001-1', nodeId: 'C-1001', serial: 'AESPL  EV  28G26000001', timestamp: '2024-05-10 09:15:00', stage: 'UNDER_INSPECTION', rootCause: 'BMS Failure', notes: 'Initial inspection. Low battery range reported by client.', engineer: 'Suresh P.' },
    { id: 'LOG-C1001-2', nodeId: 'C-1001', serial: 'AESPL  EV  28G26000001', timestamp: '2024-05-14 16:45:00', stage: 'CLOSED', rootCause: 'BMS Failure', notes: 'BMS firmware updated and recalibrated. Performance verified.', engineer: 'Suresh P.' },
    { id: 'LOG-C1002-1', nodeId: 'C-1002', serial: 'AESPL  EV  28G26000002', timestamp: '2024-05-15 10:30:00', stage: 'REGISTERED', rootCause: 'Dead on Arrival', notes: 'Unit received at service depot. Awaiting technician assignment.', engineer: 'Unassigned' },
    { id: 'LOG-C1004-1', nodeId: 'C-1004', serial: 'AESPL  AUTO  28G26000001', timestamp: '2026-06-16 14:32:00', stage: 'UNDER_INSPECTION', rootCause: 'Cell Failure', notes: 'Initial scrutiny. Detected swelling on anode module layer.', engineer: 'Suresh P.' },
    { id: 'LOG-C1004-2', nodeId: 'C-1004', serial: 'AESPL  AUTO  28G26000001', timestamp: '2026-06-17 09:12:15', stage: 'READY_FOR_DISPATCH', rootCause: 'Cell Failure', notes: 'Aging cells. Replaced cell pack layer and confirmed capacity safety margins.', engineer: 'Suresh P.' },
    { id: 'LOG-C1005-1', nodeId: 'C-1005', serial: 'AESPL  INV  28G26000001', timestamp: '2026-06-16 11:20:44', stage: 'REPAIR_STARTED', rootCause: 'BMS Failure', notes: 'Thermal compound degradation causing heat build up. Fan controller bypassed.', engineer: 'Anita D.' },
    { id: 'LOG-C1003-1', nodeId: 'C-1003', serial: 'AESPL  EV  28G26000003', timestamp: '2026-06-17 08:30:10', stage: 'UNDER_INSPECTION', rootCause: 'Voltage Drop', notes: 'Resistance balancing audit underway.', engineer: 'Ramesh K.' }
  ],
  vyaparRecords: [
    { id: 'PAY-1001', type: 'Payment-In', partyId: 'l1', partyName: 'Green Motors Ahmedabad', date: '2026-06-08', amount: 120000, mode: 'UPI', status: 'PAID', remarks: 'Voucher payment for battery order' },
    { id: 'EXP-1001', type: 'Expense', partyId: 'external', partyName: 'Torrent Power Ltd', date: '2026-06-05', amount: 14500, mode: 'Bank', status: 'PAID', category: 'Electricity & Utility', remarks: 'Factory direct main connection line' },
    { id: 'PUR-1001', type: 'Purchase', partyId: 'vendor-1', partyName: 'Lead-Tech Electrodes Ltd', date: '2026-06-03', amount: 320000, mode: 'Bank', status: 'PAID', category: 'Raw Components', remarks: 'Lead plates grid supply block' },
    { id: 'EXP-1002', type: 'Expense', partyId: 'external', partyName: 'Universal Express Freight', date: '2026-06-02', amount: 8500, mode: 'Cash', status: 'PAID', category: 'Logistics/Freight', remarks: 'Express shipping to Nagpur logistics depot' }
  ],
  subsidiaries: [
    {
      id: 'SUB-1',
      name: 'Arcenol Energy Solutions Pvt Ltd (Gandhinagar HQ)',
      shortName: 'ARCENOL',
      type: 'Headquarters & Primary Production',
      gstin: '24AAHCA9192M1ZP',
      cin: 'U31900GJ2018PTC102145',
      contactEmail: 'ops-admin@arcenol.com',
      phone: '+91 79 4028 9200',
      website: 'www.arcenol.com',
      address: 'Arcenol Tower, Block G, GIDC Electron City, Gandhinagar, Gujarat - 382025',
      capacity: '12,000 MWh / Year',
      manager: 'Dr. Ananya Sharma, Ph.D.',
      status: 'ACTIVE'
    },
    {
      id: 'SUB-2',
      name: 'Arcenol Power Storage Systems (Nagpur Hub)',
      shortName: 'ARC-NAG',
      type: 'Regional Logistics & Depot',
      gstin: '27AAHCA9192M1ZR',
      cin: 'U31900GJ2018PTC102146',
      contactEmail: 'nagpur-depot@arcenol.com',
      phone: '+91 71 2289 1234',
      website: 'www.arcenol.com',
      address: 'Mihan SEZ, Nagpur, Maharashtra - 440025',
      capacity: '8,000 MWh / Year',
      manager: 'Shekhar Rao, M.Tech',
      status: 'ACTIVE'
    },
    {
      id: 'SUB-3',
      name: 'Arcenol Graphene R&D Division (Bengaluru)',
      shortName: 'ARC-TECH',
      type: 'Research & Testing Lab',
      gstin: '29AAHCA9192M1ZT',
      cin: 'U31900GJ2018PTC102147',
      contactEmail: 'tech-hub@arcenol.com',
      phone: '+91 80 4912 0088',
      website: 'www.arcenol.com',
      address: 'Whitefield Industrial Area, Bengaluru, Karnataka - 560066',
      capacity: '2,500 MWh / Year',
      manager: 'Dr. Devendra Gowda',
      status: 'ACTIVE'
    },
    {
      id: 'SUB-4',
      name: 'Arcenol Battery Recycling Node (Chennai)',
      shortName: 'ARC-RECYC',
      type: 'Compliance & Reclamation Unit',
      gstin: '33AAHCA9192M1ZS',
      cin: 'U31900GJ2018PTC102148',
      contactEmail: 'recycling-chennai@arcenol.com',
      phone: '+91 44 2715 9011',
      website: 'www.arcenol.com',
      address: 'SIPCOT Industrial Park, Sriperumbudur, Chennai, Tamil Nadu - 602105',
      capacity: '4,000 MWh / Year',
      manager: 'K. Ramanujam',
      status: 'AUDITING'
    }
  ],
  whLayoutConfig: { racks: 6, slots: 8 },
  users: [
    { id: 'usr-sap-001', name: 'Aravind Swamy', role: 'SUPER_ADMIN', department: 'Superordinate Operations', email: 'admin@arcenol.com', password: 'admin123' },
    { id: 'usr-admin-002', name: 'Rohan Sharma', role: 'ADMIN', department: 'Central Operations', email: 'ops@arcenol.com', password: 'password123' },
    { id: 'usr-sk-003', name: 'Baldev Singh', role: 'STORE_KEEPER', department: 'Material Logistics', email: 'store@arcenol.com', password: 'password123' },
    { id: 'usr-prod-004', name: 'Vikram Patel', role: 'PRODUCTION_TEAM', department: 'Manufacturing', email: 'production@arcenol.com', password: 'password123' },
    { id: 'usr-qc-005', name: 'Anjali Verma', role: 'QUALITY_TEAM', department: 'Quality Control', email: 'quality@arcenol.com', password: 'password123' },
    { id: 'usr-crm-006', name: 'Suresh Raina', role: 'SALES_PERSON', department: 'CRM / Sales Team', email: 'sales@arcenol.com', password: 'password123' },
    { id: 'usr-biller-007', name: 'Nisha Gupta', role: 'BILLER', department: 'Finance Hub', email: 'finance@arcenol.com', password: 'password123' },
    { id: 'usr-warm-008', name: 'Deepak Chawla', role: 'WARRANTY_TEAM', department: 'Warranty Claims', email: 'warranty@arcenol.com', password: 'password123' },
    { id: 'usr-rma-009', name: 'Harpreet Singh', role: 'SERVICE_TEAM', department: 'RMA Center', email: 'service@arcenol.com', password: 'password123' },
    { id: 'usr-pse-010', name: 'Amit Trivedi', role: 'PLANT_SERVICE_ENGINEER', department: 'Plant Support', email: 'plant@arcenol.com', password: 'password123' }
  ]
};

function getLocalDB() {
  if (typeof window === 'undefined') return INITIAL_DB;
  const stored = localStorage.getItem('arcenol_db_clean');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.wipStages) {
        parsed.wipStages = ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"];
      }
      if (!Array.isArray(parsed.stockAudits)) parsed.stockAudits = [];
      if (!Array.isArray(parsed.gateEntries)) parsed.gateEntries = [];
      if (!Array.isArray(parsed.warehouseTransfers)) parsed.warehouseTransfers = [];
      if (!Array.isArray(parsed.purchaseOrders)) parsed.purchaseOrders = [];
      if (Array.isArray(parsed.finishedGoods)) {
        parsed.finishedGoods = ensureIndependentProductSerials(parsed.finishedGoods);
      }
      return parsed;
    } catch (e) {
      console.error("Error reading arcenol_db_clean from localstorage, resetting:", e);
    }
  }
  localStorage.setItem('arcenol_db_clean', JSON.stringify(INITIAL_DB));
  return INITIAL_DB;
}

const syncBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('arcenol_sync_channel') : null;

function saveLocalDB(db: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('arcenol_db_clean', JSON.stringify(db));
  if (syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'ERP_DATA_UPDATED', timestamp: Date.now() });
    } catch (e) {
      // Ignore broadcast channel errors
    }
  }
}

async function handleMockRequest(urlStr: string, init?: RequestInit): Promise<Response> {
  const db = getLocalDB();
  const options = init || {};
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : null;

  let responseData: any = { success: true };
  let status = 200;

  try {
    if (urlStr.includes('/api/data')) {
      await hydrateDbFromSupabase(db);
      saveLocalDB(db);
      responseData = db;
    } else if (urlStr.includes('/api/business-profile')) {
      if (method === 'GET') {
        if (!db.businessProfile?.logo) {
          await hydrateDbFromSupabase(db);
        }
        responseData = db.businessProfile;
      } else {
        db.businessProfile = { ...db.businessProfile, ...body };
        saveLocalDB(db);
        syncBusinessProfileToSupabase(db.businessProfile).catch(err => console.warn('Supabase profile sync warning:', err));
        responseData = db.businessProfile;
      }
    } else if (urlStr.includes('/api/notifications/clear')) {
      db.notifications = db.notifications.map((n: any) => ({ ...n, status: 'READ' }));
      saveLocalDB(db);
    } else if (urlStr.includes('/api/leads/convert/')) {
      const id = urlStr.split('/api/leads/convert/')[1];
      const lead = db.leads.find((l: any) => l.id === id);
      if (lead) {
        lead.status = 'CONVERTED';
        const dealerId = `D-${Date.now()}`;
        const newDealer = {
          id: dealerId,
          company: lead.company,
          category: 'Tier 1 Dealer',
          gstin: '24GSTIN' + Math.floor(100000 + Math.random() * 900000) + 'A1Z5',
          phone: lead.phone,
          email: `${(lead.contactPerson || 'partner').toLowerCase().replace(/\s+/g, '')}@${(lead.company || 'dealer').toLowerCase().replace(/[^a-z]/g, '')}.com`,
          location: lead.location,
          city: lead.location?.split(',')[0] || lead.location || 'Headquarters',
          state: lead.location?.split(',')[1]?.trim() || 'Gujarat',
          region: 'West',
          contactPerson: lead.contactPerson,
          status: 'ACTIVE',
          bankDetails: 'N/A',
          rankingScore: 80,
          joinDate: new Date().toISOString().split('T')[0]
        };
        db.dealers.push(newDealer);
        saveLocalDB(db);
        syncLeadRecordToSupabase(lead);
        responseData = { success: true, dealer: newDealer };
      }
    } else if (urlStr.includes('/api/leads/')) {
      const id = urlStr.split('/api/leads/')[1];
      if (method === 'DELETE') {
        db.leads = db.leads.filter((l: any) => l.id !== id);
        deleteLeadRecordFromSupabase(id);
        responseData = { success: true };
      } else if ((method === 'PUT' || method === 'POST') && body) {
        let updatedLead: any = null;
        db.leads = db.leads.map((l: any) => {
          if (l.id === id) {
            updatedLead = { ...l, ...body, status: body.status || l.status || 'NEW' };
            return updatedLead;
          }
          return l;
        });
        if (updatedLead) {
          syncLeadRecordToSupabase(updatedLead);
          responseData = updatedLead;
        } else {
          responseData = { error: 'NOT_FOUND' };
        }
      }
      saveLocalDB(db);
    } else if (urlStr.includes('/api/leads')) {
      if (method === 'POST' && body) {
        const newLead = {
          id: body.id || `lead-${Date.now()}`,
          company: body.company || 'Unnamed Lead',
          category: body.category || 'Dealer',
          leadSource: body.leadSource || body.source || 'Website',
          source: body.leadSource || body.source || 'Website',
          contactPerson: body.contactPerson || '',
          phone: body.phone || '',
          location: body.location || '',
          followUpDate: body.followUpDate || new Date().toISOString().split('T')[0],
          followUpTime: body.followUpTime || '10:00',
          requirement: body.requirement || '',
          notes: body.notes || '',
          status: body.status || 'NEW',
          remarksLog: body.remarksLog || []
        };
        db.leads.push(newLead);
        saveLocalDB(db);
        syncLeadRecordToSupabase(newLead);
        responseData = newLead;
      }
    } else if (urlStr.includes('/api/dealers/')) {
      const id = urlStr.split('/api/dealers/')[1];
      if (method === 'DELETE') {
        db.dealers = db.dealers.filter((d: any) => d.id !== id);
      } else if (method === 'PUT' && body) {
        db.dealers = db.dealers.map((d: any) => d.id === id ? { ...d, ...body } : d);
      }
      saveLocalDB(db);
    } else if (urlStr.includes('/api/dealers')) {
      if (method === 'POST' && body) {
        const newDealer = { 
          company: body.company || body.name || 'New Customer',
          name: body.company || body.name || 'New Customer',
          category: body.category || 'Tier 1 Dealer',
          gstin: body.gstin || 'N/A',
          phone: body.phone || 'N/A',
          email: body.email || 'N/A',
          location: body.location || body.address || 'N/A',
          city: body.city || 'N/A',
          state: body.state || 'N/A',
          region: body.region || 'West',
          contactPerson: body.contactPerson || 'N/A',
          status: 'ACTIVE',
          ...body, 
          id: body.id || `D-${Date.now()}`,
          rankingScore: 75,
          joinDate: new Date().toISOString().split('T')[0]
        };
        db.dealers = [newDealer, ...(db.dealers || []).filter((d: any) => String(d.id) !== String(newDealer.id))];
        db.customers = [newDealer, ...(db.customers || []).filter((c: any) => String(c.id) !== String(newDealer.id))];
        saveLocalDB(db);
        responseData = newDealer;
      }
    } else if (urlStr.includes('/api/invoices')) {
      if (method === 'POST' && body) {
        const calculatedTotal = (body.items || []).reduce((acc: number, item: any) => acc + (Number(item.qty || 1) * Number(item.price || 35000)), 0);
        const finalTotal = Number(body.total) || (calculatedTotal * 1.18);
        const invId = body.id || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
        const party = (db.dealers || []).find((d: any) => String(d.id) === String(body.dealerId)) || (db.customers || []).find((c: any) => String(c.id) === String(body.dealerId));
        const partyName = body.partyName || party?.company || party?.name || 'Walk-In Customer';
        
        const newInvoice = {
          id: invId,
          voucher_no: invId,
          date: new Date().toISOString().split('T')[0],
          dealerId: String(body.dealerId || 'cust-001'),
          customerId: String(body.dealerId || 'cust-001'),
          partyName,
          customerName: partyName,
          items: body.items || [],
          goods: body.items || [],
          total: finalTotal,
          grandTotal: finalTotal,
          grand_total: finalTotal,
          subtotal: Math.max(0, finalTotal - (Number(body.tax) || Math.round(finalTotal * 0.18))),
          status: body.status || (body.paymentMode === 'Credit' ? 'UNPAID' : 'PAID'),
          tax: Number(body.tax) || Math.round(finalTotal * 0.18),
          gst: Number(body.tax) || Math.round(finalTotal * 0.18),
          paymentMode: body.paymentMode || 'Credit',
          billerSignature: body.biller || 'Finance Executive'
        };
        db.invoices = [newInvoice, ...(db.invoices || []).filter((inv: any) => String(inv.id) !== String(invId))];

        // Update stock and activate warranty
        if (body.items && Array.isArray(body.items)) {
          body.items.forEach((item: any) => {
            if (item.serials && Array.isArray(item.serials)) {
              item.serials.forEach((serial: string) => {
                const fg = db.finishedGoods?.find((f: any) => f.serial === serial);
                if (fg) fg.status = 'SOLD';

                if (!db.warranty) db.warranty = [];
                db.warranty.push({
                  id: `W-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  serial,
                  dealerId: body.dealerId,
                  startDate: newInvoice.date,
                  durationMonths: 36,
                  status: 'ACTIVE',
                  history: []
                });
              });
            }
          });
        }

        saveLocalDB(db);
        responseData = newInvoice;
      }
    } else if (urlStr.includes('/api/inventory/bulk')) {
      if (method === 'POST' && body) {
        const { items } = body;
        const added: any[] = [];
        if (items && Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = String(item.name || "").trim();
            if (!name) return;
            const code = String(item.code || "").trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
            const safeId = "RM-" + name.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 15) + "-" + Math.floor(Math.random() * 100000);
            const newItem = {
              id: safeId,
              name,
              code,
              category: item.category || "Cells",
              supplier: item.supplier || "Generic Supplier",
              batch: item.batch || "BATCH-01",
              qty: Number(item.qty || 0),
              status: item.status || "ACTIVE",
              reservedQty: 0,
              minStock: Number(item.minStock || 100),
              reorderLevel: Number(item.reorderLevel || 250),
              warehouse: item.warehouse || "Raw Hub",
              rack: item.rack || "A-1",
              grn: item.grn || `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
              date: item.date || new Date().toISOString().split('T')[0],
              price: Number(item.price || 0),
              unit: item.unit || "Pcs",
              qcStatus: item.qcStatus || "APPROVED"
            };
            db.inventory.push(newItem);
            added.push(newItem);
          });
        }
        if (added.length > 0) {
          if (!db.notifications) db.notifications = [];
          db.notifications.push({
            id: `rm-bulk-notif-${Date.now()}`,
            type: "ENGAGEMENT",
            title: `Bulk Imported ${added.length} Raw Materials`,
            message: `Successfully registered ${added.length} old/historic raw material records into inventory ledger.`,
            date: new Date().toISOString(),
            status: "UNREAD",
            channel: "SYSTEM"
          });
          syncBulkInventoryToSupabase(added);
        }
        saveLocalDB(db);
        responseData = { addedCount: added.length, items: added };
      }
    } else if (urlStr.includes('/api/inventory/bulk-reorder')) {
      if (method === 'POST' && body) {
        const { orders, raisedByRole, isStoreKeeperRaised } = body;
        let updatedCount = 0;
        const isSk = raisedByRole === 'STORE_KEEPER' || isStoreKeeperRaised !== false;
        if (!db.purchaseOrders) db.purchaseOrders = [];

        if (orders && Array.isArray(orders)) {
          orders.forEach((ord: any, idx: number) => {
            const item = db.inventory.find((i: any) => i.id === ord.id);
            const qtyToReorder = Number(ord.reorderQty || 10);
            if (isSk) {
              const poId = `PO-SK-${Date.now()}-${idx + 1}`;
              const newPO = {
                id: poId,
                materialId: ord.id,
                materialName: item?.name || ord.name || "Raw Material Component",
                category: item?.category || "RAW_MATERIAL",
                vendor: item?.supplier || "Awaiting Admin Supplier Assignment",
                vendorContact: "+91 98765 00000",
                qty: qtyToReorder,
                unit: item?.unit || "Pcs",
                unitCost: Number(item?.price || 100),
                totalAmount: qtyToReorder * Number(item?.price || 100),
                orderDate: new Date().toISOString().split('T')[0],
                estimatedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                status: "Pending Admin Approval",
                raisedByRole: "STORE_KEEPER",
                isStoreKeeperRaised: true,
                trackingNumber: `TRK-SK-${Math.floor(1000 + Math.random() * 9000)}`,
                remarks: "Low Stock Reorder Request raised by Store Keeper - Awaiting Admin Order"
              };
              db.purchaseOrders.unshift(newPO);
              updatedCount++;
            } else if (item) {
              item.qty += qtyToReorder;
              updatedCount++;
            }
          });
        }
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift({
          id: `n-${Date.now()}`,
          type: "BULK_REORDER",
          title: isSk ? "Low Stock PO Requests Submitted to Admin" : "Bulk Reorder Dispatched",
          message: isSk 
            ? `Store Keeper raised low stock PO requests for ${updatedCount} materials. Pending Admin supplier order placement.`
            : `Authorized replenishment of ${updatedCount} low-stock material nodes. Raw ledger balances adjusted.`,
          date: new Date().toISOString(),
          status: "UNREAD",
          channel: "SYSTEM"
        });
        saveLocalDB(db);
        responseData = { success: true, updatedItemsCount: updatedCount, isStoreKeeperRaised: isSk };
      }
    } else if (urlStr.includes('/api/inventory/gate-entries')) {
      if (!db.gateEntries) db.gateEntries = [];
      if (method === 'GET') {
        responseData = db.gateEntries;
      } else if (method === 'POST') {
        const entry = body || {};
        const gross = Number(entry.grossWeight || 0);
        const tare = Number(entry.tareWeight || 0);
        const net = gross > tare ? gross - tare : Number(entry.netWeight || 0);
        const baseAmt = Number(entry.baseAmount || 0);
        const cgst = Number(entry.cgstPct || 0);
        const sgst = Number(entry.sgstPct || 0);
        const igst = Number(entry.igstPct || 0);
        const taxAmt = entry.taxType === 'IGST' 
          ? baseAmt * (igst / 100) 
          : baseAmt * ((cgst + sgst) / 100);
        const totalVal = baseAmt + taxAmt;

        const newGateEntry = {
          id: `GATE-2026-${Math.floor(100 + Math.random() * 900)}`,
          gatePassNo: entry.gatePassNo || `GP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          poNumber: entry.poNumber || "DIRECT-GATE-INWARD",
          supplier: entry.supplier || "Vendor Inward",
          materialName: entry.materialName || "Raw Inward Lot",
          challanNo: entry.challanNo || "CH-PENDING",
          invoiceNo: entry.invoiceNo || "INV-PENDING",
          vehicleNo: entry.vehicleNo || "N/A",
          driverName: entry.driverName || "Driver Unspecified",
          driverLicense: entry.driverLicense || "N/A",
          grossWeight: gross,
          tareWeight: tare,
          netWeight: net,
          weighbridgeSlipNo: entry.weighbridgeSlipNo || "WB-PENDING",
          weighbridgeSlipImg: entry.weighbridgeSlipImg || null,
          mtcCertificateNo: entry.mtcCertificateNo || "MTC-PENDING",
          mtcAttachment: entry.mtcAttachment || null,
          baseAmount: baseAmt,
          taxType: entry.taxType || "CGST_SGST",
          cgstPct: cgst,
          sgstPct: sgst,
          igstPct: igst,
          taxAmount: taxAmt,
          totalInvoiceVal: totalVal,
          status: entry.status || "QC_PENDING",
          entryTimestamp: new Date().toLocaleString(),
          receivedBy: entry.receivedBy || "Store Keeper"
        };
        db.gateEntries.unshift(newGateEntry);
        saveLocalDB(db);
        responseData = { success: true, gateEntry: newGateEntry };
      } else if (method === 'PATCH') {
        const id = urlStr.split('/api/inventory/gate-entries/')[1]?.split('/')[0];
        const gate = db.gateEntries.find((g: any) => g.id === id);
        if (gate) {
          if (body?.status) gate.status = body.status;
          if (body?.remarks) gate.remarks = body.remarks;
          saveLocalDB(db);
          responseData = { success: true, gateEntry: gate };
        } else {
          status = 404;
          responseData = { error: "Gate Entry not found" };
        }
      }
    } else if (urlStr.includes('/api/inventory/stock-audits')) {
      if (!db.stockAudits) db.stockAudits = [];
      if (method === 'GET') {
        responseData = db.stockAudits;
      } else if (method === 'POST') {
        const auditData = body || {};
        const newAudit = {
          id: `AUDIT-2026-${Math.floor(100 + Math.random() * 900)}`,
          auditDate: auditData.auditDate || new Date().toISOString().split('T')[0],
          warehouse: auditData.warehouse || "Raw Hub",
          auditorName: auditData.auditorName || "Store Auditor",
          auditorRole: auditData.auditorRole || "Inventory Auditor",
          auditorSignature: auditData.auditorSignature || `${auditData.auditorName || "Auditor"} (Verified)`,
          status: "PENDING_ADMIN_APPROVAL",
          items: (auditData.items || []).map((it: any) => {
            const sys = Number(it.systemQty || 0);
            const cnt = Number(it.countedQty || 0);
            const vari = cnt - sys;
            const pr = Number(it.price || 100);
            return {
              itemId: it.itemId,
              name: it.name,
              unit: it.unit || 'Pcs',
              price: pr,
              systemQty: sys,
              countedQty: cnt,
              variance: vari,
              varianceValue: vari * pr,
              reason: it.reason || (vari === 0 ? "Exact Match" : "Stock Count Variance")
            };
          })
        };
        db.stockAudits.unshift(newAudit);
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift({
          id: `n-${Date.now()}`,
          type: "STOCK_AUDIT",
          title: `Stock Audit ${newAudit.id} Submitted for Admin Approval`,
          message: `Auditor ${newAudit.auditorName} logged physical stock audit for ${newAudit.warehouse}. Awaiting Admin ledger adjustment.`,
          date: new Date().toISOString(),
          status: "UNREAD",
          channel: "SYSTEM"
        });
        saveLocalDB(db);
        responseData = { success: true, audit: newAudit };
      } else if (method === 'PATCH') {
        const parts = urlStr.split('/api/inventory/stock-audits/')[1]?.split('/');
        const id = parts ? parts[0] : '';
        const audit = db.stockAudits.find((a: any) => a.id === id);
        if (!audit) {
          status = 404;
          responseData = { error: "Stock audit record not found" };
        } else {
          const { action, adminNotes } = body || {};
          if (action === 'REJECT') {
            audit.status = 'REJECTED';
            audit.adminNotes = adminNotes || 'Rejected by Admin';
          } else {
            audit.status = 'APPROVED_&_ADJUSTED';
            audit.adminNotes = adminNotes || 'Approved by Admin & Ledger Auto-Adjusted';
            audit.approvedAt = new Date().toLocaleString();
            if (Array.isArray(audit.items)) {
              audit.items.forEach((it: any) => {
                const invItem = db.inventory.find((i: any) => i.id === it.itemId);
                if (invItem) {
                  invItem.qty = Number(it.countedQty);
                }
              });
            }
          }
          saveLocalDB(db);
          responseData = { success: true, audit };
        }
      }
    } else if (urlStr.includes('/api/inventory/transfers')) {
      if (!db.warehouseTransfers) db.warehouseTransfers = [];
      if (method === 'GET') {
        responseData = db.warehouseTransfers;
      } else if (method === 'POST') {
        const trn = body || {};
        const newTransfer = {
          id: `TRN-2026-${Math.floor(100 + Math.random() * 900)}`,
          transferDate: trn.transferDate || new Date().toISOString().split('T')[0],
          sourceWarehouse: trn.sourceWarehouse || "Raw Hub",
          destWarehouse: trn.destWarehouse || "Ahmedabad Warehouse",
          itemId: trn.itemId,
          itemName: trn.itemName || "Raw Material",
          qtyTransferred: Number(trn.qtyTransferred || 0),
          unit: trn.unit || "Pcs",
          transporterName: trn.transporterName || "Internal Logistics",
          driverPhone: trn.driverPhone || "+91 98765 00000",
          vehicleRegNo: trn.vehicleRegNo || "GJ-01-XX-0000",
          eWayBillNo: trn.eWayBillNo || "EWB-PENDING",
          sealNumber: trn.sealNumber || `SEAL-${Math.floor(100000 + Math.random() * 900000)}`,
          status: "DISPATCHED_IN_TRANSIT",
          dispatchedBy: trn.dispatchedBy || "Store Keeper"
        };
        db.warehouseTransfers.unshift(newTransfer);
        saveLocalDB(db);
        responseData = { success: true, transfer: newTransfer };
      } else if (method === 'PATCH') {
        const id = urlStr.split('/api/inventory/transfers/')[1]?.split('/')[0];
        const trn = db.warehouseTransfers.find((t: any) => t.id === id);
        if (trn) {
          if (body?.status) trn.status = body.status;
          if (body?.receivedNotes) trn.receivedNotes = body.receivedNotes;
          saveLocalDB(db);
          responseData = { success: true, transfer: trn };
        } else {
          status = 404;
          responseData = { error: "Transfer record not found" };
        }
      }
    } else if (urlStr.includes('/api/inventory/')) {
      const id = urlStr.split('/api/inventory/')[1];
      if (method === 'DELETE') {
        const index = db.inventory.findIndex((i: any) => i.id === id);
        if (index !== -1) {
          db.inventory.splice(index, 1);
          saveLocalDB(db);
          deleteInventoryRecordFromSupabase(id);
          responseData = { success: true };
        } else {
          responseData = { error: "NOT_FOUND" };
        }
      }
    } else if (urlStr.includes('/api/inventory')) {
      if ((method === 'POST' || method === 'PUT') && body) {
        const { existingItemId, name, code, category, supplier, batch, qty, minStock, reorderLevel, warehouse, rack, grn, price, unit, qcStatus, status, setExactQty } = body;
        let item: any;
        if (existingItemId) {
          item = db.inventory.find((i: any) => i.id === existingItemId);
          if (item) {
            if (setExactQty) {
              item.qty = Number(qty || 0);
            } else {
              item.qty += Number(qty || 0);
            }
            if (name) item.name = name;
            if (code) item.code = code;
            if (category) item.category = category;
            if (supplier) item.supplier = supplier;
            if (batch) item.batch = batch;
            if (grn) item.grn = grn;
            if (typeof price !== 'undefined') item.price = Number(price);
            if (warehouse) item.warehouse = warehouse;
            if (rack) item.rack = rack;
            if (qcStatus) item.qcStatus = qcStatus;
            if (status) item.status = status;
            if (unit) item.unit = unit;
            if (typeof minStock !== 'undefined' && minStock !== null) item.minStock = Number(minStock);
            if (typeof reorderLevel !== 'undefined' && reorderLevel !== null) item.reorderLevel = Number(reorderLevel);
          }
        } else {
          const safeId = "RM-" + (name || Date.now().toString()).toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 15);
          item = {
            id: safeId,
            name,
            code: code || `CD-${Math.floor(100 + Math.random() * 900)}`,
            category: category || "RAW_MATERIAL",
            supplier: supplier || "Generic Supplier",
            batch: batch || `B-${Math.floor(100 + Math.random() * 900)}`,
            qty: Number(qty || 0),
            reservedQty: 0,
            minStock: Number(minStock || 100),
            reorderLevel: Number(reorderLevel || 250),
            warehouse: warehouse || "Raw Hub",
            rack: rack || "A1",
            grn: grn || `GRN-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString().split('T')[0],
            price: Number(price || 0),
            unit: unit || "Kg",
            qcStatus: "APPROVED"
          };
          db.inventory.push(item);
        }

        if (item && item.qty < item.minStock) {
          db.notifications.push({
            id: `n-${Date.now()}`,
            type: "LOW_STOCK",
            title: `Low Stock Alert: ${item?.name}`,
            message: `Current inventory level for ${item?.name} is ${item?.qty}. Need reorder.`,
            date: new Date().toISOString(),
            status: "UNREAD",
            channel: "SYSTEM"
          });
        }

        saveLocalDB(db);
        if (item) syncInventoryRecordToSupabase(item);
        responseData = item || { error: "NOT_FOUND" };
      }
    } else if (urlStr.includes('/api/complaints/')) {
      const id = urlStr.split('/api/complaints/')[1];
      if (method === 'PUT' && body) {
        db.complaints = db.complaints.map((c: any) => c.id === id ? { ...c, ...body } : c);
        saveLocalDB(db);
      }
    } else if (urlStr.includes('/api/complaints')) {
      if (method === 'POST' && body) {
        const newComplaint = {
          ...body,
          id: `C-${Math.floor(1001 + Math.random() * 8999)}`,
          status: 'OPEN',
          stage: 'REGISTERED',
          date: new Date().toISOString().split('T')[0],
          resolvedDate: '',
          engineer: 'Unassigned'
        };
        db.complaints.push(newComplaint);
        
        // Update matching warranty history
        if (body.serial) {
          const wArr = db.warranty || [];
          const wMatch = wArr.find((w: any) => w.serial === body.serial);
          if (wMatch) {
            if (!wMatch.history) wMatch.history = [];
            wMatch.history.push({
              date: newComplaint.date,
              type: "CLAIM_FILED",
              description: `${newComplaint.type || 'Service Claim'}: ${newComplaint.notes || 'Submitted via portal'}`
            });
          }
        }

        saveLocalDB(db);
        responseData = newComplaint;
      }
    } else if (urlStr.includes('/api/production/wip/stages')) {
      if (method === 'GET') {
        responseData = db.wipStages || ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"];
      } else if (method === 'POST' && body) {
        const { stage } = body;
        if (stage) {
          const normalStage = String(stage).toUpperCase().trim().replace(/\s+/g, '_');
          if (!db.wipStages) {
            db.wipStages = ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"];
          }
          if (!db.wipStages.includes(normalStage)) {
            db.wipStages.push(normalStage);
            saveLocalDB(db);
          }
          responseData = { success: true, stage: normalStage, stages: db.wipStages };
        }
      }
    } else if (urlStr.includes('/api/production/wip/update-stage')) {
      if (method === 'POST' && body) {
        const { wipId, stage } = body;
        const wipItem = db.wipInventory?.find((w: any) => w.id === wipId);
        if (wipItem) {
          wipItem.stage = stage;
          wipItem.lastUpdate = new Date().toISOString().split('T')[0];
          saveLocalDB(db);
          responseData = wipItem;
        } else {
          status = 404;
          responseData = { error: "NOT_FOUND", message: "WIP Process item not found" };
        }
      }
    } else if (urlStr.includes('/api/production/wip/start')) {
      if (method === 'POST' && body) {
        const { planId, name, qty, components, stage } = body;
        if (planId) {
          const plan = db.productionPlans.find((p: any) => p.id === planId);
          if (plan) {
            plan.status = 'STARTED';
            saveLocalDB(db);
            responseData = plan;
          }
        } else {
          // Deduct ingredients from raw inventory count safely 
          if (components && Array.isArray(components)) {
            components.forEach((comp: any) => {
              const invItem = db.inventory.find((i: any) => i.id === comp.matId);
              if (invItem) {
                invItem.qty = Math.max(0, invItem.qty - (comp.qty || 0));
              }
            });
          }
          const defaultStage = stage || (db.wipStages && db.wipStages[0]) || "WELDING";
          const newWip = {
            id: `wip-${Math.floor(100 + Math.random() * 899 + 100)}`,
            name: name || "Cell Pack Assembly",
            type: "Semi-Finished",
            qty: Number(qty) || 1,
            stage: defaultStage,
            lastUpdate: new Date().toISOString().split('T')[0],
            components: components || []
          };
          if (!db.wipInventory) {
            db.wipInventory = [];
          }
          db.wipInventory.push(newWip);
          saveLocalDB(db);
          responseData = newWip;
        }
      }
    } else if (urlStr.includes('/api/production/complete')) {
      if (method === 'POST' && body) {
        const { planId, model, qty, warehouse, rack } = body;
        const targetModel = model || (planId ? db.productionPlans.find((p: any) => p.id === planId)?.modelId : 'BAT-NEXT-200') || 'BAT-NEXT-200';
        const targetQty = Number(qty) || 5;
        
        const plan = planId ? db.productionPlans.find((p: any) => p.id === planId) : null;
        if (plan && plan.status !== 'COMPLETED') {
          if (plan.allocationMode === 'RESERVE') {
            plan.materials.forEach((reqm: any) => {
              const invItem = db.inventory.find((i: any) => i.id === reqm.matId);
              if (invItem) {
                invItem.reservedQty = Math.max(0, invItem.reservedQty - reqm.total);
                invItem.qty = Math.max(0, invItem.qty - reqm.total);
              }
            });
          }
          plan.status = 'COMPLETED';
        }

        const serials: string[] = [];
        if (!db.finishedGoods) db.finishedGoods = [];
        const cleanModel = String(targetModel).replace(/[^A-Z0-9]/gi, '').slice(0, 10).toUpperCase();

        const startSeq = getNextSerialSequenceForModel(targetModel, db.finishedGoods || []);
        for (let i = 0; i < targetQty; i++) {
          const serial = generateModelSpecificSerial(targetModel, startSeq + i);
          serials.push(serial);
          db.finishedGoods.push({
            id: `fg-${Date.now()}-${i}`,
            model: targetModel,
            serial,
            batch: `BATCH-${Date.now().toString().slice(-4)}`,
            warehouse: warehouse || 'Main Warehouse',
            rack: rack || 'BIN-01',
            date: new Date().toISOString().split('T')[0],
            status: "READY"
          });
        }

        if (!db.productionHistory) db.productionHistory = [];
        db.productionHistory.unshift({
          id: `ph-${Date.now()}`,
          model: targetModel,
          qty: targetQty,
          serials,
          date: new Date().toISOString().split('T')[0],
          status: "COMPLETED"
        });

        saveLocalDB(db);
        responseData = { success: true, serials, model: targetModel, qty: targetQty };
      }
    } else if (urlStr.includes('/api/processing')) {
      if (method === 'POST' && body) {
        const { inputId, outputBatches, processingDegree } = body;
        db.processingLogs.push({
          id: `log-${Date.now()}`,
          inputId,
          outputBatches,
          processingDegree,
          timestamp: new Date().toISOString()
        });
        saveLocalDB(db);
      }
    } else if (urlStr.includes('/api/products/duplicate')) {
      if (method === 'POST' && body) {
        const { sourceId, newId, newName } = body;
        const source = db.products.find((p: any) => p.id === sourceId);
        if (source) {
          const clone = JSON.parse(JSON.stringify(source));
          clone.id = newId;
          clone.name = newName;
          db.products.push(clone);
          saveLocalDB(db);
          responseData = clone;
        }
      }
    } else if (urlStr.includes('/api/mrp/calculate')) {
      const url = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      const modelId = url.searchParams.get('modelId');
      const qty = url.searchParams.get('qty');
      const reqModelId = String(modelId || '').trim();
      let product = db.products.find((p: any) => 
        String(p.id).trim() === reqModelId || 
        String(p.model_id || '').trim() === reqModelId ||
        p.name?.toLowerCase() === reqModelId.toLowerCase()
      );
      if (!product && db.products.length > 0) {
        product = db.products[0];
      }
      if (!product) {
        status = 404;
        responseData = { error: "Product blueprint not found" };
      } else {
        const multiplier = Number(qty || 0);
        const requirements = (product.bom || []).map((item: any) => {
          const perUnit = Number(item.qty || 0) * (1 + ((Number(item.wastage || 0)) / 100));
          const total = perUnit * multiplier;
          const targetMatId = String(item.matId || item.id || '').trim();
          const targetMatName = String(item.name || item.materialName || '').trim();
          
          const invItem = db.inventory.find((i: any) => 
            String(i.id).trim() === targetMatId || 
            String(i.code).trim() === targetMatId || 
            (targetMatName && i.name?.toLowerCase() === targetMatName.toLowerCase()) ||
            (targetMatId && i.name?.toLowerCase() === targetMatId.toLowerCase())
          );
          
          const avail = invItem ? Math.max(0, Number(invItem.qty || 0) - Number(invItem.reservedQty || 0)) : 0;

          return {
            ...item,
            perUnit,
            requiredTotal: total,
            available: avail,
            deficient: Math.max(0, total - avail)
          };
        });
        responseData = { modelId: product.id, modelName: product.name, qty: multiplier, requirements };
      }
    } else if (urlStr.includes('/api/products/')) {
      const parts = urlStr.split('/api/products/');
      const id = parts[parts.length - 1];
      if (method === 'PUT' && body) {
        const index = db.products.findIndex((p: any) => p.id === id);
        if (index !== -1) {
          db.products[index] = { ...db.products[index], ...body, id };
          saveLocalDB(db);
          responseData = db.products[index];
        } else {
          status = 404;
          responseData = { error: "Product not found" };
        }
      } else if (method === 'DELETE') {
        db.products = db.products.filter((p: any) => p.id !== id);
        saveLocalDB(db);
        responseData = { success: true };
      }
    } else if (urlStr.includes('/api/products')) {
      if (method === 'POST' && body) {
        const { id, name, category, type, price, bom } = body;
        if (db.products.find((p: any) => p.id === id)) {
          status = 400;
          responseData = { error: "Product ID already exists" };
        } else {
          const newProduct = { id, name, category: category || "Uncategorized Blueprints", type: type || "Battery", price, bom: bom || [] };
          db.products.push(newProduct);
          saveLocalDB(db);
          responseData = newProduct;
        }
      }
    } else if (urlStr.includes('/api/categories/')) {
      const parts = urlStr.split('/api/categories/');
      const target = decodeURIComponent(parts[parts.length - 1] || '');
      if (method === 'DELETE') {
        if (!db.productCategories) db.productCategories = [];
        if (!db.categories) db.categories = [];

        const pIdx = db.productCategories.indexOf(target);
        if (pIdx !== -1) db.productCategories.splice(pIdx, 1);

        const cIdx = db.categories.findIndex((c: any) => (typeof c === 'object' ? c.name : String(c)) === target || (typeof c === 'object' && String(c.id) === target));
        if (cIdx !== -1) db.categories.splice(cIdx, 1);

        db.products.forEach((p: any) => {
          if (p.category === target) {
            p.category = "Uncategorized Blueprints";
          }
        });
        saveLocalDB(db);
        responseData = { success: true, categories: db.categories, productCategories: db.productCategories };
      }
    } else if (urlStr.includes('/api/subsidiaries')) {
      if (!db.subsidiaries) db.subsidiaries = [];
      const parts = urlStr.split('/api/subsidiaries');
      const subIdPath = parts[1] ? parts[1].replace(/^\//, '').split('?')[0] : '';

      if (method === 'DELETE' && subIdPath) {
        db.subsidiaries = db.subsidiaries.filter((s: any) => String(s.id) !== String(subIdPath));
        saveLocalDB(db);
        deleteClientRecord('arcenol_corporate_units', subIdPath).catch(() => {});
        responseData = { success: true };
      } else if (method === 'PUT' && subIdPath && body) {
        const idx = db.subsidiaries.findIndex((s: any) => String(s.id) === String(subIdPath));
        if (idx !== -1) {
          db.subsidiaries[idx] = { ...db.subsidiaries[idx], ...body };
        } else {
          db.subsidiaries.push({ id: subIdPath, ...body });
        }
        saveLocalDB(db);
        responseData = db.subsidiaries[idx] || { id: subIdPath, ...body };
      } else if (method === 'POST' && body) {
        if (Array.isArray(body)) {
          db.subsidiaries = body;
        } else {
          const newSub = { id: body.id || `SUB-${Date.now()}`, ...body };
          db.subsidiaries = db.subsidiaries.filter((s: any) => s.id !== newSub.id);
          db.subsidiaries.push(newSub);
        }
        saveLocalDB(db);
        responseData = { success: true, subsidiaries: db.subsidiaries };
      } else {
        responseData = db.subsidiaries;
      }
    } else if (urlStr.includes('/api/categories')) {
      if (!db.productCategories) db.productCategories = [];
      if (!db.categories) db.categories = [];

      if (method === 'POST' && body) {
        const { name, code, description } = body;
        if (!name) {
          status = 400;
          responseData = { error: "Category name is required" };
        } else {
          const catName = name.trim();
          const existsInProd = db.productCategories.includes(catName);
          const existsInCats = db.categories.some((c: any) => (typeof c === 'object' ? c.name : String(c)) === catName);

          if (existsInProd || existsInCats) {
            status = 400;
            responseData = { error: "Category already exists" };
          } else {
            db.productCategories.push(catName);
            const newCatObj = {
              id: body.id || `cat-${Date.now()}`,
              name: catName,
              code: code || `CAT-${catName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
              description: description || ''
            };
            db.categories.push(newCatObj);
            saveLocalDB(db);
            responseData = { success: true, category: newCatObj, categories: db.categories, productCategories: db.productCategories };
          }
        }
      } else if (method === 'PUT' && body) {
        const { oldName, newName, name, code, description } = body;
        const finalName = (name || newName || oldName || '').trim();
        if (!finalName) {
          status = 400;
          responseData = { error: "Category name is required" };
        } else {
          const prevName = oldName || finalName;
          const pIdx = db.productCategories.indexOf(prevName);
          if (pIdx !== -1) {
            db.productCategories[pIdx] = finalName;
          } else if (!db.productCategories.includes(finalName)) {
            db.productCategories.push(finalName);
          }

          const cIdx = db.categories.findIndex((c: any) => (typeof c === 'object' ? c.name : String(c)) === prevName);
          if (cIdx !== -1) {
            db.categories[cIdx] = {
              ...db.categories[cIdx],
              name: finalName,
              code: code || db.categories[cIdx].code,
              description: typeof description !== 'undefined' ? description : db.categories[cIdx].description
            };
          }

          db.products.forEach((p: any) => {
            if (p.category === prevName) {
              p.category = finalName;
            }
          });
          saveLocalDB(db);
          responseData = { success: true, categories: db.categories, productCategories: db.productCategories };
        }
      }
    } else if (urlStr.includes('/api/mrp/plan')) {
      if (method === 'POST' && body) {
        const { modelId, qty, mode } = body;
        const product = db.products.find((p: any) => p.id === modelId);
        if (product) {
          const multiplier = Number(qty);
          const requirements = product.bom.map((item: any) => ({
            ...item,
            total: item.qty * (1 + ((item.wastage || 0) / 100)) * multiplier
          }));

          // Deduct from inventory
          requirements.forEach((reqm: any) => {
            const invItem = db.inventory.find((i: any) => i.id === reqm.matId);
            if (invItem) {
              if (mode === 'CONSUME') {
                invItem.qty = Math.max(0, invItem.qty - reqm.total);
              } else {
                invItem.reservedQty += reqm.total;
              }
            }
          });

          const plan = {
            id: `PLAN-${Date.now()}`,
            modelId,
            modelName: product.name,
            qty: multiplier,
            status: mode === 'CONSUME' ? 'STARTED' : 'PLANNED',
            allocationMode: mode,
            materials: requirements,
            date: new Date().toISOString()
          };
          db.productionPlans.push(plan);
          saveLocalDB(db);
          responseData = plan;
        }
      }
    } else if (urlStr.includes('/api/admin/purge-records') && method === 'POST') {
      const { section, sections, targetSections, mode, beforeDate, olderThanDays, statusFilter, selectedIds, performedBy = 'Super Admin', adminRole = 'SUPER_ADMIN', notes = '' } = body || {};
      
      const SECTION_ALIASES: Record<string, string[]> = {
        vyaparRecords: ['vyaparRecords', 'vouchers'],
        vouchers: ['vyaparRecords', 'vouchers'],
        gateEntries: ['gateEntries', 'procurementEntries'],
        procurementEntries: ['gateEntries', 'procurementEntries'],
        dealers: ['dealers', 'customers'],
        customers: ['dealers', 'customers']
      };

      const SECTION_TO_SUPABASE_TABLE: Record<string, string> = {
        invoices: 'invoices',
        leads: 'lead_inquiries',
        dealers: 'customers',
        customers: 'customers',
        warehouses: 'warehouses',
        gradedInventory: 'graded_cells',
        wipInventory: 'wip_inventory',
        vouchers: 'accounting_vouchers',
        vyaparRecords: 'accounting_vouchers',
        complaints: 'complaints',
        subsidiaries: 'arcenol_corporate_units',
        categories: 'categories',
        purchaseOrders: 'purchase_orders',
        gateEntries: 'procurement_entries',
        procurementEntries: 'procurement_entries',
        stockAudits: 'stock_audits',
        warehouseTransfers: 'warehouse_transfers',
        scrapLogs: 'scrap_logs',
        eolCertificates: 'eol_certificates',
        cellGradingBatches: 'cell_grading_batches',
        inventory: 'inventory'
      };

      const rawSections = Array.isArray(targetSections) && targetSections.length > 0
        ? targetSections
        : (Array.isArray(sections) && sections.length > 0 ? sections : (section ? [section] : []));

      const expandedSectionsSet = new Set<string>();
      rawSections.forEach((s: string) => {
        expandedSectionsSet.add(s);
        if (SECTION_ALIASES[s]) {
          SECTION_ALIASES[s].forEach(aliasKey => expandedSectionsSet.add(aliasKey));
        }
      });

      const sectionsToProcess = Array.from(expandedSectionsSet);
      let totalDeleted = 0;
      let cutOffTime: number | null = null;
      if (mode === 'OLDER_THAN_DAYS' && olderThanDays !== undefined) {
        const d = new Date();
        d.setDate(d.getDate() - Number(olderThanDays));
        cutOffTime = d.getTime();
      } else if (beforeDate) {
        cutOffTime = new Date(beforeDate).getTime();
      }

      sectionsToProcess.forEach((sec: string) => {
        const arr = (db as any)[sec];
        if (Array.isArray(arr)) {
          const idsToDelete: string[] = [];
          if (mode === 'ALL') {
            totalDeleted += arr.length;
            (db as any)[sec] = [];
            const sbTable = SECTION_TO_SUPABASE_TABLE[sec];
            if (sbTable) {
              clearClientTable(sbTable).catch(() => {});
            }
          } else if (mode === 'SELECTED_IDS' && Array.isArray(selectedIds)) {
            const delSet = new Set(selectedIds.map(String));
            const kept = arr.filter((item: any) => {
              const itemId = String(item.id || item.serial || item.code || '');
              const matches = delSet.has(itemId) || delSet.has(String(item.id)) || (item.serial && delSet.has(String(item.serial))) || (item.code && delSet.has(String(item.code)));
              if (matches) idsToDelete.push(itemId || String(item.id));
              return !matches;
            });
            totalDeleted += (arr.length - kept.length);
            (db as any)[sec] = kept;
            const sbTable = SECTION_TO_SUPABASE_TABLE[sec];
            if (sbTable && idsToDelete.length > 0) {
              deleteClientRecordBatch(sbTable, idsToDelete).catch(() => {});
            }
          } else {
            const kept = arr.filter((item: any) => {
              let shouldDelete = false;
              let matchesDate = cutOffTime === null;
              if (cutOffTime !== null) {
                const dateVal = item.date || item.orderDate || item.followUpDate || item.auditDate || item.transferDate || item.lastUpdate || item.inspectionDate || item.testTimestamp || item.logDate || item.timestamp || item.entryTimestamp || item.createdAt || item.created_at;
                if (dateVal && new Date(dateVal).getTime() <= cutOffTime) matchesDate = true;
              }
              let matchesStatus = true;
              if (statusFilter && statusFilter !== 'ALL') {
                const st = String(item.status || item.stage || item.qcStatus || '').toUpperCase();
                matchesStatus = st === String(statusFilter).toUpperCase();
              }
              shouldDelete = matchesDate && matchesStatus;
              if (shouldDelete) {
                totalDeleted++;
                idsToDelete.push(String(item.id || item.serial || item.code || ''));
              }
              return !shouldDelete;
            });
            (db as any)[sec] = kept;
            const sbTable = SECTION_TO_SUPABASE_TABLE[sec];
            if (sbTable && idsToDelete.length > 0) {
              deleteClientRecordBatch(sbTable, idsToDelete).catch(() => {});
            }
          }
        }
      });

      // Save audit log
      const newLog = {
        id: `PURGE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        performedBy,
        adminRole,
        section: sectionsToProcess.join(', '),
        sectionLabel: sectionsToProcess.join(', '),
        recordsDeletedCount: totalDeleted,
        criteriaDescription: mode === 'ALL' ? 'Complete section purge' : `Purge mode: ${mode}`,
        notes: notes || 'Client mock executed cleanup',
        status: 'COMPLETED'
      };
      (db as any).purgeLogs = (db as any).purgeLogs || [];
      (db as any).purgeLogs.unshift(newLog);

      saveLocalDB(db);
      responseData = { success: true, totalDeletedCount: totalDeleted, purgeLog: newLog };
    } else if (urlStr.includes('/api/admin/purge-record') && method === 'POST') {
      const { section, id } = body || {};
      if (section && (db as any)[section]) {
        (db as any)[section] = ((db as any)[section] || []).filter((i: any) => String(i.id || i.serial || i.code) !== String(id));
        saveLocalDB(db);
      }
      responseData = { success: true };
    } else if (urlStr.includes('/api/admin/delete-record-item') && method === 'POST') {
      const { section, id } = body || {};
      if (section && (db as any)[section]) {
        (db as any)[section] = ((db as any)[section] || []).filter((i: any) => String(i.id || i.serial || i.code) !== String(id));
        saveLocalDB(db);
      }
      responseData = { success: true };
    }
  } catch (error) {
    console.error("Local mock server error handling request:", error);
    status = 500;
    responseData = { error: "MOCK_SERVER_ERR", message: String(error) };
  }

  return new Response(JSON.stringify(responseData), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
// Automatically intercept standard fetches in browser environments
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  // Check if we are on a static host with NO backend server (like Vercel, Netlify, GitHub Pages)
  const isStaticHosting = 
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('surge.sh') ||
    // If the hostname is not GCP Cloud Run (*.run.app) and not local development
    (!window.location.hostname.includes('run.app') && 
     !window.location.hostname.includes('localhost') && 
     !window.location.hostname.includes('127.0.0.1') && 
     !window.location.port);

  const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    if (urlStr.includes('/api/')) {
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && !contentType.includes('text/html')) {
          if (urlStr.includes('/api/data') && !urlStr.includes('/api/data/')) {
            try {
              const clone = response.clone();
              const data = await clone.json();
              localStorage.setItem('arcenol_db_clean', JSON.stringify(data));
            } catch (err) {
              // Ignore json parse error of clone
            }
          }
          return response;
        }
        // If API route failed or returned HTML fallback (e.g. on Vercel/static host), fallback to client Supabase mock
        return await handleMockRequest(urlStr, init);
      } catch (err) {
        return await handleMockRequest(urlStr, init);
      }
    }
    return originalFetch(input, init);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true
    });
  } catch (err) {
    console.error("Failed to redefine window.fetch with Object.defineProperty, trying on Window.prototype", err);
    try {
      Object.defineProperty(Window.prototype, 'fetch', {
        value: customFetch,
        configurable: true,
        writable: true
      });
    } catch (errProto) {
      console.error("Failed to redefine on Window.prototype too, falling back to assignment", errProto);
      try {
        (window as any).fetch = customFetch;
      } catch (errAssign) {
        console.error("Failed standard assignment, using globalThis", errAssign);
        try {
          (globalThis as any).fetch = customFetch;
        } catch (errGlobal) {
          console.error("Failed globalThis configuration", errGlobal);
        }
      }
    }
  }

  // Cross-device automatic background sync & tab window focus sync for Vercel static deployments
  const triggerAutoSync = () => {
    try {
      const db = getLocalDB();
      hydrateDbFromSupabase(db).then(() => {
        saveLocalDB(db);
      }).catch(() => {});
    } catch (e) {}
  };

  // Initial sync on startup
  setTimeout(triggerAutoSync, 1500);

  // Poll Supabase every 8 seconds for multi-device sync
  setInterval(triggerAutoSync, 8000);

  // Sync on tab focus or window visibility change
  window.addEventListener('focus', triggerAutoSync);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') triggerAutoSync();
  });
}

export {};
