import React, { useState } from 'react'

type Props = {
  title: string
  defaultOpen?: boolean
  children?: React.ReactNode
}

export default function Collapsible({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState<boolean>(defaultOpen)

  return (
    <div className={`collapsible ${open ? 'open' : 'closed'}`}>
      <button
        type="button"
        className="collapsible-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-toggle" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && <div className="collapsible-content">{children}</div>}
    </div>
  )
}
