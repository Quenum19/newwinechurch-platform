/**
 * GovMembers — liste paginée curseur des membres du département.
 * Filtres : cellule, statut, baptisé, recherche fulltext.
 * Action : déplacer un membre vers une autre cellule.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Search, ArrowRight, Loader2 } from 'lucide-react'
import {
  useGovernorCells, useGovernorMembers, useMoveMemberCell,
} from '@/api/governor'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/shared/Skeleton'
import { cn } from '@/utils/cn'

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GovMembers() {
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)
  const [cellFilter, setCellFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [baptizedFilter, setBaptizedFilter] = useState('')
  const [cursor, setCursor] = useState(null)
  const [movingMember, setMovingMember] = useState(null)

  const filters = {
    search: debounced || undefined,
    cell_id: cellFilter || undefined,
    status: statusFilter || undefined,
    baptized: baptizedFilter || undefined,
    cursor: cursor || undefined,
  }
  const { data, isLoading, isFetching } = useGovernorMembers(filters)
  const { data: cellsData } = useGovernorCells()
  const move = useMoveMemberCell()

  const members = data?.data ?? []
  const nextCursor = data?.meta?.next_cursor ?? data?.next_cursor ?? null

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-white">Membres du département</h1>
        <p className="text-sm text-white/50 mt-1">Recherche + filtres + déplacement vers une cellule</p>
      </header>

      {/* Filtres */}
      <div className="rounded-xl bg-ink-900 border border-white/5 p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCursor(null) }}
            placeholder="Nom, email ou téléphone…"
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white placeholder-white/30 focus:border-gold-500 focus:outline-none"
          />
        </div>
        <select
          value={cellFilter}
          onChange={(e) => { setCellFilter(e.target.value); setCursor(null) }}
          className="md:col-span-3 px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
        >
          <option value="">Toutes cellules</option>
          {(cellsData?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCursor(null) }}
          className="md:col-span-2 px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
        >
          <option value="">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="pending">En attente</option>
          <option value="inactive">Inactif</option>
        </select>
        <select
          value={baptizedFilter}
          onChange={(e) => { setBaptizedFilter(e.target.value); setCursor(null) }}
          className="md:col-span-2 px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
        >
          <option value="">Baptême : tous</option>
          <option value="true">Baptisés</option>
          <option value="false">Non baptisés</option>
        </select>
      </div>

      {/* Liste */}
      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        {isLoading ? <div className="p-4"><SkeletonTable rows={6} /></div> : (
          members.length === 0 ? (
            <p className="p-8 text-center text-white/50 text-sm">Aucun membre trouvé.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {members.map((m, i) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition"
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-wine-700 flex items-center justify-center text-sm text-white">
                      {(m.first_name?.[0] ?? m.name?.[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{m.full_name ?? `${m.first_name} ${m.name}`.trim()}</p>
                    <p className="text-xs text-white/50 truncate">
                      {m.phone ?? m.email ?? '—'} · {m.cell?.name ?? 'Sans cellule'}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-white/50">
                    {m.is_baptized && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">Baptisé</span>
                    )}
                    <span className={cn(
                      'px-2 py-0.5 rounded-full',
                      m.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' :
                      m.status === 'pending' ? 'bg-orange-500/10 text-orange-300' :
                      'bg-white/10 text-white/60'
                    )}>{m.status}</span>
                  </div>
                  <button
                    onClick={() => setMovingMember(m)}
                    className="text-xs text-gold-300 hover:text-gold-200 flex items-center gap-1"
                    aria-label="Changer de cellule"
                  >
                    <ArrowRight size={14} />
                    Cellule
                  </button>
                </motion.li>
              ))}
            </ul>
          )
        )}
        {nextCursor && (
          <div className="p-4 border-t border-white/5 text-center">
            <Button onClick={() => setCursor(nextCursor)} variant="ghost" disabled={isFetching}>
              {isFetching ? <Loader2 className="animate-spin" size={14} /> : 'Charger plus'}
            </Button>
          </div>
        )}
      </div>

      {/* Modal déplacement cellule */}
      {movingMember && (
        <MoveCellModal
          member={movingMember}
          cells={cellsData?.data ?? []}
          onClose={() => setMovingMember(null)}
          onConfirm={async (cellId) => {
            try {
              await move.mutateAsync({ memberId: movingMember.id, cellId })
              toast.success(cellId ? 'Membre déplacé.' : 'Membre retiré de toute cellule.')
              setMovingMember(null)
            } catch (err) {
              toast.error(err?.response?.data?.message ?? 'Erreur de déplacement.')
            }
          }}
          pending={move.isPending}
        />
      )}
    </div>
  )
}

function MoveCellModal({ member, cells, onClose, onConfirm, pending }) {
  const [target, setTarget] = useState(member.cell?.id ?? '')
  const currentCellName = member.cell?.name ?? 'aucune cellule'

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Changer de cellule"
      description={`${member.full_name ?? member.name} · actuellement : ${currentCellName}`}
    >
      <div>
        <label htmlFor="nwc-cell-target">Nouvelle cellule</label>
        <select
          id="nwc-cell-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">— Sans cellule —</option>
          {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <p className="nwc-hint">
          Le membre sera notifié par email du changement.
        </p>
      </div>

      <Modal.Footer>
        <button type="button" className="nwc-btn-ghost" onClick={onClose}>
          Annuler
        </button>
        <button
          type="button"
          className="nwc-btn-primary"
          onClick={() => onConfirm(target || null)}
          disabled={pending}
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {pending ? 'Déplacement…' : 'Confirmer'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
