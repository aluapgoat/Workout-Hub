import { MongoClient } from 'mongodb'

/** @type {MongoClient | null} */
let client = null
/** @type {import('mongodb').Collection | null} */
let coll = null

function requireMongoUri() {
  const uri = process.env.MONGODB_URI
  if (!uri?.trim()) {
    throw new Error(
      'MONGODB_URI is not set. Example: mongodb://127.0.0.1:27017/workout_hub',
    )
  }
  return uri.trim()
}

function databaseName(uri) {
  const fromEnv = process.env.MONGODB_DB?.trim()
  if (fromEnv) return fromEnv
  try {
    const withoutQuery = uri.split('?')[0]
    const afterScheme = withoutQuery.replace(/^mongodb(\+srv)?:\/\//, '')
    const slash = afterScheme.indexOf('/')
    if (slash === -1) return 'workout_hub'
    const path = afterScheme.slice(slash + 1).split('/')[0]
    return path ? decodeURIComponent(path) : 'workout_hub'
  } catch {
    return 'workout_hub'
  }
}

function mapDoc(doc) {
  if (!doc) return null
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : String(doc.createdAt ?? '')
  return {
    id: String(doc._id),
    title: String(doc.title ?? '').trim() || 'Untitled split',
    authorName: String(doc.authorName ?? '').trim(),
    description: String(doc.description ?? '').trim(),
    scheduleText: String(doc.scheduleText ?? '').trim(),
    createdAt,
  }
}

function collection() {
  if (!coll) throw new Error('Database not connected')
  return coll
}

export async function connectDb() {
  if (client && coll) return client
  const uri = requireMongoUri()
  client = new MongoClient(uri)
  await client.connect()
  const db = client.db(databaseName(uri))
  coll = db.collection('splits')
  await coll.createIndex({ createdAt: -1 })
  return client
}

export async function closeDb() {
  if (!client) return
  await client.close()
  client = null
  coll = null
}

/** @returns {Promise<object[]>} */
export async function findAllSplits() {
  const docs = await collection()
    .find({})
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map(mapDoc)
}

/** @returns {Promise<object | null>} */
export async function findSplitById(id) {
  const doc = await collection().findOne({ _id: id })
  return doc ? mapDoc(doc) : null
}

/** @returns {Promise<object>} */
export async function insertSplit({ id, title, authorName, description, scheduleText }) {
  const createdAt = new Date()
  const doc = {
    _id: id,
    title,
    authorName: authorName ?? '',
    description: description ?? '',
    scheduleText: scheduleText ?? '',
    createdAt,
  }
  await collection().insertOne(doc)
  return mapDoc(doc)
}

/** @returns {Promise<object | null>} */
export async function updateSplitById(id, { title, authorName, description, scheduleText }) {
  const doc = await collection().findOneAndUpdate(
    { _id: id },
    {
      $set: {
        title,
        authorName: authorName ?? '',
        description: description ?? '',
        scheduleText: scheduleText ?? '',
      },
    },
    { returnDocument: 'after' },
  )
  return doc ? mapDoc(doc) : null
}

/** @returns {Promise<boolean>} */
export async function deleteSplitById(id) {
  const result = await collection().deleteOne({ _id: id })
  return result.deletedCount > 0
}
