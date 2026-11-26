"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MASTER_DATA, MOTIVASI_LIST, NOP_KEYS } from "@/lib/constants";
import {
  buildNopolDistanceSummary,
  cleanIndicator,
  cleanNominal,
  formatDateId,
  formatIdNumber,
  formatRupiah,
  formatTimestampWib,
  getBbmRule,
  getNowWib,
  isoToIdDate,
  normalizePlatKey,
  parseIndonesianIndicator,
  todayIsoWib,
  validateBbmPrice,
} from "@/lib/rules";
import {
  EceranAiResult,
  runEceranAiCheck,
  uploadImageDirectToCloudinary,
} from "@/lib/clientUpload";
import { buildSuratTugasHtml } from "@/lib/suratTugasHtml";
import type { NopSheetBundle } from "@/lib/sheets";
import ImageUploader from "@/components/ImageUploader";
import {
  AlertCircle,
  CheckCircle2,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

interface PendingTicketItem {
  tanggal: string;
  nama: string;
  tiket: string;
  kategori: string;
  keperluan: string;
  nominalReq: number;
}

interface ActivePjbData {
  tiket: string;
  nop: string;
  cluster: string;
  nama: string;
  role: string;
  site: string;
  keperluan: string;
  bbm: string;
  desc: string;
  kmAwal: number;
  nominalReq: number;
  jarak: string;
  plat: string;
  lat1: string;
  lon1: string;
  lat2: string;
  lon2: string;
  nik: string;
}

function PjbFormInner() {
  const searchParams = useSearchParams();
  const initialNop = searchParams.get("nop") || "";

  const [nop, setNop] = useState<string>(MASTER_DATA[initialNop] ? initialNop : "");
  const [bundle, setBundle] = useState<NopSheetBundle | null>(null);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [bundleError, setBundleError] = useState("");

  const [namaFilter, setNamaFilter] = useState<string>("");
  const [tiketPick, setTiketPick] = useState<string>("");
  const [tiketManual, setTiketManual] = useState<string>("");
  const [activeData, setActiveData] = useState<ActivePjbData | null>(null);

  // Common PJB fields
  const [tglPjb, setTglPjb] = useState<string>(todayIsoWib());
  const [fTransfer, setFTransfer] = useState<File | null>(null);
  const [nominalPjb, setNominalPjb] = useState<number>(0);

  // Operational Vehicle / BBM fields
  const [sumberBbm, setSumberBbm] = useState<"SPBU" | "Eceran">("SPBU");
  const [kmAkhirRaw, setKmAkhirRaw] = useState<string>("0");
  const [totLiterRaw, setTotLiterRaw] = useState<string>("0");
  const [hargaSatuan, setHargaSatuan] = useState<number>(0);
  const [totNilaiNota, setTotNilaiNota] = useState<number>(0);
  const [jamMulaiGen, setJamMulaiGen] = useState<string>("");
  const [jamAkhirGen, setJamAkhirGen] = useState<string>("");
  const [fTiketGen, setFTiketGen] = useState<File | null>(null);

  // Operational Photos
  const [fIsi, setFIsi] = useState<File | null>(null);
  const [fKm, setFKm] = useState<File | null>(null);
  const [fKerja, setFKerja] = useState<File | null>(null);
  const [fNotaSupport, setFNotaSupport] = useState<File | null>(null);
  const [fMatOrInap, setFMatOrInap] = useState<File | null>(null);

  // Eceran Mandatory Photos + AI Check
  const [fEcBotol, setFEcBotol] = useState<File | null>(null);
  const [fEcBayar, setFEcBayar] = useState<File | null>(null);
  const [aiEceran, setAiEceran] = useState<EceranAiResult | null>(null);

  // Akomodasi UM fields
  const [tglBerangkat, setTglBerangkat] = useState<string>(todayIsoWib());
  const [lamaHari, setLamaHari] = useState<number>(1);
  const [totalUmCalc, setTotalUmCalc] = useState<number>(0);
  const [fUm1, setFUm1] = useState<File | null>(null);
  const [fUm2, setFUm2] = useState<File | null>(null);
  const [fUm3, setFUm3] = useState<File | null>(null);
  const [fUm4, setFUm4] = useState<File | null>(null);

  // Pakta Integritas & Submit
  const [cekIntegritas, setCekIntegritas] = useState<boolean>(false);
  const [cekBbmActual, setCekBbmActual] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [suratTugasHtml, setSuratTugasHtml] = useState<string>("");

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

  // Hitung daftar Sub-Tiket Pending persis aturan App-v4.py
  const pendingItems = useMemo<PendingTicketItem[]>(() => {
    if (!bundle) return [];
    const statusVerif: Record<string, string> = {};
    const reqAppSt: Record<string, string> = {};
    for (let i = 1; i < bundle.appRows.length; i++) {
      const r = bundle.appRows[i] || [];
      if (r.length > 5) {
        const tk = String(r[2] ?? "").trim().toUpperCase();
        const jns = String(r[3] ?? "").trim();
        const st = String(r[5] ?? "").trim().toUpperCase();
        if (jns === "Verifikasi PJB" && tk) statusVerif[tk] = st;
        if (jns === "Request Dana" && tk) reqAppSt[tk] = st;
      }
    }

    const pjbCounts: Record<string, number> = {};
    for (let i = 1; i < bundle.pjbRows.length; i++) {
      const r = bundle.pjbRows[i] || [];
      if (r.length > 21 && String(r[21] ?? "").trim()) {
        const tkStr = r[36] && String(r[36]).trim() ? String(r[36]).trim() : String(r[21]).trim();
        tkStr.split(",").forEach((t) => {
          const tc = t.trim().toUpperCase();
          if (tc && statusVerif[tc] !== "REJECTED") {
            pjbCounts[tc] = (pjbCounts[tc] || 0) + 1;
          }
        });
      }
    }

    const reqCounts: Record<string, number> = {};
    const list: PendingTicketItem[] = [];
    const nmFilterUp = namaFilter.trim().toUpperCase();

    for (let i = 1; i < bundle.reqRows.length; i++) {
      const r = bundle.reqRows[i] || [];
      if (r.length > 5 && String(r[3] ?? "").trim()) {
        const tkRaw = String(r[3]).trim().toUpperCase();
        const nm = String(r[5] ?? "").trim().toUpperCase();
        reqCounts[tkRaw] = (reqCounts[tkRaw] || 0) + 1;
        const baseTk = tkRaw.split(" [")[0].trim();

        if (reqAppSt[tkRaw] === "REJECTED" || reqAppSt[baseTk] === "REJECTED") continue;

        if (reqCounts[tkRaw] > (pjbCounts[tkRaw] || 0)) {
          // Tahap 2 hanya terbuka jika Tahap 1 sudah PJB
          if (tkRaw.includes("[MOTOR-2]") || tkRaw.includes("[MOBIL-2]") || tkRaw.includes("[GENSET-2]")) {
            const tk1 = tkRaw.replace("-2]", "-1]");
            if ((pjbCounts[tk1] || 0) === 0) continue;
          }
          if (!nmFilterUp || nm.includes(nmFilterUp) || nmFilterUp.includes(nm)) {
            list.push({
              tanggal: String(r[1] ?? "-"),
              nama: String(r[5] ?? "-"),
              tiket: tkRaw,
              kategori: String(r[10] ?? "-"),
              keperluan: String(r[8] ?? "-"),
              nominalReq: cleanNominal(r[9]),
            });
          }
        }
      }
    }
    return list;
  }, [bundle, namaFilter]);

  // Tarik Data Sub-Tiket
  function handleTarikData() {
    setSubmitErr("");
    setSuccessMsg("");
    setSuratTugasHtml("");
    if (!bundle) return;
    const targetTk = (tiketPick === "__MANUAL__" || !tiketPick ? tiketManual : tiketPick).trim().toUpperCase();
    if (!targetTk) {
      setSubmitErr("Pilih atau ketik Sub-Tiket terlebih dahulu.");
      return;
    }

    let foundReq: string[] | null = null;
    for (let i = bundle.reqRows.length - 1; i >= 1; i--) {
      const r = bundle.reqRows[i] || [];
      if (r.length > 3 && String(r[3] ?? "").trim().toUpperCase() === targetTk) {
        foundReq = r;
        break;
      }
    }
    if (!foundReq) {
      setActiveData(null);
      setSubmitErr(`Data Request untuk sub-tiket '${targetTk}' tidak ditemukan di database.`);
      return;
    }

    const nmUp = String(foundReq[5] ?? "").trim().toUpperCase();
    const kmAwal = cleanIndicator(foundReq[12]);
    const nomReq = cleanNominal(foundReq[9]);
    const bbmStr = String(foundReq[10] ?? "");
    const descStr = String(foundReq[11] ?? "");

    const obj: ActivePjbData = {
      tiket: targetTk,
      nop: String(foundReq[2] ?? nop),
      cluster: String(foundReq[4] ?? ""),
      nama: String(foundReq[5] ?? ""),
      role: String(foundReq[6] ?? ""),
      site: String(foundReq[7] ?? ""),
      keperluan: String(foundReq[8] ?? ""),
      bbm: bbmStr,
      desc: descStr,
      kmAwal,
      nominalReq: nomReq,
      jarak: String(foundReq[13] ?? "-"),
      plat: String(foundReq[16] ?? "").trim().toUpperCase(),
      lat1: String(foundReq[14] ?? "0"),
      lon1: String(foundReq[15] ?? "0"),
      lat2: String(foundReq[22] ?? "0"),
      lon2: String(foundReq[23] ?? "0"),
      nik: bundle.timDict[nmUp]?.nik || "-",
    };

    setActiveData(obj);
    setNominalPjb(nomReq);
    setTotalUmCalc(nomReq);
    setKmAkhirRaw(String(kmAwal));
    const isReqEc = bbmStr.toLowerCase().includes("eceran") || descStr.toLowerCase().includes("beli: eceran");
    setSumberBbm(isReqEc ? "Eceran" : "SPBU");
    const { rule } = getBbmRule(bbmStr, isReqEc ? "Eceran" : "SPBU");
    setHargaSatuan(rule ? rule.default : 0);
    setTotNilaiNota(nomReq);
    setFTransfer(null);
    setFEcBotol(null);
    setFEcBayar(null);
    setAiEceran(null);
    setCekIntegritas(false);
    setCekBbmActual(false);
  }

  // Derived flags
  const isAkomodasi = useMemo(() => {
    if (!activeData) return false;
    const b = activeData.bbm.toLowerCase();
    return b.includes("akomodasi") || b.includes("uang makan") || activeData.tiket.includes("[UM]");
  }, [activeData]);

  const isGenset = Boolean(activeData && activeData.bbm.toLowerCase().includes("genset"));
  const isVehicle = Boolean(
    activeData &&
      (isGenset ||
        activeData.bbm.toLowerCase().includes("mobil") ||
        activeData.bbm.toLowerCase().includes("motor"))
  );
  const isPortable = Boolean(
    activeData &&
      (activeData.bbm.toLowerCase().includes("portable") ||
        activeData.desc.toLowerCase().includes("portable non-rh"))
  );
  const unitLbl: "KM" | "RH" = isGenset ? "RH" : "KM";

  // Nopol Distance Summary
  const nopolStats = useMemo(() => {
    if (!bundle) return {};
    return buildNopolDistanceSummary(bundle.pjbRows, bundle.reqRows);
  }, [bundle]);

  const activeNopolStat = activeData?.plat ? nopolStats[normalizePlatKey(activeData.plat)] : undefined;

  // Parse KM/RH Akhir & Liter
  const parsedKmAkhir = parseIndonesianIndicator(kmAkhirRaw, activeData?.kmAwal || 0, unitLbl);
  const totalTrip = activeData ? Math.round((parsedKmAkhir.value - activeData.kmAwal) * 100) / 100 : 0;
  const parsedLiter = parseIndonesianIndicator(totLiterRaw, 0, "Liter");
  const hargaCheck = activeData ? validateBbmPrice(activeData.bbm, hargaSatuan, sumberBbm) : { ok: true, msg: "" };

  // Run AI Eceran Check automatically when both Eceran photos uploaded
  useEffect(() => {
    if (sumberBbm !== "Eceran" || !fEcBotol || !fEcBayar) {
      setAiEceran(null);
      return;
    }
    let cancelled = false;
    runEceranAiCheck(fEcBotol, fEcBayar, parsedLiter.value, hargaSatuan, totNilaiNota).then((res) => {
      if (!cancelled) setAiEceran(res);
    });
    return () => {
      cancelled = true;
    };
  }, [sumberBbm, fEcBotol, fEcBayar, parsedLiter.value, hargaSatuan, totNilaiNota]);

  const roleUp = activeData?.role.toUpperCase() || "";
  const needPakta = roleUp.includes("MBP") || roleUp.includes("CME") || roleUp.includes("TE");

  async function handleSubmitPjb() {
    if (!activeData || !bundle) return;
    setSubmitErr("");
    setSuccessMsg("");

    if (!fTransfer) {
      setSubmitErr("Upload Bukti Transfer Dana wajib dilampirkan!");
      return;
    }
    if (needPakta && !cekIntegritas) {
      setSubmitErr("Anda WAJIB membaca dan mencentang Pakta Integritas sebelum submit PJB!");
      return;
    }
    if (!isAkomodasi && isVehicle && !cekBbmActual) {
      setSubmitErr("Anda WAJIB mencentang pernyataan BBM menggunakan HARGA ACTUAL & siap diaudit Management!");
      return;
    }

    if (!isAkomodasi && isVehicle) {
      const skipPortableZero = isPortable && activeData.kmAwal === 0 && parsedKmAkhir.value === 0;
      if (!skipPortableZero && (parsedKmAkhir.level === "err" || parsedKmAkhir.value <= 0 || parsedKmAkhir.value < activeData.kmAwal)) {
        setSubmitErr(`${unitLbl} Akhir bermasalah (salah titik/koma, 0, atau lebih kecil dari ${unitLbl} Awal)!`);
        return;
      }
      if (sumberBbm === "Eceran" && (!fEcBotol || !fEcBayar)) {
        setSubmitErr("PEMBELIAN ECERAN: WAJIB unggah Foto Full Botol/Liter DAN Foto Bukti Bayar Toko!");
        return;
      }
      if (parsedLiter.value <= 0 || hargaSatuan <= 0 || totNilaiNota <= 0) {
        setSubmitErr("Total Liter BBM, Harga Satuan Aktual, dan Total Fisik Nota wajib > 0!");
        return;
      }
      // Check special price approval
      const baseTk = activeData.tiket.split(" [")[0].trim().toUpperCase();
      let hasSpecialApp = false;
      for (let i = bundle.appRows.length - 1; i >= 1; i--) {
        const a = bundle.appRows[i] || [];
        if (String(a[3] ?? "").trim() === "Harga BBM" && String(a[5] ?? "").trim().toUpperCase() === "APPROVED") {
          const atk = String(a[2] ?? "").trim().toUpperCase();
          if (atk === activeData.tiket || atk === baseTk) {
            hasSpecialApp = true;
            break;
          }
        }
      }
      if (!hargaCheck.ok && !hasSpecialApp) {
        setSubmitErr(`VALIDASI HARGA BBM KETAT (${sumberBbm.toUpperCase()}): ${hargaCheck.msg}`);
        return;
      }
      const estNota = parsedLiter.value * hargaSatuan;
      const tol = Math.max(5000, 0.05 * totNilaiNota);
      if (Math.abs(estNota - totNilaiNota) > tol) {
        setSubmitErr(
          `SELISIH KALKULASI NOTA: ${parsedLiter.value} L × ${formatRupiah(hargaSatuan)} = ${formatRupiah(estNota)}, tetapi Total Fisik Nota diisi ${formatRupiah(totNilaiNota)}. Sesuaikan dengan nota!`
        );
        return;
      }
    }

    if (isAkomodasi && (!fUm1 || !fUm2 || !fUm3 || !fUm4)) {
      setSubmitErr("Biaya Akomodasi (Uang Makan) WAJIB melampirkan 4 Foto Aktivitas!");
      return;
    }

    setSubmitting(true);
    try {
      setSubmitStatus("Mengompresi & mengupload seluruh foto langsung ke Cloudinary...");
      const [
        urlTransfer,
        urlIsi,
        urlNotaSupport,
        urlKm,
        urlMatOrInap,
        urlKerja,
        urlTiketGen,
        urlEcBotol,
        urlEcBayar,
        urlUm1,
        urlUm2,
        urlUm3,
        urlUm4,
      ] = await Promise.all([
        uploadImageDirectToCloudinary(fTransfer),
        uploadImageDirectToCloudinary(fIsi),
        uploadImageDirectToCloudinary(fNotaSupport),
        uploadImageDirectToCloudinary(fKm),
        uploadImageDirectToCloudinary(fMatOrInap),
        uploadImageDirectToCloudinary(fKerja),
        uploadImageDirectToCloudinary(fTiketGen),
        uploadImageDirectToCloudinary(fEcBotol),
        uploadImageDirectToCloudinary(fEcBayar),
        uploadImageDirectToCloudinary(fUm1),
        uploadImageDirectToCloudinary(fUm2),
        uploadImageDirectToCloudinary(fUm3),
        uploadImageDirectToCloudinary(fUm4),
      ]);

      setSubmitStatus("Menyimpan laporan PJB (40 kolom) ke Google Sheets...");
      const tsWib = formatTimestampWib();
      const tglPjbId = isoToIdDate(tglPjb);
      const tglBrgktId = isAkomodasi ? isoToIdDate(tglBerangkat) : "";
      const nomFinal = isAkomodasi ? totalUmCalc : nominalPjb;
      const nomUmHarian = isAkomodasi && lamaHari > 0 ? Math.floor(totalUmCalc / lamaHari) : 0;

      let bbmLabel = activeData.bbm;
      if (isVehicle && !bbmLabel.toUpperCase().includes(`[${sumberBbm.toUpperCase()}]`)) {
        bbmLabel = `${bbmLabel} [${sumberBbm.toUpperCase()}]`;
      }

      const isInapCat = activeData.bbm.toLowerCase().includes("penginapan");
      const urlInap = isInapCat ? urlMatOrInap : "";
      const urlNotaMat = isInapCat ? "" : urlMatOrInap;

      // Exact 40 columns matching App-v4.py `Form PJB` (A..AN)
      const row40: (string | number)[] = [
        tsWib, // 0
        tglPjbId, // 1
        activeData.nop, // 2
        activeData.cluster, // 3
        activeData.nama, // 4
        activeData.role, // 5
        activeData.site, // 6
        activeData.keperluan, // 7
        bbmLabel, // 8
        activeData.desc, // 9
        String(isVehicle ? parsedKmAkhir.value : activeData.kmAwal), // 10
        nomFinal, // 11
        activeData.plat, // 12
        urlIsi, // 13
        urlNotaSupport, // 14
        urlKm, // 15
        "", // 16 url_mat
        urlNotaMat, // 17
        urlInap, // 18
        urlKerja, // 19
        totNilaiNota, // 20
        activeData.tiket, // 21
        String(parsedLiter.value), // 22
        hargaSatuan, // 23
        String(isVehicle ? totalTrip : 0), // 24
        urlEcBotol, // 25
        urlEcBayar, // 26
        urlTransfer, // 27
        urlUm1, // 28
        urlUm2, // 29
        urlUm3, // 30
        urlUm4, // 31
        tglBrgktId, // 32
        isAkomodasi ? String(lamaHari) : "", // 33
        isAkomodasi ? String(nomUmHarian) : "", // 34
        "", // 35 pdf_link_cloud
        activeData.tiket, // 36 specific_pm_tickets
        jamMulaiGen, // 37
        jamAkhirGen, // 38
        urlTiketGen, // 39
      ];

      const remarkApp = sumberBbm === "Eceran" && aiEceran ? aiEceran.remark : "-";
      const approvalRow = [tsWib, activeData.nama, activeData.tiket, "Verifikasi PJB", nomFinal, "PENDING", remarkApp];

      const res = await fetch("/api/pjb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nop, row40, approvalRow }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan PJB");

      if (isAkomodasi) {
        const dStart = new Date(tglBerangkat + "T00:00:00");
        const dEnd = new Date(dStart.getTime() + lamaHari * 86400000);
        const htmlDoc = buildSuratTugasHtml({
          nop: activeData.nop,
          tiket: activeData.tiket,
          nama: activeData.nama,
          nik: activeData.nik,
          role: activeData.role,
          site: activeData.site,
          keperluan: activeData.keperluan,
          desc: activeData.desc,
          jarak: activeData.jarak,
          tglPjb: tglPjbId,
          tglBerangkat: tglBrgktId,
          tglKembali: formatDateId(dEnd),
          lamaHari,
          totalUm: totalUmCalc,
          lat1: activeData.lat1,
          lon1: activeData.lon1,
          lat2: activeData.lat2,
          lon2: activeData.lon2,
          urlUm1,
          urlUm2,
          urlUm3,
          urlUm4,
        });
        setSuratTugasHtml(htmlDoc);
      }

      const mot = MOTIVASI_LIST[Math.floor(Math.random() * MOTIVASI_LIST.length)];
      setSuccessMsg(`🎉 PJB ${activeData.tiket} berhasil disahkan & dikirim untuk Verifikasi Admin! 💡 ${mot}`);
      setActiveData(null);
      await loadNopData(nop, true);
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
      setSubmitStatus("");
    }
  }

  function openPrintSuratTugas() {
    if (!suratTugasHtml) return;
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(suratTugasHtml);
      win.document.close();
    }
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="card-ui p-5 text-center border-t-4 border-t-emerald-600">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">✅ PORTAL PJB (PENYELESAIAN)</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Selesaikan sub-tiket operasional &amp; akomodasi — Direct Upload Cloudinary &amp; Sync Google Sheets
        </p>
      </div>

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="card-ui p-5 border-2 border-emerald-400 bg-emerald-50 space-y-3">
          <div className="text-emerald-900 font-extrabold text-sm sm:text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            {successMsg}
          </div>
          {suratTugasHtml && (
            <button type="button" onClick={openPrintSuratTugas} className="btn-whatsapp w-full sm:w-auto">
              <Printer className="w-4 h-4" /> 🖨️ Buka &amp; Cetak Surat Tugas + Uang Makan (3 Hal A4 + Peta)
            </button>
          )}
        </div>
      )}

      {/* 1. PILIH NOP */}
      <div className="card-ui p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="label-ui">📂 1. Pilih Database Wilayah (NOP)</label>
            <select
              className="input-ui"
              value={nop}
              onChange={(e) => {
                setNop(e.target.value);
                setNamaFilter("");
                setTiketPick("");
                setActiveData(null);
              }}
            >
              <option value="">-- Pilih NOP --</option>
              {NOP_KEYS.map((k) => (
                <option key={k} value={k}>NOP {k}</option>
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

      {bundle && (
        <>
          {/* 2. FILTER NAMA & TARIK SUB-TIKET PENDING */}
          <div className="card-ui p-5 space-y-4">
            <div className="section-bar !mt-0">🔍 2. Identifikasi Tim &amp; Daftar Sub-Tiket Pending</div>
            <div>
              <label className="label-ui">👤 Pilih Nama Anda (Filter Sub-Tiket Pending)</label>
              <select className="input-ui" value={namaFilter} onChange={(e) => setNamaFilter(e.target.value)}>
                <option value="">-- Tampilkan Semua Petugas --</option>
                {bundle.names.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {pendingItems.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Tgl</th>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Sub-Tiket</th>
                      <th className="px-3 py-2">Kategori Item</th>
                      <th className="px-3 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{it.tanggal}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{it.nama}</td>
                        <td className="px-3 py-2 font-bold text-blue-700">{it.tiket}</td>
                        <td className="px-3 py-2 text-slate-700">{it.kategori}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTiketPick(it.tiket);
                              setTiketManual(it.tiket);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                          >
                            Pilih
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold">
                💎 Seluruh sub-tiket sudah di-PJB!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="label-ui">🎫 Pilih / Ketik Sub-Tiket Pending</label>
                <select className="input-ui mb-2" value={tiketPick} onChange={(e) => setTiketPick(e.target.value)}>
                  <option value="">-- Pilih Sub-Tiket --</option>
                  {pendingItems.map((it, idx) => (
                    <option key={idx} value={it.tiket}>{it.tiket} — {it.nama}</option>
                  ))}
                  <option value="__MANUAL__">-- Ketik Manual --</option>
                </select>
                {(tiketPick === "__MANUAL__" || !tiketPick) && (
                  <input
                    type="text"
                    className="input-ui uppercase"
                    placeholder="Ketik manual sub-tiket..."
                    value={tiketManual}
                    onChange={(e) => setTiketManual(e.target.value)}
                  />
                )}
              </div>
              <button type="button" onClick={handleTarikData} className="btn-primary-red w-full">
                <Search className="w-4 h-4" /> Tarik Data PJB
              </button>
            </div>
          </div>

          {/* 3. FORM DETAIL PJB */}
          {activeData && (
            <div className="card-ui p-5 space-y-5">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm font-extrabold">
                📌 SUB-TIKET TERPILIH: {activeData.tiket} • KATEGORI: {isAkomodasi ? "BIAYA AKOMODASI (UANG MAKAN)" : activeData.bbm.toUpperCase()}
              </div>

              {/* WAJIB BUKTI TRANSFER */}
              <div>
                <div className="section-bar !mt-0">💸 3. Validasi Bukti Transfer (WAJIB)</div>
                <ImageUploader
                  label="Upload Foto Bukti Transfer Dana dari Admin"
                  required
                  file={fTransfer}
                  onChange={setFTransfer}
                  helper="Form PJB terbuka otomatis setelah bukti transfer diunggah."
                />
              </div>

              {fTransfer && (
                <>
                  {/* RINCIAN TERKUNCI */}
                  <div>
                    <div className="section-bar !mt-0">🔒 4. Rincian Terkunci (Sistem)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                      <div>
                        <label className="label-ui">Tanggal PJB</label>
                        <input type="date" className="input-ui" value={tglPjb} onChange={(e) => setTglPjb(e.target.value)} />
                      </div>
                      <div>
                        <label className="label-ui">Nama PIC &amp; NIK</label>
                        <input className="input-ui" disabled value={`${activeData.nama} (${activeData.nik})`} />
                      </div>
                      <div>
                        <label className="label-ui">Site ID &amp; Keperluan</label>
                        <input className="input-ui" disabled value={`${activeData.site} • ${activeData.keperluan}`} />
                      </div>
                      <div>
                        <label className="label-ui">Plat / Unit</label>
                        <input className="input-ui" disabled value={`${activeData.bbm} — ${activeData.plat || "-"}`} />
                      </div>
                      {!isAkomodasi && (
                        <div>
                          <label className="label-ui">Nominal PJB Terpakai (Rp)</label>
                          <input type="number" className="input-ui" value={nominalPjb} onChange={(e) => setNominalPjb(Number(e.target.value))} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OPERATIONAL UMUM */}
                  {!isAkomodasi ? (
                    <div className="space-y-4">
                      {isGenset && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                          <div className="font-extrabold text-sm text-amber-900">⚡ Validasi Wajib Genset MBP</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="label-ui">Jam Mulai Backup</label>
                              <input type="time" className="input-ui" value={jamMulaiGen} onChange={(e) => setJamMulaiGen(e.target.value)} />
                            </div>
                            <div>
                              <label className="label-ui">Jam Berakhir Backup</label>
                              <input type="time" className="input-ui" value={jamAkhirGen} onChange={(e) => setJamAkhirGen(e.target.value)} />
                            </div>
                            <ImageUploader label="Screenshot Tiket Genset" file={fTiketGen} onChange={setFTiketGen} />
                          </div>
                        </div>
                      )}

                      {isVehicle ? (
                        <div className="space-y-4">
                          {/* PERINGATAN BBM ACTUAL */}
                          <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-900 text-xs sm:text-sm">
                            <div className="font-extrabold">🚨 PERHATIAN KERAS: BBM WAJIB HARGA ACTUAL!</div>
                            <div className="mt-1 font-medium">
                              Penginputan harga satuan dan liter BBM wajib sesuai harga actual di lapangan/SPBU/Toko. <b>Jika ditemukan kecurangan, maka akan langsung di-audit oleh Management.</b>
                            </div>
                          </div>

                          {/* KALKULASI JARAK NOPOL & HISTORI TERAKHIR */}
                          {activeData.plat && (
                            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs sm:text-sm space-y-1">
                              <div className="font-extrabold">🛣️ KALKULASI JARAK NOPOL / UNIT ({activeData.plat}):</div>
                              <div>
                                • <b>{unitLbl} Terakhir Tercatat di PJB:</b>{" "}
                                {formatIdNumber(activeNopolStat?.lastOdo || 0)} {unitLbl} (Tgl: {activeNopolStat?.lastDate || "-"} | Akumulasi: {formatIdNumber(activeNopolStat?.totalTrip || 0)} {unitLbl} dari {activeNopolStat?.tripCount || 0} Trip)
                              </div>
                              <div>
                                • <b>{unitLbl} Awal Tiket Ini:</b> {formatIdNumber(activeData.kmAwal)} {unitLbl} • <b>Jarak Satelit Request:</b> {activeData.jarak}
                              </div>
                            </div>
                          )}

                          {/* SPBU vs ECERAN */}
                          <div className="flex gap-2">
                            {(["SPBU", "Eceran"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSumberBbm(s)}
                                className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold border ${
                                  sumberBbm === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300"
                                }`}
                              >
                                {s === "SPBU" ? "⛽ Pembelian SPBU" : "🛢️ Pembelian Eceran (Wajib 2 Foto AI)"}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="p-2.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-800">
                                📍 {unitLbl} Awal (Saat Request): {formatIdNumber(activeData.kmAwal)} {unitLbl} • ⏱️ {formatTimestampWib(getNowWib())}
                              </div>
                              <div>
                                <label className="label-ui">{isGenset ? "RH Genset Akhir" : "KM Akhir Kendaraan"} AKTUAL (Tanpa titik ribuan) *</label>
                                <input className="input-ui" value={kmAkhirRaw} onChange={(e) => setKmAkhirRaw(e.target.value)} />
                                <p className={`mt-1 text-[11px] font-bold ${parsedKmAkhir.level === "err" ? "text-rose-600" : "text-slate-600"}`}>
                                  🔎 {parsedKmAkhir.note}
                                </p>
                              </div>
                              {totalTrip >= 0 ? (
                                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                                  🛣️ Kalkulasi {isGenset ? "Total RH" : "Trip"}: +{formatIdNumber(totalTrip)} {unitLbl} ({formatIdNumber(activeData.kmAwal)} → {formatIdNumber(parsedKmAkhir.value)})
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold">
                                  🚨 {unitLbl} Akhir lebih kecil dari {unitLbl} Awal!
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="label-ui">Total Liter BBM Aktual (Contoh: 15,5) *</label>
                                <input className="input-ui" value={totLiterRaw} onChange={(e) => setTotLiterRaw(e.target.value)} />
                              </div>
                              <div>
                                <label className="label-ui">Harga Satuan BBM Aktual ({sumberBbm} - Rp/L) *</label>
                                <input type="number" min={0} step={100} className="input-ui" value={hargaSatuan} onChange={(e) => setHargaSatuan(Number(e.target.value))} />
                                {hargaSatuan > 0 && (
                                  <p className={`mt-1 text-[11px] font-bold ${hargaCheck.ok ? "text-emerald-700" : "text-rose-600"}`}>
                                    {hargaCheck.ok ? "✅" : "🚨"} {hargaCheck.msg}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="label-ui">Total Fisik Sesuai Nota / Bayar Toko (Rp) *</label>
                                <input type="number" min={0} step={1000} className="input-ui" value={totNilaiNota} onChange={(e) => setTotNilaiNota(Number(e.target.value))} />
                              </div>
                              {parsedLiter.value > 0 && hargaSatuan > 0 && (
                                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                                  🧮 Kalkulasi Nota: {formatIdNumber(parsedLiter.value)} L × {formatRupiah(hargaSatuan)} = {formatRupiah(Math.round(parsedLiter.value * hargaSatuan))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3 FOTO UTAMA */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <ImageUploader label="1. Evidance Pengisian" file={fIsi} onChange={setFIsi} />
                            <ImageUploader label="2. Nota KM / RH" file={fKm} onChange={setFKm} />
                            <ImageUploader label="3. Evidance Pekerjaan" file={fKerja} onChange={setFKerja} />
                          </div>

                          {/* 2 FOTO WAJIB ECERAN + ANALISA AI */}
                          {sumberBbm === "Eceran" && (
                            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 space-y-3">
                              <div className="text-xs sm:text-sm font-extrabold text-amber-900">
                                🤖 FOTO TAMBAHAN WAJIB PEMBELIAN ECERAN (DIANALISA AI):
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <ImageUploader label="4. Full Foto Isi BBM Sesuai Jumlah Botol/Liter" required file={fEcBotol} onChange={setFEcBotol} />
                                <ImageUploader label="5. Foto Bukti Bayar Cash / Transfer ke Toko" required file={fEcBayar} onChange={setFEcBayar} />
                              </div>
                              {aiEceran && (
                                <div className={`p-3 rounded-xl text-xs space-y-1 border ${aiEceran.ok ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-rose-50 border-rose-300 text-rose-900"}`}>
                                  <div className="font-extrabold">🤖 HASIL ANALISA AI ECERAN — [{aiEceran.status}]</div>
                                  {aiEceran.lines.map((ln, idx) => <div key={idx}>• {ln}</div>)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="label-ui">Total Fisik Sesuai Kwitansi (Rp)</label>
                            <input type="number" min={0} step={1000} className="input-ui" value={totNilaiNota} onChange={(e) => setTotNilaiNota(Number(e.target.value))} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <ImageUploader label="1. Kwitansi Support / Nota" file={fNotaSupport} onChange={setFNotaSupport} />
                            <ImageUploader
                              label={activeData.bbm.toLowerCase().includes("penginapan") ? "2. Foto Hotel" : "2. Foto Material"}
                              file={fMatOrInap}
                              onChange={setFMatOrInap}
                            />
                            <ImageUploader label="3. Evidance Pekerjaan" file={fKerja} onChange={setFKerja} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* BIAYA AKOMODASI (UANG MAKAN) */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="label-ui">Tanggal Keberangkatan</label>
                          <input type="date" className="input-ui" value={tglBerangkat} onChange={(e) => setTglBerangkat(e.target.value)} />
                        </div>
                        <div>
                          <label className="label-ui">Lama Hari (Durasi Kerja)</label>
                          <input type="number" min={1} className="input-ui" value={lamaHari} onChange={(e) => setLamaHari(Math.max(1, Number(e.target.value)))} />
                        </div>
                        <div>
                          <label className="label-ui">Total Nominal Uang Makan (Rp)</label>
                          <input type="number" min={0} step={1000} className="input-ui" value={totalUmCalc} onChange={(e) => setTotalUmCalc(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <ImageUploader label="Foto Aktivitas 1" required file={fUm1} onChange={setFUm1} />
                        <ImageUploader label="Foto Aktivitas 2" required file={fUm2} onChange={setFUm2} />
                        <ImageUploader label="Foto Aktivitas 3" required file={fUm3} onChange={setFUm3} />
                        <ImageUploader label="Foto Aktivitas 4" required file={fUm4} onChange={setFUm4} />
                      </div>
                    </div>
                  )}

                  {/* PAKTA INTEGRITAS & PERNYATAAN AUDIT */}
                  <div className="space-y-3 pt-2">
                    {needPakta && (
                      <div className={`p-4 rounded-xl border-l-4 text-xs sm:text-sm space-y-2 ${roleUp.includes("TE") ? "bg-emerald-50 border-emerald-500" : "bg-rose-50 border-rose-500"}`}>
                        <div className="font-extrabold text-slate-900">
                          ⚠️ PAKTA INTEGRITAS WAJIB ({roleUp.includes("TE") ? "TIM TE" : "TIM MBP & CME"}):
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-slate-800 font-medium">
                          <li>Saya tidak melakukan kecurangan / mark up harga BBM maupun tiket anomali.</li>
                          <li>Apa yang saya pertanggungjawabkan adalah benar, jujur, dan berintegritas.</li>
                        </ul>
                        <label className="inline-flex items-center gap-2 font-extrabold text-slate-900 cursor-pointer pt-1">
                          <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={cekIntegritas} onChange={(e) => setCekIntegritas(e.target.checked)} />
                          ✅ Saya sudah membaca &amp; menyatakan jujur
                        </label>
                      </div>
                    )}

                    {!isAkomodasi && isVehicle && (
                      <div className="p-4 rounded-xl bg-rose-50 border-l-4 border-rose-700 text-xs sm:text-sm space-y-2">
                        <div className="font-extrabold text-rose-900">⚖️ PERNYATAAN AUDIT MANAGEMENT:</div>
                        <div className="text-rose-800 font-semibold">
                          BBM wajib harga actual. Jika ditemukan kecurangan maka akan langsung di-audit oleh Management.
                        </div>
                        <label className="inline-flex items-center gap-2 font-extrabold text-rose-900 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 accent-rose-600" checked={cekBbmActual} onChange={(e) => setCekBbmActual(e.target.checked)} />
                          ✅ Saya menyatakan BBM menggunakan HARGA ACTUAL &amp; siap diaudit Management
                        </label>
                      </div>
                    )}
                  </div>

                  {submitErr && (
                    <div className="p-3.5 rounded-xl bg-rose-100 border border-rose-400 text-rose-900 text-xs sm:text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {submitErr}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitPjb}
                    className="btn-primary-red w-full py-3.5 text-base"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" /> {submitStatus || "Menyimpan PJB..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" /> 🚀 Sahkan Pelaporan PJB
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PjbPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-slate-600">Memuat Form PJB Operasional...</div>}>
      <PjbFormInner />
    </Suspense>
  );
}
