/** Liste des départements — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Crown, ChevronRight, Users, AlertCircle, CheckCircle2, Building2 } from 'lucide-react'

import DataTable from '@/components/admin/DataTable.jsx'
import ResetFiltersButton from '@/components/admin/ResetFiltersButton.jsx'
import { departments } from '@/api/admin'

export default function DepartmentsList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ page: 1, per_page: 50 })

  // Stats globales (rafraîchies en arrière-plan toutes les 60s).
  const { data: stats } = useQuery({
    queryKey: ['admin', 'departments', 'stats'],
    queryFn: departments.stats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })

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

      {/* Bilan rapide — 4 cartes synthétiques cliquables qui filtrent la liste.
          Clic sur "À pourvoir" → applique filtre status=pending, etc.
          La carte active a une bordure plus marquée + fond légèrement teinté. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Building2}
          label="Départements"
          value={stats?.total ?? '—'}
          color="#71717A"
          hint={stats ? `dont ${stats.active} actifs` : null}
          // Active UNIQUEMENT quand AUCUN filtre n'est appliqué (status ET governor).
          // Sinon ce bouton apparaissait actif en même temps qu'une autre card.
          active={!filters.status && !filters.governor}
          onClick={() => setFilters({ ...filters, status: undefined, governor: undefined, page: 1 })}
        />
        <StatCard
          icon={CheckCircle2}
          label="Avec gouverneur"
          value={stats?.with_governor ?? '—'}
          color="#16A34A"
          hint={stats ? `${Math.round(((stats.with_governor || 0) / Math.max(stats.total, 1)) * 100)}% couverts` : null}
          active={filters.governor === 'with'}
          onClick={() => setFilters({ ...filters, governor: filters.governor === 'with' ? undefined : 'with', status: undefined, page: 1 })}
        />
        <StatCard
          icon={AlertCircle}
          label="À pourvoir"
          value={stats?.without_governor ?? '—'}
          color="#D97706"
          hint={stats?.without_governor > 0 ? 'Besoin d\'un gouverneur' : 'Tout est couvert ✓'}
          active={filters.governor === 'without'}
          onClick={() => setFilters({ ...filters, governor: filters.governor === 'without' ? undefined : 'without', status: undefined, page: 1 })}
        />
        <StatCard
          icon={Users}
          label="Membres totaux"
          value={stats?.total_members ?? '—'}
          color="#8B1A2F"
          hint="Cumul des équipes"
        />
      </div>

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
          <>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
            >
              <option value="">Tous</option>
              <option value="active">Actifs</option>
              <option value="pending">À pourvoir</option>
            </select>
            <ResetFiltersButton
              filters={filters}
              onReset={() => setFilters({ page: 1, per_page: 50 })}
            />
          </>
        }
      />
    </div>
  )
}

/**
 * Carte stat compacte — icône + valeur + label + hint optionnel.
 * Utilisée pour le bilan rapide en haut des listes admin.
 */
function StatCard({ icon: Icon, label, value, color, hint, active, onClick }) {
  const isClickable = typeof onClick === 'function'
  const Tag = isClickable ? 'button' : 'div'
  return (
    <Tag
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`adm-card p-3 sm:p-4 flex items-center gap-3 text-left w-full transition ${
        isClickable ? 'hover:scale-[1.02] cursor-pointer' : ''
      } ${active ? 'ring-2 ring-offset-1' : ''}`}
      style={{
        borderLeft: `4px solid ${color}`,
        background: active ? color + '08' : undefined,
        '--tw-ring-color': active ? color : undefined,
      }}
    >
      <div
        className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: color + '15', color }}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--adm-text-muted)' }}>
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-bold tabular-nums leading-tight" style={{ color: 'var(--adm-text)' }}>
          {value}
        </p>
        {hint && (
          <p className="text-[11px] truncate" style={{ color: 'var(--adm-text-faint)' }}>
            {hint}
          </p>
        )}
      </div>
    </Tag>
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
