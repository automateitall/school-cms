import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { getCachedClasses } from '../lib/cache'
import PaperList from '../components/questionPaper/PaperList'
import PaperBuilder from '../components/questionPaper/PaperBuilder'

// Question papers: the "All papers" screen, and the builder for one paper.
export default function QuestionPaper() {
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [selectedClass, setSelectedClass] = useState(() => sessionStorage.getItem('qp.class') || '')
  const [selectedExamType, setSelectedExamType] = useState(() => sessionStorage.getItem('qp.exam') || '')
  const [editing, setEditing] = useState(null) // { subject, paper, copyFrom, openImport }

  useEffect(() => {
    Promise.all([getCachedClasses(api), api.get('/examtypes').then(r => r.data)])
      .then(([classesData, examTypesData]) => {
        setClasses(classesData)
        setExamTypes(examTypesData)
      }).catch(console.error)
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem('qp.class', selectedClass)
      sessionStorage.setItem('qp.exam', selectedExamType)
    } catch { /* storage unavailable: the choice is just not remembered */ }
  }, [selectedClass, selectedExamType])

  const exam = examTypes.find(e => e.name === selectedExamType)

  return (
    <Layout>
      {editing ? (
        <PaperBuilder
          key={`${editing.subject}-${editing.paper?.id || 'new'}`}
          info={{
            className: selectedClass, examType: selectedExamType, maxMarks: exam?.maxMarks || 0,
            subject: editing.subject, paper: editing.paper, copyFrom: editing.copyFrom, openImport: editing.openImport,
            subjects: editing.subjects,
          }}
          onBack={() => setEditing(null)} />
      ) : (
        <PaperList
          classes={classes} examTypes={examTypes}
          selectedClass={selectedClass} setSelectedClass={setSelectedClass}
          selectedExamType={selectedExamType} setSelectedExamType={setSelectedExamType}
          onOpen={(subject, paper, extra = {}) => setEditing({ subject, paper, ...extra })} />
      )}
    </Layout>
  )
}
