// حساب مواقيت الصلاة فلكيًا بدون إنترنت (نفس خوارزمية PrayTimes.org)
(function (g) {
  var D = Math.PI / 180;
  var sin = function (d) { return Math.sin(d * D); }, cos = function (d) { return Math.cos(d * D); },
      tan = function (d) { return Math.tan(d * D); }, asin = function (x) { return Math.asin(x) / D; },
      acos = function (x) { return Math.acos(x) / D; }, atan2 = function (y, x) { return Math.atan2(y, x) / D; },
      acot = function (x) { return Math.atan(1 / x) / D; };
  var fix = function (a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

  // fajr/isha: زاوية، أو {min:n} بالدقائق بعد المغرب
  var METHODS = {
    egypt:  { name: "الهيئة المصرية العامة للمساحة", fajr: 19.5, isha: 17.5 },
    mwl:    { name: "رابطة العالم الإسلامي",         fajr: 18,   isha: 17 },
    makkah: { name: "أم القرى (مكة)",                fajr: 18.5, isha: { min: 90 } },
    karachi:{ name: "جامعة العلوم الإسلامية بكراتشي", fajr: 18,   isha: 18 },
    isna:   { name: "أمريكا الشمالية (ISNA)",         fajr: 15,   isha: 15 },
    kuwait: { name: "الكويت",                         fajr: 18,   isha: 17.5 },
    qatar:  { name: "قطر",                            fajr: 18,   isha: { min: 90 } }
  };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sunPos(jd) {
    var d = jd - 2451545.0, q = fix(357.529 + 0.98560028 * d, 360), Lm = fix(280.459 + 0.98564736 * d, 360),
        L = fix(Lm + 1.915 * sin(q) + 0.020 * sin(2 * q), 360), e = 23.439 - 0.00000036 * d,
        RA = atan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: asin(sin(e) * sin(L)), eq: Lm / 15 - fix(RA, 24) };
  }

  // يرجع الأوقات كساعات عشرية (0-24) بتوقيت tz
  function compute(date, lat, lng, tz, opt) {
    var m = METHODS[opt.method] || METHODS.egypt;
    var jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    function midDay(t) { return fix(12 - sunPos(jd + t).eq, 24); }
    function angleTime(angle, t, ccw) {
      var decl = sunPos(jd + t).decl, noon = midDay(t);
      var x = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      if (x > 1 || x < -1) return NaN;
      return noon + (ccw ? -1 : 1) * acos(x) / 15;
    }
    function asrTime(t) {
      var decl = sunPos(jd + t).decl, f = opt.asr === "hanafi" ? 2 : 1;
      var ang = -acot(f + tan(Math.abs(lat - decl)));
      return angleTime(ang, t);
    }
    var p = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    for (var k in p) p[k] = p[k] / 24;
    for (var i = 0; i < 2; i++) {
      var q = {
        fajr: angleTime(m.fajr, p.fajr, true),
        sunrise: angleTime(0.833, p.sunrise, true),
        dhuhr: midDay(p.dhuhr),
        asr: asrTime(p.asr),
        sunset: angleTime(0.833, p.sunset),
        isha: typeof m.isha === "number" ? angleTime(m.isha, p.isha) : p.isha * 24
      };
      for (var n in q) p[n] = q[n] !== q[n] ? p[n] : q[n] / 24;
    }
    var adj = tz - lng / 15, t = {};
    for (var key in p) t[key] = p[key] * 24 + adj;
    t.maghrib = t.sunset;
    if (typeof m.isha === "object") t.isha = t.maghrib + m.isha.min / 60;
    // خطوط عرض عالية: لو الزاوية غير ممكنة نستخدم ثلث/سبع الليل
    var night = fix(t.sunrise - t.sunset, 24);
    if (lat > 48 || lat < -48) {
      var fb = night / 7;
      if (fix(t.sunrise - t.fajr, 24) > night / 2 + 0.01) t.fajr = t.sunrise - fb;
      if (fix(t.isha - t.sunset, 24) > night / 2 + 0.01) t.isha = t.sunset + fb;
    }
    var manual = opt.offsets || {};
    for (var z in manual) if (t[z] !== undefined) t[z] += manual[z] / 60;
    for (var y in t) t[y] = fix(t[y], 24);
    return t;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(h, h12) {
    if (h !== h) return "--:--";
    h = fix(h + 0.5 / 60, 24);
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60), suf = "";
    if (h12) { suf = hh >= 12 ? " م" : " ص"; hh = hh % 12 || 12; }
    return pad(hh) + ":" + pad(mm) + suf;
  }

  g.Prayer = { METHODS: METHODS, compute: compute, fmt: fmt, pad: pad };
})(window);
