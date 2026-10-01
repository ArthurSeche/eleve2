/* =====================================================================
   MES TAGS — le fichier de l'élève
   ---------------------------------------------------------------------
   Ce fichier est chargé sur TOUTES les pages du site.
   C'est ici que vous écrivez vos dataLayer.push pour les exercices
   e-commerce (voir exercice3.html).

   Chaque fois que quelque chose se passe dans la boutique, elle appelle
   la fonction correspondante de window.shopHooks si vous l'avez écrite.
   Commencez toujours par regarder ce que contient "data" :

       shopHooks.addToCart = function (data) {
         console.log("addToCart", data);
       };

   Astuce : le bouton "{ } dataLayer" en bas à gauche de chaque page
   affiche en direct tout ce qui est poussé dans le dataLayer.
   ===================================================================== */
window.dataLayer = window.dataLayer || [];
window.shopHooks = window.shopHooks || {};


/* ---------- MODÈLE (exercice 1) : à décommenter et compléter ----------

shopHooks.viewItem = function (data) {
  var p = data.product;
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "view_item",
/* ---------- À VOUS : écrivez vos crochets ci-dessous ---------- */

/* 1. Le dictionnaire : vocabulaire de la boutique → vocabulaire GA4 */
function versItem(x) {
  return {
    item_id: x.sku,
    item_name: x.name,
    item_brand: x.brand,
    item_category: x.category,
    item_variant: x.size,       // vide quand on regarde un produit sans taille choisie
    price: x.price,
    quantity: x.quantity || 1   // 1 par défaut
  };
}

/* 2. Vue d'un produit */
shopHooks.viewItem = function (data) {
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "view_item",
    ecommerce: {
      currency: "EUR",
      value: data.product.price,
      items: [versItem(data.product)]
    }
  });
};

/* 3. Ajout au panier */
shopHooks.addToCart = function (data) {
  var item = versItem(data.product);
  item.item_variant = data.size;      // la taille choisie
  item.price = data.unitPrice;        // le prix, flocage compris
  item.quantity = data.quantity;      // la quantité ajoutée
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "add_to_cart",
    ecommerce: {
      currency: "EUR",
      value: data.value,
      items: [item]
    }
  });
};

/* 4. Début de commande */
shopHooks.beginCheckout = function (data) {
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "begin_checkout",
    ecommerce: {
      currency: "EUR",
      value: data.totals.subtotal - data.totals.discount,
      coupon: data.totals.coupon || undefined,
      items: data.lines.map(versItem)
    }
  });
};

/* 5. Achat */
shopHooks.purchase = function (data) {
  if (!data.firstView) return; // page rechargée : on n'envoie pas l'achat une 2e fois
  var o = data.order;
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "purchase",
    ecommerce: {
      transaction_id: o.transaction_id,
      currency: o.currency,
      value: Math.round((o.total - o.shipping) * 100) / 100,
      tax: o.tax,
      shipping: o.shipping,
      coupon: o.coupon || undefined,
      items: o.lines.map(versItem)
    }
  });
};
