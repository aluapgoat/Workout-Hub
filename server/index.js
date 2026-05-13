import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import * as db from './db.js'
import * as recommend from './recommend.js'

const PORT = Number(process.env.PORT) || 4000
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]
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

function dbErrorStatus(err) {
  if (err && err.code === 11000) return 409
  return 500
}

async function postRecommendHandler(req, res, next) {
  try {
    const focus = recommend.normalizeFocus(req.body?.focus)
    if (!focus) {
      res.status(400).json({ error: 'focus must be upper, lower, or core' })
      return
    }
    let payload
    try {
      payload = await recommend.openAiRecommendation(focus)
    } catch (e) {
      console.warn('OpenAI recommend failed, using template:', e?.message)
      payload = null
    }
    if (!payload) {
      payload = recommend.templateRecommendation(focus)
    }
    res.json(payload)
  } catch (e) {
    next(e)
  }
}

function buildApiRouter() {
  const router = express.Router()

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'workout-hub-api',
      hasRecommend: true,
    })
  })

  router.get('/splits', async (_req, res, next) => {
    try {
      const list = (await db.findAllSplits()).map(normalizeSplit).filter(Boolean)
      res.json({ splits: list })
    } catch (e) {
      next(e)
    }
  })

  router.get('/splits/:id', async (req, res, next) => {
    try {
      const id = String(req.params.id)
      const found = await db.findSplitById(id)
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

  router.post('/splits', async (req, res, next) => {
    try {
      const body = req.body ?? {}
      const title = String(body.title ?? '').trim()
      if (!title) {
        res.status(400).json({ error: 'title is required' })
        return
      }
      const id = randomUUID()
      const split = await db.insertSplit({
        id,
        title,
        authorName: String(body.authorName ?? ''),
        description: String(body.description ?? ''),
        scheduleText: String(body.scheduleText ?? ''),
      })
      res.status(201).json({ split: normalizeSplit(split) })
    } catch (e) {
      next(e)
    }
  })

  router.put('/splits/:id', async (req, res, next) => {
    try {
      const id = String(req.params.id)
      const body = req.body ?? {}
      const title = String(body.title ?? '').trim()
      if (!title) {
        res.status(400).json({ error: 'title is required' })
        return
      }
      const updated = await db.updateSplitById(id, {
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
    } catch (e) {
      next(e)
    }
  })

  router.delete('/splits/:id', async (req, res, next) => {
    try {
      const id = String(req.params.id)
      const deleted = await db.deleteSplitById(id)
      if (!deleted) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      res.sendStatus(204)
    } catch (e) {
      next(e)
    }
  })

  return router
}

const app = express()
app.use(express.json({ limit: '256kb' }))
app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
)

const apiRouter = buildApiRouter()

// Register on the app root so POST /recommend always hits this handler (avoids Router+mount edge cases).
app.post('/recommend', postRecommendHandler)
app.post('/api/recommend', postRecommendHandler)

app.use(apiRouter)
app.use('/api', apiRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  const status = dbErrorStatus(err)
  if (status === 500) {
    res.status(500).json({ error: 'Internal server error' })
    return
  }
  res.status(status).json({ error: err.message ?? 'Conflict' })
})

app.use((req, res) => {
  res.status(404).json({
    error: `No route for ${req.method} ${req.originalUrl}`,
    hint: 'GET /health should return JSON with service workout-hub-api. If not, another app may be using this port.',
  })
})

await db.connectDb()
app.listen(PORT, () => {
  console.log(`Splits API listening on http://localhost:${PORT}`)
  console.log(`Try: curl -s http://localhost:${PORT}/health`)
  console.log(`POST /recommend and POST /api/recommend are registered on the app.`)
  console.log(`CORS allowed origins: ${corsOrigins.join(', ')}`)
})

async function shutdown() {
  try {
    await db.closeDb()
  } finally {
    process.exit(0)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
