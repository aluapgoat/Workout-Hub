import { randomUUID } from 'node:crypto'
import * as db from '../server/db.js'

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
  if (req.method === 'GET') {
    try {
      const list = (await db.findAllSplits()).map(normalizeSplit).filter(Boolean)
      res.json({ splits: list })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Could not load splits' })
    }
    return
  }

  if (req.method === 'POST') {
    const body = req.body ?? {}
    const title = String(body.title ?? '').trim()
    if (!title) {
      res.status(400).json({ error: 'title is required' })
      return
    }

    try {
      const id = randomUUID()
      const split = await db.insertSplit({
        id,
        title,
        authorName: String(body.authorName ?? ''),
        description: String(body.description ?? ''),
        scheduleText: String(body.scheduleText ?? ''),
      })
      res.status(201).json({ split: normalizeSplit(split) })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Could not create split' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
