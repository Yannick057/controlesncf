import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeNotification {
  id: string;
  type: 'onboard_control' | 'station_control' | 'team_note';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  data?: any;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [enabled, setEnabled] = useState(true);

  // Check notification settings
  useEffect(() => {
    if (!user?.id) return;

    const checkSettings = async () => {
      const { data } = await supabase
        .from('notification_settings')
        .select('notifications_enabled')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setEnabled(data.notifications_enabled);
      }
    };

    checkSettings();
  }, [user?.id]);

  // Get user role from auth user
  const userRole = user?.role;

  useEffect(() => {
    if (!user?.id || !enabled) return;

    const channels: RealtimeChannel[] = [];

    // For managers/admins - listen to new controls
    if (userRole === 'manager' || userRole === 'admin') {
      // Listen to onboard controls
      const onboardChannel = supabase
        .channel('onboard-controls-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'onboard_controls',
          },
          async (payload) => {
            const newControl = payload.new as any;
            
            // Fetch user profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newControl.user_id)
              .single();

            const notification: RealtimeNotification = {
              id: newControl.id,
              type: 'onboard_control',
              title: 'Nouveau contrôle à bord',
              message: `${profile?.full_name || 'Un agent'} a créé un contrôle sur le train ${newControl.train_number}`,
              createdAt: new Date(),
              read: false,
              data: newControl,
            };

            setNotifications(prev => [notification, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + 1);

            // Show toast notification
            toast.info(notification.title, {
              description: notification.message,
            });

            // Play notification sound if available
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}
          }
        )
        .subscribe();

      channels.push(onboardChannel);

      // Listen to station controls
      const stationChannel = supabase
        .channel('station-controls-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'station_controls',
          },
          async (payload) => {
            const newControl = payload.new as any;
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newControl.user_id)
              .single();

            const notification: RealtimeNotification = {
              id: newControl.id,
              type: 'station_control',
              title: 'Nouveau contrôle en gare',
              message: `${profile?.full_name || 'Un agent'} a créé un contrôle en gare de ${newControl.station_name}`,
              createdAt: new Date(),
              read: false,
              data: newControl,
            };

            setNotifications(prev => [notification, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + 1);

            toast.info(notification.title, {
              description: notification.message,
            });

            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {}
          }
        )
        .subscribe();

      channels.push(stationChannel);
    }

    // All users - listen to team notes addressed to them
    const notesChannel = supabase
      .channel('team-notes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_notes',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNote = payload.new as any;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newNote.author_id)
            .single();

          const notification: RealtimeNotification = {
            id: newNote.id,
            type: 'team_note',
            title: 'Nouveau message',
            message: `${profile?.full_name || 'Un collègue'} vous a envoyé un message`,
            createdAt: new Date(),
            read: false,
            data: newNote,
          };

          setNotifications(prev => [notification, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);

          toast.info(notification.title, {
            description: notification.message,
          });

          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .subscribe();

    channels.push(notesChannel);

    console.log('[Realtime] Subscribed to notification channels');

    return () => {
      console.log('[Realtime] Cleaning up notification channels');
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user?.id, user?.role, userRole, enabled]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    enabled,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
