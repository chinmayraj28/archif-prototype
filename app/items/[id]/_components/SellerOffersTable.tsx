"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Offer = {
    _id: string;
    amount: number;
    status: "pending" | "countered" | "accepted" | "declined";
    paymentStatus?: "pending" | "processing" | "paid" | "failed" | "cancelled";
    lastActionBy: "buyer" | "seller";
    buyerId: {
        _id: string;
        username: string;
        photo?: string;
    };
    updatedAt: string;
};

export default function SellerOffersTable({
    offers,
    listingPrice,
}: {
    offers: Offer[];
    listingPrice: number;
}) {
    const router = useRouter();
    const [counteringId, setCounteringId] = useState<string | null>(null);
    const [amount, setAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const minAmount = useMemo(
        () => Number((listingPrice * 0.8).toFixed(2)),
        [listingPrice]
    );

    async function updateOffer(offerId: string, payload: Record<string, any>) {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/offers/${offerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Request failed");
            }

            toast.success("Offer updated");
            setCounteringId(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Unable to update offer");
        } finally {
            setSubmitting(false);
        }
    }

    function badgeVariant(status: Offer["status"]) {
        switch (status) {
            case "accepted":
                return "default" as const;
            case "declined":
                return "destructive" as const;
            case "countered":
                return "secondary" as const;
            default:
                return "outline" as const;
        }
    }

    if (offers.length === 0) {
        return (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                No offers yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {offers.map((offer) => {
                const awaitingSeller =
                    offer.status === "pending" && offer.lastActionBy === "buyer";

                return (
                    <div
                        key={offer._id}
                        className="rounded-md border p-4 flex flex-wrap gap-4 items-center justify-between"
                    >
                        <div className="flex items-center gap-3 min-w-[200px]">
                            <Avatar>
                                <AvatarImage src={offer.buyerId.photo} />
                                <AvatarFallback>
                                    {offer.buyerId.username?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{offer.buyerId.username}</p>
                                <p className="text-sm text-muted-foreground">
                                    ${offer.amount.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 items-end">
                            <Badge variant={badgeVariant(offer.status)}>
                                {offer.status}
                            </Badge>
                            {offer.status === "accepted" && offer.paymentStatus && (
                                <Badge variant={offer.paymentStatus === "paid" ? "default" : "secondary"} className="text-xs">
                                    {offer.paymentStatus === "paid" ? "Paid" : 
                                     offer.paymentStatus === "processing" ? "Processing" :
                                     offer.paymentStatus === "pending" ? "Awaiting Payment" :
                                     offer.paymentStatus === "failed" ? "Payment Failed" : offer.paymentStatus}
                                </Badge>
                            )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {awaitingSeller ? (
                                <>
                                    <Button
                                        size="sm"
                                        onClick={() => updateOffer(offer._id, { action: "accept" })}
                                        disabled={submitting}
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateOffer(offer._id, { action: "decline" })}
                                        disabled={submitting}
                                    >
                                        Decline
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setAmount(offer.amount.toFixed(2));
                                            setCounteringId(offer._id);
                                        }}
                                        disabled={submitting}
                                    >
                                        Counter
                                    </Button>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {offer.status === "countered"
                                        ? "Waiting for buyer"
                                        : `Updated ${new Date(offer.updatedAt).toLocaleDateString()}`}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}

            <Dialog open={!!counteringId} onOpenChange={(open) => !open && setCounteringId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Counter offer</DialogTitle>
                        <DialogDescription>
                            Enter a price between ${minAmount} and ${listingPrice}
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        min={minAmount}
                        max={listingPrice}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                if (!counteringId) return;
                                const value = Number(amount);
                                if (value < minAmount || value > listingPrice) {
                                    toast.error(
                                        `Counter must be between $${minAmount} and $${listingPrice}`
                                    );
                                    return;
                                }
                                updateOffer(counteringId, {
                                    action: "counter",
                                    amount: value,
                                });
                            }}
                            disabled={submitting}
                        >
                            {submitting ? "Sending..." : "Send counter"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

