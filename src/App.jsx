import { useState, useCallback, useRef } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useSequencer } from './hooks/useSequencer';
import { autoChop, extractSlice, estimateBPM, detectOnsets } from './utils/audioAnalysis';
import { EFFECTS, DEFAULT_PAD } from './utils/effectsPresets';
import WaveformDisplay from './components/WaveformDisplay';
import PadGrid from './components/PadGrid';
import PadEditor from './components/PadEditor';
import Sequencer from './components/Sequencer';
import Transport from './components/Transport';
import FileUploader from './components/FileUploader';

const NUM_PADS = 16;

function createPads() {
  return Array.from({ length: NUM_PADS }, () => ({ ...DEFAULT_PAD }));
}

export default function App() {
  const [pads, setPads] = useState(createPads);
  const [activePadIndex, setActivePadIndex] = useState(0);
  const [playingPads, setPlayingPads] = useState(new Set());
  const [masterVolume, setMasterVolume] = useState(0.85);

  // Source audio state
  const [sourceBuffer, setSourceBuffer] = useState(null);
  const [sourceFileName, setSourceFileName] = useState('');
  const [sliceRegions, setSliceRegions] = useState([]);
  const [sliceMode, setSliceMode] = useState('equal');
  const [sliceCount, setSliceCount] = useState(16);
  const [detectedBpm, setDetectedBpm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pads'); // pads | sequencer | editor

  const masterGainRef = useRef(null);
  const { getCtx, decodeAudio, playPad, stopAll } = useAudioEngine();

  // Handle sequencer step callback
  const handleStep = useCallback((padIndex, _step, _time) => {
    const pad = pads[padIndex];
    if (!pad?.audioBuffer || pad.mute) return;
    setPlayingPads((prev) => {
      const next = new Set(prev);
      next.add(padIndex);
      return next;
    });
    playPad(padIndex, pad.audioBuffer, { ...pad, volume: pad.volume * masterVolume }, EFFECTS);
    setTimeout(() => {
      setPlayingPads((prev) => {
        const next = new Set(prev);
        next.delete(padIndex);
        return next;
      });
    }, 120);
  }, [pads, masterVolume, playPad]);

  const { bpm, setBpm, isPlaying, play, stop, currentStep, pattern,
    toggleStep, clearPattern, randomizePattern, swing, setSwing } = useSequencer(handleStep);

  // Load audio file
  const handleFile = useCallback(async (file) => {
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await decodeAudio(arrayBuffer);
      setSourceBuffer(audioBuffer);
      setSourceFileName(file.name.replace(/\.[^/.]+$/, ''));

      // Detect BPM
      const onsets = detectOnsets(audioBuffer, 0.12);
      const estimatedBpm = estimateBPM(onsets, audioBuffer.sampleRate);
      setDetectedBpm(estimatedBpm);
      setBpm(estimatedBpm);

      // Auto-chop
      const regions = autoChop(audioBuffer, sliceMode, sliceCount);
      setSliceRegions(regions);
    } catch (err) {
      console.error('Failed to load audio:', err);
      alert('Failed to decode audio file. Make sure it is a valid MP3, WAV, FLAC, or OGG file.');
    } finally {
      setLoading(false);
    }
  }, [decodeAudio, sliceMode, sliceCount, setBpm]);

  // Re-chop with new settings
  const handleRechop = useCallback(() => {
    if (!sourceBuffer) return;
    const regions = autoChop(sourceBuffer, sliceMode, sliceCount);
    setSliceRegions(regions);
  }, [sourceBuffer, sliceMode, sliceCount]);

  // Assign a slice to a specific pad
  const assignSliceToPad = useCallback((padIndex, sliceIndex) => {
    if (!sourceBuffer || !sliceRegions[sliceIndex]) return;
    const ctx = getCtx();
    const region = sliceRegions[sliceIndex];
    const sliceBuf = extractSlice(sourceBuffer, region.start, region.end, ctx);
    if (!sliceBuf) return;

    const sliceName = `${sourceFileName}_${sliceIndex + 1}`;
    setPads((prev) => {
      const next = [...prev];
      next[padIndex] = {
        ...next[padIndex],
        audioBuffer: sliceBuf,
        name: sliceName,
        sample: sliceName,
      };
      return next;
    });
  }, [sourceBuffer, sliceRegions, sourceFileName, getCtx]);

  // Auto-assign all slices to pads
  const autoAssignAll = useCallback(() => {
    if (!sourceBuffer || sliceRegions.length === 0) return;
    const ctx = getCtx();
    const newPads = [...pads];
    const count = Math.min(sliceRegions.length, NUM_PADS);
    for (let i = 0; i < count; i++) {
      const region = sliceRegions[i];
      const buf = extractSlice(sourceBuffer, region.start, region.end, ctx);
      if (buf) {
        newPads[i] = {
          ...newPads[i],
          audioBuffer: buf,
          name: `${sourceFileName}_${i + 1}`,
          sample: `${sourceFileName}_${i + 1}`,
        };
      }
    }
    setPads(newPads);
  }, [sourceBuffer, sliceRegions, sourceFileName, pads, getCtx]);

  // Trigger a pad manually
  const handlePadTrigger = useCallback((padIndex) => {
    const pad = pads[padIndex];
    if (!pad?.audioBuffer || pad.mute) return;

    setPlayingPads((prev) => {
      const next = new Set(prev);
      next.add(padIndex);
      return next;
    });

    playPad(padIndex, pad.audioBuffer, { ...pad, volume: pad.volume * masterVolume }, EFFECTS);

    const duration = Math.min(pad.audioBuffer.duration * 1000, 600);
    setTimeout(() => {
      setPlayingPads((prev) => {
        const next = new Set(prev);
        next.delete(padIndex);
        return next;
      });
    }, duration);
  }, [pads, masterVolume, playPad]);

  const handlePadChange = useCallback((updated) => {
    setPads((prev) => {
      const next = [...prev];
      next[activePadIndex] = updated;
      return next;
    });
  }, [activePadIndex]);

  const handleStop = useCallback(() => {
    stop();
    stopAll();
    setPlayingPads(new Set());
  }, [stop, stopAll]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 8px',
        gap: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#0d0d12',
          border: '1px solid #ff440022',
          borderRadius: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #ff4400, #ff8800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🎛
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#ff8800', fontFamily: 'Courier New', letterSpacing: 2 }}>
              AI SAMPLER
            </div>
            <div style={{ fontSize: 9, color: '#555', fontFamily: 'Courier New', letterSpacing: 1 }}>
              SP-404 STYLE • BEAT MACHINE
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#444', fontFamily: 'Courier New', textAlign: 'right' }}>
          {sourceFileName && (
            <div style={{ color: '#888' }}>{sourceFileName}</div>
          )}
          {detectedBpm && (
            <div style={{ color: '#ff4400' }}>AI DETECTED: {detectedBpm} BPM</div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: 12,
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* File Upload + Waveform */}
          <div
            style={{
              background: '#0d0d12',
              border: '1px solid #222',
              borderRadius: 10,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New', letterSpacing: 1 }}>
                SAMPLE SOURCE
              </span>
              {sourceBuffer && (
                <span style={{ fontSize: 9, color: '#555', fontFamily: 'Courier New' }}>
                  {sourceBuffer.duration.toFixed(1)}s • {sourceBuffer.sampleRate}Hz • {sourceBuffer.numberOfChannels}ch
                </span>
              )}
            </div>

            <FileUploader onFile={handleFile} loading={loading} />
            <WaveformDisplay
              audioBuffer={sourceBuffer}
              sliceRegions={sliceRegions}
              activePad={activePadIndex < sliceRegions.length ? activePadIndex : -1}
              onSliceClick={(idx) => {
                setActivePadIndex(idx);
                assignSliceToPad(idx, idx);
              }}
            />

            {/* Slice Controls */}
            {sourceBuffer && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: '#666', fontFamily: 'Courier New' }}>
                  CHOP:
                </span>
                <select
                  value={sliceMode}
                  onChange={(e) => setSliceMode(e.target.value)}
                  style={{ fontSize: 10, background: '#1a1a20', color: '#ddd', border: '1px solid #333', borderRadius: 4, padding: '3px 6px', fontFamily: 'Courier New' }}
                >
                  <option value="equal">Equal Slices</option>
                  <option value="onset">Onset Detection</option>
                  <option value="bars">Beat/Bars</option>
                </select>
                {sliceMode === 'equal' && (
                  <select
                    value={sliceCount}
                    onChange={(e) => setSliceCount(parseInt(e.target.value))}
                    style={{ fontSize: 10, background: '#1a1a20', color: '#ddd', border: '1px solid #333', borderRadius: 4, padding: '3px 6px', fontFamily: 'Courier New' }}
                  >
                    {[4, 8, 12, 16, 24, 32].map((n) => (
                      <option key={n} value={n}>{n} slices</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleRechop}
                  style={{
                    fontSize: 10,
                    color: '#ff8800',
                    border: '1px solid #ff440044',
                    borderRadius: 4,
                    padding: '3px 10px',
                    background: '#ff440011',
                    fontFamily: 'Courier New',
                    cursor: 'pointer',
                  }}
                >
                  RE-CHOP
                </button>
                <button
                  onClick={autoAssignAll}
                  style={{
                    fontSize: 10,
                    color: '#00ff88',
                    border: '1px solid #00ff8844',
                    borderRadius: 4,
                    padding: '3px 10px',
                    background: '#00ff8811',
                    fontFamily: 'Courier New',
                    cursor: 'pointer',
                  }}
                >
                  AUTO-ASSIGN PADS →
                </button>
                <span style={{ fontSize: 9, color: '#555', fontFamily: 'Courier New' }}>
                  {sliceRegions.length} slices
                </span>
              </div>
            )}
          </div>

          {/* Transport */}
          <Transport
            isPlaying={isPlaying}
            bpm={bpm}
            swing={swing}
            onPlay={play}
            onStop={handleStop}
            onBpmChange={setBpm}
            onSwingChange={setSwing}
            masterVolume={masterVolume}
            onMasterVolume={setMasterVolume}
          />

          {/* Tabs */}
          <div
            style={{
              background: '#0d0d12',
              border: '1px solid #222',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
              {['pads', 'sequencer', 'editor'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    fontSize: 10,
                    fontFamily: 'Courier New',
                    fontWeight: 'bold',
                    letterSpacing: 1,
                    color: activeTab === tab ? '#ff8800' : '#555',
                    background: activeTab === tab ? '#ff440011' : 'transparent',
                    borderBottom: activeTab === tab ? '2px solid #ff4400' : '2px solid transparent',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ padding: 12 }}>
              {activeTab === 'pads' && (
                <PadGrid
                  pads={pads}
                  activePadIndex={activePadIndex}
                  playingPads={playingPads}
                  onPadTrigger={handlePadTrigger}
                  onPadSelect={setActivePadIndex}
                  onPadDrop={assignSliceToPad}
                />
              )}
              {activeTab === 'sequencer' && (
                <Sequencer
                  pads={pads}
                  pattern={pattern}
                  currentStep={currentStep}
                  isPlaying={isPlaying}
                  onToggleStep={toggleStep}
                  onClear={clearPattern}
                  onRandomize={randomizePattern}
                  activePadIndex={activePadIndex}
                />
              )}
              {activeTab === 'editor' && (
                <PadEditor
                  pad={pads[activePadIndex]}
                  padIndex={activePadIndex}
                  onChange={handlePadChange}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Slice Browser */}
        <div
          style={{
            background: '#0d0d12',
            border: '1px solid #222',
            borderRadius: 10,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 680,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New', letterSpacing: 1, marginBottom: 4 }}>
            SLICE BROWSER
          </div>

          {sliceRegions.length === 0 ? (
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'Courier New', textAlign: 'center', padding: '24px 8px', lineHeight: 1.8 }}>
              Upload an audio file to<br />generate slices
            </div>
          ) : (
            sliceRegions.map((region, idx) => {
              const assignedPad = pads.findIndex((p) => p.sample === `${sourceFileName}_${idx + 1}`);
              const isAssigned = assignedPad >= 0;
              const isActive = activePadIndex === idx;
              return (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('sliceIndex', String(idx))}
                  onClick={() => {
                    setActivePadIndex(idx);
                    assignSliceToPad(idx, idx);
                  }}
                  style={{
                    background: isActive ? '#ff440022' : isAssigned ? '#00ff8811' : '#141418',
                    border: `1px solid ${isActive ? '#ff4400' : isAssigned ? '#00ff8844' : '#222'}`,
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: isActive ? '#ff8800' : '#666',
                      fontFamily: 'Courier New',
                      fontWeight: 'bold',
                      minWidth: 18,
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: '#ccc', fontFamily: 'Courier New' }}>
                      {(region.end - region.start).toFixed(2)}s
                    </div>
                    <div style={{ fontSize: 8, color: '#555', fontFamily: 'Courier New' }}>
                      {region.start.toFixed(2)} → {region.end.toFixed(2)}
                    </div>
                  </div>
                  {isAssigned ? (
                    <span style={{ fontSize: 8, color: '#00ff88', fontFamily: 'Courier New' }}>
                      P{assignedPad + 1}
                    </span>
                  ) : (
                    <span style={{ fontSize: 8, color: '#333', fontFamily: 'Courier New' }}>
                      drag
                    </span>
                  )}
                </div>
              );
            })
          )}

          {/* Pad assignment summary */}
          {pads.some((p) => p.audioBuffer) && (
            <>
              <div style={{ fontSize: 10, color: '#888', fontFamily: 'Courier New', letterSpacing: 1, marginTop: 8, marginBottom: 4, borderTop: '1px solid #222', paddingTop: 8 }}>
                PAD SUMMARY
              </div>
              {pads.map((pad, idx) => pad.audioBuffer ? (
                <div
                  key={idx}
                  onClick={() => { setActivePadIndex(idx); setActiveTab('editor'); }}
                  style={{
                    background: idx === activePadIndex ? '#ff440022' : '#141418',
                    border: `1px solid ${idx === activePadIndex ? '#ff440066' : '#222'}`,
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 9, color: '#ff4400', fontFamily: 'Courier New', fontWeight: 'bold', minWidth: 18 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 9, color: '#aaa', fontFamily: 'Courier New', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pad.name}
                  </span>
                  <span style={{ fontSize: 8, color: '#555', fontFamily: 'Courier New' }}>
                    {pad.audioBuffer.duration.toFixed(1)}s
                  </span>
                </div>
              ) : null)}
            </>
          )}
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div style={{ fontSize: 9, color: '#333', fontFamily: 'Courier New', marginTop: 4 }}>
        CLICK PADS TO TRIGGER • DRAG SLICES ONTO PADS • CLICK WAVEFORM TO ASSIGN SLICE
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
