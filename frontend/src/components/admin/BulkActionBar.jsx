/**
 * Barre d'actions groupées — sticky bottom, apparaît quand selection > 0.
 *
 * Usage générique :
 *   <BulkActionBar
 *     count={sel.count}
 *     onClear={sel.clear}
 *     label="média"          // pluriel "s" auto
 *     actions={[
 *       { key: 'publish',   label: 'Publier',    icon: Eye,     onClick: () => doBulk('publish') },
 *       { key: 'unpublish', label: 'Dépublier',  icon: EyeOff,  onClick: () => doBulk('unpublish') },
 *       { key: 'delete',    label: 'Supprimer',  icon: Trash2,  variant: 'danger', confirm: true, onClick: () => doBulk('delete') },
 *     ]}
 *   />
 *
 * - `variant: 'danger'` → bouton rouge
 * - `confirm: true`     → ouvre une Modal de confirmation avant exécution
 * - Animation slide-up via framer-motion (déjà dans le bundle via Modal)
 */
import { AnimatePresence, motion } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

import Modal from '@/components/ui/Modal.jsx'

export default function BulkActionBar({
  count,
  onClear,
  actions = [],
  label = 'élément',
  pluralSuffix = 's',
  className = '',
}) {
  const [confirming, setConfirming] = useState(null) // action à confirmer
  const labelDisplay = `${count} ${label}${count > 1 ? pluralSuffix : ''} sélectionné${count > 1 ? 's' : ''}`

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${className}`}
            role="region"
            aria-label="Actions groupées"
          >
            <div
              className="flex items-center gap-1 px-2 py-2 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border"
              style={{ background: '#0F0D08', borderColor: '#C9A961' }}
            >
              <button
                onClick={onClear}
                className="h-8 w-8 rounded-full flex items-center justify-center transition"
                style={{ color: '#FAF6EE' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Désélectionner tout"
                aria-label="Désélectionner tout"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
              <span
                className="text-sm font-semibold pl-2 pr-3 mr-1 border-r"
                style={{ color: '#FAF6EE', borderColor: 'rgba(201,169,97,0.4)' }}
              >
                {labelDisplay}
              </span>
              <div className="flex items-center gap-0.5">
                {actions.map((a) => {
                  const Icon = a.icon
                  const isDanger = a.variant === 'danger'
                  return (
                    <button
                      key={a.key}
                      onClick={() => a.confirm ? setConfirming(a) : a.onClick()}
                      disabled={a.disabled}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ color: isDanger ? '#FCA5A5' : '#FAF6EE' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isDanger ? 'rgba(239,68,68,0.18)' : 'rgba(201,169,97,0.18)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      title={a.title || a.label}
                    >
                      {Icon && <Icon size={14} strokeWidth={2.2} />}
                      {a.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmation pour les actions sensibles */}
      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={confirming?.confirmTitle || `Confirmer : ${confirming?.label}`}
        size="sm"
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
            <AlertTriangle size={16} />
          </div>
          <p>
            {confirming?.confirmText ||
              `Appliquer "${confirming?.label}" sur ${labelDisplay} ?`}
          </p>
        </div>
        <Modal.Footer>
          <button onClick={() => setConfirming(null)} className="adm-btn">Annuler</button>
          <button
            onClick={() => { confirming?.onClick(); setConfirming(null) }}
            className={`adm-btn ${confirming?.variant === 'danger' ? 'adm-btn-danger' : 'adm-btn-primary'}`}
          >
            {confirming?.confirmCta || confirming?.label}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
