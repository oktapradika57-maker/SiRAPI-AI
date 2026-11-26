import { NextRequest, NextResponse } from "next/server";
import { fetchNopBundle } from "@/lib/sheets";
import { MASTER_DATA } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const nop = req.nextUrl.searchParams.get("nop") || "Palangkaraya";
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (!MASTER_DATA[nop]) {
      return NextResponse.json({ error: `NOP '${nop}' tidak valid` }, { status: 400 });
    }
    const bundle = await fetchNopBundle(nop, refresh);
    return NextResponse.json(bundle, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Gagal mengambil data Google Sheets" },
      { status: 500 }
    );
  }
}
