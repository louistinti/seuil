// Petits objets réutilisés par les sections : lien, emplacement, carte, image commentée.
import {LinkIcon} from '@sanity/icons/Link'
import {ImageIcon} from '@sanity/icons/Image'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {ComponentIcon} from '@sanity/icons/Component'
import {defineField, defineType} from 'sanity'
import {texte} from './champs'

export const lien = defineType({
  name: 'lien',
  title: 'Lien',
  type: 'object',
  icon: LinkIcon,
  fields: [
    texte('libelle', 'Libellé', {requis: true, max: 32, description: 'Le texte du bouton ou du lien. Il ne passe pas à la ligne.'}),
    defineField({
      name: 'href',
      title: 'Destination',
      type: 'string',
      description: 'Une page du site (/tarifs, /demo) ou une adresse complète (https://…).',
      validation: (rule) => [
        rule.required().error('Indiquez où mène le lien.'),
        rule.custom((v?: string) =>
          !v || v.startsWith('/') || v.startsWith('#') || /^https?:\/\//.test(v) || /^mailto:/.test(v)
            ? true
            : 'Commencez par « / » pour une page du site, ou par « https:// ».',
        ),
      ],
    }),
  ],
  preview: {
    select: {title: 'libelle', subtitle: 'href'},
  },
})

export const EMPLACEMENTS_COURANTS = [
  'donnée sourcée à venir',
  'emplacement témoignage client',
  'emplacement logo client',
  'prix à caler sur un tarif public sourcé',
  'délai de réponse à préciser',
]

export const emplacement = defineType({
  name: 'emplacement',
  title: 'Emplacement',
  type: 'object',
  icon: ComponentIcon,
  description:
    'Cadre en pointillés qui réserve la place d’un contenu réel et sourcé. Ne le remplacez jamais par un chiffre ou un témoignage inventé.',
  fields: [
    texte('libelle', 'Ce qui viendra ici', {
      requis: true,
      max: 80,
      description: `Affiché tel quel, en minuscules. Libellés courants : ${EMPLACEMENTS_COURANTS.map((e) => `« ${e} »`).join(', ')}.`,
    }),
  ],
  preview: {
    select: {title: 'libelle'},
    prepare: ({title}) => ({title: title || 'Emplacement', subtitle: 'Emplacement à remplacer par un contenu sourcé'}),
  },
})

/** Une valeur réelle et sourcée, ou un emplacement tant qu’elle ne l’est pas. */
export const valeurOuEmplacement = defineType({
  name: 'valeurOuEmplacement',
  title: 'Valeur ou emplacement',
  type: 'object',
  fields: [
    texte('valeur', 'Valeur sourcée', {max: 40, description: 'À remplir seulement quand la valeur est réelle et sourcée.'}),
    texte('emplacement', 'Sinon, emplacement', {max: 60, description: 'Affiché en pointillés tant que la valeur manque. Par exemple « jusqu’à [seuil 1] ».'}),
  ],
  validation: (r) =>
    r.custom((v?: {valeur?: string; emplacement?: string}) =>
      v?.valeur || v?.emplacement ? true : 'Remplissez la valeur sourcée, ou laissez un emplacement.',
    ),
})

export const carte = defineType({
  name: 'carte',
  title: 'Carte',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [texte('titre', 'Titre', {requis: true, max: 70}), texte('texte', 'Texte', {requis: true, lignes: 3, max: 240})],
  preview: {select: {title: 'titre', subtitle: 'texte'}},
})

export const imageCommentee = defineType({
  name: 'imageCommentee',
  title: 'Capture produit',
  type: 'image',
  icon: ImageIcon,
  options: {hotspot: true},
  description: 'L’étiquette « Données fictives » doit rester visible dans la capture.',
  fields: [
    texte('alt', 'Description pour les lecteurs d’écran', {
      requis: true,
      max: 200,
      description: 'Ce que montre la capture, en une phrase. Lu par les personnes malvoyantes.',
    }),
  ],
})
