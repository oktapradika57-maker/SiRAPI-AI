import { NextRequest, NextResponse } from "next/server";
import { appendSheetRows, updatePmTicketsStatus } from "@/lib/sheets";
import { SHEETS } from "@/lib/constants";
import { formatTimestampWib } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, nop } = body;

    if (!nop) {
      return NextResponse.json({ error: "NOP wajib diisi" }, { status: 400 });
    }

    // 1. Permintaan Approval Khusus (Izin Revisi / Limit Motor / Harga BBM)
    if (action === "request_approval") {
      const { nama, tiket, jenis, nominal, keterangan } = body;
      const ts = formatTimestampWib();
      await appendSheetRows(nop, SHEETS.APP, [
        [ts, nama || "-", tiket || "-", jenis || "Izin Revisi", Number(nominal) || 0, "PENDING", keterangan || "-"],
      ]);
      return NextResponse.json({ ok: true, message: `Permintaan ${jenis} berhasil dikirim ke Admin.` });
    }

    // 2. Submit Multi-Split Request Dana (24 kolom exact match App-v4.py)
    const { rows, pmSelectedList } = body as {
      rows: (string | number)[][];
      pmSelectedList?: string[];
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Daftar sub-request kosong" }, { status: 400 });
    }

    // Pastikan setiap baris tepat 24 kolom sesuai Form Request dana
    const normalizedRows = rows.map((r) => {
      const padded = [...r];
      while (padded.length < 24) padded.push("");
      return padded.slice(0, 24);
    });

    await appendSheetRows(nop, SHEETS.REQUEST, normalizedRows);

    if (pmSelectedList && pmSelectedList.length > 0) {
      await updatePmTicketsStatus(nop, pmSelectedList, "REQUESTED");
    }

    return NextResponse.json({
      ok: true,
      count: normalizedRows.length,
      message: `Berhasil menyimpan ${normalizedRows.length} sub-tiket ke Google Sheets!`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Gagal menyimpan Request Dana ke Google Sheets" },
      { status: 500 }
    );
  }
}
