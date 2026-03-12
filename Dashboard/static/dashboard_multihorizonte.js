let dataset = [];
let ahorro = null;
let analitica = null;

let chart = null;
let chart7d = null;
let chartTop5 = null;
let chartHora = null;


// ======================================================
// 1) Cargar predicciones del modelo
// ======================================================
fetch("static/predicciones_multihorizonte.json")
    .then(r => r.json())
    .then(data => {
        dataset = data;
        actualizarDashboard();
    });


// ======================================================
// 2) Cargar estimación de ahorro
// ======================================================
fetch("static/estimacion_ahorro.json")
    .then(r => r.json())
    .then(data => {
        ahorro = data;
        mostrarAhorro();
    });


// ======================================================
// 3) Cargar analítica avanzada
// ======================================================
fetch("static/analitica_consumo.json")
    .then(r => r.json())
    .then(data => {
        analitica = data;
        mostrarAnalitica();
    });

let alertas_data = null;

// ======================================================
// 4) Cargar alertas
// ======================================================
fetch("static/alertas_multihorizonte.json")
    .then(r => r.json())
    .then(data => {
        alertas_data = data;
        mostrarAlertas();
    });

function mostrarAlertas() {
    const container = document.getElementById("alertasLista");
    if (!container) return;
    container.innerHTML = "";

    if (!alertas_data || !alertas_data.alertas || alertas_data.alertas.length === 0) {
        container.innerHTML = "<p style='padding:20px; text-align:center; color:#e6e6e6; font-size: 1.1em;'>No hay alertas activas en este momento.</p>";
        return;
    }

    alertas_data.alertas.forEach(a => {
        let borderColor = "#D4AF37"; // gold
        let icon = '<svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor" style="display:inline-block;vertical-align:-0.125em"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7.1-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>';

        if (a.severidad === "alta") {
            borderColor = "#d32f2f"; // red
            icon = '<svg width="16" height="16" viewBox="0 0 448 512" fill="currentColor" style="display:inline-block;vertical-align:-0.125em"><path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"/></svg>';
        } else if (a.severidad === "moderada") {
            borderColor = "#f57c00"; // orange
            icon = '<svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor" style="display:inline-block;vertical-align:-0.125em"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7.1-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>';
        } else {
            borderColor = "#0288d1"; // blue
            icon = '<svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor" style="display:inline-block;vertical-align:-0.125em"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>';
        }

        container.innerHTML += `
            <div style="background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 5px solid ${borderColor}; padding: 18px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
                <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 8px; color: ${borderColor};">${icon} ${a.mensaje}</div>
                <div style="font-size: 0.9em; margin-bottom: 8px;">
                    <strong>Variable:</strong> <span style="text-transform: capitalize;">${a.variable}</span> | 
                    <strong>Severidad:</strong> <span style="text-transform: capitalize;">${a.severidad}</span>
                </div>
                <div style="font-size: 0.9em; color: #ccc;"><em>Recomendación:</em> ${a.recomendacion}</div>
                <div style="font-size: 0.8em; color: #888; margin-top: 10px; text-align: right;">Reportado el: ${a.timestamp}</div>
            </div>
        `;
    });
}

// ===================================================================
// A) MOSTRAR AHORRO
// ===================================================================
function mostrarAhorro() {
    if (!ahorro) return;

    const box = document.getElementById("kpiAhorroBox");
    if (!box) return;
    box.innerHTML = "";

    box.innerHTML += `
        <div class="kpi">
            <div class="kpi-title">Ahorro Real (10%)</div>
            <div class="kpi-value">$${ahorro.ahorro_actual_posible.ahorro_10pct_usd}</div>
        </div>
    `;

    ahorro.ahorro_predicho_futuro.forEach(a => {
        box.innerHTML += `
            <div class="kpi">
                <div class="kpi-title">Ahorro Futuro ${a.horizonte_horas}h</div>
                <div class="kpi-value">$${a.ahorro_10pct_usd}</div>
            </div>
        `;
    });
}



// ===================================================================
// B) MOSTRAR KPIs + GRAFICAS AVANZADAS
// ===================================================================
function mostrarAnalitica() {
    if (!analitica) return;

    // KPIs avanzados
    document.getElementById("kpi_avg_energy").innerText =
        analitica.kpis.promedio_energia_diaria.toFixed(2) + " kWh";

    document.getElementById("kpi_peak_day").innerText =
        analitica.kpis.consumo_maximo_diario.toFixed(2) + " kWh";

    document.getElementById("kpi_expensive_day").innerText =
        analitica.kpis.dia_mas_costoso;


    // GRÁFICAS
    graficarUltimos7Dias();
    graficarTop5();
    graficarPromedioPorHora();
}



// ===================================================================
// C) GRÁFICA — Últimos 7 días
// ===================================================================
function graficarUltimos7Dias() {
    const ctx = document.getElementById("chart_combo");

    if (chart7d) chart7d.destroy();

    chart7d = new Chart(ctx, {
        type: "line",
        data: {
            labels: analitica.ultimos_7_dias.fechas,
            datasets: [
                {
                    label: "Energía (kWh)",
                    data: analitica.ultimos_7_dias.energia,
                    borderColor: "#1976d2",
                    tension: 0.3
                },
                {
                    label: "Agua (L)",
                    data: analitica.ultimos_7_dias.agua,
                    borderColor: "#2e7d32",
                    tension: 0.3
                },
                {
                    label: "Costo (USD)",
                    data: analitica.ultimos_7_dias.costo,
                    borderColor: "#f57c00",
                    tension: 0.3
                }
            ]
        },
        options: {
            maintainAspectRatio: false
        }
    });
}



// ===================================================================
// D) GRÁFICA — Top 5 días costosos
// ===================================================================
function graficarTop5() {
    const ctx = document.getElementById("chart_top5");

    if (chartTop5) chartTop5.destroy();

    chartTop5 = new Chart(ctx, {
        type: "bar",
        data: {
            labels: analitica.top5_costosos.fechas,
            datasets: [
                {
                    label: "Costo (USD)",
                    data: analitica.top5_costosos.costos,
                    backgroundColor: "#d32f2f"
                }
            ]
        },
        options: {
            maintainAspectRatio: false
        }
    });
}



// ===================================================================
// E) GRÁFICA — Promedio por hora del día
// ===================================================================
function graficarPromedioPorHora() {
    const ctx = document.getElementById("chart_hourly");

    if (chartHora) chartHora.destroy();

    chartHora = new Chart(ctx, {
        type: "line",
        data: {
            labels: analitica.promedio_hora.hora,
            datasets: [
                {
                    label: "Energía (kWh)",
                    data: analitica.promedio_hora.energia,
                    borderColor: "#0288d1",
                    tension: 0.2
                },
                {
                    label: "Agua (L)",
                    data: analitica.promedio_hora.agua,
                    borderColor: "#43a047",
                    tension: 0.2
                },
                {
                    label: "Costo (USD)",
                    data: analitica.promedio_hora.costo,
                    borderColor: "#ef6c00",
                    tension: 0.2
                }
            ]
        },
        options: {
            maintainAspectRatio: false
        }
    });
}



// ===================================================================
// F) DASHBOARD ORIGINAL — Predicciones Multihorizonte
// ===================================================================
document.getElementById("horizonSelect").onchange = actualizarDashboard;
document.getElementById("variableSelect").onchange = actualizarDashboard;


function actualizarDashboard() {
    const h = parseInt(document.getElementById("horizonSelect").value);
    const v = document.getElementById("variableSelect").value;

    const datos = dataset.filter(d => d.horizon === h);

    let realKey, predKey, unidad;

    if (v === "energia") { realKey = "energia_real_kwh"; predKey = "energia_pred_kwh"; unidad = "kWh"; }
    else if (v === "agua") { realKey = "agua_real_l"; predKey = "agua_pred_l"; unidad = "Litros"; }
    else { realKey = "costo_real_usd"; predKey = "costo_pred_usd"; unidad = "USD"; }

    // ============================
    // Cálculo métricas
    // ============================
    const errores = datos.map(d => Math.abs(d[realKey] - d[predKey]));
    const mae = errores.reduce((a, b) => a + b, 0) / errores.length;

    // El MAPE (Mean Absolute Percentage Error) explota cuando el valor real es casi 0 (muy normal en el agua).
    // Filtramos los valores cercanos a 0 para que no distorsionen astronómicamente el porcentaje.
    let valid_mape_count = 0;
    const mape_sum = datos.reduce((acc, d) => {
        const real = Math.abs(d[realKey]);
        const pred = d[predKey];

        // Solo calculamos MAPE si el consumo real es mayor a 0.05 (para evitar divisiones entre cuasi cero)
        if (real > 0.05) {
            valid_mape_count++;
            return acc + Math.abs((real - pred) / real);
        } else if (pred > 0.1) {
            // Si el real es cero pero predijo bastante, es 100% de error para esa medida
            valid_mape_count++;
            return acc + 1.0;
        }
        return acc;
    }, 0);

    const mape = valid_mape_count > 0 ? (mape_sum / valid_mape_count) * 100 : 0;

    document.getElementById("kpi_mae").innerText = mae.toFixed(4) + " " + unidad;
    document.getElementById("kpi_mape").innerText = mape.toFixed(2) + " %";
    document.getElementById("kpi_points").innerText = datos.length;

    // ============================
    // TABLA
    // ============================
    const tbody = document.getElementById("tablaDatos");
    tbody.innerHTML = "";

    datos.slice(0, 200).forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td>${d.timestamp_objetivo}</td>
                <td>${d[realKey].toFixed(3)} ${unidad}</td>
                <td>${d[predKey].toFixed(3)} ${unidad}</td>
                <td>${Math.abs(d[realKey] - d[predKey]).toFixed(3)} ${unidad}</td>
            </tr>`;
    });

    // ============================
    // GRÁFICO PRINCIPAL
    // ============================
    const labels = datos.map(d => d.timestamp_objetivo);
    const reales = datos.map(d => d[realKey]);
    const preds = datos.map(d => d[predKey]);

    if (chart) chart.destroy();

    chart = new Chart(document.getElementById("chart"), {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Real", data: reales, borderColor: "#2e7d32", tension: 0.2 },
                { label: "Predicción", data: preds, borderColor: "#1565c0", tension: 0.2 }
            ]
        }
    });
}

