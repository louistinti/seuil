import {carte, emplacement, imageCommentee, lien, valeurOuEmplacement} from './objets'
import {typesSections} from './sections'
import {page, reglages} from './documents'

export const schemaTypes = [page, reglages, lien, emplacement, valeurOuEmplacement, carte, imageCommentee, ...typesSections]
