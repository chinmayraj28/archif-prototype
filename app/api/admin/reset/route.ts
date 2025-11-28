import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";

const AUTH_HEADER = "x-reset-token";

export async function POST(req: NextRequest) {
    const urlToken = req.nextUrl.searchParams.get("token");
    const headerToken = req.headers.get(AUTH_HEADER);
    const token = headerToken || urlToken;

    if (!token || token !== process.env.ADMIN_RESET_TOKEN) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    await connectToDatabase();

    const db = mongoose.connection.db;
    if (!db) {
        return new NextResponse("Database connection not initialized", { status: 500 });
    }

    await db.dropDatabase();

    return NextResponse.json({ message: "Database dropped" });
}




