import { describe, expect, it } from 'vitest';
import { blocs, exemples, modifier, normaliser, precision, tester, traduire, type RegleBrouillon } from './regle-langage-naturel';

const libelles = (r: RegleBrouillon) => blocs(r).map((b) => (b.type === 'mot' ? b.texte : b.type === 'a_preciser' ? b.texte : b.libelle));
const ligne = (r: RegleBrouillon, id: string) => tester(r).find((l) => l.id === id)!;
const [A, B, C] = exemples.map((e) => e.phrase);

describe('traduction simulée', () => {
  it('reconnaît les 3 phrases d’exemple, sans tenir compte de la casse, des espaces ni des apostrophes', () => {
    expect(traduire(A).etat).toBe('traduite');
    expect(traduire(B).etat).toBe('ambigue');
    expect(traduire(C).etat).toBe('traduite');
    expect(traduire(`  ${A.toUpperCase().replaceAll("'", '’').replaceAll(' ', '   ')} `).etat).toBe('traduite');
    expect(normaliser('Encours + commande')).toBe('encours + commande');
    // Sans le point final, tel qu'on le tape : la question de clarification sur « retard » apparaît quand même.
    expect(traduire("Envoyer à l'analyste si le retard dépasse 30 jours").etat).toBe('ambigue');
  });

  it('ne reconnaît aucune autre phrase, même un début d’exemple', () => {
    expect(traduire('Faire attention aux clients un peu fragiles.').etat).toBe('non_comprise');
    expect(traduire("Refuser si l'encours et la commande dépassent la limite de").etat).toBe('non_comprise');
    expect(traduire('').etat).toBe('non_comprise');
  });
});

describe('règles en blocs (identiques à contenu/regle-langage-naturel.json)', () => {
  it('A, B à préciser, B précisée de deux façons, C', () => {
    const t = (p: string) => (traduire(p) as { regle: RegleBrouillon }).regle;
    expect(libelles(t(A))).toEqual(['Si', 'encours + commande', 'dépasse', 'la limite × 1,10', 'alors']);
    expect(libelles(t(B))).toEqual(['Si', 'retard à préciser', 'dépasse', '30 jours', 'alors']);
    expect(libelles(precision('B_retard_en_cours'))).toEqual(['Si', 'un retard en cours', 'dépasse', '30 jours', 'alors']);
    expect(libelles(precision('B_pire_retard_12_mois'))).toEqual(['Si', 'le pire retard sur 12 mois', 'dépasse', '30 jours', 'alors']);
    expect(libelles(t(C))).toEqual(['Si', 'encours + commande', 'reste inférieur ou égal à', 'la limite', 'et si', "aucun retard n'est en cours", 'alors']);
  });

  it('changer de mesure remet le seuil dans la bonne unité', () => {
    const r = modifier((traduire(A) as { regle: RegleBrouillon }).regle, 0, 'mesure', 'retard_en_cours');
    expect(libelles(r)).toEqual(['Si', 'un retard en cours', 'dépasse', '30 jours', 'alors']);
    expect(libelles(modifier(r, 0, 'seuil', 'j60'))).toEqual(['Si', 'un retard en cours', 'dépasse', '60 jours', 'alors']);
  });
});

describe('test du brouillon, en première position, sur les 3 clients', () => {
  const regle = (p: string) => (traduire(p) as { regle: RegleBrouillon }).regle;

  it('A tranche Négoce Tréhault sans changer sa décision', () => {
    expect(ligne(regle(A), 'valdorre')).toMatchObject({ appliquee: false, resultat: 'Acceptée', regle: 'règle 2' });
    expect(ligne(regle(A), 'trehault')).toMatchObject({ appliquee: true, resultat: 'Refusée', regle: 'votre règle', change: false });
    expect(ligne(regle(A), 'orvelle')).toMatchObject({ appliquee: false, resultat: "Envoyée à l'analyste", regle: 'règle 3' });
  });

  it('C tranche Menuiseries Valdorre, sans rien changer', () => {
    expect(tester(regle(C)).filter((l) => l.appliquee).map((l) => l.id)).toEqual(['valdorre']);
    expect(tester(regle(C)).some((l) => l.change)).toBe(false);
  });

  it('B en retard en cours ne tranche personne', () => {
    expect(tester(precision('B_retard_en_cours')).some((l) => l.appliquee)).toBe(false);
  });

  it('B en pire retard sur 12 mois envoie Tréhault (41 jours) à l’analyste au lieu de le refuser', () => {
    expect(ligne(precision('B_pire_retard_12_mois'), 'trehault')).toMatchObject({
      appliquee: true,
      resultat: "Envoyée à l'analyste",
      change: true,
      avant: { resultat: 'Refusée', regle: 'règle 1' },
    });
  });

  it('un bloc modifié change le test : A sous la limite (sans les 10 %) refuse aussi Groupe Orvelle', () => {
    const r = modifier(regle(A), 0, 'seuil', 'limite');
    expect(ligne(r, 'orvelle')).toMatchObject({ appliquee: true, resultat: 'Refusée', change: true, avant: { regle: 'règle 3' } });
  });

  it('refuse de tester une règle encore à préciser', () => {
    expect(() => tester(regle(B))).toThrow(/Précisez/);
  });

  it('affiche les commandes en euros', () => {
    expect(tester(regle(A)).map((l) => l.commande.replace(/ /g, ' '))).toEqual([
      'Commande de 38 000 €',
      'Commande de 12 500 €',
      'Commande de 60 000 €',
    ]);
  });
});
