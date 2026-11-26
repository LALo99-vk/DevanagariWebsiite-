import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Edit,
  UserPlus,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: "user" | "admin" | "super_admin";
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const Users: React.FC = () => {
  const { logAdminAction, isSuperAdmin } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "user" as const,
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching users from database...");

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching users:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log("✅ Users fetched successfully:", data?.length || 0, "users");
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Set empty array on error to prevent UI issues
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      await logAdminAction({
        action_type: "update",
        resource_type: "user",
        resource_id: userId,
        old_values: { role: users.find((u) => u.id === userId)?.role },
        new_values: { role: newRole },
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      setUsers(
        users.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: newRole as any,
                updated_at: new Date().toISOString(),
              }
            : user
        )
      );
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const newStatus = !user.is_active;
      const { error } = await supabase
        .from("users")
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      await logAdminAction({
        action_type: newStatus ? "activate" : "deactivate",
        resource_type: "user",
        resource_id: userId,
        old_values: { is_active: user.is_active },
        new_values: { is_active: newStatus },
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      setUsers(
        users.map((user) =>
          user.id === userId
            ? {
                ...user,
                is_active: newStatus,
                updated_at: new Date().toISOString(),
              }
            : user
        )
      );
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Note: In a real app, you'd create the user in auth.users first
      // For now, we'll just create a placeholder user record
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            is_active: newUser.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await logAdminAction({
        action_type: "create",
        resource_type: "user",
        resource_id: data.id,
        old_values: null,
        new_values: newUser,
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      setUsers([data, ...users]);
      setShowCreateModal(false);
      setNewUser({ email: "", name: "", role: "user", is_active: true });
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Shield className="h-4 w-4 text-adm-brick" />;
      case "admin":
        return <Shield className="h-4 w-4 text-adm-forest" />;
      default:
        return <UserCheck className="h-4 w-4 text-adm-ink-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "adm-chip-amber";
      case "admin":
        return "adm-chip-sage";
      default:
        return "adm-chip-plain";
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const adminUsers = users.filter(
    (user) => user.role === "admin" || user.role === "super_admin"
  ).length;
  const recentUsers = users.filter((user) => {
    const userDate = new Date(user.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return userDate > weekAgo;
  }).length;

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
          <h1 className="adm-title"><em>Customers</em></h1>
          <p className="adm-lede">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg border border-adm-rule text-sm font-medium text-white bg-adm-forest hover:bg-adm-forest-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </button>
          )}
          <button
            onClick={fetchUsers}
            className="inline-flex items-center px-4 py-2 border border-adm-rule rounded-lg border border-adm-rule text-sm font-medium text-adm-ink-2 bg-adm-raised hover:bg-adm-sunk focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-6 w-6 text-adm-ink-3" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    {totalUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-6 w-6 text-adm-forest" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Active Users
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    {activeUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-adm-forest" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Admin Users
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    {adminUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-adm-forest" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    New This Week
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    {recentUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-adm-ink-3" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-adm-rule rounded-lg leading-5 bg-adm-raised placeholder:text-adm-ink-3 focus:outline-none focus:ring-1 focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-adm-ink-3" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-adm-rule rounded-lg leading-5 bg-adm-raised focus:outline-none focus:ring-1 focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
            <option value="super_admin">Super Admins</option>
          </select>
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-adm-rule rounded-lg leading-5 bg-adm-raised focus:outline-none focus:ring-1 focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden border border-adm-rule ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-adm-rule-soft">
                <thead className="bg-adm-sunk">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Created
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-adm-raised divide-y divide-adm-rule-soft">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.avatar_url ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={user.avatar_url}
                                alt={user.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove(
                                    "hidden"
                                  );
                                }}
                              />
                            ) : null}
                            <div
                              className={`h-10 w-10 rounded-full bg-adm-rule flex items-center justify-center ${
 user.avatar_url ? "hidden" : ""
 }`}
                            >
                              <span className="text-sm font-bold text-adm-ink-2">
                                {(user.name || user.email || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-adm-ink">
                              {user.name || "No name"}
                            </div>
                            <div className="text-sm text-adm-ink-3">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
 user.role
 )}`}
                        >
                          {getRoleIcon(user.role)}
                          <span className="ml-1 capitalize">
                            {user.role.replace("_", " ")}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 user.is_active
 ? "bg-adm-sage-wash text-adm-sage-ink"
 : "bg-adm-brick-wash text-adm-brick-ink"
 }`}
                        >
                          {user.is_active ? (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-adm-ink-3">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-adm-ink-3">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowModal(true);
                            }}
                            className="text-adm-forest hover:text-adm-forest-deep"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isSuperAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setShowModal(true);
                                }}
                                className="text-adm-sage-ink hover:text-adm-forest-deep"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleUserStatus(user.id)}
                                className={`${
 user.is_active
 ? "text-adm-brick hover:text-adm-brick-ink"
 : "text-adm-sage-ink hover:text-adm-forest-deep"
 }`}
                              >
                                {user.is_active ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-adm-ink bg-opacity-50 transition-opacity"
              onClick={() => setShowModal(false)}
            />
            <div className="inline-block align-bottom bg-adm-raised rounded-lg text-left overflow-hidden shadow-[0_24px_48px_-12px_rgba(11,33,24,0.35)] transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-adm-raised px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="adm-h2 mb-4">
                  User Details
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {selectedUser.avatar_url ? (
                      <img
                        className="h-16 w-16 rounded-full object-cover"
                        src={selectedUser.avatar_url}
                        alt={selectedUser.name}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden"
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-16 w-16 rounded-full bg-adm-rule flex items-center justify-center ${
 selectedUser.avatar_url ? "hidden" : ""
 }`}
                    >
                      <span className="text-2xl font-bold text-adm-ink-2">
                        {(selectedUser.name || selectedUser.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-adm-ink">
                        {selectedUser.name || "No name"}
                      </h4>
                      <p className="text-sm text-adm-ink-3">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-adm-ink-3">
                        Role
                      </label>
                      <p className="text-sm text-adm-ink capitalize">
                        {selectedUser.role.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-adm-ink-3">
                        Status
                      </label>
                      <p
                        className={`text-sm ${
 selectedUser.is_active
 ? "text-adm-sage-ink"
 : "text-adm-brick"
 }`}
                      >
                        {selectedUser.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-adm-ink-3">
                        Last Login
                      </label>
                      <p className="text-sm text-adm-ink">
                        {selectedUser.last_login
                          ? new Date(selectedUser.last_login).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-adm-ink-3">
                        Created
                      </label>
                      <p className="text-sm text-adm-ink">
                        {new Date(selectedUser.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-adm-sunk px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent border border-adm-rule px-4 py-2 bg-adm-forest text-base font-medium text-white hover:bg-adm-forest-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-adm-ink bg-opacity-50 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="inline-block align-bottom bg-adm-raised rounded-lg text-left overflow-hidden shadow-[0_24px_48px_-12px_rgba(11,33,24,0.35)] transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={createUser}>
                <div className="bg-adm-raised px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="adm-h2 mb-4">
                    Create New User
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-adm-ink-2">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser({ ...newUser, email: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-adm-ink-2">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, name: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-adm-ink-2">
                        Role
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            role: e.target.value as any,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-adm-rule rounded-lg border border-adm-rule focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={newUser.is_active}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            is_active: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-adm-forest focus:ring-adm-forest border-adm-rule rounded"
                      />
                      <label
                        htmlFor="is_active"
                        className="ml-2 block text-sm text-adm-ink"
                      >
                        Active user
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-adm-sunk px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-lg border border-transparent border border-adm-rule px-4 py-2 bg-adm-forest text-base font-medium text-white hover:bg-adm-forest-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-adm-rule border border-adm-rule px-4 py-2 bg-adm-raised text-base font-medium text-adm-ink-2 hover:bg-adm-sunk focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
