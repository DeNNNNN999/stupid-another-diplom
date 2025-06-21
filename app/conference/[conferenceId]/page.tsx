'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  MessageSquare,
  Settings,
  MoreVertical,
  Send,
  Copy,
  ExternalLink,
  Volume2,
  VolumeX,
  Maximize,
  Grid,
  Speaker,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import SimplePeer from 'simple-peer';
import io, { Socket } from 'socket.io-client';
import { ICE_SERVERS, MEDIA_CONSTRAINTS, SCREEN_SHARE_CONSTRAINTS } from '@/src/lib/webrtc.config';

interface Participant {
  userId: string;
  name: string;
  email: string;
  profileImage?: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  stream?: MediaStream;
  peer?: SimplePeer.Instance;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export default function ConferenceRoom() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const conferenceId = params.conferenceId as string;

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [key: string]: SimplePeer.Instance }>({});

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [conference, setConference] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('participants');
  const [layout, setLayout] = useState<'grid' | 'speaker'>('grid');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  // Initialize conference
  useEffect(() => {
    fetchConferenceDetails();
    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peersRef.current).forEach(peer => peer.destroy());
    };
  }, []);

  const fetchConferenceDetails = async () => {
    try {
      const response = await fetch(`/api/conference/${conferenceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConference(data);
        
        // Initialize socket connection
        initializeSocket();
      } else {
        toast.error('Не удалось загрузить конференцию');
        router.push('/conference');
      }
    } catch (error) {
      console.error('Failed to fetch conference:', error);
      toast.error('Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocket = () => {
    const socket = io('http://localhost:3001', {
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      socket.emit('join-conference', { conferenceId });
    });

    socket.on('conference-participants', (participantsList: any[]) => {
      setParticipants(participantsList.map(p => ({
        ...p,
        isMuted: false,
        isVideoOff: false,
        isHost: false,
      })));
    });

    socket.on('participant-joined', (participant: any) => {
      toast.info(`${participant.name} присоединился к конференции`);
      setParticipants(prev => [...prev, {
        ...participant,
        isMuted: false,
        isVideoOff: false,
        isHost: false,
      }]);
      
      // If we're already in a call, create peer for new participant
      if (isInCall && localStreamRef.current) {
        createPeer(participant.userId, localStreamRef.current);
      }
    });

    socket.on('participant-left', ({ userId }: { userId: string }) => {
      const participant = participants.find(p => p.userId === userId);
      if (participant) {
        toast.info(`${participant.name} покинул конференцию`);
      }
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      
      // Clean up peer connection
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
    });

    socket.on('participant-muted', ({ userId, isMuted }: any) => {
      setParticipants(prev => prev.map(p => 
        p.userId === userId ? { ...p, isMuted } : p
      ));
    });

    socket.on('participant-video-toggled', ({ userId, isVideoOff }: any) => {
      setParticipants(prev => prev.map(p => 
        p.userId === userId ? { ...p, isVideoOff } : p
      ));
    });

    socket.on('chat-message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    });

    socket.on('offer', handleReceiveCall);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
  };

  const startCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsInCall(true);

      // Create peer connections for existing participants
      participants.forEach(participant => {
        if (participant.userId !== user?.id) {
          createPeer(participant.userId, stream);
        }
      });
    } catch (error) {
      console.error('Failed to access media devices:', error);
      toast.error('Не удалось получить доступ к камере и микрофону');
    }
  };

  const createPeer = (userId: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
      config: ICE_SERVERS,
    });

    peer.on('signal', signal => {
      socketRef.current?.emit('offer', {
        userId,
        signal,
        conferenceId,
      });
    });

    peer.on('stream', remoteStream => {
      if (remoteVideoRefs.current[userId]) {
        remoteVideoRefs.current[userId]!.srcObject = remoteStream;
      }
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      toast.error('Ошибка соединения с участником');
    });

    peersRef.current[userId] = peer;
  };

  const handleReceiveCall = ({ userId, signal }: any) => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: localStreamRef.current!,
      config: ICE_SERVERS,
    });

    peer.on('signal', signal => {
      socketRef.current?.emit('answer', {
        userId,
        signal,
        conferenceId,
      });
    });

    peer.on('stream', remoteStream => {
      if (remoteVideoRefs.current[userId]) {
        remoteVideoRefs.current[userId]!.srcObject = remoteStream;
      }
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      toast.error('Ошибка соединения с участником');
    });

    peer.signal(signal);
    peersRef.current[userId] = peer;
  };

  const handleAnswer = ({ userId, signal }: any) => {
    peersRef.current[userId]?.signal(signal);
  };

  const handleIceCandidate = ({ userId, candidate }: any) => {
    peersRef.current[userId]?.signal(candidate);
  };

  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Destroy all peer connections
    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};

    // Notify server
    socketRef.current?.emit('leave-conference', { conferenceId });

    setIsInCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      socketRef.current?.emit('toggle-mute', { 
        conferenceId, 
        isMuted: !isMuted 
      });
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
      socketRef.current?.emit('toggle-video', { 
        conferenceId, 
        isVideoOff: !isVideoOff 
      });
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);

        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in all peer connections
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer._pc.getSenders().find(
            (s: any) => s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        videoTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        toast.success('Демонстрация экрана начата');
      } catch (error) {
        console.error('Failed to share screen:', error);
        toast.error('Не удалось начать демонстрацию экрана');
      }
    } else {
      // Stop screen sharing and switch back to camera
      if (localStreamRef.current) {
        const cameraStream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);

        const videoTrack = cameraStream.getVideoTracks()[0];
        
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer._pc.getSenders().find(
            (s: any) => s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        localStreamRef.current = cameraStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
      }

      setIsScreenSharing(false);
      toast.info('Демонстрация экрана завершена');
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        userId: user!.id,
        userName: user!.name,
        message: newMessage,
        timestamp: new Date(),
      };

      socketRef.current.emit('chat-message', message);
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/conference/${conferenceId}`;
    navigator.clipboard.writeText(link);
    toast.success('Ссылка на конференцию скопирована');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Загрузка конференции...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-white font-semibold">{conference?.title}</h1>
          <Badge variant="outline" className="text-gray-300">
            {participants.length} участников
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyInviteLink}
            className="text-gray-300"
          >
            <Copy className="h-4 w-4 mr-2" />
            Пригласить
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLayout(layout === 'grid' ? 'speaker' : 'grid')}
            className="text-gray-300"
          >
            {layout === 'grid' ? <Speaker className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 p-4">
          {!isInCall ? (
            <div className="h-full flex items-center justify-center">
              <Card className="p-8 text-center max-w-md">
                <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-2xl font-semibold mb-2">
                  Готовы присоединиться?
                </h2>
                <p className="text-gray-600 mb-6">
                  Настройте камеру и микрофон перед входом в конференцию
                </p>
                <Button size="lg" onClick={startCall} className="gap-2">
                  <Phone className="h-5 w-5" />
                  Присоединиться
                </Button>
              </Card>
            </div>
          ) : (
            <div className={`h-full grid gap-4 ${
              layout === 'grid' 
                ? participants.length <= 1 ? 'grid-cols-1' 
                : participants.length <= 4 ? 'grid-cols-2' 
                : 'grid-cols-3'
                : 'grid-cols-1'
            }`}>
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  Вы {isMuted && '🔇'} {isVideoOff && '📷'}
                </div>
              </div>

              {/* Remote Videos */}
              {participants
                .filter(p => p.userId !== user?.id)
                .map(participant => (
                  <div
                    key={participant.userId}
                    className="relative bg-gray-800 rounded-lg overflow-hidden"
                  >
                    <video
                      ref={el => {
                        if (el) remoteVideoRefs.current[participant.userId] = el;
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                      {participant.name} {participant.isMuted && '🔇'} {participant.isVideoOff && '📷'}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700">
              <TabsTrigger value="participants" className="text-gray-300">
                <Users className="h-4 w-4 mr-2" />
                Участники
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-gray-300">
                <MessageSquare className="h-4 w-4 mr-2" />
                Чат
              </TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="flex-1 p-4 overflow-auto">
              <div className="space-y-2">
                {participants.map(participant => (
                  <div
                    key={participant.userId}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.profileImage} />
                        <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {participant.name} {participant.userId === user?.id && '(Вы)'}
                        </p>
                        {participant.isHost && (
                          <Badge variant="secondary" className="text-xs">
                            Организатор
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {participant.isMuted && <MicOff className="h-4 w-4 text-gray-400" />}
                      {participant.isVideoOff && <VideoOff className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col p-4">
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-3">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-sm font-medium text-white">
                          {msg.userName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex space-x-2">
                <Input
                  placeholder="Введите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button size="icon" onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Controls */}
      {isInCall && (
        <div className="bg-gray-800 px-4 py-4 flex items-center justify-center space-x-4">
          <Button
            variant={isMuted ? 'destructive' : 'secondary'}
            size="lg"
            onClick={toggleMute}
            className="gap-2"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            variant={isVideoOff ? 'destructive' : 'secondary'}
            size="lg"
            onClick={toggleVideo}
            className="gap-2"
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
          <Button
            variant={isScreenSharing ? 'default' : 'secondary'}
            size="lg"
            onClick={toggleScreenShare}
            className="gap-2"
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="gap-2"
          >
            <PhoneOff className="h-5 w-5" />
            Завершить
          </Button>
        </div>
      )}
    </div>
  );
}