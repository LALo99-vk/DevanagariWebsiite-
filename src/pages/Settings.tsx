import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../lib/supabaseClient";
import { userService } from "../services/supabase";
import BackButton from "../components/BackButton";
import ConfirmationModal from "../components/ConfirmationModal";
import { Check, Edit, MapPin, Plus, Star, Trash2, Upload, X } from "lucide-react";

interface Address {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

const Settings = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"profile" | "addresses">(
    "profile"
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  // Profile editing state
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  // Address management state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
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

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.user_metadata?.full_name || "",
        email: user.email || "",
        phone:
          user.user_metadata?.phone || user.user_metadata?.phone_number || "",
      });
      setAvatarPreview(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  // Handle URL parameter for tab switching
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "addresses") {
      setActiveTab("addresses");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      showError("Address Error", "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      console.log("📤 Starting avatar upload...");
      console.log("📊 File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Check if file size is reasonable (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        console.error("❌ File too large:", file.size, "bytes");
        throw new Error("File size must be less than 2MB");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("📁 Uploading to path:", filePath);

      // Add timeout to avatar upload
      const uploadPromise = supabase.storage
        .from("avatars")
        .upload(filePath, file);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Avatar upload timeout")), 15000)
      );

      const { error: uploadError } = (await Promise.race([
        uploadPromise,
        timeoutPromise,
      ])) as any;

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);

        // If bucket doesn't exist, provide helpful error message
        if (
          uploadError.message.includes("not found") ||
          uploadError.message.includes("bucket")
        ) {
          console.error(
            "❌ Avatars bucket not found. Please create a 'avatars' bucket in Supabase Storage."
          );
          throw new Error(
            "Storage bucket 'avatars' not found. Please contact administrator."
          );
        }

        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      console.log("✅ Avatar uploaded successfully:", data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error("❌ Error uploading avatar:", error);
      return null;
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    console.log("🔄 Starting profile update...");
    setSaving(true);

    try {
      let avatarUrl = user.user_metadata?.avatar_url;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        console.log("📤 Uploading avatar to storage...");
        try {
          const uploadedUrl = await uploadAvatar(avatarFile);
          if (uploadedUrl) {
            avatarUrl = uploadedUrl;
            console.log("✅ Avatar uploaded successfully:", uploadedUrl);
          } else {
            console.warn("⚠️ Avatar upload failed, using existing avatar");
          }
        } catch (error) {
          console.warn(
            "⚠️ Avatar upload failed, continuing without avatar update:",
            error
          );
          // Continue with profile update even if avatar upload fails
        }
      }

      // Update the user in the database
      console.log("💾 Saving profile to database...");
      console.log("📊 Profile data being saved:", {
        id: user.id,
        email: user.email || "",
        name: profileData.full_name,
        avatar_url: avatarUrl,
      });

      // Add timeout to prevent hanging
      const savePromise = userService.createOrUpdateUser({
        id: user.id,
        email: user.email || "",
        name: profileData.full_name,
        avatar_url: avatarUrl,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database save timeout")), 10000)
      );

      try {
        await Promise.race([savePromise, timeoutPromise]);
        console.log("✅ Profile successfully saved to database!");

        // Refresh user data from database to get the latest information
        await refreshUser();
      } catch (error) {
        console.warn(
          "⚠️ Database save failed, updating local state only:",
          error
        );

        // Fallback: Update local user state directly
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            full_name: profileData.full_name,
            phone: profileData.phone,
            phone_number: profileData.phone,
            name: profileData.full_name,
            avatar_url: avatarUrl,
          },
        };
        updateUser(updatedUser);
      }

      console.log("✅ Profile updated in database and refreshed locally!");
      showSuccess(
        "Profile Updated",
        "Your profile has been updated successfully!"
      );
      setAvatarFile(null);

      // Redirect to profile page after successful update
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (error) {
      console.error("❌ Error updating profile:", error);

      let errorMessage = "Failed to update profile";
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          errorMessage = "Profile update timed out. Please try again.";
        } else if (error.message.includes("Database")) {
          errorMessage = "Database connection issue. Please try again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      showError("Profile Update Failed", errorMessage);
    } finally {
      console.log(
        "🏁 Profile update process finished - setting saving to false"
      );
      setSaving(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      if (editingAddress) {
        // Update existing address
        const { error } = await supabase
          .from("user_addresses")
          .update(addressForm)
          .eq("id", editingAddress.id)
          .eq("user_id", user.id);

        if (error) throw error;
        showSuccess("Address Updated", "Address updated successfully!");
      } else {
        // Create new address
        const { error } = await supabase.from("user_addresses").insert({
          ...addressForm,
          user_id: user.id,
        });

        if (error) throw error;
        showSuccess("Address Added", "Address added successfully!");
      }

      // Reset form
      setAddressForm({
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
      setShowAddressForm(false);
      setEditingAddress(null);
      fetchAddresses();
    } catch (error) {
      console.error("Error saving address:", error);
      showError("Address Error", "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteModal(true);
  };

  const confirmDeleteAddress = async () => {
    if (!user || !addressToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", addressToDelete)
        .eq("user_id", user.id);

      if (error) throw error;
      showSuccess("Address Deleted", "Address deleted successfully!");
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      showError("Delete Error", "Failed to delete address");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setAddressToDelete(null);
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      // First, unset all other addresses as default
      await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Then set the selected address as default
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", user.id);

      if (error) throw error;
      showSuccess("Default Address Updated", "Default address updated!");
      fetchAddresses();
    } catch (error) {
      console.error("Error setting default address:", error);
      showError("Update Error", "Failed to update default address");
    } finally {
      setSaving(false);
    }
  };

  const editAddress = (address: Address) => {
    setAddressForm({
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
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // One underline field on dark, shared by the address form
  const addrField = (
    key: "name" | "phone" | "address_line_1" | "address_line_2" | "city" | "state" | "postal_code",
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
        value={addressForm[key]}
        onChange={(e) => setAddressForm({ ...addressForm, [key]: e.target.value })}
        className="field-dark"
      />
    </label>
  );

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
  };

  if (!user) {
    return (
      <div className="bg-emerald-950 pt-24 min-h-screen flex items-center justify-center text-cream">
        <div className="text-center px-5">
          <h1 className="font-display text-4xl">Settings</h1>
          <p className="mt-3 text-mist">Please sign in to view settings.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile Settings" },
    { id: "addresses", label: "Address Management" },
  ] as const;

  return (
    <div className="bg-emerald-950 pt-24 min-h-screen text-cream">
      <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-8 sm:pt-12 pb-24">
        <BackButton text="Back to Profile" tone="dark" />
        <div className="mt-6 sm:mt-8 mb-8">
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.05]">Settings</h1>
          <p className="mt-2 text-[15px] text-mist">Manage your profile and addresses</p>
        </div>

        {/* Tabs */}
        <div role="tablist" className="mb-8 flex gap-6 sm:gap-8 overflow-x-auto border-b border-gold-400/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-[15px] font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-gold-400 text-gold-300"
                  : "border-transparent text-mist hover:text-cream"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Settings Tab */}
        {activeTab === "profile" && (
          <section className="panel p-5 sm:p-8">
            <h2 className="font-display text-2xl">Profile Information</h2>

            <div className="mt-7 space-y-7">
              {/* Avatar */}
              <div>
                <span className="text-[13px] font-semibold text-mist">Profile Picture</span>
                <div className="mt-3 flex flex-wrap items-center gap-5">
                  <div className="relative shrink-0">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="h-20 w-20 rounded-full object-cover ring-1 ring-gold-400/70 ring-offset-4 ring-offset-emerald-900"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`grid h-20 w-20 place-items-center rounded-full bg-emerald-800 ring-1 ring-gold-400/70 ring-offset-4 ring-offset-emerald-900 ${
                        avatarPreview ? "hidden" : ""
                      }`}
                    >
                      <span className="font-display text-3xl text-gold-300">
                        {profileData.full_name.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="btn-outline-gold cursor-pointer !py-2.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-gold-400">
                      <Upload size={16} strokeWidth={1.8} />
                      Choose photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-2 text-xs text-mist">JPG, PNG or GIF. Max size 2MB.</p>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-[13px] font-semibold text-mist">Full Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="field-dark"
                  placeholder="Enter your full name"
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold text-mist">Email Address</span>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="field-dark cursor-not-allowed !border-gold-400/15 !text-mist"
                />
                <span className="mt-2 block text-xs text-mist">
                  Email cannot be changed. Contact support if needed.
                </span>
              </label>

              <label className="block">
                <span className="text-[13px] font-semibold text-mist">Phone Number</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="field-dark"
                  placeholder="Enter your phone number"
                />
              </label>

              <div className="pt-2">
                <button
                  onClick={updateProfile}
                  disabled={saving}
                  className="btn-gold w-full sm:w-auto !px-8 !py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Address Management Tab */}
        {activeTab === "addresses" && (
          <section className="panel p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Address Management</h2>
              <button
                onClick={() => {
                  setShowAddressForm(true);
                  setEditingAddress(null);
                  setAddressForm({
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
                }}
                className="btn-gold whitespace-nowrap !px-4 !py-2.5"
              >
                <Plus size={16} />
                Add New Address
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gold-400/20 border-t-gold-400" />
                <p className="text-sm text-mist">Loading addresses…</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gold-400/30 px-6 py-10 text-center">
                <MapPin size={32} strokeWidth={1.5} className="mx-auto text-gold-400" />
                <p className="mt-4 text-cream">No addresses saved yet</p>
                <p className="mt-1 text-sm text-mist">Add your first address to make checkout faster</p>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className={`flex flex-col rounded-xl border p-5 transition-colors ${
                      address.is_default ? "border-gold-400/60" : "border-gold-400/20 hover:border-gold-400/45"
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
                          onClick={() => editAddress(address)}
                          aria-label={`Edit address for ${address.name}`}
                          title="Edit address"
                          className="grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:bg-gold-400/10 hover:text-gold-200"
                        >
                          <Edit size={16} strokeWidth={1.7} />
                        </button>
                        <button
                          onClick={() => deleteAddress(address.id)}
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
                        onClick={() => setDefaultAddress(address.id)}
                        className="btn-outline-gold mt-4 w-full !py-2"
                      >
                        Set as Default
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Address form */}
        {showAddressForm && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
            onClick={closeAddressForm}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-address-title"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-gold-400/25 bg-emerald-900 p-6 sm:p-8 text-cream shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between">
                <h3 id="settings-address-title" className="font-display text-2xl">
                  {editingAddress ? "Edit Address" : "Add New Address"}
                </h3>
                <button
                  onClick={closeAddressForm}
                  aria-label="Close"
                  className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-mist transition-colors hover:bg-gold-400/10 hover:text-cream"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddressSubmit} className="mt-6 space-y-5">
                {addrField("name", "Full Name", { required: true, autoComplete: "name", placeholder: "Enter full name" })}
                {addrField("phone", "Phone Number", { required: true, type: "tel", autoComplete: "tel", placeholder: "Enter phone number" })}
                {addrField("address_line_1", "Address Line 1", {
                  required: true,
                  autoComplete: "address-line1",
                  placeholder: "Street address, P.O. box, etc.",
                })}
                {addrField("address_line_2", "Address Line 2", {
                  autoComplete: "address-line2",
                  placeholder: "Apartment, suite, unit, building, floor, etc.",
                })}
                <div className="grid grid-cols-2 gap-5">
                  {addrField("city", "City", { required: true, autoComplete: "address-level2", placeholder: "City" })}
                  {addrField("state", "State", { required: true, autoComplete: "address-level1", placeholder: "State" })}
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {addrField("postal_code", "Postal Code", { required: true, autoComplete: "postal-code", placeholder: "Postal code" })}
                  <label className="block">
                    <span className="text-[13px] font-semibold text-mist">
                      Country<span className="text-gold-400"> *</span>
                    </span>
                    <select
                      required
                      value={addressForm.country}
                      onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
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
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#D4A63E]"
                  />
                  Set as default address
                </label>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3">
                  <button type="button" onClick={closeAddressForm} className="btn-outline-gold flex-1">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-gold flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check size={16} />
                    {saving ? "Saving…" : editingAddress ? "Update Address" : "Add Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteAddress}
          title="Delete Address"
          message="Are you sure you want to delete this address? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="warning"
          isLoading={saving}
        />
      </div>
    </div>
  );
};

export default Settings;
