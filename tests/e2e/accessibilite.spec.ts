// Accessibilité : axe (WCAG 2.1 AA) sur les 6 pages, clavier, focus et cibles tactiles.
// Chaque page contient les deux thèmes : le site clair et les conteneurs produit sombres (data-theme="produit").
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/produit', '/finance', '/commerciaux', '/tarifs', '/demo'];

for (const chemin of PAGES) {
  test(`axe : aucune violation WCAG A/AA sur ${chemin}`, async ({ page }) => {
    await page.goto(chemin);
    const resultats = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const resume = resultats.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
    expect(resume).toEqual([]);
  });

  test(`la mention de fiction est en pied de page sur ${chemin}`, async ({ page }) => {
    await page.goto(chemin);
    await expect(page.locator('footer')).toContainText('Seuil est une entreprise fictive, conçue comme démonstration.');
  });

  test(`hiérarchie des titres sans niveau sauté sur ${chemin}`, async ({ page }) => {
    await page.goto(chemin);
    const niveaux = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])));
    expect(niveaux[0], 'le premier titre est le h1').toBe(1);
    const sauts = niveaux.flatMap((n, i) => (i > 0 && n > niveaux[i - 1] + 1 ? [`h${niveaux[i - 1]} puis h${n}`] : []));
    expect(sauts).toEqual([]);
  });

  test(`aucun défilement horizontal sur ${chemin}`, async ({ page }) => {
    await page.goto(chemin);
    const debord = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(debord).toBeLessThanOrEqual(0);
  });
}

test('chaque capture et chaque panneau de données porte « Données fictives »', async ({ page }) => {
  for (const chemin of ['/produit', '/finance']) {
    await page.goto(chemin);
    for (const panneau of await page.locator('.panneau').all()) {
      await expect(panneau.getByText('Données fictives', { exact: true })).toBeVisible();
    }
  }
});

test('le lien d’évitement apparaît au premier Tab et mène au contenu', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const lien = page.getByRole('link', { name: 'Aller au contenu' });
  await expect(lien).toBeFocused();
  await expect(lien).toBeInViewport();
});

test('focus visible : contour de 2 px décalé de 2 px', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const style = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return { largeur: s.outlineWidth, decalage: s.outlineOffset, style: s.outlineStyle };
  });
  expect(style).toEqual({ largeur: '2px', decalage: '2px', style: 'solid' });
});

test.describe('simulateur au clavier', () => {
  test('les chips se choisissent au clavier et le résultat est annoncé', async ({ page }) => {
    await page.goto('/');
    const sim = page.locator('#simulateur');
    await sim.getByRole('button', { name: 'Négoce Tréhault' }).focus();
    await page.keyboard.press('Enter');
    await expect(sim.getByRole('button', { name: 'Négoce Tréhault' })).toHaveAttribute('aria-pressed', 'true');
    await expect(sim.locator('[aria-live="polite"]')).toContainText('Refusée');
    await sim.getByRole('button', { name: /12\s500/ }).focus();
    await page.keyboard.press('Space');
    await expect(sim.locator('[data-sim="regle"]')).toHaveText('Règle 1');
  });

  test('le titre du hero ne bouge pas quand la décision change', async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) < 1280, 'hero en deux colonnes seulement');
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.grille-hero[data-ancre]')).toHaveCount(1);
    const titre = page.locator('h1');
    const depart = await titre.boundingBox();
    const sim = page.locator('#simulateur');
    for (const client of ['Négoce Tréhault', 'Groupe Orvelle', 'Menuiseries Valdorre']) {
      await sim.getByRole('button', { name: client }).click();
      for (const montant of ['1', '67 601', '999999999']) {
        await sim.getByLabel('Autre montant').fill(montant);
        expect((await titre.boundingBox())?.y, `${client}, ${montant}`).toBe(depart?.y);
      }
    }
  });

  test('Valdorre à 67 601 € : dépassement en euros et condition en cause', async ({ page }) => {
    await page.goto('/');
    const sim = page.locator('#simulateur');
    await sim.getByLabel('Autre montant').fill('67 601');
    await expect(sim.locator('[data-sim="usage"]')).toHaveText(/^Dépasse la limite de 1\s€$/);
    await expect(sim.locator('[data-sim="usage"]')).not.toContainText('%');
    await expect(sim.locator('[data-sim="conditions"]')).toContainText(/couverture de 200\s000\s€ inférieure à 250\s001\s€/);
    await expect(sim.locator('[data-sim="regle"]')).toHaveText('Par défaut');
    await expect(sim.getByText('Priorité haute', { exact: true })).toBeVisible();
  });

  test('saisie invalide : message d’erreur en role="alert"', async ({ page }) => {
    await page.goto('/');
    const champ = page.getByLabel('Autre montant');
    await champ.fill('38,5');
    await expect(page.getByRole('alert').filter({ hasText: 'Saisissez un montant en chiffres.' })).toBeVisible();
    await expect(champ).toHaveAttribute('aria-invalid', 'true');
  });

  test('saisie invalide : la décision laisse place à un état neutre, puis revient', async ({ page }) => {
    await page.goto('/');
    const sim = page.locator('#simulateur');
    const champ = sim.getByLabel('Autre montant');
    const decision = sim.locator('[data-sim="decision"]');
    const neutre = sim.getByText('Saisissez un montant pour voir la décision.');

    await expect(decision).toBeVisible();
    await expect(neutre).toBeHidden();

    // Invalide : plus de décision visible ni lue, état neutre à la place, aucune chip de montant active.
    await champ.fill('abc');
    await expect(champ).toHaveAttribute('aria-invalid', 'true');
    await expect(decision).toBeHidden();
    await expect(neutre).toBeVisible();
    await expect(sim.locator('[data-montant][aria-pressed="true"]')).toHaveCount(0);

    // Champ vidé : l'erreur part, la décision attend un montant.
    await champ.fill('');
    await expect(champ).not.toHaveAttribute('aria-invalid');
    await expect(neutre).toBeVisible();

    // Saisie valide : la décision revient, calculée sur ce montant.
    await champ.fill('12 500');
    await expect(champ).not.toHaveAttribute('aria-invalid');
    await expect(neutre).toBeHidden();
    await expect(decision).toBeVisible();
    await expect(sim.locator('[data-sim="total"]')).toHaveText(/^194\s900\s€$/);

    // Invalide puis chip : la décision revient, le champ est vidé et n'est plus en erreur.
    await champ.fill('38,5');
    await expect(neutre).toBeVisible();
    await sim.getByRole('button', { name: /^38\s000\s€$/ }).click();
    await expect(champ).toHaveValue('');
    await expect(champ).not.toHaveAttribute('aria-invalid');
    await expect(decision).toBeVisible();
    await expect(neutre).toBeHidden();
  });
});

test.describe('formulaire de démo', () => {
  test('erreurs par champ, puis confirmation sans envoi', async ({ page }) => {
    await page.goto('/demo');
    await page.getByRole('button', { name: 'Demander une démo' }).click();
    await expect(page.getByLabel('Prénom et nom')).toBeFocused();
    await expect(page.getByText('Indiquez votre prénom et votre nom.')).toBeVisible();
    for (const libelle of ['Prénom et nom', 'E-mail professionnel', 'Entreprise']) {
      await expect(page.getByLabel(libelle)).toHaveAttribute('aria-invalid', 'true');
    }
    await page.getByLabel('Prénom et nom').fill('Camille Martin');
    await expect(page.getByLabel('Prénom et nom')).not.toHaveAttribute('aria-invalid');
    await page.getByLabel('E-mail professionnel').fill('camille@');
    await expect(page.getByLabel('E-mail professionnel')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('E-mail professionnel').fill('camille@exemple.fr');
    await page.getByLabel('Entreprise').fill('Exemple SAS');
    await page.getByRole('button', { name: 'Demander une démo' }).click();
    await expect(page.getByRole('status')).toContainText('rien n’a été envoyé'.replace('’', "'"));
  });
});

test.describe('retour en haut', () => {
  test('absent au premier écran, visible après défilement, remonte et rend le focus au logo', async ({ page }) => {
    await page.goto('/produit');
    const bouton = page.getByRole('button', { name: 'Revenir en haut de la page' });
    await expect(bouton).toBeHidden();
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2, behavior: 'instant' }));
    await expect(bouton).toBeVisible();
    await bouton.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBe(0);
    await expect(page.locator('.navigation .logo')).toBeFocused();
    await expect(bouton).toBeHidden();
  });

  test('ne recouvre aucun lien du pied de page', async ({ page }) => {
    for (const chemin of PAGES) {
      await page.goto(chemin);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      const recouverts = await page.evaluate(() => {
        const b = document.querySelector('.retour-haut')!.getBoundingClientRect();
        return [...document.querySelectorAll('footer a')]
          .map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter(({ r }) => !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom))
          .map(({ e }) => e.textContent?.trim());
      });
      expect(recouverts, chemin).toEqual([]);
    }
  });
});

test.describe('mobile', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 500, 'propre au mobile');

  // Exception WCAG 2.5.8 : les liens dans une phrase (ligne de source) suivent la hauteur du texte.
  test('cibles tactiles d’au moins 44 px', async ({ page }) => {
    for (const chemin of PAGES) {
      await page.goto(chemin);
      const petites = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('a, button, input, select')]
          .filter((e) => e.offsetParent !== null && !e.closest('.sr-only, .lien-evitement, .ligne-source'))
          .map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter(({ r }) => r.height < 44)
          .map(({ e, r }) => `${e.tagName} « ${e.textContent?.trim().slice(0, 30)} » ${Math.round(r.height)} px`),
      );
      expect(petites, chemin).toEqual([]);
    }
  });

  test('le menu s’ouvre, se ferme avec Échap et rend le focus', async ({ page }) => {
    await page.goto('/');
    const bouton = page.getByRole('button', { name: 'Ouvrir le menu' });
    await bouton.click();
    await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: 'Menu' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeFocused();
  });

  test('le bouton principal du hero est en pleine largeur', async ({ page }) => {
    await page.goto('/');
    const largeur = await page.locator('.hero .bouton--principal').first().evaluate((e) => e.getBoundingClientRect().width);
    expect(largeur).toBeGreaterThan(390 - 2 * 16 - 1);
  });
});
