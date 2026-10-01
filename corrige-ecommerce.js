/* =====================================================================
   CORRIGÉ — remontées e-commerce GA4 via dataLayer.push
   ---------------------------------------------------------------------
   Pour activer le corrigé sur une page, remplacez :
       <script src="mes-tags.js"></script>
   par :
       <script src="corrige-ecommerce.js"></script>
   (ou ajoutez la ligne en plus de mes-tags.js).

   ⚠️ Réservé au formateur : pensez à retirer ce fichier des dépôts élèves.

   Côté GTM, il suffit ensuite de :
     1. un déclencheur "Événement personnalisé" par nom d'événement
        (ou un seul avec l'expression régulière ci-dessous) ;
     2. une balise "Google Analytics : événement GA4" avec
        Nom de l'événement = {{Event}} et
        "Envoyer les données e-commerce" = Couche de données.

   Regex pratique pour un déclencheur unique :
   ^(view_item_list|select_item|view_item|add_to_cart|add_to_wishlist|view_cart|remove_from_cart|begin_checkout|add_shipping_info|add_payment_info|purchase)$
   ===================================================================== */
window.dataLayer = window.dataLayer || [];
window.shopHooks = window.shopHooks || {};

(function (hooks) {
  "use strict";

  /* --- Outils de conversion vers le format "item" de GA4 ------------- */
  function productToItem(p, extra) {
    var item = {
      item_id: p.sku,
      item_name: p.name,
      item_brand: p.brand,
      item_category: p.category,
      item_category2: p.category2,
      price: p.price,
      quantity: 1
    };
    if (p.oldPrice) item.discount = Math.round((p.oldPrice - p.price) * 100) / 100;
    for (var k in extra) item[k] = extra[k];
    return item;
  }

  function lineToItem(l, extra) {
    var item = {
      item_id: l.sku,
      item_name: l.name,
      item_brand: l.brand,
      item_category: l.category,
      item_category2: l.category2,
      item_variant: l.size,
      price: l.price,
      quantity: l.quantity
    };
    if (l.flocage) item.customisation = "Flocage " + l.flocage.name + " " + l.flocage.number;
    for (var k in extra) item[k] = extra[k];
    return item;
  }

  function push(eventName, ecommerce) {
    dataLayer.push({ ecommerce: null }); // vide l'objet ecommerce de l'événement précédent
    dataLayer.push({ event: eventName, ecommerce: ecommerce });
  }

  /* --- Listes produits ------------------------------------------------ */
  hooks.viewItemList = function (d) {
    push("view_item_list", {
      item_list_id: d.listId,
      item_list_name: d.listName,
      items: d.products.map(function (p) {
        return productToItem(p, { index: p.index, item_list_id: d.listId, item_list_name: d.listName });
      })
    });
  };

  hooks.selectItem = function (d) {
    push("select_item", {
      item_list_id: d.listId,
      item_list_name: d.listName,
      items: [productToItem(d.product, { index: d.product.index, item_list_id: d.listId, item_list_name: d.listName })]
    });
  };

  /* --- Fiche produit -------------------------------------------------- */
  hooks.viewItem = function (d) {
    push("view_item", {
      currency: "EUR",
      value: d.product.price,
      items: [productToItem(d.product)]
    });
  };

  hooks.addToCart = function (d) {
    var item = productToItem(d.product, { item_variant: d.size, price: d.unitPrice, quantity: d.quantity });
    if (d.flocage) item.customisation = "Flocage " + d.flocage.name + " " + d.flocage.number;
    push("add_to_cart", { currency: d.currency, value: d.value, items: [item] });
  };

  hooks.addToWishlist = function (d) {
    var extra = d.size ? { item_variant: d.size } : {};
    push("add_to_wishlist", { currency: "EUR", value: d.product.price, items: [productToItem(d.product, extra)] });
  };

  // Événement personnalisé (pas un événement e-commerce GA4 standard)
  hooks.sizeGuideOpen = function (d) {
    dataLayer.push({ event: "size_guide_open", product_id: d.product.sku, product_name: d.product.name });
  };

  /* --- Panier --------------------------------------------------------- */
  hooks.viewCart = function (d) {
    push("view_cart", {
      currency: d.totals.currency,
      value: d.totals.subtotal,
      items: d.lines.map(function (l) { return lineToItem(l); })
    });
  };

  hooks.removeFromCart = function (d) {
    push("remove_from_cart", {
      currency: d.currency,
      value: d.value,
      items: [lineToItem(d.line, { quantity: d.quantity })]
    });
  };

  hooks.couponApplied = function (d) {
    dataLayer.push({ event: "coupon_applied", coupon: d.coupon, coupon_valid: d.valid });
  };

  /* --- Tunnel de commande -------------------------------------------- */
  function checkoutPayload(d, extra) {
    var e = {
      currency: d.totals.currency,
      value: Math.round((d.totals.subtotal - d.totals.discount) * 100) / 100,
      items: d.lines.map(function (l) { return lineToItem(l); })
    };
    if (d.totals.coupon) e.coupon = d.totals.coupon;
    for (var k in extra) e[k] = extra[k];
    return e;
  }

  hooks.beginCheckout = function (d) { push("begin_checkout", checkoutPayload(d)); };
  hooks.addShippingInfo = function (d) { push("add_shipping_info", checkoutPayload(d, { shipping_tier: d.shippingTier })); };
  hooks.addPaymentInfo = function (d) { push("add_payment_info", checkoutPayload(d, { payment_type: d.paymentType })); };

  /* --- Achat ---------------------------------------------------------- */
  hooks.purchase = function (d) {
    if (!d.firstView) {
      // Page rechargée ou revisitée : on n'envoie PAS une 2e fois la transaction
      console.info("[corrigé] purchase ignoré : la commande " + d.order.transaction_id + " a déjà été envoyée.");
      return;
    }
    var o = d.order;
    var e = {
      transaction_id: o.transaction_id,
      currency: o.currency,
      value: Math.round((o.total - o.shipping) * 100) / 100, // valeur hors frais de port (choix à documenter !)
      tax: o.tax,
      shipping: o.shipping,
      items: o.lines.map(function (l) { return lineToItem(l); })
    };
    if (o.coupon) e.coupon = o.coupon;
    push("purchase", e);
  };

  /* --- Newsletter ----------------------------------------------------- */
  hooks.newsletterSignup = function (d) {
    // on n'envoie jamais l'e-mail en clair dans GA4 !
    dataLayer.push({ event: "generate_lead", lead_source: "newsletter_" + d.location });
  };
})(window.shopHooks);
