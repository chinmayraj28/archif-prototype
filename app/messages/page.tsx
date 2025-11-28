"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Conversation = {
    partner: {
        _id: string;
        username: string;
        photo?: string;
        lastActiveAt?: string;
    };
    lastMessage: {
        createdAt: string;
        content: string;
        listingId?: { title: string };
    };
};

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [partner, setPartner] = useState<any | null>(null);
    const [currentUserId, setCurrentUserId] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [handlingAction, setHandlingAction] = useState(false);
    const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
    const [counterAmount, setCounterAmount] = useState("");
    const [counterListingPrice, setCounterListingPrice] = useState(0);
    const bottomRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchConversations() {
            try {
                const res = await fetch("/api/messages");
                if (res.ok) {
                    const data = (await res.json()) as Conversation[];
                    const normalized = data.map((conv) => ({
                        ...conv,
                        partner: {
                            ...conv.partner,
                            _id: normalizeId(conv.partner._id),
                        },
                    }));
                    setConversations(normalized);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingConversations(false);
            }
        }
        fetchConversations();
    }, []);

    useEffect(() => {
        if (!selectedPartnerId) {
            setMessages([]);
            setPartner(null);
            return;
        }

        const normalizedId = normalizeId(selectedPartnerId);
        if (!normalizedId) return;

        setLoadingMessages(true);
        setMessages([]);
        setPartner(null);

        async function fetchConversation(partnerId: string) {
            try {
                const res = await fetch(`/api/messages/${partnerId}`);
                if (res.ok) {
                    const data = await res.json();
                    setPartner(data.partner);
                    setMessages(data.messages);
                    setCurrentUserId(data.currentUserId || "");
                    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingMessages(false);
            }
        }

        fetchConversation(normalizedId);
    }, [selectedPartnerId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    function computeStatusText(lastActiveAt?: string) {
        if (!lastActiveAt) return "Offline";
        const lastActive = new Date(lastActiveAt);
        const diff = Date.now() - lastActive.getTime();
        if (diff < 5 * 60 * 1000) {
            return "Online now";
        }
        return `Last online ${lastActive.toLocaleDateString()} ${lastActive.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        })}`;
    }

    async function handleOfferAction(offerId: string, action: "accept" | "decline" | "counter", amount?: number) {
        setHandlingAction(true);
        try {
            const body: Record<string, unknown> = { action };
            if (action === "counter" && typeof amount === "number") {
                body.amount = amount;
            }

            const res = await fetch(`/api/offers/${offerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to update offer");
            }

            toast.success(`Offer ${action}ed successfully`);
            setCounteringOfferId(null);
            setCounterAmount("");
            setCounterListingPrice(0);
            if (selectedPartnerId) {
                const normalizedId = normalizeId(selectedPartnerId);
                if (normalizedId) {
                    const detailRes = await fetch(`/api/messages/${normalizedId}`);
                if (detailRes.ok) {
                    const data = await detailRes.json();
                    setMessages(data.messages);
                    setPartner(data.partner);
                }
                }
            }
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to update offer");
        } finally {
            setHandlingAction(false);
        }
    }

    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || !selectedPartnerId) return;
        const normalizedId = normalizeId(selectedPartnerId);
        if (!normalizedId) return;

        setSending(true);
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId: normalizedId,
                    content: newMessage,
                }),
            });

            if (!res.ok) throw new Error("Failed to send");

            const msg = await res.json();
            setMessages((prev) => [...prev, msg]);
            setNewMessage("");
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    }

    const selectedConversation = useMemo(
        () => conversations.find((conv) => conv.partner._id === selectedPartnerId),
        [conversations, selectedPartnerId]
    );

    return (
        <div className="mx-auto flex h-[calc(100vh-120px)] max-w-6xl gap-6 py-8">
            <section className="flex w-full max-w-xs flex-col rounded-2xl border border-[#ededed] bg-white">
                <div className="border-b border-[#ededed] px-4 py-4">
                    <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#666]">
                        Direct Messages
                    </h1>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingConversations ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No messages yet.
                        </p>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.partner._id}
                                type="button"
                                onClick={() => setSelectedPartnerId(conv.partner._id)}
                                className={cn(
                                    "flex w-full items-start gap-3 border-b border-[#f5f5f5] px-4 py-4 text-left transition hover:bg-[#fafafa]",
                                    selectedPartnerId === conv.partner._id ? "bg-[#f3f3f3]" : ""
                                )}
                            >
                                <Avatar className="h-11 w-11">
                                    <AvatarImage src={conv.partner.photo} />
                                    <AvatarFallback>
                                        {conv.partner.username?.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-[#111]">
                                            {conv.partner.username}
                                        </p>
                                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        {computeStatusText(conv.partner.lastActiveAt)}
                                    </p>
                                    <p className="truncate text-sm text-muted-foreground">
                                        {conv.lastMessage.content}
                                    </p>
                                    {conv.lastMessage.listingId && (
                                        <p className="text-[11px] text-primary mt-1">
                                            Re: {conv.lastMessage.listingId.title}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </section>

            <section className="flex flex-1 flex-col rounded-2xl border border-[#ededed] bg-white">
                {!selectedPartnerId ? (
                    <div className="flex flex-1 items-center justify-center text-muted-foreground">
                        Select a conversation to get started.
                    </div>
                ) : loadingMessages ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 border-b border-[#ededed] px-6 py-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={partner?.photo} />
                                <AvatarFallback>
                                    {partner?.username?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-lg font-semibold">{partner?.username}</p>
                                <p className="text-sm text-muted-foreground">
                                    {computeStatusText(partner?.lastActiveAt)}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-6">
                            {messages.length === 0 ? (
                                <p className="text-center text-muted-foreground">
                                    Start the conversation!
                                </p>
                            ) : (
                                messages.map((msg) => {
                                    const senderId = normalizeId(msg.senderId?._id ?? msg.senderId);
                                    const isMe = senderId !== selectedPartnerId;
                                    const offer = msg.offerId;
                                    const offerSellerId = offer?.sellerId?._id || offer?.sellerId;
                                    const isSellerForOffer =
                                        offer && currentUserId && offerSellerId?.toString() === currentUserId;
                                    const awaitingSeller =
                                        offer &&
                                        isSellerForOffer &&
                                        offer.status === "pending" &&
                                        offer.lastActionBy === "buyer";
                                    const listingPrice = msg.listingId?.price || 0;

                                    return (
                                        <div key={msg._id} className="space-y-2">
                                            <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                                                <div
                                                    className={cn(
                                                        "max-w-[70%] rounded-2xl p-4 text-sm shadow-sm",
                                                        isMe
                                                            ? "bg-[#111] text-white"
                                                            : "bg-white border border-[#ededed]",
                                                        msg.type === "offer" ? "ring-2 ring-primary/40" : ""
                                                    )}
                                                >
                                                    <p>{msg.content}</p>
                                                    {offer?.amount && (
                                                        <p className="mt-1 text-xs opacity-80">
                                                            Offer amount: ${offer.amount.toFixed(2)}
                                                        </p>
                                                    )}
                                                    {offer?.status && (
                                                        <p className="text-xs opacity-80 capitalize">
                                                            Status: {offer.status}
                                                        </p>
                                                    )}
                                                    <span className="mt-1 block text-right text-[10px] opacity-70">
                                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            {awaitingSeller && offer && (
                                                <div className="ml-4 flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOfferAction(offer._id, "accept")}
                                                        disabled={handlingAction}
                                                    >
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOfferAction(offer._id, "decline")}
                                                        disabled={handlingAction}
                                                    >
                                                        Decline
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            setCounterAmount(offer.amount.toFixed(2));
                                                            setCounterListingPrice(listingPrice);
                                                            setCounteringOfferId(offer._id);
                                                        }}
                                                        disabled={handlingAction}
                                                    >
                                                        Counter
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={bottomRef} />
                        </div>

                        <form
                            onSubmit={sendMessage}
                            className="flex items-center gap-2 border-t border-[#ededed] px-6 py-4"
                        >
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                disabled={sending}
                            />
                            <Button type="submit" size="icon" disabled={sending}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </>
                )}
            </section>

            <Dialog
                open={!!counteringOfferId}
                onOpenChange={(open) => {
                    if (!open) {
                        setCounteringOfferId(null);
                        setCounterAmount("");
                        setCounterListingPrice(0);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Counter Offer</DialogTitle>
                        <DialogDescription>
                            {counterListingPrice > 0 && (
                                <>
                                    Enter a price between ${(counterListingPrice * 0.8).toFixed(2)} and $
                                    {counterListingPrice.toFixed(2)}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        type="number"
                        step="0.01"
                        value={counterAmount}
                        min={counterListingPrice * 0.8}
                        max={counterListingPrice}
                        onChange={(e) => setCounterAmount(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCounteringOfferId(null);
                                setCounterAmount("");
                                setCounterListingPrice(0);
                            }}
                            disabled={handlingAction}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                const value = Number(counterAmount);
                                const minAmount = counterListingPrice * 0.8;
                                if (value < minAmount || value > counterListingPrice) {
                                    toast.error(
                                        `Counter must be between $${minAmount.toFixed(2)} and $${counterListingPrice.toFixed(
                                            2
                                        )}`
                                    );
                                    return;
                                }
                                if (counteringOfferId) {
                                    handleOfferAction(counteringOfferId, "counter", value);
                                }
                            }}
                            disabled={handlingAction}
                        >
                            {handlingAction ? "Sending..." : "Send Counter"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function normalizeId(value: unknown): string {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown> & {
            _id?: unknown;
            id?: unknown;
            toHexString?: () => string;
        };
        if (typeof obj.toHexString === "function") {
            return obj.toHexString();
        }
        if (obj._id) {
            return normalizeId(obj._id);
        }
        if (obj.id) {
            return normalizeId(obj.id);
        }
    }
    return String(value);
}
