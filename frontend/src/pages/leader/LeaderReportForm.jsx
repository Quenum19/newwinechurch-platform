/**
 * LeaderReportForm — formulaire rapport hebdo cellule.
 * Champs fixes : semaine, présents, nouveaux membres, prières JSON, activités JSON, défis, points forts.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { ArrowLeft, Plus, Save, Send, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import {
  useLeaderReport, useCreateLeaderReport, useUpdateLeaderReport, useSubmitLeaderReport,
} from '@/api/leader'
import Button from '@/components/ui/Button'
import ReportStatusBadge from '@/components/shared/ReportStatusBadge'

function lundiOfThisWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

const schema = z.object({
  week_start: z.string(),
  attendance_count: z.coerce.number().int().min(0).max(1000),
  new_members:      z.coerce.number().int().min(0).max(200).default(0),
  challenges: z.string().max(5000).optional().nullable(),
  highlights: z.string().max(5000).optional().nullable(),
  needs_followup: z.boolean().optional(),
})

export default function LeaderReportForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { data: existing, isLoading } = useLeaderReport(id)
  const create = useCreateLeaderReport()
  const update = useUpdateLeaderReport()
  const submit = useSubmitLeaderReport()

  const [form, setForm] = useState({
    week_start: lundiOfThisWeek(),
    attendance_count: 0,
    new_members: 0,
    challenges: '',
    highlights: '',
    needs_followup: false,
  })
  const [prayers, setPrayers] = useState([])     // [{title, requester, urgency}]
  const [activities, setActivities] = useState([]) // [{type, description, date, count}]
  const [errors, setErrors] = useState({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [reportId, setReportId] = useState(id ? Number(id) : null)

  useEffect(() => {
    if (existing) {
      setForm({
        week_start: existing.week_start ?? lundiOfThisWeek(),
        attendance_count: existing.attendance_count ?? 0,
        new_members: existing.new_members ?? 0,
        challenges: existing.challenges ?? '',
        highlights: existing.highlights ?? '',
        needs_followup: !!existing.needs_followup,
      })
      setPrayers(existing.prayer_requests ?? [])
      setActivities(existing.activities ?? [])
      setReportId(existing.id)
    }
  }, [existing])

  const isReadOnly = existing?.status && existing.status !== 'draft'

  const validate = () => {
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const errs = {}
      parsed.error.issues.forEach((i) => { errs[i.path[0]] = i.message })
      setErrors(errs)
      return null
    }
    setErrors({})
    return parsed.data
  }

  const buildPayload = (data) => ({
    ...data,
    prayer_requests: prayers.filter((p) => p.title),
    activities:      activities.filter((a) => a.type),
  })

  const handleSave = async () => {
    const data = validate()
    if (!data) return
    try {
      if (reportId) {
        await update.mutateAsync({ id: reportId, ...buildPayload(data) })
        toast.success('Brouillon sauvegardé.')
      } else {
        const resp = await create.mutateAsync(buildPayload(data))
        const newId = resp?.data?.id ?? resp?.id
        if (newId) {
          setReportId(newId)
          navigate(`/leader/rapports/${newId}`, { replace: true })
          toast.success('Brouillon créé.')
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur sauvegarde.')
    }
  }

  const handleSubmit = async () => {
    let rid = reportId
    if (!rid) {
      const data = validate()
      if (!data) { setShowConfirm(false); return }
      const resp = await create.mutateAsync(buildPayload(data))
      rid = resp?.data?.id ?? resp?.id
      setReportId(rid)
    } else {
      const data = validate()
      if (!data) { setShowConfirm(false); return }
      await update.mutateAsync({ id: rid, ...buildPayload(data) })
    }
    try {
      await submit.mutateAsync(rid)
      toast.success('Rapport soumis. Ton gouverneur en sera notifié.')
      navigate('/leader/rapports')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur soumission.')
    } finally {
      setShowConfirm(false)
    }
  }

  if (isLoading && id) {
    return <p className="text-sm text-white/60">Chargement...</p>
  }

  return (
    <div className="space-y-5">
      <Link to="/leader/rapports" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft size={14} /> Retour aux rapports
      </Link>

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {isEdit ? 'Modifier le rapport' : 'Nouveau rapport hebdo'}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {isReadOnly ? 'Rapport verrouillé (déjà soumis).' : 'Rempli au fil de la semaine — soumets à la fin.'}
          </p>
        </div>
        {existing?.status && <ReportStatusBadge status={existing.status} />}
      </header>

      <div className="rounded-xl bg-ink-900 border border-white/5 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Lundi de la semaine *" error={errors.week_start}>
            <input type="date" value={form.week_start}
                   onChange={(e) => setForm({ ...form, week_start: e.target.value })}
                   disabled={isReadOnly} className={inputCls} />
          </Field>
          <Field label="Présents *" error={errors.attendance_count}>
            <input type="number" min="0" max="1000" value={form.attendance_count}
                   onChange={(e) => setForm({ ...form, attendance_count: Number(e.target.value) })}
                   disabled={isReadOnly} className={inputCls} />
          </Field>
          <Field label="Nouveaux membres" error={errors.new_members}>
            <input type="number" min="0" max="200" value={form.new_members}
                   onChange={(e) => setForm({ ...form, new_members: Number(e.target.value) })}
                   disabled={isReadOnly} className={inputCls} />
          </Field>
        </div>

        <Field label="Points forts / témoignages">
          <textarea value={form.highlights} rows={3} maxLength={5000}
                    onChange={(e) => setForm({ ...form, highlights: e.target.value })}
                    disabled={isReadOnly} className={inputCls + ' resize-y'} />
        </Field>

        <Field label="Défis rencontrés">
          <textarea value={form.challenges} rows={3} maxLength={5000}
                    onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                    disabled={isReadOnly} className={inputCls + ' resize-y'} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
          <input type="checkbox" checked={form.needs_followup}
                 onChange={(e) => setForm({ ...form, needs_followup: e.target.checked })}
                 disabled={isReadOnly}
                 className="h-4 w-4 rounded border-white/20 bg-ink-950 text-orange-500 focus:ring-orange-500" />
          Marquer ce rapport comme nécessitant un suivi spécifique
        </label>
      </div>

      {/* Sujets de prière */}
      <DynamicList
        title="Sujets de prière"
        items={prayers} setItems={setPrayers}
        fields={[
          { key: 'title',     placeholder: 'Sujet de prière' },
          { key: 'requester', placeholder: 'Demandeur (optionnel)' },
          { key: 'urgency',   type: 'select', options: [
            { value: 'low', label: 'Normal' }, { value: 'medium', label: 'Important' }, { value: 'high', label: 'Urgent' },
          ]},
        ]}
        disabled={isReadOnly}
      />

      {/* Activités */}
      <DynamicList
        title="Activités de la semaine"
        items={activities} setItems={setActivities}
        fields={[
          { key: 'type',        placeholder: 'Type (ex: évangélisation)' },
          { key: 'description', placeholder: 'Description' },
          { key: 'count',       type: 'number', placeholder: 'Nb participants' },
          { key: 'date',        type: 'date' },
        ]}
        disabled={isReadOnly}
      />

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleSave} disabled={update.isPending || create.isPending} className="gap-2">
            <Save size={16} /> Sauvegarder brouillon
          </Button>
          <Button onClick={() => setShowConfirm(true)} className="gap-2">
            <Send size={16} /> Soumettre
          </Button>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-ink-900 rounded-xl border border-white/10 w-full max-w-md p-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-lg font-semibold text-white">Confirmer la soumission</h3>
                <p className="text-sm text-white/70 mt-2">
                  Une fois soumis, le rapport ne pourra plus être modifié sans intervention admin.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="ghost" onClick={() => setShowConfirm(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={submit.isPending}>
                {submit.isPending ? <Loader2 className="animate-spin" size={14} /> : 'Confirmer'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function DynamicList({ title, items, setItems, fields, disabled }) {
  const empty = Object.fromEntries(fields.map((f) => [f.key, f.type === 'number' ? null : '']))
  const add = () => setItems((arr) => [...arr, { ...empty }])
  const remove = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i))
  const update = (i, k, v) => setItems((arr) => arr.map((row, idx) => idx === i ? { ...row, [k]: v } : row))

  return (
    <div className="rounded-xl bg-ink-900 border border-white/5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{title}</h3>
        {!disabled && (
          <button onClick={add} className="text-xs text-gold-300 hover:text-gold-200 flex items-center gap-1">
            <Plus size={12} /> Ajouter
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-white/40">Aucun élément.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((row, i) => (
            <li key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
              {fields.map((f) => {
                const colSpan = f.type === 'select' || f.type === 'number' || f.type === 'date' ? 'sm:col-span-1' : 'sm:col-span-1'
                if (f.type === 'select') {
                  return (
                    <select
                      key={f.key} value={row[f.key] ?? ''} disabled={disabled}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      className={`${inputCls} ${colSpan}`}
                    >
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )
                }
                return (
                  <input
                    key={f.key}
                    type={f.type ?? 'text'} value={row[f.key] ?? ''}
                    placeholder={f.placeholder} disabled={disabled}
                    onChange={(e) => update(i, f.key, f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
                    className={`${inputCls} ${colSpan}`}
                  />
                )
              })}
              {!disabled && (
                <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 justify-self-end" aria-label="Supprimer">
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const inputCls = 'w-full rounded-lg bg-ink-950 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-gold-500 focus:outline-none'

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm text-white/80 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
