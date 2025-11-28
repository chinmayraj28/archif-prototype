import mongoose, { Schema, model, models } from "mongoose";

const OfferHistorySchema = new Schema(
    {
        actor: { type: String, enum: ["buyer", "seller"], required: true },
        action: { type: String, enum: ["offer", "accept", "decline", "counter"], required: true },
        amount: { type: Number },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const OfferSchema = new Schema(
    {
        listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
        buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "countered", "accepted", "declined"],
            default: "pending",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "processing", "paid", "failed", "cancelled"],
            default: "pending",
        },
        stripePaymentIntentId: { type: String },
        stripeCheckoutSessionId: { type: String },
        lastActionBy: { type: String, enum: ["buyer", "seller"], required: true },
        history: { type: [OfferHistorySchema], default: [] },
    },
    { timestamps: true }
);

const Offer = models.Offer || model("Offer", OfferSchema);

export default Offer;

