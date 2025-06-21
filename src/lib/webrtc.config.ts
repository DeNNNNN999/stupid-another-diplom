// WebRTC Configuration for video conferences

export const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
      ],
    },
    // В production добавьте TURN сервер для NAT traversal
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'your-username',
    //   credential: 'your-password',
    // },
  ],
  iceCandidatePoolSize: 10,
};

export const MEDIA_CONSTRAINTS = {
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { min: 16, ideal: 30, max: 30 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
  },
};

export const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { max: 30 },
    cursor: 'always',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export const PEER_CONFIG = {
  config: ICE_SERVERS,
  constraints: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  },
};

// Quality presets для разных условий сети
export const VIDEO_QUALITY_PRESETS = {
  low: {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15 },
    },
    audio: MEDIA_CONSTRAINTS.audio,
  },
  medium: {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 24 },
    },
    audio: MEDIA_CONSTRAINTS.audio,
  },
  high: {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: MEDIA_CONSTRAINTS.audio,
  },
};

// Utility functions
export const checkMediaDeviceSupport = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideo = devices.some(device => device.kind === 'videoinput');
    const hasAudio = devices.some(device => device.kind === 'audioinput');
    
    return {
      video: hasVideo,
      audio: hasAudio,
      supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    };
  } catch (error) {
    console.error('Error checking media device support:', error);
    return {
      video: false,
      audio: false,
      supported: false,
    };
  }
};

export const getOptimalVideoConstraints = (networkSpeed: 'slow' | 'medium' | 'fast') => {
  switch (networkSpeed) {
    case 'slow':
      return VIDEO_QUALITY_PRESETS.low;
    case 'medium':
      return VIDEO_QUALITY_PRESETS.medium;
    case 'fast':
    default:
      return VIDEO_QUALITY_PRESETS.high;
  }
};

export const handleMediaError = (error: any) => {
  console.error('Media error:', error);
  
  switch (error.name) {
    case 'NotAllowedError':
      return 'Доступ к камере и микрофону запрещен. Пожалуйста, разрешите доступ и обновите страницу.';
    case 'NotFoundError':
      return 'Камера или микрофон не найдены. Проверьте подключение устройств.';
    case 'NotReadableError':
      return 'Камера или микрофон уже используются другим приложением.';
    case 'OverconstrainedError':
      return 'Настройки камеры не поддерживаются вашим устройством.';
    case 'SecurityError':
      return 'Доступ запрещен по соображениям безопасности. Используйте HTTPS.';
    default:
      return 'Произошла ошибка при доступе к медиа-устройствам.';
  }
};