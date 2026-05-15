/**
 * GovCellDetail — détail d'une cellule (du périmètre gouverneur).
 * Onglets : Membres / Présences / Rapports (lecture seule depuis le gouverneur).
 */
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Users, CalendarCheck, FileText, ArrowLeft } from 'lucide-react'
import { useGovernorCells } from '@/api/governor'
import { SkeletonCard } from '@/components/shared/Skeleton'
import { cn } from '@/utils/cn'

export default function GovCellDetail() {
  const { id } = useParams()
  const [tab, setTab] = useState('members')

  // Pour l'instant on récupère via la liste (le backend n'expose pas /cells/{id}
  // côté gouverneur — on a /cells qui retourne tout, on filtre). Ce sera enrichi
  // par un endpoint /governor/cells/{id} si besoin futur.
  const { data, isLoading } = useGovernorCells({ per_page: 100 })
  const cell = (data?.data ?? []).find((c) => String(c.id) === String(id))

  if (isLoading || !cell) {
    return <SkeletonCard />
  }

  return (
    <div className="space-y-5">
      <Link to="/gouverneur/cellules" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft size={14} /> Retour aux cellules
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-white">{cell.name}</h1>
        <p className="text-sm text-white/50 mt-1">{cell.zone ?? '—'} · {cell.meeting_day ?? '—'} {cell.meeting_time ?? ''}</p>
      </header>

      <div className="flex gap-1 border-b border-white/5">
        {[
          { key: 'members',    icon: Users,         label: 'Membres' },
          { key: 'attendance', icon: CalendarCheck, label: 'Présences' },
          { key: 'reports',    icon: FileText,      label: 'Rapports' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition',
              tab === t.key ? 'border-gold-500 text-gold-300' : 'border-transparent text-white/60 hover:text-white'
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* On affiche un placeholder simple — la version riche viendra avec un endpoint dédié */}
      <div className="rounded-xl bg-ink-900 border border-white/5 p-6">
        {tab === 'members' && (
          <div className="text-sm text-white/70 space-y-2">
            <p><strong>{cell.members_count ?? 0}</strong> membre(s) dans cette cellule.</p>
            <p className="text-xs text-white/50">
              Pour la liste détaillée et les analytics présences, utilise l'onglet Présences ou consulte le tableau de bord du leader.
            </p>
          </div>
        )}
        {tab === 'attendance' && (
          <div className="text-sm text-white/70">
            <p>Taux de présence sur les 4 dernières semaines :
              <strong className="ml-1 text-gold-300">
                {cell.attendance_rate_4w != null ? `${cell.attendance_rate_4w}%` : '—'}
              </strong>
            </p>
            <p className="text-xs text-white/50 mt-2">
              La vue calendrier détaillée est disponible depuis l'espace leader correspondant.
            </p>
          </div>
        )}
        {tab === 'reports' && (
          <div className="text-sm text-white/70">
            <p>Dernier rapport soumis : <strong className="text-white">{cell.last_report_date ?? 'Aucun'}</strong></p>
            <p className="text-xs text-white/50 mt-2">
              Les rapports de cellule sont consultables par le pasteur et le gouverneur via les notifications.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
