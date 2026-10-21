(function () {
  var KLIC = "ukoly-v2";
  var filtr = "vse";
  var noveId = null;
  var ukoly = nacti();

  var seznam = document.getElementById("seznam");
  var prazdne = document.getElementById("prazdne");
  var stav = document.getElementById("stav");
  var pruh = document.getElementById("pruh");
  var vycistit = document.getElementById("vycistit");
  var inNazev = document.getElementById("nazev");
  var inPopis = document.getElementById("popis");
  var inTermin = document.getElementById("termin");

  /* ---------- ukládání ---------- */
  function nacti() {
    try {
      var v2 = JSON.parse(localStorage.getItem(KLIC));
      if (v2) return v2;
      // převod úkolů ze starší verze
      var v1 = JSON.parse(localStorage.getItem("ukoly-v1")) || [];
      return v1.map(function (u) {
        return { id: u.id, nazev: u.text, popis: "", termin: "", hotovo: u.hotovo };
      });
    } catch (e) { return []; }
  }

  function uloz() {
    try { localStorage.setItem(KLIC, JSON.stringify(ukoly)); } catch (e) {}
  }

  /* ---------- pomocné funkce ---------- */
  function skl(n, jedno, dvaCtyri, pet) {
    if (n === 1) return jedno;
    if (n >= 2 && n <= 4) return dvaCtyri;
    return pet;
  }

  function el(tag, trida, text) {
    var e = document.createElement(tag);
    if (trida) e.className = trida;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function formatDatum(iso) {
    return new Date(iso).toLocaleString("cs-CZ", {
      day: "numeric", month: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  // vrací { text, trida } nebo null, když úkol nemá termín
  function odpocet(u) {
    if (!u.termin) return null;
    if (u.hotovo) return { text: "Splněno", trida: "hotovo" };

    var rozdil = new Date(u.termin).getTime() - Date.now();
    var min = Math.floor(Math.abs(rozdil) / 60000);
    var dny = Math.floor(min / 1440);
    var hod = Math.floor((min % 1440) / 60);
    var m = min % 60;
    var cast;

    if (dny >= 1) {
      cast = dny + " " + skl(dny, "den", "dny", "dnů") + (hod ? " " + hod + " hod" : "");
    } else if (hod >= 1) {
      cast = hod + " hod" + (m ? " " + m + " min" : "");
    } else {
      cast = Math.max(m, 1) + " min";
    }

    if (rozdil < 0) return { text: "Po termínu o " + cast, trida: "po" };
    return { text: "Zbývá " + cast, trida: rozdil < 86400000 ? "brzy" : "ok" };
  }

  function seradit(a, b) {
    if (a.hotovo !== b.hotovo) return a.hotovo ? 1 : -1;
    if (a.termin && b.termin) return new Date(a.termin) - new Date(b.termin);
    if (a.termin) return -1;
    if (b.termin) return 1;
    return b.id - a.id;
  }

  /* ---------- vykreslení ---------- */
  function vykresli() {
    var hotovo = ukoly.filter(function (u) { return u.hotovo; }).length;
    var zbyva = ukoly.length - hotovo;

    stav.textContent = ukoly.length === 0
      ? "Zatím tu nic není."
      : (zbyva === 0
          ? "Hotovo, vše splněno."
          : "Zbývá " + zbyva + " " + skl(zbyva, "úkol", "úkoly", "úkolů") + " z " + ukoly.length + ".");
    pruh.style.width = ukoly.length ? (hotovo / ukoly.length * 100) + "%" : "0";
    vycistit.hidden = hotovo === 0;

    var viditelne = ukoly
      .filter(function (u) {
        return filtr === "vse" || (filtr === "hotove" ? u.hotovo : !u.hotovo);
      })
      .sort(seradit);

    seznam.innerHTML = "";
    viditelne.forEach(function (u) {
      var li = el("li");
      if (u.hotovo) li.classList.add("done");
      if (u.id === noveId) li.classList.add("nove");

      var cb = el("input");
      cb.type = "checkbox";
      cb.checked = u.hotovo;
      cb.setAttribute("aria-label", "Hotovo: " + u.nazev);
      cb.addEventListener("change", function () {
        u.hotovo = cb.checked;
        uloz();
        vykresli();
      });

      var obsah = el("div", "obsah");
      obsah.appendChild(el("h2", "nazev", u.nazev));
      if (u.popis) obsah.appendChild(el("p", "popis", u.popis));

      var o = odpocet(u);
      if (o) {
        var meta = el("div", "meta");
        meta.appendChild(el("span", "stitek " + o.trida, o.text));
        meta.appendChild(el("span", "datum", formatDatum(u.termin)));
        obsah.appendChild(meta);
      }

      var del = el("button", "smazat", "×");
      del.type = "button";
      del.setAttribute("aria-label", "Smazat úkol: " + u.nazev);
      del.addEventListener("click", function () {
        ukoly = ukoly.filter(function (x) { return x.id !== u.id; });
        uloz();
        vykresli();
      });

      li.appendChild(cb);
      li.appendChild(obsah);
      li.appendChild(del);
      seznam.appendChild(li);
    });
    noveId = null;

    if (viditelne.length === 0) {
      prazdne.hidden = false;
      prazdne.textContent = ukoly.length === 0
        ? "Přidejte první úkol pomocí formuláře nahoře."
        : (filtr === "hotove" ? "Zatím nemáte žádné hotové úkoly." : "Žádné aktivní úkoly.");
    } else {
      prazdne.hidden = true;
    }
  }

  /* ---------- události ---------- */
  document.getElementById("formular").addEventListener("submit", function (e) {
    e.preventDefault();
    var nazev = inNazev.value.trim();
    if (!nazev) return;
    var u = {
      id: Date.now(),
      nazev: nazev,
      popis: inPopis.value.trim(),
      termin: inTermin.value,   // např. "2026-10-25T18:00" (místní čas)
      hotovo: false
    };
    ukoly.push(u);
    noveId = u.id;
    inNazev.value = "";
    inPopis.value = "";
    inTermin.value = "";
    uloz();
    vykresli();
    inNazev.focus();
  });

  document.querySelectorAll(".filters button").forEach(function (b) {
    b.addEventListener("click", function () {
      filtr = b.getAttribute("data-filtr");
      document.querySelectorAll(".filters button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      vykresli();
    });
  });

  vycistit.addEventListener("click", function () {
    ukoly = ukoly.filter(function (u) { return !u.hotovo; });
    uloz();
    vykresli();
  });

  vykresli();
  setInterval(vykresli, 60000);   // odpočet se obnovuje každou minutu
})();