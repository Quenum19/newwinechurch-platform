/**
 * BalEnrollmentModal — Formulaire "Rejoindre la New Wine Church"
 *
 * Déclenché depuis le CTA de FollowUsPage (page pointée par le QR "Suis-nous"
 * imprimé au verso des supports de table du bal 2026).
 *
 *  - Champs courts : prénom, nom, téléphone (obligatoires) + email, whatsapp,
 *    ville (facultatifs) → optimisé pour saisie mobile la nuit du bal.
 *  - Choix engagement : découvrir OU servir dans un département.
 *  - Si département : grid visuelle des départements actifs (fetch API).
 *  - Écrit dans membership_requests avec source='bal-2026'.
 */
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Loader2, Sparkles, HeartHandshake, ArrowRight, Check } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export default function BalEnrollmentModal({ open, onClose }) {
  const [form, setForm] = useState({
    first_name: '',
    name: '',
    phone: '',
    email: '',
    whatsapp: '',
    city: '',
  })
  const [enrollmentType, setEnrollmentType] = useState('discover')
  const [departmentId, setDepartmentId] = useState(null)
  const [departments, setDepartments] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!open) return
    axios.get(`${baseURL}/public/enrollment/departments`)
      .then((r) => setDepartments(r.data.departments ?? []))
      .catch(() => setDepartments([]))
  }, [open])

  // Reset quand la modal se ferme
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setForm({ first_name: '', name: '', phone: '', email: '', whatsapp: '', city: '' })
      setEnrollmentType('discover')
      setDepartmentId(null)
      setDone(false)
    }, 300)
    return () => clearTimeout(t)
  }, [open])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const canSubmit =
    form.first_name.trim() &&
    form.name.trim() &&
    form.phone.trim() &&
    (enrollmentType === 'discover' || departmentId)

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      await axios.post(`${baseURL}/public/enrollment/bal`, {
        ...form,
        enrollment_type: enrollmentType,
        department_id: enrollmentType === 'department' ? departmentId : null,
      })
      setDone(true)
      toast.success('Merci ! Nous te contacterons très bientôt.')
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Une erreur est survenue. Réessaye.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Écran de confirmation (après submit réussi)
  if (done) {
    return (
      <Modal open={open} onClose={onClose} size="md">
        <div className="text-center py-6 px-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#8B1A2F] flex items-center justify-center mb-4">
            <Check size={32} className="text-white"/>
          </div>
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: '"Playfair Display", serif' }}>
            Bienvenue dans la famille !
          </h2>
          <p className="text-[#5C4A3D] mb-6 leading-relaxed">
            L'équipe accueil va te contacter très bientôt pour t'accompagner
            dans les prochains pas.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#0A0A0A] text-[#F5E6C8] rounded-lg font-semibold hover:bg-[#1a0f14] transition"
          >
            Fermer
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Rejoindre la New Wine Church"
      description="Un premier pas simple — le reste se fera ensemble."
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Bloc contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Prénom *" value={form.first_name} onChange={set('first_name')} />
          <Field label="Nom *" value={form.name} onChange={set('name')} />
          <Field label="Téléphone *" value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" />
          <Field label="WhatsApp (facultatif)" value={form.whatsapp} onChange={set('whatsapp')} type="tel" inputMode="tel" />
          <Field label="Email (facultatif)" value={form.email} onChange={set('email')} type="email" inputMode="email" />
          <Field label="Ville (facultatif)" value={form.city} onChange={set('city')} />
        </div>

        {/* Choix engagement — 2 grosses cards */}
        <div>
          <label className="block text-sm font-semibold text-[#5C4A3D] mb-2 uppercase tracking-wider">
            Quel est ton souhait ?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EngagementCard
              active={enrollmentType === 'discover'}
              onClick={() => setEnrollmentType('discover')}
              icon={Sparkles}
              title="Je veux découvrir"
              subtitle="Venir aux cultes, être accueilli(e), faire connaissance"
            />
            <EngagementCard
              active={enrollmentType === 'department'}
              onClick={() => setEnrollmentType('department')}
              icon={HeartHandshake}
              title="Je veux servir"
              subtitle="Rejoindre un département et m'engager"
            />
          </div>
        </div>

        {/* Grid départements — visible seulement si "servir" */}
        {enrollmentType === 'department' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#5C4A3D] uppercase tracking-wider">
              Choisis ton département
            </label>
            {departments.length === 0 ? (
              <div className="text-sm text-[#8B7960] py-4 text-center italic">
                Chargement des départements…
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                {departments.map((d) => (
                  <DepartmentCard
                    key={d.id}
                    dept={d}
                    active={departmentId === d.id}
                    onClick={() => setDepartmentId(d.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-[#5C4A3D] hover:bg-[#EFE7D4] transition font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="px-6 py-2.5 rounded-lg bg-[#8B1A2F] text-white font-semibold hover:bg-[#6b1523] transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin"/> : <ArrowRight size={18}/>}
            Envoyer
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

function Field({ label, ...rest }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[#5C4A3D] mb-1 uppercase tracking-wider">
        {label}
      </span>
      <input
        {...rest}
        className="w-full px-3 py-2.5 rounded-lg border-2 border-[#E5DBC3] bg-white text-[#0A0A0A] focus:outline-none focus:border-[#8B1A2F] transition"
      />
    </label>
  )
}

function EngagementCard({ active, onClick, icon: Icon, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-lg border-2 transition ${
        active
          ? 'border-[#8B1A2F] bg-[#8B1A2F]/5 shadow-sm'
          : 'border-[#E5DBC3] bg-white hover:border-[#C9A961]'
      }`}
    >
      <Icon size={22} className={active ? 'text-[#8B1A2F]' : 'text-[#C9A961]'} />
      <div className="font-bold text-[#0A0A0A] mt-2">{title}</div>
      <div className="text-xs text-[#5C4A3D] mt-1 leading-snug">{subtitle}</div>
    </button>
  )
}

function DepartmentCard({ dept, active, onClick }) {
  const color = dept.color || '#8B1A2F'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border-2 transition ${
        active
          ? 'border-[#8B1A2F] bg-[#8B1A2F]/5'
          : 'border-[#E5DBC3] bg-white hover:border-[#C9A961]'
      }`}
      title={dept.description}
    >
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold mb-1.5"
        style={{ background: color }}
      >
        {(dept.icon && dept.icon.length <= 2) ? dept.icon : dept.name[0]}
      </div>
      <div className="text-sm font-semibold text-[#0A0A0A] leading-tight">
        {dept.name}
      </div>
    </button>
  )
}
