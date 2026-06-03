import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import CM_LOGO from '../../assets/logo-cm-b64.js'

const styles = StyleSheet.create({
  page: { padding: '40 50', fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { borderBottom: '2px solid #083e78', paddingBottom: 12, marginBottom: 16, alignItems: 'center' },
  schoolName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#083e78', marginBottom: 3 },
  schoolSub: { fontSize: 9, color: '#64748b', marginBottom: 2 },
  paperTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, padding: '8 12', border: '1px solid #e2e8f0', borderRadius: 4 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 8, color: '#64748b', marginBottom: 2 },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  instructions: { marginBottom: 16, padding: '8 12', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' },
  instructionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#083e78' },
  instructionText: { fontSize: 8.5, color: '#475569', lineHeight: 1.5 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#083e78', marginBottom: 10, marginTop: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 },
  question: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  questionNum: { width: 28, fontFamily: 'Helvetica-Bold', color: '#083e78', flexShrink: 0 },
  questionText: { flex: 1, lineHeight: 1.6 },
  questionMarks: { width: 30, textAlign: 'right', color: '#64748b', fontSize: 9 },
  answerLine: { borderBottom: '0.5px solid #cbd5e1', marginTop: 6, marginBottom: 2 },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', borderTop: '0.5px solid #e2e8f0', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#94a3b8' },
})

export default function QuestionPaperTemplate({ paperData }) {
  const { schoolName, subject, className, examType, date, time, maxMarks, sections } = paperData

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Image src={CM_LOGO} style={{ width: 70, height: 70, marginRight: 10 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.schoolName}>{schoolName || 'CM Public School'}</Text>
              <Text style={styles.schoolSub}>CBSE Affiliated · New Delhi, India</Text>
              <Text style={styles.schoolSub}>Tel: +91 98765 43210 · info@cmtzpschool.in</Text>
              <Text style={styles.paperTitle}>{examType}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Class</Text>
            <Text style={styles.metaValue}>{className}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Subject</Text>
            <Text style={styles.metaValue}>{subject}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Time Allowed</Text>
            <Text style={styles.metaValue}>{time}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Maximum Marks</Text>
            <Text style={styles.metaValue}>{maxMarks}</Text>
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>General Instructions:</Text>
          <Text style={styles.instructionText}>
            1. All questions are compulsory.{'\n'}
            2. Read all questions carefully before answering.{'\n'}
            3. Write answers neatly and legibly.{'\n'}
            4. Marks for each question are indicated in brackets.
          </Text>
        </View>

        {sections?.map((section, si) => (
          <View key={si}>
            <Text style={styles.sectionTitle}>
              Section {String.fromCharCode(65 + si)}: {section.title} ({section.marksPerQ} marks each)
            </Text>
            {section.questions.map((q, qi) => (
              <View key={qi} style={styles.question}>
                <Text style={styles.questionNum}>Q{qi + 1}.</Text>
                <Text style={styles.questionText}>{q}</Text>
                <Text style={styles.questionMarks}>[{section.marksPerQ}]</Text>
              </View>
              ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>CM Public School — {subject} · {examType}</Text>
          <Text style={styles.footerText}>Roll No: ____________</Text>
        </View>
      </Page>
    </Document>
  )
}