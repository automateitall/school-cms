// Which exams a report card for a given exam type combines. The last name is the selected exam itself.
export const EXAM_GROUPS = {
  'Unit Test 1': ['Unit Test 1'],
  'Unit Test 2': ['Unit Test 2'],
  'Half Yearly': ['Unit Test 1', 'Unit Test 2', 'Half Yearly'],
  'Final Exam': ['Unit Test 1', 'Unit Test 2', 'Half Yearly', 'Final Exam'],
}

// Group for an exam type, limited to exam types that exist in the CMS.
export function examGroupFor(examType, allExamTypes) {
  return (EXAM_GROUPS[examType] || [examType]).filter(name => allExamTypes.some(et => et.name === name))
}

// { examName: Set of studentIds with at least one mark } for the given class students, one request per exam.
export async function studentsWithMarks(api, className, examNames, studentIds, session) {
  const inClass = new Set(studentIds)
  const sessionQuery = session ? `&session=${encodeURIComponent(session)}` : ''
  const results = await Promise.all(examNames.map(name =>
    api.get(`/marks?class=${encodeURIComponent(className)}&examType=${encodeURIComponent(name)}${sessionQuery}`)
  ))
  const byExam = {}
  results.forEach((res, idx) => {
    byExam[examNames[idx]] = new Set((res.data || []).map(m => m?.studentId).filter(id => inClass.has(id)))
  })
  return byExam
}

// The final exam is always kept. Others are kept when named in `requested`, or, with no request,
// when at least one student in the class has marks for them.
export function includedExams(groupNames, requested, withMarks) {
  const finalExam = groupNames[groupNames.length - 1]
  return groupNames.filter(name =>
    name === finalExam || (requested ? requested.includes(name) : withMarks[name]?.size > 0)
  )
}
