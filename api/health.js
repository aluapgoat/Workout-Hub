export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  res.json({
    ok: true,
    service: 'workout-hub-api',
    hasRecommend: true,
  })
}
