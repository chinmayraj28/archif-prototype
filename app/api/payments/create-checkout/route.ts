import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import Offer from "@/models/Offer";
import Listing from "@/models/Listing";
import User from "@/models/User";

async function ensureDbUser(clerkId: string) {
    let dbUser = await User.findOne({ clerkId });
    if (!dbUser) {
        const clerkProfile = await currentUser();
        if (!clerkProfile) return null;

        dbUser = await User.create({
            clerkId,
            email: clerkProfile.emailAddresses[0]?.emailAddress,
            username: clerkProfile.username || `user_${clerkId.slice(0, 8)}`,
            photo: clerkProfile.imageUrl,
            firstName: clerkProfile.firstName,
            lastName: clerkProfile.lastName,
        });
    }

    return dbUser;
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();
        const currentUserDb = await ensureDbUser(userId);
        if (!currentUserDb) {
            return new NextResponse("User not found", { status: 404 });
        }

        const body = await req.json();
        const { offerId } = body;

        if (!offerId) {
            return new NextResponse("Offer ID is required", { status: 400 });
        }

        const offer = await Offer.findById(offerId)
            .populate("listingId")
            .populate("buyerId")
            .populate("sellerId");

        if (!offer) {
            return new NextResponse("Offer not found", { status: 404 });
        }

        // Verify the current user is the buyer
        if (offer.buyerId._id.toString() !== currentUserDb._id.toString()) {
            return new NextResponse("Only the buyer can create payment", { status: 403 });
        }

        // Verify offer is accepted
        if (offer.status !== "accepted") {
            return new NextResponse("Offer must be accepted before payment", { status: 400 });
        }

        // Verify payment hasn't been completed
        if (offer.paymentStatus === "paid") {
            return new NextResponse("Payment already completed", { status: 400 });
        }

        const listing = offer.listingId as any;
        const seller = offer.sellerId as any;

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
            (req.headers.get("origin") || `http://${req.headers.get("host")}`);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: listing.title,
                            description: `Purchase of ${listing.title}`,
                            images: listing.images.length > 0 ? [listing.images[0]] : [],
                        },
                        unit_amount: formatAmountForStripe(offer.amount),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${baseUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/payments/cancel?offer_id=${offerId}`,
            client_reference_id: offerId.toString(),
            metadata: {
                offerId: offerId.toString(),
                listingId: listing._id.toString(),
                buyerId: currentUserDb._id.toString(),
                sellerId: seller._id.toString(),
            },
            customer_email: currentUserDb.email,
        });

        // Update offer with checkout session ID
        offer.stripeCheckoutSessionId = session.id;
        offer.paymentStatus = "processing";
        await offer.save();

        return NextResponse.json({ 
            sessionId: session.id,
            url: session.url,
        });
    } catch (error) {
        console.error("[PAYMENT_CREATE_CHECKOUT]", error);
        const message = error instanceof Error ? error.message : "Internal Error";
        return new NextResponse(message, { status: 500 });
    }
}




