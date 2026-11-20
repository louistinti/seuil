// Une section par ligne du tableau « Sections du CMS » de composants.md.
// Chaque aperçu dit en clair de quelle section il s'agit et ce qu'elle contient.
import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {BulbOutlineIcon} from '@sanity/icons/BulbOutline'
import {UsersIcon} from '@sanity/icons/Users'
import {OlistIcon} from '@sanity/icons/Olist'
import {StarIcon} from '@sanity/icons/Star'
import {PlugIcon} from '@sanity/icons/Plug'
import {CommentIcon} from '@sanity/icons/Comment'
import {TagIcon} from '@sanity/icons/Tag'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {RocketIcon} from '@sanity/icons/Rocket'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {bornes, texte} from './champs'

export const MENTION_FORMULAIRE = "Formulaire de démonstration : rien n'est envoyé."
export const RESULTATS = ['Acceptée', 'Refusée', "Envoyée à l'analyste"]

const pluriel = (n: number | undefined, mot: string) => `${n ?? 0} ${mot}${(n ?? 0) > 1 ? 's' : ''}`

/** Surtitre et ancre, communs à toutes les sections. */
const surtitre = texte('surtitre', 'Surtitre', {max: 40, description: 'Petite ligne en capitales au-dessus du titre, par exemple « Le problème ».'})
const ancre = defineField({
  name: 'ancre',
  title: 'Ancre (facultatif)',
  type: 'string',
  description: 'Permet de lier directement cette section : « regles » donne /produit#regles. Minuscules, chiffres et tirets.',
  validation: (r) => r.regex(/^[a-z0-9-]+$/, {name: 'ancre'}).error('Minuscules, chiffres et tirets seulement, sans espace ni accent.'),
})

/** Un fait rempli remplace l'emplacement : les deux ensemble se contrediraient. */
const pasLesDeux = (champ: string) => (r: any) =>
  r.custom((valeur: unknown, context: {parent?: Record<string, unknown>}) =>
    valeur && context.parent?.[champ] ? 'Videz l’emplacement : la précision le remplace.' : true,
  )

/** Ajoute une règle à un champ sans perdre ses règles de rédaction (cadratin, longueur). */
const avecRegle = <T extends {validation?: unknown}>(champ: T, regle: (r: any) => unknown) => ({
  ...champ,
  validation: (r: any) => [(champ.validation as (r: any) => unknown)?.(r), regle(r)].flat().filter(Boolean),
})

/** Ligne de source : texte simple, seuls des liens sont possibles (pas de titre, de liste ni de gras). */
const ligneDeSource = defineField({
  name: 'source',
  title: 'Ligne de source',
  description:
    'Obligatoire dès qu’un prix ou un seuil est rempli : dites d’où vient chaque chiffre et liez la source. Sélectionnez un mot puis cliquez sur l’icône lien.',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{title: 'Normal', value: 'normal'}],
      lists: [],
      marks: {
        decorators: [],
        annotations: [
          {
            name: 'link',
            title: 'Lien',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'Adresse',
                type: 'url',
                validation: (r) => r.required().uri({scheme: ['https']}).error('Une adresse https:// complète.'),
              }),
            ],
          },
        ],
      },
    }),
  ],
})

const visuelRequisSi =(valeurAttendue: string, message: string) =>
  (r: any) =>
    r.custom((valeur: unknown, context: {parent?: {visuel?: string}}) =>
      context.parent?.visuel === valeurAttendue && !valeur ? message : true,
    )

export const sectionHero = defineType({
  name: 'sectionHero',
  title: 'Hero',
  type: 'object',
  icon: RocketIcon,
  fields: [
    surtitre,
    texte('etiquette', 'Ou étiquette à contour', {max: 40, description: 'Remplace le surtitre par une petite étiquette encadrée, comme sur l’accueil.'}),
    texte('titre', 'Titre', {requis: true, max: 90}),
    texte('texte', 'Phrase d’accroche', {requis: true, lignes: 3, max: 260}),
    defineField({name: 'boutons', title: 'Boutons', description: 'Le premier est le bouton principal.', type: 'array', of: [defineArrayMember({type: 'lien'})], validation: bornes(undefined, 2)}),
    defineField({
      name: 'sousNavigation',
      title: 'Sous-navigation (facultatif)',
      description: 'Pastilles qui mènent aux sections de la page, par exemple « Règles » vers #regles.',
      type: 'array',
      of: [defineArrayMember({type: 'lien'})],
      validation: bornes(undefined, 8),
    }),
    texte('note', 'Note sous les boutons (facultatif)', {max: 80, description: 'Par exemple « Essayez : choisissez un client et un montant. »'}),
    defineField({
      name: 'visuel',
      title: 'Visuel à droite',
      type: 'string',
      options: {
        list: [
          {title: 'Aucun', value: 'aucun'},
          {title: 'Simulateur de décision', value: 'simulateur'},
          {title: 'Capture produit (écran ou téléphone)', value: 'capture'},
        ],
        layout: 'radio',
      },
      initialValue: 'aucun',
      description: 'Le simulateur utilise les clients et les règles de démonstration, qui ne se modifient pas ici.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'capture',
      title: 'Capture produit',
      type: 'imageCommentee',
      hidden: ({parent}) => parent?.visuel !== 'capture',
      validation: visuelRequisSi('capture', 'Ajoutez la capture, ou choisissez un autre visuel.'),
    }),
  ],
  preview: {
    select: {title: 'titre', visuel: 'visuel', media: 'capture'},
    prepare: ({title, visuel, media}) => ({
      title: title || 'Hero sans titre',
      subtitle: `Hero${visuel === 'simulateur' ? ' · avec le simulateur' : visuel === 'capture' ? ' · avec une capture' : ''}`,
      media: media ?? RocketIcon,
    }),
  },
})

export const sectionProbleme = defineType({
  name: 'sectionProbleme',
  title: 'Problème',
  type: 'object',
  icon: BulbOutlineIcon,
  fields: [
    surtitre,
    texte('titre', 'Titre', {max: 90}),
    defineField({name: 'cartes', title: 'Cartes', type: 'array', of: [defineArrayMember({type: 'carte'})], validation: bornes(undefined, 4)}),
    defineField({name: 'emplacement', title: 'Statistique à venir (emplacement)', type: 'emplacement'}),
  ],
  validation: (r) =>
    r.custom((v?: {cartes?: unknown[]; emplacement?: unknown; titre?: string}) =>
      v?.cartes?.length || v?.emplacement ? true : 'Ajoutez des cartes ou un emplacement : la section serait vide.',
    ),
  preview: {
    select: {title: 'titre', cartes: 'cartes', emplacement: 'emplacement.libelle'},
    prepare: ({title, cartes, emplacement}) => ({
      title: title || (emplacement ? `Emplacement : ${emplacement}` : 'Problème sans titre'),
      subtitle: `Problème · ${pluriel(cartes?.length, 'carte')}`,
    }),
  },
})

export const sectionBenefices = defineType({
  name: 'sectionBenefices',
  title: 'Bénéfices par rôle',
  type: 'object',
  icon: UsersIcon,
  fields: [
    surtitre,
    texte('titre', 'Titre', {requis: true, max: 90}),
    defineField({
      name: 'cartes',
      title: 'Cartes',
      type: 'array',
      validation: bornes(2, 4),
      of: [
        defineArrayMember({
          name: 'carteRole',
          title: 'Carte',
          type: 'object',
          icon: UsersIcon,
          fields: [
            texte('role', 'Rôle', {max: 40, description: 'Par exemple « Direction financière ». Laissez vide si la carte montre un résultat.'}),
            defineField({
              name: 'resultat',
              title: 'Ou badge de résultat',
              type: 'string',
              options: {list: RESULTATS, layout: 'radio', direction: 'horizontal'},
              description: 'Pour les cartes « résultat » : le badge remplace le rôle.',
            }),
            texte('titre', 'Titre', {requis: true, max: 70}),
            texte('texte', 'Texte', {requis: true, lignes: 3, max: 240}),
            defineField({name: 'lien', title: 'Lien fléché (facultatif)', type: 'lien'}),
          ],
          validation: (r) =>
            r.custom((v?: {role?: string; resultat?: string}) =>
              v?.role && v?.resultat ? 'Choisissez un rôle ou un badge, pas les deux.' : true,
            ),
          preview: {
            select: {role: 'role', resultat: 'resultat', titre: 'titre'},
            prepare: ({role, resultat, titre}) => ({title: titre, subtitle: role || resultat}),
          },
        }),
      ],
    }),
    ancre,
  ],
  preview: {
    select: {title: 'titre', cartes: 'cartes'},
    prepare: ({title, cartes}) => ({title: title || 'Bénéfices sans titre', subtitle: `Bénéfices par rôle · ${pluriel(cartes?.length, 'carte')}`}),
  },
})

export const sectionEtapes = defineType({
  name: 'sectionEtapes',
  title: 'Étapes',
  type: 'object',
  icon: OlistIcon,
  fields: [
    surtitre,
    texte('titre', 'Titre', {requis: true, max: 90}),
    defineField({
      name: 'disposition',
      title: 'Disposition',
      type: 'string',
      options: {
        list: [
          {title: 'En colonnes, filet au-dessus (accueil, commerciaux)', value: 'colonnes'},
          {title: 'En liste, numéro à gauche (démo)', value: 'liste'},
        ],
        layout: 'radio',
      },
      initialValue: 'colonnes',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'etapes',
      title: 'Étapes',
      description: 'Les numéros s’ajoutent tout seuls, dans l’ordre de la liste.',
      type: 'array',
      of: [defineArrayMember({type: 'carte', title: 'Étape'})],
      validation: bornes(2, 5),
    }),
    defineField({name: 'emplacement', title: 'Emplacement sous les étapes (facultatif)', type: 'emplacement'}),
    avecRegle(
      texte('precision', 'Précision sous les étapes (facultatif)', {max: 80, description: 'Un fait sur le déroulé, par exemple la durée de la démonstration. Remplace l’emplacement.'}),
      pasLesDeux('emplacement'),
    ),
    ancre,
  ],
  preview: {
    select: {title: 'titre', etapes: 'etapes', disposition: 'disposition'},
    prepare: ({title, etapes, disposition}) => ({
      title: title || 'Étapes sans titre',
      subtitle: `Étapes · ${pluriel(etapes?.length, 'étape')}, ${disposition === 'liste' ? 'en liste' : 'en colonnes'}`,
    }),
  },
})

export const VISUELS_FONCTIONNALITE = [
  {title: 'Aucun (titre à gauche, coches à droite)', value: 'aucun'},
  {title: 'Capture produit, en pleine largeur', value: 'capture'},
  {title: 'Panneau Alertes, à droite', value: 'alertes'},
  {title: 'Panneau Portefeuille clients, en pleine largeur', value: 'portefeuille'},
  {title: 'Démo « Écrire une règle en langage naturel », en pleine largeur (textes du panneau dans le code)', value: 'langage-naturel'},
]

export const sectionFonctionnalite = defineType({
  name: 'sectionFonctionnalite',
  title: 'Bloc fonctionnalité',
  type: 'object',
  icon: StarIcon,
  fields: [
    surtitre,
    texte('titre', 'Titre', {requis: true, max: 90}),
    texte('texte', 'Texte (facultatif)', {lignes: 4, max: 320}),
    defineField({
      name: 'coches',
      title: 'Liste à coches',
      type: 'array',
      of: [defineArrayMember({type: 'string', validation: (r) => r.max(110).warning('Ligne longue : visez moins de 110 caractères.')})],
      validation: bornes(undefined, 5),
    }),
    defineField({
      name: 'visuel',
      title: 'Visuel',
      type: 'string',
      options: {list: VISUELS_FONCTIONNALITE, layout: 'radio'},
      initialValue: 'capture',
      description: 'Les panneaux montrent les clients de démonstration, toujours marqués « Données fictives ».',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'capture',
      title: 'Capture produit (ordinateur)',
      type: 'imageCommentee',
      hidden: ({parent}) => parent?.visuel !== 'capture',
      validation: visuelRequisSi('capture', 'Ajoutez la capture, ou choisissez un autre visuel.'),
    }),
    defineField({
      name: 'captureMobile',
      title: 'Capture produit (téléphone, facultatif)',
      description: 'Remplace la capture sur mobile, où un écran d’ordinateur réduit devient illisible.',
      type: 'imageCommentee',
      hidden: ({parent}) => parent?.visuel !== 'capture',
    }),
    ancre,
  ],
  preview: {
    select: {title: 'titre', surtitre: 'surtitre', visuel: 'visuel', media: 'capture'},
    prepare: ({title, surtitre, visuel, media}) => ({
      title: title || 'Bloc sans titre',
      subtitle: `Fonctionnalité${surtitre ? ` « ${surtitre} »` : ''} · ${VISUELS_FONCTIONNALITE.find((v) => v.value === visuel)?.title.split(',')[0] ?? ''}`,
      media: media ?? StarIcon,
    }),
  },
})

export const sectionIntegrations = defineType({
  name: 'sectionIntegrations',
  title: 'Intégrations',
  type: 'object',
  icon: PlugIcon,
  fields: [
    surtitre,
    texte('titre', 'Titre', {requis: true, max: 90}),
    defineField({
      name: 'variante',
      title: 'Variante',
      type: 'string',
      options: {
        list: [
          {title: 'Tuiles d’intégration (titre et description courte)', value: 'tuiles'},
          {title: 'Cartes DSI (titre, texte, précision)', value: 'cartes'},
        ],
        layout: 'radio',
      },
      initialValue: 'tuiles',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'elements',
      title: 'Éléments',
      description: 'Ni logo ni nom d’éditeur réel.',
      type: 'array',
      validation: bornes(2, 6),
      of: [
        defineArrayMember({
          name: 'element',
          title: 'Élément',
          type: 'object',
          icon: PlugIcon,
          fields: [
            texte('titre', 'Titre', {requis: true, max: 40}),
            texte('texte', 'Texte', {requis: true, lignes: 2, max: 200}),
            defineField({name: 'emplacement', title: 'Précision à venir (cartes DSI seulement)', type: 'emplacement'}),
            avecRegle(
              texte('precision', 'Précision (cartes DSI seulement)', {max: 110, description: 'Le fait qui répond à la question du DSI. Remplace l’emplacement.'}),
              pasLesDeux('emplacement'),
            ),
          ],
          preview: {select: {title: 'titre', subtitle: 'texte'}},
        }),
      ],
    }),
    ancre,
  ],
  preview: {
    select: {title: 'titre', elements: 'elements', variante: 'variante'},
    prepare: ({title, elements, variante}) => ({
      title: title || 'Intégrations sans titre',
      subtitle: `Intégrations · ${pluriel(elements?.length, variante === 'cartes' ? 'carte' : 'tuile')}`,
    }),
  },
})

export const sectionTemoignage = defineType({
  name: 'sectionTemoignage',
  title: 'Témoignage',
  type: 'object',
  icon: CommentIcon,
  description: 'Aucun faux témoignage : la section affiche des emplacements tant qu’un vrai client n’a pas donné son accord.',
  fields: [
    defineField({
      name: 'logos',
      title: 'Nombre d’emplacements logo client',
      type: 'number',
      initialValue: 4,
      validation: (r) => r.min(0).max(6).integer(),
    }),
  ],
  preview: {
    select: {logos: 'logos'},
    prepare: ({logos}) => ({title: 'Emplacement témoignage client', subtitle: `Témoignage · ${pluriel(logos, 'emplacement')} logo`}),
  },
})

export const sectionTarifs = defineType({
  name: 'sectionTarifs',
  title: 'Tarifs',
  type: 'object',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'formules',
      title: 'Formules',
      type: 'array',
      validation: (r) => [
        r.length(3).error('Le site présente exactement 3 formules.'),
        r.custom((formules?: {miseEnAvant?: boolean}[]) =>
          (formules ?? []).filter((f) => f.miseEnAvant).length > 1 ? 'Une seule formule peut être mise en avant.' : true,
        ),
      ],
      of: [
        defineArrayMember({
          name: 'formule',
          title: 'Formule',
          type: 'object',
          icon: TagIcon,
          fields: [
            texte('nom', 'Nom', {requis: true, max: 30}),
            defineField({
              name: 'chiffreAffaires',
              title: 'Chiffre d’affaires',
              description: 'Ce qui distingue d’abord les formules : la tranche de chiffre d’affaires annuel, par exemple « moins de 15 M€ ».',
              type: 'valeurOuEmplacement',
              validation: (r) => r.required(),
            }),
            texte('description', 'Description', {requis: true, lignes: 2, max: 160}),
            defineField({
              name: 'prix',
              title: 'Prix',
              description: 'Montant seul, par exemple « 245 € » ou « Sur devis ». Calé sur un tarif public, cité dans la ligne de source.',
              type: 'valeurOuEmplacement',
              validation: (r) => r.required(),
            }),
            texte('precisionPrix', 'Précision du prix', {max: 30, description: 'Affichée à côté du montant, par exemple « HT par mois ». Vide pour « Sur devis ».'}),
            defineField({name: 'coches', title: 'Liste à coches', type: 'array', of: [defineArrayMember({type: 'string'})], validation: bornes(1, 8)}),
            defineField({name: 'bouton', title: 'Bouton', type: 'lien', validation: (r) => r.required()}),
            defineField({name: 'miseEnAvant', title: 'Mise en avant (fond sombre)', type: 'boolean', initialValue: false}),
          ],
          preview: {
            select: {title: 'nom', ca: 'chiffreAffaires', prix: 'prix', precision: 'precisionPrix', miseEnAvant: 'miseEnAvant'},
            prepare: ({title, ca, prix, precision, miseEnAvant}) => ({
              title: `${title ?? 'Formule'}${miseEnAvant ? ' (mise en avant)' : ''}`,
              subtitle: [ca?.valeur || ca?.emplacement, [prix?.valeur, precision].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
            }),
          },
        }),
      ],
    }),
    {
      ...ligneDeSource,
      validation: (r: any) =>
        r.custom((source: unknown[] | undefined, context: {parent?: {formules?: {prix?: {valeur?: string}; chiffreAffaires?: {valeur?: string}}[]}}) => {
          const rempli = (context.parent?.formules ?? []).some((f) => f.prix?.valeur || f.chiffreAffaires?.valeur)
          return rempli && !source?.length ? 'Un prix ou un seuil est rempli : la ligne de source est obligatoire.' : true
        }),
    },
    ancre,
  ],
  preview: {
    select: {formules: 'formules'},
    prepare: ({formules}) => ({
      title: (formules ?? []).map((f: {nom?: string}) => f.nom).join(', ') || 'Tarifs',
      subtitle: `Tarifs · ${pluriel(formules?.length, 'formule')}`,
    }),
  },
})

export const sectionFaq = defineType({
  name: 'sectionFaq',
  title: 'FAQ',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    surtitre,
    texte('titre', 'Titre', {requis: true, max: 90}),
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      validation: bornes(1, 12),
      of: [
        defineArrayMember({
          name: 'question',
          title: 'Question',
          type: 'object',
          icon: HelpCircleIcon,
          fields: [texte('question', 'Question', {requis: true, max: 120}), texte('reponse', 'Réponse', {requis: true, lignes: 4, max: 600})],
          preview: {select: {title: 'question', subtitle: 'reponse'}},
        }),
      ],
    }),
    ancre,
  ],
  preview: {
    select: {title: 'titre', questions: 'questions'},
    prepare: ({title, questions}) => ({title: title || 'FAQ', subtitle: `FAQ · ${pluriel(questions?.length, 'question')}`}),
  },
})

export const sectionAppelAction = defineType({
  name: 'sectionAppelAction',
  title: 'Appel à l’action',
  type: 'object',
  icon: BlockElementIcon,
  fields: [
    defineField({
      name: 'variante',
      title: 'Variante',
      type: 'string',
      options: {
        list: [
          {title: 'Bandeau sombre avec un bouton', value: 'bandeau'},
          {title: 'Formulaire de démo', value: 'formulaire'},
        ],
        layout: 'radio',
      },
      initialValue: 'bandeau',
      validation: (r) => r.required(),
    }),
    surtitre,
    texte('titre', 'Titre', {requis: true, max: 80}),
    texte('texte', 'Phrase', {lignes: 3, max: 240}),
    defineField({
      name: 'bouton',
      title: 'Bouton',
      type: 'lien',
      hidden: ({parent}) => parent?.variante !== 'bandeau',
      validation: (r) =>
        r.custom((valeur, context) =>
          (context.parent as {variante?: string})?.variante === 'bandeau' && !valeur ? 'Le bandeau a toujours un bouton.' : true,
        ),
    }),
    defineField({
      name: 'delai',
      title: 'Délai de réponse (emplacement)',
      type: 'emplacement',
      hidden: ({parent}) => parent?.variante !== 'formulaire',
    }),
    avecRegle(
      texte('delaiReponse', 'Délai de réponse', {
        max: 60,
        description: 'Par exemple « Réponse sous 2 jours ouvrés. ». Remplace l’emplacement.',
        hidden: ({parent}) => parent?.variante !== 'formulaire',
      }),
      pasLesDeux('delai'),
    ),
    defineField({
      name: 'roles',
      title: 'Choix du champ « Votre rôle »',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      hidden: ({parent}) => parent?.variante !== 'formulaire',
      validation: (r) =>
        r.custom((valeur: unknown[] | undefined, context) =>
          (context.parent as {variante?: string})?.variante === 'formulaire' && !valeur?.length ? 'Ajoutez au moins un rôle.' : true,
        ),
    }),
    texte('libelleEnvoi', 'Libellé du bouton d’envoi', {max: 32, hidden: ({parent}) => parent?.variante !== 'formulaire'}),
    defineField({
      name: 'mention',
      title: 'Mention sous le bouton',
      type: 'string',
      readOnly: true,
      initialValue: MENTION_FORMULAIRE,
      description: 'Fixe : le formulaire n’envoie rien et le dit.',
      hidden: ({parent}) => parent?.variante !== 'formulaire',
    }),
    ancre,
  ],
  preview: {
    select: {title: 'titre', variante: 'variante'},
    prepare: ({title, variante}) => ({
      title: title || 'Appel à l’action',
      subtitle: `Appel à l’action · ${variante === 'formulaire' ? 'formulaire de démo' : 'bandeau sombre'}`,
    }),
  },
})

export const typesSections = [
  sectionHero,
  sectionProbleme,
  sectionBenefices,
  sectionEtapes,
  sectionFonctionnalite,
  sectionIntegrations,
  sectionTemoignage,
  sectionTarifs,
  sectionFaq,
  sectionAppelAction,
]
