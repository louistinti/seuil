// Forme du contenu tel que les composants le reçoivent, qu'il vienne de Sanity ou de content/pages.json.

export interface Lien {
  libelle: string;
  href: string;
}

export interface Recadrage {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Image {
  url: string;
  largeur: number;
  hauteur: number;
  alt: string;
  crop?: Recadrage | null;
  /** true si l'URL vient du CDN Sanity (redimensionnement par paramètres d'URL). */
  sanity: boolean;
}

export interface Emplacement {
  libelle: string;
}

/** Texte riche réduit (Portable Text) : paragraphes et liens seulement. Sert aux lignes de source. */
export interface BlocSource {
  _key: string;
  _type: 'block';
  children: { _key: string; _type: 'span'; text: string; marks?: string[] }[];
  markDefs?: { _key: string; _type: 'link'; href: string }[];
}

export interface ValeurOuEmplacement {
  valeur?: string;
  emplacement?: string;
}

export interface Carte {
  titre: string;
  texte: string;
}

interface Base {
  _key: string;
  surtitre?: string;
  ancre?: string;
}

export interface SectionHero extends Base {
  _type: 'sectionHero';
  etiquette?: string;
  titre: string;
  texte: string;
  boutons?: Lien[];
  sousNavigation?: Lien[];
  note?: string;
  visuel: 'aucun' | 'simulateur' | 'capture';
  capture?: Image | null;
}

export interface SectionProbleme extends Base {
  _type: 'sectionProbleme';
  titre?: string;
  cartes?: Carte[];
  emplacement?: Emplacement | null;
}

export interface SectionBenefices extends Base {
  _type: 'sectionBenefices';
  titre: string;
  cartes: (Carte & { role?: string; resultat?: string; lien?: Lien | null })[];
}

export interface SectionEtapes extends Base {
  _type: 'sectionEtapes';
  titre: string;
  disposition: 'colonnes' | 'liste';
  etapes: Carte[];
  emplacement?: Emplacement | null;
  precision?: string | null;
}

export interface SectionFonctionnalite extends Base {
  _type: 'sectionFonctionnalite';
  titre: string;
  texte?: string;
  coches?: string[];
  visuel: 'aucun' | 'capture' | 'alertes' | 'portefeuille';
  capture?: Image | null;
  captureMobile?: Image | null;
}

export interface SectionIntegrations extends Base {
  _type: 'sectionIntegrations';
  titre: string;
  variante: 'tuiles' | 'cartes';
  elements: (Carte & { emplacement?: Emplacement | null; precision?: string | null })[];
}

export interface SectionTemoignage extends Base {
  _type: 'sectionTemoignage';
  logos?: number;
}

export interface Formule {
  nom: string;
  chiffreAffaires: ValeurOuEmplacement;
  description: string;
  prix: ValeurOuEmplacement;
  precisionPrix?: string | null;
  coches: string[];
  bouton: Lien;
  miseEnAvant?: boolean;
}

export interface SectionTarifs extends Base {
  _type: 'sectionTarifs';
  formules: Formule[];
  source?: BlocSource[] | null;
}

export interface SectionFaq extends Base {
  _type: 'sectionFaq';
  titre: string;
  questions: { question: string; reponse: string }[];
}

export interface SectionAppelAction extends Base {
  _type: 'sectionAppelAction';
  variante: 'bandeau' | 'formulaire';
  titre: string;
  texte?: string;
  bouton?: Lien | null;
  delai?: Emplacement | null;
  delaiReponse?: string | null;
  roles?: string[];
  libelleEnvoi?: string;
  mention?: string;
}

export type Section =
  | SectionHero
  | SectionProbleme
  | SectionBenefices
  | SectionEtapes
  | SectionFonctionnalite
  | SectionIntegrations
  | SectionTemoignage
  | SectionTarifs
  | SectionFaq
  | SectionAppelAction;

export interface Page {
  _id: string;
  titre: string;
  slug: string;
  description: string;
  sections: Section[];
}

export interface Reglages {
  navigation: Lien[];
  bouton: Lien;
  boutonMobile: string;
  piedDePage: Lien[];
  mention: string;
  credit?: { texte: string; lien: Lien } | null;
}
