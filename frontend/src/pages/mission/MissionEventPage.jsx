/**
 * MissionEventPage — Étape F.
 *
 * Route dédiée aux grants event_staff : URL /mission/evenement/:id
 *
 * Pourquoi ?
 * Un gouverneur/leader/membre avec un grant manager NE DOIT PAS entrer dans
 * l'AdminLayout où il verrait TOUS les menus admin (membres, dépts, finances…).
 * Il doit accéder uniquement à la billetterie de SON event.
 *
 * Cette page :
 *  - Layout minimal : header sobre + back button + badge du rôle + event title
 *  - Contenu : réutilise EventTicketsDashboard
 *  - ⚠️ Wrapper `.admin-scope` autour du contenu → les variables CSS `--adm-*`
 *    et classes `.adm-card`/`.adm-btn`/etc. rendent correctement (elles sont
 *    scopées à `.admin-scope` dans globals.css)
 *  - Backend policy (EventPolicy) enforce l'autorisation par grant scopé
 *  - Accessible à tout user connecté (le backend rejette si pas de grant)
 */
import { Suspense, lazy } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft, Ticket, Loader2, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { getMyStaffAssignments } from '@/api/me'
import { useAuthStore } from '@/store/authStore'

const EventTicketsDashboard = lazy(() =>
  import('@/pages/admin/EventTicketsDashboard.jsx'),
)

const GRANT_LABELS = {
  manager:      { label: 'Manager',       bg: '#FEE2E2', color: '#8B1A2F', border: '#8B1A2F' },
  scanner_lead: { label: 'Chef sécurité', bg: '#FEF3C7', color: '#B45309', border: '#D97706' },
  scanner:      { label: 'Scanner',       bg: '#DBEAFE', color: '#1D4ED8', border: '#3B82F6' },
}

export default function MissionEventPage() {
  const { id } = useParams()
  const eventId = parseInt(id, 10)
  const roles = useAuthStore((s) => s.roles) ?? []

  // Récupère les assignments pour identifier notre grant sur cet event.
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['me', 'staff-assignments'],
    queryFn: getMyStaffAssignments,
    staleTime: 60_000,
  })

  const assignment = assignments.find((a) => a.event_id === eventId || a.event?.id === eventId)

  // Retour vers l'espace d'origine du user selon son rôle principal.
  const backUrl = roles.includes('superadmin') || roles.includes('admin') || roles.includes('pasteur') || roles.includes('rh')
    ? '/admin'
    : roles.includes('gouverneur') ? '/gouverneur'
    : roles.includes('leader') ? '/leader'
    : '/mon-espace'

  // ─── ÉTATS DE CHARGEMENT / VIDE ─────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto animate-spin" style={{ color: '#8B1A2F' }}/>
          <p className="mt-3 text-sm" style={{ color: '#71717A' }}>Chargement de la mission…</p>
        </div>
      </main>
    )
  }

  // Pas d'assignment actif → redirect vers l'espace d'origine.
  // (Le backend rejettera aussi de son côté ; c'est un garde-fou UX.)
  if (! assignment) {
    return <Navigate to={backUrl} replace/>
  }

  const meta = GRANT_LABELS[assignment.grant] ?? GRANT_LABELS.scanner
  const IconBadge = assignment.grant === 'scanner_lead' ? ShieldCheck : Ticket

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* ═══ HEADER MISSION ═══
          Toolbar sticky avec back button + titre event + badge rôle.
          Styles inline pour bypass le compat CSS des layouts admin. */}
      <header
        className="sticky top-0 z-30 border-b shadow-sm"
        style={{ background: '#FFFFFF', borderColor: '#E4E4E7' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
          {/* Ligne 1 : Retour + titre event + badge (empilement flexible mobile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={backUrl}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-sm rounded-md transition shrink-0"
              style={{ color: '#52525B' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F5' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <ArrowLeft size={16}/>
              <span className="hidden xs:inline">Retour</span>
            </Link>

            <div className="hidden sm:block shrink-0" style={{ width: '1px', height: '24px', background: '#E4E4E7' }}/>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <IconBadge size={16} className="shrink-0" style={{ color: '#8B1A2F' }}/>
              <span className="font-semibold truncate text-sm sm:text-base" style={{ color: '#18181B' }}>
                {assignment.event.title}
              </span>
            </div>

            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium border rounded shrink-0"
              style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
            >
              {meta.label}
            </span>
          </div>

          {/* Ligne 2 : sous-texte "Mission scopée…" (desktop uniquement) */}
          <p
            className="mt-1 text-[11px] font-mono hidden lg:block"
            style={{ color: '#A1A1AA' }}
          >
            Mission scopée à cet événement uniquement
          </p>
        </div>
      </header>

      {/* ═══ CONTENU ═══
          `admin-scope` : indispensable pour activer les variables CSS admin
          (--adm-text, --adm-card, etc.) utilisées par EventTicketsDashboard.
          Sans ça : cards transparentes, textes invisibles. */}
      <div className="admin-scope">
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 py-6"
          style={{ color: 'var(--adm-text)' }}
        >
          <Suspense fallback={
            <div className="py-16 text-center">
              <Loader2 size={24} className="mx-auto animate-spin" style={{ color: 'var(--adm-text-muted)' }}/>
              <p className="mt-3 text-sm" style={{ color: 'var(--adm-text-muted)' }}>
                Chargement de la billetterie…
              </p>
            </div>
          }>
            <EventTicketsDashboard />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
