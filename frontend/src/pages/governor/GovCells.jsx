/**
 * GovCells — grid des cellules du périmètre du gouverneur.
 * Création cellule + assignation leader via modales.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { Plus, MapPin, Clock, Users, UserCog, Loader2 } from 'lucide-react'
import {
  useGovernorCells,
  useCreateGovernorCell,
  useAssignCellLeader,
  useGovernorMembers,
} from '@/api/governor'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import CellHealthIndicator from '@/components/shared/CellHealthIndicator'
import { SkeletonCard } from '@/components/shared/Skeleton'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const cellSchema = z.object({
  name:      z.string().min(3).max(120),
  zone:      z.string().max(100).optional().nullable(),
  leader_id: z.coerce.number().int().positive(),
  meeting_day:  z.enum(DAYS).optional().nullable(),
  meeting_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  meeting_location: z.string().max(255).optional().nullable(),
  target_size:  z.coerce.number().int().min(1).max(100).default(12),
  whatsapp_link:z.string().url().optional().nullable(),
})

export default function GovCells() {
  const { data, isLoading } = useGovernorCells()
  const [showCreate, setShowCreate] = useState(false)
  const [assignFor, setAssignFor] = useState(null)
  const cells = data?.data ?? []

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cellules</h1>
          <p className="text-sm text-white/50 mt-1">Toutes les cellules dont le leader fait partie de ton département.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus size={16} />
          Créer une cellule
        </Button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : cells.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-ink-900 p-10 text-center">
          <p className="text-sm text-white/60">Aucune cellule dans ton périmètre pour le moment.</p>
          <Button onClick={() => setShowCreate(true)} variant="secondary" className="mt-4 gap-2">
            <Plus size={16} /> Créer la première
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cells.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl bg-ink-900 border border-white/5 p-5 flex flex-col hover:border-gold-500/30 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <Link to={`/gouverneur/cellules/${c.id}`} className="text-base font-semibold text-white hover:text-gold-300 transition truncate">
                  {c.name}
                </Link>
                <CellHealthIndicator status={c.health_status ?? 'good'} />
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-white/60">
                {c.zone && <div className="flex items-center gap-1.5"><MapPin size={12} />{c.zone}</div>}
                {(c.meeting_day || c.meeting_time) && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {c.meeting_day && <span className="capitalize">{c.meeting_day}</span>}
                    {c.meeting_time && <span>· {c.meeting_time}</span>}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users size={12} />
                  {c.members_count ?? 0} membre{(c.members_count ?? 0) > 1 ? 's' : ''}
                  {c.attendance_rate_4w != null && ` · ${c.attendance_rate_4w}% présence`}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {c.leader?.avatar ? (
                    <img src={c.leader.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-wine-700 text-white text-xs flex items-center justify-center">
                      {(c.leader?.full_name?.[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-white/70 truncate">{c.leader?.full_name ?? 'Sans leader'}</span>
                </div>
                <button
                  onClick={() => setAssignFor(c)}
                  className="text-xs text-gold-300 hover:text-gold-200 flex items-center gap-1"
                  aria-label="Changer le leader"
                >
                  <UserCog size={12} /> Leader
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && <CreateCellModal onClose={() => setShowCreate(false)} />}
      {assignFor && <AssignLeaderModal cell={assignFor} onClose={() => setAssignFor(null)} />}
    </div>
  )
}

function CreateCellModal({ onClose }) {
  const create = useCreateGovernorCell()
  const { data: members } = useGovernorMembers({ per_page: 100 })
  const [form, setForm] = useState({
    name: '', zone: '', leader_id: '', meeting_day: '', meeting_time: '',
    meeting_location: '', target_size: 12, whatsapp_link: '',
  })
  const [errors, setErrors] = useState({})

  const submit = async (e) => {
    e.preventDefault()
    const parsed = cellSchema.safeParse({
      ...form,
      target_size: form.target_size || 12,
      whatsapp_link: form.whatsapp_link || null,
    })
    if (!parsed.success) {
      const errs = {}
      parsed.error.issues.forEach((i) => { errs[i.path[0]] = i.message })
      setErrors(errs)
      return
    }
    try {
      await create.mutateAsync(Object.fromEntries(
        Object.entries(parsed.data).filter(([_, v]) => v != null && v !== '')
      ))
      toast.success('Cellule créée.')
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur création.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Créer une cellule"
      description="Renseigne les informations essentielles. Tu pourras affiner plus tard."
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom *" error={errors.name}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Cellule Cocody Centre"
          />
        </Field>
        <Field label="Leader *" error={errors.leader_id}>
          <select
            value={form.leader_id}
            onChange={(e) => setForm({ ...form, leader_id: e.target.value })}
          >
            <option value="">— Sélectionner un membre —</option>
            {(members?.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name ?? `${m.first_name} ${m.name}`.trim()}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zone">
            <input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
          </Field>
          <Field label="Taille cible">
            <input
              type="number" min="1" max="100" value={form.target_size}
              onChange={(e) => setForm({ ...form, target_size: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jour de réunion">
            <select value={form.meeting_day} onChange={(e) => setForm({ ...form, meeting_day: e.target.value })}>
              <option value="">—</option>
              {DAYS.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
            </select>
          </Field>
          <Field label="Heure">
            <input type="time" value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
          </Field>
        </div>
        <Field label="Lieu de réunion">
          <input value={form.meeting_location} onChange={(e) => setForm({ ...form, meeting_location: e.target.value })} />
        </Field>
        <Field label="Lien WhatsApp" error={errors.whatsapp_link}>
          <input
            value={form.whatsapp_link}
            onChange={(e) => setForm({ ...form, whatsapp_link: e.target.value })}
            placeholder="https://chat.whatsapp.com/..."
          />
        </Field>
        {/* Soumission via Footer ; ne pas oublier type=submit pour Enter clavier. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>

      <Modal.Footer>
        <button type="button" className="nwc-btn-ghost" onClick={onClose}>Annuler</button>
        <button
          type="button"
          className="nwc-btn-primary"
          onClick={submit}
          disabled={create.isPending}
        >
          {create.isPending && <Loader2 size={14} className="animate-spin" />}
          {create.isPending ? 'Création…' : 'Créer la cellule'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

function AssignLeaderModal({ cell, onClose }) {
  const { data: members } = useGovernorMembers({ per_page: 100 })
  const assign = useAssignCellLeader()
  const [userId, setUserId] = useState('')
  const [notes, setNotes]   = useState('')

  const confirm = async () => {
    if (!userId) return
    try {
      await assign.mutateAsync({ cellId: cell.id, userId: Number(userId), notes })
      toast.success('Leader assigné.')
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Erreur assignation.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Assigner un leader"
      description={`Cellule : ${cell.name}`}
    >
      <div className="space-y-3">
        <Field label="Nouveau leader (membre du département)">
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {(members?.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name ?? `${m.first_name} ${m.name}`.trim()}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes (optionnel)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
      </div>

      <Modal.Footer>
        <button type="button" className="nwc-btn-ghost" onClick={onClose}>Annuler</button>
        <button
          type="button"
          className="nwc-btn-primary"
          onClick={confirm}
          disabled={!userId || assign.isPending}
        >
          {assign.isPending && <Loader2 size={14} className="animate-spin" />}
          {assign.isPending ? 'Assignation…' : 'Confirmer'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

/** Field — wrapper label + erreur, utilise les styles ivoire de .nwc-modal. */
function Field({ label, error, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
      {error && <p className="nwc-error">{error}</p>}
    </div>
  )
}
