export default function Transport({
  isPlaying,
  bpm,
  swing,
  onPlay,
  onStop,
  onBpmChange,
  onSwingChange,
  masterVolume,
  onMasterVolume,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: '10px 16px',
        background: '#0e0e12',
        border: '1px solid #222',
        borderRadius: 8,
      }}
    >
      {/* Play/Stop */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onPlay}
          disabled={isPlaying}
          style={{
            width: 40,
            height: 32,
            borderRadius: 6,
            border: '1px solid #ff440066',
            background: isPlaying ? '#ff4400cc' : '#ff440022',
            color: '#ff8800',
            fontSize: 14,
            cursor: isPlaying ? 'default' : 'pointer',
            fontFamily: 'Courier New',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ▶
        </button>
        <button
          onClick={onStop}
          style={{
            width: 40,
            height: 32,
            borderRadius: 6,
            border: '1px solid #44444466',
            background: '#1a1a1e',
            color: '#888',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'Courier New',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ■
        </button>
      </div>

      {/* BPM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#666', fontFamily: 'Courier New', minWidth: 28 }}>
          BPM
        </span>
        <input
          type="number"
          min={40}
          max={300}
          value={bpm}
          onChange={(e) => onBpmChange(Math.min(300, Math.max(40, parseInt(e.target.value) || 120)))}
          style={{
            width: 52,
            background: '#1a1a20',
            color: '#ff8800',
            border: '1px solid #333',
            borderRadius: 4,
            padding: '3px 6px',
            fontSize: 13,
            fontFamily: 'Courier New',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <button
            onClick={() => onBpmChange(bpm + 1)}
            style={{ fontSize: 8, color: '#666', background: '#1a1a1e', border: '1px solid #333', borderRadius: 2, width: 18, height: 12, cursor: 'pointer', lineHeight: 1 }}
          >▲</button>
          <button
            onClick={() => onBpmChange(bpm - 1)}
            style={{ fontSize: 8, color: '#666', background: '#1a1a1e', border: '1px solid #333', borderRadius: 2, width: 18, height: 12, cursor: 'pointer', lineHeight: 1 }}
          >▼</button>
        </div>
      </div>

      {/* Swing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#666', fontFamily: 'Courier New' }}>
          SWING
        </span>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={swing}
          onChange={(e) => onSwingChange(parseFloat(e.target.value))}
          style={{ width: 70, accentColor: '#ff4400' }}
        />
        <span style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New', minWidth: 24 }}>
          {Math.round(swing * 200)}%
        </span>
      </div>

      {/* Master volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#666', fontFamily: 'Courier New' }}>
          VOL
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => onMasterVolume(parseFloat(e.target.value))}
          style={{ width: 70, accentColor: '#ff4400' }}
        />
        <span style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New', minWidth: 28 }}>
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      {/* Status */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isPlaying ? '#ff4400' : '#333',
            boxShadow: isPlaying ? '0 0 6px #ff4400' : 'none',
            animation: isPlaying ? 'pulse 1s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: isPlaying ? '#ff8800' : '#444',
            fontFamily: 'Courier New',
            fontWeight: 'bold',
          }}
        >
          {isPlaying ? 'PLAYING' : 'STOPPED'}
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
