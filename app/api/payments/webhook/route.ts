import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import connectToDatabase from "@/lib/db";
import Offer from "@/models/Offer";
import Listing from "@/models/Listing";
import Wishlist from "@/models/Wishlist";
import Notification from "@/models/Notification";

async function notifyWishlistUsers(listingId: string) {
    const listing = await Listing.findById(listingId).populate("sellerId", "_id");
    if (!listing) return;

    const wishlistEntries = await Wishlist.find({ listingId }).populate("userId", "_id");
    if (wishlistEntries.length === 0) return;

    const notifications = wishlistEntries.map((entry) => ({
        recipientId: entry.userId._id,
        actorId: listing.sellerId?._id || entry.userId._id,
        type: "listing_sold",
        data: {
            listingId,
            title: listing.title,
        },
        read: false,
    }));

    await Notification.insertMany(notifications);
    await Wishlist.deleteMany({ listingId });
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const headersList = await headers();
        const signature = headersList.get("stripe-signature");

        if (!signature) {
            return new NextResponse("No signature provided", { status: 400 });
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            const error = err as Error;
            console.error(`Webhook signature verification failed: ${error.message}`);
            return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
        }

        await connectToDatabase();

        // Handle the event
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const offerId = session.client_reference_id;

                if (!offerId) {
                    console.error("No offer ID in checkout session");
                    break;
                }

                const offer = await Offer.findById(offerId).populate("listingId");
                if (!offer) {
                    console.error(`Offer not found: ${offerId}`);
                    break;
                }

                // Update offer payment status
                offer.paymentStatus = "paid";
                offer.stripePaymentIntentId = session.payment_intent as string;
                await offer.save();

                // Mark listing as sold
                const listing = offer.listingId as any;
                await Listing.findByIdAndUpdate(listing._id, { status: "sold" });
                await notifyWishlistUsers(listing._id.toString());

                console.log(`Payment successful for offer ${offerId}`);
                break;
            }

            case "checkout.session.async_payment_succeeded": {
                const session = event.data.object;
                const offerId = session.client_reference_id;

                if (!offerId) {
                    console.error("No offer ID in checkout session");
                    break;
                }

                const offer = await Offer.findById(offerId).populate("listingId");
                if (!offer) {
                    console.error(`Offer not found: ${offerId}`);
                    break;
                }

                offer.paymentStatus = "paid";
                offer.stripePaymentIntentId = session.payment_intent as string;
                await offer.save();

                const listing = offer.listingId as any;
                await Listing.findByIdAndUpdate(listing._id, { status: "sold" });
                await notifyWishlistUsers(listing._id.toString());

                console.log(`Async payment succeeded for offer ${offerId}`);
                break;
            }

            case "checkout.session.async_payment_failed": {
                const session = event.data.object;
                const offerId = session.client_reference_id;

                if (offerId) {
                    const offer = await Offer.findById(offerId);
                    if (offer) {
                        offer.paymentStatus = "failed";
                        await offer.save();
                        console.log(`Payment failed for offer ${offerId}`);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[PAYMENT_WEBHOOK]", error);
        return new NextResponse("Webhook handler failed", { status: 500 });
    }
}




