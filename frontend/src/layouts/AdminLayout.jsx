/**
 * AdminLayout — Refonte 2026 (hybrid Notion/Linear/Supabase).
 *
 *  - Sidebar foncée (zinc-950) fixe à gauche en desktop, drawer overlay en mobile
 *  - Topbar minimal (recherche + cloche notifs + user menu)
 *  - Content principal en fond clair (var --adm-bg)
 *  - Mobile-first : sidebar collapse < lg, header sticky, padding adapté
 *  - Items conditionnels par permission Spatie (inchangé fonctionnellement)
 */
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Users, Building2, Home as HomeIcon,
  HandCoins, Settings as SettingsIcon, LogOut, Menu, ExternalLink,
  Mic, Calendar, BookOpen, Image as ImageIcon, MessageSquare, Mail, Activity, Shield,
  ChevronLeft, ChevronRight, Search, FileText, Smartphone, Images, UserPlus,
  MessageCircle, ScanLine, Ticket, Layers,
} from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useNotificationBootstrap } from '@/hooks/useNotifications'
import NotificationCenter from '@/components/shared/NotificationCenter'
import LanguageSwitcher from '@/components/public/LanguageSwitcher.jsx'
import { cn } from '@/utils/cn'

/**
 * Construit la liste des items du menu. On utilise des clés i18n pour les
 * labels, qui se rafraîchissent à chaque changement de langue.
 */
function buildNavItems(t) {
  return [
    { to: '/admin', icon: LayoutDashboard, label: t('admin.sidebar.dashboard'), end: true, perm: 'view dashboard' },

    { section: t('admin.sidebar.section.community') },
    { to: '/admin/membres',           icon: Users,          label: t('admin.sidebar.members'),            perm: 'view members' },
    { to: '/admin/demandes-adhesion', icon: UserPlus,       label: t('admin.sidebar.membershipRequests'), perm: 'create members' },
    { to: '/admin/departements',      icon: Building2,      label: t('admin.sidebar.departments'),        perm: 'view departments' },
    { to: '/admin/cellules',          icon: HomeIcon,       label: t('admin.sidebar.cells'),              perm: 'view cells' },
    { to: '/admin/rapports-departement', icon: FileText,    label: t('admin.sidebar.reports'),            perm: 'view department reports' },

    { section: t('admin.sidebar.section.content') },
    { to: '/admin/sermons',           icon: Mic,            label: t('admin.sidebar.sermons'),    perm: 'view sermons' },
    { to: '/admin/evenements',        icon: Calendar,       label: t('admin.sidebar.events'),     perm: 'view events' },
    { to: '/admin/series',            icon: Layers,         label: t('admin.sidebar.series', 'Séries'),         perm: 'create events' },
    { to: '/admin/billetterie',       icon: Ticket,         label: t('admin.sidebar.ticketing', 'Billetterie'), perm: 'manage event tickets' },
    { to: '/scan',                    icon: ScanLine,       label: t('admin.sidebar.scan', 'Scanner billets'), perm: 'scan tickets', target: '_blank' },
    { to: '/admin/blog',              icon: BookOpen,       label: t('admin.sidebar.blog'),       perm: 'view posts' },
    { to: '/admin/temoignages',       icon: MessageCircle,  label: t('admin.sidebar.testimonials', 'Témoignages'), perm: 'manage testimonials' },
    { to: '/admin/galerie',           icon: ImageIcon,      label: t('admin.sidebar.gallery'),    perm: 'view gallery' },

    { section: t('admin.sidebar.section.engagement') },
    { to: '/admin/dons',              icon: HandCoins,      label: t('admin.sidebar.donations'),        perm: 'view donations' },
    { to: '/admin/methodes-don',      icon: Smartphone,     label: t('admin.sidebar.donationMethods'),  perm: 'manage donation accounts' },
    { to: '/admin/prieres',           icon: MessageSquare,  label: t('admin.sidebar.prayers'),          perm: 'view prayer requests' },
    { to: '/admin/newsletter',        icon: Mail,           label: t('admin.sidebar.newsletter'),       perm: 'manage newsletter subscribers' },

    { section: t('admin.sidebar.section.system') },
    { to: '/admin/utilisateurs',      icon: Shield,         label: t('admin.sidebar.users'),       perm: 'assign roles' },
    { to: '/admin/parametres',        icon: SettingsIcon,   label: t('admin.sidebar.settings'),    perm: 'manage settings' },
    { to: '/admin/images-auth',       icon: Images,         label: t('admin.sidebar.authImages'),  perm: 'manage settings' },
    { to: '/admin/journal',           icon: Activity,       label: t('admin.sidebar.log'),         perm: 'view activity log' },
  ]
}

/** Label dans le header de la sidebar selon le rôle (via i18n).
 *  Ordre de priorité : du plus puissant au plus restreint. */
function roleLabel(roles, t) {
  if (roles.includes('superadmin'))  return t('admin.roleLabel.superadmin')
  if (roles.includes('pasteur'))     return t('admin.roleLabel.pasteur')
  if (roles.includes('rh'))          return t('admin.roleLabel.rh')
  if (roles.includes('admin'))       return t('admin.roleLabel.admin')
  if (roles.includes('admin-site'))  return t('admin.roleLabel.adminSite', 'Admin site')
  if (roles.includes('gouverneur'))  return t('admin.roleLabel.gouverneur')
  if (roles.includes('leader'))      return t('admin.roleLabel.leader')
  return t('admin.roleLabel.default')
}

export default function AdminLayout() {
  const { t } = useTranslation()
  const user   = useAuthStore((s) => s.user)
  const can    = useAuthStore((s) => s.can)
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)

  useNotificationBootstrap()
  useEffect(() => { setMobileOpen(false) }, [])

  const navItems = buildNavItems(t)
  const visibleItems = (() => {
    const filtered = navItems.filter((item) => item.section || can(item.perm))
    const cleaned = []
    for (let i = 0; i < filtered.length; i++) {
      const it = filtered[i]
      if (it.section) {
        const next = filtered[i + 1]
        if (next && !next.section) cleaned.push(it)
      } else {
        cleaned.push(it)
      }
    }
    return cleaned
  })()

  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-[240px]'

  return (
    <div className="admin-scope min-h-screen flex">
      {/* ============== SIDEBAR ============== */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 inset-y-0 left-0 z-40 h-screen shrink-0',
          'transform transition-all duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarWidth,
        )}
        style={{
          background: 'var(--adm-side-bg)',
          borderRight: '1px solid var(--adm-side-border)',
          color: 'var(--adm-side-text)',
        }}
      >
        <Link
          to="/admin"
          className="flex items-center gap-3 px-4 h-14 border-b"
          style={{ borderColor: 'var(--adm-side-border)' }}
        >
          <img src="/logos/logo_newwine.png" alt="" className="h-7 w-auto shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white tracking-tight truncate">New Wine</div>
              <div className="text-[10px] uppercase tracking-[0.15em] truncate" style={{ color: 'var(--adm-side-text-muted)' }}>
                {/* Affiche le rôle réel : Super admin / Pasteur / RH / Administration */}
                {roleLabel(user?.roles ?? [], t)}
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

        <nav
          className="px-2 py-3 space-y-0.5 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 56px - 64px)' }}
        >
          {visibleItems.map((item, idx) => {
            if (item.section) {
              if (collapsed) return null
              return (
                <div
                  key={`section-${idx}`}
                  className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.15em] font-medium"
                  style={{ color: 'var(--adm-side-text-muted)' }}
                >
                  {item.section}
                </div>
              )
            }
            const { to, icon: Icon, label, end, target } = item
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                target={target}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 h-9 rounded-md text-sm transition hover:bg-white/[0.06]',
                    isActive && 'font-medium',
                    collapsed && 'justify-center px-0',
                  )
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--adm-side-active-fg)' : 'var(--adm-side-text)',
                  background: isActive ? 'var(--adm-side-active-bg)' : 'transparent',
                })}
                title={collapsed ? label : undefined}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
                {target === '_blank' && !collapsed && (
                  <ExternalLink size={11} className="opacity-50 shrink-0"/>
                )}
              </NavLink>
            )
          })}

          <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--adm-side-border)' }}>
            <Link
              to="/"
              className={cn(
                'flex items-center gap-3 px-3 h-9 rounded-md text-sm hover:bg-white/[0.06] transition',
                collapsed && 'justify-center px-0',
              )}
              style={{ color: 'var(--adm-side-text-muted)' }}
              title={collapsed ? t('admin.sidebar.publicSite') : undefined}
            >
              <ExternalLink size={16} className="shrink-0" />
              {!collapsed && t('admin.sidebar.publicSite')}
            </Link>
          </div>
        </nav>

        <div
          className="absolute bottom-0 inset-x-0 p-2 border-t"
          style={{ borderColor: 'var(--adm-side-border)' }}
        >
          <button
            onClick={() => logout.mutate()}
            className={cn(
              'w-full flex items-center gap-3 px-3 h-9 rounded-md text-sm transition hover:bg-white/[0.06]',
              collapsed && 'justify-center px-0',
            )}
            style={{ color: 'var(--adm-side-text-muted)' }}
            title={collapsed ? t('admin.sidebar.logout') : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && t('admin.sidebar.logout')}
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(9,9,11,0.5)' }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ============== MAIN ============== */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-20 h-14 flex items-center gap-3 px-3 sm:px-4 lg:px-6"
          style={{
            background: 'rgba(250, 250, 250, 0.85)',
            backdropFilter: 'saturate(140%) blur(8px)',
            WebkitBackdropFilter: 'saturate(140%) blur(8px)',
            borderBottom: '1px solid var(--adm-border)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-zinc-100"
            style={{ color: 'var(--adm-text-muted)' }}
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>

          {/* Recherche desktop */}
          <div className="hidden sm:flex items-center gap-2 max-w-md w-full">
            <div className="relative w-full">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--adm-text-faint)' }}
              />
              <input
                type="search"
                placeholder={t('admin.topbar.search')}
                className="w-full h-9 pl-9 pr-3 text-sm adm-input"
                style={{ background: '#fff' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitcher />
            <NotificationCenter />

            <Link
              to="/admin/profil"
              className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 ml-1 rounded-md border-l hover:bg-zinc-100 transition"
              style={{ borderColor: 'var(--adm-border)' }}
              title={t('admin.topbar.myProfile')}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
                >
                  {(user?.first_name?.[0] || user?.name?.[0] || 'A').toUpperCase()}
                </div>
              )}
              <div className="text-xs leading-tight max-w-[140px]">
                <div className="font-medium truncate" style={{ color: 'var(--adm-text)' }}>{user?.full_name || 'Admin'}</div>
                <div className="truncate" style={{ color: 'var(--adm-text-faint)' }}>{roleLabel(user?.roles ?? [], t)}</div>
              </div>
            </Link>

            <Link to="/admin/profil" className="sm:hidden" title={t('admin.topbar.myProfile')}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
                >
                  {(user?.first_name?.[0] || user?.name?.[0] || 'A').toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
