/**
 * Dashboard admin — Refonte 2026 (style Linear/Notion/Stripe).
 *
 * Palette claire, Inter, KPIs sobres, charts neutres, mobile-first.
 * Pas de "text-script" décoratif, pas de gold-400 omniprésent.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, HandCoins, Calendar, Bell, AlertCircle, CheckCircle2,
  TrendingUp, MessageSquare, ArrowUpRight, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

import { dashboard } from '@/api/admin'

const formatFCFA = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
const formatShort = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `${(v / 1_000).toFixed(0)}k`
  : String(v)

const TICK = { fill: '#71717A', fontSize: 11 }
const TOOLTIP_STYLE = {
  background: '#fff',
  border: '1px solid #E4E4E7',
  borderRadius: 8,
  fontSize: 12,
  padding: 8,
}

export default function AdminDashboard() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: dashboard.stats,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonRow />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  const k = data?.kpis ?? {}

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* === Header sobre === */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1>Tableau de bord</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Vue d'ensemble · Données rafraîchies toutes les 60 secondes
            {data?.generated_at && (
              <>
                <span className="mx-2">·</span>
                <span className="text-xs">
                  généré à {new Date(data.generated_at).toLocaleTimeString('fr-FR')}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="adm-btn adm-btn-secondary"
          aria-label="Rafraîchir"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Rafraîchir</span>
        </button>
      </header>

      {/* === Bandeau alertes === */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--adm-text-muted)' }}>
          Actions requises
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AlertCard
            icon={AlertCircle}
            label="Dons en attente"
            value={k.donations?.pending_count ?? 0}
            to="/admin/dons?status=pending"
          />
          <AlertCard
            icon={Bell}
            label="Rapports cellule"
            value={k.community?.pending_reports ?? 0}
            to="/admin/cellules"
          />
          <AlertCard
            icon={MessageSquare}
            label="Nouvelles prières"
            value={k.community?.new_prayers ?? 0}
            to="/admin/prieres"
          />
          <AlertCard
            icon={MessageSquare}
            label="Messages contact"
            value={k.community?.unread_contacts ?? 0}
            to="/admin/contact"
          />
        </div>
      </section>

      {/* === KPIs principaux === */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--adm-text-muted)' }}>
          Indicateurs clés
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={Users}
            label="Membres"
            value={(k.members?.total ?? 0).toLocaleString('fr-FR')}
            subtitle={`${k.members?.active ?? 0} actifs · ${k.members?.pending ?? 0} en attente`}
            accent={k.members?.new_30d > 0 ? `+${k.members.new_30d} ce mois` : null}
            to="/admin/membres"
          />
          <KpiCard
            icon={HandCoins}
            label="Dons (mois)"
            value={formatFCFA(k.donations?.this_month)}
            subtitle={`${formatFCFA(k.donations?.this_year)} cumulés cette année`}
            accent={
              k.donations?.pending_count > 0
                ? `${k.donations.pending_count} à confirmer`
                : 'À jour'
            }
            accentTone={k.donations?.pending_count > 0 ? 'warning' : 'success'}
            to="/admin/dons"
          />
          <KpiCard
            icon={Calendar}
            label="Événements"
            value={k.content?.upcoming_events ?? 0}
            subtitle={`${k.content?.published_sermons ?? 0} sermons publiés`}
            accent={`${(k.content?.total_sermon_views ?? 0).toLocaleString('fr-FR')} vues totales`}
            to="/admin/evenements"
          />
          <KpiCard
            icon={Users}
            label="Cellules actives"
            value={k.community?.active_cells ?? 0}
            subtitle="Vie communautaire"
            accent={k.members?.verified
              ? `${Math.round((k.members.verified / k.members.total) * 100)}% emails vérifiés`
              : null}
            to="/admin/cellules"
          />
        </div>
      </section>

      {/* === Graphiques === */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--adm-text-muted)' }}>
          Tendances
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Croissance des membres" subtitle="12 derniers mois">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.charts?.members_growth ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="memberGradAdm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B1A2F" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#8B1A2F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F4F4F5" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#E4E4E7' }} />
                <Area type="monotone" dataKey="count" stroke="#8B1A2F" strokeWidth={2} fill="url(#memberGradAdm)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Dons mensuels" subtitle="12 derniers mois (confirmés)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.charts?.donations_month ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#F4F4F5" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: '#FAFAFA' }}
                  formatter={(v) => formatFCFA(v)}
                />
                <Bar dataKey="total" fill="#8B1A2F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>
    </div>
  )
}

/* ============== Composants internes ============== */

function KpiCard({ icon: Icon, label, value, subtitle, accent, accentTone, to }) {
  const Wrapper = to ? Link : 'div'
  const accentColor =
    accentTone === 'warning' ? 'var(--adm-warning)' :
    accentTone === 'success' ? 'var(--adm-success)' :
    'var(--adm-text-muted)'

  return (
    <Wrapper
      to={to}
      className="adm-card p-4 sm:p-5 group block hover:shadow-sm transition"
      style={{ borderColor: 'var(--adm-border)' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] uppercase tracking-wider font-medium"
          style={{ color: 'var(--adm-text-faint)' }}
        >
          {label}
        </span>
        <Icon
          size={16}
          style={{ color: 'var(--adm-text-faint)' }}
          className="group-hover:opacity-100 opacity-60 transition"
        />
      </div>
      <div
        className="mt-3 text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight truncate"
        style={{ color: 'var(--adm-text)' }}
      >
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--adm-text-muted)' }}>
        {subtitle}
      </div>
      {accent && (
        <div
          className="mt-3 text-xs flex items-center gap-1 font-medium"
          style={{ color: accentColor }}
        >
          {accentTone === 'success' ? <CheckCircle2 size={12} /> : <TrendingUp size={12} />}
          {accent}
        </div>
      )}
    </Wrapper>
  )
}

function AlertCard({ icon: Icon, label, value, to }) {
  const isOk = value === 0
  return (
    <Link
      to={to ?? '#'}
      className="adm-card p-3 sm:p-4 flex items-center gap-3 hover:shadow-sm transition group"
    >
      {isOk ? (
        <CheckCircle2 size={18} style={{ color: 'var(--adm-success)' }} className="shrink-0" />
      ) : (
        <span
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
        >
          <Icon size={16} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className="text-[11px] uppercase tracking-wider truncate"
          style={{ color: 'var(--adm-text-faint)' }}
        >
          {label}
        </p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--adm-text)' }}>
          {isOk ? 'À jour' : value}
        </p>
      </div>
      <ArrowUpRight
        size={14}
        style={{ color: 'var(--adm-text-faint)' }}
        className="opacity-0 group-hover:opacity-100 transition shrink-0"
      />
    </Link>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="adm-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold" style={{ color: 'var(--adm-text)' }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text-muted)' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function SkeletonCard() {
  return <div className="adm-card p-5 h-[120px] animate-pulse" />
}
function SkeletonRow() {
  return (
    <div className="h-12 rounded animate-pulse" style={{ background: '#F4F4F5', maxWidth: 320 }} />
  )
}
