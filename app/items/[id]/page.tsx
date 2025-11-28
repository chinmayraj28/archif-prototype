import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";
import Offer from "@/models/Offer";
import DeleteButton from "./_components/DeleteButton";
import OfferActions from "./_components/OfferActions";
import SellerOffersTable from "./_components/SellerOffersTable";

// Direct DB access is better for server components to avoid API overhead/URL issues during build
async function getListingDirect(id: string) {
    await connectToDatabase();
    // Need to populate seller
    // But Listing model imports User model, so it should work if models are registered.
    // However, in Next.js dev, models might be recompiled.
    // Let's try direct DB query.
    try {
        const listing = await Listing.findById(id).populate("sellerId");
        if (!listing) return null;
        return JSON.parse(JSON.stringify(listing)); // Serialize for client
    } catch (e) {
        return null;
    }
}

export default async function ListingPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const listing = await getListingDirect(id);
    const { userId } = await auth();

    if (!listing) {
        notFound();
    }

    const isOwner = userId === listing.sellerId.clerkId;
    const currentUser = userId ? await User.findOne({ clerkId: userId }) : null;

    let sellerOffersDocs: any[] = [];
    let buyerOfferDoc: any = null;

    if (currentUser) {
        if (isOwner) {
            sellerOffersDocs = await Offer.find({ listingId: listing._id })
                .populate("buyerId", "username photo")
                .select("amount status paymentStatus lastActionBy buyerId updatedAt")
                .sort({ updatedAt: -1 });
        } else {
            buyerOfferDoc = await Offer.findOne({
                listingId: listing._id,
                buyerId: currentUser._id,
            })
                .select("amount status paymentStatus lastActionBy updatedAt")
                .sort({ updatedAt: -1 });
        }
    }

    const sellerOffers = JSON.parse(JSON.stringify(sellerOffersDocs));
    const buyerOffer = buyerOfferDoc ? JSON.parse(JSON.stringify(buyerOfferDoc)) : null;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Carousel */}
                <div className="relative">
                    <Carousel className="w-full">
                        <CarouselContent>
                            {listing.images.map((img: string, i: number) => (
                                <CarouselItem key={i}>
                                    <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                                        <Image
                                            src={img}
                                            alt={listing.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                    </Carousel>
                </div>

                {/* Details */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-bold">{listing.title}</h1>
                            {listing.status === "sold" && (
                                <Badge variant="destructive" className="text-lg px-3 py-1">
                                    SOLD
                                </Badge>
                            )}
                        </div>
                        <p className="text-2xl font-bold text-primary mt-2">
                            ${listing.price.toFixed(2)}
                        </p>
                        {listing.status === "sold" && (
                            <p className="text-muted-foreground mt-2 font-medium">
                                This item has been sold.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4 py-4 border-y">
                        <div className="flex items-center gap-2">
                            <Avatar>
                                <AvatarImage src={listing.sellerId.photo} />
                                <AvatarFallback>
                                    {listing.sellerId.username?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{listing.sellerId.username}</p>
                                <p className="text-xs text-muted-foreground">Seller</p>
                            </div>
                        </div>


                        {!isOwner && (
                            <Link href={`/messages/${listing.sellerId._id}?listingId=${listing._id}`} className="ml-auto">
                                <Button>
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    Message
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-1">Description</h3>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {listing.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold mb-1">Category</h3>
                                <p className="capitalize">{listing.category}</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Condition</h3>
                                <p className="capitalize">{listing.condition}</p>
                            </div>
                        </div>
                    </div>

                    {isOwner && (
                        <div className="pt-4 border-t space-y-3">
                            <div className="flex gap-2 flex-wrap">
                                <Link href={`/items/${listing._id}/edit`}>
                                    <Button variant="outline">Edit Listing</Button>
                                </Link>
                                <DeleteButton id={listing._id} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-10 space-y-4">
                <h2 className="text-2xl font-semibold">
                    {isOwner ? "Incoming offers" : "Make an offer"}
                </h2>

                {isOwner ? (
                    <SellerOffersTable offers={sellerOffers} listingPrice={listing.price} />
                ) : userId ? (
                    <OfferActions listingId={listing._id} price={listing.price} existingOffer={buyerOffer} />
                ) : (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">
                        Sign in to send the seller an offer.
                    </div>
                )}
            </div>
        </div>
    );
}
