import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Capturar errores de renderizado que React no muestra
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error: error.message }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <div style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '8px' }}>
            Error en la aplicación
          </div>
          <div style={{ color: '#999', fontSize: '13px', maxWidth: '500px', margin: '0 auto' }}>
            {this.state.error}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
