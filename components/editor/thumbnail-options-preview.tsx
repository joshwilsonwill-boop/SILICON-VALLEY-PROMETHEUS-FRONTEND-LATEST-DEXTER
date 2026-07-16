"use client"

import { Check, Download, Loader2, X } from "lucide-react"
import { useCallback, useState } from "react"

import { cn } from "@/lib/utils"

interface ThumbnailOption {
  id: string
  composition: string
  palette: string
  url?: string
  publicUrl?: string
  signedUrl?: string
  error?: string
}

interface ThumbnailOptionsPreviewProps {
  thumbnails: ThumbnailOption[]
  onSelect?: (thumbnail: ThumbnailOption) => void
  isLoading?: boolean
}

export function ThumbnailOptionsPreview({
  thumbnails,
  onSelect,
  isLoading,
}: ThumbnailOptionsPreviewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleSelect = useCallback(
    (thumbnail: ThumbnailOption) => {
      setSelected(thumbnail.id)
      onSelect?.(thumbnail)
    },
    [onSelect],
  )

  const handleCopyUrl = useCallback(
    async (url: string, id: string) => {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
      } catch {
        console.error("Failed to copy URL")
      }
    },
    [],
  )

  const handleDownload = useCallback((url: string, id: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = `thumbnail-${id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  if (thumbnails.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="text-xs font-medium text-white/50">Thumbnail Options</div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {thumbnails.map((thumb) => (
          <div
            key={thumb.id}
            className={cn(
              "group relative overflow-hidden rounded-lg border transition-all",
              thumb.error
                ? "border-red-500/30 bg-red-500/5"
                : selected === thumb.id
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
            )}
          >
            {/* Thumbnail Preview */}
            <div className="aspect-video w-full bg-gradient-to-br from-white/5 to-white/0">
              {thumb.url || thumb.publicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb.url || thumb.publicUrl}
                  alt={`Thumbnail ${thumb.composition}`}
                  className="h-full w-full object-cover"
                />
              ) : thumb.error ? (
                <div className="flex h-full items-center justify-center">
                  <X className="size-4 text-red-500/50" />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-white/30" />
                </div>
              )}
            </div>

            {/* Overlay on Hover */}
            {!thumb.error && (thumb.url || thumb.publicUrl) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleSelect(thumb)}
                  className={cn(
                    "rounded-full p-2 transition-colors",
                    selected === thumb.id
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-white hover:bg-white/20",
                  )}
                  title={
                    selected === thumb.id ? "Selected" : "Select this thumbnail"
                  }
                >
                  {selected === thumb.id ? (
                    <Check className="size-4" />
                  ) : (
                    <Check className="size-4 opacity-0" />
                  )}
                </button>

                <div className="flex gap-1">
                  {thumb.publicUrl && (
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(thumb.publicUrl!, thumb.id)}
                      className="rounded p-1.5 bg-white/10 text-white hover:bg-white/20"
                      title="Copy public URL"
                    >
                      {copied === thumb.id ? (
                        <Check className="size-3" />
                      ) : (
                        <svg
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                  {thumb.publicUrl && (
                    <button
                      type="button"
                      onClick={() => handleDownload(thumb.publicUrl!, thumb.id)}
                      className="rounded p-1.5 bg-white/10 text-white hover:bg-white/20"
                      title="Download thumbnail"
                    >
                      <Download className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Labels */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
              <div className="truncate text-xs text-white/70">
                {thumb.composition}
              </div>
              <div className="truncate text-xs text-white/50">{thumb.palette}</div>
            </div>

            {/* Error Badge */}
            {thumb.error && (
              <div className="absolute top-1 right-1 rounded bg-red-500/80 px-1.5 py-0.5 text-xs text-white">
                Error
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-xs text-blue-300">
          Thumbnail selected. You can now use this in your project.
        </div>
      )}
    </div>
  )
}
