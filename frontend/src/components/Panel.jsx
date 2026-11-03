export default function Panel({ title, children, className = '' }) {
  return (
    <section className={`studio-panel ${className}`}>
      <div className="panel-header">
        <h3 className="tracking-tight uppercase">{title}</h3>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
