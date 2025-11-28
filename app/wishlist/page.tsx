"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import Wishlist from "@/models/Wishlist";
import WishlistButton from "@/components/WishlistButton";

async function ensureDbUser(clerkId: string) {
    let dbUser = await User.findOne({ clerkId });
    if (!dbUser) {
        const clerkProfile = await currentUser();
        if (!clerkProfile) redirect("/sign-in");

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

export default async function WishlistPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    await connectToDatabase();
    const currentUser = await ensureDbUser(userId);

    const wishlistEntries = await Wishlist.find({ userId: currentUser._id })
        .populate({
            path: "listingId",
            populate: { path: "sellerId", select: "username photo" },
        })
        .sort({ createdAt: -1 });

    const listings = wishlistEntries
        .map((entry) => entry.listingId)
        .filter(Boolean);

    return (
        <div className="mx-auto max-w-5xl space-y-6 py-10 text-[#111]">
            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#777]">
                    Saved Items
                </p>
                <h1 className="text-3xl font-semibold">Your Wishlist</h1>
                <p className="text-sm text-muted-foreground">
                    Items you&apos;ve saved for later. We&apos;ll let you know if they sell out.
                </p>
            </div>

            {listings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#ececec] bg-[#fafafa] p-10 text-center text-sm text-muted-foreground">
                    No items yet. Explore the catalog and tap the heart icon to build your wishlist.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {listings.map((listing: any) => (
                        <Link
                            key={listing._id}
                            href={`/items/${listing._id}`}
                            className="group rounded-2xl border border-[#ededed] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,0,0,0.08)]"
                        >
                            <div className="relative aspect-[4/5] overflow-hidden rounded-t-2xl bg-[#f7f7f7]">
                                <WishlistButton
                                    listingId={listing._id}
                                    initiallyWishlisted
                                    disabled={listing.status === "sold"}
                                    className="absolute right-4 top-4 z-10"
                                />
                                {listing.status === "sold" && (
                                    <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/50 text-xs font-semibold uppercase tracking-[0.4em] text-white">
                                        Sold Out
                                    </div>
                                )}
                                <Image
                                    src={listing.images[0]}
                                    alt={listing.title}
                                    fill
                                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                                />
                            </div>
                            <div className="space-y-2 px-5 py-4">
                                <div className="flex items-start justify-between gap-3 text-sm font-semibold uppercase tracking-[0.08em]">
                                    <span className="line-clamp-1">{listing.title}</span>
                                    <span>${listing.price.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {listing.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#777]">
                                    <span className="rounded-full bg-[#f5f5f5] px-3 py-1 capitalize">
                                        {listing.category}
                                    </span>
                                    <span className="rounded-full bg-[#f5f5f5] px-3 py-1 capitalize">
                                        {listing.condition}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

