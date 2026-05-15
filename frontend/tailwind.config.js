/**
 * ==============================================================
 *  NEW WINE CHURCH — Tailwind CSS configuration
 *  Charte graphique : bordeaux + or sur fond noir cinématographique
 *  Slogan : "Sauvé pour Sauver"
 * ==============================================================
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Tous les fichiers où Tailwind va scanner les classes utilisées.
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  // Mode sombre activé via la classe `dark` sur <html>.
  // Le site est principalement en dark, mais on garde la flexibilité.
  darkMode: 'class',

  theme: {
    // Breakpoints standards (mobile-first dès 320px).
    screens: {
      xs: '360px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },

    extend: {
      // === PALETTE NWC : Bordeaux (wine) + Or (gold) + Noirs ===
      colors: {
        // Bordeaux — couleur primaire de l'église (#8B1A2F)
        wine: {
          50: '#FCEEF1',
          100: '#F8DCE2',
          200: '#F0B5C2',
          300: '#E48A9D',
          400: '#D45F7A',
          500: '#B53958',
          600: '#9D2A47',
          700: '#8B1A2F', // ← couleur primaire officielle
          800: '#6F1525',
          900: '#530F1B',
          950: '#2D0810',
        },
        // Or — couleur secondaire (#C9A84C)
        gold: {
          50: '#FBF7E8',
          100: '#F7EFCE',
          200: '#EFDD9C',
          300: '#E4C865',
          400: '#D6B650',
          500: '#C9A84C', // ← couleur secondaire officielle
          600: '#A6873A',
          700: '#7E662E',
          800: '#574721',
          900: '#3A2F16',
          950: '#1F1A0C',
        },
        // Noirs cinématographiques (fonds de page)
        ink: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#A3A3A3',
          400: '#737373',
          500: '#525252',
          600: '#2A2A2A',
          700: '#1F1F1F',
          800: '#1A1A1A', // ← fond secondaire (cards)
          900: '#111111', // ← fond intermédiaire
          950: '#080808', // ← fond principal (body)
        },
        // Accent hover bordeaux clair (#B22240)
        accent: {
          DEFAULT: '#B22240',
          hover: '#C92950',
        },

        // ============================================================
        // === PALETTE PUBLIQUE (refonte home — Direction "Magazine Drop")
        // ============================================================
        // Namespace séparé pour ne PAS toucher aux tokens admin (wine/gold/ink/accent).
        // Utilisé exclusivement par les pages publiques (Home, Sermons, Events...).
        // Justification : Flame = Pentecôte (feu de l'Esprit), théologie + esthétique alignées.
        public: {
          ink:    '#0A0908', // Texte / fond dark — noir chaud, jamais clinique
          bone:   '#F4F1EB', // Fond principal — crème chaud, jamais blanc hôpital
          coffee: '#1F1B17', // Surface secondaire (bandes / cards)
          flame:  '#FF4A1C', // Accent unique fort — feu, énergie, salut
          'flame-deep': '#D63E13', // Hover/pressed du Flame
          stone:  '#A89F8E', // Texte secondaire — gris chaud
          'stone-soft': '#D9D4C9', // Border / divider chaud
        },
      },

      // === POLICES NWC ===
      fontFamily: {
        // === Stack admin / member (existant, ne pas toucher) ===
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        script: ['"Great Vibes"', 'cursive'],

        // === Stack home publique refondue (Direction "Magazine Drop") ===
        // Display impact pour les headlines XXL ("SAUVÉ.", "POUR SAUVER.").
        display: ['Anton', '"Helvetica Neue"', 'Impact', 'sans-serif'],
        // Serif éditorial expressif pour pull-quotes + scripture.
        editorial: ['Fraunces', 'Georgia', 'serif'],
        // Mono pour numéros Mobile Money + tags + small caps.
        mono: ['"Geist Mono"', '"IBM Plex Mono"', '"Courier New"', 'monospace'],
      },

      // === Échelle typographique enrichie ===
      fontSize: {
        '7xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        '9xl': ['8rem', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
      },

      // === Animations cinématographiques ===
      keyframes: {
        // Apparition douce (utilisée sur sections au scroll)
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        // Pulsation du badge "EN DIRECT"
        livePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(178, 34, 64, 0.7)' },
          '50%': { boxShadow: '0 0 0 12px rgba(178, 34, 64, 0)' },
        },
        // Effet shimmer pour les skeletons de chargement
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Effet zoom sur images au survol
        zoomIn: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
        // Glissement bas → haut (mobile menu)
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },

        // === Phase refonte home : marquee + rotation sticker ===
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }, // -50% car contenu dupliqué pour boucle seamless
        },
        'sticker-rotate': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'highlight-sweep': {
          '0%': { backgroundSize: '0% 100%' },
          '100%': { backgroundSize: '100% 100%' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'live-pulse': 'livePulse 1.6s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'zoom-in': 'zoomIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',

        // Marquee infinie (top hero) — 30s pour mobile readable, 45s desktop via CSS variable.
        marquee: 'marquee 35s linear infinite',
        'marquee-fast': 'marquee 18s linear infinite',
        'sticker-rotate': 'sticker-rotate 22s linear infinite',
        'highlight-sweep': 'highlight-sweep 0.9s ease-out forwards',
      },

      // === Box-shadows premium (effet cinema) ===
      boxShadow: {
        'wine-glow': '0 0 30px rgba(139, 26, 47, 0.35)',
        'gold-glow': '0 0 30px rgba(201, 168, 76, 0.35)',
        'card-hover': '0 16px 40px -12px rgba(0, 0, 0, 0.65)',
      },

      // === Backgrounds gradients NWC ===
      backgroundImage: {
        'wine-gradient': 'linear-gradient(135deg, #8B1A2F 0%, #530F1B 100%)',
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #7E662E 100%)',
        'dark-fade': 'linear-gradient(180deg, transparent 0%, #080808 100%)',
        'shimmer-bg': 'linear-gradient(90deg, #1A1A1A 0%, #2A2A2A 50%, #1A1A1A 100%)',
      },

      // === Espacement supplémentaire (sections généreuses) ===
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        128: '32rem',
        144: '36rem',
      },

      // === Border radius arrondis modernes ===
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },

  plugins: [
    // Formulaires stylisés (inputs, selects, checkboxes)
    require('@tailwindcss/forms')({ strategy: 'class' }),
    // Typographie riche pour articles de blog
    require('@tailwindcss/typography'),
    // Aspect-ratio pour videos et images
    require('@tailwindcss/aspect-ratio'),
  ],
}
