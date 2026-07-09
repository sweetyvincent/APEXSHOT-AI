import React, { useState, useEffect, useMemo, useRef } from 'react';

interface Coefficients {
  intercept: number;
  distance: number;
  defender_distance: number;
  dribbles: number;
  is_catch_and_shoot: number;
  is_pull_up: number;
  is_layup_dunk: number;
}

interface PredictorProps {
  coefficients: Coefficients;
  selectedCoordinates: { x: number; y: number; distance: number; angle: number } | null;
}

const PLAYER_RESIDUALS: { [key: string]: { inside: number; mid: number; three: number; deepThree: number } } = {
  "Stephen Curry": { inside: -0.02, mid: 0.08, three: 0.12, deepThree: 0.15 },
  "Giannis Antetokounmpo": { inside: 0.12, mid: -0.12, three: -0.10, deepThree: -0.15 },
  "LeBron James": { inside: 0.08, mid: 0.01, three: 0.00, deepThree: -0.02 },
  "Kevin Durant": { inside: 0.04, mid: 0.12, three: 0.06, deepThree: 0.03 },
  "Luka Doncic": { inside: 0.03, mid: 0.05, three: -0.01, deepThree: 0.04 },
  "Average Player": { inside: 0.00, mid: 0.00, three: 0.00, deepThree: 0.00 }
};

// Simulation Scenarios
interface Scenario {
  name: string;
  player: string;
  shotType: string;
  startDist: number;
  endDist: number;
  startDef: number;
  endDef: number;
  startDribbles: number;
  endDribbles: number;
  points: number;
}

const SCENARIOS: Scenario[] = [
  {
    name: "Curry Deep Stepback 3",
    player: "Stephen Curry",
    shotType: "Pull-up",
    startDist: 16.0,
    endDist: 28.5,
    startDef: 5.5,
    endDef: 1.6,
    startDribbles: 0,
    endDribbles: 5,
    points: 3
  },
  {
    name: "Giannis Transition Dunk",
    player: "Giannis Antetokounmpo",
    shotType: "Layup/Dunk",
    startDist: 20.0,
    endDist: 1.5,
    startDef: 6.0,
    endDef: 0.8,
    startDribbles: 0,
    endDribbles: 2,
    points: 2
  },
  {
    name: "Kevin Durant Iso Mid-range",
    player: "Kevin Durant",
    shotType: "Pull-up",
    startDist: 23.0,
    endDist: 16.0,
    startDef: 5.0,
    endDef: 2.2,
    startDribbles: 0,
    endDribbles: 3,
    points: 2
  },
  {
    name: "Luka Stepback Corner 3",
    player: "Luka Doncic",
    shotType: "Pull-up",
    startDist: 14.0,
    endDist: 23.5,
    startDef: 4.5,
    endDef: 1.2,
    startDribbles: 0,
    endDribbles: 7,
    points: 3
  }
];

export const Predictor: React.FC<PredictorProps> = ({ coefficients, selectedCoordinates }) => {
  const [distance, setDistance] = useState<number>(15.0);
  const [defDistance, setDefDistance] = useState<number>(4.0);
  const [dribbles, setDribbles] = useState<number>(2);
  const [shotType, setShotType] = useState<string>('Pull-up');
  const [playerProfile, setPlayerProfile] = useState<string>('Average Player');
  const [angle, setAngle] = useState<number>(90.0);

  // Simulation state
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0);
  const [simState, setSimState] = useState<'idle' | 'running' | 'shooting' | 'made' | 'missed'>('idle');
  const [simProgress, setSimProgress] = useState<number>(0);
  const simIntervalRef = useRef<number | null>(null);

  // Sync with selected court coordinates from the map
  useEffect(() => {
    if (selectedCoordinates) {
      setDistance(selectedCoordinates.distance);
      setAngle(selectedCoordinates.angle);
      if (selectedCoordinates.distance <= 4.0) {
        setShotType('Layup/Dunk');
        setDribbles(0);
      } else {
        if (shotType === 'Layup/Dunk') {
          setShotType('Catch & Shoot');
        }
      }
    }
  }, [selectedCoordinates]);

  // Adjust inputs on shot type change
  const handleShotTypeChange = (val: string) => {
    setShotType(val);
    if (val === 'Layup/Dunk') {
      setDistance(2.0);
      setDribbles(0);
    } else if (val === 'Catch & Shoot') {
      setDribbles(0);
      if (distance <= 4.0) setDistance(12.0);
    } else {
      if (dribbles === 0) setDribbles(3);
      if (distance <= 4.0) setDistance(15.0);
    }
  };

  // Perform logistic regression calculation client-side
  const calculation = useMemo(() => {
    if (!coefficients) return { makeProb: 0.45, expectedPoints: 0.9, isThree: false, pointsValue: 2 };

    const isCatch = shotType === 'Catch & Shoot' ? 1 : 0;
    const isPull = shotType === 'Pull-up' ? 1 : 0;
    const isLayup = shotType === 'Layup/Dunk' ? 1 : 0;

    let z = (
      coefficients.intercept +
      distance * coefficients.distance +
      defDistance * coefficients.defender_distance +
      dribbles * coefficients.dribbles +
      isCatch * coefficients.is_catch_and_shoot +
      isPull * coefficients.is_pull_up +
      isLayup * coefficients.is_layup_dunk
    );

    let makeProb = 1.0 / (1.0 + Math.exp(-z));

    const residuals = PLAYER_RESIDUALS[playerProfile] || PLAYER_RESIDUALS["Average Player"];
    let skillAdj = 0.0;
    if (distance <= 4.0) {
      skillAdj = residuals.inside;
    } else if (distance <= 22.0) {
      skillAdj = residuals.mid;
    } else {
      if (distance > 27.5) {
        skillAdj = residuals.deepThree;
      } else {
        skillAdj = residuals.three;
      }
    }
    
    makeProb = Math.min(Math.max(makeProb + skillAdj, 0.01), 0.99);

    const isThree = (distance >= 22.0 && (Math.abs(angle) < 14 || Math.abs(angle) > 166)) || distance >= 23.75;
    const pointsValue = isThree ? 3.0 : 2.0;
    const expectedPoints = makeProb * pointsValue;

    return {
      makeProb,
      expectedPoints,
      isThree,
      pointsValue
    };
  }, [coefficients, distance, defDistance, dribbles, shotType, playerProfile, angle]);

  // Determine contest level descriptor and color
  const contestInfo = useMemo(() => {
    if (defDistance < 2.5) return { label: '🔒 Tightly Contested', color: 'var(--color-below)' };
    if (defDistance < 5.0) return { label: '🖐️ Contested', color: 'var(--color-gold)' };
    if (defDistance < 7.5) return { label: '🛡️ Loose Contest', color: 'var(--color-accent)' };
    return { label: '🟢 Wide Open', color: 'var(--color-above)' };
  }, [defDistance]);

  // Animation simulator logic
  const startPossessionSimulation = () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    
    const sc = SCENARIOS[selectedScenarioIdx];
    setPlayerProfile(sc.player);
    setShotType(sc.shotType);
    setSimState('running');
    setSimProgress(0);

    const duration = 2000; // 2 seconds animation
    const steps = 40;
    const stepTime = duration / steps;
    let currentStep = 0;

    simIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const t = currentStep / steps;
      setSimProgress(t * 100);

      // Lerp sliders
      setDistance(parseFloat((sc.startDist + t * (sc.endDist - sc.startDist)).toFixed(1)));
      setDefDistance(parseFloat((sc.startDef + t * (sc.endDef - sc.startDef)).toFixed(1)));
      setDribbles(Math.round(sc.startDribbles + t * (sc.endDribbles - sc.startDribbles)));

      if (currentStep >= steps) {
        clearInterval(simIntervalRef.current!);
        setSimState('shooting');
        
        // Let it "shoot" for 800ms, then evaluate final outcome
        setTimeout(() => {
          // Final success check against final probability
          const isMade = Math.random() < calculation.makeProb;
          setSimState(isMade ? 'made' : 'missed');
          
          // Reset to idle after showing outcome for 3.5s
          setTimeout(() => {
            setSimState('idle');
          }, 3500);
        }, 80000 / 100); // 800ms delay
      }
    }, stepTime);
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const gaugePercent = Math.round(calculation.makeProb * 100);
  const strokeDashoffset = 440 - (440 * calculation.makeProb);

  // SVG representation of defender proximity (moves shooter and defender relative to each other)
  // Max defender distance slider is 15ft. Scale to 120 pixels range.
  const defenderOffset = 50 + (defDistance / 15) * 160;

  return (
    <div className="panel predictor-layout" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(127, 0, 255, 0.08) 0%, transparent 70%)', bottom: '-50px', left: '-50px', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Live Shot Quality Predictor</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Run real-time logistic formulas against custom spatial parameters
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* Output Gauges & Contest badge */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', position: 'relative' }}>
          
          {/* Contest Status overlay badge */}
          <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '11px', background: contestInfo.color + '22', color: contestInfo.color, padding: '3px 8px', borderRadius: '12px', border: `1px solid ${contestInfo.color}44`, fontWeight: 600 }}>
            {contestInfo.label}
          </div>

          <div className="gauge-container">
            <svg className="gauge-svg">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-accent)" />
                  <stop offset="100%" stopColor="var(--color-primary)" />
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r="70" className="gauge-bg" />
              <circle 
                cx="80" 
                cy="80" 
                r="70" 
                className="gauge-fill" 
                strokeDasharray="440" 
                strokeDashoffset={strokeDashoffset} 
                transform="rotate(-90 80 80)"
              />
            </svg>
            <div className="gauge-text">
              <span className="gauge-value">{gaugePercent}%</span>
              <span className="gauge-label">xeFG%</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Value</span>
              <h3 style={{ fontSize: '28px', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>
                {calculation.expectedPoints.toFixed(2)} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>xPTS</span>
              </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Shot Value:</span>{' '}
                <strong style={{ color: '#fff' }}>{calculation.pointsValue} PTS ({calculation.isThree ? '3pt' : '2pt'})</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Defender Proximity Visual Simulator Graphic */}
        <div style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            Interactive Spatial Proximity Simulator
          </span>
          <svg width="280" height="60" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
            {/* Net / Rim Reference */}
            <circle cx="20" cy="30" r="10" fill="none" stroke="rgba(255,255,255,0.05)" />
            <line x1="20" y1="20" x2="20" y2="40" stroke="#ff7a00" strokeWidth="3" />
            
            {/* Distance Line */}
            <line 
              x1="50" 
              y1="30" 
              x2={defenderOffset} 
              y2="30" 
              stroke={contestInfo.color} 
              strokeWidth="2" 
              strokeDasharray="4 4"
            />
            {/* Shooter Circle */}
            <circle cx="50" cy="30" r="14" fill="var(--color-accent)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x="50" y="34" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">O</text>
            
            {/* Defender Circle */}
            <circle cx={defenderOffset} cy="30" r="12" fill={contestInfo.color} stroke="rgba(255,255,255,0.2)" strokeWidth="1" style={{ transition: 'cx 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)' }} />
            <text x={defenderOffset} y="34" fill="var(--text-inverse)" fontSize="10" fontWeight="bold" textAnchor="middle" style={{ transition: 'x 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)' }}>D</text>
            
            {/* Dimension labels */}
            <text x="50" y="52" fill="var(--text-muted)" fontSize="8" textAnchor="middle">Shooter</text>
            <text x={defenderOffset} y="52" fill="var(--text-muted)" fontSize="8" textAnchor="middle" style={{ transition: 'x 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)' }}>Defender</text>
            <text x={(50 + defenderOffset)/2} y="22" fill={contestInfo.color} fontSize="9" fontWeight="bold" textAnchor="middle" style={{ transition: 'x 0.3s cubic-bezier(0.1, 0.8, 0.2, 1)' }}>
              {defDistance} ft
            </text>
          </svg>
        </div>

        {/* Input Sliders */}
        <div className="predictor-controls" style={{ opacity: simState === 'idle' ? 1 : 0.4, pointerEvents: simState === 'idle' ? 'all' : 'none', transition: 'opacity 0.3s' }}>
          <div className="control-row">
            <div className="control-label-row">
              <span>Shooter Profile</span>
            </div>
            <select 
              className="filter-select"
              style={{ width: '100%' }}
              value={playerProfile}
              onChange={(e) => setPlayerProfile(e.target.value)}
            >
              {Object.keys(PLAYER_RESIDUALS).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="control-row">
            <div className="control-label-row">
              <span>Shot Distance</span>
              <span>{distance} feet</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="40" 
              step="0.5"
              className="slider-input"
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label-row">
              <span>Defender Proximity</span>
              <span>{defDistance} feet</span>
            </div>
            <input 
              type="range" 
              min="0.2" 
              max="15" 
              step="0.1"
              className="slider-input"
              value={defDistance}
              onChange={(e) => setDefDistance(parseFloat(e.target.value))}
            />
          </div>

          <div className="control-row">
            <div className="control-label-row">
              <span>Dribbles Before Shot</span>
              <span>{dribbles} dribbles</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="1"
              className="slider-input"
              disabled={shotType === 'Layup/Dunk' || shotType === 'Catch & Shoot'}
              value={dribbles}
              onChange={(e) => setDribbles(parseInt(e.target.value))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="control-row">
              <div className="control-label-row">
                <span>Shot Context</span>
              </div>
              <select 
                className="filter-select"
                style={{ width: '100%' }}
                value={shotType}
                onChange={(e) => handleShotTypeChange(e.target.value)}
              >
                <option value="Layup/Dunk">Layup/Dunk</option>
                <option value="Catch & Shoot">Catch & Shoot</option>
                <option value="Pull-up">Pull-up</option>
              </select>
            </div>

            <div className="control-row">
              <div className="control-label-row">
                <span>Angle from Center</span>
                <span>{angle.toFixed(0)}°</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="180" 
                step="1"
                className="slider-input"
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Live Possession Scenario Simulator */}
        <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Interactive Possession Simulator</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Animate a live possession scenario running parameters dynamically
            </p>
          </div>

          {simState === 'idle' ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                className="filter-select"
                style={{ flexGrow: 1 }}
                value={selectedScenarioIdx}
                onChange={(e) => setSelectedScenarioIdx(parseInt(e.target.value))}
              >
                {SCENARIOS.map((sc, idx) => (
                  <option key={idx} value={idx}>{sc.name} ({sc.player.split(' ')[1]})</option>
                ))}
              </select>
              <button 
                onClick={startPossessionSimulation}
                className="tab-btn active"
                style={{ border: 'none', height: '40px', padding: '0 20px', cursor: 'pointer' }}
              >
                Run Simulation
              </button>
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {simState === 'running' && (
                <>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary)', animation: 'pulseText 1s infinite' }}>
                    🎮 Play Simulator Animating...
                  </span>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${simProgress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.05s' }}></div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Player: {SCENARIOS[selectedScenarioIdx].player} | Dist: {distance}ft | Contest: {defDistance}ft
                  </span>
                </>
              )}

              {simState === 'shooting' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '24px', animation: 'spinBall 0.8s infinite' }}>🏀</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-gold)', animation: 'pulseText 0.5s infinite' }}>
                    CONTESTED RELEASE! FLYING...
                  </span>
                </div>
              )}

              {simState === 'made' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', animation: 'scaleUp 0.3s' }}>
                  <span style={{ fontSize: '32px' }}>🎉🔥</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-above)' }}>
                    IT'S GOOD! SHOT MADE!
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    +{SCENARIOS[selectedScenarioIdx].points} PTS (xeFG% was {gaugePercent}%)
                  </span>
                </div>
              )}

              {simState === 'missed' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', animation: 'scaleUp 0.3s' }}>
                  <span style={{ fontSize: '32px' }}>❌🧱</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-below)' }}>
                    BRICK! SHOT MISSED!
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Rim out (xeFG% was {gaugePercent}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
