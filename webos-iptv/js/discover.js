/* الرئيسية على طريقة Netflix: بانر + صفوف أفقية + شريط تبويبات */
(function (g) {
  "use strict";
  var UI = g.UI, $ = UI.$, esc = UI.esc, App = g.App;
  var ROWH = 416, PITCH = 244, TABS = [["home", "الرئيسية"], ["live", "البث المباشر"], ["series", "المسلسلات"], ["vod", "الأفلام"], ["fav", "قائمتي"], ["search", "بحث"], ["settings", "الإعدادات"]];
  var ADULT = /(xxx|adult|porn|18\s?\+|sex|للكبار|بالغين)/i;

  var D = g.Screens.home = {
    id: "s-home", area: "hero", navI: 0, hb: 0, row: 0, rows: [], cat: [], loaded: false, hero: null, heroInfo: null,
    reset: function () { this.loaded = false; },

    enter: function (p, back) {
      if (!back) { this.area = "hero"; this.row = 0; }
      if (this.loaded && this.rows) { var cols = this.rows.map(function (r) { return r.col; }), titles = this.rows.map(function (r) { return r.title; }); this.buildRows(); var me = this; this.rows.forEach(function (r) { var i = titles.indexOf(r.title); if (i >= 0 && back) r.col = Math.min(cols[i], r.items.length - 1); }); this.render(); return; }
      var self = this;
      $(this.id).innerHTML = this.nav() + '<div class="dc-empty">جارٍ تجهيز المكتبة…</div>';
      this.loaded = true; this.cat = []; this.hero = null;
      this.load().then(function () { self.pickHero(); self.buildRows(); self.render(); self.loadHero(); })
        .catch(function (e) { self.loaded = false; $(self.id).innerHTML = self.nav() + '<div class="dc-empty">' + esc(e.message || "تعذر تحميل المكتبة") + '</div>'; });
    },

    /* ---- تحميل البيانات: أول فئات الأفلام والمسلسلات فقط (بدون تحميل القائمة كاملة) ---- */
    load: function () {
      var self = this, m3u = Api.mode === "m3u", jobs = [];
      var ok = function (n) { return !(Store.settings.hideAdult && ADULT.test(n || "")); };
      if (m3u) {
        return Api.cats("live").then(function (cs) {
          return Promise.all(cs.filter(function (c) { return ok(c.name); }).slice(0, 10).map(function (c) {
            return Api.items("live", c.id).then(function (a) { self.cat.push({ title: c.name, items: a.slice(0, 24), live: true }); });
          }));
        });
      }
      return Promise.all([Api.cats("vod"), Api.cats("series")]).then(function (r) {
        var vc = r[0].filter(function (c) { return ok(c.name); }).slice(0, 7), sc = r[1].filter(function (c) { return ok(c.name); }).slice(0, 5), all = [], res = {};
        var fetchOne = function (type, c, tag) {
          return Api.items(type, c.id).then(function (a) { res[tag + c.id] = { title: c.name, items: a.slice(0, 24), type: type }; }).catch(function () {});
        };
        vc.forEach(function (c) { jobs.push(fetchOne("vod", c, "v")); });
        sc.forEach(function (c) { jobs.push(fetchOne("series", c, "s")); });
        return Promise.all(jobs).then(function () {
          var order = vc.map(function (c) { return "v" + c.id; }).concat(sc.map(function (c) { return "s" + c.id; }));
          order.forEach(function (k) { if (res[k] && res[k].items.length) { self.cat.push(res[k]); all = all.concat(res[k].items); } });
          self.pool = all;
        });
      });
    },

    pickHero: function () {
      var pool = (this.pool || []).filter(function (x) { return x.icon; });
      if (!pool.length) { var c = this.cat[0]; pool = c ? c.items : []; }
      pool = pool.slice().sort(function (a, b) { return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0); }).slice(0, 8);
      this.hero = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; this.heroInfo = null;
    },
    loadHero: function () {
      var self = this, h = this.hero; if (!h || h.t === "live") return;
      (h.t === "series" ? Api.seriesInfo(h.id) : Api.vodInfo(h.id)).then(function (j) {
        if (self.hero !== h) return; self.heroInfo = (j && j.info) || {}; if (App.cur === self) self.renderHero();
      }).catch(function () {});
    },

    buildRows: function () {
      var rows = [], pool = this.pool || [], i;
      var cont = Store.recents().filter(function (r) { return r.t === "vod" || r.t === "ep"; }).slice(0, 12);
      if (cont.length) rows.push({ title: "تابع المشاهدة", items: cont, kind: "continue" });
      var fav = Store.favs().filter(function (f) { return f.t !== "live"; });
      if (fav.length) rows.push({ title: "قائمتي", items: fav, kind: "fav" });
      if (pool.length) {
        var added = pool.slice().sort(function (a, b) { return (+b.added || 0) - (+a.added || 0); }).filter(function (x) { return x.t === "vod"; }).slice(0, 20);
        if (added.length) rows.push({ title: "أُضيف حديثًا", items: added });
        var top = pool.slice().sort(function (a, b) { return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0); }).slice(0, 10);
        if (top.length && parseFloat(top[0].rating) > 0) rows.push({ title: "الأفضل تقييمًا — أفضل 10", items: top, top10: true });
      }
      this.cat.forEach(function (c) { rows.push({ title: c.title, items: c.items, tag: c.type === "series" ? "مسلسلات" : c.type === "vod" ? "أفلام" : "", live: c.live }); });
      var keep = this.rows; rows.forEach(function (r) { r.col = 0; });
      this.rows = rows; if (this.row >= rows.length) this.row = Math.max(0, rows.length - 1);
    },

    /* ---- رسم ---- */
    nav: function () {
      var h = '<div class="dc-nav" id="dc_nav">' + UI.logo() + '<div class="dc-tabs">';
      TABS.forEach(function (t, i) { h += '<div class="dc-tab' + (i === 0 ? " on" : "") + '" id="tb_' + i + '">' + t[1] + '</div>'; });
      return h + '</div><div class="dc-clk clk"></div></div>';
    },
    heroHtml: function () {
      var h = this.hero, inf = this.heroInfo || {};
      if (!h) return '<div class="dc-hero"></div>';
      var bd = (inf.backdrop_path && (inf.backdrop_path[0] || inf.backdrop_path)) || "", img = typeof bd === "string" && bd ? bd : (inf.movie_image || inf.cover || h.icon);
      var meta = [], r = parseFloat(inf.rating_5based || inf.rating || h.rating);
      if (r > 0) meta.push("★ " + r.toFixed(1)); var yr = inf.releasedate || inf.releaseDate || h.year; if (yr) meta.push(String(yr).slice(0, 4)); if (inf.genre) meta.push(inf.genre); if (inf.duration) meta.push(inf.duration);
      var plot = inf.plot || inf.description || h.plot || "";
      return '<div class="dc-hero"><div class="dc-himg" style="' + UI.cssUrl(img) + '"></div><div class="dc-hfade"></div><div class="dc-hfade2"></div><div class="dc-htxt">' +
        '<div class="hl">' + (h.t === "series" ? "مسلسل" : h.t === "live" ? "بث مباشر" : "فيلم") + ' · مُختار لك</div><h1>' + esc(h.name) + '</h1>' +
        '<div class="hm">' + meta.map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") + '</div>' + (plot ? '<p>' + esc(plot) + '</p>' : "") +
        '<div class="dc-hb"><span class="hbtn pl" id="hb_0">' + UI.icon("play") + (h.t === "series" ? "ابدأ المشاهدة" : "تشغيل") + '</span><span class="hbtn" id="hb_1">' + UI.icon("info") + 'التفاصيل</span></div></div></div>';
    },
    cardHtml: function (it, r, i, row) {
      var rt = parseFloat(it.rating), prog = "", key;
      if (row.kind === "continue") { key = (it.t === "ep" ? "ep:" : "vod:") + it.id; var rs = Store.getResume(key); if (rs && rs.dur) prog = '<div class="pg"><i style="width:' + Math.min(100, 100 * rs.pos / rs.dur) + '%"></i></div>'; }
      var cls = "pc" + (row.top10 ? " t10" : "") + (row.live ? " ls" : "");
      return '<div class="' + cls + '" id="c_' + r + '_' + i + '">' + (row.top10 ? '<span class="num">' + (i + 1) + '</span>' : "") +
        '<div class="pi" data-bg="' + esc(it.icon || "") + '"></div><div class="ph2">' + esc((it.name || "?").replace(/^[^\wء-ي]+/, "").charAt(0)) + '</div>' +
        (rt > 0 && !row.top10 && !row.live ? '<span class="pr">★ ' + rt.toFixed(1) + '</span>' : "") + prog + '<div class="pt">' + esc(it.name) + '</div></div>';
    },
    render: function () {
      var self = this, h = this.nav() + '<div class="dc-scroll" id="dc_s">' + this.heroHtml();
      if (!this.rows.length && !this.hero) h += '<div class="dc-empty">لا يوجد محتوى لعرضه</div>';
      this.rows.forEach(function (row, r) {
        h += '<div class="dc-row"><div class="dc-rt">' + esc(row.title) + (row.tag ? '<small>' + row.tag + '</small>' : "") + '</div><div class="dc-view"><div class="dc-in" id="ri_' + r + '">';
        row.items.forEach(function (it, i) { h += self.cardHtml(it, r, i, row); });
        h += '</div></div></div>';
      });
      h += '<div style="height:200px"></div></div>';
      $(this.id).innerHTML = h; UI.tickClock(); this.focus();
    },
    renderHero: function () {
      var s = $("dc_s"), old = s && s.firstChild; if (!old) return;
      var tmp = document.createElement("div"); tmp.innerHTML = this.heroHtml(); s.replaceChild(tmp.firstChild, old); this.focus();
    },

    /* ---- تركيز وتمرير ---- */
    focus: function () {
      var i, a = document.querySelectorAll("#s-home .foc");
      for (i = 0; i < a.length; i++) a[i].className = a[i].className.replace(" foc", "");
      var sc = $("dc_s"), nav = $("dc_nav"), el;
      if (!sc) return;
      if (this.area === "rows" && !this.rows.length) this.area = "hero";
      var off = this.area === "rows" ? this.row * ROWH : 0;
      sc.style.webkitTransform = sc.style.transform = "translateY(" + (-off) + "px)";
      nav.className = "dc-nav" + (this.area === "rows" && this.row > 0 ? " solid" : "");
      if (this.area === "nav") el = $("tb_" + this.navI);
      else if (this.area === "hero") el = $("hb_" + this.hb);
      else {
        var row = this.rows[this.row]; el = $("c_" + this.row + "_" + row.col);
        var inner = $("ri_" + this.row), shift = Math.max(0, row.col - 3) * (row.top10 ? 350 : row.live ? 380 : PITCH);
        inner.style.webkitTransform = inner.style.transform = "translateX(" + shift + "px)";
      }
      if (el) el.className += " foc";
      this.lazy();
    },
    lazy: function () {
      var r0 = Math.max(0, this.row - 1), r1 = this.row + 2, r, imgs, i;
      for (r = r0; r <= r1 && r < this.rows.length; r++) {
        imgs = $("ri_" + r).querySelectorAll(".pi[data-bg]");
        for (i = 0; i < imgs.length; i++) { var u = imgs[i].getAttribute("data-bg"); imgs[i].removeAttribute("data-bg"); if (u) imgs[i].style.backgroundImage = "url('" + u + "')"; }
      }
    },

    openItem: function (it, row) {
      if (row.kind === "continue") return App.playRecent(it);
      if (it.t === "live") return App.playLive(it, row.items, row.items.indexOf(it));
      App.go("detail", { item: it });
    },
    key: function (k) {
      var self = this, row = this.rows[this.row];
      if (this.area === "nav") {
        if (k === 37) { this.navI = Math.min(TABS.length - 1, this.navI + 1); this.focus(); return true; }
        if (k === 39) { this.navI = Math.max(0, this.navI - 1); this.focus(); return true; }
        if (k === 40) { this.area = this.hero ? "hero" : "rows"; this.focus(); return true; }
        if (k === 13) { var t = TABS[this.navI][0]; if (t === "home") return true; if (Api.mode === "m3u" && (t === "vod" || t === "series")) { UI.toast("غير متاح مع قوائم M3U"); return true; } App.go(t, t === "vod" || t === "series" ? { type: t } : null); return true; }
        if (k === 461 || k === 8 || k === 27) return false;
        return false;
      }
      if (this.area === "hero") {
        if (k === 37) { this.hb = Math.min(1, this.hb + 1); this.focus(); return true; }
        if (k === 39) { this.hb = Math.max(0, this.hb - 1); this.focus(); return true; }
        if (k === 38) { this.area = "nav"; this.focus(); return true; }
        if (k === 40 && this.rows.length) { this.area = "rows"; this.focus(); return true; }
        if (k === 13) {
          var h = this.hero; if (!h) return true;
          if (this.hb === 1 || h.t === "series") App.go("detail", { item: h });
          else if (h.t === "live") App.playLive(h, [h], 0); else App.playVod(h);
          return true;
        }
        if (k === 405 && this.hero) { UI.toast(Store.toggleFav(this.hero) ? "أُضيف إلى قائمتي" : "أُزيل من قائمتي"); return true; }
        if (k === 461 || k === 8 || k === 27) return false;
        return false;
      }
      // الصفوف
      if (k === 37) { if (row.col < row.items.length - 1) { row.col++; this.focus(); } return true; }
      if (k === 39) { if (row.col > 0) { row.col--; this.focus(); } return true; }
      if (k === 40) { if (this.row < this.rows.length - 1) { this.row++; this.focus(); } return true; }
      if (k === 38) { if (this.row > 0) this.row--; else this.area = this.hero ? "hero" : "nav"; this.focus(); return true; }
      if (k === 13) { this.openItem(row.items[row.col], row); return true; }
      if (k === 405) {
        var it = row.items[row.col];
        if (it && it.t !== "ep" && it.t !== "live") { UI.toast(Store.toggleFav(it) ? "أُضيف إلى قائمتي" : "أُزيل من قائمتي"); }
        return true;
      }
      if (k === 461 || k === 8 || k === 27) { this.area = "hero"; this.focus(); return true; }  // Back: الرجوع للأعلى
      return false;
    }
  };
})(window);
