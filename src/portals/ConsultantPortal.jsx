import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  ALL_ORGANISATIONS,
  useOrganisationScope,
} from '../context/OrganisationScopeContext'
import { useAdminData } from '../hooks/useAdminData'
import { useSurvey } from '../hooks/useSurvey'
import { QUESTION_TYPES, CHOICE_TYPES, typeInfo, parseQuestionsCSV, CSV_TEMPLATE } from '../data/surveyTypes'
import { getEffectiveSurveyStatus } from '../features/survey/utils/surveyStatus'
import ConsultantSidebar from '../features/navigation/components/ConsultantSidebar'
import OrganisationsPage from '../features/organisations/pages/OrganisationsPage'
import SurveyManagementPage from '../features/survey/pages/SurveyManagementPage'
import SurveyTemplatesPage from '../features/survey-templates/pages/SurveyTemplatesPage'
import SurveyUsersTable, { sortSurveyUsers } from '../features/survey/components/SurveyUsersTable'
import UsersPage from '../features/users/pages/UsersPage'
import PercentageBar from '../features/analytics/components/PercentageBar'
import ScoreBar from '../features/analytics/components/ScoreBar'
import AnalysisScopeFilter from '../features/analytics/components/AnalysisScopeFilter'
import SubmissionQualitySummary from '../features/analytics/components/SubmissionQualitySummary'
import { calculateLikertMetrics } from '../features/analytics/utils/likertScore'
import {
  calculateSubmissionQuality,
  submissionQualityLabel,
} from '../features/analytics/utils/submissionQuality'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import './consultant.css'

// ── Helpers ────────────────────────────────────────────────

function FluidSVG({ size = 38, id = 'cf' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={`${id}-a`} cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#C9E8A0" /><stop offset="40%" stopColor="#5BBFB0" /><stop offset="100%" stopColor="#1A6BAA" />
        </radialGradient>
        <radialGradient id={`${id}-b`} cx="70%" cy="65%" r="65%">
          <stop offset="0%" stopColor="#E8D890" /><stop offset="40%" stopColor="#5AB0D0" /><stop offset="100%" stopColor="#1BBFB0" />
        </radialGradient>
      </defs>
      <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.92" />
      <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.75" />
      <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.88" />
      <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.72" />
      <circle cx="50" cy="50" r="7" fill="white" opacity="0.36" />
    </svg>
  )
}

function calcTiming(submittedAt, liveStart, liveEnd) {
  if (!submittedAt) return null
  const sub = new Date(submittedAt).getTime()
  if (liveEnd && sub > new Date(liveEnd).getTime()) return 'late'
  if (liveStart && liveEnd) {
    const mid = new Date(liveStart).getTime() + (new Date(liveEnd).getTime() - new Date(liveStart).getTime()) / 2
    return sub < mid ? 'early' : 'on_time'
  }
  return 'on_time'
}

function surveyUrl(token) { return `${window.location.origin}/assess/${token}` }

function scoreColor(s) {
  if (s == null) return 'var(--text3)'
  if (s >= 70) return '#0A8A7E'
  if (s >= 50) return '#7A6030'
  return '#9A3825'
}

const ANALYSIS_GROUP_FIELDS = [
  { key: 'department', label: 'Department' },
  { key: 'branch', label: 'Team / Branch' },
  { key: 'position', label: 'Grade / Employment Level' },
  { key: 'location_site', label: 'Location / Site' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'tenure', label: 'Tenure' },
]

// ── Export helpers (CSV / Excel / PDF) ─────────────────────

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function cellToString(v) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join('; ')
  if (typeof v === 'object') return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join('; ')
  return String(v)
}

function rowsToCSV(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const esc = (v) => { const s = cellToString(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return [headers.map(esc).join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\r\n')
}

async function downloadWorkbook(sheets, filename) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  sheets.forEach(({ name, rows }) => {
    const ws = wb.addWorksheet(name.slice(0, 31))
    if (!rows.length) {
      ws.addRow(['No data available'])
      return
    }

    const headers = Object.keys(rows[0])
    ws.columns = headers.map(header => ({
      header,
      key: header,
      width: Math.min(
        Math.max(
          header.length + 2,
          ...rows.map(row => cellToString(row[header]).length + 2),
          12,
        ),
        60,
      ),
    }))
    rows.forEach(row => ws.addRow(headers.reduce((output, header) => {
      output[header] = cellToString(row[header])
      return output
    }, {})))

    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3560' } }
    headerRow.alignment = { vertical: 'middle' }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = { from: 'A1', to: `${ws.getColumn(headers.length).letter}1` }
  })

  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(filename, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

// Real .xlsx via ExcelJS (so Excel doesn't warn about format/extension mismatch).
async function downloadXLSX(rows, filename) {
  await downloadWorkbook([{ name: 'Export', rows }], filename)
}

// Builds a real (text/vector) PDF using jsPDF + autotable — selectable text,
// not an image snapshot. `buildPdf(doc, autoTable)` draws the content.
async function exportToPDF(buildPdf, filename, orientation = 'portrait') {
  const { default: jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF(orientation === 'landscape' ? 'l' : 'p', 'mm', 'a4')
  buildPdf(doc, autoTable)
  doc.save(filename)
}

function ExportMenu({ filename = 'export', getRows, buildPdf, pdfOrientation = 'portrait', exportExcel, options }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const date = new Date().toISOString().slice(0, 10)

  async function run(kind) {
    setOpen(false)
    try {
      setBusy(true)
      if (kind === 'pdf') {
        if (!buildPdf) { alert('Nothing to export yet.'); return }
        await exportToPDF(buildPdf, `${filename}-${date}.pdf`, pdfOrientation)
        return
      }
      if (kind === 'excel' && exportExcel) {
        await exportExcel(`${filename}-${date}.xlsx`)
        return
      }
      const rows = getRows ? getRows() : []
      if (!rows.length) { alert('Nothing to export yet.'); return }
      if (kind === 'csv')   downloadBlob(`${filename}-${date}.csv`, '﻿' + rowsToCSV(rows), 'text/csv;charset=utf-8;')
      if (kind === 'excel') await downloadXLSX(rows, `${filename}-${date}.xlsx`)
    } catch (e) {
      console.error('Export error:', e); alert('Export failed: ' + (e.message || e))
    } finally { setBusy(false) }
  }

  async function runCustom(option) {
    setOpen(false)
    try {
      setBusy(true)
      await option.action(`${filename}-${date}`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed: ' + (error.message || error))
    } finally {
      setBusy(false)
    }
  }

  const defaultOptions = [
    { k: 'excel', label: 'Excel (.xlsx)' },
    { k: 'csv', label: 'CSV (.csv)' },
    { k: 'pdf', label: 'PDF (.pdf)' },
  ]

  return (
    <div ref={ref} className="export-toolbar" style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn btn-outline btn-sm" onClick={() => setOpen(o => !o)} disabled={busy}>
        {busy ? 'Exporting…' : '⤓ Export ▾'}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', zIndex: 50, minWidth: options ? 230 : 150, overflow: 'hidden' }}>
          {(options || defaultOptions).map((option, index, menuOptions) => (
            <div key={option.k}>
              {options && (index === 0 || option.group !== menuOptions[index - 1].group) && (
                <div style={{ padding: '8px 14px 4px', borderTop: index === 0 ? 'none' : '1px solid var(--border)', color: 'var(--text3)', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {option.group}
                </div>
              )}
              <button onClick={() => options ? runCustom(option) : run(option.k)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: options ? '7px 14px 9px' : '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--navy)', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {option.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Option sub-editors ─────────────────────────────────────

function ChoicesEditor({ choices, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">Options</label>
      {choices.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input
            className="form-input"
            type="text"
            placeholder={`Option ${i + 1}`}
            value={c}
            onChange={e => onChange(choices.map((x, j) => j === i ? e.target.value : x))}
            style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
          />
          <button
            onClick={() => onChange(choices.filter((_, j) => j !== i))}
            disabled={choices.length <= 2}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '0 10px', cursor: choices.length <= 2 ? 'not-allowed' : 'pointer', color: 'var(--coral)', opacity: choices.length <= 2 ? 0.3 : 1 }}
          >×</button>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => onChange([...choices, ''])}>
        + Add Option
      </button>
    </div>
  )
}

function RatingEditor({ config, onChange }) {
  const set = (k, v) => onChange({ ...config, [k]: v })
  return (
    <div className="form-group">
      <label className="form-label">Scale Configuration</label>
      <div className="form-row" style={{ marginBottom: 8 }}>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Min Value</label>
          <input className="form-input" type="number" value={config.min} onChange={e => set('min', e.target.value)} style={{ padding: '8px 12px' }} />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Max Value</label>
          <input className="form-input" type="number" value={config.max} onChange={e => set('max', e.target.value)} style={{ padding: '8px 12px' }} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Min Label <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
          <input className="form-input" type="text" placeholder="e.g. Not at all" value={config.min_label} onChange={e => set('min_label', e.target.value)} style={{ padding: '8px 12px' }} />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>Max Label <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
          <input className="form-input" type="text" placeholder="e.g. Extremely" value={config.max_label} onChange={e => set('max_label', e.target.value)} style={{ padding: '8px 12px' }} />
        </div>
      </div>
      <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--text3)' }}>
        Preview: {config.min_label && <strong style={{ color: 'var(--text2)' }}>{config.min_label} </strong>}
        {Array.from({ length: Math.min(Number(config.max) - Number(config.min) + 1, 10) }, (_, i) => (
          <span key={i} style={{ display: 'inline-block', width: 28, height: 28, lineHeight: '28px', textAlign: 'center', margin: '0 2px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, color: 'var(--navy)' }}>{Number(config.min) + i}</span>
        ))}
        {Number(config.max) - Number(config.min) >= 10 && <span>…{config.max}</span>}
        {config.max_label && <strong style={{ color: 'var(--text2)' }}> {config.max_label}</strong>}
      </div>
    </div>
  )
}

function MatrixEditor({ rows, cols, onChangeRows, onChangeCols }) {
  return (
    <div className="form-row" style={{ alignItems: 'flex-start' }}>
      <div className="form-group">
        <label className="form-label">Row Labels</label>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input className="form-input" type="text" placeholder={`Row ${i + 1}`} value={r} onChange={e => onChangeRows(rows.map((x, j) => j === i ? e.target.value : x))} style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
            <button onClick={() => onChangeRows(rows.filter((_, j) => j !== i))} disabled={rows.length <= 1} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '0 10px', cursor: rows.length <= 1 ? 'not-allowed' : 'pointer', color: 'var(--coral)', opacity: rows.length <= 1 ? 0.3 : 1 }}>×</button>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => onChangeRows([...rows, ''])}>+ Row</button>
      </div>
      <div className="form-group">
        <label className="form-label">Column Labels</label>
        {cols.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input className="form-input" type="text" placeholder={`Col ${i + 1}`} value={c} onChange={e => onChangeCols(cols.map((x, j) => j === i ? e.target.value : x))} style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
            <button onClick={() => onChangeCols(cols.filter((_, j) => j !== i))} disabled={cols.length <= 2} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '0 10px', cursor: cols.length <= 2 ? 'not-allowed' : 'pointer', color: 'var(--coral)', opacity: cols.length <= 2 ? 0.3 : 1 }}>×</button>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => onChangeCols([...cols, ''])}>+ Column</button>
      </div>
    </div>
  )
}

// ── Question Form ──────────────────────────────────────────

function QuestionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    text:          initial?.text          || '',
    hint:          initial?.hint          || '',
    question_type: initial?.question_type || 'LIKERT',
    dimension:     initial?.dimension     || '',
  })
  const [choices,     setChoices]     = useState(initial?.options?.choices      || ['', ''])
  const [rating,      setRating]      = useState({ min: initial?.options?.min ?? 1, max: initial?.options?.max ?? 10, min_label: initial?.options?.min_label || '', max_label: initial?.options?.max_label || '' })
  const [matrixRows,  setMatrixRows]  = useState(initial?.options?.rows         || ['', ''])
  const [matrixCols,  setMatrixCols]  = useState(initial?.options?.cols         || ['', '', ''])

  const type = form.question_type
  const valid = form.text.trim().length > 0

  function buildOptions() {
    if (CHOICE_TYPES.includes(type)) {
      const filtered = choices.filter(c => c.trim())
      return filtered.length ? { choices: filtered } : null
    }
    if (type === 'RATING_SCALE') return { min: Number(rating.min), max: Number(rating.max), min_label: rating.min_label, max_label: rating.max_label }
    if (type === 'MATRIX') return { rows: matrixRows.filter(r => r.trim()), cols: matrixCols.filter(c => c.trim()) }
    return null
  }

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
      {/* Question text */}
      <div className="form-group">
        <label className="form-label">Question Text *</label>
        <textarea
          className="form-input"
          style={{ height: 72, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="e.g. I feel proud to work for this organisation."
          value={form.text}
          onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
        />
      </div>

      {/* Type + dimension */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Question Type</label>
          <select
            className="form-input"
            value={type}
            onChange={e => setForm(p => ({ ...p, question_type: e.target.value }))}
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon}  {t.label} — {t.desc}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Dimension / Theme <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Leadership, Culture…"
            value={form.dimension}
            onChange={e => setForm(p => ({ ...p, dimension: e.target.value }))}
          />
        </div>
      </div>

      {/* Hint */}
      <div className="form-group">
        <label className="form-label">Hint / Sub-text <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
        <input
          className="form-input"
          type="text"
          placeholder="Shown below the question to guide respondents…"
          value={form.hint}
          onChange={e => setForm(p => ({ ...p, hint: e.target.value }))}
        />
      </div>

      {/* Conditional options UI */}
      {CHOICE_TYPES.includes(type) && (
        <ChoicesEditor choices={choices} onChange={setChoices} />
      )}
      {type === 'RATING_SCALE' && (
        <RatingEditor config={rating} onChange={setRating} />
      )}
      {type === 'MATRIX' && (
        <MatrixEditor rows={matrixRows} cols={matrixCols} onChangeRows={setMatrixRows} onChangeCols={setMatrixCols} />
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-teal btn-sm" onClick={() => onSave({ ...form, options: buildOptions() })} disabled={!valid}>
          {initial ? 'Update Question' : 'Add Question'} →
        </button>
      </div>
    </div>
  )
}

// ── CSV Import Modal ───────────────────────────────────────

function CSVImportModal({ onImport, onClose }) {
  const [csvText, setCsvText]   = useState('')
  const [preview, setPreview]   = useState(null)
  const [errors, setErrors]     = useState([])
  const fileRef = useRef(null)

  function handleParse() {
    const { questions, errors: errs } = parseQuestionsCSV(csvText)
    setErrors(errs)
    setPreview(questions)
  }

  function handleFileRead(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setCsvText(ev.target.result); setPreview(null); setErrors([]) }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'survey_questions_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 640, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Import Questions from CSV</div>
        <div className="modal-sub">Upload or paste a CSV file. Each row becomes one question.</div>

        {/* Template download + column guide */}
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>CSV Column Format</span>
            <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>⬇ Download Template</button>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--teal)', fontWeight: 700 }}>type</span>
            <span style={{ color: 'var(--text3)' }}>, </span>
            <span style={{ color: 'var(--navy)', fontWeight: 700 }}>text</span>
            <span style={{ color: 'var(--text3)' }}>, hint, dimension, options</span>
            <br />
            {[
              { t: 'SINGLE_CHOICE / MULTI_CHOICE / DROPDOWN', o: 'Choice A|Choice B|Choice C' },
              { t: 'RATING_SCALE', o: 'min|max|min_label|max_label   e.g. 1|10|Not likely|Highly likely' },
              { t: 'MATRIX', o: 'rows=R1,R2;cols=C1,C2,C3' },
              { t: 'LIKERT / SHORT_TEXT / LONG_TEXT / DATE / TIME / FILE', o: '(no options needed)' },
            ].map(({ t, o }) => (
              <div key={t}>
                <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{t}</span>
                <span style={{ color: 'var(--text3)' }}>  →  {o}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File input */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileRead} />
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>📂 Upload CSV File</button>
          <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>or paste below</span>
        </div>

        <div className="form-group">
          <textarea
            className="form-input"
            style={{ height: 160, fontFamily: 'monospace', fontSize: 12.5, resize: 'vertical' }}
            placeholder={`type,text,hint,dimension,options\nLIKERT,"How do you rate leadership?","Consider your manager","Leadership",\nSINGLE_CHOICE,"What is your department?",,,HR|Finance|IT`}
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setPreview(null); setErrors([]) }}
          />
        </div>

        {errors.length > 0 && (
          <div className="insight alert mb-16">
            <div className="insight-title">⚠ Parse errors</div>
            {errors.map((e, i) => <div key={i} className="insight-text">{e}</div>)}
          </div>
        )}

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
              Preview — {preview.length} question{preview.length !== 1 ? 's' : ''} to import
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {preview.map((q, i) => {
                const info = typeInfo(q.question_type)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{info.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.45 }}>{q.text}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>
                        {info.label}{q.dimension ? ` · ${q.dimension}` : ''}
                        {q.options?.choices ? ` · ${q.options.choices.length} options` : ''}
                        {q.options?.rows ? ` · ${q.options.rows.length} rows × ${q.options.cols?.length || 0} cols` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          {!preview && (
            <button className="btn btn-outline" onClick={handleParse} disabled={!csvText.trim()}>Parse →</button>
          )}
          {preview && preview.length > 0 && (
            <button className="btn btn-teal" onClick={() => onImport(preview)}>
              Import {preview.length} Question{preview.length !== 1 ? 's' : ''} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Analytics: per-question card ───────────────────────────

function QuestionAnalyticsCard({ q, responses }) {
  const rawAnswers = responses.map(r => r.answers?.[q.id]).filter(v => v != null)
  const type = q.question_type

  function scoreColor(s) {
    if (s == null) return 'var(--text3)'
    if (s >= 70) return '#0A8A7E'
    if (s >= 50) return '#7A6030'
    return '#9A3825'
  }

  const cardStyle = { marginBottom: 16, padding: '20px 24px', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }

  function Header() {
    const info = typeInfo(type)
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>{info.icon}</span>
          <span className="badge badge-slate" style={{ fontSize: 10.5 }}>{info.label}</span>
          {q.dimension && <span className="badge badge-teal" style={{ fontSize: 10.5 }}>{q.dimension}</span>}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.5 }}>Q{q.order_num + 1}. {q.text}</div>
        {q.hint && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{q.hint}</div>}
      </div>
    )
  }

  if (rawAnswers.length === 0) {
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>No responses yet.</div>
      </div>
    )
  }

  // TEXT types
  if (['SHORT_TEXT', 'LONG_TEXT', 'text'].includes(type)) {
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rawAnswers.map((t, i) => (
            <div key={i} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>"{t}"</div>
          ))}
        </div>
      </div>
    )
  }

  // DATE / TIME
  if (['DATE', 'TIME'].includes(type)) {
    const counts = rawAnswers.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc }, {})
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map(([val, count]) => (
            <div key={val} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg)', borderRadius: 7, fontSize: 13 }}>
              <span style={{ color: 'var(--navy)' }}>{val}</span>
              <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // FILE
  if (type === 'FILE') {
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rawAnswers.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontSize: 13, wordBreak: 'break-all', display: 'block', padding: '6px 10px', background: 'var(--bg)', borderRadius: 7 }}>
              📎 {typeof url === 'string' ? url.split('/').pop() : `File ${i + 1}`}
            </a>
          ))}
        </div>
      </div>
    )
  }

  // SINGLE_CHOICE / DROPDOWN
  if (['SINGLE_CHOICE', 'DROPDOWN'].includes(type)) {
    const choices = q.options?.choices || [...new Set(rawAnswers)]
    const maxCount = Math.max(...choices.map(c => rawAnswers.filter(a => a === c).length), 1)
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {choices.map(c => {
            const count = rawAnswers.filter(a => a === c).length
            const pct = Math.round((count / rawAnswers.length) * 100)
            return (
              <div key={c}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--navy)' }}>{c}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text2)' }}>{count} <span style={{ fontWeight: 400, color: 'var(--text3)' }}>({pct}%)</span></span>
                </div>
                <PercentageBar value={(count / maxCount) * 100} height={8} label={`${c} response distribution`} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // MULTI_CHOICE
  if (type === 'MULTI_CHOICE') {
    const choices = q.options?.choices || [...new Set(rawAnswers.flat())]
    const totalResponded = rawAnswers.length
    const maxCount = Math.max(...choices.map(c => rawAnswers.filter(a => Array.isArray(a) && a.includes(c)).length), 1)
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {choices.map(c => {
            const count = rawAnswers.filter(a => Array.isArray(a) && a.includes(c)).length
            const pct = Math.round((count / totalResponded) * 100)
            return (
              <div key={c}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--navy)' }}>{c}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text2)' }}>{count} <span style={{ fontWeight: 400, color: 'var(--text3)' }}>({pct}%)</span></span>
                </div>
                <PercentageBar value={(count / maxCount) * 100} height={8} fill="linear-gradient(90deg,#3A8FC4,#5AADD4)" label={`${c} response distribution`} />
              </div>
            )
          })}
          <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 4 }}>% of respondents who selected each option</div>
        </div>
      </div>
    )
  }

  // RATING_SCALE
  if (type === 'RATING_SCALE') {
    const { min = 1, max = 10, min_label = '', max_label = '' } = q.options || {}
    const nums = rawAnswers.map(Number).filter(n => !isNaN(n))
    const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
    const scale = Array.from({ length: Number(max) - Number(min) + 1 }, (_, i) => Number(min) + i)
    const dist = scale.map(v => nums.filter(n => n === v).length)
    const maxDist = Math.max(...dist, 1)
    const barColors = ['#E8563A', '#C9B882', '#8A9BB0', '#3A8FC4', '#1BBFB0']
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#1BBFB0', lineHeight: 1 }}>{avg?.toFixed(1) ?? '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>avg out of {max}</div>
          </div>
          <div style={{ flex: 1 }}>
            {min_label && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{min_label} → {max_label}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 64 }}>
          {dist.map((count, i) => {
            const v = Number(min) + i
            const color = barColors[Math.floor((i / scale.length) * barColors.length)] || barColors[4]
            return (
              <div key={v} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: count > 0 ? 'var(--text2)' : 'transparent' }}>{count}</div>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: Math.max(4, (count / maxDist) * 48), background: color }} />
                <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center' }}>{v}</div>
              </div>
            )
          })}
        </div>
        {(min_label || max_label) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
            <span>{min_label}</span><span>{max_label}</span>
          </div>
        )}
      </div>
    )
  }

  // MATRIX
  if (type === 'MATRIX') {
    const { rows = [], cols = [] } = q.options || {}
    return (
      <div style={cardStyle}>
        <Header />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', minWidth: 120 }}>Row</th>
                {cols.map(c => (
                  <th key={c} style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
                <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--teal)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Most Chosen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const rowAnswers = rawAnswers.map(a => a?.[row]).filter(Boolean)
                const colCounts = cols.map(c => rowAnswers.filter(v => v === c).length)
                const maxIdx = colCounts.indexOf(Math.max(...colCounts))
                return (
                  <tr key={row}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--navy)', borderBottom: ri < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>{row}</td>
                    {colCounts.map((count, ci) => (
                      <td key={ci} style={{ textAlign: 'center', padding: '8px 10px', borderBottom: ri < rows.length - 1 ? '1px solid var(--border)' : 'none', fontWeight: ci === maxIdx && count > 0 ? 700 : 400, color: ci === maxIdx && count > 0 ? '#0A8A7E' : 'var(--text2)', background: ci === maxIdx && count > 0 ? 'var(--teal-light)' : 'transparent' }}>
                        {count}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '8px 10px', borderBottom: ri < rows.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, color: '#0A8A7E', fontWeight: 600 }}>
                      {colCounts[maxIdx] > 0 ? cols[maxIdx] : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // LIKERT (and legacy 'likert')
  const vals = rawAnswers.map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 5)
  const metrics = calculateLikertMetrics(vals)
  const avg = metrics?.average ?? null
  const score = metrics ? Math.round(metrics.percentage) : null
  const dist = [1, 2, 3, 4, 5].map(n => vals.filter(v => v === n).length)
  const maxDist = Math.max(...dist, 1)
  const barColors = ['#E8563A', '#C9B882', '#8A9BB0', '#3A8FC4', '#1BBFB0']
  return (
    <div style={cardStyle}>
      <Header />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}><ScoreBar score={score} height={8} label={`Normalised score for ${q.text}`} /></div>
        <span style={{ fontWeight: 800, fontSize: 18, color: scoreColor(score), minWidth: 48, textAlign: 'right' }}>{score != null ? `${score}%` : '—'}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 56 }}>
        {dist.map((count, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: count > 0 ? 'var(--text2)' : 'transparent' }}>{count}</div>
            <div style={{ width: '100%', borderRadius: '3px 3px 0 0', height: Math.max(4, (count / maxDist) * 44), background: barColors[i] }} />
            <div style={{ fontSize: 9.5, color: 'var(--text3)' }}>{i + 1}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--text3)', marginTop: 3 }}>
        <span>Strongly Disagree</span><span>Strongly Agree</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 6 }}>Average: {avg?.toFixed(2) ?? '—'} / 5</div>
    </div>
  )
}

// ── Main Portal ────────────────────────────────────────────

export default function ConsultantPortal() {
  const { profile, role } = useAuth()
  const { organisationScope, setOrganisationScope } = useOrganisationScope()
  const { users, createUser, deactivateUser, organisations, loading: usersLoading } = useAdminData()
  const {
    survey, surveys, questions, respondents: rawRespondents, responses: rawResponses, loading, refetch,
    updateSurvey, addQuestion, updateQuestion, deleteQuestion, deleteAllQuestions, moveQuestion,
    addRespondents, removeRespondent, sendReminders,
  } = useSurvey(organisationScope)

  // Every response must belong to a respondent in the organisation-scoped survey.
  // Keeping that comparison here prevents a mismatched response row from
  // affecting Dashboard, Analytics, exports, or reminders.
  const respondents  = rawRespondents
  const respondentIds = new Set(respondents.map(respondent => respondent.id))
  const responses    = rawResponses.filter(response => respondentIds.has(response.respondent_id))

  const [screen, setScreen] = useState('dashboard')
  const [dashboardTab, setDashboardTab] = useState('overview')
  const [surveyUserSort, setSurveyUserSort] = useState({
    key: 'firstName',
    direction: 'asc',
  })
  const isSuperAdmin = role === 'superadmin' || role === 'super_admin'

  useEffect(() => {
    if (
      usersLoading ||
      organisationScope === ALL_ORGANISATIONS ||
      organisations.some(({ id }) => id === organisationScope)
    ) return

    setOrganisationScope(ALL_ORGANISATIONS)
  }, [organisationScope, organisations, setOrganisationScope, usersLoading])

  useEffect(() => {
    if (screen === 'survey-templates' && !isSuperAdmin) {
      setScreen('dashboard')
    }
  }, [isSuperAdmin, screen])

  // Export targets (for PDF capture)
  const dashboardRef = useRef(null)
  const analyticsRef = useRef(null)

  // Survey form
  const [surveyForm, setSurveyForm]     = useState({ title: '', description: '', live_start: '', live_end: '' })
  const [savingSurvey, setSavingSurvey] = useState(false)

  // Question builder
  const [addingQ, setAddingQ]         = useState(false)
  const [editingQId, setEditingQId]   = useState(null)

  // CSV import
  const [showCSV, setShowCSV]         = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)

  // Invite
  const [inviteRows, setInviteRows]   = useState([{ email: '', name: '', department: '', job_title: '' }])
  const [inviting, setInviting]       = useState(false)
  const [inviteMsg, setInviteMsg]     = useState(null)
  const [reminderMsg, setReminderMsg] = useState(null)
  const [reminderSending, setReminderSending] = useState(false)
  const [openLinkCopied, setOpenLinkCopied] = useState(false)

  // Analytics filter
  const [analysisGroupField, setAnalysisGroupField] = useState('')
  const [analysisGroupValue, setAnalysisGroupValue] = useState('')

  // Settings
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser]         = useState({ full_name: '', email: '', password: '', role: 'consultant', org_id: '' })
  const [savingUser, setSavingUser]   = useState(false)

  useEffect(() => {
    if (survey) {
      setSurveyForm({
        title:       survey.title || '',
        description: survey.description || '',
        live_start:  survey.live_start ? survey.live_start.slice(0, 16) : '',
        live_end:    survey.live_end   ? survey.live_end.slice(0, 16)   : '',
      })
    }
  }, [survey])

  useEffect(() => {
    setAnalysisGroupField('')
    setAnalysisGroupValue('')
  }, [organisationScope, survey?.id])

  // The stored status can remain `live` after the scheduled closing time. Use
  // the dates as the authority so the UI never presents an expired survey as
  // live while the database cleanup catches up.
  const surveyStatus = getEffectiveSurveyStatus(survey)
  const isLive       = surveyStatus === 'live'
  const isClosed     = surveyStatus === 'closed'
  const isDraft      = surveyStatus === 'draft'
  const isScheduled  = surveyStatus === 'scheduled'

  const totalInvited   = respondents.length
  // Single source of truth for "completed" = every submitted response (one row
  // per respondent in survey_responses). This includes responses submitted
  // against an earlier version of the survey: those participants are real and
  // their data is still valuable, so they count. Because both the Dashboard and
  // the Analytics tab derive their totals from this same `responses` list, the
  // headline counts always match. (Per-question Analytics may legitimately show
  // fewer answers for a question that was edited after some people responded —
  // that's a per-question detail, not the overall total.)
  const respondedIds   = new Set(responses.map(r => r.respondent_id))
  const hasResponded   = (r) => respondedIds.has(r.id)
  const totalResponded = respondedIds.size
  const totalPending   = respondents.filter(r => !hasResponded(r)).length
  const completionPct  = totalInvited > 0
    ? Math.round((totalResponded / totalInvited) * 100)
    : 0

  // ── Registration & engagement funnel (client-requested metrics) ──────────
  // "Registered" = a plain count of the profiles table. Nothing else — no role
  // filter, no email filter.
  const scopedUsers = organisationScope === ALL_ORGANISATIONS
    ? users
    : users.filter(user => user.org_id === organisationScope)
  const totalRegistered   = scopedUsers.length
  // "Completed" = respondents who fully submitted the survey.
  const totalCompleted    = totalResponded
  // "Started, not completed" = opened the survey link but never submitted.
  const totalInProgress   = respondents.filter(r =>
    !hasResponded(r) && (r.started_at || r.draft_saved_at),
  ).length
  const totalUniqueAccesses = respondents.filter(r => (r.access_count || 0) > 0).length
  const totalRepeatAccesses = respondents.reduce(
    (total, respondent) => total + Math.max(0, (respondent.access_count || 0) - 1),
    0,
  )
  const totalSurveyAccesses = respondents.reduce(
    (total, respondent) => total + (respondent.access_count || 0),
    0,
  )
  const totalIncompleteAccesses = respondents.reduce(
    (total, respondent) => total + (hasResponded(respondent) ? 0 : (respondent.access_count || 0)),
    0,
  )
  const totalCompletedAccesses = totalSurveyAccesses - totalIncompleteAccesses

  // Drafts are intentionally excluded from completion counts. Once the survey
  // closes, however, they become reportable partial responses for authorised
  // consultant analytics and exports.
  const partialResponses = isClosed
    ? respondents
        .filter(respondent =>
          !hasResponded(respondent) &&
          respondent.draft_answers &&
          typeof respondent.draft_answers === 'object' &&
          Object.keys(respondent.draft_answers).length > 0,
        )
        .map(respondent => ({
          id: `draft-${respondent.id}`,
          survey_id: respondent.survey_id,
          respondent_id: respondent.id,
          answers: respondent.draft_answers,
          submitted_at: null,
          draft_saved_at: respondent.draft_saved_at,
          _isPartial: true,
        }))
    : []
  const reportableResponses = [
    ...responses.map(response => ({ ...response, _isPartial: false })),
    ...partialResponses,
  ]

  // Detect which question represents "department" (first choice/dropdown/text Q whose text or dimension mentions "department")
  const deptQuestion = questions.find(q =>
    ['SINGLE_CHOICE', 'DROPDOWN', 'SHORT_TEXT', 'LONG_TEXT'].includes(q.question_type) &&
    (q.text?.toLowerCase().includes('department') || q.dimension?.toLowerCase().includes('department'))
  )
  const responseByRespId = new Map(reportableResponses.map(resp => [resp.respondent_id, resp]))
  const profileByEmail = new Map(
    scopedUsers
      .filter(user => user.email)
      .map(user => [user.email.trim().toLowerCase(), user]),
  )

  function profileForRespondent(respondent) {
    const email = respondent?.email?.trim().toLowerCase()
    return email ? profileByEmail.get(email) : null
  }

  // Department for a respondent: prefer what they actually typed/selected on the
  // "Which division or department do you work in?" survey question, then their
  // linked profile's department (matched by email), then the invite-time value
  // stored on survey_respondents.
  function resolveDept(r) {
    if (!r) return null
    const resp = responseByRespId.get(r.id)
    const fromAnswer = deptQuestion ? (resp?.answers?.[deptQuestion.id] ?? null) : null
    if (fromAnswer) return fromAnswer
    const respondentProfile = profileForRespondent(r)
    return respondentProfile?.department || r.department || null
  }

  function resolveAnalysisGroup(respondent, field) {
    if (!respondent || !field) return null
    const respondentProfile = profileForRespondent(respondent)
    const values = {
      department: resolveDept(respondent),
      branch: respondentProfile?.branch,
      position: respondentProfile?.position || respondent.job_grade,
      location_site: respondentProfile?.location_site,
      job_title: respondentProfile?.job_title || respondent.job_title,
      tenure: respondent.tenure,
    }
    const value = values[field]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  const enrichedResponses = reportableResponses.map(resp => {
    const r = respondents.find(rd => rd.id === resp.respondent_id)
    return {
      ...resp,
      _dept:  resolveDept(r),
      _title: r?.job_title,
      _name:  r?.name,
      _groupValues: Object.fromEntries(
        ANALYSIS_GROUP_FIELDS.map(({ key }) => [key, resolveAnalysisGroup(r, key)]),
      ),
    }
  })

  const analysisGroupOptions = analysisGroupField
    ? [...new Set(
        respondents
          .map(respondent => resolveAnalysisGroup(respondent, analysisGroupField))
          .filter(Boolean),
      )]
        .sort((left, right) => left.localeCompare(right))
        .map(value => ({
          value,
          assignedCount: respondents.filter(
            respondent => resolveAnalysisGroup(respondent, analysisGroupField) === value,
          ).length,
          responseCount: enrichedResponses.filter(
            response => response._groupValues?.[analysisGroupField] === value,
          ).length,
        }))
    : []

  const analyticsScopeRespondents = analysisGroupField && analysisGroupValue
    ? respondents.filter(
        respondent => resolveAnalysisGroup(respondent, analysisGroupField) === analysisGroupValue,
      )
    : respondents
  const analyticsScopeRespondentIds = new Set(
    analyticsScopeRespondents.map(respondent => respondent.id),
  )
  const analyticsScopeResponses = analysisGroupField && analysisGroupValue
    ? enrichedResponses.filter(response => analyticsScopeRespondentIds.has(response.respondent_id))
    : enrichedResponses
  const analysisGroupLabel = ANALYSIS_GROUP_FIELDS.find(
    ({ key }) => key === analysisGroupField,
  )?.label || ''
  const analysisScopeLabel = analysisGroupField && analysisGroupValue
    ? `${analysisGroupLabel}: ${analysisGroupValue}`
    : 'Organisation-wide'

  const timingCounts = respondents.filter(hasResponded).reduce((acc, r) => {
    const t = r.response_timing || calcTiming(r.submitted_at, survey?.live_start, survey?.live_end)
    if (t) acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  // Departments derived from actual response data (answer-based dept first)
  const departments = deptQuestion
    ? [...new Set(enrichedResponses.map(r => r._dept).filter(Boolean))].sort()
    : [...new Set(respondents.map(r => r.department).filter(Boolean))].sort()

  // When dept comes from answers, participation-by-dept isn't knowable for pending people —
  // show count of responses per dept instead
  const deptBreakdown = deptQuestion
    ? departments.map(dept => {
        const responded = enrichedResponses.filter(r => r._dept === dept).length
        return { dept, total: reportableResponses.length, responded, answerBased: true }
      })
    : departments.map(dept => {
        const dr = respondents.filter(r => r.department === dept)
        return {
          dept,
          total: dr.length,
          responded: dr.filter(respondent => responseByRespId.has(respondent.id)).length,
          answerBased: false,
        }
      })

  const likertQs = questions.filter(q => ['LIKERT', 'likert'].includes(q.question_type))

  function computeMetrics(answers) {
    return calculateLikertMetrics(answers)
  }

  const overallMetrics = (() => {
    const answers = enrichedResponses.flatMap(r => likertQs.map(q => r.answers?.[q.id]).filter(v => v != null))
    return computeMetrics(answers)
  })()
  const overallScore = overallMetrics ? Math.round(overallMetrics.percentage) : null

  const dimensionScores = [...new Set(likertQs.map(q => q.dimension).filter(Boolean))].map(dim => {
    const dimQs = likertQs.filter(q => q.dimension === dim)
    const answers = enrichedResponses.flatMap(r => dimQs.map(q => r.answers?.[q.id]).filter(v => v != null))
    const metrics = computeMetrics(answers)
    return { dim, score: metrics ? Math.round(metrics.percentage) : null, average: metrics?.average ?? null, questionCount: dimQs.length }
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1))

  const deptScores = deptBreakdown.map(({ dept, total, responded, answerBased }) => {
    const deptResps = enrichedResponses.filter(r => r._dept === dept)
    const answers = deptResps.flatMap(r => likertQs.map(q => r.answers?.[q.id]).filter(v => v != null))
    const metrics = computeMetrics(answers)
    return { dept, total, responded, answerBased, score: metrics ? Math.round(metrics.percentage) : null, average: metrics?.average ?? null }
  })

  const analyticsOverallMetrics = (() => {
    const answers = analyticsScopeResponses.flatMap(response =>
      likertQs.map(question => response.answers?.[question.id]).filter(value => value != null),
    )
    return computeMetrics(answers)
  })()
  const analyticsOverallScore = analyticsOverallMetrics
    ? Math.round(analyticsOverallMetrics.percentage)
    : null
  const analyticsDimensionScores = [...new Set(
    likertQs.map(question => question.dimension).filter(Boolean),
  )].map(dimension => {
    const dimensionQuestions = likertQs.filter(question => question.dimension === dimension)
    const answers = analyticsScopeResponses.flatMap(response =>
      dimensionQuestions
        .map(question => response.answers?.[question.id])
        .filter(value => value != null),
    )
    const metrics = computeMetrics(answers)
    return {
      dim: dimension,
      score: metrics ? Math.round(metrics.percentage) : null,
      average: metrics?.average ?? null,
      questionCount: dimensionQuestions.length,
    }
  }).sort((left, right) => (right.score ?? -1) - (left.score ?? -1))

  const analyticsGroupScores = analysisGroupField
    ? analysisGroupOptions
        .filter(({ value }) => !analysisGroupValue || value === analysisGroupValue)
        .map(({ value, assignedCount, responseCount }) => {
          const groupResponses = enrichedResponses.filter(
            response => response._groupValues?.[analysisGroupField] === value,
          )
          const answers = groupResponses.flatMap(response =>
            likertQs.map(question => response.answers?.[question.id]).filter(answer => answer != null),
          )
          const metrics = computeMetrics(answers)
          return {
            label: value,
            total: assignedCount,
            responded: responseCount,
            score: metrics ? Math.round(metrics.percentage) : null,
            average: metrics?.average ?? null,
          }
        })
    : deptScores.map(({ dept, total, responded, score, average }) => ({
        label: dept,
        total,
        responded,
        score,
        average,
        answerBased: Boolean(deptQuestion),
      }))
  const analyticsSubmittedCount = analyticsScopeResponses.filter(
    response => !response._isPartial,
  ).length
  const analyticsIncompleteCount = analyticsScopeResponses.filter(
    response => response._isPartial,
  ).length
  const analyticsCompletionPct = analyticsScopeRespondents.length > 0
    ? Math.round((analyticsSubmittedCount / analyticsScopeRespondents.length) * 100)
    : 0
  const submissionQuality = calculateSubmissionQuality({
    questions,
    responses,
    respondents,
  })
  const submissionQualityByRespondent = new Map(
    submissionQuality.submissions.map(result => [result.respondentId, result]),
  )
  const analyticsSubmissionQuality = calculateSubmissionQuality({
    questions,
    responses: analyticsScopeResponses.filter(response => !response._isPartial),
    respondents: analyticsScopeRespondents,
  })
  const analyticsQualityByRespondent = new Map(
    analyticsSubmissionQuality.submissions.map(result => [result.respondentId, result]),
  )

  const displayName = profile?.full_name?.split(' ')[0] || 'Consultant'

  const surveyUserRows = respondents.map(respondent => {
    const matchingProfile = scopedUsers.find(user => user.email === respondent.email)
    const fullName = (matchingProfile?.full_name || respondent.name || '').trim()
    const [firstName = '', ...surnameParts] = fullName.split(/\s+/).filter(Boolean)
    const startedAt = respondent.started_at ? new Date(respondent.started_at).getTime() : null
    const response = responseByRespId.get(respondent.id)
    const submittedAtValue = respondent.submitted_at || response?.submitted_at || null
    const submittedAt = submittedAtValue ? new Date(submittedAtValue).getTime() : null
    const persistedCompletionSeconds = Number.isFinite(respondent.completion_duration_seconds)
      ? respondent.completion_duration_seconds
      : null
    const completionSeconds = persistedCompletionSeconds != null
      ? persistedCompletionSeconds
      : startedAt && submittedAt && submittedAt >= startedAt
        ? Math.floor((submittedAt - startedAt) / 1000)
        : null
    const responded = hasResponded(respondent)
    const quality = submissionQualityByRespondent.get(respondent.id)

    return {
      id: respondent.id,
      firstName,
      surname: surnameParts.join(' '),
      email: respondent.email || '',
      source: respondent.source === 'open_link' ? 'open_link' : 'invited',
      department: resolveDept(respondent) || '',
      position: respondent.job_title || matchingProfile?.job_title || '',
      status: responded ? 'completed' : (respondent.started_at || respondent.draft_saved_at) ? 'in_progress' : 'not_started',
      accessCount: respondent.access_count || 0,
      firstAccessedAt: respondent.first_accessed_at,
      lastAccessedAt: respondent.last_accessed_at,
      startedAt: respondent.started_at,
      completionSeconds,
      qualityScore: quality?.score ?? null,
      qualityLevel: quality?.level ?? 'insufficient',
      qualityLabel: quality?.label ?? submissionQualityLabel('insufficient'),
      qualitySignals: quality?.signals ?? [],
      openEndedWordCount: quality?.openEndedWordCount ?? 0,
      timing: responded
        ? (respondent.response_timing || calcTiming(respondent.submitted_at, survey?.live_start, survey?.live_end))
        : null,
      submittedAt: submittedAtValue,
    }
  })

  const sortedSurveyUserRows = sortSurveyUsers(surveyUserRows, surveyUserSort)
  const selectedOrganisation = organisations.find(({ id }) => id === organisationScope)
  const organisationContext = organisationScope === ALL_ORGANISATIONS
    ? 'All organisations'
    : selectedOrganisation?.name || 'Selected organisation'
  const surveyContext = survey?.title || 'No survey selected'
  const dashboardExportFilename = `${organisationContext}-${surveyContext}-users`
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')

  function exportedOrganisationName(row) {
    const matchingProfile = scopedUsers.find(user => user.email === row.email)
    const organisationId = matchingProfile?.org_id || survey?.org_id
    return organisations.find(({ id }) => id === organisationId)?.name || organisationContext
  }

  function exportedStatus(status) {
    if (status === 'completed') return 'Completed'
    if (status === 'in_progress') return 'In progress'
    return 'Not started'
  }

  function exportedTiming(timing) {
    if (timing === 'early') return 'Early'
    if (timing === 'on_time') return 'On time'
    if (timing === 'late') return 'Late'
    return ''
  }

  function exportedDuration(seconds) {
    if (seconds == null) return ''
    if (seconds < 60) return `${Math.max(0, Math.round(seconds))} sec`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    if (minutes < 60) {
      return remainingSeconds ? `${minutes} min ${remainingSeconds} sec` : `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`
  }

  // ── Export row builders ──────────────────────────────────
  // Users export deliberately uses the same ordered rows shown in the table.
  function buildDashboardRows() {
    return sortedSurveyUserRows.map(row => ({
      Organisation:     exportedOrganisationName(row),
      Survey:           surveyContext,
      'First Name':     row.firstName,
      Surname:          row.surname,
      Email:            row.source === 'open_link' ? '' : row.email,
      Source:           row.source === 'open_link' ? 'Open link' : 'Invited',
      Department:       row.department,
      Position:         row.position,
      'Survey Status':  exportedStatus(row.status),
      'Access Count':   row.accessCount,
      'Repeat Accesses': Math.max(0, row.accessCount - 1),
      'Access Outcome': row.status === 'completed' ? 'Completed' : 'Not completed',
      'First Accessed At': row.firstAccessedAt ? new Date(row.firstAccessedAt).toLocaleString('en-ZA') : '',
      'Last Accessed At': row.lastAccessedAt ? new Date(row.lastAccessedAt).toLocaleString('en-ZA') : '',
      'Started At':     row.startedAt ? new Date(row.startedAt).toLocaleString('en-ZA') : '',
      'Time Taken':     exportedDuration(row.completionSeconds),
      'Submission Quality': row.qualityLabel,
      'Quality Score':  row.qualityScore != null ? `${row.qualityScore}%` : '',
      'Quality Signals': row.qualitySignals.join(' '),
      'Open-ended Words': row.openEndedWordCount,
      Timing:           exportedTiming(row.timing),
      'Submitted At':   row.submittedAt ? new Date(row.submittedAt).toLocaleString('en-ZA') : '',
    }))
  }

  const analyticsExportResponses = analyticsScopeResponses
  const analyticsExportRespondents = analyticsScopeRespondents

  // Raw analytics export = one row per submitted response plus, after closure,
  // one row per saved partial response. Each question remains its own column.
  function buildAnalyticsRows() {
    return analyticsExportResponses.map(resp => {
      const r = respondents.find(rd => rd.id === resp.respondent_id)
      const matchingProfile = profileForRespondent(r)
      const quality = analyticsQualityByRespondent.get(resp.respondent_id)
      const row = {
        'Organisation ID': survey?.org_id || '',
        Organisation:      organisationContext,
        'Survey ID':       survey?.id || '',
        Survey:            surveyContext,
        'Response ID':     resp.id || '',
        'Respondent ID':   resp.respondent_id || '',
        'Response Status': resp._isPartial ? 'Incomplete' : 'Submitted',
        Name:           resp._name || '',
        Email:          r?.email || '',
        Department:     resp._dept || '',
        Position:       resp._title || '',
        'Team / Branch': matchingProfile?.branch || '',
        'Employment Level': matchingProfile?.position || r?.job_grade || '',
        'Location / Site': matchingProfile?.location_site || '',
        Tenure: r?.tenure || '',
        'Grouping Parameter': analysisGroupLabel || 'Organisation-wide',
        'Selected Group': analysisGroupValue || '',
        'Access Count': r?.access_count || 0,
        'Repeat Accesses': Math.max(0, (r?.access_count || 0) - 1),
        'Access Outcome': resp._isPartial ? 'Not completed' : 'Completed',
        'First Accessed At': r?.first_accessed_at ? new Date(r.first_accessed_at).toLocaleString('en-ZA') : '',
        'Last Accessed At': r?.last_accessed_at ? new Date(r.last_accessed_at).toLocaleString('en-ZA') : '',
        'Started At': r?.started_at ? new Date(r.started_at).toLocaleString('en-ZA') : '',
        'Submitted At': resp.submitted_at ? new Date(resp.submitted_at).toLocaleString('en-ZA') : '',
        'Time Taken': r?.completion_duration_seconds != null
          ? exportedDuration(r.completion_duration_seconds)
          : '',
        'Expected Time': quality
          ? exportedDuration(quality.expectedCompletionSeconds)
          : '',
        'Completion Time Ratio': quality?.completionTimeRatio != null
          ? `${Math.round(quality.completionTimeRatio * 100)}%`
          : '',
        'Submission Quality': quality?.label || '',
        'Quality Score': quality?.score != null ? `${quality.score}%` : '',
        'Response Engagement': quality?.engagementLabel || '',
        'Engagement Score': quality?.engagementScore != null
          ? `${quality.engagementScore}%`
          : '',
        'Quality Signals': quality?.signals.join(' ') || '',
        'Potentially Rushed': quality ? (quality.potentiallyRushed ? 'Yes' : 'No') : '',
        'Severely Rushed': quality ? (quality.severelyRushed ? 'Yes' : 'No') : '',
        'Open-ended Answers': quality?.openEndedAnswerCount ?? '',
        'Open-ended Words': quality?.openEndedWordCount ?? '',
        'Open-ended Sentences': quality?.openEndedSentenceCount ?? '',
        'Draft Saved At': resp._isPartial && resp.draft_saved_at
          ? new Date(resp.draft_saved_at).toLocaleString('en-ZA')
          : '',
      }
      questions.forEach(q => { row[`Q${q.order_num + 1}. ${q.text}`] = cellToString(resp.answers?.[q.id]) })
      return row
    })
  }

  function buildCalculatedAnalyticsRows() {
    return questions.map(q => {
      const ans = analyticsExportResponses.map(r => r.answers?.[q.id]).filter(v => v != null && v !== '')
      const t = q.question_type
      let result = '—'
      let average = ''
      let calculatedScore = ''

      if (['LIKERT', 'likert'].includes(t)) {
        const metrics = calculateLikertMetrics(ans)
        if (metrics) {
          average = metrics.average.toFixed(2)
          calculatedScore = `${Math.round(metrics.percentage)}%`
          result = `Average ${average} / 5`
        }
      } else if (t === 'RATING_SCALE') {
        const nums = ans.map(Number).filter(Number.isFinite)
        if (nums.length) {
          average = (nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(2)
          result = `Average ${average}`
        }
      } else if (['SINGLE_CHOICE', 'DROPDOWN', 'MULTI_CHOICE'].includes(t)) {
        const counts = {}
        ans.forEach(a => (Array.isArray(a) ? a : [a]).forEach(x => { counts[x] = (counts[x] || 0) + 1 }))
        const distribution = Object.entries(counts).sort((a, b) => b[1] - a[1])
        if (distribution.length) {
          result = distribution.map(([option, count]) => `${option}: ${count}`).join('; ')
        }
      } else {
        result = `${ans.length} answered`
      }

      return {
        Organisation: organisationContext,
        Survey: surveyContext,
        Question: `Q${q.order_num + 1}`,
        'Question ID': q.id,
        'Question Text': q.text,
        Dimension: q.dimension || '',
        Type: t,
        'Answer Count': ans.length,
        Average: average,
        'Calculated Score': calculatedScore,
        'Result / Distribution': result,
      }
    })
  }

  function buildAnalyticsSummaryRows() {
    const submitted = analyticsExportResponses.filter(response => !response._isPartial).length
    const partial = analyticsExportResponses.filter(response => response._isPartial).length
    const assigned = analyticsExportRespondents.length
    const filteredLikertAnswers = analyticsExportResponses.flatMap(response =>
      likertQs.map(question => response.answers?.[question.id]).filter(value => value != null),
    )
    const filteredMetrics = calculateLikertMetrics(filteredLikertAnswers)
    const filteredAccesses = analyticsExportRespondents.reduce(
      (total, respondent) => total + (respondent.access_count || 0),
      0,
    )
    const filteredIncompleteAccesses = analyticsExportRespondents.reduce(
      (total, respondent) => total + (hasResponded(respondent) ? 0 : (respondent.access_count || 0)),
      0,
    )

    return [
      { Metric: 'Organisation', Value: organisationContext },
      { Metric: 'Survey', Value: surveyContext },
      { Metric: 'Analysis scope', Value: analysisScopeLabel },
      { Metric: 'Grouping parameter', Value: analysisGroupLabel || 'None' },
      { Metric: 'Selected group', Value: analysisGroupValue || 'All groups' },
      { Metric: 'Assigned users', Value: assigned },
      { Metric: 'Submitted responses', Value: submitted },
      { Metric: 'Incomplete responses', Value: partial },
      { Metric: 'Total survey accesses', Value: filteredAccesses },
      { Metric: 'Accesses without completion', Value: filteredIncompleteAccesses },
      { Metric: 'Accesses by users who completed', Value: filteredAccesses - filteredIncompleteAccesses },
      { Metric: 'Completion rate', Value: assigned > 0 ? `${Math.round((submitted / assigned) * 100)}%` : '0%' },
      { Metric: 'Questions', Value: questions.length },
      { Metric: 'Likert average', Value: filteredMetrics ? `${filteredMetrics.average.toFixed(2)} / 5` : '' },
      { Metric: 'Calculated Likert score', Value: filteredMetrics ? `${Math.round(filteredMetrics.percentage)}%` : '' },
      { Metric: 'Average completion time', Value: exportedDuration(analyticsSubmissionQuality.averageCompletionSeconds) },
      { Metric: 'Average weighted expected time', Value: exportedDuration(analyticsSubmissionQuality.averageExpectedCompletionSeconds) },
      { Metric: 'Timed submissions', Value: `${analyticsSubmissionQuality.timedSubmissionCount} of ${analyticsSubmissionQuality.submittedCount}` },
      { Metric: 'Average open-ended response length', Value: analyticsSubmissionQuality.averageOpenEndedWords != null ? `${analyticsSubmissionQuality.averageOpenEndedWords.toFixed(1)} words` : 'Not applicable' },
      { Metric: 'Average open-ended sentences', Value: analyticsSubmissionQuality.averageOpenEndedSentences != null ? analyticsSubmissionQuality.averageOpenEndedSentences.toFixed(1) : 'Not applicable' },
      { Metric: 'Open-response coverage', Value: analyticsSubmissionQuality.openEndedCoveragePercentage != null ? `${Math.round(analyticsSubmissionQuality.openEndedCoveragePercentage)}%` : 'Not applicable' },
      { Metric: 'Submission quality', Value: analyticsSubmissionQuality.label },
      { Metric: 'Submission quality score', Value: analyticsSubmissionQuality.score != null ? `${analyticsSubmissionQuality.score}%` : '' },
      { Metric: 'Response engagement', Value: analyticsSubmissionQuality.engagementLabel },
      { Metric: 'Response engagement score', Value: analyticsSubmissionQuality.engagementScore != null ? `${analyticsSubmissionQuality.engagementScore}%` : '' },
      { Metric: 'Potentially rushed submissions', Value: analyticsSubmissionQuality.potentiallyRushedCount },
      { Metric: 'Minimal qualitative feedback', Value: analyticsSubmissionQuality.minimalFeedbackCount },
      { Metric: 'Strong engagement submissions', Value: analyticsSubmissionQuality.distribution.strong },
      { Metric: 'Mixed engagement submissions', Value: analyticsSubmissionQuality.distribution.mixed },
      { Metric: 'Submissions suggested for review', Value: analyticsSubmissionQuality.distribution.review },
    ]
  }

  function buildSubmissionQualityRows() {
    return analyticsSubmissionQuality.submissions.map(result => {
      const respondent = respondents.find(item => item.id === result.respondentId)
      const profileMatch = profileForRespondent(respondent)
      return {
        Organisation: organisationContext,
        Survey: surveyContext,
        'Analysis Scope': analysisScopeLabel,
        'Respondent ID': result.respondentId,
        Name: profileMatch?.full_name || respondent?.name || '',
        Email: respondent?.email || '',
        Department: resolveDept(respondent) || '',
        'Completion Time': exportedDuration(result.completionSeconds),
        'Expected Time': exportedDuration(result.expectedCompletionSeconds),
        'Completion Time Ratio': result.completionTimeRatio != null
          ? `${Math.round(result.completionTimeRatio * 100)}%`
          : '',
        'Open-ended Answers': result.openEndedAnswerCount,
        'Open-ended Words': result.openEndedWordCount,
        'Open-ended Sentences': result.openEndedSentenceCount,
        'Average Words per Open Answer': result.averageWordsPerOpenAnswer != null
          ? result.averageWordsPerOpenAnswer.toFixed(1)
          : '',
        'Potentially Rushed': result.potentiallyRushed ? 'Yes' : 'No',
        'Severely Rushed': result.severelyRushed ? 'Yes' : 'No',
        'Minimal Qualitative Feedback': result.minimalQualitativeFeedback ? 'Yes' : 'No',
        'Paragraph Coverage': result.qualitativeCoveragePercentage != null
          ? `${Math.round(result.qualitativeCoveragePercentage)}%`
          : '',
        'Paragraph Depth Score': result.qualitativeDepthScore != null
          ? `${Math.round(result.qualitativeDepthScore)}%`
          : '',
        'Quality Score': result.score != null ? `${result.score}%` : '',
        'Quality Indicator': result.label,
        'Response Engagement': result.engagementLabel,
        'Engagement Score': result.engagementScore != null
          ? `${result.engagementScore}%`
          : '',
        'Review Signals': result.signals.join(' '),
      }
    })
  }

  function buildDimensionExportRows() {
    return [...new Set(likertQs.map(question => question.dimension).filter(Boolean))].map(dimension => {
      const dimensionQuestions = likertQs.filter(question => question.dimension === dimension)
      const answers = analyticsExportResponses.flatMap(response =>
        dimensionQuestions.map(question => response.answers?.[question.id]).filter(value => value != null),
      )
      const metrics = calculateLikertMetrics(answers)
      return {
        Organisation: organisationContext,
        Survey: surveyContext,
        Dimension: dimension,
        Questions: dimensionQuestions.length,
        Answers: answers.length,
        Average: metrics ? metrics.average.toFixed(2) : '',
        'Calculated Score': metrics ? `${Math.round(metrics.percentage)}%` : '',
      }
    })
  }

  function buildDepartmentExportRows() {
    return analyticsGroupScores
      .map(({ label, total, responded, score, average }) => ({
        Organisation: organisationContext,
        Survey: surveyContext,
        'Grouping Parameter': analysisGroupLabel || 'Department',
        Group: label,
        Assigned: total,
        Responded: responded,
        Participation: total > 0 ? `${Math.round((responded / total) * 100)}%` : '',
        Average: average != null ? average.toFixed(2) : '',
        'Calculated Score': score != null ? `${score}%` : '',
      }))
  }

  function calculatedAnalyticsSheets() {
    return [
      { name: 'Summary', rows: buildAnalyticsSummaryRows() },
      { name: 'Calculated Analytics', rows: buildCalculatedAnalyticsRows() },
      { name: 'Dimension Scores', rows: buildDimensionExportRows() },
      { name: 'Department Scores', rows: buildDepartmentExportRows() },
      { name: 'Submission Quality', rows: buildSubmissionQualityRows() },
    ]
  }

  async function exportCalculatedAnalyticsWorkbook(filename) {
    await downloadWorkbook(calculatedAnalyticsSheets(), filename)
  }

  async function exportAnalyticsWorkbook(filename) {
    await downloadWorkbook([
      ...calculatedAnalyticsSheets(),
      { name: 'Raw Responses', rows: buildAnalyticsRows() },
    ], filename)
  }

  const NAVY = [26, 53, 96]
  function pdfHeader(doc, subtitle) {
    doc.setFontSize(15); doc.setTextColor(...NAVY)
    doc.text(survey?.title || 'DBN Culture Survey', 14, 16)
    doc.setFontSize(11); doc.setTextColor(90)
    doc.text(subtitle, 14, 23)
    doc.setFontSize(8.5); doc.setTextColor(140)
    doc.text(`Generated ${new Date().toLocaleString('en-ZA')}`, 14, 28)
    doc.setTextColor(0)
  }

  function buildDashboardPdf(doc, autoTable) {
    pdfHeader(doc, `Users — ${organisationContext} — ${surveyContext}`)
    autoTable(doc, {
      startY: 33,
      head: [[
        'Registered', 'Total Accesses', 'Incomplete Accesses', 'Completed-user Accesses',
        'Unique Users', 'Repeat Accesses', 'Started — Not Done', 'Completed', 'Participation',
      ]],
      body: [[
        String(totalRegistered), String(totalSurveyAccesses), String(totalIncompleteAccesses),
        String(totalCompletedAccesses), String(totalUniqueAccesses), String(totalRepeatAccesses),
        String(totalInProgress), String(totalCompleted), `${completionPct}%`,
      ]],
      theme: 'grid', headStyles: { fillColor: NAVY }, styles: { halign: 'center', fontSize: 7.5 },
    })
    const rows = buildDashboardRows()
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [[
        'Organisation', 'Survey', 'First Name', 'Surname', 'Email', 'Source',
        'Department', 'Position', 'Status', 'Accesses', 'Repeats', 'Access Outcome', 'First Accessed',
        'Last Accessed', 'Started At', 'Time Taken', 'Quality', 'Quality Score', 'Timing', 'Submitted At',
      ]],
      body: rows.map(row => [
        row.Organisation,
        row.Survey,
        row['First Name'],
        row.Surname,
        row.Email,
        row.Source,
        row.Department,
        row.Position,
        row['Survey Status'],
        row['Access Count'],
        row['Repeat Accesses'],
        row['Access Outcome'],
        row['First Accessed At'],
        row['Last Accessed At'],
        row['Started At'],
        row['Time Taken'],
        row['Submission Quality'],
        row['Quality Score'],
        row.Timing,
        row['Submitted At'],
      ]),
      styles: { fontSize: 6.2, cellPadding: 1.2, overflow: 'linebreak' },
      headStyles: { fillColor: NAVY },
      didDrawPage: () => pdfHeaderRepeat(doc),
    })
  }

  function drawAnalyticsPdf(doc, autoTable, includeRawResponses) {
    const summaryRows = buildAnalyticsSummaryRows()
    const calculatedRows = buildCalculatedAnalyticsRows()
    const dimensionRows = buildDimensionExportRows()
    const departmentRows = buildDepartmentExportRows()
    const qualityRows = buildSubmissionQualityRows()
    const rawRows = buildAnalyticsRows()

    pdfHeader(doc, `Analytics — ${organisationContext} — ${analysisScopeLabel}`)
    autoTable(doc, {
      startY: 33,
      head: [['Metric', 'Value']],
      body: summaryRows.map(row => [row.Metric, row.Value]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: NAVY },
    })
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 7,
      head: [['#', 'Question', 'Dimension', 'Type', 'Answers', 'Average', 'Score', 'Result / Distribution']],
      body: calculatedRows.map(row => [
        row.Question,
        row['Question Text'],
        row.Dimension,
        row.Type,
        row['Answer Count'],
        row.Average,
        row['Calculated Score'],
        row['Result / Distribution'],
      ]),
      styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 62 }, 7: { cellWidth: 65 } },
      headStyles: { fillColor: NAVY },
      didDrawPage: () => pdfHeaderRepeat(doc),
    })

    if (dimensionRows.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 7,
        head: [['Dimension', 'Questions', 'Answers', 'Average', 'Calculated Score']],
        body: dimensionRows.map(row => [row.Dimension, row.Questions, row.Answers, row.Average, row['Calculated Score']]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: NAVY },
        didDrawPage: () => pdfHeaderRepeat(doc),
      })
    }

    if (departmentRows.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 7,
        head: [['Department', 'Assigned', 'Responded', 'Participation', 'Average', 'Calculated Score']],
        body: departmentRows.map(row => [
          row.Department,
          row.Assigned,
          row.Responded,
          row.Participation,
          row.Average,
          row['Calculated Score'],
        ]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: NAVY },
        didDrawPage: () => pdfHeaderRepeat(doc),
      })
    }

    if (qualityRows.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 7,
        head: [['Name', 'Department', 'Completion', 'Expected', 'Time Ratio', 'Open Words', 'Sentences', 'Rushed', 'Minimal Feedback', 'Quality', 'Signals']],
        body: qualityRows.map(row => [
          row.Name || row['Respondent ID'],
          row.Department,
          row['Completion Time'],
          row['Expected Time'],
          row['Completion Time Ratio'],
          row['Open-ended Words'],
          row['Open-ended Sentences'],
          row['Potentially Rushed'],
          row['Minimal Qualitative Feedback'],
          row['Quality Indicator'],
          row['Review Signals'],
        ]),
        styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak' },
        columnStyles: { 10: { cellWidth: 48 } },
        headStyles: { fillColor: NAVY },
        didDrawPage: () => pdfHeaderRepeat(doc),
      })
    }

    if (includeRawResponses && rawRows.length) {
      doc.addPage()
      pdfHeader(doc, `Raw responses — ${organisationContext} — ${analysisScopeLabel}`)
      const rawHeaders = Object.keys(rawRows[0])
      autoTable(doc, {
        startY: 33,
        head: [rawHeaders],
        body: rawRows.map(row => rawHeaders.map(header => row[header])),
        styles: { fontSize: 5.5, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: NAVY },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: [0, 1, 2, 3, 5],
        didDrawPage: () => pdfHeaderRepeat(doc),
      })
    }
  }

  function buildCalculatedAnalyticsPdf(doc, autoTable) {
    drawAnalyticsPdf(doc, autoTable, false)
  }

  function buildAnalyticsPdf(doc, autoTable) {
    drawAnalyticsPdf(doc, autoTable, true)
  }

  const analyticsExportOptions = [
    {
      k: 'raw-excel',
      group: 'Raw data',
      label: 'Excel workbook (.xlsx)',
      action: async baseFilename => {
        const rows = buildAnalyticsRows()
        if (!rows.length) return alert('There are no submitted responses to export.')
        await downloadXLSX(rows, `${baseFilename}-raw-responses.xlsx`)
      },
    },
    {
      k: 'raw-csv',
      group: 'Raw data',
      label: 'CSV file (.csv)',
      action: async baseFilename => {
        const rows = buildAnalyticsRows()
        if (!rows.length) return alert('There are no submitted responses to export.')
        downloadBlob(`${baseFilename}-raw-responses.csv`, '\ufeff' + rowsToCSV(rows), 'text/csv;charset=utf-8;')
      },
    },
    {
      k: 'calculated-excel',
      group: 'Calculated analytics',
      label: 'Excel workbook (.xlsx)',
      action: baseFilename => exportCalculatedAnalyticsWorkbook(`${baseFilename}-calculated.xlsx`),
    },
    {
      k: 'calculated-pdf',
      group: 'Calculated analytics',
      label: 'PDF report (.pdf)',
      action: baseFilename => exportToPDF(buildCalculatedAnalyticsPdf, `${baseFilename}-calculated.pdf`, 'landscape'),
    },
    {
      k: 'complete-excel',
      group: 'Complete report',
      label: 'Excel workbook (.xlsx)',
      action: baseFilename => exportAnalyticsWorkbook(`${baseFilename}-complete.xlsx`),
    },
    {
      k: 'complete-pdf',
      group: 'Complete report',
      label: 'PDF report (.pdf)',
      action: baseFilename => exportToPDF(buildAnalyticsPdf, `${baseFilename}-complete.pdf`, 'landscape'),
    },
  ]

  // Lightweight page-number footer for multi-page tables.
  function pdfHeaderRepeat(doc) {
    const n = doc.internal.getNumberOfPages()
    doc.setFontSize(8); doc.setTextColor(150)
    doc.text(`Page ${n}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 8)
    doc.setTextColor(0)
  }

  // ── Handlers ─────────────────────────────────────────────

  async function handleSaveSurvey() {
    setSavingSurvey(true)
    try {
      await updateSurvey({ title: surveyForm.title, description: surveyForm.description, live_start: surveyForm.live_start || null, live_end: surveyForm.live_end || null })
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSavingSurvey(false) }
  }

  async function handleLaunch() {
    if (survey?.live_end && new Date(survey.live_end).getTime() <= Date.now()) {
      alert('Choose a closing date in the future before launching the survey.')
      return
    }
    if (!window.confirm('Make this survey live? Respondents can now access it.')) return
    try { await updateSurvey({ status: 'live' }) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleStop() {
    if (!window.confirm('Stop the survey now? This closes it immediately, replaces the scheduled closing time with the current time, and prevents further responses.')) return
    try { await updateSurvey({ status: 'closed', live_end: new Date().toISOString() }) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleReopen() {
    if (!window.confirm('Reopen the survey as draft for editing?')) return
    try { await updateSurvey({ status: 'draft' }) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleToggleOpenLink() {
    try { await updateSurvey({ open_link_enabled: !survey?.open_link_enabled }) } catch (e) { alert('Error: ' + e.message) }
  }

  function handleCopyOpenLink() {
    const url = `${window.location.origin}/assess/open/${survey?.open_link_token}`
    navigator.clipboard.writeText(url)
    setOpenLinkCopied(true)
    setTimeout(() => setOpenLinkCopied(false), 1800)
  }

  async function handleAddQuestion(form) {
    try { await addQuestion(form); setAddingQ(false) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleUpdateQuestion(id, form) {
    try { await updateQuestion(id, form); setEditingQId(null) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleDeleteQuestion(id) {
    if (!window.confirm('Delete this question?')) return
    try { await deleteQuestion(id) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleDeleteAllQuestions() {
    if (!window.confirm(`Delete all ${questions.length} questions? This cannot be undone.`)) return
    try { await deleteAllQuestions() } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleCSVImport(parsedQuestions) {
    setCsvImporting(true)
    try {
      for (const q of parsedQuestions) {
        await addQuestion(q)
      }
      setShowCSV(false)
    } catch (e) { alert('Import error: ' + e.message) }
    finally { setCsvImporting(false) }
  }

  function updateInviteRow(idx, field, value) {
    setInviteRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function handleInvite() {
    const valid = inviteRows.filter(r => r.email.trim())
    if (!valid.length) return
    setInviting(true); setInviteMsg(null)
    try {
      const result = await addRespondents(valid)
      const details = [
        `${result.sent} invitation${result.sent !== 1 ? 's' : ''} sent`,
        result.failed ? `${result.failed} failed` : null,
        result.skipped ? `${result.skipped} skipped` : null,
      ].filter(Boolean).join(', ')
      setInviteMsg({
        type: result.sent > 0 ? 'ok' : 'err',
        text: `${details}.`,
      })

      const failedEmails = new Set(
        (result.results || [])
          .filter(item => item.status === 'failed')
          .map(item => item.email),
      )
      const failedRows = valid.filter(row => failedEmails.has(row.email.trim().toLowerCase()))
      setInviteRows(failedRows.length > 0
        ? failedRows
        : [{ email: '', name: '', department: '', job_title: '' }])
    } catch (e) { setInviteMsg({ type: 'err', text: e.message }) }
    finally { setInviting(false) }
  }

  async function handleSendReminders() {
    setReminderSending(true); setReminderMsg(null)
    try {
      const result = await sendReminders()
      if (result.sent === 0 && result.failed === 0) {
        setReminderMsg('No pending users to remind.')
      } else {
        const details = [
          `${result.sent} reminder${result.sent !== 1 ? 's' : ''} sent`,
          result.failed ? `${result.failed} failed` : null,
          result.skipped ? `${result.skipped} already completed` : null,
        ].filter(Boolean).join(', ')
        setReminderMsg(`${details}.`)
      }
    } catch (e) { setReminderMsg('Error: ' + e.message) }
    finally { setReminderSending(false) }
  }

  async function handleCreateUser() {
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()) return
    setSavingUser(true)
    try {
      await createUser(newUser)
      setShowAddUser(false)
      setNewUser({ full_name: '', email: '', password: '', role: 'consultant', org_id: '' })
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSavingUser(false) }
  }

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="portal-c" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(27,191,176,0.2)', borderTopColor: '#1BBFB0', animation: 'portal-c-fluidSpin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading portal…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-c">
      <SidebarProvider
        style={{
          '--sidebar-width': '228px',
          '--sidebar-width-icon': '64px',
          '--sidebar': '#0D1F3C',
          '--sidebar-foreground': '#FFFFFF',
          '--sidebar-accent': 'rgba(27,191,176,0.13)',
          '--sidebar-accent-foreground': '#FFFFFF',
          '--sidebar-border': 'rgba(255,255,255,0.10)',
          '--sidebar-ring': '#1BBFB0',
        }}
      >
        <ConsultantSidebar
          screen={screen}
          onScreenChange={setScreen}
          logo={<span className="fluid-breathe"><FluidSVG size={38} id="cp-logo" /></span>}
        />

        {/* ── MAIN ────────────────────────────── */}
        <SidebarInset className="consultant-main bg-[var(--bg)]">
        <div className="consultant-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SidebarTrigger className="text-[#4A6380] hover:bg-[#EEF5F9] hover:text-[#0D1F3C]" />
            <div className="page-title">{{ dashboard: 'Dashboard', survey: 'Surveys', 'survey-templates': 'Survey Templates', analytics: 'Analytics', organisations: 'Organisations', clients: 'Clients', settings: 'Settings' }[screen]}</div>
          </div>
          <div className="topbar-right">
            <label className="sr-only" htmlFor="global-organisation-scope">
              Filter dashboard and analytics by organisation
            </label>
            <select
              id="global-organisation-scope"
              value={organisationScope}
              onChange={event => setOrganisationScope(event.target.value)}
              disabled={usersLoading}
              className="h-10 max-w-[280px] rounded-[10px] border border-[#CBD7E5] bg-white px-3 text-sm font-semibold text-[#0D1F3C] outline-none transition focus:border-[#1BBFB0] focus:ring-3 focus:ring-[#1BBFB0]/20 disabled:cursor-wait disabled:text-[#8A9BB0]"
            >
              <option value={ALL_ORGANISATIONS}>All organisations</option>
              {organisations.map(organisation => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </select>
            {organisationScope !== ALL_ORGANISATIONS && !['survey', 'survey-templates'].includes(screen) && survey && (
              <span className={`badge ${isLive ? 'badge-teal' : isClosed ? 'badge-slate' : 'badge-gold'}`}>
                {isLive ? '● Live' : isClosed ? '✓ Closed' : isScheduled ? '◷ Scheduled' : '◷ Draft'}
              </span>
            )}
          </div>
        </div>

        <div className={`consultant-content ${screen === 'clients' || screen === 'organisations' || screen === 'survey' || screen === 'survey-templates' ? '!p-0' : ''}`}>

          {/* ════════ DASHBOARD ════════ */}
          {screen === 'dashboard' && (
            <div ref={dashboardRef}>
              <div className="page-hero">
                <div className="hero-title">Welcome back, {displayName}</div>
                <div className="hero-sub">
                  {organisationScope === ALL_ORGANISATIONS
                    ? `${surveys.length} organisation survey${surveys.length !== 1 ? 's' : ''} included`
                    : survey
                      ? `${survey.title} · ${isLive ? 'Survey is live' : isClosed ? 'Survey closed' : isScheduled ? 'Survey scheduled' : 'Draft — not yet live'}`
                      : 'No survey found for this organisation.'}
                </div>
                <div className="hero-fluid-pos fluid-spin"><FluidSVG size={88} id="dash-hero" /></div>
              </div>

              <Tabs value={dashboardTab} onValueChange={setDashboardTab} className="mb-6">
                <TabsList className="dashboard-tab-list grid w-full grid-cols-2">
                  <TabsTrigger value="overview" className="dashboard-tab-trigger">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="users" className="dashboard-tab-trigger">
                    Users ({respondents.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {dashboardTab === 'overview' && (
                <>
              <div className="card mb-24" style={{ padding: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Build Survey', desc: 'Edit questions', action: () => setScreen('survey'), disabled: false },
                    { label: 'Add Users', desc: 'Invite participants', action: () => setScreen('survey'), disabled: false },
                    { label: 'Send Reminders', desc: 'Nudge incomplete users', action: handleSendReminders, disabled: !isLive || totalPending === 0 },
                    { label: isLive ? 'Stop Survey' : isDraft ? 'Launch Survey' : isScheduled ? 'Return to Draft' : 'Reopen Survey', desc: isLive ? 'Close immediately' : isDraft ? 'Make live' : isScheduled ? 'Edit schedule' : 'Reopen as draft', action: isLive ? handleStop : isDraft ? handleLaunch : handleReopen, disabled: !survey },
                    { label: 'View Analytics', desc: 'Question analysis', action: () => setScreen('analytics'), disabled: responses.length === 0 },
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      disabled={item.disabled}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 68, padding: '11px 13px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.45 : 1, fontFamily: 'inherit', textAlign: 'left' }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.desc}</div>
                      </div>
                      <span style={{ color: 'var(--teal)', fontSize: 16 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-4 mb-28" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {[
                  { label: 'Registered',          value: totalRegistered,  sub: 'Accounts created on the website',  color: '#1A6BAA' },
                  { label: 'Completed Survey',    value: totalCompleted,   sub: 'Fully submitted',                  color: '#0A8A7E' },
                  { label: 'Started — Not Done',  value: totalInProgress,  sub: 'Opened the survey, not submitted', color: '#C9B882' },
                  { label: 'Total Accesses',      value: totalSurveyAccesses, sub: 'Every recorded survey click or open', color: '#2479AF' },
                  { label: 'Incomplete Accesses', value: totalIncompleteAccesses, sub: 'Clicks by users who have not submitted', color: '#C0644B' },
                  { label: 'Completed-user Accesses', value: totalCompletedAccesses, sub: 'Clicks by users who submitted', color: '#0A8A7E' },
                  { label: 'Unique Users Accessed', value: totalUniqueAccesses, sub: 'People who opened the survey link', color: '#2479AF' },
                  { label: 'Repeat Accesses',     value: totalRepeatAccesses, sub: 'Additional survey-link visits', color: '#7B5AA6' },
                ].map(c => (
                  <div className="stat-card" key={c.label}>
                    <div className="stat-accent" style={{ background: c.color }} />
                    <div className="stat-label">{c.label}</div>
                    <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
                    <div className="stat-sub">{c.sub}</div>
                  </div>
                ))}
              </div>

              {totalInvited > 0 && (
                <div className="card mb-24">
                  <div className="flex-between mb-16">
                    <div className="section-title">Overall Participation</div>
                    <span style={{ fontWeight: 700, fontSize: 20, color: completionPct >= 70 ? '#0A8A7E' : completionPct >= 40 ? '#7A6030' : '#9A3825' }}>{completionPct}%</span>
                  </div>
                  <PercentageBar value={completionPct} height={12} fillClassName={completionPct >= 70 ? 'bar-teal' : completionPct >= 40 ? 'bar-gold' : 'bar-coral'} label="Overall survey participation" />
                </div>
              )}

              <div className="dashboard-analytics-grid mb-24">
                  <div className="card dashboard-response-timing">
                    <div className="section-title mb-16">Response Timing</div>
                    {totalResponded === 0 ? (
                      <div style={{ color: 'var(--text3)', fontSize: 13 }}>No responses yet.</div>
                    ) : (
                      [{ key: 'early', label: 'Early', color: '#0A8A7E' }, { key: 'on_time', label: 'On Time', color: '#1A6BAA' }, { key: 'late', label: 'Late', color: '#7A6030' }].map(({ key, label, color }) => {
                        const count = timingCounts[key] || 0
                        const pct = totalResponded > 0 ? Math.round((count / totalResponded) * 100) : 0
                        return (
                          <div key={key} style={{ marginBottom: 12 }}>
                            <div className="dim-header">
                              <span className="dim-name">{label}</span>
                              <span style={{ fontWeight: 700, fontSize: 13, color }}>{count} <span style={{ fontWeight: 400, color: 'var(--text3)' }}>({pct}%)</span></span>
                            </div>
                            <PercentageBar value={pct} fill={color} label={`${label} response timing`} />
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="card" style={{ maxHeight: 470, overflowY: 'auto' }}>
                    <div className="section-title mb-2">By Department</div>
                    {deptQuestion && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                        Grouped by answers to: <em>"{deptQuestion.text}"</em>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      <span style={{ flex: 1 }}></span>
                      <span style={{ minWidth: 72, textAlign: 'right' }}>{deptQuestion ? 'Responses' : 'Participation'}</span>
                      {likertQs.length > 0 && <span style={{ minWidth: 52, textAlign: 'right' }}>Score</span>}
                    </div>
                    {deptScores.length === 0 ? (
                      <div style={{ color: 'var(--text3)', fontSize: 13 }}>No department data yet.</div>
                    ) : deptScores.map(({ dept, total, responded, score, average, answerBased }) => {
                      const pct = total > 0 ? Math.round((responded / total) * 100) : 0
                      return (
                        <div key={dept} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span className="dim-name" style={{ flex: 1 }}>{dept}</span>
                            {answerBased
                              ? <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 72, textAlign: 'right' }}>{responded} respondent{responded !== 1 ? 's' : ''}</span>
                              : <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 72, textAlign: 'right' }}>{responded}/{total} <span style={{ color: 'var(--text3)' }}>({pct}%)</span></span>
                            }
                            {likertQs.length > 0 && (
                              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(score), minWidth: 110, textAlign: 'right' }}>
                                {average != null && score != null ? `${average.toFixed(2)} / 5 · ${score}%` : '—'}
                              </span>
                            )}
                          </div>
                          {!answerBased && (
                            <PercentageBar value={pct} height={6} fillClassName={pct >= 70 ? 'bar-teal' : pct >= 40 ? 'bar-gold' : 'bar-coral'} label={`${dept} participation`} />
                          )}
                          {likertQs.length > 0 && score != null && (
                            <ScoreBar score={score} height={answerBased ? 6 : 4} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                {dimensionScores.length > 0 && overallScore != null && (
                  <div className="card" style={{ maxHeight: 470, overflowY: 'auto' }}>
                    <div className="section-title mb-4">Score by Dimension</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Average Likert score per theme</div>
                    {dimensionScores.map(({ dim, score, average, questionCount }) => (
                      <div key={dim} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{dim}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{questionCount}Q</span>
                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{average != null ? `${average.toFixed(2)} / 5` : '—'}</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(score) }}>{score != null ? `${score}%` : '—'}</span>
                          </div>
                        </div>
                        {score != null && <ScoreBar score={score} height={7} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

                </>
              )}

              {dashboardTab === 'users' && (
                <>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="section-title">Survey users</div>
                      <div className="mt-1 text-sm text-[#8A9BB0]">
                        {organisationContext} · {surveyContext} · {surveyUserRows.length} user{surveyUserRows.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <ExportMenu
                      filename={dashboardExportFilename || 'survey-users'}
                      getRows={buildDashboardRows}
                      buildPdf={buildDashboardPdf}
                      pdfOrientation="landscape"
                    />
                  </div>
                  <SurveyUsersTable
                    rows={surveyUserRows}
                    sort={surveyUserSort}
                    onSortChange={setSurveyUserSort}
                    onAddUsers={() => setScreen('survey')}
                  />
                </>
              )}
            </div>
          )}

          {/* ════════ SURVEY ════════ */}
          {screen === 'survey' && <SurveyManagementPage />}

          {/* ════════ SURVEY TEMPLATES ════════ */}
          {screen === 'survey-templates' && isSuperAdmin && <SurveyTemplatesPage />}

          {/* Legacy single-survey screen retained temporarily for the dashboard
              and analytics extraction cleanup, but it is no longer rendered. */}
          {false && screen === 'survey' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Survey Builder</div>
                <div className="hero-sub">Build DBN's survey, manage questions, and control who can respond.</div>
              </div>

              <div className="grid-2 mb-24">
                {/* Survey details */}
                <div className="card">
                  <div className="section-title mb-4">Survey Details</div>
                  <div className="section-sub mb-16">Edit the title, description, and schedule.</div>
                  <div className="form-group">
                    <label className="form-label">Survey Title</label>
                    <input className="form-input" type="text" value={surveyForm.title} onChange={e => setSurveyForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
                    <textarea className="form-input" style={{ height: 68, resize: 'vertical', fontFamily: 'inherit' }} value={surveyForm.description} onChange={e => setSurveyForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Open Date &amp; Time</label>
                      <input className="form-input" type="datetime-local" value={surveyForm.live_start} onChange={e => setSurveyForm(p => ({ ...p, live_start: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Close Date &amp; Time</label>
                      <input className="form-input" type="datetime-local" value={surveyForm.live_end} onChange={e => setSurveyForm(p => ({ ...p, live_end: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-teal" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSaveSurvey} disabled={savingSurvey}>
                    {savingSurvey ? 'Saving…' : 'Save Details →'}
                  </button>
                </div>

                {/* Survey controls */}
                <div className="card">
                  <div className="section-title mb-4">Survey Controls</div>
                  <div className="section-sub mb-16">Launch, send reminders, or stop the survey.</div>
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                    <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Current Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className={`badge ${isLive ? 'badge-teal' : isClosed ? 'badge-slate' : 'badge-gold'}`} style={{ fontSize: 13 }}>
                        {isLive ? '● Live' : isClosed ? '✓ Closed' : isScheduled ? '◷ Scheduled' : '◷ Draft'}
                      </span>
                      {survey?.live_start && <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>Opens: {new Date(survey.live_start).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {survey?.live_end   && <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>· Closes: {new Date(survey.live_end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isDraft  && <button className="btn btn-teal"    style={{ width: '100%', justifyContent: 'center' }} onClick={handleLaunch}>Launch Survey → Make Live</button>}
                    {isScheduled && <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleReopen}>Return to Draft</button>}
                    {isLive   && <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSendReminders} disabled={reminderSending || totalPending === 0}>{reminderSending ? 'Sending…' : `Send Reminders (${totalPending} pending)`}</button>}
                    {isLive   && <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', color: 'var(--coral)', borderColor: 'rgba(232,86,58,0.4)' }} onClick={handleStop}>Stop Survey Manually</button>}
                    {isClosed && <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleReopen}>Reopen as Draft</button>}
                  </div>
                  {reminderMsg && <div className="insight" style={{ marginTop: 12 }}><div className="insight-text">{reminderMsg}</div></div>}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--teal)', wordBreak: 'break-all', background: 'var(--teal-light)', padding: '8px 12px', borderRadius: 8 }}>
                      {window.location.origin}/assess/[token]
                    </div>
                  </div>

                  {/* Open / walk-in link for workers with no company email */}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)' }}>Open Link (no email required)</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text3)' }}>
                        <input type="checkbox" checked={!!survey?.open_link_enabled} onChange={handleToggleOpenLink} disabled={!survey} />
                        {survey?.open_link_enabled ? 'Enabled' : 'Disabled'}
                      </label>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
                      Anyone with this link can self-register (name, department, job title) and take the survey — no invite or company email needed. Only works while the survey is live.
                    </div>
                    {survey?.open_link_enabled && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--teal)', wordBreak: 'break-all', background: 'var(--teal-light)', padding: '8px 12px', borderRadius: 8, flex: 1 }}>
                          {window.location.origin}/assess/open/{survey.open_link_token}
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={handleCopyOpenLink}>{openLinkCopied ? 'Copied ✓' : 'Copy'}</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Question Builder */}
              <div className="card mb-24">
                <div className="flex-between mb-16">
                  <div>
                    <div className="section-title">Questions</div>
                    <div className="section-sub">{questions.length} question{questions.length !== 1 ? 's' : ''} in this survey</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {questions.length > 0 && (
                      <button className="btn btn-sm" style={{ background: 'var(--coral-light)', color: 'var(--coral)', border: 'none' }} onClick={handleDeleteAllQuestions}>
                        Delete All
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => setShowCSV(true)}>⬆ Import CSV</button>
                    {!addingQ && <button className="btn btn-teal btn-sm" onClick={() => { setAddingQ(true); setEditingQId(null) }}>+ Add Question</button>}
                  </div>
                </div>

                {addingQ && (
                  <div style={{ marginBottom: 16 }}>
                    <QuestionForm onSave={handleAddQuestion} onCancel={() => setAddingQ(false)} />
                  </div>
                )}

                {questions.length === 0 && !addingQ && (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)', fontSize: 13 }}>
                    No questions yet. Click "+ Add Question" or "⬆ Import CSV" to start building the survey.
                  </div>
                )}

                {questions.map((q, idx) => {
                  const info = typeInfo(q.question_type)
                  return (
                    <div key={q.id} style={{ marginBottom: 10 }}>
                      {editingQId === q.id ? (
                        <QuestionForm initial={q} onSave={form => handleUpdateQuestion(q.id, form)} onCancel={() => setEditingQId(null)} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => moveQuestion(q.id, 'up')}   disabled={idx === 0}                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, width: 26, height: 22, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, fontSize: 11 }}>↑</button>
                            <button onClick={() => moveQuestion(q.id, 'down')} disabled={idx === questions.length - 1} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, width: 26, height: 22, cursor: idx === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === questions.length - 1 ? 0.3 : 1, fontSize: 11 }}>↓</button>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>Q{idx + 1}</span>
                              <span style={{ fontSize: 14 }}>{info.icon}</span>
                              <span className="badge badge-slate" style={{ fontSize: 10.5 }}>{info.label}</span>
                              {q.dimension && <span className="badge badge-teal" style={{ fontSize: 10.5 }}>{q.dimension}</span>}
                              {q.options?.choices && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{q.options.choices.length} options</span>}
                              {q.options?.rows   && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{q.options.rows.length} rows × {q.options.cols?.length || 0} cols</span>}
                              {q.options?.min != null && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{q.options.min}–{q.options.max}</span>}
                            </div>
                            <div style={{ fontSize: 13.5, color: 'var(--navy)', fontWeight: 500, lineHeight: 1.55 }}>{q.text}</div>
                            {q.hint && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{q.hint}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => { setEditingQId(q.id); setAddingQ(false) }}>Edit</button>
                            <button className="btn btn-sm" style={{ background: 'var(--coral-light)', color: 'var(--coral)', border: 'none' }} onClick={() => handleDeleteQuestion(q.id)}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Invite Employees */}
              <div className="card">
                <div className="flex-between mb-16">
                  <div>
                    <div className="section-title">Invite Respondents</div>
                    <div className="section-sub">Select registered users and email each person their unique survey link.</div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setInviteRows(p => [...p, { email: '', name: '', department: '', job_title: '' }])}>+ Row</button>
                </div>

                {inviteMsg && (
                  <div className={`insight ${inviteMsg.type === 'err' ? 'alert' : ''} mb-16`}>
                    <div className="insight-text">{inviteMsg.text}</div>
                  </div>
                )}

                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <table style={{ minWidth: 580 }}>
                    <thead><tr><th>Person *</th><th>Department</th><th>Position / Job Title</th><th></th></tr></thead>
                    <tbody>
                      {inviteRows.map((row, idx) => {
                        const takenEmails = new Set([
                          ...inviteRows.filter((_, i) => i !== idx).map(r => r.email).filter(Boolean),
                        ])
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                className="form-input"
                                value={row.email}
                                onChange={e => {
                                  const p = users.find(u => u.email === e.target.value)
                                  setInviteRows(prev => prev.map((r, i) => i === idx
                                    ? p
                                      ? { ...r, email: p.email, name: p.full_name || '', department: p.department || '', job_title: p.job_title || '' }
                                      : { ...r, email: '', name: '', department: '', job_title: '' }
                                    : r
                                  ))
                                }}
                                style={{ padding: '8px 10px', fontSize: 13, minWidth: 220 }}
                              >
                                <option value="">— Select person —</option>
                                {users
                                  .filter(u => !takenEmails.has(u.email) || u.email === row.email)
                                  .map(u => (
                                    <option key={u.id} value={u.email}>
                                      {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                                    </option>
                                  ))
                                }
                              </select>
                            </td>
                            <td>
                              <input
                                className="form-input"
                                type="text"
                                placeholder="e.g. Finance"
                                value={row.department}
                                onChange={e => updateInviteRow(idx, 'department', e.target.value)}
                                style={{ padding: '8px 10px', fontSize: 13 }}
                              />
                            </td>
                            <td>
                              <input
                                className="form-input"
                                type="text"
                                placeholder="e.g. Manager"
                                value={row.job_title}
                                onChange={e => updateInviteRow(idx, 'job_title', e.target.value)}
                                style={{ padding: '8px 10px', fontSize: 13 }}
                              />
                            </td>
                            <td><button onClick={() => setInviteRows(p => p.filter((_, i) => i !== idx))} disabled={inviteRows.length === 1} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 16, opacity: inviteRows.length === 1 ? 0.3 : 1 }}>×</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <button className="btn btn-teal" style={{ width: '100%', justifyContent: 'center' }} onClick={handleInvite} disabled={inviting || inviteRows.every(r => !r.email.trim())}>
                  {inviting ? 'Sending…' : `Send ${inviteRows.filter(r => r.email.trim()).length || ''} Invitation${inviteRows.filter(r => r.email.trim()).length !== 1 ? 's' : ''} →`}
                </button>

                {rawRespondents.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 12 }}>Current Respondents ({rawRespondents.length})</div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      <table>
                        <thead><tr><th>Name / Email</th><th>Department</th><th>Position</th><th>Status</th><th>Survey Link</th><th></th></tr></thead>
                        <tbody>
                          {rawRespondents.map(r => (
                            <tr key={r.id}>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name || '—'}</div>
                                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{r.email}</div>
                              </td>
                              <td style={{ fontSize: 13 }}>{r.department || '—'}</td>
                              <td style={{ fontSize: 13 }}>{r.job_title  || '—'}</td>
                              <td>{hasResponded(r) ? <span className="tag tag-active">✓ Done</span> : <span className="tag tag-pending">Pending</span>}</td>
                              <td>{!hasResponded(r) && <a href={surveyUrl(r.token)} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontSize: 12, textDecoration: 'none' }}>Open Link ↗</a>}</td>
                              <td><button onClick={() => { if (window.confirm(hasResponded(r) ? `Delete ${r.email} AND their submitted response? This permanently removes the test entry.` : `Remove ${r.email}?`)) removeRespondent(r.id) }} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 12 }}>{hasResponded(r) ? 'Delete' : 'Remove'}</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ ANALYTICS ════════ */}
          {screen === 'analytics' && (
            <div ref={analyticsRef}>
              <div className="export-toolbar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <ExportMenu
                  filename={`${organisationContext}-${surveyContext}-${analysisScopeLabel}-analytics`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'survey-analytics'}
                  options={analyticsExportOptions}
                />
              </div>
              <div className="page-hero">
                <div className="hero-title">Analytics</div>
                <div className="hero-sub">Per-question analysis — scores, distributions, choices, and open responses.</div>
              </div>

              {reportableResponses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No Responses Yet</div>
                  <div style={{ fontSize: 14, maxWidth: 360, margin: '0 auto' }}>Analytics will appear once respondents submit their surveys.</div>
                </div>
              ) : (
                <>
                  <AnalysisScopeFilter
                    fields={ANALYSIS_GROUP_FIELDS}
                    selectedField={analysisGroupField}
                    selectedValue={analysisGroupValue}
                    options={analysisGroupOptions}
                    onFieldChange={setAnalysisGroupField}
                    onValueChange={setAnalysisGroupValue}
                  />

                  <Card className="relative mb-6 w-full items-stretch gap-0 overflow-hidden border-0 bg-[linear-gradient(135deg,#0D1F3C_0%,#0E3462_100%)] py-0 text-white ring-0">
                    <div className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full bg-[radial-gradient(circle,rgba(27,191,176,0.14)_0%,transparent_70%)]" />
                    <div className="relative flex w-full flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">Analysis overview</div>
                        <div className="mt-1 text-sm text-white/70">Headline results for the selected analysis scope</div>
                      </div>
                      <Badge variant="outline" className="h-auto border-[#1BBFB0]/40 bg-[#1BBFB0]/10 px-3 py-1.5 text-sm font-semibold text-[#32D4C4]">
                        {analysisScopeLabel}
                      </Badge>
                    </div>
                    <div className="relative grid w-full grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
                      {[
                        { label: 'Assigned Users', value: analyticsScopeRespondents.length },
                        { label: 'Submitted Responses', value: analyticsSubmittedCount },
                        ...(isClosed && analyticsIncompleteCount > 0
                          ? [{ label: 'Incomplete Responses', value: analyticsIncompleteCount }]
                          : []),
                        { label: 'Completion Rate', value: `${analyticsCompletionPct}%` },
                        ...(analyticsOverallMetrics ? [{ label: 'Likert Average', value: `${analyticsOverallMetrics.average.toFixed(2)} / 5` }] : []),
                        ...(analyticsOverallScore != null ? [{ label: 'Overall Score', value: `${analyticsOverallScore}%`, highlight: true }] : []),
                        { label: 'Questions', value: questions.length },
                        ...(analyticsDimensionScores.length > 0 ? [{ label: 'Dimensions', value: analyticsDimensionScores.length }] : []),
                      ].map(s => (
                        <div key={s.label} className="flex min-h-28 flex-col items-center justify-center bg-[#102C50]/95 px-4 py-5 text-center">
                          <div className="text-3xl font-extrabold leading-none" style={{ color: s.highlight ? scoreColor(analyticsOverallScore) : '#1BC7B7' }}>{s.value}</div>
                          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <SubmissionQualitySummary metrics={analyticsSubmissionQuality} />

                  {/* Group + dimension summaries */}
                  {(analyticsGroupScores.length > 0 || analyticsDimensionScores.length > 0) && likertQs.length > 0 && (
                    <div className="grid-2 mb-24">
                      {analyticsGroupScores.length > 0 && (
                        <div className="card">
                          <div className="section-title mb-2">Score by {analysisGroupLabel || 'Department'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
                            {analysisGroupField
                              ? `Average Likert score for ${analysisGroupLabel.toLowerCase()} groups`
                              : deptQuestion
                                ? <>Grouped by: <em>"{deptQuestion.text}"</em></>
                                : 'Average Likert score · participation in brackets'}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11 }}>{analysisGroupLabel || 'Department'}</th>
                                <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11 }}>Participation</th>
                                <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11 }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...analyticsGroupScores].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map(({ label, total, responded, score, average, answerBased }) => {
                                const pct = total > 0 ? Math.round((responded / total) * 100) : 0
                                return (
                                  <tr key={label}>
                                    <td style={{ padding: '9px 0', fontWeight: 600, color: 'var(--navy)', borderBottom: '1px solid var(--border)' }}>{label}</td>
                                    <td style={{ padding: '9px 0', textAlign: 'right', color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                                      {answerBased
                                        ? <>{responded}</>
                                        : <>{responded}/{total} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({pct}%)</span></>
                                      }
                                    </td>
                                    <td style={{ padding: '9px 0', textAlign: 'right', fontWeight: 800, fontSize: 15, color: scoreColor(score), borderBottom: '1px solid var(--border)' }}>
                                      {average != null && score != null ? <>{average.toFixed(2)} / 5 <span style={{ color: 'var(--text3)', fontSize: 11 }}>· {score}%</span></> : '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {analyticsDimensionScores.length > 0 && (
                        <div className="card">
                          <div className="section-title mb-4">Score by Dimension</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Average Likert score per theme · sorted high to low</div>
                          {analyticsDimensionScores.map(({ dim, score, average, questionCount }) => (
                            <div key={dim} style={{ marginBottom: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <div>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{dim}</span>
                                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{questionCount}Q</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{average != null ? `${average.toFixed(2)} / 5` : '—'}</span>
                                  <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(score) }}>{score != null ? `${score}%` : '—'}</span>
                                </div>
                              </div>
                              {score != null && <ScoreBar score={score} height={6} />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {questions.map(q => (
                    <QuestionAnalyticsCard key={q.id} q={q} responses={analyticsScopeResponses} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ════════ ORGANISATION MANAGEMENT ════════ */}
          {screen === 'organisations' && <OrganisationsPage />}

          {/* ════════ CLIENTS / USER MANAGEMENT ════════ */}
          {screen === 'clients' && <UsersPage />}

          {/* ════════ SETTINGS ════════ */}
          {screen === 'settings' && (
            <div>
              <div className="page-hero">
                <div className="hero-title">Settings</div>
                <div className="hero-sub">Manage platform users.</div>
              </div>
              <div className="card">
                <div className="flex-between mb-16">
                  <div><div className="section-title">User Management</div><div className="section-sub">All platform users — consultants, admins, and clients.</div></div>
                  <button className="btn btn-teal btn-sm" onClick={() => setShowAddUser(true)}>+ Add User</button>
                </div>
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Loading…</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                        <td style={{ color: 'var(--text2)' }}>{u.email}</td>
                        <td><span className="badge badge-slate">{u.role}</span></td>
                        <td>{u.active !== false ? <span className="tag tag-active">● Active</span> : <span className="tag tag-pending">○ Inactive</span>}</td>
                        <td>{u.active !== false && <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => { if (window.confirm(`Deactivate ${u.full_name}?`)) deactivateUser(u.id) }}>Deactivate</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showAddUser && (
                <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
                  <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-title">Add New User</div>
                    <div className="modal-sub">Create a new platform user account.</div>
                    <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" type="text" placeholder="e.g. Sipho Nkosi" value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="user@company.com" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="Temporary password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} /></div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Role</label>
                        <select className="form-input" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                          <option value="consultant">Consultant</option><option value="superadmin">Super Admin</option><option value="client">Client</option>
                        </select>
                      </div>
                      <div className="form-group"><label className="form-label">Organisation</label>
                        <select className="form-input" value={newUser.org_id} onChange={e => setNewUser(p => ({ ...p, org_id: e.target.value }))}>
                          <option value="">No organisation</option>
                          {organisations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" onClick={() => setShowAddUser(false)}>Cancel</button>
                      <button className="btn btn-teal" onClick={handleCreateUser} disabled={savingUser}>{savingUser ? 'Creating…' : 'Create User'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
        </SidebarInset>

        {/* CSV Import Modal */}
        {showCSV && <CSVImportModal onImport={handleCSVImport} onClose={() => setShowCSV(false)} />}
      </SidebarProvider>
    </div>
  )
}
