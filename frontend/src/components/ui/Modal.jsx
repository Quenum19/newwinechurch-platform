/**
 * Modal — composant partagé pour TOUS les dialogues de l'app.
 *
 *  - Fond ivoire chaud (#FAF6EE) : chaleureux, lisible, accordé avec gold/wine.
 *  - Backdrop sombre 70% pour focus l'attention.
 *  - Animation : crossfade + scale léger (Framer Motion).
 *  - Click outside et touche Escape : ferme.
 *  - Slots : title, description, children (body), footer (boutons d'action).
 *  - Accessibilité : aria-labelledby, role="dialog", autofocus du premier focusable.
 *
 *  Usage :
 *    <Modal open={open} onClose={close} title="Confirmer" description="...">
 *      <p>Corps du dialogue.</p>
 *      <Modal.Footer>
 *        <Button variant="ghost" onClick={close}>Annuler</Button>
 *        <Button onClick={confirm}>Valider</Button>
 *      </Modal.Footer>
 *    </Modal>
 */
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const SIZE = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    // Verrouille le scroll du body pendant que la modal est ouverte.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm"
          onClick={() => closeOnBackdrop && onClose?.()}
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'nwc-modal-title' : undefined}
            className={cn(
              'nwc-modal w-full rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col max-h-[90vh]',
              SIZE[size] ?? SIZE.md,
              className,
            )}
          >
            {(title || showCloseButton) && (
              <header className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-3 border-b border-[#E8DFC9]">
                <div className="min-w-0">
                  {title && (
                    <h2 id="nwc-modal-title" className="text-[17px] sm:text-[18px] font-semibold text-[#1F1A14] leading-tight">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-[13px] text-[#6B5F4E] mt-1 leading-snug">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 -mr-1 rounded-md text-[#6B5F4E] hover:text-[#1F1A14] hover:bg-[#F0E7D1] transition shrink-0"
                    aria-label="Fermer"
                  >
                    <X size={18} />
                  </button>
                )}
              </header>
            )}
            <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1 text-[14px] text-[#2D261D] leading-relaxed">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Modal.Footer — zone d'actions en bas (boutons primaire / secondaire).
 * Bordure top + fond légèrement plus chaud pour séparer du body.
 */
Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div className={cn(
      'flex flex-wrap items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-[#E8DFC9] bg-[#F5EFE2]',
      className,
    )}>
      {children}
    </div>
  )
}
