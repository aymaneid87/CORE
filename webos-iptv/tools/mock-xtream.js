#!/usr/bin/env node
/* خادم Xtream Codes تجريبي للاختبار على الكمبيوتر بدون اشتراك حقيقي.
 *   node tools/mock-xtream.js          ← يعمل على http://localhost:8099  (user: demo / pass: demo)
 */
var http = require("http"), url = require("url");
var PORT = process.env.PORT || 8099;
var b64 = function (s) { return Buffer.from(s, "utf8").toString("base64"); };
var COL = ["#0F3D48", "#B8763E", "#4C7A5E", "#7a3b2e", "#2c4a7a", "#5b3f7a"];

var liveCats = ["أخبار", "رياضة", "أفلام ومسلسلات", "أطفال", "وثائقي", "Adult XXX"], vodCats = ["أكشن", "دراما", "كوميدي", "وثائقي"], serCats = ["مسلسلات عربية", "مسلسلات أجنبية", "أنمي"];
var live = [], vod = [], series = [], id = 1;
liveCats.forEach(function (c, ci) { for (var i = 1; i <= 30; i++) live.push({ num: live.length + 1, name: (ci === 0 ? "قناة الأخبار " : ci === 1 ? "Sports HD " : "قناة " + c + " ") + i, stream_id: 1000 + live.length, stream_icon: "http://localhost:" + PORT + "/img/L" + (live.length % 6) + ".svg?t=" + encodeURIComponent("CH" + (live.length + 1)), category_id: String(ci + 1), epg_channel_id: "ch" + live.length }); });
vodCats.forEach(function (c, ci) { for (var i = 1; i <= 40; i++) vod.push({ name: "فيلم " + c + " " + i, stream_id: 2000 + vod.length, stream_icon: "http://localhost:" + PORT + "/img/V" + (vod.length % 6) + ".svg?t=" + encodeURIComponent("فيلم " + i), rating_5based: ((vod.length * 7) % 50) / 10, container_extension: "mp4", category_id: String(ci + 1), added: "1700000000" }); });
serCats.forEach(function (c, ci) { for (var i = 1; i <= 24; i++) series.push({ name: "مسلسل " + c.split(" ").pop() + " " + i, series_id: 3000 + series.length, cover: "http://localhost:" + PORT + "/img/S" + (series.length % 6) + ".svg?t=" + encodeURIComponent("مسلسل " + i), plot: "قصة مسلسل تجريبية مليئة بالأحداث والتشويق لعرض الواجهة.", rating_5based: ((series.length * 3) % 50) / 10, releaseDate: "2024-01-01", category_id: String(ci + 1) }); });

function cats(a) { return a.map(function (n, i) { return { category_id: String(i + 1), category_name: n, parent_id: 0 }; }); }
function filt(a, q) { return q.category_id ? a.filter(function (x) { return x.category_id === q.category_id; }) : a; }
function send(res, obj, code) { res.writeHead(code || 200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(JSON.stringify(obj)); }

http.createServer(function (req, res) {
  var u = url.parse(req.url, true), q = u.query, p = u.pathname;
  if (p === "/player_api.php") {
    if (q.username !== "demo" || q.password !== "demo") return send(res, { user_info: { auth: 0 } });
    switch (q.action) {
      case undefined: return send(res, { user_info: { username: "demo", auth: 1, status: "Active", exp_date: String(Math.floor(Date.now() / 1000) + 86400 * 23), is_trial: "0", active_cons: "0", max_connections: "2" }, server_info: { url: "localhost" } });
      case "get_live_categories": return send(res, cats(liveCats));
      case "get_vod_categories": return send(res, cats(vodCats));
      case "get_series_categories": return send(res, cats(serCats));
      case "get_live_streams": return send(res, filt(live, q));
      case "get_vod_streams": return send(res, filt(vod, q));
      case "get_series": return send(res, filt(series, q));
      case "get_vod_info": var m = vod.filter(function (v) { return String(v.stream_id) === q.vod_id; })[0] || vod[0];
        return send(res, { info: { movie_image: m.stream_icon, plot: "فيلم تجريبي يعرض تفاصيل العمل: قصة مشوقة ومشاهد مبهرة وأداء رائع من فريق العمل بالكامل.", genre: "أكشن / دراما", releasedate: "2023-05-12", duration: "01:52:10", rating_5based: m.rating_5based, cast: "ممثل أول، ممثلة ثانية، ممثل ثالث", director: "مخرج تجريبي" }, movie_data: { stream_id: m.stream_id, container_extension: "mp4" } });
      case "get_series_info": var ep = {}, s, e, sid = +q.series_id;
        for (s = 1; s <= 3; s++) { ep[s] = []; for (e = 1; e <= 6; e++) ep[s].push({ id: String(sid * 100 + s * 10 + e), episode_num: e, title: "الحلقة " + e + " — عنوان تجريبي", container_extension: "mp4", season: s, info: { duration: "45:00", movie_image: "" } }); }
        var sr = series.filter(function (x) { return x.series_id === sid; })[0] || series[0];
        return send(res, { info: { name: sr.name, cover: sr.cover, plot: sr.plot, genre: "دراما", rating_5based: sr.rating_5based, releaseDate: "2024-01-01", cast: "فريق التمثيل" }, seasons: [], episodes: ep });
      case "get_short_epg": var t = Math.floor(Date.now() / 1000);
        return send(res, { epg_listings: [{ title: b64("نشرة الأخبار الرئيسية"), description: b64(""), start_timestamp: String(t - 1200), stop_timestamp: String(t + 1500) }, { title: b64("برنامج المساء"), description: b64(""), start_timestamp: String(t + 1500), stop_timestamp: String(t + 5100) }] });
    }
    return send(res, []);
  }
  var m = p.match(/^\/(live|movie|series)\//);
  if (m) { res.writeHead(302, { Location: /\.(m3u8|ts)$/.test(p) ? "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" : "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "Access-Control-Allow-Origin": "*" }); return res.end(); }
  var im = p.match(/^\/img\/([LVS])(\d)\.svg$/);
  if (im) {
    var w = im[1] === "L" ? 300 : 400, h = im[1] === "L" ? 200 : 600, c = COL[+im[2]], tt = (q.t || "").replace(/[<>&]/g, "");
    res.writeHead(200, { "Content-Type": "image/svg+xml", "Access-Control-Allow-Origin": "*" });
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="#0A2B33"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="52%" fill="#F5F1E8" font-size="' + (h > 300 ? 46 : 54) + '" font-family="sans-serif" font-weight="bold" text-anchor="middle">' + tt + '</text></svg>');
  }
  res.writeHead(404); res.end();
}).listen(PORT, function () { console.log("mock Xtream on http://localhost:" + PORT + "  (demo/demo)"); });
