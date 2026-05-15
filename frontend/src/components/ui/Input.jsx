/**
 * Input — champ de formulaire branded NWC, compatible react-hook-form (forwardRef).
 *
 * Affiche un label, le champ stylisé, l'erreur de validation, et un helper text.
 */
import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Input = forwardRef(function Input(
  { label, error, helper, className = '', type = 'text', id, required, ...props },
  ref
) {
  // Génère un id stable si pas fourni (pour lier label + input).
  const fieldId = id || `field-${Math.random().toString(36).slice(2, 9)}`

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-white/80 mb-1.5">
          {label}
          {required && <span className="text-accent ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        type={type}
        className={cn('input-nwc', error && 'border-accent focus:ring-accent', className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : helper ? `${fieldId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-accent">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${fieldId}-helper`} className="mt-1.5 text-xs text-white/40">
          {helper}
        </p>
      )}
    </div>
  )
})

export default Input
