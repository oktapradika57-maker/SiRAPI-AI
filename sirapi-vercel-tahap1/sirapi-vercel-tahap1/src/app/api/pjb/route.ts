import { NextRequest, NextResponse } from "next/server";
import { appendSheetRows } from "@/lib/sheets";
import { SHEETS } from "@/lib/constants";
import { formatTimestampWib } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nop, row40, approvalRow } = body as {
      nop: string;
      row40: (string | number)[];
      approvalRow?: (string | number)[];
    };

    if (!nop || !Array.isArray(row40)) {
      return NextResponse.json({ error: "Data PJB tidak lengkap" }, { status: 400 });
    }

    // Pastikan tepat 40 kolom (A..AN) persis App-v4.py
    const padded = [...row40];
    while (padded.length < 40) padded.push("");
    const finalRow = padded.slice(0, 40);

    await appendSheetRows(nop, SHEETS.PJB, [finalRow]);

    if (approvalRow && approvalRow.length >= 7) {
      await appendSheetRows(nop, SHEETS.APP, [approvalRow.slice(0, 7)]);
    } else {
      await appendSheetRows(nop, SHEETS.APP, [
        [formatTimestampWib(), String(finalRow[4] || ""), String(finalRow[21] || ""), "Verifikasi PJB", Number(finalRow[11]) || 0, "PENDING", "-"],
      ]);
    }

    return NextResponse.json({ ok: true, message: "PJB berhasil disimpan & dikirim ke Approval Center!" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Gagal menyimpan PJB ke Google Sheets" },
      { status: 500 }
    );
  }
}
