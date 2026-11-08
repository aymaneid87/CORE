/* التخزين المحلي: الحسابات، المفضلة، السجل، مواضع الاستئناف، الإعدادات */
(function (g) {
  "use strict";
  var KEY = "core.iptv.v1";
  var DEF = { accounts: [], active: null, settings: { fmt: "m3u8", hideAdult: true, aspect: "contain" }, fav: {}, recent: {}, resume: {} };
  var data = (function () {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    o = o || {};
    for (var k in DEF) if (o[k] === undefined) o[k] = JSON.parse(JSON.stringify(DEF[k]));
    for (var s in DEF.settings) if (o.settings[s] === undefined) o.settings[s] = DEF.settings[s];
    return o;
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function aid() { return data.active || "_"; }
  function list(map) { var a = aid(); return map[a] || (map[a] = []); }

  g.Store = {
    data: data, save: save, settings: data.settings,
    accounts: function () { return data.accounts; },
    addAccount: function (acc) {
      for (var i = 0; i < data.accounts.length; i++) {
        var a = data.accounts[i];
        if (a.url === acc.url && a.user === acc.user) { acc.id = a.id; data.accounts[i] = acc; save(); return acc; }
      }
      acc.id = "a" + Date.now(); data.accounts.push(acc); save(); return acc;
    },
    removeAccount: function (id) {
      data.accounts = data.accounts.filter(function (a) { return a.id !== id; });
      delete data.fav[id]; delete data.recent[id]; delete data.resume[id];
      if (data.active === id) data.active = null; save();
    },
    setActive: function (id) { data.active = id; save(); },
    active: function () { for (var i = 0; i < data.accounts.length; i++) if (data.accounts[i].id === data.active) return data.accounts[i]; return null; },

    favs: function (t) { var l = list(data.fav); return t ? l.filter(function (f) { return f.t === t; }) : l; },
    isFav: function (t, id) { return list(data.fav).some(function (f) { return f.t === t && String(f.id) === String(id); }); },
    toggleFav: function (item) {
      var l = list(data.fav), i;
      for (i = 0; i < l.length; i++) if (l[i].t === item.t && String(l[i].id) === String(item.id)) { l.splice(i, 1); save(); return false; }
      l.unshift({ t: item.t, id: item.id, name: item.name, icon: item.icon, ext: item.ext, url: item.url, cat: item.cat }); save(); return true;
    },
    clearFavs: function () { data.fav[aid()] = []; save(); },

    recents: function () { return list(data.recent); },
    addRecent: function (item) {
      var l = list(data.recent), i;
      for (i = 0; i < l.length; i++) if (l[i].t === item.t && String(l[i].id) === String(item.id)) { l.splice(i, 1); break; }
      l.unshift({ t: item.t, id: item.id, name: item.name, icon: item.icon, ext: item.ext, url: item.url, cat: item.cat, sid: item.sid });
      if (l.length > 12) l.length = 12; save();
    },
    getResume: function (key) { var r = data.resume[aid()]; return r && r[key] || null; },
    setResume: function (key, pos, dur) {
      var r = data.resume[aid()] || (data.resume[aid()] = {});
      if (dur && pos > dur - 45) delete r[key]; else r[key] = { pos: Math.floor(pos), dur: Math.floor(dur || 0) };
      save();
    },
    clearHistory: function () { data.recent[aid()] = []; data.resume[aid()] = {}; save(); }
  };
})(window);
