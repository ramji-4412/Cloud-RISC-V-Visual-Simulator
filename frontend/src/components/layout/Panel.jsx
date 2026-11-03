/**
 * Panel.jsx
 *
 * A reusable panel container with an optional title bar, collapsible
 * header, and scrollable content area. Used throughout the workspace.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Panel({
  title,
  actions,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
  bodyClassName = '',
  headerClassName = '',
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () => setCollapsed((c) => !c);

  return (
    <div
      className={`studio-panel flex flex-col overflow-hidden ${className}`}
    >
      {(title || actions || collapsible) && (
        <div
          className={`flex h-9 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 ${headerClassName}`}
        >
          <div className="flex items-center gap-2">
            {collapsible && (
              <button
                onClick={toggle}
                className="text-slate-500 hover:text-slate-200"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
            {title && (
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {title}
              </span>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div
        className={`panel-scroll min-h-0 flex-1 ${bodyClassName}`}
        style={{ display: collapsed ? 'none' : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
