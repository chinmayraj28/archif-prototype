import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Wishlist from "@/models/Wishlist";
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

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const { listingId } = await params;
        if (!listingId) return new NextResponse("listingId required", { status: 400 });

        await connectToDatabase();
        const currentUserDoc = await ensureDbUser(userId);
        if (!currentUserDoc) return new NextResponse("User not found", { status: 404 });

        await Wishlist.findOneAndDelete({
            userId: currentUserDoc._id,
            listingId,
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[WISHLIST_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

