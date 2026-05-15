/** Liste des cellules d'évangélisation — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, MapPin, Home, Users, ChevronRight } from 'lucide-react'

import DataTable from '@/components/admin/DataTable.jsx'
import CellHealthIndicator from '@/components/shared/CellHealthIndicator'
import { cells } from '@/api/admin'

export default function CellsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ page: 1, per_page: 25 })

  // Adapte la réponse API.
  const queryFn = async (params) => {
    const r = await cells.list(params)
    return r?.data ?? r
  }

  const columns = [
    {
      key: 'name', label: 'Cellule',
      render: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
          >
            <Home size={14} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{c.name}</div>
            {c.zone && (
              <div className="text-xs flex items-center gap-1 truncate" style={{ color: 'var(--adm-text-muted)' }}>
                <MapPin size={10} /> {c.zone}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'leader', label: 'Leader',
      render: (c) => c.leader ? (
        <span className="text-sm" style={{ color: 'var(--adm-text)' }}>
          {`${c.leader.first_name ?? ''} ${c.leader.name ?? ''}`.trim()}
        </span>
      ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'meeting', label: 'Réunion',
      render: (c) => c.meeting_day ? (
        <span className="text-xs inline-flex items-center gap-1 capitalize" style={{ color: 'var(--adm-text-muted)' }}>
          <Calendar size={10} /> {c.meeting_day}
          {c.meeting_time && <span className="tabular-nums">· {c.meeting_time.slice(0, 5)}</span>}
        </span>
      ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'members_count', label: 'Membres',
      render: (c) => (
        <span className="inline-flex items-center gap-1 tabular-nums text-sm" style={{ color: 'var(--adm-text-muted)' }}>
          <Users size={12} /> {c.members_count ?? 0}
        </span>
      ),
    },
    {
      key: 'health_status', label: 'Santé',
      render: (c) => c.health_status ? (
        <span className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          <CellHealthIndicator status={c.health_status} size="sm" />
          {c.health_status === 'good' ? 'OK' : c.health_status === 'warning' ? 'À surveiller' : 'Critique'}
          {c.attendance_rate_4w != null && (
            <span className="tabular-nums" style={{ color: 'var(--adm-text-faint)' }}>
              · {c.attendance_rate_4w}%
            </span>
          )}
        </span>
      ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'status', label: 'Statut',
      render: (c) => (
        <span className={`adm-badge ${c.is_active && c.status === 'active' ? 'adm-badge-success' : 'adm-badge'}`}>
          {c.is_active && c.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Cellules</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Petits groupes d'évangélisation par quartier.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/cellules/nouveau')}
          className="adm-btn adm-btn-primary"
        >
          <Plus size={14} /> Nouvelle cellule
        </button>
      </header>

      <DataTable
        queryKey={['admin', 'cells']}
        queryFn={queryFn}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Nom, zone…"
        emptyMessage="Aucune cellule."
        onRowClick={(c) => navigate(`/admin/cellules/${c.id}`)}
        mobileRow={(c) => <CellMobileRow c={c} />}
      />
    </div>
  )
}

function CellMobileRow({ c }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
      >
        <Home size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{c.name}</span>
          <span className={`adm-badge ${c.is_active && c.status === 'active' ? 'adm-badge-success' : 'adm-badge'}`}>
            {c.is_active && c.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="text-xs flex items-center gap-3 mt-0.5 flex-wrap" style={{ color: 'var(--adm-text-muted)' }}>
          {c.zone && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {c.zone}</span>}
          {c.meeting_day && (
            <span className="inline-flex items-center gap-1 capitalize">
              <Calendar size={11} /> {c.meeting_day}
              {c.meeting_time && ` · ${c.meeting_time.slice(0, 5)}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Users size={11} /> {c.members_count ?? 0}
          </span>
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
