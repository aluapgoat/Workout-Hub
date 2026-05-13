import { useCallback, useEffect, useRef, useState } from 'react'
import * as splitsApi from '../services/splitsApi.js'

const FOCUSES = [
  { id: 'upper', label: 'Upper body' },
  { id: 'lower', label: 'Lower body' },
  { id: 'core', label: 'Core' },
]

export default function RecommendedPanel({ visitKey, onApplyToForm }) {
  const [focus, setFocus] = useState('upper')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const focusRef = useRef(focus)

  useEffect(() => {
    focusRef.current = focus
  }, [focus])

  const loadRecommend = useCallback(async () => {
    const currentFocus = focusRef.current
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await splitsApi.requestRecommend(currentFocus)
      setResult(data)
    } catch (e) {
      setError(e?.message ?? 'Could not get a recommendation.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (visitKey < 1) return
    let cancelled = false
    ;(async () => {
      setError('')
      setResult(null)
      setLoading(true)
      try {
        const data = await splitsApi.requestRecommend(focusRef.current)
        if (!cancelled) setResult(data)
      } catch (e) {
        if (!cancelled) setError(e?.message ?? 'Could not get a recommendation.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visitKey])

  function handleUseInForm() {
    if (!result) return
    onApplyToForm({
      title: result.title,
      description: result.description,
      scheduleText: result.scheduleText,
    })
  }

  return (
    <div className="recommend-panel">
      <fieldset className="recommend-focus">
        <legend className="recommend-legend">What do you want?</legend>
        <div className="recommend-focus__row">
          {FOCUSES.map((f) => (
            <label key={f.id} className="recommend-radio">
              <input
                type="radio"
                name="recommend-focus"
                value={f.id}
                checked={focus === f.id}
                onChange={() => setFocus(f.id)}
              />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        className="primary recommend-btn"
        onClick={() => void loadRecommend()}
        disabled={loading}
      >
        {loading ? 'Getting recommendation…' : 'Get AI recommendation'}
      </button>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="recommend-result">
          <h3 className="recommend-result__title">{result.title}</h3>
          <p className="recommend-result__desc">{result.description}</p>
          <pre className="schedule recommend-result__schedule">{result.scheduleText}</pre>
          <button type="button" className="ghost" onClick={handleUseInForm}>
            Use in publish form
          </button>
        </div>
      ) : null}
    </div>
  )
}
