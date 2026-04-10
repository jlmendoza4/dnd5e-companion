import { Component } from 'react'

/**
 * ErrorBoundary — Captura errores de render en componentes hijo.
 *
 * Uso:
 *   <ErrorBoundary label="Compendio">
 *     <Compendium />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error desconocido' }
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary:${this.props.label || 'unknown'}]`, error, info)
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.label || 'Este módulo'
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-danger, #e74c3c)',
          background: 'var(--bg-card, #1a1a2e)',
          borderRadius: '8px',
          border: '1px solid var(--color-danger, #e74c3c)',
          margin: '1rem',
        }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</p>
          <p><strong>{label} ha encontrado un error.</strong></p>
          <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>
            {this.state.message}
          </p>
          <button
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'var(--gold, #d4af37)',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
