import mongoose, { Schema, model, models } from "mongoose";

const ListingSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        category: { type: String, required: true },
        condition: { type: String, required: true },
        images: { type: [String], required: true },
        sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: {
            type: String,
            enum: ["active", "sold"],
            default: "active",
        },
    },
    { timestamps: true }
);

const Listing = models.Listing || model("Listing", ListingSchema);

export default Listing;
