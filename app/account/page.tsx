import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";
import DeleteButton from "../items/[id]/_components/DeleteButton";

async function getUserListings(userId: string) {
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId });
    if (!user) return [];

    const listings = await Listing.find({ sellerId: user._id }).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(listings));
}

export default async function AccountPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect("/sign-in");
    }

    const listings = await getUserListings(userId);

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-full overflow-hidden border">
                    <Image
                        src={user.imageUrl}
                        alt="Profile"
                        fill
                        className="object-cover"
                    />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">
                        {user.firstName} {user.lastName}
                    </h1>
                    <p className="text-muted-foreground">{user.emailAddresses[0].emailAddress}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-2xl font-bold">My Listings</h2>
                    <div className="flex gap-2">
                        <Link href="/sell">
                            <Button variant="default">+ List New Item</Button>
                        </Link>
                        <Link href="/account/settings">
                            <Button variant="outline">Manage Account</Button>
                        </Link>
                    </div>
                </div>
                {listings.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/50">
                        <p className="text-muted-foreground mb-4">You haven't listed anything yet.</p>
                        <Link href="/sell">
                            <Button>Start Selling</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {listings.map((item: any) => (
                            <Card
                                key={item._id}
                                className="flex flex-col overflow-hidden border border-[#ededed] shadow-sm"
                            >
                                <div className="relative aspect-[4/5] w-full">
                                    <Image
                                        src={item.images[0]}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                        sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
                                    />
                                    {item.status === "sold" && (
                                        <span className="absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                                            Sold
                                        </span>
                                    )}
                                </div>
                                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </p>
                                    <h3 className="text-base font-semibold leading-tight line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span className="capitalize">{item.category}</span>
                                        <span className="font-semibold text-[#111]">
                                            ${item.price.toFixed(2)}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2 p-4 pt-0">
                                    <Link href={`/items/${item._id}`} className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            View
                                        </Button>
                                    </Link>
                                    <Link href={`/items/${item._id}/edit`} className="flex-1">
                                        <Button variant="secondary" className="w-full">
                                            Edit
                                        </Button>
                                    </Link>
                                    <DeleteButton id={item._id} />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
