import Users from '@lucide/astro/icons/users'
import Shield from '@lucide/astro/icons/shield'
import MapPin from '@lucide/astro/icons/map-pin'
import ClipboardCheck from '@lucide/astro/icons/clipboard-check'

export const teamBuilding = {
  pageTitle: 'Team Building - Flagmingos',
  pageDescription: "Organisez un événement de team building original avec les Flagmingos : initiation au Flag Football pour votre entreprise",
  pageHeader: {
    eybrow: 'CORPORATE EVENTS',
    title: 'TEAM',
    hightlight: 'BUILDING',
    subtitle:
      'Une immersion complète dans un sport collectif, stratégique et sans contact - pour souder vos équipes autrement.',
  },
  description: [
    `Charge de travail, pression des résultats, relations interpersonnelles, équilibre de vie…
            autant de facteurs de stress qui peuvent installer un climat tendu dans une équipe. Un
            séminaire sportif permet d'en désamorcer une bonne partie.`,
    `C'est l'occasion idéale de faire
            découvrir à vos collaborateurs un nouvel univers. Avec le flag football, les Flagmingos
            proposent une immersion complète dans un sport collectif, stratégique, mixte et sans contact —
            accessible à tous, quel que soit le niveau.`,
  ],
  sectionTitle: {
    title: 'DEMANDE DE',
    highlight: 'RENSEIGNEMENTS',
    tagline: 'HUDDLE UP',
  },
  features: [
    {
      icon: Users,
      title: 'Toutes tailles d\u2019équipe',
      text: 'De 10 à 50 personnes, en interne ou entre plusieurs services.',
    },
    {
      icon: Shield,
      title: 'Sans contact, sans risque',
      text: 'Le flag football se joue sans plaquage — accessible à tous les niveaux physiques.',
    },
    {
      icon: MapPin,
      title: 'Chez vous ou chez nous',
      text: 'Sur votre site ou au Parc de Lagarde à Balma, selon vos contraintes.',
    }
  ],
}
