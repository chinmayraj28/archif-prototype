import mongoose, { Schema, model, models } from "mongoose";

const MessageSchema = new Schema(
    {
        senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
        offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
        type: {
            type: String,
            enum: ["text", "offer"],
            default: "text",
        },
        content: { type: String, required: true },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Message = models.Message || model("Message", MessageSchema);

export default Message;
