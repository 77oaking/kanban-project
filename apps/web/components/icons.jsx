// Tiny inline icon set so we don't pull a 70KB icon lib for the few we use.
const I = (path, viewBox = '0 0 24 24') => (props) => (
  <svg
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={props.size || 16}
    height={props.size || 16}
    {...props}
  >
    {path}
  </svg>
);

export const HomeIcon = I(<path d="M3 11l9-8 9 8M5 10v10h14V10" />);
export const TargetIcon = I(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>);
export const MegaphoneIcon = I(<><path d="M3 11v2a2 2 0 002 2h2l9 5V4l-9 5H5a2 2 0 00-2 2z" /></>);
export const ListIcon = I(<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>);
export const KanbanIcon = I(<><path d="M5 4h4v16H5zM10 4h4v10h-4zM15 4h4v6h-4z" /></>);
export const UsersIcon = I(<><circle cx="9" cy="8" r="4" /><path d="M2 20c0-4 3-6 7-6s7 2 7 6" /><circle cx="17" cy="9" r="3" /><path d="M22 19c0-3-2-5-5-5" /></>);
export const SettingsIcon = I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>);
export const PlusIcon = I(<><path d="M12 5v14M5 12h14" /></>);
export const PinIcon = I(<><path d="M12 2v6m0 0l3 3-6 6-3-3 6-6zm0 0l3-3 6 6-3 3-6-6z" /></>);
export const SearchIcon = I(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>);
export const BellIcon = I(<><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9z" /><path d="M10 21a2 2 0 004 0" /></>);
export const LogoutIcon = I(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></>);
export const CheckIcon = I(<path d="M5 13l4 4L19 7" />);
export const TrashIcon = I(<><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></>);
export const ChevronDownIcon = I(<path d="M6 9l6 6 6-6" />);
export const DownloadIcon = I(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></>);
export const SendIcon = I(<><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></>);
export const SmileIcon = I(<><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>);
export const PaletteIcon = I(<><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.7 0 2-1.3 1-2-1-.8-.5-2 1-2h2c2.8 0 5-2.2 5-5 0-5.5-4.5-10-9-10z" /></>);
export const SparkleIcon = I(<path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />);
