// src/App.tsx
import React, { useEffect, useState } from 'react';

interface AMSTray {
  color: string;
  type: string;
}

interface PrinterState {
  state: string;
  progress: number;
  remaining: number;
  nozzleTemp: number;
  bedTemp: number;
  chamberTemp: number;
  fileName: string;
  currentLayer: number;
  totalLayers: number;
  speedProfile: number;
  fanPart: number;
  fanAux: number;
  fanChamber: number;
  activeTray: number;
  amsTrays: AMSTray[];
  subState: number;
  theme: string;
}

export default function App() {
  const [data, setData] = useState<PrinterState>({
    state: 'IDLE',
    progress: 0,
    remaining: 0,
    nozzleTemp: 0,
    bedTemp: 0,
    chamberTemp: 0,
    fileName: 'No Active Job',
    currentLayer: 0,
    totalLayers: 0,
    speedProfile: 2,
    fanPart: 0,
    fanAux: 0,
    fanChamber: 0,
    activeTray: 255,
    amsTrays: Array(4).fill({ color: '#222222', type: 'EMPTY' }),
    subState: 0,
    theme: 'techy'
  });

  useEffect(() => {
    const handleFrameMessage = (event: MessageEvent) => {
      const incoming = event.data;
      if (incoming?.source?.includes('react-devtools')) return;

      if (incoming?.type === 'get-manifest') {
        window.parent.postMessage({ type: 'manifest', id: 'sample-client', name: 'Sample Client', short_name: 'SampleClient', description: 'Bambu Printer Monitor', version: '1.0.0' }, '*');
        return;
      }

      const eventType = incoming?.type || incoming?.data?.type || incoming?.payload?.type || incoming?.data?.payload?.type;

      if (eventType === 'printer-update') {
        const trueData = incoming?.payload?.payload || incoming?.payload || incoming?.data?.payload || incoming?.data;
        
        if (trueData) {
          setData((prev) => ({
            state: trueData.state !== undefined ? String(trueData.state).toUpperCase() : prev.state,
            progress: trueData.progress ?? prev.progress,
            remaining: trueData.remaining ?? prev.remaining,
            nozzleTemp: trueData.nozzleTemp ?? prev.nozzleTemp,
            bedTemp: trueData.bedTemp ?? prev.bedTemp,
            chamberTemp: trueData.chamberTemp ?? prev.chamberTemp,
            fileName: trueData.fileName !== undefined ? String(trueData.fileName) : prev.fileName,
            currentLayer: trueData.currentLayer ?? prev.currentLayer,
            totalLayers: trueData.totalLayers ?? prev.totalLayers,
            speedProfile: trueData.speedProfile ?? prev.speedProfile,
            fanPart: trueData.fanPart ?? prev.fanPart,
            fanAux: trueData.fanAux ?? prev.fanAux,
            fanChamber: trueData.fanChamber ?? prev.fanChamber,
            activeTray: trueData.activeTray ?? prev.activeTray,
            amsTrays: trueData.amsTrays || prev.amsTrays,
            subState: trueData.subState ?? prev.subState,
            theme: trueData.theme ?? prev.theme,
          }));
        }
      }
    };

    window.addEventListener('message', handleFrameMessage);
    return () => window.removeEventListener('message', handleFrameMessage);
  }, []);

  const formatTime = (mins: number) => {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h === 0 ? `${m}m` : `${h}h ${m}m`;
  };

  const getETA = (mins: number) => {
    if (!mins || mins <= 0) return '';
    const now = new Date();
    now.setMinutes(now.getMinutes() + mins);
    return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getSpeedName = (lvl: number) => {
    switch(lvl) {
      case 1: return 'Silent';
      case 2: return 'Standard';
      case 3: return 'Sport';
      case 4: return 'Ludicrous';
      default: return 'Standard';
    }
  };

  const getSubStateName = (id: number, state: string) => {
    if (state === 'IDLE') return 'Ready to Print';
    if (state === 'PAUSE') return 'Paused';
    if (state === 'FINISH') return 'Print Complete';
    switch(id) {
      case 1: return 'Auto Bed Leveling';
      case 2: return 'Heating Bed';
      case 3: return 'Sweeping XY Mech';
      case 4: return 'Changing Filament';
      case 7: return 'Heating Hotend';
      case 8: return 'Calibrating Extrusion';
      case 9: return 'Scanning Bed Surface';
      case 10: return 'Inspecting First Layer';
      case 11: return 'Identifying Build Plate';
      case 12: return 'Calibrating Micro Lidar';
      case 13: return 'Homing Toolhead';
      case 14: return 'Cleaning Nozzle';
      case 15: return 'Checking Extruder';
      case 17: return 'Purging Filament';
      case 18: return 'Parking Toolhead';
      default: return 'Printing';
    }
  };

  const ringColor = data.state === 'RUNNING' ? '#A855F7' : data.state === 'PAUSE' ? '#FFCC00' : '#0099FF';
  const isFlat = data.theme === 'flat';
  
  const activeFilament = (data.activeTray >= 0 && data.activeTray < data.amsTrays.length) 
    ? data.amsTrays[data.activeTray] 
    : null;

  return (
    <div style={{ ...styles.wrapper, background: isFlat ? '#09090B' : '#050505' }}>
      
      {/* Dynamic Theming & Animations */}
      <style>{`
        @keyframes pulseRing {
          0% { filter: drop-shadow(0 0 5px ${ringColor}); }
          50% { filter: drop-shadow(0 0 18px ${ringColor}); }
          100% { filter: drop-shadow(0 0 5px ${ringColor}); }
        }
        @keyframes breatheAMS {
          0% { box-shadow: inset 0 2px 4px rgba(0,0,0,0.5), 0 0 8px ${ringColor}; }
          50% { box-shadow: inset 0 2px 4px rgba(0,0,0,0.5), 0 0 22px ${ringColor}; }
          100% { box-shadow: inset 0 2px 4px rgba(0,0,0,0.5), 0 0 8px ${ringColor}; }
        }
        .techy-ring.active-state { animation: pulseRing 3s infinite ease-in-out; }
        .techy-ams.active-state { animation: breatheAMS 2.5s infinite ease-in-out; }
      `}</style>

      {/* SVG Perimeter Ring */}
      <svg style={styles.svgRing}>
        <rect 
          x="6" y="6" 
          width="calc(100% - 12px)" height="calc(100% - 12px)" 
          rx="20" fill="transparent" stroke={isFlat ? "#18181B" : "#151515"} strokeWidth="12" 
        />
        <rect
          className={!isFlat && data.state === 'RUNNING' ? 'techy-ring active-state' : ''}
          x="6" y="6"
          width="calc(100% - 12px)" height="calc(100% - 12px)"
          rx="20"
          fill="transparent"
          stroke={data.state === 'IDLE' ? (isFlat ? '#27272A' : '#333') : ringColor}
          strokeWidth="12"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - (data.progress || 0)}
          strokeLinecap={isFlat ? 'butt' : 'round'}
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease' }}
        />
      </svg>

      <div style={styles.content}>
        
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Bambu Lab Monitor</h1>
          <div style={styles.headerRight}>
            <span style={{ ...styles.speedBadge, background: isFlat ? '#18181B' : 'rgba(255,255,255,0.05)', border: isFlat ? '1px solid #27272A' : '1px solid rgba(255,255,255,0.1)' }}>
              {getSpeedName(data.speedProfile)}
            </span>
            <span style={{ ...styles.badge, borderColor: ringColor, color: ringColor, background: isFlat ? 'transparent' : 'rgba(0,0,0,0.5)' }}>
              {data.state}
            </span>
          </div>
        </div>

        <div style={styles.mainDashboard}>
          
          {/* Left Column */}
          <div style={styles.leftCol}>
            <h2 style={{ ...styles.hugeProgress, color: ringColor, filter: isFlat ? 'none' : `drop-shadow(0 0 12px ${ringColor}88)` }}>
              {Math.round(data.progress)}%
            </h2>
            <p style={styles.timeLabel}>
              {data.state === 'RUNNING' && data.remaining > 0 
                ? `ETA: ${getETA(data.remaining)} (${formatTime(data.remaining)} left)` 
                : formatTime(data.remaining)}
            </p>
            
            <div style={styles.infoPillsRow}>
              <div style={{ ...styles.layerBox, background: isFlat ? '#18181B' : 'rgba(255,255,255,0.05)', border: isFlat ? '1px solid #27272A' : '1px solid rgba(255,255,255,0.1)' }}>
                <span style={styles.layerText}>Layer {data.currentLayer} / {data.totalLayers}</span>
              </div>
              {activeFilament && activeFilament.type !== 'EMPTY' && (
                <div style={{ ...styles.filamentPill, borderColor: ringColor, background: isFlat ? '#18181B' : 'rgba(255,255,255,0.05)' }}>
                  <span style={{ ...styles.miniDot, backgroundColor: activeFilament.color }} />
                  <span style={styles.filamentText}>{activeFilament.type}</span>
                </div>
              )}
            </div>
            
            <p style={styles.fileName}>{data.fileName}</p>
            <p style={{...styles.subStateText, color: ringColor}}>{getSubStateName(data.subState, data.state)}</p>
          </div>

          {/* Right Column */}
          <div style={styles.rightCol}>
            
            <div style={styles.dataGrid6}>
              {/* Stat Boxes */}
              {[
                { label: 'Nozzle', value: Math.round(data.nozzleTemp), unit: '°C' },
                { label: 'Bed', value: Math.round(data.bedTemp), unit: '°C' },
                { label: 'Chamber', value: Math.round(data.chamberTemp), unit: '°C' },
                { label: 'Part Fan', value: data.fanPart, unit: '%' },
                { label: 'Aux Fan', value: data.fanAux, unit: '%' },
                { label: 'Exhaust', value: data.fanChamber, unit: '%' }
              ].map((stat, i) => (
                <div key={i} style={{ ...styles.statBox, background: isFlat ? '#18181B' : 'rgba(20,20,20,0.8)', border: isFlat ? '1px solid #27272A' : '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={styles.label}>{stat.label}</span>
                  <span style={{...styles.value, color: isFlat ? '#E4E4E7' : '#FFF'}}>{stat.value}<small style={styles.unit}>{stat.unit}</small></span>
                </div>
              ))}
            </div>

            {/* AMS Array */}
            <div style={{ ...styles.amsContainer, background: isFlat ? '#18181B' : 'rgba(20,20,20,0.8)', border: isFlat ? '1px solid #27272A' : '1px solid rgba(255,255,255,0.05)' }}>
              {data.amsTrays.map((tray, idx) => {
                const isActive = data.activeTray === idx;
                const isEmpty = tray.type === 'EMPTY';
                
                // Theme Logic for Spool Border and Glow
                let spoolBorderColor = 'rgba(255,255,255,0.05)';
                let spoolBg = 'rgba(0,0,0,0.3)';
                if (isFlat) {
                  spoolBorderColor = isActive ? ringColor : '#27272A';
                  spoolBg = isActive ? '#27272A' : '#09090B';
                } else if (isActive) {
                  spoolBorderColor = ringColor;
                  spoolBg = 'rgba(168, 85, 247, 0.12)';
                }

                return (
                  <div key={idx} style={{
                    ...styles.spoolBox,
                    background: spoolBg,
                    borderColor: spoolBorderColor,
                    borderWidth: isFlat && isActive ? '2px' : (isActive ? '2px' : '1px'),
                    opacity: isEmpty ? (isFlat ? 0.15 : 0.25) : 1,
                    transform: isActive && !isFlat ? 'scale(1.02)' : 'scale(1)',
                  }}>
                    <div 
                      className={!isFlat && isActive && data.state === 'RUNNING' ? 'techy-ams active-state' : ''} 
                      style={{
                        ...styles.spoolColor, 
                        backgroundColor: tray.color,
                        boxShadow: isFlat ? `0 0 0 2px ${isActive ? ringColor : '#3F3F46'}` : (isActive ? `0 0 12px ${ringColor}, inset 0 2px 4px rgba(0,0,0,0.5)` : '0 0 0 2px rgba(255,255,255,0.1), inset 0 2px 4px rgba(0,0,0,0.5)')
                      }} 
                    />
                    <div style={styles.spoolInfo}>
                      <span style={{...styles.spoolSlot, color: isActive ? ringColor : (isFlat ? '#71717A' : '#666')}}>A{idx + 1}</span>
                      <span style={{...styles.spoolType, color: isActive ? '#FFF' : (isFlat ? '#A1A1AA' : '#AAA')}}>{tray.type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative' as const, width: '100vw', height: '100vh', color: '#FFF', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden', transition: 'background 0.3s' },
  svgRing: { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' as const },
  content: { position: 'relative' as const, zIndex: 1, width: '100%', height: '100%', padding: '28px 32px', display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' as const },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', margin: 0, fontWeight: 700, color: '#E0E0E0', letterSpacing: '1px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  speedBadge: { padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#A1A1AA' },
  badge: { padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '1.5px', border: '2px solid' },
  
  mainDashboard: { display: 'flex', gap: '32px', flex: 1, alignItems: 'center' },
  
  leftCol: { flex: '0 0 35%', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', gap: '8px' },
  hugeProgress: { margin: '0 0 -6px 0', fontSize: '68px', fontWeight: 800, lineHeight: 1, letterSpacing: '-2px', transition: 'color 0.3s' },
  timeLabel: { fontSize: '15px', color: '#888', fontWeight: 600, margin: '0 0 8px 0' },
  
  infoPillsRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  layerBox: { padding: '6px 12px', borderRadius: '10px' },
  layerText: { fontSize: '13px', color: '#FFF', fontWeight: 700 },
  filamentPill: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', border: '1px solid' },
  miniDot: { width: '10px', height: '10px', borderRadius: '50%' },
  filamentText: { fontSize: '13px', color: '#FFF', fontWeight: 700 },

  fileName: { margin: '10px 0 0 0', fontSize: '15px', fontWeight: 500, color: '#A1A1AA', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' },
  subStateText: { margin: '2px 0 0 0', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px' },

  rightCol: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '14px' },
  dataGrid6: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  statBox: { padding: '12px 14px', borderRadius: '12px', display: 'flex', flexDirection: 'column' as const },
  label: { fontSize: '11px', color: '#71717A', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '4px', fontWeight: 700 },
  value: { fontSize: '24px', fontWeight: 800, lineHeight: 1 },
  unit: { fontSize: '13px', color: '#71717A', marginLeft: '4px', fontWeight: 600 },

  amsContainer: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '12px 14px', borderRadius: '12px' },
  spoolBox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', borderStyle: 'solid', transition: 'all 0.3s ease' },
  spoolColor: { width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0 },
  spoolInfo: { display: 'flex', flexDirection: 'column' as const, lineHeight: '1.2' },
  spoolSlot: { fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' },
  spoolType: { fontSize: '13px', fontWeight: 700 }
};