/**
 * Utilisateurs & rôles — Refonte 2026 admin-v2 native.
 *
 *  - Cartes synthèse par rôle (toggle filtre rapide)
 *  - Édition inline des rôles via modal (multi-select)
 *  - Mobile-first : modal bottom-sheet sur mobile, centered desktop
 *  - Rôles sensibles (superadmin/pasteur) verrouillés sauf si l'utilisateur courant est superadmin
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Shield, ChevronRight, X } from 'lucide-react'

import DataTable from '@/components/admin/DataTable.jsx'
import { members } from '@/api/admin'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/utils/cn'

/** Définition des rôles (gardée alignée avec RolesAndPermissionsSeeder). */
const ROLES = [
  { value: 'superadmin', label: 'Superadmin', sensitive: true,  badgeCls: 'adm-badge-danger' },
  { value: 'pasteur',    label: 'Pasteur',    sensitive: true,  badgeCls: 'adm-badge-accent' },
  { value: 'rh',         label: 'RH',         sensitive: false, badgeCls: 'adm-badge-info' },
  { value: 'admin',      label: 'Admin',      sensitive: false, badgeCls: 'adm-badge-warning' },
  { value: 'gouverneur', label: 'Gouverneur', sensitive: false, badgeCls: 'adm-badge-info' },
  { value: 'leader',     label: 'Leader',     sensitive: false, badgeCls: 'adm-badge-accent' },
  { value: 'membre',     label: 'Membre',     sensitive: false, badgeCls: 'adm-badge' },
]

export default function UsersAdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const isSuperadmin = useAuthStore((s) => s.user?.roles?.includes('superadmin'))

  const [filters, setFilters] = useState({ page: 1, per_page: 25 })
  const [editing, setEditing] = useState(null)

  const updateRoles = useMutation({
    mutationFn: ({ id, roles }) => members.assignRoles(id, roles),
    onSuccess: () => {
      toast.success('Rôles mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      setEditing(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur.'),
  })

  const columns = [
    {
      key: 'name', label: 'Utilisateur', sortable: true,
      render: (u) => <UserCell user={u} />,
    },
    {
      key: 'roles', label: 'Rôles',
      render: (u) => <RoleBadges roles={u.roles} />,
    },
    {
      key: 'phone', label: 'Téléphone',
      render: (u) => (
        <span className="text-xs tabular-nums" style={{ color: u.phone ? 'var(--adm-text-muted)' : 'var(--adm-text-faint)' }}>
          {u.phone || '—'}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      cellClassName: 'text-right',
      render: (u) => (
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(u) }}
          className="adm-btn adm-btn-secondary text-xs py-1 px-2"
        >
          <Shield size={12} /> Rôles
        </button>
      ),
    },
  ]

  if (!can('view members')) {
    return (
      <div className="adm-card p-8 text-center" style={{ color: 'var(--adm-text-muted)' }}>
        Tu n'as pas accès à cette section.
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Utilisateurs & rôles</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Permissions de l'équipe.{' '}
            {isSuperadmin && (
              <span style={{ color: 'var(--adm-accent)' }}>Tu es superadmin — accès total.</span>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/membres/nouveau')}
          className="adm-btn adm-btn-primary"
        >
          <Plus size={14} /> Nouvel utilisateur
        </button>
      </header>

      {/* Cartes synthèse par rôle */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setFilters({ ...filters, role: filters.role === r.value ? undefined : r.value, page: 1 })}
            className="adm-card p-3 text-left transition hover:shadow-sm"
            style={{
              borderColor: filters.role === r.value ? 'var(--adm-accent)' : 'var(--adm-border)',
              background: filters.role === r.value ? 'var(--adm-accent-soft)' : 'var(--adm-card)',
            }}
          >
            <span className={`adm-badge ${r.badgeCls}`}>{r.label}</span>
            <div className="text-xs mt-2" style={{ color: 'var(--adm-text-muted)' }}>
              {r.sensitive ? '🔒 Sensible' : 'Standard'}
            </div>
          </button>
        ))}
      </div>

      <DataTable
        queryKey={['admin', 'members', 'users-view']}
        queryFn={(p) => members.list(p)}
        columns={columns}
        filters={filters}
        onFiltersChange={setFilters}
        searchPlaceholder="Nom, email, téléphone…"
        emptyMessage="Aucun utilisateur."
        onRowClick={(u) => navigate(`/admin/membres/${u.id}`)}
        mobileRow={(u) => (
          <div className="flex items-center gap-3">
            <UserCell user={u} compact />
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(u) }}
              className="adm-btn adm-btn-secondary text-xs py-1 px-2 shrink-0"
            >
              <Shield size={12} />
            </button>
            <ChevronRight size={14} style={{ color: 'var(--adm-text-faint)' }} className="shrink-0" />
          </div>
        )}
      />

      {editing && (
        <RolesEditorModal
          user={editing}
          isSuperadmin={isSuperadmin}
          onClose={() => setEditing(null)}
          onSave={(roles) => updateRoles.mutate({ id: editing.id, roles })}
          saving={updateRoles.isPending}
        />
      )}
    </div>
  )
}

function UserCell({ user: u, compact = false }) {
  return (
    <div className={cn('flex items-center gap-3 min-w-0', compact && 'flex-1')}>
      {u.avatar_url || u.avatar ? (
        <img src={u.avatar_url || u.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
        >
          {(u.first_name?.[0] || u.name?.[0] || '?').toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
          {u.full_name || [u.first_name, u.name].filter(Boolean).join(' ')}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--adm-text-muted)' }}>
          {u.email}
        </div>
        {compact && (u.roles ?? []).length > 0 && (
          <div className="mt-1"><RoleBadges roles={u.roles} max={2} /></div>
        )}
      </div>
    </div>
  )
}

function RoleBadges({ roles = [], max }) {
  const list = max ? roles.slice(0, max) : roles
  const remaining = max && roles.length > max ? roles.length - max : 0
  if (list.length === 0) {
    return <span className="italic text-xs" style={{ color: 'var(--adm-text-faint)' }}>Aucun rôle</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((r) => {
        const meta = ROLES.find((x) => x.value === r)
        return <span key={r} className={`adm-badge ${meta?.badgeCls ?? 'adm-badge'}`}>{meta?.label || r}</span>
      })}
      {remaining > 0 && <span className="adm-badge">+{remaining}</span>}
    </div>
  )
}

function RolesEditorModal({ user, isSuperadmin, onClose, onSave, saving }) {
  const [selected, setSelected] = useState(new Set(user.roles ?? []))
  const toggle = (role) => {
    const next = new Set(selected)
    next.has(role) ? next.delete(role) : next.add(role)
    setSelected(next)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(9, 9, 11, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="adm-card w-full max-w-md p-5 sm:p-6 space-y-4 rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--adm-text)' }}>Modifier les rôles</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--adm-text-muted)' }}>
              {user.full_name || [user.first_name, user.name].filter(Boolean).join(' ')}
            </p>
            <p className="text-xs" style={{ color: 'var(--adm-text-faint)' }}>{user.email}</p>
          </div>
          <button onClick={onClose} className="adm-btn adm-btn-ghost p-1" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-1.5">
          {ROLES.map((r) => {
            const disabled = r.sensitive && !isSuperadmin
            const isSel = selected.has(r.value)
            return (
              <label
                key={r.value}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  borderColor: isSel ? 'var(--adm-accent)' : 'var(--adm-border)',
                  background: isSel ? 'var(--adm-accent-soft)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  disabled={disabled}
                  onChange={() => !disabled && toggle(r.value)}
                  className="h-4 w-4 rounded border-zinc-300 focus:ring-rose-500"
                  style={{ accentColor: 'var(--adm-accent)' }}
                />
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <span className={`adm-badge ${r.badgeCls}`}>{r.label}</span>
                  {r.sensitive && (
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--adm-danger)' }}>
                      Superadmin requis
                    </span>
                  )}
                </div>
              </label>
            )
          })}
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button onClick={onClose} className="adm-btn adm-btn-ghost">Annuler</button>
          <button
            onClick={() => onSave(Array.from(selected))}
            disabled={saving}
            className="adm-btn adm-btn-primary"
          >
            {saving ? '…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
