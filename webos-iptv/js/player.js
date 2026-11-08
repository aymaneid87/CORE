/* مشغّل الفيديو: بث مباشر + أفلام + حلقات */
(function (g) {
  "use strict";
  var UI = g.UI, $ = UI.$, esc = UI.esc, vid = $("vid"), root = $("player"), stage = $("stage");
  var P = g.Player = { on: false, spec: null, hls: null, hideT: 0, saveT: 0, tmo: 0, tried: false, listOpen: false, plist: null, aspIdx: 0, fmt: "m3u8" };
  var ASP = [["contain", "نسبة العرض: أصلية"], ["cover", "نسبة العرض: ملء الشاشة"], ["fill", "نسبة العرض: تمديد"]];

  function msg(t, sub) { var m = $("pmsg"); if (!t) { m.style.display = "none"; return; } m.innerHTML = '<div class="box">' + esc(t) + (sub ? '<small>' + esc(sub) + '</small>' : "") + '</div>'; m.style.display = "block"; }
  function spin(on) { $("spin").style.display = on ? "block" : "none"; }

  P.open = function (spec) {
    this.spec = spec; this.fmt = Store.settings.fmt; this.aspIdx = Math.max(0, ["contain", "cover", "fill"].indexOf(Store.settings.aspect));
    vid.style.objectFit = ASP[this.aspIdx][0];
    if (!this.on) {
      this.on = true; stage.className = "playing"; root.className = "on";
      var s = g.App.cur; if (s) $(s.id).className = "screen";
    }
    if (spec.kind === "live") this.channel(spec.idx, true); else this.start(spec.url, spec.item);
  };

  P.channel = function (i, first) {
    var sp = this.spec, ch = sp.list[i]; if (!ch) return;
    sp.idx = i; sp.title = ch.name; sp.item = { t: "live", id: ch.id, name: ch.name, icon: ch.icon, url: ch.url, cat: ch.cat }; sp.ch = ch; g.App.lastLive = ch.id;
    this.start(Api.liveUrl(ch, this.fmt), sp.item);
    this.drawInfo(null); this.loadEpg();
  };

  P.start = function (url, item) {
    var sp = this.spec; this.tried = false; this.curUrl = url; clearTimeout(this.tmo);
    if (item) Store.addRecent(item);
    this.destroy(); msg(""); spin(true);
    this.updateTop(); if (sp.kind !== "live") this.drawInfo();
    this.showUI();
    var self = this;
    this.tmo = setTimeout(function () { self.fail("لا يستجيب الخادم"); }, 30000);
    var native = vid.canPlayType && vid.canPlayType("application/vnd.apple.mpegurl");
    if (/\.m3u8(\?|$)/i.test(url) && !native && g.Hls && g.Hls.isSupported()) {
      this.hls = new g.Hls({ maxBufferLength: 30 });
      this.hls.on(g.Hls.Events.ERROR, function (ev, d) { if (d.fatal) self.fail("تعذر تشغيل البث"); });
      this.hls.loadSource(url); this.hls.attachMedia(vid);
    } else vid.src = url;
    try { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  };
  P.destroy = function () {
    if (this.hls) { try { this.hls.destroy(); } catch (e) {} this.hls = null; }
    try { vid.pause(); vid.removeAttribute("src"); vid.load(); } catch (e) {}
  };

  P.fail = function (why) {
    clearTimeout(this.tmo); spin(false);
    var sp = this.spec;
    if (!this.tried && sp.kind === "live" && !sp.ch.url) { // جرّب الصيغة الأخرى تلقائيًا
      this.tried = true; this.fmt = this.fmt === "m3u8" ? "ts" : "m3u8";
      var u = Api.liveUrl(sp.ch, this.fmt), self = this, native = vid.canPlayType("application/vnd.apple.mpegurl");
      this.destroy(); spin(true); msg("");
      this.tmo = setTimeout(function () { self.fail("لا يستجيب الخادم"); }, 30000);
      if (/\.m3u8/i.test(u) && !native && g.Hls && g.Hls.isSupported()) { this.hls = new g.Hls(); var s2 = this; this.hls.on(g.Hls.Events.ERROR, function (e, d) { if (d.fatal) s2.fail("تعذر تشغيل البث"); }); this.hls.loadSource(u); this.hls.attachMedia(vid); }
      else vid.src = u;
      try { vid.play(); } catch (e) {}
      return;
    }
    this.failed = true; msg("تعذر التشغيل", why + " — اضغط OK لإعادة المحاولة · Back للرجوع"); this.showUI(true);
  };

  vid.addEventListener("playing", function () { clearTimeout(P.tmo); spin(false); msg(""); P.failed = false; P.showUI(); });
  vid.addEventListener("waiting", function () { if (P.on) spin(true); });
  vid.addEventListener("canplay", function () { spin(false); });
  vid.addEventListener("error", function () { if (P.on && vid.getAttribute("src")) P.fail("خطأ في الملف أو الاتصال"); });
  vid.addEventListener("loadedmetadata", function () {
    var sp = P.spec; if (sp && sp.startAt > 20 && sp.kind !== "live" && !sp.resumed) {
      sp.resumed = true; try { vid.currentTime = sp.startAt; UI.toast("تم الاستئناف من " + UI.mmss(sp.startAt)); } catch (e) {}
    }
  });
  vid.addEventListener("timeupdate", function () {
    var sp = P.spec; if (!P.on || !sp || sp.kind === "live") return;
    var d = vid.duration || 0, c = vid.currentTime || 0, f = $("skf"), t = $("skt");
    if (f) { f.style.width = d ? (100 * c / d) + "%" : "0"; t.innerHTML = '<span>' + UI.mmss(c) + '</span><span>' + UI.mmss(d) + '</span>'; }
    var now = Date.now(); if (now - P.saveT > 5000) { P.saveT = now; if (sp.key && c > 5) Store.setResume(sp.key, c, d); }
  });
  vid.addEventListener("ended", function () {
    var sp = P.spec; if (!sp || sp.kind === "live") return;
    Store.setResume(sp.key, vid.duration || 0, vid.duration || 0);
    if (sp.kind === "ep" && sp.list && sp.idx + 1 < sp.list.length) { UI.toast("الحلقة التالية…"); g.App.playEpisode(sp.series, sp.season, sp.list, sp.idx + 1); }
    else P.exit();
  });

  /* ----- واجهة المشغّل ----- */
  P.updateTop = function () { var sp = this.spec; $("plTitle").textContent = sp.title || ""; $("plSub").textContent = sp.sub || (sp.kind === "live" ? "بث مباشر" : ""); };
  P.showUI = function (stay) {
    var self = this; root.className = "on ui"; clearTimeout(this.hideT);
    if (!stay) this.hideT = setTimeout(function () { if (!self.listOpen && !self.failed && !(self.spec.kind !== "live" && vid.paused)) root.className = "on"; }, 5000);
  };
  P.drawInfo = function (epg) {
    var sp = this.spec, h = "";
    if (sp.kind === "live") {
      var ch = sp.ch || {}, now = Date.now() / 1000, cur = null, nxt = null;
      (epg || this.epg || []).forEach(function (e) { if (e.start <= now && e.stop > now) cur = e; else if (e.start > now && !nxt) nxt = e; });
      h = '<div class="nn"><div class="nrow"><div class="ch" style="' + UI.cssUrl(ch.icon) + '"></div><div class="ct"><div class="t1">' + esc(ch.name || "") + '</div>' +
        '<div class="t2">' + (cur ? "الآن · " + UI.hm(cur.start) + " " + esc(cur.title) : "لا يوجد دليل برامج") + '</div>' +
        '<div class="t3">' + (nxt ? "التالي · " + UI.hm(nxt.start) + " " + esc(nxt.title) : "") + '</div>' +
        (cur ? '<div class="seek"><i style="width:' + Math.min(100, 100 * (now - cur.start) / Math.max(1, cur.stop - cur.start)) + '%"></i></div>' : "") + '</div></div></div>';
    } else h = '<div class="nn"><div class="seek"><i id="skf"></i></div><div class="tm" id="skt"><span>0:00</span><span>0:00</span></div></div>';
    $("plBot").innerHTML = h;
  };
  P.loadEpg = function () {
    var self = this, ch = this.spec.ch; this.epg = null;
    Api.epg(ch).then(function (e) { if (self.spec && self.spec.ch === ch) { self.epg = e; self.drawInfo(e); } });
  };

  P.openList = function () {
    var sp = this.spec; if (sp.kind !== "live" || !sp.list || sp.list.length < 2) { this.showUI(); return; }
    this.listOpen = true; $("plist").className = "on"; $("plistT").textContent = "القنوات";
    if (!this.plist) this.plist = new UI.VList($("plistL"), { rows: 11, rowH: 78, row: function (c, i) {
      return '<span class="rno">' + (c.num || i + 1) + '</span><span class="rlogo" style="' + UI.cssUrl(c.icon) + '"></span><span class="rt1">' + esc(c.name) + '</span>'; } });
    this.plist.set(sp.list, sp.idx); this.plist.setActive(true); this.showUI(true);
  };
  P.closeList = function () { this.listOpen = false; $("plist").className = ""; this.showUI(); };

  P.exit = function () {
    var sp = this.spec; clearTimeout(this.tmo); clearTimeout(this.hideT);
    if (sp && sp.kind !== "live" && sp.key && vid.currentTime > 5) Store.setResume(sp.key, vid.currentTime, vid.duration || 0);
    this.destroy(); this.on = false; this.listOpen = false; this.failed = false; $("plist").className = ""; msg(""); spin(false);
    stage.className = ""; root.className = "";
    var L = g.Screens.live; if (sp && sp.kind === "live" && L.chl && sp.list === L.chl.items) L.chl.idx = sp.idx;
    g.App.afterPlayer();
  };

  P.key = function (k) {
    var sp = this.spec, live = sp.kind === "live";
    if (k === 461 || k === 8 || k === 27) { if (this.listOpen) this.closeList(); else this.exit(); return true; }
    if (k === 413 || k === 403) { this.exit(); return true; }
    if (this.failed && k === 13) { this.failed = false; this.tried = false; msg(""); if (live) this.channel(sp.idx); else this.start(sp.url, null); return true; }
    if (this.listOpen) {
      if (k === 38 || k === 40) { this.plist.move(k === 38 ? -1 : 1); return true; }
      if (k === 13) { this.channel(this.plist.idx); this.closeList(); return true; }
      if (k === 39) { this.closeList(); return true; }
      return true;
    }
    if (k === 404) { this.aspIdx = (this.aspIdx + 1) % 3; vid.style.objectFit = ASP[this.aspIdx][0]; UI.toast(ASP[this.aspIdx][1]); return true; }
    if (live) {
      if (k === 38 || k === 428) { this.channel((sp.idx - 1 + sp.list.length) % sp.list.length); return true; }
      if (k === 40 || k === 427) { this.channel((sp.idx + 1) % sp.list.length); return true; }
      if (k === 13) { if (root.className.indexOf("ui") < 0) this.showUI(); else this.openList(); return true; }
      if (k === 37) { this.openList(); return true; }
      if (k === 405) { var ch = sp.ch; UI.toast(Store.toggleFav({ t: "live", id: ch.id, name: ch.name, icon: ch.icon, url: ch.url, cat: ch.cat }) ? "أُضيفت للمفضلة" : "أُزيلت من المفضلة"); return true; }
      if (k === 406) { this.fmt = this.fmt === "m3u8" ? "ts" : "m3u8"; UI.toast("الصيغة: " + (this.fmt === "ts" ? "MPEG-TS" : "HLS")); this.channel(sp.idx); return true; }
      return false;
    }
    // أفلام وحلقات
    if (k === 37 || k === 39 || k === 412 || k === 417) {
      var step = (k === 412 || k === 417) ? 30 : 10; vid.currentTime = Math.max(0, Math.min(vid.duration || 1e9, vid.currentTime + ((k === 37 || k === 412) ? -step : step))); this.showUI(); return true;
    }
    if (k === 13 || k === 415 || k === 19) { if (vid.paused) { vid.play(); } else { vid.pause(); } this.showUI(vid.paused); return true; }
    if (k === 38 || k === 40) { this.showUI(); return true; }
    return false;
  };
  vid.addEventListener("pause", function () { if (P.on && P.spec.kind !== "live") P.showUI(true); });
  vid.addEventListener("play", function () { if (P.on) P.showUI(); });
})(window);
