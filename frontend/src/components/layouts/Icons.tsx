import type { ReactNode, CSSProperties } from "react";

type IconName =
  | "home"
  | "dashboard"
  | "users"
  | "network"
  | "calendar"
  | "send"
  | "wallet"
  | "chart"
  | "settings"
  | "logout"
  | "chevron-right"
  | "chevron-down"
  | "menu"
  | "search"
  | "bell"
  | "user"
  | "clock"
  | "building"
  | "arrow-up"
  | "arrow-right"
  | "check"
  | "zap"
  | "laptop";

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
};

export default function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  className,
  style,
}: IconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const shapes: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="14" width="8" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    network: (
      <>
        <rect x="8" y="2" width="8" height="6" rx="1" />
        <rect x="2" y="16" width="8" height="6" rx="1" />
        <rect x="14" y="16" width="8" height="6" rx="1" />
        <path d="M12 8v4M6 16v-4h12v4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="m9 16 2 2 4-4" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 8h18M16 15h.01" />
        <path d="M6 5V3h12v2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1L11 7.3h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
      </>
    ),
    "chevron-right": <path d="m9 18 6-6-6-6" />,
    "chevron-down": <path d="m6 9 6 6 6-6" />,
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 5 5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    building: (
      <>
        <rect x="3" y="3" width="12" height="18" rx="1" />
        <path d="M15 9h6v12h-6M7 7h1M11 7h1M7 11h1M11 11h1M7 15h1M11 15h1M18 13h.01M18 17h.01" />
      </>
    ),
    "arrow-up": (
      <>
        <path d="M12 19V5M6 11l6-6 6 6" />
      </>
    ),
    "arrow-right": (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    zap: <path d="m13 2-3 8H5l6 12 3-8h5Z" />,
    laptop: (
      <>
        <rect x="4" y="4" width="16" height="12" rx="1.5" />
        <path d="M2 20h20l-2-4H4Z" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...common}
    >
      {shapes[name]}
    </svg>
  );
}
