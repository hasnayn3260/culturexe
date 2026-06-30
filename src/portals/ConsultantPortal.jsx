import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAdminData } from '../hooks/useAdminData'
import { useSurvey } from '../hooks/useSurvey'
import { QUESTION_TYPES, CHOICE_TYPES, typeInfo, parseQuestionsCSV, CSV_TEMPLATE } from '../data/surveyTypes'
import UserMenu from '../components/UserMenu'
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

function timingBadge(timing) {
  if (timing === 'early')   return <span className="tag tag-active">Early</span>
  if (timing === 'on_time') return <span className="tag tag-complete">On Time</span>
  if (timing === 'late')    return <span className="tag tag-pending">Late</span>
  return <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
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

function ScoreBar({ score, height = 8 }) {
  return (
    <div className="dim-bar-bg" style={{ height }}>
      <div style={{ height: '100%', borderRadius: 99, width: `${score ?? 0}%`, background: score >= 70 ? 'linear-gradient(90deg,#1BBFB0,#00D4C0)' : score >= 50 ? 'linear-gradient(90deg,#C9B882,#E0D09A)' : 'linear-gradient(90deg,#E8563A,#F47A65)' }} />
    </div>
  )
}

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

// Real .xlsx via ExcelJS (so Excel doesn't warn about format/extension mismatch).
async function downloadXLSX(rows, filename) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Export')
  const headers = Object.keys(rows[0])
  ws.columns = headers.map(h => ({ header: h, key: h, width: Math.min(Math.max(h.length + 2, 12), 60) }))
  rows.forEach(r => ws.addRow(headers.reduce((o, h) => { o[h] = cellToString(r[h]); return o }, {})))
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3560' } }
  header.alignment = { vertical: 'middle' }
  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(filename, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

// Builds a real (text/vector) PDF using jsPDF + autotable — selectable text,
// not an image snapshot. `buildPdf(doc, autoTable)` draws the content.
async function exportToPDF(buildPdf, filename) {
  const { default: jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF('p', 'mm', 'a4')
  buildPdf(doc, autoTable)
  doc.save(filename)
}

function ExportMenu({ filename = 'export', getRows, buildPdf }) {
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
        await exportToPDF(buildPdf, `${filename}-${date}.pdf`)
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

  return (
    <div ref={ref} className="export-toolbar" style={{ position: 'relative', display: 'inline-block' }}>
      <button className="btn btn-outline btn-sm" onClick={() => setOpen(o => !o)} disabled={busy}>
        {busy ? 'Exporting…' : '⤓ Export ▾'}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', zIndex: 50, minWidth: 150, overflow: 'hidden' }}>
          {[{ k: 'excel', label: 'Excel (.xlsx)' }, { k: 'csv', label: 'CSV (.csv)' }, { k: 'pdf', label: 'PDF (.pdf)' }].map(o => (
            <button key={o.k} onClick={() => run(o.k)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--navy)', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              {o.label}
            </button>
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

function QuestionAnalyticsCard({ q, responses, filterDept }) {
  const filtered = filterDept ? responses.filter(r => r._dept === filterDept) : responses
  const rawAnswers = filtered.map(r => r.answers?.[q.id]).filter(v => v != null)
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
                <div className="dim-bar-bg" style={{ height: 8 }}>
                  <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: 'linear-gradient(90deg,#1BBFB0,#00D4C0)', borderRadius: 99 }} />
                </div>
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
                <div className="dim-bar-bg" style={{ height: 8 }}>
                  <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: 'linear-gradient(90deg,#3A8FC4,#5AADD4)', borderRadius: 99 }} />
                </div>
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
  const vals = rawAnswers.map(Number).filter(n => !isNaN(n))
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  const score = avg != null ? Math.round((avg / 5) * 100) : null
  const dist = [1, 2, 3, 4, 5].map(n => vals.filter(v => v === n).length)
  const maxDist = Math.max(...dist, 1)
  const barColors = ['#E8563A', '#C9B882', '#8A9BB0', '#3A8FC4', '#1BBFB0']
  return (
    <div style={cardStyle}>
      <Header />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="dim-bar-bg" style={{ flex: 1, height: 8 }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${score ?? 0}%`, background: score >= 70 ? 'linear-gradient(90deg,#1BBFB0,#00D4C0)' : score >= 50 ? 'linear-gradient(90deg,#C9B882,#E0D09A)' : 'linear-gradient(90deg,#E8563A,#F47A65)' }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 18, color: score >= 70 ? '#0A8A7E' : score >= 50 ? '#7A6030' : '#9A3825', minWidth: 40, textAlign: 'right' }}>{score ?? '—'}</span>
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
  const navigate = useNavigate()
  const { profile, role } = useAuth()
  const { users, createUser, deactivateUser, organisations, loading: usersLoading } = useAdminData()
  const {
    survey, questions, respondents: rawRespondents, responses: rawResponses, loading, refetch,
    updateSurvey, addQuestion, updateQuestion, deleteQuestion, deleteAllQuestions, moveQuestion,
    addRespondents, removeRespondent, sendReminders,
  } = useSurvey()

  // ── DBN-only filter ──────────────────────────────────────────────────────
  // All participation metrics (signed up / started / submitted) and the Analytics
  // tab count only real DBN participants — anyone whose email doesn't contain
  // "dbn" (test/dummy accounts) is excluded. The raw lists are kept for the
  // Survey-tab management table so those test entries stay visible & deletable.
  const isDbn        = (email) => (email || '').toLowerCase().includes('dbn')
  const respondents  = rawRespondents.filter(r => isDbn(r.email))
  const rawRespById  = new Map(rawRespondents.map(r => [r.id, r]))
  const responses    = rawResponses.filter(resp => {
    const r = rawRespById.get(resp.respondent_id)
    return r && isDbn(r.email)
  })

  const [screen, setScreen] = useState('dashboard')

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

  // Analytics filter
  const [filterDept, setFilterDept]   = useState('')

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

  const isLive   = survey?.status === 'live'
  const isClosed = survey?.status === 'closed'
  const isDraft  = survey?.status === 'draft'

  const EXPECTED_TOTAL = 140
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
  const totalPending   = EXPECTED_TOTAL - totalResponded
  const completionPct  = Math.round((totalResponded / EXPECTED_TOTAL) * 100)

  // ── Registration & engagement funnel (client-requested metrics) ──────────
  // "Registered" = a plain count of the profiles table. Nothing else — no role
  // filter, no email filter.
  const totalRegistered   = users.length
  // "Completed" = respondents who fully submitted the survey.
  const totalCompleted    = totalResponded
  // "Started, not completed" = opened the survey link but never submitted.
  const totalInProgress   = respondents.filter(r => !hasResponded(r) && r.started_at).length
  const regCompletionPct  = totalRegistered > 0 ? Math.round((totalCompleted / totalRegistered) * 100) : 0

  // Detect which question represents "department" (first choice/dropdown/text Q whose text or dimension mentions "department")
  const deptQuestion = questions.find(q =>
    ['SINGLE_CHOICE', 'DROPDOWN', 'SHORT_TEXT', 'LONG_TEXT'].includes(q.question_type) &&
    (q.text?.toLowerCase().includes('department') || q.dimension?.toLowerCase().includes('department'))
  )

  const enrichedResponses = responses.map(resp => {
    const r = respondents.find(rd => rd.id === resp.respondent_id)
    const deptFromAnswer = deptQuestion ? (resp.answers?.[deptQuestion.id] ?? null) : null
    return {
      ...resp,
      _dept:  deptFromAnswer || r?.department || null,
      _title: r?.job_title,
      _name:  r?.name,
    }
  })

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
        return { dept, total: totalResponded, responded, answerBased: true }
      })
    : departments.map(dept => {
        const dr = respondents.filter(r => r.department === dept)
        return { dept, total: dr.length, responded: dr.filter(hasResponded).length, answerBased: false }
      })

  const likertQs = questions.filter(q => ['LIKERT', 'likert'].includes(q.question_type))

  function computeScore(answers) {
    const nums = answers.map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 5)
    return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length / 5) * 100) : null
  }

  const overallScore = (() => {
    const answers = enrichedResponses.flatMap(r => likertQs.map(q => r.answers?.[q.id]).filter(v => v != null))
    return computeScore(answers)
  })()

  const dimensionScores = [...new Set(likertQs.map(q => q.dimension).filter(Boolean))].map(dim => {
    const dimQs = likertQs.filter(q => q.dimension === dim)
    const answers = enrichedResponses.flatMap(r => dimQs.map(q => r.answers?.[q.id]).filter(v => v != null))
    return { dim, score: computeScore(answers), questionCount: dimQs.length }
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1))

  const deptScores = deptBreakdown.map(({ dept, total, responded }) => {
    const deptResps = enrichedResponses.filter(r => r._dept === dept)
    const answers = deptResps.flatMap(r => likertQs.map(q => r.answers?.[q.id]).filter(v => v != null))
    return { dept, total, responded, score: computeScore(answers) }
  })

  const displayName = profile?.full_name?.split(' ')[0] || 'Consultant'
  const initials = profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C'

  const NAV = [
    { key: 'dashboard', icon: '◉',  label: 'Dashboard'  },
    { key: 'survey',    icon: '📋', label: 'Survey'     },
    { key: 'analytics', icon: '📊', label: 'Analytics'  },
    { key: 'settings',  icon: '⚙',  label: 'Settings'   },
  ]

  // ── Export row builders ──────────────────────────────────
  // Dashboard export = the participation summary + respondent list.
  function buildDashboardRows() {
    return respondents.map(r => ({
      Name:           r.name || '',
      Email:          r.email || '',
      Department:     r.department || '',
      Position:       r.job_title || '',
      Responded:      hasResponded(r) ? 'Yes' : 'No',
      Timing:         hasResponded(r) ? (r.response_timing || calcTiming(r.submitted_at, survey?.live_start, survey?.live_end) || '') : '',
      'Submitted At': r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-ZA') : '',
    }))
  }

  // Analytics export = one row per submitted response, a column per question.
  function buildAnalyticsRows() {
    return enrichedResponses.map(resp => {
      const r = respondents.find(rd => rd.id === resp.respondent_id)
      const row = {
        Name:           resp._name || '',
        Email:          r?.email || '',
        Department:     resp._dept || '',
        'Submitted At': resp.submitted_at ? new Date(resp.submitted_at).toLocaleString('en-ZA') : '',
      }
      questions.forEach(q => { row[`Q${q.order_num + 1}. ${q.text}`] = cellToString(resp.answers?.[q.id]) })
      return row
    })
  }

  // Per-question result summary (used in the Analytics PDF).
  function analyticsSummaryRows() {
    return questions.map(q => {
      const ans = enrichedResponses.map(r => r.answers?.[q.id]).filter(v => v != null && v !== '')
      const t = q.question_type
      let result = '—'
      if (['LIKERT', 'likert', 'RATING_SCALE'].includes(t)) {
        const nums = ans.map(Number).filter(n => !isNaN(n))
        if (nums.length) result = `Avg ${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)}`
      } else if (['SINGLE_CHOICE', 'DROPDOWN', 'MULTI_CHOICE'].includes(t)) {
        const counts = {}
        ans.forEach(a => (Array.isArray(a) ? a : [a]).forEach(x => { counts[x] = (counts[x] || 0) + 1 }))
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        if (top) result = `Top: ${top[0]} (${top[1]})`
      } else {
        result = `${ans.length} answered`
      }
      return [`Q${q.order_num + 1}`, q.text, t, result]
    })
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
    pdfHeader(doc, 'Dashboard — Participation Summary')
    autoTable(doc, {
      startY: 33,
      head: [['Registered', 'Completed Survey', 'Started — Not Done', 'Participation']],
      body: [[String(totalRegistered), String(totalCompleted), String(totalInProgress), `${completionPct}%`]],
      theme: 'grid', headStyles: { fillColor: NAVY }, styles: { halign: 'center', fontSize: 10 },
    })
    const rows = buildDashboardRows()
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Name', 'Email', 'Department', 'Position', 'Responded', 'Timing', 'Submitted At']],
      body: rows.map(r => [r.Name, r.Email, r.Department, r.Position, r.Responded, r.Timing, r['Submitted At']]),
      styles: { fontSize: 7.5, cellPadding: 1.5 }, headStyles: { fillColor: NAVY },
      didDrawPage: () => pdfHeaderRepeat(doc),
    })
  }

  function buildAnalyticsPdf(doc, autoTable) {
    pdfHeader(doc, `Analytics — ${enrichedResponses.length} response${enrichedResponses.length !== 1 ? 's' : ''}`)
    autoTable(doc, {
      startY: 33,
      head: [['#', 'Question', 'Type', 'Result']],
      body: analyticsSummaryRows(),
      styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 110 } },
      headStyles: { fillColor: NAVY },
    })
  }

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
    if (!window.confirm('Make this survey live? Respondents can now access it.')) return
    try { await updateSurvey({ status: 'live' }) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleStop() {
    if (!window.confirm('Stop the survey? No further responses will be accepted.')) return
    try { await updateSurvey({ status: 'closed', live_end: new Date().toISOString() }) } catch (e) { alert('Error: ' + e.message) }
  }

  async function handleReopen() {
    if (!window.confirm('Reopen the survey as draft for editing?')) return
    try { await updateSurvey({ status: 'draft' }) } catch (e) { alert('Error: ' + e.message) }
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
      await addRespondents(valid)
      setInviteMsg({ type: 'ok', text: `${valid.length} respondent${valid.length !== 1 ? 's' : ''} added.` })
      setInviteRows([{ email: '', name: '', department: '', job_title: '' }])
    } catch (e) { setInviteMsg({ type: 'err', text: e.message }) }
    finally { setInviting(false) }
  }

  async function handleSendReminders() {
    setReminderSending(true); setReminderMsg(null)
    try {
      const count = await sendReminders()
      setReminderMsg(count > 0 ? `Reminder timestamp updated for ${count} pending respondent${count !== 1 ? 's' : ''}.` : 'No pending respondents to remind.')
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
      {/* ── SIDEBAR ─────────────────────────── */}
      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="fluid-breathe"><FluidSVG size={38} id="cp-logo" /></div>
          <div>
            <div className="logo-wordmark"><span className="logo-cx">Culture</span><span className="logo-xe">Xe</span></div>
            <div className="logo-sub">by Africa International Advisors</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(item => (
            <div key={item.key} className={`nav-item${screen === item.key ? ' active' : ''}`} onClick={() => setScreen(item.key)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="aia-badge">
            <div className="aia-badge-name">Africa International Advisors</div>
            <div className="aia-badge-role">Consultant Portal · {role === 'superadmin' ? 'Super Admin' : 'Consultant'}</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────── */}
      <div className="main">
        <div className="topbar">
          <div className="page-title">{{ dashboard: 'Dashboard', survey: 'Survey', analytics: 'Analytics', settings: 'Settings' }[screen]}</div>
          <div className="topbar-right">
            {role && role !== 'client' && role !== 'consultant' && (
              <select
                value="consultant"
                onChange={e => { if (e.target.value === 'client') navigate('/client') }}
                style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
              >
                <option value="consultant">Consultant View</option>
                <option value="client">Client View</option>
              </select>
            )}
            {survey && (
              <span className={`badge ${isLive ? 'badge-teal' : isClosed ? 'badge-slate' : 'badge-gold'}`}>
                {isLive ? '● Live' : isClosed ? '✓ Closed' : '◷ Draft'}
              </span>
            )}
            <UserMenu initials={initials} displayName={profile?.full_name || displayName} />
          </div>
        </div>

        <div className="content">

          {/* ════════ DASHBOARD ════════ */}
          {screen === 'dashboard' && (
            <div ref={dashboardRef}>
              <div className="export-toolbar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <ExportMenu filename="DBN-Dashboard" getRows={buildDashboardRows} buildPdf={buildDashboardPdf} />
              </div>
              <div className="page-hero">
                <div className="hero-title">Welcome back, {displayName}</div>
                <div className="hero-sub">{survey ? `${survey.title} · ${isLive ? 'Survey is live' : isClosed ? 'Survey closed' : 'Draft — not yet live'}` : 'No survey found.'}</div>
                <div className="hero-fluid-pos fluid-spin"><FluidSVG size={88} id="dash-hero" /></div>
              </div>

              <div className="grid-4 mb-28" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[
                  { label: 'Registered',          value: totalRegistered,  sub: 'Accounts created on the website',  color: '#1A6BAA' },
                  { label: 'Completed Survey',    value: totalCompleted,   sub: 'Fully submitted',                  color: '#0A8A7E' },
                  { label: 'Started — Not Done',  value: totalInProgress,  sub: 'Opened the survey, not submitted', color: '#C9B882' },
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
                  <div className="dim-bar-bg" style={{ height: 12 }}>
                    <div className={`dim-bar ${completionPct >= 70 ? 'bar-teal' : completionPct >= 40 ? 'bar-gold' : 'bar-coral'}`} style={{ width: `${completionPct}%`, height: '100%' }} />
                  </div>
                </div>
              )}

              <div className="grid-2 mb-24">
                <div>
                  <div className="card mb-20">
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
                            <div className="dim-bar-bg"><div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color }} /></div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="card">
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
                    ) : deptScores.map(({ dept, total, responded, score, answerBased }) => {
                      const pct = total > 0 ? Math.round((responded / total) * 100) : 0
                      return (
                        <div key={dept} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span className="dim-name" style={{ flex: 1 }}>{dept}</span>
                            {answerBased
                              ? <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 72, textAlign: 'right' }}>{responded} respondent{responded !== 1 ? 's' : ''}</span>
                              : <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 72, textAlign: 'right' }}>{responded}/{total} <span style={{ color: 'var(--text3)' }}>({pct}%)</span></span>
                            }
                            {likertQs.length > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(score), minWidth: 52, textAlign: 'right' }}>{score != null ? `${score}%` : '—'}</span>}
                          </div>
                          {!answerBased && (
                            <div className="dim-bar-bg" style={{ height: 6 }}>
                              <div className={`dim-bar ${pct >= 70 ? 'bar-teal' : pct >= 40 ? 'bar-gold' : 'bar-coral'}`} style={{ width: `${pct}%`, height: '100%' }} />
                            </div>
                          )}
                          {likertQs.length > 0 && score != null && (
                            <ScoreBar score={score} height={answerBased ? 6 : 4} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                {dimensionScores.length > 0 && overallScore != null && (
                  <div className="card mb-20">
                    <div className="section-title mb-4">Score by Dimension</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Average Likert score per theme</div>
                    {dimensionScores.map(({ dim, score, questionCount }) => (
                      <div key={dim} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{dim}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{questionCount}Q</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(score) }}>{score != null ? `${score}%` : '—'}</span>
                          </div>
                        </div>
                        {score != null && <ScoreBar score={score} height={7} />}
                      </div>
                    ))}
                  </div>
                )}

                <div className="card mb-20">
                  <div className="section-title mb-16">Quick Actions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Build Survey', desc: 'Add or edit questions', action: () => setScreen('survey'), disabled: false },
                      { label: 'Add Respondents', desc: 'Invite employees to participate', action: () => setScreen('survey'), disabled: false },
                      { label: 'Send Reminders', desc: 'Nudge non-respondents', action: handleSendReminders, disabled: !isLive || totalPending === 0 },
                      { label: isLive ? 'Stop Survey' : isDraft ? 'Launch Survey' : 'Reopen Survey', desc: isLive ? 'Manually close' : isDraft ? 'Make live' : 'Reopen as draft', action: isLive ? handleStop : isDraft ? handleLaunch : handleReopen, disabled: !survey },
                      { label: 'View Analytics', desc: 'Per-question analysis', action: () => setScreen('analytics'), disabled: responses.length === 0 },
                    ].map(item => (
                      <button key={item.label} onClick={item.action} disabled={item.disabled} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.4 : 1, fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.borderColor = 'var(--teal)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--navy)' }}>{item.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{item.desc}</div>
                        </div>
                        <span style={{ color: 'var(--teal)', fontSize: 16 }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              </div>

              {/* Respondents table */}
              <div className="card">
                <div className="section-title mb-16">Respondents</div>
                {respondents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)', fontSize: 13 }}>
                    No respondents yet. Go to <button onClick={() => setScreen('survey')} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>Survey</button> to add employees.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Responded</th><th>Timing</th><th>Submitted</th></tr></thead>
                      <tbody>
                        {respondents.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 600 }}>{r.name || '—'}</td>
                            <td style={{ color: 'var(--text2)' }}>{r.email}</td>
                            <td>{r.department || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                            <td>{r.job_title  || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                            <td>{hasResponded(r) ? <span className="tag tag-active">● Yes</span> : <span className="tag tag-pending">○ No</span>}</td>
                            <td>{timingBadge(hasResponded(r) ? (r.response_timing || calcTiming(r.submitted_at, survey?.live_start, survey?.live_end)) : null)}</td>
                            <td style={{ fontSize: 12.5, color: 'var(--text3)' }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ SURVEY ════════ */}
          {screen === 'survey' && (
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
                        {isLive ? '● Live' : isClosed ? '✓ Closed' : '◷ Draft'}
                      </span>
                      {survey?.live_start && <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>Opens: {new Date(survey.live_start).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {survey?.live_end   && <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>· Closes: {new Date(survey.live_end).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isDraft  && <button className="btn btn-teal"    style={{ width: '100%', justifyContent: 'center' }} onClick={handleLaunch}>Launch Survey → Make Live</button>}
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
                    <div className="section-title">Add Respondents</div>
                    <div className="section-sub">Select from registered users — then fill in their department and position.</div>
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
                          ...rawRespondents.map(r => r.email),
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
                  {inviting ? 'Adding…' : `Add ${inviteRows.filter(r => r.email.trim()).length || ''} Respondent${inviteRows.filter(r => r.email.trim()).length !== 1 ? 's' : ''} →`}
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
                              <td>{r.used ? <span className="tag tag-active">✓ Done</span> : <span className="tag tag-pending">Pending</span>}</td>
                              <td>{!r.used && <a href={surveyUrl(r.token)} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontSize: 12, textDecoration: 'none' }}>Open Link ↗</a>}</td>
                              <td><button onClick={() => { if (window.confirm(r.used ? `Delete ${r.email} AND their submitted response? This permanently removes the test entry.` : `Remove ${r.email}?`)) removeRespondent(r.id) }} style={{ background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 12 }}>{r.used ? 'Delete' : 'Remove'}</button></td>
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
                <ExportMenu filename="DBN-Analytics" getRows={buildAnalyticsRows} buildPdf={buildAnalyticsPdf} />
              </div>
              <div className="page-hero">
                <div className="hero-title">Analytics</div>
                <div className="hero-sub">Per-question analysis — scores, distributions, choices, and open responses.</div>
              </div>

              {responses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No Responses Yet</div>
                  <div style={{ fontSize: 14, maxWidth: 360, margin: '0 auto' }}>Analytics will appear once respondents submit their surveys.</div>
                </div>
              ) : (
                <>
                  <div className="card mb-24" style={{ background: 'linear-gradient(135deg, #0D1F3C 0%, #0E3462 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(27,191,176,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center', position: 'relative', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Responses', value: enrichedResponses.length },
                        { label: 'Completion Rate', value: `${completionPct}%` },
                        ...(overallScore != null ? [{ label: 'Overall Score', value: `${overallScore}%`, highlight: true }] : []),
                        { label: 'Questions', value: questions.length },
                        ...(dimensionScores.length > 0 ? [{ label: 'Dimensions', value: dimensionScores.length }] : []),
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 36, fontWeight: 800, color: s.highlight ? scoreColor(overallScore) : '#1BBFB0' }}>{s.value}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {departments.length > 0 && (
                    <div className="card mb-24">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)', flexShrink: 0 }}>Filter by Department:</span>
                        {['', ...departments].map(d => (
                          <button key={d || 'all'} onClick={() => setFilterDept(d)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filterDept === d ? 'var(--teal)' : 'var(--border)'}`, background: filterDept === d ? 'var(--teal-light)' : 'white', color: filterDept === d ? '#0A8A7E' : 'var(--text2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {d || 'All'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dept + Dimension summaries */}
                  {(deptScores.length > 0 || dimensionScores.length > 0) && likertQs.length > 0 && (
                    <div className="grid-2 mb-24">
                      {deptScores.length > 0 && (
                        <div className="card">
                          <div className="section-title mb-2">Score by Department</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
                            {deptQuestion ? <>Grouped by: <em>"{deptQuestion.text}"</em></> : 'Average Likert score · participation in brackets'}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11 }}>Department</th>
                                <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11 }}>{deptQuestion ? 'Responses' : 'Participation'}</th>
                                <th style={{ textAlign: 'right', padding: '6px 0', color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', fontSize: 11 }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...deptScores].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map(({ dept, total, responded, score, answerBased }) => {
                                const pct = total > 0 ? Math.round((responded / total) * 100) : 0
                                return (
                                  <tr key={dept}>
                                    <td style={{ padding: '9px 0', fontWeight: 600, color: 'var(--navy)', borderBottom: '1px solid var(--border)' }}>{dept}</td>
                                    <td style={{ padding: '9px 0', textAlign: 'right', color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>
                                      {answerBased
                                        ? <>{responded}</>
                                        : <>{responded}/{total} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({pct}%)</span></>
                                      }
                                    </td>
                                    <td style={{ padding: '9px 0', textAlign: 'right', fontWeight: 800, fontSize: 15, color: scoreColor(score), borderBottom: '1px solid var(--border)' }}>{score != null ? `${score}%` : '—'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {dimensionScores.length > 0 && (
                        <div className="card">
                          <div className="section-title mb-4">Score by Dimension</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Average Likert score per theme · sorted high to low</div>
                          {dimensionScores.map(({ dim, score, questionCount }) => (
                            <div key={dim} style={{ marginBottom: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <div>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{dim}</span>
                                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{questionCount}Q</span>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(score) }}>{score != null ? `${score}%` : '—'}</span>
                              </div>
                              {score != null && <ScoreBar score={score} height={6} />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {questions.map(q => (
                    <QuestionAnalyticsCard key={q.id} q={q} responses={enrichedResponses} filterDept={filterDept} />
                  ))}
                </>
              )}
            </div>
          )}

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
      </div>

      {/* CSV Import Modal */}
      {showCSV && <CSVImportModal onImport={handleCSVImport} onClose={() => setShowCSV(false)} />}
    </div>
  )
}
