export default function Card({ title, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
