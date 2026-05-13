const FOCUSES = new Set(['upper', 'lower', 'core'])

const TEMPLATES = {
  upper: {
    title: '3-day upper emphasis',
    description:
      'Balanced push/pull with an extra shoulder or arm touch-up day. Adjust volume to your recovery.',
    scheduleText: `Day 1 — Chest & triceps
Bench press 4×6–8, incline DB press 3×8–10, cable fly 3×12, tricep pushdown 3×12

Day 2 — Back & biceps
Deadlift or row variation 4×6–8, lat pulldown 3×10, single-arm row 3×10, curl 3×12

Day 3 — Shoulders & arms
OHP or DB press 4×8, lateral raise 3×15, rear delt 3×15, hammer curl 3×12`,
  },
  lower: {
    title: '3-day lower emphasis',
    description:
      'Squat and hinge focused with a unilateral day. Add core at the end of sessions.',
    scheduleText: `Day 1 — Squat pattern
Back squat or safety bar 4×5–8, leg press 3×10, leg curl 3×12, calf raise 4×12

Day 2 — Hinge & posterior chain
Romanian deadlift 4×6–8, hip thrust 3×10, Nordic or hamstring curl 3×8, plank 3×45s

Day 3 — Unilateral & accessories
Bulgarian split squat 3×10/leg, walking lunge 3×12, adductor machine 3×15, side plank 2×30s/side`,
  },
  core: {
    title: '2-day + daily core block',
    description:
      'Short full-body sessions with dedicated anti-rotation and flexion work. Suitable as add-ons or standalone light weeks.',
    scheduleText: `Day 1 — Full body + core
Goblet squat 3×10, push-up or DB press 3×10, row 3×10, pallof press 3×12/side, dead bug 3×10

Day 2 — Full body + core
Kettlebell swing 4×15, assisted pull-up 3×8, split squat 3×10/leg, cable crunch 3×12, side plank 3×30s/side

Daily (10 min)
Plank variations, bird dog, hollow body hold 3×20s`,
  },
}

export function normalizeFocus(raw) {
  const v = String(raw ?? '')
    .toLowerCase()
    .trim()
  return FOCUSES.has(v) ? v : null
}

export function templateRecommendation(focus) {
  return { ...TEMPLATES[focus], source: 'template' }
}

function stripJsonFence(text) {
  let t = text.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  return t.trim()
}

export async function openAiRecommendation(focus) {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
  const labels = {
    upper: 'upper body (push, pull, shoulders, arms)',
    lower: 'lower body (squat, hinge, legs, glutes)',
    core: 'core and trunk (anti-rotation, flexion, stability; can pair with light full-body)',
  }

  const userPrompt = `You are a certified strength coach. Recommend ONE workout split focused on ${labels[focus]}.
Respond with ONLY valid JSON (no markdown), exactly this shape:
{"title":"short catchy title","description":"2-4 sentences for the athlete","scheduleText":"line-separated days; use clear day headers like Day 1 — ..."}

Keep scheduleText practical for a typical gym (no obscure equipment).`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You output only compact JSON for workout programs. No markdown fences.',
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Empty response from OpenAI')
  }

  let parsed
  try {
    parsed = JSON.parse(stripJsonFence(content))
  } catch {
    throw new Error('Could not parse AI response as JSON')
  }

  const title = String(parsed.title ?? '').trim() || 'AI recommended split'
  const description = String(parsed.description ?? '').trim()
  const scheduleText = String(parsed.scheduleText ?? '').trim()

  return { title, description, scheduleText, source: 'openai' }
}
