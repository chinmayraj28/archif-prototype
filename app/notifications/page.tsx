import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

function describeNotification(notification: any) {
    switch (notification.type) {
        case "message":
            return `${notification.actorId.username} sent you a message`;
        case "offer":
            return `${notification.actorId.username} sent you an offer`;
        case "offer_response":
            return `${notification.actorId.username} responded to an offer`;
        default:
            return "You have a new notification";
    }
}

export default async function NotificationsPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect("/sign-in");
    }

    await connectToDatabase();
    const currentUserDoc = await ensureDbUser(userId);
    if (!currentUserDoc) {
        redirect("/sign-in");
    }

    const notifications = await Notification.find({
        recipientId: currentUserDoc._id,
    })
        .populate("actorId", "username photo")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    await Notification.updateMany(
        { recipientId: currentUserDoc._id, read: false },
        { read: true }
    );

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Notifications</h1>
                <p className="text-muted-foreground">
                    Latest updates from your offers and messages.
                </p>
            </div>

            <div className="space-y-3">
                {notifications.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">
                        You&apos;re all caught up.
                    </p>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification._id}
                            className="flex items-center gap-4 border rounded-lg p-4 bg-white"
                        >
                            <Avatar>
                                <AvatarImage src={notification.actorId.photo} />
                                <AvatarFallback>
                                    {notification.actorId.username
                                        ?.slice(0, 2)
                                        .toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium">
                                    {describeNotification(notification)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(notification.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}


