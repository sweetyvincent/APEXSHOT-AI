import React, { useState } from 'react';

interface ZoneData {
  attempts: number;
  efg: number;
  xefg: number;
  shot_making: number;
}

interface PlayerStat {
  player: string;
  attempts: number;
  makes: number;
  three_attempts: number;
  three_makes: number;
  actual_efg: number;
  expected_efg: number;
  shot_making: number;
  avg_distance: number;
  avg_defender_distance: number;
  avg_dribbles: number;
  zones: { [key: string]: ZoneData };
}

interface PlayerCompareProps {
  playerStats: PlayerStat[];
}

export const PlayerCompare: React.FC<PlayerCompareProps> = ({ playerStats }) => {
  const [playerA, setPlayerA] = useState<string>('Stephen Curry');
  const [playerB, setPlayerB] = useState<string>('Giannis Antetokounmpo');

  const statsA = playerStats.find(p => p.player === playerA);
  const statsB = playerStats.find(p => p.player === playerB);

  if (!statsA || !statsB) return null;

  const zones = [
    { key: "Restricted Area", label: "Restricted Area (0-4ft)" },
    { key: "Paint (Non-RA)", label: "Paint (Non-RA 4-14ft)" },
    { key: "Mid-Range", label: "Mid-Range (4-22ft)" },
    { key: "Corner 3", label: "Corner 3pt" },
    { key: "Above the Break 3", label: "Above Break 3pt" }
  ];

  const renderComparisonRow = (label: string, valA: number, valB: number, formatFn: (v: number) => string, higherIsBetter = true) => {
    const total = valA + valB;
    const pctA = total > 0 ? (valA / total) * 100 : 50;
    const pctB = total > 0 ? (valB / total) * 100 : 50;
    const diff = valA - valB;
    const winnerA = higherIsBetter ? diff > 0 : diff < 0;
    const equal = diff === 0;

    return (
      <div className="bar-chart-row" key={label}>
        <div className="bar-chart-info">
          <span style={{ fontWeight: winnerA && !equal ? 'bold' : 'normal', color: winnerA && !equal ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
            {formatFn(valA)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
          <span style={{ fontWeight: !winnerA && !equal ? 'bold' : 'normal', color: !winnerA && !equal ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
            {formatFn(valB)}
          </span>
        </div>
        <div className="bar-chart-track" style={{ display: 'flex' }}>
          <div 
            style={{ 
              width: `${pctA}%`, 
              height: '100%', 
              background: winnerA && !equal ? 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 100%)' : 'rgba(255,255,255,0.1)',
              transition: 'width 0.4s ease'
            }}
          />
          <div 
            style={{ 
              width: `${pctB}%`, 
              height: '100%', 
              background: !winnerA && !equal ? 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)' : 'rgba(255,255,255,0.1)',
              transition: 'width 0.4s ease',
              marginLeft: 'auto'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(127, 0, 255, 0.06) 0%, transparent 75%)', top: '150px', right: '-80px', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Shooter Matchups & Analytics</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Compare player shot profiles and shot-making ability side-by-side
          </p>
        </div>
      </div>

      {/* Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', zIndex: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Player A</label>
          <select 
            className="filter-select"
            style={{ width: '100%' }}
            value={playerA}
            onChange={(e) => setPlayerA(e.target.value)}
          >
            {playerStats.map(p => (
              <option key={p.player} value={p.player} disabled={p.player === playerB}>{p.player}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Player B</label>
          <select 
            className="filter-select"
            style={{ width: '100%' }}
            value={playerB}
            onChange={(e) => setPlayerB(e.target.value)}
          >
            {playerStats.map(p => (
              <option key={p.player} value={p.player} disabled={p.player === playerA}>{p.player}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Head-to-Head Cards */}
      <div className="comparison-layout" style={{ zIndex: 2 }}>
        {/* Player A Card */}
        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', boxShadow: 'inset 0 0 10px rgba(0,242,254,0.02)' }}>
          <div className="player-header-card">
            <div className="player-avatar" style={{ boxShadow: '0 0 12px rgba(0, 242, 254, 0.25)' }}>
              {playerA.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 style={{ fontSize: '16px' }}>{playerA}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{statsA.attempts} shot attempts analyzed</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTUAL EFG%</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{(statsA.actual_efg * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EXPECTED EFG%</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{(statsA.expected_efg * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center', gridColumn: 'span 2' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SHOT MAKING DELTA</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: statsA.shot_making >= 0 ? 'var(--color-above)' : 'var(--color-below)' }}>
                {statsA.shot_making >= 0 ? '+' : ''}{(statsA.shot_making * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {statsA.shot_making >= 0 ? '🔥 Outperforming shot difficulty' : '❄️ Underperforming shot difficulty'}
              </div>
            </div>
          </div>
        </div>

        {/* Player B Card */}
        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', boxShadow: 'inset 0 0 10px rgba(127,0,255,0.02)' }}>
          <div className="player-header-card">
            <div className="player-avatar" style={{ background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)', boxShadow: '0 0 12px rgba(127, 0, 255, 0.25)' }}>
              {playerB.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 style={{ fontSize: '16px' }}>{playerB}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{statsB.attempts} shot attempts analyzed</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTUAL EFG%</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{(statsB.actual_efg * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EXPECTED EFG%</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{(statsB.expected_efg * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center', gridColumn: 'span 2' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SHOT MAKING DELTA</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: statsB.shot_making >= 0 ? 'var(--color-above)' : 'var(--color-below)' }}>
                {statsB.shot_making >= 0 ? '+' : ''}{(statsB.shot_making * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {statsB.shot_making >= 0 ? '🔥 Outperforming shot difficulty' : '❄️ Underperforming shot difficulty'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Statistical Compare Slider Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid var(--panel-border)', zIndex: 2 }}>
        <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', color: '#fff' }}>Contextual Indicators Comparison</h3>
        {renderComparisonRow("Actual eFG%", statsA.actual_efg, statsB.actual_efg, (v) => `${(v*100).toFixed(1)}%`)}
        {renderComparisonRow("Expected eFG% (Shot Selection)", statsA.expected_efg, statsB.expected_efg, (v) => `${(v*100).toFixed(1)}%`)}
        {renderComparisonRow("Shot Making Ability", statsA.shot_making, statsB.shot_making, (v) => `${(v >= 0 ? '+' : '')}${(v*100).toFixed(1)}%`)}
        {renderComparisonRow("Average Shot Distance", statsA.avg_distance, statsB.avg_distance, (v) => `${v.toFixed(1)} ft`, false)}
        {renderComparisonRow("Average Defender Proximity", statsA.avg_defender_distance, statsB.avg_defender_distance, (v) => `${v.toFixed(1)} ft`)}
        {renderComparisonRow("Average Dribbles before Shot", statsA.avg_dribbles, statsB.avg_dribbles, (v) => `${v.toFixed(1)}`, false)}
      </div>

      {/* SVG Spatial Zone Visual Comparison Chart */}
      <div style={{ zIndex: 2 }}>
        <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>Zone Efficiency Visual Comparison</h3>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {zones.map(z => {
            const zA = statsA.zones[z.key] || { attempts: 0, efg: 0, xefg: 0, shot_making: 0 };
            const zB = statsB.zones[z.key] || { attempts: 0, efg: 0, xefg: 0, shot_making: 0 };
            
            // Map eFG% (0 to 100%) to pixels (0 to 240px wide)
            const widthA = `${(zA.efg * 100)}%`;
            const widthB = `${(zB.efg * 100)}%`;
            const xEfgA = `${(zA.xefg * 100)}%`;
            const xEfgB = `${(zB.xefg * 100)}%`;

            return (
              <div key={z.key} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{z.label}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Player A Zone Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '40px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>{playerA.split(' ')[1]}</span>
                    <div style={{ flexGrow: 1, height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', position: 'relative' }}>
                      {/* Actual eFG Bar */}
                      <div style={{ width: widthA, height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 100%)', boxShadow: '0 0 6px rgba(0, 242, 254, 0.3)', transition: 'width 0.5s' }}></div>
                      {/* Expected eFG Line Marker */}
                      <div style={{ left: xEfgA, position: 'absolute', top: '-2px', width: '2px', height: '12px', background: '#fff', boxShadow: '0 0 4px #fff' }} title={`Expected eFG: ${(zA.xefg*100).toFixed(1)}%`}></div>
                    </div>
                    <span style={{ width: '40px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{(zA.efg*100).toFixed(0)}%</span>
                  </div>

                  {/* Player B Zone Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '40px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>{playerB.split(' ')[1]}</span>
                    <div style={{ flexGrow: 1, height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', position: 'relative' }}>
                      {/* Actual eFG Bar */}
                      <div style={{ width: widthB, height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)', boxShadow: '0 0 6px rgba(127, 0, 255, 0.3)', transition: 'width 0.5s' }}></div>
                      {/* Expected eFG Line Marker */}
                      <div style={{ left: xEfgB, position: 'absolute', top: '-2px', width: '2px', height: '12px', background: '#fff', boxShadow: '0 0 4px #fff' }} title={`Expected eFG: ${(zB.xefg*100).toFixed(1)}%`}></div>
                    </div>
                    <span style={{ width: '40px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>{(zB.efg*100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--panel-border)', paddingTop: '8px' }}>
            <span>█ Colored Bar = Actual Zone eFG%</span>
            <span>| White Line = Expected Zone eFG% (Shot Selection baseline)</span>
          </div>
        </div>
      </div>

      {/* Spatial Zones Grid Compare Table */}
      <div style={{ zIndex: 2 }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Spatial Zone Statistics</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Shot Zone</th>
                <th>{playerA.split(' ')[1]} Volume</th>
                <th>{playerA.split(' ')[1]} EFG% (xeFG)</th>
                <th>{playerB.split(' ')[1]} Volume</th>
                <th>{playerB.split(' ')[1]} EFG% (xeFG)</th>
              </tr>
            </thead>
            <tbody>
              {zones.map(z => {
                const zA = statsA.zones[z.key] || { attempts: 0, efg: 0, xefg: 0, shot_making: 0 };
                const zB = statsB.zones[z.key] || { attempts: 0, efg: 0, xefg: 0, shot_making: 0 };
                
                return (
                  <tr key={z.key}>
                    <td style={{ fontWeight: 500 }}>{z.key}</td>
                    <td>{zA.attempts} shots ({(zA.attempts / statsA.attempts * 100).toFixed(0)}%)</td>
                    <td>
                      <span style={{ color: zA.shot_making > 0.02 ? 'var(--color-above)' : zA.shot_making < -0.02 ? 'var(--color-below)' : 'inherit', fontWeight: 600 }}>
                        {(zA.efg * 100).toFixed(1)}%
                      </span>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({(zA.xefg * 100).toFixed(1)}%)</span>
                    </td>
                    <td>{zB.attempts} shots ({(zB.attempts / statsB.attempts * 100).toFixed(0)}%)</td>
                    <td>
                      <span style={{ color: zB.shot_making > 0.02 ? 'var(--color-above)' : zB.shot_making < -0.02 ? 'var(--color-below)' : 'inherit', fontWeight: 600 }}>
                        {(zB.efg * 100).toFixed(1)}%
                      </span>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({(zB.xefg * 100).toFixed(1)}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
