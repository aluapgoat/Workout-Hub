export default function SplitCard({ split, onOpen, onDelete }) {
  const preview =
    split.description.slice(0, 140) +
    (split.description.length > 140 ? '…' : '')

  return (
    <article className="split-card">
      <button type="button" className="split-card__main" onClick={() => onOpen(split)}>
        <h3>{split.title}</h3>
        {split.authorName ? (
          <p className="split-card__meta">by {split.authorName}</p>
        ) : null}
        {preview ? <p className="split-card__preview">{preview}</p> : null}
        <time dateTime={split.createdAt}>
          {new Date(split.createdAt).toLocaleDateString(undefined, {
            dateStyle: 'medium',
          })}
        </time>
      </button>
      {onDelete ? (
        <button
          type="button"
          className="split-card__delete"
          aria-label="Delete split"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(split)
          }}
        >
          Delete
        </button>
      ) : null}
    </article>
  )
}
