import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";
import User from "@/models/User";
import Notification from "@/models/Notification";
import Offer from "@/models/Offer";
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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ otherUserId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();
        const currentUserDoc = await ensureDbUser(userId);
        if (!currentUserDoc) return new NextResponse("User not found", { status: 404 });

        const { otherUserId } = await params;
        const partner = await User.findById(otherUserId, "username photo lastActiveAt");
        if (!partner) {
            return new NextResponse("Conversation partner not found", { status: 404 });
        }

        const messages = await Message.find({
            $or: [
                { senderId: currentUserDoc._id, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: currentUserDoc._id },
            ],
        })
            .sort({ createdAt: 1 })
            .populate("senderId", "username photo")
            .populate({
                path: "offerId",
                select: "amount status lastActionBy listingId buyerId sellerId",
                model: Offer,
                populate: [
                    { path: "buyerId", select: "_id" },
                    { path: "sellerId", select: "_id" },
                ],
            })
            .populate("listingId", "title price");

        await Notification.updateMany(
            {
                recipientId: currentUserDoc._id,
                "data.otherUserId": partner._id,
                read: false,
            },
            { read: true }
        );

        await touchUserActivity(currentUserDoc._id.toString());

        return NextResponse.json({ 
            partner, 
            messages,
            currentUserId: currentUserDoc._id.toString(),
        });
    } catch (error) {
        console.error("[MESSAGES_ID_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
