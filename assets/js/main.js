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
  $$("[data-whatsapp]").forEach(function (a) {
    a.href = waLink();
    a.target = "_blank";
    a.rel = "noopener";
    a.addEventListener("click", function () { track("whatsapp_click"); });
  });
  var ano = $("#ano"); if (ano) ano.textContent = new Date().getFullYear();

  function track(event, data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, data || {}));
    if (typeof window.fbq === "function" && event === "lead_submit") window.fbq("track", "Lead");
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

  $$(".lead-form").forEach(function (form) {
    var msg = $(".lead-form__msg", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "lead-form__msg"; msg.textContent = "";
      var ok = true;
      var nome = form.nome, tel = form.telefone, email = form.email, cons = form.consentimento;
      [nome, tel, email].forEach(function (f) { f.classList.remove("is-invalid"); });
      cons.closest(".consent").classList.remove("is-invalid");
      if (nome.value.trim().length < 2) { nome.classList.add("is-invalid"); ok = false; }
      if (tel.value.replace(/\D/g, "").length < 10) { tel.classList.add("is-invalid"); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { email.classList.add("is-invalid"); ok = false; }
      if (!cons.checked) { cons.closest(".consent").classList.add("is-invalid"); ok = false; }
      if (!ok) { msg.classList.add("is-err"); msg.textContent = "Confira os campos destacados."; return; }

      var objetivo = (form.querySelector('input[name="objetivo"]:checked') || {}).value || "";
      var interesse = form.interesse ? form.interesse.value : "";
      var lead = Object.assign({
        empreendimento: "ON Resort Cidade Jardim",
        nome: nome.value.trim(), telefone: tel.value, email: email.value.trim(),
        objetivo: objetivo, interesse: interesse,
        origem: form.getAttribute("data-origem"), pagina: location.href, data: new Date().toISOString()
      }, utm());

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; var label = btn.textContent; btn.textContent = "Enviando...";

      var done = function () {
        track("lead_submit", { origem: lead.origem, objetivo: objetivo });
        msg.classList.add("is-ok");
        msg.textContent = "Recebemos seus dados! Em breve um especialista entra em contato.";
        btn.disabled = false; btn.textContent = label;
        form.reset();
        if (CFG.abrirWhatsAppAposEnvio || !CFG.formEndpoint) {
          var txt = "Olá! Tenho interesse no ON Resort Cidade Jardim.\n" +
            "Nome: " + lead.nome + "\nTelefone: " + lead.telefone + "\nE-mail: " + lead.email +
            (objetivo ? "\nObjetivo: " + objetivo : "") + (interesse ? "\nTipologia: " + interesse : "");
          window.open(waLink(txt), "_blank", "noopener");
        }
      };

      if (CFG.formEndpoint) {
        fetch(CFG.formEndpoint, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead)
        }).then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
          .catch(function () {
            btn.disabled = false; btn.textContent = label;
            msg.classList.add("is-err");
            msg.textContent = "Não foi possível enviar agora. Tente pelo WhatsApp.";
          });
      } else {
        done();
      }
    });
  });
})();
