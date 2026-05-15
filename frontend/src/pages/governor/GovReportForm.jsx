/**
 * GovReportForm — création/édition d'un rapport département.
 * - Schéma form_data CHARGÉ DEPUIS LE TEMPLATE DB du département (via API).
 *   Fallback : DEFAULT_DEPARTMENT_REPORT_SCHEMA si aucun template configuré.
 * - Auto-save draft toutes les 30 secondes (PATCH silencieux).
 * - Confirmation modal avant soumission.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Send, AlertTriangle, Loader2, Download, RefreshCw, Eye } from 'lucide-react'
import api from '@/api/axios'
import {
  useGovernorReport, useCreateGovernorReport, useUpdateGovernorReport,
  useSubmitGovernorReport, useGovernorReportTemplate,
} from '@/api/governor'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ReportFormRenderer, { DEFAULT_DEPARTMENT_REPORT_SCHEMA } from '@/components/shared/ReportFormRenderer'
import ReportStatusBadge from '@/components/shared/ReportStatusBadge'

const today = new Date().toISOString().slice(0, 10)
const startOfMonth = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}
const endOfMonth = () => {
  const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().slice(0, 10)
}

export default function GovReportForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading: loadingExisting } = useGovernorReport(id)
  const { data: template, isLoading: loadingTemplate } = useGovernorReportTemplate()
  const create = useCreateGovernorReport()
  const update = useUpdateGovernorReport()
  const submit = useSubmitGovernorReport()

  // Schéma effectif : celui du template DB si dispo, sinon fallback générique.
  const effectiveSchema = useMemo(() => {
    if (template?.schema && Array.isArray(template.schema) && template.schema.length > 0) {
      return template.schema
    }
    return DEFAULT_DEPARTMENT_REPORT_SCHEMA
  }, [template])

  // Type de rapport déduit du template si présent (weekly / monthly).
  const defaultReportType = template?.frequency === 'weekly'
    ? 'weekly_activity'
    : 'monthly_activity'

  const [meta, setMeta] = useState({
    report_type:  defaultReportType,
    period_start: startOfMonth(),
    period_end:   endOfMonth(),
  })

  // Si le template arrive après le premier render et qu'on n'a pas d'existant,
  // on synchronise le type par défaut une seule fois.
  useEffect(() => {
    if (existing) return
    setMeta((prev) => prev.report_type === defaultReportType ? prev : { ...prev, report_type: defaultReportType })
  }, [defaultReportType, existing])
  const [formData, setFormData] = useState({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [reportId, setReportId] = useState(id ? Number(id) : null)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const dirtyRef = useRef(false)

  // Hydrate depuis l'existant.
  useEffect(() => {
    if (existing) {
      setMeta({
        report_type:  existing.report_type ?? 'monthly_activity',
        period_start: existing.period_start ?? startOfMonth(),
        period_end:   existing.period_end ?? endOfMonth(),
      })
      setFormData(existing.form_data ?? {})
      setReportId(existing.id)
    }
  }, [existing])

  // Auto-save draft toutes les 30s si dirty.
  useEffect(() => {
    if (!reportId) return
    if (existing?.status && existing.status !== 'draft') return
    const t = setInterval(async () => {
      if (!dirtyRef.current) return
      try {
        await update.mutateAsync({ id: reportId, ...meta, form_data: formData })
        dirtyRef.current = false
        setLastSavedAt(new Date())
      } catch { /* silencieux */ }
    }, 30_000)
    return () => clearInterval(t)
  }, [reportId, meta, formData, existing?.status, update])

  const isReadOnly = existing?.status && existing.status !== 'draft'

  const handleSaveDraft = async () => {
    try {
      if (reportId) {
        await update.mutateAsync({ id: reportId, ...meta, form_data: formData })
        toast.success('Brouillon enregistré.')
      } else {
        const resp = await create.mutateAsync({ ...meta, form_data: formData })
        const newId = resp?.data?.id ?? resp?.id
        if (newId) {
          setReportId(newId)
          navigate(`/gouverneur/rapports/${newId}`, { replace: true })
          toast.success('Brouillon créé.')
        }
      }
      dirtyRef.current = false
      setLastSavedAt(new Date())
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur sauvegarde.')
    }
  }

  const handleSubmit = async () => {
    if (!reportId) {
      // Sauvegarder d'abord pour avoir un id.
      await handleSaveDraft()
    }
    try {
      // S'assurer que la dernière version est sauvée.
      if (reportId && dirtyRef.current) {
        await update.mutateAsync({ id: reportId, ...meta, form_data: formData })
      }
      await submit.mutateAsync(reportId)
      toast.success('Rapport soumis. Le pasteur en sera notifié.')
      navigate('/gouverneur/rapports')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur soumission.')
    } finally {
      setShowConfirm(false)
    }
  }

  if ((loadingExisting && id) || loadingTemplate) {
    return <div className="text-white/60 text-sm">Chargement du formulaire...</div>
  }

  return (
    <div className="space-y-5">
      <Link to="/gouverneur/rapports" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft size={14} /> Retour aux rapports
      </Link>

      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {isEdit ? 'Modifier le rapport' : 'Nouveau rapport département'}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {isReadOnly ? 'Ce rapport est verrouillé (déjà soumis).'
                        : 'Auto-sauvegarde toutes les 30 secondes.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Si soumis : afficher le bouton de téléchargement PDF ou un indicateur de progression */}
          {existing?.status && existing.status !== 'draft' && (
            existing.has_pdf ? (
              <button
                onClick={async () => {
                  try {
                    const res = await api.get(`/governor/reports/${reportId}/pdf`, { responseType: 'blob' })
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = `Rapport_${existing.period_end}.pdf`
                    link.click()
                    URL.revokeObjectURL(link.href)
                  } catch {
                    toast.error('Erreur de téléchargement.')
                  }
                }}
                className="inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 px-3 py-1.5 rounded-md hover:bg-white/5"
              >
                <Download size={14} /> Télécharger PDF
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs text-white/50 px-3 py-1.5 rounded-md bg-white/5">
                <RefreshCw size={12} className="animate-spin" /> PDF en cours…
              </span>
            )
          )}
          {existing?.status && <ReportStatusBadge status={existing.status} />}
        </div>
      </header>

      {/* Métadonnées */}
      <div className="rounded-xl bg-ink-900 border border-white/5 p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Type</label>
          <input
            type="text" value={meta.report_type}
            onChange={(e) => { setMeta({ ...meta, report_type: e.target.value }); dirtyRef.current = true }}
            disabled={isReadOnly}
            className="w-full px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Période début</label>
          <input
            type="date" value={meta.period_start}
            onChange={(e) => { setMeta({ ...meta, period_start: e.target.value }); dirtyRef.current = true }}
            disabled={isReadOnly}
            className="w-full px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">Période fin</label>
          <input
            type="date" value={meta.period_end} min={meta.period_start}
            onChange={(e) => { setMeta({ ...meta, period_end: e.target.value }); dirtyRef.current = true }}
            disabled={isReadOnly}
            className="w-full px-3 py-2 rounded-lg bg-ink-950 border border-white/10 text-sm text-white"
          />
        </div>
      </div>

      {/* Form data dynamique — chargé depuis le template DB du département */}
      <div className="rounded-xl bg-ink-900 border border-white/5 p-5">
        {template?.name && (
          <div className="mb-4 pb-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium text-white">{template.name}</p>
              <p className="text-xs text-white/40 mt-0.5">
                Modèle v{template.version} · Fréquence : {template.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuelle'}
              </p>
            </div>
          </div>
        )}
        <ReportFormRenderer
          schema={effectiveSchema}
          values={formData}
          onChange={(v) => { setFormData(v); dirtyRef.current = true }}
          disabled={isReadOnly}
        />
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-white/40">
            {lastSavedAt && `Dernière sauvegarde à ${lastSavedAt.toLocaleTimeString('fr-FR')}`}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSaveDraft} disabled={update.isPending || create.isPending} className="gap-2">
              <Save size={16} />
              {update.isPending || create.isPending ? <Loader2 className="animate-spin" size={14} /> : 'Sauvegarder brouillon'}
            </Button>
            <Button onClick={() => setShowConfirm(true)} disabled={!reportId} className="gap-2">
              <Send size={16} />
              Soumettre
            </Button>
          </div>
        </div>
      )}

      {/* Aperçu LIVE — mis à jour à chaque frappe, toujours visible.
          C'est la vue qui sera figée en PDF lors de la soumission. */}
      {!isReadOnly && (
        <div className="rounded-xl bg-ink-900 border border-white/5 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-gold-400" />
              <h3 className="text-sm font-semibold text-white">Aperçu en direct</h3>
            </div>
            <p className="text-[11px] text-white/40">
              Mis à jour pendant que tu saisis · figé au PDF à la soumission
            </p>
          </div>
          {Object.keys(formData).length === 0 ? (
            <p className="text-sm text-white/40 italic">
              Commence à remplir le formulaire — l'aperçu apparaîtra ici.
            </p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {Object.entries(formData).map(([k, v]) => (
                <div key={k} className="border-b border-white/5 pb-2 last:border-0">
                  <dt className="text-[11px] uppercase tracking-wider text-white/40">{k}</dt>
                  <dd className="text-white/90 mt-1 whitespace-pre-line break-words">
                    {v == null || v === '' ? <span className="text-white/30">—</span> : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* Modal confirmation — palette ivoire uniforme. */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        size="md"
        title="Confirmer la soumission"
        description="Une action verrouille définitivement ce rapport."
      >
        <div className="flex gap-3">
          <AlertTriangle className="text-[#B0273A] shrink-0 mt-0.5" size={20} />
          <div className="space-y-2">
            <p>
              Une fois soumis, ce rapport est <strong>verrouillé</strong>. Tu ne pourras
              plus le modifier avant la revue du pasteur ou de l'administration.
            </p>
            <p className="text-[#6B5F4E]">
              Un PDF officiel est généré et envoyé par email au pasteur, RH et gouverneur.
            </p>
          </div>
        </div>
        <Modal.Footer>
          <button type="button" className="nwc-btn-ghost" onClick={() => setShowConfirm(false)}>
            Annuler
          </button>
          <button
            type="button"
            className="nwc-btn-primary"
            onClick={handleSubmit}
            disabled={submit.isPending}
          >
            {submit.isPending && <Loader2 size={14} className="animate-spin" />}
            {submit.isPending ? 'Soumission…' : 'Confirmer & soumettre'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
