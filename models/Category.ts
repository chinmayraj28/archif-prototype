import { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        description: { type: String, default: "" },
        isVisible: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

CategorySchema.index({ slug: 1 }, { unique: true });

const Category = models.Category || model("Category", CategorySchema);

export default Category;

