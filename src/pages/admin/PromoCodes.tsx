import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Percent,
  DollarSign,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed" | "shipping";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

const PromoCodes: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Debug: Log user and admin status
  console.log("PromoCodes - User:", user);
  console.log("PromoCodes - User ID:", user?.id);
  console.log("PromoCodes - User Email:", user?.email);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed" | "shipping",
    discount_value: 0,
    min_order_amount: 0,
    max_discount_amount: "",
    usage_limit: "",
    is_active: true,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      showError("Error", "Failed to fetch promo codes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        max_discount_amount: formData.max_discount_amount
          ? parseFloat(formData.max_discount_amount)
          : null,
        usage_limit: formData.usage_limit
          ? parseInt(formData.usage_limit)
          : null,
        valid_until: formData.valid_until || null,
        created_by: user?.id,
      };

      if (editingPromo) {
        const { error } = await supabase
          .from("promo_codes")
          .update(submitData)
          .eq("id", editingPromo.id);

        if (error) throw error;
        showSuccess("Success", "Promo code updated successfully");
      } else {
        const { error } = await supabase
          .from("promo_codes")
          .insert([submitData]);

        if (error) throw error;
        showSuccess("Success", "Promo code created successfully");
      }

      setShowModal(false);
      setEditingPromo(null);
      resetForm();
      fetchPromoCodes();
    } catch (error) {
      console.error("Error saving promo code:", error);
      showError("Error", "Failed to save promo code");
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_order_amount: promo.min_order_amount,
      max_discount_amount: promo.max_discount_amount?.toString() || "",
      usage_limit: promo.usage_limit?.toString() || "",
      is_active: promo.is_active,
      valid_from: promo.valid_from.split("T")[0],
      valid_until: promo.valid_until?.split("T")[0] || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      console.log("Deleting promo code with ID:", id);

      // First, let's check if the promo code exists and get its details
      const { data: existingPromo, error: fetchError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("Error fetching promo code:", fetchError);
        throw new Error(`Failed to fetch promo code: ${fetchError.message}`);
      }

      console.log("Found promo code to delete:", existingPromo);

      // Now try to delete it
      const { error, count } = await supabase
        .from("promo_codes")
        .delete({ count: "exact" })
        .eq("id", id);

      if (error) {
        console.error("Delete error:", error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log("Delete result - error:", error, "count:", count);

      if (count === 0) {
        throw new Error(
          "No rows were deleted. The promo code may not exist or you may not have permission to delete it."
        );
      }

      console.log("Delete successful, refreshing list...");
      showSuccess("Success", "Promo code deleted successfully");

      // Immediately remove from local state
      setPromoCodes((prev) => prev.filter((promo) => promo.id !== id));

      // Also refresh from database to be sure
      await fetchPromoCodes();
    } catch (error) {
      console.error("Error deleting promo code:", error);
      showError("Error", `Failed to delete promo code: ${error.message}`);
    } finally {
      setShowDeleteModal(null);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      min_order_amount: 0,
      max_discount_amount: "",
      usage_limit: "",
      is_active: true,
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: "",
    });
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <Percent className="w-4 h-4" />;
      case "fixed":
        return <DollarSign className="w-4 h-4" />;
      case "shipping":
        return <Truck className="w-4 h-4" />;
      default:
        return <Percent className="w-4 h-4" />;
    }
  };

  const getDiscountText = (promo: PromoCode) => {
    switch (promo.discount_type) {
      case "percentage":
        return `${promo.discount_value}% off`;
      case "fixed":
        return `₹${promo.discount_value} off`;
      case "shipping":
        return "Free shipping";
      default:
        return `${promo.discount_value}% off`;
    }
  };

  const isExpired = (validUntil?: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isUpcoming = (validFrom: string) => {
    return new Date(validFrom) > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A5C3D]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#4A5C3D]">Promo Codes</h1>
          <p className="text-gray-600">
            Manage promotional codes and discounts
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPromo(null);
            setShowModal(true);
          }}
          className="bg-[#4A5C3D] text-white px-4 py-2 rounded-lg hover:bg-[#3a4a2f] transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Promo Code</span>
        </button>
      </div>

      {/* Promo Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promoCodes.map((promo) => (
          <div
            key={promo.id}
            className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
              promo.is_active
                ? isExpired(promo.valid_until)
                  ? "border-red-500"
                  : isUpcoming(promo.valid_from)
                  ? "border-yellow-500"
                  : "border-green-500"
                : "border-gray-400"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                {getDiscountIcon(promo.discount_type)}
                <h3 className="font-bold text-lg text-[#4A5C3D]">
                  {promo.code}
                </h3>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleEdit(promo)}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteModal(promo.id)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">{promo.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount:</span>
                <span className="font-semibold">{getDiscountText(promo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Min Order:</span>
                <span>₹{promo.min_order_amount}</span>
              </div>
              {promo.max_discount_amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max Discount:</span>
                  <span>₹{promo.max_discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Usage:</span>
                <span>
                  {promo.used_count}
                  {promo.usage_limit ? ` / ${promo.usage_limit}` : " / ∞"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {isExpired(promo.valid_until)
                    ? "Expired"
                    : isUpcoming(promo.valid_from)
                    ? "Upcoming"
                    : "Active"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {promo.is_active ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-gray-400" />
                )}
                <span>{promo.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {promoCodes.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No Promo Codes
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first promo code to get started
          </p>
          <button
            onClick={() => {
              resetForm();
              setEditingPromo(null);
              setShowModal(true);
            }}
            className="bg-[#4A5C3D] text-white px-6 py-2 rounded-lg hover:bg-[#3a4a2f] transition-colors"
          >
            Create Promo Code
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#4A5C3D]">
                  {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                      placeholder="WELCOME10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_type: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="shipping">Free Shipping</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    placeholder="10% off on your first order"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_value: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                      placeholder="10"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Order Amount
                    </label>
                    <input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_order_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Discount Amount
                    </label>
                    <input
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_discount_amount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                      placeholder="100"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usage_limit: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                      placeholder="1000"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid From *
                    </label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) =>
                        setFormData({ ...formData, valid_from: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valid_until: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="w-4 h-4 text-[#4A5C3D] border-gray-300 rounded focus:ring-[#4A5C3D]"
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm font-medium text-gray-700"
                  >
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4A5C3D] text-white rounded-lg hover:bg-[#3a4a2f] transition-colors"
                  >
                    {editingPromo ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Promo Code
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this promo code? This action
                cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteModal)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodes;
