import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./lib/**/*.{ts,tsx}'],
  theme: { extend: {
    keyframes: {
      reelSpin: { '0%': { transform: 'translateY(0)' }, '100%': { transform: 'translateY(-70%)' } },
      pop: { '0%': { transform: 'scale(0.98)', opacity: '0.0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      glow: { '0%,100%': { filter: 'drop-shadow(0 0 0px rgba(255,215,0,0.0))' }, '50%': { filter: 'drop-shadow(0 0 18px rgba(255,215,0,0.55))' } },
    },
    animation: { reelSpin: 'reelSpin 0.9s linear infinite', pop: 'pop 200ms ease-out', glow: 'glow 1.2s ease-in-out infinite' },
    boxShadow: { panel: '0 20px 60px rgba(0,0,0,0.55)' },
  }},
  plugins: [],
}
export default config
