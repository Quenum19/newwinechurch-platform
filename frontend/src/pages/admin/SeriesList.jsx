/**
 * Phase 5 — Liste admin des séries d'événements.
 *
 *  /admin/series
 */
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Calendar, Layers, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { events } from '@/api/admin'

export default function SeriesList() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'series'],
    queryFn: () => events.seriesList(),
  })

  const items = data?.data ?? []

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Séries d'événements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Regroupe des occurrences récurrentes (cycle de formation, conférence, soirée mensuelle…).
          </p>
        </div>
        <button onClick={() => navigate('/admin/series/nouveau')}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider font-mono bg-public-flame text-white hover:bg-public-ink transition">
          <Plus size={14}/> Nouvelle série
        </button>
      </header>

      <div className="adm-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--adm-text-muted)' }}>Chargement…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--adm-text-muted)' }}>
            <Layers size={32} className="mx-auto mb-2 opacity-30"/>
            Aucune série. Crée-en une pour grouper des occurrences récurrentes.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider font-mono"
                   style={{ background: '#FAFAFA', color: 'var(--adm-text-muted)' }}>
              <tr>
                <th className="text-left px-4 py-3">Titre</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Récurrence</th>
                <th className="text-left px-4 py-3">Occurrences</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Lieu</th>
                <th className="text-left px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}
                    onClick={() => navigate(`/admin/series/${s.id}`)}
                    className="border-t cursor-pointer hover:bg-public-bone/40 transition"
                    style={{ borderColor: 'var(--adm-border)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.title}</p>
                    {s.description && (
                      <p className="text-xs mt-0.5 truncate max-w-md" style={{ color: 'var(--adm-text-muted)' }}>
                        {s.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs uppercase font-mono tracking-wider">
                    {s.recurrence_type === 'weekly' ? 'Hebdomadaire'
                     : s.recurrence_type === 'monthly' ? 'Mensuelle' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-public-flame/10 text-public-flame">
                      <Calendar size={10}/> {s.events_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: 'var(--adm-text-muted)' }}>
                    {s.default_location ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`adm-badge ${s.is_published ? 'adm-badge-success' : 'adm-badge'}`}>
                      {s.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
