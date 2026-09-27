interface Props {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: Props) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      <p className="muted">{body}</p>
      <button type="button" className="btn" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
