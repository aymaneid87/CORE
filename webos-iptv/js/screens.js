/* شاشات: الدخول، الرئيسية، الإعدادات */
(function (g) {
  "use strict";
  var UI = g.UI, $ = UI.$, esc = UI.esc, App = g.App;

  /* ================= تسجيل الدخول ================= */
  var Login = {
    id: "s-login", col: 0, idx: 0, err: "", draft: { name: "", url: "", user: "", pass: "" },
    enter: function () { this.col = Store.accounts().length && !this.forceForm ? 1 : 0; this.idx = 0; this.render(); },
    leave: function () { this.forceForm = false; },
    fields: [["url", "رابط الخادم (URL)", "http://example.com:8080"], ["user", "اسم المستخدم", "username"], ["pass", "كلمة المرور", "password"], ["name", "اسم الحساب (اختياري)", "حسابي"]],
    render: function () {
      var d = this.draft, self = this, h = UI.top(UI.logo(), "");
      h += '<div class="login-wrap"><div class="lg-card"><h2>تسجيل الدخول</h2><p>أدخل بيانات اشتراكك — الرابط واسم المستخدم وكلمة المرور (أو رابط قائمة M3U)</p>';
      this.fields.forEach(function (f, i) {
        h += '<div class="fld"><label>' + f[1] + '</label><div class="inp" id="f_' + f[0] + '"><input id="i_' + f[0] + '" type="' + (f[0] === "pass" ? "password" : "text") +
          '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + f[2] + '" value="' + esc(d[f[0]]) + '"></div></div>';
      });
      h += '<div class="btn" id="b_go">دخول</div><div class="err" id="lg_err">' + esc(this.err) + '</div></div>';
      h += '<div class="acc-side"><h3>حساباتي المحفوظة</h3>';
      var accs = Store.accounts();
      if (!accs.length) h += '<div class="empty">لا توجد حسابات محفوظة بعد</div>';
      accs.forEach(function (a, i) {
        h += '<div class="acc" id="acc_' + i + '"><div class="an"><div class="a1">' + esc(a.name || a.base) + '</div><div class="a2">' + esc(a.base) + (a.user ? " · " + esc(a.user) : "") + '</div></div></div>';
      });
      h += accs.length ? '<div class="empty" style="font-size:22px">OK للدخول · <span style="color:#D9955A">الأصفر</span> للحذف</div>' : "";
      h += '</div></div>';
      $(this.id).innerHTML = h; UI.tickClock(); this.focus();
      ["url", "user", "pass", "name"].forEach(function (k) { $("i_" + k).oninput = function () { self.draft[k] = this.value; }; });
    },
    items: function () { return this.col === 0 ? ["f_url", "f_user", "f_pass", "f_name", "b_go"] : Store.accounts().map(function (a, i) { return "acc_" + i; }); },
    focus: function () {
      var all = this.id && document.querySelectorAll("#s-login .foc"), i;
      for (i = 0; i < all.length; i++) all[i].className = all[i].className.replace(" foc", "");
      var it = this.items(); if (this.idx >= it.length) this.idx = Math.max(0, it.length - 1);
      var e = $(it[this.idx]); if (e) e.className += " foc";
    },
    submit: function (acc) {
      var self = this, p;
      if (!acc) {
        var d = this.draft;
        p = Api.parseUrl(d.url, d.user, d.pass);
        if (!p) { this.err = "أدخل رابط الخادم"; return this.render(); }
        if (p.mode === "xtream" && (!p.user || !p.pass)) { this.err = "أدخل اسم المستخدم وكلمة المرور"; return this.render(); }
        acc = { name: d.name || p.base.replace(/^https?:\/\//, "").split("/")[0], mode: p.mode, base: p.base, user: p.user, pass: p.pass, m3u: p.m3u, url: d.url };
      }
      Api.use(acc); UI.busy(true, "جارٍ الاتصال بالخادم…");
      Api.login().then(function () {
        var saved = Store.addAccount(acc); Store.setActive(saved.id);
        self.err = ""; self.draft = { name: "", url: "", user: "", pass: "" };
        UI.busy(false); App.go("home", null, { reset: true });
      }).catch(function (e) {
        UI.busy(false); self.err = e.message || "فشل تسجيل الدخول"; if (App.cur !== self) App.go("login", null, { reset: true }); else self.render();
      });
    },
    key: function (k) {
      var it = this.items();
      if (k === 38) { if (this.idx > 0) this.idx--; this.focus(); return true; }
      if (k === 40) { if (this.idx < it.length - 1) this.idx++; this.focus(); return true; }
      if (k === 37 && this.col === 0 && Store.accounts().length) { this.col = 1; this.idx = 0; this.focus(); return true; }
      if (k === 39 && this.col === 1) { this.col = 0; this.idx = 0; this.focus(); return true; }
      if (k === 13) {
        var id = it[this.idx];
        if (id === "b_go") this.submit();
        else if (id && id.indexOf("f_") === 0) $("i_" + id.slice(2)).focus();
        else if (id && id.indexOf("acc_") === 0) this.submit(Store.accounts()[+id.slice(4)]);
        return true;
      }
      if (k === 405 && this.col === 1) { var a = Store.accounts()[this.idx]; if (a) { Store.removeAccount(a.id); UI.toast("تم حذف الحساب"); this.render(); } return true; }
      return false;
    }
  };

  /* ================= الرئيسية ================= */
  var TILES = [
    { go: "live", ic: "live", n: "البث المباشر", c: "كل القنوات", big: 1 }, { go: "vod", ic: "vod", n: "الأفلام", c: "VOD" },
    { go: "series", ic: "series", n: "المسلسلات", c: "الحلقات والمواسم" }, { go: "fav", ic: "fav", n: "المفضلة", c: "قنوات وأفلام" },
    { go: "search", ic: "search", n: "البحث", c: "ابحث في كل شيء" }, { go: "settings", ic: "settings", n: "الإعدادات", c: "الحساب والبث" }
  ];
  var Home = {
    id: "s-home", row: 0, idx: 0,
    enter: function () { this.render(); },
    render: function () {
      var acc = Store.active(), info = Api.info || {}, chip = "", h;
      if (info.exp) { var dd = Math.ceil((info.exp * 1000 - Date.now()) / 864e5); chip = dd > 0 ? "ينتهي بعد " + UI.toAr(dd) + " يوم" : "الاشتراك منتهي"; }
      else if (info.m3u) chip = "قائمة M3U";
      h = UI.top(UI.logo() + (acc ? '<span class="sub">' + esc(acc.name) + (info.max ? " · اتصالات " + UI.toAr(info.act || 0) + " من " + UI.toAr(info.max) : "") + '</span>' : ""), chip);
      var m3u = Api.mode === "m3u";
      h += '<div class="tiles">';
      TILES.forEach(function (t, i) {
        var dis = m3u && (t.go === "vod" || t.go === "series");
        h += '<div class="tile' + (t.big ? " big" : "") + '" id="t_' + i + '" style="' + (dis ? "opacity:.35" : "") + '"><div class="ti">' + UI.icon(t.ic) + '</div><div class="tn">' + t.n + '</div><div class="tc">' + (dis ? "غير متاح في M3U" : t.c) + '</div></div>';
      });
      h += '</div>';
      var rec = Store.recents().slice(0, 6);
      this.rec = rec;
      if (rec.length) {
        h += '<div class="sec-t">تابع المشاهدة</div><div class="recents">';
        rec.forEach(function (r, i) {
          var tag = r.t === "live" ? "مباشر" : r.t === "vod" ? "فيلم" : "حلقة";
          h += '<div class="rc" id="r_' + i + '"><div class="rimg" style="' + UI.cssUrl(r.icon) + '"></div><span class="rt">' + tag + '</span><div class="rn">' + esc(r.name) + '</div></div>';
        });
        h += '</div>';
      }
      h += '<div class="hint"><b>الأحمر</b> الرئيسية · <b>الأخضر</b> بث مباشر · <b>الأصفر</b> أفلام · <b>الأزرق</b> بحث</div>';
      $(this.id).innerHTML = h; UI.tickClock(); this.focus();
    },
    focus: function () {
      var all = document.querySelectorAll("#s-home .foc"), i;
      for (i = 0; i < all.length; i++) all[i].className = all[i].className.replace(" foc", "");
      var e = $((this.row === 0 ? "t_" : "r_") + this.idx); if (e) e.className += " foc";
    },
    key: function (k) {
      var n = this.row === 0 ? TILES.length : this.rec.length;
      if (k === 37) { this.idx = Math.min(n - 1, this.idx + 1); this.focus(); return true; }
      if (k === 39) { this.idx = Math.max(0, this.idx - 1); this.focus(); return true; }
      if (k === 40 && this.row === 0 && this.rec.length) { this.row = 1; this.idx = Math.min(this.idx, this.rec.length - 1); this.focus(); return true; }
      if (k === 38 && this.row === 1) { this.row = 0; this.idx = Math.min(this.idx, TILES.length - 1); this.focus(); return true; }
      if (k === 13) {
        if (this.row === 0) {
          var t = TILES[this.idx];
          if (Api.mode === "m3u" && (t.go === "vod" || t.go === "series")) { UI.toast("هذا القسم غير متاح مع قوائم M3U"); return true; }
          App.go(t.go, t.go === "vod" || t.go === "series" ? { type: t.go } : null);
        } else App.playRecent(this.rec[this.idx]);
        return true;
      }
      return false;
    }
  };

  /* ================= الإعدادات ================= */
  var Settings = {
    id: "s-settings", list: null,
    defs: function () {
      var s = Store.settings, info = Api.info || {}, acc = Store.active() || {};
      var exp = info.exp ? new Date(info.exp * 1000) : null;
      return [
        { l: "الحساب", ro: 1, v: function () { return acc.name || "—"; } },
        { l: "الاشتراك", ro: 1, v: function () { return exp ? exp.getFullYear() + "/" + UI.pad(exp.getMonth() + 1) + "/" + UI.pad(exp.getDate()) : (info.m3u ? "قائمة M3U" : "—"); } },
        { l: "الاتصالات", ro: 1, v: function () { return (info.act || 0) + " من " + (info.max || "—"); } },
        { l: "صيغة البث المباشر", k: "fmt", o: [["m3u8", "HLS (m3u8)"], ["ts", "MPEG-TS"]] },
        { l: "إخفاء محتوى البالغين", k: "hideAdult", o: [[true, "مفعّل"], [false, "متوقف"]], after: function () { App.resetBrowse(); } },
        { l: "نسبة العرض الافتراضية", k: "aspect", o: [["contain", "أصلية"], ["cover", "ملء الشاشة (قص)"], ["fill", "تمديد"]] },
        { l: "إضافة / تبديل حساب", act: function () { Login.forceForm = true; Login.col = 0; App.go("login"); } },
        { l: "تسجيل الخروج", act: function () { Store.setActive(null); App.resetBrowse(); App.go("login", null, { reset: true }); } },
        { l: "مسح المفضلة", act: function () { Store.clearFavs(); UI.toast("تم مسح المفضلة"); } },
        { l: "مسح السجل ومواضع الاستئناف", act: function () { Store.clearHistory(); UI.toast("تم المسح"); } }
      ];
    },
    enter: function () {
      var self = this; this.d = this.defs();
      $(this.id).innerHTML = UI.top('<div class="crumb">الإعدادات</div>', "") + '<div id="st_list" style="margin-top:20px"></div><div class="hint">◀ ▶ لتغيير القيمة · Back رجوع</div>';
      this.list = new UI.VList($("st_list"), { rows: 9, rowH: 94, row: function (d) { return '<span class="rt1">' + d.l + '</span><span class="sv">' + self.val(d) + '</span>'; } });
      this.list.set(this.d, 3); this.list.setActive(true); UI.tickClock();
    },
    val: function (d) {
      if (d.ro) return d.v();
      if (d.act) return "";
      for (var i = 0; i < d.o.length; i++) if (d.o[i][0] === Store.settings[d.k]) return d.o[i][1];
      return d.o[0][1];
    },
    change: function (d, dir) {
      if (!d.o) return;
      var i = 0; for (; i < d.o.length; i++) if (d.o[i][0] === Store.settings[d.k]) break;
      Store.settings[d.k] = d.o[(i + dir + d.o.length) % d.o.length][0]; Store.save(); this.list.render(); if (d.after) d.after();
    },
    key: function (k) {
      var d = this.list.cur();
      if (k === 38) { this.list.move(-1); return true; }
      if (k === 40) { this.list.move(1); return true; }
      if (k === 37) { this.change(d, 1); return true; }
      if (k === 39) { this.change(d, -1); return true; }
      if (k === 13) { if (d.act) d.act(); else this.change(d, 1); return true; }
      return false;
    }
  };

  g.Screens = g.Screens || {};
  g.Screens.login = Login; g.Screens.home = Home; g.Screens.settings = Settings;
})(window);
