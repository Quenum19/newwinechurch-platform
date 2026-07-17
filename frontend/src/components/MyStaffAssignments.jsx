/**
 * MyStaffAssignments — Étape F.
 *
 * Panneau "Mes missions billetterie" visible partout où le user connecté
 * peut arriver : espace membre, dashboard gouverneur, dashboard leader.
 *
 * Affiche la liste des grants event_staff actifs avec :
 *  - Nom + date + lieu de l'event
 *  - Badge du grant (Manager / Chef sécurité / Scanner)
 *  - Bouton d'action direct (bille billetterie ou scanner)
 *
 * Ne s'affiche que si le user a AU MOINS un grant actif — sinon composant null.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Crown, ShieldCheck, ScanLine, Calendar, MapPin, ArrowRight, Ticket,
} from 'lucide-react'

import { getMyStaffAssignments } from '@/api/me'

const GRANT_META = {
  manager: {
    label: 'Manager',
    icon: Crown,
    color: 'text-[#8B1A2F] bg-[#8B1A2F]/10 border-[#8B1A2F]/30',
  },
  scanner_lead: {
    label: 'Chef sécurité',
    icon: ShieldCheck,
    color: 'text-amber-800 bg-amber-50 border-amber-300',
  },
  scanner: {
    label: 'Scanner',
    icon: ScanLine,
    color: 'text-blue-800 bg-blue-50 border-blue-300',
  },
}

export default function MyStaffAssignments({ className = '' }) {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['me', 'staff-assignments'],
    queryFn: getMyStaffAssignments,
    staleTime: 60_000,
    // Refetch discret toutes les 2 minutes → si un event est révoqué (auto ou
    // manuel), la carte disparaît sans reload manuel.
    refetchInterval: 120_000,
  })

  if (isLoading || assignments.length === 0) return null

  return (
    <section
      className={`bg-white rounded-2xl overflow-hidden shadow-sm ${className}`}
      style={{
        border: '1px solid #F59E0B33',
        borderLeft: '4px solid #F97316', // bande accent orange gauche
      }}
    >
      <header
        className="px-5 sm:px-6 py-4 border-b flex items-center gap-3"
        style={{ background: 'linear-gradient(to right, #FFF7ED, #FFFFFF)', borderColor: '#FED7AA' }}
      >
        <div
          className="w-10 h-10 rounded-full inline-flex items-center justify-center relative"
          style={{ background: '#FED7AA', color: '#C2410C' }}
        >
          <Ticket size={18}/>
          {/* Pulse subtile pour attirer l'attention */}
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: '#F97316' }}
          />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold" style={{ color: '#7C2D12' }}>
            🎯 Tu as {assignments.length === 1 ? 'une mission' : `${assignments.length} missions`} billetterie
          </h2>
          <p className="text-xs" style={{ color: '#9A3412' }}>
            {assignments.length === 1
              ? 'Un événement où tu as un accès actif — clique pour y accéder.'
              : `${assignments.length} événements où tu as un accès actif.`}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-zinc-100">
        {assignments.map((a) => <AssignmentRow key={a.id} assignment={a}/>)}
      </ul>
    </section>
  )
}

function AssignmentRow({ assignment: a }) {
  // Garde-fou : si l'assignment n'a pas d'event ou de grant, on skip la ligne
  // plutôt que de crasher le composant parent (dashboard entier deviendrait
  // blanc/noir).
  if (! a?.event) return null

  const meta = GRANT_META[a.grant] ?? GRANT_META.scanner
  const Icon = meta.icon
  const startsAt = a.event?.starts_at ? new Date(a.event.starts_at) : null

  // Le lien peut être interne (SPA) ou absolu (fallback). On tente d'extraire
  // le path interne pour éviter un reload complet quand c'est possible.
  // try/catch : si action_url est malformée, on fallback vers un lien externe.
  let internalPath = null
  try {
    if (a.action_url) {
      const url = new URL(a.action_url, window.location.origin)
      internalPath = url.host === window.location.host ? url.pathname + url.search : null
    }
  } catch { internalPath = null }

  // Fallback ultime : reconstruit une URL interne depuis event_id + grant si
  // action_url est absente ou cassée.
  if (! internalPath && a.event?.id) {
    internalPath = a.grant === 'scanner'
      ? `/scan?event=${a.event.id}`
      : `/mission/evenement/${a.event.id}`
  }

  // Classes + style INLINE pour la couleur : le CSS compat `.admin-scope
  // .text-white` avec !important gagne contre Tailwind (même !text-white),
  // donc on force via style inline qui a une spécificité supérieure.
  const btnClasses = 'inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium rounded-lg transition whitespace-nowrap no-underline'
  const btnStyle   = { color: '#ffffff', textDecoration: 'none' }

  const Action = internalPath
    ? <Link to={internalPath} className={btnClasses} style={btnStyle}>{a.action_label} <ArrowRight size={13}/></Link>
    : <a href={a.action_url} className={btnClasses} style={btnStyle}>{a.action_label} <ArrowRight size={13}/></a>

  return (
    <li className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] uppercase tracking-wider font-medium border rounded ${meta.color}`}>
            <Icon size={11}/> {meta.label}
          </span>
        </div>
        <p className="font-semibold text-zinc-900 truncate">{a.event.title}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          {startsAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={11}/>
              <span className="capitalize">{format(startsAt, "EEE d MMM 'à' HH'h'mm", { locale: fr })}</span>
            </span>
          )}
          {a.event.location && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin size={11}/> {a.event.location}
            </span>
          )}
        </div>
      </div>

      {Action}
    </li>
  )
}
