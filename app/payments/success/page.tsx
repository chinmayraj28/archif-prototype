"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        const session_id = searchParams.get("session_id");
        if (session_id) {
            setSessionId(session_id);
            // Verify payment status with backend
            verifyPayment(session_id);
        } else {
            setLoading(false);
        }
    }, [searchParams]);

    async function verifyPayment(sessionId: string) {
        try {
            const res = await fetch(`/api/payments/verify?session_id=${sessionId}`);
            if (res.ok) {
                // Payment verified, redirect after a moment
                setTimeout(() => {
                    router.push("/account");
                }, 2000);
            }
        } catch (error) {
            console.error("Failed to verify payment", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-muted-foreground mb-8">
                Your payment has been processed successfully. The seller will be notified.
            </p>
            <div className="flex gap-4 justify-center">
                <Link href="/account">
                    <Button>View My Purchases</Button>
                </Link>
                <Link href="/">
                    <Button variant="outline">Continue Shopping</Button>
                </Link>
            </div>
        </div>
    );
}


