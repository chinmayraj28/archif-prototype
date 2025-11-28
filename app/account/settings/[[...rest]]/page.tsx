"use client";

import { UserProfile } from "@clerk/nextjs";

export default function AccountSettingsPage() {
    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-6 py-10">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#777]">
                    Account Center
                </p>
                <h1 className="text-3xl font-semibold text-[#111]">Profile &amp; Security</h1>
                <p className="text-sm text-muted-foreground">
                    Update your personal info, manage connected accounts, and sign out securely via Clerk.
                </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#ededed] bg-white p-4 shadow-sm">
                <UserProfile routing="path" path="/account/settings" />
            </div>
        </div>
    );
}

