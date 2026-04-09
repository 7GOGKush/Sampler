import { useRef, useEffect } from 'react';
import { buildWaveformPeaks } from '../utils/audioAnalysis';

const CANVAS_H = 80;

export default function WaveformDisplay({ audioBuffer, sliceRegions = [], activePad, onSliceClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = CANVAS_H;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0e0e12';
    ctx.fillRect(0, 0, W, H);

    if (!audioBuffer) {
      ctx.fillStyle = '#333';
      ctx.font = '12px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('Drop or upload audio file', W / 2, H / 2);
      return;
    }

    const peaks = buildWaveformPeaks(audioBuffer, W);

    // Draw waveform
    ctx.fillStyle = '#1a1a20';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // Waveform bars
    const mid = H / 2;
    for (let i = 0; i < W; i++) {
      const peak = peaks[i] || 0;
      const barH = peak * (H - 8);
      const gradient = ctx.createLinearGradient(i, mid - barH, i, mid + barH);
      gradient.addColorStop(0, '#ff6600aa');
      gradient.addColorStop(0.5, '#ff4400');
      gradient.addColorStop(1, '#ff6600aa');
      ctx.fillStyle = gradient;
      ctx.fillRect(i, mid - barH / 2, 1, barH);
    }

    // Draw slice regions
    const duration = audioBuffer.duration;
    sliceRegions.forEach((region, idx) => {
      const x1 = (region.start / duration) * W;
      const x2 = (region.end / duration) * W;

      // Slice highlight
      const isActive = idx === activePad;
      ctx.fillStyle = isActive ? 'rgba(255,136,0,0.25)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x1, 0, x2 - x1, H);

      // Slice marker line
      ctx.strokeStyle = isActive ? '#ff8800' : '#ff440055';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, H);
      ctx.stroke();

      // Slice number
      if (x2 - x1 > 20) {
        ctx.fillStyle = isActive ? '#ff8800' : '#ff440088';
        ctx.font = `${isActive ? 'bold ' : ''}10px Courier New`;
        ctx.textAlign = 'left';
        ctx.fillText(`${idx + 1}`, x1 + 3, 12);
      }
    });

    // End marker
    if (sliceRegions.length > 0) {
      const last = sliceRegions[sliceRegions.length - 1];
      const x = (last.end / duration) * W;
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Playhead border
    ctx.strokeStyle = '#ff440044';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
  }, [audioBuffer, sliceRegions, activePad]);

  const handleClick = (e) => {
    if (!audioBuffer || !onSliceClick || sliceRegions.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / canvas.width;
    const time = ratio * audioBuffer.duration;
    const idx = sliceRegions.findIndex(
      (r) => time >= r.start && time < r.end
    );
    if (idx >= 0) onSliceClick(idx);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={CANVAS_H}
        onClick={handleClick}
        style={{
          width: '100%',
          height: CANVAS_H,
          cursor: sliceRegions.length > 0 ? 'pointer' : 'default',
          borderRadius: 6,
          display: 'block',
        }}
      />
    </div>
  );
}
