import { useState } from 'react';
import { Bell, Check, Trash2, Train, Building2, MessageSquare, Filter, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const notificationIcons = {
  onboard_control: Train,
  station_control: Building2,
  team_note: MessageSquare,
};

const notificationColors = {
  onboard_control: 'text-blue-500',
  station_control: 'text-green-500',
  team_note: 'text-purple-500',
};

const notificationLabels = {
  onboard_control: 'Contrôle à bord',
  station_control: 'Contrôle en gare',
  team_note: 'Message',
};

type NotificationType = 'onboard_control' | 'station_control' | 'team_note';

function NotificationItem({ 
  notification, 
  onMarkRead,
  showFullDate = false,
}: { 
  notification: any; 
  onMarkRead: () => void;
  showFullDate?: boolean;
}) {
  const Icon = notificationIcons[notification.type as NotificationType];
  const colorClass = notificationColors[notification.type as NotificationType];
  
  return (
    <button
      onClick={onMarkRead}
      className={cn(
        "w-full p-3 text-left hover:bg-muted/50 transition-colors",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        <div className={cn("mt-0.5", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {notification.title}
            </span>
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {showFullDate 
              ? format(notification.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr })
              : formatDistanceToNow(notification.createdAt, {
                  addSuffix: true,
                  locale: fr,
                })
            }
          </p>
        </div>
      </div>
    </button>
  );
}

function NotificationHistory() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications();
  
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationType>('all');
  
  const filteredNotifications = activeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeFilter);

  const filterCounts = {
    all: notifications.length,
    onboard_control: notifications.filter(n => n.type === 'onboard_control').length,
    station_control: notifications.filter(n => n.type === 'station_control').length,
    team_note: notifications.filter(n => n.type === 'team_note').length,
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <History className="h-3 w-3" />
          Historique
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des notifications
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="h-8"
            >
              Tout ({filterCounts.all})
            </Button>
            <Button
              variant={activeFilter === 'onboard_control' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('onboard_control')}
              className="h-8 gap-1"
            >
              <Train className="h-3 w-3" />
              Bord ({filterCounts.onboard_control})
            </Button>
            <Button
              variant={activeFilter === 'station_control' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('station_control')}
              className="h-8 gap-1"
            >
              <Building2 className="h-3 w-3" />
              Gare ({filterCounts.station_control})
            </Button>
            <Button
              variant={activeFilter === 'team_note' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('team_note')}
              className="h-8 gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              Messages ({filterCounts.team_note})
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              className="flex-1"
              disabled={notifications.length === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              Tout marquer comme lu
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearNotifications}
              className="text-destructive hover:text-destructive"
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">Aucune notification</p>
                <p className="text-sm">
                  {activeFilter !== 'all' 
                    ? `Aucune notification de type "${notificationLabels[activeFilter]}"`
                    : 'Vous n\'avez pas encore de notifications'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y border rounded-lg">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={() => markAsRead(notification.id)}
                    showFullDate
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useRealtimeNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-1">
            <NotificationHistory />
            {notifications.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Tout lire
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearNotifications}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => markAsRead(notification.id)}
                />
              ))}
              {notifications.length > 10 && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  +{notifications.length - 10} autres notifications
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
