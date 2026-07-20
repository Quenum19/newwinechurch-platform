/**
 * MemberLayout — Refonte 2026 (uniforme avec AdminLayout).
 *
 * Sert TROIS espaces selon le path (et fallback sur les rôles) :
 *  - /gouverneur/* → menu Gouverneur
 *  - /leader/*     → menu Leader
 *  - /mon-espace/* → menu Membre
 *
 * Visuellement identique à AdminLayout (sidebar zinc-950 dark + content
 * clair + Inter via .admin-scope). Switcher inclus pour les users cumulant
 * gouverneur+leader.
 */
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, User as UserIcon, Lock, HandCoins, Calendar, Home as HomeIcon,
  LogOut, Menu, Building2, Users, FileText, BarChart3, ClipboardList, UserCheck,
  ArrowRightLeft, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useNotificationBootstrap } from '@/hooks/useNotifications'
import NotificationCenter from '@/components/shared/NotificationCenter'
import LanguageSwitcher from '@/components/public/LanguageSwitcher.jsx'
import SafeBoundary from '@/components/SafeBoundary.jsx'
import { cn } from '@/utils/cn'

function buildMemberNav(t) {
  return [
    { section: t('member.nav.section.mySpace') },
    { to: '/mon-espace',                icon: LayoutDashboard, label: t('member.nav.dashboard'), end: true },
    { to: '/mon-espace/profil',         icon: UserIcon,        label: t('member.nav.profile') },
    { to: '/mon-espace/mot-de-passe',   icon: Lock,            label: t('member.nav.security') },
    { section: t('member.nav.section.activity') },
    { to: '/mon-espace/mes-dons',       icon: HandCoins,       label: t('member.nav.donations') },
    { to: '/mon-espace/mes-evenements', icon: Calendar,        label: t('member.nav.events') },
    { to: '/mon-espace/ma-cellule',     icon: HomeIcon,        label: t('member.nav.cell') },
  ]
}

function buildGovernorNav(t) {
  return [
    { to: '/gouverneur',             icon: LayoutDashboard, label: t('gov.nav.dashboard'), end: true },
    { section: t('gov.nav.section.department') },
    { to: '/gouverneur/departement', icon: Building2,       label: t('gov.nav.myDepartment') },
    { to: '/gouverneur/membres',     icon: Users,           label: t('gov.nav.members') },
    { to: '/gouverneur/cellules',    icon: HomeIcon,        label: t('gov.nav.cells') },
    { section: t('gov.nav.section.reporting') },
    { to: '/gouverneur/rapports',    icon: FileText,        label: t('gov.nav.reports') },
    { to: '/gouverneur/analytics',   icon: BarChart3,       label: t('gov.nav.analytics') },
  ]
}

function buildLeaderNav(t) {
  return [
    { to: '/leader',           icon: LayoutDashboard, label: t('leader.nav.dashboard'), end: true },
    { section: t('leader.nav.section.myCell') },
    { to: '/leader/cellule',   icon: HomeIcon,        label: t('leader.nav.cell') },
    { to: '/leader/presences', icon: UserCheck,       label: t('leader.nav.attendance') },
    { to: '/leader/rapports',  icon: ClipboardList,   label: t('leader.nav.reports') },
  ]
}

function detectArea(pathname, isGovernor, isLeader) {
  if (pathname.startsWith('/gouverneur')) return 'governor'
  if (pathname.startsWith('/leader'))     return 'leader'
  if (pathname.startsWith('/mon-espace')) return 'member'
  if (isGovernor) return 'governor'
  if (isLeader)   return 'leader'
  return 'member'
}

function areaLabel(area, t) {
  if (area === 'governor') return t('member.areaLabel.governor')
  if (area === 'leader')   return t('member.areaLabel.leader')
  return t('member.areaLabel.member')
}

export default function MemberLayout() {
  const { t } = useTranslation()
  const user    = useAuthStore((s) => s.user)
  const hasRole = useAuthStore((s) => s.hasRole)
  const logout  = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const location = useLocation()

  useNotificationBootstrap()
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const isGovernor = hasRole('gouverneur')
  const isLeader   = hasRole('leader')
  const area = detectArea(location.pathname, isGovernor, isLeader)

  // Détecte les permissions admin léger (accueil, tresorier, etc.) — pour
  // afficher un accès à /admin dans le switcher même si l'user est
  // principalement gouverneur/leader.
  const can = useAuthStore((s) => s.can)
  const hasAttendance = can?.('view attendance') ?? false
  const hasScan       = can?.('scan tickets') ?? false
  const hasBilletDash = can?.('view billetterie dashboard') ?? false
  const hasAdminPanel = can?.('access admin panel') ?? false

  const rawNav =
    area === 'governor' ? buildGovernorNav(t) :
    area === 'leader'   ? buildLeaderNav(t) :
    buildMemberNav(t)

  // Ajoute une section "Autres accès" avec les liens admin si l'user a
  // les permissions correspondantes (rôle secondaire accueil/tresorier/etc.).
  if (hasAttendance || hasScan || hasBilletDash) {
    rawNav.push({ section: t('member.nav.section.otherAccess', 'Autres accès') })
    if (hasAttendance) {
      rawNav.push({ to: '/admin/presence', icon: ClipboardList, label: t('member.nav.attendance', 'Présence billetterie') })
    }
    if (hasBilletDash) {
      rawNav.push({ to: '/admin/billetterie/vue-360', icon: BarChart3, label: t('member.nav.billetterieDashboard', 'Vue 360° billetterie') })
    }
    if (hasScan) {
      rawNav.push({ to: '/scan', icon: UserCheck, label: t('member.nav.scan', 'Scanner billets'), target: '_blank' })
    }
    if (hasAdminPanel) {
      rawNav.push({ to: '/admin', icon: LayoutDashboard, label: t('member.nav.adminPanel', 'Panel admin complet') })
    }
  }

  const visibleItems = (() => {
    const cleaned = []
    for (let i = 0; i < rawNav.length; i++) {
      const it = rawNav[i]
      if (it.section) {
        const next = rawNav[i + 1]
        if (next && !next.section) cleaned.push(it)
      } else {
        cleaned.push(it)
      }
    }
    return cleaned
  })()

  const switcherLinks = []
  if (isGovernor && area !== 'governor') switcherLinks.push({ to: '/gouverneur', label: t('member.switchToGovernor') })
  if (isLeader   && area !== 'leader')   switcherLinks.push({ to: '/leader',     label: t('member.switchToLeader') })
  if (area !== 'member')                 switcherLinks.push({ to: '/mon-espace', label: t('member.switchToMember') })

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[240px]'

  return (
    <div className="admin-scope min-h-screen flex">
      {/* ============== SIDEBAR ============== */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 inset-y-0 left-0 z-40 h-screen shrink-0',
          'transform transition-all duration-200 ease-out flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarWidth,
        )}
        style={{
          background: 'var(--adm-side-bg)',
          borderRight: '1px solid var(--adm-side-border)',
          color: 'var(--adm-side-text)',
        }}
      >
        {/* Header logo + rôle */}
        <Link
          to={area === 'governor' ? '/gouverneur' : area === 'leader' ? '/leader' : '/mon-espace'}
          className="flex items-center gap-3 px-4 h-14 border-b shrink-0"
          style={{ borderColor: 'var(--adm-side-border)' }}
        >
          <img src="/logos/logo_newwine.png" alt="" className="h-7 w-auto shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white tracking-tight truncate">New Wine</div>
              <div className="text-[10px] uppercase tracking-[0.15em] truncate" style={{ color: 'var(--adm-side-text-muted)' }}>
                {areaLabel(area, t)}
              </div>
            </div>
          )}
        </Link>

        {/* Toggle collapse desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-16 h-6 w-6 items-center justify-center rounded-full border z-10 transition"
          style={{
            background: 'var(--adm-side-bg)',
            borderColor: 'var(--adm-side-border)',
            color: 'var(--adm-side-text)',
          }}
          aria-label={collapsed ? 'Étendre' : 'Réduire'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Nav scrollable */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {visibleItems.map((it, idx) =>
            it.section ? (
              !collapsed ? (
                <p
                  key={`s-${idx}`}
                  className="mt-4 mb-1 px-3 text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: 'var(--adm-side-text-muted)' }}
                >
                  {it.section}
                </p>
              ) : (
                <div key={`s-${idx}`} className="my-3 mx-3 h-px" style={{ background: 'var(--adm-side-border)' }} />
              )
            ) : (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-md text-sm transition px-3 py-2',
                    isActive ? 'font-medium' : 'font-normal',
                  )
                }
                style={({ isActive }) => ({
                  background: isActive ? 'var(--adm-side-active-bg)' : 'transparent',
                  color: isActive ? 'var(--adm-side-active-fg)' : 'var(--adm-side-text)',
                })}
                title={collapsed ? it.label : undefined}
              >
                {it.icon && <it.icon size={16} strokeWidth={1.75} className="shrink-0" />}
                {!collapsed && <span className="truncate">{it.label}</span>}
              </NavLink>
            )
          )}

          {/* Switcher entre espaces (cumul de rôles) */}
          {switcherLinks.length > 0 && !collapsed && (
            <>
              <p className="mt-5 mb-1 px-3 text-[10px] uppercase tracking-[0.15em]"
                 style={{ color: 'var(--adm-side-text-muted)' }}>
                {t('member.switcher')}
              </p>
              {switcherLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-xs transition"
                  style={{ color: 'var(--adm-side-text-muted)' }}
                >
                  <ArrowRightLeft size={14} strokeWidth={1.75} />
                  {l.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t shrink-0" style={{ borderColor: 'var(--adm-side-border)' }}>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 text-sm transition"
            style={{ color: 'var(--adm-side-text-muted)' }}
          >
            <ExternalLink size={14} strokeWidth={1.75} />
            {!collapsed && <span>{t('admin.sidebar.publicSite')}</span>}
          </Link>
          <button
            onClick={() => logout.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition hover:text-red-400"
            style={{ color: 'var(--adm-side-text-muted)' }}
          >
            <LogOut size={14} strokeWidth={1.75} />
            {!collapsed && <span>{t('admin.sidebar.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ============== MAIN ============== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 h-14 px-4 sm:px-6 flex items-center gap-3 border-b"
          style={{ background: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}
        >
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded"
            style={{ color: 'var(--adm-text-muted)' }}
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>

          <h1 className="text-sm font-medium hidden sm:block truncate" style={{ color: 'var(--adm-text)' }}>
            {areaLabel(area, t)}
          </h1>

          <div className="flex items-center gap-3 ml-auto">
            <LanguageSwitcher />
            <NotificationCenter />
            <Link
              to={area === 'governor' ? '/gouverneur/departement' : area === 'leader' ? '/leader/cellule' : '/mon-espace/profil'}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-md hover:bg-zinc-100 transition"
              title={t('admin.topbar.myProfile')}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold"
                     style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}>
                  {(user?.first_name?.[0] || user?.name?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--adm-text)' }}>
                  {user?.full_name || user?.name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--adm-text-faint)' }}>
                  {areaLabel(area, t)}
                </p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* SafeBoundary : si UNE page enfant crash pendant le render (ex. lors
              d'un switch d'espace), on affiche un fallback lisible au lieu de
              laisser l'écran devenir noir. La sidebar + topbar restent visibles. */}
          <SafeBoundary
            fallback={
              <div className="py-16 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--adm-text-muted)' }}>
                  Une erreur est survenue lors du chargement de cette page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md transition"
                  style={{ background: 'var(--adm-accent)', color: '#fff' }}
                >
                  Recharger la page
                </button>
              </div>
            }
          >
            <Outlet />
          </SafeBoundary>
        </main>
      </div>
    </div>
  )
}
