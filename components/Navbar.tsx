"use client";

import Link from "next/link";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { ChevronDown, Globe2, Search, MessageCircle, Heart, UserRound } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { isAdminEmail } from "@/lib/admin";

const navLinks = [
  { label: "New Drop", href: "/" },
  { label: "Shop All", href: "/" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Sell", href: "/sell" },
];

export default function Navbar() {
  const { isSignedIn, user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  const isAdmin = isAdminEmail(userEmail);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#ededed] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <div className="hidden items-center gap-6 text-[12px] font-medium uppercase tracking-[0.18em] text-[#111]/80 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative pb-1 transition-colors duration-300 hover:text-[#111] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-[#111] after:transition after:duration-300 hover:after:scale-x-100"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="text-lg font-semibold uppercase tracking-[0.36em] text-[#111]"
        >
          Archif
        </Link>

        <div className="flex items-center gap-2 text-[#111]">
          <button
            className="hidden cursor-pointer items-center gap-2 rounded-full border border-transparent px-3 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition hover:border-[#ededed] md:flex"
            type="button"
          >
            <Globe2 className="h-4 w-4" />
            USD
            <ChevronDown className="h-4 w-4" />
          </button>
          <Link href="/#search-tools" aria-label="Skip to search">
            <IconButton ariaLabel="Search">
              <Search className="h-4 w-4" />
            </IconButton>
          </Link>
          {isSignedIn && (
            <>
              <Link href="/messages" aria-label="Messages">
                <IconButton>
                  <MessageCircle className="h-4 w-4" />
                </IconButton>
              </Link>
              <NotificationBell />
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden rounded-full border border-[#ededed] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#111] transition hover:-translate-y-0.5 hover:bg-[#111] hover:text-white md:block"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className="hidden rounded-full border border-[#ededed] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#111] transition hover:-translate-y-0.5 hover:bg-[#111] hover:text-white sm:block"
              >
                Account
              </Link>
            </>
          )}
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <SignInButton mode="modal">
              <IconButton ariaLabel="Sign in">
                <UserRound className="h-4 w-4" />
              </IconButton>
            </SignInButton>
          )}
          <Link href={isSignedIn ? "/wishlist" : "/sign-in"} aria-label="Wishlist">
            <IconButton>
              <Heart className="h-4 w-4" />
            </IconButton>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function IconButton({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#ededed] bg-white/80 text-[#111] shadow-[0_12px_28px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.07)]"
    >
      {children}
    </button>
  );
}
