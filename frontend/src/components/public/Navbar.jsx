/**
 * Navbar publique — refondue cohérente avec la palette "Magazine Drop".
 *
 * Choix design :
 *  - Fond bone par défaut (clair, pas de halo noir cliché)
 *  - Au scroll : reste bone avec border-bottom + grain léger (cohérent avec Home)
 *  - Logo + titre en font-display Anton (cohérent avec headlines de la home)
 *  - Liens en font-mono small caps (Geist Mono uppercase tracking-widest)
 *  - LiveBadge en accent flame
 *  - Mobile : drawer bone au lieu d'ink-950
 */
import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, User } from 'lucide-react'

import LiveBadge from './LiveBadge.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'

export default function Navbar({ liveOn = false }) {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isStaff = useAuthStore((s) => s.isStaff)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Liens primaires affichés sur desktop (xl: tous, lg: 5 max).
  const navLinks = [
    { to: '/messages',   label: t('nav.messages') },
    { to: '/evenements', label: t('nav.events') },
    { to: '/galerie',    label: t('nav.gallery') },
    { to: '/blog',       label: t('nav.blog') ?? 'Blog' },
    { to: '/communaute', label: t('nav.community') },
    { to: '/donner',     label: t('nav.give') },
    { to: '/contact',    label: t('nav.contact') },
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 z-50 transition-all duration-300',
        liveOn ? 'top-[42px]' : 'top-0',  // décale sous le banner si live
        'border-b',
        scrolled || mobileOpen
          ? 'bg-public-bone/95 backdrop-blur-md border-public-ink/10'
          : 'bg-public-bone/80 backdrop-blur-sm border-transparent',
      )}
    >
      <div className="container-nwc flex items-center justify-between h-16 lg:h-20">
        {/* === Logo + titre === */}
        <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          <img
            src="/logos/logo_newwine.png"
            alt=""
            className="h-9 lg:h-11 w-auto group-hover:rotate-[-4deg] transition-transform duration-500"
          />
          <span className="font-display uppercase text-xl lg:text-2xl text-public-ink tracking-tight">
            New Wine Church
          </span>
        </Link>

        {/* === Liens desktop (font-mono small caps).
              7 liens — sur lg on resserre le padding, sur xl on respire. */}
        <nav className="hidden lg:flex items-center">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => cn(
                'px-2 xl:px-3 py-2 font-mono text-[11px] xl:text-xs uppercase tracking-[0.16em] transition-colors',
                isActive
                  ? 'text-public-flame'
                  : 'text-public-ink/70 hover:text-public-flame',
              )}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* === Actions droite === */}
        <div className="flex items-center gap-2 lg:gap-3">
          <LiveBadge />
          <LanguageSwitcher />

          {isAuthenticated ? (
            <Link
              to={isStaff() ? '/admin' : '/mon-espace'}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-public-ink/70 hover:text-public-flame transition"
            >
              <User size={13}/> {t('nav.myAccount')}
            </Link>
          ) : (
            <Link to="/connexion" className="hidden sm:inline-flex btn-flame py-2 px-4 text-xs">
              {t('nav.login')}
            </Link>
          )}

          {/* Toggle mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-public-ink"
            aria-label={mobileOpen ? t('nav.closeMenu', 'Fermer le menu') : t('nav.openMenu', 'Ouvrir le menu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {/* === Mobile drawer === */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-public-ink/10 bg-public-bone">
          <nav className="container-nwc py-6 flex flex-col gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn(
                  'px-3 py-3 font-display uppercase text-2xl tracking-tight border-l-2 transition',
                  isActive
                    ? 'border-public-flame text-public-flame'
                    : 'border-transparent text-public-ink hover:border-public-ink hover:pl-5',
                )}
              >
                {l.label}
              </NavLink>
            ))}
            <div className="border-t border-public-ink/10 pt-4 mt-3">
              {isAuthenticated ? (
                <Link
                  to={isStaff() ? '/admin' : '/mon-espace'}
                  onClick={() => setMobileOpen(false)}
                  className="btn-outline-ink w-full justify-center"
                >
                  {t('nav.myAccount')}
                </Link>
              ) : (
                <Link
                  to="/connexion"
                  onClick={() => setMobileOpen(false)}
                  className="btn-flame w-full justify-center"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
