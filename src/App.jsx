// Mapa interactivo de escuelas de Bogotá — D3 + React
// Fuente: Colombia_CE_coordenadas.csv (directorio DANE 2022)
import { useState, useEffect, useMemo } from 'react'
import * as topojson from 'topojson-client'
import MapaBogota, { METRICAS } from './components/MapaBogota'
import BarrasLocalidades from './components/BarrasLocalidades'
import './App.css'

function App() {
  const [geojson, setGeojson] = useState(null)
  const [escuelas, setEscuelas] = useState(null)
  const [error, setError] = useState(null)
  const [metricaId, setMetricaId] = useState('n_escuelas')
  const [mostrarEscuelas, setMostrarEscuelas] = useState(false)
  const [localidadSel, setLocalidadSel] = useState(null)
  const [filtroSector, setFiltroSector] = useState('todos')   // todos | oficial | privado

  const metricaSel = METRICAS.find(m => m.id === metricaId)
  const hayFiltro = filtroSector !== 'todos'

  // Cargar datos al montar
  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(base + 'localidades.topojson').then(r => {
        if (!r.ok) throw new Error(`TopoJSON HTTP ${r.status}`)
        return r.json()
      }),
      fetch(base + 'escuelas_bogota.json').then(r => {
        if (!r.ok) throw new Error(`Escuelas HTTP ${r.status}`)
        return r.json()
      }),
    ]).then(([topo, escRaw]) => {
      // Convertir TopoJSON → GeoJSON
      const objName = Object.keys(topo.objects)[0]
      const geo = topojson.feature(topo, topo.objects[objName])
      setGeojson(geo)

      // Desempacar claves compactas del JSON de escuelas
      setEscuelas(escRaw.map(e => ({
        codigo: e.c, nombre: e.n,
        lon: e.lo, lat: e.la,
        sector: e.s === 1 ? 'oficial' : 'privado',
        zona: e.z === 1 ? 'urbana' : 'rural',
        localidad: e.l,
      })))
    }).catch(err => {
      console.error('Error cargando datos:', err)
      setError(err.message)
    })
  }, [])

  // Escuelas filtradas (debe ir antes del return condicional — regla de hooks)
  const escuelasFiltradas = useMemo(() => {
    if (!escuelas) return []
    return escuelas.filter(e => {
      if (filtroSector !== 'todos' && e.sector !== filtroSector) return false
      return true
    })
  }, [escuelas, filtroSector])

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <div style={{ color: '#e74c3c', fontSize: '16px', marginBottom: '8px' }}>Error al cargar datos</div>
        <div style={{ color: '#999', fontSize: '13px' }}>{error}</div>
      </div>
    )
  }

  if (!geojson || !escuelas) {
    return <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>Cargando mapa...</div>
  }

  // Estadísticas totales
  const totalEscuelas = escuelas.length
  const privadas = escuelas.filter(e => e.sector === 'privado').length
  const oficiales = escuelas.filter(e => e.sector === 'oficial').length
  const localidades = new Set(escuelas.map(e => e.localidad)).size

  return (
    <div>
      {/* Header */}
      <header style={{
        background: 'white', borderRadius: '12px', padding: '20px 24px',
        marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#2c3e50', marginBottom: '4px' }}>
          Escuelas de Bogotá
        </h1>
        <p style={{ fontSize: '13px', color: '#888' }}>
          Mapa interactivo · {totalEscuelas.toLocaleString('es-CO')} sedes educativas en {localidades} localidades
        </p>

        {/* Resumen Bogotá */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <Stat label="Total escuelas" value={totalEscuelas} color="#e74c3c" />
          <Stat label="Oficiales" value={oficiales} color="#2ecc71" />
          <Stat label="Privadas" value={privadas} color="#3498db" />
          <Stat label="Localidades" value={localidades} color="#9b59b6" />
        </div>
      </header>

      {/* Controles */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '12px 16px',
        marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {/* Fila 1: métrica del coroplético */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#888', minWidth: '80px' }}>Colorear por:</span>
          {METRICAS.map(m => (
            <button
              key={m.id}
              onClick={() => setMetricaId(m.id)}
              style={{
                padding: '4px 12px', borderRadius: '16px', fontSize: '11px',
                border: metricaId === m.id ? '2px solid #3498db' : '1px solid #ddd',
                background: metricaId === m.id ? '#ebf5fb' : 'white',
                color: metricaId === m.id ? '#2980b9' : '#888',
                fontWeight: metricaId === m.id ? '600' : '400',
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Fila 2: filtros de escuelas */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
          <span style={{ fontSize: '12px', color: '#888', minWidth: '80px' }}>Escuelas:</span>

          {/* Toggle mostrar puntos */}
          <label style={{ fontSize: '12px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="checkbox" checked={mostrarEscuelas || hayFiltro} onChange={e => setMostrarEscuelas(e.target.checked)} />
            Mostrar puntos
          </label>

          <div style={{ width: '1px', height: '20px', background: '#e0e0e0' }} />

          {/* Filtro sector */}
          <span style={{ fontSize: '11px', color: '#aaa' }}>Sector:</span>
          {[
            { val: 'todos', label: 'Todas' },
            { val: 'oficial', label: 'Oficial', color: '#e74c3c' },
            { val: 'privado', label: 'Privada', color: '#3498db' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setFiltroSector(opt.val)}
              style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                border: filtroSector === opt.val ? `2px solid ${opt.color || '#666'}` : '1px solid #ddd',
                background: filtroSector === opt.val ? (opt.color ? opt.color + '15' : '#f5f5f5') : 'white',
                color: filtroSector === opt.val ? (opt.color || '#444') : '#999',
                fontWeight: filtroSector === opt.val ? '600' : '400',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}

          {/* Limpiar filtros */}
          {hayFiltro && (
            <button
              onClick={() => setFiltroSector('todos')}
              style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                border: '1px solid #ddd', background: '#fff5f5', color: '#c0392b',
                cursor: 'pointer',
              }}
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {/* Contador de filtro */}
        {hayFiltro && (
          <div style={{ fontSize: '12px', color: '#555', background: '#f0f7ff', padding: '6px 12px', borderRadius: '8px' }}>
            Mostrando <strong>{escuelasFiltradas.length.toLocaleString('es-CO')}</strong> de {totalEscuelas.toLocaleString('es-CO')} escuelas
            {filtroSector !== 'todos' && <> · sector: <strong>{filtroSector}</strong></>}
          </div>
        )}
      </div>

      {/* Mapa + Barras lado a lado */}
      <div style={{
        display: 'flex', gap: '16px', flexWrap: 'wrap',
      }}>
        {/* Mapa */}
        <div style={{
          flex: '1 1 520px', background: 'white', borderRadius: '12px',
          padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <MapaBogota
            geojson={geojson}
            escuelas={hayFiltro ? escuelasFiltradas : escuelas}
            metricaId={metricaId}
            mostrarEscuelas={mostrarEscuelas || hayFiltro}
            onSelectLocalidad={setLocalidadSel}
          />
        </div>

        {/* Panel derecho */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Barras */}
          <div style={{
            background: 'white', borderRadius: '12px', padding: '16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
              {metricaSel?.label} por localidad
            </h3>
            <BarrasLocalidades
              geojson={geojson}
              metricaId={metricaId}
              onSelectLocalidad={setLocalidadSel}
            />
          </div>

          {/* Detalle localidad */}
          {localidadSel && (
            <div style={{
              background: 'white', borderRadius: '12px', padding: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #3498db',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2c3e50' }}>
                  {localidadSel.NOMBRE}
                </h3>
                <button
                  onClick={() => setLocalidadSel(null)}
                  style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#999' }}
                >&times;</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
                <div><span style={{ color: '#888' }}>Escuelas:</span> <strong>{localidadSel.n_escuelas}</strong></div>
                <div><span style={{ color: '#888' }}>Oficiales:</span> <strong>{localidadSel.oficial}</strong></div>
                <div><span style={{ color: '#888' }}>Privadas:</span> <strong>{localidadSel.privado}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fuente */}
      <footer style={{
        marginTop: '16px', padding: '12px 16px', fontSize: '11px', color: '#999',
        background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        lineHeight: '1.6',
      }}>
        <strong style={{ color: '#666' }}>Fuente:</strong> Directorio de sedes educativas georreferenciadas del DANE (2022).
        Cálculos para Bogotá urbana (sin Sumapaz).
      </footer>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: `${color}10`, borderRadius: '8px', padding: '8px 16px',
      flex: '1 1 100px', minWidth: '100px',
    }}>
      <div style={{ fontSize: '20px', fontWeight: '700', color }}>
        {value.toLocaleString('es-CO')}
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>{label}</div>
    </div>
  )
}

export default App
