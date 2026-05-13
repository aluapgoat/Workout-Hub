/**
 * Splits data layer. With VITE_API_URL set, requests go to your Express API (e.g. MongoDB).
 * Expected API (adjust paths in one place if your server differs):
 *   GET    /splits          -> { splits: Split[] }
 *   GET    /splits/:id      -> { split: Split }
 *   POST   /splits          -> body: Omit<Split,'id'|'createdAt'> -> { split: Split }
 *   PUT    /splits/:id      -> same body shape as POST -> { split: Split }
 *   DELETE /splits/:id      -> 204
 *   POST   /recommend       -> body: { focus: 'upper'|'lower'|'core' } -> { title, description, scheduleText, source }
 */

const STORAGE_KEY = 'workoutapp:splits'

function apiBase() {
  const url = import.meta.env.VITE_API_URL
  return url && String(url).replace(/\/$/, '')
}

/** Read `{ error: "..." }` from API error responses when present. */
async function errorMessageFromResponse(res) {
  const fallback = `Request failed (${res.status})`
  try {
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await res.json()
      if (data && typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim()
      }
    }
  } catch {
    // non-JSON body or parse error
  }
  return fallback
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
    if (!res.ok) throw new Error(await errorMessageFromResponse(res))
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
    if (!res.ok) throw new Error(await errorMessageFromResponse(res))
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
    if (!res.ok) throw new Error(await errorMessageFromResponse(res))
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

export async function updateSplit(id, payload) {
  const body = {
    title: payload.title,
    authorName: payload.authorName ?? '',
    description: payload.description ?? '',
    scheduleText: payload.scheduleText ?? '',
  }
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/splits/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await errorMessageFromResponse(res))
    const data = await res.json()
    return normalizeSplit(data.split ?? data)
  }
  const all = readLocal()
  const idx = all.findIndex((s) => String(s.id) === String(id))
  if (idx === -1) throw new Error('Split not found')
  const merged = normalizeSplit({
    ...all[idx],
    ...body,
    id: all[idx].id,
    createdAt: all[idx].createdAt,
  })
  all[idx] = merged
  writeLocal(all)
  return merged
}

export async function deleteSplit(id) {
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/splits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok && res.status !== 204)
      throw new Error(await errorMessageFromResponse(res))
    return
  }
  writeLocal(readLocal().filter((s) => String(s.id) !== String(id)))
}

/**
 * @param {'upper'|'lower'|'core'} focus
 * @returns {Promise<{ title: string, description: string, scheduleText: string, source: string }>}
 */
export async function requestRecommend(focus) {
  const base = apiBase()
  if (!base) {
    throw new Error(
      'Add VITE_API_URL to .env and restart Vite to use AI recommendations from your API.',
    )
  }
  const root = base.replace(/\/$/, '')
  const candidates = [`${root}/recommend`, `${root}/api/recommend`]

  let res
  for (const url of candidates) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focus }),
    })
    if (res.ok) break
    if (res.status !== 404) break
  }
  if (!res.ok) {
    const detail = await errorMessageFromResponse(res)
    if (res.status === 404) {
      throw new Error(
        `${detail} Tried ${candidates.join(' and ')}. Pull the latest server code and restart the API (npm run dev:api), or fix VITE_API_URL so it points at this Node server (not the static Vite/GitHub Pages site).`,
      )
    }
    throw new Error(detail)
  }
  return res.json()
}
