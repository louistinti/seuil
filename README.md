# Seuil, site de démonstration

Site marketing d'un SaaS B2B fictif de décision de crédit client. Seuil est une entreprise fictive, conçue comme démonstration.

Six pages (Accueil, Produit, Finance et credit management, Commerciaux et ADV, Tarifs, Demande de démo), en 1440 et 390 px, dont le contenu se modifie dans Sanity sans toucher au code.

## Stack

| Rôle | Choix |
|---|---|
| Site | Astro (statique) et TypeScript |
| Styles | CSS natif, variables de `src/styles/tokens.css`, sans Tailwind |
| Contenu | Sanity : schémas dans `studio/`, Studio déployé à part |
| Simulateur | TypeScript sans framework, logique et données dans `src/data/simulateur.json`, hors CMS |
| Tests | Vitest (moteur de décision, contenu) ; Playwright et axe (WCAG AA, clavier, focus, 390 et 1440 px) |
| Polices | Urbanist et Geist via @fontsource, auto-hébergées |
| Hébergement | Vercel, reconstruit par un webhook Sanity à chaque publication |

## Arborescence

```
src/
  components/        composants partagés (composants.md) et sections/ (une par type de section du CMS)
  data/              simulateur.json (règles, clients, cas de test) et donnees-produit.json (panneaux)
  lib/simulateur.ts  moteur de décision, fonction pure
  lib/contenu.ts     lecture du contenu : Sanity si SANITY_PROJECT_ID, sinon content/pages.json
  styles/            tokens.css (source de vérité) et base.css
studio/              Studio Sanity : schémas, aperçus, structure
content/             contenu de départ (repris de l'export de maquettes) et captures produit
scripts/             seed.ts (remplit Sanity), creer-webhook.ts (publication vers Vercel)
tests/e2e/           Playwright et axe
```

## Commandes

```bash
npm install
npm run dev          # site sur http://localhost:4321 (contenu local tant que .env est vide)
npm test             # moteur de décision et contenu (Vitest)
npm run test:e2e     # accessibilité, clavier, mobile (Playwright et axe)
npm run build
```

Studio en local : `npm --prefix studio install`, puis `npm run studio` (http://localhost:3333).

## Mise en ligne

1. **Projet Sanity.** `cd studio && npx sanity login`, puis `npx sanity init --env` ou créez le projet sur sanity.io/manage. Notez le *project ID*.
2. **Variables.** Copiez `.env.example` en `.env` (racine) et `studio/.env.example` en `studio/.env`, remplissez le *project ID*.
3. **Contenu.** Créez un jeton « Editor » (sanity.io/manage > API > Tokens) dans `SANITY_WRITE_TOKEN`, puis `npm run seed`. `npm run seed -- --essai` montre ce qui serait envoyé sans rien écrire.
4. **Studio.** `cd studio && npx sanity deploy`. Le Studio est en ligne sur `https://<nom>.sanity.studio`.
5. **Vercel.** Importez le repo, ajoutez `SANITY_PROJECT_ID`, `SANITY_DATASET` et `SITE_URL` dans Settings > Environment Variables. Sans `SANITY_PROJECT_ID`, le build échoue exprès : le site en ligne ne doit jamais être construit sur le contenu local.
6. **Publication automatique.** Vercel > Settings > Git > Deploy Hooks : créez un hook sur `main`, collez son URL dans `VERCEL_DEPLOY_HOOK`, ajoutez `SANITY_AUTH_TOKEN` (`npx sanity debug --secrets`), puis `npm run webhook`. Chaque publication dans le Studio relance un build (environ 30 s pour l'installation et 1 s pour Astro).

## Règles

Les consignes complètes sont dans `CLAUDE.md` et `composants.md`. En bref : aucune valeur en dur hors des tokens, aucun chiffre de marché, témoignage ou logo inventé (les emplacements restent des emplacements), jamais de tiret cadratin, « Données fictives » sur toute capture ou tout panneau.
