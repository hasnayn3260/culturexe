export type AnalysisGroupField = {
  key: string
  label: string
}

export type AnalysisGroupOption = {
  value: string
  assignedCount: number
  responseCount: number
}

type AnalysisScopeFilterProps = {
  fields: AnalysisGroupField[]
  selectedField: string
  selectedValue: string
  options: AnalysisGroupOption[]
  onFieldChange: (value: string) => void
  onValueChange: (value: string) => void
}

export default function AnalysisScopeFilter({
  fields,
  selectedField,
  selectedValue,
  options,
  onFieldChange,
  onValueChange,
}: AnalysisScopeFilterProps) {
  const selectedFieldLabel = fields.find(({ key }) => key === selectedField)?.label

  return (
    <div className="card mb-24" aria-label="Analysis scope">
      <div className="flex-between" style={{ alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div className="section-title mb-2">Analysis scope</div>
          <div style={{ color: 'var(--text3)', fontSize: 12.5 }}>
            View organisation-wide results or focus every analysis and export on one employee group.
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onFieldChange('')
            onValueChange('')
          }}
          disabled={!selectedField && !selectedValue}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'white',
            color: 'var(--text2)',
            cursor: selectedField || selectedValue ? 'pointer' : 'default',
            fontFamily: 'inherit',
            fontSize: 12.5,
            opacity: selectedField || selectedValue ? 1 : 0.55,
            padding: '8px 12px',
          }}
        >
          Reset to organisation-wide
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          marginTop: 18,
        }}
      >
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--navy)', fontSize: 12.5, fontWeight: 700 }}>
            Group by
          </span>
          <select
            value={selectedField}
            onChange={(event) => {
              onFieldChange(event.target.value)
              onValueChange('')
            }}
            style={{
              width: '100%',
              minHeight: 44,
              border: '1px solid var(--border)',
              borderRadius: 9,
              background: 'white',
              color: 'var(--navy)',
              fontFamily: 'inherit',
              fontSize: 13.5,
              padding: '0 12px',
            }}
          >
            <option value="">Organisation-wide</option>
            {fields.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--navy)', fontSize: 12.5, fontWeight: 700 }}>
            Specific group
          </span>
          <select
            value={selectedValue}
            disabled={!selectedField}
            onChange={(event) => onValueChange(event.target.value)}
            style={{
              width: '100%',
              minHeight: 44,
              border: '1px solid var(--border)',
              borderRadius: 9,
              background: selectedField ? 'white' : 'var(--bg)',
              color: selectedField ? 'var(--navy)' : 'var(--text3)',
              fontFamily: 'inherit',
              fontSize: 13.5,
              padding: '0 12px',
            }}
          >
            <option value="">
              {selectedFieldLabel ? `All ${selectedFieldLabel.toLowerCase()} groups` : 'Choose a grouping first'}
            </option>
            {options.map(({ value, assignedCount, responseCount }) => (
              <option key={value} value={value}>
                {value} — {responseCount} responses / {assignedCount} assigned
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
