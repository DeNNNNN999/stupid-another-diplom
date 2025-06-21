'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSocketEvent } from '@/hooks/useSocket';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserStatus } from '@/components/ui/user-status';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Send,
  Plus,
  Paperclip,
  Smile,
  MoreVertical,
  Users,
  User,
  Hash,
  Check,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  File,
  X,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatRoom {
  id: string;
  name: string | null;
  isGroup: boolean;
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: {
      name: string;
    };
  };
  users: {
    user: {
      id: string;
      name: string;
      email: string;
      profileImage: string | null;
    };
  }[];
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { onlineUsers, isUserOnline } = useOnlineStatus();
  const { 
    typingUsers, 
    startTyping, 
    stopTyping, 
    sendMessage: sendSocketMessage,
    markAsRead,
    isConnected 
  } = useChat(selectedChat?.id || null);

  // Socket events
  useSocketEvent('new-message', (data: { chatRoomId: string; message: Message }) => {
    if (data.chatRoomId === selectedChat?.id) {
      setMessages(prev => [...prev, data.message]);
      markAsRead();
    }
    
    // Update chat list
    setChatRooms(prev => prev.map(chat => {
      if (chat.id === data.chatRoomId) {
        return {
          ...chat,
          lastMessage: {
            content: data.message.content,
            createdAt: data.message.createdAt,
            sender: data.message.sender,
          },
          unreadCount: chat.id === selectedChat?.id ? 0 : (chat.unreadCount || 0) + 1,
        };
      }
      return chat;
    }));
  });

  useSocketEvent('messages-read', (data: { chatRoomId: string; userId: string }) => {
    if (data.chatRoomId === selectedChat?.id) {
      setMessages(prev => prev.map(msg => ({
        ...msg,
        isRead: true,
      })));
    }
  });

  useEffect(() => {
    fetchChatRooms();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      setIsLoadingMessages(true);
      fetchMessages(selectedChat.id);
      markAsRead();
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatRooms = async () => {
    try {
      const response = await fetch('/api/chat', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatRooms(data);
      }
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
      toast.error('Не удалось загрузить чаты');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/contacts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.filter((u: any) => u.id !== user?.id));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Не удалось загрузить сообщения');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    
    // Send via socket for real-time delivery
    if (isConnected) {
      sendSocketMessage(messageContent);
    } else {
      // Fallback to HTTP if socket is not connected
      try {
        const response = await fetch(`/api/chat/${selectedChat.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: messageContent,
            attachments: [],
          }),
        });

        if (response.ok) {
          const message = await response.json();
          setMessages(prev => [...prev, message]);
          
          // Update last message in chat list
          setChatRooms(prev => prev.map(chat => {
            if (chat.id === selectedChat.id) {
              return {
                ...chat,
                lastMessage: {
                  content: message.content,
                  createdAt: message.createdAt,
                  sender: message.sender,
                },
              };
            }
            return chat;
          }));
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Не удалось отправить сообщение');
        setNewMessage(messageContent); // Restore message on error
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const createPrivateChat = async (userId: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isGroup: false,
          userIds: [userId],
        }),
      });

      if (response.ok) {
        const chat = await response.json();
        await fetchChatRooms();
        setSelectedChat(chat);
        setShowNewChatDialog(false);
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Не удалось создать чат');
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      toast.error('Введите название группы и выберите минимум 2 участника');
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isGroup: true,
          name: groupName,
          description: groupDescription,
          userIds: selectedUsers,
        }),
      });

      if (response.ok) {
        const chat = await response.json();
        await fetchChatRooms();
        setSelectedChat(chat);
        setShowNewGroupDialog(false);
        setGroupName('');
        setGroupDescription('');
        setSelectedUsers([]);
      }
    } catch (error) {
      console.error('Failed to create group chat:', error);
      toast.error('Не удалось создать групповой чат');
    }
  };

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm');
    } else if (isYesterday(messageDate)) {
      return `Вчера, ${format(messageDate, 'HH:mm')}`;
    } else {
      return format(messageDate, 'd MMM, HH:mm', { locale: ru });
    }
  };

  const formatDateDivider = (date: string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return 'Сегодня';
    } else if (isYesterday(messageDate)) {
      return 'Вчера';
    } else {
      return format(messageDate, 'd MMMM yyyy', { locale: ru });
    }
  };

  const getChatName = (chat: ChatRoom) => {
    if (chat.isGroup) {
      return chat.name || 'Групповой чат';
    }
    const otherUser = chat.users.find(u => u.user.id !== user?.id);
    return otherUser?.user.name || 'Неизвестный пользователь';
  };

  const getChatAvatar = (chat: ChatRoom) => {
    if (chat.isGroup) {
      return null;
    }
    const otherUser = chat.users.find(u => u.user.id !== user?.id);
    return otherUser?.user.profileImage;
  };

  const getChatUserId = (chat: ChatRoom) => {
    if (chat.isGroup) return null;
    const otherUser = chat.users.find(u => u.user.id !== user?.id);
    return otherUser?.user.id;
  };

  const filteredChats = chatRooms.filter(chat => {
    const chatName = getChatName(chat).toLowerCase();
    return chatName.includes(searchQuery.toLowerCase());
  });

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach(message => {
      const messageDate = format(new Date(message.createdAt), 'yyyy-MM-dd');
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          date: message.createdAt,
          messages: [message],
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Chat List Sidebar */}
        <div className="w-80 border-r bg-white dark:bg-gray-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Сообщения</h2>
              <div className="flex items-center space-x-2">
                {!isConnected && (
                  <Badge variant="outline" className="text-yellow-600">
                    Offline
                  </Badge>
                )}
                <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Новый чат">
                      <User className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Новый чат</DialogTitle>
                      <DialogDescription>
                        Выберите пользователя для начала переписки
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] mt-4">
                      <div className="space-y-2">
                        {allUsers.map(user => (
                          <Button
                            key={user.id}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => createPrivateChat(user.id)}
                          >
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage src={user.profileImage} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.position}</p>
                            </div>
                            <UserStatus isOnline={isUserOnline(user.id)} />
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Новая группа">
                      <Users className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Новая группа</DialogTitle>
                      <DialogDescription>
                        Создайте групповой чат для команды
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Название группы</Label>
                        <Input
                          placeholder="Например: Отдел разработки"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Описание (необязательно)</Label>
                        <Textarea
                          placeholder="Опишите цель группы..."
                          value={groupDescription}
                          onChange={(e) => setGroupDescription(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Участники (минимум 2)</Label>
                        <ScrollArea className="h-[200px] border rounded-md p-2">
                          <div className="space-y-2">
                            {allUsers.map(user => (
                              <div key={user.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={user.id}
                                  checked={selectedUsers.includes(user.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedUsers([...selectedUsers, user.id]);
                                    } else {
                                      setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={user.id}
                                  className="flex items-center space-x-2 cursor-pointer flex-1"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={user.profileImage} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm flex-1">{user.name}</span>
                                  <UserStatus isOnline={isUserOnline(user.id)} />
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
                        Отмена
                      </Button>
                      <Button onClick={createGroupChat}>
                        Создать группу
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Поиск чатов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Нет активных чатов</p>
                <p className="text-sm text-gray-400 mt-1">
                  Начните новую переписку
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredChats.map(chat => {
                  const isSelected = selectedChat?.id === chat.id;
                  const chatName = getChatName(chat);
                  const chatAvatar = getChatAvatar(chat);
                  const chatUserId = getChatUserId(chat);
                  
                  return (
                    <Button
                      key={chat.id}
                      variant={isSelected ? 'secondary' : 'ghost'}
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            {chat.isGroup ? (
                              <AvatarFallback>
                                <Users className="h-5 w-5" />
                              </AvatarFallback>
                            ) : (
                              <>
                                <AvatarImage src={chatAvatar || undefined} />
                                <AvatarFallback>{chatName.charAt(0)}</AvatarFallback>
                              </>
                            )}
                          </Avatar>
                          {!chat.isGroup && chatUserId && (
                            <div className="absolute -bottom-1 -right-1">
                              <UserStatus isOnline={isUserOnline(chatUserId)} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{chatName}</p>
                            {chat.lastMessage && (
                              <span className="text-xs text-gray-500">
                                {formatMessageDate(chat.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {chat.lastMessage.sender.name === user?.name ? 'Вы: ' : ''}
                              {chat.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {chat.unreadCount && chat.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b px-6 flex items-center justify-between bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar>
                      {selectedChat.isGroup ? (
                        <AvatarFallback>
                          <Users className="h-5 w-5" />
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={getChatAvatar(selectedChat) || undefined} />
                          <AvatarFallback>{getChatName(selectedChat).charAt(0)}</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    {!selectedChat.isGroup && getChatUserId(selectedChat) && (
                      <div className="absolute -bottom-1 -right-1">
                        <UserStatus isOnline={isUserOnline(getChatUserId(selectedChat)!)} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{getChatName(selectedChat)}</h3>
                    {selectedChat.isGroup ? (
                      <p className="text-xs text-gray-500">
                        {selectedChat.users.length} участников • {onlineUsers.length} онлайн
                      </p>
                    ) : (
                      getChatUserId(selectedChat) && isUserOnline(getChatUserId(selectedChat)!) && (
                        <p className="text-xs text-green-600">В сети</p>
                      )
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messageGroups.map((group, groupIndex) => (
                      <div key={groupIndex}>
                        {/* Date Divider */}
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {formatDateDivider(group.date)}
                            </span>
                          </div>
                        </div>

                        {/* Messages in group */}
                        <div className="space-y-4">
                          {group.messages.map((message, index) => {
                            const isOwn = message.sender.id === user?.id;
                            const showAvatar = index === 0 || 
                              group.messages[index - 1].sender.id !== message.sender.id;
                            
                            return (
                              <div
                                key={message.id}
                                className={cn(
                                  'flex items-end space-x-2',
                                  isOwn && 'justify-end'
                                )}
                              >
                                {!isOwn && showAvatar && (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={message.sender.profileImage || undefined} />
                                    <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                )}
                                {!isOwn && !showAvatar && <div className="w-8" />}
                                
                                <div className={cn(
                                  'max-w-[70%]',
                                  isOwn && 'flex flex-col items-end'
                                )}>
                                  {!isOwn && showAvatar && (
                                    <p className="text-xs text-gray-500 mb-1">
                                      {message.sender.name}
                                    </p>
                                  )}
                                  <div
                                    className={cn(
                                      'rounded-lg px-4 py-2',
                                      isOwn
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-gray-100 dark:bg-gray-700'
                                    )}
                                  >
                                    <p className="text-sm whitespace-pre-wrap">
                                      {message.content}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-1 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {formatMessageDate(message.createdAt)}
                                    </span>
                                    {isOwn && (
                                      message.isRead ? (
                                        <CheckCheck className="h-3 w-3 text-blue-500" />
                                      ) : (
                                        <Check className="h-3 w-3 text-gray-400" />
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {typingUsers.length > 0 && (
                      <TypingIndicator users={typingUsers.map(u => u.userName)} />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input
                    ref={messageInputRef}
                    placeholder="Введите сообщение..."
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Выберите чат
                </h3>
                <p className="text-gray-500 mt-2">
                  Выберите существующий чат или начните новую переписку
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}