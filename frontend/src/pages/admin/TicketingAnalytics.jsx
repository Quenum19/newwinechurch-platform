/**
 * Phase 4 — Page d'analytics globale billetterie.
 *
 *  /admin/billetterie
 *
 * Vue trans-events :
 *  - KPIs cards (events, revenus, conversion, opt-in WhatsApp)
 *  - Liste paiements pending tous events confondus
 *  - Tableau top events
 *  - 3 graphs : revenus mensuels (line) · types (donut) · méthodes paiement (donut)
 *  - Export Excel
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import {
  Ticket, TrendingUp, Users, CreditCard, Calendar, AlertCircle,
  ChevronRight, Download, Loader2, Check, X, FileImage, Mail, Phone, Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { events } from '@/api/admin'

const PALETTE = ['#8B1A2F', '#C9A961', '#0A0908', '#6F4F2C', '#A36C3B', '#3D2A1E']

export default function TicketingAnalytics() {
  const { data: overview } = useQuery({
    queryKey: ['admin', 'ticketing', 'overview'],
    queryFn: events.analyticsOverview,
    refetchInterval: 60_000,
  })
  const { data: revenueMonthly } = useQuery({
    queryKey: ['admin', 'ticketing', 'revenue-monthly'],
    queryFn: events.analyticsRevenueMonthly,
  })
  const { data: paymentMethods } = useQuery({
    queryKey: ['admin', 'ticketing', 'payment-methods'],
    queryFn: events.analyticsPaymentMethods,
  })
  const { data: typesBreakdown } = useQuery({
    queryKey: ['admin', 'ticketing', 'types-breakdown'],
    queryFn: events.analyticsTypesBreakdown,
  })
  const { data: pendingOrders } = useQuery({
    queryKey: ['admin', 'ticketing', 'pending-orders-all'],
    queryFn: events.analyticsPendingOrdersAll,
    refetchInterval: 60_000,
  })

  const exportMutation = useMutation({
    mutationFn: () => events.analyticsExport(),
    onSuccess: () => toast.success('Export lancé.'),
    onError: () => toast.error('Export échoué.'),
  })

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0)
  const pending = pendingOrders?.data ?? []

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Analytics billetterie</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Vue d'ensemble tous événements confondus.
          </p>
        </div>
        <button onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider font-mono border-2 border-public-ink/15 hover:border-public-flame hover:text-public-flame transition disabled:opacity-50">
          {exportMutation.isPending ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
          Export Excel
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Événements ticketés" value={overview?.events_count ?? 0}
                 suffix={overview?.upcoming_count ? ` · ${overview.upcoming_count} à venir` : null}
                 Icon={Calendar}/>
        <KpiCard label="Revenus payés"
                 value={fmt(overview?.paid_revenue)}
                 suffix=" FCFA"
                 hint={overview?.pending_revenue > 0
                   ? `+${fmt(overview.pending_revenue)} en attente`
                   : null}
                 Icon={TrendingUp}/>
        <KpiCard label="Tickets vendus"
                 value={overview?.issued_tickets ?? 0}
                 suffix={overview?.scanned ? ` · ${overview.scanned} entrés` : null}
                 Icon={Ticket}/>
        <KpiCard label="Conversion 30j"
                 value={`${overview?.conversion_rate ?? 0}%`}
                 hint={`WhatsApp opt-in ${overview?.wa_opt_in_rate ?? 0}%`}
                 Icon={Users}/>
      </div>

      {/* Pending paiements TOUS events confondus */}
      {pending.length > 0 && (
        <div className="adm-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="inline-flex items-center gap-2">
              <AlertCircle size={18} className="text-orange-600"/>
              {pending.length} paiement{pending.length > 1 ? 's' : ''} à valider
            </h2>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 5).map((o) => (
              <Link key={o.order_code}
                    to={`/admin/evenements/${o.event?.id}/billetterie`}
                    className="flex items-center justify-between gap-3 p-3 border-2 border-orange-200 bg-orange-50/30 hover:border-orange-400 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-orange-700">{o.order_code}</p>
                    {o.has_reference && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 font-mono uppercase tracking-wider">
                        ref. soumise
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5">
                    <strong>{o.full_name}</strong>
                    <span className="opacity-60"> · {o.tickets_count} place(s) · {o.event?.title}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-xl text-public-ink">{fmt(o.total_fcfa)}<span className="text-xs ml-1 font-mono">FCFA</span></p>
                  <ChevronRight size={14} className="text-orange-500 ml-auto mt-1"/>
                </div>
              </Link>
            ))}
            {pending.length > 5 && (
              <p className="text-xs text-center mt-2" style={{ color: 'var(--adm-text-muted)' }}>
                +{pending.length - 5} autres — clique sur un event pour aller au dashboard.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenus mensuels */}
        <div className="adm-card p-4 lg:col-span-2">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <TrendingUp size={14}/> Revenus mensuels (12 mois)
          </h3>
          {revenueMonthly?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueMonthly.data}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3"/>
                <XAxis dataKey="label" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip
                  formatter={(v) => [`${fmt(v)} FCFA`, 'Revenu']}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 12 }}/>
                <Line type="monotone" dataKey="revenue" stroke="#8B1A2F" strokeWidth={2} dot={{ r: 3 }}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart/>}
        </div>

        {/* Types donut */}
        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3">Répartition par type</h3>
          {typesBreakdown?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typesBreakdown.data} dataKey="count" nameKey="type"
                     cx="50%" cy="50%" innerRadius={40} outerRadius={75}>
                  {typesBreakdown.data.map((entry, i) => (
                    <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]}/>
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _n, p) => [`${v} ticket(s)`, p.payload.type]}
                  contentStyle={{ fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart/>}
        </div>
      </div>

      {/* Methods donut + Top events */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <CreditCard size={14}/> Méthodes de paiement
          </h3>
          {paymentMethods?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentMethods.data} dataKey="count" nameKey="label"
                     cx="50%" cy="50%" outerRadius={75}>
                  {paymentMethods.data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _n, p) => [`${v} (${fmt(p.payload.revenue)} FCFA)`, p.payload.label]}
                  contentStyle={{ fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart msg="Aucun paiement validé pour le moment."/>}
        </div>

        {/* Top events */}
        <div className="adm-card p-4 lg:col-span-2">
          <h3 className="text-sm font-medium mb-3">Top événements (revenus)</h3>
          {overview?.top_events?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider font-mono"
                       style={{ color: 'var(--adm-text-muted)' }}>
                  <tr>
                    <th className="text-left py-2">Événement</th>
                    <th className="text-right py-2">Inscrits</th>
                    <th className="text-right py-2 hidden sm:table-cell">Remplis.</th>
                    <th className="text-right py-2">Revenus</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.top_events.map((e) => (
                    <tr key={e.id} className="border-t" style={{ borderColor: 'var(--adm-border)' }}>
                      <td className="py-2">
                        <Link to={`/admin/evenements/${e.id}/billetterie`}
                              className="hover:text-public-flame transition flex items-center gap-1.5">
                          <span className={e.is_past ? 'opacity-60' : ''}>{e.title}</span>
                          {e.is_past && (
                            <span className="text-[9px] px-1 py-0.5 bg-zinc-200 text-zinc-600 font-mono uppercase">passé</span>
                          )}
                        </Link>
                      </td>
                      <td className="text-right py-2 tabular-nums">{e.sold}{e.capacity ? `/${e.capacity}` : ''}</td>
                      <td className="text-right py-2 tabular-nums hidden sm:table-cell">
                        {e.fill_rate != null ? `${e.fill_rate}%` : '—'}
                      </td>
                      <td className="text-right py-2 font-mono text-public-flame">{fmt(e.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyChart/>}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, suffix, hint, Icon }) {
  return (
    <div className="adm-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono mb-2"
           style={{ color: 'var(--adm-text-muted)' }}>
        {Icon && <Icon size={12}/>}
        {label}
      </div>
      <p className="font-display text-2xl lg:text-3xl">
        {value}
        {suffix && <span className="text-xs font-mono opacity-60 ml-1">{suffix}</span>}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>{hint}</p>
      )}
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
