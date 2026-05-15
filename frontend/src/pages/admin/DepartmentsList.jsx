/** Liste des départements — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Crown, ChevronRight, Users } from 'lucide-react'

import DataTable from '@/components/admin/DataTable.jsx'
import { departments } from '@/api/admin'

export default function DepartmentsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ page: 1, per_page: 50 })

  const columns = [
    {
      key: 'name', label: 'Département',
      render: (d) => (
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider shrink-0"
            style={{ backgroundColor: (d.color_theme || d.color || '#71717A') + '22', color: d.color_theme || d.color || '#71717A' }}
          >
            {d.name?.[0]}
          </span>
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
            {d.name}
          </span>
        </div>
      ),
    },
    {
      key: 'governor', label: 'Gouverneur',
      render: (d) => {
        const g = d.governor || d.captain
        return g ? (
          <div className="flex items-center gap-2 min-w-0">
            <Crown size={12} style={{ color: 'var(--adm-accent)' }} className="shrink-0" />
            <span className="text-sm truncate" style={{ color: 'var(--adm-text)' }}>
              {g.full_name || g.name}
            </span>
          </div>
        ) : (
          <span className="italic text-xs" style={{ color: 'var(--adm-text-faint)' }}>À pourvoir</span>
        )
      },
    },
    {
      key: 'members_count', label: 'Membres',
      render: (d) => (
        <span className="inline-flex items-center gap-1 text-sm tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          <Users size={12} />
          {d.member_count_cache ?? d.members_count ?? 0}
        </span>
      ),
    },
    {
      key: 'status', label: 'Statut',
      render: (d) => (
        <span className={`adm-badge ${d.status === 'active' ? 'adm-badge-success' : 'adm-badge-warning'}`}>
          {d.status === 'active' ? 'Actif' : 'À pourvoir'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Départements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Les ministères et équipes de service de l'église.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/departements/nouveau')}
          className="adm-btn adm-btn-primary"
        >
          <Plus size={14} /> Nouveau département
        </button>
      </header>

      <DataTable
        queryKey={['admin', 'departments']}
        queryFn={departments.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Nom du département…"
        emptyMessage="Aucun département."
        onRowClick={(d) => navigate(`/admin/departements/${d.id}`)}
        mobileRow={(d) => <DeptMobileRow d={d} />}
        filtersSlot={
          <select
            className="adm-select w-auto text-sm h-9"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
          >
            <option value="">Tous</option>
            <option value="active">Actifs</option>
            <option value="pending">À pourvoir</option>
          </select>
        }
      />
    </div>
  )
}

function DeptMobileRow({ d }) {
  const g = d.governor || d.captain
  const color = d.color_theme || d.color || '#71717A'
  return (
    <div className="flex items-center gap-3">
      <span
        className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
        style={{ backgroundColor: color + '22', color }}
      >
        {d.name?.[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>{d.name}</span>
          <span className={`adm-badge ${d.status === 'active' ? 'adm-badge-success' : 'adm-badge-warning'}`}>
            {d.status === 'active' ? 'Actif' : 'À pourvoir'}
          </span>
        </div>
        <div className="text-xs flex items-center gap-3 mt-0.5" style={{ color: 'var(--adm-text-muted)' }}>
          {g
            ? <span className="inline-flex items-center gap-1"><Crown size={11} /> {g.full_name || g.name}</span>
            : <span className="italic">Aucun gouverneur</span>}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Users size={11} /> {d.member_count_cache ?? d.members_count ?? 0}
          </span>
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
