
import React, { useEffect, useState } from 'react';
import { Subject } from '../types';

interface BackgroundEffectsProps {
  subject: string; // The code/value of the current subject
  subjectConfig?: Subject; // The full config object if available
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

const BackgroundEffects: React.FC<BackgroundEffectsProps> = ({ subject, subjectConfig }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    let chars: string[] = [];
    let baseOpacity = 0.15;
    let baseScale = 1.0;

    // Logic: If dynamic config exists, use it. Otherwise fallback to hardcoded (legacy support).
    if (subjectConfig) {
      // Get Opacity & Scale
      baseOpacity = subjectConfig.char_opacity ?? 0.15;
      baseScale = subjectConfig.char_size_scale ?? 1.0;

      // Get Characters
      if (subjectConfig.background_chars) {
        chars = subjectConfig.background_chars.split('');
      } else {
        chars = ['?'];
      }

    } else {
      // Legacy Fallback
      if (subject === 'math') {
        chars = ['+', '-', '×', '÷', '=', '√', 'π', '∞', '∑', '∫', '≠', '≈', '∠', '⊥', '∆'];
      } else if (subject === 'chinese') {
        chars = ['天', '地', '人', '你', '我', '他'];
      } else if (subject === 'english') {
        const upper = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
        const lower = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
        chars = [...upper, ...lower];
      } else {
          chars = [];
      }
    }

    if (chars.length === 0) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = [];
    const count = 40; 

    for (let i = 0; i < count; i++) {
      // Random base scale between 0.8 and 2.3
      const randomScale = 0.8 + Math.random() * 1.5;
      // Multiply by the user configured scale
      const finalScale = randomScale * baseScale;
      
      // Random base opacity between 0.03 and 0.08
      const randomOpacity = 0.03 + Math.random() * 0.05;
      // Adjust by user configuration (normalized around 0.15)
      // If user sets 0.3, it's 2x stronger.
      const opacityMultiplier = baseOpacity / 0.15;
      const finalOpacity = Math.min(randomOpacity * opacityMultiplier, 1.0);

      newParticles.push({
        id: i,
        char: chars[Math.floor(Math.random() * chars.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: Math.random() * 360,
        scale: finalScale,
        opacity: finalOpacity,
      });
    }

    setParticles(newParticles);
  }, [subject, subjectConfig]);

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
          }}
        >
          <span 
             style={{ 
               color: subjectConfig ? 
                 (subjectConfig.color === 'indigo' ? '#4338ca' : 
                  subjectConfig.color === 'emerald' ? '#047857' : 
                  subjectConfig.color === 'violet' ? '#7c3aed' :
                  subjectConfig.color === 'rose' ? '#e11d48' :
                  subjectConfig.color === 'amber' ? '#d97706' :
                  subjectConfig.color === 'sky' ? '#0284c7' : '#4b5563') 
                 : '#4b5563' 
             }}
          >
             {p.char}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BackgroundEffects;
