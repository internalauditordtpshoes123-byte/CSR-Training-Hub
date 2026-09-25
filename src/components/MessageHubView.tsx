/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Hash, 
  User, 
  Smile, 
  Paperclip, 
  Download, 
  CheckCheck, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap, 
  Users, 
  Building, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon,
  HelpCircle,
  RefreshCw,
  Eye,
  Maximize2,
  Lock,
  UserCheck,
  AlertCircle,
  Loader2,
  BellRing,
  Laptop,
  Trash2
} from 'lucide-react';
import { ChatChannel, ChatMessage, UserRole, AuthenticatedEmployee, Employee, PresenceUser } from '../types';
import { 
  syncEntityToMaster, 
  subscribeToRealtimeSync, 
  sendChatMessage, 
  fetchChatMessages,
  fetchOnlinePresenceList,
  sendPresenceHeartbeat,
  uploadChatImageToServer,
  markChatMessagesAsRead,
  deleteChatConversation,
  toggleChatMessageReaction
} from '../services/realtimeSync';
import {
  requestDesktopNotificationPermission,
  getNotificationPermissionStatus,
  triggerTestDesktopNotification,
  isDesktopNotificationSupported
} from '../services/desktopNotifications';

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🔥', '👞', '✅', '👏'];

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'popular',
    name: 'Frequent & Quick',
    icon: '🔥',
    emojis: ['👍', '❤️', '😂', '🔥', '👞', '✅', '👏', '🎉', '🙏', '💯', '😊', '😍', '👟', '✨', '💪', '🙌', '😮', '🚀']
  },
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: '😃',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '🙃', '😉', '😊', 
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😋', '😛', '😜', '🤪', '😎', '🥳', 
      '🤠', '🥺', '😭', '😤', '😱', '😴', '🤯', '🤗', '🤫', '🤔', '🤐', '😐', 
      '🙄', '😬', '🤥', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴'
    ]
  },
  {
    id: 'gestures',
    name: 'Gestures & People',
    icon: '👋',
    emojis: [
      '👍', '👎', '👏', '🙌', '🤝', '🤛', '🤜', '✊', '👊', '✌️', '🤞', '🤟', 
      '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🖐️', '✋', '🤚', '👋', 
      '🤏', '🙏', '✍️', '💪', '👂', '👃', '👀', '👁️', '👤', '👥', '🧑‍🏭', '👨‍💼', '👩‍💼'
    ]
  },
  {
    id: 'factory',
    name: 'Shoe Factory & Work',
    icon: '👞',
    emojis: [
      '👞', '👟', '🥾', '🥿', '👠', '👡', '🦺', '👔', '👕', '🧵', '🪡', '🏭', 
      '🏢', '🏗️', '⚙️', '🛠️', '🔧', '🔨', '📦', '📋', '📊', '📈', '📉', '📅', 
      '🕒', '⏰', '⏱️', '🔔', '📢', '📣', '💡', '🔍', '🔎', '🛡️', '⚠️', '🚨', 
      '🛑', '📝', '📁', '💼', '🏷️', '🔒', '🔑', '🎯', '💯'
    ]
  },
  {
    id: 'symbols',
    name: 'Symbols & Hearts',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', 
      '💖', '💗', '💘', '💝', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '🏆', '🥇', 
      '🥈', '🥉', '🎯', '🚀', '💬', '🗨️', '💭', '✅', '❌', '⭕', '❗', '❓', 
      '📌', '📍', '🚩', '🏁', '🎉', '🎊', '🎈', '🎁'
    ]
  }
];

interface MessageHubViewProps {
  role: UserRole;
  currentUser?: AuthenticatedEmployee | null;
  employees?: Employee[];
  addToast: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  registerBackHandler?: (handler: () => boolean) => () => void;
  selectedChatId?: string | null;
  onUnreadCountChange?: (count: number) => void;
}

// Canonical DM ID Generator (Deterministic for both participants)
export const getCanonicalDMId = (userId1?: string, userId2?: string): string => {
  const clean1 = (userId1 || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const clean2 = (userId2 || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const sorted = [clean1, clean2].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
};

// Initial Group Channels
const INITIAL_CHANNELS: ChatChannel[] = [
  {
    id: 'c-general',
    name: 'general-csr',
    topic: 'Company-wide CSR & Compliance Announcements',
    isChannel: true,
    unreadCount: 0,
    lastMessage: 'Reminder: Anti Bribery Annual Training on Aug 15.',
    lastTime: '09:30 AM',
    memberCount: 1250,
    avatarIcon: 'ShieldCheck'
  },
  {
    id: 'c-leadership',
    name: 'leadership-training',
    topic: 'Trainee leaders, batch schedules & curriculum coordination',
    isChannel: true,
    unreadCount: 0,
    lastMessage: 'Batch 4 modules 1-4 completed. Assessment uploaded.',
    lastTime: '10:45 AM',
    memberCount: 35,
    avatarIcon: 'GraduationCap'
  },
  {
    id: 'c-anti-bribery',
    name: 'anti-bribery-ethics',
    topic: 'Anti-Corruption, Whistleblowing & Fair Play Policies',
    isChannel: true,
    unreadCount: 0,
    lastMessage: 'All department heads please confirm attendee count.',
    lastTime: 'Yesterday',
    memberCount: 88,
    avatarIcon: 'ShieldCheck'
  },
  {
    id: 'c-assembly',
    name: 'assembly-production',
    topic: 'Assembly lines, stitching quality & floor supervisor coordination',
    isChannel: true,
    unreadCount: 0,
    lastMessage: 'Total pairs target: 5,034 pairs on schedule.',
    lastTime: '11:15 AM',
    memberCount: 420,
    avatarIcon: 'Building'
  },
  {
    id: 'c-hr-helpdesk',
    name: 'hr-helpdesk',
    topic: 'Attendance logs, employee records & certificate requests',
    isChannel: true,
    unreadCount: 0,
    lastMessage: 'Certificate generation for Batch 3 is now ready.',
    lastTime: '12:20 PM',
    memberCount: 156,
    avatarIcon: 'Users'
  }
];

export function MessageHubView({
  role,
  currentUser,
  employees = [],
  addToast,
  registerBackHandler,
  selectedChatId,
  onUnreadCountChange
}: MessageHubViewProps) {
  // 1. Current Active Chat ID
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    if (selectedChatId) return selectedChatId;
    return 'c-general';
  });

  // Handle incoming selectedChatId change from alert notifications
  useEffect(() => {
    if (selectedChatId) {
      setActiveChatId(selectedChatId);
    }
  }, [selectedChatId]);

  // 2. Channels Store
  const [channels, setChannels] = useState<ChatChannel[]>(() => {
    const saved = localStorage.getItem('csr_chat_channels');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_CHANNELS;
  });

  // 3. Master Messages Store (Keyed by canonical chatId)
  const [messagesStore, setMessagesStore] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('csr_chat_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // 4. Real-Time Online Presence Users
  const [onlinePresences, setOnlinePresences] = useState<PresenceUser[]>([]);

  // 5. Input & Filter State
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabSection, setActiveTabSection] = useState<'all' | 'direct' | 'channels' | 'online'>('all');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 5.1 Desktop Notifications Integration
  const [desktopPermStatus, setDesktopPermStatus] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermissionStatus());

  const handleEnableDesktopNotifications = async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopPermStatus(perm);
    if (perm === 'granted') {
      addToast('Desktop Alerts Activated', 'You will receive desktop notifications when colleagues message you, even when minimized.', 'success');
      await triggerTestDesktopNotification();
    } else if (perm === 'denied') {
      addToast('Notifications Blocked', 'Please permit notifications in browser site permissions to receive desktop alerts.', 'warning');
    }
  };

  const handleTestDesktopAlert = async () => {
    if (desktopPermStatus !== 'granted') {
      await handleEnableDesktopNotifications();
      return;
    }
    await triggerTestDesktopNotification();
    addToast('Desktop Notification Sent', 'Check your OS desktop/taskbar for the incoming notification toast!', 'info');
  };

  // 6. Image Upload State & Lightbox
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<{
    file: File;
    previewUrl: string;
    fileName: string;
    fileSize: string;
    mimeType: string;
  } | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    fileName: string;
    senderName: string;
    timestamp: string;
    fileSize?: string;
  } | null>(null);

  // 7. Modals
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);

  // 7.1 Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<string>('popular');
  const [emojiSearch, setEmojiSearch] = useState('');
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputFieldRef = useRef<HTMLInputElement>(null);

  // 7.2 Delete Conversation Modal State
  const [conversationToDelete, setConversationToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSyncingFromPeerRef = useRef(false);

  // Current logged in identity keys
  const myUserId = currentUser?.id || 'admin-master';
  const myEmpNo = currentUser?.employeeNo || 'ADMIN-01';
  const myName = currentUser?.name || (role === 'Admin' ? 'Datian Subic Shoes Inc.' : 'Operations Staff');

  // Close emoji picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Register ESC back handler
  useEffect(() => {
    if (!registerBackHandler) return;
    return registerBackHandler(() => {
      if (conversationToDelete) {
        setConversationToDelete(null);
        return true;
      }
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
        return true;
      }
      if (lightboxImage) {
        setLightboxImage(null);
        return true;
      }
      if (selectedImageFile) {
        setSelectedImageFile(null);
        return true;
      }
      if (isNewChatModalOpen) {
        setIsNewChatModalOpen(false);
        return true;
      }
      if (isAttachmentOpen) {
        setIsAttachmentOpen(false);
        return true;
      }
      if (activeChatId !== 'c-general') {
        setActiveChatId('c-general');
        return true;
      }
      return false;
    });
  }, [registerBackHandler, conversationToDelete, showEmojiPicker, lightboxImage, selectedImageFile, isNewChatModalOpen, isAttachmentOpen, activeChatId]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesStore, activeChatId, isTyping]);

  // Online Map of Employee IDs / Numbers
  const onlineMap = useMemo(() => {
    const map = new Map<string, PresenceUser>();
    onlinePresences.forEach((p) => {
      if (p.id) map.set(p.id.toLowerCase(), p);
      if (p.employeeNo) map.set(p.employeeNo.toUpperCase(), p);
    });
    return map;
  }, [onlinePresences]);

  // 8. Presence Heartbeat
  useEffect(() => {
    fetchOnlinePresenceList().then((list) => {
      if (Array.isArray(list)) setOnlinePresences(list);
    });

    if (currentUser) {
      sendPresenceHeartbeat(currentUser, 'online').then((list) => {
        if (Array.isArray(list)) setOnlinePresences(list);
      });
    }

    const interval = setInterval(() => {
      if (currentUser) {
        sendPresenceHeartbeat(currentUser, 'online').then((list) => {
          if (Array.isArray(list)) setOnlinePresences(list);
        });
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // 9. Fetch Chat Messages on Active Chat Change & Mark as Read
  useEffect(() => {
    if (!activeChatId) return;

    fetchChatMessages(activeChatId, {
      id: currentUser?.id,
      employeeNo: currentUser?.employeeNo,
      role: currentUser?.role || role
    }).then((serverMsgs) => {
      if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
        setMessagesStore((prev) => ({
          ...prev,
          [activeChatId]: serverMsgs
        }));

        // If any message in this conversation was sent by someone else and hasn't been read, mark as seen
        if (currentUser) {
          const myId = (currentUser.id || '').toLowerCase();
          const myNo = (currentUser.employeeNo || '').toUpperCase();
          const unreadFromOther = serverMsgs.filter(
            (m) =>
              m.status !== 'read' &&
              !m.readAt &&
              ((m.senderId && m.senderId.toLowerCase() !== myId) ||
               (m.senderEmployeeNo && m.senderEmployeeNo.toUpperCase() !== myNo))
          );

          if (unreadFromOther.length > 0) {
            markChatMessagesAsRead(
              activeChatId,
              {
                id: currentUser.id,
                employeeNo: currentUser.employeeNo,
                name: currentUser.name
              },
              unreadFromOther.map((m) => m.id)
            );
          }
        }
      }
    });

    if (currentUser) {
      markChatMessagesAsRead(activeChatId, {
        id: currentUser.id,
        employeeNo: currentUser.employeeNo,
        name: currentUser.name
      });
    }
  }, [activeChatId, currentUser, role]);

  // 10. Subscribe to Real-Time SSE Chat Updates with Read Receipts & Privacy Enforcement
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeSync((event) => {
      if (event.type === 'PRESENCE_UPDATED' && Array.isArray(event.data)) {
        setOnlinePresences(event.data);
      } else if (event.type === 'CHAT_MESSAGES_READ' && event.data?.chatId) {
        // Real-Time Read Receipts: Update check status to double-check (Seen)
        const { chatId, messageIds, readAt, readerId, readerEmployeeNo, readerName } = event.data;
        setMessagesStore((prev) => {
          const list = prev[chatId];
          if (!list || list.length === 0) return prev;

          const updatedList = list.map((msg) => {
            const matches = !Array.isArray(messageIds) || messageIds.length === 0 || messageIds.includes(msg.id);
            if (matches) {
              return {
                ...msg,
                status: 'read' as const,
                readAt: readAt || new Date().toISOString(),
                readBy: [
                  ...(msg.readBy || []).filter((r: any) => r.id !== readerId),
                  { id: readerId, employeeNo: readerEmployeeNo, name: readerName, readAt: readAt || new Date().toISOString() }
                ]
              };
            }
            return msg;
          });

          return {
            ...prev,
            [chatId]: updatedList
          };
        });
      } else if (event.type === 'CHAT_MESSAGE_SENT' && event.data?.chatId && event.data?.message) {
        const { chatId, message, isPrivateDM, senderId, senderEmployeeNo, recipientId, recipientEmployeeNo } = event.data;

        // Strict 1-to-1 Privacy Check:
        if (isPrivateDM || chatId.startsWith('dm_')) {
          const myIdClean = (currentUser?.id || '').toLowerCase();
          const myNoClean = (currentUser?.employeeNo || '').toLowerCase();
          const sIdClean = (senderId || message.senderId || '').toLowerCase();
          const sNoClean = (senderEmployeeNo || message.senderEmployeeNo || '').toLowerCase();
          const rIdClean = (recipientId || message.recipientId || '').toLowerCase();
          const rNoClean = (recipientEmployeeNo || message.recipientEmployeeNo || '').toLowerCase();

          const isMeSender = (myIdClean && sIdClean === myIdClean) || (myNoClean && sNoClean === myNoClean);
          const isMeRecipient = (myIdClean && rIdClean === myIdClean) || (myNoClean && rNoClean === myNoClean);

          // If current logged-in employee is neither the sender nor recipient, DROP completely!
          if (!isMeSender && !isMeRecipient && chatId !== 'dm-ai') {
            return;
          }
        }

        isSyncingFromPeerRef.current = true;
        setMessagesStore((prev) => {
          const list = prev[chatId] || [];
          if (list.some((m) => m.id === message.id)) return prev;
          return {
            ...prev,
            [chatId]: [...list, message]
          };
        });

        // If current user is actively on this chat screen, immediately mark incoming message as read
        if (chatId === activeChatId && currentUser) {
          const myIdClean = (currentUser.id || '').toLowerCase();
          const myNoClean = (currentUser.employeeNo || '').toUpperCase();
          const sId = (senderId || message.senderId || '').toLowerCase();
          const sNo = (senderEmployeeNo || message.senderEmployeeNo || '').toUpperCase();
          const isFromOther = (myIdClean && sId !== myIdClean) || (myNoClean && sNo !== myNoClean);

          if (isFromOther) {
            markChatMessagesAsRead(
              chatId,
              {
                id: currentUser.id,
                employeeNo: currentUser.employeeNo,
                name: currentUser.name
              },
              [message.id]
            );
          }
        }

        // Update channel last message preview
        setChannels((prevList) =>
          prevList.map((ch) =>
            ch.id === chatId
              ? {
                  ...ch,
                  lastMessage: message.image ? '📷 Photo' : message.text ? message.text.slice(0, 45) : 'Attachment',
                  lastTime: message.timestamp || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                }
              : ch
          )
        );

        playChime();
        setTimeout(() => {
          isSyncingFromPeerRef.current = false;
        }, 300);
      } else if (event.type === 'CHAT_CONVERSATION_DELETED' && event.data?.chatId) {
        const { chatId } = event.data;
        setMessagesStore((prev) => ({
          ...prev,
          [chatId]: []
        }));
        setChannels((prevList) =>
          prevList.map((ch) =>
            ch.id === chatId
              ? { ...ch, lastMessage: '', lastTime: '', unreadCount: 0 }
              : ch
          )
        );
      } else if (event.type === 'CHAT_MESSAGE_REACTED' && event.data?.chatId && event.data?.messageId) {
        const { chatId, messageId, reactions, reactedUsers } = event.data;
        setMessagesStore((prev) => {
          const list = prev[chatId] || [];
          return {
            ...prev,
            [chatId]: list.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reactions,
                    userReactions: reactedUsers
                      ? Object.keys(reactedUsers).filter((e) => reactedUsers[e]?.includes(myUserId))
                      : m.userReactions
                  }
                : m
            )
          };
        });
      } else if (event.entity === 'chatChannels' && Array.isArray(event.data)) {
        setChannels(event.data);
      }
    });

    return () => unsubscribe();
  }, [currentUser, activeChatId]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('csr_chat_channels', JSON.stringify(channels));
      localStorage.setItem('csr_chat_messages', JSON.stringify(messagesStore));
    } catch (e) {
      console.warn('Storage limit reached for chat messages:', e);
    }
  }, [channels, messagesStore]);

  // 11. Build 1-to-1 Private Direct Message Contact List for Current Employee
  const privateEmployeeContacts = useMemo(() => {
    // List all real registered employees in the organization (excluding self)
    const myCleanId = (currentUser?.id || '').toLowerCase();
    const myCleanNo = (currentUser?.employeeNo || '').toUpperCase();

    return employees
      .filter((emp) => {
        const empCleanId = (emp.id || '').toLowerCase();
        const empCleanNo = (emp.employeeNo || '').toUpperCase();
        return empCleanId !== myCleanId && empCleanNo !== myCleanNo;
      })
      .map((emp) => {
        const canonicalId = getCanonicalDMId(currentUser?.id || currentUser?.employeeNo || 'admin', emp.id || emp.employeeNo);
        const isOnline = onlineMap.has(emp.id.toLowerCase()) || onlineMap.has(emp.employeeNo?.toUpperCase());
        const presence = onlineMap.get(emp.id.toLowerCase()) || onlineMap.get(emp.employeeNo?.toUpperCase());

        // Get messages specifically for this private conversation
        const conversationMsgs = messagesStore[canonicalId] || [];
        const lastMsg = conversationMsgs.length > 0 ? conversationMsgs[conversationMsgs.length - 1] : null;

        // Calculate unread count specifically for currentUser
        const unreadCount = conversationMsgs.filter(m => {
          const isSentByOther = (m.senderId && m.senderId.toLowerCase() !== myCleanId) ||
                                (m.senderEmployeeNo && m.senderEmployeeNo.toUpperCase() !== myCleanNo);
          const isUnread = m.status !== 'read' && !m.readAt;
          return isSentByOther && isUnread && canonicalId !== activeChatId;
        }).length;

        return {
          id: canonicalId,
          empRecordId: emp.id,
          employeeNo: emp.employeeNo,
          name: emp.name,
          fullName: emp.fullName || emp.name,
          department: emp.department || 'General',
          position: emp.position || 'Staff',
          role: emp.role || 'Staff',
          isChannel: false,
          status: isOnline ? (presence?.status || 'online') : 'offline',
          avatar: emp.avatar,
          lastActive: presence?.lastActive,
          lastMessage: lastMsg ? (lastMsg.image ? '📷 Photo' : lastMsg.text || 'Attachment') : 'Click to start private chat',
          lastTime: lastMsg ? lastMsg.timestamp : '',
          unreadCount
        };
      });
  }, [employees, currentUser, onlineMap, messagesStore, activeChatId]);

  // Compute total unread for navigation badge
  useEffect(() => {
    const channelUnread = channels.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    const dmUnread = privateEmployeeContacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    const totalUnread = channelUnread + dmUnread;
    if (onUnreadCountChange) {
      onUnreadCountChange(totalUnread);
    }
  }, [channels, privateEmployeeContacts, onUnreadCountChange]);

  // Active chat metadata
  const activeChat = useMemo(() => {
    // 1. Group channel?
    const channelMatch = channels.find((c) => c.id === activeChatId);
    if (channelMatch) return channelMatch;

    // 2. AI Assistant?
    if (activeChatId === 'dm-ai') {
      return {
        id: 'dm-ai',
        name: 'Da Tian CSR Copilot',
        topic: '24/7 AI Assistant for CSR & Training Policies',
        isChannel: false,
        status: 'bot',
        role: 'AI Assistant',
        department: 'AI Operations'
      };
    }

    // 3. Private 1-to-1 Employee DM?
    const contactMatch = privateEmployeeContacts.find((c) => c.id === activeChatId);
    if (contactMatch) {
      return {
        id: contactMatch.id,
        name: contactMatch.name,
        topic: `${contactMatch.department} • ${contactMatch.position} (ID: ${contactMatch.employeeNo})`,
        isChannel: false,
        status: contactMatch.status,
        role: contactMatch.role,
        department: contactMatch.department,
        position: contactMatch.position,
        employeeNo: contactMatch.employeeNo,
        avatar: contactMatch.avatar
      };
    }

    // 4. Fallback search across all employees if canonical ID was opened directly
    if (activeChatId.startsWith('dm_')) {
      const parts = activeChatId.replace(/^dm_/, '').split('_');
      const myIdLower = (currentUser?.id || '').toLowerCase();
      const myNoLower = (currentUser?.employeeNo || '').toLowerCase();

      const otherToken = parts.find(p => p !== myIdLower && p !== myNoLower) || parts[0];
      const otherEmp = employees.find(e => 
        e.id.toLowerCase() === otherToken || 
        e.employeeNo.toLowerCase() === otherToken
      );

      if (otherEmp) {
        const isOnline = onlineMap.has(otherEmp.id.toLowerCase()) || onlineMap.has(otherEmp.employeeNo?.toUpperCase());
        return {
          id: activeChatId,
          name: otherEmp.name,
          topic: `${otherEmp.department} • ${otherEmp.position} (ID: ${otherEmp.employeeNo})`,
          isChannel: false,
          status: isOnline ? 'online' : 'offline',
          role: otherEmp.role,
          department: otherEmp.department,
          position: otherEmp.position,
          employeeNo: otherEmp.employeeNo,
          avatar: otherEmp.avatar
        };
      }
    }

    return channels[0] || INITIAL_CHANNELS[0];
  }, [activeChatId, channels, privateEmployeeContacts, employees, currentUser, onlineMap]);

  // Current active messages
  const currentMessages = messagesStore[activeChatId] || [];

  // Play audio chime
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch {}
  };

  // Filtered displayed emojis for the picker
  const displayedEmojis = useMemo(() => {
    if (!emojiSearch.trim()) {
      const activeCat = EMOJI_CATEGORIES.find((c) => c.id === emojiCategory) || EMOJI_CATEGORIES[0];
      return activeCat.emojis;
    }
    const query = emojiSearch.toLowerCase().trim();
    const all = Array.from(new Set(EMOJI_CATEGORIES.flatMap((c) => c.emojis)));
    const keywordMap: Record<string, string[]> = {
      smile: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '😊', '🙂'],
      happy: ['😀', '😃', '😄', '😁', '😆', '😊', '🥳'],
      laugh: ['😂', '🤣', '😆', '😅'],
      love: ['❤️', '😍', '🥰', '😘', '💕', '💖', '❣️'],
      heart: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💖'],
      shoe: ['👞', '👟', '🥾', '🥿', '👠', '👡'],
      thumb: ['👍', '👎'],
      good: ['👍', '✅', '💯', '👏'],
      yes: ['👍', '✅', '💯'],
      ok: ['👍', '👌', '✅'],
      fire: ['🔥'],
      work: ['👞', '👟', '🦺', '🧵', '🪡', '🏭', '🏢', '🏗️', '⚙️', '🛠️', '📦'],
      check: ['✅', '✔️', '☑️'],
      factory: ['🏭', '🏢', '🏗️', '⚙️', '🛠️', '👞', '🦺', '🧵'],
      star: ['⭐', '🌟', '✨'],
      party: ['🎉', '🎊', '🥳', '🎈'],
      sad: ['🥺', '😭', '😢', '😔'],
      pray: ['🙏'],
      clap: ['👏']
    };

    const matchesFromMap = Object.entries(keywordMap)
      .filter(([k]) => k.includes(query) || query.includes(k))
      .flatMap(([_, list]) => list);

    if (matchesFromMap.length > 0) {
      return Array.from(new Set(matchesFromMap));
    }
    return all;
  }, [emojiSearch, emojiCategory]);

  // Insert emoji at cursor or append
  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setTimeout(() => {
      inputFieldRef.current?.focus();
    }, 50);
  };

  // Toggle emoji reaction on a message
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    // 1. Optimistic local update
    setMessagesStore((prev) => {
      const list = prev[activeChatId] || [];
      const updatedList = list.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactions = { ...(m.reactions || {}) };
        const userReactions = [...(m.userReactions || [])];
        const reactedUsers = { ...((m as any).reactedUsers || {}) };
        const usersForEmoji = [...(reactedUsers[emoji] || [])];

        const hasReacted = userReactions.includes(emoji) || usersForEmoji.includes(myUserId);

        if (hasReacted) {
          const idx = userReactions.indexOf(emoji);
          if (idx > -1) userReactions.splice(idx, 1);
          const uIdx = usersForEmoji.indexOf(myUserId);
          if (uIdx > -1) usersForEmoji.splice(uIdx, 1);

          if ((currentReactions[emoji] || 0) <= 1) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = currentReactions[emoji] - 1;
          }
        } else {
          userReactions.push(emoji);
          usersForEmoji.push(myUserId);
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        }

        reactedUsers[emoji] = usersForEmoji;

        return {
          ...m,
          reactions: currentReactions,
          userReactions,
          reactedUsers
        };
      });

      return {
        ...prev,
        [activeChatId]: updatedList
      };
    });

    // 2. Broadcast to server
    toggleChatMessageReaction(activeChatId, messageId, emoji, myUserId);
  };

  // Confirm delete conversation
  const handleConfirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    const targetChatId = conversationToDelete.id;
    const targetName = conversationToDelete.name;
    setIsDeletingChat(true);

    try {
      // 1. Optimistic update
      setMessagesStore((prev) => ({
        ...prev,
        [targetChatId]: []
      }));

      setChannels((prevList) =>
        prevList.map((ch) =>
          ch.id === targetChatId
            ? { ...ch, lastMessage: '', lastTime: '', unreadCount: 0 }
            : ch
        )
      );

      // 2. Call server
      await deleteChatConversation(targetChatId, {
        id: currentUser?.id,
        employeeNo: currentUser?.employeeNo,
        role: currentUser?.role || role
      });

      addToast('Conversation Deleted', `All messages in "${targetName}" have been removed.`, 'success');
    } catch (err) {
      console.error('Delete conversation error:', err);
      addToast('Deletion Warning', 'Conversation cleared locally.', 'info');
    } finally {
      setIsDeletingChat(false);
      setConversationToDelete(null);
    }
  };

  // Handle select chat
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChannels((prevList) =>
      prevList.map((ch) => (ch.id === chatId ? { ...ch, unreadCount: 0 } : ch))
    );
    if (currentUser) {
      markChatMessagesAsRead(chatId, {
        id: currentUser.id,
        employeeNo: currentUser.employeeNo,
        name: currentUser.name
      });
    }
  };

  // Send Text Message
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    // Target recipient details if private DM
    let recipientId: string | undefined;
    let recipientEmployeeNo: string | undefined;
    let recipientName: string | undefined;

    if (!activeChat.isChannel && activeChatId !== 'dm-ai') {
      recipientId = activeChat.employeeId || activeChat.id;
      recipientEmployeeNo = activeChat.employeeNo;
      recipientName = activeChat.name;
    }

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      senderId: myUserId,
      senderEmployeeNo: myEmpNo,
      senderName: myName,
      senderDepartment: currentUser?.department || 'Operations',
      senderPosition: currentUser?.position || 'Staff',
      senderRole: currentUser?.role || role,
      senderAvatar: currentUser?.avatar,
      recipientId,
      recipientEmployeeNo,
      recipientName,
      text: text,
      timestamp: timeNow,
      channelId: activeChatId,
      status: 'sent'
    };

    // 1. Optimistic Local Update
    setMessagesStore((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), userMsg]
    }));

    setInputText('');

    // 2. Broadcast via Server Realtime Sync & SSE
    sendChatMessage(activeChatId, userMsg);

    // 3. Update preview in channels list
    setChannels((prevList) =>
      prevList.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: text.slice(0, 45) + (text.length > 45 ? '...' : ''),
              lastTime: timeNow,
              unreadCount: 0
            }
          : c
      )
    );

    // 4. Trigger AI reply if chatting with CSR AI Copilot
    if (activeChatId === 'dm-ai') {
      handleAICopilotReply(text);
    }
  };

  // AI Copilot Auto-Response
  const handleAICopilotReply = (query: string) => {
    setIsTyping(true);
    setTypingUser('Da Tian CSR Copilot');

    setTimeout(() => {
      setIsTyping(false);
      setTypingUser('');

      const q = query.toLowerCase();
      let reply = `Inquiry received. The CSR & Leadership system is active with realtime updates across all terminals.`;

      if (q.includes('anti-bribery') || q.includes('bribe') || q.includes('ethics') || q.includes('policy')) {
        reply = `🛡️ **Anti-Bribery & Compliance Policy Summary:**\n• Zero-tolerance for corruption, kickbacks, or facilitation payments.\n• Annual Mandatory Refresher: Aug 15, 2026 at Training Room 2F.\n• Whistleblower Hotline: 100% confidential via CSR Management Portal.`;
      } else if (q.includes('leadership') || q.includes('batch') || q.includes('schedule') || q.includes('trainer')) {
        reply = `🎓 **Leadership Training Schedule:**\n• 4 Curriculum Modules (Module 1: Principles, Module 2: Quality & Takt, Module 3: Team Communication, Module 4: Conflict Resolution).\n• Active Trainees: 35 enrolled leaders.\n• Certificates are auto-generated upon module score validation.`;
      } else if (q.includes('stitching') || q.includes('shoes') || q.includes('target') || q.includes('pairs')) {
        reply = `👞 **Shoe Assembly & Stitching Status:**\n• Daily output target: 5,034 pairs.\n• Stitching QA pass rate: 98.6% with Blue Label certified operators on active shifts.`;
      } else if (q.includes('hello') || q.includes('hi') || q.includes('kamusta')) {
        reply = `Hello ${myName}! I am your 24/7 Da Tian CSR & Compliance Assistant. How can I help you today? You can ask about training batches, ethical compliance, or upload factory photos.`;
      }

      const timeNow = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        senderId: 'ai-copilot',
        senderName: 'Da Tian CSR Copilot',
        senderRole: 'AI Assistant',
        text: reply,
        timestamp: timeNow,
        channelId: 'dm-ai',
        status: 'sent'
      };

      setMessagesStore((prev) => ({
        ...prev,
        ['dm-ai']: [...(prev['dm-ai'] || []), aiMsg]
      }));

      sendChatMessage('dm-ai', aiMsg);
      playChime();
    }, 1000);
  };

  // Image Selection Handler (File Input & Drag-Drop)
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast('Invalid Image', 'Please select a valid image file (JPG, PNG, WEBP, or GIF).', 'warning');
      return;
    }

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      addToast('File Too Large', 'Selected image exceeds the 15MB limit.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      setSelectedImageFile({
        file,
        previewUrl: dataUrl,
        fileName: file.name,
        fileSize: sizeStr,
        mimeType: file.type
      });
      setImageCaption('');
    };
    reader.readAsDataURL(file);

    // Reset input value so same image can be reselected
    if (e.target) e.target.value = '';
  };

  // Upload & Send Image
  const handleSendImageUpload = async () => {
    if (!selectedImageFile) return;

    setIsUploadingImage(true);

    let recipientId: string | undefined;
    let recipientEmployeeNo: string | undefined;
    let recipientName: string | undefined;

    if (!activeChat.isChannel && activeChatId !== 'dm-ai') {
      recipientId = activeChat.employeeId || activeChat.id;
      recipientEmployeeNo = activeChat.employeeNo;
      recipientName = activeChat.name;
    }

    const result = await uploadChatImageToServer({
      chatId: activeChatId,
      fileName: selectedImageFile.fileName,
      fileType: selectedImageFile.mimeType,
      dataUrl: selectedImageFile.previewUrl,
      senderId: myUserId,
      senderName: myName,
      senderEmployeeNo: myEmpNo,
      senderDepartment: currentUser?.department || 'Operations',
      senderPosition: currentUser?.position || 'Staff',
      senderRole: currentUser?.role || role,
      senderAvatar: currentUser?.avatar,
      recipientId,
      recipientEmployeeNo,
      recipientName,
      caption: imageCaption
    });

    setIsUploadingImage(false);

    if (result.success && result.message) {
      // Add message to store
      setMessagesStore((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), result.message]
      }));

      setSelectedImageFile(null);
      setImageCaption('');
      addToast('Image Sent', 'Your image was uploaded and sent in real time.', 'success');
      playChime();
    } else {
      addToast('Upload Failed', result.error || 'Failed to upload image. Please try again.', 'warning');
    }
  };

  // Cancel Image Upload
  const handleCancelImageUpload = () => {
    setSelectedImageFile(null);
    setImageCaption('');
  };

  // Create Channel
  const handleCreateChannel = () => {
    const cleanName = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!cleanName) return;

    const newChan: ChatChannel = {
      id: `c-${cleanName}`,
      name: cleanName,
      topic: newChannelTopic.trim() || 'Factory discussion and coordination',
      isChannel: true,
      unreadCount: 0,
      lastMessage: 'Channel created.',
      lastTime: 'Just now',
      memberCount: employees.length,
      avatarIcon: 'Hash'
    };

    setChannels((prev) => [...prev, newChan]);
    setActiveChatId(newChan.id);
    setIsNewChatModalOpen(false);
    setNewChannelName('');
    setNewChannelTopic('');
    addToast('Channel Created', `#${cleanName} channel is now active for all employees.`, 'success');
  };

  // Filtered Contacts for Sidebar
  const filteredDMs = useMemo(() => {
    return privateEmployeeContacts.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.employeeNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.position.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [privateEmployeeContacts, searchQuery]);

  const filteredChannels = useMemo(() => {
    return channels.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  const onlineContacts = useMemo(() => {
    return filteredDMs.filter((c) => c.status === 'online');
  }, [filteredDMs]);

  return (
    <div className="flex h-full w-full bg-[#030914] text-slate-100 overflow-hidden font-sans border-t border-[#0e2440]">
      
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: DIRECT MESSAGES & CHANNELS DIRECTORY */}
      {/* ========================================================================= */}
      <div className="w-80 md:w-96 flex-shrink-0 bg-[#061224] border-r border-[#0e2440] flex flex-col h-full">
        
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[#0e2440] space-y-2.5 bg-[#07152b]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                  CSR Messaging Hub
                  <span className="text-[9px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded font-mono font-bold">
                    Private 1:1
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400 font-mono">
                  {currentUser ? `Logged in: ${currentUser.name}` : 'Multi-Terminal Network'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-1.5 rounded-lg bg-[#0e264a] hover:bg-[#163a6e] text-blue-300 hover:text-white transition cursor-pointer border border-[#1b4378]"
              title="Create Channel"
            >
              <Hash className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Push / Background Notification Status Bar */}
          <div className="p-2 rounded-xl bg-gradient-to-r from-[#071933] to-[#0a1e3b] border border-[#143d70] flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                desktopPermStatus === 'granted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {desktopPermStatus === 'granted' ? (
                  <Laptop className="w-3.5 h-3.5" />
                ) : (
                  <BellRing className="w-3.5 h-3.5 animate-pulse" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white leading-tight flex items-center gap-1">
                  <span>Desktop Alerts</span>
                  <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                    desktopPermStatus === 'granted' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-blue-900/60 text-blue-300'
                  }`}>
                    {desktopPermStatus === 'granted' ? 'ACTIVE' : 'OFF'}
                  </span>
                </p>
                <p className="text-[8.5px] text-slate-400 truncate">
                  {desktopPermStatus === 'granted' ? 'Alerts even when minimized' : 'Alerts when system minimized'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTestDesktopAlert}
              className={`px-2 py-0.8 text-[9px] font-bold rounded-lg transition cursor-pointer shadow-xs whitespace-nowrap ${
                desktopPermStatus === 'granted'
                  ? 'bg-[#0f2d57] hover:bg-[#153e77] text-blue-200 border border-[#1d4c8c]'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title={desktopPermStatus === 'granted' ? 'Send a test OS desktop notification' : 'Enable OS desktop notifications'}
            >
              {desktopPermStatus === 'granted' ? 'Test Alert' : 'Turn On'}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search colleagues, ID, or channels..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#030a16] border border-[#102d54] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Navigation Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#030a16] rounded-xl border border-[#0d223d] text-[10px] text-center font-medium">
            <button
              onClick={() => setActiveTabSection('all')}
              className={`py-1 rounded-lg transition cursor-pointer font-bold ${
                activeTabSection === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTabSection('direct')}
              className={`py-1 rounded-lg transition cursor-pointer font-bold flex items-center justify-center gap-1 ${
                activeTabSection === 'direct' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-2.5 h-2.5" />
              Direct
            </button>
            <button
              onClick={() => setActiveTabSection('online')}
              className={`py-1 rounded-lg transition cursor-pointer font-bold flex items-center justify-center gap-1 ${
                activeTabSection === 'online' ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live ({onlineContacts.length})
            </button>
            <button
              onClick={() => setActiveTabSection('channels')}
              className={`py-1 rounded-lg transition cursor-pointer font-bold ${
                activeTabSection === 'channels' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Channels
            </button>
          </div>
        </div>

        {/* Directory List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#091a33] text-xs">
          
          {/* AI Copilot Pinned Bot */}
          {(activeTabSection === 'all' || activeTabSection === 'direct' || activeTabSection === 'channels') && (
            <div className="p-2">
              <div
                onClick={() => handleSelectChat('dm-ai')}
                className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-2.5 cursor-pointer group ${
                  activeChatId === 'dm-ai'
                    ? 'bg-gradient-to-r from-blue-900/60 to-purple-900/40 border border-blue-500/60 text-white shadow-md'
                    : 'hover:bg-[#091b35] text-slate-300'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-[#061224]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate text-xs">Da Tian CSR Copilot</span>
                    <span className="text-[9px] bg-purple-900/80 text-purple-200 px-1.5 py-0.2 rounded font-mono font-bold">AI BOT</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">24/7 AI CSR & Policy Assistant</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversationToDelete({ id: 'dm-ai', name: 'Da Tian CSR Copilot' });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition cursor-pointer flex-shrink-0"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Group Channels Section */}
          {(activeTabSection === 'all' || activeTabSection === 'channels') && (
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Group Channels ({filteredChannels.length})</span>
                <span className="text-slate-500 text-[9px]">Multi-Terminal Broadcast</span>
              </div>

              {filteredChannels.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectChat(c.id)}
                  className={`w-full text-left p-2 rounded-xl transition flex items-center gap-2.5 cursor-pointer group ${
                    activeChatId === c.id
                      ? 'bg-blue-900/40 border border-blue-500/50 text-white shadow-sm'
                      : 'hover:bg-[#091b35] text-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#0a1e3a] border border-[#14396b] flex items-center justify-center text-blue-400 flex-shrink-0">
                    <Hash className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate text-xs">#{c.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 font-mono">{c.lastTime || ''}</span>
                        {c.unreadCount && c.unreadCount > 0 ? (
                          <span className="text-[9px] font-bold bg-[#f59e0b] text-slate-950 px-1.5 py-0.2 rounded-full font-mono">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{c.lastMessage || c.topic}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConversationToDelete({ id: c.id, name: `#${c.name}` });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition cursor-pointer flex-shrink-0"
                    title="Delete channel conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 1-to-1 Private Direct Messages Directory */}
          {(activeTabSection === 'all' || activeTabSection === 'direct' || activeTabSection === 'online') && (
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>
                    {activeTabSection === 'online' ? `ONLINE EMPLOYEES (${onlineContacts.length})` : `PRIVATE MESSAGES (${filteredDMs.length})`}
                  </span>
                </div>
                <span className="text-amber-500/80 text-[9px] font-normal">Encrypted 1:1</span>
              </div>

              {(activeTabSection === 'online' ? onlineContacts : filteredDMs).length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No matching colleagues found
                </div>
              ) : (
                (activeTabSection === 'online' ? onlineContacts : filteredDMs).map((emp) => {
                  const isActive = activeChatId === emp.id;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectChat(emp.id)}
                      className={`w-full text-left p-2 rounded-xl transition flex items-center gap-2.5 cursor-pointer group ${
                        isActive
                          ? 'bg-blue-900/40 border border-amber-500/50 text-white shadow-sm'
                          : 'hover:bg-[#091b35] text-slate-300'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] shadow-sm ${
                          emp.status === 'online'
                            ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                            : 'bg-[#0c1f38] border border-[#173b6b] text-blue-300'
                        }`}>
                          {emp.avatar || emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#061224] ${
                          emp.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white truncate text-xs">{emp.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-slate-400 font-mono">{emp.lastTime || ''}</span>
                            {emp.unreadCount && emp.unreadCount > 0 ? (
                              <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-mono animate-bounce">
                                {emp.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          <span className="font-mono text-slate-400">{emp.employeeNo}</span> • {emp.lastMessage}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConversationToDelete({ id: emp.id, name: emp.name });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition cursor-pointer flex-shrink-0"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT MAIN CHAT AREA */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full bg-[#030914] relative">
        
        {/* Chat Top Navigation Bar */}
        <div className="p-3.5 bg-[#061224] border-b border-[#0e2440] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-md ${
                activeChat.isChannel
                  ? 'bg-[#0a203d] border border-blue-500/40 text-blue-400'
                  : activeChatId === 'dm-ai'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                    : activeChat.status === 'online'
                      ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                      : 'bg-[#0a203d] border border-[#163866] text-amber-300'
              }`}>
                {activeChat.isChannel ? <Hash className="w-4 h-4" /> : (activeChat.avatar || activeChat.name.slice(0, 2).toUpperCase())}
              </div>
              {!activeChat.isChannel && (
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#061224] ${
                  activeChat.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
                }`} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm truncate">
                  {activeChat.isChannel ? `#${activeChat.name}` : activeChat.name}
                </span>
                {!activeChat.isChannel && activeChatId !== 'dm-ai' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Private 1:1
                  </span>
                )}
                {!activeChat.isChannel && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    activeChat.status === 'online' 
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeChat.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {activeChat.topic || `${activeChat.department || 'Staff'} • ${activeChat.position || 'Employee'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestDesktopAlert}
              className="p-2 rounded-xl bg-[#091b35] hover:bg-[#122e54] border border-[#133561] text-blue-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1.5 font-bold"
              title="Test or enable desktop notifications on Windows/Mac (notifies even when minimized)"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {desktopPermStatus === 'granted' ? 'Desktop Alerts Active' : 'Enable Desktop Alerts'}
              </span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-[#091b35] hover:bg-[#122e54] border border-[#133561] text-amber-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1.5 font-bold"
              title="Upload Image (JPG, PNG, WEBP, GIF)"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Send Photo</span>
            </button>

            <button
              onClick={() => setConversationToDelete({
                id: activeChatId,
                name: activeChat.isChannel ? `#${activeChat.name}` : activeChat.name
              })}
              className="p-2 rounded-xl bg-[#091b35] hover:bg-rose-950/50 border border-[#133561] hover:border-rose-500/40 text-rose-400 hover:text-rose-300 transition cursor-pointer text-xs flex items-center gap-1.5 font-bold"
              title="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Delete Conversation</span>
            </button>
          </div>
        </div>

        {/* Chat Messages Scrolling Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#030914]">
          
          {/* Conversation Context Banner */}
          <div className="p-3 bg-[#061426] border border-[#0d284a] rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-blue-400">
              {activeChat.isChannel ? <Hash className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-400" />}
              <span className="text-white">
                {activeChat.isChannel ? `Group Channel: #${activeChat.name}` : `Private Conversation with ${activeChat.name}`}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {activeChat.isChannel
                ? 'All messages in this channel are broadcast across all connected factory terminals.'
                : 'Direct end-to-end isolated messages. Only you and this colleague can view this conversation.'}
            </p>
          </div>

          {/* Messages List */}
          {currentMessages.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-600 opacity-40" />
              <p className="text-slate-400 font-medium">No messages yet in this conversation.</p>
              <p className="text-[10px] text-slate-500 font-mono">
                Type a message or click the photo icon to upload real factory images.
              </p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isSelf = 
                (currentUser?.id && msg.senderId === currentUser.id) ||
                (currentUser?.employeeNo && msg.senderEmployeeNo === currentUser.employeeNo) ||
                (currentUser?.name && msg.senderName === currentUser.name) ||
                msg.isSelf === true;

              return (
                <div 
                  key={msg.id}
                  className={`flex gap-3 group animate-fadeIn ${isSelf ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-md ${
                      isSelf 
                        ? 'bg-amber-500 text-slate-950 font-black' 
                        : msg.senderId === 'ai-copilot'
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                          : 'bg-[#091b35] border border-[#143b6b] text-blue-300'
                    }`}>
                      {msg.senderAvatar || (msg.senderName ? msg.senderName.slice(0, 2).toUpperCase() : 'U')}
                    </div>
                  </div>

                  {/* Bubble Container */}
                  <div className={`max-w-[80%] md:max-w-[70%] space-y-1 ${isSelf ? 'items-end text-right' : ''}`}>
                    
                    {/* Header info */}
                    <div className={`flex items-center gap-2 text-[10px] ${isSelf ? 'justify-end' : ''}`}>
                      <span className="font-bold text-slate-200">{msg.senderName}</span>
                      {msg.senderDepartment && (
                        <span className="text-[9px] text-slate-400 font-mono bg-[#08182b] px-1.5 py-0.2 rounded border border-[#0d2747]">
                          {msg.senderDepartment}
                        </span>
                      )}
                      <span className="text-slate-500 font-mono text-[9px]">{msg.timestamp}</span>
                    </div>

                    {/* Bubble Content with Quick Reaction Floating Toolbar */}
                    <div className="relative group/bubble">
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap ${
                        isSelf 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-tr-xs shadow-lg shadow-blue-950/40' 
                          : 'bg-[#07152b] border border-[#0f2d52] text-slate-200 rounded-tl-xs'
                      }`}>
                        
                        {/* Attached Real Image */}
                        {msg.image && (
                          <div className="mb-2 space-y-1.5">
                            <div 
                              onClick={() => setLightboxImage({
                                url: msg.image?.previewUrl || msg.image?.dataUrl || '',
                                fileName: msg.image?.fileName || 'image.jpg',
                                senderName: msg.senderName,
                                timestamp: msg.timestamp,
                                fileSize: msg.image?.fileSize
                              })}
                              className="relative group/img rounded-xl overflow-hidden border border-white/10 bg-black/40 cursor-pointer max-h-72 flex items-center justify-center"
                            >
                              <img
                                src={msg.image.previewUrl || msg.image.dataUrl}
                                alt={msg.image.fileName}
                                className="max-h-72 w-auto object-contain rounded-xl hover:scale-[1.02] transition-transform duration-200"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <span className="p-2 rounded-full bg-black/70 text-white">
                                  <Maximize2 className="w-4 h-4" />
                                </span>
                                <span className="text-xs font-bold text-white bg-black/70 px-2 py-1 rounded-md font-mono">
                                  Click to View Full Size
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono px-1">
                              <span className="truncate max-w-[200px]">{msg.image.fileName}</span>
                              <div className="flex items-center gap-2">
                                <span>{msg.image.fileSize}</span>
                                <a
                                  href={msg.image.downloadUrl || msg.image.previewUrl}
                                  download={msg.image.fileName}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-amber-300 hover:text-white p-1 rounded hover:bg-white/10"
                                  title="Download Image"
                                >
                                  <Download className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Text Message */}
                        {msg.text && (
                          <p className="font-sans leading-relaxed">{msg.text}</p>
                        )}

                        {/* Attachment Document */}
                        {msg.attachment && (
                          <div className="mt-2 p-2.5 bg-black/30 rounded-xl border border-white/10 flex items-center gap-2.5 text-left">
                            <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white text-[11px] truncate">{msg.attachment.name}</div>
                              <div className="text-[9px] text-slate-400 font-mono">{msg.attachment.size} • Factory Document</div>
                            </div>
                            <button
                              onClick={() => addToast('File Download', `Downloading ${msg.attachment?.name}...`, 'info')}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Floating Quick Reaction Toolbar on Hover */}
                      <div className={`absolute -top-3.5 z-10 hidden group-hover/bubble:flex items-center gap-0.5 bg-[#061426] border border-[#143b6b] rounded-full px-1.5 py-0.5 shadow-xl transition-all ${
                        isSelf ? 'right-2' : 'left-2'
                      }`}>
                        {QUICK_REACTIONS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, em)}
                            className="w-6 h-6 rounded-full hover:bg-[#0f2d52] hover:scale-125 transition-transform flex items-center justify-center text-xs cursor-pointer select-none"
                            title={`React with ${em}`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Emoji Reactions Badges */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex flex-wrap items-center gap-1 pt-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(msg.reactions).map(([em, count]) => {
                          const hasReacted =
                            msg.userReactions?.includes(em) ||
                            (msg as any).reactedUsers?.[em]?.includes(myUserId);
                          return (
                            <button
                              key={em}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, em)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono transition cursor-pointer ${
                                hasReacted
                                  ? 'bg-blue-900/70 border border-blue-400 text-blue-200 shadow-sm'
                                  : 'bg-[#091b35] border border-[#143d70] hover:bg-[#102d54] text-slate-300'
                              }`}
                              title={hasReacted ? `You reacted with ${em}. Click to remove.` : `React with ${em}`}
                            >
                              <span>{em}</span>
                              <span className="text-[10px] font-bold">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Status check on self messages */}
                    {isSelf && (
                      <div className="flex items-center justify-end gap-1 text-[9px] font-mono pr-1 select-none">
                        {msg.status === 'read' || msg.readAt ? (
                          <div 
                            className="flex items-center gap-1 text-cyan-400 font-semibold"
                            title={msg.readAt ? `Seen by recipient at ${new Date(msg.readAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'Seen by recipient'}
                          >
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Seen</span>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1 text-slate-400"
                            title="Sent to server / Unread by recipient"
                          >
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                            <span>Sent</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono animate-pulse pl-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>{typingUser} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* IMAGE PREVIEW BAR (BEFORE SENDING) */}
        {/* ========================================================================= */}
        {selectedImageFile && (
          <div className="p-3 bg-[#061426] border-t border-[#0d2747] flex flex-col gap-2 animate-slideIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <ImageIcon className="w-4 h-4" />
                <span>Image Ready to Send</span>
              </div>
              <button
                onClick={handleCancelImageUpload}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#0b1c33] cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-3">
              <img
                src={selectedImageFile.previewUrl}
                alt="Selected"
                className="w-16 h-16 object-cover rounded-xl border border-amber-500/50 shadow-md"
              />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white truncate max-w-[200px]">{selectedImageFile.fileName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedImageFile.fileSize}</span>
                </div>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Add an optional caption for this photo..."
                  className="w-full px-3 py-1.5 bg-[#030a16] border border-[#102d54] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleCancelImageUpload}
                disabled={isUploadingImage}
                className="px-3 py-1.5 rounded-xl bg-[#091a30] text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendImageUpload}
                disabled={isUploadingImage}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-950/40"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHAT INPUT BAR & EMOJI PICKER POPUP */}
        {/* ========================================================================= */}
        <div className="p-3 bg-[#061224] border-t border-[#0e2440] relative">
          
          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-16 left-3 sm:left-4 w-72 sm:w-80 bg-[#07172e] border border-[#143b6b] rounded-2xl shadow-2xl p-3 z-30 animate-fadeIn space-y-2.5 backdrop-blur-md"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#0f2c52]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Smile className="w-4 h-4" />
                  <span>Insert Emoji</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#0b203d] transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  placeholder="Search emoji (e.g. smile, shoe, check)..."
                  className="w-full pl-8 pr-7 py-1.5 bg-[#030a16] border border-[#102d54] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition"
                />
                {emojiSearch && (
                  <button
                    type="button"
                    onClick={() => setEmojiSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              {!emojiSearch && (
                <div className="flex items-center gap-1 pb-1 overflow-x-auto no-scrollbar border-b border-[#0d2647]">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEmojiCategory(cat.id)}
                      className={`px-2 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        emojiCategory === cat.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-[#0b203d]'
                      }`}
                      title={cat.name}
                    >
                      <span>{cat.icon}</span>
                      <span className="hidden sm:inline text-[10px]">
                        {cat.id === 'popular' ? 'Popular' : cat.id === 'factory' ? 'Factory' : cat.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Emojis Grid */}
              <div className="max-h-48 overflow-y-auto grid grid-cols-7 gap-1 p-1">
                {displayedEmojis.map((emoji, idx) => (
                  <button
                    key={`${emoji}-${idx}`}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-[#0f2d52] hover:scale-125 transition-transform flex items-center justify-center text-lg cursor-pointer select-none"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
                {displayedEmojis.length === 0 && (
                  <div className="col-span-7 py-4 text-center text-slate-400 text-xs">
                    No emojis found
                  </div>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[#091b35] hover:bg-[#122e54] border border-[#133561] text-amber-400 hover:text-amber-300 transition cursor-pointer"
              title="Upload Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                showEmojiPicker
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                  : 'bg-[#091b35] hover:bg-[#122e54] border-[#133561] text-amber-400 hover:text-amber-300'
              }`}
              title="Insert Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAttachmentOpen(true)}
              className="p-2.5 rounded-xl bg-[#091b35] hover:bg-[#122e54] border border-[#133561] text-slate-400 hover:text-white transition cursor-pointer"
              title="Attach Factory Document"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              ref={inputFieldRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activeChat.isChannel ? `#${activeChat.name}` : activeChat.name}...`}
              className="flex-1 px-4 py-2.5 bg-[#030a16] border border-[#102d54] focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none transition shadow-inner"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition cursor-pointer shadow-md shadow-blue-950/40"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-fadeIn"
        >
          {/* Header */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between py-2 text-white border-b border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold truncate max-w-md">{lightboxImage.fileName}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Sent by {lightboxImage.senderName} • {lightboxImage.timestamp} {lightboxImage.fileSize ? `• ${lightboxImage.fileSize}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                download={lightboxImage.fileName}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Image</span>
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Display */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center p-4 max-w-5xl max-h-[80vh]"
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.fileName}
              className="max-w-full max-h-[78vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Footer note */}
          <div className="text-[10px] text-slate-400 font-mono">
            Press ESC or click anywhere outside to close
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW CHANNEL */}
      {/* ========================================================================= */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#07152b] border border-[#133766] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#0f2c52] pb-3">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Create New Discussion Channel</h3>
              </div>
              <button 
                onClick={() => setIsNewChatModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1 uppercase text-[10px] font-mono">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. cutting-line-coordination"
                  className="w-full px-3 py-2 bg-[#030a16] border border-[#102d54] rounded-xl text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 uppercase text-[10px] font-mono">
                  Topic / Purpose
                </label>
                <input
                  type="text"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  placeholder="e.g. Cutting section shifts, blades, and daily output"
                  className="w-full px-3 py-2 bg-[#030a16] border border-[#102d54] rounded-xl text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#0f2c52]">
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#091a30] text-slate-300 hover:text-white cursor-pointer text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white cursor-pointer text-xs font-bold"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FACTORY DOCUMENT ATTACHMENT */}
      {/* ========================================================================= */}
      {isAttachmentOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#07152b] border border-[#133766] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#0f2c52] pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Attach Factory / Audit File</h3>
              </div>
              <button 
                onClick={() => setIsAttachmentOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-400 text-[11px]">Select a factory document to share in this chat:</p>
              
              <button
                onClick={() => {
                  const attachMsg: ChatMessage = {
                    id: 'attach_' + Date.now(),
                    senderId: myUserId,
                    senderEmployeeNo: myEmpNo,
                    senderName: myName,
                    senderRole: currentUser?.role || role,
                    senderDepartment: currentUser?.department || 'Operations',
                    text: 'Attached file: AntiBribery_Policy_Attendance_SignSheet.pdf',
                    timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                    attachment: { name: 'AntiBribery_Policy_Attendance_SignSheet.pdf', type: 'pdf', size: '1.8 MB' }
                  };
                  setMessagesStore(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), attachMsg] }));
                  sendChatMessage(activeChatId, attachMsg);
                  setIsAttachmentOpen(false);
                  addToast('File Shared', 'AntiBribery_Policy_Attendance_SignSheet.pdf attached.', 'success');
                }}
                className="w-full text-left p-2.5 rounded-xl bg-[#030a16] border border-[#102d54] hover:border-blue-500 flex items-center gap-3 transition cursor-pointer"
              >
                <FileText className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-bold text-white">AntiBribery_Policy_Attendance_SignSheet.pdf</div>
                  <div className="text-[10px] text-slate-400 font-mono">1.8 MB • PDF Document</div>
                </div>
              </button>

              <button
                onClick={() => {
                  const attachMsg: ChatMessage = {
                    id: 'attach_' + Date.now(),
                    senderId: myUserId,
                    senderEmployeeNo: myEmpNo,
                    senderName: myName,
                    senderRole: currentUser?.role || role,
                    senderDepartment: currentUser?.department || 'Operations',
                    text: 'Attached file: Leadership_Batch4_Scoresheet_Final.xlsx',
                    timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                    attachment: { name: 'Leadership_Batch4_Scoresheet_Final.xlsx', type: 'sheet', size: '2.4 MB' }
                  };
                  setMessagesStore(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), attachMsg] }));
                  sendChatMessage(activeChatId, attachMsg);
                  setIsAttachmentOpen(false);
                  addToast('File Shared', 'Leadership_Batch4_Scoresheet_Final.xlsx attached.', 'success');
                }}
                className="w-full text-left p-2.5 rounded-xl bg-[#030a16] border border-[#102d54] hover:border-emerald-500 flex items-center gap-3 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-bold text-white">Leadership_Batch4_Scoresheet_Final.xlsx</div>
                  <div className="text-[10px] text-slate-400 font-mono">2.4 MB • Excel Spreadsheet</div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#0f2c52]">
              <button
                onClick={() => setIsAttachmentOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#091a30] text-slate-300 hover:text-white cursor-pointer text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONVERSATION CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {conversationToDelete && (
        <div
          onClick={() => !isDeletingChat && setConversationToDelete(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#07172e] border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl animate-scaleUp"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-white text-base">Delete Conversation</h3>
                <p className="text-xs text-slate-300">
                  Are you sure you want to delete the conversation with{' '}
                  <span className="font-bold text-rose-300">"{conversationToDelete.name}"</span>?
                </p>
                <p className="text-[11px] text-slate-400 pt-1">
                  All messages, images, and attachments in this chat will be cleared from this terminal and the synchronization server. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#0f2c52]">
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                disabled={isDeletingChat}
                className="px-4 py-2 rounded-xl bg-[#091b35] text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteConversation}
                disabled={isDeletingChat}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {isDeletingChat ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default MessageHubView;
