// Test admin panel functionality without database queries
export const testAdminPanel = () => {
  console.log("🔍 Testing Admin Panel");
  console.log("=====================");

  // Check if we're on the admin page
  const isAdminPage = window.location.pathname.includes("/admin");
  console.log("✅ On admin page:", isAdminPage);

  // Check if user is logged in (from localStorage)
  const authUser = localStorage.getItem("authUser");
  if (authUser) {
    try {
      const user = JSON.parse(authUser);
      console.log("✅ User found in localStorage:", user.email);

      // Check admin status
      const isAdmin = user.email === "adityapiyush71@gmail.com";
      console.log("✅ Is admin (by email):", isAdmin);

      if (isAdmin) {
        console.log("🎉 Admin panel should work!");
        console.log("   - Dashboard should load");
        console.log("   - Orders should load");
        console.log("   - Refunds should load");
        console.log("   - Profile settings should work");
      } else {
        console.log("⚠️ User is not admin, admin panel will be restricted");
      }
    } catch (error) {
      console.error("❌ Error parsing user data:", error);
    }
  } else {
    console.log("⚠️ No user found in localStorage");
  }

  // Check if admin context is working
  const adminContext = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (adminContext) {
    console.log("✅ React DevTools available");
  }

  console.log("\n🎯 Next steps:");
  console.log("1. Refresh the page");
  console.log("2. Check if admin panel loads");
  console.log("3. Try changing profile settings");
  console.log("4. Check console for any errors");
};

// Make it available globally
(window as any).testAdminPanel = testAdminPanel;
