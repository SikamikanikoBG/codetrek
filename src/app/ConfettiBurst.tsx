// Canvas-based celebration burst for level-complete (DESIGN.md Motion spec).
// Respects prefers-reduced-motion by doing nothing at all — the completion
// toast's own CSS fade-in (unconditional, no motion) is the fallback
// celebration in that case, never just "no celebration."

import { useEffect, useRef } from 'react';

interface ConfettiBurstProps {
  /** Change this to any new value (e.g. the level id) to fire a fresh burst. */
  burstKey: string | number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
}

const PARTICLE_COUNT = 48;
const DURATION_MS = 1100;
const GRAVITY = 0.12;
const FALLBACK_COLORS = ['#4CAF6B', '#E0A030', '#3F7FE0', '#9B5FE0'];

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ConfettiBurst({ burstKey }: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 160;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rootStyles = getComputedStyle(document.documentElement);
    const colors = ['--primary', '--accent', '--world-robots', '--world-ai']
      .map((name) => rootStyles.getPropertyValue(name).trim())
      .map((value, i) => value || FALLBACK_COLORS[i]);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      return {
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
      };
    });

    let raf = 0;
    const start = performance.now();

    function frame(now: number) {
      if (!ctx) return;
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      if (elapsed >= DURATION_MS) return;
      const progress = elapsed / DURATION_MS;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY;
        p.rotation += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [burstKey]);

  return <canvas ref={canvasRef} className="confetti-burst" aria-hidden="true" />;
}
