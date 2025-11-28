import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Category from "@/models/Category";
import { isAdminEmail } from "@/lib/admin";

async function ensureAdmin() {
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

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await ensureAdmin();
        if (!adminCheck.authorized) return adminCheck.response;

        const { id } = await params;
        const updates = await req.json();

        await connectToDatabase();

        if (updates.slug) {
            updates.slug = updates.slug.toString().trim().toLowerCase();
        }
        if (typeof updates.name === "string") {
            updates.name = updates.name.trim();
        }
        if (typeof updates.description === "string") {
            updates.description = updates.description.trim();
        }
        if (typeof updates.sortOrder !== "undefined") {
            updates.sortOrder = Number(updates.sortOrder);
        }

        const category = await Category.findByIdAndUpdate(id, updates, { new: true });
        if (!category) {
            return new NextResponse("Category not found", { status: 404 });
        }

        return NextResponse.json(category);
    } catch (error) {
        console.error("[CATEGORIES_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminCheck = await ensureAdmin();
        if (!adminCheck.authorized) return adminCheck.response;

        const { id } = await params;
        await connectToDatabase();

        const deleted = await Category.findByIdAndDelete(id);
        if (!deleted) {
            return new NextResponse("Category not found", { status: 404 });
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[CATEGORIES_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

