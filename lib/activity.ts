import User from "@/models/User";

export async function touchUserActivity(userId: string) {
    try {
        await User.findByIdAndUpdate(
            userId,
            { lastActiveAt: new Date() },
            { new: false }
        );
    } catch (error) {
        console.error("[TOUCH_USER_ACTIVITY]", error);
    }
}


