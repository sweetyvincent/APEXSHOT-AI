import { useState, useMemo } from 'react';
import shotDataRaw from './data/shot_data.json';
import modelDataRaw from './data/model_coefficients.json';

import { ShotCourt } from './components/ShotCourt';
import { Predictor } from './components/Predictor';
import { PlayerCompare } from './components/PlayerCompare';
import { DefensiveDashboard } from './components/DefensiveDashboard';
import { Insights } from './components/Insights';
import { ArcadeGame } from './components/ArcadeGame';
import { LoadManagement } from './components/LoadManagement';

// Type definitions
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

function App() {
  const [activeTab, setActiveTab] = useState<string>('shot-charts');
  
  // Custom theme state
  const [theme, setTheme] = useState<string>('obsidian');

  // Filtering States
  const [selectedPlayer, setSelectedPlayer] = useState<string>('All');
  const [selectedShotType, setSelectedShotType] = useState<string>('All');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('All');
  const [selectedContest, setSelectedContest] = useState<string>('All');
  
  // Shared Court Click state for Predictor
  const [selectedCourtShot, setSelectedCourtShot] = useState<{ x: number; y: number; distance: number; angle: number } | null>(null);

  // Cast imports to types
  const shots = shotDataRaw as Shot[];
  const modelCoefficients = modelDataRaw.coefficients;
  const playerStats = modelDataRaw.player_stats;
  const defenderStats = modelDataRaw.defender_stats;

  // Filtered stats for header summary strip
  const summaryStats = useMemo(() => {
    const filtered = shots.filter(shot => {
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

    const attempts = filtered.length;
    if (attempts === 0) {
      return { attempts: 0, actualEfg: 0, expectedEfg: 0, delta: 0, avgDist: 0 };
    }

    const actualEfg = filtered.reduce((acc, s) => acc + (s.t === 1 ? s.m * 1.5 : s.m), 0) / attempts;
    const expectedEfg = filtered.reduce((acc, s) => acc + (s.t === 1 ? s.prob * 1.5 : s.prob), 0) / attempts;
    const delta = actualEfg - expectedEfg;
    const totalDist = filtered.reduce((acc, s) => acc + s.dst, 0);

    return {
      attempts,
      actualEfg,
      expectedEfg,
      delta,
      avgDist: totalDist / attempts
    };
  }, [shots, selectedPlayer, selectedShotType, selectedOutcome, selectedContest]);

  const handleSelectCourtShot = (shot: { distance: number; angle: number; x: number; y: number }) => {
    setSelectedCourtShot(shot);
    setActiveTab('predictor');
  };

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Brand Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('shot-charts')}>A</div>
          <div className="brand-title">
            <h1>APEXSHOT AI</h1>
            <p>NBA Spatial Shot Quality & Defensive Contest Modeling</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'shot-charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shot-charts')}
          >
            Spatial Map
          </button>
          <button 
            className={`tab-btn ${activeTab === 'predictor' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictor')}
          >
            Predictive Model
          </button>
          <button 
            className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            Shooter Matchups
          </button>
          <button 
            className={`tab-btn ${activeTab === 'defender-impact' ? 'active' : ''}`}
            onClick={() => setActiveTab('defender-impact')}
          >
            Defensive Contest
          </button>
          <button 
            className={`tab-btn ${activeTab === 'load' ? 'active' : ''}`}
            onClick={() => setActiveTab('load')}
            style={{ fontWeight: 600, color: activeTab === 'load' ? 'var(--text-inverse)' : 'var(--color-gold)' }}
          >
            ⚠️ Injury Predictor
          </button>
          <button 
            className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Strategy Insights
          </button>
          <button 
            className={`tab-btn ${activeTab === 'arcade' ? 'active' : ''}`}
            onClick={() => setActiveTab('arcade')}
            style={{ fontWeight: 600, color: activeTab === 'arcade' ? 'var(--text-inverse)' : 'var(--color-primary)' }}
          >
            🎮 Clutch Arcade
          </button>
        </nav>

        {/* Dynamic Theme Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Arena Theme</label>
          <select 
            className="filter-select"
            style={{ minWidth: '135px', padding: '6px 12px', fontSize: '12px' }}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="obsidian">Obsidian Dark</option>
            <option value="retro">Hardwood Retro</option>
            <option value="cyberpunk">Cyberpunk Arena</option>
          </select>
        </div>
      </header>

      {/* Global Interactive Filters Bar */}
      {(activeTab === 'shot-charts') && (
        <div className="panel filters-bar">
          <div className="filter-group">
            <div className="filter-control">
              <label>Player Focus</label>
              <select 
                className="filter-select"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="All">All NBA Stars</option>
                <option value="Stephen Curry">Stephen Curry</option>
                <option value="Giannis Antetokounmpo">Giannis Antetokounmpo</option>
                <option value="LeBron James">LeBron James</option>
                <option value="Kevin Durant">Kevin Durant</option>
                <option value="Luka Doncic">Luka Doncic</option>
              </select>
            </div>

            <div className="filter-control">
              <label>Shot Context</label>
              <select 
                className="filter-select"
                value={selectedShotType}
                onChange={(e) => setSelectedShotType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Layup/Dunk">Layup/Dunk</option>
                <option value="Catch & Shoot">Catch & Shoot</option>
                <option value="Pull-up">Pull-up</option>
              </select>
            </div>

            <div className="filter-control">
              <label>Outcome</label>
              <select 
                className="filter-select"
                value={selectedOutcome}
                onChange={(e) => setSelectedOutcome(e.target.value)}
              >
                <option value="All">All Shots</option>
                <option value="Made">Makes Only</option>
                <option value="Missed">Misses Only</option>
              </select>
            </div>

            <div className="filter-control">
              <label>Contest Level</label>
              <select 
                className="filter-select"
                value={selectedContest}
                onChange={(e) => setSelectedContest(e.target.value)}
              >
                <option value="All">All Contest Levels</option>
                <option value="Tightly Contested">Tight (&lt; 2ft)</option>
                <option value="Contested">Contested (2-4ft)</option>
                <option value="Open">Open (4-6ft)</option>
                <option value="Wide Open">Wide Open (&gt; 6ft)</option>
              </select>
            </div>
          </div>
          
          <button 
            className="tab-btn" 
            style={{ border: '1px solid var(--panel-border)', height: '40px', marginTop: '16px' }}
            onClick={() => {
              setSelectedPlayer('All');
              setSelectedShotType('All');
              setSelectedOutcome('All');
              setSelectedContest('All');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Real-time Summary Cards Strip */}
      {(activeTab === 'shot-charts') && (
        <div className="stats-strip">
          <div className="stat-card">
            <span className="stat-card-title">Shot Attempts</span>
            <span className="stat-card-value">{summaryStats.attempts}</span>
            <span className="stat-card-sub">Filtered volume</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Effective FG%</span>
            <span className="stat-card-value">{(summaryStats.actualEfg * 100).toFixed(1)}%</span>
            <span className="stat-card-sub">Adjusted for 3pt value</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Expected eFG%</span>
            <span className="stat-card-value">{(summaryStats.expectedEfg * 100).toFixed(1)}%</span>
            <span className="stat-card-sub">League quality standard</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Shot-Making Delta</span>
            <span className={`stat-card-value ${summaryStats.delta >= 0 ? 'text-above' : 'text-below'}`}>
              {summaryStats.delta >= 0 ? '+' : ''}{(summaryStats.delta * 100).toFixed(1)}%
            </span>
            <span className="stat-card-sub">Efficiency above expected</span>
          </div>
        </div>
      )}

      {/* Main Tab Render Grid */}
      <main>
        {activeTab === 'shot-charts' && (
          <div className="dashboard-grid">
            <ShotCourt 
              shots={shots}
              selectedPlayer={selectedPlayer}
              selectedShotType={selectedShotType}
              selectedOutcome={selectedOutcome}
              selectedContest={selectedContest}
              onSelectShot={handleSelectCourtShot}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Active Filter Insight</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {selectedPlayer === 'All' ? (
                    <p>
                      You are viewing aggregated logs across all five NBA stars. Overall average shot distance is <strong>{summaryStats.avgDist.toFixed(1)} ft</strong>. 
                      Notice how layups cluster around the rim while Stephen Curry and Luka Doncic spread out the perimeter.
                    </p>
                  ) : (
                    <p>
                      Analyzing <strong>{selectedPlayer}</strong>. Average shot distance is <strong>{summaryStats.avgDist.toFixed(1)} ft</strong>. 
                      His Shot Making Delta is <strong>{(summaryStats.delta * 100).toFixed(1)}%</strong>, meaning he shoots 
                      {' '}{summaryStats.delta >= 0 ? 'above' : 'below'} league average expectation given his exact spatial locations and contests.
                    </p>
                  )}
                  
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,242,254,0.05)', border: '1px solid rgba(0,242,254,0.15)', borderRadius: '8px' }}>
                    <strong>Why eFG% vs xeFG%?</strong>
                    <br />
                    Effective Field Goal Percentage (eFG%) accounts for the fact that a 3-point field goal is worth 1.5 times more than a 2-point field goal. 
                    Expected eFG% (xeFG%) isolates shot selection: it predicts the eFG% a baseline average league player would have if they took these exact same shots under identical conditions.
                  </div>
                </div>
              </div>
              
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Interactive Tutorial</h3>
                <ol style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Use the dropdowns to filter shots by player, type, outcome, or contest severity.</li>
                  <li>Toggle between <strong>Scatter</strong>, <strong>Grid Bins</strong>, or <strong>Density Contour</strong> on the court.</li>
                  <li>Hover over individual dots on the court to view custom spatial tooltips.</li>
                  <li><strong>Click on the court</strong> to drop a coordinate pin. This will copy the distance to the <strong>Predictive Model tab</strong> so you can live-simulate shot probability!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'predictor' && (
          <div className="dashboard-grid equal">
            <Predictor 
              coefficients={modelCoefficients}
              selectedCoordinates={selectedCourtShot}
            />

            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Spatial Prediction Science</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                This predictive engine runs a client-side implementation of our trained <strong>Logistic Regression Model</strong>. 
                Logistic regression is mathematically ideal for sports prediction because it outputs bounded probabilities between 0% and 100% based on multiple continuous and categorical features.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--color-primary)' }}>Adjusting the Parameters:</h4>
                <ul style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Distance</strong>: Probability falls off non-linearly. Layups are extremely high efficiency; mid-range sits around 40%; and deep 3s fall off rapidly.</li>
                  <li><strong>Defender Proximity</strong>: Close defenders (tight contest &lt; 2ft) cause severe dips in success rate. Wide open shots (&gt; 6ft) receive significant bonuses.</li>
                  <li><strong>Dribbles</strong>: High dribble counts (pull-up creation) introduce a slight tax on average players, representing fatigue and self-creation difficulty.</li>
                  <li><strong>Shooter Profile</strong>: Select stars like Curry or Durant to apply their individual skill residual offsets (calculated from real data) and see how they bend the curve!</li>
                </ul>
              </div>

              {selectedCourtShot && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--color-above)' }}>
                    📍 <strong>Active Court Pin Locked:</strong>
                    <br />
                    Coordinates: ({selectedCourtShot.x} ft, {selectedCourtShot.y} ft) | Distance: {selectedCourtShot.distance} ft.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="dashboard-grid full">
            <PlayerCompare playerStats={playerStats} />
          </div>
        )}

        {activeTab === 'defender-impact' && (
          <div className="dashboard-grid full">
            <DefensiveDashboard defenderStats={defenderStats} />
          </div>
        )}

        {activeTab === 'load' && (
          <div className="dashboard-grid full">
            <LoadManagement />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="dashboard-grid full">
            <Insights />
          </div>
        )}

        {activeTab === 'arcade' && (
          <div className="dashboard-grid equal">
            <ArcadeGame coefficients={modelCoefficients} />
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-primary)' }}>Arcade Strategy Manual</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                This mini-game utilizes the **ApexShot AI Expected Points (xPTS) formula** dynamically. 
                Your odds of scoring are calculated with every step you take.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--color-gold)' }}>Game Mechanics:</h4>
                <ul style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Contest Suppression</strong>: The defender moves towards you. If they get closer than 2.5 ft, your success probability drops below 20%.</li>
                  <li><strong>Losing the Defender</strong>: Use stepbacks (rapid changes in direction) or lateral cuts to shake the defender off.</li>
                  <li><strong>Efficiency Optimization</strong>: If you drive straight to the hoop (0-4ft) and get inside the paint before the defender catches up, your probability shoots up to 75%+ for an easy 2-point layup.</li>
                  <li><strong>The Perimeter Tax</strong>: Three-pointers (outside the arc) are worth more (3 pts) but have a lower baseline success probability (~35%). It's the ultimate risk-reward decision!</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--panel-border)', padding: '24px 0 8px 0', marginTop: '32px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span>ApexShot AI • Sports Analytics Hackathon Entry</span>
        <span>Built with React, TypeScript, Python 3.11 & Scikit-Learn</span>
      </footer>
    </div>
  );
}

export default App;
