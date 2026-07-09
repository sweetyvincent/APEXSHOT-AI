import React, { useState, useMemo } from 'react';

interface PlayerProfile {
  name: string;
  age: number;
  injuryHistory: 'Clean' | 'Minor (Ankle/Knee strains)' | 'Major (ACL/Achilles repairs)';
  baselineRisk: number; // base multiplier
}

const PLAYER_PROFILES: PlayerProfile[] = [
  { name: "Stephen Curry", age: 38, injuryHistory: "Minor (Ankle/Knee strains)", baselineRisk: 1.15 },
  { name: "Giannis Antetokounmpo", age: 31, injuryHistory: "Minor (Ankle/Knee strains)", baselineRisk: 1.10 },
  { name: "LeBron James", age: 41, injuryHistory: "Clean", baselineRisk: 1.25 }, // age factor
  { name: "Kevin Durant", age: 37, injuryHistory: "Major (ACL/Achilles repairs)", baselineRisk: 1.35 },
  { name: "Luka Doncic", age: 27, injuryHistory: "Clean", baselineRisk: 0.95 }
];

export const LoadManagement: React.FC = () => {
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("LeBron James");
  const [weeklyMinutes, setWeeklyMinutes] = useState<number>(110); // Acute load (this week)
  const [chronicMinutes, setChronicMinutes] = useState<number>(100); // Chronic load (past 4-week avg)
  const [highIntensityActions, setHighIntensityActions] = useState<number>(35); // Jumps/Decels per game
  const [backToBack, setBackToBack] = useState<boolean>(false);

  const player = useMemo(() => {
    return PLAYER_PROFILES.find(p => p.name === selectedPlayerName) || PLAYER_PROFILES[0];
  }, [selectedPlayerName]);

  // Sports Science Calculations (ACWR & Fatigue Index)
  const analytics = useMemo(() => {
    // 1. Acute-to-Chronic Workload Ratio (ACWR)
    // Formula: ACWR = Acute Workload (Weekly Minutes) / Chronic Workload (4-Week Average)
    const acwr = weeklyMinutes / Math.max(chronicMinutes, 10);

    // 2. High Intensity Strain Factor
    const intensityFactor = highIntensityActions / 30; // 30 is standard baseline

    // 3. Back-to-Back tax (fatigue multiplier)
    const b2bMultiplier = backToBack ? 1.35 : 1.0;

    // 4. Age factor
    const ageRisk = 1.0 + Math.max(player.age - 25, 0) * 0.02;

    // 5. History multiplier
    const historyMultiplier = 
      player.injuryHistory === "Major (ACL/Achilles repairs)" ? 1.4 :
      player.injuryHistory === "Minor (Ankle/Knee strains)" ? 1.15 : 1.0;

    // Combined Fatigue Index (0 to 100%)
    // ACWR sweet spot is 0.8 - 1.3. Above 1.5 is the "Danger Zone" (spikes injury risk).
    let fatigueScore = (acwr * 40) + (intensityFactor * 30) + (backToBack ? 20 : 0);
    fatigueScore = Math.min(Math.max(fatigueScore, 5), 100);

    // Final soft-tissue injury probability multiplier
    // Standard baseline probability is ~5% per game for soft tissue strain.
    // Spike in ACWR (>1.5) increases relative risk by 2x to 4x.
    let relativeRisk = 1.0;
    if (acwr > 1.5) {
      relativeRisk += (acwr - 1.5) * 4.0; // Sharp increase
    } else if (acwr < 0.8) {
      relativeRisk += (0.8 - acwr) * 0.5; // Under-training also has risk
    }

    relativeRisk *= intensityFactor * b2bMultiplier * ageRisk * historyMultiplier * player.baselineRisk;
    
    // Convert to soft-tissue strain risk class
    const finalRiskScore = Math.min(relativeRisk * 3.5, 95); // Scale percentage
    
    let riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'Danger Zone' = 'Low';
    let riskColor = 'var(--color-above)';
    if (finalRiskScore > 35) {
      riskLevel = 'Danger Zone';
      riskColor = 'var(--color-below)';
    } else if (finalRiskScore > 20) {
      riskLevel = 'Elevated';
      riskColor = 'var(--color-gold)';
    } else if (finalRiskScore > 10) {
      riskLevel = 'Moderate';
      riskColor = 'var(--color-accent)';
    }

    // Recommendation Generator
    let recommendation = "Full Availability. Workload is balanced and player is in the conditioning sweet spot.";
    let actionItem = "No restrictions. Maintain current training loads.";
    if (acwr > 1.5) {
      recommendation = "High Workload Spike. Acute load exceeds chronic conditioning, putting muscle tissue under severe eccentric stress.";
      actionItem = "LOAD RESTRICTION: Limit game minutes to 24m, restrict back-to-back exposure, and prioritize lymphatic recovery.";
    } else if (backToBack && finalRiskScore > 25) {
      recommendation = "Accumulated Sleep/Travel Fatigue. Back-to-back games restrict neural recovery pathways, diminishing joint stabilization.";
      actionItem = "REST SUGGESTED: DNP-Rest for the second leg of the back-to-back. High probability of Achilles/Hamstring strains.";
    } else if (acwr < 0.8 && chronicMinutes > 80) {
      recommendation = "Under-training Detraining. Workload has dropped significantly, detraining soft tissues and reducing load tolerance.";
      actionItem = "RESTRICTION ACTIVE: Gradually ramp up minutes in controlled practice sets to prevent re-entry spikes.";
    } else if (finalRiskScore > 15) {
      recommendation = "Elevated Fatigue Level. Age and minor structural history warrant minor conditioning breaks.";
      actionItem = "MONITOR CLOSELY: Allow standard play but cap minutes at 30m, limit continuous shifts to 6 mins.";
    }

    return {
      acwr,
      fatigueScore,
      relativeRisk,
      injuryRiskPct: finalRiskScore,
      riskLevel,
      riskColor,
      recommendation,
      actionItem
    };
  }, [player, weeklyMinutes, chronicMinutes, highIntensityActions, backToBack]);

  const acwrPercent = Math.min(analytics.acwr / 2.0 * 100, 100);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.05) 0%, transparent 75%)', top: '-50px', left: '-50px', pointerEvents: 'none' }} />

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>⚠️ Load Management & Injury Risk Predictor</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Simulate soft-tissue injury risk based on the Acute-to-Chronic Workload Ratio (ACWR) sports science model
        </p>
      </div>

      {/* Select Player Profile */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Select Athlete Profile</label>
          <select 
            className="filter-select"
            style={{ width: '100%' }}
            value={selectedPlayerName}
            onChange={(e) => setSelectedPlayerName(e.target.value)}
          >
            {PLAYER_PROFILES.map(p => (
              <option key={p.name} value={p.name}>{p.name} (Age {p.age} • History: {p.injuryHistory.split(' ')[0]})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inputs vs Outputs Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="dashboard-grid equal">
        
        {/* Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Conditioning Parameters</h3>
          
          <div className="control-row">
            <div className="control-label-row">
              <span>Acute Workload (Weekly Minutes)</span>
              <span>{weeklyMinutes} mins</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="240" 
              step="5"
              className="slider-input"
              value={weeklyMinutes}
              onChange={(e) => setWeeklyMinutes(parseInt(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label-row">
              <span>Chronic Workload (4-Week Average)</span>
              <span>{chronicMinutes} mins</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="200" 
              step="5"
              className="slider-input"
              value={chronicMinutes}
              onChange={(e) => setChronicMinutes(parseInt(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label-row">
              <span>High-Intensity Movements (Jumps/Decels per game)</span>
              <span>{highIntensityActions} actions</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="70" 
              step="1"
              className="slider-input"
              value={highIntensityActions}
              onChange={(e) => setHighIntensityActions(parseInt(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Back-to-Back Game Schedule (DNP risk)</span>
            <input 
              type="checkbox" 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              checked={backToBack}
              onChange={(e) => setBackToBack(e.target.checked)}
            />
          </div>
        </div>

        {/* Analytics Outputs Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Injury Risk & Workload Output</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Risk Box */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: `1px solid ${analytics.riskColor}33`, textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Soft-Tissue Strain Risk</span>
              <h3 style={{ fontSize: '28px', color: analytics.riskColor, margin: '6px 0', fontFamily: 'var(--font-heading)' }}>
                {analytics.injuryRiskPct.toFixed(1)}%
              </h3>
              <span style={{ fontSize: '11px', background: analytics.riskColor + '22', color: analytics.riskColor, padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {analytics.riskLevel}
              </span>
            </div>

            {/* Fatigue Box */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fatigue Index</span>
              <h3 style={{ fontSize: '28px', color: '#fff', margin: '6px 0', fontFamily: 'var(--font-heading)' }}>
                {analytics.fatigueScore.toFixed(0)}%
              </h3>
              <div style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', margin: '6px auto 0 auto', overflow: 'hidden' }}>
                <div style={{ width: `${analytics.fatigueScore}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 100%)' }} />
              </div>
            </div>
          </div>

          {/* ACWR Bar gauge (Sports science sweet spot visualizer) */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Acute-to-Chronic Ratio (ACWR)</span>
              <strong style={{ color: analytics.acwr > 1.5 ? 'var(--color-below)' : analytics.acwr >= 0.8 ? 'var(--color-above)' : 'var(--color-gold)' }}>
                {analytics.acwr.toFixed(2)}
              </strong>
            </div>

            {/* Slider track displaying conditioning ranges */}
            <div style={{ height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', position: 'relative', overflow: 'visible' }}>
              {/* Under-training Zone (0 to 40% width) */}
              <div style={{ left: 0, width: '40%', height: '100%', position: 'absolute', background: 'rgba(251, 191, 36, 0.1)', borderRight: '1px dashed rgba(255,255,255,0.1)' }}></div>
              {/* Sweet Spot Zone (40 to 65% width corresponding to 0.8 to 1.3 ACWR) */}
              <div style={{ left: '40%', width: '25%', height: '100%', position: 'absolute', background: 'rgba(16, 185, 129, 0.12)', borderRight: '1px dashed rgba(255,255,255,0.1)' }}></div>
              {/* Danger Zone (above 75% width corresponding to >1.5 ACWR) */}
              <div style={{ left: '75%', width: '25%', height: '100%', position: 'absolute', background: 'rgba(239, 68, 68, 0.12)' }}></div>
              
              {/* Current ACWR Indicator dot */}
              <div 
                style={{ 
                  left: `${acwrPercent}%`, 
                  position: 'absolute', 
                  top: '-4px', 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  background: '#fff', 
                  border: '3px solid var(--color-primary)', 
                  boxShadow: '0 0 10px var(--color-primary)',
                  transform: 'translateX(-50%)',
                  transition: 'left 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)'
                }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Underconditioned (&lt;0.8)</span>
              <span style={{ color: 'var(--color-above)' }}>Sweet Spot (0.8 - 1.3)</span>
              <span>Spike Risk (&gt;1.5)</span>
            </div>
          </div>

          {/* Actionable Medical / Conditioning Recommendation Box */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>📋 Conditioning Recommendation</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {analytics.recommendation}
            </p>
            <div style={{ background: analytics.riskColor + '11', borderLeft: `3px solid ${analytics.riskColor}`, padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, color: '#fff', marginTop: '4px' }}>
              {analytics.actionItem}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
