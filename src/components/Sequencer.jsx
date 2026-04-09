import { PAD_COLORS } from '../utils/effectsPresets';

export default function Sequencer({
  pads,
  pattern,
  currentStep,
  isPlaying,
  onToggleStep,
  onClear,
  onRandomize,
  activePadIndex,
}) {
  const activePads = pads
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.audioBuffer);

  if (activePads.length === 0) {
    return (
      <div
        style={{
          color: '#555',
          fontSize: 11,
          textAlign: 'center',
          padding: '20px 0',
          fontFamily: 'Courier New',
        }}
      >
        Load samples onto pads to use the sequencer
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      {/* Step header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '60px repeat(16, 1fr)',
          gap: 2,
          marginBottom: 4,
          minWidth: 520,
        }}
      >
        <div />
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 9,
              color:
                currentStep === i
                  ? '#ff8800'
                  : i % 4 === 0
                  ? '#666'
                  : '#333',
              fontFamily: 'Courier New',
              fontWeight: i % 4 === 0 ? 'bold' : 'normal',
              padding: '2px 0',
              background: currentStep === i ? '#ff880022' : 'transparent',
              borderRadius: 2,
              transition: 'background 0.05s',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Pad rows */}
      {activePads.map((pad) => {
        const color = PAD_COLORS[pad.index % PAD_COLORS.length];
        return (
          <div
            key={pad.index}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px repeat(16, 1fr)',
              gap: 2,
              marginBottom: 2,
              minWidth: 520,
            }}
          >
            {/* Pad label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                paddingRight: 4,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: pad.index === activePadIndex ? color : '#888',
                  fontFamily: 'Courier New',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 44,
                }}
                title={pad.name}
              >
                {pad.name || `P${pad.index + 1}`}
              </span>
            </div>

            {/* Steps */}
            {Array.from({ length: 16 }, (_, step) => {
              const active = pattern[pad.index]?.[step];
              const isCurrent = currentStep === step;
              return (
                <button
                  key={step}
                  onClick={() => onToggleStep(pad.index, step)}
                  style={{
                    height: 22,
                    borderRadius: 3,
                    border: `1px solid ${
                      isCurrent && isPlaying ? '#ff8800' :
                      active ? color + '88' : '#2a2a30'
                    }`,
                    background: active
                      ? isCurrent && isPlaying
                        ? '#ff8800'
                        : color + 'cc'
                      : isCurrent && isPlaying
                      ? '#ff880022'
                      : step % 4 === 0
                      ? '#1c1c22'
                      : '#141418',
                    cursor: 'pointer',
                    transition: 'all 0.05s',
                    transform: active && isCurrent && isPlaying ? 'scale(0.9)' : 'scale(1)',
                    boxShadow: active && isCurrent && isPlaying ? `0 0 6px ${color}` : 'none',
                  }}
                />
              );
            })}
          </div>
        );
      })}

      {/* Controls per row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 8,
          paddingLeft: 64,
        }}
      >
        <button
          onClick={() => onClear(activePadIndex)}
          style={{
            fontSize: 10,
            color: '#ff4400',
            border: '1px solid #ff440044',
            borderRadius: 4,
            padding: '3px 8px',
            background: 'transparent',
            fontFamily: 'Courier New',
            cursor: 'pointer',
          }}
        >
          CLEAR ROW
        </button>
        <button
          onClick={() => onRandomize(activePadIndex, 0.25)}
          style={{
            fontSize: 10,
            color: '#00aaff',
            border: '1px solid #00aaff44',
            borderRadius: 4,
            padding: '3px 8px',
            background: 'transparent',
            fontFamily: 'Courier New',
            cursor: 'pointer',
          }}
        >
          RANDOMIZE
        </button>
        <button
          onClick={() => onClear()}
          style={{
            fontSize: 10,
            color: '#888',
            border: '1px solid #333',
            borderRadius: 4,
            padding: '3px 8px',
            background: 'transparent',
            fontFamily: 'Courier New',
            cursor: 'pointer',
          }}
        >
          CLEAR ALL
        </button>
      </div>
    </div>
  );
}
