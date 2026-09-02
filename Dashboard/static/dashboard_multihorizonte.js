let dataset = [];
let ahorro = null;
let analitica = null;
let alertas = null;

let chart = null;
let chart7d = null;
let chartTop5 = null;
let chartHora = null;

const PAGE_TITLES = {
    vivo: "Simulación en vivo",
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

// Paleta de marca Samsung: azul primario + azul cielo secundario + ámbar/rosa funcionales
const PALETTE = {
    energia: "#4c6ef5",
    energiaFill: "rgba(76, 110, 245, 0.18)",
    agua: "#38bdf8",
    costo: "#fbbf24",
    critico: "#fb7185",
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
                borderColor: "rgba(76, 110, 245, 0.3)",
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
    fetch("static/alertas_multihorizonte.json").then(r => r.json()),
    fetch("static/serie_historica.json").then(r => r.json())
]).then(([pred, ahorroData, analiticaData, alertasData, serieData]) => {
    dataset = pred;
    ahorro = ahorroData;
    analitica = analiticaData;
    alertas = alertasData;
    actualizarDashboard();
    mostrarAhorro();
    mostrarAnalitica();
    mostrarAlertas();
    initLive(serieData);
}).catch(err => console.error("Error cargando datos:", err));

function mostrarAhorro() {
    if (!ahorro) return;

    const habito = ahorro.habito;
    const detectado = ahorro.ahorro_detectado;
    const scoreColor = habito.eco_score >= 80 ? PALETTE.energia : habito.eco_score >= 60 ? PALETTE.costo : PALETTE.critico;

    const habitoBox = document.getElementById("habitoBox");
    habitoBox.innerHTML = `
        <div class="eco-score-card">
            <div class="eco-score-ring" style="background: conic-gradient(${scoreColor} ${habito.eco_score * 3.6}deg, rgba(148,163,184,0.15) 0deg)">
                <div class="eco-score-inner">
                    <span class="eco-score-value">${habito.eco_score}</span>
                    <span class="eco-score-max">/100</span>
                </div>
            </div>
            <div class="eco-score-info">
                <div class="eco-score-label">EcoScore de hábitos</div>
                <div class="eco-score-tag" style="color:${scoreColor}">${habito.clasificacion}</div>
                <div class="eco-score-breakdown">
                    <span><span class="dot dot--critica"></span>${habito.n_alertas_criticas} críticas</span>
                    <span><span class="dot dot--moderada"></span>${habito.n_alertas_moderadas} moderadas</span>
                    <span><span class="dot dot--leve"></span>${habito.n_alertas_leves} leves</span>
                </div>
            </div>
        </div>
        <div class="kpi kpi--savings kpi--savings-highlight">
            <div class="kpi-icon"><svg class="icon"><use href="#i-trend-down"/></svg></div>
            <div class="kpi-title">Ahorro detectado por IA</div>
            <div class="kpi-value">$${detectado.proyeccion_mensual_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span class="kpi-value-unit">/mes</span></div>
            <div class="kpi-sub">${detectado.descripcion}</div>
        </div>
        <div class="kpi kpi--savings">
            <div class="kpi-icon"><svg class="icon"><use href="#i-zap"/></svg></div>
            <div class="kpi-title">Picos de consumo</div>
            <div class="kpi-value">$${detectado.picos_usd_periodo.toFixed(2)}</div>
            <div class="kpi-sub">Sobrecosto detectado en el período evaluado</div>
        </div>
        <div class="kpi kpi--savings">
            <div class="kpi-icon"><svg class="icon"><use href="#i-droplet"/></svg></div>
            <div class="kpi-title">Fugas nocturnas</div>
            <div class="kpi-value">$${detectado.fugas_usd_periodo.toFixed(2)}</div>
            <div class="kpi-sub">Agua desperdiciada fuera de horario habitual</div>
        </div>
    `;

    const box = document.getElementById("kpiAhorroBox");
    box.innerHTML = `
        <div class="kpi kpi--savings">
            <div class="kpi-icon"><svg class="icon"><use href="#i-bar-chart"/></svg></div>
            <div class="kpi-title">Escenario 10% de ahorro</div>
            <div class="kpi-value">$${ahorro.escenarios_ilustrativos.ahorro_10pct_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Si reduces 10% el consumo histórico total</div>
        </div>
    `;

    ahorro.ahorro_predicho_futuro.forEach(a => {
        box.innerHTML += `
            <div class="kpi kpi--savings">
                <div class="kpi-icon"><svg class="icon"><use href="#i-clock"/></svg></div>
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

    const icons = { energia: "i-zap", agua: "i-droplet", costo: "i-dollar" };

    lista.innerHTML = alertas.alertas.map(a => `
        <div class="alerta-card alerta-card--${a.severidad}">
            <div class="alerta-icon"><svg class="icon"><use href="#${icons[a.variable] || "i-bell"}"/></svg></div>
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
                    borderColor: PALETTE.energia,
                    backgroundColor: gradientFill(g, "rgba(76, 110, 245, 0.2)", "rgba(76, 110, 245, 0)"),
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: "Agua (L)",
                    data: analitica.ultimos_7_dias.agua,
                    borderColor: PALETTE.agua,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: "Costo (USD)",
                    data: analitica.ultimos_7_dias.costo,
                    borderColor: PALETTE.costo,
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
                    borderColor: PALETTE.energia,
                    tension: 0.3,
                    pointRadius: 0
                },
                {
                    label: "Agua (L)",
                    data: analitica.promedio_hora.agua,
                    borderColor: PALETTE.agua,
                    tension: 0.3,
                    pointRadius: 0
                },
                {
                    label: "Costo (USD)",
                    data: analitica.promedio_hora.costo,
                    borderColor: PALETTE.costo,
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
    const sumaAbsErrores = errores.reduce((a, b) => a + b, 0);
    const mae = sumaAbsErrores / errores.length;

    // WAPE en vez de MAPE clásico: agua tiene muchas horas en 0 L, y dividir
    // error/real hora a hora ahi dispara el MAPE a numeros absurdos. WAPE
    // (error total / consumo total) es el estandar para series con ceros.
    const sumaAbsReales = datos.reduce((acc, d) => acc + Math.abs(d[realKey]), 0);
    const wape = sumaAbsReales > 0 ? (sumaAbsErrores / sumaAbsReales) * 100 : 0;

    document.getElementById("kpi_mae").innerText = mae.toFixed(4) + " " + unidad;
    document.getElementById("kpi_mape").innerText = wape.toFixed(2) + "%";
    document.getElementById("kpi_points").innerText = datos.length.toLocaleString();
    document.getElementById("hero_mape").innerText = wape.toFixed(1) + "%";

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
                    borderColor: PALETTE.energia,
                    backgroundColor: gradientFill(g, PALETTE.energiaFill, "rgba(76, 110, 245, 0)"),
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: "Predicción IA",
                    data: preds,
                    borderColor: PALETTE.agua,
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

// ================================
// SIMULACION EN VIVO
// ================================
let serieHistorica = [];
let simIndex = 0;
let simPlaying = false;
let simTimer = null;
let simThresholds = { energia: [], agua: [] };
let liveChart = null;
const SIM_WINDOW = 72;

function percentil(valores, p) {
    const arr = [...valores].sort((a, b) => a - b);
    const idx = (arr.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return arr[lo];
    return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}

function construirUmbralesPorHora(serie) {
    const porHora = Array.from({ length: 24 }, () => ({ energia: [], agua: [] }));
    serie.forEach(([ts, e, a]) => {
        const h = new Date(ts).getHours();
        porHora[h].energia.push(e);
        porHora[h].agua.push(a);
    });
    return {
        energia: porHora.map(h => percentil(h.energia, 0.95)),
        agua: porHora.map(h => percentil(h.agua, 0.95))
    };
}

function initLive(serie) {
    serieHistorica = serie;
    if (!serieHistorica.length) return;

    simThresholds = construirUmbralesPorHora(serieHistorica);

    const slider = document.getElementById("simSlider");
    slider.max = serieHistorica.length - 1;
    slider.value = 0;
    slider.addEventListener("input", () => {
        pausarSim();
        simIndex = parseInt(slider.value, 10);
        renderFrame(simIndex, false);
    });

    document.getElementById("btnPlayPause").addEventListener("click", toggleSim);
    document.getElementById("btnReset").addEventListener("click", reiniciarSim);
    document.getElementById("simSpeed").addEventListener("change", () => {
        if (simPlaying) { pausarSim(); reproducirSim(); }
    });

    crearGraficoLive();
    renderFrame(simIndex, false);
}

function crearGraficoLive() {
    const ctx = document.getElementById("chart_live");
    const g = ctx.getContext("2d");
    liveChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Energía (kWh)",
                data: [],
                borderColor: PALETTE.energia,
                backgroundColor: gradientFill(g, PALETTE.energiaFill, "rgba(76, 110, 245, 0)"),
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: chartOptions({
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: "rgba(148, 163, 184, 0.06)" },
                    ticks: { maxTicksLimit: 6, color: "#64748b", maxRotation: 0 }
                },
                y: {
                    grid: { color: "rgba(148, 163, 184, 0.06)" },
                    ticks: { color: "#64748b" }
                }
            }
        })
    });
}

function toggleSim() {
    if (simPlaying) pausarSim(); else reproducirSim();
}

function reproducirSim() {
    if (simIndex >= serieHistorica.length - 1) simIndex = 0;
    simPlaying = true;
    actualizarBotonPlay();
    const speed = parseInt(document.getElementById("simSpeed").value, 10);
    simTimer = setInterval(avanzarSim, speed);
}

function pausarSim() {
    simPlaying = false;
    actualizarBotonPlay();
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
}

function reiniciarSim() {
    pausarSim();
    simIndex = 0;
    document.getElementById("liveEventos").innerHTML =
        '<p class="live-events-empty">Inicia la simulación para ver eventos en vivo.</p>';
    liveChart.data.labels = [];
    liveChart.data.datasets[0].data = [];
    liveChart.update("none");
    renderFrame(simIndex, false);
}

function actualizarBotonPlay() {
    document.getElementById("iconPlayPause").setAttribute("href", simPlaying ? "#i-pause" : "#i-play");
    document.getElementById("btnPlayPauseLabel").textContent = simPlaying ? "Pausar" : "Reproducir";
    document.getElementById("liveBadgeText").textContent = simPlaying ? "En vivo" : "Pausado";
    document.getElementById("liveBadge").classList.toggle("live-badge--on", simPlaying);
}

function avanzarSim() {
    simIndex++;
    if (simIndex >= serieHistorica.length) {
        simIndex = 0;
    }
    renderFrame(simIndex, true);
}

function calcularAcumuladoDelDia(idx) {
    const diaKey = serieHistorica[idx][0].slice(0, 10);
    let energia = 0, agua = 0, costo = 0;
    let i = idx;
    while (i >= 0 && serieHistorica[i][0].slice(0, 10) === diaKey) {
        energia += serieHistorica[i][1];
        agua += serieHistorica[i][2];
        costo += serieHistorica[i][3];
        i--;
    }
    return { energia, agua, costo };
}

function renderFrame(idx, esAvance) {
    const [ts, energia, agua] = serieHistorica[idx];
    const fecha = new Date(ts);
    const acumulado = calcularAcumuladoDelDia(idx);

    document.getElementById("simSlider").value = idx;
    document.getElementById("simFecha").textContent = formatearFechaSim(fecha);
    document.getElementById("simDia").textContent =
        `Día ${Math.floor(idx / 24) + 1} de ${Math.ceil(serieHistorica.length / 24)}`;

    setLiveValue("live_energia", energia.toFixed(3));
    setLiveValue("live_agua", agua.toFixed(2));
    setLiveValue("live_costo", acumulado.costo.toFixed(2));

    actualizarGraficoLive(idx);

    if (esAvance) {
        detectarEventoEnVivo(energia, agua, fecha);
    }
}

function setLiveValue(id, text) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
}

function formatearFechaSim(fecha) {
    return fecha.toLocaleString("es-ES", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
}

function actualizarGraficoLive(idx) {
    const start = Math.max(0, idx - SIM_WINDOW + 1);
    const slice = serieHistorica.slice(start, idx + 1);
    liveChart.data.labels = slice.map(r => r[0].slice(5, 16).replace("T", " "));
    liveChart.data.datasets[0].data = slice.map(r => r[1]);
    liveChart.update("none");
}

function detectarEventoEnVivo(energia, agua, fecha) {
    const hora = fecha.getHours();
    const umbralEnergia = simThresholds.energia[hora] * 1.15;
    const umbralAgua = simThresholds.agua[hora] * 1.15;

    if (umbralEnergia > 0 && energia > umbralEnergia) {
        const pct = ((energia / umbralEnergia - 1) * 100).toFixed(0);
        agregarEventoLive("i-zap", `Pico de energía: ${energia.toFixed(2)} kWh a las ${hora}:00 (+${pct}% sobre lo habitual)`);
    } else if (umbralAgua > 0.05 && agua > umbralAgua) {
        const pct = ((agua / umbralAgua - 1) * 100).toFixed(0);
        agregarEventoLive("i-droplet", `Pico de agua: ${agua.toFixed(1)} L a las ${hora}:00 (+${pct}% sobre lo habitual)`);
    }
}

function agregarEventoLive(icono, texto) {
    const cont = document.getElementById("liveEventos");
    const vacio = cont.querySelector(".live-events-empty");
    if (vacio) vacio.remove();

    const item = document.createElement("div");
    item.className = "live-event";
    item.innerHTML = `<svg class="icon"><use href="#${icono}"/></svg><span>${texto}</span>`;
    cont.prepend(item);

    while (cont.children.length > 6) {
        cont.removeChild(cont.lastChild);
    }
}
