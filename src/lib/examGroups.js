// Which exams a report card for a given exam type combines. The last name is the selected exam itself.
export const EXAM_GROUPS = {
  'Unit Test 1': ['Unit Test 1'],
  'Unit Test 2': ['Unit Test 2'],
  'Half Yearly': ['Unit Test 1', 'Unit Test 2', 'Half Yearly'],
  'Final Exam': ['Unit Test 1', 'Unit Test 2', 'Half Yearly', 'Final Exam'],
  // The exam type is named "Final" in the CMS
  'Final': ['Unit Test 1', 'Unit Test 2', 'Half Yearly', 'Final'],
}

// Group for an exam type; the backend drops names that are not exam types in the CMS
export const groupFor = (examType) => EXAM_GROUPS[examType] || [examType]

// Query string for GET /report-cards from the Report Card page's choices
export const reportCardsQuery = ({ className, studentId, examType, exams, session, attendance }) => {
  const q = new URLSearchParams({ group: groupFor(examType).join(',') })
  if (className) q.set('class', className)
  if (studentId) q.set('studentId', studentId)
  if (exams) q.set('exams', exams)
  if (session) q.set('session', session)
  if (attendance) q.set('attendance', '1')
  return q.toString()
}
