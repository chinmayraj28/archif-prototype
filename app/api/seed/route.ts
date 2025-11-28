import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";

export async function GET() {
    try {
        await connectToDatabase();

        // Create a dummy user if not exists (requires a valid Clerk ID to actually work with auth, 
        // but for seeding listings we can just create a placeholder user)
        // In reality, we should probably use an existing user or just create one with a fake ID 
        // and hope the UI handles it gracefully (it might show broken image/name if not in Clerk).
        // Better: Seed listings for the FIRST user found in DB.

        let user = await User.findOne();
        if (!user) {
            // If no user, create a dummy one. 
            // Note: This user won't be able to login via Clerk unless we map a real Clerk ID.
            user = await User.create({
                clerkId: "seed_user_123",
                email: "seed@example.com",
                username: "SeedUser",
                photo: "https://github.com/shadcn.png",
                firstName: "Seed",
                lastName: "User"
            });
        }

        const sampleListings = [
            {
                title: "Vintage Levi's 501 Jeans",
                description: "Classic straight leg jeans, medium wash. Great condition with minor wear.",
                price: 45.00,
                category: "men",
                condition: "good",
                images: ["https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?auto=format&fit=crop&w=800&q=80"],
                sellerId: user._id,
            },
            {
                title: "Sony WH-1000XM4 Headphones",
                description: "Noise cancelling headphones. Barely used, comes with original case.",
                price: 180.00,
                category: "entertainment",
                condition: "like-new",
                images: ["https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80"],
                sellerId: user._id,
            },
            {
                title: "Zara Floral Dress",
                description: "Beautiful summer dress, size M. Never worn.",
                price: 25.00,
                category: "women",
                condition: "new",
                images: ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80"],
                sellerId: user._id,
            },
            {
                title: "Wooden Coffee Table",
                description: "Mid-century modern style. Solid oak.",
                price: 120.00,
                category: "home",
                condition: "good",
                images: ["https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=800&q=80"],
                sellerId: user._id,
            },
        ];

        await Listing.insertMany(sampleListings);

        return NextResponse.json({ message: "Seeded successfully", count: sampleListings.length });
    } catch (error) {
        console.error(error);
        return new NextResponse("Error seeding", { status: 500 });
    }
}
