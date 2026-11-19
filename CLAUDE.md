# Seuil, site de démonstration

Site marketing d'un SaaS B2B fictif, réalisé pour un portfolio de Product Designer. Six pages, chacune en desktop (1440 px) et mobile (390 px) : Accueil, Produit, Finance et credit management, Commerciaux et ADV, Tarifs, Demande de démo.

## Stack

- Framework : Astro (site statique)
- Langage : TypeScript
- Styles : CSS natif avec les variables de `tokens.css`, sans Tailwind
- Contenu : Sanity. Schémas calqués sur le tableau « Sections du CMS » de `composants.md`, champs obligatoires validés. Studio déployé séparément (`sanity deploy`), avec des aperçus lisibles par une personne non technique. Un script remplit Sanity à partir de `contenu/`.
- Publication : webhook Sanity vers le hook de déploiement. Une publication est en ligne en moins de 2 minutes.
- Simulateur : un seul composant interactif côté client, en TypeScript sans framework. Sa logique et ses données restent dans `simulateur.json`, hors CMS.
- Tests : Vitest pour le moteur de décision, Playwright avec axe pour le clavier, le focus et les contrastes, dans les deux thèmes, à 390 et 1440 px.
- Polices : auto-hébergées via @fontsource (Urbanist, Geist, Geist Mono), aucun appel à Google Fonts.
- Gestionnaire de paquets : npm
- Repo : public, `louistinti/seuil`
- Hébergement : Vercel

Si un de ces choix pose problème, le signaler avant d'écrire du code plutôt que d'en changer en silence.

## Sources de vérité

- `tokens.css` et `tokens.json` : toutes les couleurs, tailles, espacements, rayons et ombres. Aucune valeur en dur dans les composants.
- `composants.md` : les composants partagés, leurs variantes, leurs états, leurs tokens et les sections qui les utilisent.
- `simulateur.json` : les clients, les 4 règles, les seuils et les résultats attendus.

## Thèmes

- Le site est clair (`:root`).
- Tout ce qui montre le produit est sombre : poser `data-theme="produit"` sur le conteneur (simulateur, captures d'écran, panneaux de données, bandeau d'appel à l'action).

## Sections de page

Chaque page est une suite de sections typées : hero, problème, bénéfices par rôle, étapes, bloc fonctionnalité, intégrations, témoignage, tarifs, FAQ, appel à l'action. Une section correspond à un composant Astro et à un schéma de contenu.

## Simulateur de décision

- Implémenter le moteur de règles comme une fonction pure, séparée de l'interface.
- Écrire les tests à partir de `cas_attendus` et `cas_aux_bornes` de `simulateur.json`. Tous doivent passer.
- Comparer en entiers : `total × 100 > limite × 110`, et non `total > limite × 1,10`.
- Les règles s'appliquent dans l'ordre, la première qui correspond décide.
- Libellés de résultat, sans variante : Acceptée, Refusée, Envoyée à l'analyste.
- Le champ « Autre montant » accepte un entier strictement positif. Sinon, message : « Saisissez un montant en chiffres. »
- Quand encours + commande dépasse la limite, ne pas afficher de pourcentage : afficher « Dépasse la limite de X € ». Le bloc règle indique la condition qui a échoué (par exemple, pour Valdorre à 67 601 € : couverture de 200 000 € inférieure à 250 001 €). Ajouter ce cas aux tests.

## Règles de contenu

- Tous les textes en français. Jamais de tiret cadratin.
- Aucun chiffre de marché, témoignage ou logo client inventé : conserver les emplacements tels quels (« donnée sourcée à venir », « emplacement témoignage client », « emplacement logo client », prix et seuils des formules).
- Aucun nom d'entreprise réelle dans les données fictives.
- Toute capture ou tout panneau de données porte l'étiquette « Données fictives ».
- Pied de page, sur toutes les pages : « Seuil est une entreprise fictive, conçue comme démonstration. »
- Le formulaire de démo n'envoie rien et l'indique : « Formulaire de démonstration : rien n'est envoyé. »

## Accessibilité et responsive

- Contrastes conformes WCAG AA.
- Cibles tactiles de 44 px minimum sur mobile, 8 px entre deux cibles, bouton principal en pleine largeur.
- Focus visible partout : contour de 2 px `--color-focus-ring`, décalé de 2 px.
- Les états sont toujours portés par une icône et un libellé, jamais par la couleur seule.
- Montants et pourcentages en Geist avec `font-variant-numeric: tabular-nums`. Pourcentages calculés avec une décimale, jusqu'à la limite incluse.
- Sur mobile, les tableaux deviennent des cartes empilées, sans défilement horizontal.

## Ce qui n'est pas dessiné

Menu mobile ouvert, survols autres que celui du bouton principal, états désactivés autres que celui du bouton principal, envoi et confirmation du formulaire, FAQ repliable, largeurs entre 390 et 1440 px. Pour chacun, proposer une solution cohérente avec `composants.md` et la signaler, ou demander.

## Commandes

- Développement : `npm run dev`
- Tests du moteur : `npm test`
- Tests d'accessibilité : `npm run test:e2e`
- Build : `npm run build`
