/**
 * Sprint C — Dashboard billetterie 360°.
 *
 *   /admin/billetterie/vue-360
 *
 * Vue temps réel unifiée pour pasteur / RH / trésorier / admin :
 *   1. KPIs globaux (tickets vendus, revenus, conversion, panier moyen,
 *      prochain event, actions en attente) + variation vs mois précédent.
 *   2. Timeline revenus 30j (LineChart : revenu quotidien + cumul mois).
 *   3. Répartition paiements (PieChart : Mobile Money / CinetPay / cash / gratuit).
 *   4. Top 5 events performants du mois (table cliquable).
 *   5. Alertes actives (events à 90%+, pending > 24h, tickets non-scannés J-1).
 *   6. Segmentation clients (BarChart : nouveaux / anciens / non-membres).
 *   7. Taux no-show pour events passés (BarChart).
 *   8. Métriques scan temps réel (widget si events du jour).
 *
 * Permissions : `view billetterie dashboard` (côté backend).
 * Rafraîchissement : polling 60s via React Query.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import {
  Ticket, TrendingUp, TrendingDown, Users, CreditCard, Calendar, AlertCircle,
  AlertTriangle, ChevronRight, Download, Loader2, Wallet, Clock,
  ArrowUpRight, ArrowDownRight, Activity, PieChart as PieIcon, BarChart2,
  Bell, UserCheck, Radio,
} from 'lucide-react'

import { events } from '@/api/admin'

// Palette bordeaux/gold utilisée pour les graphiques.
const PALETTE = ['#8B1A2F', '#C9A961', '#6F4F2C', '#A36C3B', '#3D2A1E', '#0A0908']

// Formats FR.
const nfInt = new Intl.NumberFormat('fr-FR')
const fmtInt = (n) => nfInt.format(n ?? 0)
const fmtFcfa = (n) => `${nfInt.format(n ?? 0)} FCFA`

export default function TicketingDashboard360() {
  // Sélecteur de période (impacte la répartition paiements).
  const [period, setPeriod] = useState('month')
  const [timelineDays, setTimelineDays] = useState(30)

  // Export mensuel — année/mois par défaut = mois en cours.
  const now = new Date()
  const [expYear,  setExpYear]  = useState(now.getFullYear())
  const [expMonth, setExpMonth] = useState(now.getMonth() + 1)

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['bill360', 'kpis'],
    queryFn: events.dashboard360Kpis,
    refetchInterval: 60_000,
  })
  const { data: timeline } = useQuery({
    queryKey: ['bill360', 'timeline', timelineDays],
    queryFn: () => events.dashboard360Timeline(timelineDays),
    refetchInterval: 60_000,
  })
  const { data: paymentBreakdown } = useQuery({
    queryKey: ['bill360', 'payments', period],
    queryFn: () => events.dashboard360PaymentBreakdown(period),
    refetchInterval: 60_000,
  })
  const { data: topEvents } = useQuery({
    queryKey: ['bill360', 'top-events'],
    queryFn: () => events.dashboard360TopEvents(5),
    refetchInterval: 60_000,
  })
  const { data: alerts } = useQuery({
    queryKey: ['bill360', 'alerts'],
    queryFn: events.dashboard360Alerts,
    refetchInterval: 60_000,
  })
  const { data: segmentation } = useQuery({
    queryKey: ['bill360', 'segmentation'],
    queryFn: events.dashboard360Segmentation,
    refetchInterval: 60_000,
  })
  const { data: noShow } = useQuery({
    queryKey: ['bill360', 'no-show'],
    queryFn: events.dashboard360NoShow,
    refetchInterval: 120_000,
  })
  const { data: liveScans } = useQuery({
    queryKey: ['bill360', 'live-scans'],
    queryFn: events.dashboard360LiveScans,
    refetchInterval: 30_000,
  })

  const exportMutation = useMutation({
    mutationFn: () => events.dashboard360ExportMonthly(expYear, expMonth),
    onSuccess: () => toast.success('Export lancé.'),
    onError:   () => toast.error('Export échoué.'),
  })

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2">
            <Radio size={20} className="text-red-500 animate-pulse"/>
            Dashboard billetterie 360°
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Vue temps réel unifiée — refresh auto toutes les 60s.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodSwitcher value={period} onChange={setPeriod}/>
          <MonthExportPicker
            year={expYear}   onYearChange={setExpYear}
            month={expMonth} onMonthChange={setExpMonth}
            isPending={exportMutation.isPending}
            onExport={() => exportMutation.mutate()}
          />
        </div>
      </header>

      {/* ==================== SECTION 1 : KPIs ==================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Tickets ce mois"
          value={loadingKpis ? '…' : fmtInt(kpis?.tickets_current)}
          variationPct={kpis?.tickets_variation_pct}
          hint={`vs ${fmtInt(kpis?.tickets_previous)} mois dernier`}
          Icon={Ticket}
        />
        <KpiCard
          label="Revenus ce mois"
          value={loadingKpis ? '…' : fmtInt(kpis?.revenue_current)}
          suffix="FCFA"
          variationPct={kpis?.revenue_variation_pct}
          hint={`vs ${fmtInt(kpis?.revenue_previous)} FCFA mois dernier`}
          Icon={TrendingUp}
        />
        <KpiCard
          label="Panier moyen"
          value={loadingKpis ? '…' : fmtInt(kpis?.average_basket)}
          suffix="FCFA"
          hint={
            kpis?.conversion_rate != null
              ? `Conversion : ${kpis.conversion_rate}%`
              : 'Conversion : N/A'
          }
          Icon={Wallet}
        />
        {kpis?.next_event ? (
          <Link
            to={`/admin/evenements/${kpis.next_event.id}/billetterie`}
            className="adm-card p-4 transition hover:shadow-md hover:-translate-y-[1px]"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono mb-2"
                 style={{ color: 'var(--adm-text-muted)' }}>
              <Calendar size={12}/> Prochain event
            </div>
            <p className="font-display text-lg leading-tight line-clamp-1">
              {kpis.next_event.title}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>
              Dans {Math.max(0, kpis.next_event.days_left)} j
              {kpis.next_event.fill_rate != null && (
                <> · remplissage {kpis.next_event.fill_rate}%</>
              )}
            </p>
          </Link>
        ) : (
          <KpiCard
            label="Prochain event"
            value="Aucun"
            hint="Pas d'event ticketé à venir"
            Icon={Calendar}
          />
        )}
      </section>

      {/* Bandeau actions en attente (visible seulement si >0) */}
      {(kpis?.pending_payments ?? 0) > 0 && (
        <div className="adm-card p-3 sm:p-4 border-2 border-orange-200 bg-orange-50/40">
          <div className="flex flex-wrap items-center gap-3">
            <Bell size={16} className="text-orange-600 shrink-0"/>
            <p className="text-sm">
              <strong>{fmtInt(kpis.pending_payments)}</strong> paiement(s) en attente
              {kpis.pending_over_24h > 0 && (
                <span className="text-orange-700 ml-1">
                  · {fmtInt(kpis.pending_over_24h)} depuis +24h
                </span>
              )}
            </p>
            <Link to="/admin/billetterie"
                  className="ml-auto text-xs uppercase tracking-wider font-mono
                             px-3 py-1.5 border-2 border-orange-300
                             hover:border-orange-600 hover:text-orange-700 transition">
              Aller valider →
            </Link>
          </div>
        </div>
      )}

      {/* ==================== SECTION 2 & 3 : Timeline + Répartition ==================== */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Timeline revenus */}
        <div className="adm-card p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-medium inline-flex items-center gap-2">
              <TrendingUp size={14}/> Revenus {timelineDays} derniers jours
            </h3>
            <div className="flex gap-1">
              {[30, 60, 90].map(d => (
                <button key={d}
                  onClick={() => setTimelineDays(d)}
                  className={`text-[10px] uppercase tracking-wider font-mono px-2 py-1 border-2
                    ${timelineDays === d
                      ? 'border-public-flame text-public-flame'
                      : 'border-public-ink/15 hover:border-public-flame/60'}`}
                >{d}j</button>
              ))}
            </div>
          </div>
          {timeline?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timeline.data}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3"/>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.floor(timeline.data.length / 8)}/>
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip
                  formatter={(v, n) => [fmtFcfa(v), n === 'revenue' ? 'Revenu jour' : 'Cumul mois']}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Line type="monotone" dataKey="revenue"          name="Revenu jour" stroke="#8B1A2F" strokeWidth={2} dot={{ r: 2 }}/>
                <Line type="monotone" dataKey="month_cumulative" name="Cumul mois" stroke="#C9A961" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart/>}
        </div>

        {/* Répartition paiements */}
        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <PieIcon size={14}/> Répartition paiements
          </h3>
          {paymentBreakdown?.data?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown.data}
                    dataKey="count" nameKey="label"
                    cx="50%" cy="50%" innerRadius={40} outerRadius={75}
                  >
                    {paymentBreakdown.data.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, _n, p) => [
                      `${v} ticket(s) · ${fmtFcfa(p.payload.revenue)}`,
                      p.payload.label,
                    ]}
                    contentStyle={{ fontSize: 12 }}/>
                  <Legend wrapperStyle={{ fontSize: 10 }}/>
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-center mt-2 tabular-nums"
                 style={{ color: 'var(--adm-text-muted)' }}>
                Total : <strong>{fmtInt(paymentBreakdown.total_count)}</strong> tickets ·{' '}
                <strong>{fmtFcfa(paymentBreakdown.total_revenue)}</strong>
              </p>
            </>
          ) : <EmptyChart msg="Aucun paiement sur la période."/>}
        </div>
      </div>

      {/* ==================== SECTION 4 & 5 : Top events + Alertes ==================== */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="adm-card p-4 lg:col-span-2">
          <h3 className="text-sm font-medium mb-3">Top 5 events du mois</h3>
          {topEvents?.data?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider font-mono"
                       style={{ color: 'var(--adm-text-muted)' }}>
                  <tr>
                    <th className="text-left py-2">Événement</th>
                    <th className="text-right py-2">Vendus</th>
                    <th className="text-right py-2 hidden sm:table-cell">Remplis.</th>
                    <th className="text-right py-2">Revenus</th>
                  </tr>
                </thead>
                <tbody>
                  {topEvents.data.map((e) => (
                    <tr key={e.id} className="border-t" style={{ borderColor: 'var(--adm-border)' }}>
                      <td className="py-2">
                        <Link to={`/admin/evenements/${e.id}/billetterie`}
                              className="hover:text-public-flame transition">
                          {e.title}
                        </Link>
                      </td>
                      <td className="text-right py-2 tabular-nums">
                        {e.sold}{e.capacity ? `/${e.capacity}` : ''}
                      </td>
                      <td className="text-right py-2 tabular-nums hidden sm:table-cell">
                        {e.fill_rate != null ? `${e.fill_rate}%` : '—'}
                      </td>
                      <td className="text-right py-2 font-mono text-public-flame">
                        {fmtInt(e.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyChart msg="Aucun event vendu ce mois."/>}
        </div>

        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <AlertCircle size={14}/> Alertes actives
            {alerts?.total > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 font-mono uppercase tracking-wider">
                {alerts.total}
              </span>
            )}
          </h3>
          {alerts?.data?.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {alerts.data.map((a, i) => (
                <Link key={i} to={a.link ?? '#'} className={`
                  block p-2.5 border-2 transition
                  ${a.severity === 'critical' ? 'border-red-200 bg-red-50/40 hover:border-red-500'
                    : a.severity === 'warning' ? 'border-orange-200 bg-orange-50/30 hover:border-orange-500'
                    : 'border-zinc-200 bg-zinc-50/40 hover:border-zinc-500'}
                `}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={12} className={
                      a.severity === 'critical' ? 'text-red-600'
                        : a.severity === 'warning' ? 'text-orange-600'
                        : 'text-zinc-500'
                    }/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight">{a.title}</p>
                      <p className="text-[11px] mt-0.5 opacity-70">{a.detail}</p>
                    </div>
                    <ChevronRight size={12} className="mt-0.5 opacity-50"/>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-xs italic gap-2"
                 style={{ color: 'var(--adm-text-muted)' }}>
              <UserCheck size={24} className="text-green-500 opacity-60"/>
              Rien à signaler.
            </div>
          )}
        </div>
      </div>

      {/* ==================== SECTION 6 & 7 : Segmentation + No-show ==================== */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <Users size={14}/> Segmentation clients
          </h3>
          {segmentation?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={segmentation.data} layout="vertical"
                        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3"/>
                <XAxis type="number" tick={{ fontSize: 10 }}/>
                <YAxis dataKey="segment" type="category" tick={{ fontSize: 11 }} width={110}/>
                <Tooltip
                  formatter={(v, _n, p) => [`${v} clients · ${p.payload.tickets} tickets`, p.payload.segment]}
                  contentStyle={{ fontSize: 12 }}/>
                <Bar dataKey="count" fill="#8B1A2F" radius={[0, 4, 4, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart/>}
        </div>

        <div className="adm-card p-4">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <BarChart2 size={14}/> Taux no-show (events passés)
          </h3>
          {noShow?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={noShow.data}
                        margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3"/>
                <XAxis dataKey="title" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60}
                       tickFormatter={(v) => v.length > 14 ? v.slice(0, 12) + '…' : v}/>
                <YAxis tick={{ fontSize: 10 }} unit="%"/>
                <Tooltip
                  formatter={(v, n, p) => [
                    `${v}% (${p.payload.no_show} / ${p.payload.issued})`,
                    n === 'no_show_rate' ? 'No-show' : 'Présents',
                  ]}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 10 }}/>
                <Bar dataKey="show_rate"    name="Présents" stackId="a" fill="#6F4F2C"/>
                <Bar dataKey="no_show_rate" name="No-show"  stackId="a" fill="#8B1A2F"/>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart msg="Aucun event passé."/>}
        </div>
      </div>

      {/* ==================== SECTION 8 : Scans temps réel ==================== */}
      {liveScans?.has_events_today && (
        <div className="adm-card p-4 border-2 border-red-100">
          <h3 className="text-sm font-medium mb-3 inline-flex items-center gap-2">
            <Activity size={14} className="text-red-500 animate-pulse"/>
            Scans temps réel — events du jour
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveScans.data.map((e) => (
              <Link key={e.id}
                    to={`/admin/evenements/${e.id}/billetterie`}
                    className="border-2 border-adm-border p-3 hover:border-public-flame transition">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-1">{e.title}</p>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-red-600">LIVE</span>
                </div>
                <div className="mt-2 flex items-end gap-3">
                  <p className="font-display text-2xl">
                    {fmtInt(e.scanned)}
                    <span className="text-xs opacity-60 font-mono ml-1">/ {fmtInt(e.issued)}</span>
                  </p>
                  <div className="flex-1">
                    <div className="h-2 bg-zinc-100 rounded overflow-hidden">
                      <div className="h-full bg-red-500 transition-all"
                           style={{ width: `${e.progress_pct}%` }}/>
                    </div>
                    <p className="text-[10px] mt-1 opacity-60 tabular-nums">
                      {e.progress_pct}% scannés · {fmtInt(e.scanned_last_hour)} dans la dernière heure
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
//  Sous-composants
// ============================================================

/** Carte KPI générique. */
function KpiCard({ label, value, suffix, hint, variationPct, Icon }) {
  const showVar = variationPct != null && Number.isFinite(variationPct)
  const isUp    = showVar && variationPct >= 0
  return (
    <div className="adm-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-mono mb-2"
           style={{ color: 'var(--adm-text-muted)' }}>
        {Icon && <Icon size={12}/>}
        {label}
      </div>
      <p className="font-display text-2xl lg:text-3xl tabular-nums">
        {value}
        {suffix && <span className="text-xs font-mono opacity-60 ml-1">{suffix}</span>}
      </p>
      <div className="flex items-center justify-between mt-1">
        {hint && (
          <p className="text-[11px]" style={{ color: 'var(--adm-text-muted)' }}>{hint}</p>
        )}
        {showVar && (
          <span className={`text-[11px] tabular-nums font-mono inline-flex items-center gap-0.5
            ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
            {isUp ? '+' : ''}{variationPct}%
          </span>
        )}
      </div>
    </div>
  )
}

/** Bouton de sélection de période. */
function PeriodSwitcher({ value, onChange }) {
  const opts = [
    { key: 'month',         label: 'Ce mois'      },
    { key: 'last_month',    label: 'Mois dernier' },
    { key: 'last_3_months', label: '3 mois'       },
    { key: 'year',          label: 'Année'        },
  ]
  return (
    <div className="inline-flex overflow-hidden border-2 border-public-ink/15">
      {opts.map((o) => (
        <button key={o.key}
                onClick={() => onChange(o.key)}
                className={`text-[10px] uppercase tracking-wider font-mono px-2.5 py-1.5 transition
                  ${value === o.key
                    ? 'bg-public-ink text-white'
                    : 'hover:text-public-flame'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Sélecteur année/mois + bouton d'export. */
function MonthExportPicker({ year, onYearChange, month, onMonthChange, isPending, onExport }) {
  const nowYear = new Date().getFullYear()
  const years   = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => nowYear - 4 + i), [nowYear])
  const months  = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ]
  return (
    <div className="inline-flex items-center gap-1.5">
      <select value={month} onChange={(e) => onMonthChange(Number(e.target.value))}
              className="adm-input text-xs px-2 py-1.5 border-2 border-public-ink/15 bg-transparent">
        {months.map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
      <select value={year} onChange={(e) => onYearChange(Number(e.target.value))}
              className="adm-input text-xs px-2 py-1.5 border-2 border-public-ink/15 bg-transparent">
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button onClick={onExport} disabled={isPending}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono
                         px-3 py-1.5 border-2 border-public-ink/15
                         hover:border-public-flame hover:text-public-flame transition
                         disabled:opacity-50">
        {isPending ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
        Export
      </button>
    </div>
  )
}

/** Placeholder pour un graphique vide. */
function EmptyChart({ msg = 'Pas encore de données.' }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm italic"
         style={{ color: 'var(--adm-text-muted)' }}>
      {msg}
    </div>
  )
}
