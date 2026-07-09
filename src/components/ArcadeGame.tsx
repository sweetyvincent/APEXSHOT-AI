import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface Coefficients {
  intercept: number;
  distance: number;
  defender_distance: number;
  dribbles: number;
  is_catch_and_shoot: number;
  is_pull_up: number;
  is_layup_dunk: number;
}

interface ArcadeGameProps {
  coefficients: Coefficients;
}

// Player specific skill profiles for gameplay customization
interface SkillProfile {
  label: string;
  badge: string;
  inside: number;
  mid: number;
  three: number;
}

const PLAYER_SKILLS: { [key: string]: SkillProfile } = {
  "Stephen Curry": { label: "Elite 3PT Shooter (+12% from three)", badge: "Steph 🏀", inside: -0.02, mid: 0.08, three: 0.12 },
  "Giannis Antetokounmpo": { label: "Paint Dominator (+12% inside)", badge: "Giannis 💪", inside: 0.12, mid: -0.12, three: -0.10 },
  "Kevin Durant": { label: "Mid-range Master (+12% mid-range)", badge: "KD 🎯", inside: 0.04, mid: 0.12, three: 0.06 },
  "Luka Doncic": { label: "Clutch Creator (+5% mid/inside)", badge: "Luka 🪄", inside: 0.03, mid: 0.05, three: -0.01 },
  "Average Player": { label: "Standard League Baseline", badge: "Average 👤", inside: 0.0, mid: 0.0, three: 0.0 }
};

export const ArcadeGame: React.FC<ArcadeGameProps> = ({ coefficients }) => {
  // Game states
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'releasing' | 'outcome' | 'game_over'>('idle');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('apexshot_arcade_highscore') || '0');
  });
  const [possession, setPossession] = useState<number>(5);
  const [shotClock, setShotClock] = useState<number>(24.0);
  
  // Selected Shooter Avatar
  const [avatar, setAvatar] = useState<string>('Average Player');

  // React State Positions (used for visual rendering)
  const [shooter, setShooter] = useState<{ x: number; y: number }>({ x: 0, y: 25.0 });
  const [defender, setDefender] = useState<{ x: number; y: number }>({ x: 0, y: 8.0 });
  
  // React Coordinate Refs (used for stable, non-tearing 60fps game loop physics)
  const shooterRef = useRef<{ x: number; y: number }>({ x: 0, y: 25.0 });
  const defenderRef = useRef<{ x: number; y: number }>({ x: 0, y: 8.0 });

  // Animation states
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>("Space to shoot, Arrow keys / WASD to move!");
  const [feedbackColor, setFeedbackColor] = useState<string>("var(--color-primary)");
  const [lastShotInfo, setLastShotInfo] = useState<{ prob: number; dist: number; defDist: number; points: number; made: boolean } | null>(null);

  // Ref loops
  const gameLoopRef = useRef<number | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const hoopX = 0;
  const hoopY = 4.75;
  const [flashOutcome, setFlashOutcome] = useState<boolean>(false);

  // Reset possession parameters
  const resetPossession = useCallback(() => {
    const angle = (Math.random() * 120 + 30) * Math.PI / 180;
    const r = 23.0; // Start near the 3pt line
    const startX = parseFloat((hoopX + r * Math.cos(angle)).toFixed(1));
    const startY = parseFloat((hoopY + r * Math.sin(angle)).toFixed(1));
    
    // Set both Refs and State
    shooterRef.current = { x: startX, y: startY };
    setShooter({ x: startX, y: startY });

    defenderRef.current = { x: 0, y: 7.0 };
    setDefender({ x: 0, y: 7.0 });

    setShotClock(24.0);
    setBallPos(null);
  }, []);

  // Initialize a new game
  const startGame = () => {
    setScore(0);
    setPossession(5);
    setGameState('playing');
    resetPossession();
    setFeedbackText("DEFENSE CLAMPING! Evade and release!");
    setFeedbackColor("var(--text-primary)");
  };

  // Mathematical formula calculations live
  const calculateLiveQuality = useCallback((sX: number, sY: number, dX: number, dY: number, activeAvatar: string) => {
    const dx = sX - hoopX;
    const dy = sY - hoopY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const dfX = sX - dX;
    const dfY = sY - dY;
    const defDist = Math.sqrt(dfX * dfX + dfY * dfY);

    const isLayup = dist <= 4.0 ? 1 : 0;
    const isPull = dist > 4.0 ? 1 : 0;

    let z = (
      coefficients.intercept +
      dist * coefficients.distance +
      defDist * coefficients.defender_distance +
      2 * coefficients.dribbles + 
      isPull * coefficients.is_pull_up +
      isLayup * coefficients.is_layup_dunk
    );

    let prob = 1.0 / (1.0 + Math.exp(-z));
    
    // Apply Selected Avatar Skill Offsets
    const skill = PLAYER_SKILLS[activeAvatar] || PLAYER_SKILLS["Average Player"];
    let skillOffset = 0.0;
    if (dist <= 4.0) {
      skillOffset = skill.inside;
    } else if (dist <= 22.0) {
      skillOffset = skill.mid;
    } else {
      skillOffset = skill.three;
    }

    prob = Math.min(Math.max(prob + skillOffset, 0.01), 0.99);

    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * 180 / Math.PI;
    const isThree = (dist >= 22.0 && (Math.abs(angleDeg) < 14 || Math.abs(angleDeg) > 166)) || dist >= 23.75;
    const pointsValue = isThree ? 3 : 2;

    return {
      dist,
      defDist,
      prob,
      pointsValue,
      isThree
    };
  }, [coefficients]);

  // Release shot execution
  const shoot = useCallback(() => {
    if (gameState !== 'playing') return;

    setGameState('releasing');
    
    // Read final coordinates from Refs
    const sX = shooterRef.current.x;
    const sY = shooterRef.current.y;
    const dX = defenderRef.current.x;
    const dY = defenderRef.current.y;

    const { dist, defDist, prob, pointsValue } = calculateLiveQuality(sX, sY, dX, dY, avatar);

    // Ball starts at shooter coordinates, flies to hoop (0, 4.75)
    let progress = 0;
    const steps = 12;
    const interval = setInterval(() => {
      progress++;
      const t = progress / steps;
      setBallPos({
        x: sX + t * (hoopX - sX),
        y: sY + t * (hoopY - sY) - 6 * Math.sin(t * Math.PI)
      });

      if (progress >= steps) {
        clearInterval(interval);
        
        // Evaluate outcome
        const rolled = Math.random();
        const isMade = rolled < prob;
        
        setLastShotInfo({
          prob,
          dist,
          defDist,
          points: pointsValue,
          made: isMade
        });

        setFlashOutcome(true);
        setTimeout(() => setFlashOutcome(false), 800);

        if (isMade) {
          const earned = pointsValue;
          setScore(s => s + earned);
          setFeedbackText(dist <= 4.0 ? `💥 DUNKED IT! +2 PTS` : `🎯 SPLASH! +${earned} PTS`);
          setFeedbackColor("var(--color-above)");
        } else {
          setFeedbackText(`🧱 CLANK! MISSED! (xeFG% was ${(prob * 100).toFixed(0)}%)`);
          setFeedbackColor("var(--color-below)");
        }

        setGameState('outcome');
        
        // Wait 2.2 seconds to show outcome, then advance possession
        setTimeout(() => {
          const nextPoss = possession - 1;
          setPossession(nextPoss);
          
          if (nextPoss <= 0) {
            setGameState('game_over');
            setFeedbackText("GAME OVER! See if you set a High Score!");
            setFeedbackColor("var(--color-gold)");
            if (score + (isMade ? pointsValue : 0) > highScore) {
              setHighScore(score + (isMade ? pointsValue : 0));
              localStorage.setItem('apexshot_arcade_highscore', (score + (isMade ? pointsValue : 0)).toString());
            }
          } else {
            setGameState('playing');
            resetPossession();
            setFeedbackText("Play open! Move and shoot!");
            setFeedbackColor("var(--text-primary)");
          }
        }, 2200);
      }
    }, 40);
  }, [gameState, calculateLiveQuality, avatar, possession, score, highScore, resetPossession]);

  // Movement directions (Updates Refs instantly, State for visual render)
  const moveShooter = useCallback((dx: number, dy: number) => {
    if (gameState !== 'playing') return;
    
    const nx = Math.min(Math.max(shooterRef.current.x + dx, -24.5), 24.5);
    const ny = Math.min(Math.max(shooterRef.current.y + dy, 0.5), 38.5);
    
    shooterRef.current = { x: nx, y: ny };
    setShooter({ x: nx, y: ny });
  }, [gameState]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        shoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [shoot]);

  // Game Loop physics (TICK RUNS 60FPS STABLE - dependent ONLY on gameState)
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const tick = () => {
      // 1. Move Shooter based on active keys (Reads from & Writes to shooterRef)
      const speed = 0.45;
      let dx = 0;
      let dy = 0;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= speed;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += speed;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= speed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += speed;

      if (dx !== 0 || dy !== 0) {
        const nx = Math.min(Math.max(shooterRef.current.x + dx, -24.5), 24.5);
        const ny = Math.min(Math.max(shooterRef.current.y + dy, 0.5), 38.5);
        shooterRef.current = { x: nx, y: ny };
        setShooter({ x: nx, y: ny });
      }

      // 2. Move Defender (AI) towards shooterRef
      const sRef = shooterRef.current;
      const dRef = defenderRef.current;
      
      const diffX = sRef.x - dRef.x;
      const diffY = sRef.y - dRef.y;
      const dist = Math.sqrt(diffX*diffX + diffY*diffY);

      if (dist >= 0.2) {
        const defSpeed = 0.25;
        const moveX = (diffX / dist) * defSpeed;
        const moveY = (diffY / dist) * defSpeed;

        const nx = parseFloat((dRef.x + moveX).toFixed(1));
        const ny = parseFloat((dRef.y + moveY).toFixed(1));
        
        defenderRef.current = { x: nx, y: ny };
        setDefender({ x: nx, y: ny });
      }

      // 3. Tick Shot Clock
      setShotClock(clock => {
        const nextClock = clock - 0.0166;
        if (nextClock <= 0) {
          setGameState('outcome');
          setFeedbackText("⏱️ SHOT CLOCK VIOLATION! Turnover!");
          setFeedbackColor("var(--color-below)");
          
          setTimeout(() => {
            const nextPoss = possession - 1;
            setPossession(nextPoss);
            if (nextPoss <= 0) {
              setGameState('game_over');
              if (score > highScore) {
                setHighScore(score);
                localStorage.setItem('apexshot_arcade_highscore', score.toString());
              }
            } else {
              setGameState('playing');
              resetPossession();
              setFeedbackText("Play open! Move and shoot!");
              setFeedbackColor("var(--text-primary)");
            }
          }, 2000);
          return 0;
        }
        return parseFloat(nextClock.toFixed(2));
      });

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, possession, score, highScore, resetPossession]);

  // Translate coordinates to SVG (300x240 pixels)
  const getSvgX = (x: number) => (x + 25) * 6;
  const getSvgY = (y: number) => y * 6;

  // Calculate stats for live display
  const liveStats = useMemo(() => {
    return calculateLiveQuality(shooter.x, shooter.y, defender.x, defender.y, avatar);
  }, [shooter, defender, calculateLiveQuality, avatar]);

  return (
    <div className="panel" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', position: 'relative' }}>
      {/* Visual Flash effect */}
      {flashOutcome && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: lastShotInfo?.made ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `3px solid ${lastShotInfo?.made ? 'var(--color-above)' : 'var(--color-below)'}`,
          borderRadius: '16px',
          zIndex: 5,
          pointerEvents: 'none',
          boxShadow: `inset 0 0 40px ${lastShotInfo?.made ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          animation: 'scaleUp 0.1s'
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>🏀 Rim Run Arcade Game</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Evade the defender, get open, and score! Models run in real-time.
          </p>
        </div>
        
        {/* Game avatar badge */}
        {gameState === 'playing' && (
          <span style={{ fontSize: '11px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(0, 242, 254, 0.2)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            Shooter: {PLAYER_SKILLS[avatar].badge}
          </span>
        )}
      </div>

      {/* Arcade Scoreboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
        <div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</span>
          <h3 style={{ fontSize: '20px', color: 'var(--color-primary)' }}>{score} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PTS</span></h3>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>High Score</span>
          <h3 style={{ fontSize: '20px', color: 'var(--color-gold)' }}>{highScore} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PTS</span></h3>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Possessions</span>
          <h3 style={{ fontSize: '20px', color: '#fff' }}>{possession} / 5</h3>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shot Clock</span>
          <h3 style={{ fontSize: '20px', color: shotClock <= 5.0 ? 'var(--color-below)' : 'var(--color-above)', animation: shotClock <= 5.0 ? 'pulseText 0.5s infinite' : 'none' }}>
            {shotClock.toFixed(1)}s
          </h3>
        </div>
      </div>

      {/* Main Arcade Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        
        {/* Game Canvas Container */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', aspectRatio: '300/240', background: '#090f19', borderRadius: '12px', border: '2px solid var(--panel-border)', overflow: 'hidden' }}>
          
          {gameState === 'idle' || gameState === 'game_over' ? (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,8,16,0.95)', display: 'flex', flexDirection: 'column', justifyItems: 'center', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 3, padding: '20px' }}>
              <span style={{ fontSize: '44px', animation: 'pulseText 1.5s infinite' }}>🏀</span>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                {gameState === 'idle' ? 'Select Shooter Avatar' : 'Game Over!'}
              </h3>
              
              {/* Star Character Selection Option Panel */}
              {gameState === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
                  <select 
                    className="filter-select"
                    style={{ width: '100%', padding: '10px', textAlign: 'center' }}
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                  >
                    {Object.keys(PLAYER_SKILLS).map(name => (
                      <option key={name} value={name}>{name} - {PLAYER_SKILLS[name].label}</option>
                    ))}
                  </select>
                </div>
              )}

              {gameState === 'game_over' && (
                <p style={{ fontSize: '14px', color: 'var(--color-gold)' }}>Final Score: <strong>{score} PTS</strong></p>
              )}

              <button 
                onClick={startGame}
                className="tab-btn active"
                style={{ border: 'none', height: '40px', padding: '0 28px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {gameState === 'idle' ? 'Start Matchup' : 'Play Again'}
              </button>
            </div>
          ) : null}

          {/* SVG Court Visualizer */}
          <svg viewBox="0 0 300 240" className="court-svg">
            <rect width="300" height="240" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <rect x="102" y="0" width="96" height="114" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.08)" />
            <circle cx="150" cy="28.5" r="4.5" fill="none" stroke="#ff7a00" strokeWidth="1.5" />
            <line x1="135" y1="24" x2="165" y2="24" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <path d="M 126,28.5 A 24,24 0 0,1 174,28.5" fill="none" stroke="rgba(255,255,255,0.05)" />
            <line x1="18" y1="0" x2="18" y2="84" stroke="rgba(255,255,255,0.1)" />
            <line x1="282" y1="0" x2="282" y2="84" stroke="rgba(255,255,255,0.1)" />
            <path d="M 18,84 A 142.5,142.5 0 0,1 282,84" fill="none" stroke="rgba(255,255,255,0.1)" />

            {/* Defender close-out contest range ring */}
            {gameState === 'playing' && (
              <circle 
                cx={getSvgX(defender.x)} 
                cy={getSvgY(defender.y)} 
                r="15" 
                fill="rgba(239, 68, 68, 0.05)" 
                stroke="rgba(239, 68, 68, 0.15)" 
                strokeWidth="1" 
                strokeDasharray="2 2"
              />
            )}

            {/* AI Defender Dot */}
            <g transform={`translate(${getSvgX(defender.x)}, ${getSvgY(defender.y)})`}>
              <circle r="7.5" fill="var(--color-below)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
              <text y="3" fill="var(--text-inverse)" fontSize="8.5" fontWeight="bold" textAnchor="middle">D</text>
            </g>

            {/* Shooter Player Dot */}
            <g transform={`translate(${getSvgX(shooter.x)}, ${getSvgY(shooter.y)})`}>
              <circle r="8.5" fill="var(--color-primary)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" style={{ filter: 'drop-shadow(0 0 4px var(--color-primary))' }} />
              <text y="3" fill="var(--text-inverse)" fontSize="9" fontWeight="bold" textAnchor="middle">P</text>
            </g>

            {/* Animating Ball flying on shot */}
            {ballPos && (
              <circle 
                cx={getSvgX(ballPos.x)} 
                cy={getSvgY(ballPos.y)} 
                r="3.5" 
                fill="#ff7a00" 
                stroke="#000" 
                strokeWidth="0.5" 
              />
            )}
          </svg>

          {/* Live Contest overlay banner */}
          {gameState === 'playing' && (
            <div style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '10px', background: 'rgba(0,0,0,0.7)', border: '1px solid var(--panel-border)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span>Dist: <strong>{liveStats.dist.toFixed(1)}ft</strong> ({liveStats.isThree ? '3pt' : '2pt'})</span>
              <span>Defender Contest: <strong style={{ color: liveStats.defDist < 2.5 ? 'var(--color-below)' : liveStats.defDist < 5.0 ? 'var(--color-gold)' : 'var(--color-above)' }}>{liveStats.defDist.toFixed(1)}ft</strong></span>
              <span>Success Probability (xeFG%): <strong style={{ color: 'var(--color-primary)' }}>{(liveStats.prob * 100).toFixed(0)}%</strong></span>
            </div>
          )}
        </div>

        {/* Live Feedback Board */}
        <div style={{ color: feedbackColor, fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', minHeight: '18px', textAlign: 'center' }}>
          {feedbackText}
        </div>

        {/* Touch Optimized D-pad controls */}
        {gameState === 'playing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '280px' }}>
            <div className="arcade-controls-grid">
              <div></div>
              <button className="arcade-btn" style={{ touchAction: 'manipulation' }} onClick={() => moveShooter(0, -1.8)}>▲</button>
              <div></div>
              <button className="arcade-btn" style={{ touchAction: 'manipulation' }} onClick={() => moveShooter(-1.8, 0)}>◀</button>
              <button className="arcade-btn" style={{ background: 'var(--color-primary)', color: 'var(--text-inverse)', border: 'none', touchAction: 'manipulation' }} onClick={shoot}>🏀</button>
              <button className="arcade-btn" style={{ touchAction: 'manipulation' }} onClick={() => moveShooter(1.8, 0)}>▶</button>
              <div></div>
              <button className="arcade-btn" style={{ touchAction: 'manipulation' }} onClick={() => moveShooter(0, 1.8)}>▼</button>
              <div></div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Move: WASD/Arrows or Mobile buttons • Shoot: Spacebar or 🏀
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
