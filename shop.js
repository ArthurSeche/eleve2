/* =====================================================================
   KOP STORE — moteur de la boutique d'entraînement
   ---------------------------------------------------------------------
   Ce fichier fait fonctionner la boutique (catalogue, panier, tunnel
   de commande). Il n'envoie AUCUN événement e-commerce au dataLayer :
   c'est le travail des élèves !

   Pour chaque action importante, la boutique appelle un "crochet"
   (hook) que vous pouvez définir vous-même :

       window.shopHooks = window.shopHooks || {};
       shopHooks.addToCart = function (data) {
         console.log(data);        // regardez ce que contient "data"
         // dataLayer.push({...}); // à vous de jouer
       };

   Liste des crochets disponibles (voir exercice3.html) :
     viewItemList, selectItem, viewItem, selectSize, addToCart,
     addToWishlist, sizeGuideOpen, viewCart, removeFromCart,
     updateQuantity, couponApplied, beginCheckout, addShippingInfo,
     addPaymentInfo, purchase, newsletterSignup

   Toutes les données sont aussi lisibles dans la console via
   window.shop (window.shop.product, window.shop.cart(), window.shop.order)
   ===================================================================== */
(function () {
  "use strict";

  var CURRENCY = "EUR";
  var FREE_SHIPPING_FROM = 60;
  var SHIPPING = {
    standard: { label: "Livraison standard (3-5 jours)", tier: "Standard", price: 4.9 },
    express: { label: "Livraison express (24 h)", tier: "Express", price: 9.9 },
    relais: { label: "Point relais (4-6 jours)", tier: "Point relais", price: 2.9 }
  };
  var COUPONS = {
    GTM10: { type: "percent", value: 10, label: "-10 % sur la commande" },
    ROUGE5: { type: "amount", value: 5, label: "-5 € sur la commande" }
  };

  /* ------------------------------------------------------------------
     CATALOGUE
     ------------------------------------------------------------------ */
  var CATALOG = {
    "maillot-domicile": {
      sku: "SRFC-DOM-26", name: "Maillot Domicile Stade Rennais", brand: "Puma",
      category: "Maillots", category2: "Homme", price: 90, oldPrice: null,
      image: "img/maillot-domicile.jpg",
      images: ["img/maillot-domicile.jpg", "img/maillot-domicile-face.jpg", "img/maillot-domicile-ecusson.jpg", "img/maillot-domicile-tissu.jpg"],
      sizes: ["S", "M", "L", "XL", "XXL"], outOfStock: ["XXL"], lowStock: ["S"],
      flocage: true, badge: "Nouveau", rating: 4.6, reviews: 128,
      short: "Le maillot officiel domicile, version replica. Coupe régulière, tissu respirant dryCELL et motif ton sur ton inspiré de la mosaïque."
    },
    "maillot-exterieur": {
      sku: "KOP-EXT-26", name: "Maillot Extérieur Blanc", brand: "Kop Store",
      category: "Maillots", category2: "Homme", price: 85, oldPrice: null,
      image: "img/maillot-exterieur.svg", images: ["img/maillot-exterieur.svg"],
      sizes: ["S", "M", "L", "XL", "XXL"], outOfStock: [], lowStock: ["XL"],
      flocage: true, badge: null, rating: 4.3, reviews: 57,
      short: "Maillot extérieur blanc à bande rouge et noire. Tissu léger et séchage rapide."
    },
    "short-domicile": {
      sku: "KOP-SHO-26", name: "Short Domicile Noir", brand: "Kop Store",
      category: "Shorts", category2: "Homme", price: 40, oldPrice: null,
      image: "img/short-domicile.svg", images: ["img/short-domicile.svg"],
      sizes: ["S", "M", "L", "XL"], outOfStock: ["S"], lowStock: [],
      flocage: false, badge: null, rating: 4.1, reviews: 23,
      short: "Short de match noir avec liserés rouges, taille élastiquée et cordon de serrage."
    },
    "sweat-supporter": {
      sku: "KOP-SWT-26", name: "Sweat Capuche Supporter", brand: "Kop Store",
      category: "Sweats", category2: "Mixte", price: 59, oldPrice: 75,
      image: "img/sweat.svg", images: ["img/sweat.svg"],
      sizes: ["S", "M", "L", "XL", "XXL"], outOfStock: [], lowStock: ["M"],
      flocage: false, badge: "-21 %", rating: 4.7, reviews: 89,
      short: "Sweat à capuche molletonné, poche kangourou et bande rouge en bas de dos."
    },
    "echarpe": {
      sku: "KOP-ECH-01", name: "Écharpe Supporter Rouge & Noir", brand: "Kop Store",
      category: "Accessoires", category2: "Mixte", price: 22, oldPrice: null,
      image: "img/echarpe.svg", images: ["img/echarpe.svg"],
      sizes: ["Unique"], outOfStock: [], lowStock: [],
      flocage: false, badge: "Best-seller", rating: 4.9, reviews: 312,
      short: "L'écharpe tricotée indispensable pour le virage. Franges aux deux extrémités."
    },
    "ballon": {
      sku: "KOP-BAL-05", name: "Ballon d'entraînement T5", brand: "Kop Store",
      category: "Accessoires", category2: "Mixte", price: 25, oldPrice: null,
      image: "img/ballon.svg", images: ["img/ballon.svg"],
      sizes: ["T5"], outOfStock: [], lowStock: [],
      flocage: false, badge: null, rating: 4.4, reviews: 41,
      short: "Ballon cousu machine, taille 5, idéal pour l'entraînement sur herbe ou synthétique."
    }
  };
  var DEFAULT_PRODUCT = "maillot-domicile";

  /* ------------------------------------------------------------------
     OUTILS
     ------------------------------------------------------------------ */
  var memoryStore = {};
  function load(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      var v = raw ? JSON.parse(raw) : null;
      return v === null ? fallback : v;
    } catch (e) {
      return memoryStore[key] != null ? memoryStore[key] : fallback;
    }
  }
  function save(key, value) {
    memoryStore[key] = value;
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ }
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function euro(n) { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function stars(r) { var full = Math.round(r); return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }

  function productData(pid) {
    var p = CATALOG[pid];
    if (!p) return null;
    var d = copy(p);
    d.id = pid;
    d.url = "produit.html?id=" + pid;
    return d;
  }

  /* Appelle le crochet s'il a été défini par l'élève (ou par le corrigé).
     Si le crochet n'existe pas encore (par exemple s'il est défini dans une
     balise HTML personnalisée GTM, qui se charge après la page), l'appel est
     mis de côté puis rejoué dès que le crochet apparaît (pendant 30 s). */
  var pendingHooks = {};
  function runHook(name, h, data) {
    try { h(copy(data)); } catch (e) { console.error("[shopHooks." + name + "] erreur dans votre code :", e); }
  }
  function hook(name, data) {
    var h = window.shopHooks && window.shopHooks[name];
    if (typeof h === "function") runHook(name, h, data);
    else (pendingHooks[name] = pendingHooks[name] || []).push(copy(data));
  }
  function flushHooks() {
    var hs = window.shopHooks || {};
    Object.keys(pendingHooks).forEach(function (k) {
      if (typeof hs[k] === "function") {
        var queue = pendingHooks[k]; delete pendingHooks[k];
        queue.forEach(function (d) { runHook(k, hs[k], d); });
      }
    });
  }
  (function watchHooks() {
    var started = Date.now();
    var t = setInterval(function () { flushHooks(); if (Date.now() - started > 30000) clearInterval(t); }, 250);
  })();

  function toast(msg) {
    var t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ------------------------------------------------------------------
     PANIER
     ------------------------------------------------------------------ */
  function getCart() { return load("kop_cart", []); }
  function setCart(c) { save("kop_cart", c); updateCartCount(); }

  function lineKey(pid, size, flocage) {
    return pid + "|" + size + "|" + (flocage ? flocage.name + "#" + flocage.number : "");
  }

  function addToCart(pid, size, qty, flocage) {
    var p = productData(pid);
    var unit = p.price + (flocage ? 15 : 0);
    var key = lineKey(pid, size, flocage);
    var cart = getCart();
    var line = cart.filter(function (l) { return l.key === key; })[0];
    if (line) { line.quantity += qty; }
    else {
      line = { key: key, id: pid, sku: p.sku, name: p.name, brand: p.brand, category: p.category, category2: p.category2,
        size: size, flocage: flocage || null, price: unit, quantity: qty, image: p.image };
      cart.push(line);
    }
    setCart(cart);
    return { line: line, addedQuantity: qty };
  }

  function getCoupon() { return load("kop_coupon", null); }

  function totals(cart, shippingMethod) {
    cart = cart || getCart();
    var subtotal = round2(cart.reduce(function (s, l) { return s + l.price * l.quantity; }, 0));
    var code = getCoupon();
    var c = code && COUPONS[code];
    var discount = 0;
    if (c) discount = c.type === "percent" ? round2(subtotal * c.value / 100) : Math.min(c.value, subtotal);
    var afterDiscount = round2(subtotal - discount);
    var method = shippingMethod || "standard";
    var shipping = SHIPPING[method].price;
    if ((method === "standard" || method === "relais") && afterDiscount >= FREE_SHIPPING_FROM) shipping = 0;
    if (!cart.length) shipping = 0;
    var total = round2(afterDiscount + shipping);
    return {
      currency: CURRENCY, subtotal: subtotal, coupon: c ? code : null, discount: discount,
      shippingMethod: method, shippingTier: SHIPPING[method].tier, shipping: shipping,
      total: total, tax: round2(total - total / 1.2), itemCount: cart.reduce(function (s, l) { return s + l.quantity; }, 0)
    };
  }

  function updateCartCount() {
    var n = getCart().reduce(function (s, l) { return s + l.quantity; }, 0);
    $all(".cart-count").forEach(function (el) { el.textContent = n; el.setAttribute("data-count", n); });
  }

  /* ------------------------------------------------------------------
     CARTES PRODUIT (accueil, boutique, "vous aimerez aussi")
     ------------------------------------------------------------------ */
  function cardHTML(pid, listId, listName, index) {
    var p = productData(pid);
    var price = p.oldPrice
      ? '<span class="price price-sale">' + euro(p.price) + '</span><span class="price-old">' + euro(p.oldPrice) + "</span>"
      : '<span class="price">' + euro(p.price) + "</span>";
    return '<article class="product-card" data-id="' + pid + '" data-sku="' + p.sku + '" data-name="' + esc(p.name) +
      '" data-brand="' + esc(p.brand) + '" data-category="' + esc(p.category) + '" data-price="' + p.price +
      '" data-list-id="' + listId + '" data-list-name="' + esc(listName) + '" data-index="' + index + '">' +
      (p.badge ? '<span class="pill ' + (p.oldPrice ? "pill-red" : "") + ' badge">' + esc(p.badge) + "</span>" : "") +
      '<a class="product-link" href="' + p.url + '">' +
      '<div class="thumb"><img src="' + p.image + '" alt="' + esc(p.name) + '" loading="lazy"></div>' +
      '<div class="info"><div class="brand">' + esc(p.brand) + '</div><div class="name">' + esc(p.name) + "</div>" + price + "</div></a></article>";
  }

  function renderList(container, pids, listId, listName) {
    if (!container) return;
    container.innerHTML = pids.map(function (pid, i) { return cardHTML(pid, listId, listName, i); }).join("");
    hook("viewItemList", {
      listId: listId, listName: listName,
      products: pids.map(function (pid, i) { var p = productData(pid); p.index = i; return p; })
    });
    container.addEventListener("click", function (e) {
      var card = e.target.closest(".product-card");
      if (!card || !e.target.closest("a")) return;
      var p = productData(card.getAttribute("data-id"));
      p.index = Number(card.getAttribute("data-index"));
      hook("selectItem", { listId: listId, listName: listName, product: p });
    });
  }

  /* ------------------------------------------------------------------
     PAGE PRODUIT
     ------------------------------------------------------------------ */
  function initProduct() {
    var root = $("#product");
    if (!root) return;
    var params = new URLSearchParams(location.search);
    var pid = params.get("id") && CATALOG[params.get("id")] ? params.get("id") : DEFAULT_PRODUCT;
    var p = productData(pid);

    /* Le HTML de la page décrit le maillot domicile. Pour un autre produit
       (produit.html?id=...), on remplace les informations affichées. */
    if (pid !== DEFAULT_PRODUCT) {
      document.title = p.name + " | Kop Store";
      $("#product-name").textContent = p.name;
      $("#product-brand").textContent = p.brand;
      $("#product-short").textContent = p.short;
      $("#breadcrumb-category").textContent = p.category;
      $("#breadcrumb-name").textContent = p.name;
      $("#product-rating-value").textContent = p.rating.toLocaleString("fr-FR");
      $("#product-rating-count").textContent = p.reviews;
      $(".product-info .stars").textContent = stars(p.rating);
      $all(".js-review-avg").forEach(function (el) { el.textContent = p.rating.toLocaleString("fr-FR"); });
      $all(".js-review-count").forEach(function (el) { el.textContent = p.reviews; });
      var badge = $("#product-badge");
      if (p.badge) { badge.textContent = p.badge; badge.hidden = false; } else { badge.hidden = true; }
      // tailles
      $("#size-list").innerHTML = p.sizes.map(function (s) {
        return '<button type="button" class="size-btn" data-size="' + s + '"' + (p.outOfStock.indexOf(s) > -1 ? " disabled" : "") + ">" + s + "</button>";
      }).join("");
      if (!p.flocage) $("#flocage").hidden = true;
      if (p.sizes.length === 1) { $("#size-guide-btn").hidden = true; }
      // galerie
      $("#gallery-thumbs").innerHTML = p.images.map(function (src, i) {
        return '<button type="button" class="' + (i === 0 ? "active" : "") + '" data-src="' + src + '" aria-label="Image ' + (i + 1) + '"><img src="' + src + '" alt=""></button>';
      }).join("");
      if (p.images.length < 2) $("#gallery-thumbs").hidden = true;
      $("#gallery-main-img").src = p.image;
      $("#gallery-main-img").alt = p.name;
    }
    $("#product-price").innerHTML = p.oldPrice ? euro(p.price) + ' <span class="price-old">' + euro(p.oldPrice) + "</span>" : euro(p.price);

    // les attributs data-* servent de source pour les variables GTM (élément DOM)
    root.setAttribute("data-id", pid);
    root.setAttribute("data-sku", p.sku);
    root.setAttribute("data-name", p.name);
    root.setAttribute("data-brand", p.brand);
    root.setAttribute("data-category", p.category);
    root.setAttribute("data-price", p.price);

    var state = { size: null, quantity: 1, flocage: null };
    window.shop.product = p;
    window.shop.productState = state;

    // --- galerie
    $("#gallery-thumbs").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $all("#gallery-thumbs button").forEach(function (x) { x.classList.toggle("active", x === b); });
      $("#gallery-main-img").src = b.getAttribute("data-src");
    });

    // --- tailles
    var addBtn = $("#add-to-cart");
    function setSize(size) {
      state.size = size;
      $all("#size-list .size-btn").forEach(function (b) { b.classList.toggle("selected", b.getAttribute("data-size") === size); });
      $("#selected-size").textContent = size ? "Taille " + size : "Choisissez une taille";
      addBtn.setAttribute("data-selected-size", size || "");
      $(".size-error").classList.remove("show");
      var stock = $("#stock-info");
      if (p.lowStock.indexOf(size) > -1) { stock.textContent = "Plus que 2 articles en " + size + " !"; stock.classList.add("low"); }
      else { stock.textContent = "En stock — expédié sous 24 h"; stock.classList.remove("low"); }
    }
    $("#size-list").addEventListener("click", function (e) {
      var b = e.target.closest(".size-btn"); if (!b || b.disabled) return;
      setSize(b.getAttribute("data-size"));
      hook("selectSize", { product: p, size: state.size });
    });
    if (p.sizes.length === 1) setSize(p.sizes[0]);

    // --- flocage
    var floc = $("#flocage-check");
    if (floc) {
      floc.addEventListener("change", function () {
        $("#flocage").classList.toggle("open", floc.checked);
        $("#product-price").innerHTML = euro(p.price + (floc.checked ? 15 : 0));
      });
    }

    // --- quantité
    var qtyInput = $("#qty-input");
    function setQty(n) { state.quantity = Math.max(1, Math.min(10, n || 1)); qtyInput.value = state.quantity; }
    $("#qty-minus").addEventListener("click", function () { setQty(state.quantity - 1); });
    $("#qty-plus").addEventListener("click", function () { setQty(state.quantity + 1); });
    qtyInput.addEventListener("change", function () { setQty(parseInt(qtyInput.value, 10)); });

    // --- ajout au panier
    addBtn.addEventListener("click", function () {
      if (!state.size) {
        $(".size-error").classList.add("show");
        $("#size-list").scrollIntoView({ behavior: "smooth", block: "center" });
        return; // ⚠️ pas de taille = pas d'ajout (mais le clic a bien eu lieu !)
      }
      var flocage = null;
      if (floc && floc.checked && p.flocage) {
        flocage = { name: ($("#flocage-name").value || "").toUpperCase().slice(0, 12) || "KOP", number: $("#flocage-number").value || "10" };
      }
      var res = addToCart(pid, state.size, state.quantity, flocage);
      hook("addToCart", {
        product: p, size: state.size, quantity: state.quantity, flocage: flocage,
        unitPrice: res.line.price, value: round2(res.line.price * state.quantity), currency: CURRENCY
      });
      openDrawer(res.line, state.quantity);
      var cl = $(".cart-link"); if (cl) { cl.classList.remove("bump"); void cl.offsetWidth; cl.classList.add("bump"); }
    });

    // --- acheter maintenant (lien direct vers confirmation.html)
    var buyNow = $("#buy-now");
    if (buyNow) {
      buyNow.addEventListener("click", function () {
        var size = state.size || (p.sizes.indexOf("M") > -1 ? "M" : p.sizes[0]);
        var line = { key: lineKey(pid, size, null), id: pid, sku: p.sku, name: p.name, brand: p.brand, category: p.category,
          category2: p.category2, size: size, flocage: null, price: p.price, quantity: state.quantity, image: p.image };
        createOrder([line], { shippingMethod: "standard", paymentType: "Achat express", coupon: null, source: "buy_now" });
      });
    }

    // --- liste d'envies
    var wish = $("#wishlist-btn");
    var wl = load("kop_wishlist", []);
    function paintWish() { var on = wl.indexOf(pid) > -1; wish.classList.toggle("on", on); wish.textContent = on ? "♥" : "♡"; wish.setAttribute("aria-pressed", on); }
    paintWish();
    wish.addEventListener("click", function () {
      var i = wl.indexOf(pid);
      if (i > -1) { wl.splice(i, 1); toast("Retiré de vos favoris"); }
      else { wl.push(pid); toast("Ajouté à vos favoris ♥"); hook("addToWishlist", { product: p, size: state.size }); }
      save("kop_wishlist", wl); paintWish();
    });

    // --- guide des tailles
    var guideBtn = $("#size-guide-btn"), dlg = $("#size-guide");
    if (guideBtn && dlg) {
      guideBtn.addEventListener("click", function () {
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
        hook("sizeGuideOpen", { product: p });
      });
      $all("[data-close-dialog]", dlg).forEach(function (b) { b.addEventListener("click", function () { dlg.close ? dlg.close() : dlg.removeAttribute("open"); }); });
    }

    // --- produits associés
    var related = Object.keys(CATALOG).filter(function (k) { return k !== pid; }).slice(0, 4);
    renderList($("#related-products"), related, "related_products", "Vous aimerez aussi");

    hook("viewItem", { product: p });
  }

  /* ------------------------------------------------------------------
     MINI-PANIER (tiroir après ajout)
     ------------------------------------------------------------------ */
  function ensureDrawer() {
    var d = $("#cart-drawer");
    if (d) return d;
    d = document.createElement("aside");
    d.id = "cart-drawer"; d.className = "drawer"; d.setAttribute("aria-label", "Mini-panier");
    d.innerHTML = '<header><h2>Panier</h2><button type="button" class="btn btn-ghost" data-close-drawer aria-label="Fermer">✕</button></header>' +
      '<div class="drawer-body"></div>' +
      '<footer><a href="panier.html" class="btn btn-outline btn-block" id="drawer-view-cart">Voir le panier</a>' +
      '<a href="commande.html" class="btn btn-primary btn-block" id="drawer-checkout">Commander</a></footer>';
    var bd = document.createElement("div"); bd.className = "drawer-backdrop"; bd.setAttribute("data-close-drawer", "");
    document.body.appendChild(d); document.body.appendChild(bd);
    $all("[data-close-drawer]").forEach(function (b) { b.addEventListener("click", closeDrawer); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
    return d;
  }
  function openDrawer(line, qty) {
    var d = ensureDrawer();
    var t = totals();
    $(".drawer-body", d).innerHTML = '<div class="added-msg">✓ Ajouté au panier</div>' +
      '<div class="cart-line" style="grid-template-columns:72px 1fr"><img src="' + line.image + '" alt="" style="width:72px;height:72px">' +
      "<div><strong>" + esc(line.name) + '</strong><div class="meta">Taille ' + esc(line.size) +
      (line.flocage ? " · Flocage " + esc(line.flocage.name) + " " + esc(line.flocage.number) : "") +
      " · Qté " + qty + "</div><div class=\"price\">" + euro(line.price * qty) + "</div></div></div>" +
      '<div class="summary" style="position:static;border:0;padding:0"><div class="row"><span>' + t.itemCount + " article(s) dans le panier</span><strong>" + euro(t.subtotal) + "</strong></div>" +
      freeShipHTML(t) + "</div>";
    d.classList.add("open");
    d.nextElementSibling.classList.add("open");
  }
  function closeDrawer() {
    var d = $("#cart-drawer"); if (!d) return;
    d.classList.remove("open"); d.nextElementSibling.classList.remove("open");
  }
  function freeShipHTML(t) {
    var left = round2(FREE_SHIPPING_FROM - (t.subtotal - t.discount));
    var pct = Math.min(100, Math.round((t.subtotal - t.discount) / FREE_SHIPPING_FROM * 100));
    return '<div class="free-ship">' + (left > 0 ? "Plus que <b>" + euro(left) + "</b> pour la livraison offerte" : "🎉 Livraison standard offerte !") +
      '<i><b style="width:' + pct + '%"></b></i></div>';
  }

  /* ------------------------------------------------------------------
     PAGE PANIER
     ------------------------------------------------------------------ */
  function initCart() {
    var box = $("#cart-lines");
    if (!box) return;

    function render() {
      var cart = getCart(), t = totals(cart);
      if (!cart.length) {
        $("#cart-layout").innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h2>Votre panier est vide</h2><p>Un maillot, une écharpe… le virage vous attend.</p><a class="btn btn-primary" href="boutique.html">Voir la boutique</a></div>';
        return;
      }
      box.innerHTML = cart.map(function (l) {
        return '<div class="cart-line" data-key="' + esc(l.key) + '" data-sku="' + l.sku + '" data-name="' + esc(l.name) + '" data-price="' + l.price + '" data-quantity="' + l.quantity + '">' +
          '<a href="produit.html?id=' + l.id + '"><img src="' + l.image + '" alt="' + esc(l.name) + '"></a>' +
          "<div><strong>" + esc(l.name) + '</strong><div class="meta">' + esc(l.brand) + " · Taille " + esc(l.size) +
          (l.flocage ? " · Flocage « " + esc(l.flocage.name) + " " + esc(l.flocage.number) + " » (+15 €)" : "") + " · " + euro(l.price) + " / pièce</div>" +
          '<div class="line-actions"><div class="qty"><button type="button" class="qty-minus" aria-label="Diminuer">−</button><input type="number" value="' + l.quantity + '" min="1" max="10" aria-label="Quantité" readonly><button type="button" class="qty-plus" aria-label="Augmenter">+</button></div>' +
          '<button type="button" class="remove-btn">Supprimer</button></div></div>' +
          '<div class="line-total">' + euro(l.price * l.quantity) + "</div></div>";
      }).join("");
      $("#summary-subtotal").textContent = euro(t.subtotal);
      $("#summary-discount-row").hidden = !t.discount;
      $("#summary-discount").textContent = "−" + euro(t.discount);
      $("#summary-coupon-code").textContent = t.coupon || "";
      $("#summary-shipping").textContent = t.shipping ? euro(t.shipping) : "Offerte";
      $("#summary-total").textContent = euro(t.total);
      $("#free-ship").innerHTML = freeShipHTML(t);
      $("#coupon-input").value = t.coupon || "";
    }

    box.addEventListener("click", function (e) {
      var lineEl = e.target.closest(".cart-line"); if (!lineEl) return;
      var key = lineEl.getAttribute("data-key");
      var cart = getCart();
      var idx = -1; cart.forEach(function (l, i) { if (l.key === key) idx = i; });
      if (idx < 0) return;
      var l = cart[idx];
      if (e.target.closest(".remove-btn")) {
        cart.splice(idx, 1); setCart(cart);
        hook("removeFromCart", { line: l, quantity: l.quantity, value: round2(l.price * l.quantity), currency: CURRENCY });
        toast("Article supprimé du panier");
      } else if (e.target.closest(".qty-minus")) {
        if (l.quantity <= 1) return;
        l.quantity -= 1; setCart(cart);
        hook("updateQuantity", { line: l, change: -1 });
        hook("removeFromCart", { line: l, quantity: 1, value: l.price, currency: CURRENCY });
      } else if (e.target.closest(".qty-plus")) {
        if (l.quantity >= 10) return;
        l.quantity += 1; setCart(cart);
        hook("updateQuantity", { line: l, change: +1 });
        hook("addToCart", { product: productData(l.id), size: l.size, quantity: 1, flocage: l.flocage, unitPrice: l.price, value: l.price, currency: CURRENCY, from: "cart" });
      } else { return; }
      render();
    });

    $("#coupon-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var code = $("#coupon-input").value.trim().toUpperCase();
      var msg = $("#coupon-msg");
      if (!code) { save("kop_coupon", null); msg.textContent = ""; render(); return; }
      if (COUPONS[code]) {
        save("kop_coupon", code);
        msg.className = "coupon-msg ok"; msg.textContent = "Code " + code + " appliqué : " + COUPONS[code].label;
        hook("couponApplied", { coupon: code, valid: true, cart: getCart(), totals: totals() });
      } else {
        msg.className = "coupon-msg ko"; msg.textContent = "Ce code n'existe pas.";
        hook("couponApplied", { coupon: code, valid: false });
      }
      render();
    });

    render();
    if (getCart().length) hook("viewCart", { lines: getCart(), totals: totals() });
  }

  /* ------------------------------------------------------------------
     PAGE COMMANDE (tunnel)
     ------------------------------------------------------------------ */
  function initCheckout() {
    var form = $("#checkout");
    if (!form) return;
    var cart = getCart();
    if (!cart.length) {
      $("#checkout-layout").innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h2>Votre panier est vide</h2><p>Ajoutez un article avant de passer commande.</p><a class="btn btn-primary" href="boutique.html">Voir la boutique</a></div>';
      return;
    }
    var method = "standard";

    function renderSummary() {
      var t = totals(cart, method);
      $("#co-lines").innerHTML = cart.map(function (l) {
        return '<div class="row"><span>' + l.quantity + " × " + esc(l.name) + " <small>(" + esc(l.size) + ")</small></span><span>" + euro(l.price * l.quantity) + "</span></div>";
      }).join("");
      $("#co-subtotal").textContent = euro(t.subtotal);
      $("#co-discount-row").hidden = !t.discount;
      $("#co-discount").textContent = "−" + euro(t.discount) + (t.coupon ? " (" + t.coupon + ")" : "");
      $("#co-shipping").textContent = t.shipping ? euro(t.shipping) : "Offerte";
      $("#co-total").textContent = euro(t.total);
      $("#pay-amount").textContent = euro(t.total);
      $all("[data-ship-price]").forEach(function (el) {
        var m = el.getAttribute("data-ship-price"), tt = totals(cart, m);
        el.textContent = tt.shipping ? euro(tt.shipping) : "Offerte";
      });
      return t;
    }
    renderSummary();
    hook("beginCheckout", { lines: cart, totals: totals(cart, method) });

    $all('input[name="shipping"]').forEach(function (r) {
      r.addEventListener("change", function () { method = r.value; renderSummary(); });
    });

    $("#fill-test-data").addEventListener("click", function () {
      var v = { email: "eleve@exemple.fr", firstname: "Camille", lastname: "Martin", address: "12 rue du Stade", zip: "35000", city: "Rennes", phone: "0600000000" };
      Object.keys(v).forEach(function (k) { var el = form.elements[k]; if (el) el.value = v[k]; });
    });

    var step1 = $("#step-shipping"), step2 = $("#step-payment");
    $("#to-payment").addEventListener("click", function () {
      var required = ["email", "firstname", "lastname", "address", "zip", "city"];
      for (var i = 0; i < required.length; i++) {
        var el = form.elements[required[i]];
        if (!el.value.trim()) { el.reportValidity ? el.setCustomValidity("Champ obligatoire") : 0; el.reportValidity && el.reportValidity(); el.setCustomValidity(""); el.focus(); return; }
      }
      var t = renderSummary();
      step1.classList.add("completed");
      $("#shipping-summary-text").textContent = form.elements.firstname.value + " " + form.elements.lastname.value + ", " + form.elements.city.value + " — " + SHIPPING[method].tier;
      step2.classList.remove("locked");
      $("#steps li:nth-child(2)").className = "done"; $("#steps li:nth-child(3)").className = "current";
      hook("addShippingInfo", { lines: cart, totals: t, shippingTier: SHIPPING[method].tier });
    });
    $("#edit-shipping").addEventListener("click", function () {
      step1.classList.remove("completed"); step2.classList.add("locked");
      $("#steps li:nth-child(2)").className = "current"; $("#steps li:nth-child(3)").className = "";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.elements.cgv.checked) { form.elements.cgv.reportValidity && form.elements.cgv.reportValidity(); return; }
      var pay = form.querySelector('input[name="payment"]:checked').value;
      var t = totals(cart, method);
      hook("addPaymentInfo", { lines: cart, totals: t, paymentType: pay });
      var btn = $("#pay-btn"); btn.disabled = true; btn.textContent = "Paiement en cours…";
      setTimeout(function () {
        createOrder(cart, { shippingMethod: method, paymentType: pay, coupon: t.coupon, source: "checkout", customer: form.elements.firstname.value });
        setCart([]); save("kop_coupon", null);
        location.href = "confirmation.html";
      }, 700);
    });
  }

  /* ------------------------------------------------------------------
     COMMANDE / CONFIRMATION
     ------------------------------------------------------------------ */
  function createOrder(lines, opts) {
    var t = totals(lines, opts.shippingMethod);
    if (!opts.coupon) { t.total = round2(t.subtotal + t.shipping); t.discount = 0; t.coupon = null; t.tax = round2(t.total - t.total / 1.2); }
    var order = {
      transaction_id: "KOP-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString(), lines: copy(lines), subtotal: t.subtotal, discount: t.discount, coupon: t.coupon,
      shipping: t.shipping, shippingTier: t.shippingTier, paymentType: opts.paymentType, tax: t.tax, total: t.total,
      currency: CURRENCY, source: opts.source, customer: opts.customer || null, views: 0
    };
    save("kop_last_order", order);
    return order;
  }

  function initConfirmation() {
    var box = $("#order-box");
    if (!box) return;
    var order = load("kop_last_order", null);
    var demo = false;
    if (!order) {
      // arrivée directe sur la page : on fabrique une commande de démonstration
      var p = productData(DEFAULT_PRODUCT);
      order = createOrder([{ key: "demo", id: DEFAULT_PRODUCT, sku: p.sku, name: p.name, brand: p.brand, category: p.category, category2: p.category2,
        size: "M", flocage: null, price: p.price, quantity: 1, image: p.image }], { shippingMethod: "standard", paymentType: "Achat express", source: "direct" });
      demo = true;
    }
    order.views = (order.views || 0) + 1;
    save("kop_last_order", order);
    window.shop.order = order;

    $("#order-id").textContent = order.transaction_id;
    if (order.customer) $("#confirm-name").textContent = ", " + order.customer;
    box.setAttribute("data-transaction-id", order.transaction_id);
    box.setAttribute("data-value", order.total);
    $("#order-lines").innerHTML = order.lines.map(function (l) {
      return "<tr><td>" + esc(l.name) + " <small>(" + esc(l.size) + (l.flocage ? " · flocage " + esc(l.flocage.name) + " " + esc(l.flocage.number) : "") + ")</small></td><td>" + l.quantity + "</td><td>" + euro(l.price * l.quantity) + "</td></tr>";
    }).join("");
    $("#order-subtotal").textContent = euro(order.subtotal);
    $("#order-discount-row").hidden = !order.discount;
    $("#order-discount").textContent = "−" + euro(order.discount) + (order.coupon ? " (" + order.coupon + ")" : "");
    $("#order-shipping").textContent = (order.shipping ? euro(order.shipping) : "Offerte") + " — " + order.shippingTier;
    $("#order-payment").textContent = order.paymentType;
    $("#order-total").textContent = euro(order.total);
    $("#order-tax").textContent = euro(order.tax);
    if (order.views > 1) $("#reload-warning").hidden = false;
    if (demo) $("#demo-note").hidden = false;

    hook("purchase", { order: order, firstView: order.views === 1 });
  }

  /* ------------------------------------------------------------------
     BOUTIQUE + ACCUEIL
     ------------------------------------------------------------------ */
  function initShopList() {
    var grid = $("#shop-grid");
    if (grid) {
      var all = Object.keys(CATALOG);
      renderList(grid, all, "boutique", "Boutique - tous les produits");
      $all(".filter-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $all(".filter-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
          var cat = b.getAttribute("data-filter");
          $all(".product-card", grid).forEach(function (c) { c.hidden = cat !== "all" && c.getAttribute("data-category") !== cat; });
        });
      });
    }
    var best = $("#home-bestsellers");
    if (best) renderList(best, ["maillot-domicile", "echarpe", "sweat-supporter", "maillot-exterieur"], "home_bestsellers", "Accueil - meilleures ventes");
  }

  /* ------------------------------------------------------------------
     NEWSLETTER (pied de page)
     ------------------------------------------------------------------ */
  function initNewsletter() {
    var f = $("#newsletter-form");
    if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = f.elements.email.value;
      $(".newsletter-msg").textContent = "Merci ! Vous êtes inscrit·e à la newsletter.";
      hook("newsletterSignup", { email: email, location: "footer" });
      f.reset();
    });
  }

  /* ------------------------------------------------------------------
     CHOIX DU CONTENEUR GTM (voir gtm-install.js)
     ------------------------------------------------------------------ */
  function gtmStatusText() {
    var g = window.KOP_GTM;
    if (!g) return "gtm-install.js n'est pas chargé sur cette page";
    if (!g.id) return "Aucun conteneur GTM chargé (mode « sans GTM »)";
    return "Conteneur actif : " + g.id + (g.source === "défaut" ? " (celui du formateur)" : " (le vôtre)");
  }
  function goWithGtm(value) {
    var params = new URLSearchParams(location.search);
    params.set("gtm", value);
    location.search = params.toString();
  }
  function gtmForm(dark) {
    var g = window.KOP_GTM || {};
    var f = document.createElement("form");
    f.className = "gtm-form" + (dark ? " dark" : "");
    f.innerHTML = '<p class="gtm-status"></p>' +
      '<div class="gtm-row"><label class="visually-hidden">ID du conteneur GTM</label>' +
      '<input type="text" name="gtm" placeholder="GTM-XXXXXXX" autocomplete="off" spellcheck="false" value="' + (g.source === "élève" ? esc(g.id) : "") + '">' +
      '<button type="submit" class="btn btn-primary btn-small">Utiliser</button></div>' +
      '<p class="gtm-actions"><button type="button" class="link-btn" data-gtm="">Revenir au conteneur du formateur</button> · ' +
      '<button type="button" class="link-btn" data-gtm="off">Charger la page sans GTM</button></p>' +
      '<p class="gtm-error" role="alert"></p>';
    $(".gtm-status", f).textContent = gtmStatusText();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = f.elements.gtm.value.trim().toUpperCase();
      if (!/^GTM-[A-Z0-9]{4,12}$/.test(v)) { $(".gtm-error", f).textContent = "Format attendu : GTM- suivi de lettres et chiffres (ex. GTM-ABC1234)."; return; }
      goWithGtm(v);
    });
    $all("[data-gtm]", f).forEach(function (b) { b.addEventListener("click", function () { goWithGtm(b.getAttribute("data-gtm")); }); });
    return f;
  }
  function initGtmConfig() {
    $all(".gtm-config-slot").forEach(function (slot) { slot.appendChild(gtmForm(false)); });
  }

  /* ------------------------------------------------------------------
     PANNEAU "VOIR LE DATALAYER" (aide pédagogique)
     ------------------------------------------------------------------ */
  function initDataLayerViewer() {
    window.dataLayer = window.dataLayer || [];
    var btn = document.createElement("button");
    btn.className = "dl-toggle"; btn.type = "button"; btn.textContent = "{ } dataLayer";
    var panel = document.createElement("div");
    panel.className = "dl-panel";
    panel.innerHTML = '<div class="dl-head"><span>window.dataLayer</span><button type="button">fermer</button></div><div class="dl-gtm"></div><div class="dl-list"></div>';
    document.body.appendChild(btn); document.body.appendChild(panel);
    $(".dl-gtm", panel).appendChild(gtmForm(true));
    var list = $(".dl-list", panel), seen = 0;
    function fmt(o) {
      try {
        return JSON.stringify(o, function (k, v) { return (v instanceof Element) ? "<" + v.tagName.toLowerCase() + ">" : v; }, 2);
      } catch (e) { return String(o); }
    }
    function refresh() {
      var dl = window.dataLayer;
      for (; seen < dl.length; seen++) {
        var o = dl[seen], div = document.createElement("div");
        var name = o && o.event ? o.event : (o && typeof o === "object" && "ecommerce" in o && o.ecommerce === null ? "(reset ecommerce)" : "(message)");
        div.className = "dl-entry" + (seen > 0 ? " fresh" : "");
        div.innerHTML = '<span class="ev">' + esc("#" + seen + " " + name) + "</span>\n" + esc(fmt(o));
        list.insertBefore(div, list.firstChild);
      }
    }
    function setOpen(open) { panel.classList.toggle("open", open); save("kop_dl_open", open); if (open) refresh(); }
    btn.addEventListener("click", function () { setOpen(!panel.classList.contains("open")); });
    $("button", panel).addEventListener("click", function () { setOpen(false); });
    setInterval(function () { if (panel.classList.contains("open")) refresh(); }, 400);
    if (load("kop_dl_open", false)) setOpen(true);
  }

  /* ------------------------------------------------------------------
     DÉMARRAGE
     ------------------------------------------------------------------ */
  window.shop = {
    catalog: CATALOG, coupons: COUPONS, shipping: SHIPPING,
    cart: getCart, totals: totals, product: null, order: null, flushHooks: flushHooks,
    reset: function () { ["kop_cart", "kop_coupon", "kop_wishlist", "kop_last_order"].forEach(function (k) { save(k, null); }); updateCartCount(); toast("Boutique réinitialisée"); }
  };

  function init() {
    updateCartCount();
    initShopList();
    initProduct();
    initCart();
    initCheckout();
    initConfirmation();
    initNewsletter();
    initGtmConfig();
    initDataLayerViewer();
    $all("[data-reset-shop]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); window.shop.reset(); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
