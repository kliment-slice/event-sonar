'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import VibeCheckCard from '@/components/VibeCheckCard'
import Armadillo from '@/components/Armadillo'
import Confetti from '@/components/Confetti'

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Pre-calculated values for background particles to avoid hydration mismatch
  const backgroundParticles = Array.from({ length: 8 }, (_, i) => ({
    id: `bg-particle-${i}`,
    width: 10 + (i * 2), // Deterministic size instead of random
    height: 10 + (i * 2),
    left: `${i * 12.5}%`,
    top: `${(i % 4) * 25}%`,
    duration: 10 + i * 2
  }));

  return (
    <main 
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-rose-400 via-amber-500 to-emerald-600"
    >
      {/* Animated background particles */}
      {isClient && (
        <div className="absolute inset-0 pointer-events-none">
          {backgroundParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-amber-500 bg-opacity-15"
              style={{
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                left: particle.left,
                top: particle.top,
              }}
              animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          ))}
        </div>
      )}
      
      {/* Confetti component */}
      <Confetti isClient={isClient} />
      
      {/* Armadillo component */}
      {/* <Armadillo isClient={isClient} /> */}
      
      {/* Main card */}
      <VibeCheckCard />
      
      <div className="mt-8 text-base font-bold tracking-wide text-stone-800/80 animation-pulse">
          <span>• Unofficial SXSW 2025 Vibe Checker •</span>
      </div>
    </main>
  )
}