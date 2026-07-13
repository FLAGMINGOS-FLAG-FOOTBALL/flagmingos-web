export type PalmaresEntry = {
  team?: string
  name?: string
  result: string
  highlight?: boolean
  achievement?: 'title' | 'podium' | 'winner'
}

export type Palmares = {
  year: number
  championship?: PalmaresEntry[]
  cup?: PalmaresEntry[]
  tournaments?: PalmaresEntry[]
}[]

export const palmares: Palmares = [
  {
    year: 2026,
    championship: [
      {
        team: 'Team A',
        result: 'Finale de conférence Sud D1',
      },
      {
        team: 'Team C',
        result: 'Finale de conférence Sud D2',
      },
    ],
    cup: [
      {
        team: 'Hommes',
        result: 'Finale de conférence D1',
      },
      {
        team: 'Femmes',
        result: 'Phase de qualification',
      },
    ],
    tournaments: [
      {
        name: 'Spartan Bowl',
        result: 'Vainqueur',
        achievement: 'winner',
      },
    ],
  },

  {
    year: 2025,
    championship: [
      {
        team: 'Team',
        result: '4ème place D2',
      },
    ],
    tournaments: [
      {
        name: 'Challenge Occitanie',
        result: '3ème place',
      },
    ],
  },

  {
    year: 2024,
    championship: [
      {
        team: 'Team',
        result: '3ème Division 2',
        achievement: 'podium',
      },
    ],
    cup: [
      {
        team: 'Femmes',
        result: '5ème place',
      },
    ],
    tournaments: [
      {
        name: 'Challenge Occitanie',
        result: '2ème place',
      },
    ],
  },

  {
    year: 2023,
    championship: [
      {
        team: 'Team',
        result: '5ème place D2',
      },
    ],
    tournaments: [
      {
        name: 'Challenge Occitanie',
        result: 'Champion',
        achievement: 'winner',
      },
    ],
  },

  {
    year: 2022,
    championship: [
      {
        team: 'Club',
        result: 'Champion de France Division 2',
        highlight: true,
        achievement: 'title',
      },
    ],
    tournaments: [
      {
        name: 'Régional Occitanie',
        result: '3ème place',
      },
      {
        name: 'Arrow Super Ligue',
        result: '6ème place',
      },
    ],
  },

  {
    year: 2021,
    tournaments: [
      {
        name: 'Arrow Super Ligue',
        result: '7ème place',
      },
    ],
  },
]
