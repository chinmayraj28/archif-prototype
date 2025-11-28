"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
    const searchParams = useSearchParams();
    const offerId = searchParams.get("offer_id");

    return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
            <p className="text-muted-foreground mb-8">
                Your payment was cancelled. You can try again or continue shopping.
            </p>
            <div className="flex gap-4 justify-center">
                {offerId && (
                    <Link href={`/items/${offerId}`}>
                        <Button>View Item</Button>
                    </Link>
                )}
                <Link href="/">
                    <Button variant="outline">Continue Shopping</Button>
                </Link>
            </div>
        </div>
    );
}


