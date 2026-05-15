/**
 * LeaderAttendance — saisie batch + historique des présences.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Save, History as HistoryIcon, ClipboardList, Loader2 } from 'lucide-react'
import {
  useLeaderMembers, useLeaderAttendance, useRecordAttendance,
} from '@/api/leader'
import Button from '@/components/ui/Button'
import { SkeletonTable } from '@/components/shared/Skeleton'
import { cn } from '@/utils/cn'

export default function LeaderAttendance() {
  const [mode, setMode] = useState('input') // 'input' | 'history'

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Présences</h1>
          <p className="text-sm text-white/50 mt-1">Saisie batch par date + historique des réunions.</p>
        </div>
        <div className="flex gap-1 bg-ink-900 border border-white/5 rounded-lg p-1">
          <ModeBtn active={mode === 'input'} onClick={() => setMode('input')} icon={ClipboardList} label="Saisie" />
          <ModeBtn active={mode === 'history'} onClick={() => setMode('history')} icon={HistoryIcon} label="Historique" />
        </div>
      </header>

      {mode === 'input' ? <InputMode /> : <HistoryMode />}
    </div>
  )
}

function ModeBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition',
        active ? 'bg-gold-500 text-ink-950 font-medium' : 'text-white/60 hover:text-white'
      )}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

function InputMode() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const { data: members, isLoading } = useLeaderMembers({ per_page: 200 })
  const record = useRecordAttendance()

  // attendanceMap: id -> { is_present, arrived_late, note }
  const [att, setAtt] = useState({})
  const setOne = (id, patch) => setAtt((m) => ({ ...m, [id]: { ...m[id], ...patch } }))

  const submit = async () => {
    const payload = (members?.data ?? []).map((m) => ({
      member_id: m.id,
      is_present: att[m.id]?.is_present ?? false,
      arrived_late: !!att[m.id]?.arrived_late,
      note: att[m.id]?.note ?? null,
    }))
    const present = payload.filter((p) => p.is_present)
    if (present.length === 0) {
      toast.error('Au moins une présence requise.')
      return
    }
    try {
      await record.mutateAsync({ meeting_date: date, attendances: payload })
      toast.success(`Présences enregistrées (${present.length}/${payload.length}).`)
      setAtt({})
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur enregistrement.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ink-900 border border-white/5 p-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm text-white/80">Date de la réunion :</label>
        <input
          type="date" value={date} max={today}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
        />
      </div>

      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        {isLoading ? <div className="p-4"><SkeletonTable rows={8} /></div> : (
          (members?.data?.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-white/50 text-sm">Aucun membre dans cette cellule.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {members.data.map((m) => {
                const v = att[m.id] ?? {}
                return (
                  <motion.li
                    key={m.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={!!v.is_present}
                        onChange={(e) => setOne(m.id, { is_present: e.target.checked })}
                        className="h-5 w-5 rounded border-white/20 bg-ink-950 text-gold-500 focus:ring-gold-500"
                        aria-label={`Présent ${m.full_name ?? m.name}`}
                      />
                      {m.avatar ? (
                        <img src={m.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-wine-700 flex items-center justify-center text-xs text-white">
                          {(m.first_name?.[0] ?? '?').toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-white truncate">{m.full_name ?? m.name}</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!v.arrived_late}
                        disabled={!v.is_present}
                        onChange={(e) => setOne(m.id, { arrived_late: e.target.checked })}
                        className="h-4 w-4 rounded border-white/20 bg-ink-950 text-orange-500 focus:ring-orange-500"
                      />
                      Retard
                    </label>
                    <input
                      type="text"
                      placeholder="Note..."
                      value={v.note ?? ''}
                      onChange={(e) => setOne(m.id, { note: e.target.value })}
                      className="px-2 py-1 rounded bg-ink-950 border border-white/10 text-xs text-white/80 w-full sm:w-32"
                    />
                  </motion.li>
                )
              })}
            </ul>
          )
        )}
      </div>

      <div className="sticky bottom-2 z-10 bg-ink-950/90 backdrop-blur-md border-t border-white/5 p-3 -mx-4 sm:-mx-6 lg:-mx-8 flex justify-end">
        <Button onClick={submit} disabled={record.isPending} className="gap-2">
          {record.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Enregistrer toutes les présences
        </Button>
      </div>
    </div>
  )
}

function HistoryMode() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data, isLoading } = useLeaderAttendance({
    date_from: from || undefined, date_to: to || undefined, per_page: 200,
  })

  // Regroupe par meeting_date.
  const grouped = (data?.data ?? []).reduce((acc, row) => {
    (acc[row.meeting_date] ??= []).push(row)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-ink-900 border border-white/5 p-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm text-white/80">Du</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
               className="px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white" />
        <label className="text-sm text-white/80">au</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
               className="px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white" />
      </div>

      {isLoading ? <SkeletonTable rows={4} /> : (
        Object.keys(grouped).length === 0 ? (
          <p className="rounded-xl bg-ink-900 border border-white/5 p-8 text-center text-sm text-white/50">
            Aucune réunion sur cette période.
          </p>
        ) : (
          <ul className="space-y-3">
            {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([date, rows]) => {
              const present = rows.filter((r) => r.is_present).length
              const rate = rows.length ? Math.round((present / rows.length) * 100) : 0
              return (
                <li key={date} className="rounded-xl bg-ink-900 border border-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">{new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <span className={cn(
                      'text-sm font-semibold',
                      rate >= 75 ? 'text-emerald-400' : rate >= 50 ? 'text-orange-400' : 'text-red-400'
                    )}>
                      {present}/{rows.length} · {rate}%
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      )}
    </div>
  )
}
