/* شاشات التصفح: البث المباشر، الأفلام/المسلسلات، التفاصيل، المفضلة، البحث */
(function (g) {
  "use strict";
  var UI = g.UI, $ = UI.$, esc = UI.esc, App = g.App;
  var ADULT = /(xxx|adult|porn|18\s?\+|sex|للكبار|بالغين)/i;
  function hidden(name) { return Store.settings.hideAdult && ADULT.test(name || ""); }
  function ratingTxt(r) { r = parseFloat(r); return r > 0 ? "★ " + r.toFixed(1) : ""; }
  function errMsg(e) { return (e && e.message) || "حدث خطأ"; }

  /* ================= البث المباشر ================= */
  var Live = {
    id: "s-live", pane: 0, loaded: false, catTimer: 0, epgTimer: 0, hiddenCats: {},
    reset: function () { this.loaded = false; },
    enter: function (p, back) {
      if (back && this.loaded) { this.setPane(this.pane); return; }
      var self = this, favN = Store.favs("live").length;
      $(this.id).innerHTML = UI.top('<div class="crumb">البث <em>المباشر</em></div>', "") +
        '<div style="display:-webkit-flex;display:flex">' +
        '<div class="pane" style="width:440px;margin-left:28px"><div id="lv_cats"></div></div>' +
        '<div class="pane" style="width:780px;margin-left:28px"><div id="lv_ch"></div></div>' +
        '<div class="pane prev" style="-webkit-flex:1;flex:1;height:858px" id="lv_prev"></div></div>' +
        '<div class="hint"><b>OK</b> تشغيل · <b>الأصفر</b> مفضلة · ◀ ▶ تنقّل بين القوائم</div>';
      this.cats = new UI.VList($("lv_cats"), { rows: 11, rowH: 76, empty: "جارٍ التحميل…", row: function (c) { return '<span class="rt1">' + esc(c.name) + '</span>'; } });
      this.chl = new UI.VList($("lv_ch"), { rows: 11, rowH: 76, empty: "اختر فئة", row: function (c, i) {
        return '<span class="rno">' + (c.num || i + 1) + '</span><span class="rlogo" style="' + UI.cssUrl(c.icon) + '"></span><span class="rt1">' + esc(c.name) + '</span>' + (Store.isFav("live", c.id) ? '<span class="star">★</span>' : ""); } });
      this.cats.set([], 0); this.chl.set([], 0); this.preview(null); this.pane = 0; this.setPane(0); UI.tickClock();
      Api.cats("live").then(function (cs) {
        self.hiddenCats = {};
        cs = cs.filter(function (c) { if (hidden(c.name)) { self.hiddenCats[c.id] = 1; return false; } return true; });
        var v = [{ id: "__fav", name: "★  المفضلة" }, { id: "__rec", name: "آخر ما شاهدته" }, { id: "__all", name: "كل القنوات" }];
        self.cats.set(v.concat(cs), favN ? 0 : 3); self.loaded = true; self.pickCat(true);
      }).catch(function (e) { self.cats.root.innerHTML = '<div class="none">' + esc(errMsg(e)) + '</div>'; });
    },
    pickCat: function (focusCh) {
      var self = this, c = this.cats.cur(), p; if (!c) return;
      this.curCat = c; this.chl.root.innerHTML = '<div class="loading">جارٍ تحميل القنوات…</div>';
      if (c.id === "__fav") p = Promise.resolve(Store.favs("live"));
      else if (c.id === "__rec") p = Promise.resolve(Store.recents().filter(function (r) { return r.t === "live"; }));
      else if (c.id === "__all") p = Api.items("live").then(function (a) { return a.filter(function (x) { return !self.hiddenCats[x.cat]; }); });
      else p = Api.items("live", c.id);
      p.then(function (items) {
        if (self.curCat !== c) return;
        self.chl.empty = 0; self.chl.o.empty = c.id === "__fav" ? "لا توجد قنوات مفضلة — اضغط الأصفر على أي قناة" : "لا توجد قنوات";
        var last = App.lastLive, ix = 0;
        if (last) for (var i = 0; i < items.length; i++) if (String(items[i].id) === String(last)) { ix = i; break; }
        self.chl.set(items, ix); self.onChange();
        if (focusCh) self.setPane(self.pane);
      }).catch(function (e) { self.chl.root.innerHTML = '<div class="none">' + esc(errMsg(e)) + '</div>'; });
    },
    setPane: function (p) { this.pane = p; this.cats.setActive(p === 0); this.chl.setActive(p === 1); },
    onChange: function () {
      var self = this, ch = this.chl.cur(); clearTimeout(this.epgTimer); this.preview(ch, null);
      if (ch) this.epgTimer = setTimeout(function () { Api.epg(ch).then(function (e) { if (self.chl.cur() === ch) self.preview(ch, e); }); }, 350);
    },
    preview: function (ch, epg) {
      var h = "";
      if (!ch) h = '<div class="pn" style="opacity:.4;margin-top:200px">اختر قناة</div>';
      else {
        h = '<div class="pl" style="' + UI.cssUrl(ch.icon) + '"></div><div class="pn">' + esc(ch.name) + '</div>';
        if (epg && epg.length) {
          var now = Date.now() / 1000;
          h += '<div class="epg">';
          epg.slice(0, 2).forEach(function (e, i) {
            var on = e.start <= now && e.stop > now;
            h += '<div class="e"><b>' + (on ? "الآن" : "التالي") + " · " + UI.hm(e.start) + " – " + UI.hm(e.stop) + '</b><span>' + esc(e.title) + '</span>' +
              (on ? '<div class="pbar"><i style="width:' + Math.max(0, Math.min(100, 100 * (now - e.start) / Math.max(1, e.stop - e.start))) + '%"></i></div>' : "") + '</div>';
          });
          h += '</div>';
        } else if (epg) h += '<div class="pc" style="margin-top:30px">لا يوجد دليل برامج لهذه القناة</div>';
      }
      $("lv_prev").innerHTML = h;
    },
    key: function (k) {
      var self = this;
      if (this.pane === 0) {
        if (k === 38 || k === 40) { if (this.cats.move(k === 38 ? -1 : 1)) { clearTimeout(this.catTimer); this.catTimer = setTimeout(function () { self.pickCat(); }, 450); } return true; }
        if (k === 13 || k === 37) { clearTimeout(this.catTimer); this.pickCat(true); if (this.chl.items.length || k === 13) this.setPane(1); return true; }
      } else {
        if (k === 38 || k === 40) { if (this.chl.move(k === 38 ? -1 : 1)) this.onChange(); return true; }
        if (k === 427 || k === 428) { if (this.chl.move(k === 427 ? 8 : -8)) this.onChange(); return true; }
        if (k === 39) { this.setPane(0); return true; }
        if (k === 13) { var ch = this.chl.cur(); if (ch) App.playLive(ch, this.chl.items, this.chl.idx); return true; }
        if (k === 405) { var c = this.chl.cur(); if (c) { c.t = "live"; UI.toast(Store.toggleFav(c) ? "أُضيفت للمفضلة" : "أُزيلت من المفضلة");
            if (this.curCat.id === "__fav") this.pickCat(); else this.chl.render(); } return true; }
      }
      return false;
    }
  };

  /* ================= الأفلام / المسلسلات ================= */
  var Vod = {
    id: "s-vod", pane: 0, type: "", st: {},
    reset: function () { this.st = {}; },
    enter: function (p, back) {
      var self = this; if (p && p.type) this.type = p.type;
      var T = this.type, title = T === "vod" ? 'الأ<em>فلام</em>' : 'المس<em>لسلات</em>';
      var s = this.st[T];
      $(this.id).innerHTML = UI.top('<div class="crumb">' + title + '</div>', "") +
        '<div style="display:-webkit-flex;display:flex"><div class="pane" style="width:430px;margin-left:28px"><div id="vd_cats"></div></div>' +
        '<div class="pane" style="-webkit-flex:1;flex:1;padding:20px 18px 0 0"><div id="vd_grid"></div></div></div>' +
        '<div class="hint"><b>OK</b> فتح · <b>الأصفر</b> مفضلة · ◀ ▶ تنقّل</div>';
      this.cats = new UI.VList($("vd_cats"), { rows: 11, rowH: 76, empty: "جارٍ التحميل…", row: function (c) { return '<span class="rt1">' + esc(c.name) + '</span>'; } });
      this.grid = new UI.Grid($("vd_grid"), { cols: 5, rows: 2, cw: 236, ch: 388, gx: 24, gy: 18, empty: "اختر فئة", cell: function (m) {
        var r = ratingTxt(m.rating);
        return '<div class="poster" style="' + UI.cssUrl(m.icon) + '"><div class="ph">' + esc((m.name || "?").replace(/^[^\wء-ي]+/, "").charAt(0)) + '</div>' + (r ? '<span class="rate">' + r + '</span>' : "") +
          (Store.isFav(m.t, m.id) ? '<span class="favm">★</span>' : "") + '</div><div class="cn">' + esc(m.name) + '</div>'; } });
      this.cats.set([], 0); this.grid.set([], 0); UI.tickClock();
      if (s && back) { this.curCat = s.curCat; this.cats.set(s.cats, s.ci); this.grid.items = s.items; this.grid.idx = s.gi; this.grid.top = s.gt; this.grid.render(); this.setPane(s.pane); return; }
      this.pane = 0; this.setPane(0);
      Api.cats(T).then(function (cs) {
        cs = cs.filter(function (c) { return !hidden(c.name); });
        var v = [{ id: "__fav", name: "★  المفضلة" }, { id: "__rec", name: "آخر ما شاهدته" }].concat(cs);
        self.cats.set(v, cs.length ? 2 : 0); self.pickCat(true);
      }).catch(function (e) { self.cats.root.innerHTML = '<div class="none">' + esc(errMsg(e)) + '</div>'; });
    },
    pickCat: function (focus) {
      var self = this, c = this.cats.cur(), T = this.type, p; if (!c) return;
      this.curCat = c; this.grid.root.innerHTML = '<div class="loading">جارٍ التحميل…</div>';
      if (c.id === "__fav") p = Promise.resolve(Store.favs(T));
      else if (c.id === "__rec") p = Promise.resolve(Store.recents().filter(function (r) { return r.t === T; }));
      else p = Api.items(T, c.id);
      p.then(function (items) {
        if (self.curCat !== c) return;
        self.grid.o.empty = c.id === "__fav" ? "لا توجد عناصر مفضلة بعد" : "لا توجد عناصر";
        self.grid.set(items, 0); if (focus) self.setPane(self.pane);
      }).catch(function (e) { self.grid.root.innerHTML = '<div class="none">' + esc(errMsg(e)) + '</div>'; });
    },
    setPane: function (p) { this.pane = p; this.cats.setActive(p === 0); this.grid.setActive(p === 1); },
    leave: function () {
      if (this.cats) this.st[this.type] = { curCat: this.curCat, cats: this.cats.items, ci: this.cats.idx, items: this.grid.items, gi: this.grid.idx, gt: this.grid.top, pane: this.pane };
    },
    key: function (k) {
      var self = this, G = this.grid;
      if (this.pane === 0) {
        if (k === 38 || k === 40) { if (this.cats.move(k === 38 ? -1 : 1)) { clearTimeout(this.ct); this.ct = setTimeout(function () { self.pickCat(); }, 450); } return true; }
        if (k === 13 || k === 37) { clearTimeout(this.ct); this.pickCat(true); this.setPane(1); return true; }
      } else {
        if (k === 37) { G.move(1); return true; }
        if (k === 39) { if (G.col() === 0) this.setPane(0); else G.move(-1); return true; }
        if (k === 38) { G.move(-G.o.cols); return true; }
        if (k === 40) { G.move(G.o.cols); return true; }
        if (k === 13) { var m = G.cur(); if (m) App.go("detail", { item: m }); return true; }
        if (k === 405) { var c = G.cur(); if (c) { UI.toast(Store.toggleFav(c) ? "أُضيف للمفضلة" : "أُزيل من المفضلة"); if (this.curCat.id === "__fav") this.pickCat(); else G.render(); } return true; }
      }
      return false;
    }
  };

  /* ================= التفاصيل ================= */
  var Detail = {
    id: "s-detail", item: null, pane: 1, btn: 0,
    enter: function (p, back) {
      if (back && this.item && !p) { this.render(); return; }
      this.item = p.item; this.info = null; this.eps = {}; this.season = null; this.pane = 1; this.btn = 0;
      var self = this, it = this.item;
      this.render();
      (it.t === "series" ? Api.seriesInfo(it.id) : Api.vodInfo(it.id)).then(function (j) {
        if (self.item !== it) return;
        self.info = j || {};
        if (it.t === "series") {
          var seasons = Object.keys(j.episodes || {}).sort(function (a, b) { return a - b; });
          self.eps = j.episodes || {}; self.seasons = seasons;
          var rec = Store.recents().filter(function (r) { return r.sid === it.id; })[0], si = 0;
          if (rec && rec.season) si = Math.max(0, seasons.indexOf(String(rec.season)));
          self.season = seasons[si]; self.si = si;
        } else if (j && j.movie_data && j.movie_data.container_extension) it.ext = j.movie_data.container_extension;
        if (App.cur === self) self.render();
      }).catch(function (e) { self.error = errMsg(e); if (App.cur === self) self.render(); });
    },
    render: function () {
      var it = this.item, inf = (this.info && this.info.info) || {}, self = this, h, meta = "", plot = inf.plot || inf.description || it.plot || "";
      var img = inf.movie_image || inf.cover || it.icon;
      var yr = inf.releasedate || inf.releaseDate || it.year, gen = inf.genre, dur = inf.duration || "", rt = ratingTxt(inf.rating_5based || inf.rating || it.rating);
      [yr && String(yr).slice(0, 4), gen, dur, rt].forEach(function (m) { if (m) meta += "<span>" + esc(m) + "</span>"; });
      h = UI.top('<div class="crumb">' + esc(it.t === "series" ? "المسلسل" : "الفيلم") + '</div>', "");
      h += '<div class="det"><div class="dp" style="' + UI.cssUrl(img) + '"></div><div class="dt"><h1>' + esc(it.name) + '</h1><div class="meta">' + meta + '</div>' +
        '<div class="plot" style="' + (it.t === "series" ? "max-height:120px" : "") + '">' + esc(plot || (this.info || this.error ? "" : "جارٍ تحميل التفاصيل…")) + (this.error ? '<span style="color:#ff9c80">' + esc(this.error) + '</span>' : "") + '</div>';
      if (inf.cast) h += '<div class="kv">البطولة: ' + esc(String(inf.cast).slice(0, 140)) + '</div>';
      if (inf.director) h += '<div class="kv">الإخراج: ' + esc(inf.director) + '</div>';
      if (it.t === "vod") {
        var rs = Store.getResume("vod:" + it.id), fav = Store.isFav("vod", it.id);
        this.btns = [{ id: "play", t: rs ? "استئناف من " + UI.mmss(rs.pos) : "تشغيل" }].concat(rs ? [{ id: "restart", t: "من البداية" }] : []).concat([{ id: "fav", t: fav ? "★ في المفضلة" : "☆ للمفضلة" }]);
        h += '<div class="btns">';
        this.btns.forEach(function (b, i) { h += '<span class="btn' + (i === self.btn ? " foc" : "") + (b.id === "play" ? "" : " ghost") + '">' + b.t + '</span>'; });
        h += '</div>';
      } else h += '<div class="eps"><div class="pane" style="width:280px;margin-left:22px"><div id="dt_s"></div></div><div class="pane" style="-webkit-flex:1;flex:1"><div id="dt_e"></div></div></div>';
      h += '</div></div><div class="hint">' + (it.t === "series" ? "<b>OK</b> تشغيل الحلقة · <b>الأصفر</b> مفضلة · " : "") + 'Back رجوع</div>';
      $(this.id).innerHTML = h; UI.tickClock();
      if (it.t === "series") {
        this.sl = new UI.VList($("dt_s"), { rows: 5, rowH: 78, empty: this.info ? "لا مواسم" : "…", row: function (s) { return '<span class="rt1">الموسم ' + UI.toAr(s) + '</span>'; } });
        this.el = new UI.VList($("dt_e"), { rows: 5, rowH: 78, empty: this.info ? "لا حلقات" : "جارٍ التحميل…", row: function (e) {
          var rs = Store.getResume("ep:" + e.id);
          return '<span class="rno">' + UI.toAr(e.episode_num || "") + '</span><span class="rt1">' + esc(e.title || ("الحلقة " + e.episode_num)) + (rs ? "<small>▶ " + UI.mmss(rs.pos) + "</small>" : "") + '</span>'; } });
        this.sl.set(this.seasons || [], this.si || 0); this.el.set(this.eps[this.season] || [], 0);
        this.sl.setActive(this.pane === 0); this.el.setActive(this.pane === 1);
      }
    },
    play: function (restart) {
      var it = this.item;
      if (it.t === "vod") App.playVod(it, restart);
      else { var e = this.el.cur(); if (e) App.playEpisode(it, this.season, this.eps[this.season], this.el.idx); }
    },
    key: function (k) {
      var it = this.item;
      if (it.t === "vod") {
        if (k === 37) { this.btn = Math.min(this.btns.length - 1, this.btn + 1); this.render(); return true; }
        if (k === 39) { this.btn = Math.max(0, this.btn - 1); this.render(); return true; }
        if (k === 13 || k === 405) {
          var b = k === 405 ? "fav" : this.btns[this.btn].id;
          if (b === "fav") { Store.toggleFav(it); this.render(); } else this.play(b === "restart");
          return true;
        }
        return false;
      }
      if (!this.sl) return false;
      if (k === 405) { Store.toggleFav(it); UI.toast(Store.isFav("series", it.id) ? "أُضيف للمفضلة" : "أُزيل من المفضلة"); return true; }
      if (this.pane === 1) {
        if (k === 38) { this.el.move(-1); return true; }
        if (k === 40) { this.el.move(1); return true; }
        if (k === 39) { this.pane = 0; this.sl.setActive(true); this.el.setActive(false); return true; }
        if (k === 13) { this.play(); return true; }
      } else {
        if (k === 38 || k === 40) { if (this.sl.move(k === 38 ? -1 : 1)) { this.si = this.sl.idx; this.season = this.sl.cur(); this.el.set(this.eps[this.season] || [], 0); } return true; }
        if (k === 37 || k === 13) { this.pane = 1; this.sl.setActive(false); this.el.setActive(true); return true; }
      }
      return false;
    }
  };

  /* ================= المفضلة ================= */
  var Fav = {
    id: "s-fav",
    enter: function () {
      var self = this;
      $(this.id).innerHTML = UI.top('<div class="crumb">المفضلة</div>', "") + '<div class="pane" style="width:1200px;margin:10px auto 0"><div id="fv"></div></div><div class="hint"><b>OK</b> تشغيل/فتح · <b>الأصفر</b> إزالة</div>';
      this.l = new UI.VList($("fv"), { rows: 10, rowH: 80, empty: "لا توجد عناصر في المفضلة بعد", row: function (f) {
        var tag = { live: "قناة", vod: "فيلم", series: "مسلسل" }[f.t];
        return '<span class="rlogo" style="' + UI.cssUrl(f.icon) + '"></span><span class="rt1">' + esc(f.name) + '</span><span class="rcount">' + tag + '</span>'; } });
      this.l.set(Store.favs(), 0); this.l.setActive(true); UI.tickClock();
    },
    key: function (k) {
      if (k === 38) { this.l.move(-1); return true; } if (k === 40) { this.l.move(1); return true; }
      var f = this.l.cur();
      if (k === 13 && f) { App.playRecent(f, true); return true; }
      if (k === 405 && f) { Store.toggleFav(f); var ix = this.l.idx; this.l.set(Store.favs(), ix); return true; }
      return false;
    }
  };

  /* ================= البحث ================= */
  var Search = {
    id: "s-search", focus: 0, tab: "live", q: "", full: {},
    enter: function (p, back) {
      if (back && this.l) { this.draw(); return; }
      var self = this;
      $(this.id).innerHTML = UI.top('<div class="crumb">البحث</div>', "") +
        '<div class="srch-top"><div class="inp" id="sq"><input id="si" type="text" autocomplete="off" placeholder="اكتب اسم القناة أو الفيلم…" value="' + esc(this.q) + '"></div>' +
        '<div class="tabs" id="stabs"></div></div><div class="pane" style="width:1760px"><div id="sr"></div></div><div class="hint"><b>OK</b> على الحقل للكتابة · ▼ للنتائج</div>';
      this.l = new UI.VList($("sr"), { rows: 8, rowH: 82, empty: "اكتب للبحث", row: function (f) {
        return '<span class="rlogo" style="' + UI.cssUrl(f.icon) + '"></span><span class="rt1">' + esc(f.name) + '</span>'; } });
      $("si").oninput = function () { self.q = this.value; self.run(); };
      this.l.set([], 0); this.draw(); UI.tickClock();
    },
    draw: function () {
      var tabs = [["live", "قنوات"], ["vod", "أفلام"], ["series", "مسلسلات"]], h = "", self = this;
      tabs.forEach(function (t, i) { h += '<div class="tab' + (self.tab === t[0] ? " on" : "") + (self.focus === 1 && self.tab === t[0] ? " foc" : "") + '">' + t[1] + '</div>'; });
      $("stabs").innerHTML = h; $("sq").className = "inp" + (this.focus === 0 ? " foc" : ""); this.l.setActive(this.focus === 2);
    },
    run: function () {
      var self = this, q = (this.q || "").toLowerCase().replace(/^\s+|\s+$/g, ""), T = this.tab;
      if (q.length < 2) { this.l.o.empty = "اكتب حرفين على الأقل"; this.l.set([], 0); return; }
      var go = function (all) {
        if (self.tab !== T || (self.q || "").toLowerCase().replace(/^\s+|\s+$/g, "") !== q) return;
        var res = [], i; for (i = 0; i < all.length && res.length < 300; i++) if ((all[i].name || "").toLowerCase().indexOf(q) >= 0 && !hidden(all[i].name)) res.push(all[i]);
        self.l.o.empty = "لا نتائج"; self.l.set(res, 0);
      };
      if (this.full[T]) return go(this.full[T]);
      if (T !== "live" && Api.mode === "m3u") { this.l.o.empty = "غير متاح في M3U"; this.l.set([], 0); return; }
      this.l.root.innerHTML = '<div class="loading">جارٍ تحميل القائمة الكاملة (مرة واحدة)…</div>';
      Api.items(T).then(function (a) { self.full[T] = a; go(a); }).catch(function (e) { self.l.root.innerHTML = '<div class="none">' + esc(errMsg(e)) + '</div>'; });
    },
    key: function (k) {
      var tabs = ["live", "vod", "series"];
      if (k === 40) { if (this.focus === 0) this.focus = 1; else if (this.focus === 1 && this.l.items.length) this.focus = 2; else if (this.focus === 2) this.l.move(1); this.draw(); return true; }
      if (k === 38) { if (this.focus === 2) { if (!this.l.move(-1)) this.focus = 1; } else if (this.focus === 1) this.focus = 0; this.draw(); return true; }
      if (this.focus === 1 && (k === 37 || k === 39)) {
        var i = tabs.indexOf(this.tab) + (k === 37 ? 1 : -1); this.tab = tabs[(i + 3) % 3]; this.draw(); this.run(); return true;
      }
      if (k === 13) {
        if (this.focus === 0) { $("si").focus(); return true; }
        if (this.focus === 1) return true;
        var f = this.l.cur();
        if (f) { if (f.t === "live") App.playLive(f, [f], 0); else App.go("detail", { item: f }); }
        return true;
      }
      return false;
    },
    onBlur: function () { this.run(); }
  };

  g.Screens.live = Live; g.Screens.vod = Vod; g.Screens.series = Vod; g.Screens.detail = Detail; g.Screens.fav = Fav; g.Screens.search = Search;
})(window);
