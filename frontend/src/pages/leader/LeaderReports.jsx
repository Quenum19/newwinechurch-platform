/**
 * LeaderReports — liste des rapports hebdo de la cellule.
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Download, RefreshCw } from 'lucide-react'
import { useLeaderReports, downloadLeaderReportPdf } from '@/api/leader'
import Button from '@/components/ui/Button'
import ReportStatusBadge from '@/components/shared/ReportStatusBadge'
import { SkeletonTable } from '@/components/shared/Skeleton'

export default function LeaderReports() {
  const { data, isLoading } = useLeaderReports({ per_page: 30 })
  const reports = data?.data ?? []

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Rapports hebdomadaires</h1>
          <p className="text-sm text-white/50 mt-1">Un rapport par semaine de réunion.</p>
        </div>
        <Link to="/leader/rapports/nouveau">
          <Button className="gap-2"><Plus size={16} /> Nouveau rapport</Button>
        </Link>
      </header>

      <div className="rounded-xl bg-ink-900 border border-white/5 overflow-hidden">
        {isLoading ? <div className="p-4"><SkeletonTable rows={6} /></div> : (
          reports.length === 0 ? (
            <p className="p-8 text-center text-white/50 text-sm">Aucun rapport pour le moment.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {reports.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition">
                    <Link to={`/leader/rapports/${r.id}`} className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        Semaine du {new Date(r.week_start).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {r.attendance_count ?? 0} présents · {r.new_members ?? 0} nouveau(x) membre(s)
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.status !== 'draft' && (
                        r.has_pdf ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              downloadLeaderReportPdf(r.id, `Rapport_cellule_${r.week_end}.pdf`)
                                .catch(() => toast.error('Erreur de téléchargement.'))
                            }}
                            title="Télécharger le PDF officiel"
                            className="p-1.5 rounded-md hover:bg-white/10 text-gold-400"
                          >
                            <Download size={14} />
                          </button>
                        ) : (
                          <span title="PDF en cours de génération" className="p-1.5 text-white/30">
                            <RefreshCw size={14} className="animate-spin" />
                          </span>
                        )
                      )}
                      <div className="text-right space-y-1">
                        <ReportStatusBadge status={r.status} />
                        {r.is_late && (
                          <p className="text-[10px] text-red-400">En retard</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  )
}
