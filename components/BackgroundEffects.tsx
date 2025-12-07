import React, { useEffect, useState } from 'react';

interface BackgroundEffectsProps {
  subject: string;
}

interface Particle {
  id: number;
  char: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ subject }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    let chars: string[] = [];
    let color = '';

    if (subject === 'math') {
      chars = ['+', '-', '×', '÷', '=', '√', 'π', '∞', '∑', '∫', '≠', '≈', '∠', '⊥', '∆'];
      color = '#6366f1'; // Indigo-500
    } else if (subject === 'chinese') {
      chars = ['天', '地', '人', '你', '我', '他'];
      color = '#10b981'; // Emerald-500
    } else if (subject === 'english') {
      // Generate A-Z and a-z
      const upper = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
      const lower = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
      chars = [...upper, ...lower];
      color = '#8b5cf6'; // Violet-500
    } else {
        chars = [];
    }

    const newParticles: Particle[] = [];
    // Increase count slightly for better coverage
    const count = 40; 

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        char: chars[Math.floor(Math.random() * chars.length)],
        x: Math.random() * 100, // percentage
        y: Math.random() * 100, // percentage
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 1.5,
        opacity: 0.03 + Math.random() * 0.05, // Very subtle opacity (0.03 to 0.08)
      });
    }

    setParticles(newParticles);
  }, [subject]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-gray-50/30 transition-colors duration-700">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute font-serif select-none transition-all duration-1000 ease-in-out"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            opacity: p.opacity,
            color: subject === 'math' ? '#4338ca' : subject === 'chinese' ? '#047857' : '#7c3aed', 
            fontSize: '2.5rem',
            fontWeight: 'bold',
            fontFamily: subject === 'math' ? 'Times New Roman, serif' : subject === 'chinese' ? 'KaiTi, STKaiti, serif' : 'serif'
          }}
        >
          {p.char}
        </div>
      ))}
    </div>
  );
};

export default BackgroundEffects;