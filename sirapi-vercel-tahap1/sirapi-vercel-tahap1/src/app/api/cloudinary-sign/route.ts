import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function signTimestamp(timestamp: number, apiSecret: string) {
  return crypto
    .createHash("sha1")
    .update(`timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
}

export async function POST() {
  const timestamp = Math.floor(Date.now() / 1000);
  const accounts: { cloudName: string; apiKey: string; timestamp: number; signature: string }[] = [];

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    accounts.push({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature: signTimestamp(timestamp, process.env.CLOUDINARY_API_SECRET),
    });
  }
  if (
    process.env.CLOUDINARY_BACKUP_CLOUD_NAME &&
    process.env.CLOUDINARY_BACKUP_API_KEY &&
    process.env.CLOUDINARY_BACKUP_API_SECRET
  ) {
    accounts.push({
      cloudName: process.env.CLOUDINARY_BACKUP_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_BACKUP_API_KEY,
      timestamp,
      signature: signTimestamp(timestamp, process.env.CLOUDINARY_BACKUP_API_SECRET),
    });
  }

  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "Environment variable CLOUDINARY_* belum diatur di Vercel / .env.local!" },
      { status: 500 }
    );
  }
  return NextResponse.json({ accounts });
}
