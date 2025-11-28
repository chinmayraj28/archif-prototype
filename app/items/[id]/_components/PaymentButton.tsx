"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function PaymentButton({ offerId }: { offerId: string }) {
    const [processing, setProcessing] = useState(false);
    const router = useRouter();

    async function handlePayment() {
        setProcessing(true);
        try {
            const res = await fetch("/api/payments/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ offerId }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to create payment session");
            }

            const data = await res.json();
            
            if (data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to initiate payment");
            setProcessing(false);
        }
    }

    return (
        <Button
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-black text-white hover:bg-black/90"
            size="lg"
        >
            {processing ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Complete Payment
                </>
            )}
        </Button>
    );
}


