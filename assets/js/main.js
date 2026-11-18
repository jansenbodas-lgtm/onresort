(function () {
  "use strict";
  var CFG = window.ONRESORT_CONFIG || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Config no DOM ---------- */
  $$("[data-config]").forEach(function (el) {
    var v = CFG[el.getAttribute("data-config")];
    if (v) el.textContent = v;
  });
  var waLink = function (msg) {
    return "https://wa.me/" + (CFG.whatsapp || "") + "?text=" + encodeURIComponent(msg || CFG.mensagemWhatsApp || "");
  };
  /* ---------- Origem padronizada: seção + botão ----------
   * Toda mensagem de WhatsApp segue o mesmo formato, para o corretor saber
   * de onde o lead veio. O mesmo rótulo é gravado no CRM (campo origem).   */
  var SECOES = { hero: "Topo", oportunidade: "Oportunidade", investir: "Por que investir", lazer: "Lazer",
    servicos: "Serviços", plantas: "Plantas", bairro: "Cidade Jardim", localizacao: "Localização", contato: "Contato" };
  function secaoDe(el) {
    if (el.closest(".fab-cta")) return "Botão flutuante do WhatsApp";
    if (el.closest(".mobile-bar")) return "Barra fixa do celular";
    if (el.closest(".footer")) return "Rodapé";
    if (el.closest(".header")) return "Menu do topo";
    var sec = el.closest("section");
    var nome = sec ? (SECOES[sec.id] || (sec.classList.contains("hero") ? "Topo" : sec.id || "Página")) : "Página";
    var plan = el.closest(".plan");
    if (plan && plan.querySelector("h3")) nome += " · " + plan.querySelector("h3").textContent.trim();
    return nome;
  }
  function textoBotao(el) { return ((el.textContent || "").trim() || el.getAttribute("aria-label") || "WhatsApp").replace(/\s+/g, " "); }
  function origemDe(el) {
    var sec = secaoDe(el), txt = textoBotao(el);
    return /Botão flutuante|Barra fixa|Rodapé/.test(sec) ? sec : sec + " · botão “" + txt + "”";
  }
  // Transforma o texto do botão no que o lead quer: "Liberar o estudo completo" -> "liberar o estudo completo"
  var ACOES_ESPECIAIS = {
    "quero garantir a minha": "garantir a minha unidade",
    "quero receber agora": "receber a tabela e o estudo completo",
    "tabela de lançamento": "a tabela de lançamento",
    "falar no whatsapp": "falar com o corretor",
    "whatsapp": "falar com o corretor"
  };
  function acaoDe(el) {
    if (el.closest(".fab-cta") || el.closest(".footer")) return "falar com o corretor";
    var txt = textoBotao(el), chave = txt.toLowerCase();
    if (chave === "ver estudo") {
      var plan = el.closest(".plan");
      var nomes = { studio: "do studio", caribe: "do studio ou 1 quarto", fiji: "do 2 quartos", gardens: "dos gardens" };
      return "ver o estudo de rentabilidade" + (plan && nomes[plan.getAttribute("data-panel")] ? " " + nomes[plan.getAttribute("data-panel")] : "");
    }
    if (ACOES_ESPECIAIS[chave]) return ACOES_ESPECIAIS[chave];
    var acao = txt.replace(/^quero\s+/i, "");
    return acao.charAt(0).toLowerCase() + acao.slice(1);
  }
  // Mensagem padrão: "Olá, meu nome é Fulano, telefone X, e-mail Y, e quero <ação do botão>."
  // Mensagem que chega no WhatsApp do corretor (igual para todos os botões).
  // A origem detalhada (seção e botão) continua sendo gravada no CRM.
  var MENSAGEM_WHATSAPP = "Olá, quero falar sobre o ON Resort.";
  function mensagemPadrao() { return MENSAGEM_WHATSAPP; }
  // último botão clicado que leva ao formulário de contato (para saber de onde veio)
  var ultimoCta = null;
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#contato"]');
    if (a) ultimoCta = { origem: origemDe(a), acao: acaoDe(a) };
  });

  // Os links de WhatsApp abrem o popup de captura; o href fica como fallback sem JS
  $$("[data-fala]").forEach(function (a) {
    // sem link wa.me no HTML (filtros de bloqueadores escondem esses links); o WhatsApp abre via JS
    a.href = "#contato";
    a.removeAttribute("target");
    a.addEventListener("click", function (e) {
      e.preventDefault();
      track("whatsapp_click", { origem: origemDe(a) });
      openWaModal(origemDe(a), textoBotao(a), acaoDe(a));
    });
  });
  $$("[data-creci-line]").forEach(function (el) { el.hidden = !CFG.creci; });
  var ano = $("#ano"); if (ano) ano.textContent = new Date().getFullYear();

  function track(event, data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, data || {}));
  }
  // Meta: identificadores do navegador e evento Lead com o mesmo event_id do servidor (deduplicação)
  function cookie(n) { var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
  function metaIds() {
    var fbc = cookie("_fbc"), fbclid = new URLSearchParams(location.search).get("fbclid");
    if (!fbc && fbclid) fbc = "fb.1." + Date.now() + "." + fbclid;
    return { fbp: cookie("_fbp"), fbc: fbc, event_id: "lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10) };
  }
  function pixelLead(lead) {
    if (typeof window.fbq !== "function") return;
    var data = { content_name: "ON Resort Cidade Jardim", content_category: "Imóvel - lançamento" };
    if (lead.interesse) data.interesse = lead.interesse;
    if (lead.objetivo) data.objetivo = lead.objetivo;
    window.fbq("track", "Lead", data, { eventID: lead.event_id });
  }
  // Google Ads: conversão de lead com dados otimizados (o Google aplica hash antes de enviar)
  function googleLead(lead) {
    if (typeof window.gtag !== "function") return;
    var d = String(lead.telefone || "").replace(/\D/g, ""); if (d.length === 10 || d.length === 11) d = "55" + d;
    var partes = String(lead.nome || "").trim().split(/\s+/);
    var ud = { address: { country: "BR" } };
    if (lead.email) ud.email = lead.email.trim().toLowerCase();
    if (d) ud.phone_number = "+" + d;
    if (partes[0]) ud.address.first_name = partes[0];
    if (partes.length > 1) ud.address.last_name = partes[partes.length - 1];
    window.gtag("set", "user_data", ud);
    window.gtag("event", "generate_lead", { send_to: CFG.googleAdsId, lead_origem: lead.origem, interesse: lead.interesse || undefined });
    if (CFG.googleAdsId && CFG.googleAdsLeadLabel) {
      window.gtag("event", "conversion", { send_to: CFG.googleAdsId + "/" + CFG.googleAdsLeadLabel, transaction_id: lead.event_id });
      teste("Conversão de lead disparada: " + CFG.googleAdsId + "/" + CFG.googleAdsLeadLabel, "wait");
    } else {
      teste("Rótulo da conversão não configurado (googleAdsLeadLabel)", "erro");
    }
  }

  /* ---------- Modo de teste: abra o site com ?teste=1 ----------
   * Mostra um painel com o status da tag do Google e da conversão de lead.
   * Leads enviados neste modo entram no CRM marcados como [TESTE].        */
  var MODO_TESTE = /(?:^|[?&])teste=1(?:&|$)/.test(location.search);
  var painel = null;
  function teste(msg, tipo) {
    if (!MODO_TESTE) return;
    if (!painel) {
      painel = document.createElement("div");
      painel.setAttribute("style", "position:fixed;left:12px;top:12px;z-index:9999;width:min(380px,calc(100vw - 24px));max-height:60vh;overflow:auto;background:#111;color:#fff;font:13px/1.45 system-ui,sans-serif;border-radius:12px;padding:12px 14px;box-shadow:0 10px 40px rgba(0,0,0,.4)");
      painel.innerHTML = '<b style="font-size:14px">Modo de teste · Google Ads</b><ul style="list-style:none;margin:8px 0 0;padding:0" id="testeLog"></ul>';
      document.body.appendChild(painel);
    }
    var cor = { ok: "#4ade80", erro: "#f87171", wait: "#fbbf24", info: "#93c5fd" }[tipo || "info"];
    var icone = { ok: "✓", erro: "✗", wait: "…", info: "•" }[tipo || "info"];
    var li = document.createElement("li");
    li.style.cssText = "padding:4px 0;border-top:1px solid #333;color:" + cor;
    li.textContent = icone + " " + new Date().toLocaleTimeString("pt-BR") + " · " + msg;
    painel.querySelector("#testeLog").appendChild(li);
  }
  if (MODO_TESTE) {
    window.addEventListener("load", function () {
      teste("Tag configurada: " + CFG.googleAdsId + " · rótulo: " + (CFG.googleAdsLeadLabel || "(vazio)"), "info");
      setTimeout(function () {
        var carregou = !!(window.google_tag_manager || window.google_tag_data || [].some.call(document.scripts, function (s) { return /gtag\/js|gtm\.js/.test(s.src) && performance.getEntriesByName(s.src).length; }));
        teste(carregou ? "Tag do Google carregada" : "Tag do Google NÃO carregou (bloqueador de anúncios ativo?)", carregou ? "ok" : "erro");
        teste("Agora envie um formulário ou o popup do WhatsApp para testar a conversão.", "info");
      }, 2500);
      // observa as requisições que levam a conversão ao Google
      if ("PerformanceObserver" in window) {
        try {
          new PerformanceObserver(function (list) {
            list.getEntries().forEach(function (e) {
              // vale para os domínios do Google e para o Google tag gateway (caminho no próprio domínio)
              if (/\/gtag\/js|\/gtm\.js/.test(e.name) && e.name.indexOf(location.host) > -1) teste("Tag servida pelo seu domínio (Google tag gateway ativo)", "ok");
              if (e.name.indexOf(CFG.googleAdsId.replace("AW-", "")) > -1 && !/\/gtag\/js/.test(e.name)) {
                var conv = (CFG.googleAdsLeadLabel && e.name.indexOf(CFG.googleAdsLeadLabel) > -1) || /[?&]label=/.test(e.name);
                var host = new URL(e.name).host;
                teste((conv ? "Conversão recebida pelo Google" : "Requisição ao Google Ads") + " (" + (host === location.host ? "via seu domínio" : host) + ")", conv ? "ok" : "info");
              }
            });
          }).observe({ type: "resource", buffered: true });
        } catch (_) {}
      }
    });
  }

  /* ---------- Header ---------- */
  var header = $(".header");
  var mobileBar = $(".mobile-bar");
  var onScroll = function () {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    if (mobileBar) mobileBar.classList.toggle("is-visible", y > window.innerHeight * 0.8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$("a", nav).forEach(function (a) {
    a.addEventListener("click", function () { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); });
  });

  /* ---------- Modo viver / investir ---------- */
  var hero = $(".hero"), sw = $("#modeSwitch");
  function setMode(mode) {
    hero.setAttribute("data-mode", mode);
    sw.setAttribute("aria-checked", mode === "investir");
    $$('input[name="objetivo"]', $("#formHero")).forEach(function (r) {
      r.checked = (mode === "investir" ? r.value === "Investir" : r.value === "Morar");
    });
  }
  sw.addEventListener("click", function () {
    setMode(hero.getAttribute("data-mode") === "viver" ? "investir" : "viver");
  });
  $$(".mode__label").forEach(function (l) {
    l.addEventListener("click", function () { setMode(l.getAttribute("data-for")); });
  });

  /* ---------- Tabs ---------- */
  $$(".tabs").forEach(function (tabs) {
    var section = tabs.closest(".section");
    var btns = $$(".tab", tabs);
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-tab");
        btns.forEach(function (x) { var on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-selected", on); });
        $$("[data-panel]", section).forEach(function (p) {
          var on = p.getAttribute("data-panel") === id;
          p.hidden = !on; p.classList.toggle("is-active", on);
        });
        b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      });
    });
  });

  /* ---------- Interesse vindo dos botões das plantas ---------- */
  $$("[data-interesse]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = $('#formFooter select[name="interesse"]');
      if (sel) sel.value = a.getAttribute("data-interesse");
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = $("#lightbox"), lbImg = $("img", lb), lbCap = $("figcaption", lb), group = [], idx = 0;
  function openLb(list, i) {
    group = list; idx = i; showLb();
    lb.hidden = false; document.body.style.overflow = "hidden";
  }
  function showLb() {
    var img = group[idx];
    lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt; lbCap.textContent = img.alt;
    $$(".lightbox__nav", lb).forEach(function (n) { n.style.display = group.length > 1 ? "" : "none"; });
  }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ""; }
  function step(d) { idx = (idx + d + group.length) % group.length; showLb(); }
  $$(".gallery").forEach(function (g) {
    var imgs = $$("img", g);
    imgs.forEach(function (img, i) { img.closest(".g-item").addEventListener("click", function () { openLb(imgs, i); }); });
  });
  $$(".plan").forEach(function (p) {
    var imgs = $$(".plan__fig img, .plan__decor", p);
    imgs.forEach(function (img, i) { img.addEventListener("click", function () { openLb(imgs, i); }); });
  });
  $$("[data-zoom]").forEach(function (img) {
    img.addEventListener("click", function () { openLb([img], 0); });
  });
  $(".lightbox__close", lb).addEventListener("click", closeLb);
  $(".lightbox__prev", lb).addEventListener("click", function () { step(-1); });
  $(".lightbox__next", lb).addEventListener("click", function () { step(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  var tx = null;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); tx = null;
  });

  /* ---------- Reveal on scroll ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Formulários ---------- */
  function maskPhone(v) {
    v = v.replace(/\D/g, "").slice(0, 11);
    if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    return v.length ? "(" + v : v;
  }
  $$('input[type="tel"]').forEach(function (i) {
    i.addEventListener("input", function () { i.value = maskPhone(i.value); });
  });

  function utm() {
    var p = new URLSearchParams(location.search), o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(function (k) {
      if (p.get(k)) o[k] = p.get(k);
    });
    return o;
  }

  /* ---------- Envio para o CRM ---------- */
  var LS_KEY = "onresort_lead";
  function remember(lead) {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ nome: lead.nome, telefone: lead.telefone, email: lead.email, interesse: lead.interesse })); } catch (_) {}
  }
  function recall() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (_) { return null; }
  }
  function buildLead(form, origem, cta) {
    var objetivo = (form.querySelector('input[name="objetivo"]:checked') || {}).value || "";
    var btn = form.querySelector('button[type="submit"]');
    return Object.assign({
      nome: form.nome.value.trim(), telefone: form.telefone.value, email: form.email.value.trim(),
      interesse: form.interesse ? form.interesse.value : "", objetivo: objetivo,
      website: form.website ? form.website.value : "",
      origem: (MODO_TESTE ? "[TESTE] " : "") + origem, cta: cta || (btn ? btn.textContent.trim() : ""),
      pagina: location.href, referrer: document.referrer
    }, metaIds(), utm());
  }
  // keepalive garante a entrega mesmo que a pessoa saia da página (ex.: indo para o WhatsApp)
  function sendLead(lead) {
    if (!CFG.formEndpoint) return Promise.reject(new Error("sem endpoint"));
    var body = JSON.stringify(lead);
    try {
      return fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.ok === false) throw new Error(d.error || d.erro || r.status); return d; }); });
    } catch (err) {
      if (navigator.sendBeacon && navigator.sendBeacon(CFG.formEndpoint, new Blob([body], { type: "text/plain" }))) return Promise.resolve({ ok: true });
      return Promise.reject(err);
    }
  }
  function validate(form, needInteresse) {
    var ok = true, nome = form.nome, tel = form.telefone, email = form.email, cons = form.consentimento;
    [nome, tel, email, form.interesse].forEach(function (f) { if (f) f.classList.remove("is-invalid"); });
    cons.closest(".consent").classList.remove("is-invalid");
    if (nome.value.trim().length < 2) { nome.classList.add("is-invalid"); ok = false; }
    if (tel.value.replace(/\D/g, "").length < 10) { tel.classList.add("is-invalid"); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { email.classList.add("is-invalid"); ok = false; }
    if (needInteresse && form.interesse && !form.interesse.value) { form.interesse.classList.add("is-invalid"); ok = false; }
    if (!cons.checked) { cons.closest(".consent").classList.add("is-invalid"); ok = false; }
    return ok;
  }

  /* ---------- Popup do WhatsApp ---------- */
  var ctModal = $("#ctModal"), ctForm = $("#ctForm"), waOrigem = "WhatsApp", waCta = "", waAcao = "falar com o corretor", lastFocus = null;
  function openWaModal(origem, cta, acao) {
    waOrigem = origem || "WhatsApp";
    waCta = cta || "";
    waAcao = acao || "falar com o corretor";
    var saved = recall();
    if (saved) ["nome", "telefone", "email", "interesse"].forEach(function (k) { if (saved[k] && !ctForm[k].value) ctForm[k].value = saved[k]; });
    var pre = document.querySelector('#formFooter select[name="interesse"]');
    if (pre && pre.value && !ctForm.interesse.value) ctForm.interesse.value = pre.value;
    $(".lead-form__msg", ctForm).textContent = "";
    lastFocus = document.activeElement;
    ctModal.hidden = false; document.body.style.overflow = "hidden";
    setTimeout(function () { (ctForm.nome.value ? ctForm.querySelector("button[type=submit]") : ctForm.nome).focus(); }, 50);
  }
  function closeWaModal() {
    ctModal.hidden = true; document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $(".ct-modal__close", ctModal).addEventListener("click", closeWaModal);
  ctModal.addEventListener("click", function (e) { if (e.target === ctModal) closeWaModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !ctModal.hidden) closeWaModal(); });
  ctForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $(".lead-form__msg", ctForm);
    msg.className = "lead-form__msg";
    if (!validate(ctForm, true)) { msg.classList.add("is-err"); msg.textContent = "Preencha os campos destacados."; return; }
    var lead = buildLead(ctForm, waOrigem, waCta);
    remember(lead);
    // 1) grava o lead no CRM (independe de a conversa ser concluída)
    sendLead(lead).catch(function () {});
    pixelLead(lead);
    googleLead(lead);
    track("lead_submit", { origem: lead.origem, interesse: lead.interesse });
    // 2) abre o WhatsApp já com a mensagem pronta
    var url = waLink(mensagemPadrao(waAcao, lead));
    var w = window.open(url, "_blank", "noopener");
    if (!w) location.href = url;
    msg.classList.add("is-ok"); msg.textContent = "Abrindo o WhatsApp…";
    setTimeout(closeWaModal, 1200);
  });

  /* ---------- Formulários da página ---------- */
  $$(".lead-form").forEach(function (form) {
    var msg = $(".lead-form__msg", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "lead-form__msg"; msg.textContent = "";
      if (!validate(form, false)) { msg.classList.add("is-err"); msg.textContent = "Confira os campos destacados."; return; }
      var btnForm = form.querySelector('button[type="submit"]');
      var origem = secaoDe(form) + " · formulário";
      var acao = acaoDe(btnForm);
      // se o cliente chegou ao formulário de contato por um botão, vale a ação daquele botão
      if (form.id === "formFooter" && ultimoCta) { origem += " (veio de: " + ultimoCta.origem + ")"; acao = ultimoCta.acao; }
      var lead = buildLead(form, origem);
      remember(lead);
      // 1) grava o lead no CRM (keepalive: chega mesmo com a ida para o WhatsApp)
      sendLead(lead).catch(function () {});
    pixelLead(lead);
    googleLead(lead);
      track("lead_submit", { origem: lead.origem, objetivo: lead.objetivo });
      // 2) leva o cliente para o WhatsApp com a mensagem pronta
      var url = waLink(mensagemPadrao(acao, lead));
      var w = window.open(url, "_blank", "noopener");
      if (!w) location.href = url;
      msg.classList.add("is-ok");
      msg.innerHTML = "Recebemos seus dados! Abrindo o WhatsApp… <a href=\"" + url + "\" target=\"_blank\" rel=\"noopener\">Clique aqui se não abrir.</a>";
      form.reset();
    });
  });
})();
