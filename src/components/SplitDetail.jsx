export default function SplitDetail({ split, onClose, onCopyLink, copyDone }) {
  if (!split) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id="split-detail-title">{split.title}</h2>
          <div className="modal__actions">
            <button type="button" className="ghost" onClick={onCopyLink}>
              {copyDone ? 'Copied link' : 'Copy share link'}
            </button>
            <button type="button" className="ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        {split.authorName ? (
          <p className="muted">Shared by {split.authorName}</p>
        ) : null}
        <time className="muted small" dateTime={split.createdAt}>
          {new Date(split.createdAt).toLocaleString()}
        </time>
        {split.description ? (
          <section className="modal__block">
            <h3>Description</h3>
            <p className="body-text">{split.description}</p>
          </section>
        ) : null}
        {split.scheduleText ? (
          <section className="modal__block">
            <h3>Schedule</h3>
            <pre className="schedule">{split.scheduleText}</pre>
          </section>
        ) : null}
      </div>
    </div>
  )
}
