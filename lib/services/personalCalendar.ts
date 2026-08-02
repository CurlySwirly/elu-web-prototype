import { getBackendMode } from '@/lib/backend/mode';
import { supabase } from '@/lib/supabase';

export interface PersonalCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export async function getMyPersonalEvents(): Promise<{
  data: PersonalCalendarEvent[] | null;
  error: any;
}> {
  const backendMode = getBackendMode();
  if (backendMode === 'mock') {
    const { mockPersonalCalendarEvents } = await import('@/lib/backend/mock/data');
    return {
      data: mockPersonalCalendarEvents
        .slice()
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
      error: null,
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const { data, error } = await supabase
    .from('personal_calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .order('start_time', { ascending: true });

  return { data, error };
}

export async function createPersonalEvent(input: {
  title: string;
  notes?: string;
  start_time: string;
  end_time: string;
}): Promise<{ data: PersonalCalendarEvent | null; error: any }> {
  const backendMode = getBackendMode();
  if (backendMode === 'mock') {
    const { mockPersonalCalendarEvents } = await import('@/lib/backend/mock/data');
    const event: PersonalCalendarEvent = {
      id: `personal-${Date.now()}`,
      user_id: 'any',
      title: input.title,
      notes: input.notes || '',
      start_time: input.start_time,
      end_time: input.end_time,
      created_at: new Date().toISOString(),
    };
    mockPersonalCalendarEvents.push(event);
    return { data: event, error: null };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const { data, error } = await supabase
    .from('personal_calendar_events')
    .insert({
      user_id: user.id,
      title: input.title,
      notes: input.notes || '',
      start_time: input.start_time,
      end_time: input.end_time,
    })
    .select()
    .single();

  return { data, error };
}

export async function deletePersonalEvent(
  eventId: string
): Promise<{ success: boolean; error?: any }> {
  const backendMode = getBackendMode();
  if (backendMode === 'mock') {
    const { mockPersonalCalendarEvents } = await import('@/lib/backend/mock/data');
    const index = mockPersonalCalendarEvents.findIndex((e) => e.id === eventId);
    if (index >= 0) mockPersonalCalendarEvents.splice(index, 1);
    return { success: true };
  }

  const { error } = await supabase
    .from('personal_calendar_events')
    .delete()
    .eq('id', eventId);

  return { success: !error, error };
}
