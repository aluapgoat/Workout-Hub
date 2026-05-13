import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'splits.json')

const PORT = Number(process.env.PORT) || 4000
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
const corsOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim())
  : defaultOrigins

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

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    await readFile(DATA_FILE, 'utf8')
  } catch {
    await writeFile(DATA_FILE, '[]', 'utf8')
  }
}

async function readSplits() {
  await ensureStore()
  const raw = await readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

async function writeSplits(splits) {
  await writeFile(DATA_FILE, JSON.stringify(splits, null, 2), 'utf8')
}

const app = express()
app.use(express.json({ limit: '256kb' }))
app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
)

app.get('/splits', async (_req, res, next) => {
  try {
    const list = (await readSplits())
      .map(normalizeSplit)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json({ splits: list })
  } catch (e) {
    next(e)
  }
})

app.get('/splits/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id)
    const found = (await readSplits()).find((s) => String(s.id) === id)
    const split = found ? normalizeSplit(found) : null
    if (!split) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json({ split })
  } catch (e) {
    next(e)
  }
})

app.post('/splits', async (req, res, next) => {
  try {
    const body = req.body ?? {}
    const title = String(body.title ?? '').trim()
    if (!title) {
      res.status(400).json({ error: 'title is required' })
      return
    }
    const split = normalizeSplit({
      id: randomUUID(),
      title,
      authorName: body.authorName,
      description: body.description,
      scheduleText: body.scheduleText,
      createdAt: new Date().toISOString(),
    })
    const all = await readSplits()
    all.unshift(split)
    await writeSplits(all)
    res.status(201).json({ split })
  } catch (e) {
    next(e)
  }
})

app.delete('/splits/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id)
    const all = await readSplits()
    const nextList = all.filter((s) => String(s.id) !== id)
    if (nextList.length === all.length) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    await writeSplits(nextList)
    res.sendStatus(204)
  } catch (e) {
    next(e)
  }
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

await ensureStore()
app.listen(PORT, () => {
  console.log(`Splits API listening on http://localhost:${PORT}`)
  console.log(`CORS allowed origins: ${corsOrigins.join(', ')}`)
})
