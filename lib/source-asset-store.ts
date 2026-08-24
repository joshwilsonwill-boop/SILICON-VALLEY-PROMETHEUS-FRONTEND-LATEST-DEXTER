const SOURCE_ASSET_DB_NAME = 'prometheus-source-assets.v1'
const SOURCE_ASSET_STORE_NAME = 'source-assets'

type SourceAssetStoreWindow = Window & {
  __prometheusInMemorySourceAssets__?: Map<string, StoredSourceAssetRecord>
}

type StoredSourceAssetRecord = {
  id: string
  file: Blob
  name: string
  type: string
  lastModified: number
  createdAt: string
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function getInMemorySourceAssetStore() {
  if (!isBrowser()) return null

  const sourceAssetWindow = window as SourceAssetStoreWindow
  if (!sourceAssetWindow.__prometheusInMemorySourceAssets__) {
    sourceAssetWindow.__prometheusInMemorySourceAssets__ = new Map<string, StoredSourceAssetRecord>()
  }

  return sourceAssetWindow.__prometheusInMemorySourceAssets__
}

function createAssetId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `asset_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function openSourceAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser() || typeof window.indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }

    const request = window.indexedDB.open(SOURCE_ASSET_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SOURCE_ASSET_STORE_NAME)) {
        database.createObjectStore(SOURCE_ASSET_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open the source asset database'))
  })
}

async function withSourceAssetStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  const database = await openSourceAssetDatabase()

  return await new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(SOURCE_ASSET_STORE_NAME, mode)
    const store = transaction.objectStore(SOURCE_ASSET_STORE_NAME)

    transaction.onabort = () => {
      reject(transaction.error ?? new Error('The source asset transaction was aborted'))
    }
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('The source asset transaction failed'))
    }
    transaction.oncomplete = () => {
      database.close()
    }

    run(store, resolve, reject)
  })
}

async function readStoredSourceAssetRecord(assetId: string) {
  try {
    const persistedRecord = await withSourceAssetStore<StoredSourceAssetRecord | null>('readonly', (store, resolve, reject) => {
      const request = store.get(assetId)
      request.onsuccess = () => {
        resolve((request.result as StoredSourceAssetRecord | undefined) ?? null)
      }
      request.onerror = () => reject(request.error ?? new Error('Unable to restore the uploaded source asset'))
    })

    if (persistedRecord) {
      getInMemorySourceAssetStore()?.set(assetId, persistedRecord)
      return persistedRecord
    }
  } catch {
    // Fall through to the in-memory session cache.
  }

  return getInMemorySourceAssetStore()?.get(assetId) ?? null
}

export function restoreStoredSourceAssetFile(record: StoredSourceAssetRecord) {
  return new File([record.file], record.name, {
    type: record.type || record.file.type || 'application/octet-stream',
    lastModified: record.lastModified,
  })
}

export async function getLatestStoredSourceAssetRecord(): Promise<StoredSourceAssetRecord | null> {
  try {
    const persistedRecord = await withSourceAssetStore<StoredSourceAssetRecord | null>('readonly', (store, resolve) => {
      const request = store.openCursor(null, 'prev')
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          resolve(cursor.value as StoredSourceAssetRecord)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })

    if (persistedRecord) {
      getInMemorySourceAssetStore()?.set(persistedRecord.id, persistedRecord)
      return persistedRecord
    }
  } catch {
    // Fallback to in-memory store
  }

  const memoryStore = getInMemorySourceAssetStore()
  if (memoryStore && memoryStore.size > 0) {
    const values = Array.from(memoryStore.values())
    return values[values.length - 1] ?? null
  }

  return null
}

export async function persistSourceAsset(file: File, customAssetId?: string | null) {
  const assetId = customAssetId && customAssetId.trim().length > 0 ? customAssetId.trim() : createAssetId()
  const record: StoredSourceAssetRecord = {
    id: assetId,
    file,
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    createdAt: new Date().toISOString(),
  }

  getInMemorySourceAssetStore()?.set(assetId, record)

  try {
    return await withSourceAssetStore<string>('readwrite', (store, resolve, reject) => {
      const request = store.put(record)
      request.onsuccess = () => resolve(assetId)
      request.onerror = () => reject(request.error ?? new Error('Unable to persist the uploaded source asset'))
    })
  } catch {
    return assetId
  }
}

export async function createSourceAssetObjectUrl(assetId: string) {
  const record = await readStoredSourceAssetRecord(assetId)
  return record ? URL.createObjectURL(restoreStoredSourceAssetFile(record)) : null
}

export async function getStoredSourceAssetFile(assetId: string) {
  const record = await readStoredSourceAssetRecord(assetId)
  if (!record) return null

  return restoreStoredSourceAssetFile(record)
}

export function saveProjectTranscript(key: string, segments: any[]): void {
  if (typeof window === 'undefined' || !key) return
  try {
    localStorage.setItem(`prometheus_transcript_${key}`, JSON.stringify(segments))
  } catch {}
}

export function getProjectTranscript(key: string): any[] | null {
  if (typeof window === 'undefined' || !key) return null
  try {
    const raw = localStorage.getItem(`prometheus_transcript_${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return null
}

