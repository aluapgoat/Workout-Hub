import { useCallback, useEffect, useState } from 'react'
import SplitUpload from './components/SplitUpload.jsx'
import SplitList from './components/SplitList.jsx'
import SplitDetail from './components/SplitDetail.jsx'
import RecommendedPanel from './components/RecommendedPanel.jsx'
import * as splitsApi from './services/splitsApi.js'
import './App.css'

function readSplitIdFromUrl() {
  return new URLSearchParams(window.location.search).get('split')
}

function setUrlSplitId(id) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('split', id)
  else url.searchParams.delete('split')
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

/** Turn generic browser network errors into actionable copy. */
function friendlyListError(err) {
  const msg = typeof err?.message === 'string' ? err.message : ''
  if (/load failed|failed to fetch|networkerror|network request failed/i.test(msg)) {
    const api = import.meta.env.VITE_API_URL
    const hint = api
      ? `Could not reach the API at ${api}. Start the API (npm run dev:api), confirm that URL, set CLIENT_ORIGIN on the server to this site’s origin for CORS, and use https for the API if this page is served over https (mixed content blocks http APIs).`
      : 'Could not load splits. If you meant to use the API, set VITE_API_URL in .env and restart Vite.'
    return hint
  }
  return msg || 'Could not load splits.'
}

export default function App() {
  const [splits, setSplits] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [selected, setSelected] = useState(null)
  const [copyDone, setCopyDone] = useState(false)
  const [feedTab, setFeedTab] = useState('community')
  const [recommendFill, setRecommendFill] = useState(null)
  const [recommendVisitKey, setRecommendVisitKey] = useState(0)

  const clearRecommendFill = useCallback(() => {
    setRecommendFill(null)
  }, [])

  const applyRecommendToForm = useCallback((payload) => {
    setRecommendFill({ nonce: Date.now(), ...payload })
  }, [])

  const refresh = useCallback(async () => {
    setListError('')
    try {
      const list = await splitsApi.listSplits()
      setSplits(list)
    } catch (e) {
      setListError(friendlyListError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      refresh()
    })
  }, [refresh])

  useEffect(() => {
    const id = readSplitIdFromUrl()
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const split = await splitsApi.getSplit(id)
        if (!cancelled && split) setSelected(split)
      } catch (e) {
        if (!cancelled) setListError(friendlyListError(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreated(payload) {
    const split = await splitsApi.createSplit(payload)
    setSplits((prev) => [split, ...prev.filter((s) => s.id !== split.id)])
    setSelected(split)
    setUrlSplitId(split.id)
  }

  function openSplit(split) {
    setSelected(split)
    setUrlSplitId(split.id)
  }

  function closeDetail() {
    setSelected(null)
    setCopyDone(false)
    setUrlSplitId(null)
  }

  async function handleCopyLink() {
    if (!selected) return
    const link = `${window.location.origin}${window.location.pathname}?split=${encodeURIComponent(selected.id)}`
    try {
      await navigator.clipboard.writeText(link)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2000)
    } catch {
      window.prompt('Copy this link:', link)
    }
  }

  async function handleDelete(split) {
    if (!window.confirm(`Delete “${split.title}”?`)) return
    try {
      await splitsApi.deleteSplit(split.id)
      setSplits((prev) => prev.filter((s) => s.id !== split.id))
      if (selected?.id === split.id) closeDetail()
    } catch (e) {
      alert(e?.message ?? 'Delete failed.')
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Workout Split Hub</h1>
          <p className="muted">
            Publish your training splits, share them with a link, and browse what others have posted. 
            Try recommended tab if you don't know where to start!
          </p>
        </div>
      </header>

      <main className="app__grid">
        <SplitUpload
          onCreated={handleCreated}
          recommendFill={recommendFill}
          onRecommendConsumed={clearRecommendFill}
        />
        <section className="panel" aria-labelledby="feed-heading">
          <div className="feed-tabs" role="tablist" aria-label="Community or recommendations">
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'community'}
              aria-controls="feed-panel"
              id="tab-community"
              className={`feed-tab${feedTab === 'community' ? ' feed-tab--active' : ''}`}
              onClick={() => setFeedTab('community')}
            >
              Community
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'recommended'}
              aria-controls="feed-panel"
              id="tab-recommended"
              className={`feed-tab${feedTab === 'recommended' ? ' feed-tab--active' : ''}`}
              onClick={() => {
                setFeedTab('recommended')
                setRecommendVisitKey((k) => k + 1)
              }}
            >
              Recommended
            </button>
          </div>

          <h2 id="feed-heading" className="visually-hidden">
            {feedTab === 'community' ? 'Community' : 'Recommended'}
          </h2>

          <div id="feed-panel" role="tabpanel" aria-labelledby={feedTab === 'community' ? 'tab-community' : 'tab-recommended'}>
            {feedTab === 'community' ? (
              <SplitList
                splits={splits}
                loading={loading}
                error={listError}
                onOpen={openSplit}
                onDelete={handleDelete}
              />
            ) : (
              <RecommendedPanel
                visitKey={recommendVisitKey}
                onApplyToForm={applyRecommendToForm}
              />
            )}
          </div>
        </section>
      </main>

      {selected ? (
        <SplitDetail
          split={selected}
          onClose={closeDetail}
          onCopyLink={handleCopyLink}
          copyDone={copyDone}
        />
      ) : null}
    </div>
  )
}
