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
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0', color: '#888', fontWeight: '500' }}></th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', color: '#888', fontWeight: '500' }}>{localidadSel.NOMBRE}</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', color: '#888', fontWeight: '500' }}>Bogotá</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', color: '#888', fontWeight: '500' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  <FilaPct label="Escuelas" valor={localidadSel.n_escuelas} total={totalEscuelas} />
                  <FilaPct label="Oficiales" valor={localidadSel.oficial} total={oficiales} color="#e74c3c" />
                  <FilaPct label="Privadas" valor={localidadSel.privado} total={privadas} color="#3498db" />
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de escuelas */}
      <TablaEscuelas
        escuelas={hayFiltro ? escuelasFiltradas : escuelas}
        localidadSel={localidadSel}
      />

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

// Fila de la tabla localidad vs Bogotá con porcentaje
function FilaPct({ label, valor, total, color }) {
  const pct = total > 0 ? (valor / total * 100) : 0
  return (
    <tr style={{ borderTop: '1px solid #f0f0f0' }}>
      <td style={{ padding: '5px 0', color: '#555' }}>{label}</td>
      <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: '600', color: color || '#2c3e50' }}>
        {valor.toLocaleString('es-CO')}
      </td>
      <td style={{ textAlign: 'right', padding: '5px 8px', color: '#aaa' }}>
        {total.toLocaleString('es-CO')}
      </td>
      <td style={{ textAlign: 'right', padding: '5px 0' }}>
        <span style={{
          background: '#3498db15', color: '#2980b9', fontWeight: '600',
          padding: '2px 6px', borderRadius: '8px', fontSize: '11px',
        }}>
          {pct.toFixed(1).replace('.', ',')}%
        </span>
      </td>
    </tr>
  )
}

// Tabla de escuelas de la localidad seleccionada
function TablaEscuelas({ escuelas, localidadSel }) {
  if (!localidadSel || !escuelas) return null

  const lista = escuelas
    .filter(e => e.localidad === localidadSel.NOMBRE)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div style={{
      marginTop: '16px', background: 'white', borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
          Escuelas en {localidadSel.NOMBRE}
        </span>
        <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
          ({lista.length})
        </span>
      </div>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
              <th style={{ textAlign: 'left', padding: '8px 16px', color: '#888', fontWeight: '500' }}>Nombre</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontWeight: '500' }}>Sector</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888', fontWeight: '500' }}>Zona</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(e => (
              <tr key={e.codigo} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 16px', color: '#2c3e50' }}>{e.nombre}</td>
                <td style={{ padding: '6px 12px' }}>
                  <span style={{
                    padding: '1px 8px', borderRadius: '8px', fontSize: '11px',
                    background: e.sector === 'oficial' ? '#e74c3c15' : '#3498db15',
                    color: e.sector === 'oficial' ? '#c0392b' : '#2471a3',
                  }}>
                    {e.sector}
                  </span>
                </td>
                <td style={{ padding: '6px 12px', color: '#888' }}>{e.zona}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
