/**
 * AuthInput v3 — floating label + focus animé.
 *
 *  - Label centré verticalement quand vide, monte en haut au focus/contenu
 *  - Focus ring discret (4px à 8% d'opacité)
 *  - Icône gauche optionnelle (passe en gris foncé au focus)
 *  - Type password : toggle œil
 *  - Compatible react-hook-form (forwardRef)
 *  - Pour les types date/time/file : label statique (le navigateur impose son UI)
 */
import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'

const AuthInput = forwardRef(function AuthInput(
  {
    label, error, helper, className = '', type = 'text', id, required,
    leftIcon: LeftIcon,
    value, defaultValue, placeholder,
    onFocus, onBlur, onChange,
    ...props
  },
  ref,
) {
  const fieldId = id || `auth-${Math.random().toString(36).slice(2, 9)}`
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hasContent, setHasContent] = useState(!!(value ?? defaultValue ?? ''))

  const isPassword = type === 'password'
  const effectiveType = isPassword && show ? 'text' : type

  // Floating label désactivé pour ces types (UI native du navigateur).
  const floatingDisabled = ['date', 'time', 'datetime-local', 'file', 'color'].includes(type)
  const labelOnTop = floatingDisabled || focused || hasContent || !!placeholder

  return (
    <div className="w-full">
      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            size={16}
            strokeWidth={1.75}
            className={cn(
              'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none',
              focused || hasContent ? 'text-zinc-700' : 'text-zinc-400',
            )}
          />
        )}

        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'absolute pointer-events-none transition-all duration-200 ease-out',
              LeftIcon ? 'left-10' : 'left-3.5',
              labelOnTop
                ? '-top-2 text-[11px] font-medium tracking-wide px-1.5 bg-white text-zinc-700'
                : 'top-1/2 -translate-y-1/2 text-[15px] text-zinc-400 font-normal',
            )}
          >
            {label}
            {required && <span className="text-zinc-400 ml-0.5">*</span>}
          </label>
        )}

        <input
          ref={ref}
          id={fieldId}
          type={effectiveType}
          placeholder={!floatingDisabled && !focused ? undefined : placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : helper ? `${fieldId}-helper` : undefined}
          defaultValue={defaultValue}
          value={value}
          onFocus={(e) => { setFocused(true); onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); onBlur?.(e) }}
          onChange={(e) => { setHasContent(!!e.target.value); onChange?.(e) }}
          className={cn(
            'w-full rounded-xl border bg-white text-[15px] text-zinc-900 transition-all duration-200',
            'placeholder:text-zinc-400/70',
            'focus:outline-none focus:ring-4 focus:ring-offset-0',
            LeftIcon ? 'pl-10' : 'pl-3.5',
            isPassword ? 'pr-10' : 'pr-3.5',
            // Plus de padding vertical pour laisser respirer le floating label
            !floatingDisabled ? 'pt-[18px] pb-[8px]' : 'py-3',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
              : 'border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900/[0.08]',
            className,
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 transition"
            aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${fieldId}-helper`} className="mt-1.5 text-xs text-zinc-500">
          {helper}
        </p>
      )}
    </div>
  )
})

export default AuthInput
