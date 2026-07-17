/** Inscrits événement — Refonte 2026 admin-v2 native. */
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Users, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import BackButton from '@/components/admin/BackButton.jsx'
import { events } from '@/api/admin'

export default function EventRegistrations() {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', id, 'registrations'],
    queryFn: () => events.registrations(id),
  })

  const checkIn = useMutation({
    mutationFn: (userId) => events.markAttended(id, userId),
    onSuccess: () => {
      toast.success('Check-in enregistré.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'registrations'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#F4F4F5' }} />
        <div className="adm-card h-96 animate-pulse" />
      </div>
    )
  }

  const event = data?.event
  const regs = data?.registrations?.data ?? []

  return (
    <div className="space-y-5 sm:space-y-6">
      <BackButton to="/admin/evenements" label="Retour aux événements" />

      <header>
        <h1>{event?.title}</h1>
        <p className="text-sm mt-1 inline-flex items-center gap-2" style={{ color: 'var(--adm-text-muted)' }}>
          <Calendar size={14} />
          {event?.starts_at && format(new Date(event.starts_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Inscrits"
          value={event?.registered_count ?? 0}
          suffix={event?.max_attendees ? ` / ${event.max_attendees}` : null}
        />
        <StatCard
          label="Présents"
          value={event?.attended_count ?? 0}
          tone="success"
        />
        <StatCard
          label="Taux"
          value={event?.registered_count
            ? Math.round((event.attended_count / event.registered_count) * 100) + '%'
            : '—'}
        />
      </div>

      {regs.length === 0 ? (
        <div className="adm-card p-12 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--adm-text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Aucun inscrit pour le moment.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block adm-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Inscrit le</th>
                    <th>Statut</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id}>
                      <td><UserCell user={r.user} /></td>
                      <td className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>{r.user?.email}</td>
                      <td className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
                        {r.user?.phone || '—'}
                      </td>
                      <td className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
                        {r.registered_at && format(new Date(r.registered_at), 'dd MMM HH:mm', { locale: fr })}
                      </td>
                      <td>
                        <span className={`adm-badge ${r.status === 'attended' ? 'adm-badge-success' : 'adm-badge-warning'}`}>
                          {r.status === 'attended' ? 'Présent' : 'Inscrit'}
                        </span>
                      </td>
                      <td className="text-right">
                        {r.status !== 'attended' && (
                          <button
                            onClick={() => checkIn.mutate(r.user_id)}
                            className="adm-btn adm-btn-secondary text-xs py-1 px-2"
                          >
                            <CheckCircle2 size={12} /> Check-in
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {regs.map((r) => (
              <div key={r.id} className="adm-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <UserCell user={r.user} compact />
                  <span className={`adm-badge ${r.status === 'attended' ? 'adm-badge-success' : 'adm-badge-warning'} shrink-0`}>
                    {r.status === 'attended' ? 'Présent' : 'Inscrit'}
                  </span>
                </div>
                {r.status !== 'attended' && (
                  <button
                    onClick={() => checkIn.mutate(r.user_id)}
                    className="adm-btn adm-btn-secondary w-full justify-center text-xs mt-3"
                  >
                    <CheckCircle2 size={12} /> Marquer présent
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function UserCell({ user: u, compact = false }) {
  if (!u) return <span style={{ color: 'var(--adm-text-faint)' }}>—</span>
  return (
    <div className="flex items-center gap-2 min-w-0">
      {u.avatar ? (
        <img src={`/storage/${u.avatar}`} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
        >
          {(u.first_name?.[0] || u.name?.[0] || '?').toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <span className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
          {u.first_name} {u.name}
        </span>
        {compact && (
          <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>
            {u.email}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, suffix, tone }) {
  const styles =
    tone === 'success' ? { background: '#F0FDF4', borderColor: '#BBF7D0' } : undefined
  return (
    <div className="adm-card p-3 sm:p-4" style={styles}>
      <div className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--adm-text-faint)' }}>
        {label}
      </div>
      <div className="mt-1 text-xl sm:text-2xl font-semibold tabular-nums" style={{ color: 'var(--adm-text)' }}>
        {value}
        {suffix && <span className="text-sm" style={{ color: 'var(--adm-text-faint)' }}>{suffix}</span>}
      </div>
    </div>
  )
}
