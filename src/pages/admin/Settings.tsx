import React, { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Mail,
  Globe,
  Shield,
  Database,
  Bell,
  Palette,
  IndianRupee,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";

interface Settings {
  site_name: string;
  site_description: string;
  site_url: string;
  admin_email: string;
  support_email: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  email_notifications: boolean;
  order_notifications: boolean;
  low_stock_threshold: number;
  free_shipping_threshold: number;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

const Settings: React.FC = () => {
  const { logAdminAction, isSuperAdmin } = useAdmin();
  const [settings, setSettings] = useState<Settings>({
    site_name: "Devanagari Health Mix",
    site_description: "Premium blend of 21 natural grains, millets, and pulses",
    site_url: "https://devanagari.com",
    admin_email: "admin@devanagari.com",
    support_email: "support@devanagari.com",
    currency: "INR",
    currency_symbol: "₹",
    timezone: "Asia/Kolkata",
    maintenance_mode: false,
    registration_enabled: true,
    email_notifications: true,
    order_notifications: true,
    low_stock_threshold: 10,
    free_shipping_threshold: 500,
    tax_rate: 18,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch from a settings table
      // For now, we'll use the default settings
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // In a real app, you'd save to a settings table
      // For now, we'll just simulate the save
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await logAdminAction({
        action_type: "update",
        resource_type: "settings",
        resource_id: "global",
        old_values: null,
        new_values: settings,
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      setMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({
        type: "error",
        text: "Failed to save settings. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Settings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
      updated_at: new Date().toISOString(),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-adm-forest"></div>
      </div>
    );
  }

  return (
    <div>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="adm-title"><em>Settings</em></h1>
          <p className="adm-lede">
            Manage system configuration and preferences
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg border border-adm-rule text-sm font-medium text-white bg-adm-forest hover:bg-adm-forest-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mt-4 p-4 rounded-lg ${
 message.type === "success"
 ? "bg-adm-sage-wash border border-adm-forest"
 : "bg-adm-brick-wash border border-adm-brick"
 }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-adm-forest" />
              ) : (
                <AlertCircle className="h-5 w-5 text-adm-brick" />
              )}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
 message.type === "success" ? "text-adm-sage-ink" : "text-adm-brick-ink"
 }`}
              >
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-8">
        {/* General Settings */}
        <div className="bg-adm-raised border border-adm-rule rounded-lg">
          <div className="px-6 py-4 border-b border-adm-rule">
            <h3 className="adm-h2 flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2" />
              General Settings
            </h3>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) =>
                    handleInputChange("site_name", e.target.value)
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Site URL
                </label>
                <input
                  type="url"
                  value={settings.site_url}
                  onChange={(e) =>
                    handleInputChange("site_url", e.target.value)
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-adm-ink-2">
                Site Description
              </label>
              <textarea
                rows={3}
                value={settings.site_description}
                onChange={(e) =>
                  handleInputChange("site_description", e.target.value)
                }
                className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) =>
                    handleInputChange("timezone", e.target.value)
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">
                    America/New_York (EST)
                  </option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) =>
                    handleInputChange("currency", e.target.value)
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-adm-raised border border-adm-rule rounded-lg">
          <div className="px-6 py-4 border-b border-adm-rule">
            <h3 className="adm-h2 flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Settings
            </h3>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={settings.admin_email}
                  onChange={(e) =>
                    handleInputChange("admin_email", e.target.value)
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) =>
                    handleInputChange("support_email", e.target.value)
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email_notifications"
                  checked={settings.email_notifications}
                  onChange={(e) =>
                    handleInputChange("email_notifications", e.target.checked)
                  }
                  className="h-4 w-4 text-adm-forest focus:ring-adm-forest border-adm-rule rounded"
                />
                <label
                  htmlFor="email_notifications"
                  className="ml-2 block text-sm text-adm-ink"
                >
                  Enable email notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="order_notifications"
                  checked={settings.order_notifications}
                  onChange={(e) =>
                    handleInputChange("order_notifications", e.target.checked)
                  }
                  className="h-4 w-4 text-adm-forest focus:ring-adm-forest border-adm-rule rounded"
                />
                <label
                  htmlFor="order_notifications"
                  className="ml-2 block text-sm text-adm-ink"
                >
                  Send order notifications to admin
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Business Settings */}
        <div className="bg-adm-raised border border-adm-rule rounded-lg">
          <div className="px-6 py-4 border-b border-adm-rule">
            <h3 className="adm-h2 flex items-center">
              <IndianRupee className="h-5 w-5 mr-2" />
              Business Settings
            </h3>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.tax_rate}
                  onChange={(e) =>
                    handleInputChange("tax_rate", parseFloat(e.target.value))
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.free_shipping_threshold}
                  onChange={(e) =>
                    handleInputChange(
                      "free_shipping_threshold",
                      parseFloat(e.target.value)
                    )
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-adm-ink-2">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.low_stock_threshold}
                  onChange={(e) =>
                    handleInputChange(
                      "low_stock_threshold",
                      parseInt(e.target.value)
                    )
                  }
                  className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-adm-raised border border-adm-rule rounded-lg">
          <div className="px-6 py-4 border-b border-adm-rule">
            <h3 className="adm-h2 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              System Settings
            </h3>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="maintenance_mode"
                  checked={settings.maintenance_mode}
                  onChange={(e) =>
                    handleInputChange("maintenance_mode", e.target.checked)
                  }
                  className="h-4 w-4 text-adm-forest focus:ring-adm-forest border-adm-rule rounded"
                />
                <label
                  htmlFor="maintenance_mode"
                  className="ml-2 block text-sm text-adm-ink"
                >
                  Enable maintenance mode
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="registration_enabled"
                  checked={settings.registration_enabled}
                  onChange={(e) =>
                    handleInputChange("registration_enabled", e.target.checked)
                  }
                  className="h-4 w-4 text-adm-forest focus:ring-adm-forest border-adm-rule rounded"
                />
                <label
                  htmlFor="registration_enabled"
                  className="ml-2 block text-sm text-adm-ink"
                >
                  Allow user registration
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-adm-raised border border-adm-rule rounded-lg">
          <div className="px-6 py-4 border-b border-adm-rule">
            <h3 className="adm-h2 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Information
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-adm-ink-3">
                  Last Updated
                </label>
                <p className="mt-1 text-sm text-adm-ink">
                  {new Date(settings.updated_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-adm-ink-3">
                  Created
                </label>
                <p className="mt-1 text-sm text-adm-ink">
                  {new Date(settings.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
