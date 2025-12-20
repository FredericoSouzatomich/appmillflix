import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { contentApi, Content } from "@/services/baserow";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  contentId: number;
  contentName: string;
  message: string;
  date: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = "streamtv_notifications";
const LAST_CHECK_KEY = "streamtv_last_notification_check";

const NotificationBell = ({ userEmail }: { userEmail: string }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    checkForNewEpisodes();
  }, [userEmail]);

  const loadNotifications = () => {
    const stored = localStorage.getItem(`${NOTIFICATIONS_KEY}_${userEmail}`);
    if (stored) {
      const parsed: Notification[] = JSON.parse(stored);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n) => !n.read).length);
    }
  };

  const checkForNewEpisodes = async () => {
    try {
      // Get series from user's history
      const history = await contentApi.getHistory(userEmail);
      const seriesInHistory = history.filter((c) => c.Tipo === "Serie");

      if (seriesInHistory.length === 0) return;

      const lastCheck = localStorage.getItem(`${LAST_CHECK_KEY}_${userEmail}`);
      const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);
      const now = new Date();

      // Check for series with recent edits (new episodes)
      const newNotifications: Notification[] = [];

      for (const series of seriesInHistory) {
        if (series.Edição) {
          const editDate = new Date(series.Edição);
          if (editDate > lastCheckDate) {
            const existingNotification = notifications.find(
              (n) => n.contentId === series.id && n.date === series.Edição
            );

            if (!existingNotification) {
              newNotifications.push({
                id: `${series.id}-${series.Edição}`,
                contentId: series.id,
                contentName: series.Nome,
                message: `Novo episódio disponível de "${series.Nome}"`,
                date: series.Edição,
                read: false,
              });
            }
          }
        }
      }

      if (newNotifications.length > 0) {
        const updatedNotifications = [...newNotifications, ...notifications].slice(0, 20);
        setNotifications(updatedNotifications);
        setUnreadCount(updatedNotifications.filter((n) => !n.read).length);
        localStorage.setItem(
          `${NOTIFICATIONS_KEY}_${userEmail}`,
          JSON.stringify(updatedNotifications)
        );
      }

      localStorage.setItem(`${LAST_CHECK_KEY}_${userEmail}`, now.toISOString());
    } catch (error) {
      console.error("Error checking for new episodes:", error);
    }
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    localStorage.setItem(`${NOTIFICATIONS_KEY}_${userEmail}`, JSON.stringify(updated));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    const updated = notifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    setUnreadCount(updated.filter((n) => !n.read).length);
    localStorage.setItem(`${NOTIFICATIONS_KEY}_${userEmail}`, JSON.stringify(updated));

    // Navigate to content
    navigate(`/content/${notification.contentId}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    if (days < 7) return `Há ${days} dias`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="lg" className="tv-focus relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
              <p className="text-xs mt-1">
                Assista séries para receber alertas de novos episódios
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {!notification.read && (
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <div className={!notification.read ? "" : "ml-5"}>
                    <p className="text-sm text-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(notification.date)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
