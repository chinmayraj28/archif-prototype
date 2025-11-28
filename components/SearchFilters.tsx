"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Category = {
    _id: string;
    name: string;
    slug: string;
};

type Props = {
    categories: Category[];
    initialQuery?: string;
    activeCategory?: string;
};

export default function SearchFilters({ categories, initialQuery = "", activeCategory = "all" }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(initialQuery);
    const [category, setCategory] = useState(activeCategory);
    const [isPending, startTransition] = useTransition();

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (query) {
            params.set("query", query);
        } else {
            params.delete("query");
        }

        if (category && category !== "all") {
            params.set("category", category);
        } else {
            params.delete("category");
        }

        startTransition(() => {
            router.push(params.toString() ? `/?${params.toString()}` : "/");
        });
    }

    return (
        <form
            onSubmit={submitSearch}
            className="grid gap-3 rounded-[16px] border border-[#ededed] bg-white/80 p-4 shadow-sm md:grid-cols-[2fr,1fr,auto]"
        >
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title..."
            />
            <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="capitalize">
                    <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat.slug} className="capitalize">
                            {cat.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button type="submit" disabled={isPending}>
                {isPending ? "Searching..." : "Search"}
            </Button>
        </form>
    );
}

