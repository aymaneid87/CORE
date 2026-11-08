/* المنصة الإسلامية لتلفزيونات LG webOS — ES5 للتوافق مع الإصدارات القديمة */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var Q = window.QURAN, R = window.RECITERS, C = window.CITIES, P = window.Prayer;

  /* ---------- أدوات ---------- */
  var AR_DIG = "٠١٢٣٤٥٦٧٨٩";
  function toAr(n) { return String(n).replace(/\d/g, function (d) { return AR_DIG.charAt(d); }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var G_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  var H_MONTHS = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
  var DAYS = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  function mmss(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600); s -= h * 3600; return (h ? h + ":" + pad(Math.floor(s / 60)) : Math.floor(s / 60)) + ":" + pad(s % 60); }

  /* ---------- الإعدادات ---------- */
  var DEF = { city: 0, method: "egypt", asr: "standard", h12: false, hijriOff: 0, minOff: 0,
    adhan: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }, adhanVol: 90, quranVol: 80,
    reciter: "alafasy", surah: 1, follow: false, audioBase: "audio/" };
  var S = (function () {
    var o = {};
    try { o = JSON.parse(localStorage.getItem("islamic.v1") || "{}"); } catch (e) {}
    var r = {}, k;
    for (k in DEF) r[k] = o[k] !== undefined ? o[k] : DEF[k];
    r.adhan = o.adhan || DEF.adhan;
    return r;
  })();
  function save() { try { localStorage.setItem("islamic.v1", JSON.stringify(S)); } catch (e) {} }

  /* ---------- تكبير الواجهة على الشاشة ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var st = $("stage");
    st.style.webkitTransform = st.style.transform = "scale(" + s + ")";
    st.style.left = Math.max(0, (window.innerWidth - 1920 * s) / 2) + "px";
    st.style.top = Math.max(0, (window.innerHeight - 1080 * s) / 2) + "px";
  }
  window.addEventListener("resize", fit); fit();

  var toastT;
  function toast(msg, ms) {
    var t = $("toast"); t.textContent = msg; t.style.display = "block";
    clearTimeout(toastT); toastT = setTimeout(function () { t.style.display = "none"; }, ms || 3500);
  }

  /* ---------- التاريخ الهجري ---------- */
  function tabularHijri(y, m, d) { // خوارزمية الكويت
    var a = Math.floor((m - 14) / 12);
    var jd = Math.floor(1461 * (y + 4800 + a) / 4) + Math.floor(367 * (m - 2 - 12 * a) / 12) -
      Math.floor(3 * Math.floor((y + 4900 + a) / 100) / 4) + d - 32075;
    var l = jd - 1948440 + 10632, n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = Math.floor((10985 - l) / 5316) * Math.floor(50 * l / 17719) + Math.floor(l / 5670) * Math.floor(43 * l / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) - Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
    var mo = Math.floor(24 * l / 709);
    return { y: 30 * n + j - 30, m: mo, d: l - Math.floor(709 * mo / 24) };
  }
  function hijri(date) {
    try {
      var f = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric" });
      if (f.formatToParts && f.resolvedOptions().calendar === "islamic-umalqura") {
        var o = {}; f.formatToParts(date).forEach(function (p) { o[p.type] = parseInt(p.value, 10); });
        if (o.day && o.month && o.year) return { y: o.year, m: o.month, d: o.day };
      }
    } catch (e) {}
    return tabularHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  /* ---------- المواقيت ---------- */
  var PR = [
    { k: "fajr", n: "الفجر", adhan: true }, { k: "sunrise", n: "الشروق" }, { k: "dhuhr", n: "الظهر", adhan: true },
    { k: "asr", n: "العصر", adhan: true }, { k: "maghrib", n: "المغرب", adhan: true }, { k: "isha", n: "العشاء", adhan: true }
  ];
  var cache = { day: "", t: null, tom: null };
  function dayKey(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate() + "|" + S.city + S.method + S.asr + S.minOff; }
  function timesFor(date) {
    var c = C[S.city], tz = -date.getTimezoneOffset() / 60, off = {};
    ["fajr","sunrise","dhuhr","asr","maghrib","isha"].forEach(function (k) { off[k] = S.minOff; });
    return P.compute(date, c[1], c[2], tz, { method: S.method, asr: S.asr, offsets: off });
  }
  function dayMs(date, h) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() + Math.round(h * 3600000); }
  function ensureTimes(now) {
    var k = dayKey(now);
    if (cache.day !== k) {
      var tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      cache = { day: k, t: timesFor(now), tom: timesFor(tom), date: now, tomDate: tom };
      buildPrayerRow();
    }
  }
  function nextPrayer(now) {
    var ms = now.getTime(), i, v;
    for (i = 0; i < PR.length; i++) { v = dayMs(cache.date, cache.t[PR[i].k]); if (v > ms) return { i: i, ms: v }; }
    return { i: 0, ms: dayMs(cache.tomDate, cache.tom.fajr), tomorrow: true };
  }

  function buildPrayerRow() {
    var row = $("prayerRow"), h = "";
    PR.forEach(function (p, i) {
      h += '<div class="pcard' + (p.k === "sunrise" ? " sun" : "") + '" id="pc' + i + '"><div class="pn">' + p.n + '</div><div class="pt">' +
        P.fmt(cache.t[p.k], S.h12) + '</div><div class="ps">' + (p.adhan ? (S.adhan[p.k] ? "🔔 الأذان مفعّل" : "🔕 الأذان متوقف") : "&nbsp;") + '</div></div>';
    });
    row.innerHTML = h;
    $("cityName").textContent = "· " + C[S.city][0];
  }

  /* ---------- الساعة والعرض الرئيسي ---------- */
  var lastDay = -1;
  function tick() {
    var now = new Date();
    ensureTimes(now);
    var hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds();
    $("clock").textContent = S.h12 ? pad(hh % 12 || 12) + ":" + pad(mm) : pad(hh) + ":" + pad(mm);
    $("clockSec").textContent = DAYS[now.getDay()] + " · " + pad(ss) + (S.h12 ? (hh >= 12 ? " م" : " ص") : "");
    var np = nextPrayer(now);
    $("nextName").textContent = (np.tomorrow ? "فجر الغد" : PR[np.i].n);
    $("nextTime").textContent = P.fmt(np.tomorrow ? cache.tom.fajr : cache.t[PR[np.i].k], S.h12);
    var left = Math.max(0, Math.round((np.ms - now.getTime()) / 1000));
    $("nextCount").textContent = pad(Math.floor(left / 3600)) + ":" + pad(Math.floor(left % 3600 / 60)) + ":" + pad(left % 60);
    var i;
    for (i = 0; i < PR.length; i++) {
      var el = $("pc" + i); if (!el) continue;
      var v = dayMs(cache.date, cache.t[PR[i].k]);
      el.className = "pcard" + (PR[i].k === "sunrise" ? " sun" : "") + (!np.tomorrow && i === np.i ? " next" : (v <= now.getTime() ? " past" : ""));
    }
    if (lastDay !== now.getDate() || ss === 0 && mm % 5 === 0) updateDates(now);
    lastDay = now.getDate();
    checkAdhan(now);
  }
  function updateDates(now) {
    // بعد المغرب يبدأ اليوم الهجري التالي
    var shift = S.hijriOff, mg = dayMs(cache.date, cache.t.maghrib);
    if (now.getTime() >= mg) shift += 1;
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift, 12);
    var h = hijri(d);
    $("hijri").textContent = toAr(h.d) + " " + H_MONTHS[h.m - 1] + " " + toAr(h.y) + " هـ";
    $("greg").textContent = DAYS[now.getDay()] + " " + toAr(now.getDate()) + " " + G_MONTHS[now.getMonth()] + " " + toAr(now.getFullYear()) + " م";
  }

  /* ---------- الأذان ---------- */
  var fired = {}, adhanAudio = null, adhanOn = false, resumeQuran = false, chimeTimer = null;
  function checkAdhan(now) {
    var ms = now.getTime();
    PR.forEach(function (p) {
      if (!p.adhan || !S.adhan[p.k]) return;
      var t = dayMs(cache.date, cache.t[p.k]), key = now.toDateString() + p.k;
      if (ms >= t && ms < t + 45000 && !fired[key]) { fired[key] = true; startAdhan(p); }
    });
  }
  function startAdhan(p, isTest) {
    if (adhanOn) return;
    adhanOn = true;
    $("adTitle").textContent = isTest ? "اختبار الأذان" : "حان الآن موعد أذان " + p.n;
    $("adhan").className = "overlay on";
    resumeQuran = !audio.paused; if (resumeQuran) audio.pause();
    setFocus($("adStop"));
    var files = (p.k === "fajr" ? ["audio/adhan/adhan_fajr.mp3"] : []).concat(["audio/adhan/adhan.mp3"]), idx = 0;
    adhanAudio = new Audio();
    adhanAudio.volume = S.adhanVol / 100;
    adhanAudio.onended = stopAdhan;
    adhanAudio.onerror = function () { idx++; if (idx < files.length) { adhanAudio.src = files[idx]; adhanAudio.play(); } else { chime(); } };
    adhanAudio.src = files[0];
    try { var pr = adhanAudio.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  }
  function stopAdhan() {
    if (!adhanOn) return;
    adhanOn = false;
    try { if (adhanAudio) { adhanAudio.onerror = adhanAudio.onended = null; adhanAudio.pause(); } } catch (e) {}
    clearTimeout(chimeTimer);
    $("adhan").className = "overlay";
    if (resumeQuran) { try { audio.play(); } catch (e) {} }
    show(cur);
  }
  // نغمة تنبيه بديلة إذا لم يوجد ملف الأذان
  function chime() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC(), t0 = ctx.currentTime, notes = [523, 659, 784, 659, 523, 784, 1047];
      notes.forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.type = "sine"; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0, t0 + i * .7); g.gain.linearRampToValueAtTime(S.adhanVol / 150, t0 + i * .7 + .05);
        g.gain.linearRampToValueAtTime(0, t0 + i * .7 + .65); o.start(t0 + i * .7); o.stop(t0 + i * .7 + .7);
      });
      chimeTimer = setTimeout(stopAdhan, 6000);
    } catch (e) { chimeTimer = setTimeout(stopAdhan, 3000); }
  }

  /* ---------- الطقس (يعمل عند توفر الإنترنت ويحفظ آخر قراءة) ---------- */
  var WMO = { 0: ["صافٍ", "☀"], 1: ["صافٍ غالبًا", "🌤"], 2: ["غائم جزئيًا", "⛅"], 3: ["غائم", "☁"], 45: ["ضباب", "🌫"], 48: ["ضباب", "🌫"],
    51: ["رذاذ", "🌦"], 53: ["رذاذ", "🌦"], 55: ["رذاذ", "🌦"], 61: ["مطر خفيف", "🌧"], 63: ["مطر", "🌧"], 65: ["مطر غزير", "🌧"],
    71: ["ثلج", "❄"], 73: ["ثلج", "❄"], 75: ["ثلج كثيف", "❄"], 80: ["زخات مطر", "🌦"], 81: ["زخات مطر", "🌧"], 82: ["زخات غزيرة", "🌧"],
    95: ["عاصفة رعدية", "⛈"], 96: ["عاصفة رعدية", "⛈"], 99: ["عاصفة رعدية", "⛈"] };
  function renderWeather() {
    var w = null; try { w = JSON.parse(localStorage.getItem("islamic.weather") || "null"); } catch (e) {}
    if (!w || w.city !== S.city) { $("wTemp").textContent = "--°"; $("wDesc").textContent = "الطقس يحتاج إنترنت"; $("wMeta").textContent = "سيُحفظ آخر تحديث"; $("wIcon").textContent = "☁"; return; }
    var m = WMO[w.code] || WMO[Math.floor(w.code / 10) * 10 + 1] || ["—", "☁"];
    $("wTemp").textContent = Math.round(w.temp) + "°";
    $("wDesc").textContent = m[0]; $("wIcon").textContent = m[1];
    var age = Math.round((Date.now() - w.ts) / 60000);
    $("wMeta").textContent = "عظمى " + Math.round(w.max) + "° · صغرى " + Math.round(w.min) + "° · رطوبة " + Math.round(w.hum) + "%" +
      (age > 90 ? " · (آخر تحديث منذ " + (age > 1440 ? Math.floor(age / 1440) + " يوم" : Math.floor(age / 60) + " ساعة") + ")" : "");
  }
  function fetchWeather(manual) {
    var c = C[S.city], x = new XMLHttpRequest();
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + c[1] + "&longitude=" + c[2] +
      "&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1";
    x.open("GET", url, true); x.timeout = 15000;
    x.onload = function () {
      try {
        var j = JSON.parse(x.responseText);
        localStorage.setItem("islamic.weather", JSON.stringify({ city: S.city, ts: Date.now(), temp: j.current.temperature_2m,
          hum: j.current.relative_humidity_2m, code: j.current.weather_code, max: j.daily.temperature_2m_max[0], min: j.daily.temperature_2m_min[0] }));
        renderWeather(); if (manual) toast("تم تحديث الطقس");
      } catch (e) { if (manual) toast("تعذر قراءة بيانات الطقس"); }
    };
    x.onerror = x.ontimeout = function () { if (manual) toast("لا يوجد اتصال بالإنترنت — يُعرض آخر طقس محفوظ"); };
    try { x.send(); } catch (e) {}
  }

  /* ---------- الصوت: المصحف ---------- */
  var audio = new Audio();
  audio.preload = "auto"; audio.volume = S.quranVol / 100;
  var tries = 0, playingSurah = 0;
  function recObj() { for (var i = 0; i < R.length; i++) if (R[i].key === S.reciter) return R[i]; return R[0]; }
  function s3(n) { return ("00" + n).slice(-3); }
  function playSurah(n, keepPos) {
    var pos = keepPos ? audio.currentTime : 0;
    S.surah = n; save(); playingSurah = n; tries = 0;
    openReader(n);
    audio.src = S.audioBase + S.reciter + "/" + s3(n) + ".mp3";
    if (pos) { audio.onloadedmetadata = function () { try { audio.currentTime = pos; } catch (e) {} audio.onloadedmetadata = null; }; }
    var pr = audio.play(); if (pr && pr.catch) pr.catch(function () {});
    updatePlayer(); refreshLists();
  }
  audio.addEventListener("error", function () {
    if (!audio.src) return;
    if (tries === 0 && navigator.onLine !== false) {
      tries = 1; audio.src = recObj().server + s3(playingSurah) + ".mp3"; audio.play();
      $("pSub").textContent = "بث من الإنترنت…";
    } else {
      $("pSub").textContent = "الملف غير متوفر دون إنترنت";
      toast("الصوت غير محمَّل على الجهاز — حمّله بالسكربت (راجع README) أو اتصل بالإنترنت", 6000);
    }
  });
  audio.addEventListener("playing", function () { $("pSub").textContent = (tries ? "بث من الإنترنت" : "ملف محلي (بدون إنترنت)") + " · " + recObj().name; updatePlayer(); });
  audio.addEventListener("pause", updatePlayer);
  audio.addEventListener("play", updatePlayer);
  audio.addEventListener("ended", function () { if (playingSurah < 114) playSurah(playingSurah + 1); });
  audio.addEventListener("timeupdate", function () {
    var d = audio.duration || 0, c = audio.currentTime || 0;
    $("pFill").style.width = d ? (100 * c / d) + "%" : "0";
    $("pCur").textContent = mmss(c); $("pDur").textContent = mmss(d);
    if (S.follow && d && playingSurah === readerSurah) followAyah(c / d);
  });
  function updatePlayer() {
    $("bPlay").textContent = audio.paused ? "▶" : "⏸";
    $("bFollow").className = "pbtn f" + (S.follow ? " on" : "");
    var s = playingSurah ? Q[playingSurah - 1] : null;
    $("pTitle").textContent = s ? "سورة " + s.name : "—";
    $("nowPlaying").textContent = s && !audio.paused ? "▶ سورة " + s.name + " · " + recObj().name : "استماع وقراءة";
  }

  /* ---------- المصحف: القوائم والقراءة ---------- */
  var readerSurah = 0, ayaEls = [], ayaCum = [];
  function buildLists() {
    var h = "";
    R.forEach(function (r, i) { h += '<div class="item f" data-r="' + r.key + '">' + r.name + '</div>'; });
    $("reciterList").innerHTML = h;
    h = "";
    Q.forEach(function (s, i) { h += '<div class="item f" data-s="' + s.n + '"><span class="no">' + s.n + '</span>' + s.name + '</div>'; });
    $("surahList").innerHTML = h;
    refreshLists();
  }
  function refreshLists() {
    var i, els = $("reciterList").children;
    for (i = 0; i < els.length; i++) els[i].className = "item f" + (els[i].getAttribute("data-r") === S.reciter ? " sel" : "") + (els[i] === focusEl ? " focus" : "");
    els = $("surahList").children;
    for (i = 0; i < els.length; i++) els[i].className = "item f" + (+els[i].getAttribute("data-s") === playingSurah ? " sel" : "") + (els[i] === focusEl ? " focus" : "");
  }
  function openReader(n) {
    readerSurah = n;
    var s = Q[n - 1], h = "", tot = 0;
    $("readerTitle").textContent = "سورة " + s.name + " · " + s.type + " · " + toAr(s.a.length) + " آية";
    if (n !== 1 && n !== 9) h += '<div class="bsm">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>';
    ayaCum = [];
    s.a.forEach(function (t, i) { tot += t.length + 8; ayaCum.push(tot); h += '<span class="aya" id="ay' + i + '">' + t + ' <span class="anum">﴿' + toAr(i + 1) + '﴾</span></span> '; });
    var r = $("reader"); r.innerHTML = '<div class="reader-in">' + h + '</div>'; r.scrollTop = 0;
    ayaEls = []; for (var i = 0; i < s.a.length; i++) ayaEls.push($("ay" + i));
    curAya = -1;
  }
  var curAya = -1;
  function followAyah(frac) {
    var tot = ayaCum[ayaCum.length - 1], target = frac * tot, i = 0;
    while (i < ayaCum.length - 1 && ayaCum[i] < target) i++;
    if (i === curAya) return;
    if (curAya >= 0 && ayaEls[curAya]) ayaEls[curAya].className = "aya";
    curAya = i; ayaEls[i].className = "aya cur";
    $("reader").scrollTop = Math.max(0, ayaEls[i].offsetTop - 180);
  }

  /* ---------- الإعدادات ---------- */
  var ST = [];
  function cyc(label, key, opts, after) { ST.push({ label: label, type: "cyc", key: key, opts: opts, after: after }); }
  function build() {
    ST = [];
    cyc("المدينة", "city", C.map(function (c, i) { return [i, c[0]]; }), function () { cache.day = ""; fetchWeather(); renderWeather(); });
    var mk = []; for (var m in P.METHODS) mk.push([m, P.METHODS[m].name]);
    cyc("طريقة حساب المواقيت", "method", mk);
    cyc("وقت العصر", "asr", [["standard", "الجمهور (ظل المثل)"], ["hanafi", "الحنفي (ظل المثلين)"]]);
    cyc("نظام الساعة", "h12", [[false, "٢٤ ساعة"], [true, "١٢ ساعة"]], function () { cache.day = ""; });
    cyc("تعديل التاريخ الهجري (أيام)", "hijriOff", [[-2, "-٢"], [-1, "-١"], [0, "٠"], [1, "+١"], [2, "+٢"]], function () { lastDay = -1; });
    var mo = []; for (var i = -10; i <= 10; i++) mo.push([i, (i > 0 ? "+" : "") + i + " د"]);
    cyc("تعديل المواقيت (دقائق)", "minOff", mo, function () { cache.day = ""; });
    PR.forEach(function (p) { if (p.adhan) ST.push({ label: "أذان " + p.n, type: "adhan", key: p.k }); });
    ST.push({ label: "صوت الأذان", type: "vol", key: "adhanVol" });
    ST.push({ label: "صوت المصحف", type: "vol", key: "quranVol" });
    cyc("تتبّع الآيات أثناء التلاوة (تقريبي)", "follow", [[false, "متوقف"], [true, "مفعّل"]]);
    cyc("مصدر الصوت المحلي", "audioBase", [["audio/", "داخل التطبيق"], ["file:///tmp/usb/sda/sda1/islamic-audio/", "USB (sda1)"], ["file:///tmp/usb/sdb/sdb1/islamic-audio/", "USB (sdb1)"]]);
    ST.push({ label: "اختبار الأذان", type: "act", fn: function () { startAdhan({ k: "dhuhr", n: "الظهر" }, true); } });
    ST.push({ label: "تحديث الطقس الآن", type: "act", fn: function () { fetchWeather(true); } });
    ST.push({ label: "رجوع للرئيسية", type: "act", fn: function () { show("home"); } });
    var h = "";
    ST.forEach(function (s, i) { h += '<div class="s-row f' + (s.type === "act" ? " act" : "") + '" data-i="' + i + '"><span>' + s.label + '</span><span class="v"></span></div>'; });
    $("settingsList").innerHTML = h;
    ST.forEach(function (s, i) { stText(i); });
  }
  function stText(i) {
    var s = ST[i], el = $("settingsList").children[i], v = el.lastChild;
    if (s.type === "cyc") { var o = s.opts[optIdx(s)]; v.textContent = o[1]; }
    else if (s.type === "adhan") v.textContent = S.adhan[s.key] ? "مفعّل" : "متوقف";
    else if (s.type === "vol") v.textContent = toAr(S[s.key]) + "٪";
    else v.textContent = "";
  }
  function optIdx(s) { for (var i = 0; i < s.opts.length; i++) if (s.opts[i][0] === S[s.key]) return i; return 0; }
  function stChange(i, dir) {
    var s = ST[i];
    if (s.type === "cyc") { var n = (optIdx(s) + dir + s.opts.length) % s.opts.length; S[s.key] = s.opts[n][0]; save(); stText(i); if (s.after) s.after(); }
    else if (s.type === "adhan") { S.adhan[s.key] = !S.adhan[s.key]; save(); stText(i); cache.day = ""; }
    else if (s.type === "vol") {
      S[s.key] = Math.max(0, Math.min(100, S[s.key] + dir * 10)); save(); stText(i);
      audio.volume = S.quranVol / 100; if (adhanAudio) adhanAudio.volume = S.adhanVol / 100;
    } else if (s.type === "act" && dir === 0) s.fn();
  }

  /* ---------- التطبيقات ---------- */
  var APPS = [
    ["▶", "يوتيوب", "youtube.leanback.v4"], ["🎬", "نتفليكس", "netflix"], ["🎞", "برايم فيديو", "amazon"], ["✨", "ديزني+", "com.disney.disneyplus-prod"],
    ["📡", "القنوات المباشرة", "com.webos.app.livetv"], ["🔌", "HDMI 1", "com.webos.app.hdmi1"], ["🔌", "HDMI 2", "com.webos.app.hdmi2"],
    ["🔌", "HDMI 3", "com.webos.app.hdmi3"], ["🌐", "المتصفح", "com.webos.app.browser"], ["🛒", "متجر LG", "com.webos.app.discovery"],
    ["⚙", "إعدادات التلفاز", "com.palm.app.settings"], ["🏠", "الشاشة الأصلية", "com.webos.app.home"]
  ];
  function buildApps() {
    var h = ""; APPS.forEach(function (a, i) { h += '<div class="app f" data-a="' + i + '"><span class="ai">' + a[0] + '</span>' + a[1] + '</div>'; });
    $("appGrid").innerHTML = h;
  }
  function launch(id) {
    try {
      var b = new PalmServiceBridge();
      b.onservicecallback = function (r) { try { if (JSON.parse(r).returnValue === false) toast("التطبيق غير مثبت على هذا التلفاز"); } catch (e) {} };
      b.call("luna://com.webos.applicationManager/launch", JSON.stringify({ id: id }));
    } catch (e) { toast("فتح التطبيقات يعمل على تلفاز webOS فقط"); }
  }

  /* ---------- الشاشات والتركيز ---------- */
  var cur = "home", focusEl = null;
  function show(name) {
    cur = name;
    ["home", "quran", "settings", "apps"].forEach(function (n) { $(n).className = "screen" + (n === name ? " on" : ""); });
    var f = null;
    if (name === "home") f = $("tileQuran");
    else if (name === "quran") f = $("surahList").children[(playingSurah || S.surah) - 1];
    else if (name === "settings") f = $("settingsList").children[0];
    else if (name === "apps") f = $("appGrid").children[0];
    setFocus(f);
    if (name === "settings") { $("settingsList").scrollTop = 0; }
  }
  function setFocus(el) {
    if (focusEl) focusEl.className = focusEl.className.replace(/\s*\bfocus\b/g, "");
    focusEl = el;
    if (!el) return;
    el.className += " focus";
    var p = el.parentNode;
    if (p && (p.className.indexOf("list") >= 0 || p.id === "settingsList")) p.scrollTop = Math.max(0, el.offsetTop - p.clientHeight / 2 + el.offsetHeight / 2);
  }
  function focusables() {
    var root = adhanOn ? $("adhan") : $(cur), all = root.querySelectorAll(".f"), out = [], i, r;
    for (i = 0; i < all.length; i++) { r = all[i].getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push(all[i]); }
    return out;
  }
  function move(dir) {
    if (!focusEl) { var f = focusables(); if (f.length) setFocus(f[0]); return; }
    var a = focusEl.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = 1e12, c = focusables(), i;
    for (i = 0; i < c.length; i++) {
      if (c[i] === focusEl) continue;
      var b = c[i].getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay, pri, sec;
      if (dir === "left")  { if (dx > -2) continue; pri = -dx; sec = Math.abs(dy); }
      if (dir === "right") { if (dx < 2) continue; pri = dx; sec = Math.abs(dy); }
      if (dir === "up")    { if (dy > -2) continue; pri = -dy; sec = Math.abs(dx); }
      if (dir === "down")  { if (dy < 2) continue; pri = dy; sec = Math.abs(dx); }
      var sc = pri + sec * 3; if (sc < bs) { bs = sc; best = c[i]; }
    }
    if (best) setFocus(best);
  }
  function activate(el) {
    el = el || focusEl; if (!el) return;
    var id = el.id, d;
    if (adhanOn) { stopAdhan(); return; }
    if ((d = el.getAttribute("data-go"))) { show(d); return; }
    if ((d = el.getAttribute("data-r"))) { S.reciter = d; save(); refreshLists(); if (playingSurah) playSurah(playingSurah, true); else toast("القارئ: " + recObj().name); return; }
    if ((d = el.getAttribute("data-s"))) { playSurah(+d); return; }
    if ((d = el.getAttribute("data-a"))) { launch(APPS[+d][2]); return; }
    if ((d = el.getAttribute("data-i"))) { stChange(+d, 0); return; }
    if (id === "bPlay") { if (!playingSurah) playSurah(S.surah); else if (audio.paused) audio.play(); else audio.pause(); }
    else if (id === "bPrev" && playingSurah > 1) playSurah(playingSurah - 1);
    else if (id === "bNext" && playingSurah && playingSurah < 114) playSurah(playingSurah + 1);
    else if (id === "bBack") audio.currentTime = Math.max(0, audio.currentTime - 15);
    else if (id === "bFwd") audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
    else if (id === "bFollow") { S.follow = !S.follow; save(); updatePlayer(); if (!S.follow && curAya >= 0) { ayaEls[curAya].className = "aya"; curAya = -1; } }
    else if (id === "adStop") stopAdhan();
  }

  document.addEventListener("keydown", function (e) {
    var k = e.keyCode, used = true, r = $("reader");
    if (adhanOn) { if (k === 461 || k === 8 || k === 27 || k === 13) stopAdhan(); e.preventDefault(); return; }
    switch (k) {
      case 37: case 39:
        if (focusEl && focusEl.getAttribute("data-i")) stChange(+focusEl.getAttribute("data-i"), k === 37 ? 1 : -1);   // RTL: يسار = التالي
        else if (focusEl && (focusEl.id === "bBack" || focusEl.id === "bFwd") && false) {}
        else move(k === 37 ? "left" : "right");
        break;
      case 38: case 40:
        if (focusEl === r && ((k === 40 && r.scrollTop + r.clientHeight < r.scrollHeight - 2) || (k === 38 && r.scrollTop > 0))) r.scrollTop += (k === 40 ? 160 : -160);
        else move(k === 38 ? "up" : "down");
        break;
      case 13: activate(); break;
      case 461: case 8: case 27: if (cur !== "home") show("home"); break;
      case 415: if (!playingSurah) playSurah(S.surah); else audio.play(); break;
      case 19: audio.pause(); break;
      case 413: audio.pause(); audio.currentTime = 0; break;
      case 417: audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15); break;
      case 412: audio.currentTime = Math.max(0, audio.currentTime - 15); break;
      case 403: show("home"); break;       // أحمر
      case 404: show("quran"); break;      // أخضر
      case 405: show("apps"); break;       // أصفر
      case 406: show("settings"); break;   // أزرق
      default: used = false;
    }
    if (used) e.preventDefault();
  });
  // دعم المؤشر (Magic Remote)
  document.addEventListener("mouseover", function (e) { var t = e.target; while (t && t !== document) { if (t.className && /\bf\b/.test(t.className)) { if (t !== focusEl) setFocus(t); return; } t = t.parentNode; } });
  document.addEventListener("click", function (e) { var t = e.target; while (t && t !== document) { if (t.className && /\bf\b/.test(t.className)) { setFocus(t); activate(t); return; } t = t.parentNode; } });

  /* ---------- تشغيل ---------- */
  buildLists(); build(); buildApps(); renderWeather();
  if (S.surah) openReader(S.surah);
  updatePlayer();
  tick(); setInterval(tick, 1000);
  fetchWeather(); setInterval(function () { if (navigator.onLine !== false) fetchWeather(); }, 30 * 60 * 1000);
  show("home");
})();
