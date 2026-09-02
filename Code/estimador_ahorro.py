# -*- coding: utf-8 -*-
"""
Motor de habitos SmartHabit: convierte las alertas detectadas por la IA
(picos, fugas, tendencias) en un ahorro estimado en USD y en un indice
de salud de habitos (EcoScore), en vez de asumir porcentajes fijos.

Lee:
  - Data Set/dataset_consumo_total_1y.csv
  - Dashboard/static/predicciones_multihorizonte.json
  - Dashboard/static/alertas_multihorizonte.json

Genera:
  - Dashboard/static/estimacion_ahorro.json
"""

import os
import sys
import json
from datetime import datetime

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# --------------------------------
# ARCHIVOS
# --------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "Dashboard", "static")

DATASET = os.path.join(BASE_DIR, "Data Set", "dataset_consumo_total_1y.csv")
PRED_JSON = os.path.join(STATIC_DIR, "predicciones_multihorizonte.json")
ALERTAS_JSON = os.path.join(STATIC_DIR, "alertas_multihorizonte.json")
OUT_FILE = os.path.join(STATIC_DIR, "estimacion_ahorro.json")

PENALTY_POR_SEVERIDAD = {"crítica": 8, "moderada": 4, "leve": 1}
CLASIFICACION_SCORE = [
    (80, "Excelente"),
    (60, "Buena"),
    (40, "Regular"),
    (0, "Requiere atención"),
]


# --------------------------------
# 1. TARIFAS IMPLICITAS (a partir del propio dataset)
# --------------------------------
def calcular_tarifas_implicitas(df: pd.DataFrame):
    ratio_kwh = (df["costo_luz_usd"] / df["energia_kwh"]).replace([np.inf, -np.inf], np.nan).dropna()
    ratio_litro = (df["costo_agua_usd"] / df["agua_litros"]).replace([np.inf, -np.inf], np.nan).dropna()
    tarifa_kwh = float(ratio_kwh.median()) if len(ratio_kwh) else 0.16
    tarifa_litro = float(ratio_litro.median()) if len(ratio_litro) else 0.0015
    return tarifa_kwh, tarifa_litro


# --------------------------------
# 2. AHORRO DETECTADO A PARTIR DE ALERTAS REALES
# --------------------------------
def excedente_en_usd(alerta, tarifa_kwh, tarifa_litro):
    exceso = max(alerta["valor"] - alerta["umbral"], 0.0)
    if alerta["unidad"] == "USD":
        return exceso
    if alerta["variable"] == "energia":
        return exceso * tarifa_kwh
    if alerta["variable"] == "agua":
        return exceso * tarifa_litro
    return 0.0


def dias_evaluados_desde_predicciones(df_pred):
    ts = pd.to_datetime(df_pred["timestamp_objetivo"]) if "timestamp_objetivo" in df_pred else pd.to_datetime(df_pred["timestamp"])
    return max((ts.max() - ts.min()).days, 1)


def calcular_ahorro_detectado(alertas_data, dias_evaluados, tarifa_kwh, tarifa_litro):
    alertas = alertas_data.get("alertas", [])

    picos_usd = sum(
        excedente_en_usd(a, tarifa_kwh, tarifa_litro)
        for a in alertas if a["tipo"] == "pico"
    )
    fugas_usd = sum(
        excedente_en_usd(a, tarifa_kwh, tarifa_litro)
        for a in alertas if a["tipo"] == "posible_fuga"
    )
    n_tendencias = sum(1 for a in alertas if a["tipo"] == "tendencia_alcista")
    n_presupuesto = sum(1 for a in alertas if a["tipo"] == "presupuesto_superado")

    total_periodo = picos_usd + fugas_usd
    factor_mensual = 30.0 / dias_evaluados
    proyeccion_mensual = total_periodo * factor_mensual

    return {
        "descripcion": (
            f"Ahorro estimado a partir de {len(alertas)} alertas detectadas por la IA "
            f"(picos de consumo y posibles fugas) en {dias_evaluados} días evaluados."
        ),
        "picos_usd_periodo": round(picos_usd, 4),
        "fugas_usd_periodo": round(fugas_usd, 4),
        "total_usd_periodo": round(total_periodo, 4),
        "dias_evaluados": dias_evaluados,
        "proyeccion_mensual_usd": round(proyeccion_mensual, 2),
        "n_tendencias_alcistas": n_tendencias,
        "n_alertas_presupuesto": n_presupuesto,
    }


# --------------------------------
# 3. ECOSCORE: INDICE DE SALUD DE HABITOS
# --------------------------------
def calcular_eco_score(alertas_data, dias_evaluados):
    alertas = alertas_data.get("alertas", [])
    conteo = {"crítica": 0, "moderada": 0, "leve": 0}
    for a in alertas:
        sev = a.get("severidad")
        if sev in conteo:
            conteo[sev] += 1

    # Penalización normalizada por día evaluado, para que el score no dependa
    # de si evaluamos 9 días o un año completo de predicciones.
    penalizacion_diaria = sum(
        conteo[sev] * peso for sev, peso in PENALTY_POR_SEVERIDAD.items()
    ) / max(dias_evaluados, 1)
    score = max(0, round(100 - penalizacion_diaria))

    clasificacion = next(etq for umbral, etq in CLASIFICACION_SCORE if score >= umbral)

    return {
        "eco_score": score,
        "clasificacion": clasificacion,
        "n_alertas_criticas": conteo["crítica"],
        "n_alertas_moderadas": conteo["moderada"],
        "n_alertas_leves": conteo["leve"],
        "total_alertas": len(alertas),
    }


# --------------------------------
# 4. ESCENARIOS ILUSTRATIVOS (contexto, no ya el numero principal)
# --------------------------------
def calcular_escenarios_ilustrativos(df):
    total_real = df["costo_total_usd"].sum()
    return {
        "consumo_real_total_usd": round(total_real, 4),
        "ahorro_10pct_usd": round(total_real * 0.10, 4),
        "ahorro_20pct_usd": round(total_real * 0.20, 4),
        "ahorro_30pct_usd": round(total_real * 0.30, 4),
    }


def calcular_ahorro_predicho_futuro(df_pred):
    resultados = []
    for h in sorted(df_pred["horizon"].unique()):
        df_h = df_pred[df_pred["horizon"] == h]
        costo_total_pred = df_h["costo_pred_usd"].sum()
        resultados.append({
            "horizonte_horas": int(h),
            "costo_estimado_usd": round(costo_total_pred, 4),
            "ahorro_10pct_usd": round(costo_total_pred * 0.10, 4),
            "ahorro_20pct_usd": round(costo_total_pred * 0.20, 4),
            "ahorro_30pct_usd": round(costo_total_pred * 0.30, 4),
        })
    return resultados


# --------------------------------
# MAIN
# --------------------------------
def main():
    print("Cargando dataset completo…")
    df = pd.read_csv(DATASET)

    print("Cargando predicciones…")
    with open(PRED_JSON, "r", encoding="utf-8") as f:
        df_pred = pd.DataFrame(json.load(f))

    print("Cargando alertas…")
    with open(ALERTAS_JSON, "r", encoding="utf-8") as f:
        alertas_data = json.load(f)

    tarifa_kwh, tarifa_litro = calcular_tarifas_implicitas(df)
    dias_evaluados = dias_evaluados_desde_predicciones(df_pred)

    salida = {
        "generado_en": datetime.now().isoformat(),
        "tarifas_implicitas": {
            "usd_por_kwh": round(tarifa_kwh, 6),
            "usd_por_litro": round(tarifa_litro, 8),
        },
        "habito": calcular_eco_score(alertas_data, dias_evaluados),
        "ahorro_detectado": calcular_ahorro_detectado(alertas_data, dias_evaluados, tarifa_kwh, tarifa_litro),
        "escenarios_ilustrativos": calcular_escenarios_ilustrativos(df),
        "ahorro_predicho_futuro": calcular_ahorro_predicho_futuro(df_pred),
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(salida, f, indent=2, ensure_ascii=False)

    print(f"OK → Archivo generado:\n{OUT_FILE}")


if __name__ == "__main__":
    main()
