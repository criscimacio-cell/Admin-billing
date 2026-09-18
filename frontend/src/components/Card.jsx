export default function Card({ title, action, children, className = '' }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
