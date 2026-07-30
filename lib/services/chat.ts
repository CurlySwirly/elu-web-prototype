import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface ChatThread {
  id: string;
  appointment_id: string;
  client_id: string;
  expert_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
}

const expertProfileCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export const chatService = {
  async getOrCreateThread(appointmentId: string, clientId: string, expertId: string) {
    const { data: existing } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await supabase
      .from('chat_threads')
      .insert({
        appointment_id: appointmentId,
        client_id: clientId,
        expert_id: expertId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCachedExpertId(userId: string): Promise<string | null> {
    const cached = expertProfileCache.get(userId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.id;
    }

    try {
      const { data: expertProfile } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (expertProfile) {
        expertProfileCache.set(userId, { id: expertProfile.id, timestamp: now });
        return expertProfile.id;
      }
    } catch (error) {
      logger.error('Failed to fetch expert profile', error, { userId });
    }

    return null;
  },

  async getThreadsByUser(userId: string, isExpert: boolean = false) {
    try {
      let expertId: string | null = null;

      if (isExpert) {
        expertId = await this.getCachedExpertId(userId);
        if (!expertId) return [];
      }

      const { data, error } = await supabase
        .from('chat_threads')
        .select(`
          *,
          appointments:appointment_id (
            start_time,
            status,
            expert_offers:offer_id (
              title
            )
          ),
          client_profile:client_id (
            full_name,
            avatar_url
          ),
          expert_profiles:expert_id (
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq(isExpert ? 'expert_id' : 'client_id', isExpert ? expertId : userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((thread: any) => {
        const expertProfiles = Array.isArray(thread.expert_profiles)
          ? thread.expert_profiles[0]
          : thread.expert_profiles;
        const expertProfile = Array.isArray(expertProfiles?.profiles)
          ? expertProfiles?.profiles[0]
          : expertProfiles?.profiles;

        return {
          ...thread,
          expert_profile: expertProfile || null,
        };
      });
    } catch (error) {
      logger.error('Failed to get threads by user', error, { userId, isExpert });
      throw error;
    }
  },

  async getThreadMessages(threadId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:sender_id (
          full_name,
          avatar_url
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  },

  async sendMessage(threadId: string, senderId: string, message: string) {
    try {
      const now = new Date().toISOString();

      const [messageResult] = await Promise.all([
        supabase
          .from('chat_messages')
          .insert({
            thread_id: threadId,
            sender_id: senderId,
            message,
          })
          .select(`
            *,
            sender:sender_id (
              full_name,
              avatar_url
            )
          `)
          .single(),
        supabase
          .from('chat_threads')
          .update({ updated_at: now })
          .eq('id', threadId),
      ]);

      if (messageResult.error) throw messageResult.error;
      return messageResult.data;
    } catch (error) {
      logger.error('Failed to send message', error, { threadId, senderId });
      throw error;
    }
  },

  async markMessagesAsRead(threadId: string, userId: string) {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('thread_id', threadId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  async getUnreadCount(userId: string, isExpert: boolean = false) {
    try {
      let filter = `client_id.eq.${userId}`;

      if (isExpert) {
        const expertId = await this.getCachedExpertId(userId);
        if (!expertId) return 0;
        filter = `expert_id.eq.${expertId}`;
      }

      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id')
        .or(filter);

      if (!threads || threads.length === 0) return 0;

      const threadIds = threads.map(t => t.id);

      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .in('thread_id', threadIds)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      logger.error('Failed to get unread count', error, { userId, isExpert });
      return 0;
    }
  },

  subscribeToThread(threadId: string, callback: (message: ChatMessage) => void) {
    const subscription = supabase
      .channel(`chat:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:sender_id (
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) callback(data as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};
