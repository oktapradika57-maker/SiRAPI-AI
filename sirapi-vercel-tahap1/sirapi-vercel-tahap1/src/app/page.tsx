"use client";

import { useState } from "react";
import Link from "next/link";
import { MASTER_DATA, NOP_KEYS, CUTOFF_DATE_ISO } from "@/lib/constants";
import { getUserTicketsStatus, parseDate, TicketHistoryItem } from "@/lib/rules";
import type { NopSheetBundle } from "@/lib/sheets";
import { Search, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, FilePlus2, ClipboardCheck } from "lucide-react";

export default function HomePage() {
  const [cekNop, setCekNop] = useState<string>("Palangkaraya");
  const [activeTab, setActiveTab] = useState<"pribadi" | "pending">("pribadi");
  const [cekNama, setCekNama] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [pribadiResult, setPribadiResult] = useState<{
    history: TicketHistoryItem[];
    agingCount: number;
    lockCount: number;
  } | null>(null);

  const [pendingList, setPendingList] = useState<
    { nama: string; tiket: string; tanggal: string; status: string }[] | null
  >(null);

  async function handleCariPribadi() {
    if (!cekNama) {
      setErrorMsg("Silakan pilih Nama Petugas terlebih dahulu.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setPribadiResult(null);
    try {
      const res = await fetch(`/api/nop-data?nop=${encodeURIComponent(cekNop)}&refresh=1`);
      const data = (await res.json()) as NopSheetBundle & { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal menarik data server");
      const st = getUserTicketsStatus(cekNama, data.reqRows, data.pjbRows, data.appRows);
      setPribadiResult({
        history: st.history,
        agingCount: st.agingTickets.length,
        lockCount: st.outstandingLock.length,
      });
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTarikPendingTim() {
    setLoading(true);
    setErrorMsg("");
    setPendingList(null);
    try {
      const res = await fetch(`/api/nop-data?nop=${encodeURIComponent(cekNop)}&refresh=1`);
      const data = (await res.json()) as NopSheetBundle & { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal menarik data server");

      const allNamesSet = new Set<string>(data.names.map((n) => n.trim().toUpperCase()).filter(Boolean));
      for (let i = 1; i < data.reqRows.length; i++) {
        const nm = String(data.reqRows[i]?.[5] ?? "").trim().toUpperCase();
        if (nm) allNamesSet.add(nm);
      }

      const cutoff = new Date(CUTOFF_DATE_ISO + "T00:00:00");
      const rows: { nama: string; tiket: string; tanggal: string; status: string }[] = [];

      Array.from(allNamesSet)
        .sort()
        .forEach((nm) => {
          const st = getUserTicketsStatus(nm, data.reqRows, data.pjbRows, data.appRows);
          st.history.forEach((h) => {
            const d = parseDate(h.tanggal);
            if (d && d.getTime() >= cutoff.getTime()) {
              if (
                h.status.includes("Menunggu PJB") ||
                h.status.includes("Telat") ||
                h.status.includes("DITOLAK")
              ) {
                rows.push({ nama: nm, tiket: h.tiket, tanggal: h.tanggal, status: h.status });
              }
            }
          });
        });

      setPendingList(rows);
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* HERO HEADER */}
      <section className="text-center pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold tracking-wide mb-3">
          ⚡ VERCEL FAST EDITION — DIRECT GOOGLE SHEETS SYNC
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          SiRAPI NOP PLK &amp; PBU Dashboard
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Pilih Area Operasional untuk membuka Form Request Dana, Penyelesaian Nota PJB, atau Portal SiDATA. Ringan &amp; seragam di HP maupun laptop.
        </p>
      </section>

      {/* 2 KARTU AREA OPERASIONAL UTAMA */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PALANGKARAYA */}
        <div className="card-ui p-6 flex flex-col justify-between border-t-4 border-t-blue-600">
          <div className="text-center">
            <div className="text-4xl mb-2">🗼</div>
            <span className="inline-block px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold tracking-wider">
              AREA OPERASIONAL 1
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">NOP PALANGKARAYA</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              Cluster Palangkaraya &amp; Barito Raya — Pengajuan Dana Operasional (BBM, Akomodasi, Material), Penyelesaian Nota PJB &amp; SiDATA.
            </p>
            <div className="mt-3 text-sm font-extrabold text-blue-600">
              📊 {MASTER_DATA.Palangkaraya.names.length} Personel Terdaftar
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/request?nop=Palangkaraya" className="btn-primary-blue text-xs sm:text-sm">
                <FilePlus2 className="w-4 h-4 shrink-0" /> REQUEST PLK
              </Link>
              <Link href="/pjb?nop=Palangkaraya" className="btn-primary-blue text-xs sm:text-sm">
                <ClipboardCheck className="w-4 h-4 shrink-0" /> PJB PLK
              </Link>
            </div>
            <a
              href="https://sidata.streamlit.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 font-bold text-xs sm:text-sm py-2.5 hover:bg-sky-100 transition"
            >
              📊 ISI LAPORAN KE SIDATA (PALANGKARAYA) <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* PANGKALAN BUN */}
        <div className="card-ui p-6 flex flex-col justify-between border-t-4 border-t-rose-600">
          <div className="text-center">
            <div className="text-4xl mb-2">📡</div>
            <span className="inline-block px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-extrabold tracking-wider">
              AREA OPERASIONAL 2
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">NOP PANGKALAN BUN</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              Cluster Pangkalanbun, Sampit &amp; Ketapang — Pengajuan Dana Operasional (BBM, Akomodasi, Material), Penyelesaian Nota PJB &amp; SiDATA.
            </p>
            <div className="mt-3 text-sm font-extrabold text-rose-600">
              📊 {MASTER_DATA.Pangkalanbun.names.length} Personel Terdaftar
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/request?nop=Pangkalanbun" className="btn-primary-red text-xs sm:text-sm">
                <FilePlus2 className="w-4 h-4 shrink-0" /> REQUEST PBU
              </Link>
              <Link href="/pjb?nop=Pangkalanbun" className="btn-primary-red text-xs sm:text-sm">
                <ClipboardCheck className="w-4 h-4 shrink-0" /> PJB PBU
              </Link>
            </div>
            <a
              href="https://sidata.streamlit.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs sm:text-sm py-2.5 hover:bg-rose-100 transition"
            >
              📊 ISI LAPORAN KE SIDATA (PANGKALAN BUN) <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* SHORTCUT AREA LAIN (TARAKAN & PONTIANAK) */}
      <section className="card-ui p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs sm:text-sm font-bold text-slate-700">
          🌐 Area Lain (Tarakan &amp; Pontianak):
        </div>
        <div className="flex flex-wrap gap-2">
          {["Tarakan", "Pontianak"].map((n) => (
            <div key={n} className="inline-flex gap-1.5">
              <Link
                href={`/request?nop=${n}`}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 text-xs font-bold transition"
              >
                Request {n}
              </Link>
              <Link
                href={`/pjb?nop=${n}`}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 text-xs font-bold transition"
              >
                PJB {n}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CEK STATUS TIKET & REMINDER TIM BELUM PJB */}
      <section className="card-ui p-5 sm:p-6">
        <div className="section-bar !mt-0">🔍 CEK STATUS TIKET &amp; REMINDER TIM BELUM PJB</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label-ui">Pilih Area Wilayah Pengecekan</label>
            <select
              className="input-ui"
              value={cekNop}
              onChange={(e) => {
                setCekNop(e.target.value);
                setCekNama("");
                setPribadiResult(null);
                setPendingList(null);
              }}
            >
              {NOP_KEYS.map((k) => (
                <option key={k} value={k}>
                  NOP {k}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("pribadi")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === "pribadi"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              👤 Cek Pribadi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === "pending"
                  ? "bg-rose-600 text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              🚨 Tim Belum PJB
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold">
            ❌ {errorMsg}
          </div>
        )}

        {activeTab === "pribadi" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="label-ui">Nama Petugas</label>
                <select
                  className="input-ui"
                  value={cekNama}
                  onChange={(e) => setCekNama(e.target.value)}
                >
                  <option value="">-- Pilih Nama --</option>
                  {MASTER_DATA[cekNop].names.map((nm) => (
                    <option key={nm} value={nm}>
                      {nm}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCariPribadi}
                  className="btn-primary-blue w-full"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? "Memuat..." : "Cari Status Saya"}
                </button>
              </div>
            </div>

            {pribadiResult && (
              <div className="space-y-3">
                {pribadiResult.agingCount > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Ada {pribadiResult.agingCount} request tertunda &gt;3 Hari. Mohon segera di-PJB!
                  </div>
                )}
                {pribadiResult.lockCount > 0 ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm font-bold">
                    ⚠️ {pribadiResult.lockCount} Request aktif sedang memblokir pengajuan baru (Belum PJB / Pending Verifikasi).
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Seluruh tiket aktif aman &amp; Approved!
                  </div>
                )}

                {pribadiResult.history.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5">No Tiket</th>
                          <th className="px-3 py-2.5">Tanggal</th>
                          <th className="px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pribadiResult.history.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-900">{h.tiket}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{h.tanggal}</td>
                            <td className="px-3 py-2 font-semibold">{h.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 font-medium">Tidak ada data / belum pernah request.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm">
              Menampilkan seluruh tiket tim wilayah <b>{cekNop}</b> yang masih gantung (belum PJB / ditolak) mulai Agustus 2026 dst.
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleTarikPendingTim}
              className="btn-primary-red w-full"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {loading ? "Memindai database..." : `Tarik Data Tim Belum PJB (${cekNop})`}
            </button>

            {pendingList && (
              pendingList.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">
                  🎉 Luar biasa! Seluruh tim wilayah {cekNop} sudah menyelesaikan PJB aktif.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm font-extrabold text-rose-700">
                    ⚠️ Ditemukan {pendingList.length} tiket aktif yang belum selesai PJB:
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5">Nama Petugas</th>
                          <th className="px-3 py-2.5">No Tiket</th>
                          <th className="px-3 py-2.5">Tgl Req</th>
                          <th className="px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendingList.map((r, i) => (
                          <tr key={i} className="hover:bg-rose-50/40">
                            <td className="px-3 py-2 font-bold text-slate-900">{r.nama}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{r.tiket}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.tanggal}</td>
                            <td className="px-3 py-2 font-semibold">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
