import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import Notification from "@/models/Notification";

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

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();
        const currentUserDoc = await ensureDbUser(userId);
        if (!currentUserDoc) return new NextResponse("User not found", { status: 404 });

        const { searchParams } = new URL(req.url);
        const unreadOnly = searchParams.get("unreadOnly") === "true";

        const filter: Record<string, unknown> = {
            recipientId: currentUserDoc._id,
        };

        if (unreadOnly) {
            filter.read = false;
        }

        const notifications = await Notification.find(filter)
            .populate("actorId", "username photo")
            .sort({ createdAt: -1 })
            .limit(50);

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("[NOTIFICATIONS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();
        const currentUserDoc = await ensureDbUser(userId);
        if (!currentUserDoc) return new NextResponse("User not found", { status: 404 });

        const body = await req.json();
        const { ids, read = true } = body ?? {};

        const filter: Record<string, unknown> = { recipientId: currentUserDoc._id };
        if (Array.isArray(ids) && ids.length > 0) {
            filter._id = { $in: ids };
        }

        await Notification.updateMany(filter, { read });

        return new NextResponse("Updated", { status: 200 });
    } catch (error) {
        console.error("[NOTIFICATIONS_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}


