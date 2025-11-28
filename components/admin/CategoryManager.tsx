"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Category = {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isVisible: boolean;
    sortOrder: number;
};

type CategoryManagerProps = {
    initialCategories: Category[];
};

const emptyForm = {
    name: "",
    slug: "",
    description: "",
    isVisible: true,
    sortOrder: 0,
};

export default function CategoryManager({ initialCategories }: CategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const sortedCategories = useMemo(
        () =>
            [...categories].sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) {
                    return a.sortOrder - b.sortOrder;
                }
                return a.name.localeCompare(b.name);
            }),
        [categories]
    );

    function updateFormField(key: keyof typeof emptyForm, value: string | boolean | number) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function createCategory(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.slug) {
            toast.error("Name and slug are required");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const message = await res.text();
                throw new Error(message || "Failed to create category");
            }

            const newCategory = await res.json();
            setCategories((prev) => [...prev, newCategory]);
            setForm(emptyForm);
            toast.success("Category created");
        } catch (error: any) {
            toast.error(error.message || "Failed to create category");
        } finally {
            setSubmitting(false);
        }
    }

    async function updateCategory(id: string, updates: Partial<Category>) {
        try {
            const res = await fetch(`/api/categories/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                const message = await res.text();
                throw new Error(message || "Failed to update category");
            }

            const updated = await res.json();
            setCategories((prev) => prev.map((cat) => (cat._id === id ? updated : cat)));
            toast.success("Category updated");
        } catch (error: any) {
            toast.error(error.message || "Unable to update category");
        }
    }

    async function deleteCategory(id: string) {
        if (!confirm("Delete this category? Listings using it will keep the old value.")) return;
        try {
            const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) {
                const message = await res.text();
                throw new Error(message || "Failed to delete category");
            }
            setCategories((prev) => prev.filter((cat) => cat._id !== id));
            toast.success("Category deleted");
        } catch (error: any) {
            toast.error(error.message || "Unable to delete category");
        }
    }

    return (
        <div className="space-y-6 rounded-lg border border-[#ededed] bg-white p-6">
            <div>
                <h2 className="text-xl font-semibold">Categories</h2>
                <p className="text-sm text-muted-foreground">
                    Create and organize the categories used across the storefront and listing forms.
                </p>
            </div>

            <form onSubmit={createCategory} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                        value={form.name}
                        onChange={(e) => updateFormField("name", e.target.value)}
                        placeholder="Luxury Handbags"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Slug</label>
                    <Input
                        value={form.slug}
                        onChange={(e) => updateFormField("slug", e.target.value.toLowerCase())}
                        placeholder="handbags"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                        value={form.description}
                        onChange={(e) => updateFormField("description", e.target.value)}
                        placeholder="Optional helper text shown in admin & tooltips"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Sort Order</label>
                    <Input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => updateFormField("sortOrder", Number(e.target.value))}
                    />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={form.isVisible}
                        onChange={(e) => updateFormField("isVisible", e.target.checked)}
                    />
                    Visible on storefront
                </label>
                <div className="md:col-span-2">
                    <Button type="submit" disabled={submitting}>
                        {submitting ? "Saving..." : "Add Category"}
                    </Button>
                </div>
            </form>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-[0.2em]">
                    Existing Categories
                </h3>
                {sortedCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories yet.</p>
                ) : (
                    <div className="space-y-4">
                        {sortedCategories.map((category) => (
                            <div
                                key={category._id}
                                className="rounded-md border border-[#ededed] p-4"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="text-base font-semibold">{category.name}</p>
                                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            {category.slug}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={category.isVisible}
                                                onChange={(e) =>
                                                    updateCategory(category._id, {
                                                        isVisible: e.target.checked,
                                                    })
                                                }
                                            />
                                            Visible
                                        </label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                updateCategory(category._id, {
                                                    sortOrder: category.sortOrder - 1,
                                                })
                                            }
                                        >
                                            ↑
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                updateCategory(category._id, {
                                                    sortOrder: category.sortOrder + 1,
                                                })
                                            }
                                        >
                                            ↓
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => deleteCategory(category._id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                                {category.description && (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {category.description}
                                    </p>
                                )}
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Rename
                                        </label>
                                        <Input
                                            defaultValue={category.name}
                                            onBlur={(e) =>
                                                e.target.value !== category.name &&
                                                updateCategory(category._id, { name: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Slug
                                        </label>
                                        <Input
                                            defaultValue={category.slug}
                                            onBlur={(e) =>
                                                e.target.value !== category.slug &&
                                                updateCategory(category._id, { slug: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

