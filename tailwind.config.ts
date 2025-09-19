import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				glass: {
					bg: 'var(--glass-bg)',
					border: 'var(--glass-border)',
					button: 'var(--glass-button)',
					text: {
						primary: 'var(--glass-text-primary)',
						secondary: 'var(--glass-text-secondary)',
					},
				},
				neon: {
					blue: 'hsl(var(--neon-blue))',
					purple: 'hsl(var(--neon-purple))',
					pink: 'hsl(var(--neon-pink))',
					green: 'hsl(var(--neon-green))',
					orange: 'hsl(var(--neon-orange))',
					gold: 'hsl(var(--neon-gold))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				theme: {
					'dark': 'hsl(var(--theme-dark))',
					'purple': 'hsl(var(--theme-purple))',
					'blue': 'hsl(var(--theme-blue))',
					'green': 'hsl(var(--theme-green))',
					'gray-dark': 'hsl(var(--theme-gray-dark))',
					'gray-medium': 'hsl(var(--theme-gray-medium))',
					'gray-light': 'hsl(var(--theme-gray-light))',
				},
				'engagement': {
					'bg-start': 'hsl(var(--engagement-bg-start))',
					'bg-end': 'hsl(var(--engagement-bg-end))',
					'card': 'hsl(var(--engagement-card))',
					'border': 'hsl(var(--engagement-border))',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 5px rgba(74, 222, 128, 0.3)' 
					},
					'50%': { 
						boxShadow: '0 0 20px rgba(74, 222, 128, 0.6)' 
					},
				},
				'float': {
					'0%, 100%': { 
						transform: 'translateY(0)' 
					},
					'50%': { 
						transform: 'translateY(-10px)' 
					},
				},
				'neon-pulse': {
					'0%, 100%': { 
						boxShadow: '0 0 5px hsl(var(--neon-blue) / 0.5)' 
					},
					'50%': { 
						boxShadow: '0 0 20px hsl(var(--neon-blue) / 0.8), 0 0 30px hsl(var(--neon-blue) / 0.4)' 
					},
				},
				'streak-fire': {
					'0%, 100%': { 
						boxShadow: '0 0 10px hsl(var(--neon-orange) / 0.6)',
						filter: 'brightness(1)'
					},
					'50%': { 
						boxShadow: '0 0 25px hsl(var(--neon-orange) / 0.9), 0 0 40px hsl(var(--neon-orange) / 0.5)',
						filter: 'brightness(1.2)'
					},
				},
				'premium-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 8px hsl(var(--neon-gold) / 0.4)' 
					},
					'50%': { 
						boxShadow: '0 0 20px hsl(var(--neon-gold) / 0.7), 0 0 35px hsl(var(--neon-gold) / 0.3)' 
					},
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'float': 'float 6s ease-in-out infinite',
				'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
				'streak-fire': 'streak-fire 1.5s ease-in-out infinite',
				'premium-glow': 'premium-glow 3s ease-in-out infinite',
			},
			fontFamily: {
				'gaming': ['"Rajdhani"', 'sans-serif'],
				'main': ['"Inter"', 'sans-serif'],
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;