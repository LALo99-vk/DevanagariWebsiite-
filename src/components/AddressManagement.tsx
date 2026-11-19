import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, MapPin, Star, Check, X } from "lucide-react";
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


  const field = (
    key: keyof Omit<AddressFormData, "is_default">,
    label: string,
    opts: { required?: boolean; type?: string; placeholder?: string; autoComplete?: string } = {}
  ) => (
    <label className="block">
      <span className="text-[13px] font-semibold text-mist">
        {label}
        {opts.required && <span className="text-gold-400"> *</span>}
      </span>
      <input
        type={opts.type || "text"}
        required={opts.required}
        autoComplete={opts.autoComplete}
        placeholder={opts.placeholder}
        value={formData[key]}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        className="field-dark"
      />
    </label>
  );

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gold-400/20 border-t-gold-400" />
        <p className="text-sm text-mist">Loading addresses…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-cream">Address Management</h2>
        <button onClick={() => setShowForm(true)} className="btn-gold whitespace-nowrap !px-4 !py-2.5">
          <Plus size={16} />
          Add Address
        </button>
      </div>

      {/* Address list */}
      {addresses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gold-400/30 px-6 py-10 text-center">
          <MapPin size={32} strokeWidth={1.5} className="mx-auto text-gold-400" />
          <p className="mt-4 text-cream">No addresses saved yet</p>
          <p className="mt-1 text-sm text-mist">
            Add your first address to get started with faster checkout
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={`flex flex-col rounded-xl border p-5 transition-colors ${
                address.is_default
                  ? "border-gold-400/60"
                  : "border-gold-400/20 hover:border-gold-400/45"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-cream">{address.name}</h3>
                  {address.is_default && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-semibold text-emerald-950">
                      <Star size={11} fill="currentColor" />
                      Default
                    </span>
                  )}
                </div>
                <div className="-mr-2 -mt-1 flex shrink-0">
                  <button
                    onClick={() => handleEdit(address)}
                    aria-label={`Edit address for ${address.name}`}
                    title="Edit address"
                    className="grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:bg-gold-400/10 hover:text-gold-200"
                  >
                    <Edit size={16} strokeWidth={1.7} />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    aria-label={`Delete address for ${address.name}`}
                    title="Delete address"
                    className="grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:bg-[#F0A08C]/10 hover:text-[#F0A08C]"
                  >
                    <Trash2 size={16} strokeWidth={1.7} />
                  </button>
                </div>
              </div>

              <address className="mt-3 space-y-0.5 text-sm not-italic leading-relaxed text-mist">
                <p>{address.address_line_1}</p>
                {address.address_line_2 && <p>{address.address_line_2}</p>}
                <p>
                  {address.city}, {address.state} {address.postal_code}
                </p>
                <p>{address.country}</p>
                <p className="pt-1 font-semibold text-cream tabular-nums">{address.phone}</p>
              </address>

              {!address.is_default && (
                <button
                  onClick={() => handleSetDefault(address.id)}
                  className="btn-outline-gold mt-4 w-full !py-2"
                >
                  Set as Default
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Address form */}
      {showForm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={resetForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-form-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-gold-400/25 bg-emerald-900 p-6 sm:p-8 text-cream shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between">
              <h3 id="address-form-title" className="font-display text-2xl">
                {editingAddress ? "Edit Address" : "Add New Address"}
              </h3>
              <button
                onClick={resetForm}
                aria-label="Close"
                className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:bg-gold-400/10 hover:text-cream"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {field("name", "Full Name", { required: true, autoComplete: "name" })}
              {field("phone", "Phone Number", { required: true, type: "tel", autoComplete: "tel" })}
              {field("address_line_1", "Address Line 1", {
                required: true,
                autoComplete: "address-line1",
                placeholder: "Street address, P.O. box, etc.",
              })}
              {field("address_line_2", "Address Line 2", {
                autoComplete: "address-line2",
                placeholder: "Apartment, suite, unit, building, floor, etc.",
              })}
              <div className="grid grid-cols-2 gap-5">
                {field("city", "City", { required: true, autoComplete: "address-level2" })}
                {field("state", "State", { required: true, autoComplete: "address-level1" })}
              </div>
              <div className="grid grid-cols-2 gap-5">
                {field("postal_code", "Postal Code", { required: true, autoComplete: "postal-code" })}
                <label className="block">
                  <span className="text-[13px] font-semibold text-mist">
                    Country<span className="text-gold-400"> *</span>
                  </span>
                  <select
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="field-dark [&>option]:bg-emerald-900"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-3 pt-1 text-sm text-cream">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#D4A63E]"
                />
                Set as default address
              </label>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3">
                <button type="button" onClick={resetForm} className="btn-outline-gold flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-gold flex-1">
                  <Check size={16} />
                  {editingAddress ? "Update Address" : "Add Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
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
