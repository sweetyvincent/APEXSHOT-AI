import React from 'react';

interface ZoneDetail {
  attempts: number;
  actual_efg_allowed: number;
  expected_efg_allowed: number;
  defensive_impact: number;
}

interface DefenderStat {
  defender: string;
  description: string;
  attempts: number;
  actual_efg_allowed: number;
  expected_efg_allowed: number;
  defensive_impact: number;
  avg_defender_distance: number;
  inside: ZoneDetail;
  perimeter: ZoneDetail;
}

interface DefensiveDashboardProps {
  defenderStats: DefenderStat[];
}

export const DefensiveDashboard: React.FC<DefensiveDashboardProps> = ({ defenderStats }) => {
  // Sort defenders by overall defensive impact (best defenders first)
  const sortedDefenders = [...defenderStats].sort((a, b) => b.defensive_impact - a.defensive_impact);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Defensive Impact Analytics</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Isolating defender contest quality by comparing actual allowed eFG% against spatial model expectations
        </p>
      </div>

      {/* Explainer Alert */}
      <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '4px' }}>
          Understanding Defensive Shot Quality Allowed (dSQA)
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Traditional defensive stats like blocks and steals miss the core element of defense: <strong>shot contest suppression</strong>. 
          Our <strong>Defensive Impact</strong> metric calculates the Expected eFG% of all shots taken against a defender (based on location, distance, shot type, etc.) 
          and subtracts the Actual eFG% they allowed. 
          <br /><br />
          👉 <span className="text-above">Positive Impact (+)</span> means the defender forced shooters to shoot <strong>worse</strong> than their statistical expectancy (elite contest).
          <br />
          👉 <span className="text-below">Negative Impact (-)</span> means they gave up easier looks or failed to contest efficiently.
        </p>
      </div>

      {/* Leaderboard Table */}
      <div>
        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Defensive Contest Leaderboard</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Defender</th>
                <th>Archetype</th>
                <th>Avg Proximity</th>
                <th>Opp. eFG%</th>
                <th>Exp. eFG%</th>
                <th>Defensive Impact</th>
              </tr>
            </thead>
            <tbody>
              {sortedDefenders.map((d) => {
                const isGood = d.defensive_impact > 0;
                const isNeutral = d.defender === 'Average Defender';
                const impactColor = isNeutral ? 'inherit' : (isGood ? 'var(--color-above)' : 'var(--color-below)');
                
                return (
                  <tr key={d.defender}>
                    <td style={{ fontWeight: 600 }}>{d.defender}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{d.description}</td>
                    <td>{d.avg_defender_distance.toFixed(1)} ft</td>
                    <td>{(d.actual_efg_allowed * 100).toFixed(1)}%</td>
                    <td>{(d.expected_efg_allowed * 100).toFixed(1)}%</td>
                    <td style={{ fontWeight: 'bold', color: impactColor }}>
                      {d.defensive_impact > 0 ? '+' : ''}{(d.defensive_impact * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spatial Breakdown Comparison */}
      <div>
        <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>Defensive Specialty: Paint vs Perimeter</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {sortedDefenders.filter(d => d.defender !== 'Average Defender').map(d => {
            const insideImpact = d.inside.defensive_impact * 100;
            const perimeterImpact = d.perimeter.defensive_impact * 100;
            
            // Scaler helper (max impact is around 12% in data)
            const getWidth = (val: number) => `${Math.min(Math.max(Math.abs(val) / 12 * 100, 5), 100)}%`;

            return (
              <div 
                key={d.defender} 
                style={{ 
                  background: 'rgba(0,0,0,0.15)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--panel-border)',
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px' }}>{d.defender}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.description}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {/* Inside Paint Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '120px', fontSize: '12px', color: 'var(--text-secondary)' }}>Restricted Area / Paint</span>
                    <div style={{ flexGrow: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: getWidth(insideImpact), 
                          background: insideImpact >= 0 ? 'var(--color-above)' : 'var(--color-below)',
                          borderRadius: '4px',
                          float: insideImpact >= 0 ? 'left' : 'right' as any
                        }}
                      />
                    </div>
                    <span style={{ width: '45px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right', color: insideImpact >= 0 ? 'var(--color-above)' : 'var(--color-below)' }}>
                      {insideImpact >= 0 ? '+' : ''}{insideImpact.toFixed(1)}%
                    </span>
                  </div>

                  {/* Perimeter Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '120px', fontSize: '12px', color: 'var(--text-secondary)' }}>Perimeter (Mid/3s)</span>
                    <div style={{ flexGrow: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: getWidth(perimeterImpact), 
                          background: perimeterImpact >= 0 ? 'var(--color-above)' : 'var(--color-below)',
                          borderRadius: '4px',
                          float: perimeterImpact >= 0 ? 'left' : 'right' as any
                        }}
                      />
                    </div>
                    <span style={{ width: '45px', fontSize: '12px', fontWeight: 'bold', textAlign: 'right', color: perimeterImpact >= 0 ? 'var(--color-above)' : 'var(--color-below)' }}>
                      {perimeterImpact >= 0 ? '+' : ''}{perimeterImpact.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
