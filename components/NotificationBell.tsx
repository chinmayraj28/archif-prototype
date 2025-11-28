/*
 * Shows an inline notifications dropdown that fetches recent activity and
 * keeps the badge count in sync without forcing a full page navigation.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  _id: string;
  type: "message" | "offer" | "offer_response";
  read: boolean;
  createdAt: string;
  actorId?: {
    username?: string;
    photo?: string;
  };
};

const POLL_INTERVAL_MS = 30_000;
const VISIBLE_COUNT = 6;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch notifications");

      const data = (await res.json()) as NotificationItem[];
      setNotifications(data);
    } catch (error) {
      console.error("[NotificationBell] Failed to load notifications", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markNotificationsAsRead = useCallback(async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, read: true }),
      });

      setNotifications((prev) =>
        prev.map((notification) =>
          ids.includes(notification._id) ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error("[NotificationBell] Failed to mark read", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) return;

    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification._id);

    if (unreadIds.length > 0) {
      void markNotificationsAsRead(unreadIds);
    }
  };

  const visibleNotifications = notifications.slice(0, VISIBLE_COUNT);
  const badge =
    !isLoading && unreadCount > 0 ? (
      <span className="absolute -right-1.5 -top-1 rounded-full bg-[#111] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    ) : null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#ededed] bg-white/80 text-[#111] shadow-[0_12px_28px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.07)] focus:outline-none"
        >
          <Bell className="h-4 w-4" />
          {badge}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[320px] border-[#ededed] p-0"
        sideOffset={12}
      >
        <DropdownMenuLabel className="flex items-center justify-between border-b border-[#f3f3f3] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#777]">
          Notifications
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#111]/10 px-2 py-0.5 text-[10px] font-semibold text-[#111]">
              {unreadCount} new
            </span>
          )}
        </DropdownMenuLabel>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center px-4 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : visibleNotifications.length > 0 ? (
            <ul className="divide-y divide-[#f3f3f3]">
              {visibleNotifications.map((notification) => (
                <li key={notification._id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.actorId?.photo} />
                      <AvatarFallback>
                        {initialsFromName(notification.actorId?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111]">
                        {describeNotification(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#111]" aria-hidden />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          )}
        </div>
        <DropdownMenuSeparator className="border-[#f3f3f3]" />
        <div className="px-3 py-2">
          <Link
            href="/notifications"
            className="block rounded-md border border-[#ededed] px-4 py-2 text-center text-sm font-medium text-[#111] transition hover:border-[#111] hover:bg-[#111] hover:text-white"
          >
            View all activity
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function describeNotification(notification: NotificationItem) {
  const username = notification.actorId?.username || "Someone";
  switch (notification.type) {
    case "message":
      return `${username} sent you a message`;
    case "offer":
      return `${username} sent you an offer`;
    case "offer_response":
      return `${username} responded to your offer`;
    default:
      return "You have a new notification";
  }
}

function initialsFromName(name?: string) {
  if (!name) return "U";
  return name.slice(0, 2).toUpperCase();
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

