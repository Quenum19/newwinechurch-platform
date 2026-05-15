/**
 * MembershipRequestsPage — Admin/RH : liste + traitement des demandes d'adhésion.
 *
 *  - Filtres : status (pending par défaut), search (nom/email)
 *  - Cards de demande avec actions Approuver / Rejeter
 *  - Modale d'approbation : mot de passe initial (défaut "password")
 *  - Modale de rejet : raison facultative
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CheckCircle2, XCircle, Mail, Phone, Calendar, MapPin,
  Loader2, X, AlertCircle, UserCheck,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { membershipRequests } from '@/api/admin'

const STATUS_META = {
  pending:   { cls: 'adm-badge-warning', label: 'En attente' },
  approved:  { cls: 'adm-badge-success', label: 'Approuvée' },
  rejected:  { cls: 'adm-badge-danger',  label: 'Rejetée' },
}

export default function MembershipRequestsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [approving, setApproving] = useState(null)
  const [rejecting, setRejecting] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'membership-requests', status, search],
    queryFn: () => membershipRequests.list({ status: status || undefined, search: search || undefined }),
  })
  const items = data?.data?.data ?? data?.data ?? []

  const reject = useMutation({
    mutationFn: ({ id, reason }) => membershipRequests.reject(id, reason),
    onSuccess: (r) => {
      toast.success(r?.message ?? 'Demande rejetée.')
      qc.invalidateQueries({ queryKey: ['admin', 'membership-requests'] })
      setRejecting(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur.'),
  })

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1>Demandes d'adhésion</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--adm-text-muted)' }}>
          Approuver une demande crée un compte avec mot de passe par défaut <code>password</code>
          (à modifier à la 1<sup>re</sup> connexion). Un email est envoyé au candidat.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="adm-input">
          <option value="">Tous statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
        </select>
        <input value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Rechercher (nom, email, téléphone)…"
               className="adm-input flex-1 max-w-md" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="adm-card h-44 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="adm-card p-10 text-center" style={{ color: 'var(--adm-text-muted)' }}>
          <UserCheck size={28} className="mx-auto mb-2 opacity-40" />
          Aucune demande {status || 'à afficher'}.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onApprove={() => setApproving(req)}
              onReject={() => setRejecting(req)}
            />
          ))}
        </div>
      )}

      {approving && (
        <ApproveModal
          req={approving}
          onClose={() => setApproving(null)}
          onSaved={() => {
            setApproving(null)
            qc.invalidateQueries({ queryKey: ['admin', 'membership-requests'] })
          }}
        />
      )}

      {rejecting && (
        <RejectModal
          req={rejecting}
          busy={reject.isPending}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => reject.mutate({ id: rejecting.id, reason })}
        />
      )}
    </div>
  )
}

function RequestCard({ req, onApprove, onReject }) {
  const meta = STATUS_META[req.status] ?? STATUS_META.pending
  const isPending = req.status === 'pending'
  const fullName = `${req.first_name ?? ''} ${req.name ?? ''}`.trim()

  return (
    <article className="adm-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[15px] truncate" style={{ color: 'var(--adm-text)' }}>
            {fullName || '(Sans nom)'}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--adm-text-muted)' }}>
            Reçue {format(new Date(req.created_at), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        <span className={`adm-badge ${meta.cls}`}>{meta.label}</span>
      </div>

      <dl className="space-y-1.5 text-sm">
        <Field icon={Mail} label={req.email} />
        {req.phone && <Field icon={Phone} label={req.phone} />}
        {req.birth_date && (
          <Field icon={Calendar} label={format(new Date(req.birth_date), 'd MMM yyyy', { locale: fr })} />
        )}
        {req.city && <Field icon={MapPin} label={req.city} />}
      </dl>

      {req.referrer && (
        <p className="mt-3 text-xs" style={{ color: 'var(--adm-text-muted)' }}>
          <strong style={{ color: 'var(--adm-text)' }}>Référent :</strong> {req.referrer}
        </p>
      )}

      {req.motivation && (
        <p className="mt-2 text-xs italic line-clamp-3 p-2 rounded"
           style={{ background: 'var(--adm-bg-soft)', color: 'var(--adm-text-muted)' }}>
          « {req.motivation} »
        </p>
      )}

      {req.status === 'rejected' && req.rejection_reason && (
        <div className="mt-3 p-2 rounded text-xs" style={{ background: '#FEF2F2', color: '#991B1B' }}>
          <strong>Motif du rejet :</strong> {req.rejection_reason}
        </div>
      )}

      {req.status === 'approved' && req.user_id && (
        <p className="mt-3 text-xs inline-flex items-center gap-1" style={{ color: '#16A34A' }}>
          <CheckCircle2 size={12} /> Compte créé (#{req.user_id})
        </p>
      )}

      {isPending && (
        <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--adm-border)' }}>
          <button onClick={onApprove} className="adm-btn adm-btn-primary text-sm flex-1">
            <CheckCircle2 size={14} /> Approuver
          </button>
          <button onClick={onReject}
                  className="adm-btn text-sm"
                  style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
            <XCircle size={14} /> Rejeter
          </button>
        </div>
      )}
    </article>
  )
}

function Field({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--adm-text)' }}>
      <Icon size={14} className="shrink-0" style={{ color: 'var(--adm-text-muted)' }} />
      <span className="truncate">{label}</span>
    </div>
  )
}

function ApproveModal({ req, onClose, onSaved }) {
  const [initialPassword, setInitialPassword] = useState('password')
  const fullName = `${req.first_name ?? ''} ${req.name ?? ''}`.trim()

  const approve = useMutation({
    mutationFn: () => membershipRequests.approve(req.id, initialPassword),
    onSuccess: (r) => {
      toast.success(r?.message ?? 'Demande approuvée.')
      onSaved()
    },
    onError: (err) => {
      const errs = err?.response?.data?.errors
      const first = errs ? Object.values(errs).flat()[0] : err?.response?.data?.message
      toast.error(first || 'Erreur.')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="adm-card p-5 sm:p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--adm-text)' }}>
            Approuver la demande
          </h2>
          <button onClick={onClose} className="adm-btn-icon"><X size={16} /></button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--adm-text-muted)' }}>
          Tu vas créer un compte pour <strong style={{ color: 'var(--adm-text)' }}>{fullName}</strong>
          {' '}(<code>{req.email}</code>) et lui envoyer ses accès par email.
        </p>

        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--adm-text-faint)' }}>
            Mot de passe initial
          </label>
          <input
            type="text"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
            className="adm-input w-full font-mono"
            placeholder="password"
          />
          <p className="mt-1.5 text-xs" style={{ color: 'var(--adm-text-faint)' }}>
            Communiqué dans l'email. L'utilisateur DEVRA le changer à sa 1<sup>re</sup> connexion.
          </p>
        </div>

        <div className="p-3 rounded text-xs mb-4" style={{ background: '#FEF3C7', color: '#92400E' }}>
          <AlertCircle size={14} className="inline mr-1" />
          Le rôle <strong>membre</strong> sera attribué. Pour un staff (gouverneur, leader, RH…),
          va modifier le rôle après création depuis <em>Utilisateurs & rôles</em>.
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="adm-btn adm-btn-secondary">Annuler</button>
          <button onClick={() => approve.mutate()}
                  disabled={approve.isPending || initialPassword.length < 6}
                  className="adm-btn adm-btn-primary">
            {approve.isPending && <Loader2 size={14} className="animate-spin" />}
            Confirmer l'approbation
          </button>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ req, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const fullName = `${req.first_name ?? ''} ${req.name ?? ''}`.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="adm-card p-5 sm:p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg" style={{ color: 'var(--adm-text)' }}>
            Rejeter la demande
          </h2>
          <button onClick={onClose} className="adm-btn-icon"><X size={16} /></button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--adm-text-muted)' }}>
          Rejeter la demande de <strong style={{ color: 'var(--adm-text)' }}>{fullName}</strong>.
          La raison est facultative et n'est pas envoyée par mail (modifiable si besoin).
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Motif (optionnel) — visible uniquement en interne"
          className="adm-input w-full"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="adm-btn adm-btn-secondary">Annuler</button>
          <button onClick={() => onConfirm(reason)}
                  disabled={busy}
                  className="adm-btn"
                  style={{ background: '#b91c1c', color: '#fff', borderColor: '#b91c1c' }}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            Confirmer le rejet
          </button>
        </div>
      </div>
    </div>
  )
}
