// Printed words on a question paper that are not typed by the teacher, in English and Hindi.
// The paper's language decides which set prints; the questions themselves are printed as typed.

export const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
]

// Subjects whose papers default to Hindi.
const HINDI_SUBJECT = /(hindi|sanskrit|हिन्दी|हिंदी|संस्कृत)/i
export const defaultLangForSubject = (subject) => (HINDI_SUBJECT.test(subject || '') ? 'hi' : 'en')

const STRINGS = {
  en: {
    name: 'Name',
    rollNo: 'Roll No.',
    studentSection: 'Section',
    class: 'Class',
    subject: 'Subject',
    date: 'Date',
    time: 'Time',
    maxMarks: 'Maximum Marks',
    instructions: 'Instructions',
    instructionLines: [
      'All questions are compulsory.',
      'Marks for each question are given in brackets [ ] on the right.',
      'Write neatly. Answer in the space given below each question.',
    ],
    section: (letter) => `Section ${letter}`,
    sectionNote: 'Attempt all questions in this section.',
    marks: (n) => `${n} ${Number(n) === 1 ? 'mark' : 'marks'}`,
    trueLabel: 'True',
    falseLabel: 'False',
    columnA: 'Column A',
    columnB: 'Column B',
    endOfPaper: '— END OF PAPER —',
    allTheBest: 'All the best!',
    answerKey: 'ANSWER KEY',
    answer: 'Answer',
  },
  hi: {
    name: 'नाम',
    rollNo: 'अनुक्रमांक',
    studentSection: 'वर्ग',
    class: 'कक्षा',
    subject: 'विषय',
    date: 'दिनांक',
    time: 'समय',
    maxMarks: 'पूर्णांक',
    instructions: 'निर्देश',
    instructionLines: [
      'सभी प्रश्न अनिवार्य हैं।',
      'प्रत्येक प्रश्न के अंक उसके सामने कोष्ठक [ ] में दिए गए हैं।',
      'उत्तर साफ़ और सुंदर अक्षरों में, दिए गए स्थान पर लिखिए।',
    ],
    section: (letter) => `खण्ड '${letter}'`,
    sectionNote: 'इस खण्ड के सभी प्रश्न हल कीजिए।',
    marks: (n) => `${n} अंक`,
    trueLabel: 'सही',
    falseLabel: 'गलत',
    columnA: "स्तम्भ 'क'",
    columnB: "स्तम्भ 'ख'",
    endOfPaper: '— समाप्त —',
    allTheBest: 'शुभकामनाएँ!',
    answerKey: 'उत्तर कुंजी',
    answer: 'उत्तर',
  },
}

export const t = (lang) => STRINGS[lang] || STRINGS.en

// Letters used for options, match items and "(a) (b) (c)" part labels.
const HINDI_LETTERS = ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ']
export const letterFor = (i, lang) => (lang === 'hi' ? HINDI_LETTERS[i] || String(i + 1) : String.fromCharCode(97 + i))

// Section letter: A B C in English, क ख ग in Hindi.
export const sectionLetter = (name, index, lang) => (lang === 'hi' ? HINDI_LETTERS[index] || name : name)

// Common exam names in Hindi. Anything not listed prints as it is named in Exam Types.
const EXAM_NAMES_HI = [
  [/half\s*-?\s*yearly/i, 'अर्धवार्षिक परीक्षा'],
  [/annual|final/i, 'वार्षिक परीक्षा'],
  [/quarterly/i, 'त्रैमासिक परीक्षा'],
  [/unit\s*test\s*(\d+)?/i, (m) => `इकाई परीक्षा${m[1] ? ` ${m[1]}` : ''}`],
  [/periodic\s*test\s*(\d+)?/i, (m) => `आवधिक परीक्षा${m[1] ? ` ${m[1]}` : ''}`],
  [/class\s*test/i, 'कक्षा परीक्षा'],
  [/monthly\s*test/i, 'मासिक परीक्षा'],
]

export const examTitleFor = (examType, lang) => {
  if (lang !== 'hi' || !examType) return examType || ''
  for (const [re, out] of EXAM_NAMES_HI) {
    const m = examType.match(re)
    if (m) return typeof out === 'function' ? out(m) : out
  }
  return examType
}

// Place-value headings over the columns of a sum, from the left: thousands, hundreds, tens, ones.
export const placeHeadings = (lang) => (lang === 'hi' ? ['ह', 'स', 'द', 'इ'] : ['Th', 'H', 'T', 'O'])
