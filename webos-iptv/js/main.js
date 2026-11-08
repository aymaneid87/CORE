/* الموجّه الرئيسي: التنقل بين الشاشات + مفاتيح الريموت */
(function (g) {
  "use strict";
  var UI = g.UI, $ = UI.$;
  var App = g.App = { stack: [], cur: null, lastLive: null };

  function showEl(s, on) { $(s.id).className = "screen" + (on ? " on" : ""); }

  App.go = function (name, params, opts) {
    opts = opts || {};
    var prev = this.cur;
    if (prev) {
      if (prev.leave) prev.leave();
      showEl(prev, false);
      if (opts.reset) this.stack = []; else this.stack.push({ name: prev.name, params: prev.params });
    }
    var s = g.Screens[name]; s.name = name; s.params = params; this.cur = s;
    showEl(s, true); s.enter(params, false);
  };
  App.back = function () {
    var t = this.stack.pop(); if (!t) return false;
    var prev = this.cur; if (prev.leave) prev.leave(); showEl(prev, false);
    var s = g.Screens[t.name]; s.name = t.name; s.params = t.params; this.cur = s;
    showEl(s, true); s.enter(null, true); return true;
  };
  App.resetBrowse = function () { g.Screens.live.reset(); g.Screens.vod.reset(); g.Screens.search.full = {}; };

  /* ----- تشغيل ----- */
  App.playLive = function (ch, list, idx) { ch.t = "live"; App.lastLive = ch.id; g.Player.open({ kind: "live", list: list, idx: idx || 0 }); };
  App.playVod = function (m, restart) {
    var rs = restart ? null : Store.getResume("vod:" + m.id);
    g.Player.open({ kind: "vod", title: m.name, url: Api.vodUrl(m), key: "vod:" + m.id, startAt: rs ? rs.pos : 0,
      item: { t: "vod", id: m.id, name: m.name, icon: m.icon, ext: m.ext } });
  };
  App.playEpisode = function (series, season, eps, idx) {
    var e = eps[idx], n = e.episode_num || idx + 1, ext = e.container_extension || "mp4", rs = Store.getResume("ep:" + e.id);
    g.Player.open({ kind: "ep", title: series.name, sub: "الموسم " + UI.toAr(season) + " · الحلقة " + UI.toAr(n) + (e.title ? " — " + e.title : ""),
      url: Api.epUrl({ id: e.id, ext: ext }), key: "ep:" + e.id, startAt: rs ? rs.pos : 0, series: series, season: season, list: eps, idx: idx,
      item: { t: "ep", id: e.id, name: series.name + " · م" + UI.toAr(season) + " ح" + UI.toAr(n), icon: (e.info && e.info.movie_image) || series.icon, ext: ext, sid: series.id, season: season } });
  };
  App.playRecent = function (r, detail) {
    if (r.t === "live") App.playLive(r, [r], 0);
    else if (r.t === "ep") g.Player.open({ kind: "ep", title: r.name, url: Api.epUrl(r), key: "ep:" + r.id, startAt: (Store.getResume("ep:" + r.id) || {}).pos || 0, item: r });
    else if (detail || r.t === "series") App.go("detail", { item: r });
    else App.playVod(r);
  };
  App.afterPlayer = function () { var s = this.cur; showEl(s, true); if (s.enter) s.enter(null, true); };

  /* ----- المفاتيح ----- */
  document.addEventListener("keydown", function (e) {
    var k = e.keyCode, a = document.activeElement, ok = false;
    if (a && a.tagName === "INPUT") {
      if (k === 13 || k === 461 || k === 27) { a.blur(); if (App.cur && App.cur.onBlur) App.cur.onBlur(); e.preventDefault(); }
      return;
    }
    if ($("busy").style.display === "block") { e.preventDefault(); return; }
    if (g.Player.on) ok = g.Player.key(k);
    else {
      ok = App.cur && App.cur.key ? App.cur.key(k, e) : false;
      if (!ok) {
        if (k === 461 || k === 8 || k === 27) ok = App.back();
        else if (App.cur && App.cur !== g.Screens.login) {
          if (k === 403) { App.go("home", null, { reset: true }); ok = true; }
          else if (k === 404) { App.go("live"); ok = true; }
          else if (k === 405 && App.cur === g.Screens.home) { App.go("vod", { type: "vod" }); ok = true; }
          else if (k === 406) { App.go("search"); ok = true; }
        }
      }
    }
    if (ok) e.preventDefault();
  });

  App.boot = function () {
    var acc = Store.active();
    if (!acc) return App.go("login", null, { reset: true });
    Api.use(acc); UI.busy(true, "جارٍ الاتصال بالخادم…");
    Api.login().then(function () { UI.busy(false); App.go("home", null, { reset: true }); })
      .catch(function (e) { UI.busy(false); g.Screens.login.err = e.message; App.go("login", null, { reset: true }); });
  };
})(window);
