import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";
import User from "@/models/User";
import Listing from "@/models/Listing";
import Notification from "@/models/Notification";
import { touchUserActivity } from "@/lib/activity";

export const runtime = 'nodejs';

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
        const currentUser = await ensureDbUser(userId);
        if (!currentUser) return new NextResponse("User not found", { status: 404 });

        const body = await req.json();
        const { receiverId, content, listingId } = body;

        if (!receiverId || !content) {
            return new NextResponse("Missing fields", { status: 400 });
        }

        const message = await Message.create({
            senderId: currentUser._id,
            receiverId,
            content,
            listingId,
        });

        await Notification.create({
            recipientId: receiverId,
            actorId: currentUser._id,
            type: "message",
            data: {
                messageId: message._id,
                listingId,
                otherUserId: currentUser._id,
            },
        });

        await touchUserActivity(currentUser._id.toString());

        return NextResponse.json(message);
    } catch (error) {
        console.error("[MESSAGES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();
        const currentUser = await ensureDbUser(userId);
        if (!currentUser) return new NextResponse("User not found", { status: 404 });

        // Get all unique conversations
        // We want to find all messages where current user is sender OR receiver
        // And group by the OTHER user.

        // This aggregation is a bit complex.
        // Simpler approach: Find all messages involving user, then process in JS (for MVP).
        const messages = await Message.find({
            $or: [{ senderId: currentUser._id }, { receiverId: currentUser._id }],
        })
            .sort({ createdAt: -1 })
            .populate("senderId", "username photo lastActiveAt")
            .populate("receiverId", "username photo lastActiveAt")
            .populate("listingId", "title images");

        // Group by conversation partner
        const conversations = new Map();

        messages.forEach((msg: any) => {
            const isSender = msg.senderId._id.toString() === currentUser._id.toString();
            const partner = isSender ? msg.receiverId : msg.senderId;
            const partnerId = partner._id.toString();

            if (!conversations.has(partnerId)) {
                conversations.set(partnerId, {
                    partner,
                    lastMessage: msg,
                });
            }
        });

        await touchUserActivity(currentUser._id.toString());

        return NextResponse.json(Array.from(conversations.values()));
    } catch (error) {
        console.error("[MESSAGES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
