/** Journal d'activité — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Activity, User } from 'lucide-react'

import { activityLog } from '@/api/admin'

const EVENT_META = {
  created: { cls: 'adm-badge-success', label: 'Création' },
  updated: { cls: 'adm-badge-warning', label: 'Modification' },
  deleted: { cls: 'adm-badge-danger',  label: 'Suppression' },
}

export default function ActivityLogPage() {
  const [filters, setFilters] = useState({ per_page: 50 })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'activity-log', filters],
    queryFn: () => activityLog.list(filters),
  })

  const items = data?.data ?? []

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2">
          <Activity size={20} style={{ color: 'var(--adm-text-muted)' }} />
          Journal d'activité
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Historique des actions sensibles — créations, modifications, suppressions.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <select
          className="adm-select w-auto text-sm h-9"
          value={filters.subject_type ?? ''}
          onChange={(e) => setFilters({ ...filters, subject_type: e.target.value || undefined })}
        >
          <option value="">Toutes ressources</option>
          <option value="User">Membres</option>
          <option value="Donation">Dons</option>
          <option value="Sermon">Sermons</option>
          <option value="Event">Événements</option>
          <option value="Post">Articles</option>
          <option value="DepartmentReport">Rapports département</option>
          <option value="CellReport">Rapports cellule</option>
        </select>
        <select
          className="adm-select w-auto text-sm h-9"
          value={filters.event ?? ''}
          onChange={(e) => setFilters({ ...filters, event: e.target.value || undefined })}
        >
          <option value="">Tous événements</option>
          <option value="created">Créations</option>
          <option value="updated">Modifications</option>
          <option value="deleted">Suppressions</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="adm-card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="adm-card p-12 text-center">
          <Activity size={32} className="mx-auto mb-3" style={{ color: 'var(--adm-text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Aucune entrée dans le journal pour ces filtres.
          </p>
        </div>
      ) : (
        <div className="adm-card overflow-hidden">
          <ul className="divide-y" style={{ borderColor: 'var(--adm-border)' }}>
            {items.map((entry) => {
              const meta = EVENT_META[entry.event] ?? { cls: 'adm-badge', label: entry.event }
              return (
                <li key={entry.id} className="px-4 sm:px-5 py-4 flex items-start gap-3 sm:gap-4">
                  <div
                    className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
                  >
                    <User size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
                        {entry.causer?.full_name || <span className="italic" style={{ color: 'var(--adm-text-muted)' }}>Système</span>}
                      </span>
                      <span className={`adm-badge ${meta.cls}`}>{meta.label}</span>
                      <span className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
                        {entry.subject?.type} #{entry.subject?.id}
                      </span>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: 'var(--adm-text)' }}>{entry.description}</p>
                    {entry.changes?.attributes && Object.keys(entry.changes.attributes).length > 0 && (
                      <details className="mt-2">
                        <summary
                          className="text-xs cursor-pointer transition hover:underline"
                          style={{ color: 'var(--adm-accent)' }}
                        >
                          Voir les changements ({Object.keys(entry.changes.attributes).length})
                        </summary>
                        <pre
                          className="mt-2 text-xs p-3 rounded overflow-x-auto max-h-40 font-mono"
                          style={{ background: 'var(--adm-card-hover)', color: 'var(--adm-text-muted)' }}
                        >
{JSON.stringify(entry.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                    <p className="mt-2 text-xs tabular-nums" style={{ color: 'var(--adm-text-faint)' }}>
                      {entry.created_at && format(new Date(entry.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
