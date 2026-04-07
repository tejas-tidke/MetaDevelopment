import React from "react";

function AuthShowcase({ kicker = "Meta Workspace", title, copy, highlights = [], metrics = [] }) {
  return (
    <aside className="auth-showcase">
      <div>
        <p className="auth-kicker">
          <span className="auth-kicker-dot" />
          {kicker}
        </p>
        <h2 className="auth-showcase-title">{title}</h2>
        <p className="auth-showcase-copy">{copy}</p>
      </div>

      <ul className="auth-highlights">
        {highlights.map((item, index) => (
          <li key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item}
          </li>
        ))}
      </ul>

      <div className="auth-metrics">
        {metrics.map((metric) => (
          <div className="auth-metric" key={`${metric.value}-${metric.label}`}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default AuthShowcase;
