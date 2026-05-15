/**
 * GovReports — liste des rapports département.
 * Filtres status + période. Lien vers détail/édition.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Plus, Loader2, Download, RefreshCw } from 'lucide-react'
import api from '@/api/axios'
import { useGovernorReports } from '@/api/governor'
import Button from '@/components/ui/Button'
import ReportStatusBadge from '@/components/shared/ReportStatusBadge'
import { SkeletonTable } from '@/components/shared/Skeleton'

async function downloadGovernorPdf(reportId, filename) {
  try {
    const res = await api.get(`/governor/reports/${reportId}/pdf`, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (err) {
    toast.error(err?.response?.data?.message ?? 'Erreur de téléchargement.')
  }
}

export default function GovReports() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('')
  const [cursor, setCursor] = useState(null)
  const filters = { status: status || undefined, cursor: cursor || undefined }
  const { data, isLoading, isFetching } = useGovernorReports(filters)

  const reports = data?.data ?? []
  const nextCursor = data?.meta?.next_cursor ?? data?.next_cursor ?? null

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Rapports département</h1>
          <p className="text-sm text-white/50 mt-1">Workflow : brouillon → soumis → revu → approuvé/rejeté</p>
        </div>
        <Link to="/gouverneur/rapports/nouveau">
          <Button className="gap-2"><Plus size={16} /> Nouveau rapport</Button>
        </Link>
      </header>

      <div className="rounded-xl bg-ink-900 border border-white/5 p-3 flex gap-2 flex-wrap">
        {['', 'draft', 'submitted', 'reviewed', 'approved', 'rejected'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatus(s); setCursor(null) }}
            className={`px-3 py-1.5 rounded-full text-xs transition ${
              status === s
                ? 'bg-gold-500 text-ink-950 font-medium'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {s ? t(`common.reportStatus.${s}`) : t('common.all')}
          </button>
        ))}
      </div>

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
                    <Link to={`/gouverneur/rapports/${r.id}`} className="flex-1 min-w-0 cursor-pointer">
                      <p className="text-sm text-white">{r.report_type}</p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {r.period_start} → {r.period_end}
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.status !== 'draft' && (
                        r.has_pdf ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              downloadGovernorPdf(r.id, `Rapport_${r.period_end}.pdf`)
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
        {nextCursor && (
          <div className="p-4 border-t border-white/5 text-center">
            <Button onClick={() => setCursor(nextCursor)} variant="ghost" disabled={isFetching}>
              {isFetching ? <Loader2 className="animate-spin" size={14} /> : 'Charger plus'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
