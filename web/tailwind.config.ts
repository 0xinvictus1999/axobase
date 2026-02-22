import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        neon: {
          blue: '#00f0ff',
          purple: '#b829dd',
          green: '#00ff9d',
          red: '#ff0044',
        },
        cyber: {
          black: '#050a0f',
          gray: '#0a151a',
          green: '#00ff9d',
          blue: '#00f0ff',
          purple: '#b829dd',
          red: '#ff0044',
          yellow: '#ffee00',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00f0ff, 0 0 10px #00f0ff' },
          '100%': { boxShadow: '0 0 20px #00f0ff, 0 0 30px #00f0ff' },
        }
      }
    },
  },
  plugins: [],
}
export default config
