// Champs et règles de validation partagés. Les messages s'adressent à une personne non technique.
import {defineField, type ConditionalProperty, type StringRule, type TextRule} from 'sanity'

export const MENTION_FICTION = 'Seuil est une entreprise fictive, conçue comme démonstration.'

/** Règle de rédaction : jamais de tiret cadratin. */
export function sansCadratin(valeur?: string) {
  if (valeur && valeur.includes('—')) {
    return 'Pas de tiret cadratin (—) : utilisez une virgule, deux-points ou des parenthèses.'
  }
  return true
}

/** Un pourcentage dans un texte doit être sourcé. Avertissement seulement. */
export function pourcentageSource(valeur?: string) {
  if (valeur && /\d\s?%/.test(valeur)) {
    return 'Pourcentage détecté : un chiffre de marché doit être sourcé. Sinon, utilisez un emplacement « donnée sourcée à venir ».'
  }
  return true
}

interface OptionsTexte {
  requis?: boolean
  max?: number
  lignes?: number
  description?: string
  initialValue?: string
  hidden?: ConditionalProperty
}

/** Champ texte court (string) ou long (text, si `lignes`) avec les règles de rédaction. */
export function texte(name: string, title: string, options: OptionsTexte = {}) {
  const {requis = false, max, lignes, description, initialValue, hidden} = options
  const validation = (rule: StringRule | TextRule) => {
    const regles = [rule.custom(sansCadratin), rule.custom(pourcentageSource).warning()]
    if (requis) regles.push(rule.required().error('Ce champ est obligatoire.'))
    if (max) {
      regles.push(
        rule.max(max).warning(`Plus de ${max} caractères : le texte risque de déborder de la maquette.`),
      )
    }
    return regles
  }
  return lignes
    ? defineField({name, title, type: 'text', rows: lignes, description, initialValue, hidden, validation})
    : defineField({name, title, type: 'string', description, initialValue, hidden, validation})
}

/** Tableau d'éléments avec bornes min / max et messages lisibles. */
export function bornes(min?: number, max?: number) {
  return (rule: any) => {
    const regles = []
    if (min) regles.push(rule.min(min).error(`Ajoutez au moins ${min} élément${min > 1 ? 's' : ''}.`))
    if (max) regles.push(rule.max(max).error(`${max} éléments au maximum.`))
    return regles
  }
}
