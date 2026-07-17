/**
 * AdminReportDetail — Vue détaillée d'un rapport soumis (admin/pasteur/RH).
 *
 *  - Affiche les métadonnées + form_data (lecture seule)
 *  - Bouton téléchargement PDF officiel
 *  - Bloc review : approuver / rejeter / marquer comme revu (pasteur)
 */
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Download, CheckCircle2, XCircle, Eye, FileText, RefreshCw,
} from 'lucide-react'

import api from '@/api/axios'
import BackButton from '@/components/admin/BackButton.jsx'
import { departmentReports } from '@/api/admin'

export default function AdminReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [comment, setComment] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const { data: report, isLoading } = useQuery({
    queryKey: ['admin', 'department-report', id],
    queryFn: () => departmentReports.get(id),
    enabled: !!id,
    // En sync mode le PDF est déjà prêt. Si jamais le PDF manque (régénération en queue),
    // on poll toutes les 3s avec un arrêt à 30s.
    refetchInterval: (q) => {
      const r = q.state.data
      if (!r) return false
      if (r.has_pdf || r.status === 'draft') return false
      const submittedAt = r.submitted_at ? new Date(r.submitted_at).getTime() : Date.now()
      if (Date.now() - submittedAt > 30_000) return false
      return 3000
    },
  })

  const reviewMut = useMutation({
    mutationFn: (payload) => api.post(`/admin/department-reports/${id}/review`, payload).then(r => r.data),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? 'Rapport revu.')
      qc.invalidateQueries({ queryKey: ['admin', 'department-report', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'department-reports'] })
      setShowRejectModal(false)
      setComment('')
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const regenerateMut = useMutation({
    mutationFn: () => departmentReports.regeneratePdf(id),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? 'Régénération PDF lancée.')
      qc.invalidateQueries({ queryKey: ['admin', 'department-report', id] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const handleApprove = () => reviewMut.mutate({ status: 'approved' })
  const handleMarkReviewed = () => reviewMut.mutate({ status: 'reviewed' })
  const handleReject = () => {
    if (!comment.trim()) {
      toast.error('Un commentaire est requis pour rejeter.')
      return
    }
    reviewMut.mutate({ status: 'rejected', review_comment: comment.trim() })
  }

  const handleDownload = async () => {
    if (!report?.has_pdf) {
      toast.error('PDF non encore disponible.')
      return
    }
    try {
      const name = `Rapport_${report.department?.name?.replace(/\s+/g, '_') || 'departement'}_${report.period_end}.pdf`
      await departmentReports.downloadPdf(report.id, name)
    } catch {
      toast.error('Erreur de téléchargement.')
    }
  }

  if (isLoading) return <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>Chargement…</p>
  if (!report)   return <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>Rapport introuvable.</p>

  const isFinal = ['approved', 'rejected'].includes(report.status)
  const formData = report.form_data ?? {}
  const formEntries = Object.entries(formData)

  return (
    <div className="space-y-5">
      <BackButton to="/admin/rapports-departement" label="Retour à la liste" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>{report.department?.name ?? 'Département'}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
            Rapport #{report.id} · Soumis par <strong>{report.governor?.full_name ?? '—'}</strong>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {report.has_pdf ? (
            <button
              onClick={handleDownload}
              className="adm-btn adm-btn-secondary"
              title="Télécharger le PDF officiel"
            >
              <Download size={14} /> Télécharger PDF
            </button>
          ) : report.status !== 'draft' && (
            <span className="adm-btn adm-btn-secondary" style={{ opacity: 0.6, cursor: 'default' }}>
              <RefreshCw size={14} className="animate-spin" /> PDF en cours…
            </span>
          )}

          {report.status !== 'draft' && (
            <button
              onClick={() => {
                if (confirm('Régénérer le PDF et renvoyer les emails au pasteur, RH et gouverneur ?')) {
                  regenerateMut.mutate()
                }
              }}
              disabled={regenerateMut.isPending}
              className="adm-btn adm-btn-secondary"
              title="Régénérer le PDF + renvoyer les emails"
            >
              <RefreshCw size={14} className={regenerateMut.isPending ? 'animate-spin' : ''} />
              Régénérer
            </button>
          )}
        </div>
      </header>

      {/* Méta */}
      <section className="adm-card p-4 sm:p-5">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <MetaItem label="Type"          value={report.report_type} />
          <MetaItem label="Période"       value={`${report.period_start} → ${report.period_end}`} />
          <MetaItem label="Soumis le"     value={report.submitted_at ? new Date(report.submitted_at).toLocaleString('fr-FR') : '—'} />
          <MetaItem label="Statut" value={
            <span className={`adm-badge ${badgeCls(report.status)}`}>{statusLabel(report.status)}</span>
          } />
          {report.reviewer?.full_name && (
            <MetaItem label="Revu par" value={report.reviewer.full_name} />
          )}
          {report.reviewed_at && (
            <MetaItem label="Revu le" value={new Date(report.reviewed_at).toLocaleString('fr-FR')} />
          )}
        </dl>
        {report.review_comment && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--adm-bg-soft)', borderLeft: '3px solid var(--adm-accent)' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--adm-text-faint)' }}>
              Commentaire de revue
            </p>
            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--adm-text)' }}>
              {report.review_comment}
            </p>
          </div>
        )}
      </section>

      {/* Contenu du rapport */}
      <section className="adm-card p-4 sm:p-5">
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>
          <FileText size={14} className="inline mr-1" /> Contenu du rapport
        </h2>
        {formEntries.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--adm-text-muted)' }}>
            Aucune donnée saisie.
          </p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {formEntries.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--adm-text-faint)' }}>
                  {k}
                </dt>
                <dd className="whitespace-pre-line" style={{ color: 'var(--adm-text)' }}>
                  {v == null || v === '' ? (
                    <span style={{ color: 'var(--adm-text-faint)' }}>—</span>
                  ) : typeof v === 'object' ? (
                    <pre className="text-xs bg-zinc-100 dark:bg-zinc-900 rounded p-2 overflow-x-auto">
{JSON.stringify(v, null, 2)}
                    </pre>
                  ) : (
                    String(v)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Actions de revue */}
      {!isFinal && report.status !== 'draft' && (
        <section className="adm-card p-4 sm:p-5">
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--adm-text)' }}>
            Décision
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApprove}
              disabled={reviewMut.isPending}
              className="adm-btn adm-btn-primary"
            >
              <CheckCircle2 size={14} /> Approuver
            </button>
            <button
              onClick={handleMarkReviewed}
              disabled={reviewMut.isPending}
              className="adm-btn adm-btn-secondary"
            >
              <Eye size={14} /> Marquer comme revu
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={reviewMut.isPending}
              className="adm-btn"
              style={{ color: '#b91c1c', borderColor: '#fecaca' }}
            >
              <XCircle size={14} /> Rejeter…
            </button>
          </div>
        </section>
      )}

      {/* Modal rejet */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="adm-card p-5 w-full max-w-md">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>Motif du rejet</h3>
            <p className="text-sm mb-3" style={{ color: 'var(--adm-text-muted)' }}>
              Le gouverneur sera notifié du rejet et de ce commentaire.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="adm-input w-full"
              placeholder="Indiquer clairement ce qui doit être corrigé…"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowRejectModal(false)} className="adm-btn adm-btn-secondary">
                Annuler
              </button>
              <button onClick={handleReject} disabled={reviewMut.isPending} className="adm-btn adm-btn-primary">
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--adm-text-faint)' }}>{label}</dt>
      <dd className="mt-0.5" style={{ color: 'var(--adm-text)' }}>{value}</dd>
    </div>
  )
}

function badgeCls(s) {
  return ({
    draft:     'adm-badge-neutral',
    submitted: 'adm-badge-warning',
    reviewed:  'adm-badge-info',
    approved:  'adm-badge-success',
    rejected:  'adm-badge-danger',
  })[s] ?? 'adm-badge-neutral'
}

function statusLabel(s) {
  return ({
    draft:     'Brouillon',
    submitted: 'À examiner',
    reviewed:  'Revu',
    approved:  'Approuvé',
    rejected:  'Rejeté',
  })[s] ?? s
}
