import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function HistogramDisplay({ counts }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!counts || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const data = Object.entries(counts).map(([key, value]) => ({
      state: key,
      count: value
    }));

    const x = d3.scaleBand()
      .domain(data.map(d => d.state))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(5))
      .append('text')
      .attr('x', 2)
      .attr('y', y(y.ticks(5)[1]))
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .text('Count');

    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.state))
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.count))
      .attr('fill', '#4CAF50');

  }, [counts]);

  return (
    <div className="histogram-container">
      <svg 
        ref={svgRef} 
        width={400} 
        height={300}
        viewBox="0 0 400 300"
      />
    </div>
  );
}
