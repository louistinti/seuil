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

  test(`image de partage et carte large déclarées sur ${chemin}`, async ({ page, request }) => {
    await page.goto(chemin);
    const image = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(image).toMatch(/\/partage\/[a-z]+\.png$/);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /^Seuil : .+ Données fictives\.$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const reponse = await request.get(new URL(image!).pathname);
    expect(reponse.headers()['content-type']).toBe('image/png');
    const png = await reponse.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
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

test.describe('règle en langage naturel (Produit)', () => {
  const axe = async (page: import('@playwright/test').Page) => {
    const r = await new AxeBuilder({ page }).include('[data-redacteur]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    return r.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  };

  test('au clavier : exemple, règle en blocs modifiables, test sur les 3 clients, validation simulée', async ({ page }) => {
    await page.goto('/produit');
    const panneau = page.locator('[data-redacteur]');
    await expect(panneau.getByRole('button', { name: 'Traduire en règle' })).toBeDisabled();
    await panneau.getByRole('button', { name: /^Refuser si l'encours/ }).focus();
    await page.keyboard.press('Enter');
    await expect(panneau.getByText('Règle traduite, à vérifier')).toBeFocused();
    await expect(panneau.locator('[aria-current="step"]')).toContainText('Vérifier');
    await expect(panneau.getByRole('combobox', { name: 'Seuil' })).toHaveValue('limite_110');
    expect(await axe(page)).toEqual([]);

    await panneau.getByRole('button', { name: 'Tester le brouillon' }).click();
    await expect(panneau.getByText('Brouillon testé, non publié')).toBeFocused();
    const trehault = panneau.locator('.ligne', { hasText: 'Négoce Tréhault' });
    await expect(trehault).toContainText('Votre règle');
    await expect(trehault).toContainText('Refusée');
    await expect(panneau.locator('.ligne', { hasText: 'Menuiseries Valdorre' })).toContainText('règle 2');
    expect(await axe(page)).toEqual([]);

    await panneau.getByRole('button', { name: 'Demander la validation' }).click();
    await expect(panneau.getByRole('status')).toContainText('rien n’est envoyé'.replace('’', "'"));
    await expect(panneau.locator('[aria-current="step"]')).toContainText('Valider');
  });

  test('un bloc modifié change le test : sans la marge de 10 %, Groupe Orvelle est refusé', async ({ page }) => {
    await page.goto('/produit');
    const panneau = page.locator('[data-redacteur]');
    await panneau.getByRole('button', { name: /^Refuser si l'encours/ }).click();
    await panneau.getByRole('combobox', { name: 'Seuil' }).selectOption('limite');
    await expect(panneau.getByRole('combobox', { name: 'Seuil' })).toBeFocused();
    await panneau.getByRole('button', { name: 'Tester le brouillon' }).click();
    const orvelle = panneau.locator('.ligne', { hasText: 'Groupe Orvelle' });
    await expect(orvelle).toContainText('Refusée');
    await expect(orvelle).toContainText(/Sans votre règle\s:\senvoyée à l'analyste, règle 3/);
  });

  test('ambiguïté sur « retard » : une question, puis le pire retard sur 12 mois change la décision de Tréhault', async ({ page }) => {
    await page.goto('/produit');
    const panneau = page.locator('[data-redacteur]');
    await panneau.getByRole('button', { name: /^Envoyer à l'analyste si le retard/ }).click();
    await expect(panneau.getByText('Une précision est nécessaire')).toBeFocused();
    await expect(panneau.locator('.phrase-rappel strong')).toHaveText('retard');
    expect(await axe(page)).toEqual([]);
    await panneau.getByRole('button', { name: /Pire retard sur 12 mois/ }).click();
    await expect(panneau.getByText('Règle traduite, à vérifier')).toBeFocused();
    await panneau.getByRole('button', { name: 'Tester le brouillon' }).click();
    const trehault = panneau.locator('.ligne', { hasText: 'Négoce Tréhault' });
    await expect(trehault).toContainText("Envoyée à l'analyste");
    await expect(trehault).toContainText(/Sans votre règle\s:\srefusée, règle 1\./);
  });

  test('phrase non comprise : message, phrase conservée, exemples proposés', async ({ page }) => {
    await page.goto('/produit');
    const panneau = page.locator('[data-redacteur]');
    const champ = panneau.getByLabel('Votre règle, en français');
    await champ.fill('Faire attention aux clients un peu fragiles.');
    await expect(panneau.getByText(/Quand votre phrase est prête/)).toBeVisible();
    await expect(panneau.getByText("Ou partez d'un exemple")).toBeHidden();
    await panneau.getByRole('button', { name: 'Traduire en règle' }).click();
    await expect(panneau.getByText("Seuil n'a pas compris cette phrase")).toBeFocused();
    await expect(champ).toHaveValue('Faire attention aux clients un peu fragiles.');
    await expect(panneau.getByText("Ou partez d'un exemple")).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await champ.fill('');
    await expect(panneau.getByRole('button', { name: 'Traduire en règle' })).toBeDisabled();
  });

  test('Modifier la phrase et Recommencer rendent le focus au champ', async ({ page }) => {
    await page.goto('/produit');
    const panneau = page.locator('[data-redacteur]');
    await panneau.getByRole('button', { name: /^Accepter si l'encours/ }).click();
    await panneau.getByRole('button', { name: 'Modifier la phrase' }).click();
    const champ = panneau.getByLabel('Votre règle, en français');
    await expect(champ).toBeFocused();
    await expect(champ).toHaveValue(/^Accepter si l'encours/);
    await champ.press('Control+Enter');
    await panneau.getByRole('button', { name: 'Recommencer' }).click();
    await expect(champ).toBeFocused();
    await expect(champ).toHaveValue('');
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
