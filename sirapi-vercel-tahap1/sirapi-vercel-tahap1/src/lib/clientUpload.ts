export async function compressImageOnClient(file: File, maxDim = 960, quality = 0.6): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas tidak didukung browser"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Gagal mengompresi gambar"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File gambar tidak dapat dibaca"));
    };
    img.src = url;
  });
}

export async function uploadImageDirectToCloudinary(file: File | null): Promise<string> {
  if (!file) return "";
  const compressed = await compressImageOnClient(file, 960, 0.58);

  // Request signature from Vercel API (supports primary + backup account)
  const signRes = await fetch("/api/cloudinary-sign", { method: "POST" });
  if (!signRes.ok) {
    const errText = await signRes.text();
    throw new Error(`Gagal minta izin upload Cloudinary: ${errText}`);
  }
  const { accounts } = (await signRes.json()) as {
    accounts: { cloudName: string; apiKey: string; timestamp: number; signature: string }[];
  };

  let lastErr = "Gagal upload gambar";
  for (const acc of accounts) {
    try {
      const formData = new FormData();
      formData.append("file", compressed, file.name.replace(/\.[^.]+$/, ".jpg"));
      formData.append("api_key", acc.apiKey);
      formData.append("timestamp", String(acc.timestamp));
      formData.append("signature", acc.signature);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${acc.cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      if (upRes.ok) {
        const json = await upRes.json();
        if (json.secure_url) return json.secure_url as string;
      } else {
        lastErr = await upRes.text();
      }
    } catch (e) {
      lastErr = String(e);
    }
  }
  throw new Error(lastErr);
}

export interface EceranAiResult {
  ok: boolean;
  status: string;
  lines: string[];
  remark: string;
}

async function hashFileSha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function analyzeImageQuality(file: File, label: string): Promise<{ note: string; warns: string[] }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const sw = Math.min(w, 320);
      const sh = Math.min(h, 320);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      const warns: string[] = [];
      let brightness = 128;
      let sharpness = 100;
      if (ctx) {
        ctx.drawImage(img, 0, 0, sw, sh);
        const data = ctx.getImageData(0, 0, sw, sh).data;
        let sum = 0;
        const gray = new Float32Array(sw * sh);
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          gray[p] = g;
          sum += g;
        }
        brightness = sum / (sw * sh);
        let diffSum = 0;
        for (let y = 0; y < sh - 1; y++) {
          for (let x = 0; x < sw - 1; x++) {
            const idx = y * sw + x;
            const gx = gray[idx + 1] - gray[idx];
            const gy = gray[idx + sw] - gray[idx];
            diffSum += gx * gx + gy * gy;
          }
        }
        sharpness = diffSum / ((sw - 1) * (sh - 1));
      }
      if (w < 300 || h < 300) warns.push(`${label}: Resolusi terlalu kecil (${w}x${h} px).`);
      if (brightness < 25) warns.push(`${label}: Foto terlalu gelap/hitam.`);
      else if (brightness > 245) warns.push(`${label}: Foto terlalu terang/putih.`);
      if (sharpness < 18) warns.push(`${label}: Foto terdeteksi buram/blur.`);
      resolve({
        note: `${label}: ${w}×${h} px | Ketajaman ${Math.round(sharpness)} | Kecerahan ${Math.round(brightness)}`,
        warns,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ note: `${label}: gagal baca dimensi`, warns: [`${label}: gambar rusak.`] });
    };
    img.src = url;
  });
}

export async function runEceranAiCheck(
  fBotol: File | null,
  fBayar: File | null,
  expectedLiter: number,
  expectedHarga: number,
  expectedNota: number
): Promise<EceranAiResult> {
  if (!fBotol || !fBayar) {
    return {
      ok: false,
      status: "BELUM LENGKAP",
      lines: ["Wajib mengunggah kedua foto Eceran (Foto Full Botol/Liter & Foto Bukti Bayar Toko)."],
      remark: "Foto Eceran belum lengkap",
    };
  }
  const [h1, h2, q1, q2] = await Promise.all([
    hashFileSha256(fBotol),
    hashFileSha256(fBayar),
    analyzeImageQuality(fBotol, "Foto 1 (Full Botol/Liter)"),
    analyzeImageQuality(fBayar, "Foto 2 (Bukti Bayar Toko)"),
  ]);

  const warns = [...q1.warns, ...q2.warns];
  if (h1 === h2) {
    warns.push("Foto Botol/Liter dan Foto Bukti Bayar adalah file gambar yang IDENTIK (sama persis)!");
  }
  const lines = [
    q1.note,
    q2.note,
    `Target Audit Eceran: ${expectedLiter} L × Rp ${expectedHarga.toLocaleString("id-ID")} = Rp ${expectedNota.toLocaleString("id-ID")}`,
    ...warns.map((w) => `⚠️ Temuan AI: ${w}`),
  ];

  if (warns.length > 0) {
    return {
      ok: false,
      status: "PERLU AUDIT ADMIN",
      lines,
      remark: `⚠️ AI Eceran Flag: ${warns.slice(0, 2).join(" ; ")}`,
    };
  }
  return {
    ok: true,
    status: "LOLOS ANALISA AI",
    lines,
    remark: `✅ AI Eceran OK (${expectedLiter} L @Rp ${expectedHarga.toLocaleString("id-ID")} = Rp ${expectedNota.toLocaleString("id-ID")})`,
  };
}
