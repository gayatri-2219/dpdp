import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary:  { DEFAULT: '#EB6A2A', hover: '#D65C22', light: '#FEF0E6', border: '#F8C9A8' },
        bg:       { DEFAULT: '#F8F5EF', subtle: '#F3EFE8', hover: '#EDE8E0' },
        border:   { DEFAULT: '#ECE5DD', strong: '#D4C9BC', subtle: '#F0EBE2' },
        card:     { DEFAULT: '#FFFFFF' },
        fg:       { DEFAULT: '#181818', 2: '#444444', 3: '#666666', 4: '#999999' },
        success:  { DEFAULT: '#28A745', light: '#E8F5EC', border: '#A8D5B5' },
        warning:  { DEFAULT: '#F59E0B', light: '#FEF9EA', border: '#FCD96A' },
        danger:   { DEFAULT: '#EF4444', light: '#FEE8E8', border: '#FBB4B4' },
      },
      borderRadius: {
        'xs': '4px', 'sm': '6px', 'md': '10px',
        'lg': '14px', 'xl': '20px', '2xl': '28px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0,0,0,0.04)',
        'sm': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'md': '0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
        'lg': '0 8px 24px rgba(0,0,0,0.09), 0 4px 8px rgba(0,0,0,0.05)',
        'xl': '0 16px 48px rgba(0,0,0,0.11), 0 8px 16px rgba(0,0,0,0.06)',
        'primary': '0 4px 14px rgba(235,106,42,0.3)',
      },
    },
  },
  plugins: [],
}
export default config
