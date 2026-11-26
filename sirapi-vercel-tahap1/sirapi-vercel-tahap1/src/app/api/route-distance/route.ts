import { NextRequest, NextResponse } from "next/server";
import { haversineKm } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lat1 = parseFloat(req.nextUrl.searchParams.get("lat1") || "0");
  const lon1 = parseFloat(req.nextUrl.searchParams.get("lon1") || "0");
  const lat2 = parseFloat(req.nextUrl.searchParams.get("lat2") || "0");
  const lon2 = parseFloat(req.nextUrl.searchParams.get("lon2") || "0");

  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return NextResponse.json({ distOneWay: 0, distPP: 0, durSecOneWay: 0, source: "none" });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (json.code === "Ok" && json.routes?.[0]) {
        const distOneWay = json.routes[0].distance / 1000;
        const durSecOneWay = json.routes[0].duration;
        return NextResponse.json({
          distOneWay: Math.round(distOneWay * 10) / 10,
          distPP: Math.round(distOneWay * 2 * 10) / 10,
          durSecOneWay,
          source: "osrm",
        });
      }
    }
  } catch {
    // Fallback to Haversine
  }

  const distOneWay = haversineKm(lat1, lon1, lat2, lon2) * 1.3;
  const durSecOneWay = (distOneWay / 40.0) * 3600;
  return NextResponse.json({
    distOneWay: Math.round(distOneWay * 10) / 10,
    distPP: Math.round(distOneWay * 2 * 10) / 10,
    durSecOneWay,
    source: "haversine",
  });
}
