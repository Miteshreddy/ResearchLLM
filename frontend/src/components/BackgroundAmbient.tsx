'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function BackgroundAmbient() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0" 
      aria-hidden="true"
    >
      {/* Top primary glow */}
      <motion.div
        animate={{
          x: [0, 20, -15, 0],
          y: [0, -15, 10, 0],
          scale: [1, 1.05, 0.98, 1],
          opacity: [0.18, 0.24, 0.16, 0.18],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70vw',
          maxWidth: '900px',
          height: '420px',
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.35) 0%, rgba(56, 189, 248, 0.12) 40%, rgba(13, 13, 18, 0) 75%)',
          filter: 'blur(70px)',
          borderRadius: '50%',
        }}
      />

      {/* Subtle secondary bottom right accent */}
      <motion.div
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 20, -15, 0],
          opacity: [0.08, 0.14, 0.08],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '5%',
          width: '45vw',
          maxWidth: '600px',
          height: '350px',
          background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.25) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(8, 8, 11, 0) 75%)',
          filter: 'blur(80px)',
          borderRadius: '50%',
        }}
      />

      {/* Ultra faint micro grid texture */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 20%, transparent 80%)',
          opacity: 0.7,
        }}
      />
    </div>
  );
}
