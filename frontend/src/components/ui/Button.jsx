/**
 * Button — composant bouton réutilisable.
 * Variantes : primary (bordeaux), secondary (or), ghost (outline).
 * Gère l'état loading (désactive + spinner).
 */
import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import Spinner from './Spinner.jsx'

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
}

const Button = forwardRef(function Button(
  { variant = 'primary', loading = false, disabled = false, children, className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(variants[variant] || variants.primary, className, loading && 'opacity-80')}
      {...props}
    >
      {loading && <Spinner size={16} className="text-current" />}
      {children}
    </button>
  )
})

export default Button
