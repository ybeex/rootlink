'use client';

import { useRef, useState, type ReactNode } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

const MAX_TILT_DEG = 6; // restrained — felt, not noticed

export function TiltCard({ children, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg)');
  const [sheen, setSheen] = useState({ x: 50, y: 50, opacity: 0 });
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1

    const rotateY = (px - 0.5) * 2 * MAX_TILT_DEG;
    const rotateX = (0.5 - py) * 2 * MAX_TILT_DEG;

    setTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    setSheen({ x: px * 100, y: py * 100, opacity: 1 });
  }

  function handleLeave() {
    setTransform('rotateX(0deg) rotateY(0deg)');
    setSheen((s) => ({ ...s, opacity: 0 }));
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        perspective: '900px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="relative h-full overflow-hidden rounded-2xl transition-transform duration-300 ease-out"
        style={{ transform, transformStyle: 'preserve-3d' }}
      >
        {children}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: sheen.opacity * 0.5,
            background: `radial-gradient(circle at ${sheen.x}% ${sheen.y}%, rgba(255,255,255,0.35), transparent 55%)`,
          }}
        />
      </div>
    </div>
  );
}
