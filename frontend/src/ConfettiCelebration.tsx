import React from 'react';

const CONFETTI_COLORS = [
  '#F2412C', // Rojo primario
  '#10B981', // Verde esmeralda
  '#F59E0B', // Ámbar dorado
  '#3B82F6', // Azul real
  '#8B5CF6', // Púrpura
  '#EC4899', // Rosa vibrante
  '#14B8A6', // Turquesa
];

export default function ConfettiCelebration() {
  const pieces = Array.from({ length: 40 }).map((_, i) => {
    const left = Math.floor((i / 40) * 100);
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const delay = (i * 0.15) % 2.5;
    const duration = 2.8 + ((i * 0.2) % 1.5);
    const width = 8 + (i % 6);
    const height = 12 + (i % 8);

    return (
      <div
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          backgroundColor: color,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
    );
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20" aria-hidden="true">
      {pieces}
    </div>
  );
}
