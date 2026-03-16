import { useRef, useEffect, useCallback } from 'react';
import type { Note } from '../types/note';

interface ArtCanvasProps {
  note: Note;
  mode: 'constellation' | 'watercolor' | 'mindmap';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  alpha: number;
  targetX: number;
  targetY: number;
  seed: number; // unique per-particle for organic motion
}

const PALETTE = [
  '#7c5cff', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
  '#a29bfe', '#55efc4', '#fab1a0', '#74b9ff',
];

function extractWords(text: string): string[] {
  const stop = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
    'at', 'by', 'from', 'as', 'into', 'through', 'and', 'but', 'or', 'nor', 'not',
    'so', 'yet', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
    'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'his', 'her', 'their']);

  return text
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stop.has(w));
}

function wordFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return freq;
}

function truncateLabel(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

export function ArtCanvas({ note, mode }: ArtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const prevModeRef = useRef(mode);
  const sizeRef = useRef({ w: 0, h: 0 });
  const timeRef = useRef(0);

  const buildTargets = useCallback((mode: string, w: number, h: number): Particle[] => {
    const dpr = window.devicePixelRatio || 1;
    const cw = w / dpr;
    const ch = h / dpr;
    const cx = cw / 2;
    const cy = ch / 2;

    const words = extractWords(note.rawText);
    const freq = wordFrequency(words);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);

    if (mode === 'constellation') {
      return sorted.map((entry, i) => {
        const angle = (i / sorted.length) * Math.PI * 2 + (i * 0.3);
        const dist = 60 + Math.min(cw, ch) * 0.15 + (i / sorted.length) * Math.min(cw, ch) * 0.25;
        return {
          x: cx, y: cy, vx: 0, vy: 0,
          radius: 3 + entry[1] * 2.5,
          color: PALETTE[i % PALETTE.length],
          label: entry[0],
          alpha: 0,
          targetX: cx + Math.cos(angle) * dist,
          targetY: cy + Math.sin(angle) * dist,
          seed: i * 137.508 + entry[0].charCodeAt(0),
        };
      });
    } else if (mode === 'watercolor') {
      return sorted.map((entry, i) => {
        const tx = 80 + (i % 6) * ((cw - 160) / 5) + ((i * 37) % 40);
        const ty = 80 + Math.floor(i / 6) * ((ch - 160) / 8) + ((i * 53) % 40);
        return {
          x: cx, y: cy, vx: 0, vy: 0,
          radius: 18 + entry[1] * 12,
          color: PALETTE[i % PALETTE.length],
          label: entry[0],
          alpha: 0,
          targetX: Math.min(cw - 60, Math.max(60, tx)),
          targetY: Math.min(ch - 60, Math.max(60, ty)),
          seed: i * 97.5 + entry[0].charCodeAt(0),
        };
      });
    } else {
      // mindmap
      const headings = note.blocks.filter(b => b.type === 'heading');
      const bullets = note.blocks.filter(b => b.type === 'bullet' || b.type === 'definition');
      const nodes = [
        { label: note.title.slice(0, 20), size: 12 },
        ...headings.map(h => ({ label: h.content.slice(0, 18), size: 8 })),
        ...bullets.slice(0, 25).map(b => ({ label: b.content.slice(0, 15), size: 4 })),
      ];

      return nodes.map((node, i) => {
        const angle = i === 0 ? 0 : ((i - 1) / Math.max(nodes.length - 1, 1)) * Math.PI * 2;
        const ring = i === 0 ? 0 : (i <= headings.length ? 1 : 2);
        const dist = ring === 0 ? 0 : ring === 1 ? Math.min(cw, ch) * 0.2 : Math.min(cw, ch) * 0.35;
        return {
          x: cx, y: cy, vx: 0, vy: 0,
          radius: node.size,
          color: i === 0 ? '#7c5cff' : PALETTE[i % PALETTE.length],
          label: node.label,
          alpha: 0,
          targetX: cx + Math.cos(angle) * dist,
          targetY: cy + Math.sin(angle) * dist,
          seed: i * 211 + (node.label.charCodeAt(0) || 0),
        };
      });
    }
  }, [note]);

  // Update particle targets without destroying existing particles (smooth transition)
  const updateParticles = useCallback((newMode: string, w: number, h: number) => {
    const newTargets = buildTargets(newMode, w, h);
    const existing = particlesRef.current;

    // Morph: reuse existing particle positions, update targets
    particlesRef.current = newTargets.map((target, i) => {
      if (i < existing.length) {
        // Keep current position, update target (smooth morph)
        return {
          ...existing[i],
          targetX: target.targetX,
          targetY: target.targetY,
          radius: target.radius,
          color: target.color,
          label: target.label,
          seed: target.seed,
        };
      }
      // New particle: start from center with zero alpha
      return { ...target, alpha: 0 };
    });

    // Fade out extras
    if (existing.length > newTargets.length) {
      // Extra particles will just be dropped — they're not in the new array
    }
  }, [buildTargets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    sizeRef.current = { w: canvas.width, h: canvas.height };

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Initialize or morph particles
    if (particlesRef.current.length === 0 || prevModeRef.current !== mode) {
      updateParticles(mode, canvas.width, canvas.height);
      prevModeRef.current = mode;
    } else {
      // Content changed — update targets smoothly
      updateParticles(mode, canvas.width, canvas.height);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      timeRef.current++;
      const time = timeRef.current;
      ctx.clearRect(0, 0, w, h);

      // Background
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, '#1a1a2e');
      grad.addColorStop(1, '#0f0f14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Physics update
      for (const p of particles) {
        // Ease toward target (smooth morphing)
        p.x += (p.targetX - p.x) * 0.06;
        p.y += (p.targetY - p.y) * 0.06;

        // Gentle organic float using unique seed
        p.x += Math.sin(time * 0.008 + p.seed) * 0.4;
        p.y += Math.cos(time * 0.01 + p.seed * 1.3) * 0.4;

        // Fade in
        p.alpha = Math.min(1, p.alpha + 0.02);

        // Mouse repulsion (clamped force)
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100 && dist > 0) {
          const force = Math.min(1.5, (100 - dist) / 100 * 2);
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      // Render based on mode
      if (mode === 'constellation') {
        // Connections
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 130) {
              const alpha = (1 - d / 130) * 0.25 * Math.min(a.alpha, b.alpha);
              ctx.strokeStyle = `rgba(124, 92, 255, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }

        for (const p of particles) {
          ctx.globalAlpha = p.alpha;
          // Glow
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5);
          glow.addColorStop(0, p.color + '40');
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Label
          const fontSize = Math.max(9, 10 + p.radius * 0.5);
          ctx.font = `${fontSize}px "Inter", "Space Grotesk", sans-serif`;
          ctx.fillStyle = '#ededf0';
          ctx.textAlign = 'center';
          const label = truncateLabel(p.label, 80, ctx);
          ctx.fillText(label, p.x, p.y + p.radius + 14);
          ctx.globalAlpha = 1;
        }
      } else if (mode === 'watercolor') {
        for (const p of particles) {
          // Main blob
          ctx.globalAlpha = p.alpha * 0.12;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          g.addColorStop(0, p.color);
          g.addColorStop(0.5, p.color + '80');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Texture layer
          ctx.globalAlpha = p.alpha * 0.07;
          const offset = Math.sin(time * 0.005 + p.seed) * 4;
          ctx.beginPath();
          ctx.arc(p.x + offset, p.y + offset * 0.7, p.radius * 0.75, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.globalAlpha = p.alpha * 0.85;
          const fontSize = Math.max(10, Math.min(12 + p.radius * 0.4, 26));
          ctx.font = `500 ${fontSize}px "Inter", "Space Grotesk", sans-serif`;
          ctx.fillStyle = '#ededf0';
          ctx.textAlign = 'center';
          const label = truncateLabel(p.label, 100, ctx);
          ctx.fillText(label, p.x, p.y + 4);
          ctx.globalAlpha = 1;
        }
      } else {
        // Mind map
        if (particles.length > 1) {
          const center = particles[0];
          for (let i = 1; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = Math.min(center.alpha, p.alpha) * 0.6;
            ctx.strokeStyle = p.color + '60';
            ctx.lineWidth = Math.max(1, p.radius * 0.3);
            ctx.beginPath();
            const midX = (center.x + p.x) / 2;
            const midY = (center.y + p.y) / 2 - 15;
            ctx.moveTo(center.x, center.y);
            ctx.quadraticCurveTo(midX, midY, p.x, p.y);
            ctx.stroke();
          }
        }

        for (const p of particles) {
          ctx.globalAlpha = p.alpha;
          // Outer glow
          ctx.fillStyle = p.color + '20';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Label
          const fontSize = Math.max(9, 10 + p.radius * 0.6);
          ctx.font = `600 ${fontSize}px "Inter", "Space Grotesk", sans-serif`;
          ctx.fillStyle = '#ededf0';
          ctx.textAlign = 'center';
          const label = truncateLabel(p.label, 100, ctx);
          ctx.fillText(label, p.x, p.y + p.radius + 16);
          ctx.globalAlpha = 1;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [note, mode, updateParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="art-canvas"
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
    />
  );
}
