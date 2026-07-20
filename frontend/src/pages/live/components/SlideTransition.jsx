/**
 * ==============================================================
 *  SlideTransition — Wrapper AnimatePresence pour crossfade 0.5s
 *
 *  Chaque slide entre en fondu + léger scale (1.02 → 1) pour une
 *  sensation cinéma. Sortie en fondu simple pour laisser la nouvelle
 *  slide "prendre" l'écran.
 * ==============================================================
 */
import { AnimatePresence, motion } from 'framer-motion'

/**
 * @param {object} props
 * @param {string} props.slideKey — Clé unique de la slide courante (déclenche la transition)
 * @param {React.ReactNode} props.children
 */
export default function SlideTransition({ slideKey, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slideKey}
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
