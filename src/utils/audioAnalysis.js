/**
 * Audio analysis utilities: BPM detection, onset detection, auto-chop
 */

/** Compute RMS energy in chunks to find onsets */
export function detectOnsets(audioBuffer, sensitivity = 0.15) {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const chunkSize = Math.floor(sampleRate * 0.02); // 20ms windows
  const energies = [];

  for (let i = 0; i < data.length; i += chunkSize) {
    let sum = 0;
    const end = Math.min(i + chunkSize, data.length);
    for (let j = i; j < end; j++) {
      sum += data[j] * data[j];
    }
    energies.push(Math.sqrt(sum / (end - i)));
  }

  // Smooth energies
  const smoothed = energies.map((e, i) => {
    const window = energies.slice(Math.max(0, i - 3), i + 4);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });

  // Find onset positions (energy spikes)
  const onsets = [];
  const meanEnergy = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;
  const threshold = meanEnergy * (1 + sensitivity * 5);

  let lastOnset = -10;
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (
      smoothed[i] > threshold &&
      smoothed[i] > smoothed[i - 1] * 1.2 &&
      i - lastOnset > 5
    ) {
      const samplePos = i * chunkSize;
      onsets.push(samplePos);
      lastOnset = i;
    }
  }

  return onsets;
}

/** Estimate BPM from onset positions */
export function estimateBPM(onsets, sampleRate) {
  if (onsets.length < 4) return 120;

  const intervals = [];
  for (let i = 1; i < Math.min(onsets.length, 30); i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  // Filter outliers
  const sorted = [...intervals].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = intervals.filter(
    (v) => v >= q1 - iqr * 1.5 && v <= q3 + iqr * 1.5
  );

  if (filtered.length === 0) return 120;

  const avgInterval = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  const bpm = (60 * sampleRate) / avgInterval;

  // Snap to nearest common BPM
  const candidates = [bpm / 2, bpm, bpm * 2];
  const snapped = candidates.find((b) => b >= 60 && b <= 200) || bpm;
  return Math.round(snapped);
}

/** Auto-chop: slice buffer into equal segments based on number of slices or BPM */
export function autoChop(audioBuffer, mode = 'equal', sliceCount = 16) {
  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;

  let slicePoints = [];

  if (mode === 'onset') {
    const onsets = detectOnsets(audioBuffer, 0.12);
    // Deduplicate close onsets
    const minGap = sampleRate * 0.1;
    let last = -Infinity;
    for (const o of onsets) {
      if (o - last >= minGap) {
        slicePoints.push(o);
        last = o;
      }
    }
    slicePoints = slicePoints.slice(0, 32);
  } else if (mode === 'bars') {
    const onsets = detectOnsets(audioBuffer, 0.1);
    const bpm = estimateBPM(onsets, sampleRate);
    const barLen = (60 / bpm) * 4 * sampleRate; // samples per bar
    for (let pos = 0; pos < totalSamples - barLen * 0.5; pos += barLen) {
      slicePoints.push(Math.floor(pos));
    }
    slicePoints = slicePoints.slice(0, 32);
  } else {
    // Equal slices
    const segLen = Math.floor(totalSamples / sliceCount);
    for (let i = 0; i < sliceCount; i++) {
      slicePoints.push(i * segLen);
    }
  }

  if (slicePoints.length === 0) return [];

  // Build slice regions
  const regions = [];
  for (let i = 0; i < slicePoints.length; i++) {
    const start = slicePoints[i];
    const end = i + 1 < slicePoints.length ? slicePoints[i + 1] : totalSamples;
    const startTime = start / sampleRate;
    const endTime = end / sampleRate;
    if (endTime - startTime > 0.05) {
      regions.push({ id: i, start: startTime, end: endTime });
    }
  }
  return regions;
}

/** Extract a slice from an AudioBuffer as a new AudioBuffer */
export function extractSlice(audioBuffer, startTime, endTime, audioContext) {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.min(
    Math.ceil(endTime * sampleRate),
    audioBuffer.length
  );
  const length = endSample - startSample;
  if (length <= 0) return null;

  const channels = audioBuffer.numberOfChannels;
  const newBuffer = audioContext.createBuffer(channels, length, sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = newBuffer.getChannelData(ch);
    dst.set(src.subarray(startSample, endSample));
  }
  return newBuffer;
}

/** Normalize an AudioBuffer in place (peak normalize to -1dBFS) */
export function normalizeBuffer(audioBuffer) {
  let peak = 0;
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }
  if (peak === 0) return audioBuffer;
  const gain = 0.891 / peak; // ~-1dBFS
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      data[i] *= gain;
    }
  }
  return audioBuffer;
}

/** Build a simple waveform thumbnail (peaks array) for Canvas rendering */
export function buildWaveformPeaks(audioBuffer, resolution = 512) {
  const data = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(data.length / resolution);
  const peaks = new Float32Array(resolution);
  for (let i = 0; i < resolution; i++) {
    let max = 0;
    const start = i * blockSize;
    for (let j = start; j < start + blockSize && j < data.length; j++) {
      const v = Math.abs(data[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  return peaks;
}
