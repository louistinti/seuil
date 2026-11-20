// Moteur de la démo « Écrire une règle en langage naturel ». Fonctions pures, sans DOM.
// La traduction est simulée : seules les phrases d'exemple sont reconnues. Les règles traduites sont évaluées
// par le moteur du simulateur, en première position, sur les 3 clients de démonstration.
import data from '../data/regles-langage-naturel.json';
import { clients, decider, euros, type Client, type Resultat } from './simulateur';
import { nomRegle } from './simulateur-affichage';

export type Mesure = 'total' | 'retard_en_cours' | 'pire_retard_12_mois' | 'a_preciser';
export type Comparaison = 'depasse' | 'au_plus' | 'nul';
export interface Condition {
  mesure: Mesure;
  comparaison: Comparaison;
  seuil?: string;
}
export interface RegleBrouillon {
  resultat: Resultat;
  conditions: Condition[];
}
export interface Exemple {
  cle: string;
  phrase: string;
  regle?: string;
  ambiguite?: { mot: string; choix: string[]; regle_a_preciser: string };
}

export const textes = data.textes;
export const exemples = data.exemples as Exemple[];
export const reglesTraduites = data.regles as Record<string, RegleBrouillon>;
const vocabulaire = data.vocabulaire;
const commandesTest = data.commandes_test as Record<string, number>;

/** Comparaison tolérante : casse, espaces multiples, espaces insécables et apostrophes typographiques. */
export function normaliser(phrase: string): string {
  return phrase.replace(/[  ]/g, ' ').replace(/[’ʼ]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
}

export type Traduction =
  | { etat: 'traduite'; exemple: Exemple; regle: RegleBrouillon }
  | { etat: 'ambigue'; exemple: Exemple; regle: RegleBrouillon }
  | { etat: 'non_comprise' };

export function traduire(phrase: string): Traduction {
  const exemple = exemples.find((e) => normaliser(e.phrase) === normaliser(phrase));
  if (!exemple) return { etat: 'non_comprise' };
  if (exemple.ambiguite) return { etat: 'ambigue', exemple, regle: cloner(reglesTraduites[exemple.ambiguite.regle_a_preciser]) };
  return { etat: 'traduite', exemple, regle: cloner(reglesTraduites[exemple.regle!]) };
}

export const precision = (cle: string): RegleBrouillon => cloner(reglesTraduites[cle]);
const cloner = (r: RegleBrouillon): RegleBrouillon => structuredClone(r);

// Blocs ------------------------------------------------------------------------------------------------

export interface Option {
  valeur: string;
  libelle: string;
}
export type Bloc =
  | { type: 'mot'; texte: string }
  | { type: 'bloc'; role: 'mesure' | 'comparaison' | 'seuil' | 'condition'; index: number; valeur: string; libelle: string; options: Option[] }
  | { type: 'a_preciser'; texte: string };

const unite = (m: Mesure) => vocabulaire.mesures[m].unite as 'euros' | 'jours';
const seuils = (u: 'euros' | 'jours') => vocabulaire.seuils[u] as Record<string, string>;
const nulles = vocabulaire.conditions_nulles as Record<string, string>;
const optionsMesure = (): Option[] =>
  (['total', 'retard_en_cours', 'pire_retard_12_mois'] as Mesure[]).map((m) => ({ valeur: m, libelle: vocabulaire.mesures[m].libelle }));

/** La règle en blocs, dans l'ordre de lecture : « Si », les blocs de chaque condition, « et si », « alors ». */
export function blocs(regle: RegleBrouillon): Bloc[] {
  const mots = vocabulaire.mots;
  const liste: Bloc[] = [{ type: 'mot', texte: mots.si }];
  regle.conditions.forEach((c, index) => {
    if (index > 0) liste.push({ type: 'mot', texte: mots.et_si });
    if (c.comparaison === 'nul') {
      liste.push({
        type: 'bloc',
        role: 'condition',
        index,
        valeur: c.mesure,
        libelle: nulles[c.mesure],
        options: Object.entries(nulles).map(([valeur, libelle]) => ({ valeur, libelle })),
      });
      return;
    }
    if (c.mesure === 'a_preciser') liste.push({ type: 'a_preciser', texte: vocabulaire.mesures.a_preciser.libelle });
    else liste.push({ type: 'bloc', role: 'mesure', index, valeur: c.mesure, libelle: vocabulaire.mesures[c.mesure].libelle, options: optionsMesure() });
    const comparaisons = vocabulaire.comparaisons as Record<string, string>;
    liste.push({
      type: 'bloc',
      role: 'comparaison',
      index,
      valeur: c.comparaison,
      libelle: comparaisons[c.comparaison],
      options: Object.entries(comparaisons).map(([valeur, libelle]) => ({ valeur, libelle })),
    });
    const s = seuils(unite(c.mesure));
    liste.push({
      type: 'bloc',
      role: 'seuil',
      index,
      valeur: c.seuil!,
      libelle: s[c.seuil!],
      options: Object.entries(s).map(([valeur, libelle]) => ({ valeur, libelle })),
    });
  });
  liste.push({ type: 'mot', texte: mots.alors });
  return liste;
}

/** Nouvelle règle où un bloc a changé. Changer de mesure (euros ↔ jours) remet le seuil sur le premier de la nouvelle unité. */
export function modifier(regle: RegleBrouillon, index: number, role: string, valeur: string): RegleBrouillon {
  const r = cloner(regle);
  const c = r.conditions[index];
  if (!c) throw new Error(`Condition ${index} introuvable`);
  if (role === 'mesure' || role === 'condition') {
    const avant = unite(c.mesure);
    c.mesure = valeur as Mesure;
    if (role === 'mesure' && unite(c.mesure) !== avant) c.seuil = Object.keys(seuils(unite(c.mesure)))[0];
  } else if (role === 'comparaison') c.comparaison = valeur as Comparaison;
  else if (role === 'seuil') c.seuil = valeur;
  else throw new Error(`Bloc inconnu : ${role}`);
  return r;
}

// Évaluation -------------------------------------------------------------------------------------------

function valeur(c: Condition, client: Client, total: number): number {
  if (c.mesure === 'total') return total;
  if (c.mesure === 'retard_en_cours') return client.retard_en_cours_jours;
  if (c.mesure === 'pire_retard_12_mois') return client.pire_retard_12_mois_jours;
  throw new Error('Mesure à préciser : la règle ne peut pas être évaluée');
}

/** Condition vraie pour ce client ? Montants comparés en entiers (× 100), comme dans le moteur du simulateur. */
export function conditionVraie(c: Condition, client: Client, total: number): boolean {
  const v = valeur(c, client, total);
  if (c.comparaison === 'nul') return v === 0;
  const borneCentimes =
    c.seuil === 'limite' ? client.limite * 100 : c.seuil === 'limite_110' ? client.limite * 110 : Number(c.seuil!.replace('j', '')) * 100;
  return c.comparaison === 'depasse' ? v * 100 > borneCentimes : v * 100 <= borneCentimes;
}

export const regleVraie = (r: RegleBrouillon, client: Client, total: number) => r.conditions.every((c) => conditionVraie(c, client, total));
export const evaluable = (r: RegleBrouillon) => r.conditions.every((c) => c.mesure !== 'a_preciser');

export interface LigneTest {
  id: string;
  client: string;
  commande: string;
  /** La règle du brouillon tranche ce client (elle est testée en première position). */
  appliquee: boolean;
  resultat: Resultat;
  /** « règle 2 », « par défaut » ou « votre règle ». */
  regle: string;
  /** Le brouillon change la décision par rapport aux règles en vigueur. */
  change: boolean;
  avant: { resultat: Resultat; regle: string };
}

/** Test du brouillon : placé en première position, avant les règles en vigueur, sur les 3 clients de démonstration. */
export function tester(regle: RegleBrouillon): LigneTest[] {
  if (!evaluable(regle)) throw new Error('Précisez la règle avant de la tester');
  return clients.map((client) => {
    const montant = commandesTest[client.id];
    const actuel = decider(client, montant);
    const avant = { resultat: actuel.resultat, regle: nomRegle(actuel).toLowerCase() };
    const appliquee = regleVraie(regle, client, actuel.total);
    return {
      id: client.id,
      client: client.nom,
      commande: textes.ligne_commande.replace('{montant}', euros(montant)),
      appliquee,
      resultat: appliquee ? regle.resultat : actuel.resultat,
      regle: appliquee ? textes.ligne_votre_regle : avant.regle,
      change: appliquee && regle.resultat !== actuel.resultat,
      avant,
    };
  });
}
