// Small hand-authored stroke icon set (20x20, currentColor) — kept local
// to avoid adding an icon-library dependency for a handful of glyphs.
const base = { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'none' };
const strokeProps = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconGrid(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1.2" {...strokeProps} />
      <rect x="11" y="3" width="6" height="6" rx="1.2" {...strokeProps} />
      <rect x="3" y="11" width="6" height="6" rx="1.2" {...strokeProps} />
      <rect x="11" y="11" width="6" height="6" rx="1.2" {...strokeProps} />
    </svg>
  );
}

export function IconUsers(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="7" r="2.6" {...strokeProps} />
      <path d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" {...strokeProps} />
      <circle cx="14.5" cy="7.5" r="2" {...strokeProps} />
      <path d="M12.8 12.3c1.9.2 3.7 1.5 3.7 3.7" {...strokeProps} />
    </svg>
  );
}

export function IconCalendarCheck(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" {...strokeProps} />
      <path d="M3 8h14M6.5 2.5v3M13.5 2.5v3" {...strokeProps} />
      <path d="M7 12l2 2 4-4" {...strokeProps} />
    </svg>
  );
}

export function IconClipboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="3.5" width="11" height="14" rx="1.5" {...strokeProps} />
      <rect x="7" y="2" width="6" height="3" rx="1" {...strokeProps} />
      <path d="M7 9h6M7 12h6M7 15h3.5" {...strokeProps} />
    </svg>
  );
}

export function IconCalendarDays(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" {...strokeProps} />
      <path d="M3 8h14M6.5 2.5v3M13.5 2.5v3" {...strokeProps} />
      <path d="M6.5 11h1M9.5 11h1M12.5 11h1M6.5 13.7h1M9.5 13.7h1" {...strokeProps} />
    </svg>
  );
}

export function IconTag(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10.5 2.5H16v5.5L8.3 15.7a1.5 1.5 0 0 1-2.1 0l-3.4-3.4a1.5 1.5 0 0 1 0-2.1L10.5 2.5Z" {...strokeProps} />
      <circle cx="13" cy="6" r="1.2" {...strokeProps} />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="7" {...strokeProps} />
      <path d="M10 6v4l3 2" {...strokeProps} />
    </svg>
  );
}

export function IconFileText(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 2.5h6L16 6.5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" {...strokeProps} />
      <path d="M12 2.5V6h4" {...strokeProps} />
      <path d="M7.5 10.5h5M7.5 13h5M7.5 15.5h3" {...strokeProps} />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3v9.5M6.5 9l3.5 3.5L13.5 9" {...strokeProps} />
      <path d="M3.5 14.5v1.8a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1.8" {...strokeProps} />
    </svg>
  );
}

export function IconBuilding(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="2.5" width="9" height="15" rx="1" {...strokeProps} />
      <path d="M13 8h3v9.5h-3M6.5 5.5h1M9.5 5.5h1M6.5 8h1M9.5 8h1M6.5 10.5h1M9.5 10.5h1M6.5 13h1M9.5 13h1" {...strokeProps} />
    </svg>
  );
}

export function IconSend(props) {
  return (
    <svg {...base} {...props}>
      <path d="M17 3 2.5 9.2l5.4 2 2 5.4L17 3Z" {...strokeProps} />
      <path d="M17 3 7.9 11.2" {...strokeProps} />
    </svg>
  );
}

export function IconWallet(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="15" height="11" rx="1.8" {...strokeProps} />
      <path d="M2.5 8.5H17" {...strokeProps} />
      <path d="M13 12.2h2.2" {...strokeProps} />
    </svg>
  );
}

export function IconReceipt(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 2.5h10v15l-1.8-1.3-1.7 1.3-1.5-1.3-1.5 1.3-1.7-1.3L5 17.5v-15Z" {...strokeProps} />
      <path d="M7.2 6.5h5.6M7.2 9.5h5.6M7.2 12.5h3.5" {...strokeProps} />
    </svg>
  );
}

export function IconActivity(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 10.5h3l2-5 3 9 2-7 1.5 3h3.5" {...strokeProps} />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 17H4.8a1.3 1.3 0 0 1-1.3-1.3V4.3A1.3 1.3 0 0 1 4.8 3H8" {...strokeProps} />
      <path d="M13 13.5 17 10l-4-3.5" {...strokeProps} />
      <path d="M17 10H8" {...strokeProps} />
    </svg>
  );
}
