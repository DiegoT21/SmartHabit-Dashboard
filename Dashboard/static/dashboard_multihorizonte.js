let dataset = [];
let ahorro = null;
let analitica = null;
let alertas = null;

let chart = null;
let chart7d = null;
let chartTop5 = null;
let chartHora = null;

const PAGE_TITLES = {
    predicciones: "Predicciones multihorizonte",
    ahorro: "Estimación de ahorro",
    analitica: "Análisis avanzado",
    alertas: "Alertas inteligentes",
    datos: "Datos reales vs predicción"
};

const CHART_DEFAULTS = {
    color: "#94a3b8",
    borderColor: "rgba(148, 163, 184, 0.12)",
    font: { family: "'Inter', sans-serif", size: 11 }
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.borderColor = CHART_DEFAULTS.borderColor;
Chart.defaults.font = CHART_DEFAULTS.font;

function chartOptions(extra = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: {
                labels: {
                    color: "#cbd5e1",
                    usePointStyle: true,
                    padding: 16,
                    font: { size: 12, weight: "500" }
                }
            },
            tooltip: {
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                titleColor: "#f1f5f9",
                bodyColor: "#cbd5e1",
                borderColor: "rgba(16, 185, 129, 0.3)",
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8
            }
        },
        scales: {
            x: {
                grid: { color: "rgba(148, 163, 184, 0.06)" },
                ticks: { maxTicksLimit: 8, color: "#64748b" }
            },
            y: {
                grid: { color: "rgba(148, 163, 184, 0.06)" },
                ticks: { color: "#64748b" }
            }
        },
        ...extra
    };
}

function gradientFill(ctx, colorStart, colorEnd) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

// Navigation
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        const id = btn.dataset.section;
        document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        document.getElementById(id).classList.add("active");
        btn.classList.add("active");
        document.getElementById("pageTitle").textContent = PAGE_TITLES[id] || id;
    });
});

// Load data
Promise.all([
    fetch("static/predicciones_multihorizonte.json").then(r => r.json()),
    fetch("static/estimacion_ahorro.json").then(r => r.json()),
    fetch("static/analitica_consumo.json").then(r => r.json()),
    fetch("static/alertas_multihorizonte.json").then(r => r.json())
]).then(([pred, ahorroData, analiticaData, alertasData]) => {
    dataset = pred;
    ahorro = ahorroData;
    analitica = analiticaData;
    alertas = alertasData;
    actualizarDashboard();
    mostrarAhorro();
    mostrarAnalitica();
    mostrarAlertas();
}).catch(err => console.error("Error cargando datos:", err));

function mostrarAhorro() {
    if (!ahorro) return;

    const box = document.getElementById("kpiAhorroBox");
    box.innerHTML = "";

    box.innerHTML += `
        <div class="kpi kpi--savings kpi--savings-highlight">
            <div class="kpi-icon">✨</div>
            <div class="kpi-title">Ahorro real (10%)</div>
            <div class="kpi-value">$${ahorro.ahorro_actual_posible.ahorro_10pct_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Sobre consumo histórico total</div>
        </div>
    `;

    ahorro.ahorro_predicho_futuro.forEach(a => {
        box.innerHTML += `
            <div class="kpi kpi--savings">
                <div class="kpi-icon">⏱</div>
                <div class="kpi-title">Ahorro futuro ${a.horizonte_horas}h</div>
                <div class="kpi-value">$${a.ahorro_10pct_usd.toFixed(2)}</div>
                <div class="kpi-sub">Escenario 10% · Costo est. $${a.costo_estimado_usd.toFixed(2)}</div>
            </div>
        `;
    });
}

function mostrarAnalitica() {
    if (!analitica) return;

    document.getElementById("kpi_avg_energy").innerText =
        analitica.kpis.promedio_energia_diaria.toFixed(2) + " kWh";

    document.getElementById("kpi_peak_day").innerText =
        analitica.kpis.consumo_maximo_diario.toFixed(2) + " kWh";

    document.getElementById("kpi_expensive_day").innerText =
        analitica.kpis.dia_mas_costoso;

    graficarUltimos7Dias();
    graficarTop5();
    graficarPromedioPorHora();
}

function mostrarAlertas() {
    if (!alertas) return;

    const resumen = document.getElementById("alertasResumen");
    const lista = document.getElementById("alertasLista");

    resumen.textContent = `${alertas.total_alertas} alertas detectadas · Presupuesto mensual $${alertas.presupuesto_mensual_usd}`;

    const icons = { energia: "⚡", agua: "💧", costo: "💵" };

    lista.innerHTML = alertas.alertas.map(a => `
        <div class="alerta-card alerta-card--${a.severidad}">
            <div class="alerta-icon">${icons[a.variable] || "🔔"}</div>
            <div class="alerta-body">
                <h4>${a.mensaje}</h4>
                <p>${a.recomendacion}</p>
            </div>
            <div class="alerta-meta">
                <span class="alerta-severidad alerta-severidad--${a.severidad}">${a.severidad}</span>
                <div>${a.valor} ${a.unidad}</div>
                <div>+${a.porcentaje_sobre_umbral.toFixed(1)}% umbral</div>
            </div>
        </div>
    `).join("");
}

function graficarUltimos7Dias() {
    const ctx = document.getElementById("chart_combo");
    if (chart7d) chart7d.destroy();

    const g = ctx.getContext("2d");

    chart7d = new Chart(ctx, {
        type: "line",
        data: {
            labels: analitica.ultimos_7_dias.fechas,
            datasets: [
                {
                    label: "Energía (kWh)",
                    data: analitica.ultimos_7_dias.energia,
                    borderColor: "#34d399",
                    backgroundColor: gradientFill(g, "rgba(52, 211, 153, 0.2)", "rgba(52, 211, 153, 0)"),
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: "Agua (L)",
                    data: analitica.ultimos_7_dias.agua,
                    borderColor: "#22d3ee",
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: "Costo (USD)",
                    data: analitica.ultimos_7_dias.costo,
                    borderColor: "#fbbf24",
                    tension: 0.4,
                    pointRadius: 3
                }
            ]
        },
        options: chartOptions()
    });
}

function graficarTop5() {
    const ctx = document.getElementById("chart_top5");
    if (chartTop5) chartTop5.destroy();

    chartTop5 = new Chart(ctx, {
        type: "bar",
        data: {
            labels: analitica.top5_costosos.fechas,
            datasets: [{
                label: "Costo (USD)",
                data: analitica.top5_costosos.costos,
                backgroundColor: [
                    "rgba(251, 113, 133, 0.85)",
                    "rgba(251, 113, 133, 0.7)",
                    "rgba(251, 113, 133, 0.55)",
                    "rgba(251, 113, 133, 0.4)",
                    "rgba(251, 113, 133, 0.28)"
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: chartOptions({ plugins: { legend: { display: false } } })
    });
}

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
                    borderColor: "#34d399",
                    tension: 0.3,
                    pointRadius: 0
                },
                {
                    label: "Agua (L)",
                    data: analitica.promedio_hora.agua,
                    borderColor: "#22d3ee",
                    tension: 0.3,
                    pointRadius: 0
                },
                {
                    label: "Costo (USD)",
                    data: analitica.promedio_hora.costo,
                    borderColor: "#fbbf24",
                    tension: 0.3,
                    pointRadius: 0
                }
            ]
        },
        options: chartOptions()
    });
}

document.getElementById("horizonSelect").onchange = actualizarDashboard;
document.getElementById("variableSelect").onchange = actualizarDashboard;

function actualizarDashboard() {
    if (!dataset.length) return;

    const h = parseInt(document.getElementById("horizonSelect").value);
    const v = document.getElementById("variableSelect").value;
    const datos = dataset.filter(d => d.horizon === h);

    let realKey, predKey, unidad;

    if (v === "energia") { realKey = "energia_real_kwh"; predKey = "energia_pred_kwh"; unidad = "kWh"; }
    else if (v === "agua") { realKey = "agua_real_l"; predKey = "agua_pred_l"; unidad = "L"; }
    else { realKey = "costo_real_usd"; predKey = "costo_pred_usd"; unidad = "USD"; }

    const errores = datos.map(d => Math.abs(d[realKey] - d[predKey]));
    const mae = errores.reduce((a, b) => a + b, 0) / errores.length;

    const mape = datos.reduce((acc, d) =>
        acc + Math.abs((d[realKey] - d[predKey]) / (Math.abs(d[realKey]) + 1e-8)),
    0) / datos.length * 100;

    document.getElementById("kpi_mae").innerText = mae.toFixed(4) + " " + unidad;
    document.getElementById("kpi_mape").innerText = mape.toFixed(2) + "%";
    document.getElementById("kpi_points").innerText = datos.length.toLocaleString();
    document.getElementById("hero_mape").innerText = mape.toFixed(1) + "%";

    const tbody = document.getElementById("tablaDatos");
    tbody.innerHTML = datos.slice(0, 200).map(d => `
        <tr>
            <td>${d.timestamp_objetivo}</td>
            <td>${d[realKey].toFixed(3)} ${unidad}</td>
            <td>${d[predKey].toFixed(3)} ${unidad}</td>
            <td>${Math.abs(d[realKey] - d[predKey]).toFixed(3)} ${unidad}</td>
        </tr>
    `).join("");

    const labels = datos.map(d => d.timestamp_objetivo.slice(0, 16));
    const reales = datos.map(d => d[realKey]);
    const preds = datos.map(d => d[predKey]);

    if (chart) chart.destroy();

    const ctx = document.getElementById("chart");
    const g = ctx.getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Consumo real",
                    data: reales,
                    borderColor: "#34d399",
                    backgroundColor: gradientFill(g, "rgba(52, 211, 153, 0.18)", "rgba(52, 211, 153, 0)"),
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: "Predicción IA",
                    data: preds,
                    borderColor: "#22d3ee",
                    borderDash: [6, 4],
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },
        options: chartOptions({
            scales: {
                x: {
                    grid: { color: "rgba(148, 163, 184, 0.06)" },
                    ticks: { maxTicksLimit: 10, color: "#64748b", maxRotation: 0 }
                },
                y: {
                    grid: { color: "rgba(148, 163, 184, 0.06)" },
                    ticks: { color: "#64748b" }
                }
            }
        })
    });
}
