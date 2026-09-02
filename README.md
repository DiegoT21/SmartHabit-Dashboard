# SmartHabit IA

Dashboard predictivo de consumo de energía y agua para el hogar, construido con
un modelo LSTM multi-horizonte entrenado sobre datos reales de consumo minuto
a minuto ([AMPds](https://www.kaggle.com/datasets/programmerrdai/ampds-the-almanac-of-minutely-power-dataset)).

🏆 Proyecto ganador del primer lugar — Samsung Innovation Campus (SIC) 2025.

## El problema

Los hogares reciben su factura de luz y agua al final del mes, cuando ya no
pueden hacer nada por evitar el gasto. SmartHabit IA adelanta esa información:
predice el consumo de las próximas 1, 6, 12 y 24 horas, detecta anomalías
(picos, fugas nocturnas de agua, tendencias alcistas) y traduce esas alertas
en un ahorro estimado en dólares y un índice de salud de hábitos.

## Cómo funciona

```
AMPds (dataset real)          Code/construir_dataset_ampds_no_clima.py
        │                                    │
        ▼                                    ▼
dataset_consumo_total_1y.csv  ←──────────────┘
        │
        ▼
Code/modelo_consumo_multihorizonte.py   (LSTM, ventana 168h, horizontes 1/6/12/24h)
        │
        ▼
predicciones_multihorizonte.json
        │
        ├──► Code/generar_alertas.py ──────► alertas_multihorizonte.json
        ├──► Code/generar_analitica_consumo.py ──► analitica_consumo.json
        └──► Code/estimador_ahorro.py (usa las alertas) ──► estimacion_ahorro.json
                                                        │
                                                        ▼
                                        Dashboard/dashboard_multihorizonte.html
```

- **Modelo**: LSTM multi-salida (Keras/TensorFlow) que predice energía (kWh),
  agua (L) y costo (USD) a 4 horizontes simultáneos a partir de una ventana de
  168 horas (7 días) de historial + variables de calendario.
- **Alertas**: detección de picos (> percentil 95 de la hora/día), fugas
  nocturnas de agua (consumo fuera de patrón entre 1am-4am), tendencias
  alcistas (media móvil de 7 días) y sobrepresupuesto mensual.
- **Motor de hábitos**: en vez de asumir un ahorro fijo, calcula cuánto dinero
  representan las alertas detectadas (usando la tarifa implícita del propio
  dataset) y un **EcoScore** (0-100) que penaliza según la severidad y
  frecuencia real de las alertas por día evaluado.
- **Dashboard**: sitio estático (HTML/CSS/JS + Chart.js) que solo lee los 4
  JSON generados — no requiere backend ni conexión a internet una vez cargado.

## Ejecutar el dashboard

### Opción 1 — Docker (recomendado para presentaciones locales)

Requiere [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado y en ejecución.

```bash
docker compose up -d
```

Abre `http://localhost` en el navegador. Para detener:

```bash
docker compose down
```

### Opción 2 — Servidor estático simple

```bash
python -m http.server 8000 --directory Dashboard
```

Abre `http://localhost:8000/dashboard_multihorizonte.html`.

### Opción 3 — Desplegado en la web

El repo incluye `vercel.json` listo para desplegar como sitio estático en
[Vercel](https://vercel.com) (u otro host estático): conecta el repositorio y
listo, sin build step. Es la opción más segura para una demo en un lugar con
wifi o hardware incierto, porque no depende de Docker ni de tu laptop.

## Regenerar los datos y el modelo

Los JSON del dashboard ya están generados y versionados en
`Dashboard/static/`, así que **no hace falta reentrenar nada para ver la
demo**. Si quieres regenerarlos (por ejemplo, para ampliar el período de
predicciones más allá de los ~9 días actuales):

```bash
pip install -r requirements.txt   # pandas, numpy, scikit-learn, tensorflow, matplotlib

python Code/modelo_consumo_multihorizonte.py   # entrena y exporta predicciones_multihorizonte.json
python Code/generar_alertas.py                 # exporta alertas_multihorizonte.json
python Code/generar_analitica_consumo.py       # exporta analitica_consumo.json
python Code/estimador_ahorro.py                # exporta estimacion_ahorro.json (usa las alertas)
```

Todas las rutas son relativas a la raíz del repositorio, así que estos
scripts corren en cualquier máquina sin editar nada. La única excepción es
`construir_dataset_ampds_no_clima.py`, que arma el CSV desde el dataset AMPds
crudo descargado con `kagglehub`; su ubicación se controla con la variable de
entorno `AMPDS_DIR`.

## Estructura del repositorio

```
Code/            scripts de datos, modelo y motor de alertas/hábitos
Dashboard/       sitio estático (HTML/CSS/JS) + Dashboard/static/*.json
Data Set/        dataset procesado (AMPds → consumo horario + costo)
Pred_vs_Real/    gráficas y modelo entrenado (.keras) de la última corrida
Dockerfile, docker-compose.yml, vercel.json   opciones de despliegue
```

## Stack

Python · Pandas · scikit-learn · TensorFlow/Keras (LSTM) · Chart.js · Docker · Nginx
