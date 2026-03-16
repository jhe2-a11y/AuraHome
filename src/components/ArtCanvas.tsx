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
    .replace(/[^a-z\s]/g, '')
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

export function ArtCanvas({ note, mode }: ArtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const initParticles = useCallback((canvas: HTMLCanvasElement) => {
    const words = extractWords(note.rawText);
    const freq = wordFrequency(words);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    if (mode === 'constellation') {
      particlesRef.current = sorted.map((entry, i) => {
        const angle = (i / sorted.length) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 80 + Math.random() * Math.min(w, h) * 0.35;
        const tx = cx + Math.cos(angle) * dist;
        const ty = cy + Math.sin(angle) * dist;
        return {
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          radius: 3 + entry[1] * 3,
          color: PALETTE[i % PALETTE.length],
          label: entry[0],
          alpha: 0,
          targetX: tx,
          targetY: ty,
        };
      });
    } else if (mode === 'watercolor') {
      particlesRef.current = sorted.map((entry, i) => {
        const tx = 60 + Math.random() * (w - 120);
        const ty = 60 + Math.random() * (h - 120);
        return {
          x: tx + (Math.random() - 0.5) * 100,
          y: ty + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 20 + entry[1] * 15,
          color: PALETTE[i % PALETTE.length],
          label: entry[0],
          alpha: 0,
          targetX: tx,
          targetY: ty,
        };
      });
    } else {
      // mindmap: central node + branches
      const headings = note.blocks.filter(b => b.type === 'heading');
      const bullets = note.blocks.filter(b => b.type === 'bullet' || b.type === 'definition');
      const nodes = [
        { label: note.title.slice(0, 20), size: 12 },
        ...headings.map(h => ({ label: h.content.slice(0, 18), size: 8 })),
        ...bullets.slice(0, 30).map(b => ({ label: b.content.slice(0, 15), size: 4 })),
      ];

      particlesRef.current = nodes.map((node, i) => {
        const angle = i === 0 ? 0 : ((i - 1) / (nodes.length - 1)) * Math.PI * 2;
        const dist = i === 0 ? 0 : 100 + (i <= headings.length ? 0 : 80) + Math.random() * 60;
        const tx = cx + Math.cos(angle) * dist;
        const ty = cy + Math.sin(angle) * dist;
        return {
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          radius: node.size,
          color: i === 0 ? '#7c5cff' : PALETTE[i % PALETTE.length],
          label: node.label,
          alpha: 0,
          targetX: tx,
          targetY: ty,
        };
      });
    }
  }, [note, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    initParticles(canvas);

    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    let time = 0;

    const animate = () => {
      time++;
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, '#1a1a2e');
      grad.addColorStop(1, '#0f0f14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      for (const p of particles) {
        // Ease toward target
        p.x += (p.targetX - p.x) * 0.04;
        p.y += (p.targetY - p.y) * 0.04;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.min(1, p.alpha + 0.015);

        // Gentle float
        p.x += Math.sin(time * 0.01 + p.targetX) * 0.3;
        p.y += Math.cos(time * 0.012 + p.targetY) * 0.3;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          const force = (80 - dist) / 80 * 2;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      if (mode === 'constellation') {
        // Draw connections
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 150) {
              ctx.strokeStyle = `rgba(124, 92, 255, ${(1 - d / 150) * 0.3 * Math.min(a.alpha, b.alpha)})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }

        // Draw nodes
        for (const p of particles) {
          // Glow
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
          glow.addColorStop(0, p.color + '40');
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.fillStyle = '#ededf0';
          ctx.font = `${10 + p.radius}px "Space Grotesk", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.label, p.x, p.y + p.radius + 14);
          ctx.globalAlpha = 1;
        }
      } else if (mode === 'watercolor') {
        for (const p of particles) {
          ctx.globalAlpha = p.alpha * 0.15;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          g.addColorStop(0, p.color);
          g.addColorStop(0.6, p.color + '80');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Second layer offset for watercolor texture
          ctx.globalAlpha = p.alpha * 0.1;
          ctx.beginPath();
          ctx.arc(p.x + 5, p.y + 3, p.radius * 0.8, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.globalAlpha = p.alpha * 0.9;
          ctx.fillStyle = '#ededf0';
          ctx.font = `${Math.min(12 + p.radius * 0.5, 28)}px "Space Grotesk", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.label, p.x, p.y + 4);
          ctx.globalAlpha = 1;
        }
      } else {
        // mindmap
        // Draw branches from center
        if (particles.length > 1) {
          const center = particles[0];
          for (let i = 1; i < particles.length; i++) {
            const p = particles[i];
            ctx.strokeStyle = p.color + '50';
            ctx.lineWidth = Math.max(1, p.radius * 0.4);
            ctx.beginPath();
            // Curved line
            const midX = (center.x + p.x) / 2 + (Math.random() - 0.5) * 10;
            const midY = (center.y + p.y) / 2 - 20;
            ctx.moveTo(center.x, center.y);
            ctx.quadraticCurveTo(midX, midY, p.x, p.y);
            ctx.stroke();
          }
        }

        for (const p of particles) {
          // Node circle
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color + '30';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.fillStyle = '#ededf0';
          ctx.font = `${10 + p.radius * 0.8}px "Space Grotesk", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.label, p.x, p.y + p.radius + 16);
          ctx.globalAlpha = 1;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [note, mode, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="art-canvas"
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
    />
  );
}
