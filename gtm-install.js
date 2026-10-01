/* =====================================================================
   INSTALLATION DE GOOGLE TAG MANAGER — un seul fichier pour tout le site
   ---------------------------------------------------------------------
   Toutes les pages chargent ce fichier tout en haut du <head>.
   Il contient le code officiel de GTM, mais l'ID du conteneur
   n'est pas écrit en dur : chaque élève choisit le sien.

   Choisir son conteneur (une seule fois, il est mémorisé par le navigateur) :
     https://.../hello.html?gtm=GTM-ABC1234   → utilise le conteneur GTM-ABC1234
     https://.../hello.html?gtm=off           → aucun conteneur (page "vierge")
     https://.../hello.html?gtm=              → revient au conteneur par défaut
   On peut aussi le changer avec le formulaire "Conteneur GTM" du site.
   ===================================================================== */
(function () {
  "use strict";

  var DEFAULT_ID = "GTM-TN8FV9WX"; // conteneur du formateur
  var KEY = "kop_gtm_id";
  var VALID = /^GTM-[A-Z0-9]{4,12}$/;

  var id = null, source = "défaut";
  var fromUrl = new URLSearchParams(location.search).get("gtm");
  var stored = null;
  try { stored = window.localStorage.getItem(KEY); } catch (e) { /* stockage indisponible */ }

  if (fromUrl !== null) {
    var v = fromUrl.trim().toUpperCase();
    if (v === "") { stored = null; }
    else if (v === "OFF" || VALID.test(v)) { stored = v; }
    try {
      if (stored) window.localStorage.setItem(KEY, stored);
      else window.localStorage.removeItem(KEY);
    } catch (e) { /* stockage indisponible */ }
  }

  if (stored === "OFF") { id = null; source = "désactivé"; }
  else if (stored && VALID.test(stored)) { id = stored; source = "élève"; }
  else { id = DEFAULT_ID; source = "défaut"; }

  window.KOP_GTM = { id: id, source: source, defaultId: DEFAULT_ID, storageKey: KEY };
  window.dataLayer = window.dataLayer || [];

  if (!id) return;

  /* --- Code officiel Google Tag Manager (partie <head>) --- */
  (function (w, d, s, l, i) {
    w[l] = w[l] || []; w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != "dataLayer" ? "&l=" + l : "";
    j.async = true; j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl; f.parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", id);
})();
