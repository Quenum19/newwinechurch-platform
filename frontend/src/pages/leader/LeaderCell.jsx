/**
 * LeaderCell — détail cellule + liste membres.
 */
import { motion } from 'framer-motion'
import { MapPin, Clock, Users, MessageCircle } from 'lucide-react'
import { useLeaderCell, useLeaderMembers } from '@/api/leader'
import { SkeletonCard } from '@/components/shared/Skeleton'

export default function LeaderCell() {
  const { data: cell, isLoading } = useLeaderCell()
  const { data: members, isLoading: loadingMembers } = useLeaderMembers({ per_page: 100 })

  if (isLoading || !cell) return <SkeletonCard />

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">{cell.name}</h1>
        <p className="text-sm text-white/50 mt-1">{cell.description ?? '—'}</p>
      </header>

      <div className="rounded-xl bg-ink-900 border border-white/5 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cell.zone && (
          <Info icon={MapPin} label="Zone" value={cell.zone} />
        )}
        {cell.meeting_day && (
          <Info icon={Clock} label="Jour" value={<span className="capitalize">{cell.meeting_day} {cell.meeting_time}</span>} />
        )}
        <Info icon={Users} label="Membres" value={cell.members_count ?? 0} />
        {cell.whatsapp_link && (
          <a href={cell.whatsapp_link} target="_blank" rel="noreferrer"
             className="flex flex-col text-sm hover:text-gold-300 transition">
            <span className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-1">
              <MessageCircle size={11} /> WhatsApp
            </span>
            <span className="text-emerald-400 truncate text-xs mt-1">Ouvrir le groupe →</span>
          </a>
        )}
      </div>

      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <h3 className="text-sm font-medium text-white">Membres de la cellule</h3>
        </div>
        {loadingMembers ? (
          <div className="p-4"><SkeletonCard /></div>
        ) : (members?.data?.length ?? 0) === 0 ? (
          <p className="p-8 text-center text-white/50 text-sm">Aucun membre.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {members.data.map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="px-5 py-3 flex items-center gap-3"
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
                  <p className="text-xs text-white/50 truncate">{m.phone ?? m.city ?? '—'}</p>
                </div>
                {m.is_baptized && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">Baptisé</span>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-1">
        <Icon size={11} /> {label}
      </p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  )
}
