// Moteur de décision du simulateur. Données, règles et seuils : src/data/simulateur.json (hors CMS).
// Toutes les comparaisons se font en entiers : total × 100 > limite × 110, jamais total > limite × 1,10.
import data from '../data/simulateur.json';

export type Resultat = 'Acceptée' | 'Refusée' | "Envoyée à l'analyste";
export type Priorite = 'normale' | 'haute';
export type NumeroRegle = 1 | 2 | 3 | 4;

export interface Client {
  id: string;
  nom: string;
  encours: number;
  limite: number;
  retard_en_cours_jours: number;
  pire_retard_12_mois_jours: number;
  couverture_assurance_credit: number;
}

export interface Seuils {
  depassement_max_pct: number;
  retard_en_cours_refus_jours: number;
  pire_retard_12_mois_max_jours: number;
}

export interface Regle {
  ordre: NumeroRegle;
  nom: string;
  resultat: Resultat;
  libelle: string;
  priorite?: Priorite;
}

export interface Decision {
  client: Client;
  montant: number;
  total: number;
  resultat: Resultat;
  regle: NumeroRegle;
  priorite?: Priorite;
  libelle: string;
  /** total − limite si le total dépasse la limite, sinon 0. */
  depassement: number;
  /** Usage de la limite en dixièmes de pour cent (882 = 88,2 %). null au-delà de la limite. */
  usageDixiemes: number | null;
  /** Conditions qui ont empêché une meilleure issue, ou qui ont déclenché le refus. */
  conditionsEchouees: string[];
}

export const clients = data.clients as Client[];
export const regles = data.regles as Regle[];
export const seuils = data.seuils as Seuils;
export const montantsChips = data.montants_chips;
export const montantParDefaut = data.montant_par_defaut;
export const messageErreurSaisie = data.meta.saisie_libre.erreur;

export function clientParId(id: string): Client {
  const client = clients.find((c) => c.id === id);
  if (!client) throw new Error(`Client inconnu : ${id}`);
  return client;
}

function regle(n: NumeroRegle): Regle {
  return regles.find((r) => r.ordre === n)!;
}

const ESPACE_GROUPE = ' ';
const ESPACE_INSECABLE = ' ';

/** 250001 → « 250 001 € » avec espaces insécables. */
export function euros(n: number): string {
  const [entier, decimales] = (Number.isInteger(n) ? String(n) : n.toFixed(2)).split('.');
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_GROUPE);
  return `${decimales ? `${groupe},${decimales}` : groupe}${ESPACE_INSECABLE}€`;
}

/** 882 → « 88,2 % ». */
export function pourcentage(dixiemes: number): string {
  return `${Math.floor(dixiemes / 10)},${dixiemes % 10}${ESPACE_INSECABLE}%`;
}

const jours = (n: number) => `${n}${ESPACE_INSECABLE}jour${n > 1 ? 's' : ''}`;

export function decider(client: Client, montant: number, s: Seuils = seuils): Decision {
  const { limite, couverture_assurance_credit: couverture } = client;
  const retard = client.retard_en_cours_jours;
  const pireRetard = client.pire_retard_12_mois_jours;
  const total = client.encours + montant;

  const plafondPct = 100 + s.depassement_max_pct;
  const auDelaDuPlafond = total * 100 > limite * plafondPct;
  const auDelaDeLaLimite = total > limite;

  const base = {
    client,
    montant,
    total,
    depassement: auDelaDeLaLimite ? total - limite : 0,
    usageDixiemes: auDelaDeLaLimite ? null : Math.round((total * 1000) / limite),
  };

  const issue = (n: NumeroRegle, conditionsEchouees: string[]): Decision => {
    const r = regle(n);
    return { ...base, resultat: r.resultat, regle: n, priorite: r.priorite as Priorite | undefined, libelle: r.libelle, conditionsEchouees };
  };

  // Règle 1 : refuser.
  const refus: string[] = [];
  if (auDelaDuPlafond) {
    refus.push(`Encours après commande de ${euros(total)} supérieur à ${euros((limite * plafondPct) / 100)} (limite + ${s.depassement_max_pct}${ESPACE_INSECABLE}%)`);
  }
  if (retard > s.retard_en_cours_refus_jours) {
    refus.push(`Retard en cours de ${jours(retard)}, au-delà de ${s.retard_en_cours_refus_jours}${ESPACE_INSECABLE}jours`);
  }
  if (refus.length) return issue(1, refus);

  // Règle 2 : accepter.
  const echecsRegle2: string[] = [];
  if (retard !== 0) echecsRegle2.push(`Retard en cours de ${jours(retard)}`);
  if (pireRetard > s.pire_retard_12_mois_max_jours) {
    echecsRegle2.push(`Pire retard sur 12 mois de ${jours(pireRetard)}, au-delà de ${s.pire_retard_12_mois_max_jours}${ESPACE_INSECABLE}jours`);
  }
  if (!auDelaDeLaLimite && echecsRegle2.length === 0) return issue(2, []);

  // Règle 3 : envoyer à l'analyste (le plafond de 10 % est déjà garanti par la règle 1).
  if (auDelaDeLaLimite) {
    const echecsRegle3: string[] = [];
    if (couverture < total) echecsRegle3.push(`Couverture de ${euros(couverture)} inférieure à ${euros(total)}`);
    if (retard !== 0) echecsRegle3.push(`Retard en cours de ${jours(retard)}`);
    if (echecsRegle3.length === 0) {
      return issue(3, [`Encours après commande de ${euros(total)} supérieur à la limite de ${euros(limite)}`]);
    }
    return issue(4, echecsRegle3);
  }

  // Règle 4 : par défaut. Dans la limite, c'est la règle 2 qui a échoué.
  return issue(4, echecsRegle2);
}

/** Ce que montre la ligne « usage » : un pourcentage dans la limite, le dépassement en euros au-delà. */
export function affichageUsage(d: Decision): string {
  return d.usageDixiemes === null ? `Dépasse la limite de ${euros(d.depassement)}` : pourcentage(d.usageDixiemes);
}

/** « Autre montant » : entier strictement positif, espaces et symbole € ignorés. null si invalide. */
export function lireMontant(saisie: string): number | null {
  const nettoye = saisie.replace(/[\s  €]/g, '');
  if (!/^\d+$/.test(nettoye)) return null;
  const n = Number(nettoye);
  if (n <= 0 || !Number.isSafeInteger(n * 1000)) return null;
  return n;
}
