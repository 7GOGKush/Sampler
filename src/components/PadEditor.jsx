import { PAD_COLORS, EFFECTS } from '../utils/effectsPresets';

function Knob({ label, value, min, max, step = 0.01, onChange, format }) {
  const display = format ? format(value) : value.toFixed(2);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: 56,
      }}
    >
      <span style={{ fontSize: 9, color: '#888', fontFamily: 'Courier New' }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: 56, accentColor: '#ff4400' }}
      />
      <span style={{ fontSize: 9, color: '#ccc', fontFamily: 'Courier New' }}>
        {display}
      </span>
    </div>
  );
}

export default function PadEditor({ pad, padIndex, onChange }) {
  if (!pad) return null;
  const color = PAD_COLORS[padIndex % PAD_COLORS.length];

  const update = (key, value) => {
    onChange({ ...pad, [key]: value });
  };

  return (
    <div
      style={{
        background: '#12121a',
        border: `1px solid ${color}33`,
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: color,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              color,
              fontFamily: 'Courier New',
            }}
          >
            PAD {String(padIndex + 1).padStart(2, '0')}
          </span>
          {pad.name && (
            <span style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New' }}>
              — {pad.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => update('mute', !pad.mute)}
            style={{
              fontSize: 9,
              padding: '2px 6px',
              borderRadius: 3,
              border: `1px solid ${pad.mute ? '#ff0000' : '#444'}`,
              background: pad.mute ? '#ff000022' : 'transparent',
              color: pad.mute ? '#ff0000' : '#666',
              fontFamily: 'Courier New',
              cursor: 'pointer',
            }}
          >
            MUTE
          </button>
          <button
            onClick={() => update('oneshot', !pad.oneshot)}
            style={{
              fontSize: 9,
              padding: '2px 6px',
              borderRadius: 3,
              border: `1px solid ${pad.oneshot ? '#00aaff' : '#444'}`,
              background: pad.oneshot ? '#00aaff22' : 'transparent',
              color: pad.oneshot ? '#00aaff' : '#666',
              fontFamily: 'Courier New',
              cursor: 'pointer',
            }}
          >
            ONE-SHOT
          </button>
        </div>
      </div>

      {/* Knobs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Knob
          label="VOLUME"
          value={pad.volume ?? 0.8}
          min={0}
          max={1}
          onChange={(v) => update('volume', v)}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Knob
          label="PITCH"
          value={pad.pitch ?? 0}
          min={-24}
          max={24}
          step={1}
          onChange={(v) => update('pitch', v)}
          format={(v) => (v >= 0 ? `+${v}` : `${v}`) + 'st'}
        />
        <Knob
          label="ATTACK"
          value={pad.attack ?? 0.005}
          min={0.001}
          max={2}
          onChange={(v) => update('attack', v)}
          format={(v) => v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}s`}
        />
        <Knob
          label="RELEASE"
          value={pad.release ?? 0.3}
          min={0.01}
          max={4}
          onChange={(v) => update('release', v)}
          format={(v) => v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}s`}
        />
      </div>

      {/* Effect select */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New', minWidth: 40 }}>
          FX:
        </span>
        <select
          value={pad.effect || 'none'}
          onChange={(e) => update('effect', e.target.value)}
          style={{
            background: '#1a1a22',
            color: '#ddd',
            border: `1px solid ${color}44`,
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 11,
            fontFamily: 'Courier New',
            cursor: 'pointer',
            flex: 1,
          }}
        >
          {EFFECTS.map((fx) => (
            <option key={fx.id} value={fx.id}>
              {fx.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
