import React, { useState, useMemo, useRef } from 'react';

interface Shot {
  p: string;    // player
  d: string;    // defender
  x: number;    // x coordinate (ft)
  y: number;    // y coordinate (ft)
  dst: number;  // distance (ft)
  ddst: number; // defender distance (ft)
  drb: number;  // dribbles
  st: string;   // shot type
  t: number;    // is three (0 or 1)
  prob: number; // expected probability (0-1)
  m: number;    // made (0 or 1)
}

interface ShotCourtProps {
  shots: Shot[];
  selectedPlayer: string;
  selectedShotType: string;
  selectedOutcome: string;
  selectedContest: string;
  onSelectShot: (shot: { distance: number; angle: number; x: number; y: number }) => void;
}

export const ShotCourt: React.FC<ShotCourtProps> = ({
  shots,
  selectedPlayer,
  selectedShotType,
  selectedOutcome,
  selectedContest,
  onSelectShot
}) => {
  // Expanded visual mode to support Grid Bins and Smooth Contour Heatmaps
  const [viewMode, setViewMode] = useState<'scatter' | 'grid' | 'heatmap'>('scatter');
  const [hoveredShot, setHoveredShot] = useState<Shot | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [customShot, setCustomShot] = useState<{ x: number; y: number; dist: number; ang: number } | null>(null);
  const [hoverCursor, setHoverCursor] = useState<{ x: number; y: number; dist: number } | null>(null);

  const courtRef = useRef<SVGSVGElement | null>(null);

  const hoopX = 0;
  const hoopY = 4.75;

  // Filter shots
  const filteredShots = useMemo(() => {
    return shots.filter(shot => {
      if (selectedPlayer !== 'All' && shot.p !== selectedPlayer) return false;
      if (selectedShotType !== 'All' && shot.st !== selectedShotType) return false;
      
      if (selectedOutcome === 'Made' && shot.m !== 1) return false;
      if (selectedOutcome === 'Missed' && shot.m !== 0) return false;

      if (selectedContest === 'Tightly Contested' && shot.ddst >= 2.0) return false;
      if (selectedContest === 'Contested' && (shot.ddst < 2.0 || shot.ddst >= 4.0)) return false;
      if (selectedContest === 'Open' && (shot.ddst < 4.0 || shot.ddst >= 6.0)) return false;
      if (selectedContest === 'Wide Open' && shot.ddst < 6.0) return false;

      return true;
    });
  }, [shots, selectedPlayer, selectedShotType, selectedOutcome, selectedContest]);

  // Heatmap/Grid calculations (Grid mode)
  const heatmapCells = useMemo(() => {
    if (viewMode !== 'grid') return [];

    const cellWidth = 2.5;
    const cellHeight = 2.5;
    const grid: { [key: string]: { x: number; y: number; shots: Shot[] } } = {};

    filteredShots.forEach(shot => {
      const colIdx = Math.floor((shot.x + 25) / cellWidth);
      const rowIdx = Math.floor(shot.y / cellHeight);
      
      const key = `${colIdx}_${rowIdx}`;
      if (!grid[key]) {
        grid[key] = {
          x: colIdx * cellWidth - 25 + cellWidth / 2,
          y: rowIdx * cellHeight + cellHeight / 2,
          shots: []
        };
      }
      grid[key].shots.push(shot);
    });

    return Object.values(grid).map(cell => {
      const attempts = cell.shots.length;
      const actualEFG = cell.shots.reduce((acc, s) => acc + (s.t === 1 ? s.m * 1.5 : s.m), 0) / attempts;
      const expectedEFG = cell.shots.reduce((acc, s) => acc + (s.t === 1 ? s.prob * 1.5 : s.prob), 0) / attempts;
      const diff = actualEFG - expectedEFG;

      return {
        x: cell.x,
        y: cell.y,
        attempts,
        efg: actualEFG,
        expectedEfg: expectedEFG,
        diff,
        color: diff > 0.03 ? 'var(--color-above)' : diff < -0.03 ? 'var(--color-below)' : 'var(--text-secondary)'
      };
    });
  }, [filteredShots, viewMode]);

  // Coordinate converters
  const getSvgX = (x: number) => (x + 25) * 10;
  const getSvgY = (y: number) => y * 10;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!courtRef.current) return;
    
    const rect = courtRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const svgWidth = rect.width;
    const svgHeight = rect.height;
    
    const scaleX = 500 / svgWidth;
    const scaleY = 400 / svgHeight;
    
    const courtX = (clickX * scaleX) / 10 - 25;
    const courtY = (clickY * scaleY) / 10;

    const dx = courtX - hoopX;
    const dy = courtY - hoopY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    setHoverCursor({
      x: courtX,
      y: courtY,
      dist: parseFloat(dist.toFixed(1))
    });
  };

  const handleCourtClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!courtRef.current) return;
    
    const rect = courtRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const svgWidth = rect.width;
    const svgHeight = rect.height;
    
    const scaleX = 500 / svgWidth;
    const scaleY = 400 / svgHeight;
    
    const courtX = (clickX * scaleX) / 10 - 25;
    const courtY = (clickY * scaleY) / 10;

    const dx = courtX - hoopX;
    const dy = courtY - hoopY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    setCustomShot({
      x: courtX,
      y: courtY,
      dist,
      ang: angle
    });

    onSelectShot({
      distance: parseFloat(dist.toFixed(1)),
      angle: parseFloat(angle.toFixed(1)),
      x: parseFloat(courtX.toFixed(1)),
      y: parseFloat(courtY.toFixed(1))
    });
  };

  const handleShotHover = (e: React.MouseEvent, shot: Shot | null) => {
    if (!shot) {
      setHoveredShot(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (parentRect) {
      setTooltipPos({
        x: rect.left - parentRect.left + 15,
        y: rect.top - parentRect.top - 100
      });
    }
    setHoveredShot(shot);
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, transparent 70%)', top: '-50px', right: '-50px', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Spatial Shot Distribution
            <span style={{ fontSize: '11px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
              Interactive
            </span>
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing {filteredShots.length} attempts
          </p>
        </div>
        
        <div className="toggle-group">
          <button 
            className={`toggle-btn ${viewMode === 'scatter' ? 'active' : ''}`}
            onClick={() => setViewMode('scatter')}
          >
            Scatter
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            Grid Bins
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'heatmap' ? 'active' : ''}`}
            onClick={() => setViewMode('heatmap')}
          >
            Density Contour
          </button>
        </div>
      </div>

      <div className="court-container" style={{ zIndex: 2, cursor: 'crosshair' }}>
        <svg 
          ref={courtRef}
          viewBox="0 0 500 400" 
          className="court-svg"
          onClick={handleCourtClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCursor(null)}
        >
          {/* SVG filter for organic density heatmap */}
          <defs>
            <filter id="smoothHeatFilter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 18 -8" result="matrix" />
            </filter>
          </defs>

          {/* Outer Boundary */}
          <rect x="0" y="0" width="500" height="400" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
          
          {/* Key (Paint) */}
          <rect x="170" y="0" width="160" height="190" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          <rect x="190" y="0" width="120" height="190" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          
          {/* Free Throw Circle */}
          <path d="M 170,190 A 60,60 0 0,1 330,190" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M 170,190 A 60,60 0 0,0 330,190" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

          {/* Backboard & Hoop */}
          <line x1="220" y1="40" x2="280" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <line x1="250" y1="40" x2="250" y2="43" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <circle cx="250" cy="47.5" r="7.5" fill="none" stroke="#ff7a00" strokeWidth="2" />
          
          {/* Restricted Area Arc */}
          <path d="M 210,47.5 A 40,40 0 0,1 290,47.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

          {/* 3 Point Line */}
          <line x1="30" y1="0" x2="30" y2="140" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <line x1="470" y1="0" x2="470" y2="140" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <path d="M 30,140 A 237.5,237.5 0 0,1 470,140" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

          {/* Center Circle (top half) */}
          <path d="M 210,400 A 40,40 0 0,1 290,400" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

          {/* Live Hover Crosshair & Distance Badge */}
          {hoverCursor && (
            <g style={{ pointerEvents: 'none' }}>
              <line 
                x1="0" 
                y1={getSvgY(hoverCursor.y)} 
                x2="500" 
                y2={getSvgY(hoverCursor.y)} 
                stroke="rgba(0, 242, 254, 0.15)" 
                strokeWidth="1" 
                strokeDasharray="3 3"
              />
              <line 
                x1={getSvgX(hoverCursor.x)} 
                y1="0" 
                x2={getSvgX(hoverCursor.x)} 
                y2="400" 
                stroke="rgba(0, 242, 254, 0.15)" 
                strokeWidth="1" 
                strokeDasharray="3 3"
              />
              <circle 
                cx="250" 
                cy="47.5" 
                r={hoverCursor.dist * 10} 
                fill="none" 
                stroke="rgba(0, 242, 254, 0.08)" 
                strokeWidth="1.5" 
              />
              <g transform={`translate(${getSvgX(hoverCursor.x) + 12}, ${getSvgY(hoverCursor.y) - 12})`}>
                <rect 
                  width="72" 
                  height="22" 
                  rx="4" 
                  fill="rgba(8, 12, 16, 0.95)" 
                  stroke="var(--color-primary)" 
                  strokeWidth="1" 
                />
                <text 
                  x="36" 
                  y="14" 
                  fill="#fff" 
                  fontSize="9.5" 
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {hoverCursor.dist} ft
                </text>
              </g>
            </g>
          )}

          {/* Smooth Density Heatmap rendering */}
          {viewMode === 'heatmap' && (
            <g filter="url(#smoothHeatFilter)" style={{ pointerEvents: 'none' }}>
              {filteredShots.map((shot, idx) => {
                const color = shot.m === 1 ? 'var(--color-above)' : 'var(--color-below)';
                return (
                  <circle
                    key={`h_${idx}`}
                    cx={getSvgX(shot.x)}
                    cy={getSvgY(shot.y)}
                    r="12.0"
                    fill={color}
                    opacity="0.45"
                  />
                );
              })}
            </g>
          )}

          {/* Grid Bins Rendering */}
          {viewMode === 'grid' && heatmapCells.map((cell, idx) => {
            const sx = getSvgX(cell.x) - 12;
            const sy = getSvgY(cell.y) - 12;
            const opacity = Math.min(cell.attempts / 30, 0.85) + 0.1;
            
            return (
              <g key={`cell_${idx}`}>
                <rect 
                  x={sx} 
                  y={sy} 
                  width="24" 
                  height="24" 
                  fill={cell.diff > 0.02 ? '#10b981' : cell.diff < -0.02 ? '#ef4444' : '#6b7280'}
                  opacity={opacity}
                  rx="4"
                  style={{ transition: 'fill 0.5s ease' }}
                />
                <text 
                  x={sx + 12} 
                  y={sy + 14} 
                  fill="#fff" 
                  fontSize="8" 
                  textAnchor="middle" 
                  fontWeight="bold"
                  opacity={opacity > 0.5 ? 1 : 0}
                >
                  {cell.attempts}
                </text>
              </g>
            );
          })}

          {/* Scatter Plot Rendering */}
          {viewMode === 'scatter' && filteredShots.map((shot, idx) => {
            const sx = getSvgX(shot.x);
            const sy = getSvgY(shot.y);
            const color = shot.m === 1 ? 'var(--color-above)' : 'var(--color-below)';
            
            return (
              <circle
                key={`shot_${idx}`}
                cx={sx}
                cy={sy}
                r="4.5"
                fill={color}
                opacity="0.75"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="0.5"
                className="shot-point"
                style={{
                  filter: `drop-shadow(0 0 2px ${color})`,
                  animation: 'fadeInPoint 0.5s ease-out'
                }}
                onMouseEnter={(e) => handleShotHover(e, shot)}
                onMouseLeave={(e) => handleShotHover(e, null)}
              />
            );
          })}

          {/* Custom clicked point marker */}
          {customShot && (
            <g>
              <circle 
                cx={getSvgX(customShot.x)} 
                cy={getSvgY(customShot.y)} 
                r="6" 
                fill="none" 
                stroke="var(--color-primary)" 
                strokeWidth="2" 
              />
              <circle 
                cx={getSvgX(customShot.x)} 
                cy={getSvgY(customShot.y)} 
                r="6" 
                fill="var(--color-primary)" 
                className="target-marker" 
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredShot && (
          <div 
            className="court-tooltip"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${tooltipPos.y}px` 
            }}
          >
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px', color: 'var(--color-primary)' }}>
              {hoveredShot.p}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Distance:</span>
              <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{hoveredShot.dst} ft</span>
              
              <span style={{ color: 'var(--text-secondary)' }}>Defender:</span>
              <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{hoveredShot.ddst} ft ({hoveredShot.d.split(' ')[0]})</span>
              
              <span style={{ color: 'var(--text-secondary)' }}>Shot Type:</span>
              <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{hoveredShot.st}</span>
              
              <span style={{ color: 'var(--text-secondary)' }}>xeFG% (Model):</span>
              <span style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary)' }}>{(hoveredShot.prob * 100).toFixed(1)}%</span>
              
              <span style={{ color: 'var(--text-secondary)' }}>Outcome:</span>
              <span style={{ textAlign: 'right', fontWeight: 'bold', color: hoveredShot.m === 1 ? 'var(--color-above)' : 'var(--color-below)' }}>
                {hoveredShot.m === 1 ? 'MADE (2pts)' : 'MISSED'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-above)', boxShadow: '0 0 4px var(--color-above)' }}></span>
          Made Shot / High Efficiency
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-below)', boxShadow: '0 0 4px var(--color-below)' }}></span>
          Missed Shot / Low Efficiency
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-primary)', boxShadow: '0 0 4px var(--color-primary)' }}></span>
          Locator Click Target
        </div>
      </div>
      
      <div style={{ background: 'rgba(0,242,254,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          🖱️ <strong>Density Contour View:</strong> Toggle "Density Contour" to see player hotspots blend dynamically using alpha-threshold blurs. Green contours represent high efficiency makes, and Red contours show missed attempts.
        </p>
      </div>
    </div>
  );
};
