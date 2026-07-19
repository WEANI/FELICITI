# FELICITI

Prestations digitales haut de gamme dédiées au mariage.
Site éditorial multipage : accueil scrollytelling + une page par prestation.

> Le dossier s'appelle encore `le-fil-rouge/` (historique). La marque, elle, est **FELICITI**.

## Le hero scroll-driven

Le hero EST la démo du produit : la vidéo (« le faire-part qui devient lumière » —
enveloppes → particules d'or → ville de nuit → constellation) se déroule au rythme
du scroll du visiteur, comme le faire-part que vivront ses invités.

- **Source** : `public/hero/hero.mp4` (1280×720, 15 s) + 181 frames webp dans
  `public/hero/frames/` (~5,9 Mo) + `public/hero/poster.webp`.
- **Moteur** : `js/main.js` — préchargement par lots, canvas scrubé
  (Lenis + GSAP ScrollTrigger), chapitres synchronisés, révélation finale.
- **Fallback mobile / reduced-motion** : pas de scrub — lecture du mp4
  (autoplay muet) avec chapitres sur `timeupdate` ; reduced-motion = poster + révélation.

### Réglages (dans `js/main.js` et `index.html`)
- `FRAME_COUNT = 181` — nombre de frames extraites.
- Hauteur du scrub : `.hero-scroll { height: 450vh }` dans le CSS (plus haut = plus lent).
- Position des chapitres : attributs `data-at="0.08 | 0.32 | 0.55 | 0.75"` dans `index.html`
  (progression 0→1) ; fenêtre de visibilité `CHAP_SPAN` dans `main.js`.
- Révélation : `REVEAL_AT = 0.90`.

### Ré-extraire les frames (ffmpeg)
```
ffmpeg -i hero.mp4 -vf "fps=12,scale=1280:-2" -c:v libwebp -q:v 78 public/hero/frames/frame_%03d.webp
```
Cible ~180 frames / ≤6 Mo ; si trop lourd, refaire en `fps=8` (et ajuster `FRAME_COUNT`).
> Note : le lettrage doré visible dans la vidéo générée est approximatif (« Wedtng ») —
> à corriger en régénérant le clip si besoin.

### Legacy
`public/frames/acte1(-m)`, `acte2(-m)`, `public/posters/` et `assets/video/acte*.mp4`
appartiennent à l'ancien hero (fil rouge, 2 actes) — plus référencés par le code,
conservés pour mémoire. Supprimables pour alléger le dépôt.

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
- **Le récit visuel** : l'or est la lumière du récit (particules, constellation) —
  il vit dans la vidéo ; l'interface reste sobre, le bronze est son seul accent.
- **Typo** : Cormorant Garamond (titres), Jost 300-400 (corps).
- **Wordmark** : FELICITI, capitales espacées (0.28em), le point du dernier « I »
  est un point rond bronze au-dessus de la lettre (header, fin du hero, footer).
- **Mode sombre désactivé** : `<meta name="color-scheme" content="only light">` +
  `color-scheme: only light` sur toutes les pages.
