import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
  text?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  className = "",
  text = "Go Back",
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
      className={`inline-flex items-center text-[#4A5C3D] hover:text-[#3a4a2f] transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      <span>{text}</span>
    </button>
  );
};

export default BackButton;
