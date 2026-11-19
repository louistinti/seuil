# Seuil : composants partagés

Seuil est une entreprise fictive, conçue comme démonstration. Ce document accompagne `tokens.css`, `tokens.json` et `simulateur.json`.

## Conventions

- **Thèmes.** Le site est clair (`:root`). Tout ce qui montre le produit est sombre : poser `data-theme="produit"` sur le conteneur (simulateur, captures d'écran, panneaux Alertes et Portefeuille, bandeau d'appel à l'action).
- **Tokens.** Les noms ci-dessous sont ceux de `tokens.css`. Aucune valeur en dur dans les composants.
- **États.** Chaque composant liste cinq états : défaut, survol, focus, désactivé, erreur. « Dessiné » signifie que l'état existe sur les planches. « À dériver » signifie qu'il n'a pas été dessiné et qu'il faut l'appliquer selon la règle indiquée. « Sans objet » signifie que l'état n'a pas de sens pour ce composant.
- **Focus.** Partout le même : contour de 2 px `--color-focus-ring`, décalé de 2 px.
- **Mobile.** Cible tactile de 44 px minimum (`--target-min`), 8 px entre deux cibles, bouton principal en pleine largeur.
- **Chiffres.** Tous les montants et pourcentages en Geist avec `font-variant-numeric: tabular-nums`. Urbanist n'a pas de chiffres tabulaires : ne pas l'utiliser pour un montant. Pourcentages calculés avec une décimale (88,2 %).
- **Libellés de résultat.** Acceptée, Refusée, Envoyée à l'analyste. Jamais d'autre formulation.
- **Halo.** Le halo flou (`--color-halo`, flou `--blur-halo`) n'existe que derrière une carte de verre, jamais seul en fond. Un seul par écran.
- **Texte.** Français, sans tiret cadratin. Trait d'union insécable dans « passe‑t‑elle » et « change‑t‑il ».

## Sections du CMS

| Section | Composants utilisés |
|---|---|
| hero | Navigation, Étiquette, Bouton, Simulateur ou Capture produit, Champ, Chip de choix |
| problème | Carte de contenu, Emplacement |
| bénéfices par rôle | Carte de contenu, Lien fléché |
| étapes | Étape numérotée |
| bloc fonctionnalité | Liste à coches, Capture produit, Panneau de données, Badge d'état, Tableau |
| intégrations | Tuile d'intégration, Carte de contenu, Emplacement |
| témoignage | Emplacement |
| tarifs | Carte de formule, Bouton, Liste à coches, Emplacement |
| FAQ | Item de FAQ |
| appel à l'action | Bandeau d'appel à l'action, Bouton, Formulaire de démo |

## Navigation

### Navigation du site
- **Variantes.** Desktop : logo, pilule de 4 liens, bouton principal. Mobile : logo, bouton « Démo » (44 px), bouton menu (44 px).
- **États.** Défaut : dessiné. Page courante : dessiné (lien sur fond `--neutral-900`, texte `--neutral-50`, `aria-current="page"`). Survol : à dériver (fond `--color-bg-subtle`). Focus : règle commune. Désactivé, erreur : sans objet. Le menu mobile ouvert n'est pas dessiné.
- **Tokens.** `--color-bg-surface`, `--color-border-default`, `--color-text-primary`, `--radius-full`, `--text-sm-*`, `--space-100`, `--space-200`.
- **Sections.** Toutes les pages, au-dessus du hero.

### Pied de page
- **Variantes.** Desktop en ligne, mobile empilé.
- **États.** Défaut : dessiné. Survol des liens : `--color-accent-text`. Focus : règle commune. Autres : sans objet.
- **Tokens.** `--color-border-default`, `--color-text-primary`, `--color-text-secondary`, `--text-sm-*`.
- **Contenu obligatoire.** « Seuil est une entreprise fictive, conçue comme démonstration. »
- **Sections.** Toutes les pages.

## Actions

### Bouton
- **Variantes.** Principal (fond accent), secondaire (verre ou contour), tertiaire (lien fléché), icône (rond, 48 px, `aria-label` obligatoire). Tailles : 48 px par défaut, 40 px réservé au desktop dans le produit.
- **États du principal.** Défaut, survol, focus, désactivé : dessinés. Erreur : sans objet.
- **États des autres variantes.** Défaut : dessiné. Survol : à dériver (secondaire : `--color-bg-subtle` ; tertiaire : soulignement). Focus : règle commune. Désactivé : à dériver avec `--color-disabled-*`.
- **Tokens.** `--color-accent-default`, `--color-accent-hover`, `--color-text-on-accent`, `--color-accent-text`, `--color-bg-glass`, `--color-border-glass`, `--color-border-strong`, `--color-disabled-bg`, `--color-disabled-text`, `--radius-full`, `--text-md-*`, `--space-300`.
- **Comportement.** Le libellé ne passe pas à la ligne. Pleine largeur sur mobile pour le principal.
- **Sections.** hero, bénéfices par rôle, tarifs, appel à l'action.

### Chip de choix
- **Variantes.** Client (3 choix), montant (5 choix). Sélection unique.
- **États.** Défaut et sélectionné : dessinés (`aria-pressed`). Survol : à dériver (`--color-bg-subtle`). Focus : règle commune. Désactivé, erreur : sans objet.
- **Tokens.** `--color-bg-glass`, `--color-border-glass`, `--color-text-primary`, `--radius-full`, `--text-sm-*`. Sélectionné : fond `--color-text-primary`, texte `--color-bg-page`.
- **Sections.** hero (dans le simulateur). Même composant pour les filtres de la file des exceptions.

## Saisie

### Champ texte et liste déroulante
- **Variantes.** Texte, numérique (« Autre montant »), liste déroulante. Libellé toujours visible au-dessus, texte d'aide optionnel en dessous.
- **États.** Défaut, focus, erreur : dessinés dans les deux thèmes. Survol : à dériver (bordure `--color-text-primary`). Désactivé : à dériver avec `--color-disabled-*`.
- **Erreur.** Bordure de 2 px `--color-state-refused-text`, icône et message sous le champ, `role="alert"`. Message du simulateur : « Saisissez un montant en chiffres. »
- **Tokens.** `--color-bg-surface` (clair) ou `--color-bg-subtle` (sombre), `--color-border-strong`, `--color-text-primary`, `--color-text-secondary`, `--color-state-refused-text`, `--radius-md`, `--text-md-*`, `--text-sm-*`, `--text-xs-*`. Hauteur 48 px.
- **Sections.** hero (simulateur), appel à l'action (formulaire de démo).

### Formulaire de démo
- **Variantes.** Une seule : 4 champs (prénom et nom, e-mail professionnel, entreprise, rôle) et un bouton principal.
- **États.** Défaut : dessiné. Erreur par champ : celle du composant Champ. Envoi en cours et confirmation : non dessinés.
- **Tokens.** Ceux de Carte de contenu, Champ et Bouton, `--space-300` entre les champs.
- **Sections.** appel à l'action (page Demande de démo).

## Statuts

### Badge d'état
- **Variantes.** Acceptée (coche), Refusée (croix), Envoyée à l'analyste (horloge). Toujours icône et libellé, jamais la couleur seule. Accepte un compteur (« 3 envoyées à l'analyste »).
- **États.** Défaut : dessiné dans les deux thèmes. Non interactif : survol, focus, désactivé, erreur sans objet.
- **Tokens.** `--color-state-accepted-text`, `--color-state-accepted-bg`, `--color-state-refused-text`, `--color-state-refused-bg`, `--color-state-pending-text`, `--color-state-pending-bg`, `--radius-full`, `--text-sm-*`. Hauteur 28 px.
- **Sections.** hero, bloc fonctionnalité.

### Étiquette
- **Variantes.** Neutre à contour (« Données fictives », « Règle 2 », « Groupe », « Limite »).
- **États.** Défaut : dessiné. Non interactive.
- **Tokens.** `--color-border-default`, `--color-text-secondary`, `--radius-sm`, `--text-xs-*`. Hauteur 24 px.
- **Sections.** hero, bloc fonctionnalité. « Données fictives » est obligatoire sur toute capture ou tout panneau de données.

### Badge de priorité
- **Variantes.** « Priorité haute » uniquement (demandes de la règle 4).
- **États.** Défaut : dessiné. Non interactif.
- **Tokens.** Fond `--color-text-primary`, texte `--color-bg-page`, `--radius-full`, `--text-xs-*`.
- **Sections.** bloc fonctionnalité (file des exceptions).

### Échéance
- **Variantes.** Icône horloge et texte neutre (« Livraison demain », « Sous 3 jours », « Sans échéance »). Jamais d'ambre : l'ambre est réservé à l'état Envoyée à l'analyste.
- **États.** Défaut : dessiné. Non interactif.
- **Tokens.** `--color-text-primary`, `--text-sm-*`.
- **Sections.** bloc fonctionnalité.

## Données

### Carte de chiffre
- **Variantes.** Avec jauge, avec ligne secondaire, sans.
- **États.** Défaut : dessiné dans les deux thèmes. Non interactive.
- **Tokens.** `--color-bg-glass`, `--color-border-glass`, `--blur-glass`, `--shadow-md`, `--radius-xl`, `--figure-lg-*`, `--text-sm-*`, `--color-text-primary`, `--color-text-secondary`, `--space-300`.
- **Sections.** bloc fonctionnalité.

### Jauge
- **Variantes.** Une seule, 8 px de haut. Toujours accompagnée de sa valeur en texte.
- **États.** Défaut : dessiné. Non interactive.
- **Tokens.** Remplissage `--color-gauge-fill` (3:1 sur la piste dans les deux thèmes), piste `--color-border-default`, `--radius-full`.
- **Sections.** hero (simulateur), bloc fonctionnalité.

### Bloc règle
- **Variantes.** Numéro de règle ou « Par défaut », suivi du libellé de la règle.
- **États.** Défaut : dessiné. Non interactif.
- **Tokens.** Contour pointillé `--color-border-strong`, `--color-accent-text` pour le numéro, `--color-text-secondary` pour le texte, `--radius-md`, `--text-sm-*`.
- **Règle d'usage.** Toute décision affichée cite sa règle. Les libellés exacts sont dans `simulateur.json`.
- **Sections.** hero, bloc fonctionnalité.

### Carte de décision
- **Variantes.** Acceptée, Refusée, Envoyée à l'analyste (avec ou sans « Priorité haute »). Contient un Badge d'état, une phrase de verdict, un Bloc règle, des vérifications optionnelles et des actions.
- **États.** Acceptée : dessinée. Refusée et Envoyée à l'analyste : dessinées dans le simulateur seulement.
- **Tokens.** Ceux de Carte de chiffre, plus `--title-sm-*` pour le verdict et `--color-halo` derrière la carte.
- **Sections.** hero, bloc fonctionnalité.

### Tableau
- **Variantes.** Clients (client, encours, limite, usage, commande, décision), file des exceptions, factures. Sur mobile : cartes empilées (client, encours / limite, badge de décision), jamais de défilement horizontal.
- **États.** Défaut et ligne sélectionnée (contour `--color-accent-default`) : dessinés. Survol de ligne : à dériver (`--color-bg-subtle`). Focus : règle commune sur le lien d'ouverture (44 px).
- **Tokens.** `--color-bg-glass`, `--color-border-default`, `--text-sm-*`, `--text-xs-*` pour les en-têtes, `--figure-sm-*` pour les montants alignés à droite, `--radius-xl`. Lignes de 56 px, en-tête de 40 px.
- **Sections.** bloc fonctionnalité.

### Panneau de données
- **Variantes.** Alertes (liste client, message, étiquette de type), Portefeuille clients (3 chiffres, tableau ou cartes, répartition des décisions).
- **États.** Défaut : dessiné. Non interactif.
- **Tokens.** Fond `--neutral-900`, `--radius-2xl`, `--shadow-lg`, puis les tokens du thème produit.
- **Sections.** bloc fonctionnalité.

## Mise en scène du produit

### Simulateur de décision
- **Variantes.** Desktop (520 px de large, faits du client sur 2 colonnes), mobile (pleine largeur, faits sur 1 colonne).
- **Contenu.** Chips client, faits du client (encours, limite, retard en cours, pire retard 12 mois, assurance-crédit), chips montant, champ « Autre montant », résultat (`aria-live="polite"`), encours après commande, jauge, bloc règle.
- **États.** Trois résultats et la priorité haute : dessinés. Erreur de saisie : dessinée. Survol et focus : ceux de Chip et de Champ.
- **Tokens.** Fond `--neutral-900` à 92 %, `--color-border-glass`, `--blur-glass`, `--radius-2xl`, `--shadow-lg`, `--color-halo` derrière la carte.
- **Logique.** Voir `simulateur.json` : clients, règles, seuils et cas attendus.
- **Sections.** hero (accueil).

### Capture produit
- **Variantes.** Écran complet de 1440 × 1000 réduit à 90 % (desktop), recadrage d'un panneau (mobile), téléphone de 390 × 844.
- **États.** Statique.
- **Tokens.** `--radius-2xl`, `--shadow-lg`.
- **Règle d'usage.** L'étiquette « Données fictives » reste visible dans la capture.
- **Sections.** hero (page Commerciaux), bloc fonctionnalité.

## Contenu

### Carte de contenu
- **Variantes.** Simple (titre, texte), rôle (surtitre, titre, texte, lien fléché), résultat (badge, titre, texte), DSI (titre, texte, emplacement).
- **États.** Défaut : dessiné. La carte n'est pas cliquable, seul son lien l'est.
- **Tokens.** `--color-bg-surface`, `--color-border-default`, `--radius-xl`, `--space-300`, `--title-sm-*`, `--text-md-*`.
- **Sections.** problème, bénéfices par rôle, intégrations (bloc DSI).

### Lien fléché
- **Variantes.** Une seule, hauteur de 44 px.
- **États.** Défaut : dessiné. Survol : soulignement, à dériver. Focus : règle commune.
- **Tokens.** `--color-accent-text`, `--text-md-*`, graisse 600.
- **Sections.** bénéfices par rôle.

### Étape numérotée
- **Variantes.** En colonnes avec filet supérieur (accueil, commerciaux), en liste avec numéro à gauche (démo).
- **États.** Statique.
- **Tokens.** `--color-text-primary` pour le filet de 2 px, `--title-lg-*` pour le numéro, `--title-sm-*`, `--text-md-*`.
- **Sections.** étapes.

### Liste à coches
- **Variantes.** Claire, sombre (dans la carte de formule mise en avant).
- **États.** Statique.
- **Tokens.** `--color-accent-text` pour la coche, `--text-md-*`, `--space-200` entre les lignes.
- **Sections.** bloc fonctionnalité, tarifs.

### Tuile d'intégration
- **Variantes.** Titre et description. Sans logo ni nom d'éditeur réel.
- **États.** Statique.
- **Tokens.** `--color-bg-surface`, `--color-border-default`, `--radius-lg`, `--text-md-*`, `--text-sm-*`.
- **Sections.** intégrations.

### Emplacement
- **Variantes.** « donnée sourcée à venir », « emplacement témoignage client », « emplacement logo client », prix, seuils, précisions DSI, délai de réponse.
- **États.** Statique. À remplacer par du contenu réel et sourcé, jamais par un chiffre ou un témoignage inventé.
- **Tokens.** Contour pointillé `--color-border-strong`, `--color-text-secondary`, `--radius-lg`, `--text-sm-*`.
- **Sections.** problème, témoignage, tarifs, intégrations, appel à l'action.

### Carte de formule
- **Variantes.** Claire, mise en avant (thème produit). Ordre du contenu : nom, clients actifs, description, prix, liste à coches, bouton.
- **États.** Défaut : dessiné. La carte n'est pas cliquable.
- **Tokens.** Ceux de Carte de contenu, `--title-sm-*` pour le seuil de clients actifs.
- **Règle d'usage.** Les formules se distinguent d'abord par le nombre de clients actifs. Prix et seuils sont des emplacements.
- **Sections.** tarifs.

### Item de FAQ
- **Variantes.** Question et réponse toujours visibles. Aucune version repliable n'est dessinée.
- **États.** Statique.
- **Tokens.** `--color-border-default` pour le filet, `--title-sm-*`, `--text-md-*`, `--space-300`.
- **Sections.** FAQ.

### Bandeau d'appel à l'action
- **Variantes.** Une seule : titre, phrase, bouton principal, sur fond sombre.
- **États.** Ceux du Bouton.
- **Tokens.** Fond `--neutral-900`, `--radius-2xl`, `--title-xl-*` (desktop) ou `--title-md-*` (mobile), thème produit pour le contenu.
- **Sections.** appel à l'action.

## Ce qui n'est pas dessiné

- Menu mobile ouvert.
- Survol des composants autres que le bouton principal.
- États désactivés autres que celui du bouton principal.
- Envoi et confirmation du formulaire de démo.
- FAQ repliable.
- Largeurs intermédiaires entre 390 et 1440 px.
