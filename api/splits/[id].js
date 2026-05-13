import * as db from '../../server/db.js'

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

export default async function handler(req, res) {
  const { id } = req.query ?? {}
  const splitId = String(id ?? '')

  if (!splitId) {
    res.status(400).json({ error: 'Missing split id' })
    return
  }

  if (req.method === 'GET') {
    try {
      const found = await db.findSplitById(splitId)
      const split = found ? normalizeSplit(found) : null
      if (!split) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.json({ split })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Could not read split' })
    }
    return
  }

  if (req.method === 'PUT') {
    const body = req.body ?? {}
    const title = String(body.title ?? '').trim()
    if (!title) {
      res.status(400).json({ error: 'title is required' })
      return
    }

    try {
      const updated = await db.updateSplitById(splitId, {
        title,
        authorName: String(body.authorName ?? ''),
        description: String(body.description ?? ''),
        scheduleText: String(body.scheduleText ?? ''),
      })
      if (!updated) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.json({ split: normalizeSplit(updated) })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Could not update split' })
    }
    return
  }

  if (req.method === 'DELETE') {
    try {
      const deleted = await db.deleteSplitById(splitId)
      if (!deleted) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.status(204).send('')
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Could not delete split' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
