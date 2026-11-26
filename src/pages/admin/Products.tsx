import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";
import StockPouch, { LOW_STOCK } from "../../components/admin/StockPouch";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  weight: number;
  created_at: string;
}

const EMPTY_FORM = { name: "", description: "", price: "", image_url: "", stock: "", weight: "" };

const Products: React.FC = () => {
  const { logAdminAction } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Deep links from the shelf: ?edit=<id> opens that product, ?new=1 a blank form.
  useEffect(() => {
    if (loading) return;
    const editId = searchParams.get("edit");
    if (editId) {
      const product = products.find((p) => p.id === editId);
      if (product) handleEdit(product);
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("new")) {
      openNew();
      setSearchParams({}, { replace: true });
    }
  }, [loading, searchParams]);

  const fetchProducts = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching products:", error);
      setLoadError("Products could not be loaded. Refresh the page to try again.");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  const openNew = () => {
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        stock: parseInt(formData.stock),
        weight: parseInt(formData.weight),
      };

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;

        await logAdminAction({
          action_type: "update",
          resource_type: "product",
          resource_id: editingProduct.id,
          old_values: editingProduct,
          new_values: productData,
          ip_address: null,
          user_agent: navigator.userAgent,
        });

        setProducts(products.map((p) => (p.id === editingProduct.id ? { ...p, ...productData } : p)));
      } else {
        const { data, error } = await supabase.from("products").insert([productData]).select().single();
        if (error) throw error;

        await logAdminAction({
          action_type: "create",
          resource_type: "product",
          resource_id: data.id,
          old_values: null,
          new_values: productData,
          ip_address: null,
          user_agent: navigator.userAgent,
        });

        setProducts([data, ...products]);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving product:", error);
      setFormError("The product could not be saved. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      image_url: product.image_url || "",
      stock: product.stock.toString(),
      weight: product.weight.toString(),
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleDelete = async (product: Product) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;

      await logAdminAction({
        action_type: "delete",
        resource_type: "product",
        resource_id: product.id,
        old_values: product,
        new_values: null,
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      setProducts(products.filter((p) => p.id !== product.id));
      setConfirmDelete(null);
    } catch (error) {
      console.error("Error deleting product:", error);
      setLoadError(
        `"${product.name}" could not be deleted. Products that appear in past orders can't be removed; set its stock to 0 instead.`
      );
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: formData[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData({ ...formData, [key]: e.target.value }),
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="adm-title">
            <em>Products</em>
          </h1>
          <p className="adm-lede">Prices, pack sizes and stock. Changes show on the shop straight away.</p>
        </div>
        <button onClick={openNew} className="adm-btn self-start sm:self-auto">
          <Plus size={16} /> Add product
        </button>
      </div>

      <label className="relative mt-6 block max-w-md">
        <span className="sr-only">Search products</span>
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-adm-ink-3" />
        <input
          type="search"
          placeholder="Search by name or description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="adm-input pl-10"
        />
      </label>

      {loadError && (
        <p className="mt-4 rounded-lg bg-adm-brick-wash px-4 py-3 text-sm font-semibold text-adm-brick-ink">{loadError}</p>
      )}

      <div className="adm-panel mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[15px]">
          <thead className="bg-adm-sunk text-xs font-bold text-adm-ink-2">
            <tr>
              <th scope="col" className="px-5 py-3">Product</th>
              <th scope="col" className="px-4 py-3 text-right">Price</th>
              <th scope="col" className="px-4 py-3 text-right">Pack</th>
              <th scope="col" className="px-4 py-3">Stock</th>
              <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [0, 1, 2].map((i) => (
                <tr key={i} className="border-t border-adm-rule-soft">
                  <td colSpan={5} className="px-5 py-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-adm-sunk" />
                  </td>
                </tr>
              ))}
            {!loading &&
              filteredProducts.map((product) => {
                const low = product.stock < LOW_STOCK;
                return (
                  <tr key={product.id} className="border-t border-adm-rule-soft align-middle hover:bg-adm-paper">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg border border-adm-rule bg-adm-sunk object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-lg border border-adm-rule bg-adm-sunk" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold">{product.name}</div>
                          <div className="max-w-[46ch] truncate text-sm text-adm-ink-2">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="adm-num px-4 py-4 text-right font-bold">₹{product.price}</td>
                    <td className="adm-num px-4 py-4 text-right text-adm-ink-2">{product.weight}g</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <StockPouch stock={product.stock} size="sm" />
                        <span className={`adm-num font-semibold ${low ? "text-adm-brick-ink" : ""}`}>
                          {product.stock} left
                        </span>
                        {low && <span className="adm-chip adm-chip-brick">{product.stock === 0 ? "Out of stock" : "Low"}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-adm-forest hover:bg-adm-sage-wash"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(product)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-adm-brick hover:bg-adm-brick-wash"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && filteredProducts.length === 0 && (
              <tr className="border-t border-adm-rule-soft">
                <td colSpan={5} className="px-5 py-10 text-center text-adm-ink-2">
                  {products.length === 0 ? "No products yet. Add your first pack." : `No products match "${searchTerm}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
          <div className="fixed inset-0 bg-adm-ink/50" onClick={closeModal} />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-xl rounded-xl border border-adm-rule bg-adm-raised shadow-[0_24px_48px_-12px_rgba(11,33,24,0.35)]"
          >
            <div className="flex items-center justify-between border-b border-adm-rule px-6 py-4">
              <h2 id="product-form-title" className="adm-h2">
                {editingProduct ? "Edit product" : "Add product"}
              </h2>
              <button type="button" onClick={closeModal} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-adm-sunk" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="adm-label">Name</span>
                <input type="text" required className="adm-input" {...field("name")} />
              </label>
              <label className="sm:col-span-2">
                <span className="adm-label">Description</span>
                <textarea rows={3} required className="adm-input resize-y" {...field("description")} />
              </label>
              <label>
                <span className="adm-label">Price (₹)</span>
                <input type="number" step="0.01" min="0" required className="adm-input adm-num" {...field("price")} />
              </label>
              <label>
                <span className="adm-label">Pack weight (g)</span>
                <input type="number" min="0" required className="adm-input adm-num" {...field("weight")} />
              </label>
              <label>
                <span className="adm-label">Stock (packs)</span>
                <input type="number" min="0" required className="adm-input adm-num" {...field("stock")} />
              </label>
              <label>
                <span className="adm-label">Image URL</span>
                <input type="url" className="adm-input" {...field("image_url")} />
              </label>
              {formError && (
                <p className="rounded-lg bg-adm-brick-wash px-3 py-2 text-sm font-semibold text-adm-brick-ink sm:col-span-2">{formError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-adm-rule bg-adm-sunk/60 px-6 py-4">
              <button type="button" onClick={closeModal} className="adm-btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="adm-btn">
                {saving ? "Saving…" : editingProduct ? "Save changes" : "Add product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="fixed inset-0 bg-adm-ink/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-adm-rule bg-adm-raised p-6 shadow-[0_24px_48px_-12px_rgba(11,33,24,0.35)]">
            <h2 id="delete-title" className="adm-h2">Delete {confirmDelete.name}?</h2>
            <p className="mt-2 text-[15px] text-adm-ink-2">
              It disappears from the shop. This can't be undone. To stop selling it for a while, set its stock to 0 instead.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="adm-btn-ghost">Keep it</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="adm-btn-danger">
                {deleting ? "Deleting…" : "Delete product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
