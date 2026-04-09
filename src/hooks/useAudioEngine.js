import { useRef, useCallback } from 'react';

/**
 * Low-level Web Audio API engine.
 * Returns helpers to decode files, play buffers with effects, and stop.
 */
export function useAudioEngine() {
  const ctxRef = useRef(null);
  const activeNodes = useRef(new Map()); // padIndex -> { source, gainNode }

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100,
        latencyHint: 'interactive',
      });
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  /** Decode an ArrayBuffer into an AudioBuffer */
  const decodeAudio = useCallback(async (arrayBuffer) => {
    const ctx = getCtx();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return decoded;
  }, [getCtx]);

  /** Build an effect chain from an effect id */
  const buildEffect = useCallback((ctx, effectId, effectsPresets) => {
    const preset = effectsPresets.find((e) => e.id === effectId);
    if (!preset || !preset.type) return null;

    const p = preset.params || {};
    switch (preset.type) {
      case 'reverb': {
        const convolver = ctx.createConvolver();
        // Synthetic impulse response
        const len = ctx.sampleRate * (p.decay || 2);
        const ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = ir.getChannelData(ch);
          for (let i = 0; i < len; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
          }
        }
        convolver.buffer = ir;
        // wet/dry
        const dry = ctx.createGain();
        const wet = ctx.createGain();
        dry.gain.value = 1 - (p.wet || 0.3);
        wet.gain.value = p.wet || 0.3;
        const output = ctx.createGain();
        // wiring: input -> dry -> output AND input -> convolver -> wet -> output
        // Return as { input: dry, output }  (caller handles splitting)
        return { convolver, dry, wet, output };
      }
      case 'delay': {
        const delay = ctx.createDelay(2.0);
        delay.delayTime.value = p.delayTime || 0.25;
        const feedback = ctx.createGain();
        feedback.gain.value = p.feedback || 0.4;
        delay.connect(feedback);
        feedback.connect(delay);
        return { node: delay };
      }
      case 'filter': {
        const filter = ctx.createBiquadFilter();
        filter.type = p.type || 'lowpass';
        filter.frequency.value = p.frequency || 1000;
        return { node: filter };
      }
      case 'distortion': {
        const wshaper = ctx.createWaveShaper();
        const amount = p.distortion || 0.5;
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = ((Math.PI + amount * 100) * x) / (Math.PI + amount * 100 * Math.abs(x));
        }
        wshaper.curve = curve;
        wshaper.oversample = '4x';
        return { node: wshaper };
      }
      case 'bitcrush': {
        // ScriptProcessor for bitcrushing
        const bits = p.bits || 6;
        const step = Math.pow(0.5, bits);
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        proc.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const output = e.outputBuffer.getChannelData(0);
          for (let i = 0; i < input.length; i++) {
            output[i] = step * Math.floor(input[i] / step + 0.5);
          }
        };
        return { node: proc };
      }
      default:
        return null;
    }
  }, []);

  /**
   * Play an AudioBuffer on a pad with optional effect
   * @param {number} padIndex
   * @param {AudioBuffer} audioBuffer
   * @param {object} padConfig - { volume, pitch, attack, release, effect, oneshot }
   * @param {Array} effectsPresets
   */
  const playPad = useCallback((padIndex, audioBuffer, padConfig, effectsPresets) => {
    const ctx = getCtx();

    // Stop previous if oneshot
    if (padConfig.oneshot && activeNodes.current.has(padIndex)) {
      try { activeNodes.current.get(padIndex).source.stop(); } catch {}
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Pitch shift via playbackRate (semitones)
    if (padConfig.pitch !== 0) {
      source.playbackRate.value = Math.pow(2, padConfig.pitch / 12);
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      padConfig.volume ?? 0.8,
      ctx.currentTime + (padConfig.attack || 0.005)
    );

    // Simple effect insert
    const fxData = buildEffect(ctx, padConfig.effect, effectsPresets || []);
    if (fxData && fxData.node) {
      source.connect(gainNode);
      gainNode.connect(fxData.node);
      fxData.node.connect(ctx.destination);
    } else if (fxData && fxData.convolver) {
      // Reverb special case
      const splitter = ctx.createGain();
      source.connect(splitter);
      splitter.connect(gainNode); // dry
      splitter.connect(fxData.convolver); // wet path
      fxData.convolver.connect(fxData.wet);
      gainNode.connect(ctx.destination);
      fxData.wet.connect(ctx.destination);
    } else {
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
    }

    source.start(ctx.currentTime);
    activeNodes.current.set(padIndex, { source, gainNode });

    source.onended = () => {
      if (activeNodes.current.get(padIndex)?.source === source) {
        activeNodes.current.delete(padIndex);
      }
    };

    return source;
  }, [getCtx, buildEffect]);

  /** Stop a specific pad */
  const stopPad = useCallback((padIndex, releaseTime = 0.1) => {
    const ctx = getCtx();
    const nodes = activeNodes.current.get(padIndex);
    if (!nodes) return;
    const { gainNode, source } = nodes;
    gainNode.gain.setTargetAtTime(0, ctx.currentTime, releaseTime / 3);
    try { source.stop(ctx.currentTime + releaseTime + 0.05); } catch {}
    activeNodes.current.delete(padIndex);
  }, [getCtx]);

  /** Stop all pads */
  const stopAll = useCallback(() => {
    for (const idx of activeNodes.current.keys()) {
      stopPad(idx, 0.05);
    }
  }, [stopPad]);

  return { getCtx, decodeAudio, playPad, stopPad, stopAll };
}
