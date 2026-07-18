# FELICITI

Prestations digitales haut de gamme dédiées au mariage.
Site éditorial multipage : accueil scrollytelling + une page par prestation.

> Le dossier s'appelle encore `le-fil-rouge/` (historique). La marque, elle, est **FELICITI**.

## Deux plans, une intention

Le site vit sur deux registres complémentaires :

- **Le récit visuel** — la vidéo et les posters, où un **fil rouge** relie les amoureux.
  C'est une image ; elle n'a pas besoin d'être nommée.
- **La voix de la marque** — les textes, qui parlent de **félicité**, de bonheur, de
  lumière, de récit et de promesse. Le mot *félicité* (bonheur parfait) donne son nom à la maison.

Un symbole à l'écran (rouge), un mot à l'oreille (félicité) : c'est ce contraste qui fait
le haut de gamme. Le vocabulaire de la couture (fil, tisser, coudre…) est banni des textes
marketing ; il ne subsiste que dans les `alt`, qui décrivent sobrement l'image.

## Structure

```
index.html                 Accueil : hero scrollytelling + aperçu prestations + approche
                           + galerie + témoignages + démo WhatsApp + formulaire de devis
prestations/               Index listant les 7 pages produit
faire-part-video/          ┐
save-the-date/             │
site-de-mariage/           │  Pages produit (prix « à partir de », CTA devis + WhatsApp)
video-temoin/              │
livre-d-or-video/          │
capsule-anniversaire/      │
le-grand-jour/             ┘
mentions-legales/          ┐
confidentialite/           │  Pages légales placeholder [À COMPLÉTER]
cgv/                       ┘
css/style.css              Direction artistique (palette lin/crème/taupe/bronze, Cormorant + Jost)
js/main.js                 Moteur scroll-scrub du hero (GSAP ScrollTrigger + Lenis) — accueil seul
js/site.js                 En-tête au scroll, nav mobile, formulaire — toutes pages
sitemap.xml · robots.txt   SEO
public/frames · posters    Frames webp + posters de la vidéo scrollée
```

## À personnaliser avant mise en production

### 1. Numéro WhatsApp
Placeholder `33600000000` utilisé partout (`wa.me/33600000000?...`).
Remplacer par le vrai numéro (format international, sans `+`) :
```
grep -rl "33600000000" .
```

### 2. Endpoint du formulaire (Formspree)
Dans `index.html`, `#devis-form` pointe vers `https://formspree.io/f/xxxxxxxx`.
Remplacer `xxxxxxxx` par l'identifiant Formspree réel. `js/site.js` détecte le
placeholder et affiche la confirmation sans POST tant qu'il n'est pas remplacé.

### 3. Prix
Chaque tarif « à partir de » est rendu dans la page produit correspondante
(`<slug>/index.html`) : ligne `.price-value` **et** le JSON-LD `schema.org/Product`
(`"price"`). Les modifier aux deux endroits pour rester cohérent.

| Prestation           | À partir de |
|----------------------|-------------|
| Faire-part vidéo     | 390 €       |
| Save-the-date        | 150 €       |
| Site de mariage      | 490 €       |
| Vidéo témoin         | 89 €        |
| Livre d'Or vidéo     | 290 €       |
| Capsule anniversaire | 49 € (offerte avec Le Grand Jour) |
| Formule Le Grand Jour| 1 490 €     |

### 4. Frames du hero (ffmpeg)
Le hero lit des séquences webp 12 fps depuis `public/frames/acte1(-m)/` et
`public/frames/acte2(-m)/` (181 frames chacune, `f_0001.webp` …). Les posters et
frames actuels (avec leur fil rouge) sont **conservés tels quels** — ils sont cohérents
avec le récit visuel, aucune régénération n'est nécessaire.
Pour intégrer d'autres vidéos, extraire les frames aux mêmes cadrages :
```
ffmpeg -i acte1.mp4 -vf "fps=12,scale=1920:-1" public/frames/acte1/f_%04d.webp
ffmpeg -i acte1.mp4 -vf "fps=12,scale=828:-1"  public/frames/acte1-m/f_%04d.webp
```
(idem `acte2`). Voir `assets/video/` pour les sources.

### Cache des assets
Les liens `css/style.css` et `js/*.js` portent un suffixe `?v=N`. Incrémenter `N`
à chaque modification pour forcer le rafraîchissement (déjà `?v=5`).

## Développement local
```
python3 -m http.server 8642 --directory .
# → http://localhost:8642
```

## Identité
- **Palette d'interface** : lin `#F3EDE4`, crème `#FAF6EF`, taupe `#D8CBB8`,
  encre `#2E2620`, brun grisé `#8A7D6D`, **accent unique bronze `#A6845C`**
  (liens, filets, boutons, point du « I »).
- **Le fil du récit visuel** : carmin profond `--fil: #8E2A35` — réservé au tracé
  animé et aux médias. Aucun bouton, lien, titre ou filet d'interface n'est rouge ;
  le bronze n'apparaît dans aucun média représentant le fil.
- **Typo** : Cormorant Garamond (titres), Jost 300-400 (corps).
- **Wordmark** : FELICITI, capitales espacées (0.28em), le point du dernier « I »
  est un point rond bronze au-dessus de la lettre (header, fin du hero, footer).
- **Mode sombre désactivé** : `<meta name="color-scheme" content="only light">` +
  `color-scheme: only light` sur toutes les pages.
