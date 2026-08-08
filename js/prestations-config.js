/* ============================================================
   FELICITI — Plan d'achat : liens de paiement par prestation
   Utilisé par /commander/ pour afficher le bon prix et le bon
   lien Stripe selon le paramètre ?prestation=SLUG de l'URL.
   Liens Stripe actuellement en mode TEST — à remplacer par les
   liens de production avant lancement.
   ============================================================ */

const PRESTATIONS = {
  "faire-part-video": {
    nom: "Le Faire-Part",
    prix: "399 €",
    stripeLink: "https://buy.stripe.com/test_7sYaEX3Gt5AP4e37ah0Ny00"
  },
  "save-the-date": {
    nom: "Le Save-the-Date",
    prix: "149 €",
    stripeLink: "https://buy.stripe.com/test_14A28r6SFgft6mb66d0Ny01"
  },
  "video-temoin": {
    nom: "« Veux-tu être mon témoin ? »",
    prix: "99 €",
    stripeLink: "https://buy.stripe.com/test_14A4gza4R9R5fWLeCJ0Ny02"
  },
  "le-grand-jour": {
    nom: "Formule Le Grand Jour",
    prix: "599 €",
    stripeLink: "https://buy.stripe.com/test_eVqdR9gtfgfth0P3Y50Ny03"
  },
  "anniversaires": {
    nom: "Anniversaires",
    prix: "99 €",
    stripeLink: "https://buy.stripe.com/test_5kQ5kD6SF5APh0P2U10Ny04"
  }
};
