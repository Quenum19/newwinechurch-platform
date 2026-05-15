/**
 * AuthLayout — Refonte v3 (premium, motion, parallax subtil).
 *
 *  - Split 55/45 (image | formulaire), pleine hauteur viewport
 *  - Image hero : crossfade en changement de page (login ↔ rejoindre)
 *    avec un léger zoom permanent (style "Ken Burns" très lent)
 *  - Logo + verse : entrée animée stagger (motion)
 *  - Overlay dégradé bottom seulement (l'image respire)
 *  - Côté formulaire : entrée animée stagger des enfants via .auth-stagger
 */
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import api from '@/api/axios'
import LanguageSwitcher from '@/components/public/LanguageSwitcher.jsx'

export default function AuthLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { data: hero } = useQuery({
    queryKey: ['public', 'auth-image-random', location.pathname],
    queryFn: async () => (await api.get('/auth-images/random')).data?.data ?? null,
    staleTime: 0,
    gcTime: 1_000,
  })

  return (
    <main className="auth-modern min-h-screen flex bg-white">
      {/* === Hero (desktop seulement, 55%) === */}
      <aside className="hidden lg:flex relative overflow-hidden flex-[1.2]">
        {/* Crossfade entre images au changement d'URL */}
        <AnimatePresence mode="wait">
          <motion.div
            key={hero?.url || 'fallback'}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {hero?.url ? (
              <motion.img
                src={hero.url}
                alt={hero.title ?? ''}
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ scale: 1.08 }}
                animate={{ scale: 1.18 }}
                transition={{ duration: 32, ease: 'linear' }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, #18181B 0%, #3a0d18 55%, #8B1A2F 100%)',
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Overlays : dégradé bottom + très léger top pour le logo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
        {/* Bruit subtil pour effet "film" (optionnel, dataURI) */}
        <div
          className="absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
          }}
        />

        {/* Logo + brand */}
        <motion.div
          className="relative z-10 self-start m-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logos/logo_newwine.png"
              alt="New Wine Church"
              className="h-9 w-auto drop-shadow-lg group-hover:scale-105 transition"
            />
            <div className="text-white">
              <p className="font-semibold text-sm tracking-tight leading-none">
                {t('brand.name')}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/80 mt-1">
                {t('brand.fullName')}
              </p>
            </div>
          </Link>
        </motion.div>

        {/* Verset + signature en bas */}
        <div className="relative z-10 mt-auto w-full p-10 xl:p-14 text-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={hero?.verse_ref || 'fallback-verse'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-2xl xl:text-[34px] font-light leading-[1.2] max-w-xl whitespace-pre-line drop-shadow-md tracking-tight">
                «&nbsp;{hero?.verse_text ?? t('auth.verse.default')}&nbsp;»
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px w-10 bg-white/50" />
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/85">
                  {hero?.verse_ref ?? t('auth.verse.defaultRef')}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </aside>

      {/* === Panneau formulaire (45%) === */}
      <section className="flex-1 flex flex-col px-5 sm:px-10 lg:px-14 xl:px-20 py-8 lg:py-10 bg-white">
        {/* Logo mobile (visible < lg) */}
        <motion.div
          className="lg:hidden mb-6"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="flex items-center gap-2 self-start">
            <img src="/logos/logo_newwine.png" alt="NWC" className="h-9 w-auto" />
            <div>
              <p className="font-semibold text-sm tracking-tight text-zinc-900">
                {t('brand.name')}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">
                {t('brand.fullName')}
              </p>
            </div>
          </Link>
        </motion.div>

        <div className="flex-1 flex flex-col justify-center">
          <motion.div
            key={location.pathname}
            className="w-full max-w-md mx-auto lg:mx-0 auth-stagger"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.06, delayChildren: 0.05 },
              },
            }}
          >
            <Outlet />
          </motion.div>
        </div>

        <motion.footer
          className="mt-8 text-xs text-zinc-400 flex items-center justify-between gap-3 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link to="/" className="hover:text-zinc-700 transition inline-flex items-center gap-1">
            {t('auth.backHome')}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span>© {new Date().getFullYear()} {t('brand.name')}</span>
          </div>
        </motion.footer>
      </section>
    </main>
  )
}
