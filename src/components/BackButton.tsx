import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
  text?: string;
  /** "dark" on emerald pages, "light" on the ivory transactional pages */
  tone?: "light" | "dark";
}

const BackButton: React.FC<BackButtonProps> = ({
  className = "",
  text = "Go Back",
  tone = "light",
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // If no history, go to home page
      navigate("/");
    }
  };

  return (
    <button
      onClick={handleGoBack}
      className={`inline-flex items-center transition-colors ${
        tone === "dark"
          ? "text-sm font-semibold text-gold-300 hover:text-gold-200"
          : "text-[#14402E] hover:text-[#0B2118]"
      } ${className}`}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      <span>{text}</span>
    </button>
  );
};

export default BackButton;
