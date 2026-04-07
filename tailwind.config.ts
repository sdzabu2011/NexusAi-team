import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        title: ['Orbitron', 'sans-serif'],
      },
      colors: {
        nexus: {
          bg:     '#020410',
          surface:'#060c28',
          card:   '#080e30',
          accent: '#00d4ff',
          blue:   '#0055ff',
          green:  '#00ffaa',
          red:    '#ff4e6a',
          yellow: '#ffd060',
          dim:    '#4a6a9a',
          muted:  '#1e3055',
        },
      },
      animation: {
        'spin-slow':  'spin 10s linear infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'slide-up':   'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-in':    'fadeIn 0.3s ease',
        shimmer:      'shimmer 2s linear infinite',
        float:        'float 4s ease-in-out infinite',
        'ping-slow':  'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'type-blink': 'typeBlink 1s step-end infinite',
      },
      keyframes: {
        glowPulse: { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        typeBlink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [],
};
export default config;
