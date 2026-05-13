import { useState, useEffect } from 'react'

const emptyForm = () => ({
  title: '',
  authorName: '',
  description: '',
  scheduleText: '',
})

export default function SplitUpload({ onCreated, recommendFill, onRecommendConsumed }) {
  const [form, setForm] = useState(emptyForm)
  const [fileHint, setFileHint] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!recommendFill?.nonce) return
    const fill = recommendFill
    queueMicrotask(() => {
      setForm((f) => ({
        ...f,
        title: fill.title?.trim() || f.title,
        description: fill.description ?? f.description,
        scheduleText: fill.scheduleText ?? f.scheduleText,
      }))
      onRecommendConsumed?.()
    })
  }, [recommendFill, onRecommendConsumed])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Give your split a title.')
      return
    }
    setSubmitting(true)
    try {
      await onCreated({
        title: form.title.trim(),
        authorName: form.authorName.trim(),
        description: form.description.trim(),
        scheduleText: form.scheduleText.trim(),
      })
      setForm(emptyForm())
    } catch (err) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileHint(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        const o = data.split ?? data
        setForm({
          title: String(o.title ?? ''),
          authorName: String(o.authorName ?? ''),
          description: String(o.description ?? ''),
          scheduleText: String(o.scheduleText ?? o.schedule ?? ''),
        })
        setError('')
      } catch {
        setError('That file is not valid JSON.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="panel" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Share a split</h2>

      <div className="file-row">
        <label className="file-label">
          Import JSON
          <input type="file" accept=".json,application/json" onChange={handleFile} />
        </label>
        {fileHint ? <span className="muted small">{fileHint}</span> : null}
      </div>

      <form className="split-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. 4-day upper / lower"
            autoComplete="off"
          />
        </label>
        <label>
          Your name (optional)
          <input
            value={form.authorName}
            onChange={(e) => update('authorName', e.target.value)}
            placeholder="Display name"
            autoComplete="name"
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Goals, experience level, equipment…"
            rows={3}
          />
        </label>
        <label>
          Schedule / days
          <textarea
            value={form.scheduleText}
            onChange={(e) => update('scheduleText', e.target.value)}
            placeholder={'Mon: Push\nTue: Pull\n…'}
            rows={6}
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Publishing…' : 'Publish split'}
        </button>
      </form>
    </section>
  )
}
