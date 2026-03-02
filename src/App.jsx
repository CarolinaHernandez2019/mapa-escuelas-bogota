// Mapa interactivo de escuelas de Bogotá — D3 + React
import { useState, useEffect, useMemo } from 'react'
import * as topojson from 'topojson-client'
import MapaBogota, { METRICAS, MIN_COBERTURA } from './components/MapaBogota'
import BarrasLocalidades from './components/BarrasLocalidades'
import './App.css'

function App() {
  const [geojson, setGeojson] = useState(null)
  const [escuelas, setEscuelas] = useState(null)
  const [metricaId, setMetricaId] = useState('n_escuelas')
  const [mostrarEscuelas, setMostrarEscuelas] = useState(false)
  const [localidadSel, setLocalidadSel] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [escuelaSel, setEscuelaSel] = useState(null)
  const [filtroSector, setFiltroSector] = useState('todos')   // todos | oficial | privado
  const [filtroInternet, setFiltroInternet] = useState('todos') // todos | con | sin

  const metricaSel = METRICAS.find(m => m.id === metricaId)
  const hayFiltro = filtroSector !== 'todos' || filtroInternet !== 'todos'

  // Cargar datos al montar
  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(base + 'localidades.topojson').then(r => r.json()),
      fetch(base + 'escuelas_bogota.json').then(r => r.json()),
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
        matricula: e.m || 0,
        internet: e.i === 1,
        abandono: e.ab ?? null,
        aprobacion: e.ap ?? null,
        nse: e.ns ?? null,
      })))
    }).catch(err => console.error('Error cargando datos:', err))
  }, [])

  // Resultados de búsqueda
  const resultados = useMemo(() => {
    if (!escuelas || busqueda.length < 3) return []
    const q = busqueda.toLowerCase()
    return escuelas
      .filter(e => e.nombre.toLowerCase().includes(q) || e.codigo.includes(q))
      .slice(0, 15)
  }, [escuelas, busqueda])

  // Promedios de Bogotá (solo escuelas con indicadores)
  const promBogota = useMemo(() => {
    if (!escuelas) return {}
    const conInd = escuelas.filter(e => e.matricula > 0)
    const n = conInd.length
    if (n === 0) return {}
    const sum = (arr, key) => arr.reduce((s, e) => s + (e[key] || 0), 0)
    const avg = (arr, key) => {
      const vals = arr.filter(e => e[key] != null && e[key] > 0)
      return vals.length > 0 ? sum(vals, key) / vals.length : null
    }
    return {
      matricula: Math.round(sum(conInd, 'matricula') / n),
      abandono: avg(conInd, 'abandono'),
      aprobacion: avg(conInd, 'aprobacion'),
      nse: avg(conInd, 'nse'),
      pct_internet: ((conInd.filter(e => e.internet).length / n) * 100),
    }
  }, [escuelas])

  if (!geojson || !escuelas) {
    return <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>Cargando mapa...</div>
  }

  // Escuelas filtradas
  const escuelasFiltradas = useMemo(() => {
    if (!escuelas) return []
    return escuelas.filter(e => {
      if (filtroSector !== 'todos' && e.sector !== filtroSector) return false
      if (filtroInternet === 'con' && !e.internet) return false
      if (filtroInternet === 'sin' && e.internet) return false
      return true
    })
  }, [escuelas, filtroSector, filtroInternet])

  // Estadísticas totales
  const totalEscuelas = escuelas.length
  const privadas = escuelas.filter(e => e.sector === 'privado').length
  const oficiales = escuelas.filter(e => e.sector === 'oficial').length
  const localidades = new Set(escuelas.map(e => e.localidad)).size

  // Seleccionar escuela desde el buscador
  const seleccionarEscuela = (esc) => {
    setEscuelaSel(esc)
    setBusqueda('')
  }

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

        {/* Resumen Bogotá — siempre visible */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <Stat label="Total escuelas" value={totalEscuelas} color="#e74c3c" />
          <Stat label="Oficiales" value={oficiales} color="#2ecc71" />
          <Stat label="Privadas" value={privadas} color="#3498db" />
          <Stat label="Localidades" value={localidades} color="#9b59b6" />
        </div>
      </header>

      {/* Buscador de escuelas */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '12px 16px',
        marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>&#128269;</span>
          <input
            type="text"
            placeholder="Buscar escuela por nombre o código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              border: 'none', outline: 'none', fontSize: '13px', width: '100%',
              background: 'transparent', color: '#2c3e50',
            }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#999' }}
            >&times;</button>
          )}
        </div>

        {/* Resultados de búsqueda */}
        {resultados.length > 0 && (
          <div style={{
            marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px',
            maxHeight: '240px', overflowY: 'auto',
          }}>
            {resultados.map(e => (
              <div
                key={e.codigo}
                onClick={() => seleccionarEscuela(e)}
                style={{
                  padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '12px', lineHeight: '1.4',
                }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#f0f7ff'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <strong>{e.nombre}</strong><br/>
                <span style={{ color: '#888' }}>
                  {e.localidad} · {e.sector} · {e.zona}
                  {e.matricula > 0 ? ` · ${e.matricula.toLocaleString('es-CO')} estudiantes` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
        {busqueda.length >= 3 && resultados.length === 0 && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
            No se encontraron escuelas con "{busqueda}"
          </div>
        )}
      </div>

      {/* Ficha de escuela seleccionada */}
      {escuelaSel && (
        <FichaEscuela escuela={escuelaSel} promBogota={promBogota} onClose={() => setEscuelaSel(null)} />
      )}

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

          <div style={{ width: '1px', height: '20px', background: '#e0e0e0' }} />

          {/* Filtro internet */}
          <span style={{ fontSize: '11px', color: '#aaa' }}>Internet:</span>
          {[
            { val: 'todos', label: 'Todas' },
            { val: 'con', label: 'Con internet', color: '#27ae60' },
            { val: 'sin', label: 'Sin internet', color: '#e74c3c' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setFiltroInternet(opt.val)}
              style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                border: filtroInternet === opt.val ? `2px solid ${opt.color || '#666'}` : '1px solid #ddd',
                background: filtroInternet === opt.val ? (opt.color ? opt.color + '15' : '#f5f5f5') : 'white',
                color: filtroInternet === opt.val ? (opt.color || '#444') : '#999',
                fontWeight: filtroInternet === opt.val ? '600' : '400',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}

          {/* Limpiar filtros */}
          {hayFiltro && (
            <button
              onClick={() => { setFiltroSector('todos'); setFiltroInternet('todos') }}
              style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                border: '1px solid #ddd', background: '#fff5f5', color: '#c0392b',
                cursor: 'pointer',
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Contador de filtro */}
        {hayFiltro && (
          <div style={{ fontSize: '12px', color: '#555', background: '#f0f7ff', padding: '6px 12px', borderRadius: '8px' }}>
            Mostrando <strong>{escuelasFiltradas.length.toLocaleString('es-CO')}</strong> de {totalEscuelas.toLocaleString('es-CO')} escuelas
            {filtroSector !== 'todos' && <> · sector: <strong>{filtroSector}</strong></>}
            {filtroInternet !== 'todos' && <> · internet: <strong>{filtroInternet === 'sin' ? 'sin' : 'con'}</strong></>}
          </div>
        )}
      </div>

      {/* Advertencia métrica parcial */}
      {metricaSel?.parcial && (
        <div style={{
          fontSize: '11px', color: '#b08820', background: '#fef9e7',
          padding: '6px 12px', borderRadius: '8px', marginBottom: '12px',
          border: '1px solid #f9e79f',
        }}>
          Datos parciales: esta métrica solo incluye escuelas con información en la encuesta EDUC ({'>'}10% de cobertura).
          Localidades en gris no tienen datos suficientes.
        </div>
      )}

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
            filtroInternet={filtroInternet}
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
                <div><span style={{ color: '#888' }}>Oficial:</span> <strong>{localidadSel.oficial}</strong></div>
                <div><span style={{ color: '#888' }}>Privado:</span> <strong>{localidadSel.privado}</strong></div>
                <div><span style={{ color: '#888' }}>Cobertura ind.:</span> <strong>{localidadSel.con_indicadores}/{localidadSel.n_escuelas}</strong></div>
                {(localidadSel.pct_cobertura || 0) >= MIN_COBERTURA && (<>
                  <div><span style={{ color: '#888' }}>Matrícula:</span> <strong>{localidadSel.matricula_total?.toLocaleString('es-CO')}</strong></div>
                  {localidadSel.abandono_prom != null && (
                    <div><span style={{ color: '#888' }}>Abandono:</span> <strong>{localidadSel.abandono_prom.toFixed(1)}%</strong></div>
                  )}
                  {localidadSel.aprobacion_prom != null && (
                    <div><span style={{ color: '#888' }}>Aprobación:</span> <strong>{localidadSel.aprobacion_prom.toFixed(1)}%</strong></div>
                  )}
                  {localidadSel.nse_prom != null && (
                    <div><span style={{ color: '#888' }}>NSE:</span> <strong>{localidadSel.nse_prom.toFixed(1)}</strong></div>
                  )}
                </>)}
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
        <strong style={{ color: '#666' }}>Fuente:</strong> Elaboración propia a partir de la encuesta de Educación
        Formal (EDUC) 2022 y datos georreferenciados de sedes educativas del DANE (2022).
        Cálculos para Bogotá urbana (sin Sumapaz).<br/>
        <strong style={{ color: '#666' }}>Indicadores:</strong>{' '}
        <strong>NSE</strong> = índice socioeconómico del DANE (1–75, combina ingresos, educación padres, vivienda) ·{' '}
        <strong>Abandono</strong> = % estudiantes que no terminan el año ·{' '}
        <strong>Aprobación</strong> = % estudiantes que aprueban el año ·{' '}
        <strong>Matrícula</strong> = estudiantes inscritos en la sede.<br/>
        <strong style={{ color: '#666' }}>Nota:</strong> Los indicadores de rendimiento (matrícula, abandono, aprobación, NSE)
        solo están disponibles para {((escuelas.filter(e => e.matricula > 0).length / escuelas.length) * 100).toFixed(0)}% de
        las escuelas (principalmente oficiales). Las localidades con menos del {MIN_COBERTURA}% de cobertura
        aparecen en gris para métricas parciales.
      </footer>
    </div>
  )
}

// Ficha detallada de una escuela con comparación contra promedio Bogotá
function FichaEscuela({ escuela, promBogota, onClose }) {
  const e = escuela
  const tieneInd = e.matricula > 0

  return (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '16px 20px',
      marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${e.sector === 'oficial' ? '#e74c3c' : '#3498db'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#2c3e50', marginBottom: '2px' }}>
            {e.nombre}
          </h3>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
            {e.localidad} · {e.sector} · {e.zona} · Código: {e.codigo}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999', marginTop: '-4px' }}
        >&times;</button>
      </div>

      {tieneInd ? (
        <div style={{ marginTop: '12px' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '4px 0', color: '#888', fontWeight: '500' }}>Indicador</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: '#888', fontWeight: '500' }}>Escuela</th>
                <th style={{ textAlign: 'right', padding: '4px 0', color: '#888', fontWeight: '500' }}>Prom. Bogotá</th>
              </tr>
            </thead>
            <tbody>
              <FilaComparacion label="Matrícula" valor={e.matricula} prom={promBogota.matricula} formato={v => v?.toLocaleString('es-CO')} />
              <FilaComparacion label="Abandono" valor={e.abandono} prom={promBogota.abandono} formato={v => v != null ? v.toFixed(1) + '%' : '—'} invertir />
              <FilaComparacion label="Aprobación" valor={e.aprobacion} prom={promBogota.aprobacion} formato={v => v != null ? v.toFixed(1) + '%' : '—'} />
              <FilaComparacion label="NSE" valor={e.nse} prom={promBogota.nse} formato={v => v != null ? v.toFixed(1) : '—'} />
              <tr style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '4px 0', color: '#555' }}>Internet</td>
                <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: '600' }}>
                  {e.internet ? 'Sí' : 'No'}
                </td>
                <td style={{ textAlign: 'right', padding: '4px 0', color: '#aaa' }}>
                  {promBogota.pct_internet?.toFixed(0)}% tienen
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#999', background: '#f8f9fa', padding: '8px 12px', borderRadius: '6px' }}>
          Esta escuela no tiene indicadores en la encuesta EDUC 2022.
          Solo se dispone de ubicación y sector.
        </div>
      )}
    </div>
  )
}

// Fila de comparación escuela vs Bogotá con indicador visual
function FilaComparacion({ label, valor, prom, formato, invertir }) {
  let color = '#555'
  let indicador = ''
  if (valor != null && prom != null) {
    const diff = valor - prom
    // Para abandono, menor es mejor (invertir)
    const mejora = invertir ? diff < 0 : diff > 0
    const empeora = invertir ? diff > 0 : diff < 0
    if (mejora) { color = '#27ae60'; indicador = ' ▲' }
    if (empeora) { color = '#e74c3c'; indicador = ' ▼' }
  }

  return (
    <tr style={{ borderTop: '1px solid #f0f0f0' }}>
      <td style={{ padding: '4px 0', color: '#555' }}>{label}</td>
      <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: '600', color }}>
        {formato(valor)}{indicador}
      </td>
      <td style={{ textAlign: 'right', padding: '4px 0', color: '#aaa' }}>
        {formato(prom)}
      </td>
    </tr>
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
