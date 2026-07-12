'use client'

import * as React from 'react'
import Cropper, { type Area } from 'react-easy-crop'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AvatarCropModalProps = {
  imageSrc: string
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImageBlob: Blob) => void | Promise<void>
}

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Unable to load image for cropping.')))
    image.src = url
  })
}

async function getCroppedAvatarBlob(imageSrc: string, pixelCrop: Area) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to crop avatar.')
  }

  canvas.width = 512
  canvas.height = 512

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    512,
    512,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to crop avatar.'))
        return
      }

      resolve(blob)
    }, 'image/webp', 0.9)
  })
}

export function AvatarCropModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
}: AvatarCropModalProps) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isOpen) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setIsSaving(false)
      setError(null)
    }
  }, [isOpen])

  async function handleSave() {
    if (!croppedAreaPixels) return

    setIsSaving(true)
    setError(null)

    try {
      const blob = await getCroppedAvatarBlob(imageSrc, croppedAreaPixels)
      await onCropComplete(blob)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to crop avatar.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden border-white/10 bg-black/65 p-0 text-white backdrop-blur-[24px] sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Crop avatar</DialogTitle>
          <DialogDescription className="text-white/55">
            Position your image inside the frame. The final avatar will be exported at 512x512.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="relative mt-4 h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:h-[420px]">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              minZoom={1}
              maxZoom={3}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/42" htmlFor="avatar-zoom">
              Zoom
            </label>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-[var(--theme-accent)]"
            />
          </div>

          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </div>

        <DialogFooter className="border-t border-white/10 bg-black/30 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!croppedAreaPixels || isSaving}
            className="bg-[var(--theme-accent)] text-black hover:opacity-90"
          >
            {isSaving ? <InlineLoadingAnimation size={16} label="Saving cropped avatar" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
