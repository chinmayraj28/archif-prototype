import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import DeleteButton from "../items/[id]/_components/DeleteButton";

const ADMIN_EMAILS = ["admin@example.com"]; // TODO: Move to env

async function getAllListings() {
    await connectToDatabase();
    const listings = await Listing.find({})
        .populate("sellerId", "username email")
        .sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(listings));
}

export default async function AdminPage() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect("/sign-in");
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    if (!ADMIN_EMAILS.includes(userEmail)) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                    <p className="text-muted-foreground">You do not have permission to view this page.</p>
                    <Link href="/">
                        <Button variant="link" className="mt-4">Return Home</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const listings = await getAllListings();

    return (
        <div className="max-w-6xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listings.map((item: any) => (
                            <TableRow key={item._id}>
                                <TableCell>
                                    <div className="relative h-12 w-12 rounded overflow-hidden">
                                        <Image
                                            src={item.images[0]}
                                            alt={item.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{item.title}</TableCell>
                                <TableCell>${item.price}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{item.sellerId.username}</span>
                                        <span className="text-xs text-muted-foreground">{item.sellerId.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link href={`/items/${item._id}`}>
                                            <Button variant="ghost" size="sm">View</Button>
                                        </Link>
                                        <DeleteButton id={item._id} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
