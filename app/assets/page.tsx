'use client'

import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileUpload } from '@/components/ui/file-upload'
import {
  CHARACTER_PREFERENCES_KEY,
  CinematicLibrary,
  FloatingPreferenceButton,
  type LibraryTab,
  type SavedCharacterPreference,
  type ShowcaseItem,
} from '@/components/assets/cinematic-library'
import { LibraryCollection } from '@/components/assets/library-collection'
import { BrandCanvas } from '@/components/assets/brand-canvas'
import { PrometheusShell } from '@/components/prometheus-shell'
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/lib/storage'
import type { AssetItem, AssetKind } from '@/lib/types'

const ASSETS_KEY = 'prometheus.assets.v1'

function loadAssets() {
  return readLocalStorageJSON<AssetItem[]>(ASSETS_KEY) ?? []
}

function saveAssets(items: AssetItem[]) {
  writeLocalStorageJSON(ASSETS_KEY, items)
}

function loadSavedCharacterPreferences() {
  return readLocalStorageJSON<SavedCharacterPreference[]>(CHARACTER_PREFERENCES_KEY) ?? []
}

function saveSavedCharacterPreferences(items: SavedCharacterPreference[]) {
  writeLocalStorageJSON(CHARACTER_PREFERENCES_KEY, items)
}

function kindFromTab(tab: LibraryTab): AssetKind {
  if (tab === 'uploads') return 'upload'
  if (tab === 'music') return 'music'
  if (tab === 'broll') return 'broll'
  if (tab === 'fonts') return 'font'
  return 'logo'
}

export default function AssetsPage() {
  const [tab, setTab] = React.useState<LibraryTab>('uploads')
  const [open, setOpen] = React.useState(false)
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [selectedCreatorId, setSelectedCreatorId] = React.useState('uploads_0')
  const [assets, setAssets] = React.useState<AssetItem[]>([])
  const [savedCharacters, setSavedCharacters] = React.useState<SavedCharacterPreference[]>([])
  const [activeShowcaseItem, setActiveShowcaseItem] = React.useState<ShowcaseItem | null>(null)

  React.useEffect(() => {
    setAssets(loadAssets())
    setSavedCharacters(loadSavedCharacterPreferences())
  }, [])

  const filteredAssets = React.useMemo(
    () => assets.filter((asset) => asset.kind === kindFromTab(tab)),
    [assets, tab],
  )
  const savedCharacterIds = React.useMemo(() => savedCharacters.map((item) => item.id), [savedCharacters])

  const togglePreference = (item: ShowcaseItem, activeTab: LibraryTab) => {
    const nextEntry: SavedCharacterPreference = {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      image: item.image,
      imagePosition: item.imagePosition,
      accent: item.accent,
      tab: activeTab,
      addedAt: new Date().toISOString(),
    }

    setSavedCharacters((current) => {
      const exists = current.some((entry) => entry.id === item.id)
      const next = exists ? current.filter((entry) => entry.id !== item.id) : [nextEntry, ...current]
      saveSavedCharacterPreferences(next)
      return next
    })
  }

  const overlay =
    libraryOpen && activeShowcaseItem && tab === 'uploads' ? (
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 sm:block lg:right-5 xl:right-7">
          <FloatingPreferenceButton
            active={activeShowcaseItem}
            saved={savedCharacterIds.includes(activeShowcaseItem.id)}
            onToggle={() => togglePreference(activeShowcaseItem, tab)}
          />
        </div>
      </div>
    ) : null

  return (
    <PrometheusShell overlay={overlay}>
      <LibraryCollection
        onSelect={(showcaseId) => {
          setTab('uploads')
          setSelectedCreatorId(showcaseId)
          setLibraryOpen(true)
        }}
      />

      <BrandCanvas />

      <Dialog
        open={libraryOpen}
        onOpenChange={(nextOpen) => {
          setLibraryOpen(nextOpen)
          if (!nextOpen) setActiveShowcaseItem(null)
        }}
      >
        <DialogContent
          className="h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[1600px] overflow-hidden rounded-[6px] border-[#55ff9b]/20 bg-black p-0 shadow-[0_40px_140px_-32px_rgba(0,0,0,1)] [&>button[aria-label='Close']]:z-30 [&>button[aria-label='Close']]:border [&>button[aria-label='Close']]:border-white/15 [&>button[aria-label='Close']]:bg-black/65 [&>button[aria-label='Close']]:backdrop-blur-md sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
          overlayClassName="bg-black/90 backdrop-blur-md"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Creator archive</DialogTitle>
            <DialogDescription>Browse the selected creator and all existing Prometheus library collections.</DialogDescription>
          </DialogHeader>
          <div className="h-full overflow-y-auto overscroll-contain bg-black">
            <CinematicLibrary
              tab={tab}
              onTabChange={setTab}
              assets={assets}
              filteredAssets={filteredAssets}
              onUploadClick={() => setOpen(true)}
              savedCharacterIds={savedCharacterIds}
              onTogglePreference={togglePreference}
              onActiveItemChange={setActiveShowcaseItem}
              initialShowcaseId={selectedCreatorId}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#0a0a0d]/95 text-white shadow-[0_30px_90px_-40px_rgba(0,0,0,0.95)]">
          <DialogHeader>
            <DialogTitle>Upload Assets</DialogTitle>
            <DialogDescription className="text-white/55">
              Files are tracked locally so they can immediately appear in the library rail.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            <FileUpload
              onChange={(files) => {
                if (files.length === 0) return

                const kind = kindFromTab(tab)
                const next: AssetItem[] = [
                  ...files.map((file) => ({
                    id: `${kind}_${file.name}_${Date.now()}`,
                    kind,
                    name: file.name,
                    createdAt: new Date().toISOString(),
                    sizeBytes: file.size,
                  })),
                  ...assets,
                ]

                setAssets(next)
                saveAssets(next)
                setOpen(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </PrometheusShell>
  )
}

