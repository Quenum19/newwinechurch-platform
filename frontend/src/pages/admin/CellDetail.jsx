/** Fiche cellule — Refonte 2026 admin-v2 native. */
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { ArrowLeft, CheckCircle2, FileText, Home, MapPin, Users, Loader2, Download, XCircle, Eye, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { cells } from '@/api/admin'

const REPORT_STATUS_META = {
  draft:     { cls: 'adm-badge',          label: 'Brouillon' },
  submitted: { cls: 'adm-badge-warning',  label: 'À examiner' },
  reviewed:  { cls: 'adm-badge-info',     label: 'Revu' },
  approved:  { cls: 'adm-badge-success',  label: 'Approuvé' },
  rejected:  { cls: 'adm-badge-danger',   label: 'Rejeté' },
  // legacy
  validated: { cls: 'adm-badge-success',  label: 'Validé' },
}

export default function CellDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: cell, isLoading, isError } = useQuery({
    queryKey: ['admin', 'cells', id],
    queryFn: () => cells.get(id),
    enabled: !!id,
    retry: 1,
  })

  const { data: reports } = useQuery({
    queryKey: ['admin', 'cells', id, 'reports'],
    queryFn: () => cells.reports(id),
    enabled: !!cell,
  })

  const update = useMutation({
    mutationFn: (payload) => cells.update(id, payload),
    onSuccess: () => {
      toast.success('Cellule mise à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'cells'] })
    },
  })

  const validateReport = useMutation({
    mutationFn: ({ reportId, payload }) => cells.validateReport(id, reportId, payload),
    onSuccess: (_, vars) => {
      const labels = { reviewed: 'revu', approved: 'approuvé', rejected: 'rejeté' }
      toast.success(`Rapport ${labels[vars.payload.status] ?? 'mis à jour'}.`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'cells', id, 'reports'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur.'),
  })

  const regenerateMut = useMutation({
    mutationFn: (reportId) => cells.regenerateReportPdf(id, reportId),
    onSuccess: () => {
      toast.success('Régénération du PDF en cours.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'cells', id, 'reports'] })
    },
  })

  const handleDownload = (r) => {
    if (!r.has_pdf) return toast.error('PDF non encore disponible.')
    cells.downloadReportPdf(id, r.id, `Rapport_cellule_${r.week_end}.pdf`)
      .catch(() => toast.error('Erreur téléchargement.'))
  }

  const { register, handleSubmit, formState: { isDirty } } = useForm({
    values: cell ? {
      name: cell.name ?? '',
      description: cell.description ?? '',
      zone: cell.zone ?? '',
      meeting_day: cell.meeting_day ?? '',
      meeting_time: cell.meeting_time?.slice(0, 5) ?? '',
      meeting_location: cell.meeting_location ?? '',
      status: cell.status ?? 'active',
    } : undefined,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded animate-pulse" style={{ background: '#F4F4F5' }} />
        <div className="adm-card h-96 animate-pulse" />
      </div>
    )
  }
  if (isError || !cell) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/cellules"
          className="inline-flex items-center gap-1 text-sm hover:underline"
          style={{ color: 'var(--adm-text-muted)' }}
        >
          <ArrowLeft size={14} /> Retour à la liste
        </Link>
        <div className="adm-card p-8 text-center" style={{ color: 'var(--adm-text-muted)' }}>
          Cellule introuvable.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      <Link
        to="/admin/cellules"
        className="inline-flex items-center gap-1 text-sm transition hover:underline"
        style={{ color: 'var(--adm-text-muted)' }}
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      <header>
        <div className="flex items-center gap-4 min-w-0">
          <span
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--adm-accent-soft)', color: 'var(--adm-accent)' }}
          >
            <Home size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate">{cell.name}</h1>
            <p className="text-sm flex items-center gap-3 flex-wrap mt-1" style={{ color: 'var(--adm-text-muted)' }}>
              {cell.zone && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {cell.zone}</span>}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Users size={11} /> {cell.members_count ?? 0} membres
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <FileText size={11} /> {cell.reports_count ?? 0} rapport{(cell.reports_count ?? 0) > 1 ? 's' : ''}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Édition */}
      <form
        onSubmit={handleSubmit((d) => update.mutate(d))}
        className="adm-card p-4 sm:p-6 space-y-4"
      >
        <h2>Informations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Nom"><input {...register('name')} className="adm-input" /></Field>
          <Field label="Zone"><input {...register('zone')} className="adm-input" /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Jour">
            <select {...register('meeting_day')} className="adm-select">
              <option value="">—</option>
              <option value="lundi">Lundi</option>
              <option value="mardi">Mardi</option>
              <option value="mercredi">Mercredi</option>
              <option value="jeudi">Jeudi</option>
              <option value="vendredi">Vendredi</option>
              <option value="samedi">Samedi</option>
              <option value="dimanche">Dimanche</option>
            </select>
          </Field>
          <Field label="Heure">
            <input type="time" {...register('meeting_time')} className="adm-input" />
          </Field>
          <Field label="Statut">
            <select {...register('status')} className="adm-select">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Lieu"><input {...register('meeting_location')} className="adm-input" /></Field>
        <Field label="Description">
          <textarea rows={3} {...register('description')} className="adm-textarea" />
        </Field>
        <div className="pt-3 border-t" style={{ borderColor: 'var(--adm-border)' }}>
          <button
            type="submit"
            disabled={!isDirty || update.isPending}
            className="adm-btn adm-btn-primary"
          >
            {update.isPending ? <><Loader2 size={14} className="animate-spin" /> …</> : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Membres */}
      <section className="adm-card p-4 sm:p-6">
        <h2 className="mb-3 inline-flex items-center gap-2">
          <Users size={16} style={{ color: 'var(--adm-text-muted)' }} />
          Membres ({cell.members?.length ?? 0})
        </h2>
        {(cell.members ?? []).length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--adm-text-faint)' }}>
            Aucun membre dans cette cellule.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cell.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                style={{ background: 'var(--adm-card-hover)' }}
              >
                <span className="truncate" style={{ color: 'var(--adm-text)' }}>
                  {m.first_name} {m.name}
                </span>
                {m.id === cell.leader_id && (
                  <span className="adm-badge adm-badge-accent shrink-0">Leader</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rapports */}
      <section className="adm-card p-4 sm:p-6">
        <h2 className="mb-3 inline-flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--adm-text-muted)' }} />
          Rapports hebdomadaires
        </h2>
        {(reports?.data ?? []).length === 0 ? (
          <p className="text-sm italic" style={{ color: 'var(--adm-text-faint)' }}>
            Aucun rapport pour le moment.
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.data.map((r) => (
              <ReportItem
                key={r.id}
                r={r}
                onReview={(payload) => validateReport.mutate({ reportId: r.id, payload })}
                onRegenerate={() => regenerateMut.mutate(r.id)}
                onDownload={() => handleDownload(r)}
                busy={validateReport.isPending || regenerateMut.isPending}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ReportItem({ r, onReview, onRegenerate, onDownload, busy }) {
  const meta = REPORT_STATUS_META[r.status] ?? REPORT_STATUS_META.draft
  const [rejectOpen, setRejectOpen] = useState(false)
  const [comment, setComment] = useState('')

  const leaderName = r.leader?.full_name ?? r.reporter?.full_name ?? '—'
  const attendance = r.attendance_count ?? r.attendees_count ?? 0
  const newMembers = r.new_members ?? r.new_converts ?? 0
  const highlight  = r.highlights ?? r.testimony
  const isFinal    = ['approved', 'rejected'].includes(r.status)
  const canReview  = ['submitted', 'reviewed'].includes(r.status)

  const submitReject = () => {
    if (!comment.trim()) return
    onReview({ status: 'rejected', review_comment: comment.trim() })
    setRejectOpen(false)
    setComment('')
  }

  return (
    <li
      className="rounded-lg p-3 sm:p-4"
      style={{ border: '1px solid var(--adm-border)', background: 'var(--adm-card-hover)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium" style={{ color: 'var(--adm-text)' }}>
            Semaine du {format(new Date(r.week_start), 'd MMM yyyy', { locale: fr })}
          </div>
          <div className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
            par {leaderName}
          </div>
        </div>
        <span className={`adm-badge ${meta.cls}`}>{meta.label}</span>
      </div>

      <div className="text-xs grid grid-cols-2 gap-2 mt-3" style={{ color: 'var(--adm-text-muted)' }}>
        <span className="tabular-nums">👥 {attendance} présent{attendance > 1 ? 's' : ''}</span>
        <span className="tabular-nums">✨ {newMembers} nouveau{newMembers > 1 ? 'x' : ''} membre{newMembers > 1 ? 's' : ''}</span>
      </div>

      {highlight && (
        <p className="text-xs mt-2 italic line-clamp-3" style={{ color: 'var(--adm-text-muted)' }}>
          « {highlight} »
        </p>
      )}

      {r.review_comment && (
        <p className="text-xs mt-2 p-2 rounded" style={{ background: 'var(--adm-bg-soft)', color: 'var(--adm-text)' }}>
          <strong>Commentaire :</strong> {r.review_comment}
        </p>
      )}

      {/* Actions */}
      {(canReview || r.has_pdf || (r.status !== 'draft' && !r.has_pdf)) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--adm-border)' }}>
          {canReview && !isFinal && (
            <>
              <button onClick={() => onReview({ status: 'approved' })} disabled={busy} className="adm-btn adm-btn-primary text-xs">
                <CheckCircle2 size={12} /> Approuver
              </button>
              <button onClick={() => onReview({ status: 'reviewed' })} disabled={busy} className="adm-btn adm-btn-secondary text-xs">
                <Eye size={12} /> Marquer revu
              </button>
              <button onClick={() => setRejectOpen(true)} disabled={busy} className="adm-btn text-xs" style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
                <XCircle size={12} /> Rejeter…
              </button>
            </>
          )}
          {r.has_pdf ? (
            <button onClick={onDownload} className="adm-btn adm-btn-secondary text-xs">
              <Download size={12} /> PDF
            </button>
          ) : r.status !== 'draft' && (() => {
            const submittedAt = r.submitted_at ? new Date(r.submitted_at).getTime() : Date.now()
            const stale = Date.now() - submittedAt > 2 * 60_000
            return stale ? (
              <span className="text-xs" style={{ color: '#b45309' }}>
                ⚠ PDF non généré — clique "Régénérer"
              </span>
            ) : (
              <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--adm-text-faint)' }}>
                <RefreshCw size={12} className="animate-spin" /> PDF en cours…
              </span>
            )
          })()}
          {r.status !== 'draft' && (
            <button onClick={onRegenerate} disabled={busy} className="adm-btn adm-btn-secondary text-xs" title="Régénère PDF + emails">
              <RefreshCw size={12} /> Régénérer
            </button>
          )}
        </div>
      )}

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="adm-card p-5 w-full max-w-md">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--adm-text)' }}>Motif du rejet</h3>
            <p className="text-sm mb-3" style={{ color: 'var(--adm-text-muted)' }}>
              Le leader sera notifié du rejet et de ce commentaire.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="adm-input w-full"
              placeholder="Indiquer clairement ce qui doit être corrigé…"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setRejectOpen(false)} className="adm-btn adm-btn-secondary text-xs">Annuler</button>
              <button onClick={submitReject} disabled={!comment.trim() || busy} className="adm-btn adm-btn-primary text-xs">Confirmer le rejet</button>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: 'var(--adm-text)' }}>{label}</label>
      {children}
    </div>
  )
}
