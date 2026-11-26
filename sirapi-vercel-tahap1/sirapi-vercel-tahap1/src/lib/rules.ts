import {
  BBM_PRICE_RULES_SPBU,
  BBM_PRICE_RULES_ECERAN,
  BbmPriceRule,
  CUTOFF_DATE_ISO,
} from "./constants";

export function getNowWib(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 3600 * 1000);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateId(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTimestampWib(d?: Date): string {
  const dt = d ?? getNowWib();
  return `${formatDateId(dt)} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
}

export function isoToIdDate(isoDate: string): string {
  if (!isoDate) return formatDateId(getNowWib());
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return isoDate;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function todayIsoWib(): string {
  const d = getNowWib();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function cleanNominal(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  let v = String(val).replace(/Rp/gi, "").replace(/\s+/g, "").trim();
  if (v.endsWith(",00") || v.endsWith(".00")) v = v.slice(0, -3);
  v = v.replace(/\./g, "").replace(/,/g, "");
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function formatRupiah(val: number): string {
  const n = Math.round(val || 0);
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatIdNumber(val: number | string): string {
  const f = Number(val);
  if (Number.isNaN(f)) return String(val ?? "");
  if (Math.abs(f - Math.round(f)) < 1e-6) {
    return Math.round(f).toLocaleString("id-ID");
  }
  return f.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export function normalizePlatKey(platRaw: unknown): string {
  const s = String(platRaw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!s || s === "0" || s === "NAN" || s === "NONE") return "";
  return s;
}

export function parseDate(dateStr?: string, fallbackTs?: string): Date | null {
  for (const rawVal of [dateStr, fallbackTs]) {
    if (!rawVal) continue;
    const s = String(rawVal).trim();
    if (!s || ["NAN", "NONE", "-", "NAT"].includes(s.toUpperCase())) continue;
    const sDate = s.split(" ")[0].trim();

    // DD/MM/YYYY or DD-MM-YYYY
    let m = sDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let a = parseInt(m[1], 10);
      let b = parseInt(m[2], 10);
      let y = parseInt(m[3], 10);
      if (y < 100) y += 2000;
      // Prioritas DD/MM/YYYY
      if (b <= 12 && a <= 31) {
        if (y === 2026 && b < 9 && a >= 9 && a <= 12) {
          return new Date(y, a - 1, b);
        }
        return new Date(y, b - 1, a);
      }
      // Fallback MM/DD/YYYY jika b > 12
      if (a <= 12 && b <= 31) {
        return new Date(y, a - 1, b);
      }
    }
    // YYYY-MM-DD
    m = sDate.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
      return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    }
  }
  return null;
}

export function parseTimestampDt(tsStr?: string, tglStr?: string): Date | null {
  for (const raw of [tsStr, tglStr]) {
    const s = String(raw ?? "").trim();
    if (!s || ["NAN", "NONE", "-"].includes(s.toUpperCase())) continue;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      let d = parseInt(m[1], 10);
      let mo = parseInt(m[2], 10);
      const y = parseInt(m[3], 10);
      const hh = parseInt(m[4], 10);
      const mm = parseInt(m[5], 10);
      const ss = parseInt(m[6] || "0", 10);
      if (mo > 12 && d <= 12) {
        const tmp = d;
        d = mo;
        mo = tmp;
      } else if (y === 2026 && mo < 9 && d >= 9 && d <= 12) {
        const tmp = d;
        d = mo;
        mo = tmp;
      }
      return new Date(y, mo - 1, d, hh, mm, ss);
    }
  }
  const dOnly = parseDate(tglStr, tsStr);
  return dOnly ? new Date(dOnly.getFullYear(), dOnly.getMonth(), dOnly.getDate(), 0, 0, 0) : null;
}

export interface ParsedIndicator {
  value: number;
  level: "ok" | "info" | "warn" | "err";
  note: string;
}

export function parseIndonesianIndicator(
  rawVal: unknown,
  lastInd = 0,
  unit: "KM" | "RH" | "Liter" = "KM"
): ParsedIndicator {
  if (rawVal === null || rawVal === undefined) {
    return { value: 0, level: "err", note: `Angka ${unit} masih kosong.` };
  }
  const sOrig = String(rawVal).trim();
  if (!sOrig) {
    return { value: 0, level: "err", note: `Angka ${unit} wajib diisi.` };
  }

  const s = sOrig
    .replace(/\b(km|rh|jam|liter|l)\b/gi, "")
    .replace(/\s+/g, "")
    .trim();

  if (!/^-?[\d.,]+$/.test(s)) {
    return {
      value: 0,
      level: "err",
      note: `Format '${sOrig}' tidak valid! Ketik angka murni (contoh: 125450 atau 1250,5).`,
    };
  }

  let val = 0;
  let level: "ok" | "info" | "warn" | "err" = "ok";
  let note = "";
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      val = parseFloat(s.replace(/\./g, "").replace(",", "."));
      level = "info";
      note = `Format titik ribuan & koma desimal: '${sOrig}' dibaca ${formatIdNumber(val)} ${unit}.`;
    } else {
      val = parseFloat(s.replace(/,/g, ""));
      level = "info";
      note = `Format koma ribuan & titik desimal: '${sOrig}' dibaca ${formatIdNumber(val)} ${unit}.`;
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split(".");
    if (parts.length > 2) {
      if (parts.slice(1).every((p) => p.length === 3)) {
        val = parseFloat(parts.join(""));
        level = "warn";
        note = `Deteksi Titik Ribuan: '${sOrig}' dibaca ${formatIdNumber(val)} ${unit}. Ketik angka polos tanpa titik (${Math.round(val)}).`;
      } else {
        return {
          value: 0,
          level: "err",
          note: `Penulisan titik pada '${sOrig}' tidak valid! Ketik angka polos tanpa titik ribuan.`,
        };
      }
    } else {
      const [leftP, rightP] = parts;
      if (rightP.length === 3 && leftP.length >= 1 && leftP !== "0" && unit !== "Liter") {
        const asThousands = parseFloat(leftP + rightP);
        const asDecimal = parseFloat(s);
        if (lastInd > 0 && lastInd < 50 && Math.abs(asDecimal - lastInd) < Math.abs(asThousands - lastInd)) {
          val = asDecimal;
          level = "info";
          note = `Titik dibaca desimal: ${formatIdNumber(val)} ${unit}.`;
        } else {
          val = asThousands;
          level = "warn";
          note = `Deteksi Titik Ribuan: '${sOrig}' dibaca ${formatIdNumber(val)} ${unit}. Ketik angka polos (${Math.round(val)}).`;
        }
      } else {
        val = parseFloat(s);
        if (unit !== "Liter" && lastInd >= 1000 && val < lastInd / 100) {
          level = "err";
          note = `SALAH TITIK/KOMA! '${sOrig}' terbaca ${formatIdNumber(val)} ${unit}, jauh di bawah histori ${formatIdNumber(lastInd)} ${unit}. Hapus titik ribuan!`;
        } else {
          level = "ok";
          note = `Terbaca sistem: ${formatIdNumber(val)} ${unit}.`;
        }
      }
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(",");
    if (parts.length > 2) {
      if (parts.slice(1).every((p) => p.length === 3)) {
        val = parseFloat(parts.join(""));
        level = "warn";
        note = `Deteksi Koma Ribuan: '${sOrig}' dibaca ${formatIdNumber(val)} ${unit}.`;
      } else {
        return { value: 0, level: "err", note: `Penulisan koma pada '${sOrig}' tidak valid!` };
      }
    } else {
      const [leftP, rightP] = parts;
      if (unit !== "Liter" && rightP.length === 3 && leftP.length >= 1 && leftP !== "0") {
        const asThousands = parseFloat(leftP + rightP);
        const asDecimal = parseFloat(s.replace(",", "."));
        if (lastInd > 0 && lastInd < 50 && Math.abs(asDecimal - lastInd) < Math.abs(asThousands - lastInd)) {
          val = asDecimal;
          level = "info";
          note = `Koma dibaca desimal: ${formatIdNumber(val)} ${unit}.`;
        } else {
          val = asThousands;
          level = "warn";
          note = `Deteksi Koma Ribuan: '${sOrig}' dibaca ${formatIdNumber(val)} ${unit}. Ketik angka polos (${Math.round(val)}).`;
        }
      } else {
        val = parseFloat(s.replace(",", "."));
        if (unit !== "Liter" && lastInd >= 1000 && val < lastInd / 100) {
          level = "err";
          note = `SALAH KOMA! '${sOrig}' terbaca ${formatIdNumber(val)} ${unit}, jauh di bawah histori ${formatIdNumber(lastInd)} ${unit}.`;
        } else {
          level = "ok";
          note = `Terbaca sistem: ${formatIdNumber(val)} ${unit}.`;
        }
      }
    }
  } else {
    val = parseFloat(s);
    level = "ok";
    note = `Terbaca sistem: ${formatIdNumber(val)} ${unit}.`;
  }

  if (Number.isNaN(val) || val < 0) {
    return { value: 0, level: "err", note: `Nilai ${unit} tidak boleh negatif / rusak.` };
  }
  return { value: Math.round(val * 100) / 100, level, note };
}

export function cleanIndicator(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  return parseIndonesianIndicator(val, 0, "KM").value;
}

export function getBbmRule(
  jenisBbmStr: string,
  sumberBeli: "SPBU" | "Eceran" | string = "SPBU"
): { matchedKey: string | null; mode: "SPBU" | "Eceran"; rule: BbmPriceRule | null } {
  const isEceran =
    String(sumberBeli).toLowerCase().includes("eceran") ||
    String(jenisBbmStr).toLowerCase().includes("eceran");
  const rulesDict = isEceran ? BBM_PRICE_RULES_ECERAN : BBM_PRICE_RULES_SPBU;
  const s = String(jenisBbmStr || "").toLowerCase();

  let matchedKey: string | null = null;
  for (const k of Object.keys(rulesDict)) {
    if (s.includes(k.toLowerCase())) {
      matchedKey = k;
      break;
    }
  }
  if (!matchedKey) {
    if (s.includes("solar")) matchedKey = "Bio Solar";
    else if (s.includes("pertamina dex")) matchedKey = "Pertamina Dex";
    else if (s.includes("dex")) matchedKey = "Dexlite";
    else if (s.includes("pertamax")) matchedKey = "Pertamax";
    else if (s.includes("pertalite")) matchedKey = "Pertalite";
  }
  return {
    matchedKey,
    mode: isEceran ? "Eceran" : "SPBU",
    rule: matchedKey ? rulesDict[matchedKey] : null,
  };
}

export function validateBbmPrice(
  jenisBbmStr: string,
  hargaSatuan: number,
  sumberBeli: "SPBU" | "Eceran" | string = "SPBU"
): { ok: boolean; msg: string } {
  const hargaVal = Math.round(Number(hargaSatuan) || 0);
  const { matchedKey, mode, rule } = getBbmRule(jenisBbmStr, sumberBeli);
  if (!rule) {
    const maxFb = mode === "Eceran" ? 30000 : 25000;
    if (hargaVal <= 0) return { ok: false, msg: "Harga satuan BBM wajib diisi (> Rp 0)." };
    if (hargaVal > maxFb)
      return {
        ok: false,
        msg: `Harga satuan BBM ${mode} (${formatRupiah(hargaVal)}/L) melebihi batas maksimum (${formatRupiah(maxFb)}/L)!`,
      };
    return { ok: true, msg: `Harga ${mode} wajar` };
  }
  if (hargaVal <= 0)
    return { ok: false, msg: `Harga satuan ${matchedKey} (${mode}) wajib diisi (> Rp 0).` };
  if (hargaVal < rule.min)
    return {
      ok: false,
      msg: `Harga satuan ${matchedKey} ${mode} (${formatRupiah(hargaVal)}/L) di bawah batas minimal (Min ${formatRupiah(rule.min)}/L).`,
    };
  if (hargaVal > rule.max)
    return {
      ok: false,
      msg: `Harga satuan ${matchedKey} ${mode} (${formatRupiah(hargaVal)}/L) MELEBIHI batas wajar (Maks ${formatRupiah(rule.max)}/L)! Wajib harga actual.`,
    };
  if (mode === "SPBU")
    return { ok: true, msg: `Harga ${matchedKey} SPBU valid (Maks ${formatRupiah(rule.max)}/L)` };
  return {
    ok: true,
    msg: `Harga ${matchedKey} Eceran valid (Range ${formatRupiah(rule.min)} - ${formatRupiah(rule.max)}/L)`,
  };
}

export function formatElapsedTime(hoursFloat: number | null): string {
  if (hoursFloat === null || hoursFloat < 0) return "-";
  const totalMins = Math.round(hoursFloat * 60);
  const days = Math.floor(totalMins / (24 * 60));
  const remMins = totalMins % (24 * 60);
  const hrs = Math.floor(remMins / 60);
  const mins = remMins % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Hari`);
  if (hrs > 0) parts.push(`${hrs} Jam`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} Mnt`);
  return parts.join(" ");
}

export interface LastIndicatorDetail {
  value: number;
  timestampStr: string;
  dtObj: Date | null;
  source: string;
  tiket: string;
  pic: string;
}

export interface KmRhOverride {
  platDisplay: string;
  platNorm: string;
  tipe: string;
  value: number;
  timestampStr: string;
  mode: string;
  catatan: string;
  status: string;
}

export function buildRejectedSets(appRows: string[][]) {
  const pjbLatest: Record<string, string> = {};
  const reqLatest: Record<string, string> = {};
  for (let i = 1; i < appRows.length; i++) {
    const a = appRows[i] || [];
    const tk = String(a[2] ?? "").trim().toUpperCase();
    const jns = String(a[3] ?? "").trim();
    const st = String(a[5] ?? "").trim().toUpperCase();
    if (!tk) continue;
    if (jns === "Verifikasi PJB") pjbLatest[tk] = st;
    else if (jns === "Request Dana") reqLatest[tk] = st;
  }
  const rejPjb = new Set(Object.entries(pjbLatest).filter(([, s]) => s === "REJECTED").map(([k]) => k));
  const rejReq = new Set(Object.entries(reqLatest).filter(([, s]) => s === "REJECTED").map(([k]) => k));
  return { rejPjb, rejReq };
}

export function getLastIndicatorDetail(
  platRaw: string,
  jns: "Mobil" | "Motor" | "Genset",
  pjbRows: string[][],
  reqRows: string[][],
  appRows: string[][],
  overrides: KmRhOverride[] = []
): LastIndicatorDetail {
  const empty: LastIndicatorDetail = {
    value: 0,
    timestampStr: "-",
    dtObj: null,
    source: "-",
    tiket: "-",
    pic: "-",
  };
  const platNorm = normalizePlatKey(platRaw);
  if (!platNorm) return empty;
  const jnsLow = jns.toLowerCase();
  const maxSane = jnsLow === "genset" ? 100000 : 2000000;
  const { rejPjb, rejReq } = buildRejectedSets(appRows);

  const ov = overrides.find(
    (o) => o.status === "AKTIF" && o.platNorm === platNorm && o.tipe.toLowerCase() === jnsLow
  );
  if (ov && ov.mode === "PAKSA") {
    return {
      value: ov.value,
      timestampStr: ov.timestampStr || "-",
      dtObj: parseTimestampDt(ov.timestampStr, ov.timestampStr),
      source: `Patokan Admin (${ov.catatan})`,
      tiket: "ADMIN-OVERRIDE",
      pic: "Admin",
    };
  }

  type Cand = LastIndicatorDetail & { prio: number; dtMs: number; rowI: number };
  const cands: Cand[] = [];

  for (let i = 1; i < pjbRows.length; i++) {
    const r = pjbRows[i] || [];
    if (r.length <= 12) continue;
    if (normalizePlatKey(r[12]) !== platNorm) continue;
    if (!String(r[8] ?? "").toLowerCase().includes(jnsLow)) continue;
    const tk = String(r[21] ?? "").trim().toUpperCase();
    if (tk && rejPjb.has(tk)) continue;
    const val = cleanIndicator(r[10]);
    if (val > 0 && val <= maxSane) {
      const ts = String(r[0] ?? "").trim();
      const tgl = String(r[1] ?? "").trim();
      const dt = parseTimestampDt(ts, tgl);
      cands.push({
        prio: 2,
        dtMs: dt ? dt.getTime() : 0,
        rowI: i,
        value: val,
        timestampStr: ts || tgl || "-",
        dtObj: dt,
        source: "PJB Terakhir",
        tiket: tk || "-",
        pic: String(r[4] ?? "-").trim(),
      });
    }
  }

  for (let i = 1; i < reqRows.length; i++) {
    const r = reqRows[i] || [];
    if (r.length <= 16) continue;
    if (normalizePlatKey(r[16]) !== platNorm) continue;
    if (!String(r[10] ?? "").toLowerCase().includes(jnsLow)) continue;
    const tk = String(r[3] ?? "").trim().toUpperCase();
    if (tk && rejReq.has(tk)) continue;
    const val = cleanIndicator(r[12]);
    if (val > 0 && val <= maxSane) {
      const ts = String(r[0] ?? "").trim();
      const tgl = String(r[1] ?? "").trim();
      const dt = parseTimestampDt(ts, tgl);
      cands.push({
        prio: 1,
        dtMs: dt ? dt.getTime() : 0,
        rowI: i,
        value: val,
        timestampStr: ts || tgl || "-",
        dtObj: dt,
        source: "Request Terakhir",
        tiket: tk || "-",
        pic: String(r[5] ?? "-").trim(),
      });
    }
  }

  const sortCands = (arr: Cand[]) =>
    arr.sort((a, b) => a.dtMs - b.dtMs || a.prio - b.prio || a.rowI - b.rowI);

  if (ov) {
    const ovDt = parseTimestampDt(ov.timestampStr, ov.timestampStr);
    const ovMs = ovDt ? ovDt.getTime() : 0;
    const newer = cands.filter((c) => c.dtMs > ovMs);
    if (newer.length > 0) {
      sortCands(newer);
      const b = newer[newer.length - 1];
      return { value: b.value, timestampStr: b.timestampStr, dtObj: b.dtObj, source: b.source, tiket: b.tiket, pic: b.pic };
    }
    return {
      value: ov.value,
      timestampStr: ov.timestampStr || "-",
      dtObj: ovDt,
      source: `Patokan Admin (${ov.mode})`,
      tiket: "ADMIN-PATOKAN",
      pic: "Admin",
    };
  }

  if (cands.length === 0) return empty;
  const pjbCands = cands.filter((c) => c.prio === 2);
  if (pjbCands.length > 0) {
    sortCands(pjbCands);
    const bestPjb = pjbCands[pjbCands.length - 1];
    const reqNewer = cands.filter((c) => c.prio === 1 && c.dtMs > bestPjb.dtMs && c.value >= bestPjb.value);
    if (reqNewer.length > 0) {
      sortCands(reqNewer);
      const b = reqNewer[reqNewer.length - 1];
      return { value: b.value, timestampStr: b.timestampStr, dtObj: b.dtObj, source: b.source, tiket: b.tiket, pic: b.pic };
    }
    return {
      value: bestPjb.value,
      timestampStr: bestPjb.timestampStr,
      dtObj: bestPjb.dtObj,
      source: bestPjb.source,
      tiket: bestPjb.tiket,
      pic: bestPjb.pic,
    };
  }

  sortCands(cands);
  const b = cands[cands.length - 1];
  return { value: b.value, timestampStr: b.timestampStr, dtObj: b.dtObj, source: b.source, tiket: b.tiket, pic: b.pic };
}

export interface LiveControlResult {
  isBlocking: boolean;
  level: "ok" | "warn" | "err";
  elapsedText: string;
  selisih: number;
  statusShort: string;
  detailLines: string[];
}

export function evaluateLiveIndicatorControl(
  currentVal: number,
  lastInfo: LastIndicatorDetail,
  nowWib: Date,
  tipe: "Mobil" | "Motor" | "Genset"
): LiveControlResult {
  const unit = tipe === "Genset" ? "RH" : "KM";
  const lastVal = Number(lastInfo.value || 0);
  let elapsedHours: number | null = null;
  let elapsedText = "-";
  if (lastInfo.dtObj) {
    const diffSec = (nowWib.getTime() - lastInfo.dtObj.getTime()) / 1000;
    if (diffSec >= 0) {
      elapsedHours = diffSec / 3600;
      elapsedText = formatElapsedTime(elapsedHours);
    } else {
      elapsedHours = 0;
      elapsedText = "Baru saja";
    }
  }

  const selisih = lastVal > 0 ? Math.round((currentVal - lastVal) * 100) / 100 : 0;
  let isBlocking = false;
  let level: "ok" | "warn" | "err" = "ok";
  let statusShort = "VALID";
  const lines: string[] = [];

  if (lastVal > 0) {
    lines.push(
      `Histori Terakhir (${lastInfo.source}): ${formatIdNumber(lastVal)} ${unit} | Tgl/Jam: ${lastInfo.timestampStr} (Selisih waktu: ${elapsedText})`
    );
    lines.push(
      `Input Sekarang: ${formatIdNumber(currentVal)} ${unit} → Selisih: ${selisih >= 0 ? "+" : ""}${formatIdNumber(selisih)} ${unit}`
    );
  } else {
    lines.push(
      `Input Sekarang: ${formatIdNumber(currentVal)} ${unit} (Belum ada histori ${unit} sebelumnya)`
    );
  }

  if (currentVal <= 0) {
    isBlocking = true;
    level = "err";
    statusShort = `INVALID (${unit}<=0)`;
    lines.push(`ERROR: Angka ${unit} wajib lebih dari 0!`);
  } else if (lastVal > 0 && currentVal < lastVal) {
    isBlocking = true;
    level = "err";
    statusShort = `ERROR (${unit} MUNDUR)`;
    lines.push(
      `ERROR ${unit} MUNDUR / SALAH TITIK-KOMA: Input (${formatIdNumber(currentVal)}) lebih kecil dari histori (${formatIdNumber(lastVal)}). Cek ulang atau hapus titik ribuan!`
    );
  } else if (lastVal >= 100 && currentVal > lastVal * 5 && selisih > (tipe === "Genset" ? 500 : 5000)) {
    isBlocking = true;
    level = "err";
    statusShort = "ERROR (LONJAKAN DIGIT)";
    lines.push(
      `ANOMALI LONJAKAN DIGIT: ${unit} melompat +${formatIdNumber(selisih)} ${unit} (>5x histori). Periksa kelebihan angka 0!`
    );
  } else if (tipe === "Genset" && lastVal > 0 && elapsedHours !== null && selisih > elapsedHours + 2) {
    level = "warn";
    statusShort = `ANOMALI WAKTU RH (+${selisih} RH > ${elapsedHours.toFixed(1)} Jam)`;
    lines.push(
      `PERINGATAN WAKTU GENSET: Kenaikan RH (+${formatIdNumber(selisih)} Jam) MELEBIHI waktu riil (${elapsedText}). Cek ulang angka & koma RH.`
    );
  } else if (
    (tipe === "Mobil" || tipe === "Motor") &&
    lastVal > 0 &&
    elapsedHours !== null &&
    elapsedHours >= 0.25 &&
    selisih / elapsedHours > 100
  ) {
    const avgSpd = selisih / elapsedHours;
    level = "warn";
    statusShort = `ANOMALI KM (+${selisih} KM dlm ${elapsedText})`;
    lines.push(
      `PERINGATAN WAKTU ${tipe.toUpperCase()}: Kenaikan +${formatIdNumber(selisih)} KM dalam ${elapsedText} (±${avgSpd.toFixed(1)} KM/jam nonstop) tidak wajar!`
    );
  } else if ((tipe === "Mobil" || tipe === "Motor") && lastVal > 0 && selisih === 0 && (elapsedHours ?? 0) > 6) {
    level = "warn";
    statusShort = "KM TIDAK BERUBAH";
    lines.push(`PERINGATAN: Angka KM sama persis dengan pengisian terakhir (${elapsedText} lalu).`);
  } else {
    lines.push(`Status Kontrol Live: VALID & WAJAR.`);
  }

  return { isBlocking, level, elapsedText, selisih, statusShort, detailLines: lines };
}

export interface TicketHistoryItem {
  tiket: string;
  tanggal: string;
  status: string;
}

export function getUserTicketsStatus(
  nama: string,
  reqRows: string[][],
  pjbRows: string[][],
  appRows: string[][]
) {
  const namaClean = String(nama || "").trim().toUpperCase();
  if (!namaClean || namaClean === "-- PILIH NAMA --") {
    return { outstandingAll: [] as string[], outstandingLock: [] as string[], agingTickets: [] as string[], history: [] as TicketHistoryItem[] };
  }

  const reqTickets: Record<string, { tgl: string; ts: string }> = {};
  for (let i = 1; i < reqRows.length; i++) {
    const r = reqRows[i] || [];
    if (r.length > 5 && String(r[5] ?? "").trim().toUpperCase() === namaClean) {
      const tk = String(r[3] ?? "").trim().toUpperCase();
      if (tk) reqTickets[tk] = { tgl: String(r[1] ?? ""), ts: String(r[0] ?? "") };
    }
  }

  const pjbTicketsSet = new Set<string>();
  for (let i = 1; i < pjbRows.length; i++) {
    const r = pjbRows[i] || [];
    if (r.length > 21 && String(r[4] ?? "").trim().toUpperCase() === namaClean && String(r[21] ?? "").trim()) {
      const tkStr = r[36] && String(r[36]).trim() ? String(r[36]).trim() : String(r[21]).trim();
      tkStr.split(",").forEach((t) => {
        const c = t.trim().toUpperCase();
        if (c) pjbTicketsSet.add(c);
      });
      pjbTicketsSet.add(String(r[21]).trim().toUpperCase());
    }
  }

  const pjbAppStatus: Record<string, { status: string; catatan: string }> = {};
  const reqAppStatus: Record<string, string> = {};
  for (let i = 1; i < appRows.length; i++) {
    const r = appRows[i] || [];
    if (r.length > 5) {
      const tk = String(r[2] ?? "").trim().toUpperCase();
      const jns = String(r[3] ?? "").trim();
      const st = String(r[5] ?? "").trim().toUpperCase();
      if (jns === "Verifikasi PJB" && tk) {
        pjbAppStatus[tk] = { status: st, catatan: String(r[6] ?? "") };
      } else if (jns === "Request Dana" && tk) {
        reqAppStatus[tk] = st;
      }
    }
  }

  const cutoff = new Date(CUTOFF_DATE_ISO + "T00:00:00");
  const today = getNowWib();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const outstandingAll: string[] = [];
  const outstandingLock: string[] = [];
  const agingTickets: string[] = [];
  const history: TicketHistoryItem[] = [];

  for (const [reqTkRaw, info] of Object.entries(reqTickets)) {
    const reqList = reqTkRaw.split(",").map((x) => x.trim()).filter(Boolean);
    const tglTampil = info.tgl.trim() || info.ts.split(" ")[0] || "-";

    if (reqAppStatus[reqTkRaw] === "REJECTED") {
      history.push({ tiket: reqTkRaw, tanggal: tglTampil, status: "❌ REQUEST DITOLAK Admin (Harap Ajukan Ulang)" });
      continue;
    }

    const allDone = reqList.every((t) => pjbTicketsSet.has(t));
    if (!allDone) {
      outstandingAll.push(reqTkRaw);
      const reqDate = parseDate(info.tgl, info.ts);
      const isAfterCutoff = reqDate ? reqDate.getTime() >= cutoff.getTime() : false;
      if (isAfterCutoff) outstandingLock.push(reqTkRaw);
      const agingDays = reqDate ? Math.floor((todayMid.getTime() - reqDate.getTime()) / 86400000) : 0;

      if (isAfterCutoff && agingDays > 3) {
        agingTickets.push(reqTkRaw);
        history.push({ tiket: reqTkRaw, tanggal: tglTampil, status: `🚨 Telat ${agingDays} Hari (Belum PJB)` });
      } else {
        history.push({ tiket: reqTkRaw, tanggal: tglTampil, status: "🔴 Menunggu PJB (Belum Selesai)" });
      }
    } else {
      const appData = pjbAppStatus[reqTkRaw] ?? { status: "APPROVED", catatan: "" };
      if (appData.status === "PENDING") {
        outstandingAll.push(reqTkRaw);
        outstandingLock.push(reqTkRaw);
        history.push({ tiket: reqTkRaw, tanggal: tglTampil, status: "⏳ PJB Menunggu Verifikasi Admin" });
      } else if (appData.status === "REJECTED") {
        outstandingAll.push(reqTkRaw);
        outstandingLock.push(reqTkRaw);
        history.push({ tiket: reqTkRaw, tanggal: tglTampil, status: `❌ PJB DITOLAK: ${appData.catatan}` });
      } else {
        history.push({ tiket: reqTkRaw, tanggal: tglTampil, status: "🟢 PJB Selesai & Approved" });
      }
    }
  }

  history.sort((a, b) => b.status.localeCompare(a.status));
  return { outstandingAll, outstandingLock, agingTickets, history };
}

export interface NopolSummary {
  unit: "KM" | "RH";
  lastOdo: number;
  totalTrip: number;
  tripCount: number;
  lastDate: string;
}

export function buildNopolDistanceSummary(pjbRows: string[][], reqRows: string[][]) {
  const reqKmMap: Record<string, number> = {};
  for (let i = 1; i < reqRows.length; i++) {
    const r = reqRows[i] || [];
    const tk = String(r[3] ?? "").trim().toUpperCase();
    if (tk) reqKmMap[tk] = cleanIndicator(r[12]);
  }
  const stats: Record<string, NopolSummary> = {};
  for (let i = 1; i < pjbRows.length; i++) {
    const p = pjbRows[i] || [];
    if (p.length <= 12) continue;
    const pNorm = normalizePlatKey(p[12]);
    if (!pNorm) continue;
    const kat = String(p[8] ?? "").toLowerCase();
    const isGen = kat.includes("genset");
    if (!isGen && !kat.includes("mobil") && !kat.includes("motor")) continue;
    const tk = String(p[21] ?? "").trim().toUpperCase();
    const kmAkhir = cleanIndicator(p[10]);
    const tripCol = cleanIndicator(p[24]);
    const kmAwal = reqKmMap[tk] || 0;
    const tripV = tripCol > 0 ? tripCol : kmAkhir > kmAwal && kmAwal > 0 ? kmAkhir - kmAwal : 0;
    const d = parseDate(p[1], p[0]);
    const dStr = d ? formatDateId(d) : "-";
    if (!stats[pNorm]) {
      stats[pNorm] = { unit: isGen ? "RH" : "KM", lastOdo: 0, totalTrip: 0, tripCount: 0, lastDate: dStr };
    }
    stats[pNorm].tripCount += 1;
    stats[pNorm].totalTrip = Math.round((stats[pNorm].totalTrip + Math.max(0, tripV)) * 100) / 100;
    if (kmAkhir >= stats[pNorm].lastOdo) {
      stats[pNorm].lastOdo = kmAkhir;
      stats[pNorm].lastDate = dStr;
    }
  }
  return stats;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
