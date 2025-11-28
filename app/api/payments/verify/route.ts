import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import connectToDatabase from "@/lib/db";
import Offer from "@/models/Offer";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
            return new NextResponse("Session ID is required", { status: 400 });
        }

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === "paid") {
            await connectToDatabase();
            
            // Update offer if needed
            const offer = await Offer.findOne({ stripeCheckoutSessionId: sessionId });
            if (offer && offer.paymentStatus !== "paid") {
                offer.paymentStatus = "paid";
                offer.stripePaymentIntentId = session.payment_intent as string;
                await offer.save();
            }

            return NextResponse.json({ 
                paid: true,
                sessionId: session.id,
            });
        }

        return NextResponse.json({ 
            paid: false,
            paymentStatus: session.payment_status,
        });
    } catch (error) {
        console.error("[PAYMENT_VERIFY]", error);
        const message = error instanceof Error ? error.message : "Internal Error";
        return new NextResponse(message, { status: 500 });
    }
}




