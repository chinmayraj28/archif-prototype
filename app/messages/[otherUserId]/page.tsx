"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function ChatPage({
    params,
}: {
    params: Promise<{ otherUserId: string }>;
}) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const listingId = searchParams.get("listingId");
    const [otherUserId, setOtherUserId] = useState<string>("");
    const [partner, setPartner] = useState<any | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>("");
    const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
    const [counterAmount, setCounterAmount] = useState("");
    const [counterListingPrice, setCounterListingPrice] = useState(0);
    const [handlingAction, setHandlingAction] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function init() {
            const { otherUserId } = await params;
            setOtherUserId(otherUserId);
            fetchMessages(otherUserId);
        }
        init();
    }, [params]);

    function computeStatusText(partnerData: any) {
        if (!partnerData?.lastActiveAt) return "Offline";
        const lastActive = new Date(partnerData.lastActiveAt);
        const diff = Date.now() - lastActive.getTime();
        if (diff < 5 * 60 * 1000) {
            return "Online now";
        }
        return `Last online ${lastActive.toLocaleString()}`;
    }

    async function fetchMessages(id: string) {
        try {
            const res = await fetch(`/api/messages/${id}`);
            if (res.ok) {
                const data = await res.json();
                setPartner(data.partner);
                setMessages(data.messages);
                setCurrentUserId(data.currentUserId || "");
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleOfferAction(offerId: string, action: "accept" | "decline" | "counter", amount?: number) {
        setHandlingAction(true);
        try {
            const body: any = { action };
            if (action === "counter" && amount) {
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
            fetchMessages(otherUserId);
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
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId: otherUserId,
                    content: newMessage,
                    listingId: listingId || undefined,
                }),
            });

            if (!res.ok) throw new Error("Failed to send");

            const msg = await res.json();
            setMessages((prev) => [...prev, msg]);
            setNewMessage("");
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            fetchMessages(otherUserId);
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto h-[calc(100vh-120px)] flex flex-col">
            <div className="border rounded-t-lg bg-white p-4 flex items-center gap-3">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={partner?.photo} />
                    <AvatarFallback>
                        {partner?.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-lg font-semibold">{partner?.username}</p>
                    <p className="text-sm text-muted-foreground">
                        {computeStatusText(partner)}
                    </p>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 border border-t-0 bg-slate-50">
                {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground mt-8">
                        Start the conversation!
                    </p>
                ) : (
                    messages.map((msg) => {
                        const senderId = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
                        const isMe = senderId !== otherUserId;
                        const offer = msg.offerId;
                        
                        // Check if current user is seller for this offer
                        const offerSellerId = offer?.sellerId?._id || offer?.sellerId;
                        const isSellerForOffer = offer && currentUserId && offerSellerId?.toString() === currentUserId;
                        const awaitingSeller = offer && isSellerForOffer && 
                            offer.status === "pending" && 
                            offer.lastActionBy === "buyer";
                        const listingPrice = msg.listingId?.price || 0;
                        const minAmount = listingPrice * 0.8;

                        return (
                            <div key={msg._id} className="space-y-2">
                                <div
                                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${isMe
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-white border"
                                            } ${msg.type === "offer" ? "ring-2 ring-primary/40" : ""}`}
                                    >
                                        <p>{msg.content}</p>
                                        {offer?.amount && (
                                            <p className="text-xs mt-1 opacity-80">
                                                Offer amount: ${offer.amount.toFixed(2)}
                                            </p>
                                        )}
                                        {offer?.status && (
                                            <p className="text-xs mt-1 opacity-80 capitalize">
                                                Status: {offer.status}
                                            </p>
                                        )}
                                        <span className="text-[10px] opacity-70 block text-right mt-1">
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Seller action buttons for pending offers */}
                                {awaitingSeller && offer && (
                                    <div className="flex gap-2 flex-wrap ml-4">
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
                className="p-4 border border-t-0 rounded-b-lg bg-white flex gap-2"
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

            {/* Counter Offer Dialog */}
            <Dialog open={!!counteringOfferId} onOpenChange={(open) => {
                if (!open) {
                    setCounteringOfferId(null);
                    setCounterAmount("");
                    setCounterListingPrice(0);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Counter Offer</DialogTitle>
                        <DialogDescription>
                            {counterListingPrice > 0 && (
                                <>Enter a price between ${(counterListingPrice * 0.8).toFixed(2)} and ${counterListingPrice.toFixed(2)}</>
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
                                        `Counter must be between $${minAmount.toFixed(2)} and $${counterListingPrice.toFixed(2)}`
                                    );
                                    return;
                                }
                                handleOfferAction(counteringOfferId!, "counter", value);
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
