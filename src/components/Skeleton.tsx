/** Grey placeholders shown while data loads. Keep layout identical to the real content. */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading">
      <div className="page-skeleton-bar">
        <Skeleton style={{ width: 120, height: 20 }} />
        <span className="spacer" />
        <Skeleton style={{ width: 32, height: 32, borderRadius: '50%' }} />
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="editor-page" role="status" aria-label="Loading map">
      <header className="topbar skeleton-topbar">
        <Skeleton style={{ width: 28, height: 28 }} />
        <Skeleton style={{ width: 24, height: 24, borderRadius: '50%' }} />
        <Skeleton style={{ width: 180, height: 22 }} />
        <span className="spacer" />
        <Skeleton style={{ width: 80, height: 30 }} />
        <Skeleton style={{ width: 32, height: 32, borderRadius: '50%' }} />
      </header>
      <div className="canvas canvas-skeleton">
        <Skeleton className="canvas-skeleton-root" />
        <Skeleton className="canvas-skeleton-branch b1" />
        <Skeleton className="canvas-skeleton-branch b2" />
        <Skeleton className="canvas-skeleton-branch b3" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card card-skeleton" aria-hidden>
      <Skeleton className="thumb" />
      <div className="card-meta">
        <Skeleton style={{ width: '60%', height: 16 }} />
        <Skeleton style={{ width: '35%', height: 12 }} />
      </div>
    </div>
  );
}
