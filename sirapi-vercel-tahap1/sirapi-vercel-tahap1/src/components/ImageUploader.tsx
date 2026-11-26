"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, X, CheckCircle2 } from "lucide-react";

interface Props {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
  helper?: string;
}

export default function ImageUploader({ label, required, file, onChange, helper }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-3 transition hover:border-blue-400">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs sm:text-sm font-bold text-slate-800">
          {label} {required && <span className="text-rose-600">*</span>}
        </span>
        {file && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-0.5"
          >
            <X className="w-3.5 h-3.5" /> Hapus
          </button>
        )}
      </div>

      {helper && <p className="text-[11px] text-slate-500 mb-2">{helper}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          onChange(f);
        }}
      />

      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="w-full h-36 object-contain rounded-lg bg-slate-50 border border-slate-200"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
            <span className="inline-flex items-center gap-1 truncate max-w-[75%]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {file?.name}
            </span>
            <span>{file ? `${Math.round(file.size / 1024)} KB` : ""}</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-4 px-3 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 transition"
        >
          <Camera className="w-5 h-5" />
          <span>Pilih / Ambil Foto</span>
        </button>
      )}
    </div>
  );
}
