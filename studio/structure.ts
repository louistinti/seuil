import {CogIcon} from '@sanity/icons/Cog'
import {DocumentsIcon} from '@sanity/icons/Documents'
import type {StructureResolver} from 'sanity/structure'

export const ID_REGLAGES = 'reglages'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Contenu du site')
    .items([
      S.listItem()
        .title('Pages')
        .icon(DocumentsIcon)
        .child(S.documentTypeList('page').title('Pages').defaultOrdering([{field: 'ordre', direction: 'asc'}])),
      S.divider(),
      S.listItem()
        .title('Réglages du site')
        .icon(CogIcon)
        .child(S.document().schemaType('reglages').documentId(ID_REGLAGES).title('Réglages du site')),
    ])
