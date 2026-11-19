import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {structure, ID_REGLAGES} from './structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'remplacer'
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'
const urlDuSite = (process.env.SANITY_STUDIO_SITE_URL ?? 'http://localhost:4321').replace(/\/$/, '')

export default defineConfig({
  name: 'seuil',
  title: 'Seuil, contenu du site',
  projectId,
  dataset,
  plugins: [structureTool({structure, title: 'Contenu'}), visionTool({title: 'Requêtes'})],
  schema: {
    types: schemaTypes,
    // Le document de réglages est unique : on ne le crée pas depuis le menu « Nouveau ».
    templates: (modeles) => modeles.filter((m) => m.schemaType !== 'reglages'),
  },
  document: {
    actions: (actions, {schemaType}) =>
      schemaType === 'reglages' ? actions.filter((a) => !['duplicate', 'delete', 'unpublish'].includes(a.action ?? '')) : actions,
    productionUrl: async (precedent, {document}) => {
      if (document._id === ID_REGLAGES) return urlDuSite
      const slug = (document as {slug?: {current?: string}}).slug?.current
      if (!slug) return precedent
      return slug === 'accueil' ? `${urlDuSite}/` : `${urlDuSite}/${slug}`
    },
  },
})
