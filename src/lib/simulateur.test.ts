import { describe, expect, it } from 'vitest';
import data from '../data/simulateur.json';
import { affichageUsage, clientParId, decider, lireMontant } from './simulateur';

// Les espaces insécables (fines ou non) sont comparées comme des espaces simples.
const plat = (s: string) => s.replace(/[  ]/g, ' ');

describe('cas attendus', () => {
  for (const cas of data.cas_attendus) {
    it(`${cas.client} + ${cas.montant} € → ${cas.resultat} (règle ${cas.regle})`, () => {
      const client = clientParId(cas.client);
      const d = decider(client, cas.montant);
      expect(d.resultat).toBe(cas.resultat);
      expect(d.regle).toBe(cas.regle);
      expect(d.priorite).toBe('priorite' in cas ? cas.priorite : undefined);
      expect(d.total).toBe(cas.encours_apres_commande);
      if (d.total <= client.limite) {
        expect(plat(affichageUsage(d))).toBe(`${cas.usage_limite_pct.toFixed(1).replace('.', ',')} %`);
      } else {
        expect(plat(affichageUsage(d))).toMatch(/^Dépasse la limite de [\d ]+ €$/);
      }
    });
  }
});

describe('cas aux bornes', () => {
  for (const cas of data.cas_aux_bornes) {
    it(`${cas.client} + ${cas.montant} € → ${cas.affichage}`, () => {
      const d = decider(clientParId(cas.client), cas.montant);
      expect(d.resultat).toBe(cas.resultat);
      expect(d.regle).toBe(cas.regle);
      expect(d.priorite).toBe('priorite' in cas ? cas.priorite : undefined);
      expect(d.total).toBe(cas.encours_apres_commande);
      expect(plat(affichageUsage(d))).toBe(cas.affichage);
      expect(d.conditionsEchouees.map(plat)).toEqual(cas.conditions_echouees);
    });
  }

  it('au-delà de la limite, aucun pourcentage', () => {
    const d = decider(clientParId('valdorre'), 67601);
    expect(d.usageDixiemes).toBeNull();
    expect(affichageUsage(d)).not.toContain('%');
  });
});

describe('règles hors des données fournies', () => {
  const base = clientParId('valdorre');
  it('refuse un retard en cours de plus de 60 jours, même dans la limite', () => {
    const d = decider({ ...base, retard_en_cours_jours: 61 }, 1000);
    expect(d.regle).toBe(1);
    expect(d.conditionsEchouees.map(plat)).toEqual(['Retard en cours de 61 jours, au-delà de 60 jours']);
  });
  it('60 jours pile ne déclenche pas le refus', () => {
    expect(decider({ ...base, retard_en_cours_jours: 60 }, 1000).regle).toBe(4);
  });
  it('dans la limite mais retard ancien de plus de 30 jours : par défaut, raison citée', () => {
    const d = decider({ ...base, pire_retard_12_mois_jours: 31 }, 1000);
    expect(d.regle).toBe(4);
    expect(plat(affichageUsage(d))).toBe('73,4 %');
    expect(d.conditionsEchouees.map(plat)).toEqual(['Pire retard sur 12 mois de 31 jours, au-delà de 30 jours']);
  });
});

describe('saisie libre « Autre montant »', () => {
  it.each([
    ['38000', 38000],
    ['38 000', 38000],
    ['38 000 €', 38000],
    ['38 000 €', 38000],
    ['€12500', 12500],
    [' 1 ', 1],
  ])('accepte %j', (saisie, attendu) => expect(lireMontant(saisie)).toBe(attendu));

  it.each(['', '   ', '€', '0', '000', '-5', '38000,50', '38.000', '12e3', 'abc', '1'.repeat(20)])(
    'refuse %j',
    (saisie) => expect(lireMontant(saisie)).toBeNull(),
  );

  it('le message d’erreur est celui du JSON', () => {
    expect(data.meta.saisie_libre.erreur).toBe('Saisissez un montant en chiffres.');
  });
});
