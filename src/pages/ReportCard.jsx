import { useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import ReportCardTemplate from '../components/pdf/ReportCardTemplate'

export default function ReportCard() {
  const [students, setStudents] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('CMP')
  const [examType, setExamType] = useState('Unit Test 1')
  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const classes = ['1','2','3','4','5','6','7','8','9','10','11','12']
  const examTypes = ['Unit Test 1','Unit Test 2','Mid Term','Pre Board','Final Exam']

  const generateReports = async () => {
    if (!selectedClass) return alert('Select a class first')
    setLoading(true)
    try {
      const studRes = await api.get(`/students?school=${selectedSchool}&class=${selectedClass}`)
      setStudents(studRes.data)
      const reportData = {}
      await Promise.all(
        studRes.data.map(async (s) => {
          const res = await api.get(`/marks/report/${s.id}?examType=${examType}`)
          reportData[s.id] = res.data
        })
      )
      setReports(reportData)
      setGenerated(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Report Card Generator</h1>
        <p className="text-gray-500 text-sm mt-1">Generate print-ready PDF report cards for any class</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select value={selectedSchool} onChange={e => { setSelectedSchool(e.target.value); setGenerated(false) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="CMP">CM Public School</option>
              <option value="TZP">Taare Zameen Par</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setGenerated(false) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <select value={examType} onChange={e => { setExamType(e.target.value); setGenerated(false) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {examTypes.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={generateReports}
          disabled={loading}
          style={{ background: '#083e78' }}
          className="text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Report Cards'}
        </button>
      </div>

      {generated && students.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div style={{ background: '#f0f4fa' }} className="px-5 py-3 flex items-center justify-between">
            <p style={{ color: '#083e78' }} className="font-semibold text-sm">
              {students.length} Report Cards — Class {selectedClass} · {examType}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Student</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Total</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Percentage</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Grade</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Result</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const report = reports[s.id]
                if (!report) return null
                return (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{report.totalMarks}/{report.totalMax}</td>
                    <td className="px-4 py-3 font-medium" style={{
                      color: report.percentage >= 75 ? '#00bf63' : report.percentage >= 50 ? '#f59e0b' : '#e53e3e'
                    }}>{report.percentage}%</td>
                    <td className="px-4 py-3 font-bold" style={{ color: '#083e78' }}>{report.grade}</td>
                    <td className="px-4 py-3">
                      <span style={{
                        background: report.percentage >= 33 ? '#e6f9f0' : '#ffeaea',
                        color: report.percentage >= 33 ? '#00bf63' : '#e53e3e'
                      }} className="px-2 py-1 rounded text-xs font-bold">
                        {report.percentage >= 33 ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {report.marks?.length > 0 ? (
                        <PDFDownloadLink
                          document={
                            <ReportCardTemplate
                              student={s}
                              marks={report.marks}
                              examType={examType}
                              totalMarks={report.totalMarks}
                              totalMax={report.totalMax}
                              percentage={report.percentage}
                              grade={report.grade}
                            />
                          }
                          fileName={`ReportCard_${s.name}_${examType}.pdf`}
                        >
                          {({ loading }) => (
                            <button style={{ background: '#083e78' }}
                              className="text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                              {loading ? 'Preparing...' : '⬇ Download PDF'}
                            </button>
                          )}
                        </PDFDownloadLink>
                      ) : (
                        <span className="text-gray-400 text-xs">No marks entered</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {generated && students.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No students found in Class {selectedClass}.
        </div>
      )}
    </Layout>
  )
} 
