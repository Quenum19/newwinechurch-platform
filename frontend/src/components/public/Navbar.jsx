/**
 * Navbar publique — refondue cohérente avec la palette "Magazine Drop".
 *
 * Architecture du menu (compacte) :
 *  - [Découvrir ▾] dropdown   : Messages · Blog · Galerie
 *  - [Rejoindre ▾] dropdown   : Événements · Billetterie · Communauté
 *  - Donner                   : direct (CTA spirituel)
 *  - Contact                  : direct
 *
 * Dropdowns :
 *  - hover sur desktop (lg+), click pour mobile/tactile
 *  - click outside ferme tout
 *  - indicateur chevron rotate
 *  - état "actif" si une des sous-routes est ouverte
 */
import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, User, ChevronDown } from 'lucide-react'

import LiveBadge from './LiveBadge.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'

export default function Navbar({ liveOn = false }) {
  const { t } = useTranslation()
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isStaff = useAuthStore((s) => s.isStaff)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null) // 'discover' | 'join' | null

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Ferme les dropdowns au changement de route (navigation OK)
  useEffect(() => {
    setOpenDropdown(null)
    setMobileOpen(false)
  }, [location.pathname])

  // === Définition des groupes ===
  const discoverGroup = {
    key: 'discover',
    label: t('nav.discover', 'Découvrir'),
    children: [
      { to: '/messages', label: t('nav.messages'),                       desc: t('nav.messagesDesc', 'Prédications & enseignements') },
      { to: '/live',     label: t('nav.live', 'En direct'),               desc: t('nav.liveDesc',     'Culte en direct & replays') },
      { to: '/blog',     label: t('nav.blog', 'Blog'),                    desc: t('nav.blogDesc',     'Articles & réflexions') },
      { to: '/galerie',  label: t('nav.gallery'),                         desc: t('nav.galleryDesc',  'Photos & vidéos') },
    ],
  }

  const joinGroup = {
    key: 'join',
    label: t('nav.join', 'Rejoindre'),
    children: [
      { to: '/evenements',  label: t('nav.events'),                       desc: t('nav.eventsDesc',   'Cultes, soirées, formations') },
      { to: '/billetterie', label: t('nav.tickets', 'Billetterie'),       desc: t('nav.ticketsDesc',  'Réserve ta place') },
      { to: '/communaute',  label: t('nav.community'),                    desc: t('nav.communityDesc','Cellules & départements') },
    ],
  }

  // Lien "Accueil" en 1er (avant les dropdowns), Donner/Contact à la fin.
  const homeLink = { to: '/', label: t('nav.home', 'Accueil'), end: true }
  const directLinks = [
    { to: '/donner',  label: t('nav.give') },
    { to: '/contact', label: t('nav.contact') },
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 z-50 transition-all duration-300',
        liveOn ? 'top-[42px]' : 'top-0',
        'border-b',
        scrolled || mobileOpen || openDropdown
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

        {/* === Nav desktop : Accueil + 2 dropdowns + 2 liens directs === */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2"
             onMouseLeave={() => setOpenDropdown(null)}>
          <NavLink
            to={homeLink.to}
            end={homeLink.end}
            onMouseEnter={() => setOpenDropdown(null)}
            className={({ isActive }) => cn(
              'px-3 xl:px-4 py-2 font-mono text-[11px] xl:text-xs uppercase tracking-[0.16em] transition-colors',
              isActive
                ? 'text-public-flame'
                : 'text-public-ink/70 hover:text-public-flame',
            )}
          >
            {homeLink.label}
          </NavLink>
          <NavDropdown
            group={discoverGroup}
            isOpen={openDropdown === 'discover'}
            onToggle={() => setOpenDropdown(openDropdown === 'discover' ? null : 'discover')}
            onHover={() => setOpenDropdown('discover')}
          />
          <NavDropdown
            group={joinGroup}
            isOpen={openDropdown === 'join'}
            onToggle={() => setOpenDropdown(openDropdown === 'join' ? null : 'join')}
            onHover={() => setOpenDropdown('join')}
          />
          {directLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onMouseEnter={() => setOpenDropdown(null)}
              className={({ isActive }) => cn(
                'px-3 xl:px-4 py-2 font-mono text-[11px] xl:text-xs uppercase tracking-[0.16em] transition-colors',
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
        <div className="lg:hidden border-t border-public-ink/10 bg-public-bone max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="container-nwc py-6 flex flex-col gap-1">
            <NavLink
              to={homeLink.to}
              end={homeLink.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                'px-3 py-3 font-display uppercase text-2xl tracking-tight border-l-2 transition',
                isActive
                  ? 'border-public-flame text-public-flame'
                  : 'border-transparent text-public-ink hover:border-public-ink hover:pl-5',
              )}
            >
              {homeLink.label}
            </NavLink>
            <MobileGroup group={discoverGroup} onPick={() => setMobileOpen(false)}/>
            <MobileGroup group={joinGroup}     onPick={() => setMobileOpen(false)}/>
            {directLinks.map((l) => (
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

/* ─────────────────────────────────────────────────────────────── */

/**
 * Dropdown desktop : trigger button + menu panel.
 * Le menu est en position absolue sous le trigger.
 */
function NavDropdown({ group, isOpen, onToggle, onHover }) {
  const location = useLocation()
  // "Actif" si une des sous-routes du groupe est actuellement chargée
  const isActive = group.children.some((c) => location.pathname.startsWith(c.to))

  return (
    <div className="relative" onMouseEnter={onHover}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 xl:px-4 py-2 font-mono text-[11px] xl:text-xs uppercase tracking-[0.16em] transition-colors',
          isActive || isOpen
            ? 'text-public-flame'
            : 'text-public-ink/70 hover:text-public-flame',
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {group.label}
        <ChevronDown
          size={13}
          className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[260px] bg-public-bone border-2 border-public-ink/10 shadow-2xl z-50"
          role="menu"
        >
          {group.children.map((c, i) => (
            <NavLink
              key={c.to}
              to={c.to}
              className={({ isActive }) => cn(
                'block px-5 py-4 border-l-2 transition group',
                i > 0 && 'border-t border-public-ink/5',
                isActive
                  ? 'border-l-public-flame bg-public-flame/5'
                  : 'border-l-transparent hover:border-l-public-flame hover:bg-public-flame/5',
              )}
              role="menuitem"
            >
              <p className="font-display uppercase text-base text-public-ink group-hover:text-public-flame transition">
                {c.label}
              </p>
              {c.desc && (
                <p className="text-[11px] mt-0.5 text-public-ink/55">{c.desc}</p>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Section "groupe" version mobile : header désactivé + items en cascade.
 * Pas de toggle (tout ouvert visuellement) car le drawer mobile est déjà compact.
 */
function MobileGroup({ group, onPick }) {
  return (
    <div className="border-b border-public-ink/5 pb-3 mb-2">
      <p className="px-3 pt-2 pb-1 tag-mono text-public-flame">
        {group.label}
      </p>
      {group.children.map((c) => (
        <NavLink
          key={c.to}
          to={c.to}
          onClick={onPick}
          className={({ isActive }) => cn(
            'px-3 py-2.5 block font-display uppercase text-xl tracking-tight border-l-2 transition',
            isActive
              ? 'border-public-flame text-public-flame'
              : 'border-transparent text-public-ink hover:border-public-ink hover:pl-5',
          )}
        >
          {c.label}
        </NavLink>
      ))}
    </div>
  )
}
