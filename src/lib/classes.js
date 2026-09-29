 
import api from './api'
import { getCachedClasses } from './cache'

export const CLASS_ORDER = [
  'Play Group',
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12'
]

export async function fetchClasses() {
  try {
    return await getCachedClasses(api)
  } catch {
    return CLASS_ORDER
  }
}