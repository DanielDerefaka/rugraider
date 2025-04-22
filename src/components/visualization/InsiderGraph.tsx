'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { TokenInsiderGraph } from '@/types/token';
import { formatAddress } from '@/lib/utils';

interface InsiderGraphProps {
  data: TokenInsiderGraph;
  width?: number;
  height?: number;
  className?: string;
}

export const InsiderGraph: React.FC<InsiderGraphProps> = ({
  data,
  width = 600,
  height = 400,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; content: string; x: number; y: number }>({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });
  
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    
    // Create a simulation with forces
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // Create links
    const link = svg.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke-width', d => Math.sqrt(d.value));
    
    // Define node colors based on type
    const nodeColor = (type: string) => {
      switch (type) {
        case 'token':
          return '#6366f1'; // primary-500
        case 'deployer':
          return '#ef4444'; // red-500
        case 'holder':
          return '#10b981'; // green-500
        case 'exchange':
          return '#f59e0b'; // amber-500
        default:
          return '#9ca3af'; // gray-400
      }
    };
    
    // Create nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('mouseover', (event, d: any) => {
        setTooltip({
          visible: true,
          content: `${d.type}: ${formatAddress(d.address)}`,
          x: event.pageX,
          y: event.pageY,
        });
      })
      .on('mouseout', () => {
        setTooltip({ ...tooltip, visible: false });
      })
      .call(drag(simulation) as any);
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', d => Math.max(5, Math.sqrt(d.weight) * 3))
      .attr('fill', d => nodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    
    // Add text labels to important nodes
    node.append('text')
      .attr('dx', 12)
      .attr('dy', '.35em')
      .text(d => {
        // Only show labels for tokens and deployers
        if (d.type === 'token' || d.type === 'deployer') {
          return d.type === 'token' ? 'Token' : 'Deployer';
        }
        return '';
      })
      .attr('font-size', '10px')
      .attr('fill', '#4b5563');
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => Math.max(5, Math.min(width - 5, d.source.x)))
        .attr('y1', d => Math.max(5, Math.min(height - 5, d.source.y)))
        .attr('x2', d => Math.max(5, Math.min(width - 5, d.target.x)))
        .attr('y2', d => Math.max(5, Math.min(height - 5, d.target.y)));
        
      node
        .attr('transform', d => `translate(${Math.max(5, Math.min(width - 5, d.x))},${Math.max(5, Math.min(height - 5, d.y))})`);
    });
    
    // Drag functionality
    function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
    
    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [data, width, height, tooltip]);
  
  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-white border rounded-lg shadow-sm"
      ></svg>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-10 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-sm pointer-events-none"
          style={{
            left: tooltip.x + 10 + 'px',
            top: tooltip.y - 10 + 'px',
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.content}
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-2 rounded-md text-xs">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: '#6366f1' }}></div>
          <span>Token</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
          <span>Deployer</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
          <span>Holder</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Exchange</span>
        </div>
      </div>
    </div>
  );
};