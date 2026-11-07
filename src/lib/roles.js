// Who can open each CMS page. The backend enforces the same limits on its API (auth.middleware.js ROLES);
// keep the two in step when changing access.
export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant',
  FRONT_DESK: 'Front Desk',
}

const ALL = ['SUPER_ADMIN', 'TEACHER', 'ACCOUNTANT', 'FRONT_DESK']
const ADMIN = ['SUPER_ADMIN']
const ACADEMIC = ['SUPER_ADMIN', 'TEACHER']
const OFFICE = ['SUPER_ADMIN', 'FRONT_DESK']

export const PAGE_ROLES = {
  '/dashboard': ALL,
  '/account': ALL,
  '/students': ALL,
  '/attendance': ACADEMIC,
  '/marks': ACADEMIC,
  '/subjects': ADMIN,
  '/exam-types': ADMIN,
  '/report-card': ACADEMIC,
  '/question-paper': ACADEMIC,
  '/notices': ['SUPER_ADMIN', 'TEACHER', 'FRONT_DESK'],
  '/admissions': ['SUPER_ADMIN', 'FRONT_DESK', 'ACCOUNTANT'],
  '/gallery': OFFICE,
  '/settings': ADMIN,
  '/year-end': ADMIN,
  '/users': ADMIN,
}

export const canAccess = (role, path) => (PAGE_ROLES[path] || ADMIN).includes(role)
