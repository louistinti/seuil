// Libellés d'interface du simulateur (repris de l'export : contenu/accueil.json, simulateur_verdicts).
import { euros, type Client, type Decision, type Resultat } from './simulateur';

export const VERDICTS: Record<Resultat, string> = {
  Acceptée: 'Oui, la commande passe.',
  Refusée: 'Non, la commande est refusée.',
  "Envoyée à l'analyste": 'Un analyste tranchera.',
};

const jours = (n: number) => (n === 0 ? 'Aucun' : `${n} jour${n > 1 ? 's' : ''}`);

export function faits(c: Client) {
  return [
    { cle: 'encours', libelle: 'Encours', valeur: euros(c.encours) },
    { cle: 'limite', libelle: 'Limite', valeur: euros(c.limite) },
    { cle: 'retard', libelle: 'Retard en cours', valeur: jours(c.retard_en_cours_jours) },
    { cle: 'pire', libelle: 'Pire retard 12 mois', valeur: `${c.pire_retard_12_mois_jours} jour${c.pire_retard_12_mois_jours > 1 ? 's' : ''}` },
    { cle: 'couverture', libelle: 'Assurance-crédit', valeur: euros(c.couverture_assurance_credit) },
  ];
}

/** « Règle 2 », ou « Par défaut » pour la règle 4. */
export const nomRegle = (d: Decision) => (d.regle === 4 ? 'Par défaut' : `Règle ${d.regle}`);

/** Remplissage de la jauge, plafonné à 100 % au-delà de la limite. */
export const largeurJauge = (d: Decision) => (d.usageDixiemes === null ? 100 : Math.min(100, d.usageDixiemes / 10));

/** « En cause : couverture de 200 000 € inférieure à 250 001 € ». */
export const conditionEnCause = (c: string) => `En cause : ${c.charAt(0).toLowerCase()}${c.slice(1)}`;
