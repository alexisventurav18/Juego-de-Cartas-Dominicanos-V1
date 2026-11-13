import { useCallback, useRef, useState } from 'react';

export type SoundEffect =
  | 'cardSlide' // Al robar o mover una carta
  | 'cardShuffle' // Al repartir o mezclar el mazo
  | 'pairMatch' // Al bajar un par a la mesa
  | 'cagaoAlert' // Al robar el As de Picas ("El Cagao")
  | 'win' // Al quedarse sin cartas (salvarse)
  | 'lose'; // Al quedar como "El Cagao"

/** Efectos de sonido sintetizados con Web Audio (no hay archivos de audio que cargar). */
export function useGameSounds() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Inicializa o reactiva el AudioContext tras la primera interacción del usuario
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Crea ruido blanco filtrado para simular el roce del papel/cartón
  const playCardNoise = useCallback((ctx: AudioContext, duration: number, startTime: number, filterFreq: number) => {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(1.5, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.exponentialRampToValueAtTime(0.25, startTime + duration * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }, []);

  // Crea tonos musicales sintéticos para alertas, pares y victoria
  const playTone = useCallback(
    (ctx: AudioContext, freq: number, type: OscillatorType, startTime: number, duration: number, volume = 0.15) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    },
    [],
  );

  const playSound = useCallback(
    (effect: SoundEffect) => {
      if (isMuted) return;

      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        switch (effect) {
          case 'cardSlide':
            // Sonido corto y seco de carta deslizándose
            playCardNoise(ctx, 0.09, now, 1800);
            break;

          case 'cardShuffle':
            // Ráfaga rápida de varias cartas chocando al barajar/repartir
            for (let i = 0; i < 6; i++) {
              playCardNoise(ctx, 0.06, now + i * 0.045, 1400 + i * 150);
            }
            break;

          case 'pairMatch':
            // Roce de cartas + acorde ascendente agradable
            playCardNoise(ctx, 0.08, now, 1600);
            playTone(ctx, 523.25, 'triangle', now + 0.03, 0.18, 0.14); // Do5
            playTone(ctx, 659.25, 'triangle', now + 0.09, 0.25, 0.16); // Mi5
            break;

          case 'cagaoAlert':
            // Tono de tensión grave descendente al jalar el As de Picas
            playCardNoise(ctx, 0.1, now, 1200);
            playTone(ctx, 220, 'sawtooth', now + 0.05, 0.22, 0.12); // La3
            playTone(ctx, 155.56, 'sawtooth', now + 0.2, 0.35, 0.14); // Re#3 (tritono de tensión)
            break;

          case 'win':
            // Fanfarria corta de victoria al quedarse sin cartas
            playTone(ctx, 523.25, 'triangle', now, 0.15, 0.15); // Do5
            playTone(ctx, 659.25, 'triangle', now + 0.1, 0.15, 0.15); // Mi5
            playTone(ctx, 783.99, 'triangle', now + 0.2, 0.15, 0.15); // Sol5
            playTone(ctx, 1046.5, 'triangle', now + 0.3, 0.4, 0.18); // Do6
            break;

          case 'lose':
            // Sonido cómico descendente para quien queda como "El Cagao"
            playTone(ctx, 392.0, 'triangle', now, 0.2, 0.15); // Sol4
            playTone(ctx, 369.99, 'triangle', now + 0.18, 0.2, 0.15); // Fa#4
            playTone(ctx, 349.23, 'triangle', now + 0.36, 0.2, 0.15); // Fa4
            playTone(ctx, 329.63, 'sawtooth', now + 0.54, 0.45, 0.12); // Mi4
            break;
        }
      } catch {
        // Ignora errores si el navegador bloquea el audio antes de la interacción
      }
    },
    [isMuted, getAudioContext, playCardNoise, playTone],
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return { playSound, isMuted, toggleMute };
}
