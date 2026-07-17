/**
 * GovDashboard — vue d'ensemble du gouverneur.
 * KPIs + trends (Recharts) + santé des cellules.
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Home, FileText, Activity, AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { useGovernorDashboard } from '@/api/governor'
import { useAuthStore } from '@/store/authStore'
import { getEcho, initEcho } from '@/echo'
import KpiCard from '@/components/shared/KpiCard'
import { SkeletonCard } from '@/components/shared/Skeleton'
import AttendanceGauge from '@/components/shared/AttendanceGauge'
import CellHealthIndicator from '@/components/shared/CellHealthIndicator'
import MyStaffAssignments from '@/components/MyStaffAssignments.jsx'
import SafeBoundary from '@/components/SafeBoundary.jsx'

const TICK_STYLE = { fill: 'rgba(255,255,255,0.5)', fontSize: 11 }
const GRID_STROKE = 'rgba(255,255,255,0.08)'

export default function GovDashboard() {
  const { data, isLoading, error } = useGovernorDashboard()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  // === Echo : abonnement au channel governor.{deptId} pour temps réel ===
  useEffect(() => {
    const deptId = data?.department?.id
    if (!deptId || !user?.id) return
    const echo = initEcho() ?? getEcho()
    if (!echo) return

    const channelName = `governor.${deptId}`
    const channel = echo.private(channelName)

    // Notifications Laravel broadcasted sur ce canal.
    channel.listenForWhatever?.()
    // Listener générique : invalide les queries au moindre push.
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['governor', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['governor', 'reports'] })
      toast.success('Mise à jour temps réel reçue', { duration: 2500 })
    }
    // Laravel broadcaste notifications avec event '.Illuminate\Notifications\Events\BroadcastNotificationCreated'.
    channel.listen('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated', handler)

    return () => {
      try { echo.leave(channelName) } catch { /* noop */ }
    }
  }, [data?.department?.id, user?.id, qc])

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
        Impossible de charger le tableau de bord : {error.message}
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
      </div>
    )
  }

  const { department, kpis, trends, cells_health: cellsHealth } = data
  const reportsExpected = 1
  const alerts = []
  if (kpis.reports_late_count > 0) {
    alerts.push({ label: `${kpis.reports_late_count} rapport(s) département en retard`, link: '/gouverneur/rapports' })
  }
  const criticalCells = (cellsHealth ?? []).filter((c) => c.status === 'critical')
  if (criticalCells.length > 0) {
    alerts.push({ label: `${criticalCells.length} cellule(s) critique(s)`, link: '/gouverneur/cellules' })
  }

  return (
    <div className="space-y-6">
      {/* Header avec nom du dept + bannière dégradée.
          NB : styles inline pour bypasser le compat layer .admin-scope qui
          remap .text-white/.text-gold-* vers du texte sombre (illisible
          sur ce fond wine dark). */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-5 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, #6F1425 0%, #4A0E1A 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <p className="text-[11px] uppercase tracking-wider" style={{ color: '#E8C97C' }}>Gouverneur</p>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-1" style={{ color: '#ffffff' }}>
          {department?.name ?? 'Mon département'}
        </h1>
        <p className="text-sm mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Bonjour {user?.first_name ?? user?.name}, voici l'état temps réel de ton département.
        </p>
      </motion.section>

      {/* Étape F — Missions billetterie actives (null si aucune).
          Wrap SafeBoundary : si le composant crash pour n'importe quelle
          raison, on n'entraîne pas le dashboard entier dans le vide. */}
      <SafeBoundary>
        <MyStaffAssignments />
      </SafeBoundary>

      {/* Alertes */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-medium text-red-200">Alertes actives</p>
              <ul className="space-y-1">
                {alerts.map((a, i) => (
                  <li key={i} className="text-sm">
                    <Link to={a.link} className="text-red-200/90 hover:text-red-100 underline-offset-4 hover:underline">
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard index={0} icon={Users}    label="Membres"            value={kpis.members_count} tone="gold" />
        <KpiCard index={1} icon={Home}     label="Cellules actives"   value={kpis.active_cells_count}
                 suffix={` / ${kpis.cells_count}`} tone="wine" />
        <KpiCard index={2} icon={FileText} label="Rapports en attente" value={kpis.reports_pending_count} tone={kpis.reports_late_count > 0 ? 'red' : 'emerald'} />
        <KpiCard index={3} icon={Activity} label="Présence (4 sem)"   value={kpis.attendance_avg_last_4_weeks} suffix="%" tone="emerald" />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-ink-900 border border-white/5 p-5">
          <h3 className="text-sm font-medium text-white mb-1">Évolution des membres (3 derniers mois)</h3>
          <p className="text-xs text-white/50 mb-4">Pivot department_user cumulé fin de mois.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends?.members_trend ?? []}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#0f0a0c',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#C9A84C" strokeWidth={2.5} dot={{ fill: '#C9A84C', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-ink-900 border border-white/5 p-5 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-white mb-3 text-center">Présence moyenne</h3>
          <AttendanceGauge value={kpis.attendance_avg_last_4_weeks ?? 0} size={180} label="4 dernières semaines" />
        </div>
      </div>

      <div className="rounded-xl bg-ink-900 border border-white/5 p-5">
        <h3 className="text-sm font-medium text-white mb-4">Taux de présence par semaine</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends?.attendance_trend ?? []}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: '#0f0a0c',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#fff',
                }}
              />
              <Bar dataKey="rate" fill="#8B1A2F" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Santé cellules */}
      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Santé des cellules</h3>
          <Link to="/gouverneur/cellules" className="text-xs text-gold-300 hover:text-gold-200">Voir tout →</Link>
        </div>
        {(cellsHealth?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-white/50">Aucune cellule active.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {(cellsHealth ?? []).slice(0, 8).map((c) => (
              <div key={c.cell_id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{c.cell_name}</p>
                  <p className="text-xs text-white/50 truncate">{c.leader_name ?? '— sans leader'}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end shrink-0">
                  <span className="text-xs text-white/60">Dernier rapport</span>
                  <span className="text-xs text-white/80">{c.last_report_date ?? '—'}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">
                    {c.attendance_rate != null ? `${c.attendance_rate}%` : '—'}
                  </p>
                  <CellHealthIndicator status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
