/**
 * AdminContactMessagesPage — Boîte de réception des messages du formulaire /contact.
 *
 * URL : /admin/contact
 *
 * Layout : 2 colonnes (liste à gauche, détail à droite, style inbox mail).
 * Actions : marquer lu/non lu, marquer répondu, supprimer, chercher, filtrer non lus.
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Mail, MailOpen, Trash2, Reply, Phone, Search,
  Loader2, CheckCircle2, Circle, MessageSquare, Calendar,
  ArrowLeft,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { contactMessages } from '@/api/admin'
import { cn } from '@/utils/cn'
import Modal from '@/components/ui/Modal.jsx'

export default function AdminContactMessagesPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({ search: '', unread: false, unreplied: false })
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data: stats } = useQuery({
    queryKey: ['admin', 'contact-messages', 'stats'],
    queryFn: contactMessages.stats,
    staleTime: 30_000,
  })

  const { data: list, isLoading } = useQuery({
    queryKey: ['admin', 'contact-messages', 'list', filters],
    queryFn: () => contactMessages.list({
      search: filters.search || undefined,
      is_read: filters.unread ? '0' : undefined,
      unreplied: filters.unreplied ? '1' : undefined,
      per_page: 50,
    }),
    keepPreviousData: true,
  })
  const rows = list?.data ?? []

  const { data: detail } = useQuery({
    queryKey: ['admin', 'contact-messages', 'detail', selectedId],
    queryFn: () => contactMessages.get(selectedId),
    enabled: !! selectedId,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] })
  }

  const markRead = useMutation({
    mutationFn: (id) => contactMessages.markRead(id),
    onSuccess: () => { invalidate(); toast.success('Marqué lu.') },
  })
  const markUnread = useMutation({
    mutationFn: (id) => contactMessages.markUnread(id),
    onSuccess: () => { invalidate(); toast.success('Marqué non lu.') },
  })
  const markReplied = useMutation({
    mutationFn: (id) => contactMessages.markReplied(id),
    onSuccess: () => { invalidate(); toast.success('Marqué répondu.') },
  })
  const remove = useMutation({
    mutationFn: (id) => contactMessages.delete(id),
    onSuccess: () => {
      invalidate()
      setConfirmDelete(null)
      if (selectedId === confirmDelete?.id) setSelectedId(null)
      toast.success('Message supprimé.')
    },
  })

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header + stats */}
      <header className="adm-card p-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--adm-accent)] mb-1">
          Boîte de réception
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
          Messages de contact
        </h1>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total"     value={stats?.total ?? '—'}/>
          <Stat label="Non lus"   value={stats?.unread ?? '—'} accent/>
          <Stat label="Sans réponse" value={stats?.unreplied ?? '—'}/>
          <Stat label="Aujourd'hui" value={stats?.today ?? '—'}/>
        </div>
      </header>

      {/* Barre filtres */}
      <div className="adm-card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input
            type="search"
            placeholder="Rechercher nom / email / sujet / contenu…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="pl-8 pr-3 py-2 w-full border-2 border-zinc-300 rounded text-sm"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={filters.unread}
            onChange={(e) => setFilters((f) => ({ ...f, unread: e.target.checked }))}
          />
          Non lus seulement
        </label>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={filters.unreplied}
            onChange={(e) => setFilters((f) => ({ ...f, unreplied: e.target.checked }))}
          />
          Sans réponse
        </label>
      </div>

      {/* Layout inbox : liste à gauche + détail à droite (ou empilé mobile) */}
      <div className="grid md:grid-cols-[minmax(280px,380px)_1fr] gap-3">
        {/* Liste */}
        <div className="adm-card overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16 text-zinc-500">
              <Loader2 size={24} className="animate-spin inline"/>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <MessageSquare size={40} className="mx-auto opacity-30 mb-3"/>
              <p className="text-sm">Aucun message pour l'instant.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
              {rows.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      'w-full text-left p-3 hover:bg-zinc-50 transition',
                      selectedId === m.id && 'bg-[color:var(--adm-accent)]/5 border-l-2 border-[color:var(--adm-accent)]',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {m.is_read
                        ? <MailOpen size={14} className="text-zinc-400 mt-1 shrink-0"/>
                        : <Mail size={14} className="text-[color:var(--adm-accent)] mt-1 shrink-0"/>
                      }
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-sm truncate',
                          ! m.is_read && 'font-bold',
                        )}>{m.name}</div>
                        <div className="text-xs text-zinc-500 truncate">{m.subject || '(sans sujet)'}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          {formatDistanceToNow(new Date(m.created_at), { locale: fr, addSuffix: true })}
                          {m.replied_at && <CheckCircle2 size={11} className="text-green-600" title="Répondu"/>}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Détail */}
        <div className="adm-card p-5 min-h-[400px]">
          {! selectedId ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center py-16">
              <Mail size={48} className="opacity-25 mb-4"/>
              <p className="text-sm">Sélectionne un message pour le lire</p>
            </div>
          ) : ! detail ? (
            <div className="text-center py-16"><Loader2 size={24} className="animate-spin inline"/></div>
          ) : (
            <div>
              <div className="mb-4 pb-4 border-b border-zinc-200">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--adm-text)' }}>
                      {detail.subject || '(sans sujet)'}
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">
                      De <strong>{detail.name}</strong> ·{' '}
                      <a href={`mailto:${detail.email}`} className="text-[color:var(--adm-accent)] hover:underline">
                        {detail.email}
                      </a>
                      {detail.phone && (
                        <> · <a href={`tel:${detail.phone}`} className="text-[color:var(--adm-accent)] hover:underline inline-flex items-center gap-1"><Phone size={11}/> {detail.phone}</a></>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 inline-flex items-center gap-1">
                      <Calendar size={11}/>
                      {format(new Date(detail.created_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                    </p>
                    {detail.replied_at && (
                      <p className="text-xs text-green-600 mt-1 inline-flex items-center gap-1">
                        <CheckCircle2 size={11}/> Marqué répondu {formatDistanceToNow(new Date(detail.replied_at), { locale: fr, addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <a
                      href={`mailto:${detail.email}?subject=${encodeURIComponent('Re: ' + (detail.subject || 'Ton message'))}`}
                      className="adm-btn adm-btn-primary inline-flex items-center gap-1 text-xs"
                      onClick={() => markReplied.mutate(detail.id)}
                    >
                      <Reply size={12}/> Répondre par email
                    </a>
                    {detail.is_read
                      ? <button
                          onClick={() => markUnread.mutate(detail.id)}
                          className="adm-btn inline-flex items-center gap-1 text-xs"
                          title="Marquer non lu"
                        ><Circle size={12}/> Non lu</button>
                      : <button
                          onClick={() => markRead.mutate(detail.id)}
                          className="adm-btn inline-flex items-center gap-1 text-xs"
                          title="Marquer lu"
                        ><CheckCircle2 size={12}/> Lu</button>
                    }
                    {! detail.replied_at && (
                      <button
                        onClick={() => markReplied.mutate(detail.id)}
                        className="adm-btn inline-flex items-center gap-1 text-xs"
                        title="Marquer répondu sans envoyer d'email"
                      ><CheckCircle2 size={12}/> Marquer répondu</button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(detail)}
                      className="adm-btn adm-btn-danger inline-flex items-center gap-1 text-xs"
                    >
                      <Trash2 size={12}/> Supprimer
                    </button>
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--adm-text)' }}>
                  {detail.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal suppression */}
      <Modal
        open={!! confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Supprimer ce message ?"
        description={confirmDelete?.subject || confirmDelete?.name}
        size="sm"
      >
        <p className="text-sm">
          Le message de <strong>{confirmDelete?.name}</strong> sera supprimé
          définitivement. Cette action est irréversible.
        </p>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)} className="adm-btn">Annuler</button>
          <button
            onClick={() => remove.mutate(confirmDelete.id)}
            disabled={remove.isPending}
            className="adm-btn adm-btn-danger"
          >
            {remove.isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className={cn(
      'p-3 rounded border-2',
      accent ? 'border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/5' : 'border-zinc-200',
    )}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
