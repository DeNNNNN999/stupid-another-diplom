// Types for contacts and related functionality

export interface Contact {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department: string | null;
  position: string | null;
  phoneNumber: string | null;
  profileImage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
  lastSeen?: string;
  isFavorite?: boolean;
}

export interface Department {
  value: string;
  label: string;
  count: number;
}

export interface ContactFilters {
  search: string;
  departments: string[];
  roles: ('ADMIN' | 'EMPLOYEE')[];
  status: 'all' | 'online' | 'offline';
  favorites: boolean;
}

export interface ContactStats {
  total: number;
  filtered: number;
  online: number;
  admins: number;
  departments: number;
  favorites: number;
}

export type ViewMode = 'grid' | 'list' | 'table';
export type SortField = 'name' | 'department' | 'position' | 'lastSeen';
export type SortOrder = 'asc' | 'desc';

// Props for contact components
export interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (selected: boolean) => void;
  onToggleFavorite: () => void;
  onStartChat: () => void;
  onStartVideoCall: () => void;
  onViewProfile: () => void;
}

export interface ContactTableProps {
  contacts: Contact[];
  selectedContacts: Set<string>;
  favorites: Set<string>;
  onSelectContact: (contactId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onToggleFavorite: (contactId: string) => void;
  onStartChat: (contactId: string) => void;
  onStartVideoCall: (contactId: string) => void;
  onViewProfile: (contact: Contact) => void;
}

export interface ContactDetailsDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onStartChat: () => void;
  onStartVideoCall: () => void;
}

// API Response types
export interface ContactsResponse {
  contacts: Contact[];
  departments: Department[];
  stats: {
    total: number;
    online: number;
    admins: number;
    departments: number;
  };
}

export interface OnlineStatusResponse {
  onlineUsers: string[];
  timestamp: string;
}

export interface FavoritesResponse {
  favorites: string[];
  message?: string;
}

// Utility types
export type ContactAction = 
  | 'chat'
  | 'video'
  | 'email'
  | 'phone'
  | 'favorite'
  | 'view';

export interface ContactActionEvent {
  action: ContactAction;
  contactId: string;
  contact: Contact;
}