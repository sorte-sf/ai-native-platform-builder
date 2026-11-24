
module.exports = {
  content: ['./src/**/*.{html,ts}', '../../libs/**/*.{html,ts}'],
  theme: {
    fontSize: {
      xs: '0.625rem',
      sm: '0.75rem',
      md: '0.8125rem',
      base: '0.875rem',
      lg: '1rem',
      xl: '1.125rem',
      '2xl': '1.25rem',
      '3xl': '1.5rem',
      '4xl': '2rem',
      '5xl': '2.25rem',
      '6xl': '2.5rem',
      '7xl': '3rem',
      '8xl': '4rem',
      '9xl': '6rem',
      '10xl': '8rem',
    },
    screens: {
      sm: '600px',
      md: '960px',
      lg: '1280px',
      xl: '1440px',
    },
    fontFamily: {
      display: ['Fraunces', 'serif'],
      sans: ['Inter', 'sans-serif'],
    },
    extend: {
      opacity: {
        12: '0.12',
        38: '0.38',
        87: '0.87',
      },
      colors: {
        ink: '#101828',
        linen: '#f7f4ef',
        brass: '#b7791f',
        ocean: '#0f766e'
      },
      keyframes: {
        'text-gradient': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
      animation: {
        'text-gradient': 'text-gradient 5s ease infinite',
      },
    }
  },
  plugins: []
};
