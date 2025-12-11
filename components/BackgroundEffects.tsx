
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
    let color = '';

    // Logic: If dynamic config exists, use it. Otherwise fallback to hardcoded (legacy support).
    if (subjectConfig) {
      // 1. Get Color
      // Map common names to rough hex values for the background particle style
      const colorMap: Record<string, string> = {
        'indigo': '#6366f1',
        'emerald': '#10b981',
        'violet': '#8b5cf6',
        'rose': '#f43f5e',
        'amber': '#f59e0b',
        'sky': '#0ea5e9',
        'blue': '#3b82f6',
        'green': '#22c55e',
        'purple': '#a855f7',
        'red': '#ef4444',
        'orange': '#f97316',
        'cyan': '#06b6d4',
      };
      color = colorMap[subjectConfig.color] || '#6366f1';

      // 2. Get Characters
      if (subjectConfig.background_chars) {
        // Split strings but keep multi-character logic if possible? 
        // For simplicity, we assume single characters or space separated? 
        // The prompt says "12+-x". Let's simply split by character.
        chars = subjectConfig.background_chars.split('');
      } else {
        chars = ['?'];
      }

    } else {
      // Legacy Fallback
      if (subject === 'math') {
        chars = ['+', '-', '×', '÷', '=', '√', 'π', '∞', '∑', '∫', '≠', '≈', '∠', '⊥', '∆'];
        color = '#6366f1'; 
      } else if (subject === 'chinese') {
        chars = ['天', '地', '人', '你', '我', '他'];
        color = '#10b981'; 
      } else if (subject === 'english') {
        const upper = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
        const lower = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
        chars = [...upper, ...lower];
        color = '#8b5cf6'; 
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
      newParticles.push({
        id: i,
        char: chars[Math.floor(Math.random() * chars.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 1.5,
        opacity: 0.03 + Math.random() * 0.05,
      });
    }

    setParticles(newParticles);
  }, [subject, subjectConfig]);

  // Determine font family based on subject (heuristic)
  const getFontFamily = () => {
    if (subject === 'math') return 'Times New Roman, serif';
    if (subject === 'chinese' || (subjectConfig?.label.includes('文'))) return 'KaiTi, STKaiti, serif';
    return 'serif';
  };

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
            color: (subjectConfig?.color && ['indigo','emerald','violet'].includes(subjectConfig.color)) 
              ? undefined // Let React inline style logic handle specific fallback? No, let's just use the style prop for color
              : undefined, 
            // We use style for color to support dynamic hex matching or class mapping?
            // Actually, we calculated 'color' in useEffect but didn't put it in state. 
            // Let's rely on CSS classes mapping or just use a generic logic.
            // Simplified: Use the mapped color based on the config.
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
