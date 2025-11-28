import { Schema, model, models } from "mongoose";

const WishlistSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    },
    { timestamps: true }
);

WishlistSchema.index({ userId: 1, listingId: 1 }, { unique: true });

const Wishlist = models.Wishlist || model("Wishlist", WishlistSchema);

export default Wishlist;

