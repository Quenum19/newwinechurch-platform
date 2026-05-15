/** Fiche membre — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ShieldCheck, Trash2, RotateCcw, ShieldAlert, Loader2,
  Mail, Phone, MapPin, Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useAuthStore } from '@/store/authStore'
import { members } from '@/api/admin'

const ALL_ROLES = [
  { value: 'superadmin', label: 'Superadmin', sensitive: true,  badgeCls: 'adm-badge-danger' },
  { value: 'pasteur',    label: 'Pasteur',    sensitive: true,  badgeCls: 'adm-badge-accent' },
  { value: 'rh',         label: 'RH',                            badgeCls: 'adm-badge-info' },
  { value: 'admin',      label: 'Admin',                         badgeCls: 'adm-badge-warning' },
  { value: 'gouverneur', label: 'Gouverneur',                    badgeCls: 'adm-badge-info' },
  { value: 'leader',     label: 'Leader',                        badgeCls: 'adm-badge-accent' },
  { value: 'membre',     label: 'Membre',                        badgeCls: 'adm-badge' },
]

export default function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const myRoles = useAuthStore((s) => s.roles)

  const { data: member, isLoading } = useQuery({
    queryKey: ['admin', 'members', id],
    queryFn: () => members.get(id),
  })

  const update = useMutation({
    mutationFn: (payload) => members.update(id, payload),
    onSuccess: () => {
      toast.success('Profil mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
    },
    onError: () => toast.error('Erreur de sauvegarde.'),
  })

  const assignRoles = useMutation({
    mutationFn: (roles) => members.assignRoles(id, roles),
    onSuccess: () => {
      toast.success('Rôles mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
    },
    onError: (err) => {
      const msg = err?.response?.data?.errors?.roles?.[0] || 'Erreur.'
      toast.error(msg)
    },
  })

  const destroy = useMutation({
    mutationFn: () => members.delete(id),
    onSuccess: () => {
      toast.success('Membre archivé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      navigate('/admin/membres')
    },
  })

  const restore = useMutation({
    mutationFn: () => members.restore(id),
    onSuccess: () => {
      toast.success('Membre restauré.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', id] })
    },
  })

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    values: member ? {
      first_name: member.first_name ?? '',
      name: member.name ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      gender: member.gender ?? '',
      birth_date: member.birth_date ?? '',
      city: member.city ?? '',
      address: member.address ?? '',
      bio: member.bio ?? '',
      status: member.status ?? 'active',
      is_baptized: member.is_baptized ?? false,
      joined_at: member.joined_at ?? '',
    } : undefined,
  })

  if (isLoading || !member) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#F4F4F5' }} />
        <div className="adm-card h-96 animate-pulse" />
      </div>
    )
  }

  const isTrashed = !!member.deleted_at
  const canAssign = can('assign roles')
  const isMeSensitive = myRoles?.includes('superadmin') || myRoles?.includes('pasteur')

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      <Link
        to="/admin/membres"
        className="inline-flex items-center gap-1 text-sm transition hover:underline"
        style={{ color: 'var(--adm-text-muted)' }}
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      {/* Header membre */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover shrink-0"
              style={{ border: '2px solid var(--adm-border)' }}
            />
          ) : (
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-semibold shrink-0"
              style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
            >
              {(member.first_name?.[0] || '?').toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate">{member.full_name}</h1>
            <p className="text-sm truncate" style={{ color: 'var(--adm-text-muted)' }}>{member.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {member.is_baptized && (
                <span className="adm-badge adm-badge-success">
                  <ShieldCheck size={10} /> Baptisé
                </span>
              )}
              {isTrashed && (
                <span className="adm-badge adm-badge-danger">
                  <Trash2 size={10} /> Archivé
                </span>
              )}
              {(member.roles || []).map((r) => {
                const meta = ALL_ROLES.find((x) => x.value === r)
                return <span key={r} className={`adm-badge ${meta?.badgeCls ?? 'adm-badge'}`}>{meta?.label || r}</span>
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isTrashed ? (
            <button
              onClick={() => restore.mutate()}
              disabled={restore.isPending}
              className="adm-btn adm-btn-primary"
            >
              <RotateCcw size={14} /> Restaurer
            </button>
          ) : can('delete members') ? (
            <button
              onClick={() => { if (confirm('Archiver ce membre ? (action réversible)')) destroy.mutate() }}
              className="adm-btn adm-btn-secondary"
              style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
            >
              <Trash2 size={14} /> Archiver
            </button>
          ) : null}
        </div>
      </header>

      {/* Infos en lecture */}
      <section className="adm-card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Info icon={Calendar} label="Inscrit le"
              value={member.created_at && format(new Date(member.created_at), 'd MMMM yyyy', { locale: fr })} />
        <Info icon={Mail} label="Email vérifié"
              value={member.email_verified_at ? '✓ Oui' : 'Non'} />
        <Info label="Total dons confirmés"
              value={member.donations_total
                ? Number(member.donations_total).toLocaleString('fr-FR') + ' FCFA'
                : '0 FCFA'} />
      </section>

      {/* Édition */}
      <form
        onSubmit={handleSubmit((d) => update.mutate(d))}
        className="adm-card p-4 sm:p-6 space-y-4"
      >
        <h2>Informations</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Prénom"><input {...register('first_name')} className="adm-input" /></Field>
          <Field label="Nom"><input {...register('name')} className="adm-input" /></Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Email"><input type="email" {...register('email')} className="adm-input" /></Field>
          <Field label="Téléphone"><input type="tel" {...register('phone')} className="adm-input" /></Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Statut">
            <select {...register('status')} className="adm-select">
              <option value="active">Actif</option>
              <option value="pending">En attente</option>
              <option value="inactive">Inactif</option>
            </select>
          </Field>
          <Field label="Genre">
            <select {...register('gender')} className="adm-select">
              <option value="">—</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </Field>
          <Field label="Date de naissance">
            <input type="date" {...register('birth_date')} className="adm-input" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Ville"><input {...register('city')} className="adm-input" /></Field>
          <Field label="Date d'arrivée NWC">
            <input type="date" {...register('joined_at')} className="adm-input" />
          </Field>
        </div>
        <Field label="Adresse"><input {...register('address')} className="adm-input" /></Field>
        <Field label="Biographie">
          <textarea rows={3} {...register('bio')} className="adm-textarea" />
        </Field>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--adm-text)' }}>
          <input
            type="checkbox"
            {...register('is_baptized')}
            className="h-4 w-4 rounded border-zinc-300"
            style={{ accentColor: 'var(--adm-accent)' }}
          />
          Membre baptisé
        </label>

        <div className="pt-3 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button
            type="submit"
            disabled={!isDirty || update.isPending}
            className="adm-btn adm-btn-primary"
          >
            {update.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Rôles */}
      {canAssign && (
        <RolesPanel
          memberRoles={member.roles || []}
          isMeSensitive={isMeSensitive}
          onSubmit={(roles) => assignRoles.mutate(roles)}
          loading={assignRoles.isPending}
        />
      )}

      {/* Affectations */}
      <DepartmentsAndCells member={member} />
    </div>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <p
        className="text-[11px] uppercase tracking-wider font-medium flex items-center gap-1"
        style={{ color: 'var(--adm-text-faint)' }}
      >
        {Icon && <Icon size={11} />} {label}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--adm-text)' }}>{value || '—'}</p>
    </div>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>
        {label}
        {required && <span className="ml-1" style={{ color: 'var(--adm-danger)' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--adm-danger)' }}>{error}</p>}
    </div>
  )
}

function RolesPanel({ memberRoles, isMeSensitive, onSubmit, loading }) {
  const initial = new Set(memberRoles)
  return (
    <section className="adm-card p-4 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <ShieldAlert size={16} style={{ color: 'var(--adm-text-muted)' }} className="mt-0.5" />
        <div>
          <h2>Rôles & permissions</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            {isMeSensitive
              ? 'Tu peux attribuer tous les rôles, y compris superadmin et pasteur.'
              : 'Tu ne peux pas attribuer les rôles sensibles (superadmin, pasteur).'}
          </p>
        </div>
      </div>
      <form
        className="space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const checked = Array.from(fd.getAll('roles'))
          onSubmit(checked)
        }}
      >
        {ALL_ROLES.map((r) => {
          const disabled = r.sensitive && !isMeSensitive
          return (
            <label
              key={r.value}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition"
              style={{
                borderColor: 'var(--adm-border)',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <input
                type="checkbox"
                name="roles"
                value={r.value}
                defaultChecked={initial.has(r.value)}
                disabled={disabled}
                className="h-4 w-4 rounded border-zinc-300 disabled:opacity-40"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              <span className={`adm-badge ${r.badgeCls}`}>{r.label}</span>
              {r.sensitive && (
                <span className="text-[10px] uppercase tracking-widest ml-auto" style={{ color: 'var(--adm-danger)' }}>
                  ⚠ sensible
                </span>
              )}
            </label>
          )
        })}
        <div className="pt-3">
          <button type="submit" disabled={loading} className="adm-btn adm-btn-primary">
            {loading ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Mettre à jour les rôles'}
          </button>
        </div>
      </form>
    </section>
  )
}

function DepartmentsAndCells({ member }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <section className="adm-card p-4 sm:p-5">
        <h2 className="mb-3">Départements</h2>
        {(member.departments || []).length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--adm-text-faint)' }}>Aucun département.</p>
        ) : (
          <ul className="space-y-2">
            {member.departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <Link
                  to={`/admin/departements/${d.id}`}
                  className="text-sm hover:underline truncate"
                  style={{ color: 'var(--adm-text)' }}
                >
                  {d.name}
                </Link>
                {(d.role === 'captain' || d.role === 'governor') && (
                  <span className="adm-badge adm-badge-accent shrink-0">Gouverneur</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="adm-card p-4 sm:p-5">
        <h2 className="mb-3">Cellules</h2>
        {(member.cells || []).length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--adm-text-faint)' }}>Aucune cellule.</p>
        ) : (
          <ul className="space-y-2">
            {member.cells.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <Link
                  to={`/admin/cellules/${c.id}`}
                  className="text-sm hover:underline truncate"
                  style={{ color: 'var(--adm-text)' }}
                >
                  {c.name}
                </Link>
                {c.role === 'leader' && (
                  <span className="adm-badge adm-badge-accent shrink-0">Leader</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
