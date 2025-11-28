"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { UploadDropzone } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { listingFormSchema, ListingFormValues } from "@/lib/validation/listing";

type ListingPayload = {
    _id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    condition: string;
    images: string[];
};

export default function EditListingForm({ listing }: { listing: ListingPayload }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingFormSchema),
        defaultValues: {
            title: listing.title,
            description: listing.description,
            price: listing.price,
            category: listing.category,
            condition: listing.condition,
            images: listing.images,
        },
    });

    const images = form.watch("images");

    async function onSubmit(values: ListingFormValues) {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/items/${listing._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error("Failed to update listing");

            toast.success("Listing updated");
            router.push(`/items/${listing._id}`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Photos</FormLabel>
                            <FormControl>
                                <div className="space-y-4">
                                    {images.length > 0 && (
                                        <div className="grid grid-cols-3 gap-4">
                                            {images.map((url, i) => (
                                                <div key={i} className="relative aspect-square border rounded-md overflow-hidden">
                                                    <Image
                                                        src={url}
                                                        alt="Uploaded image"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-1 right-1 h-6 w-6"
                                                        onClick={() => {
                                                            const newImages = [...images];
                                                            newImages.splice(i, 1);
                                                            field.onChange(newImages);
                                                        }}
                                                    >
                                                        X
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <UploadDropzone
                                        endpoint="imageUploader"
                                        onClientUploadComplete={(res) => {
                                            const urls = res.map((r) => r.url);
                                            field.onChange([...field.value, ...urls]);
                                            toast.success(`${urls.length} image(s) uploaded successfully!`);
                                        }}
                                        onUploadError={(error: Error) => {
                                            toast.error(`Upload failed: ${error.message}`);
                                        }}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Vintage Denim Jacket" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe your item..."
                                    className="resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="men">Men</SelectItem>
                                        <SelectItem value="women">Women</SelectItem>
                                        <SelectItem value="kids">Kids</SelectItem>
                                        <SelectItem value="home">Home</SelectItem>
                                        <SelectItem value="entertainment">Entertainment</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Condition</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select condition" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="new">New with tags</SelectItem>
                                        <SelectItem value="like-new">Like new</SelectItem>
                                        <SelectItem value="good">Good</SelectItem>
                                        <SelectItem value="fair">Fair</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price ($)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} value={field.value as number} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-4">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={() => router.push(`/items/${listing._id}`)}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    );
}

