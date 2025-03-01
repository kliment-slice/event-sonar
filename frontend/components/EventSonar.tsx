'use client'

import { motion } from 'framer-motion'
import { Radar } from 'lucide-react'

export default function EventSonar() {
  return (
    <h1 className="relative py-3 px-6 text-3xl sm:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 text-center mb-5 sm:mb-6 transform hover:scale-105 transition-all duration-300">
      <span className="relative inline-flex items-center justify-center gap-3">
        <Radar 
          size={36} 
          className="text-cyan-500 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" 
        /> 
        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-[0_5px_5px_rgba(0,0,0,0.3)]">
          EVENT SONAR
        </span>
      </span>
      <div className="absolute inset-0 bg-stone-800/30 rounded-full blur-sm -z-10 transform scale-105"></div>
      <div className="absolute inset-0 border border-cyan-500/30 rounded-full -z-10"></div>
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-xl -z-20"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full -z-10"></div>
    </h1>
  )
}