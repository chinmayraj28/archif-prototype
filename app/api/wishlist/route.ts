import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Wishlist from "@/models/Wishlist";
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

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        await connectToDatabase();
        const currentUserDoc = await ensureDbUser(userId);
        if (!currentUserDoc) return new NextResponse("User not found", { status: 404 });

        const items = await Wishlist.find({ userId: currentUserDoc._id })
            .populate({
                path: "listingId",
                populate: { path: "sellerId", select: "username photo" },
            })
            .sort({ createdAt: -1 });

        const sanitized = items
            .filter((entry) => entry.listingId)
            .map((entry) => ({
                _id: entry._id,
                listing: entry.listingId,
                addedAt: entry.createdAt,
            }));

        return NextResponse.json(sanitized);
    } catch (error) {
        console.error("[WISHLIST_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const { listingId } = await req.json();
        if (!listingId) return new NextResponse("listingId required", { status: 400 });

        await connectToDatabase();
        const currentUserDoc = await ensureDbUser(userId);
        if (!currentUserDoc) return new NextResponse("User not found", { status: 404 });

        const listing = await Listing.findById(listingId).populate("sellerId");
        if (!listing) return new NextResponse("Listing not found", { status: 404 });
        if (listing.status === "sold") {
            return new NextResponse("Listing already sold", { status: 400 });
        }

        await Wishlist.findOneAndUpdate(
            { userId: currentUserDoc._id, listingId: listing._id },
            { userId: currentUserDoc._id, listingId: listing._id },
            { upsert: true, new: true }
        );

        return NextResponse.json({ listing });
    } catch (error) {
        console.error("[WISHLIST_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

