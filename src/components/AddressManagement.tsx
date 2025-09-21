import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin, Star, Check } from "lucide-react";
import { addressService, UserAddress } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../lib/supabaseClient";
import ConfirmationModal from "./ConfirmationModal";

interface AddressFormData {
  name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const AddressManagement: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    name: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("🔄 Fetching user addresses...");
      console.log("User ID:", user.id);

      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching addresses:", error);
        throw error;
      }

      console.log("✅ Addresses fetched successfully:", data);
      setAddresses(data || []);
    } catch (error) {
      console.error("❌ Error fetching addresses:", error);
      setAddresses([]);
    } finally {
      console.log("🏁 Addresses fetch completed - setting loading to false");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      console.log("💾 Saving address to database...");
      console.log("📊 Address data being saved:", formData);

      if (editingAddress) {
        console.log("🔄 Updating existing address:", editingAddress.id);
        await addressService.updateAddress(editingAddress.id, formData);
        console.log("✅ Address updated successfully!");
      } else {
        console.log("➕ Creating new address for user:", user.id);
        await addressService.createAddress(user.id, formData);
        console.log("✅ Address created successfully!");
      }

      await fetchAddresses();
      resetForm();
      showSuccess("Address Saved", "Address saved successfully!");
    } catch (error) {
      console.error("❌ Error saving address:", error);
      showError("Save Failed", "Failed to save address. Please try again.");
    }
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
    setFormData({
      name: address.name,
      phone: address.phone,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || "",
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    });
    setShowForm(true);
  };

  const handleDelete = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;

    try {
      await addressService.deleteAddress(addressToDelete);
      await fetchAddresses();
      showSuccess("Address Deleted", "Address deleted successfully!");
    } catch (error) {
      console.error("Error deleting address:", error);
      showError("Delete Failed", "Failed to delete address. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setAddressToDelete(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) return;

    try {
      await addressService.setDefaultAddress(addressId, user.id);
      await fetchAddresses();
      showSuccess(
        "Default Address Updated",
        "Default address updated successfully!"
      );
    } catch (error) {
      console.error("Error setting default address:", error);
      showError(
        "Update Failed",
        "Failed to set default address. Please try again."
      );
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "India",
      is_default: false,
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A5C3D] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading addresses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#4A5C3D]">
          Address Management
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-x-2 bg-[#4A5C3D] text-white px-4 py-2 rounded-lg hover:bg-[#3a4a2f] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Address
        </button>
      </div>

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No addresses saved yet</p>
          <p className="text-sm text-gray-500">
            Add your first address to get started with faster checkout
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-[#4A5C3D] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-x-2">
                  <MapPin className="h-5 w-5 text-[#4A5C3D]" />
                  <h3 className="font-semibold text-[#4A5C3D]">
                    {address.name}
                  </h3>
                  {address.is_default && (
                    <span className="inline-flex items-center gap-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      <Star className="h-3 w-3" />
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-x-2">
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-1 text-gray-400 hover:text-[#4A5C3D] transition-colors"
                    title="Edit address"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete address"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>{address.address_line_1}</p>
                {address.address_line_2 && <p>{address.address_line_2}</p>}
                <p>
                  {address.city}, {address.state} {address.postal_code}
                </p>
                <p>{address.country}</p>
                <p className="font-medium">{address.phone}</p>
              </div>

              {!address.is_default && (
                <button
                  onClick={() => handleSetDefault(address.id)}
                  className="w-full text-sm text-[#4A5C3D] font-medium py-2 border border-[#4A5C3D] rounded-lg hover:bg-[#4A5C3D] hover:text-white transition-colors"
                >
                  Set as Default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#4A5C3D]">
                  {editingAddress ? "Edit Address" : "Add New Address"}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address_line_1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address_line_1: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    placeholder="Street address, P.O. box, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address_line_2: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.postal_code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          postal_code: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <select
                      required
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) =>
                      setFormData({ ...formData, is_default: e.target.checked })
                    }
                    className="h-4 w-4 text-[#4A5C3D] focus:ring-[#4A5C3D] border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_default"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Set as default address
                  </label>
                </div>

                <div className="flex gap-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#4A5C3D] text-white rounded-lg hover:bg-[#3a4a2f] transition-colors flex items-center justify-center gap-x-2"
                  >
                    <Check className="h-4 w-4" />
                    {editingAddress ? "Update Address" : "Add Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default AddressManagement;
