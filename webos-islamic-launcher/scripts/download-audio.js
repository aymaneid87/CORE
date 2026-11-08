#!/usr/bin/env node
/* تنزيل صوتيات المصحف والأذان لتعمل بدون إنترنت.
 *   node scripts/download-audio.js --reciters alafasy,sudais --surahs 1,18,36,55,56,67,78-114
 *   node scripts/download-audio.js --reciters all --surahs all          (حوالي 0.5–1 جيجا لكل قارئ)
 *   node scripts/download-audio.js --adhan <رابط mp3> [--adhan-fajr <رابط mp3>]
 * الملفات تُحفظ في audio/<القارئ>/001.mp3 و audio/adhan/adhan.mp3
 */
var fs = require("fs"), path = require("path"), vm = require("vm"), https = require("https"), http = require("http");
var root = path.join(__dirname, "..");
var ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data/reciters.js"), "utf8"), ctx);
var R = ctx.window.RECITERS;

var args = {}, a = process.argv.slice(2);
for (var i = 0; i < a.length; i++) if (a[i].slice(0, 2) === "--") args[a[i].slice(2)] = (a[i + 1] && a[i + 1].slice(0, 2) !== "--") ? a[++i] : true;
var out = args.out ? path.resolve(args.out) : path.join(root, "audio");

function get(url, dest, cb, hops) {
  hops = hops || 0;
  var lib = url.indexOf("https") === 0 ? https : http;
  lib.get(url, { headers: { "User-Agent": "islamic-webos-launcher" } }, function (res) {
    if ([301, 302, 307, 308].indexOf(res.statusCode) >= 0 && res.headers.location && hops < 5) { res.resume(); return get(new URL(res.headers.location, url).toString(), dest, cb, hops + 1); }
    if (res.statusCode !== 200) { res.resume(); return cb(new Error("HTTP " + res.statusCode)); }
    var tmp = dest + ".part", ws = fs.createWriteStream(tmp);
    res.pipe(ws);
    ws.on("finish", function () { fs.renameSync(tmp, dest); cb(null, fs.statSync(dest).size); });
    ws.on("error", cb);
  }).on("error", cb);
}
function job(url, dest, label, done) {
  if (fs.existsSync(dest)) { console.log("موجود   " + label); return done(0); }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  var n = 0;
  (function attempt() {
    get(url, dest, function (err, size) {
      if (err) { if (++n < 3) return setTimeout(attempt, 1500 * n); console.log("فشل     " + label + " (" + err.message + ")"); return done(0); }
      console.log("تم      " + label + "  " + (size / 1048576).toFixed(1) + " MB"); done(size);
    });
  })();
}
function queue(tasks, conc, cb) {
  var idx = 0, active = 0, total = 0;
  (function next() {
    if (idx >= tasks.length && active === 0) return cb(total);
    while (active < conc && idx < tasks.length) {
      active++; tasks[idx++](function (sz) { total += sz; active--; next(); });
    }
  })();
}
function surahList(s) {
  if (!s || s === "all") { var r = []; for (var i = 1; i <= 114; i++) r.push(i); return r; }
  var res = []; s.split(",").forEach(function (p) { var m = p.split("-"); for (var i = +m[0]; i <= +(m[1] || m[0]); i++) if (i >= 1 && i <= 114) res.push(i); });
  return res;
}

var tasks = [];
if (args.adhan && args.adhan !== true) tasks.push(function (d) { job(args.adhan, path.join(out, "adhan/adhan.mp3"), "adhan.mp3", d); });
if (args["adhan-fajr"] && args["adhan-fajr"] !== true) tasks.push(function (d) { job(args["adhan-fajr"], path.join(out, "adhan/adhan_fajr.mp3"), "adhan_fajr.mp3", d); });
if (args.reciters) {
  var keys = args.reciters === "all" ? R.map(function (r) { return r.key; }) : args.reciters.split(","), sl = surahList(args.surahs);
  keys.forEach(function (k) {
    var rc = R.filter(function (r) { return r.key === k; })[0];
    if (!rc) { console.log("قارئ غير معروف: " + k + " — المتاح: " + R.map(function (r) { return r.key; }).join(", ")); return; }
    sl.forEach(function (n) {
      var f = ("00" + n).slice(-3) + ".mp3";
      tasks.push(function (d) { job(rc.server + f, path.join(out, k, f), k + "/" + f, d); });
    });
  });
}
if (!tasks.length) { console.log("لا يوجد شيء للتنزيل. اقرأ الشرح في أعلى الملف أو README.md"); process.exit(0); }
queue(tasks, 3, function (t) { console.log("\nانتهى. الحجم المنزَّل: " + (t / 1048576).toFixed(0) + " MB  →  " + out); });
