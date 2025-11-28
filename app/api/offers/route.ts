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
        const { listingId, amount } = body;

        if (!listingId || !amount) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        const listing = await Listing.findById(listingId).populate("sellerId");
        if (!listing) {
            return new NextResponse("Listing not found", { status: 404 });
        }

        if (listing.sellerId._id.toString() === currentUserDb._id.toString()) {
            return new NextResponse("Sellers cannot send offers to themselves", { status: 400 });
        }

        validateOfferAmount(listing.price, amount);

        const offer = await Offer.create({
            listingId: listing._id,
            buyerId: currentUserDb._id,
            sellerId: listing.sellerId._id,
            amount,
            status: "pending",
            lastActionBy: "buyer",
            history: [
                {
                    actor: "buyer",
                    action: "offer",
                    amount,
                },
            ],
        });

        await offer.populate([
            { path: "buyerId", select: "username photo clerkId" },
            { path: "sellerId", select: "username photo clerkId" },
            { path: "listingId", select: "title price" },
        ]);

        await Message.create({
            senderId: currentUserDb._id,
            receiverId: listing.sellerId._id,
            listingId: listing._id,
            offerId: offer._id,
            type: "offer",
            content: `sent an offer of ${formatAmount(amount)} on ${listing.title}`,
        });

        await Notification.create({
            recipientId: listing.sellerId._id,
            actorId: currentUserDb._id,
            type: "offer",
            data: {
                offerId: offer._id,
                listingId: listing._id,
                otherUserId: currentUserDb._id,
            },
        });

        await touchUserActivity(currentUserDb._id.toString());

        return NextResponse.json(offer);
    } catch (error: any) {
        console.error("[OFFERS_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Error";
        const status =
            error instanceof Error && error.message.includes("Offers must")
                ? 400
                : 500;
        return new NextResponse(message, { status });
    }
}

export async function GET(req: NextRequest) {
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

        const { searchParams } = new URL(req.url);
        const listingId = searchParams.get("listingId");
        const role = searchParams.get("role") ?? "buyer";

        const filter: any = {};

        if (role === "seller") {
            filter.sellerId = currentUserDb._id;
        } else {
            filter.buyerId = currentUserDb._id;
        }

        if (listingId) {
            filter.listingId = listingId;
        }

        const offers = await Offer.find(filter)
            .populate("buyerId", "username photo clerkId")
            .populate("sellerId", "username photo clerkId")
            .populate("listingId", "title price")
            .sort({ updatedAt: -1 });

        await touchUserActivity(currentUserDb._id.toString());

        return NextResponse.json(offers);
    } catch (error) {
        console.error("[OFFERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

