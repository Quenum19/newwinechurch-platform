/**
 * Phase 6 — Modal de remboursement / annulation.
 *
 * Mode 'ticket'  : rembourse 1 ticket précis
 * Mode 'order'   : rembourse toute une commande (order_code)
 * Mode 'event'   : annule tout un event (bulk)
 *
 * Pour les paiements payés (paid), demande méthode + référence de la transaction
 * sortante Mobile Money — l'admin a fait le virement manuellement et le déclare.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'

import Modal from '@/components/ui/Modal.jsx'
import { events } from '@/api/admin'

export default function RefundModal({ open, onClose, target, onDone }) {
  const [reason, setReason]       = useState('')
  const [method, setMethod]       = useState('')
  const [reference, setReference] = useState('')
  const [force, setForce]         = useState(false)

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { reason, ...(method && { method }), ...(reference && { reference }), force }
      if (target.kind === 'ticket') return events.refundTicket(target.id, payload)
      if (target.kind === 'order')  return events.refundOrder(target.orderCode, payload)
      if (target.kind === 'event')  return events.refundWholeEvent(target.eventId, reason)
      throw new Error('Cible invalide')
    },
    onSuccess: (r) => {
      toast.success(r.message || 'Remboursement effectué.')
      onDone?.()
      onClose()
      // Reset
      setReason(''); setMethod(''); setReference(''); setForce(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur.'),
  })

  const isBulkEvent  = target?.kind === 'event'
  const isPaid       = target?.isPaid === true
  const amount       = target?.amount ?? 0
  const ticketsCount = target?.ticketsCount ?? 1

  return (
    <Modal open={open} onClose={onClose}
           title={isBulkEvent ? "Annuler tout l'événement"
                              : target?.kind === 'order' ? `Rembourser la commande ${target.orderCode}`
                              : 'Rembourser ce ticket'}>
      <div className="space-y-4">
        {/* Bandeau récap */}
        <div className="p-3 bg-orange-50 border border-orange-300 text-sm">
          <p className="font-medium text-orange-900 inline-flex items-center gap-2">
            <AlertTriangle size={14}/>
            {isBulkEvent
              ? `Cette action remboursera tous les tickets payés de l'event et annulera les autres.`
              : target?.kind === 'order'
                ? `${ticketsCount} ticket(s) seront annulés.`
                : `1 ticket sera annulé.`}
          </p>
          {amount > 0 && !isBulkEvent && (
            <p className="text-xs mt-1 text-orange-800">
              Montant à rembourser : <strong>{new Intl.NumberFormat('fr-FR').format(amount)} FCFA</strong>
              {' — '} envoie la somme via Mobile Money <strong>AVANT</strong> de valider.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Raison *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    rows="2" required
                    placeholder="ex: Annulation event · changement personnel · erreur d'inscription"
                    className="adm-input"/>
        </div>

        {isPaid && !isBulkEvent && (
          <>
            <p className="text-xs uppercase tracking-wider font-mono text-public-flame">
              Transaction sortante Mobile Money
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Méthode</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="adm-input">
                  <option value="">— Sélectionne —</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="wave">Wave</option>
                  <option value="mtn_momo">MTN MoMo</option>
                  <option value="moov_money">Moov Money</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-mono mb-1 text-public-ink/60">Référence transaction</label>
                <input value={reference} onChange={(e) => setReference(e.target.value)}
                       placeholder="ex: REFUND-OM-001" className="adm-input font-mono"/>
              </div>
            </div>
          </>
        )}

        {/* Force (uniquement utile si superadmin et ticket already used) */}
        {target?.allowForce && (
          <label className="flex items-center gap-2 text-xs cursor-pointer p-3 bg-red-50 border border-red-300">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)}
                   className="h-4 w-4 accent-red-600"/>
            <span className="text-red-900">
              <strong>Forcer</strong> : rembourser même les tickets déjà entrés (action exceptionnelle).
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-public-ink/10">
          <button onClick={onClose}
                  className="px-4 py-2 text-xs uppercase tracking-wider font-mono border-2 border-public-ink/15">
            Annuler
          </button>
          <button onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || reason.length < 3}
                  className="px-4 py-2 text-xs uppercase tracking-wider font-mono bg-red-600 text-white disabled:opacity-50 inline-flex items-center gap-2">
            {mutation.isPending && <Loader2 size={12} className="animate-spin"/>}
            Confirmer {isPaid ? 'remboursement' : 'annulation'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
