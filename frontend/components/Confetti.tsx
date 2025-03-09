'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ConfettiProps {
  isClient: boolean;
}

export default function Confetti({ isClient }: ConfettiProps) {
  const [confetti, setConfetti] = useState<Array<{id: string, x: number, y: number, size: number, color: string}>>([]);

  // Auto-forming confetti
  useEffect(() => {
    if (!isClient) return;
    
    const createAutoConfetti = () => {
      const colors = ['#F472B6', '#FBBF24', '#10B981', '#F97316', '#06B6D4', '#FFFFFF']
      const count = 20
      const timestamp = Date.now()
      
      const newConfetti = Array.from({ length: count }, (_, i) => ({
        id: `confetti-${timestamp}-${i}`,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 5 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)]
      }))
      
      setConfetti(prev => [...prev, ...newConfetti])
      
      // Clean up confetti after animation
      setTimeout(() => {
        setConfetti(prev => prev.filter(item => !newConfetti.some(c => c.id === item.id)))
      }, 3000)
    }

    // Create confetti every 3 seconds
    const confettiInterval = setInterval(createAutoConfetti, 3000)
    return () => clearInterval(confettiInterval)
  }, [isClient]);

  if (!isClient) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confetti.map((item) => (
        <motion.div
          key={item.id}
          className="absolute rounded-sm"
          style={{
            width: item.size,
            height: item.size * 0.4,
            background: item.color,
            left: 0,
            top: 0,
            x: item.x,
            y: item.y,
          }}
          animate={{
            x: item.x + (Math.random() * 200 - 100),
            y: item.y + 200,
            rotate: 360,
            opacity: [1, 0]
          }}
          initial={{ opacity: 1, rotate: 0 }}
          transition={{ 
            duration: 2 + Math.random(),
            ease: "easeOut" 
          }}
        />
      ))}
    </div>
  );
}