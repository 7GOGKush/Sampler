import { useRef, useState, useCallback, useEffect } from 'react';

const STEPS = 16;
const MAX_PADS = 16;

/** 16-step sequencer using Web Audio clock for timing accuracy */
export function useSequencer(onStep) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [pattern, setPattern] = useState(
    () => Array.from({ length: MAX_PADS }, () => new Array(STEPS).fill(false))
  );
  const [swing, setSwing] = useState(0); // 0-1

  const bpmRef = useRef(bpm);
  const swingRef = useRef(swing);
  const patternRef = useRef(pattern);
  const isPlayingRef = useRef(false);
  const stepRef = useRef(0);
  const nextStepTimeRef = useRef(0);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);

  const getOrCreateCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  const scheduleAhead = 0.1; // seconds
  const lookAhead = 25; // ms

  const scheduler = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = getOrCreateCtx();

    while (nextStepTimeRef.current < ctx.currentTime + scheduleAhead) {
      const step = stepRef.current;
      const swingOffset =
        step % 2 === 1 ? (swingRef.current * 60) / (bpmRef.current * 4) : 0;
      const fireTime = nextStepTimeRef.current + swingOffset;

      // Fire callback for all active pads
      const pat = patternRef.current;
      for (let pad = 0; pad < MAX_PADS; pad++) {
        if (pat[pad][step]) {
          const scheduledTime = fireTime;
          onStep && onStep(pad, step, scheduledTime);
        }
      }

      // Update visual step (slightly ahead of schedule is fine)
      const stepCapture = step;
      const delay = Math.max(0, (fireTime - ctx.currentTime) * 1000);
      setTimeout(() => setCurrentStep(stepCapture), delay);

      const secondsPerBeat = 60 / bpmRef.current;
      const secondsPerStep = secondsPerBeat / 4;
      nextStepTimeRef.current += secondsPerStep;
      stepRef.current = (step + 1) % STEPS;
    }

    timerRef.current = setTimeout(scheduler, lookAhead);
  }, [getOrCreateCtx, onStep]);

  const play = useCallback(() => {
    const ctx = getOrCreateCtx();
    isPlayingRef.current = true;
    stepRef.current = 0;
    nextStepTimeRef.current = ctx.currentTime + 0.05;
    setIsPlaying(true);
    scheduler();
  }, [getOrCreateCtx, scheduler]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(-1);
    clearTimeout(timerRef.current);
  }, []);

  const toggleStep = useCallback((padIndex, stepIndex) => {
    setPattern((prev) => {
      const next = prev.map((row) => [...row]);
      next[padIndex][stepIndex] = !next[padIndex][stepIndex];
      return next;
    });
  }, []);

  const clearPattern = useCallback((padIndex) => {
    setPattern((prev) => {
      const next = prev.map((row) => [...row]);
      if (padIndex !== undefined) {
        next[padIndex] = new Array(STEPS).fill(false);
      } else {
        return Array.from({ length: MAX_PADS }, () => new Array(STEPS).fill(false));
      }
      return next;
    });
  }, []);

  const randomizePattern = useCallback((padIndex, density = 0.3) => {
    setPattern((prev) => {
      const next = prev.map((row) => [...row]);
      if (padIndex !== undefined) {
        next[padIndex] = Array.from({ length: STEPS }, () => Math.random() < density);
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      isPlayingRef.current = false;
    };
  }, []);

  return {
    bpm, setBpm,
    isPlaying, play, stop,
    currentStep,
    pattern, toggleStep, clearPattern, randomizePattern,
    swing, setSwing,
    STEPS, MAX_PADS,
  };
}
