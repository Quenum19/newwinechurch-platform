/**
 * DepartmentMemberManager — gestion des membres d'un département.
 *
 * Permet de :
 *  1. Désigner ou retirer le gouverneur (capitaine en BDD)
 *  2. Ajouter un membre régulier au département
 *  3. Lister les membres + retirer
 *
 * Recherche live (debounce 300ms) sur l'API admin/members.
 *
 * Props :
 *  - dept     : le département complet (avec captain + members)
 *  - members  : array des membres actuels du département
 *  - onChange : callback à appeler après chaque mutation pour invalider la query parent
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Crown, Loader2, Search, Trash2, UserPlus, X } from 'lucide-react'

import Modal from '@/components/ui/Modal.jsx'
import Spinner from '@/components/ui/Spinner.jsx'
import { departments, members as membersApi } from '@/api/admin'
import { cn } from '@/utils/cn'

export default function DepartmentMemberManager({ dept, members = [], onChange }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  /**
   * Modal de confirmation centralisé pour toutes les actions destructives :
   *  - { kind: 'replace-governor', user }   → remplacer le gouverneur courant par `user`
   *  - { kind: 'remove-governor' }          → retirer le gouverneur sans remplaçant
   *  - { kind: 'remove-member', member }    → retirer un membre régulier
   * null = aucune confirmation ouverte.
   */
  const [confirmAction, setConfirmAction] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['admin', 'members', 'search', debouncedSearch],
    queryFn: () => membersApi.list({ search: debouncedSearch, per_page: 8 }),
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30 * 1000,
  })

  // IDs déjà dans le département (pour griser dans la recherche).
  const existingIds = new Set([
    ...(dept?.captain?.id ? [dept.captain.id] : []),
    ...members.map((m) => m.id),
  ])

  // Membres "réguliers" = tous les pivots SAUF le gouverneur (qui a sa propre carte).
  // Évite l'effet doublon « gouverneur affiché 2 fois ».
  const regularMembers = dept?.captain?.id
    ? members.filter((m) => m.id !== dept.captain.id)
    : members

  const assignGovernor = useMutation({
    mutationFn: (userId) => departments.assignCaptain(dept.id, userId),
    onSuccess: () => { toast.success('Gouverneur mis à jour.'); onChange?.() },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur.'),
  })

  /**
   * Ouvre un modal de confirmation avant d'assigner un gouverneur s'il y en a
   * déjà un en poste. Pour une PREMIÈRE nomination, action directe sans confirm.
   */
  const handleAssignGovernor = (newUser) => {
    const current = dept?.captain
    if (! current) {
      // Pas de gouverneur courant → nomination directe sans confirm
      return assignGovernor.mutate(newUser.id)
    }
    setConfirmAction({ kind: 'replace-governor', user: newUser })
  }

  const addMember = useMutation({
    mutationFn: ({ userId, role }) => departments.addMember(dept.id, userId, role),
    onSuccess: (_, { role }) => {
      toast.success(role === 'governor'
        ? 'Membre ajouté en tant que gouverneur.'
        : 'Membre ajouté.')
      setSearch('')
      onChange?.()
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Erreur.'
      toast.error(msg)
    },
  })

  const removeMember = useMutation({
    mutationFn: (userId) => departments.removeMember(dept.id, userId),
    onSuccess: () => { toast.success('Membre retiré.'); onChange?.() },
    onError: () => toast.error('Erreur.'),
  })

  const candidates = (searchResults?.data ?? []).filter((u) => ! existingIds.has(u.id))

  return (
    <div className="adm-card p-5 sm:p-6 space-y-5">
      <h2 className="flex items-center gap-2">
        <UserPlus size={18} style={{ color: 'var(--adm-accent)' }}/> Équipe
      </h2>

      {/* Gouverneur actuel — carte ivoire, texte sombre, contraste lisible */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--adm-border)' }}>
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-2 inline-flex items-center gap-1" style={{ color: 'var(--adm-accent)' }}>
          <Crown size={11}/> Gouverneur
        </p>
        {dept.captain ? (
          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 border" style={{ background: '#FAF6EE', borderColor: '#E8DFC9' }}>
            <Link
              to={`/admin/membres/${dept.captain.id}`}
              className="flex items-center gap-3 min-w-0 flex-1 group rounded -mx-1 px-1 py-0.5 transition hover:bg-[#F0E7D1]"
              title="Voir la fiche membre"
            >
              {dept.captain.avatar ? (
                <img src={dept.captain.avatar} alt="" className="h-10 w-10 rounded-full object-cover shrink-0"/>
              ) : (
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0 text-white" style={{ background: 'var(--adm-accent)' }}>
                  {(dept.captain.first_name?.[0] || dept.captain.name?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-medium truncate group-hover:underline" style={{ color: '#1F1A14' }}>
                  {[dept.captain.first_name, dept.captain.name].filter(Boolean).join(' ') || dept.captain.full_name || dept.captain.name}
                </p>
                <p className="text-xs" style={{ color: '#6B5F4E' }}>Gouverneur en poste · voir la fiche →</p>
              </div>
            </Link>
            <button
              onClick={() => setConfirmAction({ kind: 'remove-governor' })}
              disabled={assignGovernor.isPending}
              className="text-xs px-3 py-1.5 rounded-md font-medium shrink-0 inline-flex items-center gap-1 transition"
              style={{ color: 'var(--adm-danger)', background: 'transparent', border: '1px solid #FECACA' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={12}/> Retirer
            </button>
          </div>
        ) : (
          <p className="italic text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Aucun gouverneur — utilise la recherche ci-dessous pour en désigner un.
          </p>
        )}
      </div>

      {/* Membres réguliers (hors gouverneur, qui est dans sa propre carte au-dessus).
          NB : si la liste API renvoyée semble vide alors que le compteur dit le
          contraire, c'est un mismatch cache navigateur/SW — un hard reload
          (Ctrl+Shift+R) le règle. */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: 'var(--adm-accent)' }}>
          Membres ({regularMembers.length})
          {dept?.member_count_cache != null && dept.member_count_cache !== members.length && (
            <span className="ml-2 text-[10px] normal-case font-normal" style={{ color: 'var(--adm-text-muted)' }}>
              (recharge la page si le compteur diffère du cache : {dept.member_count_cache} en DB)
            </span>
          )}
        </p>
        {regularMembers.length === 0 ? (
          <p className="italic text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Aucun membre régulier dans ce département.
            {dept.captain && ' Le gouverneur est compté à part au-dessus.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {regularMembers.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 border transition hover:shadow-sm" style={{ background: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}>
                <Link
                  to={`/admin/membres/${m.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group rounded -mx-1 px-1 py-0.5 transition hover:bg-[var(--adm-card-hover)]"
                  title="Voir la fiche membre"
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0"/>
                  ) : (
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0" style={{ background: 'var(--adm-accent)' }}>
                      {(m.first_name?.[0] || m.name?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm truncate group-hover:underline" style={{ color: 'var(--adm-text)' }}>
                    {m.full_name || [m.first_name, m.name].filter(Boolean).join(' ')}
                  </span>
                </Link>
                <button
                  onClick={() => setConfirmAction({ kind: 'remove-member', member: m })}
                  className="text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1 shrink-0 transition"
                  style={{ color: 'var(--adm-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--adm-danger)'; e.currentTarget.style.background = '#FEE2E2' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--adm-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <Trash2 size={11}/> Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recherche pour ajouter — palette admin claire */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--adm-border)' }}>
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: 'var(--adm-accent)' }}>
          Ajouter un membre
        </p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--adm-text-faint)' }}/>
          <input
            type="search"
            placeholder="Tape un nom ou prénom (min 2 lettres)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adm-input w-full pl-9"
          />
        </div>

        {debouncedSearch.length >= 2 && (
          <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {isFetching ? (
              <div className="text-center py-4"><Spinner size={20}/></div>
            ) : candidates.length === 0 ? (
              <p className="italic text-xs px-3 py-3" style={{ color: 'var(--adm-text-muted)' }}>
                Aucun résultat (ou déjà dans l'équipe).
              </p>
            ) : (
              candidates.map((u) => (
                <CandidateRow
                  key={u.id}
                  user={u}
                  onAddMember={() => addMember.mutate({ userId: u.id, role: 'member' })}
                  onAssignGovernor={() => handleAssignGovernor(u)}
                  busy={addMember.isPending || assignGovernor.isPending}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmation centralisé pour toutes les actions destructives */}
      <ConfirmActionModal
        action={confirmAction}
        dept={dept}
        pending={assignGovernor.isPending || removeMember.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (! confirmAction) return
          if (confirmAction.kind === 'replace-governor') {
            assignGovernor.mutate(confirmAction.user.id, {
              onSettled: () => setConfirmAction(null),
            })
          } else if (confirmAction.kind === 'remove-governor') {
            assignGovernor.mutate(null, {
              onSettled: () => setConfirmAction(null),
            })
          } else if (confirmAction.kind === 'remove-member') {
            removeMember.mutate(confirmAction.member.id, {
              onSettled: () => setConfirmAction(null),
            })
          }
        }}
      />
    </div>
  )
}

/**
 * Modal de confirmation NWC — palette ivoire chaud, accents wine pour
 * action destructive. Couvre 3 scénarios via la prop `action.kind`.
 */
function ConfirmActionModal({ action, dept, pending, onCancel, onConfirm }) {
  if (! action) return null

  let title = ''
  let message = ''
  let ctaLabel = 'Confirmer'
  if (action.kind === 'replace-governor') {
    const newName = [action.user.first_name, action.user.name].filter(Boolean).join(' ') || action.user.full_name
    const currentName = dept?.captain
      ? ([dept.captain.first_name, dept.captain.name].filter(Boolean).join(' ') || dept.captain.name)
      : '—'
    title = 'Remplacer le gouverneur ?'
    message = `« ${currentName} » sera rétrogradé(e) en membre régulier et son mandat fermé dans l'historique. « ${newName} » prendra sa place.`
    ctaLabel = 'Remplacer'
  } else if (action.kind === 'remove-governor') {
    const currentName = dept?.captain
      ? ([dept.captain.first_name, dept.captain.name].filter(Boolean).join(' ') || dept.captain.name)
      : 'gouverneur courant'
    title = 'Retirer le gouverneur ?'
    message = `« ${currentName} » sera retiré(e) de son rôle de gouverneur. Le département passera au statut « à pourvoir ». Le mandat sera clôturé dans l'historique.`
    ctaLabel = 'Retirer'
  } else if (action.kind === 'remove-member') {
    const memberName = action.member.full_name
      || [action.member.first_name, action.member.name].filter(Boolean).join(' ')
    title = 'Retirer ce membre ?'
    message = `« ${memberName} » sera retiré(e) du département. Cette action est immédiate. L'utilisateur reste actif sur la plateforme.`
    ctaLabel = 'Retirer'
  }

  return (
    <Modal
      open
      onClose={() => { if (! pending) onCancel() }}
      size="md"
      title={title}
      description="Cette action peut être annulée par un nouveau ajout/désignation."
    >
      <div className="flex gap-3">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: '#B0273A' }} />
        <p className="text-[14px]" style={{ color: '#2D261D' }}>{message}</p>
      </div>

      <Modal.Footer>
        <button type="button" className="nwc-btn-ghost" onClick={onCancel} disabled={pending}>
          Annuler
        </button>
        <button
          type="button"
          className="nwc-btn-primary"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {pending ? 'En cours…' : ctaLabel}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

function CandidateRow({ user, onAddMember, onAssignGovernor, busy }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border transition hover:shadow-sm"
      style={{ background: 'var(--adm-card)', borderColor: 'var(--adm-border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0"/>
        ) : (
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0" style={{ background: 'var(--adm-accent)' }}>
            {(user.first_name?.[0] || user.name?.[0] || '?').toUpperCase()}
          </div>
        )}
        <span className="text-sm truncate" style={{ color: 'var(--adm-text)' }}>
          {user.full_name || [user.first_name, user.name].filter(Boolean).join(' ')}
        </span>
      </div>
      {/* Boutons : Membre (neutre clair) + Gouverneur (or, action forte) */}
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onAddMember}
          disabled={busy}
          className={cn(
            'text-xs px-3 py-1.5 rounded-md font-medium transition inline-flex items-center gap-1 border',
            busy && 'opacity-50 cursor-not-allowed',
          )}
          style={{
            color: 'var(--adm-text)',
            background: 'var(--adm-card-hover)',
            borderColor: 'var(--adm-border-strong)',
          }}
          title="Ajouter comme membre"
        >
          <UserPlus size={12}/> Membre
        </button>
        <button
          onClick={onAssignGovernor}
          disabled={busy}
          className={cn(
            'text-xs px-3 py-1.5 rounded-md font-medium transition inline-flex items-center gap-1 border',
            busy && 'opacity-50 cursor-not-allowed',
          )}
          style={{
            color: '#1F1A14',
            background: '#E0B85C',
            borderColor: '#B79358',
          }}
          title="Désigner comme gouverneur (remplace l'actuel)"
        >
          <Crown size={12}/> Gouverneur
        </button>
      </div>
    </div>
  )
}
