/*
 * Simulador de renda — modelo do Estudo de Viabilidade Charlie (jul/2026).
 * Reproduz exatamente as DREs e matrizes de sensibilidade do estudo:
 *   receita short stay = diária × 30 × ocupação × share diária
 *   receita mensal     = diária × 30 × (1 − desconto long×short) × 98% × share mensal
 *   gestão Charlie     = 18% da receita short + 15% da receita mensal
 *   comissões OTAs     = 14% da receita short + 5% da receita mensal
 *   condomínio R$14/m², IPTU R$4/m², internet R$120, despesas bancárias 0,25%,
 *   manutenção preventiva 1% da receita bruta, taxa de manutenção e utilidades fixas.
 */
(function (root) {
  "use strict";

  var TIPOS = {
    studio: { nome: "Studio 33 m²", torre: "Ed. Polinésia", area: 33, diaria: 415, ocup: 72.5, shareD: 0.8, shareM: 0.2, desconto: 0.4, taxaManut: 235, utilidades: 200, dMin: 355, dMax: 475, oMin: 62.5, oMax: 82.5 },
    q1:     { nome: "1 quarto 39 m²", torre: "Ed. Caribe", area: 39, diaria: 460, ocup: 72.5, shareD: 0.8, shareM: 0.2, desconto: 0.4, taxaManut: 285, utilidades: 250, dMin: 400, dMax: 520, oMin: 62.5, oMax: 82.5 },
    q2:     { nome: "2 quartos 59 m²", torre: "Ed. Fiji", area: 59, diaria: 580, ocup: 70, shareD: 0.75, shareM: 0.25, desconto: 0.4, taxaManut: 335, utilidades: 300, dMin: 520, dMax: 640, oMin: 60, oMax: 80 },
    gs:     { nome: "Garden studio 52 m²", torre: "Gardens", area: 52, diaria: 460, ocup: 75, shareD: 0.9, shareM: 0.1, desconto: 0.4, taxaManut: 235, utilidades: 250, dMin: 400, dMax: 520, oMin: 65, oMax: 85 },
    g1:     { nome: "Garden 1Q 53 m²", torre: "Gardens", area: 53, diaria: 490, ocup: 75, shareD: 0.9, shareM: 0.1, desconto: 0.4, taxaManut: 285, utilidades: 250, dMin: 430, dMax: 550, oMin: 65, oMax: 85 },
    g2:     { nome: "Garden 2Q 88 m²", torre: "Gardens", area: 88, diaria: 650, ocup: 75, shareD: 0.9, shareM: 0.1, desconto: 0.3, taxaManut: 335, utilidades: 300, dMin: 590, dMax: 710, oMin: 65, oMax: 85 }
  };

  function calcular(t, diaria, ocupPct) {
    var occ = ocupPct / 100;
    var short = diaria * 30 * occ * t.shareD;
    var mensal = diaria * 30 * (1 - t.desconto) * 0.98 * t.shareM;
    var bruta = short + mensal;
    var custos = [
      ["Gestão Charlie (18% short · 15% mensal)", short * 0.18 + mensal * 0.15],
      ["Comissão das plataformas de reserva", short * 0.14 + mensal * 0.05],
      ["Condomínio", t.area * 14],
      ["IPTU", t.area * 4],
      ["Taxa de manutenção", t.taxaManut],
      ["Utilidades públicas (água, luz, gás)", t.utilidades],
      ["Internet / TV", 120],
      ["Manutenção preventiva", bruta * 0.01],
      ["Despesas bancárias", bruta * 0.0025]
    ];
    var totalCustos = custos.reduce(function (s, c) { return s + c[1]; }, 0);
    return { short: short, mensal: mensal, bruta: bruta, custos: custos, totalCustos: totalCustos, liquida: bruta - totalCustos };
  }

  var api = { TIPOS: TIPOS, calcular: calcular };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ONRESORT_SIM = api;
  if (typeof document === "undefined") return;

  /* ---------- UI ---------- */
  var box = document.getElementById("simulador");
  if (!box) return;
  var $ = function (s) { return box.querySelector(s); };
  var brl = function (v) { return "R$ " + Math.round(v).toLocaleString("pt-BR"); };
  var pct = function (v, d) { return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%"; };

  var state = { tipo: "studio", diaria: TIPOS.studio.diaria, ocup: TIPOS.studio.ocup };
  var rD = $("#simDiaria"), rO = $("#simOcup"), inV = $("#simValor");

  function setTipo(id, keepScroll) {
    var t = TIPOS[id];
    state.tipo = id; state.diaria = t.diaria; state.ocup = t.ocup;
    rD.min = t.dMin; rD.max = t.dMax; rD.step = 5; rD.value = t.diaria;
    rO.min = t.oMin; rO.max = t.oMax; rO.step = 2.5; rO.value = t.ocup;
    Array.prototype.forEach.call(box.querySelectorAll("[data-tipo]"), function (b) {
      var on = b.getAttribute("data-tipo") === id;
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-sim-row]"), function (r) {
      r.classList.toggle("is-active", r.getAttribute("data-sim-row") === id);
    });
    render();
  }

  function render() {
    var t = TIPOS[state.tipo];
    var r = calcular(t, state.diaria, state.ocup);
    [rD, rO].forEach(function (r) { r.style.setProperty("--fill", ((r.value - r.min) / (r.max - r.min) * 100) + "%"); });
    $("#outDiaria").textContent = brl(state.diaria);
    $("#outOcup").textContent = pct(state.ocup, 1);
    $("#outTipo").textContent = t.nome + " · " + t.torre;
    $("#outLiquida").textContent = brl(r.liquida);
    $("#outAnual").textContent = brl(r.liquida * 12);
    $("#outBruta").textContent = brl(r.bruta);
    var base = state.diaria === t.diaria && state.ocup === t.ocup;
    $("#outCenario").textContent = base ? "Cenário base do estudo" : "Cenário simulado";

    var pLiq = Math.max(0, r.liquida / r.bruta * 100);
    $("#barLiq").style.width = pLiq + "%";
    $("#barCus").style.width = (100 - pLiq) + "%";
    $("#lblLiq").textContent = brl(r.liquida) + " (" + pct(pLiq, 0) + ")";
    $("#lblCus").textContent = brl(r.totalCustos) + " (" + pct(100 - pLiq, 0) + ")";
    $("#barLiq").title = "Renda líquida: " + brl(r.liquida);
    $("#barCus").title = "Custos e taxas: " + brl(r.totalCustos);

    var rows = '<tr><th scope="row">Receita de curta temporada</th><td>' + brl(r.short) + "</td></tr>" +
      '<tr><th scope="row">Receita de locação mensal</th><td>' + brl(r.mensal) + "</td></tr>" +
      '<tr class="is-total"><th scope="row">Receita bruta</th><td>' + brl(r.bruta) + "</td></tr>";
    r.custos.forEach(function (c) { rows += '<tr><th scope="row">(−) ' + c[0] + "</th><td>(" + brl(c[1]).replace("R$ ", "") + ")</td></tr>"; });
    rows += '<tr class="is-total is-net"><th scope="row">Renda líquida mensal</th><td>' + brl(r.liquida) + "</td></tr>";
    $("#simDre").innerHTML = rows;

    var valor = parseFloat((inV.value || "").replace(/\D/g, "")) || 0;
    var yEl = $("#outYield");
    if (valor >= 50000) {
      var aa = r.liquida * 12 / valor * 100;
      yEl.innerHTML = "<b>" + pct(aa, 1) + " ao ano</b> · " + pct(aa / 12, 2) + " ao mês sobre o valor informado";
      yEl.classList.add("is-on");
    } else {
      yEl.textContent = "Informe o valor do imóvel para ver o retorno anual estimado.";
      yEl.classList.remove("is-on");
    }
    var cta = $("#simCta");
    if (cta) cta.setAttribute("data-interesse", t.nome);
  }

  Array.prototype.forEach.call(box.querySelectorAll("[data-tipo]"), function (b) {
    b.addEventListener("click", function () { setTipo(b.getAttribute("data-tipo")); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-sim-row]"), function (r) {
    r.addEventListener("click", function () {
      setTipo(r.getAttribute("data-sim-row"));
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  rD.addEventListener("input", function () { state.diaria = +rD.value; render(); });
  rO.addEventListener("input", function () { state.ocup = +rO.value; render(); });
  inV.addEventListener("input", function () {
    var n = inV.value.replace(/\D/g, "").slice(0, 10);
    inV.value = n ? "R$ " + (+n).toLocaleString("pt-BR") : "";
    render();
  });
  $("#simReset").addEventListener("click", function () { setTipo(state.tipo); });
  var cta = $("#simCta");
  if (cta) cta.addEventListener("click", function () {
    var sel = document.querySelector('#formFooter select[name="interesse"]');
    var map = { studio: "Studio 32m²", q1: "Studio ou 1Q 39m²", q2: "2 quartos 60m²", gs: "Garden", g1: "Garden", g2: "Garden" };
    if (sel) sel.value = map[state.tipo];
    var inv = document.querySelector('#formFooter input[name="objetivo"][value="Investir"]');
    if (inv) inv.checked = true;
  });

  setTipo("studio");
})(typeof window !== "undefined" ? window : this);
