/** Fiche membre — Refonte 2026 admin-v2 native. */
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  AlertTriangle, Building2, Calendar, Crown, Loader2, Mail,
  RotateCcw, ShieldAlert, ShieldCheck, Trash2, Key, Power, Camera, Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import Modal from '@/components/ui/Modal.jsx'
import BackButton from '@/components/admin/BackButton.jsx'
import { useAuthStore } from '@/store/authStore'
import { members } from '@/api/admin'

const ALL_ROLES = [
  { value: 'superadmin', label: 'Superadmin', sensitive: true,  badgeCls: 'adm-badge-danger' },
  { value: 'pasteur',    label: 'Pasteur',    sensitive: true,  badgeCls: 'adm-badge-accent' },
  { value: 'rh',         label: 'RH',                            badgeCls: 'adm-badge-info' },
  { value: 'admin',      label: 'Admin',                         badgeCls: 'adm-badge-warning' },
  { value: 'admin-site', label: 'Admin site',                    badgeCls: 'adm-badge-warning' },
  { value: 'tresorier',  label: 'Trésorier',                     badgeCls: 'adm-badge-info' },
  { value: 'accueil',    label: 'Service Accueil',               badgeCls: 'adm-badge-accent' },
  { value: 'controleur', label: 'Contrôleur (scan)',             badgeCls: 'adm-badge' },
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
  // Modal de confirmation suppression — null = fermé
  const [deleteOpen, setDeleteOpen] = useState(false)

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
    onSuccess: (data) => {
      toast.success(data?.message || 'Membre archivé.')
      // Invalide aussi les caches des entités impactées par le cascade
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'cells'] })
      setDeleteOpen(false)
      navigate('/admin/membres')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erreur de suppression.')
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

  // Gestion accès complète (super admin) : envoi identifiants, toggle status, avatar.
  // Affiche le mp en clair si l'email a échoué (admin peut transmettre manuellement).
  const [lastPassword, setLastPassword] = useState(null)
  const resendCredentials = useMutation({
    mutationFn: (opts) => members.resendCredentials(id, opts),
    onSuccess: (res) => {
      // Toast long si on doit afficher un mp à copier
      toast.success(res?.message || 'Identifiants mis à jour.', { duration: res?.password ? 12000 : 4000 })
      setLastPassword(res?.password || null)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Envoi impossible.'),
  })
  const toggleStatus = useMutation({
    mutationFn: () => members.toggleStatus(id),
    onSuccess: (res) => {
      toast.success(res?.message || 'Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', id] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur.'),
  })
  const uploadAvatar = useMutation({
    mutationFn: (file) => members.uploadAvatar(id, file),
    onSuccess: () => {
      toast.success('Photo de profil mise à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
    },
    onError: () => toast.error('Upload impossible.'),
  })

  // Suppression DÉFINITIVE — disponible uniquement quand le membre est déjà
  // dans la corbeille. Irréversible : on demande une confirmation forte.
  const [forceOpen, setForceOpen] = useState(false)
  const forceDestroy = useMutation({
    mutationFn: () => members.forceDelete(id),
    onSuccess: (data) => {
      toast.success(data?.message || 'Membre supprimé définitivement.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      setForceOpen(false)
      navigate('/admin/membres')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Suppression impossible.'),
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
      <BackButton to="/admin/membres" label="Retour à la liste" />

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
            <>
              <button
                onClick={() => restore.mutate()}
                disabled={restore.isPending}
                className="adm-btn adm-btn-primary"
              >
                <RotateCcw size={14} /> Restaurer
              </button>
              {can('delete members') && (
                <button
                  onClick={() => setForceOpen(true)}
                  className="adm-btn adm-btn-danger"
                  title="Supprimer définitivement — irréversible"
                >
                  <Trash2 size={14} /> Supprimer définitivement
                </button>
              )}
            </>
          ) : can('delete members') ? (
            <button
              onClick={() => setDeleteOpen(true)}
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

      {/* ============ ACCÈS & SÉCURITÉ (super admin) ============ */}
      {can('edit members') && !isTrashed && (
        <AccessSecurityCard
          member={member}
          lastPassword={lastPassword}
          onClearLastPassword={() => setLastPassword(null)}
          onResendCredentials={(opts) => resendCredentials.mutate(opts)}
          resendPending={resendCredentials.isPending}
          onToggleStatus={() => toggleStatus.mutate()}
          togglePending={toggleStatus.isPending}
          onAvatarChange={(file) => uploadAvatar.mutate(file)}
          avatarPending={uploadAvatar.isPending}
        />
      )}

      {/* Modal confirmation suppression avec aperçu d'impact */}
      <DeleteMemberModal
        open={deleteOpen}
        memberId={id}
        memberName={[member.first_name, member.name].filter(Boolean).join(' ') || member.email}
        onClose={() => { if (! destroy.isPending) setDeleteOpen(false) }}
        onConfirm={() => destroy.mutate()}
        pending={destroy.isPending}
      />

      {/* Modal suppression DÉFINITIVE — irréversible */}
      <Modal
        open={forceOpen}
        onClose={() => { if (!forceDestroy.isPending) setForceOpen(false) }}
        title="Supprimer définitivement ?"
        description={[member.first_name, member.name].filter(Boolean).join(' ') || member.email}
        size="sm"
      >
        <div className="flex items-start gap-3 p-3 rounded mb-3" style={{ background: '#FEE2E2', color: '#991B1B' }}>
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Action irréversible</p>
            <p>
              Le membre sera <strong>définitivement effacé</strong> de la base de données :
              ses rôles, tokens, affectations et historique seront perdus. Préférable d'utiliser
              « Restaurer » si tu hésites.
            </p>
          </div>
        </div>
        <Modal.Footer>
          <button onClick={() => setForceOpen(false)} className="adm-btn">Annuler</button>
          <button
            onClick={() => forceDestroy.mutate()}
            disabled={forceDestroy.isPending}
            className="adm-btn adm-btn-danger"
          >
            {forceDestroy.isPending ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

/**
 * Modal de suppression d'un membre — fetch l'impact avant de confirmer.
 * Liste les mandats gouverneur clôturés + cellules sans leader → l'admin
 * sait précisément ce qui change avant de cliquer.
 */
function DeleteMemberModal({ open, memberId, memberName, onClose, onConfirm, pending }) {
  const { data: impact, isLoading } = useQuery({
    queryKey: ['admin', 'members', memberId, 'deletion-impact'],
    queryFn: () => members.deletionImpact(memberId),
    enabled: open,
    staleTime: 10 * 1000,
  })

  const govDepts = impact?.governed_departments ?? []
  const ledCells = impact?.led_cells ?? []
  const hasImpact = govDepts.length > 0 || ledCells.length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Archiver ce membre ?"
      description="Action réversible — tu pourras restaurer plus tard."
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-6" style={{ color: '#6B5F4E' }}>
          <Loader2 size={20} className="animate-spin mr-2" /> Analyse de l'impact…
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: hasImpact ? '#D97706' : '#B0273A' }} />
            <div className="space-y-2">
              <p style={{ color: '#2D261D' }}>
                <strong>{memberName}</strong> sera <strong>archivé(e)</strong> et perdra l'accès à la plateforme.
                Tu peux le/la restaurer ensuite via la liste des membres (filtre "Archivés").
              </p>
              {! hasImpact && (
                <p className="text-sm italic" style={{ color: '#6B5F4E' }}>
                  Aucun rôle critique ni mandat actif — suppression simple.
                </p>
              )}
            </div>
          </div>

          {govDepts.length > 0 && (
            <div className="rounded-lg border p-3 mb-3" style={{ background: '#FAF6EE', borderColor: '#E8DFC9' }}>
              <p className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: '#B0273A' }}>
                <Crown size={14} /> Mandats gouverneur à clôturer ({govDepts.length})
              </p>
              <ul className="space-y-1 text-sm" style={{ color: '#2D261D' }}>
                {govDepts.map((d) => (
                  <li key={d.id}>• {d.name}</li>
                ))}
              </ul>
              <p className="text-xs mt-2 italic" style={{ color: '#6B5F4E' }}>
                Ces département(s) passeront en statut « à pourvoir » et nécessiteront un nouveau gouverneur.
              </p>
            </div>
          )}

          {ledCells.length > 0 && (
            <div className="rounded-lg border p-3" style={{ background: '#FAF6EE', borderColor: '#E8DFC9' }}>
              <p className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: '#B0273A' }}>
                <Building2 size={14} /> Cellules sans leader après archivage ({ledCells.length})
              </p>
              <ul className="space-y-1 text-sm" style={{ color: '#2D261D' }}>
                {ledCells.map((c) => (
                  <li key={c.id}>• {c.name}</li>
                ))}
              </ul>
              <p className="text-xs mt-2 italic" style={{ color: '#6B5F4E' }}>
                Ces cellule(s) seront en attente d'un nouveau leader.
              </p>
            </div>
          )}
        </>
      )}

      <Modal.Footer>
        <button type="button" className="nwc-btn-ghost" onClick={onClose} disabled={pending}>
          Annuler
        </button>
        <button
          type="button"
          className="nwc-btn-primary"
          onClick={onConfirm}
          disabled={pending || isLoading}
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {pending ? 'Archivage…' : 'Archiver'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

/**
 * Carte Accès & sécurité — gestion compte super-admin.
 *
 * 3 actions principales :
 *  - Renvoyer identifiants : régénère un mp aléatoire + mail au membre
 *  - Activer/désactiver compte : coupe les sessions à la désactivation
 *  - Changer photo de profil : upload avatar WebP
 *
 * Affiché uniquement aux admins qui ont la perm `edit members`.
 */
function AccessSecurityCard({
  member, lastPassword, onClearLastPassword,
  onResendCredentials, resendPending,
  onToggleStatus, togglePending, onAvatarChange, avatarPending,
}) {
  const isActive = member.status === 'active'
  const [customPwd, setCustomPwd] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [showPwd, setShowPwd] = useState(false)

  const submitCredentials = () => {
    const payload = {
      send_email: sendEmail,
    }
    if (customPwd.trim().length > 0) {
      if (customPwd.trim().length < 6) {
        return toast.error('Mot de passe : 6 caractères minimum.')
      }
      payload.password = customPwd.trim()
    }
    const action = customPwd ? 'Définir ce mot de passe' : 'Régénérer un nouveau mot de passe'
    const mailPart = sendEmail && member.email
      ? `\n→ Envoi de l'email à ${member.email}`
      : `\n→ Pas d'email — tu transmettras manuellement`
    if (confirm(`${action} ?\nL'ancien ne fonctionnera plus.${mailPart}`)) {
      onResendCredentials(payload)
      setCustomPwd('')
    }
  }

  return (
    <section className="adm-card p-4 sm:p-5">
      <h2 className="mb-1">Accès & sécurité</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--adm-text-muted)' }}>
        Gestion du compte de connexion : photo de profil, identifiants, activation.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* === Avatar uploader === */}
        <div className="flex flex-col items-center text-center gap-3 p-4 rounded border" style={{ borderColor: 'var(--adm-border)' }}>
          <div className="relative">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover border-2"
                   style={{ borderColor: 'var(--adm-border)' }} />
            ) : (
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-semibold border-2"
                style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)', borderColor: 'var(--adm-border)' }}
              >
                {(member.first_name?.[0] || member.name?.[0] || '?').toUpperCase()}
              </div>
            )}
            {avatarPending && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <label className="adm-btn adm-btn-secondary text-xs cursor-pointer">
            <Camera size={13} /> {member.avatar_url ? 'Changer la photo' : 'Ajouter une photo'}
            <input
              type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarChange(f); e.target.value = '' }}
            />
          </label>
          <p className="text-[10px]" style={{ color: 'var(--adm-text-faint)' }}>
            JPG/PNG/WebP · max 5 Mo · auto-resize 600×600
          </p>
        </div>

        {/* === Identifiants + changement mp === */}
        <div className="flex flex-col gap-3 p-4 rounded border" style={{ borderColor: 'var(--adm-border)' }}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-medium flex items-center gap-1" style={{ color: 'var(--adm-text-faint)' }}>
              <Key size={11} /> Identifiants
            </p>
            <p className="mt-1 text-sm truncate" style={{ color: 'var(--adm-text)' }}>{member.email || '—'}</p>
          </div>

          {/* Input mp custom (optionnel) */}
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={customPwd}
              onChange={(e) => setCustomPwd(e.target.value)}
              placeholder="Mot de passe custom (vide = auto)"
              className="adm-input text-xs pr-9"
              autoComplete="new-password"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded hover:bg-zinc-100"
              style={{ color: 'var(--adm-text-muted)' }}
              tabIndex={-1}
            >
              {showPwd ? 'Cacher' : 'Voir'}
            </button>
          </div>

          {/* Toggle envoi email */}
          {member.email && (
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--adm-text)' }}>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
                style={{ accentColor: 'var(--adm-accent)' }}
              />
              Envoyer le mp par email
            </label>
          )}

          <button
            onClick={submitCredentials}
            disabled={resendPending}
            className="adm-btn adm-btn-secondary text-xs"
          >
            {resendPending
              ? <><Loader2 size={13} className="animate-spin" /> …</>
              : (customPwd
                  ? <><Key size={13} /> Définir ce mot de passe</>
                  : <><Send size={13} /> Régénérer & {sendEmail && member.email ? 'envoyer' : 'afficher'}</>)}
          </button>

          {/* Affichage mp en clair si l'email a échoué ou si admin a coché "ne pas envoyer" */}
          {lastPassword && (
            <div className="p-2 rounded text-xs" style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B' }}>
              <p className="font-semibold text-amber-900 mb-1">À transmettre manuellement :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-white px-2 py-1 rounded border break-all">
                  {lastPassword}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(lastPassword).then(() => toast.success('Copié.'))
                  }}
                  className="px-2 py-1 rounded text-xs hover:bg-amber-100"
                  title="Copier"
                >
                  📋
                </button>
                <button
                  onClick={onClearLastPassword}
                  className="px-2 py-1 rounded text-xs hover:bg-amber-100"
                  title="Masquer"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <p className="text-[10px]" style={{ color: 'var(--adm-text-faint)' }}>
            Sessions actives coupées à chaque changement. Si l'email échoue, le mp s'affiche ci-dessus.
          </p>
        </div>

        {/* === Activer/désactiver compte === */}
        <div className="flex flex-col gap-3 p-4 rounded border"
             style={{ borderColor: isActive ? '#BBF7D0' : '#FECACA', background: isActive ? '#F0FDF4' : '#FEF2F2' }}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-medium flex items-center gap-1" style={{ color: 'var(--adm-text-faint)' }}>
              <Power size={11} /> Statut
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: isActive ? '#15803D' : '#B91C1C' }}>
              {isActive ? 'Compte actif' : 'Compte désactivé'}
            </p>
          </div>
          <button
            onClick={() => {
              const msg = isActive
                ? 'Désactiver ce compte ? Les sessions actives seront coupées immédiatement.'
                : 'Réactiver ce compte ?'
              if (confirm(msg)) onToggleStatus()
            }}
            disabled={togglePending}
            className="adm-btn"
            style={{ color: isActive ? '#B91C1C' : '#15803D', borderColor: isActive ? '#FECACA' : '#BBF7D0' }}
          >
            {togglePending
              ? <><Loader2 size={13} className="animate-spin" /> …</>
              : (isActive ? <><Power size={13} /> Désactiver</> : <><Power size={13} /> Activer</>)}
          </button>
          <p className="text-[10px]" style={{ color: 'var(--adm-text-faint)' }}>
            {isActive
              ? 'Désactiver coupe immédiatement la connexion.'
              : 'Réactiver permet à nouveau la connexion.'}
          </p>
        </div>
      </div>
    </section>
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
