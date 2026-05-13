import * as recommend from '../server/recommend.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

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
}
