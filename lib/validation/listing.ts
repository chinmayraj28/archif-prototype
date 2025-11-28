import * as z from "zod";

export const listingFormSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    price: z.number().min(0.01, "Price must be greater than 0"),
    category: z.string().min(1, "Please select a category"),
    condition: z.string().min(1, "Please select a condition"),
    images: z.array(z.string()).min(1, "At least one image is required"),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;



