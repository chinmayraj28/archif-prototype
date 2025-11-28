import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";
import { listingFormSchema } from "@/lib/validation/listing";
import { ZodError } from "zod";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const listing = await Listing.findById(id).populate(
            "sellerId",
            "username photo clerkId"
        );

        if (!listing) {
            return new NextResponse("Not Found", { status: 404 });
        }

        return NextResponse.json(listing);
    } catch (error) {
        console.error("[LISTING_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();
        const { id } = await params;

        const listing = await Listing.findById(id).populate("sellerId");

        if (!listing) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Check if user is owner or admin (hardcoded admin check for MVP)
        const isAdmin = [
            "admin@example.com", // Replace with real admin emails or env var
        ].includes(listing.sellerId.email); // Wait, listing.sellerId is populated User object.

        // Better admin check:
        // We need to fetch the current user's email to check against admin list.
        // Or check if userId matches listing.sellerId.clerkId.

        if (listing.sellerId.clerkId !== userId) {
            // Check admin
            // For MVP, let's just allow owner to delete. Admin check can be added later or via specific admin route.
            // User prompt says: "Admin (MVP) ... only allow via a hardcoded list of admin emails".
            // So I should check if current user email is in admin list.
            // I need to fetch current user email from Clerk or DB.

            // Let's fetch current user from DB to get email.
            const currentUserDb = await User.findOne({ clerkId: userId });
            const adminEmails = ["admin@example.com"]; // TODO: Move to env or config

            if (!currentUserDb || !adminEmails.includes(currentUserDb.email)) {
                return new NextResponse("Forbidden", { status: 403 });
            }
        }

        await Listing.findByIdAndDelete(id);

        return new NextResponse("Deleted", { status: 200 });
    } catch (error) {
        console.error("[LISTING_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await connectToDatabase();
        const { id } = await params;

        const listing = await Listing.findById(id).populate("sellerId");
        if (!listing) {
            return new NextResponse("Not Found", { status: 404 });
        }

        const currentUser = await User.findOne({ clerkId: userId });
        if (
            !currentUser ||
            currentUser._id.toString() !== listing.sellerId._id.toString()
        ) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const body = await req.json();
        const data = listingFormSchema.parse(body);

        listing.title = data.title;
        listing.description = data.description;
        listing.price = data.price;
        listing.category = data.category;
        listing.condition = data.condition;
        listing.images = data.images;

        await listing.save();

        return NextResponse.json(listing);
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { message: "Invalid payload", issues: error.issues },
                { status: 400 }
            );
        }
        console.error("[LISTING_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
