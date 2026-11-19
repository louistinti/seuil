// Documents : une page par route, et un document unique de réglages (navigation, pied de page).
import {DocumentsIcon} from '@sanity/icons/Documents'
import {CogIcon} from '@sanity/icons/Cog'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {bornes, MENTION_FICTION, texte} from './champs'
import {typesSections} from './sections'

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentsIcon,
  groups: [
    {name: 'contenu', title: 'Contenu', default: true},
    {name: 'referencement', title: 'Référencement'},
  ],
  fields: [
    texte('titre', 'Nom de la page', {requis: true, max: 40, description: 'Utilisé dans le Studio et dans l’onglet du navigateur.'}),
    defineField({
      name: 'slug',
      title: 'Adresse',
      type: 'slug',
      group: 'referencement',
      description: 'La fin de l’adresse de la page : « tarifs » donne /tarifs. « accueil » est la page d’accueil.',
      options: {source: 'titre', maxLength: 40},
      validation: (r) => r.required().error('Chaque page a une adresse.'),
    }),
    texte('description', 'Description pour les moteurs de recherche', {
      requis: true,
      lignes: 2,
      max: 160,
      description: 'Une ou deux phrases affichées sous le titre dans les résultats de recherche.',
    }),
    defineField({name: 'ordre', title: 'Ordre dans la liste du Studio', type: 'number', group: 'referencement', initialValue: 10}),
    defineField({
      name: 'sections',
      title: 'Sections',
      description: 'Les sections s’affichent dans cet ordre. Glissez-les pour les réordonner.',
      type: 'array',
      group: 'contenu',
      of: typesSections.map((t) => defineArrayMember({type: t.name})),
      options: {insertMenu: {views: [{name: 'list'}]}},
      validation: bornes(1, 14),
    }),
  ],
  orderings: [{title: 'Ordre du site', name: 'ordre', by: [{field: 'ordre', direction: 'asc'}]}],
  preview: {
    select: {title: 'titre', slug: 'slug.current', sections: 'sections'},
    prepare: ({title, slug, sections}) => ({
      title,
      subtitle: `${slug === 'accueil' ? '/' : `/${slug ?? ''}`} · ${sections?.length ?? 0} sections`,
    }),
  },
})

export const reglages = defineType({
  name: 'reglages',
  title: 'Réglages du site',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'navigation',
      title: 'Liens de la navigation',
      description: 'La pilule centrale, sur ordinateur.',
      type: 'array',
      of: [defineArrayMember({type: 'lien'})],
      validation: (r) => r.length(4).error('La navigation compte exactement 4 liens.'),
    }),
    defineField({name: 'bouton', title: 'Bouton de la navigation', type: 'lien', validation: (r) => r.required()}),
    texte('boutonMobile', 'Libellé court du bouton sur mobile', {requis: true, max: 12, description: 'Par exemple « Démo ».'}),
    defineField({name: 'piedDePage', title: 'Liens du pied de page', type: 'array', of: [defineArrayMember({type: 'lien'})], validation: bornes(1, 8)}),
    defineField({
      name: 'mention',
      title: 'Mention obligatoire',
      type: 'string',
      readOnly: true,
      initialValue: MENTION_FICTION,
      description: 'Affichée sur toutes les pages. Elle ne se modifie pas.',
      validation: (r) => r.custom((v) => (v === MENTION_FICTION ? true : `La mention doit rester : « ${MENTION_FICTION} »`)),
    }),
  ],
  preview: {prepare: () => ({title: 'Réglages du site', subtitle: 'Navigation et pied de page'})},
})
