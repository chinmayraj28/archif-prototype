"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import PaymentButton from "./PaymentButton";

type Offer = {
    _id: string;
    amount: number;
    status: "pending" | "countered" | "accepted" | "declined";
    paymentStatus?: "pending" | "processing" | "paid" | "failed" | "cancelled";
    lastActionBy: "buyer" | "seller";
    updatedAt: string;
};

export default function OfferActions({
    listingId,
    price,
    existingOffer,
}: {
    listingId: string;
    price: number;
    existingOffer: Offer | null;
}) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(price.toFixed(2));
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    const minAmount = useMemo(
        () => Number((price * 0.8).toFixed(2)),
        [price]
    );

    const targetTitle = existingOffer ? "Update Offer" : "Make an Offer";

    function canCreateNewOffer() {
        if (!existingOffer) return true;
        return ["declined", "accepted"].includes(existingOffer.status);
    }

    const awaitingSellerDecision =
        existingOffer &&
        existingOffer.status === "pending" &&
        existingOffer.lastActionBy === "buyer";

    const awaitingBuyerDecision =
        existingOffer &&
        existingOffer.status === "countered" &&
        existingOffer.lastActionBy === "seller";

    async function submitOffer(isCounter = false) {
        setSubmitting(true);
        try {
            const payload = { amount: Number(amount) };
            if (payload.amount < minAmount || payload.amount > price) {
                toast.error(`Offers must be between $${minAmount} and $${price}`);
                return;
            }

            const endpoint = isCounter && existingOffer
                ? `/api/offers/${existingOffer._id}`
                : "/api/offers";
            const method = isCounter ? "PATCH" : "POST";
            const body = isCounter
                ? JSON.stringify({ action: "counter", amount: payload.amount })
                : JSON.stringify({ listingId, amount: payload.amount });

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body,
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to submit offer");
            }

            toast.success(isCounter ? "Counter sent" : "Offer sent");
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Unable to submit offer");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAction(action: "accept" | "decline") {
        if (!existingOffer) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/offers/${existingOffer._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Unable to update offer");
            }

            toast.success(`Offer ${action}ed`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Unable to update offer");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold">Make an offer</p>
                    <p className="text-sm text-muted-foreground">
                        Sellers allow up to 20% off. Min offer ${minAmount}.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button disabled={!canCreateNewOffer()}>
                            {targetTitle}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{targetTitle}</DialogTitle>
                            <DialogDescription>
                                Enter an amount between ${minAmount} and ${price}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Offer amount</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={amount}
                                min={minAmount}
                                max={price}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={() => submitOffer(!!existingOffer && awaitingBuyerDecision)}
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Send"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {existingOffer && (
                <div className="rounded-md border p-4 space-y-2">
                    <p className="font-semibold">
                        Latest offer: ${existingOffer.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Status: {existingOffer.status}
                    </p>

                    {awaitingSellerDecision && (
                        <p className="text-sm">
                            Waiting for the seller to respond to your offer.
                        </p>
                    )}

                    {awaitingBuyerDecision && (
                        <div className="space-y-2">
                            <p className="text-sm">
                                Seller countered at ${existingOffer.amount.toFixed(2)}.
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant="default"
                                    onClick={() => handleAction("accept")}
                                    disabled={submitting}
                                >
                                    Accept
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleAction("decline")}
                                    disabled={submitting}
                                >
                                    Decline
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setAmount(existingOffer.amount.toFixed(2));
                                        setOpen(true);
                                    }}
                                    disabled={submitting}
                                >
                                    Counter
                                </Button>
                            </div>
                        </div>
                    )}

                    {existingOffer.status === "accepted" && (
                        <div className="space-y-3">
                            <p className="text-sm text-green-600">Offer accepted!</p>
                            {existingOffer.paymentStatus === "pending" && (
                                <PaymentButton offerId={existingOffer._id} />
                            )}
                            {existingOffer.paymentStatus === "processing" && (
                                <p className="text-sm text-blue-600">Payment processing...</p>
                            )}
                            {existingOffer.paymentStatus === "paid" && (
                                <p className="text-sm text-green-600">Payment completed!</p>
                            )}
                            {existingOffer.paymentStatus === "failed" && (
                                <div className="space-y-2">
                                    <p className="text-sm text-red-600">Payment failed. Please try again.</p>
                                    <PaymentButton offerId={existingOffer._id} />
                                </div>
                            )}
                        </div>
                    )}

                    {existingOffer.status === "declined" && (
                        <p className="text-sm text-destructive">
                            Offer declined. Send another if you’d like.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

