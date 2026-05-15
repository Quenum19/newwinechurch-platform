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
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Crown, Search, UserPlus, X, Trash2 } from 'lucide-react'

import Spinner from '@/components/ui/Spinner.jsx'
import { departments, members as membersApi } from '@/api/admin'
import { cn } from '@/utils/cn'

export default function DepartmentMemberManager({ dept, members = [], onChange }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

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

  const assignGovernor = useMutation({
    mutationFn: (userId) => departments.assignCaptain(dept.id, userId),
    onSuccess: () => { toast.success('Gouverneur mis à jour.'); onChange?.() },
    onError: () => toast.error('Erreur.'),
  })

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
    <div className="card-nwc p-5 space-y-5">
      <h2 className="text-xl text-white font-semibold flex items-center gap-2">
        <UserPlus size={18} className="text-gold-400"/> Équipe
      </h2>

      {/* Gouverneur actuel */}
      <div className="border-b border-white/5 pb-4">
        <p className="text-xs uppercase tracking-wider text-gold-400 mb-2 inline-flex items-center gap-1">
          <Crown size={11}/> Gouverneur
        </p>
        {dept.captain ? (
          <div className="flex items-center justify-between gap-3 bg-ink-900/50 px-3 py-2.5 rounded-md">
            <div className="flex items-center gap-3 min-w-0">
              {dept.captain.avatar ? (
                <img src={dept.captain.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0"/>
              ) : (
                <div className="h-9 w-9 rounded-full bg-wine-700 flex items-center justify-center text-xs text-white shrink-0">
                  {(dept.captain.first_name?.[0] || dept.captain.name?.[0] || '?').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white text-sm truncate">
                  {[dept.captain.first_name, dept.captain.name].filter(Boolean).join(' ')}
                </p>
                <p className="text-white/40 text-xs">Gouverneur depuis sa nomination</p>
              </div>
            </div>
            <button
              onClick={() => assignGovernor.mutate(null)}
              disabled={assignGovernor.isPending}
              className="text-xs text-white/50 hover:text-accent shrink-0 inline-flex items-center gap-1"
            >
              <X size={12}/> Retirer
            </button>
          </div>
        ) : (
          <p className="text-white/40 italic text-sm">Aucun gouverneur — utilise la recherche ci-dessous pour en désigner un.</p>
        )}
      </div>

      {/* Membres */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gold-400 mb-2">Membres ({members.length})</p>
        {members.length === 0 ? (
          <p className="text-white/40 italic text-sm">Aucun membre dans ce département.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 bg-ink-900/30 px-3 py-2 rounded-md">
                <span className="text-sm text-white truncate">
                  {m.full_name || [m.first_name, m.name].filter(Boolean).join(' ')}
                </span>
                <button
                  onClick={() => {
                    if (confirm('Retirer ce membre du département ?')) removeMember.mutate(m.id)
                  }}
                  className="text-xs text-white/40 hover:text-accent inline-flex items-center gap-1 shrink-0"
                >
                  <Trash2 size={11}/> retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recherche pour ajouter */}
      <div className="border-t border-white/5 pt-4">
        <p className="text-xs uppercase tracking-wider text-gold-400 mb-2">Ajouter un membre</p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/>
          <input
            type="search"
            placeholder="Tape un nom ou prénom (min 2 lettres)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-ink-900 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 rounded-md focus:border-gold-500 focus:outline-none"
          />
        </div>

        {debouncedSearch.length >= 2 && (
          <div className="mt-3 space-y-1 max-h-72 overflow-y-auto">
            {isFetching ? (
              <div className="text-center py-4"><Spinner size={20}/></div>
            ) : candidates.length === 0 ? (
              <p className="text-white/40 italic text-xs px-3 py-3">Aucun résultat (ou déjà dans l'équipe).</p>
            ) : (
              candidates.map((u) => (
                <CandidateRow
                  key={u.id}
                  user={u}
                  onAddMember={() => addMember.mutate({ userId: u.id, role: 'member' })}
                  onAssignGovernor={() => assignGovernor.mutate(u.id)}
                  busy={addMember.isPending || assignGovernor.isPending}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CandidateRow({ user, onAddMember, onAssignGovernor, busy }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-ink-900/30 hover:bg-ink-900/60 px-3 py-2 rounded-md transition">
      <div className="flex items-center gap-2 min-w-0">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0"/>
        ) : (
          <div className="h-7 w-7 rounded-full bg-wine-700 flex items-center justify-center text-[10px] text-white shrink-0">
            {(user.first_name?.[0] || user.name?.[0] || '?').toUpperCase()}
          </div>
        )}
        <span className="text-sm text-white truncate">
          {user.full_name || [user.first_name, user.name].filter(Boolean).join(' ')}
        </span>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onAddMember}
          disabled={busy}
          className={cn(
            'text-[11px] px-2 py-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition',
            busy && 'opacity-50 cursor-not-allowed',
          )}
          title="Ajouter comme membre"
        >
          + Membre
        </button>
        <button
          onClick={onAssignGovernor}
          disabled={busy}
          className={cn(
            'text-[11px] px-2 py-1 rounded text-gold-400 hover:bg-gold-500/15 transition inline-flex items-center gap-1',
            busy && 'opacity-50 cursor-not-allowed',
          )}
          title="Désigner comme gouverneur (remplace l'actuel)"
        >
          <Crown size={10}/> Gouverneur
        </button>
      </div>
    </div>
  )
}
