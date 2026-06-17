import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#EEF5F9', fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>⚠</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#0D1F3C', marginBottom: 10 }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 14, color: '#8A9BB0', maxWidth: 400, lineHeight: 1.7, marginBottom: 28 }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </div>
        <button
          onClick={() => { this.setState({ error: null }); window.location.reload() }}
          style={{
            padding: '11px 28px', borderRadius: 10, border: 'none',
            background: '#1BBFB0', color: 'white', fontWeight: 700,
            fontSize: 14, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Reload page
        </button>
        <details style={{ marginTop: 20, fontSize: 11, color: '#8A9BB0', maxWidth: 480, textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer' }}>Technical details</summary>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.stack}
          </pre>
        </details>
      </div>
    )
  }
}
