/**
 * LeaderDashboard — vue d'ensemble du leader de cellule.
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Users, UserCheck, FileText, CalendarClock, AlertTriangle, Plus, ClipboardList,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useLeaderDashboard } from '@/api/leader'
import { useAuthStore } from '@/store/authStore'
import { initEcho, getEcho } from '@/echo'
import KpiCard from '@/components/shared/KpiCard'
import { SkeletonCard } from '@/components/shared/Skeleton'
import Button from '@/components/ui/Button'

export default function LeaderDashboard() {
  const { data, isLoading } = useLeaderDashboard()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    const cellId = data?.cell?.id
    if (!cellId || !user?.id) return
    const echo = initEcho() ?? getEcho()
    if (!echo) return

    const channelName = `cell-leader.${cellId}`
    const channel = echo.private(channelName)
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['leader'] })
      toast.success('Mise à jour reçue', { duration: 2500 })
    }
    channel.listen('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated', handler)

    return () => { try { echo.leave(channelName) } catch { /* */ } }
  }, [data?.cell?.id, user?.id, qc])

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  const { cell, kpis } = data
  const hasMissing = (kpis.missing_reports_count ?? 0) > 0

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-wine-700 to-wine-900 p-5 sm:p-8 border border-white/5"
      >
        <p className="text-[11px] uppercase tracking-wider text-gold-300">Leader</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white mt-1">{cell?.name ?? 'Ma cellule'}</h1>
        <p className="text-sm text-white/70 mt-2">
          {cell?.meeting_day && <>Réunion <span className="capitalize">{cell.meeting_day}</span> à {cell?.meeting_time}</>}
        </p>
      </motion.section>

      {hasMissing && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-200">
              {kpis.missing_reports_count} rapport(s) manquant(s) sur les 8 dernières semaines
            </p>
            <Link to="/leader/rapports/nouveau" className="text-xs text-red-200/80 hover:text-red-100 underline-offset-4 hover:underline">
              Soumettre un rapport maintenant →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard index={0} icon={Users}        label="Membres" value={kpis.members_count} tone="gold" />
        <KpiCard index={1} icon={UserCheck}    label="Présence ce mois" value={kpis.attendance_this_month_rate} suffix="%" tone="emerald" />
        <KpiCard index={2} icon={FileText}     label="Rapports manquants" value={kpis.missing_reports_count} tone={hasMissing ? 'red' : 'emerald'} />
        <KpiCard index={3} icon={CalendarClock} label="Prochaine réunion"
                 value={kpis.next_meeting_date ?? '—'} tone="wine" />
      </div>

      <div className="rounded-xl bg-ink-900 border border-white/5 p-5">
        <h3 className="text-sm font-medium text-white mb-3">Actions rapides</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/leader/presences">
            <Button variant="ghost" className="w-full justify-center gap-2"><UserCheck size={16} /> Saisir présences</Button>
          </Link>
          <Link to="/leader/rapports/nouveau">
            <Button className="w-full justify-center gap-2"><Plus size={16} /> Nouveau rapport</Button>
          </Link>
          <Link to="/leader/cellule">
            <Button variant="ghost" className="w-full justify-center gap-2"><ClipboardList size={16} /> Voir les membres</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
