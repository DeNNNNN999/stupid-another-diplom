// Chat configuration and constants

export const CHAT_CONFIG = {
  // Real-time settings
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  PING_TIMEOUT: 60000,
  PING_INTERVAL: 25000,
  
  // Message settings
  MAX_MESSAGE_LENGTH: 2000,
  MAX_ATTACHMENTS: 5,
  TYPING_TIMEOUT: 3000,
  MESSAGE_BATCH_SIZE: 50,
  
  // File upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  
  // UI settings
  AUTO_SCROLL_THRESHOLD: 100,
  ONLINE_STATUS_UPDATE_INTERVAL: 30000,
  CHAT_LIST_UPDATE_INTERVAL: 10000,
  
  // Features
  FEATURES: {
    TYPING_INDICATORS: true,
    READ_RECEIPTS: true,
    ONLINE_STATUS: true,
    FILE_ATTACHMENTS: true,
    EMOJI_REACTIONS: false, // Future feature
    MESSAGE_THREADS: false, // Future feature
    VOICE_MESSAGES: false, // Future feature
    VIDEO_CALLS: true,
    SCREEN_SHARING: false, // Future feature
  },
  
  // Notifications
  NOTIFICATION_SOUND: true,
  NOTIFICATION_PERMISSION: true,
  
  // Performance
  VIRTUAL_SCROLLING: false, // Enable for large message lists
  LAZY_LOADING: true,
  MESSAGE_CACHE_SIZE: 1000,
};

export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Authentication events
  JOIN_ROOMS: 'join-rooms',
  
  // Message events
  SEND_MESSAGE: 'send-message',
  NEW_MESSAGE: 'new-message',
  MESSAGE_DELIVERED: 'message-delivered',
  MESSAGE_READ: 'message-read',
  MESSAGES_READ: 'messages-read',
  MARK_AS_READ: 'mark-as-read',
  
  // Typing events
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',
  USER_TYPING: 'user-typing',
  USER_STOPPED_TYPING: 'user-stopped-typing',
  
  // User status events
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
  ONLINE_USERS: 'online-users',
  
  // Room events
  JOIN_CHAT: 'join-chat',
  LEAVE_CHAT: 'leave-chat',
  CHAT_CREATED: 'chat-created',
  CHAT_UPDATED: 'chat-updated',
  
  // Conference events
  JOIN_CONFERENCE: 'join-conference',
  LEAVE_CONFERENCE: 'leave-conference',
  CONFERENCE_PARTICIPANTS: 'conference-participants',
  PARTICIPANT_JOINED: 'participant-joined',
  PARTICIPANT_LEFT: 'participant-left',
  
  // WebRTC events
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  TOGGLE_MUTE: 'toggle-mute',
  TOGGLE_VIDEO: 'toggle-video',
  PARTICIPANT_MUTED: 'participant-muted',
  PARTICIPANT_VIDEO_TOGGLED: 'participant-video-toggled',
  
  // Error events
  ERROR: 'error',
} as const;

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
  VOICE: 'voice', // Future
  VIDEO: 'video', // Future
} as const;

export const CHAT_TYPES = {
  DIRECT: 'direct',
  GROUP: 'group',
  CHANNEL: 'channel', // Future
} as const;

export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away', // Future
  BUSY: 'busy', // Future
} as const;

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
  if (mimeType.includes('text')) return '📃';
  return '📎';
};

export const validateMessage = (content: string): { valid: boolean; error?: string } => {
  if (!content.trim()) {
    return { valid: false, error: 'Сообщение не может быть пустым' };
  }
  
  if (content.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
    return { 
      valid: false, 
      error: `Сообщение слишком длинное (максимум ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} символов)` 
    };
  }
  
  return { valid: true };
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > CHAT_CONFIG.MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Файл слишком большой (максимум ${formatFileSize(CHAT_CONFIG.MAX_FILE_SIZE)})` 
    };
  }
  
  if (!CHAT_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Неподдерживаемый тип файла' 
    };
  }
  
  return { valid: true };
};