import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

            <div>
                <h2 className="text-2xl font-bold mb-4">My Listings</h2>
                {listings.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/50">
                        <p className="text-muted-foreground mb-4">You haven't listed anything yet.</p>
                        <Link href="/sell">
                            <Button>Start Selling</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {listings.map((item: any) => (
                            <Card key={item._id} className="overflow-hidden flex flex-col">
                                <div className="relative aspect-[4/5] w-full">
                                    <Image
                                        src={item.images[0]}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <CardContent className="p-4 flex-1">
                                    <h3 className="font-semibold truncate">{item.title}</h3>
                                    <span className="font-bold">${item.price}</span>
                                </CardContent>
                                <CardFooter className="p-4 pt-0 flex gap-2">
                                    <Link href={`/items/${item._id}`} className="flex-1">
                                        <Button variant="outline" className="w-full">View</Button>
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
