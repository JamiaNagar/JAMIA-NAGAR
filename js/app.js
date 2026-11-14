/* ==========================================================
   app.js — ওয়েবসাইটের কাজ (সাধারণত এই ফাইল বদলানোর দরকার নেই)
   তথ্য বদলাতে data ফাইলগুলো (config/contacts/nigran/books/history) ব্যবহার করুন।
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- helpers ---------- */
  const store = {
    get(area, k) { try { return window[area].getItem(k); } catch (e) { return null; } },
    set(area, k, v) { try { window[area].setItem(k, v); } catch (e) {} },
    del(area, k) { try { window[area].removeItem(k); } catch (e) {} }
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // বাংলা/আরবি ডিজিটকে ইংরেজি ডিজিটে রূপান্তর
  const toEn = s => String(s == null ? "" : s)
    .replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  // ফোন নম্বর: ১০ ডিজিট (১ দিয়ে শুরু) হলে শুরুতে ০ বসাও
  const normPhone = p => { let d = toEn(p).replace(/\D/g, ""); if (d.length === 10 && d[0] === "1") d = "0" + d; return d; };

  let lang = store.get("localStorage", "jn_lang") || CONFIG.defaultLanguage;
  if (!I18N[lang]) lang = "bn";
  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.bn[k] || k;
  const L = v => (v && typeof v === "object") ? (v[lang] || v.bn || "") : (v || "");

  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- access code gate (সাধারণ গেট, নিরাপদ লগইন নয়) ---------- */
  // ভবিষ্যতে সার্ভার-সাইড লগইন বসাতে শুধু এই দুটি ফাংশন বদলান।
  function checkAccessCode(input) { return toEn(input).trim() === String(CONFIG.accessCode); }
  const isAuthed = () => !CONFIG.requireLogin || store.get("sessionStorage", "jn_auth") === "1";

  function renderAuth() {
    const ok = isAuthed() && CONFIG.requireLogin;
    $("#loginForm").hidden = ok; $("#welcomeBox").hidden = !ok;
    document.body.classList.toggle("authed", isAuthed()); // লগইনের পরেই নেভিগেশন দেখাবে
  }

  /* ---------- কোড ঘর: ব্রাউজারের "পাসওয়ার্ড সেভ/অটোফিল" এড়াতে সাধারণ ঘর + CSS দিয়ে লেখা ঢাকা ---------- */
  const maskSupported = !!(window.CSS && CSS.supports && (CSS.supports("-webkit-text-security", "disc") || CSS.supports("text-security", "disc")));
  const isMasked = () => maskSupported ? $("#codeInput").classList.contains("masked") : $("#codeInput").type === "password";
  function setMasked(on) {
    const inp = $("#codeInput");
    if (maskSupported) inp.classList.toggle("masked", on); else inp.type = on ? "password" : "text";
  }
  function initCodeField() {
    const inp = $("#codeInput");
    if (!maskSupported) { inp.classList.remove("masked"); inp.type = "password"; inp.autocomplete = "new-password"; }
    inp.value = "";
    // পিছনে (Back) ফিরলে বা ট্যাব পুনরুদ্ধার হলেও ঘর খালি রাখা
    window.addEventListener("pageshow", () => { if (!isAuthed()) inp.value = ""; });
    setTimeout(() => { if (!isAuthed()) inp.value = ""; }, 300); // দেরিতে অটোফিল হলে মুছে দেয়
  }

  /* ---------- static texts ---------- */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
    $$("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
    $("#langBtn").textContent = t("lang_switch");
    $("#nameAr").textContent = CONFIG.nameAr;
    $("#nameBn").textContent = CONFIG.nameBn;
    $("#addrBn").textContent = CONFIG.addressBn;
    $("#heroLogo").src = CONFIG.logo;
    const m = $("#mailLink"); m.textContent = CONFIG.email; m.href = "mailto:" + CONFIG.email;
    $$(".notice").forEach(n => n.textContent = t("notice"));
    $("#eyeBtn").setAttribute("aria-label", t(isMasked() ? "show" : "hide"));
    $("#loginMsg").textContent = "";
    updateScrollBtn();
  }

  /* ---------- history & curriculum ---------- */
  const paras = arr => arr.map(p => `<p dir="auto">${esc(L(p))}</p>`).join("");
  function renderHistory() {
    $("#historyText").innerHTML = paras(historyData.paragraphs);
    $("#eduText").innerHTML = paras(curriculumData.paragraphs);
    $("#subjectList").innerHTML = curriculumData.subjects.map(s => `<li>${esc(L(s))}</li>`).join("");
  }

  /* ---------- slow auto-scroll with pause/resume ---------- */
  const reader = $("#historyReader");
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED = 22; // পিক্সেল/সেকেন্ড — কমালে ধীর, বাড়ালে দ্রুত
  let userPaused = reduceMotion, hovering = false, holdUntil = 0, pos = 0, lastT = 0, endWait = 0;
  function updateScrollBtn() { $("#scrollToggle").textContent = t(userPaused ? "resume" : "pause"); }
  $("#scrollToggle").addEventListener("click", () => { userPaused = !userPaused; updateScrollBtn(); });
  ["wheel", "touchstart", "pointerdown", "keydown"].forEach(ev =>
    reader.addEventListener(ev, () => { holdUntil = performance.now() + 3000; }, { passive: true }));
  reader.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") hovering = true; });
  reader.addEventListener("pointerleave", () => { hovering = false; });
  function tick(now) {
    const dt = Math.min((now - (lastT || now)) / 1000, 0.1); lastT = now;
    const homeVisible = !$("#page-home").hidden;
    if (homeVisible && !userPaused && !hovering && now > holdUntil && now > endWait) {
      if (Math.abs(reader.scrollTop - pos) > 2) pos = reader.scrollTop; // ব্যবহারকারী নিজে স্ক্রল করলে সিঙ্ক
      const max = reader.scrollHeight - reader.clientHeight;
      if (max > 0) {
        pos += SPEED * dt;
        if (pos >= max) { pos = 0; reader.scrollTop = 0; endWait = now + 2500; }
        else reader.scrollTop = pos;
      }
    }
    requestAnimationFrame(tick);
  }

  /* ---------- routing (পেজ বদল, রিলোড ছাড়াই) ---------- */
  const PAGES = ["home", "contacts", "books"];
  function route() {
    let page = (location.hash || "#home").slice(1);
    if (!PAGES.includes(page)) page = "home";
    if (page !== "home" && !isAuthed()) { page = "home"; history.replaceState(null, "", "#home"); toast(t("login_required")); $("#codeInput").focus(); }
    $$(".page").forEach(p => { p.hidden = p.dataset.page !== page; });
    $$("[data-nav]").forEach(a => { a.classList.toggle("active", a.dataset.nav === page); a.toggleAttribute("aria-current", a.dataset.nav === page); });
    window.scrollTo(0, 0);
    if (page === "contacts" && pendingOpen) { const m = pendingOpen; pendingOpen = null; openDir(m); }
  }

  /* ---------- contacts ---------- */
  const IC = {
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    call: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>'
  };
  // দুই ধরনের তালিকাকে একই কাঠামোয় আনা: [{id, title, items:[{name, role, phone}]}]
  function getGroups(mode) {
    if (mode === "staff") return contactGroups.map(g => ({ id: g.id, title: L(g.title), items: g.members.map(m => ({ name: m.name, role: m.role || "", phone: m.phone })) }));
    return nigranList.map((g, i) => ({ id: "n" + i, title: g.department, items: g.members.map(m => ({ name: m.name, role: g.department, phone: m.phone })) }));
  }
  const countAll = mode => getGroups(mode).reduce((n, g) => n + g.items.length, 0);
  const C = { mode: null, q: "", group: "all" };
  let pendingOpen = null; // হোম থেকে সরাসরি কোন তালিকা খুলবে

  function openDir(mode) {
    C.mode = mode; C.q = ""; C.group = "all"; $("#cSearch").value = "";
    $("#cChoice").hidden = true; $("#cDir").hidden = false;
    $("#cTitle").textContent = t(mode === "staff" ? "opt1" : "opt2");
    renderContacts(); window.scrollTo(0, 0);
  }
  function closeDir() { C.mode = null; $("#cDir").hidden = true; $("#cChoice").hidden = false; }

  function renderChoiceCounts() {
    $("#staffCount").textContent = countAll("staff") + " · " + t("mobile");
    $("#nigranCount").textContent = countAll("nigran") + " · " + t("mobile");
  }

  function matches(item, groupTitle, q, qDigits) {
    if (!q) return true;
    const hay = (item.name + " " + item.role + " " + groupTitle).toLowerCase();
    if (hay.includes(q)) return true;
    return qDigits.length >= 2 && normPhone(item.phone).includes(qDigits);
  }

  function renderContacts() {
    if (!C.mode) return;
    const groups = getGroups(C.mode);
    const q = toEn(C.q).trim().toLowerCase(), qDigits = q.replace(/\D/g, "");
    const acc = C.mode === "nigran"; // নেগরান তালিকা: জামাত অনুযায়ী গুটিয়ে রাখা (accordion)
    $("#cChips").hidden = acc; $("#cToggleAll").hidden = !acc;
    // chips
    $("#cChips").innerHTML = acc ? "" : `<button class="chip ${C.group === "all" ? "on" : ""}" data-g="all">${esc(t("all"))}</button>` +
      groups.map(g => `<button class="chip ${C.group === g.id ? "on" : ""}" data-g="${esc(g.id)}">${esc(g.title)}</button>`).join("");
    let total = 0, html = "";
    groups.filter(g => C.group === "all" || g.id === C.group).forEach(g => {
      const items = g.items.filter(it => matches(it, g.title, q, qDigits));
      if (!items.length) return;
      total += items.length;
      if (acc) {
        html += `<details class="acc glass"${q ? " open" : ""}><summary><span>${esc(g.title)}</span><small>${items.length}</small></summary><div class="cards">` +
          items.map(it => cardHTML(it, g.title, true)).join("") + `</div></details>`;
        return;
      }
      html += `<section class="group"><h3><span>${esc(g.title)}</span><small>${items.length}</small></h3><div class="cards">` +
        items.map(it => cardHTML(it, g.title)).join("") + `</div></section>`;
    });
    if (acc && total) html = `<div class="accs">${html}</div>`;
    $("#cList").innerHTML = total ? html : `<div class="empty glass">${esc(t("no_results"))}</div>`;
    $("#cCount").textContent = t("results").replace("{n}", total);
    $("#cClear").hidden = !C.q;
    updateToggleLabel();
  }
  function updateToggleLabel() {
    const ds = $$("#cList details");
    $("#cToggleAll").textContent = t(ds.length && ds.every(d => d.open) ? "collapse_all" : "expand_all");
  }

  function cardHTML(it, groupTitle, hideRole) {
    const ph = normPhone(it.phone);
    const sub = hideRole ? "" : (it.role || groupTitle);
    const phoneRow = ph
      ? `<div class="card__phone"><b>${esc(t("mobile"))}:</b>${esc(ph)}</div>
         <div class="card__actions">
           <button class="btn btn--ghost" type="button" data-copy="${esc(ph)}">${IC.copy}<span>${esc(t("copy"))}</span></button>
           <a class="btn btn--glass" href="tel:${esc(ph)}">${IC.call}<span>${esc(t("call"))}</span></a>
         </div>`
      : `<div class="card__phone">${esc(t("no_phone"))}</div>`;
    return `<article class="card glass"><div class="card__name">${esc(it.name)}</div>${sub ? `<div class="card__role">${esc(sub)}</div>` : ""}${phoneRow}</article>`;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) {}
    try {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;top:0"; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  /* ---------- books ---------- */
  const B = { q: "" };
  function renderBooks() {
    const q = B.q.trim().toLowerCase();
    let total = 0, html = "";
    booksData.forEach((a, ai) => {
      const list = a.books.map((b, bi) => ({ b, bi })).filter(({ b }) =>
        !q || (b.title + " " + a.author + " " + (b.description || "")).toLowerCase().includes(q));
      if (!list.length) return;
      total += list.length;
      html += `<section class="author"><h3>${esc(a.author)}</h3>${a.bio ? `<p class="author__bio">${esc(a.bio)}</p>` : ""}<div class="books">` +
        list.map(({ b, bi }) => bookHTML(a, b, ai, bi)).join("") + `</div></section>`;
    });
    $("#bList").innerHTML = total ? html : `<div class="empty glass">${esc(t("no_books"))}</div>`;
    $("#bCount").textContent = t("results").replace("{n}", total);
    $("#bClear").hidden = !B.q;
  }
  function bookHTML(a, b, ai, bi) {
    const st = ["available", "soon", "unavailable"].includes(b.status) ? b.status : "soon";
    const cover = b.cover
      ? `<div class="cover"><span>${esc(b.title)}</span><img src="${esc(b.cover)}" alt="${esc(b.title)}" loading="lazy"></div>`
      : `<div class="cover"><span>${esc(b.title)}</span></div>`;
    return `<article class="book glass">${cover}<div class="book__body">
      <div class="book__title">${esc(b.title)}</div>
      <div class="book__author">${esc(a.author)}</div>
      <p class="book__desc">${esc(b.description || "")}</p>
      <div class="tags">
        ${b.language ? `<span>${esc(t("book_lang"))}: ${esc(b.language)}</span>` : ""}
        ${b.price !== "" && b.price != null ? `<span>${esc(t("price"))}: ${esc(t("currency"))}${esc(b.price)}</span>` : ""}
        <span class="st-${st}">${esc(t("st_" + st))}</span>
        ${b.sample ? `<span>${esc(t("sample"))}</span>` : ""}
      </div>
      <button class="btn btn--glass" type="button" data-order="${ai}:${bi}">${esc(t("order"))}</button>
    </div></article>`;
  }
  function orderBook(ai, bi) {
    const a = booksData[ai], b = a && a.books[bi];
    if (!b) return;
    // নম্বরের অগ্রাধিকার: কিতাব → লেখক → config.js। ০১XXXXXXXXX লিখলে নিজে থেকে ৮৮০ বসে যায়।
    const raw = String(b.whatsapp || a.whatsapp || CONFIG.whatsappNumber || "");
    let num = toEn(raw).replace(/\D/g, "");
    if (/^01\d{9}$/.test(num)) num = "880" + num.slice(1);
    else if (/^1\d{9}$/.test(num)) num = "880" + num;
    if (!/^\d{10,15}$/.test(num) || /X/i.test(raw)) { toast(t("wa_missing")); return; }
    const msg = t("wa_message").replace("{title}", b.title).replace("{author}", a.author);
    window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }

  /* ---------- events ---------- */
  function bind() {
    $("#langBtn").addEventListener("click", () => { lang = lang === "bn" ? "ar" : "bn"; store.set("localStorage", "jn_lang", lang); renderAll(); });

    $("#eyeBtn").addEventListener("click", () => {
      const inp = $("#codeInput"), show = isMasked();
      setMasked(!show);
      $("#eyeOpen").hidden = show; $("#eyeShut").hidden = !show;
      $("#eyeBtn").setAttribute("aria-pressed", String(show));
      $("#eyeBtn").setAttribute("aria-label", t(show ? "hide" : "show"));
    });

    $("#loginForm").addEventListener("submit", e => {
      e.preventDefault();
      const inp = $("#codeInput"), msg = $("#loginMsg");
      if (!inp.value.trim()) { msg.textContent = t("login_empty"); return; }
      if (checkAccessCode(inp.value)) {
        store.set("sessionStorage", "jn_auth", "1"); inp.value = ""; msg.textContent = ""; renderAuth();
      } else {
        msg.textContent = t("login_error");
        const c = $("#loginCard"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); inp.select();
      }
    });
    $("#logoutBtn").addEventListener("click", () => { store.del("sessionStorage", "jn_auth"); renderAuth(); });

    $$("[data-go]").forEach(b => b.addEventListener("click", () => { pendingOpen = b.dataset.go; if (location.hash === "#contacts") route(); else location.hash = "#contacts"; }));
    $$("[data-open]").forEach(b => b.addEventListener("click", () => openDir(b.dataset.open)));
    $("#cBack").addEventListener("click", closeDir);
    $("#cSearch").addEventListener("input", e => { C.q = e.target.value; renderContacts(); });
    $("#cClear").addEventListener("click", () => { C.q = ""; $("#cSearch").value = ""; renderContacts(); $("#cSearch").focus(); });
    $("#cChips").addEventListener("click", e => { const b = e.target.closest("[data-g]"); if (b) { C.group = b.dataset.g; renderContacts(); } });
    $("#cToggleAll").addEventListener("click", () => {
      const ds = $$("#cList details"), open = ds.some(d => !d.open);
      ds.forEach(d => { d.open = open; }); updateToggleLabel();
    });
    $("#cList").addEventListener("toggle", updateToggleLabel, true);
    $("#cList").addEventListener("click", async e => {
      const b = e.target.closest("[data-copy]"); if (!b) return;
      toast(t((await copyText(b.dataset.copy)) ? "copied" : "copy_failed"));
    });

    $("#bSearch").addEventListener("input", e => { B.q = e.target.value; renderBooks(); });
    $("#bClear").addEventListener("click", () => { B.q = ""; $("#bSearch").value = ""; renderBooks(); $("#bSearch").focus(); });
    $("#bList").addEventListener("click", e => {
      const b = e.target.closest("[data-order]"); if (!b) return;
      const [ai, bi] = b.dataset.order.split(":").map(Number); orderBook(ai, bi);
    });
    // ভাঙা কভার ছবি লুকিয়ে স্বয়ংক্রিয় কভার দেখাও
    document.addEventListener("error", e => { if (e.target.tagName === "IMG" && e.target.closest(".cover")) e.target.remove(); }, true);

    window.addEventListener("hashchange", route);
  }

  /* ---------- render everything (ভাষা বদলালেও এটি চলে, পেজ রিলোড হয় না) ---------- */
  function renderAll() {
    applyStatic(); renderHistory(); renderChoiceCounts(); renderAuth();
    if (C.mode) { $("#cTitle").textContent = t(C.mode === "staff" ? "opt1" : "opt2"); renderContacts(); }
    renderBooks();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $(".bg").style.backgroundImage = `linear-gradient(180deg,rgba(11,31,51,.78),rgba(10,61,48,.86)),url("${CONFIG.background}")`;
    initCodeField();
    bind(); renderAll(); route();
    requestAnimationFrame(tick);
  });
})();
