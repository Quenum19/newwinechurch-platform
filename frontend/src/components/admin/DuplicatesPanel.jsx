/**
 * Panneau doublons potentiels — s'affiche dans EventTicketsDashboard.
 *
 * Détection en 2 niveaux :
 *  - CERTAIN  (même email OU même téléphone)
 *  - PROBABLE (même nom + email/tel similaires)
 *
 * Actions par groupe :
 *  - 📞 Contacter → affiche les téléphones sous forme cliquable tel:
 *  - ✓ Pas un doublon → marque comme vérifié (masqué à l'avenir)
 *  - ❌ Annuler l'un → ouvre modal de sélection du ticket à annuler
 *  - 📊 Export Excel → tous les groupes stylés NWC
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  AlertTriangle, Copy, CheckCircle2, Phone, Mail, Users, Ban,
  Download, Loader2, RefreshCw, Filter, Search, X,
} from 'lucide-react'
import { events as adminEvents } from '@/api/admin'

const CONFIDENCE_META = {
  certain:  {
    label:    'Certain',
    tone:     'text-red-700 bg-red-50 border-red-300',
    dot:      'bg-red-500',
    subtitle: 'Email ou téléphone strictement identique',
  },
  probable: {
    label:    'Probable',
    tone:     'text-orange-700 bg-orange-50 border-orange-300',
    dot:      'bg-orange-500',
    subtitle: 'Même nom + contact similaire (faute de frappe, chiffre en plus…)',
  },
}

export default function DuplicatesPanel({ eventId, event }) {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')          // 'all' | 'certain' | 'probable'
  const [search, setSearch] = useState('')
  const [busyGroupHash, setBusyGroupHash] = useState(null)
  const [exportBusy, setExportBusy]       = useState(false)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'events', eventId, 'duplicates'],
    queryFn:  () => adminEvents.ticketsDuplicates(eventId),
    staleTime: 30_000,
  })

  const verifyMutation = useMutation({
    mutationFn: ({ ticketIds, note }) =>
      adminEvents.ticketsDuplicatesVerify(eventId, ticketIds, note),
    onSuccess: (_, vars) => {
      toast.success('Groupe marqué comme vérifié — retiré de la liste.')
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'duplicates'] })
      setBusyGroupHash(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erreur — impossible de marquer.')
      setBusyGroupHash(null)
    },
  })

  const groups = data?.groups ?? []
  const counts = data?.counts ?? { certain: 0, probable: 0, total: 0 }

  const filteredGroups = useMemo(() => {
    let list = groups
    if (filter !== 'all') list = list.filter((g) => g.confidence === filter)
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter((g) =>
        (g.match_label || '').toLowerCase().includes(s) ||
        g.tickets?.some((t) =>
          (t.full_name || '').toLowerCase().includes(s) ||
          (t.email || '').toLowerCase().includes(s) ||
          (t.phone || '').toLowerCase().includes(s) ||
          (t.short_code || '').toLowerCase().includes(s)
        )
      )
    }
    return list
  }, [groups, filter, search])

  const handleVerify = (group) => {
    if (!confirm(`Confirmer que ces ${group.tickets.length} tickets ne sont PAS un doublon ?`)) return
    setBusyGroupHash(group.group_hash)
    verifyMutation.mutate({
      ticketIds: group.ticket_ids,
      note: null,
    })
  }

  const handleExport = async () => {
    setExportBusy(true)
    try {
      await adminEvents.ticketsDuplicatesExport(eventId)
      toast.success('Export Excel téléchargé.')
    } catch (e) {
      toast.error(e?.response?.data?.message || "Échec de l'export.")
    } finally {
      setExportBusy(false)
    }
  }

  // ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="adm-card p-12 text-center">
        <Loader2 size={24} className="animate-spin inline text-public-flame"/>
        <p className="mt-3 text-sm text-zinc-500">Analyse des doublons en cours…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="adm-card p-8 text-center text-red-600">
        <AlertTriangle size={28} className="mx-auto mb-3"/>
        <p>Impossible de charger les doublons : {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header + compteurs */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-public-flame mb-1 inline-flex items-center gap-1">
            <Copy size={11}/> Vérification qualité
          </p>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--adm-text)' }}>
            Doublons potentiels
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Les personnes qui apparaissent plusieurs fois — vérifie et annule celles qui sont vraiment des doublons.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="adm-btn adm-btn-ghost"
            title="Rafraîchir"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/>
          </button>
          <button
            onClick={handleExport}
            disabled={exportBusy || counts.total === 0}
            className="adm-btn adm-btn-primary"
          >
            {exportBusy ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
            Exporter Excel
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard
          label="Total groupes"
          value={counts.total}
          icon={<Users size={14}/>}
        />
        <StatCard
          label="🔴 Certains"
          value={counts.certain}
          highlight={counts.certain > 0}
        />
        <StatCard
          label="🟠 Probables"
          value={counts.probable}
        />
      </section>

      {/* Filtres */}
      <section className="adm-card p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded border overflow-hidden" style={{ borderColor: 'var(--adm-border)' }}>
          {[
            { value: 'all',      label: 'Tous', count: counts.total },
            { value: 'certain',  label: '🔴 Certains', count: counts.certain },
            { value: 'probable', label: '🟠 Probables', count: counts.probable },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition ${
                filter === f.value
                  ? 'bg-public-flame text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, téléphone, code…"
            className="adm-input pl-8 w-full text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              <X size={13}/>
            </button>
          )}
        </div>
      </section>

      {/* Liste des groupes */}
      {filteredGroups.length === 0 ? (
        <div className="adm-card p-12 text-center">
          {counts.total === 0 ? (
            <>
              <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500"/>
              <p className="text-base text-zinc-700 font-medium">Aucun doublon détecté 🎉</p>
              <p className="text-xs text-zinc-500 mt-1">
                Tous les tickets ont des emails et téléphones uniques.
              </p>
            </>
          ) : (
            <>
              <Filter size={40} className="mx-auto mb-4 opacity-30 text-zinc-400"/>
              <p className="text-sm text-zinc-600">
                Aucun résultat pour ce filtre.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <DuplicateGroupCard
              key={group.group_hash}
              group={group}
              onVerify={() => handleVerify(group)}
              isBusy={busyGroupHash === group.group_hash}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sous-composants ────────────────────────────────────────────

function StatCard({ label, value, icon = null, highlight = false }) {
  return (
    <div className={`adm-card p-3 sm:p-4 ${highlight ? 'ring-2 ring-red-500/40' : ''}`}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 inline-flex items-center gap-1">
        {icon}{label}
      </p>
      <p className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${highlight ? 'text-red-600' : ''}`} style={{ color: highlight ? undefined : 'var(--adm-text)' }}>
        {value}
      </p>
    </div>
  )
}

function DuplicateGroupCard({ group, onVerify, isBusy }) {
  const meta = CONFIDENCE_META[group.confidence] ?? CONFIDENCE_META.probable

  return (
    <div className={`adm-card overflow-hidden border-l-4 ${
      group.confidence === 'certain' ? 'border-l-red-500' : 'border-l-orange-500'
    }`}>
      {/* Header groupe */}
      <div className="p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3 border-b" style={{ borderColor: 'var(--adm-border)' }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse shrink-0`}/>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded ${meta.tone}`}>
                {meta.label}
              </span>
              <span className="text-[11px] text-zinc-500">
                {group.tickets.length} tickets
              </span>
            </div>
            <p className="text-sm mt-1 font-semibold text-zinc-800 truncate">{group.match_label}</p>
            <p className="text-[11px] text-zinc-500 italic mt-0.5">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onVerify}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider bg-white border-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 rounded transition disabled:opacity-50"
            title="Ces tickets ne sont pas un doublon (homonymes, cas légitime…)"
          >
            {isBusy ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}
            Pas un doublon
          </button>
        </div>
      </div>

      {/* Tickets du groupe */}
      <div className="divide-y" style={{ borderColor: 'var(--adm-border)' }}>
        {group.tickets.map((t) => (
          <TicketRow key={t.id} ticket={t} />
        ))}
      </div>
    </div>
  )
}

function TicketRow({ ticket }) {
  return (
    <div className="p-3 sm:p-4 flex flex-wrap items-start justify-between gap-3 hover:bg-zinc-50 transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-mono text-xs font-bold text-public-flame">{ticket.short_code}</span>
          {ticket.ticket_type && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200 rounded">
              {ticket.ticket_type}
            </span>
          )}
          <span className={`text-[10px] font-mono uppercase tracking-wider ${
            ticket.status === 'used' ? 'text-emerald-700' : 'text-blue-700'
          }`}>
            {ticket.status === 'used' ? '✓ Scanné' : 'Confirmé'}
          </span>
        </div>
        <p className="font-semibold text-sm" style={{ color: 'var(--adm-text)' }}>{ticket.full_name}</p>
        <div className="flex flex-col gap-0.5 mt-1 text-xs text-zinc-600">
          {ticket.email && (
            <a href={`mailto:${ticket.email}`} className="inline-flex items-center gap-1.5 hover:text-public-flame min-w-0">
              <Mail size={11} className="shrink-0 text-public-flame/70"/>
              <span className="truncate">{ticket.email}</span>
            </a>
          )}
          {ticket.phone && (
            <a href={`tel:${ticket.phone}`} className="inline-flex items-center gap-1.5 hover:text-public-flame">
              <Phone size={11} className="shrink-0 text-public-flame/70"/>
              <span className="font-mono">{ticket.phone}</span>
            </a>
          )}
        </div>
      </div>
      <div className="text-right text-[11px] text-zinc-500 shrink-0">
        <p className="font-mono">{ticket.order_code}</p>
        {ticket.created_at && (
          <p className="mt-0.5">
            Acheté le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  )
}
