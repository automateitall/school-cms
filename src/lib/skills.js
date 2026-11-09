// Play Group report cards mark skills on a three-step scale instead of marks.
// Keep in step with backend/src/lib/skills.js.

export const SKILL_CLASSES = ['Play Group']
export const isSkillClass = (className) => SKILL_CLASSES.includes(className)

// Areas in print order, with the card's colours (tint behind, accent for text and ticks)
export const AREAS = [
  { key: 'TALK', title: 'Talking & Listening', tint: '#e6f2fb', accent: '#1f5f99' },
  { key: 'NUMBERS', title: 'Numbers & Shapes', tint: '#fff4d6', accent: '#865700' },
  { key: 'HANDS', title: 'Little Hands', tint: '#e8f6ea', accent: '#23703a' },
  { key: 'FRIENDS', title: 'Me & My Friends', tint: '#fdeaf1', accent: '#a3285a' },
  { key: 'HABITS', title: 'Healthy Habits', tint: '#e3f5f3', accent: '#136b63' },
  { key: 'CREATIVE', title: 'Creative Me', tint: '#f0ebfb', accent: '#5b3fa0' },
]
export const areaOf = (key) => AREAS.find(a => a.key === key) || AREAS[0]

// Highest first, as the buttons and legend read
export const LEVELS = [
  { value: 2, label: 'I can do it!', short: 'Can do' },
  { value: 1, label: 'Getting there', short: 'Getting there' },
  { value: 0, label: 'Not yet — still growing', short: 'Not yet' },
]
