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



------------------------------------------------------------------------ */


/* ---------- À VOUS : écrivez vos crochets ci-dessous ---------- */

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
