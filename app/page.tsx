import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/db";
import Listing from "@/models/Listing";
import Category from "@/models/Category";
import Wishlist from "@/models/Wishlist";
import User from "@/models/User";
import SearchFilters from "@/components/SearchFilters";
import WishlistButton from "@/components/WishlistButton";

async function getListings(searchParams: { query?: string; category?: string }) {
  await connectToDatabase();

  const filter: any = { status: "active" };
  if (searchParams.query) {
    filter.title = { $regex: searchParams.query, $options: "i" };
  }
  if (searchParams.category && searchParams.category !== "all") {
    filter.category = searchParams.category;
  }

  const listings = await Listing.find(filter).sort({ createdAt: -1 });
  return JSON.parse(JSON.stringify(listings));
}

async function getCategories() {
  await connectToDatabase();
  const categories = await Category.find({ isVisible: true }).sort({
    sortOrder: 1,
    name: 1,
  });
  return JSON.parse(JSON.stringify(categories));
}

async function getWishlistedListingIds(clerkId?: string | null) {
  if (!clerkId) return [];
  await connectToDatabase();
  const user = await User.findOne({ clerkId });
  if (!user) return [];
  const entries = await Wishlist.find({ userId: user._id }).select("listingId");
  return entries.map((entry: any) => entry.listingId.toString());
}

const heroImage =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80";

const fallbackTileImages = [
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; category?: string }>;
}) {
  const params = await searchParams;
  const { userId } = await auth();
  const [listings, categoriesRaw, wishlistIds] = await Promise.all([
    getListings(params),
    getCategories(),
    getWishlistedListingIds(userId),
  ]);

  const categories = categoriesRaw.length
    ? categoriesRaw
    : [
        { _id: "women", name: "Women", slug: "women", sortOrder: 0 },
        { _id: "men", name: "Men", slug: "men", sortOrder: 1 },
      ];

  const activeCategory = (params.category || "all").toLowerCase();
  const initialQuery = params.query || "";
  const featuredTiles = categories.slice(0, 3).map((category, index) => ({
    label: category.name,
    slug: category.slug,
    image: fallbackTileImages[index % fallbackTileImages.length],
  }));

  return (
    <div className="space-y-16 text-[#111]">
      <section
        id="hero"
        className="relative overflow-hidden rounded-[18px] border border-[#ededed] bg-[#f7f7f7]"
      >
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="Muted luxury fashion flatlay"
            fill
            priority
            className="object-cover brightness-[0.92]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/5" />
        </div>

        <div className="relative flex flex-col items-center gap-4 px-8 py-24 text-center md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/80">
            Curated Archive
          </p>
          <h1 className="max-w-3xl text-3xl font-light uppercase tracking-[0.12em] text-white drop-shadow md:text-5xl">
            Elevated resale with a Middle Eastern point of view
          </h1>
          <p className="max-w-xl text-sm text-white/80 md:text-base">
            An edit of rare designer pieces, kept minimal and intentional.
          </p>
          <div className="mt-6 flex items-center gap-4 text-[12px] font-medium uppercase tracking-[0.28em] text-white/80">
            <span className="inline-block h-px w-10 bg-white/50" />
            Shop the drop
            <span className="inline-block h-px w-10 bg-white/50" />
          </div>
        </div>
      </section>

      <section id="search-tools" className="space-y-10">
        <SearchFilters
          categories={categories}
          initialQuery={initialQuery}
          activeCategory={activeCategory}
        />

        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium uppercase tracking-[0.2em]">
          {[{ _id: "all-tab", name: "All", slug: "all" }, ...categories.slice(0, 5)].map((tab) => {
            const isActive = activeCategory === tab.slug;
            const params = new URLSearchParams();
            if (tab.slug !== "all") {
              params.set("category", tab.slug);
            }
            const href = params.toString() ? `/?${params.toString()}` : "/";
            return (
              <Link
                key={tab._id}
                href={href}
                className="relative pb-2 text-[#111]/70 transition hover:text-[#111]"
              >
                <span>{tab.name}</span>
                <span
                  className={`absolute inset-x-1 -bottom-0.5 h-[1px] bg-[#111] transition-transform duration-300 ${
                    isActive ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featuredTiles.map((tile) => (
            <Link
              key={tile.label}
              href={`/?category=${tile.slug}`}
              className="group relative block overflow-hidden rounded-[14px] border border-[#ededed] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,0,0,0.08)]"
            >
              <div className="relative h-[340px]">
                <Image
                  src={tile.image}
                  alt={tile.label}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex items-center justify-between px-5 py-4 text-sm font-medium uppercase tracking-[0.16em] text-[#111]">
                {tile.label}
                <span className="text-xs text-[#111]/50">Explore</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="catalog" className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#555]">
              New Arrivals
            </p>
            <h2 className="text-2xl font-light uppercase tracking-[0.12em] md:text-3xl">
              Fresh finds this week
            </h2>
          </div>
          <Link
            href="/sell"
            className="text-xs font-semibold uppercase tracking-[0.24em] text-[#111]/70 underline-offset-4 hover:text-[#111] hover:underline"
          >
            Sell an item
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {listings.length === 0 ? (
            <div className="col-span-full rounded-[14px] border border-dashed border-[#e5e5e5] bg-[#fafafa] py-14 text-center text-sm text-[#666]">
              No items yet. Be the first to list a piece.
            </div>
          ) : (
            listings.map((item: any) => (
              <Link
                key={item._id}
                href={`/items/${item._id}`}
                className="group block overflow-hidden rounded-[14px] border border-[#ededed] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.06)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,0,0,0.09)]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#f7f7f7]">
                  <WishlistButton
                    listingId={item._id}
                    initiallyWishlisted={wishlistIds.includes(item._id)}
                    disabled={item.status === "sold"}
                    className="absolute right-4 top-4 z-10"
                  />
                  {item.status === "sold" && (
                    <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/50 text-sm font-semibold uppercase tracking-[0.3em] text-white">
                      Sold Out
                    </div>
                  )}
                  <Image
                    src={item.images[0]}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between text-sm font-medium text-[#111]">
                    <h3 className="line-clamp-1 pr-3 uppercase tracking-[0.08em]">
                      {item.title}
                    </h3>
                    <span className="shrink-0 text-[15px] font-semibold tracking-tight">
                      ${item.price}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-[#555]">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[#666]">
                    <span className="rounded-full bg-[#f4f4f4] px-3 py-1 capitalize">
                      {item.condition}
                    </span>
                    <span className="rounded-full bg-[#f4f4f4] px-3 py-1 capitalize">
                      {item.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section
        id="about"
        className="rounded-[14px] border border-[#ededed] bg-white/60 px-6 py-10 shadow-[0_16px_40px_rgba(0,0,0,0.05)]"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#555]">
              The Edit
            </p>
            <h3 className="text-xl font-light uppercase tracking-[0.12em]">
              Minimal, intentional, rare
            </h3>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-[#555]">
            ARCHIF is a curated resale space for designer pieces with character.
            Each drop is edited for quality, modern silhouettes, and quietly bold
            details—no clutter, just essentials worth keeping.
          </p>
        </div>
      </section>
    </div>
  );
}
