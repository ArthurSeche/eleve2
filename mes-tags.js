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
    ecommerce: {
      currency: "EUR",
      value: p.price,
      items: [{
        item_id: p.sku,
        item_name: p.name
        // ... complétez : item_brand, item_category, price, quantity
      }]
    }
  });
};

------------------------------------------------------------------------ */


/* ---------- À VOUS : écrivez vos crochets ci-dessous ---------- */

shopHooks.viewItem = function (data) {
  var p = data.product;
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "view_item",
    ecommerce: {
      currency: "EUR",
      value: p.price,
      items: [{
        item_id: p.sku,
        item_name: p.name,
        item_brand: p.brand,
        item_category: p.category,
        price: p.price,
        quantity: 1
      }]
    }
  });
};

