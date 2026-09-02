# -*- coding: utf-8 -*-
"""
Exporta la serie horaria completa del dataset a un JSON compacto para
alimentar la "Simulacion en vivo" del dashboard (reproduce el historico
real como si fuera un monitor en tiempo real).

Lee:
  - Data Set/dataset_consumo_total_1y.csv

Genera:
  - Dashboard/static/serie_historica.json
    Formato: [[timestamp_iso, energia_kwh, agua_litros, costo_total_usd], ...]
    (arrays en vez de objetos para mantener el archivo liviano)
"""

import os
import sys
import json

import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET = os.path.join(BASE_DIR, "Data Set", "dataset_consumo_total_1y.csv")
OUT_FILE = os.path.join(BASE_DIR, "Dashboard", "static", "serie_historica.json")


def main():
    print("Cargando dataset completo…")
    df = pd.read_csv(DATASET)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    serie = [
        [
            row.timestamp.strftime("%Y-%m-%dT%H:%M:%S"),
            round(float(row.energia_kwh), 4),
            round(float(row.agua_litros), 3),
            round(float(row.costo_total_usd), 4),
        ]
        for row in df.itertuples(index=False)
    ]

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(serie, f, separators=(",", ":"))

    size_kb = os.path.getsize(OUT_FILE) / 1024
    print(f"OK → {OUT_FILE}")
    print(f"{len(serie):,} horas exportadas ({size_kb:,.0f} KB)")


if __name__ == "__main__":
    main()
