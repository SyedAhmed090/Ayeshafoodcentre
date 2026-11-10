// Stroke icons from the screen designs, shared by customer and staff screens. Decorative: buttons carry their own label.

type P = { size?: number; strokeWidth?: number };
const base = (size: number, sw: number) => ({
  viewBox: "0 0 24 24",
  width: size,
  height: size,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const PhoneIcon = ({ size = 20, strokeWidth = 1.8 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);
export const PlusIcon = ({ size = 20, strokeWidth = 2.6 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MinusIcon = ({ size = 18, strokeWidth = 2.6 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M5 12h14" />
  </svg>
);
export const BackIcon = ({ size = 20, strokeWidth = 2.2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const UploadIcon = ({ size = 22, strokeWidth = 2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </svg>
);
export const CheckIcon = ({ size = 22, strokeWidth = 2.6 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M5 12l5 5 9-10" />
  </svg>
);
export const CrossIcon = ({ size = 22, strokeWidth = 2.6 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const FlameIcon = ({ size = 22, strokeWidth = 2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />
  </svg>
);
export const BikeIcon = ({ size = 22, strokeWidth = 2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <circle cx="6" cy="17" r="3" />
    <circle cx="18" cy="17" r="3" />
    <path d="M6 17l4-8h4l4 8M9 9H6M14 9l1-3h3" />
  </svg>
);
export const HomeIcon = ({ size = 22, strokeWidth = 2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M4 11l8-7 8 7v9H4z" />
    <path d="M10 20v-6h4v6" />
  </svg>
);
export const PhoneCardIcon = ({ size = 22, strokeWidth = 2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <path d="M10 18h4" />
  </svg>
);
export const UndoIcon = ({ size = 24, strokeWidth = 2.4 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const BellIcon = ({ size = 24, strokeWidth = 2.2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" />
  </svg>
);
export const AlarmIcon = ({ size = 80, strokeWidth = 1.8 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4M2 8a10 10 0 0 1 3-5M22 8a10 10 0 0 0-3-5" />
  </svg>
);
export const ArrowIcon = ({ size = 40, strokeWidth = 2.6 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M4 12h15M13 5l7 7-7 7" />
  </svg>
);
export const MapIcon = ({ size = 32, strokeWidth = 2 }: P) => (
  <svg {...base(size, strokeWidth)}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);
