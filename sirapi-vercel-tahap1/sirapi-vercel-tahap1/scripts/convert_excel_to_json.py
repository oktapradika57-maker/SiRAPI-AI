"""
Opsional: Jalankan skrip ini di laptop jika ingin menggabungkan
Hasil_910_Site.xlsx + Site ID Sidata Pangkalanbun.xlsx ke src/data/sites.json.
Cara pakai: python scripts/convert_excel_to_json.py
"""
import json, os
import pandas as pd

files = ["Hasil_910_Site.xlsx", "Site ID Sidata Pangkalanbun.xlsx"]
sites = []
seen = set()

for fn in files:
    if os.path.exists(fn):
        df = pd.read_excel(fn).fillna(0)
        for _, r in df.iterrows():
            sid = str(r.get("Site ID", "")).strip()
            if sid and sid not in seen:
                seen.add(sid)
                try: lat = round(float(str(r.get("Latitude Tujuan", 0)).replace(",", ".")), 6)
                except: lat = 0.0
                try: lon = round(float(str(r.get("Longtitude Tujuan", 0)).replace(",", ".")), 6)
                except: lon = 0.0
                sites.append({"id": sid, "lat": lat, "lon": lon})

os.makedirs("src/data", exist_ok=True)
with open("src/data/sites.json", "w", encoding="utf-8") as f:
    json.dump(sites, f, ensure_ascii=False)
print(f"Selesai! Total {len(sites)} site tersimpan di src/data/sites.json")
