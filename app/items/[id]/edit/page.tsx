import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";
import EditListingForm from "../_components/EditListingForm";

export default async function EditListingPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    await connectToDatabase();
    const listing = await Listing.findById(id).populate("sellerId");

    if (!listing) {
        notFound();
    }

    const currentUser = await User.findOne({ clerkId: userId });

    if (!currentUser || listing.sellerId._id.toString() !== currentUser._id.toString()) {
        notFound();
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Edit Listing</h1>
            <EditListingForm listing={JSON.parse(JSON.stringify(listing))} />
        </div>
    );
}




