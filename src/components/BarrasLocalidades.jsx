// Gráfico de barras horizontales por localidad
// Complementa el mapa con un ranking visual
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { METRICAS } from './MapaBogota'

export default function BarrasLocalidades({ geojson, metricaId, onSelectLocalidad }) {
  const svgRef = useRef()

  useEffect(() => {
    if (!geojson || !geojson.features) return

    const margin = { top: 8, right: 50, bottom: 10, left: 130 }
    const barH = 22
    const data = geojson.features
      .map(f => ({ nombre: f.properties.NOMBRE, valor: f.properties[metricaId] || 0, props: f.properties }))
      .filter(d => d.valor > 0)
      .sort((a, b) => b.valor - a.valor)

    const width = 380
    const height = margin.top + data.length * barH + margin.bottom

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
    svg.selectAll('*').remove()

    if (data.length === 0) {
      svg.attr('height', 30)
      svg.append('text').attr('x', 10).attr('y', 20)
        .attr('font-size', '11px').attr('fill', '#999')
        .text('Sin datos')
      return
    }

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.valor)])
      .range([0, width - margin.left - margin.right])

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Barras
    g.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('y', (d, i) => i * barH + 2)
      .attr('width', 0)
      .attr('height', barH - 4)
      .attr('rx', 3)
      .attr('fill', '#3498db')
      .attr('fill-opacity', 0.7)
      .attr('cursor', 'pointer')
      .on('mouseover', function () { d3.select(this).attr('fill-opacity', 1) })
      .on('mouseout', function () { d3.select(this).attr('fill-opacity', 0.7) })
      .on('click', (event, d) => { if (onSelectLocalidad) onSelectLocalidad(d.props) })
      .transition()
      .duration(500)
      .delay((d, i) => i * 30)
      .attr('width', d => x(d.valor))

    // Etiquetas localidad
    g.selectAll('text.label')
      .data(data)
      .join('text')
      .attr('class', 'label')
      .attr('x', -8)
      .attr('y', (d, i) => i * barH + barH / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#555')
      .text(d => d.nombre)

    // Valores
    g.selectAll('text.value')
      .data(data)
      .join('text')
      .attr('class', 'value')
      .attr('x', d => x(d.valor) + 6)
      .attr('y', (d, i) => i * barH + barH / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#888')
      .text(d => d.valor.toLocaleString('es-CO'))

  }, [geojson, metricaId, onSelectLocalidad])

  return <svg ref={svgRef} style={{ display: 'block' }} />
}
