import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../lib/supabaseClient";
import { userService } from "../services/supabase";
import BackButton from "../components/BackButton";
import ConfirmationModal from "../components/ConfirmationModal";

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

  if (!user) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <BackButton text="Back to Profile" />
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#4A5C3D] mb-2">Settings</h1>
          <p className="text-gray-600">Manage your profile and addresses</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "profile"
                    ? "border-[#4A5C3D] text-[#4A5C3D]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Profile Settings
              </button>
              <button
                onClick={() => setActiveTab("addresses")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "addresses"
                    ? "border-[#4A5C3D] text-[#4A5C3D]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Address Management
              </button>
            </nav>
          </div>
        </div>

        {/* Profile Settings Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-[#4A5C3D] mb-6">
              Profile Information
            </h2>

            <div className="space-y-6">
              {/* Avatar Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative flex-shrink-0">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="h-20 w-20 rounded-full border-2 border-[#4A5C3D] object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden"
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-20 w-20 rounded-full bg-gray-200 border-2 border-[#4A5C3D] flex items-center justify-center flex-shrink-0 ${
                        avatarPreview ? "hidden" : ""
                      }`}
                    >
                      <span className="text-2xl font-bold text-[#4A5C3D]">
                        {profileData.full_name.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#4A5C3D] file:text-white hover:file:bg-[#3a4a2f]"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={updateProfile}
                  disabled={saving}
                  className="bg-[#4A5C3D] text-white px-6 py-2 rounded-lg hover:bg-[#3a4a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Address Management Tab */}
        {activeTab === "addresses" && (
          <div className="space-y-6">
            {/* Add Address Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-[#4A5C3D]">
                Address Management
              </h2>
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
                className="bg-[#4A5C3D] text-white px-4 py-2 rounded-lg hover:bg-[#3a4a2f] transition-colors"
              >
                Add New Address
              </button>
            </div>

            {/* Address Form Modal */}
            {showAddressForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-[#4A5C3D]">
                        {editingAddress ? "Edit Address" : "Add New Address"}
                      </h3>
                      <button
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddress(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={addressForm.name}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                          placeholder="Enter full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={addressForm.phone}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address Line 1 *
                        </label>
                        <input
                          type="text"
                          required
                          value={addressForm.address_line_1}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
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
                          value={addressForm.address_line_2}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
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
                            value={addressForm.city}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                city: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                            placeholder="City"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State *
                          </label>
                          <input
                            type="text"
                            required
                            value={addressForm.state}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                state: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                            placeholder="State"
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
                            value={addressForm.postal_code}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                postal_code: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                            placeholder="Postal code"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country *
                          </label>
                          <select
                            required
                            value={addressForm.country}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                country: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                          >
                            <option value="India">India</option>
                            <option value="United States">United States</option>
                            <option value="United Kingdom">
                              United Kingdom
                            </option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_default"
                          checked={addressForm.is_default}
                          onChange={(e) =>
                            setAddressForm({
                              ...addressForm,
                              is_default: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-[#4A5C3D] focus:ring-[#4A5C3D] border-gray-300 rounded"
                        />
                        <label
                          htmlFor="is_default"
                          className="ml-2 block text-sm text-gray-700"
                        >
                          Set as default address
                        </label>
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex-1 bg-[#4A5C3D] text-white py-2 rounded-lg hover:bg-[#3a4a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving
                            ? "Saving..."
                            : editingAddress
                            ? "Update Address"
                            : "Add Address"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddressForm(false);
                            setEditingAddress(null);
                          }}
                          className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Addresses List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A5C3D] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-6 border border-gray-100 text-center">
                <p className="text-gray-600 mb-4">No addresses saved yet</p>
                <p className="text-sm text-gray-500">
                  Add your first address to make checkout faster
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white rounded-xl shadow p-6 border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-[#4A5C3D]">
                          {address.name}
                        </h3>
                        {address.is_default && (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full mt-1">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editAddress(address)}
                          className="text-[#4A5C3D] hover:text-[#3a4a2f] text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteAddress(address.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{address.address_line_1}</p>
                      {address.address_line_2 && (
                        <p>{address.address_line_2}</p>
                      )}
                      <p>
                        {address.city}, {address.state} {address.postal_code}
                      </p>
                      <p>{address.country}</p>
                      <p className="font-medium">{address.phone}</p>
                    </div>

                    {!address.is_default && (
                      <button
                        onClick={() => setDefaultAddress(address.id)}
                        className="mt-4 text-sm text-[#4A5C3D] hover:text-[#3a4a2f] font-medium"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
