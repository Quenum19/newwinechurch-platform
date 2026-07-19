/**
 * Dashboard billetterie d'un événement — admin.
 *
 * Sections :
 *  - Stats (vendus / restants / scannés / fill rate)
 *  - Filtres : statut + recherche
 *  - Table inscrits + actions (renvoyer mail, voir détail, unscan)
 *  - Export Excel
 *  - Bouton vers /scan
 */
import { useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Calendar, Users, Ticket, Send, Download, ScanLine, CheckCircle2,
  XCircle, AlertCircle, Mail, Phone, Search, RotateCcw, Loader2,
  CreditCard, Check, X, Clock, FileImage, TrendingUp, PieChart as PieIcon,
  RefreshCw, Ban, ListOrdered, ArrowRightCircle, Trash2, ShieldCheck,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

import BackButton from '@/components/admin/BackButton.jsx'
import RefundModal from '@/components/admin/RefundModal.jsx'
import StaffPanel from '@/components/admin/StaffPanel.jsx'
import { events } from '@/api/admin'

const PALETTE = ['#8B1A2F', '#C9A961', '#0A0908', '#6F4F2C', '#A36C3B', '#3D2A1E']

const STATUS_LABELS = {
  confirmed: { label: 'Confirmé',     class: 'bg-blue-50 text-blue-700 border-blue-300' },
  used:      { label: 'Entré',        class: 'bg-green-50 text-green-700 border-green-300' },
  cancelled: { label: 'Annulé',       class: 'bg-red-50 text-red-700 border-red-300' },
  waitlist:  { label: 'Liste attente',class: 'bg-orange-50 text-orange-700 border-orange-300' },
}

function getTicketStatusLabel(t) {
  if (t.payment_status === 'refunded') return { label: 'Remboursé', class: 'bg-purple-50 text-purple-700 border-purple-300' }
  return STATUS_LABELS[t.status] || STATUS_LABELS.confirmed
}

export default function EventTicketsDashboard() {
  const { id } = useParams()
  // Étape F — Mode Mission : accédé via /mission/evenement/:id (hors AdminLayout).
  // Le header + retour sont déjà gérés par MissionEventPage → on masque le
  // BackButton interne pour éviter la duplication.
  const location = useLocation()
  const isMissionMode = location.pathname.startsWith('/mission/')
  const queryClient = useQueryClient()
  const [tab, setTab]       = useState('tickets') // 'tickets' | 'payments' | 'analytics'
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [refundTarget, setRefundTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['admin', 'events', id, 'pending-orders'],
    queryFn: async () => (await events.pendingOrders(id))?.data ?? [],
    refetchInterval: 60_000,
  })

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'events', id, 'analytics'],
    queryFn: () => events.analyticsEvent(id),
    enabled: tab === 'analytics',
  })

  const { data: waitlistData } = useQuery({
    queryKey: ['admin', 'events', id, 'waitlist'],
    queryFn: async () => (await events.waitlist(id))?.data ?? [],
    refetchInterval: 60_000,
  })
  const waitlist = waitlistData ?? []

  const { data: stats } = useQuery({
    queryKey: ['admin', 'events', id, 'tickets', 'stats'],
    queryFn: () => events.ticketsStats(id),
    refetchInterval: 30_000, // refresh auto pendant l'event
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['admin', 'events', id, 'tickets', { status, search, page }],
    queryFn: () => events.ticketsList(id, { status, search, page, per_page: 25 }),
    keepPreviousData: true,
  })

  const resendMutation = useMutation({
    mutationFn: (ticketId) => events.ticketResend(id, ticketId),
    onSuccess: () => toast.success('Email renvoyé.'),
    onError: () => toast.error('Renvoi échoué.'),
  })

  const unscanMutation = useMutation({
    mutationFn: (ticketId) => events.ticketUnscan(ticketId),
    onSuccess: () => {
      toast.success('Scan annulé.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets'] })
    },
  })

  const exportMutation = useMutation({
    mutationFn: () => events.ticketsExport(id, { status, search }),
    onSuccess: () => toast.success('Export lancé.'),
    onError: () => toast.error('Export échoué.'),
  })

  const bulkMutation = useMutation({
    mutationFn: ({ action, ids }) => events.ticketsBulk(id, action, ids),
    onSuccess: (r) => {
      toast.success(r.message || 'Action appliquée.')
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets', 'stats'] })
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur bulk.'),
  })

  const toggleSelect = (ticketId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(ticketId) ? next.delete(ticketId) : next.add(ticketId)
      return next
    })
  }
  const toggleSelectAll = (currentPageTickets) => {
    const allIds = currentPageTickets.map((t) => t.id)
    const allSelected = allIds.every((tid) => selectedIds.has(tid))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) allIds.forEach((tid) => next.delete(tid))
      else allIds.forEach((tid) => next.add(tid))
      return next
    })
  }

  const event = stats?.event ?? listData?.event
  const tickets = listData?.data ?? []
  const pagination = listData?.meta ?? {}

  return (
    <div className="space-y-5 sm:space-y-6">
      {! isMissionMode && (
        <BackButton to="/admin/evenements" label="Retour aux événements" />
      )}

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="truncate">{event?.title ?? 'Billetterie'}</h1>
          {event?.starts_at && (
            <p className="text-xs sm:text-sm mt-1 inline-flex items-center gap-1.5" style={{ color: 'var(--adm-text-muted)' }}>
              <Calendar size={13} className="shrink-0"/>
              <span className="truncate">
                {format(new Date(event.starts_at), "EEE d MMM yyyy 'à' HH'h'mm", { locale: fr })}
              </span>
            </p>
          )}
        </div>
        {/* Actions header — grid mobile 2 cols, ligne desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 shrink-0">
          <Link to={`/scan?event=${id}`} target="_blank"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-mono bg-public-flame text-white hover:bg-public-ink transition">
            <ScanLine size={13}/> Scanner
          </Link>
          <Link to={`/admin/evenements/${id}/presence`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-mono bg-white border-2 border-public-flame/40 text-public-flame hover:bg-public-flame hover:text-white transition"
                title="Liste de présence temps réel + exports">
            <Users size={13}/> Présence
          </Link>
          <button onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-mono bg-white border-2 border-public-ink/15 hover:border-public-flame hover:text-public-flame transition disabled:opacity-50">
            {exportMutation.isPending ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
            <span className="hidden xs:inline sm:hidden">Excel</span>
            <span className="xs:hidden sm:inline">Exporter Excel</span>
          </button>
          <button onClick={() => setRefundTarget({ kind: 'event', eventId: id, ticketsCount: stats?.sold ?? 0 })}
                  className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-mono bg-red-600 text-white hover:bg-red-700 transition">
            <Ban size={13}/> Annuler l'event
          </button>
        </div>
      </header>

      {/* Stats grid — cards CLIQUABLES qui filtrent la table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Tickets vendus"
                  value={stats?.sold ?? 0}
                  suffix={stats?.capacity ? ` / ${stats.capacity}` : null}
                  Icon={Ticket}
                  active={status === '' && tab === 'tickets'}
                  onClick={() => { setStatus(''); setTab('tickets'); setPage(1) }}/>
        <StatCard label="Confirmés"
                  value={stats?.confirmed ?? 0}
                  Icon={Users}
                  active={status === 'confirmed'}
                  onClick={() => { setStatus('confirmed'); setTab('tickets'); setPage(1) }}/>
        <StatCard label="Scannés (entrés)"
                  value={stats?.used ?? 0}
                  suffix={stats?.scan_rate !== undefined ? ` · ${stats.scan_rate}%` : null}
                  Icon={CheckCircle2}
                  active={status === 'used'}
                  onClick={() => { setStatus('used'); setTab('tickets'); setPage(1) }}/>
        <StatCard label="Annulés / remboursés"
                  value={(stats?.cancelled ?? 0) + (stats?.refunded ?? 0)}
                  Icon={XCircle}
                  active={status === 'cancelled'}
                  onClick={() => { setStatus('cancelled'); setTab('tickets'); setPage(1) }}/>
      </div>

      {/* Fill rate */}
      {stats?.capacity > 0 && (
        <div className="adm-card p-4 sm:p-5">
          <div className="flex justify-between items-end mb-2">
            <p className="text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--adm-text-muted)' }}>
              Taux de remplissage
            </p>
            <p className="font-display text-2xl">{stats.fill_rate}%</p>
          </div>
          <div className="h-2 bg-zinc-100">
            <div className="h-full bg-public-flame transition-all"
                 style={{ width: `${Math.min(100, stats.fill_rate)}%` }}/>
          </div>
        </div>
      )}

      {/* Tabs — scroll horizontal sur mobile pour voir tous les onglets.
          `-mx-4 sm:mx-0` : le scroll s'étend jusqu'au bord de l'écran mobile
          pour maximiser l'espace utile. */}
      <div className="-mx-4 sm:mx-0 border-b border-public-ink/10 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 sm:gap-2 min-w-max px-4 sm:px-0">
          <TabButton
            active={tab === 'tickets'}
            onClick={() => setTab('tickets')}
            icon={Ticket}
            label="Tickets"
          />
          <TabButton
            active={tab === 'payments'}
            onClick={() => setTab('payments')}
            icon={CreditCard}
            label="Paiements à valider"
            badge={pendingOrders.length > 0 ? pendingOrders.length : null}
          />
          <TabButton
            active={tab === 'waitlist'}
            onClick={() => setTab('waitlist')}
            icon={ListOrdered}
            label="Liste d'attente"
            badge={waitlist.length > 0 ? waitlist.length : null}
          />
          <TabButton
            active={tab === 'analytics'}
            onClick={() => setTab('analytics')}
            icon={TrendingUp}
            label="Analytics"
          />
          <TabButton
            active={tab === 'staff'}
            onClick={() => setTab('staff')}
            icon={ShieldCheck}
            label="Staff"
          />
        </div>
      </div>

      {/* Étape B — Onglet Staff (rôles scopés + scanners externes) */}
      {tab === 'staff' && <StaffPanel eventId={id}/>}

      {/* Onglet Liste d'attente */}
      {tab === 'waitlist' && (
        <WaitlistPanel
          eventId={id}
          entries={waitlist}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'waitlist'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets', 'stats'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets'] })
          }}
        />
      )}

      {/* Phase 4 — Analytics tab */}
      {tab === 'analytics' && <EventAnalyticsTab data={analytics}/>}

      {/* Phase 2 — Onglet paiements à valider */}
      {tab === 'payments' && (
        <PaymentsToValidate
          orders={pendingOrders}
          onValidated={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'pending-orders'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets', 'stats'] })
          }}
        />
      )}

      {tab === 'tickets' && (
      <>
      {/* Filters */}
      <div className="adm-card p-4 sm:p-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs uppercase tracking-wider font-mono block mb-1" style={{ color: 'var(--adm-text-muted)' }}>
            <Search size={11} className="inline mr-1"/> Rechercher
          </label>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Nom, email, code..."
                 className="adm-input"/>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider font-mono block mb-1" style={{ color: 'var(--adm-text-muted)' }}>Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="adm-input">
            <option value="">Tous</option>
            <option value="confirmed">Confirmés</option>
            <option value="used">Entrés</option>
            <option value="cancelled">Annulés</option>
            <option value="waitlist">Liste d'attente</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="adm-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Chargement…
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--adm-text-muted)' }}>
            <Ticket size={32} className="mx-auto mb-2 opacity-30"/>
            Aucun ticket pour ce filtre.
          </div>
        ) : (
          <div>
            {/* Bar actions bulk visible si sélection */}
            {selectedIds.size > 0 && (
              <div className="px-4 py-2.5 bg-public-flame/10 border-b border-public-flame/20 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs font-mono uppercase tracking-wider text-public-flame font-bold">
                  {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => bulkMutation.mutate({ action: 'resend', ids: [...selectedIds] })}
                    disabled={bulkMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider font-mono bg-white border-2 border-public-flame text-public-flame hover:bg-public-flame hover:text-white transition disabled:opacity-50">
                    <Send size={12}/> Renvoyer email
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Annuler ${selectedIds.size} ticket(s) ? Les inscrits seront notifiés.`)) return
                      bulkMutation.mutate({ action: 'cancel', ids: [...selectedIds] })
                    }}
                    disabled={bulkMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider font-mono bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 transition disabled:opacity-50">
                    <Ban size={12}/> Annuler
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider font-mono text-public-ink/60 hover:text-public-ink transition">
                    <X size={12}/>
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider font-mono"
                     style={{ background: '#FAFAFA', color: 'var(--adm-text-muted)' }}>
                <tr>
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox"
                           checked={tickets.length > 0 && tickets.every((t) => selectedIds.has(t.id))}
                           onChange={() => toggleSelectAll(tickets)}
                           className="h-4 w-4 accent-public-flame cursor-pointer"
                           aria-label="Tout sélectionner"/>
                  </th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Nom</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Email / Tel</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Cmde</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Scanné (par qui)</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const s = getTicketStatusLabel(t)
                  const isSelected = selectedIds.has(t.id)
                  return (
                    <tr key={t.id} className={`border-t ${isSelected ? 'bg-public-flame/5' : ''}`}
                        style={{ borderColor: 'var(--adm-border)' }}>
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={isSelected}
                               onChange={() => toggleSelect(t.id)}
                               className="h-4 w-4 accent-public-flame cursor-pointer"
                               aria-label={`Sélectionner ${t.short_code}`}/>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <p className="font-bold text-public-flame">{t.short_code}</p>
                        <p className="text-[10px] opacity-60">{t.ticket_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.full_name}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs">
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="flex items-center gap-1.5 min-w-0">
                            <Mail size={11} className="shrink-0 text-public-flame/70"/>
                            <span className="truncate">{t.email}</span>
                          </p>
                          {t.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone size={11} className="shrink-0 text-public-flame/70"/>
                              <span className="font-mono">{t.phone}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell font-mono text-xs opacity-70">{t.order_code}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${s.class}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: 'var(--adm-text-muted)' }}>
                        {t.used_at ? (
                          <>
                            <p className="font-medium" style={{ color: 'var(--adm-text)' }}>
                              {format(new Date(t.used_at), "d MMM 'à' HH:mm", { locale: fr })}
                            </p>
                            {t.used_by?.name && (
                              <p className="text-[10px] mt-0.5 inline-flex items-center gap-1">
                                <ScanLine size={9}/> par {t.used_by.name}
                              </p>
                            )}
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {t.status !== 'cancelled' && (
                            <button onClick={() => resendMutation.mutate(t.id)} disabled={resendMutation.isPending}
                                    title="Renvoyer le ticket par email"
                                    className="p-1.5 hover:bg-public-flame/10 hover:text-public-flame transition disabled:opacity-50">
                              <Send size={14}/>
                            </button>
                          )}
                          {t.status === 'used' && (
                            <button onClick={() => unscanMutation.mutate(t.id)} disabled={unscanMutation.isPending}
                                    title="Annuler le scan"
                                    className="p-1.5 hover:bg-orange-50 hover:text-orange-600 transition disabled:opacity-50">
                              <RotateCcw size={14}/>
                            </button>
                          )}
                          {t.payment_status !== 'refunded' && t.status !== 'cancelled' && (
                            <button onClick={() => setRefundTarget({
                              kind: 'ticket',
                              id: t.id,
                              isPaid: t.payment_status === 'paid',
                              amount: t.price_fcfa,
                            })}
                                    title="Rembourser / annuler"
                                    className="p-1.5 hover:bg-red-50 hover:text-red-600 transition">
                              <RefreshCw size={14}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="px-4 py-3 flex items-center justify-between text-sm border-t" style={{ borderColor: 'var(--adm-border)' }}>
            <span style={{ color: 'var(--adm-text-muted)' }}>
              {pagination.from}-{pagination.to} sur {pagination.total}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                      className="px-3 py-1 border-2 border-public-ink/10 hover:border-public-flame disabled:opacity-30">‹</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.last_page}
                      className="px-3 py-1 border-2 border-public-ink/10 hover:border-public-flame disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      <RefundModal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        target={refundTarget}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets'] })
          queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'tickets', 'stats'] })
          queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'analytics'] })
          queryClient.invalidateQueries({ queryKey: ['admin', 'events', id, 'pending-orders'] })
        }}
      />
    </div>
  )
}

function PaymentsToValidate({ orders, onValidated }) {
  const validateMutation = useMutation({
    mutationFn: (orderCode) => events.validatePayment(orderCode),
    onSuccess: (r) => { toast.success(r.message || 'Validé.'); onValidated?.() },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur.'),
  })
  const refuseMutation = useMutation({
    mutationFn: ({ orderCode, reason }) => events.refusePayment(orderCode, reason),
    onSuccess: (r) => { toast.success(r.message || 'Refusé.'); onValidated?.() },
    onError: (e) => toast.error(e?.response?.data?.message || 'Erreur.'),
  })

  if (orders.length === 0) {
    return (
      <div className="adm-card p-12 text-center" style={{ color: 'var(--adm-text-muted)' }}>
        <Check size={32} className="mx-auto mb-2 text-green-600"/>
        <p className="font-medium text-public-ink">Tout est à jour — aucun paiement en attente.</p>
        <p className="text-xs mt-1">Les nouvelles commandes payantes apparaîtront ici automatiquement.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.order_code} className="adm-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider font-mono text-public-ink/50">N° commande</p>
              <p className="font-mono text-lg font-bold text-public-flame tracking-wider">{o.order_code}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider font-mono text-public-ink/50">Total</p>
              <p className="font-display text-2xl text-public-ink">
                {new Intl.NumberFormat('fr-FR').format(o.total_fcfa)} <span className="text-sm font-mono">FCFA</span>
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3 pt-3 border-t border-public-ink/10">
            <p><strong>{o.full_name}</strong></p>
            <p className="text-right text-public-ink/60">{o.tickets_count} ticket(s)</p>
            <p className="flex items-center gap-1.5 min-w-0">
              <Mail size={12} className="shrink-0 text-public-flame/70"/>
              <span className="truncate">{o.email}</span>
            </p>
            {o.phone && (
              <p className="flex items-center gap-1.5 sm:justify-end">
                <Phone size={12} className="shrink-0 text-public-flame/70"/>
                <span className="font-mono">{o.phone}</span>
              </p>
            )}
          </div>

          <div className="bg-public-bone/40 p-3 mb-3 text-sm space-y-1">
            <p>
              <strong>Méthode :</strong>{' '}
              <span className="font-mono">{o.payment_method ?? <em className="text-orange-600">à renseigner</em>}</span>
            </p>
            <p>
              <strong>Référence :</strong>{' '}
              <span className="font-mono font-bold">{o.payment_reference ?? <em className="text-orange-600">en attente</em>}</span>
            </p>
            {o.payment_proof_path && (
              <p>
                <strong>Preuve :</strong>{' '}
                <a href={`/storage/${o.payment_proof_path}`} target="_blank" rel="noreferrer"
                   className="text-public-flame underline inline-flex items-center gap-1">
                  <FileImage size={11}/> Voir capture
                </a>
              </p>
            )}
            {o.payment_expires_at && (
              <p className="text-xs text-public-ink/60 inline-flex items-center gap-1">
                <Clock size={11}/> Expire {format(new Date(o.payment_expires_at), "d MMM 'à' HH:mm", { locale: fr })}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => validateMutation.mutate(o.order_code)}
                    disabled={!o.has_reference || validateMutation.isPending}
                    title={!o.has_reference ? "L'inscrit n'a pas encore soumis sa référence" : 'Valider et envoyer les tickets'}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white font-mono uppercase text-xs tracking-wider hover:bg-green-700 transition disabled:opacity-40">
              <Check size={14}/> Valider
            </button>
            <button onClick={() => {
              const reason = prompt('Raison du refus :')
              if (reason && reason.trim().length >= 3) {
                refuseMutation.mutate({ orderCode: o.order_code, reason: reason.trim() })
              }
            }}
                    disabled={refuseMutation.isPending}
                    className="inline-flex items-center gap-1 px-3 py-2 border-2 border-red-500 text-red-600 font-mono uppercase text-xs tracking-wider hover:bg-red-50 transition disabled:opacity-40">
              <X size={14}/> Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function WaitlistPanel({ eventId, entries, onRefresh }) {
  const convertMutation = useMutation({
    mutationFn: (id) => events.waitlistConvert(eventId, id),
    onSuccess: (r) => { toast.success(r.message || 'Converti en ticket.'); onRefresh?.() },
    onError: (e) => toast.error(e?.response?.data?.message || 'Conversion impossible.'),
  })
  const removeMutation = useMutation({
    mutationFn: (id) => events.waitlistRemove(eventId, id),
    onSuccess: () => { toast.success('Retiré de la liste.'); onRefresh?.() },
    onError: () => toast.error('Erreur.'),
  })

  if (entries.length === 0) {
    return (
      <div className="adm-card p-12 text-center" style={{ color: 'var(--adm-text-muted)' }}>
        <ListOrdered size={32} className="mx-auto mb-2 opacity-30"/>
        <p className="font-medium text-public-ink">Personne en liste d'attente.</p>
        <p className="text-xs mt-1">Les inscriptions qui dépassent la capacité arriveront ici.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-orange-50 border border-orange-200 text-sm">
        <p className="text-orange-900">
          <strong>{entries.length}</strong> personne{entries.length > 1 ? 's' : ''} en attente.
          Convertis-les en ticket dès qu'une place se libère (annulation, remboursement, capacité augmentée).
        </p>
      </div>

      <div className="adm-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider font-mono"
                 style={{ background: '#FAFAFA', color: 'var(--adm-text-muted)' }}>
            <tr>
              <th className="text-left px-4 py-3 w-16">#</th>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Contact</th>
              <th className="text-center px-4 py-3">Places</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Inscrit le</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((w) => (
              <tr key={w.id} className="border-t" style={{ borderColor: 'var(--adm-border)' }}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 font-bold font-mono">
                    {w.position}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{w.full_name}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-xs">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="flex items-center gap-1.5 min-w-0">
                      <Mail size={11} className="shrink-0 text-public-flame/70"/>
                      <span className="truncate">{w.email}</span>
                    </p>
                    {w.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone size={11} className="shrink-0 text-public-flame/70"/>
                        <span className="font-mono">{w.phone}</span>
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-public-flame/10 text-public-flame">
                    <Ticket size={10}/> {w.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: 'var(--adm-text-muted)' }}>
                  {w.created_at ? format(new Date(w.created_at), "d MMM 'à' HH:mm", { locale: fr }) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => {
                        if (! confirm(`Convertir ${w.full_name} en ticket (${w.quantity} place${w.quantity > 1 ? 's' : ''}) ? Un email sera envoyé.`)) return
                        convertMutation.mutate(w.id)
                      }}
                      disabled={convertMutation.isPending}
                      title="Convertir en ticket + envoi email"
                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white text-[10px] uppercase font-mono tracking-wider hover:bg-green-700 disabled:opacity-50">
                      <Check size={12}/> Émettre
                    </button>
                    <button
                      onClick={() => {
                        if (! confirm('Retirer de la liste d\'attente ?')) return
                        removeMutation.mutate(w.id)
                      }}
                      disabled={removeMutation.isPending}
                      title="Retirer"
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EventAnalyticsTab({ data }) {
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0)
  if (!data) return <div className="adm-card p-12 text-center" style={{ color: 'var(--adm-text-muted)' }}>Chargement…</div>

  const { sales_timeseries = [], types = [], payment_methods = [], funnel = [] } = data

  return (
    <div className="space-y-4">
      {/* Funnel conversion */}
      <div className="adm-card p-4 sm:p-5">
        <h3 className="text-sm font-medium mb-3">Funnel conversion</h3>
        {funnel.length > 0 ? (
          <div className="space-y-2">
            {funnel.map((f, i) => (
              <div key={f.step} className="flex items-center gap-3">
                <p className="text-xs font-mono uppercase tracking-wider w-24" style={{ color: 'var(--adm-text-muted)' }}>
                  {f.step}
                </p>
                <div className="flex-1 h-7 bg-public-ink/5 relative overflow-hidden">
                  <div className="h-full transition-all"
                       style={{
                         width: `${f.rate}%`,
                         background: i === 0 ? '#0EA5E9' : i === 1 ? '#C9A961' : '#16A34A',
                       }}/>
                  <div className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white">
                    {f.count} · {f.rate}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyChart/>}
      </div>

      {/* Ventes cumulées timeseries */}
      <div className="adm-card p-4">
        <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
          <TrendingUp size={14}/> Ventes cumulées
        </h3>
        {sales_timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={sales_timeseries}>
              <CartesianGrid stroke="#eee" strokeDasharray="3 3"/>
              <XAxis dataKey="day" tick={{ fontSize: 10 }}
                     tickFormatter={(d) => format(new Date(d), 'd MMM', { locale: fr })}/>
              <YAxis tick={{ fontSize: 10 }}/>
              <Tooltip
                labelFormatter={(d) => format(new Date(d), "d MMMM yyyy", { locale: fr })}
                formatter={(v, n) => [v, n === 'cumulative_count' ? 'Total cumulé' : 'Du jour']}
                contentStyle={{ fontSize: 12 }}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Line type="monotone" dataKey="cumulative_count" stroke="#8B1A2F" strokeWidth={2}
                    name="Total cumulé" dot={{ r: 2 }}/>
              <Line type="monotone" dataKey="daily_count" stroke="#C9A961" strokeWidth={1.5}
                    name="Du jour" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyChart msg="Pas encore d'inscription."/>}
      </div>

      {/* Donuts row */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <PieIcon size={14}/> Répartition par type
          </h3>
          {types.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={types} dataKey="count" nameKey="type"
                     cx="50%" cy="50%" innerRadius={40} outerRadius={75}>
                  {types.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]}/>
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _, p) => [`${v} (${fmt(p.payload.revenue)} FCFA)`, p.payload.type]}
                  contentStyle={{ fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart/>}
        </div>
        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <CreditCard size={14}/> Méthodes de paiement
          </h3>
          {payment_methods.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={payment_methods} dataKey="count" nameKey="label"
                     cx="50%" cy="50%" outerRadius={75}>
                  {payment_methods.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _, p) => [`${v} (${fmt(p.payload.revenue)} FCFA)`, p.payload.label]}
                  contentStyle={{ fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart msg="Aucun paiement validé."/>}
        </div>
      </div>
    </div>
  )
}

function EmptyChart({ msg = 'Pas encore de données.' }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm italic"
         style={{ color: 'var(--adm-text-muted)' }}>
      {msg}
    </div>
  )
}

/**
 * TabButton — bouton d'onglet compact avec label + icône + badge optionnel.
 * `shrink-0` : ne se rétrécit pas dans le container scrollable horizontal.
 * `whitespace-nowrap` : le label reste sur une ligne.
 */
function TabButton({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs uppercase tracking-wider font-mono border-b-2 transition inline-flex items-center gap-1.5 ${
        active
          ? 'border-public-flame text-public-flame'
          : 'border-transparent text-public-ink/60 hover:text-public-ink'
      }`}
    >
      <Icon size={12} className="shrink-0"/>
      {label}
      {badge != null && (
        <span className="ml-0.5 bg-orange-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

function StatCard({ label, value, suffix, Icon, active = false, onClick }) {
  const isClickable = typeof onClick === 'function'
  const Component = isClickable ? 'button' : 'div'
  return (
    <Component
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`adm-card p-4 text-left transition ${
        isClickable ? 'cursor-pointer hover:border-public-flame/50' : ''
      } ${active ? 'ring-2 ring-public-flame border-public-flame/40' : ''}`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono mb-2"
           style={{ color: active ? '#8B1A2F' : 'var(--adm-text-muted)' }}>
        {Icon && <Icon size={12}/>}
        {label}
      </div>
      <p className="font-display text-3xl" style={{ color: active ? '#8B1A2F' : undefined }}>
        {value}
        {suffix && <span className="text-base font-mono opacity-60">{suffix}</span>}
      </p>
    </Component>
  )
}

// (Ancienne version StatCard remplacée par une version cliquable ci-dessus.)
