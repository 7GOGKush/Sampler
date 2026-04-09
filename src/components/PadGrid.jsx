import { useState, useCallback } from 'react';
import { PAD_COLORS } from '../utils/effectsPresets';

export default function PadGrid({
  pads,
  activePadIndex,
  playingPads,
  onPadTrigger,
  onPadSelect,
  onPadDrop,
}) {
  const [dragOver, setDragOver] = useState(null);

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    setDragOver(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    setDragOver(null);
    const data = e.dataTransfer.getData('sliceIndex');
    if (data !== '' && onPadDrop) {
      onPadDrop(idx, parseInt(data, 10));
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        padding: 8,
      }}
    >
      {pads.map((pad, idx) => {
        const color = PAD_COLORS[idx % PAD_COLORS.length];
        const isActive = idx === activePadIndex;
        const isPlaying = playingPads?.has(idx);
        const hasSound = !!pad.audioBuffer;
        const isDragTarget = dragOver === idx;

        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              onMouseDown={() => onPadTrigger(idx)}
              onClick={() => onPadSelect(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, idx)}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                border: `2px solid ${
                  isDragTarget ? '#fff' :
                  isActive ? color :
                  isPlaying ? color :
                  hasSound ? color + '66' : '#333'
                }`,
                background: isPlaying
                  ? color + 'cc'
                  : isDragTarget
                  ? color + '44'
                  : isActive
                  ? color + '33'
                  : hasSound
                  ? color + '18'
                  : '#1a1a1e',
                cursor: 'pointer',
                transition: 'all 0.06s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: 6,
                boxShadow: isPlaying
                  ? `0 0 16px ${color}88, inset 0 0 8px ${color}44`
                  : isActive
                  ? `0 0 8px ${color}44`
                  : 'none',
                transform: isPlaying ? 'scale(0.96)' : 'scale(1)',
                minHeight: 70,
                position: 'relative',
              }}
            >
              {/* Pad number */}
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 6,
                  fontSize: 9,
                  color: hasSound ? color : '#555',
                  fontFamily: 'Courier New',
                  fontWeight: 'bold',
                }}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* LED indicator */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isPlaying ? color : hasSound ? color + '88' : '#333',
                  boxShadow: isPlaying ? `0 0 8px ${color}` : 'none',
                  flexShrink: 0,
                }}
              />

              {/* Sample name */}
              {hasSound && (
                <span
                  style={{
                    fontSize: 8,
                    color: isActive ? color : '#aaa',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '90%',
                    fontFamily: 'Courier New',
                    lineHeight: 1.2,
                  }}
                >
                  {pad.name || `PAD ${idx + 1}`}
                </span>
              )}

              {!hasSound && (
                <span style={{ fontSize: 8, color: '#444', fontFamily: 'Courier New' }}>
                  EMPTY
                </span>
              )}

              {/* Mute indicator */}
              {pad.mute && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    right: 5,
                    fontSize: 7,
                    color: '#ff0000',
                    fontFamily: 'Courier New',
                  }}
                >
                  M
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
