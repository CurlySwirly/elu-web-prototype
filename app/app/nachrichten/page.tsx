'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { chatService, type ChatMessage } from '@/lib/services/chat';

type ThreadListItem = {
  id: string;
  partnerName: string;
  partnerAvatar: string;
  offerTitle: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

function isMockMode() {
  return (process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase') === 'mock';
}

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de });
  } catch {
    return '';
  }
}

function groupMessagesByDay(messages: ChatMessage[]) {
  const groups: { key: string; label: string; items: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const date = parseISO(msg.created_at);
    const key = format(date, 'yyyy-MM-dd');
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.items.push(msg);
    } else {
      groups.push({
        key,
        label: format(date, 'EEEE, d. MMMM', { locale: de }),
        items: [msg],
      });
    }
  }
  return groups;
}

export default function NachrichtenPage() {
  const { userId, role } = useAuth();
  const searchParams = useSearchParams();
  const threadParam = searchParams.get('thread');
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [didPreselect, setDidPreselect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadGenerationRef = useRef(0);

  const isExpert = role === 'expert';
  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );
  const messageGroups = useMemo(() => groupMessagesByDay(messages), [messages]);

  const openThread = useCallback(
    async (threadId: string) => {
      const generation = ++loadGenerationRef.current;
      setActiveThreadId(threadId);
      setMessages([]);
      setLoadingMessages(true);
      setDraft('');
      try {
        if (isMockMode()) {
          const { mockChatMessagesByThread, mockChatThreads } = await import(
            '@/lib/backend/mock/data'
          );
          if (generation !== loadGenerationRef.current) return;
          setMessages([...(mockChatMessagesByThread[threadId] || [])] as ChatMessage[]);
          const thread = mockChatThreads.find((t) => t.id === threadId);
          if (thread) thread.unread_count = 0;
          setThreads((prev) =>
            prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
          );
          return;
        }

        const data = await chatService.getThreadMessages(threadId);
        if (generation !== loadGenerationRef.current) return;
        setMessages(data || []);
        if (userId) {
          await chatService.markMessagesAsRead(threadId, userId);
        }
      } catch (err) {
        console.error('Failed to load messages', err);
        if (generation !== loadGenerationRef.current) return;
        setMessages([]);
      } finally {
        if (generation === loadGenerationRef.current) {
          setLoadingMessages(false);
        }
      }
    },
    [userId]
  );

  const loadThreads = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (isMockMode()) {
        const { mockChatThreads, mockChatMessagesByThread } = await import(
          '@/lib/backend/mock/data'
        );
        setThreads(
          mockChatThreads.map((t) => {
            const msgs = mockChatMessagesByThread[t.id] || [];
            const last = msgs[msgs.length - 1];
            return {
              id: t.id,
              partnerName: t.partner.full_name,
              partnerAvatar: t.partner.avatar_url,
              offerTitle: t.offer_title,
              lastMessage: last?.message || t.last_message || '',
              updatedAt: last?.created_at || t.updated_at,
              unreadCount: t.unread_count,
            };
          })
        );
        return;
      }

      const data = await chatService.getThreadsByUser(userId, isExpert);

      setThreads(
        (data || []).map((thread: any) => {
          const partner = isExpert
            ? thread.client_profile
            : thread.expert_profile || thread.client_profile;
          const offerTitle = thread.appointments?.expert_offers?.title || 'Termin';
          return {
            id: thread.id,
            partnerName: partner?.full_name || (isExpert ? 'Kund:in' : 'Expert:in'),
            partnerAvatar: partner?.avatar_url || '',
            offerTitle,
            lastMessage: '',
            updatedAt: thread.updated_at,
            unreadCount: 0,
          };
        })
      );
    } catch (err) {
      console.error('Failed to load chat threads', err);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isExpert]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (didPreselect || loading || threads.length === 0) return;

    const fromQuery =
      threadParam && threads.some((t) => t.id === threadParam) ? threadParam : null;
    const desktopDefault =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
        ? threads[0].id
        : null;
    const target = fromQuery || desktopDefault;

    if (target) {
      setDidPreselect(true);
      void openThread(target);
    }
  }, [didPreselect, loading, threads, openThread, threadParam]);

  useEffect(() => {
    if (!threadParam || loading || threads.length === 0) return;
    if (activeThreadId === threadParam) return;
    if (!threads.some((t) => t.id === threadParam)) return;
    void openThread(threadParam);
  }, [threadParam, loading, threads, activeThreadId, openThread]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeThreadId || !userId || sending) return;

    setSending(true);
    try {
      if (isMockMode()) {
        const { mockChatMessagesByThread, mockChatThreads } = await import(
          '@/lib/backend/mock/data'
        );
        const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          thread_id: activeThreadId,
          sender_id: userId,
          message: text,
          is_read: true,
          created_at: new Date().toISOString(),
          sender: { full_name: 'Du' },
        };
        if (!mockChatMessagesByThread[activeThreadId]) {
          mockChatMessagesByThread[activeThreadId] = [];
        }
        mockChatMessagesByThread[activeThreadId].push(msg as any);
        const thread = mockChatThreads.find((t) => t.id === activeThreadId);
        if (thread) {
          thread.last_message = text;
          thread.updated_at = msg.created_at;
        }
        setMessages((prev) => [...prev, msg]);
        setThreads((prev) =>
          prev
            .map((t) =>
              t.id === activeThreadId
                ? { ...t, lastMessage: text, updatedAt: msg.created_at }
                : t
            )
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
        );
        setDraft('');
        return;
      }

      const sent = await chatService.sendMessage(activeThreadId, userId, text);
      setMessages((prev) => [...prev, sent as ChatMessage]);
      setDraft('');
      setThreads((prev) =>
        prev
          .map((t) =>
            t.id === activeThreadId
              ? { ...t, lastMessage: text, updatedAt: sent.created_at }
              : t
          )
          .sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
      );
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const isMine = (msg: ChatMessage) =>
    msg.sender_id === userId || msg.sender_id === 'client' || msg.sender?.full_name === 'Du';

  return (
    <div className="p-3 sm:p-4 lg:p-5 h-[calc(100vh-4rem)] flex flex-col space-y-4">
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
          Nachrichten
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
          {isExpert
            ? 'Hier siehst du deine Nachrichten von Kund:innen'
            : 'Hier siehst du deine Nachrichten von Expert:innen'}
        </p>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr]">
        {/* Chat list – left */}
        <div
          className={cn(
            'flex flex-col min-h-0 overflow-hidden md:border-r md:border-gray-100',
            activeThreadId ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 font-body">
                Wird geladen…
              </p>
            ) : threads.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-heading font-semibold text-text-dark mb-1">
                  Noch keine Nachrichten
                </p>
                <p className="text-sm text-gray-500 font-body">
                  Sobald du einen Termin hast, kannst du hier schreiben.
                </p>
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => openThread(thread.id)}
                  className={cn(
                    'w-full text-left px-3.5 py-3.5 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0',
                    activeThreadId === thread.id
                      ? 'bg-info-bg/60'
                      : 'bg-white hover:bg-gray-50'
                  )}
                >
                  <Avatar className="w-11 h-11 shrink-0">
                    {thread.partnerAvatar ? (
                      <AvatarImage src={thread.partnerAvatar} alt={thread.partnerName} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-primary-blue to-primary-green text-white text-xs font-heading">
                      {initials(thread.partnerName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-heading font-semibold text-text-dark truncate">
                        {thread.partnerName}
                      </p>
                      <p className="text-[11px] text-gray-400 font-body whitespace-nowrap shrink-0">
                        {relativeTime(thread.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-sm text-gray-500 font-body truncate">
                        {thread.lastMessage || thread.offerTitle || 'Keine Nachrichten'}
                      </p>
                      {thread.unreadCount > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary-blue text-white text-[11px] font-semibold flex items-center justify-center">
                          {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation – right */}
        <div
          className={cn(
            'flex flex-col min-h-0 overflow-hidden',
            !activeThreadId ? 'hidden md:flex' : 'flex'
          )}
        >
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-body text-gray-500">Wähle links einen Chat aus</p>
              </div>
            </div>
          ) : (
            <>
              <div
                key={activeThread.id}
                className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 flex flex-col min-h-0"
              >
                <div className="md:hidden shrink-0 mb-3 -ml-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setActiveThreadId(null)}
                    aria-label="Zurück zur Übersicht"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>

                {loadingMessages ? (
                  <p className="text-center text-sm text-gray-500 font-body py-10">
                    Nachrichten werden geladen…
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 font-body py-10">
                    Noch keine Nachrichten in diesem Chat.
                  </p>
                ) : (
                  <div className="space-y-5 flex-1">
                    {messageGroups.map((group) => (
                      <div key={group.key} className="space-y-3">
                        <p className="text-center text-xs text-gray-400 font-body py-1">
                          {group.label}
                        </p>
                        {group.items.map((msg) => {
                          const mine = isMine(msg);
                          return (
                            <div
                              key={msg.id}
                              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5',
                                  mine
                                    ? 'bg-primary-blue text-white'
                                    : 'bg-bg-light text-text-dark'
                                )}
                              >
                                <p className="font-body text-sm whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.message}
                                </p>
                                <p
                                  className={cn(
                                    'text-[11px] mt-1.5 font-body',
                                    mine ? 'text-white/70' : 'text-gray-400'
                                  )}
                                >
                                  {format(parseISO(msg.created_at), 'HH:mm', { locale: de })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                className="shrink-0 border-t border-gray-100 px-3 sm:px-4 py-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Nachricht schreiben..."
                    className="font-body rounded-xl bg-bg-light/60 border-gray-200 h-11"
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="h-11 w-11 rounded-xl shrink-0 p-0 bg-gradient-to-br from-primary-blue to-primary-green text-white hover:opacity-90"
                    aria-label="Senden"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
