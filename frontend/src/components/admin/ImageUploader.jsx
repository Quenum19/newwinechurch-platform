/**
 * ImageUploader — composant d'upload d'image cover/thumbnail.
 *
 * Affiche un aperçu, accepte drag-drop, valide MIME + taille.
 * Le fichier sélectionné est exposé via onChange(File | null).
 */
import { useState, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function ImageUploader({
  label = 'Image',
  currentUrl,
  onChange,
  helper = 'JPG, PNG, WebP. Max 30 Mo. Toute taille acceptée — optimisée automatiquement.',
  aspectRatio = '16/9',
  maxSizeMo = 30,
}) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (f) => {
    if (! f) return
    // HEIC d'iPhone n'est pas décodable par GD — on demande à l'utilisateur de convertir.
    if (/\.(heic|heif)$/i.test(f.name) || f.type.match(/^image\/(heic|heif)/i)) {
      alert('Le format HEIC d\'iPhone n\'est pas supporté. Convertis en JPG ou PNG d\'abord.')
      return
    }
    if (! f.type.match(/^image\/(jpeg|png|webp|gif)/)) {
      alert('Format non supporté. JPG, PNG, WebP ou GIF uniquement.')
      return
    }
    if (f.size > maxSizeMo * 1024 * 1024) {
      alert(`Image trop lourde (max ${maxSizeMo} Mo).`)
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    onChange?.(f)
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
    onChange?.(null)
  }

  const displayUrl = preview || currentUrl
  const hasContent = !! displayUrl

  return (
    <div>
      {label && <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition overflow-hidden',
          dragOver ? 'border-gold-500 bg-gold-500/5' : 'border-white/10 hover:border-white/20',
          hasContent ? 'bg-ink-950' : 'bg-ink-900'
        )}
        style={{ aspectRatio }}
      >
        {hasContent ? (
          <>
            <img src={displayUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition flex items-end justify-end gap-2 p-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                <ImagePlus size={12}/> Remplacer
              </button>
              {file && (
                <button
                  type="button"
                  onClick={reset}
                  className="btn-ghost py-1.5 px-3 text-xs"
                >
                  <X size={12}/> Annuler
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50 hover:text-gold-400 transition"
          >
            <ImagePlus size={32} />
            <span className="text-sm">Cliquer ou déposer une image</span>
            <span className="text-xs text-white/30">{helper}</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
