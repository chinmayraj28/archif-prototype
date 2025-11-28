import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();

        // Sync user to DB if not exists
        let dbUser = await User.findOne({ clerkId: userId });
        if (!dbUser) {
            dbUser = await User.create({
                clerkId: userId,
                email: user.emailAddresses[0].emailAddress,
                username: user.username || `user_${userId.slice(0, 8)}`,
                photo: user.imageUrl,
                firstName: user.firstName,
                lastName: user.lastName,
            });
        }

        const body = await req.json();
        const { title, description, price, category, condition, images } = body;

        if (!title || !description || !price || !category || !condition || !images) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const listing = await Listing.create({
            title,
            description,
            price,
            category,
            condition,
            images,
            sellerId: dbUser._id,
        });

        return NextResponse.json(listing);
    } catch (error) {
        console.error("[LISTINGS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query");
        const category = searchParams.get("category");

        let filter: any = { status: "active" }; // Only show active listings

        if (query) {
            filter.title = { $regex: query, $options: "i" };
        }

        if (category && category !== "all") {
            filter.category = category;
        }

        const listings = await Listing.find(filter)
            .populate("sellerId", "username photo")
            .sort({ createdAt: -1 });

        return NextResponse.json(listings);
    } catch (error) {
        console.error("[LISTINGS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
