/**
 * Rapport post-event — bilan de présence.
 *
 *  - KPI cards : attendus / présents / no-shows / taux
 *  - Retard moyen & médian (basé sur starts_at)
 *  - BarChart arrivées par tranche de 15 min
 *  - Table des no-shows + export CSV
 *  - Bouton retour vers la liste de présence live
 *
 * Endpoint : GET /api/admin/events/{id}/attendance/report
 * Accessible seulement après le début de l'event (409 sinon).
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Users, UserCheck, UserX, Percent, Clock, Download,
  TrendingUp, AlertTriangle, ArrowRight, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

import { fetchAttendanceReport } from '@/api/attendance.js'

export default function EventAttendanceReportPage() {
  const { t, i18n } = useTranslation()
  const { id: eventId } = useParams()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const data = await fetchAttendanceReport(eventId)
      setReport(data)
      setError(null)
    } catch (e) {
      if (e?.response?.status === 409) {
        setError(t('attendance.report.tooEarly', "Le rapport n'est disponible qu'après le début de l'événement."))
      } else {
        setError(e?.response?.data?.message || t('attendance.report.error', 'Impossible de charger le rapport.'))
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const event = report?.event ?? {}
  const kpi   = report?.kpi ?? {}
  const noShows = report?.no_shows ?? []

  const chartData = useMemo(() => {
    const b = report?.buckets_15m
    if (!b || typeof b !== 'object') return []
    return Object.entries(b)
      .sort(([a], [b2]) => a.localeCompare(b2))
      .map(([time, count]) => ({ time, arrivees: count }))
  }, [report])

  const exportNoShowsCsv = () => {
    if (!noShows.length) {
      toast.error(t('attendance.report.noNoShows', 'Aucun no-show à exporter.'))
      return
    }
    const header = ['Nom', 'Prénom', 'Téléphone', 'Email', 'Code court', 'Type ticket']
    const lines = noShows.map((r) => [
      r.last_name || '',
      r.first_name || '',
      r.phone || '',
      r.email || '',
      r.short_code || '',
      r.ticket_type || '',
    ].map(escapeCsv).join(','))
    const csv = '﻿' + [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `no-shows-${event.slug || event.id || 'event'}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    toast.success(t('attendance.report.csvDone', 'Export CSV téléchargé.'))
  }

  if (loading) {
    return (
      <div className="adm-card p-16 text-center text-zinc-500 max-w-3xl">
        {t('attendance.loading', 'Chargement…')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Link
          to={`/admin/evenements/${eventId}/presence`}
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--adm-accent)] hover:underline"
        >
          <ArrowLeft size={14} /> {t('attendance.report.backLive', 'Retour à la liste live')}
        </Link>
        <div className="adm-card p-8 text-center">
          <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
          <p className="text-base font-semibold text-zinc-800">{error}</p>
          <button
            onClick={() => { setRefreshing(true); load() }}
            disabled={refreshing}
            className="mt-4 adm-btn adm-btn-ghost"
          >
            {refreshing ? t('attendance.loading', 'Chargement…') : t('attendance.refresh', 'Actualiser')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl">
      {/* ── Retour + header ── */}
      <Link
        to={`/admin/evenements/${eventId}/presence`}
        className="inline-flex items-center gap-1.5 text-sm text-[color:var(--adm-accent)] hover:underline"
      >
        <ArrowLeft size={14} /> {t('attendance.report.backLive', 'Retour à la liste live')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="tag-mono text-[10px] uppercase tracking-widest text-[color:var(--adm-accent)]">
            <BarChart3 size={12} className="inline mr-1" /> {t('attendance.report.tag', 'Rapport de présence')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: 'var(--adm-text)' }}>
            {event.title || '—'}
          </h1>
          {event.starts_at && (
            <p className="mt-1 text-sm text-zinc-500">
              {new Date(event.starts_at).toLocaleString(i18n.language, {
                dateStyle: 'medium', timeStyle: 'short',
              })}
              {event.location ? ` · ${event.location}` : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => { setRefreshing(true); load() }}
          disabled={refreshing}
          className="adm-btn adm-btn-ghost"
        >
          {refreshing ? t('attendance.loading', 'Chargement…') : t('attendance.refresh', 'Actualiser')}
        </button>
      </header>

      {/* ── KPI cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={<Users size={14} />}
          label={t('attendance.report.kpi.expected', 'Attendus')}
          value={kpi.total_expected ?? 0}
        />
        <KpiCard
          icon={<UserCheck size={14} />}
          label={t('attendance.report.kpi.arrived', 'Présents')}
          value={kpi.total_arrived ?? 0}
          accent
        />
        <KpiCard
          icon={<UserX size={14} />}
          label={t('attendance.report.kpi.noShows', 'No-shows')}
          value={kpi.no_shows_count ?? 0}
          danger
        />
        <KpiCard
          icon={<Percent size={14} />}
          label={t('attendance.report.kpi.rate', 'Taux de présence')}
          value={`${kpi.taux_presence ?? 0}%`}
        />
      </section>

      {/* ── Retards ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <SmallStat
          icon={<Clock size={14} />}
          label={t('attendance.report.kpi.avgDelay', 'Retard moyen')}
          value={formatDelay(kpi.avg_delay_min, t)}
        />
        <SmallStat
          icon={<Clock size={14} />}
          label={t('attendance.report.kpi.medianDelay', 'Retard médian')}
          value={formatDelay(kpi.median_delay_min, t)}
        />
        <SmallStat
          icon={<TrendingUp size={14} />}
          label={t('attendance.report.kpi.punctuality', 'Ponctualité')}
          value={
            <>
              <span className="text-green-700">{kpi.on_time_count ?? 0}</span>
              {' · '}
              <span className="text-amber-700">{kpi.early_count ?? 0}</span>
              {' · '}
              <span className="text-red-700">{kpi.late_count ?? 0}</span>
            </>
          }
          hint={t('attendance.report.punctualityHint', 'à l\'heure · en avance · en retard')}
        />
      </section>

      {/* ── BarChart arrivées ── */}
      {chartData.length > 0 && (
        <section className="adm-card p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] mb-3 inline-flex items-center gap-1">
            <TrendingUp size={12} /> {t('attendance.chart.title', 'Arrivées par tranche de 15 min')}
          </p>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D0" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6B5F4E' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B5F4E' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(139, 26, 47, 0.06)' }}
                  contentStyle={{
                    background: '#FAF6EE',
                    border: '1px solid #E8DFC9',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [value, t('attendance.chart.arrivals', 'Arrivées')]}
                  labelStyle={{ color: '#8B1A2F', fontWeight: 700 }}
                />
                <Bar dataKey="arrivees" fill="#8B1A2F" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Table no-shows ── */}
      <section className="adm-card overflow-hidden">
        <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 border-b" style={{ borderColor: 'var(--adm-border)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] inline-flex items-center gap-1">
              <UserX size={12} /> {t('attendance.report.noShows.title', 'Absents (no-shows)')}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('attendance.report.noShows.count', '{{n}} personne(s) attendue(s) mais non venue(s)', {
                n: noShows.length,
              })}
            </p>
          </div>
          <button
            onClick={exportNoShowsCsv}
            disabled={!noShows.length}
            className="adm-btn adm-btn-ghost inline-flex items-center gap-1.5"
          >
            <Download size={14} /> {t('attendance.report.exportCsv', 'Export CSV')}
          </button>
        </div>

        {noShows.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            {t('attendance.report.noShows.empty', 'Aucun no-show — 100% de présence 🎉')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[color:var(--adm-accent)]/5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)]">#</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)]">{t('attendance.col.name', 'Nom')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden sm:table-cell">{t('attendance.col.phone', 'Téléphone')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden md:table-cell">{t('attendance.col.email', 'Email')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden md:table-cell">{t('attendance.col.type', 'Type')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden lg:table-cell">{t('attendance.col.code', 'Code')}</th>
                </tr>
              </thead>
              <tbody>
                {noShows.map((r, i) => (
                  <tr key={r.id} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`} style={{ borderColor: 'var(--adm-border)' }}>
                    <td className="p-3 text-center font-bold text-[color:var(--adm-accent)] tabular-nums">{i + 1}</td>
                    <td className="p-3 font-semibold" style={{ color: 'var(--adm-text)' }}>{r.full_name}</td>
                    <td className="p-3 hidden sm:table-cell text-zinc-700">{r.phone || '—'}</td>
                    <td className="p-3 hidden md:table-cell text-zinc-700 text-xs">{r.email || '—'}</td>
                    <td className="p-3 hidden md:table-cell">
                      {r.ticket_type && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {r.ticket_type}
                        </span>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell font-mono text-xs font-bold">{r.short_code?.toUpperCase() || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Footer nav */}
      <div className="pt-2">
        <Link
          to={`/admin/evenements/${eventId}/presence`}
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--adm-accent)] hover:underline"
        >
          {t('attendance.report.backLive', 'Retour à la liste live')} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

// ─── Sous-composants ───

function KpiCard({ icon, label, value, accent = false, danger = false }) {
  const ring = accent
    ? 'ring-2 ring-[color:var(--adm-accent)]/30'
    : danger
      ? 'ring-2 ring-red-300/60'
      : ''
  const color = accent ? 'text-[color:var(--adm-accent)]' : danger ? 'text-red-700' : ''
  return (
    <div className={`adm-card p-3 sm:p-4 ${ring}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] mb-1 inline-flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${color}`} style={{ color: (accent || danger) ? undefined : 'var(--adm-text)' }}>
        {value}
      </p>
    </div>
  )
}

function SmallStat({ icon, label, value, hint = null }) {
  return (
    <div className="adm-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] mb-1 inline-flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--adm-text)' }}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-zinc-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function formatDelay(min, t) {
  if (min == null) return '—'
  const rounded = Math.round(min * 10) / 10
  if (rounded === 0) return t('attendance.report.onTime', 'à l\'heure')
  if (rounded > 0) return `+${rounded} min`
  return `${rounded} min`
}

function escapeCsv(v) {
  const s = String(v ?? '')
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
