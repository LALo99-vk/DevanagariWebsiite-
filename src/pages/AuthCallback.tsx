import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);

        // Debug: Log current URL and hash
        console.log("Current URL:", window.location.href);
        console.log("URL Hash:", window.location.hash);
        console.log("URL Search:", window.location.search);

        // Check if there's an error in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        if (
          errorParam === "server_error" &&
          errorDescription?.includes("Database error granting user")
        ) {
          console.log("Database error detected, redirecting to home page...");

          // Just redirect to home page - the user should already exist in auth.users
          // The trigger should have created them in public.users
          navigate("/", { replace: true });
          return;
        }

        // Handle the OAuth callback by exchanging the code for a session
        const { data, error } = await supabase.auth.getSession();

        console.log("Session data:", data);
        console.log("Session error:", error);

        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
          return;
        }

        if (data.session) {
          console.log(
            "✅ Auth callback successful, user signed in:",
            data.session.user.email
          );
          // Redirect to home page after successful authentication
          navigate("/", { replace: true });
        } else {
          // Try to get the session from URL fragments
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          );
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          console.log("Hash params:", Object.fromEntries(hashParams.entries()));

          if (accessToken && refreshToken) {
            console.log("Found tokens in URL, setting session...");
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              console.error("Error setting session:", sessionError);
              setError(sessionError.message);
              return;
            }

            if (sessionData.session) {
              console.log(
                "✅ Session set successfully, user signed in:",
                sessionData.session.user.email
              );
              navigate("/", { replace: true });
              return;
            }
          }

          console.log("❌ No session found in callback");
          setError("Authentication failed. Please try again.");
        }
      } catch (err) {
        console.error("Error in auth callback:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A5C3D] mx-auto mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF8]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sign In Failed
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-[#4A5C3D] text-white rounded-lg hover:bg-[#3a4a2d] transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
