"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import sitesRaw from "@/data/sites.json";
import {
  LIST_BANKS,
  LIST_KEPERLUAN,
  LIST_ROLES,
  MASTER_DATA,
  NOP_KEYS,
  OPT_ATAS,
  OPT_BAWAH,
} from "@/lib/constants";
import {
  cleanIndicator,
  cleanNominal,
  evaluateLiveIndicatorControl,
  formatIdNumber,
  formatRupiah,
  formatTimestampWib,
  getBbmRule,
  getLastIndicatorDetail,
  getNowWib,
  getUserTicketsStatus,
  isoToIdDate,
  normalizePlatKey,
  parseDate,
  parseIndonesianIndicator,
  todayIsoWib,
  validateBbmPrice,
} from "@/lib/rules";
import { uploadImageDirectToCloudinary } from "@/lib/clientUpload";
import type { NopSheetBundle } from "@/lib/sheets";
import ImageUploader from "@/components/ImageUploader";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  MapPin,
  RefreshCw,
  Send,
  ShieldAlert,
  Wrench,
} from "lucide-react";

interface SiteItem {
  id: string;
  lat: number;
  lon: number;
}
const SITES_DATA = sitesRaw as SiteItem[];

interface SubRequest {
  tiket: string;
  kategori: string;
  kebutuhan: number;
  plat: string;
  indikator: number;
  lastInd: number;
  tipe: "Mobil" | "Motor" | "Genset" | "UM" | "Inap" | "Material" | "Support" | "Fery" | "Klotok";
  infoBbm?: string;
  kapasitasTangki?: number;
  hari?: number;
  nomPerUnit?: number;
  allowUnder80?: boolean;
  skipIndCheck?: boolean;
}

function RequestFormInner() {
  const searchParams = useSearchParams();
  const initialNop = searchParams.get("nop") || "";

  const [nop, setNop] = useState<string>(MASTER_DATA[initialNop] ? initialNop : "");
  const [bundle, setBundle] = useState<NopSheetBundle | null>(null);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [bundleError, setBundleError] = useState("");

  // Step 1: Petugas & Tiket
  const [tanggal, setTanggal] = useState<string>(todayIsoWib());
  const [cluster, setCluster] = useState<string>("");
  const [nama, setNama] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("");
  const [siteFilter, setSiteFilter] = useState<string>("");
  const [pilihanKep, setPilihanKep] = useState<string>("");
  const [manualKep, setManualKep] = useState<string>("");
  const [pmSelected, setPmSelected] = useState<string[]>([]);
  const [tiketManual, setTiketManual] = useState<string>("");

  // Step 2: Klasifikasi Pekerjaan
  const [valAtas, setValAtas] = useState<string[]>([]);
  const [manualAtas, setManualAtas] = useState<string>("");
  const [valBawah, setValBawah] = useState<string[]>([]);
  const [manualBawah, setManualBawah] = useState<string>("");
  const [isKirimMat, setIsKirimMat] = useState<boolean>(false);
  const [matModule, setMatModule] = useState<string>("");
  const [matSite, setMatSite] = useState<string>("");
  const [deskripsiCustom, setDeskripsiCustom] = useState<string>("");
  const [deskripsiTouched, setDeskripsiTouched] = useState<boolean>(false);
  const [timBareng, setTimBareng] = useState<string[]>([]);

  // Step 3: Rute Peta
  const [latBrgkt, setLatBrgkt] = useState<string>("0");
  const [lonBrgkt, setLonBrgkt] = useState<string>("0");
  const [latTujuan, setLatTujuan] = useState<string>("0");
  const [lonTujuan, setLonTujuan] = useState<string>("0");
  const [routeInfo, setRouteInfo] = useState<{ distOneWay: number; distPP: number; durSecOneWay: number }>({
    distOneWay: 0,
    distPP: 0,
    durSecOneWay: 0,
  });
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Step 4: Kebutuhan Dana Multi-Split
  const [kebutuhanList, setKebutuhanList] = useState<string[]>([]);
  const [jnsBbmList, setJnsBbmList] = useState<string[]>([]);

  // Mobil state
  const [srcMob, setSrcMob] = useState<"SPBU" | "Eceran">("SPBU");
  const [jbMob, setJbMob] = useState<string>("Pertalite");
  const [ktMob, setKtMob] = useState<number>(0);
  const [hsMob, setHsMob] = useState<number>(10000);
  const [optMob, setOptMob] = useState<"1x" | "2x">("1x");
  const [lMobReq, setLMobReq] = useState<number>(5);
  const [lMob1, setLMob1] = useState<number>(2.5);
  const [lMob2, setLMob2] = useState<number>(2.5);
  const [platMobPick, setPlatMobPick] = useState<string>("");
  const [platMobMan, setPlatMobMan] = useState<string>("");
  const [kmMobRaw, setKmMobRaw] = useState<string>("0");

  // Motor state
  const [srcMot, setSrcMot] = useState<"SPBU" | "Eceran">("SPBU");
  const [jbMot, setJbMot] = useState<string>("Pertalite");
  const [ktMot, setKtMot] = useState<number>(0);
  const [hsMot, setHsMot] = useState<number>(10000);
  const [optMot, setOptMot] = useState<"1x" | "2x">("1x");
  const [lMotReq, setLMotReq] = useState<number>(2);
  const [lMot1, setLMot1] = useState<number>(1);
  const [lMot2, setLMot2] = useState<number>(1);
  const [platMotPick, setPlatMotPick] = useState<string>("");
  const [platMotMan, setPlatMotMan] = useState<string>("");
  const [kmMotRaw, setKmMotRaw] = useState<string>("0");

  // Genset state (Solar vs Portable)
  const [tipeGenset, setTipeGenset] = useState<"Solar" | "Portable">("Solar");
  const [srcGen, setSrcGen] = useState<"SPBU" | "Eceran">("SPBU");
  const [jbGen, setJbGen] = useState<string>("Dexlite");
  const [ktGen, setKtGen] = useState<number>(0);
  const [estJamGen, setEstJamGen] = useState<number>(5);
  const [hsGen, setHsGen] = useState<number>(25000);
  const [optGen, setOptGen] = useState<"1x" | "2x">("1x");
  const [lGenReq, setLGenReq] = useState<number>(12.5);
  const [lGen1, setLGen1] = useState<number>(6);
  const [lGen2, setLGen2] = useState<number>(6.5);
  const [platGenPick, setPlatGenPick] = useState<string>("");
  const [platGenMan, setPlatGenMan] = useState<string>("");
  const [tanpaRhPortable, setTanpaRhPortable] = useState<boolean>(false);
  const [rhGenRaw, setRhGenRaw] = useState<string>("0");

  // UM & Penginapan
  const [hariReq, setHariReq] = useState<number>(1);
  const [malamInap, setMalamInap] = useState<number>(1);
  const [nomInapPerMalam, setNomInapPerMalam] = useState<number>(150000);

  // Material, Support, Fery, Klotok
  const [namaBrgMat, setNamaBrgMat] = useState<string>("");
  const [kebMat, setKebMat] = useState<number>(0);
  const [kebSupport, setKebSupport] = useState<number>(0);
  const [kebFery, setKebFery] = useState<number>(0);
  const [kebKlotok, setKebKlotok] = useState<number>(0);

  // Step 5: Pembayaran & Foto
  const [bank, setBank] = useState<string>("BNI");
  const [noRek, setNoRek] = useState<string>("");
  const [nominalTfManual, setNominalTfManual] = useState<string>("");
  const [fotoKm, setFotoKm] = useState<File | null>(null);
  const [fotoEvidance, setFotoEvidance] = useState<File | null>(null);

  // Step 6: Checklist & Submit
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [waReadyText, setWaReadyText] = useState("");
  const [copiedWa, setCopiedWa] = useState(false);

  // Fetch NOP Bundle
  async function loadNopData(targetNop: string, refresh = false) {
    if (!targetNop) {
      setBundle(null);
      return;
    }
    setLoadingBundle(true);
    setBundleError("");
    try {
      const res = await fetch(`/api/nop-data?nop=${encodeURIComponent(targetNop)}${refresh ? "&refresh=1" : ""}`);
      const json = (await res.json()) as NopSheetBundle & { error?: string };
      if (!res.ok) throw new Error(json.error || "Gagal memuat data NOP");
      setBundle(json);
    } catch (e) {
      setBundleError((e as Error).message);
    } finally {
      setLoadingBundle(false);
    }
  }

  useEffect(() => {
    if (nop) loadNopData(nop, false);
  }, [nop]);

  // Auto-fill Role, Homebase Lat/Long, Bank, NoRek, Nopol when Nama changes
  useEffect(() => {
    if (!nama || !bundle) return;
    const key = nama.trim().toUpperCase();
    const tInfo = bundle.timDict[key];
    if (tInfo) {
      if (tInfo.lat && tInfo.lat !== "0") setLatBrgkt(tInfo.lat);
      if (tInfo.lon && tInfo.lon !== "0") setLonBrgkt(tInfo.lon);
      if (tInfo.role && LIST_ROLES.includes(tInfo.role)) setRole(tInfo.role);
      if (tInfo.nopol) {
        setPlatMobPick(tInfo.nopol);
        setPlatMotPick(tInfo.nopol);
      }
    }
    // Cari bank & norek terakhir dari reqRows
    for (let i = bundle.reqRows.length - 1; i >= 1; i--) {
      const r = bundle.reqRows[i] || [];
      if (r.length > 18 && String(r[5] ?? "").trim().toUpperCase() === key) {
        const b = String(r[17] ?? "").trim().toUpperCase();
        const nr = String(r[18] ?? "").trim();
        if (LIST_BANKS.includes(b)) {
          setBank(b);
          setNoRek(nr);
          break;
        }
      }
    }
  }, [nama, bundle]);

  // Auto-fill Site Lat/Long when Site ID matches
  useEffect(() => {
    const found = SITES_DATA.find((s) => s.id === siteId);
    if (found) {
      setLatTujuan(String(found.lat));
      setLonTujuan(String(found.lon));
    }
  }, [siteId]);

  // Calculate OSRM / Haversine route when coordinates change
  useEffect(() => {
    const a1 = parseFloat(latBrgkt.replace(",", "."));
    const o1 = parseFloat(lonBrgkt.replace(",", "."));
    const a2 = parseFloat(latTujuan.replace(",", "."));
    const o2 = parseFloat(lonTujuan.replace(",", "."));
    if (!a1 || !o1 || !a2 || !o2) {
      setRouteInfo({ distOneWay: 0, distPP: 0, durSecOneWay: 0 });
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingRoute(true);
      try {
        const res = await fetch(`/api/route-distance?lat1=${a1}&lon1=${o1}&lat2=${a2}&lon2=${o2}`);
        if (res.ok) {
          const j = await res.json();
          setRouteInfo({ distOneWay: j.distOneWay || 0, distPP: j.distPP || 0, durSecOneWay: j.durSecOneWay || 0 });
        }
      } catch {
        // ignore
      } finally {
        setLoadingRoute(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [latBrgkt, lonBrgkt, latTujuan, lonTujuan]);

  // Sync default prices when SPBU/Eceran or fuel type changes
  useEffect(() => {
    const { rule } = getBbmRule(jbMob, srcMob);
    if (rule) setHsMob(rule.default);
  }, [srcMob, jbMob]);

  useEffect(() => {
    const { rule } = getBbmRule(jbMot, srcMot);
    if (rule) setHsMot(rule.default);
  }, [srcMot, jbMot]);

  useEffect(() => {
    const validFuels = tipeGenset === "Portable" ? ["Pertalite", "Pertamax"] : ["Dexlite", "Bio Solar", "Pertamina Dex"];
    if (!validFuels.includes(jbGen)) {
      setJbGen(validFuels[0]);
      return;
    }
    const { rule } = getBbmRule(jbGen, srcGen);
    if (rule) setHsGen(rule.default);
  }, [tipeGenset, srcGen, jbGen]);

  // Auto-generate Deskripsi from Atas/Bawah/Material
  const autoDescText = useMemo(() => {
    const lines: string[] = [];
    if (valAtas.length > 0) {
      const c = valAtas.filter((x) => x !== "Lainnya (Ketik Manual)");
      if (manualAtas.trim()) c.push(manualAtas.trim());
      if (c.length > 0) lines.push("BAGIAN ATAS: " + c.join(", "));
    }
    if (valBawah.length > 0) {
      const c = valBawah.filter((x) => x !== "Lainnya (Ketik Manual)");
      if (manualBawah.trim()) c.push(manualBawah.trim());
      if (c.length > 0) lines.push("BAGIAN BAWAH: " + c.join(", "));
    }
    if (isKirimMat) {
      lines.push(`PENGIRIMAN MATERIAL: ${matModule} (Tujuan: Site ${matSite})`);
    }
    return lines.join("\n");
  }, [valAtas, manualAtas, valBawah, manualBawah, isKirimMat, matModule, matSite]);

  const deskripsi = deskripsiTouched ? deskripsiCustom : autoDescText;

  // Derived ticket & user lock status
  const keperluan = pilihanKep === "Lainnya (Ketik Manual)" ? manualKep.trim() : pilihanKep;
  const baseTiketClean = useMemo(() => {
    if (keperluan === "PM" && pmSelected.length > 0) return pmSelected.join(", ").toUpperCase();
    return tiketManual.trim().toUpperCase();
  }, [keperluan, pmSelected, tiketManual]);

  const userStatus = useMemo(() => {
    if (!bundle || !nama) return { outstandingAll: [], outstandingLock: [], agingTickets: [], history: [] };
    return getUserTicketsStatus(nama, bundle.reqRows, bundle.pjbRows, bundle.appRows);
  }, [bundle, nama]);

  const timTerkunci = useMemo(() => {
    if (!bundle || !["TE", "MBP", "CME"].includes(role) || timBareng.length === 0) return [];
    return timBareng.filter((m) => getUserTicketsStatus(m, bundle.reqRows, bundle.pjbRows, bundle.appRows).outstandingLock.length > 0);
  }, [bundle, role, timBareng]);

  // Duplicate ticket & Izin Revisi check
  const dupInfo = useMemo(() => {
    if (!bundle || !baseTiketClean) return { isDup: false, isRejectedReq: false, statusIzin: "NONE" };
    let isRejectedReq = false;
    for (let i = bundle.appRows.length - 1; i >= 1; i--) {
      const a = bundle.appRows[i] || [];
      if (a[3] === "Request Dana" && String(a[2] ?? "").trim().toUpperCase() === baseTiketClean) {
        if (String(a[5] ?? "").trim().toUpperCase() === "REJECTED") isRejectedReq = true;
        break;
      }
    }
    let isDup = false;
    if (!isRejectedReq) {
      for (let i = 1; i < bundle.reqRows.length; i++) {
        const t = String(bundle.reqRows[i]?.[3] ?? "").trim().toUpperCase();
        if (t && t.includes(baseTiketClean)) {
          isDup = true;
          break;
        }
      }
    }
    let statusIzin = "NONE";
    if (isDup) {
      for (let i = bundle.appRows.length - 1; i >= 1; i--) {
        const a = bundle.appRows[i] || [];
        if (a[3] === "Izin Revisi" && String(a[2] ?? "").trim().toUpperCase() === baseTiketClean) {
          statusIzin = String(a[5] ?? "").trim().toUpperCase();
          break;
        }
      }
    }
    return { isDup, isRejectedReq, statusIzin };
  }, [bundle, baseTiketClean]);

  const nowWib = useMemo(() => getNowWib(), []);

  // Plat & Last Indicator details
  const platMob = (platMobPick === "__NEW__" || !platMobPick ? platMobMan : platMobPick).trim().toUpperCase();
  const platMot = (platMotPick === "__NEW__" || !platMotPick ? platMotMan : platMotPick).trim().toUpperCase();
  const platGen = (platGenPick === "__NEW__" || !platGenPick ? platGenMan : platGenPick).trim().toUpperCase();

  const lastInfoMob = useMemo(
    () =>
      bundle && platMob
        ? getLastIndicatorDetail(platMob, "Mobil", bundle.pjbRows, bundle.reqRows, bundle.appRows, bundle.overrides)
        : { value: 0, timestampStr: "-", dtObj: null, source: "-", tiket: "-", pic: "-" },
    [bundle, platMob]
  );
  const lastInfoMot = useMemo(
    () =>
      bundle && platMot
        ? getLastIndicatorDetail(platMot, "Motor", bundle.pjbRows, bundle.reqRows, bundle.appRows, bundle.overrides)
        : { value: 0, timestampStr: "-", dtObj: null, source: "-", tiket: "-", pic: "-" },
    [bundle, platMot]
  );
  const lastInfoGen = useMemo(
    () =>
      bundle && platGen
        ? getLastIndicatorDetail(platGen, "Genset", bundle.pjbRows, bundle.reqRows, bundle.appRows, bundle.overrides)
        : { value: 0, timestampStr: "-", dtObj: null, source: "-", tiket: "-", pic: "-" },
    [bundle, platGen]
  );

  // Sync initial KM/RH input when plat changes
  useEffect(() => {
    setKmMobRaw(lastInfoMob.value > 0 ? String(lastInfoMob.value) : "0");
  }, [platMob, lastInfoMob.value]);

  useEffect(() => {
    setKmMotRaw(lastInfoMot.value > 0 ? String(lastInfoMot.value) : "0");
  }, [platMot, lastInfoMot.value]);

  useEffect(() => {
    setRhGenRaw(lastInfoGen.value > 0 ? String(lastInfoGen.value) : "0");
  }, [platGen, lastInfoGen.value]);

  // 5 Histori terakhir per Plat Mobil / Genset
  const hist5Mob = useMemo(() => {
    if (!bundle || !platMob) return [];
    const pn = normalizePlatKey(platMob);
    const arr: { tgl: string; tiket: string; pic: string; kmAkhir: string; trip: string }[] = [];
    for (let i = bundle.pjbRows.length - 1; i >= 1; i--) {
      const r = bundle.pjbRows[i] || [];
      if (r.length > 12 && normalizePlatKey(r[12]) === pn && String(r[8] ?? "").toLowerCase().includes("mobil")) {
        arr.push({
          tgl: r[1] || "-",
          tiket: r[21] || "-",
          pic: r[4] || "-",
          kmAkhir: formatIdNumber(cleanIndicator(r[10])),
          trip: `${r[24] || "-"} KM`,
        });
        if (arr.length >= 5) break;
      }
    }
    return arr;
  }, [bundle, platMob]);

  const hist5Gen = useMemo(() => {
    if (!bundle || !platGen) return [];
    const pn = normalizePlatKey(platGen);
    const arr: { tgl: string; tiket: string; pic: string; rhAkhir: string; run: string }[] = [];
    for (let i = bundle.pjbRows.length - 1; i >= 1; i--) {
      const r = bundle.pjbRows[i] || [];
      if (r.length > 12 && normalizePlatKey(r[12]) === pn && String(r[8] ?? "").toLowerCase().includes("genset")) {
        arr.push({
          tgl: r[1] || "-",
          tiket: r[21] || "-",
          pic: r[4] || "-",
          rhAkhir: formatIdNumber(cleanIndicator(r[10])),
          run: `${r[24] || "-"} RH`,
        });
        if (arr.length >= 5) break;
      }
    }
    return arr;
  }, [bundle, platGen]);

  // Build Sub-Requests + Validations
  const parsedMobKm = parseIndonesianIndicator(kmMobRaw, lastInfoMob.value, "KM");
  const ctrlMob = evaluateLiveIndicatorControl(parsedMobKm.value, lastInfoMob, nowWib, "Mobil");
  const parsedMotKm = parseIndonesianIndicator(kmMotRaw, lastInfoMot.value, "KM");
  const ctrlMot = evaluateLiveIndicatorControl(parsedMotKm.value, lastInfoMot, nowWib, "Motor");
  const parsedGenRh = parseIndonesianIndicator(rhGenRaw, lastInfoGen.value, "RH");
  const ctrlGen = evaluateLiveIndicatorControl(parsedGenRh.value, lastInfoGen, nowWib, "Genset");

  const jarakKmPP = routeInfo.distPP;
  const durJamPP = (routeInfo.durSecOneWay * 2) / 3600;
  const jamInt = Math.floor(durJamPP);
  const mntInt = Math.floor((durJamPP - jamInt) * 60);
  const jarakFinalText = jarakKmPP > 0 ? `${jarakKmPP.toFixed(1)} Km (PP) | ${jamInt} Jam ${mntInt} Mnt` : "";
  const invalidCoords = jarakKmPP <= 0;

  // Motor monthly spend check
  const motorSpentThisMonth = useMemo(() => {
    if (!bundle || !nama) return 0;
    const key = nama.trim().toUpperCase();
    const nowM = `${nowWib.getMonth() + 1}/${nowWib.getFullYear()}`;
    let tot = 0;
    for (let i = 1; i < bundle.reqRows.length; i++) {
      const r = bundle.reqRows[i] || [];
      if (r.length > 10 && String(r[5] ?? "").trim().toUpperCase() === key) {
        const d = parseDate(r[1], r[0]);
        if (d && `${d.getMonth() + 1}/${d.getFullYear()}` === nowM && String(r[10] ?? "").toLowerCase().includes("motor")) {
          tot += cleanNominal(r[9]);
        }
      }
    }
    return tot;
  }, [bundle, nama, nowWib]);

  // Compute sub_requests + errors
  const calc = useMemo(() => {
    const subs: SubRequest[] = [];
    const tankErrors: string[] = [];
    const priceErrors: string[] = [];
    const indErrors: string[] = [];
    const umErrors: string[] = [];

    const hasBbm = kebutuhanList.includes("BBM");
    const isMob = hasBbm && jnsBbmList.includes("Mobil");
    const isMot = hasBbm && jnsBbmList.includes("Motor");
    const isGen = hasBbm && jnsBbmList.includes("Genset");

    if (isMob) {
      if (ktMob <= 0) tankErrors.push("Kapasitas Tangki Mobil wajib diisi (>0 Liter).");
      const vp = validateBbmPrice(jbMob, hsMob, srcMob);
      if (!vp.ok) priceErrors.push(`Mobil ${jbMob} [${srcMob}]: ${vp.msg}`);
      if (parsedMobKm.level === "err") indErrors.push(`Mobil (${platMob}): ${parsedMobKm.note}`);
      else if (ctrlMob.isBlocking) indErrors.push(`Mobil (${platMob}): ${ctrlMob.statusShort}`);

      const estL = jarakKmPP > 0 ? Math.max(0.5, Math.round((jarakKmPP / 9) * 10) / 10) : 5;
      const totL = optMob === "1x" ? lMobReq : Math.round((lMob1 + lMob2) * 10) / 10;
      const keb = Math.round(totL * hsMob);
      if (optMob === "1x") {
        if (lMobReq <= 0) tankErrors.push("Total Liter BBM Mobil harus > 0.");
        else if (ktMob > 0 && lMobReq > ktMob) tankErrors.push(`Over Request Tangki Mobil (${lMobReq} L > ${ktMob} L). Pilih 2x Pengisian!`);
      } else {
        if (lMob1 <= 0 || lMob2 <= 0) tankErrors.push("Liter Pengisian 1 & 2 Mobil wajib > 0.");
        else if (ktMob > 0 && (lMob1 > ktMob || lMob2 > ktMob)) tankErrors.push(`Setiap tahap pengisian Mobil tidak boleh > kapasitas tangki (${ktMob} L).`);
      }
      const histStr =
        lastInfoMob.value > 0
          ? `KM ${formatIdNumber(lastInfoMob.value)}->${formatIdNumber(parsedMobKm.value)} (+${formatIdNumber(ctrlMob.selisih)} KM dlm ${ctrlMob.elapsedText} | ${ctrlMob.statusShort})`
          : `KM Awal: ${formatIdNumber(parsedMobKm.value)}`;
      const katBase = `Mobil - ${jbMob} [${srcMob.toUpperCase()}]`;
      if (optMob === "1x") {
        subs.push({
          tiket: `${baseTiketClean} [MOBIL]`,
          kategori: katBase,
          kebutuhan: keb,
          plat: platMob,
          indikator: parsedMobKm.value,
          lastInd: lastInfoMob.value,
          tipe: "Mobil",
          kapasitasTangki: ktMob,
          infoBbm: `Beli: ${srcMob.toUpperCase()} | Tangki: ${ktMob} L | Req Tim: ${lMobReq} L (@Rp ${hsMob.toLocaleString("id-ID")}) = ${formatRupiah(keb)} | Std (${jarakKmPP.toFixed(1)} KM): ${estL} L | ${histStr}`,
        });
      } else {
        const k1 = Math.round(lMob1 * hsMob);
        const k2 = Math.round(lMob2 * hsMob);
        subs.push({
          tiket: `${baseTiketClean} [MOBIL-1]`,
          kategori: `${katBase} (Isi 1)`,
          kebutuhan: k1,
          plat: platMob,
          indikator: parsedMobKm.value,
          lastInd: lastInfoMob.value,
          tipe: "Mobil",
          kapasitasTangki: ktMob,
          infoBbm: `Beli: ${srcMob.toUpperCase()} | Tangki: ${ktMob} L | Isi 1: ${lMob1} L (@Rp ${hsMob.toLocaleString("id-ID")}) = ${formatRupiah(k1)} | ${histStr}`,
        });
        subs.push({
          tiket: `${baseTiketClean} [MOBIL-2]`,
          kategori: `${katBase} (Isi 2)`,
          kebutuhan: k2,
          plat: platMob,
          indikator: parsedMobKm.value,
          lastInd: lastInfoMob.value,
          tipe: "Mobil",
          kapasitasTangki: ktMob,
          infoBbm: `Beli: ${srcMob.toUpperCase()} | Tangki: ${ktMob} L | Isi 2: ${lMob2} L (@Rp ${hsMob.toLocaleString("id-ID")}) = ${formatRupiah(k2)} | ${histStr}`,
        });
      }
    }

    if (isMot) {
      if (ktMot <= 0) tankErrors.push("Kapasitas Tangki Motor wajib diisi (>0 Liter).");
      const vp = validateBbmPrice(jbMot, hsMot, srcMot);
      if (!vp.ok) priceErrors.push(`Motor ${jbMot} [${srcMot}]: ${vp.msg}`);
      if (parsedMotKm.level === "err") indErrors.push(`Motor (${platMot}): ${parsedMotKm.note}`);
      else if (ctrlMot.isBlocking) indErrors.push(`Motor (${platMot}): ${ctrlMot.statusShort}`);

      const totL = optMot === "1x" ? lMotReq : Math.round((lMot1 + lMot2) * 10) / 10;
      const keb = Math.round(totL * hsMot);
      if (optMot === "1x") {
        if (lMotReq <= 0) tankErrors.push("Total Liter BBM Motor harus > 0.");
        else if (ktMot > 0 && lMotReq > ktMot) tankErrors.push(`Over Request Tangki Motor (${lMotReq} L > ${ktMot} L). Pilih 2x Pengisian!`);
      } else {
        if (lMot1 <= 0 || lMot2 <= 0) tankErrors.push("Liter Pengisian 1 & 2 Motor wajib > 0.");
        else if (ktMot > 0 && (lMot1 > ktMot || lMot2 > ktMot)) tankErrors.push(`Setiap tahap pengisian Motor tidak boleh > kapasitas tangki (${ktMot} L).`);
      }
      const histStr =
        lastInfoMot.value > 0
          ? `KM ${formatIdNumber(lastInfoMot.value)}->${formatIdNumber(parsedMotKm.value)} (+${formatIdNumber(ctrlMot.selisih)} KM dlm ${ctrlMot.elapsedText})`
          : `KM Awal: ${formatIdNumber(parsedMotKm.value)}`;
      const katBase = `Motor - ${jbMot} [${srcMot.toUpperCase()}]`;
      if (optMot === "1x") {
        subs.push({
          tiket: `${baseTiketClean} [MOTOR]`,
          kategori: katBase,
          kebutuhan: keb,
          plat: platMot,
          indikator: parsedMotKm.value,
          lastInd: lastInfoMot.value,
          tipe: "Motor",
          kapasitasTangki: ktMot,
          infoBbm: `Beli: ${srcMot.toUpperCase()} | Tangki: ${ktMot} L | Req Tim: ${lMotReq} L (@Rp ${hsMot.toLocaleString("id-ID")}) = ${formatRupiah(keb)} | ${histStr}`,
        });
      } else {
        const k1 = Math.round(lMot1 * hsMot);
        const k2 = Math.round(lMot2 * hsMot);
        subs.push({
          tiket: `${baseTiketClean} [MOTOR-1]`,
          kategori: `${katBase} (Isi 1)`,
          kebutuhan: k1,
          plat: platMot,
          indikator: parsedMotKm.value,
          lastInd: lastInfoMot.value,
          tipe: "Motor",
          kapasitasTangki: ktMot,
          infoBbm: `Beli: ${srcMot.toUpperCase()} | Tangki: ${ktMot} L | Isi 1: ${lMot1} L = ${formatRupiah(k1)} | ${histStr}`,
        });
        subs.push({
          tiket: `${baseTiketClean} [MOTOR-2]`,
          kategori: `${katBase} (Isi 2)`,
          kebutuhan: k2,
          plat: platMot,
          indikator: parsedMotKm.value,
          lastInd: lastInfoMot.value,
          tipe: "Motor",
          kapasitasTangki: ktMot,
          infoBbm: `Beli: ${srcMot.toUpperCase()} | Tangki: ${ktMot} L | Isi 2: ${lMot2} L = ${formatRupiah(k2)} | ${histStr}`,
        });
      }
    }

    if (isGen) {
      const isPort = tipeGenset === "Portable";
      const rateL = isPort ? 1.2 : 2.5;
      const estL = Math.max(0.5, Math.round(estJamGen * rateL * 10) / 10);
      if (ktGen <= 0) tankErrors.push("Kapasitas Tangki Genset / Jerigen wajib diisi (>0 Liter).");
      const vp = validateBbmPrice(jbGen, hsGen, srcGen);
      if (!vp.ok) priceErrors.push(`Genset ${jbGen} [${srcGen}]: ${vp.msg}`);
      if (!tanpaRhPortable) {
        if (parsedGenRh.level === "err") indErrors.push(`Genset (${platGen}): ${parsedGenRh.note}`);
        else if (ctrlGen.isBlocking) indErrors.push(`Genset (${platGen}): ${ctrlGen.statusShort}`);
      }
      if (optGen === "1x") {
        if (lGenReq <= 0) tankErrors.push("Total Liter BBM Genset harus > 0.");
        else if (ktGen > 0 && lGenReq > ktGen) tankErrors.push(`Over Request Tangki Genset (${lGenReq} L > ${ktGen} L). Pilih 2x Pengisian!`);
      } else {
        if (lGen1 <= 0 || lGen2 <= 0) tankErrors.push("Liter Pengisian 1 & 2 Genset wajib > 0.");
        else if (ktGen > 0 && (lGen1 > ktGen || lGen2 > ktGen)) tankErrors.push(`Setiap tahap pengisian Genset tidak boleh > kapasitas tangki (${ktGen} L).`);
      }

      const rhFinal = tanpaRhPortable ? lastInfoGen.value : parsedGenRh.value;
      const histStr = tanpaRhPortable
        ? "Portable Non-RH"
        : lastInfoGen.value > 0
        ? `RH ${formatIdNumber(lastInfoGen.value)}->${formatIdNumber(rhFinal)} (+${formatIdNumber(ctrlGen.selisih)} RH dlm ${ctrlGen.elapsedText} | ${ctrlGen.statusShort})`
        : `RH Awal: ${formatIdNumber(rhFinal)}`;
      const lblUnit = isPort ? "Genset Portable" : "Genset Solar";
      const katBase = isPort ? `Genset Portable - ${jbGen} [${srcGen.toUpperCase()}]` : `Genset - ${jbGen} [${srcGen.toUpperCase()}]`;
      if (optGen === "1x") {
        const keb = Math.round(lGenReq * hsGen);
        subs.push({
          tiket: `${baseTiketClean} [GENSET]`,
          kategori: katBase,
          kebutuhan: keb,
          plat: platGen,
          indikator: rhFinal,
          lastInd: lastInfoGen.value,
          tipe: "Genset",
          kapasitasTangki: ktGen,
          skipIndCheck: tanpaRhPortable,
          infoBbm: `Unit: ${lblUnit} | Beli: ${srcGen.toUpperCase()} | Tangki: ${ktGen} L | Req Tim: ${lGenReq} L (@Rp ${hsGen.toLocaleString("id-ID")}) = ${formatRupiah(keb)} | Std (${estJamGen} Jam): ${estL} L | ${histStr}`,
        });
      } else {
        const k1 = Math.round(lGen1 * hsGen);
        const k2 = Math.round(lGen2 * hsGen);
        subs.push({
          tiket: `${baseTiketClean} [GENSET-1]`,
          kategori: `${katBase} (Isi 1)`,
          kebutuhan: k1,
          plat: platGen,
          indikator: rhFinal,
          lastInd: lastInfoGen.value,
          tipe: "Genset",
          kapasitasTangki: ktGen,
          skipIndCheck: tanpaRhPortable,
          infoBbm: `Unit: ${lblUnit} | Beli: ${srcGen.toUpperCase()} | Tangki: ${ktGen} L | Isi 1: ${lGen1} L = ${formatRupiah(k1)} | ${histStr}`,
        });
        subs.push({
          tiket: `${baseTiketClean} [GENSET-2]`,
          kategori: `${katBase} (Isi 2)`,
          kebutuhan: k2,
          plat: platGen,
          indikator: rhFinal,
          lastInd: lastInfoGen.value,
          tipe: "Genset",
          kapasitasTangki: ktGen,
          skipIndCheck: tanpaRhPortable,
          infoBbm: `Unit: ${lblUnit} | Beli: ${srcGen.toUpperCase()} | Tangki: ${ktGen} L | Isi 2: ${lGen2} L = ${formatRupiah(k2)} | ${histStr}`,
        });
      }
    }

    const jmlOrg = 1 + timBareng.length;
    if (kebutuhanList.includes("Uang Makan")) {
      if (valAtas.length === 0 && valBawah.length === 0 && !isKirimMat) {
        umErrors.push("Pilih jenis pekerjaan (Atas/Bawah/Pengiriman Material) untuk membuka nominal Uang Makan!");
      } else {
        const isBerat =
          valAtas.length > 0 ||
          isKirimMat ||
          valBawah.some((x) => !["Pengecekan MCB", "BCP"].includes(x));
        const isAtasRru = valAtas.includes("RRU");
        let baseUm = 0;
        let katUm = "Uang Makan";
        let allowUnder80 = false;
        if (jarakKmPP < 80) {
          if (isAtasRru) {
            baseUm = 30000;
            allowUnder80 = true;
            katUm = "Uang Makan (Pekerjaan Atas - Ganti RRU <80KM)";
          } else {
            baseUm = 0;
            umErrors.push(`Jarak PP hanya ${jarakKmPP.toFixed(1)} KM (<80 KM). Minimal >80 KM (kecuali Pekerjaan Atas ganti RRU = Rp 30.000/org).`);
          }
        } else {
          baseUm = isBerat ? 60000 : 30000;
          katUm = isBerat ? "Uang Makan (Pekerjaan Berat)" : "Uang Makan (Pekerjaan Ringan)";
        }
        const nomHarian = baseUm * jmlOrg;
        const totUm = hariReq * nomHarian;
        if (totUm > 0) {
          subs.push({
            tiket: `${baseTiketClean} [UM]`,
            kategori: katUm,
            kebutuhan: totUm,
            plat: "",
            indikator: 0,
            lastInd: 0,
            tipe: "UM",
            hari: hariReq,
            nomPerUnit: nomHarian,
            allowUnder80,
          });
        }
      }
    }

    if (kebutuhanList.includes("Penginapan")) {
      const maxInap = 150000 * jmlOrg;
      const nomClamped = Math.min(nomInapPerMalam, maxInap);
      if (jarakKmPP < 80) umErrors.push(`Penginapan mensyaratkan jarak PP minimal 80 KM (saat ini ${jarakKmPP.toFixed(1)} KM).`);
      subs.push({
        tiket: `${baseTiketClean} [INAP]`,
        kategori: "Penginapan",
        kebutuhan: malamInap * nomClamped,
        plat: "",
        indikator: 0,
        lastInd: 0,
        tipe: "Inap",
        hari: malamInap,
        nomPerUnit: nomClamped,
        allowUnder80: false,
      });
    }

    if (kebutuhanList.includes("Material")) {
      subs.push({
        tiket: `${baseTiketClean} [MATERIAL]`,
        kategori: namaBrgMat.trim() ? `Material (${namaBrgMat.trim()})` : "Material",
        kebutuhan: kebMat,
        plat: "",
        indikator: 0,
        lastInd: 0,
        tipe: "Material",
      });
    }
    if (kebutuhanList.includes("Support")) {
      subs.push({ tiket: `${baseTiketClean} [SUPPORT]`, kategori: "Support", kebutuhan: kebSupport, plat: "", indikator: 0, lastInd: 0, tipe: "Support" });
    }
    if (kebutuhanList.includes("Fery Reguler/Carter")) {
      subs.push({ tiket: `${baseTiketClean} [FERY]`, kategori: "Fery", kebutuhan: kebFery, plat: "", indikator: 0, lastInd: 0, tipe: "Fery" });
    }
    if (kebutuhanList.includes("Klotok/Kapal Carter")) {
      subs.push({ tiket: `${baseTiketClean} [KLOTOK]`, kategori: "Klotok", kebutuhan: kebKlotok, plat: "", indikator: 0, lastInd: 0, tipe: "Klotok" });
    }

    const totalAll = subs.reduce((acc, s) => acc + s.kebutuhan, 0);
    const motorKeb = subs.filter((s) => s.tipe === "Motor").reduce((acc, s) => acc + s.kebutuhan, 0);
    return { subs, tankErrors, priceErrors, indErrors, umErrors, totalAll, motorKeb };
  }, [
    kebutuhanList, jnsBbmList, ktMob, jbMob, hsMob, srcMob, optMob, lMobReq, lMob1, lMob2, platMob,
    parsedMobKm, ctrlMob, lastInfoMob, ktMot, jbMot, hsMot, srcMot, optMot, lMotReq, lMot1, lMot2,
    platMot, parsedMotKm, ctrlMot, lastInfoMot, tipeGenset, ktGen, jbGen, hsGen, srcGen, estJamGen,
    optGen, lGenReq, lGen1, lGen2, platGen, tanpaRhPortable, parsedGenRh, ctrlGen, lastInfoGen,
    jarakKmPP, baseTiketClean, timBareng, valAtas, valBawah, isKirimMat, hariReq, malamInap,
    nomInapPerMalam, namaBrgMat, kebMat, kebSupport, kebFery, kebKlotok,
  ]);

  // Approval check for Limit Motor & Harga BBM
  const approvalStatuses = useMemo(() => {
    let limitMotor = "NONE";
    let hargaBbm = "NONE";
    if (!bundle || !baseTiketClean) return { limitMotor, hargaBbm };
    for (let i = bundle.appRows.length - 1; i >= 1; i--) {
      const a = bundle.appRows[i] || [];
      if (String(a[2] ?? "").trim().toUpperCase() === baseTiketClean) {
        if (a[3] === "Limit Motor" && limitMotor === "NONE") limitMotor = String(a[5] ?? "").trim().toUpperCase();
        if (a[3] === "Harga BBM" && hargaBbm === "NONE") hargaBbm = String(a[5] ?? "").trim().toUpperCase();
      }
    }
    return { limitMotor, hargaBbm };
  }, [bundle, baseTiketClean]);

  const motorOverLimit = calc.motorKeb > 0 && motorSpentThisMonth + calc.motorKeb > 500000;
  const motorLimitLocked = motorOverLimit && approvalStatuses.limitMotor !== "APPROVED";
  const priceLocked = calc.priceErrors.length > 0 && approvalStatuses.hargaBbm !== "APPROVED";
  const dupLocked = dupInfo.isDup && dupInfo.statusIzin !== "APPROVED";

  // Checklist keys required
  const showAtas = valAtas.length > 0;
  const showBawah = valBawah.length > 0;
  const showPm = valBawah.some((x) => x.includes("Preventive Maintenance"));
  const requiredCheckKeys = useMemo(() => {
    const keys: string[] = [];
    if (showAtas) keys.push("a1", "a2", "a3", "a4", "a5", "a6");
    if (showBawah) keys.push("b1", "b2", "b3", "b4", "b5", "b6");
    if (showPm) keys.push("p1", "p2", "p3", "p4", "p5", "p6");
    if (!showAtas && !showBawah && !showPm) keys.push("def1");
    return keys;
  }, [showAtas, showBawah, showPm]);

  const allChecked = requiredCheckKeys.every((k) => Boolean(checks[k]));
  const nominalTfFinal = nominalTfManual !== "" ? cleanNominal(nominalTfManual) : calc.totalAll;

  async function handleRequestApproval(jenis: "Izin Revisi" | "Limit Motor" | "Harga BBM", nominal: number, ket: string) {
    if (!nop || !nama || !baseTiketClean) {
      setSubmitErr("Isi NOP, Nama PIC, dan Nomor Tiket terlebih dahulu sebelum meminta Approval.");
      return;
    }
    setSubmitting(true);
    setSubmitErr("");
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_approval",
          nop,
          nama,
          tiket: baseTiketClean,
          jenis,
          nominal,
          keterangan: ket,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal mengirim permintaan approval");
      alert(`✅ ${j.message}`);
      await loadNopData(nop, true);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitRequest() {
    setSubmitErr("");
    if (isKirimMat && (!matModule.trim() || !matSite.trim())) {
      setSubmitErr("Anda mencentang Pengiriman Material, WAJIB mengisi Nama Module & Site ID Tujuan!");
      return;
    }
    if (!nop || !cluster || !nama || !role || !keperluan || !baseTiketClean || calc.subs.length === 0 || nominalTfFinal <= 0) {
      setSubmitErr("Lengkapi NOP, Cluster, Nama, Role, Keperluan, Nomor Tiket, Rincian Kebutuhan Dana, dan Nominal!");
      return;
    }
    if (calc.tankErrors.length > 0 || calc.indErrors.length > 0 || calc.umErrors.length > 0 || priceLocked || motorLimitLocked || dupLocked) {
      setSubmitErr("Masih ada validasi yang belum lolos (cek peringatan merah di atas).");
      return;
    }

    setSubmitting(true);
    try {
      setSubmitStatusText("Mengompresi & mengupload foto langsung ke Cloudinary...");
      const [urlKm, urlEv] = await Promise.all([
        uploadImageDirectToCloudinary(fotoKm),
        uploadImageDirectToCloudinary(fotoEvidance),
      ]);

      setSubmitStatusText("Menyimpan sub-tiket secara batch ke Google Sheets...");
      const tsNow = formatTimestampWib();
      const tglStr = isoToIdDate(tanggal);
      const rincianWa: string[] = [];

      const rows24 = calc.subs.map((req, idx) => {
        let descFinal = deskripsi;
        if (timBareng.length > 0) descFinal += `\n\n[Tim: ${timBareng.join(", ")}]`;
        if (req.infoBbm) descFinal += `\n\n[ANALISA BBM: ${req.infoBbm}]`;
        if (req.tipe === "UM")
          descFinal += `\n\n[REQ AKOMODASI: ${req.hari} Hari @ ${formatRupiah(req.nomPerUnit || 0)}/hari = ${formatRupiah(req.kebutuhan)}]`;
        else if (req.tipe === "Inap")
          descFinal += `\n\n[REQ PENGINAPAN: ${req.hari} Malam @ ${formatRupiah(req.nomPerUnit || 0)}/malam = ${formatRupiah(req.kebutuhan)}]`;

        let itemWa = `${idx + 1}. *${req.tiket}* — ${req.kategori}`;
        if (req.plat) itemWa += ` | Nopol/ID: ${req.plat}`;
        if (["Mobil", "Motor", "Genset"].includes(req.tipe)) {
          itemWa += ` | ${req.tipe === "Genset" ? "RH Awal" : "KM Awal"}: ${req.indikator}`;
        } else if (req.tipe === "UM") itemWa += ` | Durasi: ${req.hari} Hari`;
        else if (req.tipe === "Inap") itemWa += ` | Durasi: ${req.hari} Malam`;
        rincianWa.push(itemWa);

        // Exact 24 columns matching App-v4.py `Form Request dana`
        return [
          tsNow,
          tglStr,
          nop,
          req.tiket,
          cluster,
          nama,
          role,
          siteId,
          keperluan,
          req.kebutuhan,
          req.kategori,
          descFinal,
          String(req.indikator),
          jarakFinalText,
          latBrgkt,
          lonBrgkt,
          req.plat,
          bank,
          noRek,
          nominalTfFinal,
          urlKm,
          urlEv,
          latTujuan,
          lonTujuan,
        ];
      });

      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nop,
          rows: rows24,
          pmSelectedList: keperluan === "PM" ? pmSelected : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan Request Dana");

      const waText = [
        "*PENGAJUAN REQUEST DANA OPERASIONAL (SiRAPI)*",
        `📅 Tanggal : ${tglStr} (${tsNow.split(" ")[1]})`,
        `🌐 Wilayah : NOP ${nop} (${cluster})`,
        `👤 Nama PIC : ${nama} (${role})`,
        `👥 Rekan Tim : ${timBareng.length > 0 ? timBareng.join(", ") : "-"}`,
        `🎫 Tiket Pokok : ${baseTiketClean}`,
        `📍 Site ID : ${siteId || "-"}`,
        `🛠️ Keperluan : ${keperluan}`,
        `🛣️ Estimasi Rute : ${jarakFinalText || "-"}`,
        "",
        `*📋 Detail Pekerjaan:*`,
        deskripsi || "-",
        "",
        `*🛒 Rincian Kebutuhan (Sub-Tiket):*`,
        ...rincianWa,
        "",
        `*🏦 Rekening Penerima:*`,
        `${bank} - ${noRek}`,
        "",
        `*📸 Lampiran Foto Evidance:*`,
        `• Foto KM/RH Awal : ${urlKm || "-"}`,
        `• Foto Evidance : ${urlEv || "-"}`,
      ].join("\n");

      setWaReadyText(waText);
      await loadNopData(nop, true);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
      setSubmitStatusText("");
    }
  }

  function toggleArray(list: string[], val: string, setter: (v: string[]) => void) {
    if (list.includes(val)) setter(list.filter((x) => x !== val));
    else setter([...list, val]);
  }

  const filteredSites = useMemo(() => {
    const q = siteFilter.trim().toLowerCase();
    if (!q) return SITES_DATA.slice(0, 60);
    return SITES_DATA.filter((s) => s.id.toLowerCase().includes(q)).slice(0, 60);
  }, [siteFilter]);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="card-ui p-5 text-center border-t-4 border-t-blue-600">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">📝 PORTAL PENGAJUAN DANA</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Input Pengajuan Baru / Revisi — Multi-Split Engine &amp; Validasi BBM Actual (Sync Google Sheets)
        </p>
      </div>

      {/* WA RESULT SCREEN */}
      {waReadyText && (
        <div className="card-ui p-5 border-2 border-emerald-400 bg-emerald-50/40 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-base sm:text-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            Berhasil Menyimpan Request Dana ke Google Sheets!
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-medium">
            Salin laporan WhatsApp di bawah ini (tanpa nominal uang) atau klik tombol kirim langsung ke WhatsApp:
          </p>
          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
            {waReadyText}
          </pre>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(waReadyText);
                setCopiedWa(true);
                setTimeout(() => setCopiedWa(false), 2000);
              }}
              className="btn-primary-blue"
            >
              <Copy className="w-4 h-4" /> {copiedWa ? "Tersalin!" : "Salin Teks WA"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(waReadyText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <Send className="w-4 h-4" /> Buka &amp; Kirim WA
            </a>
            <button
              type="button"
              onClick={() => {
                setWaReadyText("");
                setTiketManual("");
                setKebutuhanList([]);
                setJnsBbmList([]);
                setChecks({});
              }}
              className="btn-primary-red"
            >
              + Buat Request Baru
            </button>
          </div>
        </div>
      )}

      {/* 1. PILIH NOP */}
      <div className="card-ui p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="label-ui">📌 1. Pilih Database Regional (NOP)</label>
            <select
              className="input-ui"
              value={nop}
              onChange={(e) => {
                setNop(e.target.value);
                setCluster("");
                setNama("");
                setWaReadyText("");
              }}
            >
              <option value="">-- Pilih Wilayah NOP --</option>
              {NOP_KEYS.map((k) => (
                <option key={k} value={k}>
                  NOP {k}
                </option>
              ))}
            </select>
          </div>
          {nop && (
            <button
              type="button"
              disabled={loadingBundle}
              onClick={() => loadNopData(nop, true)}
              className="btn-primary-blue sm:w-auto text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBundle ? "animate-spin" : ""}`} />
              {loadingBundle ? "Memuat..." : "Refresh Data"}
            </button>
          )}
        </div>
        {bundleError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            ❌ {bundleError}
          </div>
        )}
      </div>

      {bundle && !waReadyText && (
        <>
          {/* 2. INFORMASI PETUGAS & TIKET POKOK */}
          <div className="card-ui p-5 space-y-4">
            <div className="section-bar !mt-0">📋 2. Informasi Petugas &amp; Tiket Pokok</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-ui">Tanggal Pengajuan</label>
                <input type="date" className="input-ui" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </div>
              <div>
                <label className="label-ui">Cluster Regional *</label>
                <select className="input-ui" value={cluster} onChange={(e) => setCluster(e.target.value)}>
                  <option value="">-- Pilih Cluster --</option>
                  {bundle.clusters.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-ui">Nama Petugas / Pemohon (PIC Utama) *</label>
                <select className="input-ui" value={nama} onChange={(e) => setNama(e.target.value)}>
                  <option value="">-- Pilih Nama PIC --</option>
                  {bundle.names.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-ui">Role Jabatan *</label>
                <select className="input-ui" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">-- Pilih Role --</option>
                  {LIST_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Site ID Searchable + Manual */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="label-ui">Cari Site ID ({SITES_DATA.length} Site)</label>
                  <input
                    type="text"
                    className="input-ui"
                    placeholder="Ketik sebagian kode/nama site..."
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-ui">Pilih / Ketik ID Site Tujuan</label>
                  <select className="input-ui mb-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                    <option value="">-- Pilih Site dari Daftar --</option>
                    {filteredSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="input-ui text-xs"
                    placeholder="Atau ketik manual Site ID di sini..."
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div>
                <label className="label-ui">Klasifikasi Keperluan Dana *</label>
                <select className="input-ui" value={pilihanKep} onChange={(e) => setPilihanKep(e.target.value)}>
                  <option value="">-- Pilih Keperluan --</option>
                  {LIST_KEPERLUAN.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                {pilihanKep === "Lainnya (Ketik Manual)" && (
                  <input
                    type="text"
                    className="input-ui mt-2"
                    placeholder="Ketik keperluan secara manual..."
                    value={manualKep}
                    onChange={(e) => setManualKep(e.target.value)}
                  />
                )}
              </div>

              <div>
                {keperluan === "PM" ? (
                  <div>
                    <label className="label-ui">🎫 Multi-Select Tiket PM (Tersedia: {bundle.availPmTickets.length})</label>
                    {bundle.availPmTickets.length > 0 && (
                      <div className="max-h-32 overflow-y-auto p-2 rounded-xl border border-sky-200 bg-sky-50/60 flex flex-wrap gap-1.5 mb-2">
                        {bundle.availPmTickets.map((t) => {
                          const picked = pmSelected.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleArray(pmSelected, t, setPmSelected)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                                picked
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-700 border-slate-300"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <input
                      type="text"
                      className="input-ui"
                      placeholder="Atau ketik manual Tiket PM..."
                      value={pmSelected.length > 0 ? pmSelected.join(", ") : tiketManual}
                      disabled={pmSelected.length > 0}
                      onChange={(e) => setTiketManual(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="label-ui">Nomor Tiket SWFM (WAJIB) *</label>
                    <input
                      type="text"
                      className="input-ui uppercase"
                      placeholder="Contoh: IN20261126001"
                      value={tiketManual}
                      onChange={(e) => setTiketManual(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Peringatan status PIC & Duplikat Tiket */}
            {userStatus.agingTickets.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold">
                🔔 PENGINGAT: Sdr/i {nama}, Anda memiliki {userStatus.agingTickets.length} pengajuan tertunda PJB &gt;3 Hari!
              </div>
            )}
            {userStatus.outstandingLock.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm font-bold">
                ⛔ DILARANG REQUEST: Anda memiliki {userStatus.outstandingLock.length} tiket pending PJB atau ditolak ({userStatus.outstandingLock.slice(0, 3).join(", ")}). Selesaikan PJB dulu!
              </div>
            )}
            {dupInfo.isDup && (
              <div className={`p-4 rounded-xl border ${dupLocked ? "bg-rose-50 border-rose-300 text-rose-900" : "bg-emerald-50 border-emerald-300 text-emerald-900"} text-xs sm:text-sm space-y-2`}>
                {dupLocked ? (
                  <>
                    <div className="font-extrabold">
                      ⛔ Tiket Pokok {baseTiketClean} sudah terdaftar di database! Wajib Izin Revisi Admin.
                    </div>
                    {dupInfo.statusIzin === "PENDING" ? (
                      <div className="font-bold text-amber-800">⏳ Status: Permintaan Izin Revisi sedang MENUNGGU VERIFIKASI Admin.</div>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRequestApproval("Izin Revisi", 0, "Minta Izin Revisi via SiRAPI Vercel")}
                        className="btn-primary-red text-xs"
                      >
                        🚨 Minta Izin Revisi ke Admin Sekarang
                      </button>
                    )}
                  </>
                ) : (
                  <div className="font-bold">✅ Izin Revisi DIBERIKAN Admin untuk tiket {baseTiketClean}. Silakan isi perbaikan.</div>
                )}
              </div>
            )}
          </div>

          {/* 3. KLASIFIKASI PEKERJAAN & REKAN TIM */}
          <div className="card-ui p-5 space-y-4">
            <div className="section-bar !mt-0">🏗️ 3. Klasifikasi &amp; Detail Pekerjaan</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-ui">📡 Tshoot Bagian Atas (Bisa pilih banyak)</label>
                <div className="flex flex-wrap gap-1.5">
                  {OPT_ATAS.map((opt) => {
                    const on = valAtas.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleArray(valAtas, opt, setValAtas)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                          on ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {valAtas.includes("Lainnya (Ketik Manual)") && (
                  <input
                    type="text"
                    className="input-ui mt-2"
                    placeholder="Sebutkan pekerjaan atas lainnya..."
                    value={manualAtas}
                    onChange={(e) => setManualAtas(e.target.value)}
                  />
                )}

                <label className="mt-4 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={isKirimMat}
                    onChange={(e) => setIsKirimMat(e.target.checked)}
                  />
                  📦 Pengiriman Material
                </label>
                {isKirimMat && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="input-ui text-xs"
                      placeholder="Wajib: Nama Module dikirim"
                      value={matModule}
                      onChange={(e) => setMatModule(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input-ui text-xs"
                      placeholder="Wajib: Site ID Tujuan"
                      value={matSite}
                      onChange={(e) => setMatSite(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label-ui">🔌 Tshoot Bagian Bawah / PM (Bisa pilih banyak)</label>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                  {OPT_BAWAH.map((opt) => {
                    const on = valBawah.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleArray(valBawah, opt, setValBawah)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                          on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {valBawah.includes("Lainnya (Ketik Manual)") && (
                  <input
                    type="text"
                    className="input-ui mt-2"
                    placeholder="Sebutkan pekerjaan bawah lainnya..."
                    value={manualBawah}
                    onChange={(e) => setManualBawah(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="label-ui">Deskripsi Pekerjaan / Justifikasi (Auto-Fill)</label>
              <textarea
                rows={3}
                className="input-ui"
                value={deskripsi}
                onChange={(e) => {
                  setDeskripsiTouched(true);
                  setDeskripsiCustom(e.target.value);
                }}
                placeholder="Otomatis terisi dari pilihan di atas, bisa diedit manual..."
              />
            </div>

            <div>
              <label className="label-ui">👥 Rekan Tim Berangkat Bersama (Opsional — Terpilih: {timBareng.length})</label>
              <div className="max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap gap-1.5">
                {bundle.names
                  .filter((n) => n.trim().toUpperCase() !== nama.trim().toUpperCase())
                  .map((n) => {
                    const on = timBareng.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleArray(timBareng, n, setTimBareng)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition ${
                          on ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
              </div>
              {timTerkunci.length > 0 && (
                <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold">
                  ⛔ Rekan tim berikut masih memiliki PJB pending: {timTerkunci.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* 4. RUTE PETA SATELIT */}
          <div className="card-ui p-5 space-y-3">
            <div className="section-bar !mt-0">📍 4. Rute Peta (Satelit OSRM)</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label-ui">Lat Berangkat</label>
                <input className="input-ui" value={latBrgkt} onChange={(e) => setLatBrgkt(e.target.value)} />
              </div>
              <div>
                <label className="label-ui">Long Berangkat</label>
                <input className="input-ui" value={lonBrgkt} onChange={(e) => setLonBrgkt(e.target.value)} />
              </div>
              <div>
                <label className="label-ui">Lat Tujuan</label>
                <input className="input-ui" value={latTujuan} onChange={(e) => setLatTujuan(e.target.value)} />
              </div>
              <div>
                <label className="label-ui">Long Tujuan</label>
                <input className="input-ui" value={lonTujuan} onChange={(e) => setLonTujuan(e.target.value)} />
              </div>
            </div>
            {loadingRoute ? (
              <div className="p-3 rounded-xl bg-slate-50 text-xs font-bold text-slate-600">🛰️ Menghitung jarak rute...</div>
            ) : jarakKmPP > 0 ? (
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs sm:text-sm font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-sky-600" />
                Jarak Tempuh Peta: {jarakKmPP.toFixed(1)} Km (PP) • 1 Arah: {routeInfo.distOneWay.toFixed(1)} Km • Estimasi: {jamInt} Jam {mntInt} Mnt
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                ⚠️ Koordinat masih 0 / belum lengkap. Isi koordinat untuk menghitung estimasi jarak PP.
              </div>
            )}
          </div>

          {/* 5. RINCIAN KEBUTUHAN DANA (MULTI-SPLIT ENGINE) */}
          <div className="card-ui p-5 space-y-4">
            <div className="section-bar !mt-0">🛒 5. Rincian Kebutuhan Dana (Multi-Split)</div>
            <div className="flex flex-wrap gap-2">
              {["BBM", "Uang Makan", "Penginapan", "Material", "Support", "Fery Reguler/Carter", "Klotok/Kapal Carter"].map((item) => {
                const on = kebutuhanList.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleArray(kebutuhanList, item, setKebutuhanList)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition ${
                      on ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    {on ? "✓ " : "+ "} {item}
                  </button>
                );
              })}
            </div>

            {/* A. PANEL BBM */}
            {kebutuhanList.includes("BBM") && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 space-y-4">
                <div className="text-xs font-bold text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
                  ⏱️ LIVE KONTROL WAKTU WIB: {formatTimestampWib(nowWib)} • Ketik KM/RH polos <b>tanpa titik ribuan</b> (misal: <code>125450</code>), koma hanya untuk desimal (<code>1450,5</code>).
                </div>
                <div>
                  <label className="label-ui">BBM untuk Kendaraan / Peralatan apa saja?</label>
                  <div className="flex flex-wrap gap-2">
                    {["Mobil", "Motor", "Genset"].map((j) => {
                      const on = jnsBbmList.includes(j);
                      return (
                        <button
                          key={j}
                          type="button"
                          onClick={() => toggleArray(jnsBbmList, j, setJnsBbmList)}
                          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border ${
                            on ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          {j === "Mobil" ? "🚙 Mobil" : j === "Motor" ? "🏍️ Motor" : "⚡ Genset"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MOBIL */}
                {jnsBbmList.includes("Mobil") && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="font-extrabold text-sm text-slate-900">🚙 BBM Mobil (SPBU / Eceran, Wajib Tangki &amp; Live Kontrol KM)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          {(["SPBU", "Eceran"] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSrcMob(s)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                                srcMob === s ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-700 border-slate-300"
                              }`}
                            >
                              {s === "SPBU" ? "⛽ SPBU" : "🛢️ Eceran"}
                            </button>
                          ))}
                        </div>
                        {srcMob === "Eceran" && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] font-semibold text-amber-900">
                            ⚠️ Eceran: Saat PJB nanti WAJIB 2 foto tambahan (Full Botol/Liter &amp; Bukti Bayar Toko) dianalisa AI.
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-ui">Jenis BBM</label>
                            <select className="input-ui" value={jbMob} onChange={(e) => setJbMob(e.target.value)}>
                              {["Pertalite", "Pertamax", "Dexlite", "Bio Solar", "Pertamina Dex"].map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label-ui">Kapasitas Tangki (L) *</label>
                            <input type="number" min={0} step={1} className="input-ui" value={ktMob} onChange={(e) => setKtMob(Number(e.target.value))} />
                          </div>
                        </div>
                        <div>
                          <label className="label-ui">Harga Satuan ({srcMob} - Rp/L)</label>
                          <input type="number" min={0} step={100} className="input-ui" value={hsMob} onChange={(e) => setHsMob(Number(e.target.value))} />
                          {(() => {
                            const vp = validateBbmPrice(jbMob, hsMob, srcMob);
                            return <p className={`mt-1 text-[11px] font-bold ${vp.ok ? "text-emerald-700" : "text-rose-600"}`}>{vp.ok ? "✅" : "🚨"} {vp.msg}</p>;
                          })()}
                        </div>
                        <div className="flex gap-2">
                          {(["1x", "2x"] as const).map((o) => (
                            <button
                              key={o}
                              type="button"
                              onClick={() => setOptMob(o)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                                optMob === o ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300"
                              }`}
                            >
                              {o === "1x" ? "1x Pengisian" : "2x Pengisian"}
                            </button>
                          ))}
                        </div>
                        {optMob === "1x" ? (
                          <div>
                            <label className="label-ui">Total Liter BBM Mobil</label>
                            <input type="number" min={0} step={0.5} className="input-ui" value={lMobReq} onChange={(e) => setLMobReq(Number(e.target.value))} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="label-ui">Liter Isi 1</label>
                              <input type="number" min={0} step={0.5} className="input-ui" value={lMob1} onChange={(e) => setLMob1(Number(e.target.value))} />
                            </div>
                            <div>
                              <label className="label-ui">Liter Isi 2</label>
                              <input type="number" min={0} step={0.5} className="input-ui" value={lMob2} onChange={(e) => setLMob2(Number(e.target.value))} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="label-ui">Plat Mobil</label>
                          <select className="input-ui" value={platMobPick} onChange={(e) => setPlatMobPick(e.target.value)}>
                            <option value="__NEW__">-- Ketik Nopol Baru --</option>
                            {bundle.nopols.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          {(platMobPick === "__NEW__" || !platMobPick) && (
                            <input
                              type="text"
                              className="input-ui mt-2 uppercase"
                              placeholder="Ketik Plat Mobil (Misal: KH 1234 AB)"
                              value={platMobMan}
                              onChange={(e) => setPlatMobMan(e.target.value)}
                            />
                          )}
                        </div>
                        <div>
                          <label className="label-ui">KM Awal Mobil (Histori: {formatIdNumber(lastInfoMob.value)} KM)</label>
                          <input
                            type="text"
                            className="input-ui"
                            placeholder="Ketik polos tanpa titik, misal: 125450"
                            value={kmMobRaw}
                            onChange={(e) => setKmMobRaw(e.target.value)}
                          />
                          <p className={`mt-1 text-[11px] font-bold ${parsedMobKm.level === "err" ? "text-rose-600" : parsedMobKm.level === "warn" ? "text-amber-700" : "text-slate-600"}`}>
                            🔎 {parsedMobKm.note}
                          </p>
                        </div>
                        <div className={`p-3 rounded-xl text-[11px] space-y-1 border ${ctrlMob.isBlocking ? "bg-rose-50 border-rose-300 text-rose-800" : ctrlMob.level === "warn" ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-sky-50 border-sky-200 text-sky-900"}`}>
                          <div className="font-extrabold">🛣️ LIVE KONTROL KM &amp; WAKTU MOBIL</div>
                          {ctrlMob.detailLines.map((ln, idx) => (
                            <div key={idx}>• {ln}</div>
                          ))}
                        </div>
                        {hist5Mob.length > 0 && (
                          <details className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px]">
                            <summary className="font-bold cursor-pointer text-slate-800">📜 5 Histori KM Terakhir ({platMob})</summary>
                            <div className="mt-2 space-y-1">
                              {hist5Mob.map((h, i) => (
                                <div key={i} className="flex justify-between border-b border-slate-200 pb-1">
                                  <span>{h.tgl} • {h.pic}</span>
                                  <span className="font-bold">{h.kmAkhir} KM ({h.trip})</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* MOTOR */}
                {jnsBbmList.includes("Motor") && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="font-extrabold text-sm text-slate-900">🏍️ BBM Motor (Limit Rp 500.000/Bln — Terpakai: {formatRupiah(motorSpentThisMonth)})</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          {(["SPBU", "Eceran"] as const).map((s) => (
                            <button key={s} type="button" onClick={() => setSrcMot(s)} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${srcMot === s ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-700 border-slate-300"}`}>
                              {s === "SPBU" ? "⛽ SPBU" : "🛢️ Eceran"}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-ui">Jenis BBM</label>
                            <select className="input-ui" value={jbMot} onChange={(e) => setJbMot(e.target.value)}>
                              {["Pertalite", "Pertamax"].map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label-ui">Kapasitas Tangki (L) *</label>
                            <input type="number" min={0} step={0.1} className="input-ui" value={ktMot} onChange={(e) => setKtMot(Number(e.target.value))} />
                          </div>
                        </div>
                        <div>
                          <label className="label-ui">Harga Satuan ({srcMot} - Rp/L)</label>
                          <input type="number" min={0} step={100} className="input-ui" value={hsMot} onChange={(e) => setHsMot(Number(e.target.value))} />
                        </div>
                        <div className="flex gap-2">
                          {(["1x", "2x"] as const).map((o) => (
                            <button key={o} type="button" onClick={() => setOptMot(o)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${optMot === o ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300"}`}>
                              {o === "1x" ? "1x Pengisian" : "2x Pengisian"}
                            </button>
                          ))}
                        </div>
                        {optMot === "1x" ? (
                          <div>
                            <label className="label-ui">Total Liter Motor</label>
                            <input type="number" min={0} step={0.1} className="input-ui" value={lMotReq} onChange={(e) => setLMotReq(Number(e.target.value))} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="label-ui">Liter Isi 1</label><input type="number" min={0} step={0.1} className="input-ui" value={lMot1} onChange={(e) => setLMot1(Number(e.target.value))} /></div>
                            <div><label className="label-ui">Liter Isi 2</label><input type="number" min={0} step={0.1} className="input-ui" value={lMot2} onChange={(e) => setLMot2(Number(e.target.value))} /></div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="label-ui">Plat Motor</label>
                          <select className="input-ui" value={platMotPick} onChange={(e) => setPlatMotPick(e.target.value)}>
                            <option value="__NEW__">-- Ketik Nopol Baru --</option>
                            {bundle.nopols.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          {(platMotPick === "__NEW__" || !platMotPick) && (
                            <input type="text" className="input-ui mt-2 uppercase" placeholder="Ketik Plat Motor" value={platMotMan} onChange={(e) => setPlatMotMan(e.target.value)} />
                          )}
                        </div>
                        <div>
                          <label className="label-ui">KM Awal Motor (Histori: {formatIdNumber(lastInfoMot.value)} KM)</label>
                          <input type="text" className="input-ui" value={kmMotRaw} onChange={(e) => setKmMotRaw(e.target.value)} />
                          <p className="mt-1 text-[11px] font-bold text-slate-600">🔎 {parsedMotKm.note}</p>
                        </div>
                        <div className={`p-3 rounded-xl text-[11px] space-y-1 border ${ctrlMot.isBlocking ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-sky-50 border-sky-200 text-sky-900"}`}>
                          {ctrlMot.detailLines.map((ln, idx) => <div key={idx}>• {ln}</div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* GENSET (SOLAR vs PORTABLE PERTALITE/PERTAMAX) */}
                {jnsBbmList.includes("Genset") && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="font-extrabold text-sm text-slate-900">⚡ BBM Genset (Solar / Genset Portable Pertalite-Pertamax)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipeGenset("Solar")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border ${tipeGenset === "Solar" ? "bg-amber-600 text-white border-amber-600" : "bg-slate-50 text-slate-700 border-slate-300"}`}
                      >
                        ⚡ Genset Solar / Mobile (Dexlite / Bio Solar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipeGenset("Portable")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border ${tipeGenset === "Portable" ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-700 border-slate-300"}`}
                      >
                        🔋 Genset Portable / Bensin (Pertalite / Pertamax)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          {(["SPBU", "Eceran"] as const).map((s) => (
                            <button key={s} type="button" onClick={() => setSrcGen(s)} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${srcGen === s ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-700 border-slate-300"}`}>
                              {s === "SPBU" ? "⛽ SPBU" : "🛢️ Eceran"}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-ui">Jenis BBM Genset</label>
                            <select className="input-ui" value={jbGen} onChange={(e) => setJbGen(e.target.value)}>
                              {(tipeGenset === "Portable" ? ["Pertalite", "Pertamax"] : ["Dexlite", "Bio Solar", "Pertamina Dex"]).map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label-ui">Kapasitas Tangki/Jerigen (L) *</label>
                            <input type="number" min={0} step={1} className="input-ui" value={ktGen} onChange={(e) => setKtGen(Number(e.target.value))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-ui">Durasi Backup (Jam)</label>
                            <input type="number" min={0.5} step={0.5} className="input-ui" value={estJamGen} onChange={(e) => setEstJamGen(Number(e.target.value))} />
                          </div>
                          <div>
                            <label className="label-ui">Harga ({srcGen} - Rp/L)</label>
                            <input type="number" min={0} step={100} className="input-ui" value={hsGen} onChange={(e) => setHsGen(Number(e.target.value))} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(["1x", "2x"] as const).map((o) => (
                            <button key={o} type="button" onClick={() => setOptGen(o)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${optGen === o ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300"}`}>
                              {o === "1x" ? "1x Pengisian" : "2x Pengisian"}
                            </button>
                          ))}
                        </div>
                        {optGen === "1x" ? (
                          <div>
                            <label className="label-ui">Total Liter BBM Genset</label>
                            <input type="number" min={0} step={0.5} className="input-ui" value={lGenReq} onChange={(e) => setLGenReq(Number(e.target.value))} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="label-ui">Liter Isi 1</label><input type="number" min={0} step={0.5} className="input-ui" value={lGen1} onChange={(e) => setLGen1(Number(e.target.value))} /></div>
                            <div><label className="label-ui">Liter Isi 2</label><input type="number" min={0} step={0.5} className="input-ui" value={lGen2} onChange={(e) => setLGen2(Number(e.target.value))} /></div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="label-ui">ID / Plat Genset</label>
                          <select className="input-ui" value={platGenPick} onChange={(e) => setPlatGenPick(e.target.value)}>
                            <option value="__NEW__">-- Ketik ID Genset Baru --</option>
                            {bundle.nopols.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                          {(platGenPick === "__NEW__" || !platGenPick) && (
                            <input type="text" className="input-ui mt-2 uppercase" placeholder="Misal: PORTABLE-01 / GENSET-01" value={platGenMan} onChange={(e) => setPlatGenMan(e.target.value)} />
                          )}
                        </div>
                        {tipeGenset === "Portable" && (
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={tanpaRhPortable} onChange={(e) => setTanpaRhPortable(e.target.checked)} />
                            🔋 Genset Portable tidak memiliki meteran RH digital
                          </label>
                        )}
                        {!tanpaRhPortable && (
                          <>
                            <div>
                              <label className="label-ui">RH Awal Genset (Histori: {formatIdNumber(lastInfoGen.value)} RH)</label>
                              <input type="text" className="input-ui" placeholder="Misal: 1450 atau 1450,5" value={rhGenRaw} onChange={(e) => setRhGenRaw(e.target.value)} />
                              <p className={`mt-1 text-[11px] font-bold ${parsedGenRh.level === "err" ? "text-rose-600" : "text-slate-600"}`}>🔎 {parsedGenRh.note}</p>
                            </div>
                            <div className={`p-3 rounded-xl text-[11px] space-y-1 border ${ctrlGen.isBlocking ? "bg-rose-50 border-rose-300 text-rose-800" : ctrlGen.level === "warn" ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-sky-50 border-sky-200 text-sky-900"}`}>
                              <div className="font-extrabold">⏱️ LIVE KONTROL RH &amp; WAKTU GENSET</div>
                              {ctrlGen.detailLines.map((ln, idx) => <div key={idx}>• {ln}</div>)}
                            </div>
                          </>
                        )}
                        {hist5Gen.length > 0 && (
                          <details className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px]">
                            <summary className="font-bold cursor-pointer text-slate-800">📜 5 Histori RH Terakhir ({platGen})</summary>
                            <div className="mt-2 space-y-1">
                              {hist5Gen.map((h, i) => (
                                <div key={i} className="flex justify-between border-b border-slate-200 pb-1">
                                  <span>{h.tgl} • {h.pic}</span>
                                  <span className="font-bold">{h.rhAkhir} RH ({h.run})</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. UANG MAKAN & PENGINAPAN */}
            {(kebutuhanList.includes("Uang Makan") || kebutuhanList.includes("Penginapan")) && (
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-3">
                <div className="font-extrabold text-sm text-sky-900">🍽️ Akomodasi — Uang Makan (System Lock) &amp; Penginapan ({1 + timBareng.length} Orang)</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label-ui">Durasi Kerja (Hari)</label>
                    <input type="number" min={1} className="input-ui" value={hariReq} onChange={(e) => setHariReq(Math.max(1, Number(e.target.value)))} />
                  </div>
                  {kebutuhanList.includes("Penginapan") && (
                    <>
                      <div>
                        <label className="label-ui">Berapa Malam Menginap?</label>
                        <input type="number" min={1} className="input-ui" value={malamInap} onChange={(e) => setMalamInap(Math.max(1, Number(e.target.value)))} />
                      </div>
                      <div>
                        <label className="label-ui">Inap/Malam (Maks {formatRupiah(150000 * (1 + timBareng.length))})</label>
                        <input type="number" min={0} step={10000} max={150000 * (1 + timBareng.length)} className="input-ui" value={nomInapPerMalam} onChange={(e) => setNomInapPerMalam(Number(e.target.value))} />
                      </div>
                    </>
                  )}
                </div>
                {calc.umErrors.map((e, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold">❌ {e}</div>
                ))}
                {calc.subs.filter((s) => s.tipe === "UM" || s.tipe === "Inap").map((s, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
                    ✅ {s.kategori}: {formatRupiah(s.kebutuhan)}
                  </div>
                ))}
              </div>
            )}

            {/* C. MATERIAL, SUPPORT, FERY, KLOTOK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kebutuhanList.includes("Material") && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="label-ui">📦 Nama Barang &amp; Jumlah Material</label>
                  <input className="input-ui" placeholder="Contoh: MCB 32A 1 pcs" value={namaBrgMat} onChange={(e) => setNamaBrgMat(e.target.value)} />
                  <label className="label-ui">Estimasi Dana Material (Rp)</label>
                  <input type="number" min={0} step={1000} className="input-ui" value={kebMat} onChange={(e) => setKebMat(Number(e.target.value))} />
                </div>
              )}
              {kebutuhanList.includes("Support") && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="label-ui">🤝 Estimasi Dana Support (Rp)</label>
                  <input type="number" min={0} step={1000} className="input-ui" value={kebSupport} onChange={(e) => setKebSupport(Number(e.target.value))} />
                </div>
              )}
              {kebutuhanList.includes("Fery Reguler/Carter") && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="label-ui">⛴️ Estimasi Dana Fery (Rp)</label>
                  <input type="number" min={0} step={1000} className="input-ui" value={kebFery} onChange={(e) => setKebFery(Number(e.target.value))} />
                </div>
              )}
              {kebutuhanList.includes("Klotok/Kapal Carter") && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="label-ui">🛥️ Estimasi Dana Klotok (Rp)</label>
                  <input type="number" min={0} step={1000} className="input-ui" value={kebKlotok} onChange={(e) => setKebKlotok(Number(e.target.value))} />
                </div>
              )}
            </div>

            {calc.subs.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-center">
                <div className="text-xs font-extrabold text-emerald-800 uppercase">Total Kalkulasi Kebutuhan Dana ({calc.subs.length} Sub-Tiket)</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{formatRupiah(calc.totalAll)}</div>
              </div>
            )}
          </div>

          {/* 6. PEMBAYARAN & LAMPIRAN FOTO */}
          <div className="card-ui p-5 space-y-4">
            <div className="section-bar !mt-0">🏦 6. Pembayaran &amp; Lampiran Foto</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label-ui">Bank Penerima</label>
                <select className="input-ui" value={bank} onChange={(e) => setBank(e.target.value)}>
                  {LIST_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ui">Nomor Rekening</label>
                <input className="input-ui" value={noRek} onChange={(e) => setNoRek(e.target.value)} placeholder="Nomor rekening..." />
              </div>
              <div>
                <label className="label-ui">Total Nominal Transfer Final (Rp)</label>
                <input
                  type="text"
                  className="input-ui"
                  value={nominalTfManual !== "" ? nominalTfManual : String(calc.totalAll)}
                  onChange={(e) => setNominalTfManual(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploader label="1. Foto KM / RH Genset Awal" file={fotoKm} onChange={setFotoKm} helper="Otomatis dikompres di HP sebelum diupload" />
              <ImageUploader label="2. Foto Evidance Request" file={fotoEvidance} onChange={setFotoEvidance} helper="Otomatis dikompres di HP sebelum diupload" />
            </div>
          </div>

          {/* 7. CHECKLIST DINAMIS & SUBMIT */}
          <div className="card-ui p-5 space-y-4">
            <div className="section-bar !mt-0">✅ 7. Checklist Persiapan &amp; Submit</div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3 text-xs sm:text-sm">
              <div className="font-extrabold text-amber-900">⚠️ WAJIB DICENTANG SELURUHNYA UNTUK MEMBUKA TOMBOL SUBMIT:</div>
              {showAtas && (
                <div className="space-y-1.5">
                  <div className="font-extrabold text-rose-700">🛠️ TSHOOT BAGIAN ATAS:</div>
                  {[
                    ["a1", "1. Body harnes"],
                    ["a2", "2. Tambang"],
                    ["a3", "3. Material/module"],
                    ["a4", "4. Helm Climbing"],
                    ["a5", "5. Tang amper"],
                    ["a6", "6. Pastikan semua material kondisi baik & berfungsi."],
                  ].map(([k, lbl]) => (
                    <label key={k} className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-rose-600" checked={Boolean(checks[k])} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />
                      {lbl}
                    </label>
                  ))}
                </div>
              )}
              {showBawah && (
                <div className="space-y-1.5">
                  <div className="font-extrabold text-blue-700">🔌 TSHOOT BAGIAN BAWAH:</div>
                  {[
                    ["b1", "1. Tang Amper"],
                    ["b2", "2. Sarung tangan"],
                    ["b3", "3. Material/Module"],
                    ["b4", "4. Sepatu Safety"],
                    ["b5", "5. Perkabelan dan optikal/sfp"],
                    ["b6", "6. Pastikan semua berfungsi sebelum mulai pekerjaan."],
                  ].map(([k, lbl]) => (
                    <label key={k} className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={Boolean(checks[k])} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />
                      {lbl}
                    </label>
                  ))}
                </div>
              )}
              {showPm && (
                <div className="space-y-1.5">
                  <div className="font-extrabold text-emerald-700">🦺 KHUSUS PREVENTIVE MAINTENANCE (JSA):</div>
                  {[
                    ["p1", "1. Sertifikat"],
                    ["p2", "2. Box P3K standart"],
                    ["p3", "3. Sepatu Safety"],
                    ["p4", "4. Banner Site ID & nomor HP"],
                    ["p5", "5. Policeline"],
                    ["p6", "6. Semua tools JSA wajib lengkap"],
                  ].map(([k, lbl]) => (
                    <label key={k} className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={Boolean(checks[k])} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />
                      {lbl}
                    </label>
                  ))}
                </div>
              )}
              {!showAtas && !showBawah && !showPm && (
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={Boolean(checks.def1)} onChange={(e) => setChecks({ ...checks, def1: e.target.checked })} />
                  🤝 Saya BERKOMITMEN menyelesaikan pekerjaan ini dengan tuntas &amp; bertanggung jawab.
                </label>
              )}
            </div>

            {/* Panel Approval Limit Motor & Harga BBM Khusus */}
            {motorOverLimit && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-2 text-xs sm:text-sm">
                <div className="font-extrabold text-rose-800">
                  🚨 Limit BBM Motor Bulanan (&gt;Rp 500.000) — Status: {approvalStatuses.limitMotor}
                </div>
                {motorLimitLocked && approvalStatuses.limitMotor !== "PENDING" && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRequestApproval("Limit Motor", calc.motorKeb, `Bulan ini: ${formatRupiah(motorSpentThisMonth)}`)}
                    className="btn-primary-red text-xs"
                  >
                    🚨 Minta Approval Limit Motor ke Admin
                  </button>
                )}
              </div>
            )}

            {calc.priceErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-2 text-xs sm:text-sm">
                <div className="font-extrabold text-rose-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> VALIDASI HARGA BBM TIDAK LOLOS (Status: {approvalStatuses.hargaBbm}):
                </div>
                {calc.priceErrors.map((e, i) => <div key={i} className="text-rose-700 font-semibold">• {e}</div>)}
                {priceLocked && approvalStatuses.hargaBbm !== "PENDING" && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRequestApproval("Harga BBM", calc.totalAll, calc.priceErrors.join(" | "))}
                    className="btn-primary-red text-xs"
                  >
                    🚨 Minta Approval Harga BBM Khusus ke Admin
                  </button>
                )}
              </div>
            )}

            {(calc.tankErrors.length > 0 || calc.indErrors.length > 0) && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 space-y-1 font-bold">
                {calc.tankErrors.map((e, i) => <div key={`t${i}`}>🚨 {e}</div>)}
                {calc.indErrors.map((e, i) => <div key={`i${i}`}>🚨 {e}</div>)}
              </div>
            )}

            {submitErr && (
              <div className="p-3.5 rounded-xl bg-rose-100 border border-rose-400 text-rose-900 text-xs sm:text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {submitErr}
              </div>
            )}

            <button
              type="button"
              disabled={
                submitting ||
                !allChecked ||
                userStatus.outstandingLock.length > 0 ||
                timTerkunci.length > 0 ||
                dupLocked ||
                priceLocked ||
                motorLimitLocked ||
                calc.tankErrors.length > 0 ||
                calc.indErrors.length > 0
              }
              onClick={handleSubmitRequest}
              className="btn-primary-red w-full py-3.5 text-base"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> {submitStatusText || "Mengirim..."}
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5" /> 📤 Submit Request Dana ({calc.subs.length} Sub-Tiket)
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-slate-600">Memuat Form Request Dana...</div>}>
      <RequestFormInner />
    </Suspense>
  );
}
