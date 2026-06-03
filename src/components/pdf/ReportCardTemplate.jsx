import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import CM_LOGO from '../../assets/logo-cm-b64.js'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { borderBottom: '2px solid #083e78', paddingBottom: 12, marginBottom: 16, alignItems: 'center' },
  schoolName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#083e78', marginBottom: 4 },
  schoolSub: { fontSize: 10, color: '#64748b', marginBottom: 2 },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#ff914d', marginTop: 6 },
  studentSection: { flexDirection: 'row', gap: 16, marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 6 },
  studentCol: { flex: 1 },
  studentRow: { flexDirection: 'row', marginBottom: 5 },
  studentLabel: { width: 100, color: '#64748b', fontSize: 9 },
  studentValue: { fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', background: '#083e78', padding: '6 10', borderRadius: '4 4 0 0' },
  tableHeaderText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tableRow: { flexDirection: 'row', padding: '6 10', borderBottom: '0.5px solid #e2e8f0' },
  tableRowAlt: { flexDirection: 'row', padding: '6 10', borderBottom: '0.5px solid #e2e8f0', background: '#f8fafc' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'center' },
  col4: { flex: 1, textAlign: 'center' },
  col5: { flex: 1, textAlign: 'center' },
  summaryBox: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, alignItems: 'center' },
  summaryLabel: { fontSize: 8, color: '#64748b', marginBottom: 3 },
  summaryValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#083e78' },
  gradeValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ff914d' },
  sigSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0' },
  sigBox: { alignItems: 'center', width: 120 },
  sigLine: { borderBottom: '1px solid #1e293b', width: 100, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: '#64748b' },
  remarkBox: { border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, marginBottom: 16 },
  remarkLabel: { fontSize: 9, color: '#64748b', marginBottom: 4 },
  remarkText: { fontSize: 10, color: '#1e293b' },
})

const getGradeColor = (pct) => {
  if (pct >= 90) return '#00bf63'
  if (pct >= 75) return '#083e78'
  if (pct >= 50) return '#f59e0b'
  return '#e53e3e'
}

export default function ReportCardTemplate({ student, marks, examType, totalMarks, totalMax, percentage, grade }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
    <Image src={CM_LOGO} style={{ width: 60, height: 60 }} />
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.schoolName}>{schoolName || 'CM Public School'}</Text>
      <Text style={styles.schoolSub}>CBSE Affiliated · New Delhi, India</Text>
      <Text style={styles.paperTitle}>{examType} EXAMINATION — {subject?.toUpperCase()}</Text>
    </View>
  </View>
</View>

        <View style={styles.studentSection}>
          <View style={styles.studentCol}>
            <View style={styles.studentRow}>
              <Text style={styles.studentLabel}>Student Name:</Text>
              <Text style={styles.studentValue}>{student?.name}</Text>
            </View>
            <View style={styles.studentRow}>
              <Text style={styles.studentLabel}>Class:</Text>
              <Text style={styles.studentValue}>Class {student?.class} — Section {student?.section}</Text>
            </View>
            <View style={styles.studentRow}>
              <Text style={styles.studentLabel}>Roll No:</Text>
              <Text style={styles.studentValue}>{student?.rollNo}</Text>
            </View>
          </View>
          <View style={styles.studentCol}>
            <View style={styles.studentRow}>
              <Text style={styles.studentLabel}>Parent Name:</Text>
              <Text style={styles.studentValue}>{student?.parentName}</Text>
            </View>
            <View style={styles.studentRow}>
              <Text style={styles.studentLabel}>Academic Year:</Text>
              <Text style={styles.studentValue}>2025–26</Text>
            </View>
            <View style={styles.studentRow}>
              <Text style={styles.studentLabel}>School:</Text>
              <Text style={styles.studentValue}>CM Public School</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Marks</Text>
            <Text style={styles.summaryValue}>{totalMarks}/{totalMax}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Percentage</Text>
            <Text style={[styles.summaryValue, { color: getGradeColor(percentage) }]}>{percentage}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Grade</Text>
            <Text style={[styles.gradeValue, { color: getGradeColor(percentage) }]}>{grade}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Result</Text>
            <Text style={[styles.summaryValue, { color: percentage >= 33 ? '#00bf63' : '#e53e3e', fontSize: 12 }]}>
              {percentage >= 33 ? 'PASS' : 'FAIL'}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Subject</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Max Marks</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Marks Obtained</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Percentage</Text>
            <Text style={[styles.tableHeaderText, styles.col5]}>Grade</Text>
          </View>
          {marks.map((m, i) => {
            const pct = ((m.marks / m.maxMarks) * 100).toFixed(0)
            let g = 'F'
            if (pct >= 90) g = 'A+'
            else if (pct >= 80) g = 'A'
            else if (pct >= 70) g = 'B+'
            else if (pct >= 60) g = 'B'
            else if (pct >= 50) g = 'C'
            else if (pct >= 33) g = 'D'
            return (
              <View key={m.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{m.subject}</Text>
                <Text style={styles.col2}>{m.maxMarks}</Text>
                <Text style={styles.col3}>{m.marks}</Text>
                <Text style={[styles.col4, { color: getGradeColor(pct) }]}>{pct}%</Text>
                <Text style={[styles.col5, { color: getGradeColor(pct), fontFamily: 'Helvetica-Bold' }]}>{g}</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.remarkBox}>
          <Text style={styles.remarkLabel}>Class Teacher's Remarks:</Text>
          <Text style={styles.remarkText}>_____________________________________________</Text>
        </View>

        <View style={styles.sigSection}>
          <View style={styles.sigBox}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Class Teacher</Text>
          </View>
          <View style={styles.sigBox}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Parent / Guardian</Text>
          </View>
          <View style={styles.sigBox}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Principal</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
} 
