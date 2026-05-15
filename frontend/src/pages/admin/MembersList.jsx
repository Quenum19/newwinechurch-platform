/**
 * Liste des membres — Refonte 2026 (admin-v2 native).
 *
 * Filtres : status, rôle, baptisé, corbeille. Recherche debounced.
 * Mobile : DataTable bascule auto en cards verticales (lecture optimale).
 * Export Excel inline.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, Trash2, Download, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import DataTable from '@/components/admin/DataTable.jsx'
import { members } from '@/api/admin'

const STATUS_LABELS = {
  active:   { label: 'Actif',     cls: 'adm-badge-success' },
  pending:  { label: 'En attente',cls: 'adm-badge-warning' },
  inactive: { label: 'Inactif',   cls: 'adm-badge' },
}

const ROLE_OPTIONS = [
  { value: '',           label: 'Tous rôles' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'pasteur',    label: 'Pasteur' },
  { value: 'admin',      label: 'Admin' },
  { value: 'rh',         label: 'RH' },
  { value: 'gouverneur', label: 'Gouverneur' },
  { value: 'leader',     label: 'Leader' },
  { value: 'membre',     label: 'Membre' },
]

export default function MembersList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ page: 1, per_page: 25 })

  // === Colonnes desktop ===
  const columns = [
    {
      key: 'full_name',
      label: 'Membre',
      render: (m) => <MemberCell member={m} />,
    },
    {
      key: 'phone',
      label: 'Téléphone',
      render: (m) => (
        <span className="text-sm tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {m.phone || '—'}
        </span>
      ),
    },
    {
      key: 'roles',
      label: 'Rôles',
      render: (m) => (
        <div className="flex flex-wrap gap-1">
          {(m.roles || []).map((r) => (
            <span key={r} className="adm-badge adm-badge-accent capitalize">{r}</span>
          ))}
          {(m.roles || []).length === 0 && (
            <span style={{ color: 'var(--adm-text-faint)' }}>—</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (m) => {
        const s = STATUS_LABELS[m.status] ?? STATUS_LABELS.inactive
        return <span className={`adm-badge ${s.cls}`}>{s.label}</span>
      },
    },
    {
      key: 'is_baptized',
      label: 'Baptisé',
      render: (m) => m.is_baptized
        ? <ShieldCheck size={14} style={{ color: 'var(--adm-success)' }} />
        : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>,
    },
    {
      key: 'created_at',
      label: 'Inscription',
      sortable: true,
      render: (m) => (
        <span className="text-xs tabular-nums" style={{ color: 'var(--adm-text-muted)' }}>
          {m.created_at && format(new Date(m.created_at), 'dd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header sobre + actions */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Membres</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Annuaire complet — {filters.search ? 'résultats filtrés' : 'tous les comptes'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={async () => {
              try {
                await members.export(filters)
                toast.success('Export téléchargé.')
              } catch { toast.error('Export impossible.') }
            }}
            className="adm-btn adm-btn-secondary flex-1 sm:flex-initial justify-center"
          >
            <Download size={14}/> <span className="hidden xs:inline">Excel</span>
          </button>
          <Link
            to="/admin/membres/nouveau"
            className="adm-btn adm-btn-primary flex-1 sm:flex-initial justify-center"
          >
            <Plus size={14} /> <span>Nouveau</span>
          </Link>
        </div>
      </header>

      <DataTable
        queryKey={['admin', 'members']}
        queryFn={members.list}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Nom, email, téléphone…"
        emptyMessage="Aucun membre trouvé."
        onRowClick={(m) => navigate(`/admin/membres/${m.id}`)}
        // Rendu mobile riche : avatar + nom + email + badges status/rôle
        mobileRow={(m) => <MemberMobileRow member={m} />}
        filtersSlot={
          <>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
            >
              <option value="">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="pending">En attente</option>
              <option value="inactive">Inactifs</option>
            </select>
            <select
              className="adm-select w-auto text-sm h-9"
              value={filters.role || ''}
              onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined, page: 1 })}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label
              className="flex items-center gap-2 text-xs cursor-pointer px-2 h-9"
              style={{ color: 'var(--adm-text-muted)' }}
            >
              <input
                type="checkbox"
                checked={!!filters.trashed}
                onChange={(e) => setFilters({ ...filters, trashed: e.target.checked ? 1 : undefined, page: 1 })}
                className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
              />
              <Trash2 size={12} /> Corbeille
            </label>
          </>
        }
      />
    </div>
  )
}

/** Cellule membre desktop : avatar + nom + email */
function MemberCell({ member: m }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {m.avatar_url ? (
        <img src={m.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
        >
          {(m.first_name?.[0] || m.name?.[0] || '?').toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
          {m.full_name || `${m.first_name ?? ''} ${m.name ?? ''}`.trim() || '—'}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>
          {m.email}
        </div>
      </div>
    </div>
  )
}

/** Card mobile : avatar + infos compactes + chevron */
function MemberMobileRow({ member: m }) {
  const s = STATUS_LABELS[m.status] ?? STATUS_LABELS.inactive
  return (
    <div className="flex items-center gap-3">
      {m.avatar_url ? (
        <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
          style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
        >
          {(m.first_name?.[0] || m.name?.[0] || '?').toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
            {m.full_name || `${m.first_name ?? ''} ${m.name ?? ''}`.trim()}
          </span>
          {m.is_baptized && <ShieldCheck size={12} style={{ color: 'var(--adm-success)' }} />}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>
          {m.email}
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <span className={`adm-badge ${s.cls}`}>{s.label}</span>
          {(m.roles || []).slice(0, 2).map((r) => (
            <span key={r} className="adm-badge adm-badge-accent capitalize">{r}</span>
          ))}
        </div>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
    </div>
  )
}
