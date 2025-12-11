
import React, { useEffect, useState, useRef } from 'react';
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
  const [isMorphing, setIsMorphing] = useState(false);
  
  // Ref to track if it's the initial mount to avoid animation on first load
  const isFirstMount = useRef(true);
  
  // Helper to get characters based on subject config or legacy defaults
  const getCharsForSubject = (sub: string, config?: Subject) => {
    if (config) {
      if (config.background_chars) return config.background_chars.split('');
      return ['?'];
    }
    // Legacy Fallback
    if (sub === 'math') {
      return ['+', '-', '×', '÷', '=', '√', 'π', '∞', '∑', '∫', '≠', '≈', '∠', '⊥', '∆'];
    } else if (sub === 'chinese') {
      return ['天', '地', '人', '你', '我', '他', '文', '语', '诗', '词'];
    } else if (sub === 'english') {
      const upper = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
      const lower = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
      return [...upper, ...lower];
    }
    return ['?'];
  };

  // Helper to generate a random particle state
  const generateParticleState = (id: number, charPool: string[], baseOpacity: number, baseScale: number) => {
    // Random base scale variation
    const randomScaleVariation = 0.8 + Math.random() * 1.5;
    const finalScale = randomScaleVariation * baseScale;
    
    // Random base opacity variation
    const randomOpacityVariation = 0.03 + Math.random() * 0.05;
    const opacityMultiplier = baseOpacity / 0.15; // Normalize based on default 0.15
    const finalOpacity = Math.min(randomOpacityVariation * opacityMultiplier, 1.0);

    return {
      id,
      char: charPool[Math.floor(Math.random() * charPool.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      scale: finalScale,
      opacity: finalOpacity,
    };
  };

  // 1. Initialization (Mount only)
  useEffect(() => {
    const count = 40;
    const charPool = getCharsForSubject(subject, subjectConfig);
    const baseOpacity = subjectConfig?.char_opacity ?? 0.15;
    const baseScale = subjectConfig?.char_size_scale ?? 1.0;

    const initialParticles = Array.from({ length: count }).map((_, i) => 
      generateParticleState(i, charPool, baseOpacity, baseScale)
    );
    setParticles(initialParticles);
    isFirstMount.current = false;
  }, []); // Run once on mount

  // 2. Handle Subject Change (The Animation Logic)
  useEffect(() => {
    if (isFirstMount.current) return;

    const charPool = getCharsForSubject(subject, subjectConfig);
    const baseOpacity = subjectConfig?.char_opacity ?? 0.15;
    const baseScale = subjectConfig?.char_size_scale ?? 1.0;

    // Step A: Trigger Visual "Morph" state (Shrink/Fade out)
    setIsMorphing(true);

    // Step B: Immediately Update Positions (X, Y, Rotation) 
    // This starts the "movement" part of the animation immediately via CSS transition
    setParticles(prevParticles => 
      prevParticles.map(p => {
        // We calculate new random targets, but keep the OLD char for now
        const newState = generateParticleState(p.id, charPool, baseOpacity, baseScale);
        return {
          ...newState,
          char: p.char // KEEP OLD CHAR -> Moves while showing old char
        };
      })
    );

    // Step C: Halfway through (50%), swap the characters
    const timeoutId = setTimeout(() => {
      setParticles(prevParticles => 
        prevParticles.map(p => ({
          ...p,
          char: charPool[Math.floor(Math.random() * charPool.length)] // SWAP TO NEW CHAR
        }))
      );
      
      // End visual morph (Grow/Fade in)
      setIsMorphing(false);
    }, 500); // 500ms matches half of the movement duration usually, or allows enough time for shrink

    return () => clearTimeout(timeoutId);
  }, [subject, subjectConfig?.code, subjectConfig?.background_chars]); 
  // We explicitly depend on config properties to trigger update

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-gray-50/30 transition-colors duration-1000">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`
            absolute font-serif select-none flex items-center justify-center
            transition-all ease-in-out
          `}
          style={{
            // 1. Position Transition: Slower (1.2s) to create the "gliding" effect
            left: `${p.x}%`,
            top: `${p.y}%`,
            transitionProperty: 'left, top, transform, opacity, filter',
            transitionDuration: '1200ms', 
            
            // 2. Transform:
            // - If morphing: Scale down to 0 and rotate drastically (disappear effect)
            // - Normal: Scale to target size and target rotation
            transform: isMorphing 
              ? `rotate(${p.rotation + 180}deg) scale(0)` 
              : `rotate(${p.rotation}deg) scale(${p.scale})`,
            
            opacity: p.opacity,
            
            // Optional: Blur during morph to hide the char swap
            filter: isMorphing ? 'blur(4px)' : 'blur(0px)',
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
