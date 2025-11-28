"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import Image from "next/image";
import { listingFormSchema, ListingFormValues } from "@/lib/validation/listing";

export default function SellPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<{ _id: string; name: string; slug: string }[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingFormSchema),
        defaultValues: {
            title: "",
            description: "",
            price: 0,
            category: "",
            condition: "",
            images: [],
        },
    });

    const images = form.watch("images");

    useEffect(() => {
        let active = true;
        async function fetchCategories() {
            try {
                const res = await fetch("/api/categories?visibleOnly=true");
                if (res.ok) {
                    const data = await res.json();
                    if (active) {
                        setCategories(data);
                    }
                }
            } catch (error) {
                console.error("Failed to load categories", error);
            } finally {
                if (active) setLoadingCategories(false);
            }
        }
        fetchCategories();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (categories.length > 0 && !form.getValues("category")) {
            form.setValue("category", categories[0].slug);
        }
    }, [categories, form]);

    async function onSubmit(values: ListingFormValues) {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error("Failed to create listing");

            toast.success("Listing created successfully!");
            router.push("/");
            router.refresh();
        } catch (error) {
            toast.error("Something went wrong");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Sell an Item</h1>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="images"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Photos (Required)</FormLabel>
                                <FormControl>
                                    <div className="space-y-4">
                                        {images.length > 0 && (
                                            <div className="grid grid-cols-3 gap-4">
                                                {images.map((url, i) => (
                                                    <div key={i} className="relative aspect-square border-2 border-green-500 rounded-md">
                                                        <Image
                                                            src={url}
                                                            alt="Uploaded image"
                                                            fill
                                                            className="object-cover rounded-md"
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
                                                console.log("Uploaded URLs:", urls);
                                                console.log("Current images:", [...field.value, ...urls]);
                                            }}
                                            onUploadError={(error: Error) => {
                                                toast.error(`Upload failed: ${error.message}`);
                                                console.error("Upload error:", error);
                                            }}
                                            onUploadBegin={() => {
                                                console.log("Upload started");
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
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {loadingCategories ? (
                                                <SelectItem value="loading" disabled>
                                                    Loading...
                                                </SelectItem>
                                            ) : categories.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    No categories available
                                                </SelectItem>
                                            ) : (
                                                categories.map((category) => (
                                                    <SelectItem key={category._id} value={category.slug}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))
                                            )}
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
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
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
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={field.value ?? ""}
                                        onChange={(e) =>
                                            field.onChange(parseFloat(e.target.value) || 0)
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Listing..." : "List Item"}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
