export const QUESTION_TYPES = [
  { value: 'LIKERT',        label: 'Likert Scale',    desc: '1–5  Strongly Disagree → Strongly Agree', icon: '⭐' },
  { value: 'SHORT_TEXT',    label: 'Short Answer',    desc: 'Single-line text input',                   icon: 'T'  },
  { value: 'LONG_TEXT',     label: 'Paragraph',       desc: 'Multi-line text response',                 icon: '¶'  },
  { value: 'SINGLE_CHOICE', label: 'Multiple Choice', desc: 'Pick one option',                          icon: '◉'  },
  { value: 'MULTI_CHOICE',  label: 'Checkboxes',      desc: 'Pick multiple options',                    icon: '☑'  },
  { value: 'DROPDOWN',      label: 'Dropdown',        desc: 'Choose from a list',                       icon: '▾'  },
  { value: 'RATING_SCALE',  label: 'Linear Scale',    desc: 'Numeric scale with custom range',          icon: '―'  },
  { value: 'MATRIX',        label: 'Grid',            desc: 'Row × column rating table',                icon: '⊞'  },
  { value: 'DATE',          label: 'Date',            desc: 'Calendar date picker',                     icon: '📅' },
  { value: 'TIME',          label: 'Time',            desc: 'Time picker',                              icon: '⏱' },
  { value: 'FILE',          label: 'File Upload',     desc: 'Upload a document or image',               icon: '📎' },
]

export const CHOICE_TYPES = ['SINGLE_CHOICE', 'MULTI_CHOICE', 'DROPDOWN']

export function typeInfo(value) {
  return QUESTION_TYPES.find(t => t.value === value) || { label: value, icon: '?' }
}

// ── CSV helpers ────────────────────────────────────────────

function parseCSVLine(line) {
  const result = []
  let inQuotes = false
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map(s => s.trim())
}

export function parseCSVOptions(type, optStr) {
  if (!optStr) return null
  switch (type) {
    case 'SINGLE_CHOICE':
    case 'MULTI_CHOICE':
    case 'DROPDOWN': {
      const choices = optStr.split('|').map(s => s.trim()).filter(Boolean)
      return choices.length ? { choices } : null
    }
    case 'RATING_SCALE': {
      const [minS, maxS, minL = '', maxL = ''] = optStr.split('|').map(s => s.trim())
      return { min: parseInt(minS) || 1, max: parseInt(maxS) || 10, min_label: minL, max_label: maxL }
    }
    case 'MATRIX': {
      const semi = optStr.indexOf(';')
      if (semi === -1) return null
      const rows = optStr.slice(0, semi).replace(/^rows=/i, '').split(',').map(s => s.trim()).filter(Boolean)
      const cols = optStr.slice(semi + 1).replace(/^cols=/i, '').split(',').map(s => s.trim()).filter(Boolean)
      return { rows, cols }
    }
    default:
      return null
  }
}

export function parseQuestionsCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { questions: [], errors: ['CSV must have a header row and at least one data row.'] }

  const errors = []
  const questions = []

  lines.slice(1).forEach((line, i) => {
    const cols = parseCSVLine(line)
    const [rawType = '', rawText = '', hint = '', dimension = '', optStr = ''] = cols
    const type = rawType.toUpperCase().trim()

    if (!type) { errors.push(`Row ${i + 2}: missing type`); return }
    if (!rawText.trim()) { errors.push(`Row ${i + 2}: missing question text`); return }
    if (!QUESTION_TYPES.find(t => t.value === type)) {
      errors.push(`Row ${i + 2}: unknown type "${type}"`); return
    }

    questions.push({
      question_type: type,
      text: rawText.trim(),
      hint: hint.trim() || null,
      dimension: dimension.trim() || null,
      options: parseCSVOptions(type, optStr.trim()) || null,
    })
  })

  return { questions, errors }
}

export const CSV_TEMPLATE = `type,text,hint,dimension,options
LIKERT,"How do you feel about the organisation's leadership?","Think about your direct manager","Leadership",
SHORT_TEXT,"What is your name?",,,
LONG_TEXT,"Describe your biggest challenge at work.","Be as specific as possible",,
SINGLE_CHOICE,"What is your department?",,"","HR|Finance|Operations|IT|Other"
MULTI_CHOICE,"Which benefits do you use?",,"","Medical Aid|Pension|Leave Days|Training Budget"
DROPDOWN,"Years at DBN?",,"","0-1 years|1-3 years|3-5 years|5-10 years|10+ years"
RATING_SCALE,"How likely are you to recommend DBN as a workplace?",,"","1|10|Not likely|Highly likely"
MATRIX,"Rate the following areas","","","rows=Leadership,Culture,Innovation;cols=Poor,Average,Good,Excellent"
DATE,"When did you join DBN?",,,
TIME,"At what time do you usually start work?",,,
FILE,"Please upload your signed consent form.",,,
`
