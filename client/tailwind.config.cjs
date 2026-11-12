/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Reference UI Dark Theme Colors
        darkBg: '#0a0e1a', // Main background - very dark navy/black
        darkBgSecondary: '#0f1420', // Secondary background
        darkCard: '#151b2b', // Card surface - elevated dark
        darkCardHover: '#1a2030', // Card hover state
        darkBorder: '#1e2738', // Subtle borders
        darkSidebar: '#0d1117', // Sidebar background
        customPrimary: '#3b82f6', // Blue accent from reference
        customPrimaryHover: '#2563eb', // Blue hover
        customSecondary: '#06b6d4', // Cyan for secondary elements
        customText: '#e5e7eb', // Light text
        customTextMuted: '#9ca3af', // Muted text
        customSuccess: '#10b981', // Green for success/delivered
        customWarning: '#f59e0b', // Amber for warnings
        customDanger: '#ef4444', // Red for errors
        customMuted: '#6b7280', // Very muted text
        // Status colors from reference
        statusInTransit: '#3b82f6', // Blue
        statusDelivered: '#10b981', // Green
        statusPending: '#f59e0b', // Amber
        statusException: '#ef4444', // Red
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}

