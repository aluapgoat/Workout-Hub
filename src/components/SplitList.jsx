import SplitCard from './SplitCard.jsx'

export default function SplitList({ splits, loading, error, onOpen, onDelete }) {
  if (loading) {
    return <p className="muted">Loading splits…</p>
  }
  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    )
  }
  if (!splits.length) {
    return (
      <p className="muted">
        No splits yet. Publish one from the form on the left, or point{' '}
        <code>VITE_API_URL</code> at your API once it exists.
      </p>
    )
  }
  return (
    <ul className="split-list">
      {splits.map((split) => (
        <li key={split.id}>
          <SplitCard split={split} onOpen={onOpen} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  )
}
