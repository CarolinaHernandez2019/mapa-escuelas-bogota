// Mapa coroplético de Bogotá con D3 geo
// Muestra localidades coloreadas por número de escuelas (total, oficial, privado)
// Puntos de escuelas opcionales
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

// Métricas disponibles para colorear el mapa
const METRICAS = [
  { id: 'n_escuelas', label: 'Escuelas', formato: d => d.toLocaleString('es-CO'), color: 'Blues' },
  { id: 'oficial', label: 'Oficiales', formato: d => d.toLocaleString('es-CO'), color: 'Oranges' },
  { id: 'privado', label: 'Privadas', formato: d => d.toLocaleString('es-CO'), color: 'Purples' },
]

export default function MapaBogota({ geojson, escuelas, metricaId, mostrarEscuelas, onSelectLocalidad }) {
  const svgRef = useRef()
  const tooltipRef = useRef()

  const metrica = METRICAS.find(m => m.id === metricaId) || METRICAS[0]

  useEffect(() => {
    if (!geojson || !geojson.features) return

    // Filtrar Sumapaz (rural, sin datos, distorsiona el mapa)
    const geoFiltrado = {
      ...geojson,
      features: geojson.features.filter(f =>
        f.properties.NOMBRE?.toUpperCase() !== 'SUMAPAZ'
      )
    }

    const width = 520
    const height = 680
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
    svg.selectAll('*').remove()

    const tooltip = d3.select(tooltipRef.current)

    // Proyección centrada en Bogotá urbana (sin Sumapaz)
    const projection = d3.geoMercator()
      .fitExtent([[20, 20], [width - 20, height - 20]], geoFiltrado)

    const path = d3.geoPath().projection(projection)

    // Escala de color
    const values = geoFiltrado.features
      .map(f => f.properties[metrica.id])
      .filter(v => v != null && v > 0)

    const colorScale = d3.scaleSequential()
      .domain([d3.min(values) || 0, d3.max(values) || 1])
      .interpolator(d3['interpolate' + metrica.color])

    // Dibujar localidades
    const g = svg.append('g')

    g.selectAll('path')
      .data(geoFiltrado.features)
      .join('path')
      .attr('d', path)
      .attr('fill', d => {
        const v = d.properties[metrica.id]
        return v != null && v > 0 ? colorScale(v) : '#e8e8e8'
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 2.5)
        const p = d.properties
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${p.NOMBRE}</strong><br/>
            <hr style="border:none;border-top:1px solid #eee;margin:4px 0"/>
            Escuelas: <strong>${p.n_escuelas}</strong><br/>
            Oficiales: <strong>${p.oficial}</strong> · Privadas: <strong>${p.privado}</strong>
          `)
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', (event.pageX + 14) + 'px')
          .style('top', (event.pageY - 10) + 'px')
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5)
        tooltip.style('opacity', 0)
      })
      .on('click', function (event, d) {
        if (onSelectLocalidad) onSelectLocalidad(d.properties)
      })

    // Etiquetas de localidades
    g.selectAll('text.loc-label')
      .data(geoFiltrado.features)
      .join('text')
      .attr('class', 'loc-label')
      .attr('transform', d => `translate(${path.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '8px')
      .attr('font-weight', '500')
      .attr('fill', '#333')
      .attr('pointer-events', 'none')
      .attr('opacity', 0.7)
      .text(d => {
        const name = d.properties.NOMBRE
        return name.length > 12 ? name.slice(0, 11) + '…' : name
      })

    // Puntos de escuelas
    if (mostrarEscuelas && escuelas) {
      const escG = svg.append('g').attr('class', 'escuelas')

      escG.selectAll('circle')
        .data(escuelas)
        .join('circle')
        .attr('cx', d => projection([d.lon, d.lat])?.[0])
        .attr('cy', d => projection([d.lon, d.lat])?.[1])
        .attr('r', 2)
        .attr('fill', d => d.sector === 'oficial' ? '#e74c3c' : '#3498db')
        .attr('fill-opacity', 0.65)
        .attr('stroke', 'none')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('r', 6).attr('fill-opacity', 1)
          tooltip
            .style('opacity', 1)
            .html(`
              <strong>${d.nombre}</strong><br/>
              ${d.localidad}<br/>
              Sector: ${d.sector} · Zona: ${d.zona}
            `)
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', (event.pageX + 14) + 'px')
            .style('top', (event.pageY - 10) + 'px')
        })
        .on('mouseout', function () {
          d3.select(this).attr('r', 2).attr('fill-opacity', 0.65)
          tooltip.style('opacity', 0)
        })
    }

    // Leyenda
    const legendW = 200, legendH = 12
    const legendG = svg.append('g')
      .attr('transform', `translate(${width - legendW - 30}, ${height - 50})`)

    const defs = svg.append('defs')
    const gradient = defs.append('linearGradient').attr('id', 'legend-grad')
    const nStops = 10
    for (let i = 0; i <= nStops; i++) {
      const t = i / nStops
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(d3.min(values) + t * (d3.max(values) - d3.min(values))))
    }

    legendG.append('rect')
      .attr('width', legendW)
      .attr('height', legendH)
      .attr('rx', 3)
      .style('fill', 'url(#legend-grad)')

    legendG.append('text')
      .attr('y', -4)
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text(metrica.label)

    legendG.append('text')
      .attr('y', legendH + 14)
      .attr('font-size', '9px')
      .attr('fill', '#999')
      .text(metrica.formato(d3.min(values) || 0))

    legendG.append('text')
      .attr('x', legendW)
      .attr('y', legendH + 14)
      .attr('text-anchor', 'end')
      .attr('font-size', '9px')
      .attr('fill', '#999')
      .text(metrica.formato(d3.max(values) || 0))

  }, [geojson, escuelas, metricaId, mostrarEscuelas, onSelectLocalidad])

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block', margin: '0 auto' }} />
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          opacity: 0,
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '12px',
          lineHeight: '1.5',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          zIndex: 1000,
          maxWidth: '300px',
          transition: 'opacity 0.15s',
        }}
      />
    </div>
  )
}

export { METRICAS }
