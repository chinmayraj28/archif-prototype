import { Schema, model, models } from "mongoose";

const NotificationSchema = new Schema(
    {
        recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: {
            type: String,
            enum: ["message", "offer", "offer_response"],
            required: true,
        },
        data: { type: Schema.Types.Mixed, default: {} },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Notification = models.Notification || model("Notification", NotificationSchema);

export default Notification;




