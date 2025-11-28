import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Category from "@/models/Category";
import { isAdminEmail } from "@/lib/admin";

const DEFAULT_CATEGORIES = [
    { name: "Women", slug: "women", description: "Women’s apparel & accessories", sortOrder: 0 },
    { name: "Men", slug: "men", description: "Menswear essentials", sortOrder: 1 },
    { name: "Accessories", slug: "accessories", description: "Bags, jewelry & more", sortOrder: 2 },
    { name: "Footwear", slug: "footwear", description: "Shoes and sandals", sortOrder: 3 },
];

async function requireAdmin() {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        return { authorized: false, response: new NextResponse("Unauthorized", { status: 401 }) };
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!isAdminEmail(email)) {
        return { authorized: false, response: new NextResponse("Forbidden", { status: 403 }) };
    }

    return { authorized: true };
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const visibleOnly = searchParams.get("visibleOnly") === "true";

        const filter = visibleOnly ? { isVisible: true } : {};

        let categories = await Category.find(filter).sort({
            sortOrder: 1,
            name: 1,
        });

        if (categories.length === 0) {
            const seeded = await Category.insertMany(
                DEFAULT_CATEGORIES.map((category) => ({
                    ...category,
                    isVisible: true,
                }))
            );
            categories = seeded;
        }

        return NextResponse.json(categories);
    } catch (error) {
        console.error("[CATEGORIES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminCheck = await requireAdmin();
        if (!adminCheck.authorized) return adminCheck.response;

        await connectToDatabase();
        const body = await req.json();
        const { name, slug, description = "", isVisible = true, sortOrder = 0 } = body ?? {};

        if (!name || !slug) {
            return new NextResponse("Name and slug are required", { status: 400 });
        }

        const normalizedSlug = slug.toString().trim().toLowerCase();

        const existing = await Category.findOne({ slug: normalizedSlug });
        if (existing) {
            return new NextResponse("Slug already exists", { status: 409 });
        }

        const category = await Category.create({
            name: name.trim(),
            slug: normalizedSlug,
            description: description?.trim() || "",
            isVisible: Boolean(isVisible),
            sortOrder: Number(sortOrder) || 0,
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("[CATEGORIES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

