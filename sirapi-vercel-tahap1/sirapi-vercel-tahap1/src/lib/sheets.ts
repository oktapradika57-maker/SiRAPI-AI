import { google } from "googleapis";
import { MASTER_DATA, SHEETS } from "./constants";
import { cleanIndicator, normalizePlatKey, KmRhOverride } from "./rules";

const CACHE_TTL_MS = 60 * 1000; // 60 detik server cache (hemat kuota 200 user)

interface CachedBundle {
  fetchedAt: number;
  data: NopSheetBundle;
}

export interface TimInfo {
  lat: string;
  lon: string;
  role: string;
  nopol: string;
  nik: string;
}

export interface NopSheetBundle {
  nop: string;
  spreadsheetId: string;
  names: string[];
  clusters: string[];
  nopols: string[];
  timDict: Record<string, TimInfo>;
  availPmTickets: string[];
  reqRows: string[][];
  pjbRows: string[][];
  appRows: string[][];
  overrides: KmRhOverride[];
  fetchedAtIso: string;
}

const memoryCache = new Map<string, CachedBundle>();

function getSheetsClient() {
  const rawJson = process.env.GCP_JSON;
  if (!rawJson) {
    throw new Error("Environment variable GCP_JSON belum diatur di Vercel / .env.local!");
  }
  const credentials = JSON.parse(rawJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function invalidateNopCache(nop?: string) {
  if (nop) {
    memoryCache.delete(nop);
  } else {
    memoryCache.clear();
  }
}

export async function fetchNopBundle(nop: string, forceRefresh = false): Promise<NopSheetBundle> {
  const cfg = MASTER_DATA[nop];
  if (!cfg) throw new Error(`NOP '${nop}' tidak ditemukan.`);

  const now = Date.now();
  const cached = memoryCache.get(nop);
  if (!forceRefresh && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const sheets = getSheetsClient();
  const ssId = cfg.spreadsheet_id;

  const targetRanges = [
    `'${SHEETS.REQUEST}'!A:X`,
    `'${SHEETS.PJB}'!A:AN`,
    `'${SHEETS.APP}'!A:H`,
    `'${SHEETS.TIKET_PM}'!A:F`,
    `'${SHEETS.MASTER_TIM}'!A:G`,
    `'${SHEETS.MASTER_KMRH}'!A:G`,
  ];

  // Fetch per sheet safely (some sheets like Master Tim / Master KM RH might not exist yet)
  const results: Record<string, string[][]> = {
    req: [],
    pjb: [],
    app: [],
    pm: [],
    mtim: [],
    mkmrh: [],
  };
  const keys = ["req", "pjb", "app", "pm", "mtim", "mkmrh"];

  // First try single batchGet for speed (1 API call total!)
  let batchOk = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: ssId,
        ranges: targetRanges,
      });
      const vrs = resp.data.valueRanges || [];
      vrs.forEach((vr, idx) => {
        const rows = (vr.values || []) as string[][];
        results[keys[idx]] = rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
      });
      batchOk = true;
      break;
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || "");
      if (msg.includes("Unable to parse range")) {
        // One optional sheet (e.g., Master KM RH / Master Tim) doesn't exist yet -> fallback to individual safe gets
        break;
      }
      if (attempt < 2) await sleep(1500 * (attempt + 1));
    }
  }

  if (!batchOk) {
    await Promise.all(
      targetRanges.map(async (rng, idx) => {
        try {
          const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: ssId,
            range: rng,
          });
          const rows = (resp.data.values || []) as string[][];
          results[keys[idx]] = rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
        } catch {
          results[keys[idx]] = [];
        }
      })
    );
  }

  // Merge Master Tim
  let activeNames = [...cfg.names];
  const timDict: Record<string, TimInfo> = {};
  const nopolSet = new Set<string>();

  if (results.mtim.length > 1) {
    const dynamicActive: string[] = [];
    for (let i = 1; i < results.mtim.length; i++) {
      const r = results.mtim[i] || [];
      const nm = String(r[0] ?? "").trim().toUpperCase();
      const rl = String(r[1] ?? "").trim();
      const npl = String(r[2] ?? "").trim().toUpperCase();
      const nik = String(r[3] ?? "").trim();
      const lat = String(r[4] ?? "0").trim() || "0";
      const lon = String(r[5] ?? "0").trim() || "0";
      const st = String(r[6] ?? "AKTIF").trim().toUpperCase() || "AKTIF";
      if (npl && !["0", "NAN", "NONE", "-"].includes(npl)) nopolSet.add(npl);
      if (nm && !["NAN", "NONE", "-"].includes(nm)) {
        if (st === "AKTIF" && !dynamicActive.includes(nm)) dynamicActive.push(nm);
        timDict[nm] = { lat, lon, role: rl, nopol: npl, nik };
      }
    }
    if (dynamicActive.length > 0) activeNames = dynamicActive;
  }

  // Collect history nopols from Request & PJB
  for (let i = 1; i < results.req.length; i++) {
    const p = String(results.req[i]?.[16] ?? "").trim().toUpperCase();
    if (p && !["0", "NAN", "NONE", "-"].includes(p)) nopolSet.add(p);
  }
  for (let i = 1; i < results.pjb.length; i++) {
    const p = String(results.pjb[i]?.[12] ?? "").trim().toUpperCase();
    if (p && !["0", "NAN", "NONE", "-"].includes(p)) nopolSet.add(p);
  }

  // Available PM Tickets
  const targetNopNorm = nop.replace(/\s+/g, "").toUpperCase();
  const availPmTickets: string[] = [];
  for (let i = 1; i < results.pm.length; i++) {
    const r = results.pm[i] || [];
    if (r.length >= 6) {
      const rNop = String(r[1] ?? "").replace(/\s+/g, "").toUpperCase();
      const rSt = String(r[5] ?? "").trim().toUpperCase();
      const rTk = String(r[3] ?? "").trim().toUpperCase();
      if (rNop === targetNopNorm && rSt.includes("AVAILABLE") && rTk) {
        availPmTickets.push(rTk);
      }
    }
  }

  // Master KM RH overrides
  const overrides: KmRhOverride[] = [];
  for (let i = 1; i < results.mkmrh.length; i++) {
    const r = results.mkmrh[i] || [];
    const platDisplay = String(r[0] ?? "").trim().toUpperCase();
    const platNorm = normalizePlatKey(platDisplay);
    if (!platNorm) continue;
    overrides.push({
      platDisplay,
      platNorm,
      tipe: String(r[1] ?? "Mobil").trim(),
      value: cleanIndicator(r[2]),
      timestampStr: String(r[3] ?? "-").trim(),
      mode: String(r[4] ?? "AUTO").trim().toUpperCase() || "AUTO",
      catatan: String(r[5] ?? "-").trim(),
      status: String(r[6] ?? "AKTIF").trim().toUpperCase() || "AKTIF",
    });
  }

  const bundle: NopSheetBundle = {
    nop,
    spreadsheetId: ssId,
    names: activeNames,
    clusters: cfg.clusters,
    nopols: Array.from(nopolSet).sort(),
    timDict,
    availPmTickets,
    reqRows: results.req,
    pjbRows: results.pjb,
    appRows: results.app,
    overrides,
    fetchedAtIso: new Date().toISOString(),
  };

  memoryCache.set(nop, { fetchedAt: now, data: bundle });
  return bundle;
}

export async function appendSheetRows(
  nop: string,
  sheetName: string,
  rows: (string | number)[][]
): Promise<boolean> {
  const cfg = MASTER_DATA[nop];
  if (!cfg) throw new Error(`NOP '${nop}' tidak ditemukan.`);
  const sheets = getSheetsClient();
  const safeRows = rows.map((row) => row.map((v) => (v === null || v === undefined ? "" : String(v))));

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: cfg.spreadsheet_id,
        range: `'${sheetName}'!A1`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: safeRows },
      });
      invalidateNopCache(nop);
      return true;
    } catch (err) {
      if (attempt < 3) {
        await sleep(2000 * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
  return false;
}

export async function updatePmTicketsStatus(
  nop: string,
  ticketsToUpdate: string[],
  newStatus: string
): Promise<void> {
  const cfg = MASTER_DATA[nop];
  if (!cfg || ticketsToUpdate.length === 0) return;
  try {
    const sheets = getSheetsClient();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: cfg.spreadsheet_id,
      range: `'${SHEETS.TIKET_PM}'!A:F`,
    });
    const rows = (resp.data.values || []) as string[][];
    const tSet = new Set(ticketsToUpdate.map((t) => t.trim().toUpperCase()));
    const updates: { range: string; values: string[][] }[] = [];
    rows.forEach((r, idx) => {
      if (r.length > 3 && tSet.has(String(r[3] ?? "").trim().toUpperCase())) {
        updates.push({ range: `'${SHEETS.TIKET_PM}'!F${idx + 1}`, values: [[newStatus]] });
      }
    });
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: cfg.spreadsheet_id,
        requestBody: { valueInputOption: "USER_ENTERED", data: updates },
      });
      invalidateNopCache(nop);
    }
  } catch {
    // Non-blocking
  }
}
