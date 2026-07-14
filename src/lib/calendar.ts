import ICAL from 'ical.js'
const CALENDAR_URL = import.meta.env.GOOGLE_CALENDAR_URL
const TIMEZONE = 'Europe/Paris'

export type Event = {
  summary: string
  description: string
  location: string
  startDate: Date
  endDate: Date
  type: string | null | undefined
  format: string | null | undefined
}

export function formatDateDisplay(date: Date) {
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE,
  }).format(date)

  return formatted
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatDate(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE,
  }
  return date.toLocaleDateString('fr-FR', options)
}

export function formatTime(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }
  return date.toLocaleTimeString('fr-FR', options)
}

export function cleanLocation(location: string | null) {
  if (!location) {
    return null
  }
  const cleaned = location.replace(/, France$/, '').trim()
  return cleaned
}

function parseDescription(description?: string | null) {
  if (!description) {
    return {}
  }
  const text = description
    .replace(/<[^>]*>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .trim()
  const getValue = (key: string) => {
    const regex = new RegExp(`${key}:\\s*(.*)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : null
  }
  return {
    type: getValue('Type'),
    format: getValue('Format'),
  }
}

export async function getInitiationSessions() {
  const response = await fetch(CALENDAR_URL)
  const icsData = await response.text()
  const jcalData = ICAL.parse(icsData)
  const comp = new ICAL.Component(jcalData)
  const now = new Date()
  const events = comp.getAllSubcomponents('vevent').map((event) => {
    const e = new ICAL.Event(event)
    return {
      summary: e.summary,
      description: e.description,
      location: e.location,
      startDate: e.startDate.toJSDate(),
      endDate: e.endDate.toJSDate(),
      type: parseDescription(e.description).type,
      format: parseDescription(e.description).format,
    }
  })
  return events
    .filter((event) => event.startDate >= now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
}

export async function getAllEvents() {
  const response = await fetch(CALENDAR_URL)
  const icsData = await response.text()
  const jcalData = ICAL.parse(icsData)
  const comp = new ICAL.Component(jcalData)
  const events = comp.getAllSubcomponents('vevent').map((event) => {
    const e = new ICAL.Event(event)
    return {
      summary: e.summary,
      description: e.description,
      location: e.location,
      startDate: e.startDate.toJSDate(),
      endDate: e.endDate.toJSDate(),
    }
  })
  return events
}
