/**
 * Splits data layer. Set VITE_API_URL (e.g. http://localhost:3000) to use real HTTP.
 * Expected API (adjust paths in one place if your server differs):
 *   GET    /splits          -> { splits: Split[] }
 *   GET    /splits/:id      -> { split: Split }
 *   POST   /splits          -> body: Omit<Split,'id'|'createdAt'> -> { split: Split }
 *   DELETE /splits/:id      -> 204
 */

const STORAGE_KEY = 'workoutapp:splits'

function apiBase() {
  const url = import.meta.env.VITE_API_URL
  return url && String(url).replace(/\/$/, '')
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(splits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(splits))
}

function normalizeSplit(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: String(raw.id),
    title: String(raw.title ?? '').trim() || 'Untitled split',
    authorName: String(raw.authorName ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    scheduleText: String(raw.scheduleText ?? '').trim(),
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
  }
}

export async function listSplits() {
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/splits`)
    if (!res.ok) throw new Error(`Failed to load splits (${res.status})`)
    const data = await res.json()
    const list = Array.isArray(data.splits) ? data.splits : data
    return list.map(normalizeSplit).filter(Boolean)
  }
  return readLocal().map(normalizeSplit).filter(Boolean).sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

export async function getSplit(id) {
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/splits/${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`Split not found (${res.status})`)
    const data = await res.json()
    return normalizeSplit(data.split ?? data)
  }
  const found = readLocal().find((s) => String(s.id) === String(id))
  return found ? normalizeSplit(found) : null
}

export async function createSplit(payload) {
  const body = {
    title: payload.title,
    authorName: payload.authorName ?? '',
    description: payload.description ?? '',
    scheduleText: payload.scheduleText ?? '',
  }
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Could not publish split (${res.status})`)
    const data = await res.json()
    return normalizeSplit(data.split ?? data)
  }
  const split = normalizeSplit({
    ...body,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
  const all = readLocal()
  all.unshift(split)
  writeLocal(all)
  return split
}

export async function deleteSplit(id) {
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/splits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 204)
      throw new Error(`Could not delete (${res.status})`)
    return
  }
  writeLocal(readLocal().filter((s) => String(s.id) !== String(id)))
}
