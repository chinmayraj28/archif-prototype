"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
    listingId: string;
    initiallyWishlisted?: boolean;
    disabled?: boolean;
    layout?: "icon" | "inline";
    className?: string;
};

export default function WishlistButton({
    listingId,
    initiallyWishlisted = false,
    disabled = false,
    layout = "icon",
    className,
}: WishlistButtonProps) {
    const { isSignedIn } = useUser();
    const [isWishlisted, setIsWishlisted] = useState(initiallyWishlisted);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();

    function redirectToSignIn() {
        const redirectUrl = pathname ? `?redirect_url=${encodeURIComponent(pathname)}` : "";
        router.push(`/sign-in${redirectUrl}`);
    }

    const toggleWishlist = (event?: React.MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault();
        event?.stopPropagation();
        if (disabled || isPending) return;
        if (!isSignedIn) {
            redirectToSignIn();
            return;
        }

        startTransition(async () => {
            try {
                if (isWishlisted) {
                    const res = await fetch(`/api/wishlist/${listingId}`, {
                        method: "DELETE",
                    });
                    if (!res.ok && res.status !== 204) {
                        throw new Error(await res.text());
                    }
                    setIsWishlisted(false);
                    toast.success("Removed from wishlist");
                } else {
                    const res = await fetch("/api/wishlist", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ listingId }),
                    });
                    if (!res.ok) {
                        throw new Error(await res.text());
                    }
                    setIsWishlisted(true);
                    toast.success("Saved to wishlist");
                }
            } catch (error: any) {
                toast.error(error.message || "Unable to update wishlist");
            }
        });
    };

    if (layout === "inline") {
        return (
            <Button
                type="button"
                variant={isWishlisted ? "default" : "outline"}
                onClick={(event) => toggleWishlist(event)}
                disabled={disabled || isPending}
                className={cn("gap-2", className)}
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Heart className={cn("h-4 w-4", isWishlisted ? "fill-white" : "fill-transparent")} />
                )}
                {isWishlisted ? "Wishlisted" : "Add to wishlist"}
            </Button>
        );
    }

    return (
        <button
            type="button"
            onClick={(event) => toggleWishlist(event)}
            disabled={disabled || isPending}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#111] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60",
                className
            )}
        >
            {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Heart className={cn("h-4 w-4", isWishlisted && "fill-[#111]")} />
            )}
        </button>
    );
}

