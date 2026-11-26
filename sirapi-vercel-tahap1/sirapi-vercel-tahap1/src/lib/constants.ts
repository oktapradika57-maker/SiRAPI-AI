export interface NopConfig {
  spreadsheet_id: string;
  clusters: string[];
  names: string[];
}

export const SHEETS = {
  REQUEST: "Form Request dana",
  PJB: "Form PJB",
  UM: "Data UM",
  DISTRIBUSI: "Distribusi UM",
  APP: "Approval BBM",
  TIKET_PM: "PM Tiketing",
  MASTER_TIM: "Master Tim",
  MASTER_KMRH: "Master KM RH",
  REKAP_PJB: "Rekap PJB",
} as const;

export const CUTOFF_DATE_ISO = "2026-08-01";

export const MASTER_DATA: Record<string, NopConfig> = {
  "Palangkaraya": {
    "spreadsheet_id": "1HvgVicTWwO4RMQI6ZR3Mu3IgGicwjcLZl9mDN1auvJU",
    "clusters": [
      "Palangkaraya",
      "Barito Raya"
    ],
    "names": [
      "ADI BOWO SANTOSO",
      "IRJAN TORO",
      "AHMAD",
      "AHMAD MUZAKIR",
      "AHMAD SETIAWAN",
      "ALFI SYAHRI",
      "ARMADI",
      "AULIA RAHMAN",
      "DARLI SUTANTO",
      "DIDI RIYADI",
      "FAHMI",
      "FRANS EJHA ADITYA",
      "GYLLBRHED ALFARY LOLOMSAIT",
      "HARUN NURASYID",
      "HORY YUSMANTO",
      "INDRA",
      "JAMES JIMBRIS TAMAILANG",
      "JUMADI",
      "KHILAL DAWAI KATIRI",
      "LEONARD HARA",
      "M. RIFANI",
      "MUHAMMAD MUKHLIS",
      "MUHAMMAD MUKTI",
      "MUNAWIR AHMAD",
      "MURJANI",
      "NURHAYAT",
      "OKY BANGKIT PAMUNGKAS",
      "PRADILA KANDI",
      "PUJIANTO",
      "PUTRA WARDANA",
      "REYNALDI RICARDO PUTRA",
      "RIKI HIDAYAT",
      "RIKO SETIADI",
      "SAILILLAH",
      "SARUL SAPUTRA",
      "SARWONO",
      "RIO ARDINATA",
      "TAKLIM",
      "TIVIANSYAH",
      "TRISNO SUSANTO",
      "YAHYA MUHAMAD",
      "OKTA PRDIKA",
      "OKTA PRADIKA",
      "M KIKI FIRMANSYAH",
      "MAWARDAH",
      "HD"
    ]
  },
  "Pangkalanbun": {
    "spreadsheet_id": "1bc0lDhR5iMtXZsKiKIdEwPY8JTaASeHFtaJSeXkywE4",
    "clusters": [
      "Ketapang",
      "Sampit",
      "Pangkalanbun"
    ],
    "names": [
      "AGUS SUGANDA",
      "AJI SAPUTRA",
      "DANDI PUTRA",
      "DIAN WAHYUDI",
      "DIAN WILDANI",
      "HAFID BUDIANTO",
      "HERWANI",
      "IWAN ZAINAL ABIDIN",
      "PARYADI KUSUMA",
      "PONIRAN",
      "ANDARIANTO PUJI SURO",
      "ARDI",
      "CAVIN ANDREAN EKA PUTRA",
      "DADANG WAHYU SYAHPUTRA",
      "FERI HARIADI",
      "JOENDRIS HERDIAN KARA",
      "NASUKI",
      "REDI CANDRA SINAGA",
      "RIZAL IHZAMAHENDRA",
      "SOLEKHAN",
      "STEVEN HERDIAN KARA",
      "TEGUH WICAKSONO",
      "YUDIONO",
      "IPAN HARIONO",
      "DIDIK PRIYONO",
      "MUHAMAD ROIS FERDIANSYAH",
      "WIDI ARYANTO",
      "HERMANSYAH",
      "MUHAMMAD RIZKY",
      "RIDWANSYAH",
      "TRIYONO",
      "UTI MUHAMMAD KHAIRUL HUDA",
      "ARDIANSYAH",
      "BAGUS SANTOSO",
      "BONDAN PRAMUDYA ANANTATUR",
      "M.ABDUL KHOLIP",
      "MUJHAHID ALWI",
      "RIRIH HARIANTO",
      "TAJAM SAPUTRA",
      "WAHYUDI",
      "DAYU SHANDY",
      "MEI NUGROHO DWI LAKSONO",
      "ARIF JONIAWAN",
      "FIRDAUS",
      "AYU NUR ISLAMIAH",
      "RAHMAT RIYAN WAHYUDIN",
      "RONI YUDI ISYANTO",
      "FHANNY AGUSTIAWAN",
      "GUNTUR WAHYU PRADANA",
      "SUWITO"
    ]
  },
  "Tarakan": {
    "spreadsheet_id": "1lRj1YdZGQwY5vHg8P4wudK9V1O_lJuEYjdyHkXoB-Wg",
    "clusters": [
      "Tarakan Inner",
      "Tarakan Outer"
    ],
    "names": [
      "HENDRA WIRTASI SIMANULLANG",
      "ARIZONA ROSADI",
      "KUKUH BHASKARA",
      "NATAL SIMBOLON",
      "HERMAWAN",
      "IRVAN DINATA VANDITYAWAN",
      "ENDRAS SAPTA",
      "AHMADI",
      "EDI PANJI ERMAYANA",
      "HANS RISKY RONI TUAH GIRSANG",
      "IRMANSYAH B. SANGAJI",
      "REMO REMOLDUS MANALU",
      "MOHAMMAD RAFAI",
      "FIRMAN SYAHRUL",
      "AZMIR",
      "PETRUS RESI KELORE",
      "ANIR REZKY",
      "AHDAN",
      "PARJON SIMANULLANG",
      "RUSDI",
      "HASRIADI",
      "PURO SUGONDO",
      "ALIMUDIN M. SAER",
      "KORNELIUS USI KELORE",
      "RUSDIANSYAH",
      "JONTES YUSDA SIMANULLANG",
      "NANI SETIANINGSIH",
      "UNGGUL NUGRAHA",
      "YOGABITA INDOTENO",
      "JHON KENNEDI SIMANULLANG",
      "RAFI MUHAMAD SYARIF",
      "AGRIVA",
      "SEPTIAN ALVITO",
      "M. DEDI RIZALDI",
      "SAHARUDDIN.",
      "MUHAMMAD RASYID",
      "SUPRIADI",
      "JULIMAT SIHITE",
      "EFNI NURYADIN",
      "ERWIN SAPUTRA ARIANSYAH",
      "ALVEUS",
      "SUPRIADI BANDANGAN"
    ]
  },
  "Pontianak": {
    "spreadsheet_id": "1VmoWPImNFMjnaIQpBXEVYdMiTEzsz3P4tpmzfA0EMDE",
    "clusters": [
      "Sintang",
      "Singkawang",
      "Pontianak"
    ],
    "names": [
      "ALOYSIUS",
      "RUDI",
      "RONIYANTO",
      "SUKADI",
      "HAIRIL",
      "AZMI ASHADIQI",
      "SUYADI",
      "ARIEF DARUL IKHWAN",
      "MUHAMMAD AL FATAH",
      "YUDIANSYAH",
      "RAHMAD INDRA IRAWAN",
      "MATIUS MARTIN",
      "RYVAEEL DEWANGGA",
      "AMIRDA ANGGA SAPUTRA",
      "IZHARUDDIN",
      "VINSENSIUS YOGI",
      "GUSTI ARIZAL",
      "MUHAMMAD MIFTAHUDIN, A.MD",
      "BAYU ANGGARA PUTRA",
      "YONI IRAWAN",
      "SUGANDI",
      "IRVAN ANDRIYANA",
      "ALDIANSYAH",
      "ABANG HAMDANI",
      "ABANG KUSDIANSYAH",
      "SUMAN",
      "SANGGARA ISMARAWARI",
      "IBIN",
      "VALENTINUS PETRO",
      "DWI KURNIAWAN ISMANTO",
      "ARISAFRIADI",
      "DONATUS DONI",
      "NUR AHMAD KARDIYANTO",
      "AGRI PERDANA",
      "AKHSANUL FIKI",
      "ALI ALAMSYAH",
      "MUHAMMAD FIRZHA GIANNI HARSYA",
      "RICKY ARDILAY",
      "FAISAL",
      "WIJI SANTOSO",
      "HISYAM MUTHOYIB",
      "ARIF RAHMAN NUGROHO",
      "TOTOK SUGIARTO",
      "PURWANDI SETIAWAN",
      "JULIANTO BHAKTI PUTRO, SH",
      "ILHAMMUDIN",
      "AGUNG",
      "ROSIDI",
      "ABRAR ELZAH FATHALIF",
      "HENDRI YULIANSYAH",
      "JAMIL",
      "GORO SUKARTONO",
      "OKTAPIANUS JUMIN",
      "ONNIE SYAEFUDDIN",
      "BUDI",
      "ULUL AMRY",
      "RUHIAT, A.MD",
      "SUPIANDI",
      "WAHYUDI",
      "SUHENDRIK",
      "M. ARKAM",
      "SYAFRI APRIJAL",
      "ARIANTO SUMANTRI",
      "TUTU AGE ANDIKA",
      "VIRANDA SAPTA, A.MD",
      "TOTO HERMANSYAH",
      "KURNIAWAN",
      "ROBI ISKANDAR MASDIANSYAH",
      "MUTIIN CHANDRA",
      "MISJANI",
      "KHAIRUL FARISD",
      "ANDRA",
      "DODI RATMAYANTO",
      "WAWAN DARYANA",
      "MISWARDI",
      "JUPRILIAUS PICO",
      "DEDY PURNOMO",
      "EDI KURNIAWAN",
      "DEDE GUNAWAN",
      "WANDALA JAGOARDI PANDALO",
      "KARIYADI",
      "REZQI AL BARQAH",
      "FIRMANSYAH, SP"
    ]
  }
};

export const NOP_KEYS = Object.keys(MASTER_DATA);

export const LIST_KEPERLUAN: string[] = ["Tshoot", "Backup", "Support", "PM", "Program BCP", "Program Quikwin", "Program G348T", "Pengiriman Material SPMS", "Pembelian Material", "Transportasi Air", "Lainnya (Ketik Manual)"];

export const LIST_ROLES = ["Admin", "Koordinator", "PM", "TE", "MBP", "CME"];

export const LIST_BANKS = ["BNI", "BCA", "MANDIRI", "BRI"];

export const OPT_ATAS = [
  "RRU",
  "Antena MW/RF",
  "Jumper",
  "Optik",
  "Odu",
  "Pindah Mounting",
  "Lainnya (Ketik Manual)",
];

export const OPT_BAWAH = [
  "Module APR",
  "Backplane Rectifier",
  "Replace Board BTS",
  "Replace Optik Transmisi",
  "Replace Idu",
  "Add Batterai",
  "Add Rectifier",
  "Tshoot Power dan rectifier",
  "Pengecekan MCB",
  "BCP",
  "Automasi Genset",
  "Preventive Maintenance SITE",
  "Preventive Maintenance GENSET",
  "Preventive Maintenance SITE & GENSET (Tim PM)",
  "Lainnya (Ketik Manual)",
];

export interface BbmPriceRule {
  default: number;
  min: number;
  max: number;
}

export const BBM_PRICE_RULES_SPBU: Record<string, BbmPriceRule> = {
  "Pertalite": {
    "default": 10000,
    "min": 9000,
    "max": 10000
  },
  "Pertamax": {
    "default": 16000,
    "min": 11500,
    "max": 16000
  },
  "Bio Solar": {
    "default": 6000,
    "min": 5500,
    "max": 6000
  },
  "Dexlite": {
    "default": 25000,
    "min": 12500,
    "max": 25000
  },
  "Pertamina Dex": {
    "default": 18500,
    "min": 13000,
    "max": 18500
  }
};

export const BBM_PRICE_RULES_ECERAN: Record<string, BbmPriceRule> = {
  "Pertalite": {
    "default": 15000,
    "min": 13000,
    "max": 20000
  },
  "Pertamax": {
    "default": 20000,
    "min": 19000,
    "max": 25000
  },
  "Bio Solar": {
    "default": 18000,
    "min": 15000,
    "max": 28000
  },
  "Dexlite": {
    "default": 29000,
    "min": 29000,
    "max": 30000
  },
  "Pertamina Dex": {
    "default": 25000,
    "min": 20000,
    "max": 30000
  }
};

export const MOTIVASI_LIST = [
  "Kejujuran adalah kunci keberhasilan. Terima kasih atas kerja kerasmu hari ini!",
  "Jujur dalam bekerja demi senyum keluarga di rumah. Keringatmu adalah ibadah!",
  "Satu kejujuran bernilai lebih dari seribu kebohongan. Lanjutkan dedikasimu!",
  "Tetap semangat! Hasil yang berkah berasal dari proses yang jujur dan transparan.",
  "Keringat di lapangan adalah pahlawan keluarga. Jaga integritas dan pulanglah dengan bangga!",
];
