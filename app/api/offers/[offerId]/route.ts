import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Offer from "@/models/Offer";
import Listing from "@/models/Listing";
import User from "@/models/User";
import Message from "@/models/Message";
import Notification from "@/models/Notification";
import { touchUserActivity } from "@/lib/activity";

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

function validateOfferAmount(listingPrice: number, amount: number) {
    const minAmount = Number((listingPrice * 0.8).toFixed(2));
    if (amount < minAmount || amount > listingPrice) {
        throw new Error(`Offers must be between ${minAmount} and ${listingPrice}`);
    }
}

function formatAmount(amount: number) {
    return `$${amount.toFixed(2)}`;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ offerId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { offerId } = await params;
        await connectToDatabase();
        const currentUserDb = await ensureDbUser(userId);
        if (!currentUserDb) {
            return new NextResponse("User not found", { status: 404 });
        }

        const offer = await Offer.findById(offerId).populate([
            { path: "listingId", select: "price title sellerId" },
            { path: "buyerId", select: "clerkId" },
            { path: "sellerId", select: "clerkId" },
        ]);

        if (!offer) {
            return new NextResponse("Offer not found", { status: 404 });
        }

        const listing = offer.listingId as any;
        const isSeller = offer.sellerId._id.toString() === currentUserDb._id.toString();
        const isBuyer = offer.buyerId._id.toString() === currentUserDb._id.toString();

        if (!isSeller && !isBuyer) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const counterpartyId = isSeller ? offer.buyerId._id : offer.sellerId._id;

        const notifyCounterparty = async (content: string) => {
            await Message.create({
                senderId: currentUserDb._id,
                receiverId: counterpartyId,
                listingId: listing._id,
                offerId: offer._id,
                type: "offer",
                content,
            });

            await Notification.create({
                recipientId: counterpartyId,
                actorId: currentUserDb._id,
                type: "offer_response",
                data: {
                    offerId: offer._id,
                    listingId: listing._id,
                    otherUserId: currentUserDb._id,
                    status: offer.status,
                },
            });
        };

        const body = await req.json();
        const { action, amount } = body;

        if (!action) {
            return new NextResponse("Missing action", { status: 400 });
        }

        switch (action) {
            case "accept": {
                if (offer.status === "accepted") break;

                const awaitingSeller = offer.lastActionBy === "buyer" && isSeller && offer.status === "pending";
                const awaitingBuyer = offer.lastActionBy === "seller" && isBuyer && offer.status === "countered";

                if (!awaitingSeller && !awaitingBuyer) {
                    return new NextResponse("Cannot accept at this stage", { status: 400 });
                }

                offer.status = "accepted";
                offer.paymentStatus = "pending"; // Set payment status to pending
                offer.history.push({
                    actor: awaitingSeller ? "seller" : "buyer",
                    action: "accept",
                    amount: offer.amount,
                });
                
                const message = isSeller 
                    ? `Seller accepted the offer of ${formatAmount(offer.amount)} on ${listing.title}. Please complete payment.`
                    : `Buyer accepted the offer of ${formatAmount(offer.amount)} on ${listing.title}. Awaiting payment.`;
                    
                await notifyCounterparty(message);

                // Don't mark listing as sold yet - wait for payment confirmation via webhook
                // Auto-decline all other offers for this listing
                await Offer.updateMany(
                    {
                        listingId: listing._id,
                        _id: { $ne: offer._id },
                        status: { $in: ["pending", "countered"] },
                    },
                    {
                        status: "declined",
                    }
                );
                break;
            }
            case "decline": {
                if (offer.status === "declined") break;

                const awaitingSeller = offer.lastActionBy === "buyer" && isSeller && offer.status === "pending";
                const awaitingBuyer = offer.lastActionBy === "seller" && isBuyer && offer.status === "countered";

                if (!awaitingSeller && !awaitingBuyer) {
                    return new NextResponse("Cannot decline at this stage", { status: 400 });
                }

                offer.status = "declined";
                offer.history.push({
                    actor: awaitingSeller ? "seller" : "buyer",
                    action: "decline",
                    amount: offer.amount,
                });
                await notifyCounterparty(
                    `${isSeller ? "Seller" : "Buyer"} declined the offer for ${listing.title}`
                );
                break;
            }
            case "counter": {
                if (!amount) {
                    return new NextResponse("Counter amount required", { status: 400 });
                }

                validateOfferAmount(listing.price, amount);

                if (isSeller && offer.lastActionBy === "buyer" && offer.status === "pending") {
                    offer.amount = amount;
                    offer.status = "countered";
                    offer.lastActionBy = "seller";
                    offer.history.push({
                        actor: "seller",
                        action: "counter",
                        amount,
                    });
                    await notifyCounterparty(
                        `Seller countered with ${formatAmount(amount)} on ${listing.title}`
                    );
                } else if (isBuyer && offer.lastActionBy === "seller" && offer.status === "countered") {
                    offer.amount = amount;
                    offer.status = "pending";
                    offer.lastActionBy = "buyer";
                    offer.history.push({
                        actor: "buyer",
                        action: "counter",
                        amount,
                    });
                    await notifyCounterparty(
                        `Buyer countered with ${formatAmount(amount)} on ${listing.title}`
                    );
                } else {
                    return new NextResponse("Cannot counter at this stage", { status: 400 });
                }
                break;
            }
            default:
                return new NextResponse("Invalid action", { status: 400 });
        }

        await offer.save();
        await offer.populate([
            { path: "buyerId", select: "username photo clerkId" },
            { path: "sellerId", select: "username photo clerkId" },
            { path: "listingId", select: "title price" },
        ]);

        await touchUserActivity(currentUserDb._id.toString());

        return NextResponse.json(offer);
    } catch (error) {
        console.error("[OFFER_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Error";
        const status =
            error instanceof Error && error.message.includes("Offers must")
                ? 400
                : 500;
        return new NextResponse(message, { status });
    }
}

