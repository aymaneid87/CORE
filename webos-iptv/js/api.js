/* عميل Xtream Codes + قارئ قوائم M3U */
(function (g) {
  "use strict";
  var A = { mode: "xtream", base: "", user: "", pass: "", info: null, cache: {} };

  function enc(s) { return encodeURIComponent(s); }
  function b64(s) { if (!s) return ""; try { return decodeURIComponent(escape(atob(s))); } catch (e) { try { return atob(s); } catch (e2) { return s; } } }

  // يقبل: host:port | http://host:port | رابط player_api/get.php مع اليوزر والباسورد | رابط m3u
  A.parseUrl = function (raw, user, pass) {
    raw = (raw || "").replace(/^\s+|\s+$/g, "");
    if (!raw) return null;
    if (!/^https?:\/\//i.test(raw)) raw = "http://" + raw;
    var q = {}, qi = raw.indexOf("?");
    if (qi >= 0) raw.slice(qi + 1).split("&").forEach(function (p) { var kv = p.split("="); q[kv[0]] = decodeURIComponent(kv[1] || ""); });
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var isM3U = /\.m3u8?$/i.test(path) && !/\/live\//.test(path);
    var m = path.match(/^(.*?)\/(player_api|get|xmltv|panel_api)\.php$/i);
    var base = (m ? m[1] : path).replace(/\/+$/, "");
    var u = user || q.username || "", p = pass || q.password || "";
    if (isM3U && !(q.username && q.password) && !(user && pass)) return { mode: "m3u", base: path, user: "", pass: "", m3u: raw };
    return { mode: "xtream", base: base, user: u, pass: p };
  };

  A.use = function (acc) { A.mode = acc.mode || "xtream"; A.base = acc.base; A.user = acc.user; A.pass = acc.pass; A.m3u = acc.m3u; A.cache = {}; A.info = null; };

  A.get = function (url, text, timeout) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open("GET", url, true); x.timeout = timeout || 30000;
      x.onload = function () {
        if (x.status < 200 || x.status >= 300) return rej(new Error("HTTP " + x.status));
        if (text) return res(x.responseText);
        try { res(JSON.parse(x.responseText)); } catch (e) { rej(new Error("استجابة غير صالحة من الخادم")); }
      };
      x.onerror = function () { rej(new Error("تعذر الاتصال بالخادم (تحقق من الرابط/الإنترنت)")); };
      x.ontimeout = function () { rej(new Error("انتهت مهلة الاتصال")); };
      x.send();
    });
  };

  A.call = function (action, params, nocache) {
    var key = action + "|" + JSON.stringify(params || {});
    if (!nocache && A.cache[key]) return Promise.resolve(A.cache[key]);
    var url = A.base + "/player_api.php?username=" + enc(A.user) + "&password=" + enc(A.pass) + (action ? "&action=" + action : "");
    for (var k in (params || {})) url += "&" + k + "=" + enc(params[k]);
    return A.get(url).then(function (j) { if (action) A.cache[key] = j; return j; });
  };

  /* ---- تسجيل الدخول ---- */
  A.login = function () {
    if (A.mode === "m3u") return A.loadM3U().then(function () { A.info = { m3u: true, status: "Active" }; return A.info; });
    return A.call(null, null, true).then(function (j) {
      if (!j || !j.user_info) throw new Error("بيانات الدخول غير صحيحة");
      var u = j.user_info;
      if (u.auth === 0 || u.auth === "0") throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
      if (u.status && String(u.status).toLowerCase() !== "active") throw new Error("الاشتراك غير فعّال (" + u.status + ")");
      A.info = { status: u.status, exp: u.exp_date ? +u.exp_date : 0, max: u.max_connections, act: u.active_cons, trial: u.is_trial === "1" || u.is_trial === 1 };
      return A.info;
    });
  };

  /* ---- M3U ---- */
  A.loadM3U = function () {
    return A.get(A.m3u, true, 60000).then(function (t) {
      var lines = t.split(/\r?\n/), cats = {}, order = [], items = [], cur = null, i, id = 0;
      for (i = 0; i < lines.length; i++) {
        var l = lines[i].replace(/^\s+|\s+$/g, "");
        if (l.indexOf("#EXTINF") === 0) {
          var at = function (n) { var m = l.match(new RegExp(n + '="([^"]*)"', "i")); return m ? m[1] : ""; };
          cur = { name: l.slice(l.lastIndexOf(",") + 1) || at("tvg-name"), icon: at("tvg-logo"), cat: at("group-title") || "أخرى", epgId: at("tvg-id") };
        } else if (l && l.charAt(0) !== "#" && cur) {
          cur.url = l; cur.id = ++id; items.push(cur);
          if (!cats[cur.cat]) { cats[cur.cat] = 1; order.push(cur.cat); }
          cur = null;
        }
      }
      if (!items.length) throw new Error("لم أجد قنوات في القائمة");
      A.cache.m3u = { cats: order.map(function (n) { return { id: n, name: n }; }), items: items };
    });
  };

  /* ---- بيانات موحّدة ---- */
  function arr(x) { return x && x.length ? x : (x && typeof x === "object" ? Object.keys(x).map(function (k) { return x[k]; }) : []); }
  function normCats(a) { return arr(a).map(function (c) { return { id: String(c.category_id), name: c.category_name || "—" }; }); }

  A.cats = function (type) {
    if (A.mode === "m3u") return Promise.resolve(type === "live" ? A.cache.m3u.cats : []);
    var act = { live: "get_live_categories", vod: "get_vod_categories", series: "get_series_categories" }[type];
    return A.call(act).then(normCats);
  };
  A.items = function (type, cat) {
    if (A.mode === "m3u") return Promise.resolve(type !== "live" ? [] : A.cache.m3u.items.filter(function (i) { return !cat || i.cat === cat; }));
    var act = { live: "get_live_streams", vod: "get_vod_streams", series: "get_series" }[type];
    return A.call(act, cat ? { category_id: cat } : null).then(function (a) {
      return arr(a).map(function (s) {
        if (type === "live") return { t: "live", id: s.stream_id, name: s.name, icon: s.stream_icon, cat: String(s.category_id), epgId: s.epg_channel_id, num: s.num };
        if (type === "vod") return { t: "vod", id: s.stream_id, name: s.name, icon: s.stream_icon, cat: String(s.category_id), ext: s.container_extension || "mp4", rating: s.rating_5based || s.rating, added: s.added };
        return { t: "series", id: s.series_id, name: s.name, icon: s.cover, cat: String(s.category_id), plot: s.plot, rating: s.rating_5based || s.rating, year: s.releaseDate || s.release_date };
      });
    });
  };
  A.vodInfo = function (id) { return A.call("get_vod_info", { vod_id: id }); };
  A.seriesInfo = function (id) { return A.call("get_series_info", { series_id: id }); };
  A.epg = function (ch) {
    if (A.mode === "m3u" || !ch || !ch.id) return Promise.resolve([]);
    return A.call("get_short_epg", { stream_id: ch.id, limit: 3 }).then(function (j) {
      return arr(j && j.epg_listings).map(function (e) {
        return { title: b64(e.title), desc: b64(e.description), start: +e.start_timestamp, stop: +e.stop_timestamp };
      });
    }).catch(function () { return []; });
  };

  /* ---- روابط التشغيل ---- */
  function pre() { return A.base + "/%/" + enc(A.user) + "/" + enc(A.pass) + "/"; }
  A.liveUrl = function (ch, fmt) { return ch.url ? ch.url : pre().replace("%", "live") + ch.id + "." + (fmt || "m3u8"); };
  A.vodUrl = function (m) { return m.url ? m.url : pre().replace("%", "movie") + m.id + "." + (m.ext || "mp4"); };
  A.epUrl = function (e) { return pre().replace("%", "series") + e.id + "." + (e.ext || "mp4"); };

  g.Api = A;
})(window);
