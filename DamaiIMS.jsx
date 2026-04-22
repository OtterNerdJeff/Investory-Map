import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_LIST = ["Operational","Spare","Waiting for Condemnation","Others"];
const STATUS_COLORS = {
  "Operational":{ bg:"#052e16",border:"#16a34a",text:"#4ade80",badge:"#14532d" },
  "Spare":{ bg:"#1e1b4b",border:"#6366f1",text:"#a5b4fc",badge:"#312e81" },
  "Waiting for Condemnation":{ bg:"#450a0a",border:"#dc2626",text:"#fca5a5",badge:"#7f1d1d" },
  "Others":{ bg:"#1c1917",border:"#78716c",text:"#d4d0cb",badge:"#44403c" },
  "Under Maintenance":{ bg:"#422006",border:"#f59e0b",text:"#fcd34d",badge:"#78350f" },
  "Faulty":{ bg:"#450a0a",border:"#ef4444",text:"#fca5a5",badge:"#7f1d1d" },
};
const TYPE_ICON = {
  Projector:"📽",Visualiser:"📷",PatchPanel:"🔌",iPad:"📱","iPad Cart":"🛒",
  "Portable HD":"💾",MIC:"🎤",DSLR:"📸",Monitor:"🖥",PRINTER:"🖨",
  "Mobile Charging Cart":"🔋","S-Max":"📱","Old iPAD":"📱","Owned iPAD":"📱",
  DESKTOP:"💻",Camera:"📸",default:"📦"
};
const FAULT_TYPES = ["Lamp burnt out","No display","Colour distortion","Overheating","No power","Remote not working","Lens issue","Fan noise","Connection error","Physical damage","Other"];
const SEV_COLORS = { Low:{bg:"#14532d",text:"#4ade80"}, Medium:{bg:"#78350f",text:"#fcd34d"}, High:{bg:"#7c2d12",text:"#fb923c"}, Critical:{bg:"#7f1d1d",text:"#fca5a5"} };
const CONDEMNED_SECTION = "Condemned / Pending Disposal";

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const RAW_ITEMS = [
  // ProjectorNVisualiser
  {id:"I001",sheet:"PNV",label:"P Hall",assetCode:"0054-000155",type:"Projector",brand:"Panasonic",model:"PT-MZ16K",serial:"DE2540003",location:"HALL",cost:"17508",warrantyEnd:"2027-12-08",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I002",sheet:"PNV",label:"P Hall side",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-RZ660",serial:"DA8640036",location:"HALL",cost:"6695",warrantyEnd:"2024-02-11",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I003",sheet:"PNV",label:"P Hall side",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-RZ660",serial:"DA8640044",location:"HALL",cost:"6695",warrantyEnd:"2024-02-11",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I004",sheet:"PNV",label:"P PAC",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-EZ-590A",serial:"DD8610008",location:"D1-05 PAC Lobby",cost:"1981",warrantyEnd:"2024-01-14",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I005",sheet:"PNV",label:"VS3103-08",assetCode:"",type:"Projector",brand:"Viewsonic",model:"SP7",serial:"XZC254301021",location:"Conference Room",cost:"1045",warrantyEnd:"2031-03-13",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I006",sheet:"PNV",label:"P23",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW530",serial:"DC6640053",location:"D1-01 Dance Studio",cost:"758",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I007",sheet:"PNV",label:"P13",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610308",location:"D1-02 PAL Room 1",cost:"758",warrantyEnd:"2023-01-12",remark:"Change lamp on 19/2/2021",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I008",sheet:"PNV",label:"VN01",assetCode:"",type:"Visualiser",brand:"Newline",model:"TC-10P",serial:"C10UPV0S830035",location:"D1-02 PAL Room 1",cost:"399",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I009",sheet:"PNV",label:"P03",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610235",location:"D1-02 PAL Room 2",cost:"758",warrantyEnd:"2023-01-04",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I010",sheet:"PNV",label:"E2811_14",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600052",location:"E1-01 Music Room 1",cost:"1010",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I011",sheet:"PNV",label:"VA01",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5307033700198",location:"E1-01 Music Room 1",cost:"518",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I012",sheet:"PNV",label:"P04",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-EZ-590A",serial:"DD8610005",location:"E1-02 Band Room",cost:"1981",warrantyEnd:"2024-01-14",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I013",sheet:"PNV",label:"VN02",assetCode:"",type:"Visualiser",brand:"Newline",model:"TC-10P",serial:"C10UPV0S830046",location:"E1-02 Band Room",cost:"399",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I014",sheet:"PNV",label:"P05",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610267",location:"E1-02 Band Room",cost:"758",warrantyEnd:"2023-01-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I015",sheet:"PNV",label:"VS3103-09",assetCode:"",type:"Projector",brand:"Viewsonic",model:"SP7",serial:"XZC254301005",location:"E1-03 Music Room 2",cost:"1045",warrantyEnd:"2031-03-13",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I016",sheet:"PNV",label:"VA02",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5307033700032",location:"E1-03 Music Room 2",cost:"518",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I017",sheet:"PNV",label:"E2711_05",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL2600002",location:"B2-06 Teaching Lab",cost:"1010",warrantyEnd:"2027-11-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I018",sheet:"PNV",label:"VN03",assetCode:"",type:"Visualiser",brand:"Newline",model:"TC-10P",serial:"C10UPV0S830069",location:"B2-06 Teaching Lab",cost:"399",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I019",sheet:"PNV",label:"P30",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW530",serial:"DC7110469",location:"ITLR",cost:"758",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I020",sheet:"PNV",label:"VN04",assetCode:"",type:"Visualiser",brand:"Newline",model:"TC-10P",serial:"C10UPV0S830072",location:"ITLR",cost:"399",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I021",sheet:"PNV",label:"P08",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610236",location:"Learning Room 1",cost:"758",warrantyEnd:"2023-01-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I022",sheet:"PNV",label:"VN13",assetCode:"",type:"Visualiser",brand:"Newline",model:"TC-10P",serial:"C10UPV0S830061",location:"Learning Room 1",cost:"399",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I023",sheet:"PNV",label:"P12",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610227",location:"Learning Lab 3",cost:"758",warrantyEnd:"2023-01-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I024",sheet:"PNV",label:"S Spare",assetCode:"",type:"Visualiser",brand:"SAMSUNG",model:"UF 80ST",serial:"T6100100",location:"Learning Lab 3",cost:"2175",warrantyEnd:"",remark:"Served as personal backup",comment:"",status:"Spare",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I025",sheet:"PNV",label:"P23",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW530",serial:"DC6540413",location:"Learning Lab 2",cost:"758",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I026",sheet:"PNV",label:"V2502_16",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3003636",location:"Learning Lab 2",cost:"385",warrantyEnd:"2025-02-11",remark:"3 years warranty until 11 Feb 2025",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I027",sheet:"PNV",label:"VS3002-06",assetCode:"",type:"Projector",brand:"Viewsonic",model:"PA700W",serial:"X41242401203",location:"Learning Lab 1",cost:"1127",warrantyEnd:"2030-02-18",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I028",sheet:"PNV",label:"VE01",assetCode:"",type:"Visualiser",brand:"V Epson",model:"ELPDC21",serial:"X24D6100163",location:"Learning Lab 1",cost:"650",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I029",sheet:"PNV",label:"E2905_25",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300017",location:"LSP",cost:"1010",warrantyEnd:"2029-05-17",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I030",sheet:"PNV",label:"V2511_29",assetCode:"got issue collected",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3019831",location:"LSP",cost:"365",warrantyEnd:"2025-11-02",remark:"3 years warranty until 2 Nov 2025",comment:"got issue and emailed, collected",status:"Under Maintenance",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I031",sheet:"PNV",label:"E2806_06",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3200221",location:"Art Room 1",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I032",sheet:"PNV",label:"VA04",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF+",serial:"5308113600202",location:"Art Room 1",cost:"700",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I033",sheet:"PNV",label:"P10",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610149",location:"Art Room 2",cost:"758",warrantyEnd:"2023-01-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I034",sheet:"PNV",label:"VA05",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF+",serial:"5308113600204",location:"Art Room 2",cost:"700",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I035",sheet:"PNV",label:"E2806_07",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3200226",location:"Science Lab 1",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I036",sheet:"PNV",label:"V2503_21",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3022533",location:"Science Lab 1",cost:"385",warrantyEnd:"2025-03-24",remark:"3 years warranty until 24 Mar 2025",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I037",sheet:"PNV",label:"E2811_15",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600120",location:"Science Lab 2",cost:"960",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I038",sheet:"PNV",label:"VA06",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5306168700250",location:"Science Lab 2",cost:"499",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I039",sheet:"PNV",label:"P11",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610231",location:"LSM",cost:"700",warrantyEnd:"2023-01-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I040",sheet:"PNV",label:"V2503_22",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3022535",location:"LSM",cost:"385",warrantyEnd:"2025-03-24",remark:"3 years warranty until 24 Mar 2025",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I041",sheet:"PNV",label:"VS3002-01",assetCode:"",type:"Projector",brand:"Viewsonic",model:"PA700W",serial:"X41240801725",location:"F2-01",cost:"1127",warrantyEnd:"2030-02-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I042",sheet:"PNV",label:"V2802_40",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064610",location:"F2-01",cost:"365",warrantyEnd:"2028-02-25",remark:"3 years warranty until 25/2/2028",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I043",sheet:"PNV",label:"VS3002-02",assetCode:"",type:"Projector",brand:"Viewsonic",model:"PA700W",serial:"X41242401190",location:"F2-02",cost:"1127",warrantyEnd:"2030-02-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I044",sheet:"PNV",label:"V2502_17",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3003634",location:"F2-02",cost:"385",warrantyEnd:"2025-02-11",remark:"3 years warranty until 11 Feb 2025",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I045",sheet:"PNV",label:"VS3002-03",assetCode:"",type:"Projector",brand:"Viewsonic",model:"PA700W",serial:"X41242401212",location:"F2-03",cost:"1127",warrantyEnd:"2030-02-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I046",sheet:"PNV",label:"V2802_37",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064615",location:"F2-03",cost:"365",warrantyEnd:"2028-02-25",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I047",sheet:"PNV",label:"E2806_08",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3400015",location:"G2-01",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I048",sheet:"PNV",label:"V2511_28",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3019829",location:"G2-01",cost:"365",warrantyEnd:"2025-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I049",sheet:"PNV",label:"E2905_24",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300056",location:"G2-02",cost:"1010",warrantyEnd:"2029-05-17",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I050",sheet:"PNV",label:"V2708_31",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3052525",location:"G2-02",cost:"365",warrantyEnd:"2027-08-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I051",sheet:"PNV",label:"P27",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW530",serial:"DC7310571",location:"G2-03",cost:"758",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I052",sheet:"PNV",label:"V2503_23",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3022529",location:"G2-03",cost:"385",warrantyEnd:"2025-03-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I053",sheet:"PNV",label:"P16",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610434",location:"E3-02 SBB Room 1",cost:"758",warrantyEnd:"2023-01-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I054",sheet:"PNV",label:"VA10",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5306350800006",location:"E3-02 SBB Room 1",cost:"500",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I055",sheet:"PNV",label:"E2909_30",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4600500",location:"E3-03 SBB Room 2",cost:"1010",warrantyEnd:"2029-09-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I056",sheet:"PNV",label:"VE02",assetCode:"",type:"Visualiser",brand:"V Epson",model:"ELPDC21",serial:"X24D6100098",location:"E3-03 SBB Room 2",cost:"650",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I057",sheet:"PNV",label:"E2909_26",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300171",location:"E3-04 Math Room",cost:"1010",warrantyEnd:"2029-09-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I058",sheet:"PNV",label:"VA12",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5306168700194",location:"E3-04 Math Room",cost:"499",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I059",sheet:"PNV",label:"E2806_09",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3400021",location:"F3-01",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I060",sheet:"PNV",label:"V2502_18",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3003635",location:"F3-01",cost:"385",warrantyEnd:"2025-02-11",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I061",sheet:"PNV",label:"E2905_23",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300049",location:"F3-02",cost:"1010",warrantyEnd:"2029-05-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I062",sheet:"PNV",label:"V2511_30",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3019832",location:"F3-02",cost:"365",warrantyEnd:"2025-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I063",sheet:"PNV",label:"P18",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7610350",location:"G3-01",cost:"758",warrantyEnd:"2023-05-27",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I064",sheet:"PNV",label:"VA14",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF+",serial:"5201131700109",location:"G3-01",cost:"499",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I065",sheet:"PNV",label:"E2811_16",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600051",location:"G3-02",cost:"960",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I066",sheet:"PNV",label:"V2708_33",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3052481",location:"G3-02",cost:"365",warrantyEnd:"2027-08-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I067",sheet:"PNV",label:"O2512_01",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0024",location:"G3-03",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I068",sheet:"PNV",label:"VA15",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5308113600197",location:"G3-03",cost:"700",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I069",sheet:"PNV",label:"E2811_17",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600165",location:"G3-04",cost:"960",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I070",sheet:"PNV",label:"VA16",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5306350800012",location:"G3-04",cost:"500",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I071",sheet:"PNV",label:"E2811_18",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600001",location:"G3-05",cost:"960",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I072",sheet:"PNV",label:"V2511_27",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3010939",location:"G3-05",cost:"365",warrantyEnd:"2025-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I073",sheet:"PNV",label:"VS3103-07",assetCode:"",type:"Projector",brand:"Viewsonic",model:"SP7",serial:"XZC254301014",location:"G3-06",cost:"1045",warrantyEnd:"2031-03-13",remark:"take note, looks like old stock",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I074",sheet:"PNV",label:"V2802_39",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064688",location:"G3-06",cost:"365",warrantyEnd:"2028-02-25",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I075",sheet:"PNV",label:"VS3002-04",assetCode:"",type:"Projector",brand:"Viewsonic",model:"PA700W",serial:"X41240801544",location:"E4-01",cost:"1127",warrantyEnd:"2030-02-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I076",sheet:"PNV",label:"V2302_02",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P",serial:"3433906",location:"E4-01",cost:"385",warrantyEnd:"2023-02-28",remark:"3 years warranty until Feb 2023",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I077",sheet:"PNV",label:"VS3002-05",assetCode:"",type:"Projector",brand:"Viewsonic",model:"PA700W",serial:"X41242401213",location:"E4-02",cost:"1127",warrantyEnd:"2030-02-18",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I078",sheet:"PNV",label:"V2807_42",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064567",location:"E4-02",cost:"365",warrantyEnd:"2028-07-21",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I079",sheet:"PNV",label:"E2811_19",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600166",location:"E4-03",cost:"960",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I080",sheet:"PNV",label:"V2502_19",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3003633",location:"E4-03",cost:"385",warrantyEnd:"2025-02-11",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I081",sheet:"PNV",label:"O2512_02",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0021",location:"F4-01",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I082",sheet:"PNV",label:"V2302_04",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P",serial:"3433909",location:"F4-01",cost:"385",warrantyEnd:"2023-02-28",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I083",sheet:"PNV",label:"E2711_03",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL2600004",location:"F4-02",cost:"1010",warrantyEnd:"2027-11-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I084",sheet:"PNV",label:"V2302_05",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P",serial:"3433910",location:"F4-02",cost:"385",warrantyEnd:"2023-02-28",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I085",sheet:"PNV",label:"E2811_20",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600111",location:"F4-03",cost:"960",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I086",sheet:"PNV",label:"V2708_34",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3052482",location:"F4-03",cost:"365",warrantyEnd:"2027-08-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I087",sheet:"PNV",label:"E2806_10",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3200227",location:"G4-01",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I088",sheet:"PNV",label:"V2503_24",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3022534",location:"G4-01",cost:"385",warrantyEnd:"2025-03-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I089",sheet:"PNV",label:"E2806_11",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3200166",location:"G4-02",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I090",sheet:"PNV",label:"V2312_07",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023825",location:"G4-02",cost:"385",warrantyEnd:"2023-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I091",sheet:"PNV",label:"E2806_12",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3400002",location:"G4-03",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I092",sheet:"PNV",label:"V2312_08",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023824",location:"G4-03",cost:"385",warrantyEnd:"2023-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I093",sheet:"PNV",label:"O2612_16",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9142WAAA1B0011",location:"E5-01",cost:"1150",warrantyEnd:"2026-12-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I094",sheet:"PNV",label:"V2802_36",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064613",location:"E5-01",cost:"365",warrantyEnd:"2028-02-25",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I095",sheet:"PNV",label:"E2711_01",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL2600053",location:"E5-02",cost:"1010",warrantyEnd:"2027-11-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I096",sheet:"PNV",label:"V2708_35",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3052522",location:"E5-02",cost:"365",warrantyEnd:"2027-08-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I097",sheet:"PNV",label:"E2806_13",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3400092",location:"E5-03",cost:"1010",warrantyEnd:"2028-06-16",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I098",sheet:"PNV",label:"V2511_26",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3026899",location:"E5-03",cost:"365",warrantyEnd:"2025-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I099",sheet:"PNV",label:"E2711_02",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL2600028",location:"F5-01",cost:"1010",warrantyEnd:"2027-11-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I100",sheet:"PNV",label:"V2807_41",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064620",location:"F5-01",cost:"365",warrantyEnd:"2028-07-21",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I101",sheet:"PNV",label:"E2909_28",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300014",location:"F5-02",cost:"1010",warrantyEnd:"2029-09-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I102",sheet:"PNV",label:"VA18",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5306168700275",location:"F5-02",cost:"499",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I103",sheet:"PNV",label:"E2909_27",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300052",location:"F5-03",cost:"1010",warrantyEnd:"2029-09-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I104",sheet:"PNV",label:"V2807_43",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064568",location:"F5-03",cost:"365",warrantyEnd:"2028-07-21",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I105",sheet:"PNV",label:"O2512_03",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0020",location:"G5-01",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I106",sheet:"PNV",label:"V2312_09",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023826",location:"G5-01",cost:"385",warrantyEnd:"2023-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I107",sheet:"PNV",label:"E2811_21",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL3600005",location:"G5-02",cost:"960",warrantyEnd:"2028-11-02",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I108",sheet:"PNV",label:"V2312_10",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023820",location:"G5-02",cost:"385",warrantyEnd:"2023-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I109",sheet:"PNV",label:"E2909_29",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300174",location:"G5-03",cost:"1010",warrantyEnd:"2029-09-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I110",sheet:"PNV",label:"VA20",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5306168700225",location:"G5-03",cost:"499",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I111",sheet:"PNV",label:"O2512_04",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0031",location:"E6-01",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I112",sheet:"PNV",label:"VE03",assetCode:"",type:"Visualiser",brand:"V Epson",model:"ELPDC21",serial:"X24D6100153",location:"E6-01",cost:"650",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I113",sheet:"PNV",label:"O2512_05",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0016",location:"E6-02",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I114",sheet:"PNV",label:"V2802_38",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064616",location:"E6-02",cost:"365",warrantyEnd:"2028-02-25",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I115",sheet:"PNV",label:"E2905_22",assetCode:"",type:"Projector",brand:"Epson",model:"EB982W",serial:"X8BL4300058",location:"E6-03",cost:"1010",warrantyEnd:"2029-05-15",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I116",sheet:"PNV",label:"V2807_40",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064619",location:"E6-03",cost:"365",warrantyEnd:"2028-07-21",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I117",sheet:"PNV",label:"O2512_06",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0022",location:"F6-01",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I118",sheet:"PNV",label:"VA21",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF",serial:"5306168700223",location:"F6-01",cost:"499",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I119",sheet:"PNV",label:"O2512_07",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0025",location:"F6-02",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I120",sheet:"PNV",label:"V2503_25",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3022536",location:"F6-02",cost:"385",warrantyEnd:"2025-03-24",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I121",sheet:"PNV",label:"O2512_08",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0099",location:"F6-03",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I122",sheet:"PNV",label:"VN12",assetCode:"",type:"Visualiser",brand:"Newline",model:"TC-10P",serial:"C10UPV0S830036",location:"F6-03",cost:"399",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I123",sheet:"PNV",label:"O2512_09",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0090",location:"E7-01",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I124",sheet:"PNV",label:"V2312_11",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023821",location:"E7-01",cost:"385",warrantyEnd:"2023-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I125",sheet:"PNV",label:"O2512_10",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0094",location:"E7-02",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I126",sheet:"PNV",label:"V2708_32",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3052526",location:"E7-02",cost:"365",warrantyEnd:"2027-08-12",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I127",sheet:"PNV",label:"O2512_11",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0013",location:"E7-03",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I128",sheet:"PNV",label:"V2807_44",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3064566",location:"E7-03",cost:"365",warrantyEnd:"2028-07-21",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I129",sheet:"PNV",label:"O2512_12",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0092",location:"F7-01",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I130",sheet:"PNV",label:"V2502_20",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P3",serial:"3003637",location:"F7-01",cost:"385",warrantyEnd:"2025-02-11",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I131",sheet:"PNV",label:"O2512_13",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0015",location:"F7-02",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I132",sheet:"PNV",label:"V2312_14",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023749",location:"F7-02",cost:"385",warrantyEnd:"2023-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I133",sheet:"PNV",label:"O2512_14",assetCode:"",type:"Projector",brand:"Optoma",model:"ZW406",serial:"Q7F9043WAAA1B0027",location:"F7-03",cost:"1150",warrantyEnd:"2025-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I134",sheet:"PNV",label:"V2312_15",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023750",location:"F7-03",cost:"385",warrantyEnd:"2023-12-29",remark:"",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  // Condemned
  {id:"I135",sheet:"CON",label:"P24",assetCode:"",type:"Projector",brand:"Epson",model:"EB-1940W",serial:"RL9F470060L",location:CONDEMNED_SECTION,cost:"968",warrantyEnd:"",remark:"-",comment:"Spoilt",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I136",sheet:"CON",label:"Desktop FUJITSU",assetCode:"0054-001086",type:"DESKTOP",brand:"FUJITSU",model:"ESPRIMO E520",serial:"YLQV013360",location:CONDEMNED_SECTION,cost:"1444",warrantyEnd:"",remark:"From ECPS",comment:"",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I137",sheet:"CON",label:"iPad Cart 2",assetCode:"0054-000144",type:"iPad Cart",brand:"AVER",model:"Sync and Charge",serial:"4060114082035",location:CONDEMNED_SECTION,cost:"3156",warrantyEnd:"",remark:"from ECPS",comment:"leg issue",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I138",sheet:"CON",label:"VA03",assetCode:"",type:"Visualiser",brand:"AVerVision",model:"315AF+",serial:"5308113600266",location:CONDEMNED_SECTION,cost:"700",warrantyEnd:"",remark:"",comment:"",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I139",sheet:"CON",label:"VN10",assetCode:"",type:"Visualiser",brand:"Newline",model:"TC-10P",serial:"C10UPV0S830064",location:CONDEMNED_SECTION,cost:"399",warrantyEnd:"",remark:"",comment:"",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I140",sheet:"CON",label:"V2302_03",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P",serial:"3433907",location:CONDEMNED_SECTION,cost:"385",warrantyEnd:"2023-02-28",remark:"3 years warranty until Feb 2023",comment:"",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I141",sheet:"CON",label:"V2312_13",assetCode:"",type:"Visualiser",brand:"ELMO",model:"MX-P2",serial:"3023823",location:CONDEMNED_SECTION,cost:"385",warrantyEnd:"2023-12-29",remark:"3 years warranty until 29 Dec 2023",comment:"",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I142",sheet:"CON",label:"P06",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW530",serial:"DC7410216",location:CONDEMNED_SECTION,cost:"785",warrantyEnd:"",remark:"",comment:"",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I143",sheet:"CON",label:"P01",assetCode:"",type:"Projector",brand:"Panasonic",model:"PT-VW540",serial:"DC7440243",location:CONDEMNED_SECTION,cost:"700",warrantyEnd:"",remark:"",comment:"",status:"Waiting for Condemnation",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  // iPad (sample)
  {id:"I144",sheet:"iPad",label:"iPad Cart 6",assetCode:"L00094318",type:"Mobile Charging Cart",brand:"V-lab",model:"V-Lab 40",serial:"0112",location:"6th Floor",cost:"0",warrantyEnd:"",remark:"Leasing",comment:"iPad Cart 6",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I145",sheet:"iPad",label:"iPad Cart 7",assetCode:"L00094319",type:"Mobile Charging Cart",brand:"V-lab",model:"V-Lab 40",serial:"0106",location:"7th Floor",cost:"0",warrantyEnd:"",remark:"Leasing",comment:"iPad Cart 7",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I146",sheet:"iPad",label:"SMAX iPad Air",assetCode:"0054-001047",type:"S-Max",brand:"APPLE",model:"MM6R3ZP/A",serial:"C91YXPWGDX",location:"Mdm Lim",cost:"952",warrantyEnd:"",remark:"27 Jan 2023 - Singtel",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Mdm Lim",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I147",sheet:"iPad",label:"SMAX iPad Mini",assetCode:"0054-001048",type:"S-Max",brand:"APPLE",model:"MK8C3ZP/A",serial:"W9JY74VLYK",location:"Mr Mohamed",cost:"863",warrantyEnd:"",remark:"27 Jan 2023 - Singtel",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Mr Mohamed",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I148",sheet:"iPad",label:"Cart 3-33",assetCode:"0054-001042",type:"Old iPAD",brand:"APPLE",model:"MGTX2ZP/A",serial:"DMPSJ MMJG5W1",location:"Jeff (Custody)",cost:"648",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Jeff (Custody)",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I149",sheet:"iPad",label:"Cart 1-1",assetCode:"0054-000360",type:"Owned iPAD",brand:"APPLE",model:"MK2K3ZP/A",serial:"H2F33GKWRH",location:"Cart 1",cost:"449",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I150",sheet:"iPad",label:"Cart 1-2",assetCode:"0054-000361",type:"Owned iPAD",brand:"APPLE",model:"MK2K3ZP/A",serial:"DWRDKKVQNR",location:"Cart 1",cost:"449",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I151",sheet:"iPad",label:"iPad PE-01",assetCode:"L00094036",type:"IPAD",brand:"APPLE",model:"iPad (A16)",serial:"D2YKQJ0L6D",location:"iPad Cart PE",cost:"0",warrantyEnd:"",remark:"Leasing",comment:"",status:"Operational",loanable:true,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I152",sheet:"iPad",label:"iPad PE-02",assetCode:"L00094037",type:"IPAD",brand:"APPLE",model:"iPad (A16)",serial:"C77JX7KHKL",location:"iPad Cart PE",cost:"0",warrantyEnd:"",remark:"Leasing",comment:"",status:"Operational",loanable:true,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  // Others
  {id:"I153",sheet:"OTH",label:"DSLR2",assetCode:"0054-000545",type:"DSLR",brand:"CANON",model:"EOS",serial:"2150584328",location:"Jeff (Custody)",cost:"0",warrantyEnd:"",remark:"-",comment:"N00540000068",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Jeff (Custody)",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I154",sheet:"OTH",label:"DSLR1",assetCode:"0054-001015",type:"DSLR",brand:"CANON",model:"EOS 650D",serial:"38051004602",location:"Jeff (Custody)",cost:"1299",warrantyEnd:"",remark:"-",comment:"N90540001615",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Jeff (Custody)",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I155",sheet:"OTH",label:"2018VT01 Charger",assetCode:"NIL",type:"MIC",brand:"",model:"HC-42",serial:"4SJ-1750203",location:"Tracy",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Tracy",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I156",sheet:"OTH",label:"2018VT01 Mic",assetCode:"NIL",type:"MIC",brand:"CHIAYO",model:"ITX2",serial:"4SJ-1770254",location:"Tracy",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Tracy",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I157",sheet:"OTH",label:"2018VT02 Charger",assetCode:"NIL",type:"MIC",brand:"",model:"HC-42",serial:"4SJ-1770273",location:"Alice",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Alice",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I158",sheet:"OTH",label:"2018VT02 Mic",assetCode:"NIL",type:"MIC",brand:"CHIAYO",model:"ITX2",serial:"4SJ-16C0240",location:"Alice",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Alice",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I159",sheet:"OTH",label:"2018VT03 Charger",assetCode:"NIL",type:"MIC",brand:"",model:"HC-42",serial:"4SJ-1750220",location:"Laurice",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Laurice",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I160",sheet:"OTH",label:"2018VT03 Mic",assetCode:"NIL",type:"MIC",brand:"CHIAYO",model:"ITX2",serial:"4SJ-1770051",location:"Laurice",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Laurice",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I161",sheet:"OTH",label:"2018VT04 Charger",assetCode:"NIL",type:"MIC",brand:"",model:"HC-42",serial:"4SJ-1770267",location:"Mabel",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Mabel",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I162",sheet:"OTH",label:"2018VT04 Mic",assetCode:"NIL",type:"MIC",brand:"CHIAYO",model:"ITX2",serial:"4SJ-1750147",location:"Mabel",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Mabel",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I163",sheet:"OTH",label:"2018VT05 Charger",assetCode:"NIL",type:"MIC",brand:"",model:"HC-42",serial:"4SJ-1750202",location:"Mak",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Mak",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I164",sheet:"OTH",label:"2018VT05 Mic",assetCode:"NIL",type:"MIC",brand:"CHIAYO",model:"ITX2",serial:"4SJ-1720004",location:"Mak",cost:"0",warrantyEnd:"",remark:"",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Mak",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I165",sheet:"OTH",label:"SC1 Monitor",assetCode:"",type:"Monitor",brand:"ACER",model:"V206HQL",serial:"13714756442",location:"Mdm Lim",cost:"0",warrantyEnd:"",remark:"MOE GIFT",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Mdm Lim",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I166",sheet:"OTH",label:"SC2 Monitor",assetCode:"",type:"Monitor",brand:"ACER",model:"V206HQL",serial:"13714749842",location:"Sanisa",cost:"0",warrantyEnd:"",remark:"MOE GIFT",comment:"",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Sanisa",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I167",sheet:"OTH",label:"DMPS-HD41",assetCode:"0054-000192",type:"Portable HD",brand:"HP",model:"PX3100",serial:"8CY6171283",location:"Anson",cost:"150",warrantyEnd:"",remark:"",comment:"H90540001352",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Anson",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I168",sheet:"OTH",label:"DMPS-HD08",assetCode:"0054-000325",type:"Portable HD",brand:"HP",model:"PX3100",serial:"8CY4481335",location:"Azlin",cost:"150",warrantyEnd:"",remark:"25/11/2025",comment:"H90540001485",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Azlin",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I169",sheet:"OTH",label:"DMPS-HD23",assetCode:"0054-000247",type:"Portable HD",brand:"HP",model:"PX3100",serial:"8CY4481694",location:"Azlin",cost:"150",warrantyEnd:"",remark:"25/11/2025",comment:"H90540001407",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Azlin",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I170",sheet:"OTH",label:"ECPS-HD01",assetCode:"0054-000202",type:"Portable HD",brand:"HP",model:"PX3100",serial:"8CY6193104",location:"Azlin",cost:"150",warrantyEnd:"",remark:"25/11/2025",comment:"H90540001362",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Azlin",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I171",sheet:"OTH",label:"DMPS-HD81",assetCode:"0054-000309",type:"Portable HD",brand:"HP",model:"PX3100",serial:"8CY6172490",location:"Christine",cost:"150",warrantyEnd:"",remark:"",comment:"H90540001469",status:"Operational",loanable:true,isLoaned:true,loanedTo:"Christine",repairs:[],faults:[],moveLog:[],loanHistory:[]},
  {id:"I172",sheet:"OTH",label:"Printer Color",assetCode:"",type:"PRINTER",brand:"HP",model:"Color Laserjet Pro M479FDW",serial:"CNCRQ9Q1RT",location:"ITLR",cost:"582",warrantyEnd:"2026-02-07",remark:"warranty February 07, 2026",comment:"",status:"Operational",loanable:false,isLoaned:false,loanedTo:"",repairs:[],faults:[],moveLog:[],loanHistory:[]},
];

const INITIAL_SECTIONS = {
  "PAC & Ground":["HALL","D1-05 PAC Lobby","D1-01 Dance Studio","D1-02 PAL Room 1","D1-02 PAL Room 2","E1-01 Music Room 1","E1-02 Band Room","E1-03 Music Room 2","Conference Room","B2-06 Teaching Lab","ITLR","Learning Room 1","Learning Lab 1","Learning Lab 2","Learning Lab 3","LSP","LSM","Art Room 1","Art Room 2","Science Lab 1","Science Lab 2","Spare"],
  "Floor 2":["F2-01","F2-02","F2-03","G2-01","G2-02","G2-03"],
  "Floor 3":["E3-02 SBB Room 1","E3-03 SBB Room 2","E3-04 Math Room","F3-01","F3-02","G3-01","G3-02","G3-03","G3-04","G3-05","G3-06"],
  "Floor 4":["E4-01","E4-02","E4-03","F4-01","F4-02","F4-03","G4-01","G4-02","G4-03"],
  "Floor 5":["E5-01","E5-02","E5-03","F5-01","F5-02","F5-03","G5-01","G5-02","G5-03"],
  "Floor 6":["E6-01","E6-02","E6-03","F6-01","F6-02","F6-03"],
  "Floor 7":["E7-01","E7-02","E7-03","F7-01","F7-02","F7-03"],
  "iPad":["Cart 1","Cart 2","Cart 3","Cart 4","Cart 5","6th Floor","7th Floor","iPad Cart PE"],
  "Others":["ITLR","A2-03 STAFF RESOURCE","Lab Store","Jeff (Custody)"],
  [CONDEMNED_SECTION]:[CONDEMNED_SECTION],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10).toUpperCase();
const now = () => new Date().toISOString();
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-SG",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const isExpired = d => d && new Date(d) < new Date();
const expiringSoon = d => { if(!d) return false; const diff=(new Date(d)-new Date())/(86400000); return diff>0&&diff<90; };
const itype = t => TYPE_ICON[t]||TYPE_ICON.default;
const sc = s => STATUS_COLORS[s]||STATUS_COLORS["Others"];
const clamp = (s,n) => s.length>n ? s.slice(0,n) : s;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState(()=>{ try{const s=localStorage.getItem("damai_v3"); return s?JSON.parse(s):RAW_ITEMS;}catch{return RAW_ITEMS;} });
  const [sections, setSections] = useState(()=>{ try{const s=localStorage.getItem("damai_sec_v3"); return s?JSON.parse(s):INITIAL_SECTIONS;}catch{return INITIAL_SECTIONS;} });
  const [moveLog, setMoveLog] = useState(()=>{ try{const s=localStorage.getItem("damai_log_v3"); return s?JSON.parse(s):[];}catch{return [];} });
  const [tab, setTab] = useState("sections");
  const [activeSection, setActiveSection] = useState("PAC & Ground");
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailTab, setDetailTab] = useState("details");
  const [dragItem, setDragItem] = useState(null);
  const [dragRoom, setDragRoom] = useState(null);
  const [dragOverRoom, setDragOverRoom] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [modal, setModal] = useState(null); // {type, ...data}
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [lightbox, setLightbox] = useState(null);
  const [sectionDragIdx, setSectionDragIdx] = useState(null);

  useEffect(()=>{ try{localStorage.setItem("damai_v3",JSON.stringify(items));}catch{} },[items]);
  useEffect(()=>{ try{localStorage.setItem("damai_sec_v3",JSON.stringify(sections));}catch{} },[sections]);
  useEffect(()=>{ try{localStorage.setItem("damai_log_v3",JSON.stringify(moveLog));}catch{} },[moveLog]);

  // ── Item CRUD
  const updateItem = (id, patch) => {
    setItems(prev => prev.map(i => {
      if(i.id !== id) return i;
      const updated = {...i,...patch};
      // Auto-route condemned
      if(patch.status === "Waiting for Condemnation" && i.location !== CONDEMNED_SECTION) {
        updated.location = CONDEMNED_SECTION;
        updated._prevLocation = i.location;
      }
      if(patch.status && patch.status !== "Waiting for Condemnation" && i.status === "Waiting for Condemnation") {
        updated.location = i._prevLocation || "Spare";
      }
      return updated;
    }));
    if(selectedItem?.id===id) setSelectedItem(p=>({...p,...patch}));
  };
  const deleteItem = id => { setItems(p=>p.filter(i=>i.id!==id)); if(selectedItem?.id===id) setSelectedItem(null); };
  const addItem = item => setItems(p=>[...p,{...item,id:"I"+uid(),repairs:[],faults:[],moveLog:[],loanHistory:[]}]);

  // ── Move
  const moveItem = (itemId, toLocation, reason, movedBy) => {
    const item = items.find(i=>i.id===itemId);
    if(!item) return;
    const logEntry = {id:uid(),itemId,itemLabel:item.label,from:item.location,to:toLocation,reason,movedBy,date:now()};
    setMoveLog(l=>[logEntry,...l]);
    updateItem(itemId,{location:toLocation,moveLog:[...(item.moveLog||[]),logEntry]});
  };

  // ── Loan
  const loanOut = (itemId, loanData) => {
    const item = items.find(i=>i.id===itemId);
    if(!item) return;
    const entry = {...loanData, id:uid(), dateOut:now(), status:"Active"};
    updateItem(itemId,{isLoaned:true,loanedTo:loanData.borrowerName,location:loanData.borrowerName,loanHistory:[...(item.loanHistory||[]),entry]});
  };
  const returnItem = (itemId, returnData) => {
    const item = items.find(i=>i.id===itemId);
    if(!item) return;
    const history = (item.loanHistory||[]).map((l,idx)=> idx===0&&l.status==="Active"?{...l,...returnData,dateIn:now(),status:"Returned"}:l);
    updateItem(itemId,{isLoaned:false,loanedTo:"",location:returnData.returnLocation||"Spare",loanHistory:history});
  };

  // ── Faults
  const addFault = (itemId, fault) => {
    const item = items.find(i=>i.id===itemId);
    if(!item) return;
    const f = {...fault, id:uid(), date:now(), status:"Open"};
    const newStatus = ["High","Critical"].includes(fault.severity)?"Faulty":(item.status==="Operational"?"Under Maintenance":item.status);
    updateItem(itemId,{faults:[f,...(item.faults||[])],status:newStatus});
  };
  const updateFault = (itemId, faultId, patch) => {
    const item = items.find(i=>i.id===itemId);
    if(!item) return;
    const faults = (item.faults||[]).map(f=>f.id===faultId?{...f,...patch}:f);
    const allResolved = faults.every(f=>f.status==="Resolved");
    updateItem(itemId,{faults, status: allResolved&&item.status!=="Decommissioned"?"Operational":item.status});
  };

  // ── Repairs
  const addRepair = (itemId, repair) => {
    const item = items.find(i=>i.id===itemId);
    if(!item) return;
    updateItem(itemId,{repairs:[{...repair,id:uid(),loggedDate:now()},...(item.repairs||[])]});
  };

  // ── Section management
  const addSection = name => { if(!name||sections[name]) return; setSections(p=>({...p,[name]:[]})); };
  const renameSection = (old,nw) => {
    if(!nw||sections[nw]) return;
    const entries = Object.entries(sections);
    const idx = entries.findIndex(([k])=>k===old);
    if(idx<0) return;
    entries[idx][0]=nw;
    setSections(Object.fromEntries(entries));
    setItems(p=>p.map(i=>i.location===old?{...i,location:nw}:i));
    if(activeSection===old) setActiveSection(nw);
  };
  const deleteSection = name => {
    if(name===CONDEMNED_SECTION) return;
    const rooms = sections[name]||[];
    setItems(p=>p.map(i=>rooms.includes(i.location)?{...i,location:"Spare"}:i));
    setSections(p=>{ const n={...p}; delete n[name]; return n; });
    if(activeSection===name) setActiveSection(Object.keys(sections)[0]);
  };
  const addRoom = (section, room) => { if(!room) return; setSections(p=>({...p,[section]:[...(p[section]||[]),room]})); };
  const renameRoom = (section, old, nw) => {
    setSections(p=>({...p,[section]:(p[section]||[]).map(r=>r===old?nw:r)}));
    setItems(p=>p.map(i=>i.location===old?{...i,location:nw}:i));
  };
  const deleteRoom = (section, room) => {
    setSections(p=>({...p,[section]:(p[section]||[]).filter(r=>r!==room)}));
    setItems(p=>p.map(i=>i.location===room?{...i,location:"Spare"}:i));
  };
  const reorderRooms = (section, fromIdx, toIdx) => {
    setSections(p=>{
      const rooms=[...(p[section]||[])];
      const [moved]=rooms.splice(fromIdx,1);
      rooms.splice(toIdx,0,moved);
      return {...p,[section]:rooms};
    });
  };

  // ── Drag & drop (items)
  const onDragItemStart = (e,item) => { setDragItem(item); e.dataTransfer.effectAllowed="move"; };
  const onDragItemEnd = () => { setDragItem(null); setDragOverRoom(null); };
  const onRoomDragOver = (e,room) => { e.preventDefault(); setDragOverRoom(room); };
  const onRoomDrop = (e,room) => {
    e.preventDefault();
    if(dragItem && dragItem.location!==room) setModal({type:"move",item:dragItem,pendingLocation:room});
    setDragOverRoom(null); setDragItem(null);
  };
  // Room reorder drag
  const onRoomCardDragStart = (e,room) => { setDragRoom(room); e.dataTransfer.effectAllowed="move"; };
  const onRoomCardDragOver = (e,room) => { e.preventDefault(); setDragOverRoom(room+"_card"); };
  const onRoomCardDrop = (e,room,section) => {
    e.preventDefault();
    if(dragRoom && dragRoom!==room) {
      const rooms = sections[section]||[];
      const fromIdx = rooms.indexOf(dragRoom);
      const toIdx = rooms.indexOf(room);
      if(fromIdx>=0&&toIdx>=0) reorderRooms(section,fromIdx,toIdx);
    }
    setDragRoom(null); setDragOverRoom(null);
  };

  // ── Stats
  const stats = {
    total: items.length,
    operational: items.filter(i=>i.status==="Operational").length,
    faulty: items.filter(i=>i.status==="Faulty").length,
    maintenance: items.filter(i=>i.status==="Under Maintenance").length,
    condemned: items.filter(i=>i.status==="Waiting for Condemnation").length,
    loaned: items.filter(i=>i.isLoaned).length,
    openFaults: items.reduce((n,i)=>n+(i.faults||[]).filter(f=>f.status!=="Resolved").length,0),
    warrantyExpired: items.filter(i=>isExpired(i.warrantyEnd)).length,
    expiringSoon: items.filter(i=>expiringSoon(i.warrantyEnd)).length,
  };

  // ── Export CSV
  const exportCSV = () => {
    const h = ["ID","Label","AssetCode","Type","Brand","Model","Serial","Location","Cost","WarrantyEnd","Status","Loanable","LoanedTo","Remark","Comment","OpenFaults","Repairs"];
    const rows = items.map(i=>[i.id,i.label,i.assetCode,i.type,i.brand,i.model,i.serial,i.location,i.cost,i.warrantyEnd,i.status,i.loanable?"Yes":"No",i.loanedTo||"",i.remark,i.comment,(i.faults||[]).filter(f=>f.status!=="Resolved").length,(i.repairs||[]).length]);
    const csv=[h,...rows].map(r=>r.map(v=>`"${String(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`DamaiIMS_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const fullSelected = selectedItem ? items.find(i=>i.id===selectedItem.id)||selectedItem : null;

  return (
    <div style={{fontFamily:"'DM Mono','Courier New',monospace",background:"#080b12",minHeight:"100vh",color:"#e2e8f0",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#2d3148;border-radius:2px}
        .btn{background:#111827;border:1px solid #2d3748;color:#e2e8f0;padding:6px 12px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .15s}
        .btn:hover{background:#1e2432;border-color:#6366f1}
        .btn-primary{background:#3730a3!important;border-color:#6366f1!important;color:#fff!important}
        .btn-primary:hover{background:#4338ca!important}
        .btn-danger{background:#7f1d1d!important;border-color:#ef4444!important;color:#fff!important}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal{background:#0f1520;border:1px solid #2d3748;border-radius:12px;padding:20px;width:min(480px,100%);max-height:88vh;overflow-y:auto}
        input,select,textarea{background:#080b12;border:1px solid #2d3748;color:#e2e8f0;border-radius:5px;padding:7px 10px;font-family:inherit;font-size:12px;width:100%;outline:none;transition:border .15s}
        input:focus,select:focus,textarea:focus{border-color:#6366f1}
        select option{background:#0f1520}
        .chip{border-radius:4px;transition:all .1s;cursor:grab;user-select:none}
        .chip:hover{opacity:.85}
        .chip:active{cursor:grabbing}
        .room-card{border-radius:8px;transition:border-color .15s}
        .drop-target{box-shadow:0 0 0 2px #6366f1!important}
        .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:500;white-space:nowrap}
        .slide-in{animation:slideIn .18s ease}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:200;display:flex;align-items:center;justify-content:center;cursor:zoom-out}
        .lightbox img{max-width:90vw;max-height:90vh;border-radius:6px}
        .tab-btn{background:none;border:none;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
        .sec-btn{background:none;border:1px solid transparent;cursor:pointer;font-family:inherit;transition:all .15s;border-radius:5px;padding:5px 10px;font-size:11px;white-space:nowrap}
        .sec-btn.active{background:#111827;border-color:#6366f1;color:#a5b4fc}
        .sec-btn:not(.active){color:#6b7280}
        .sec-btn:not(.active):hover{color:#9ca3af;border-color:#374151}
      `}</style>

      {/* ── HEADER */}
      <div style={{background:"#0d1117",borderBottom:"1px solid #1e2432",padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",flexShrink:0}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:17,color:"#818cf8",letterSpacing:"-.3px",whiteSpace:"nowrap"}}>◈ Damai IMS</div>
        <div style={{fontSize:10,color:"#374151",flexGrow:1}}>Inventory Management System</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button className="btn" onClick={()=>setModal({type:"report"})} style={{color:"#a5b4fc"}}>📊 Report</button>
          <button className="btn" onClick={exportCSV}>⬇ CSV</button>
          <button className="btn" onClick={()=>setModal({type:"import"})}>⬆ Import</button>
          <button className="btn" onClick={()=>setModal({type:"movelog"})}>📋 Log ({moveLog.length})</button>
          <button className="btn" onClick={()=>setModal({type:"settings"})}>⚙ Sections</button>
        </div>
      </div>

      {/* ── STATS */}
      <div style={{padding:"10px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:6,flexShrink:0}}>
        {[
          {label:"Total",v:stats.total,c:"#818cf8",click:()=>setModal({type:"report"})},
          {label:"OK",v:stats.operational,c:"#4ade80"},
          {label:"Faulty",v:stats.faulty,c:"#f87171"},
          {label:"Maint.",v:stats.maintenance,c:"#fcd34d"},
          {label:"Condemned",v:stats.condemned,c:"#fb923c"},
          {label:"On Loan",v:stats.loaned,c:"#c084fc"},
          {label:"Open Faults",v:stats.openFaults,c:"#f97316"},
          {label:"Warranty ⚠",v:stats.expiringSoon,c:"#facc15"},
          {label:"Warranty ✗",v:stats.warrantyExpired,c:"#ef4444"},
        ].map(s=>(
          <div key={s.label} onClick={s.click} style={{background:"#0d1117",border:"1px solid #1e2432",borderRadius:6,padding:"8px 10px",textAlign:"center",cursor:s.click?"pointer":"default"}}>
            <div style={{fontSize:18,fontWeight:500,color:s.c,fontFamily:"'Space Grotesk',sans-serif",lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:9,color:"#4b5563",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN TABS */}
      <div style={{borderBottom:"1px solid #1e2432",padding:"0 16px",display:"flex",gap:2,flexShrink:0,overflowX:"auto"}}>
        {[["sections","🗺 Sections"],["list","📋 List"],["faults","⚠ Faults"],["loans","🔄 Loans"]].map(([k,l])=>(
          <button key={k} className="tab-btn" onClick={()=>setTab(k)} style={{padding:"8px 14px",fontSize:12,color:tab===k?"#a5b4fc":"#6b7280",borderBottom:tab===k?"2px solid #6366f1":"2px solid transparent"}}>{l}</button>
        ))}
      </div>

      {/* ── CONTENT */}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>
        <div style={{flex:1,overflow:"auto",padding:"14px 16px"}}>
          {tab==="sections" && (
            <SectionsView items={items} sections={sections} activeSection={activeSection} setActiveSection={setActiveSection}
              onSelectItem={i=>{setSelectedItem(i);setDetailTab("details")}}
              onAddItem={loc=>setModal({type:"additem",location:loc})}
              onDragItemStart={onDragItemStart} onDragItemEnd={onDragItemEnd}
              onRoomDragOver={onRoomDragOver} onRoomDrop={onRoomDrop} dragOverRoom={dragOverRoom}
              onRoomCardDragStart={onRoomCardDragStart} onRoomCardDragOver={onRoomCardDragOver} onRoomCardDrop={onRoomCardDrop}
              onMoveItem={item=>setModal({type:"move",item,pendingLocation:null})}
              dragItem={dragItem} dragRoom={dragRoom}
            />
          )}
          {tab==="list" && <ListView items={items} search={search} setSearch={setSearch} filterType={filterType} setFilterType={setFilterType} filterStatus={filterStatus} setFilterStatus={setFilterStatus} onSelectItem={i=>{setSelectedItem(i);setDetailTab("details")}} />}
          {tab==="faults" && <FaultsView items={items} onSelectItem={i=>{setSelectedItem(i);setDetailTab("faults")}} onUpdateFault={updateFault} setLightbox={setLightbox} />}
          {tab==="loans" && <LoansView items={items} onSelectItem={i=>{setSelectedItem(i);setDetailTab("details")}} onReturn={(item)=>setModal({type:"return",item})} onLoanOut={item=>setModal({type:"loanout",item})} />}
        </div>

        {/* ── DETAIL PANEL */}
        {fullSelected && (
          <div className="slide-in" style={{width:"min(360px,100%)",borderLeft:"1px solid #1e2432",overflow:"auto",background:"#0b0f1a",flexShrink:0}}>
            <DetailPanel item={fullSelected} detailTab={detailTab} setDetailTab={setDetailTab}
              onClose={()=>setSelectedItem(null)}
              onUpdate={patch=>updateItem(fullSelected.id,patch)}
              onDelete={()=>deleteItem(fullSelected.id)}
              onAddRepair={r=>addRepair(fullSelected.id,r)}
              onReportFault={()=>setModal({type:"fault",item:fullSelected})}
              onUpdateFault={(fid,patch)=>updateFault(fullSelected.id,fid,patch)}
              onMove={()=>setModal({type:"move",item:fullSelected,pendingLocation:null})}
              onLoanOut={()=>setModal({type:"loanout",item:fullSelected})}
              onReturn={()=>setModal({type:"return",item:fullSelected})}
              setLightbox={setLightbox}
              allLocations={Object.values(sections).flat()}
            />
          </div>
        )}
      </div>

      {/* ── MODALS */}
      {modal?.type==="move" && <MoveModal item={modal.item} pendingLocation={modal.pendingLocation} allLocations={Object.values(sections).flat()} onMove={(loc,reason,by)=>{moveItem(modal.item.id,loc,reason,by);setModal(null)}} onClose={()=>setModal(null)} />}
      {modal?.type==="fault" && <FaultModal item={modal.item} onSubmit={f=>{addFault(modal.item.id,f);setModal(null)}} onClose={()=>setModal(null)} />}
      {modal?.type==="additem" && <AddItemModal location={modal.location} onAdd={i=>{addItem(i);setModal(null)}} onClose={()=>setModal(null)} />}
      {modal?.type==="loanout" && <LoanOutModal item={modal.item} onSubmit={d=>{loanOut(modal.item.id,d);setModal(null)}} onClose={()=>setModal(null)} />}
      {modal?.type==="return" && <ReturnModal item={modal.item} allLocations={Object.values(sections).flat()} onSubmit={d=>{returnItem(modal.item.id,d);setModal(null)}} onClose={()=>setModal(null)} />}
      {modal?.type==="report" && <ReportModal items={items} onClose={()=>setModal(null)} />}
      {modal?.type==="movelog" && <MoveLogModal log={moveLog} onClose={()=>setModal(null)} />}
      {modal?.type==="import" && <ImportModal onImport={newItems=>{newItems.forEach(addItem);setModal(null)}} onClose={()=>setModal(null)} />}
      {modal?.type==="settings" && <SettingsModal sections={sections} onAddSection={addSection} onRenameSection={renameSection} onDeleteSection={deleteSection} onAddRoom={addRoom} onRenameRoom={renameRoom} onDeleteRoom={deleteRoom} onClose={()=>setModal(null)} />}
      {lightbox && <div className="lightbox" onClick={()=>setLightbox(null)}><img src={lightbox} alt=""/></div>}
    </div>
  );
}

// ─── SECTIONS VIEW ────────────────────────────────────────────────────────────
function SectionsView({items,sections,activeSection,setActiveSection,onSelectItem,onAddItem,onDragItemStart,onDragItemEnd,onRoomDragOver,onRoomDrop,dragOverRoom,onRoomCardDragStart,onRoomCardDragOver,onRoomCardDrop,onMoveItem,dragItem,dragRoom}) {
  const rooms = sections[activeSection]||[];
  return (
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        {Object.keys(sections).map(s=>(
          <button key={s} className={`sec-btn${activeSection===s?" active":""}`} onClick={()=>setActiveSection(s)}>{s}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10}}>
        {rooms.map((room,idx)=>{
          const roomItems = items.filter(i=>i.location===room);
          const hasIssue = roomItems.some(i=>i.status==="Faulty");
          const hasMaint = roomItems.some(i=>["Under Maintenance","Waiting for Condemnation"].includes(i.status));
          const openF = roomItems.reduce((n,i)=>n+(i.faults||[]).filter(f=>f.status!=="Resolved").length,0);
          const isDropTarget = dragOverRoom===room;
          const isCardTarget = dragOverRoom===room+"_card";
          return (
            <div key={room} className={`room-card${isDropTarget?" drop-target":""}`}
              style={{background:isDropTarget?"#1a1d2e":"#0d1117",border:`1px solid ${isCardTarget?"#6366f1":hasIssue?"#dc2626":hasMaint?"#f59e0b":"#1e2432"}`,padding:10,cursor:dragRoom?"grab":"default"}}
              draggable onDragStart={e=>onRoomCardDragStart(e,room)} onDragOver={e=>{e.preventDefault();onRoomCardDragOver(e,room)}} onDrop={e=>onRoomCardDrop(e,room,activeSection)}
              onDragOver_item={e=>onRoomDragOver(e,room)} onDrop_item={e=>onRoomDrop(e,room)}
              onDragOver={e=>{onRoomDragOver(e,room);onRoomCardDragOver(e,room);e.preventDefault()}}
              onDrop={e=>{if(dragItem)onRoomDrop(e,room); else if(dragRoom)onRoomCardDrop(e,room,activeSection);}}
            >
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:500,color:"#818cf8",fontFamily:"'Space Grotesk',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}} title={room}>⠿ {room}</div>
                <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                  {openF>0&&<span className="badge" style={{background:"#7f1d1d",color:"#fca5a5",fontSize:9}}>⚠{openF}</span>}
                  <button onClick={()=>onAddItem(room)} style={{background:"#1a1d2e",border:"1px solid #2d3748",color:"#818cf8",width:18,height:18,borderRadius:3,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3,minHeight:24}}>
                {roomItems.length===0&&<div style={{fontSize:10,color:"#1e2432",textAlign:"center",padding:"6px 0"}}>empty</div>}
                {roomItems.map(item=>(
                  <ItemChip key={item.id} item={item} onSelect={()=>onSelectItem(item)} onDragStart={onDragItemStart} onDragEnd={onDragItemEnd} onMove={()=>onMoveItem(item)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemChip({item,onSelect,onDragStart,onDragEnd,onMove}) {
  const s = sc(item.status);
  const openF = (item.faults||[]).filter(f=>f.status!=="Resolved").length;
  return (
    <div className="chip" draggable onDragStart={e=>onDragStart(e,item)} onDragEnd={onDragEnd}
      style={{background:"#080b12",border:`1px solid ${s.border}`,padding:"3px 6px",display:"flex",alignItems:"center",gap:4}}>
      <span style={{fontSize:10,flexShrink:0}}>{itype(item.type)}</span>
      <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={onSelect}>
        <div style={{fontSize:10,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</div>
        <div style={{fontSize:9,color:"#4b5563"}}>{item.brand} {item.model}</div>
      </div>
      {openF>0&&<span style={{fontSize:9,color:"#fca5a5",flexShrink:0}}>⚠{openF}</span>}
      {item.isLoaned&&<span style={{fontSize:9,color:"#c084fc",flexShrink:0}}>📤</span>}
      {isExpired(item.warrantyEnd)&&<span title="Warranty expired" style={{fontSize:9,color:"#ef4444",flexShrink:0}}>W!</span>}
      <button onClick={e=>{e.stopPropagation();onMove()}} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:10,padding:"0 1px",flexShrink:0}} title="Move">⇄</button>
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({items,search,setSearch,filterType,setFilterType,filterStatus,setFilterStatus,onSelectItem}) {
  const types = ["All",...new Set(items.map(i=>i.type).filter(Boolean))].slice(0,20);
  const filtered = items.filter(i=>{
    const q=search.toLowerCase();
    const mq=!q||[i.label,i.brand,i.model,i.serial,i.location,i.assetCode,i.type].some(v=>v?.toLowerCase().includes(q));
    return mq&&(filterType==="All"||i.type===filterType)&&(filterStatus==="All"||i.status===filterStatus);
  });
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <input placeholder="Search label, serial, brand, location..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:180}} />
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{width:130}}>{types.map(t=><option key={t}>{t}</option>)}</select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{width:160}}>
          <option value="All">All Status</option>
          {["Operational","Spare","Waiting for Condemnation","Under Maintenance","Faulty","Others"].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{fontSize:10,color:"#4b5563",marginBottom:6}}>{filtered.length} items</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{borderBottom:"1px solid #1e2432"}}>{["Label","Type","Brand","Model","Serial","Location","Cost","Warranty","Status","Loan"].map(h=><th key={h} style={{padding:"5px 7px",textAlign:"left",color:"#4b5563",fontWeight:400,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(item=>{
            const s=sc(item.status); const openF=(item.faults||[]).filter(f=>f.status!=="Resolved").length;
            return <tr key={item.id} onClick={()=>onSelectItem(item)} style={{borderBottom:"1px solid #0d1117",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#0d1117"} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{padding:"4px 7px",color:"#818cf8"}}>{item.label}{openF>0&&<span style={{color:"#fca5a5",marginLeft:4}}>⚠{openF}</span>}</td>
              <td style={{padding:"4px 7px",color:"#4b5563"}}>{itype(item.type)} {item.type}</td>
              <td style={{padding:"4px 7px"}}>{item.brand}</td>
              <td style={{padding:"4px 7px",color:"#4b5563"}}>{item.model}</td>
              <td style={{padding:"4px 7px",color:"#2d3748",fontFamily:"monospace",fontSize:10}}>{item.serial}</td>
              <td style={{padding:"4px 7px",color:"#9ca3af"}}>{item.location}</td>
              <td style={{padding:"4px 7px",color:"#4ade80"}}>{item.cost?`$${Number(item.cost).toLocaleString()}`:"—"}</td>
              <td style={{padding:"4px 7px",color:isExpired(item.warrantyEnd)?"#ef4444":expiringSoon(item.warrantyEnd)?"#facc15":"#4b5563"}}>{fmtDate(item.warrantyEnd)}</td>
              <td style={{padding:"4px 7px"}}><span className="badge" style={{background:s.badge,color:s.text}}>{item.status}</span></td>
              <td style={{padding:"4px 7px"}}>{item.isLoaned&&<span style={{color:"#c084fc",fontSize:10}}>📤 {item.loanedTo}</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FAULTS VIEW ──────────────────────────────────────────────────────────────
function FaultsView({items,onSelectItem,onUpdateFault,setLightbox}) {
  const [sf,setSf]=useState("Open"); const [sv,setSv]=useState("All");
  const all = items.flatMap(i=>(i.faults||[]).map(f=>({...f,item:i}))).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const filtered = all.filter(f=>(sf==="All"||f.status===sf)&&(sv==="All"||f.severity===sv));
  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        {["All","Open","In Progress","Resolved"].map(s=><button key={s} className="btn" onClick={()=>setSf(s)} style={sf===s?{background:"#1a1d2e",borderColor:"#6366f1",color:"#a5b4fc"}:{}}>{s}</button>)}
        <select value={sv} onChange={e=>setSv(e.target.value)} style={{width:120,marginLeft:"auto"}}>
          <option value="All">All Severity</option>{["Low","Medium","High","Critical"].map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{fontSize:10,color:"#4b5563",marginBottom:6}}>{filtered.length} faults</div>
      {filtered.length===0&&<div style={{textAlign:"center",color:"#2d3748",padding:40,fontSize:13}}>No faults matching filter</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(f=>{
          const sc2=SEV_COLORS[f.severity]||SEV_COLORS.Low;
          return <div key={f.id} style={{background:"#0d1117",border:"1px solid #1e2432",borderRadius:7,padding:"10px 12px"}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                  <span className="badge" style={{background:sc2.bg,color:sc2.text}}>{f.severity}</span>
                  <span style={{fontSize:12,color:"#818cf8",cursor:"pointer"}} onClick={()=>onSelectItem(f.item)}>{f.item.label}</span>
                  <span style={{fontSize:10,color:"#4b5563"}}>@ {f.item.location}</span>
                  <span style={{fontSize:10,color:"#2d3748",marginLeft:"auto"}}>{fmtDate(f.date)}</span>
                </div>
                <div style={{fontSize:12,fontWeight:500,marginBottom:3}}>{f.faultType}</div>
                {f.description&&<div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>{f.description}</div>}
                {f.reportedBy&&<div style={{fontSize:10,color:"#4b5563"}}>By: {f.reportedBy}</div>}
                {f.resolvedBy&&<div style={{fontSize:10,color:"#4ade80",marginTop:2}}>Resolved by: {f.resolvedBy} — {f.resolutionNote}</div>}
                {(f.photos||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{f.photos.map((p,i)=><img key={i} src={p} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:4,cursor:"pointer",border:"1px solid #2d3748"}} onClick={()=>setLightbox(p)} />)}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <select value={f.status} onChange={e=>onUpdateFault(f.item.id,f.id,{status:e.target.value})} style={{width:120,fontSize:10,padding:"3px 6px"}}>
                  <option>Open</option><option>In Progress</option><option>Resolved</option>
                </select>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}

// ─── LOANS VIEW ───────────────────────────────────────────────────────────────
function LoansView({items,onSelectItem,onReturn,onLoanOut}) {
  const [showAll,setShowAll]=useState(false);
  const loaned = items.filter(i=>i.isLoaned);
  const byPerson = {};
  loaned.forEach(i=>{ const p=i.loanedTo||"Unknown"; if(!byPerson[p]) byPerson[p]=[]; byPerson[p].push(i); });
  const sorted = Object.entries(byPerson).sort((a,b)=>a[0].localeCompare(b[0]));
  const loanable = items.filter(i=>i.loanable&&!i.isLoaned);
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"#818cf8"}}>{loaned.length} items on loan across {sorted.length} people</div>
        <button className="btn" onClick={()=>setShowAll(!showAll)} style={{marginLeft:"auto"}}>{showAll?"Hide":"Show"} loanable items ({loanable.length})</button>
      </div>
      {showAll&&(
        <div style={{marginBottom:16,background:"#0d1117",border:"1px solid #1e2432",borderRadius:8,padding:12}}>
          <div style={{fontSize:11,color:"#818cf8",marginBottom:8}}>Available loanable items</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {loanable.map(i=>(
              <div key={i.id} style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:4,padding:"4px 8px",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10}}>{itype(i.type)}</span>
                <span style={{fontSize:11,color:"#e2e8f0",cursor:"pointer"}} onClick={()=>onSelectItem(i)}>{i.label}</span>
                <span style={{fontSize:10,color:"#4b5563"}}>{i.location}</span>
                <button className="btn" onClick={()=>onLoanOut(i)} style={{padding:"2px 6px",fontSize:10}}>Loan</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
        {sorted.map(([person,pitems])=>{
          const isJeff = person==="Jeff (Custody)";
          return (
            <div key={person} style={{background:"#0d1117",border:`1px solid ${isJeff?"#6366f1":"#1e2432"}`,borderRadius:8,padding:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:isJeff?"#1e2240":"#1a1d2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#818cf8",fontWeight:500,flexShrink:0}}>
                  {person.slice(0,2).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:500,color:isJeff?"#818cf8":"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{person}</div>
                  <div style={{fontSize:9,color:"#4b5563"}}>{pitems.length} item{pitems.length!==1?"s":""}{isJeff?" (custody)":""}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {pitems.map(item=>(
                  <div key={item.id} style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:4,padding:"3px 7px",display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:10,flexShrink:0}}>{itype(item.type)}</span>
                    <span style={{fontSize:10,color:"#e2e8f0",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}} onClick={()=>onSelectItem(item)}>{item.label}</span>
                    <button onClick={()=>onReturn(item)} style={{background:"none",border:"none",cursor:"pointer",color:"#4ade80",fontSize:9,flexShrink:0}} title="Return">↩</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function DetailPanel({item,detailTab,setDetailTab,onClose,onUpdate,onDelete,onAddRepair,onReportFault,onUpdateFault,onMove,onLoanOut,onReturn,setLightbox,allLocations}) {
  const [editing,setEditing]=useState(false);
  const [ed,setEd]=useState({});
  const [repairForm,setRepairForm]=useState({description:"",technician:"",costRepair:"",startDate:"",completeDate:"",notes:""});
  const [showRepair,setShowRepair]=useState(false);
  const s=sc(item.status);
  const openF=(item.faults||[]).filter(f=>f.status!=="Resolved").length;

  return (
    <div style={{padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:600,color:"#818cf8"}}>{item.label}</div>
          <div style={{fontSize:10,color:"#4b5563",marginTop:2}}>{item.brand} {item.model}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:20,lineHeight:1}}>×</button>
      </div>

      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
        <span className="badge" style={{background:s.badge,color:s.text}}>{item.status}</span>
        {openF>0&&<span className="badge" style={{background:"#7f1d1d",color:"#fca5a5"}}>⚠ {openF} fault{openF>1?"s":""}</span>}
        {item.isLoaned&&<span className="badge" style={{background:"#4a1d96",color:"#c084fc"}}>📤 {item.loanedTo}</span>}
        {item.assetCode&&<span className="badge" style={{background:"#1e2432",color:"#6b7280"}}>#{item.assetCode}</span>}
      </div>

      <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
        <button className="btn" style={{fontSize:10,background:"#4c1d95",borderColor:"#7c3aed",color:"#c4b5fd"}} onClick={onReportFault}>⚠ Report Fault</button>
        <button className="btn" style={{fontSize:10}} onClick={onMove}>⇄ Move</button>
        {item.loanable&&!item.isLoaned&&<button className="btn" style={{fontSize:10,background:"#064e3b",borderColor:"#059669",color:"#6ee7b7"}} onClick={onLoanOut}>📤 Loan Out</button>}
        {item.isLoaned&&<button className="btn" style={{fontSize:10,background:"#1e3a5f",borderColor:"#3b82f6",color:"#93c5fd"}} onClick={onReturn}>↩ Return</button>}
      </div>

      <div style={{display:"flex",gap:3,marginBottom:10,borderBottom:"1px solid #1e2432",paddingBottom:8}}>
        {[["details","Details"],["faults",`Faults${openF>0?" ("+openF+")":""}`],["repairs","Repairs"],["history","History"]].map(([k,l])=>(
          <button key={k} className="tab-btn" onClick={()=>setDetailTab(k)} style={{padding:"3px 9px",fontSize:10,borderRadius:4,background:detailTab===k?"#1a1d2e":"none",color:detailTab===k?"#a5b4fc":"#4b5563",border:detailTab===k?"1px solid #2d3748":"1px solid transparent"}}>{l}</button>
        ))}
      </div>

      {detailTab==="details"&&(
        editing?(
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {[["label","Label"],["assetCode","Asset Code"],["brand","Brand"],["model","Model"],["serial","Serial No."],["location","Location"],["cost","Cost ($)"]].map(([k,l])=>(
              <div key={k}><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>{l}</label>
                {k==="location"?<select value={ed[k]||""} onChange={e=>setEd(d=>({...d,[k]:e.target.value}))}>{allLocations.map(l=><option key={l}>{l}</option>)}</select>:<input value={ed[k]||""} onChange={e=>setEd(d=>({...d,[k]:e.target.value}))} />}
              </div>
            ))}
            <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>Warranty End</label><input type="date" value={ed.warrantyEnd||""} onChange={e=>setEd(d=>({...d,warrantyEnd:e.target.value}))} /></div>
            <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>Type</label>
              <select value={ed.type||""} onChange={e=>setEd(d=>({...d,type:e.target.value}))}>
                {Object.keys(TYPE_ICON).filter(k=>k!=="default").map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>Status</label>
              <select value={ed.status||""} onChange={e=>setEd(d=>({...d,status:e.target.value}))}>
                {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
              </select>
              {ed.status==="Others"&&<input placeholder="Describe status..." value={ed.statusNote||""} onChange={e=>setEd(d=>({...d,statusNote:e.target.value}))} style={{marginTop:4}} />}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <label style={{fontSize:10,color:"#4b5563",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                <input type="checkbox" checked={!!ed.loanable} onChange={e=>setEd(d=>({...d,loanable:e.target.checked}))} style={{width:"auto"}} /> Loanable item
              </label>
            </div>
            <RemarkCommentFields remark={ed.remark||""} comment={ed.comment||""} onChange={(k,v)=>setEd(d=>({...d,[k]:v}))} />
            <div style={{display:"flex",gap:6}}>
              <button className="btn btn-primary" onClick={()=>{onUpdate(ed);setEditing(false)}} style={{flex:1}}>Save</button>
              <button className="btn" onClick={()=>setEditing(false)}>Cancel</button>
            </div>
          </div>
        ):(
          <div>
            <div style={{display:"grid",gap:4,marginBottom:10}}>
              {[["Asset Code",item.assetCode||"—"],["Type",`${itype(item.type)} ${item.type}`],["Location",item.location],["Serial",item.serial],["Cost",item.cost?`$${Number(item.cost).toLocaleString()}`:"—"],
                ["Warranty",item.warrantyEnd?<span style={{color:isExpired(item.warrantyEnd)?"#ef4444":expiringSoon(item.warrantyEnd)?"#facc15":"#4ade80"}}>{fmtDate(item.warrantyEnd)}{isExpired(item.warrantyEnd)?" ✗":expiringSoon(item.warrantyEnd)?" ⚠":""}</span>:"—"],
                ["Loanable",item.loanable?"Yes ✓":"No"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #0d1117",fontSize:11}}>
                  <span style={{color:"#4b5563"}}>{k}</span>
                  <span style={{color:"#e2e8f0",textAlign:"right",maxWidth:"60%",wordBreak:"break-all"}}>{v||"—"}</span>
                </div>
              ))}
            </div>
            {item.statusNote&&<div style={{fontSize:11,color:"#6b7280",marginBottom:8}}>Status note: {item.statusNote}</div>}
            <RemarkCommentDisplay remark={item.remark} comment={item.comment} />
            <div style={{display:"flex",gap:6,marginTop:10}}>
              <button className="btn" onClick={()=>{setEd({...item});setEditing(true)}} style={{flex:1}}>✏ Edit</button>
              <button className="btn btn-danger" onClick={()=>{if(confirm("Delete this item?"))onDelete()}} style={{fontSize:11}}>🗑</button>
            </div>
          </div>
        )
      )}

      {detailTab==="faults"&&(
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {(item.faults||[]).length===0&&<div style={{color:"#2d3748",fontSize:12,textAlign:"center",padding:20}}>No fault records</div>}
          {(item.faults||[]).map(f=>{
            const sc2=SEV_COLORS[f.severity]||SEV_COLORS.Low;
            return <div key={f.id} style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:5,padding:9}}>
              <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                <span className="badge" style={{background:sc2.bg,color:sc2.text,fontSize:9}}>{f.severity}</span>
                <span style={{fontSize:11,fontWeight:500}}>{f.faultType}</span>
                <span style={{fontSize:9,color:"#2d3748",marginLeft:"auto"}}>{fmtDate(f.date)}</span>
              </div>
              {f.description&&<div style={{fontSize:11,color:"#9ca3af",marginBottom:3}}>{f.description}</div>}
              {f.reportedBy&&<div style={{fontSize:10,color:"#4b5563",marginBottom:3}}>By: {f.reportedBy}</div>}
              {f.resolvedBy&&<div style={{fontSize:10,color:"#4ade80",marginBottom:3}}>Resolved by {f.resolvedBy}: {f.resolutionNote}</div>}
              {(f.photos||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:5}}>{f.photos.map((p,i)=><img key={i} src={p} alt="" style={{width:48,height:48,objectFit:"cover",borderRadius:3,cursor:"pointer",border:"1px solid #2d3748"}} onClick={()=>setLightbox(p)} />)}</div>}
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4}}>
                <select value={f.status} onChange={e=>{
                  if(e.target.value==="Resolved") { const by=prompt("Resolved by (name):"); const note=prompt("Resolution note:"); onUpdateFault(f.id,{status:"Resolved",resolvedBy:by||"",resolutionNote:note||""}); }
                  else onUpdateFault(f.id,{status:e.target.value});
                }} style={{fontSize:10,padding:"2px 5px",width:"auto"}}>
                  <option>Open</option><option>In Progress</option><option>Resolved</option>
                </select>
                <span style={{fontSize:9,color:"#374151"}}>{f.status}</span>
              </div>
            </div>;
          })}
        </div>
      )}

      {detailTab==="repairs"&&(
        <div>
          <button className="btn" onClick={()=>setShowRepair(!showRepair)} style={{width:"100%",marginBottom:8,fontSize:11}}>+ Log Repair</button>
          {showRepair&&(
            <div style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:5,padding:9,marginBottom:9,display:"flex",flexDirection:"column",gap:6}}>
              <input placeholder="Description *" value={repairForm.description} onChange={e=>setRepairForm(f=>({...f,description:e.target.value}))} />
              <input placeholder="Technician" value={repairForm.technician} onChange={e=>setRepairForm(f=>({...f,technician:e.target.value}))} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <div><label style={{fontSize:9,color:"#4b5563"}}>Start Date</label><input type="date" value={repairForm.startDate} onChange={e=>setRepairForm(f=>({...f,startDate:e.target.value}))} /></div>
                <div><label style={{fontSize:9,color:"#4b5563"}}>Complete Date</label><input type="date" value={repairForm.completeDate} onChange={e=>setRepairForm(f=>({...f,completeDate:e.target.value}))} /></div>
              </div>
              <input placeholder="Cost ($)" type="number" value={repairForm.costRepair} onChange={e=>setRepairForm(f=>({...f,costRepair:e.target.value}))} />
              <textarea placeholder="Notes" rows={2} value={repairForm.notes} onChange={e=>setRepairForm(f=>({...f,notes:e.target.value}))} />
              <button className="btn btn-primary" onClick={()=>{ if(!repairForm.description) return; onAddRepair(repairForm); setRepairForm({description:"",technician:"",costRepair:"",startDate:"",completeDate:"",notes:""}); setShowRepair(false); }} style={{fontSize:11}}>Save Repair</button>
            </div>
          )}
          {(item.repairs||[]).length===0&&<div style={{color:"#2d3748",fontSize:12,textAlign:"center",padding:20}}>No repair records</div>}
          {(item.repairs||[]).map(r=>(
            <div key={r.id} style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:5,padding:9,marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:11,fontWeight:500}}>{r.description}</span>
                <span style={{fontSize:9,color:"#2d3748"}}>{fmtDate(r.loggedDate)}</span>
              </div>
              {r.technician&&<div style={{fontSize:10,color:"#4b5563"}}>Tech: {r.technician}</div>}
              {r.startDate&&<div style={{fontSize:10,color:"#6b7280"}}>Start: {fmtDate(r.startDate)}{r.completeDate?` → ${fmtDate(r.completeDate)}`:""}</div>}
              {r.costRepair&&<div style={{fontSize:10,color:"#4ade80"}}>Cost: ${r.costRepair}</div>}
              {r.notes&&<div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>{r.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {detailTab==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:10,color:"#818cf8",marginBottom:4}}>Movement Log</div>
          {(item.moveLog||[]).length===0&&<div style={{color:"#2d3748",fontSize:11,textAlign:"center",padding:16}}>No movements recorded</div>}
          {(item.moveLog||[]).map(m=>(
            <div key={m.id} style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:5,padding:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:11,color:"#9ca3af"}}>{m.from} → {m.to}</span>
                <span style={{fontSize:9,color:"#2d3748"}}>{fmtDate(m.date)}</span>
              </div>
              <div style={{fontSize:10,color:"#6b7280"}}>Reason: {m.reason}</div>
              {m.movedBy&&<div style={{fontSize:10,color:"#4b5563"}}>By: {m.movedBy}</div>}
            </div>
          ))}
          <div style={{fontSize:10,color:"#818cf8",marginTop:8,marginBottom:4}}>Loan History</div>
          {(item.loanHistory||[]).length===0&&<div style={{color:"#2d3748",fontSize:11,textAlign:"center",padding:16}}>No loan records</div>}
          {(item.loanHistory||[]).map(l=>(
            <div key={l.id} style={{background:"#080b12",border:`1px solid ${l.status==="Active"?"#6366f1":"#1e2432"}`,borderRadius:5,padding:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:11,color:l.status==="Active"?"#818cf8":"#9ca3af"}}>{l.borrowerName}</span>
                <span className="badge" style={{background:l.status==="Active"?"#312e81":"#1e2432",color:l.status==="Active"?"#a5b4fc":"#6b7280",fontSize:9}}>{l.status}</span>
              </div>
              <div style={{fontSize:10,color:"#6b7280"}}>Out: {fmtDate(l.dateOut)}{l.dateIn?` · Returned: ${fmtDate(l.dateIn)}`:""}</div>
              {l.expectedReturn&&<div style={{fontSize:10,color:"#4b5563"}}>Expected return: {fmtDate(l.expectedReturn)}</div>}
              {l.signature&&<div style={{fontSize:10,color:"#4ade80",marginTop:2}}>✓ Signed</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemarkCommentDisplay({remark,comment}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
      <div>
        <div style={{fontSize:9,color:"#4b5563",marginBottom:2}}>REMARK (item info)</div>
        <div style={{fontSize:11,color:"#9ca3af",background:"#080b12",border:"1px solid #1e2432",borderRadius:4,padding:"5px 8px",minHeight:28}}>{remark||<span style={{color:"#2d3748"}}>—</span>}</div>
      </div>
      <div>
        <div style={{fontSize:9,color:"#4b5563",marginBottom:2}}>COMMENT (admin note)</div>
        <div style={{fontSize:11,color:"#9ca3af",background:"#080b12",border:"1px solid #1e2432",borderRadius:4,padding:"5px 8px",minHeight:28}}>{comment||<span style={{color:"#2d3748"}}>—</span>}</div>
      </div>
    </div>
  );
}

function RemarkCommentFields({remark,comment,onChange}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
          <label style={{fontSize:10,color:"#4b5563"}}>Remark (item info)</label>
          <span style={{fontSize:9,color:remark.length>270?"#ef4444":"#4b5563"}}>{remark.length}/300</span>
        </div>
        <textarea rows={2} maxLength={300} value={remark} onChange={e=>onChange("remark",clamp(e.target.value,300))} placeholder="Additional info about this item..." />
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
          <label style={{fontSize:10,color:"#4b5563"}}>Comment (admin note)</label>
          <span style={{fontSize:9,color:comment.length>270?"#ef4444":"#4b5563"}}>{comment.length}/300</span>
        </div>
        <textarea rows={2} maxLength={300} value={comment} onChange={e=>onChange("comment",clamp(e.target.value,300))} placeholder="Admin observations about this item..." />
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function MoveModal({item,pendingLocation,allLocations,onMove,onClose}) {
  const [loc,setLoc]=useState(pendingLocation||item.location);
  const [reason,setReason]=useState("");
  const [by,setBy]=useState("");
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8",marginBottom:12}}>Move — {item.label}</div>
        <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>From: <span style={{color:"#9ca3af"}}>{item.location}</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>New Location *</label>
            <select value={loc} onChange={e=>setLoc(e.target.value)}>{allLocations.map(l=><option key={l}>{l}</option>)}</select>
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Reason for Move *</label>
            <textarea rows={2} placeholder="e.g. Lamp fault, event relocation..." value={reason} onChange={e=>setReason(e.target.value)} />
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Moved By</label>
            <input placeholder="Your name" value={by} onChange={e=>setBy(e.target.value)} />
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={()=>{ if(!reason.trim()){alert("Please enter a reason.");return;} if(loc===item.location) return onClose(); onMove(loc,reason,by); }}>Confirm Move</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaultModal({item,onSubmit,onClose}) {
  const [form,setForm]=useState({faultType:FAULT_TYPES[0],severity:"Medium",description:"",reportedBy:"",photos:[]});
  const fileRef=useRef();
  const handleFiles=files=>Array.from(files).forEach(f=>{const r=new FileReader();r.onload=e=>setForm(p=>({...p,photos:[...p.photos,e.target.result]}));r.readAsDataURL(f);});
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8",marginBottom:12}}>Report Fault — {item.label}</div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Fault Type</label>
            <select value={form.faultType} onChange={e=>setForm(f=>({...f,faultType:e.target.value}))}>{FAULT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Severity</label>
            <div style={{display:"flex",gap:5}}>
              {["Low","Medium","High","Critical"].map(s=>{const sc2=SEV_COLORS[s]; return <button key={s} onClick={()=>setForm(f=>({...f,severity:s}))} style={{flex:1,padding:"5px 3px",border:`1px solid ${form.severity===s?sc2.text:"#2d3748"}`,borderRadius:4,cursor:"pointer",background:form.severity===s?sc2.bg:"#080b12",color:form.severity===s?sc2.text:"#4b5563",fontSize:10,fontFamily:"inherit"}}>{s}</button>;})}
            </div>
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Description</label>
            <textarea rows={3} placeholder="Describe the fault..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Reported By</label>
            <input placeholder="Your name" value={form.reportedBy} onChange={e=>setForm(f=>({...f,reportedBy:e.target.value}))} />
          </div>
          <div>
            <label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Photos</label>
            <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}} onClick={()=>fileRef.current.click()} style={{border:"1px dashed #2d3748",borderRadius:5,padding:10,textAlign:"center",cursor:"pointer",fontSize:11,color:"#4b5563"}}>
              Tap to capture / browse / drag photos here
              <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} />
            </div>
            {form.photos.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
              {form.photos.map((p,i)=><div key={i} style={{position:"relative"}}><img src={p} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:4,border:"1px solid #2d3748"}} /><button onClick={()=>setForm(f=>({...f,photos:f.photos.filter((_,j)=>j!==i)}))} style={{position:"absolute",top:-4,right:-4,background:"#ef4444",border:"none",borderRadius:"50%",width:14,height:14,cursor:"pointer",color:"white",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>)}
              <div onClick={()=>fileRef.current.click()} style={{width:52,height:52,border:"1px dashed #2d3748",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#4b5563",fontSize:18}}>+</div>
            </div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={()=>onSubmit(form)}>Submit Report</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoanOutModal({item,onSubmit,onClose}) {
  const [form,setForm]=useState({borrowerName:"",borrowerId:"",issuedBy:"",expectedReturn:"",notes:""});
  const sigRef=useRef(); const [drawing,setDrawing]=useState(false); const [hasSig,setHasSig]=useState(false);
  useEffect(()=>{ const c=sigRef.current; if(!c) return; const ctx=c.getContext("2d"); ctx.fillStyle="#080b12"; ctx.fillRect(0,0,c.width,c.height); },[]);
  const startDraw=e=>{ setDrawing(true); const c=sigRef.current; const r=c.getBoundingClientRect(); const ctx=c.getContext("2d"); ctx.beginPath(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; ctx.moveTo(x,y); };
  const draw=e=>{ if(!drawing) return; const c=sigRef.current; const r=c.getBoundingClientRect(); const ctx=c.getContext("2d"); ctx.strokeStyle="#818cf8"; ctx.lineWidth=2; ctx.lineCap="round"; const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; ctx.lineTo(x,y); ctx.stroke(); setHasSig(true); };
  const endDraw=()=>setDrawing(false);
  const clearSig=()=>{ const c=sigRef.current; const ctx=c.getContext("2d"); ctx.fillStyle="#080b12"; ctx.fillRect(0,0,c.width,c.height); setHasSig(false); };
  const submit=()=>{
    if(!form.borrowerName) return alert("Borrower name required.");
    const sig=hasSig?sigRef.current.toDataURL():null;
    onSubmit({...form,signature:sig});
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8",marginBottom:12}}>Loan Out — {item.label}</div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Borrower Name *</label><input placeholder="Name" value={form.borrowerName} onChange={e=>setForm(f=>({...f,borrowerName:e.target.value}))} /></div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Borrower ID / Contact</label><input placeholder="Staff ID / phone" value={form.borrowerId} onChange={e=>setForm(f=>({...f,borrowerId:e.target.value}))} /></div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Issued By</label><input placeholder="Your name" value={form.issuedBy} onChange={e=>setForm(f=>({...f,issuedBy:e.target.value}))} /></div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Expected Return Date</label><input type="date" value={form.expectedReturn} onChange={e=>setForm(f=>({...f,expectedReturn:e.target.value}))} /></div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Notes</label><textarea rows={2} placeholder="Any notes..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <label style={{fontSize:10,color:"#4b5563"}}>Borrower Signature</label>
              <button onClick={clearSig} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:10}}>Clear</button>
            </div>
            <canvas ref={sigRef} width={440} height={100} style={{border:"1px solid #2d3748",borderRadius:5,width:"100%",height:90,touchAction:"none",cursor:"crosshair"}}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={e=>{e.preventDefault();startDraw(e)}} onTouchMove={e=>{e.preventDefault();draw(e)}} onTouchEnd={endDraw} />
            <div style={{fontSize:9,color:"#2d3748",marginTop:2}}>Sign above with mouse or finger</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={submit}>Confirm Loan Out</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReturnModal({item,allLocations,onSubmit,onClose}) {
  const [form,setForm]=useState({returnLocation:"Spare",condition:"Good",returnedBy:"",notes:""});
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8",marginBottom:12}}>Return — {item.label}</div>
        <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Currently with: <span style={{color:"#9ca3af"}}>{item.loanedTo}</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Return to Location</label>
            <select value={form.returnLocation} onChange={e=>setForm(f=>({...f,returnLocation:e.target.value}))}>
              {allLocations.map(l=><option key={l}>{l}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Condition on Return</label>
            <select value={form.condition} onChange={e=>setForm(f=>({...f,condition:e.target.value}))}>
              {["Good","Fair","Damaged","Missing Parts"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Received By</label><input placeholder="Your name" value={form.returnedBy} onChange={e=>setForm(f=>({...f,returnedBy:e.target.value}))} /></div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:3}}>Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={()=>onSubmit(form)}>Confirm Return</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportModal({items,onClose}) {
  const byType={}, byBrand={}, byStatus={};
  items.forEach(i=>{
    byType[i.type]=(byType[i.type]||0)+1;
    byBrand[i.brand||"Unknown"]=(byBrand[i.brand||"Unknown"]||0)+1;
    byStatus[i.status]=(byStatus[i.status]||0)+1;
  });
  const expired = items.filter(i=>isExpired(i.warrantyEnd));
  const printReport = () => {
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>Damai IMS Report</title><style>body{font-family:monospace;padding:20px;color:#000}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px}th{background:#f0f0f0}h2{margin-top:20px}@media print{button{display:none}}</style></head><body>`);
    w.document.write(`<h1>Damai IMS — Inventory Report</h1><p>Generated: ${new Date().toLocaleString("en-SG")}</p><p>Total items: ${items.length}</p>`);
    w.document.write(`<h2>By Type</h2><table><tr><th>Type</th><th>Count</th></tr>${Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>`);
    w.document.write(`<h2>By Brand</h2><table><tr><th>Brand</th><th>Count</th></tr>${Object.entries(byBrand).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>`);
    w.document.write(`<h2>By Status</h2><table><tr><th>Status</th><th>Count</th></tr>${Object.entries(byStatus).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>`);
    w.document.write(`<h2>Warranty Expired (${expired.length})</h2><table><tr><th>Label</th><th>Brand</th><th>Model</th><th>Location</th><th>Expired</th></tr>${expired.map(i=>`<tr><td>${i.label}</td><td>${i.brand}</td><td>${i.model}</td><td>${i.location}</td><td>${fmtDate(i.warrantyEnd)}</td></tr>`).join("")}</table>`);
    w.document.write(`<br><button onclick="window.print()">Print</button></body></html>`);
    w.document.close();
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{width:"min(600px,100%)"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,alignItems:"center"}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8"}}>Inventory Report</div>
          <div style={{display:"flex",gap:6}}>
            <button className="btn" onClick={printReport}>🖨 Print</button>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:20}}>×</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[["Total Items",items.length,"#818cf8"],["Operational",items.filter(i=>i.status==="Operational").length,"#4ade80"],["On Loan",items.filter(i=>i.isLoaned).length,"#c084fc"],["Warranty Expired",expired.length,"#ef4444"],["Open Faults",items.reduce((n,i)=>n+(i.faults||[]).filter(f=>f.status!=="Resolved").length,0),"#f97316"],["Condemned",items.filter(i=>i.status==="Waiting for Condemnation").length,"#fb923c"]].map(([l,v,c])=>(
            <div key={l} style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:6,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:500,color:c,fontFamily:"'Space Grotesk',sans-serif"}}>{v}</div>
              <div style={{fontSize:9,color:"#4b5563",marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div>
            <div style={{fontSize:11,color:"#818cf8",marginBottom:6}}>By Type</div>
            {Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #0d1117",fontSize:11}}>
                <span style={{color:"#9ca3af"}}>{itype(k)} {k}</span><span style={{color:"#e2e8f0"}}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:11,color:"#818cf8",marginBottom:6}}>By Brand</div>
            {Object.entries(byBrand).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #0d1117",fontSize:11}}>
                <span style={{color:"#9ca3af"}}>{k}</span><span style={{color:"#e2e8f0"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        {expired.length>0&&(
          <div style={{marginTop:14}}>
            <div style={{fontSize:11,color:"#ef4444",marginBottom:6}}>Warranty Expired ({expired.length})</div>
            <div style={{maxHeight:140,overflow:"auto",display:"flex",flexDirection:"column",gap:3}}>
              {expired.map(i=>(
                <div key={i.id} style={{display:"flex",gap:8,fontSize:10,padding:"2px 0",borderBottom:"1px solid #0d1117"}}>
                  <span style={{color:"#818cf8",minWidth:80}}>{i.label}</span>
                  <span style={{color:"#9ca3af",flex:1}}>{i.brand} {i.model}</span>
                  <span style={{color:"#6b7280"}}>{i.location}</span>
                  <span style={{color:"#ef4444"}}>{fmtDate(i.warrantyEnd)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MoveLogModal({log,onClose}) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8"}}>Movement Log</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:20}}>×</button>
        </div>
        {log.length===0&&<div style={{color:"#2d3748",textAlign:"center",padding:24,fontSize:12}}>No movements yet</div>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {log.map(l=>(
            <div key={l.id} style={{background:"#080b12",border:"1px solid #1e2432",borderRadius:5,padding:9}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:12,color:"#818cf8"}}>{l.itemLabel}</span>
                <span style={{fontSize:10,color:"#2d3748"}}>{fmtDate(l.date)}</span>
              </div>
              <div style={{fontSize:11,color:"#9ca3af"}}>{l.from} → {l.to}</div>
              <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Reason: {l.reason}</div>
              {l.movedBy&&<div style={{fontSize:10,color:"#4b5563"}}>By: {l.movedBy}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddItemModal({location,onAdd,onClose}) {
  const [form,setForm]=useState({label:"",assetCode:"",type:"Projector",brand:"",model:"",serial:"",location,cost:"",warrantyEnd:"",status:"Operational",loanable:false,remark:"",comment:"",statusNote:""});
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8",marginBottom:12}}>Add Equipment — {location}</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {[["label","Label *"],["assetCode","Asset Code"],["brand","Brand"],["model","Model"],["serial","Serial Number"],["cost","Cost ($)"]].map(([k,l])=>(
            <div key={k}><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>{l}</label><input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
          ))}
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>Type</label>
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              {Object.keys(TYPE_ICON).filter(k=>k!=="default").map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>Warranty End</label><input type="date" value={form.warrantyEnd} onChange={e=>setForm(f=>({...f,warrantyEnd:e.target.value}))} /></div>
          <div><label style={{fontSize:10,color:"#4b5563",display:"block",marginBottom:2}}>Status</label>
            <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
            </select>
            {form.status==="Others"&&<input placeholder="Describe..." value={form.statusNote} onChange={e=>setForm(f=>({...f,statusNote:e.target.value}))} style={{marginTop:4}} />}
          </div>
          <label style={{fontSize:10,color:"#4b5563",display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
            <input type="checkbox" checked={form.loanable} onChange={e=>setForm(f=>({...f,loanable:e.target.checked}))} style={{width:"auto"}} /> Loanable item
          </label>
          <RemarkCommentFields remark={form.remark} comment={form.comment} onChange={(k,v)=>setForm(f=>({...f,[k]:v}))} />
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={()=>{ if(!form.label.trim()) return; onAdd(form); }}>Add Item</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportModal({onImport,onClose}) {
  const [preview,setPreview]=useState([]); const [err,setErr]=useState("");
  const handle=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ try { const lines=ev.target.result.split("\n").filter(Boolean); const hdrs=lines[0].split(",").map(h=>h.replace(/"/g,"").trim().toLowerCase()); const rows=lines.slice(1).map(line=>{ const v=line.split(",").map(x=>x.replace(/"/g,"").trim()); const o={}; hdrs.forEach((h,i)=>o[h]=v[i]||""); return {label:o.label||o.name||"",assetCode:o["asset code"]||o.assetcode||"",type:o.type||"Projector",brand:o.brand||"",model:o.model||"",serial:o.serial||o["serial number"]||"",location:o.location||"Spare",cost:o.cost||"0",warrantyEnd:o["warranty end"]||o.warrantyend||"",status:o.status||"Operational",loanable:o.loanable==="Yes",remark:o.remark||"",comment:o.comment||"",isLoaned:false,loanedTo:"",moveLog:[],loanHistory:[],faults:[],repairs:[]}; }).filter(i=>i.label); setPreview(rows); setErr(""); } catch { setErr("Failed to parse. Check CSV format."); } }; r.readAsText(f); };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8",marginBottom:8}}>Bulk Import CSV</div>
        <div style={{fontSize:10,color:"#4b5563",marginBottom:10}}>Headers: label, assetCode, type, brand, model, serial, location, cost, warrantyEnd, status, loanable, remark, comment</div>
        <input type="file" accept=".csv" onChange={handle} style={{marginBottom:10}} />
        {err&&<div style={{color:"#fca5a5",fontSize:11,marginBottom:8}}>{err}</div>}
        {preview.length>0&&<div>
          <div style={{fontSize:11,color:"#4ade80",marginBottom:6}}>{preview.length} items ready</div>
          <div style={{maxHeight:150,overflow:"auto",marginBottom:10}}>
            {preview.slice(0,8).map((i,idx)=><div key={idx} style={{fontSize:10,color:"#9ca3af",padding:"2px 0"}}>{i.label} — {i.brand} {i.model} @ {i.location}</div>)}
            {preview.length>8&&<div style={{fontSize:10,color:"#4b5563"}}>...+{preview.length-8} more</div>}
          </div>
          <button className="btn btn-primary" style={{width:"100%",marginBottom:6}} onClick={()=>onImport(preview)}>Import {preview.length} Items</button>
        </div>}
        <button className="btn" onClick={onClose} style={{width:"100%"}}>Cancel</button>
      </div>
    </div>
  );
}

function SettingsModal({sections,onAddSection,onRenameSection,onDeleteSection,onAddRoom,onRenameRoom,onDeleteRoom,onClose}) {
  const [selSec,setSelSec]=useState(Object.keys(sections)[0]||"");
  const [newSec,setNewSec]=useState(""); const [newRoom,setNewRoom]=useState("");
  const [editSecName,setEditSecName]=useState("");
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{width:"min(560px,100%)"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:"#818cf8"}}>Manage Sections & Rooms</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:20}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:12,minHeight:300}}>
          <div>
            <div style={{fontSize:10,color:"#4b5563",marginBottom:6}}>SECTIONS</div>
            {Object.keys(sections).map(s=>(
              <div key={s} onClick={()=>setSelSec(s)} style={{padding:"5px 8px",borderRadius:4,cursor:"pointer",fontSize:11,marginBottom:3,background:selSec===s?"#1a1d2e":"transparent",color:selSec===s?"#a5b4fc":"#9ca3af",border:`1px solid ${selSec===s?"#374151":"transparent"}`}}>{s}</div>
            ))}
            <div style={{marginTop:8,display:"flex",gap:5}}>
              <input placeholder="New section..." value={newSec} onChange={e=>setNewSec(e.target.value)} style={{fontSize:10}} />
              <button className="btn" onClick={()=>{if(newSec){onAddSection(newSec);setNewSec("");}}} style={{padding:"4px 8px",whiteSpace:"nowrap"}}>+</button>
            </div>
          </div>
          <div>
            {selSec&&<>
              <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
                <input value={editSecName||selSec} onChange={e=>setEditSecName(e.target.value)} style={{fontSize:11,flex:1}} />
                <button className="btn" onClick={()=>{if(editSecName&&editSecName!==selSec){onRenameSection(selSec,editSecName);setSelSec(editSecName);setEditSecName("");}}} style={{padding:"4px 8px"}}>Rename</button>
                {selSec!==CONDEMNED_SECTION&&<button className="btn btn-danger" onClick={()=>{if(confirm(`Delete section "${selSec}"?`)){onDeleteSection(selSec);setSelSec(Object.keys(sections)[0]);}}} style={{padding:"4px 8px"}}>Del</button>}
              </div>
              <div style={{fontSize:10,color:"#4b5563",marginBottom:6}}>ROOMS IN {selSec}</div>
              <div style={{maxHeight:200,overflow:"auto",display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
                {(sections[selSec]||[]).map(room=>(
                  <div key={room} style={{display:"flex",gap:5,alignItems:"center"}}>
                    <input defaultValue={room} style={{fontSize:10,flex:1}} onBlur={e=>{if(e.target.value&&e.target.value!==room)onRenameRoom(selSec,room,e.target.value)}} />
                    <button className="btn btn-danger" onClick={()=>{if(confirm(`Remove room "${room}"?`))onDeleteRoom(selSec,room);}} style={{padding:"3px 6px",fontSize:10}}>×</button>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:5}}>
                <input placeholder="New room name..." value={newRoom} onChange={e=>setNewRoom(e.target.value)} style={{fontSize:10,flex:1}} onKeyDown={e=>{if(e.key==="Enter"&&newRoom){onAddRoom(selSec,newRoom);setNewRoom("");}}} />
                <button className="btn btn-primary" onClick={()=>{if(newRoom){onAddRoom(selSec,newRoom);setNewRoom("");}}} style={{padding:"4px 8px"}}>Add Room</button>
              </div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
