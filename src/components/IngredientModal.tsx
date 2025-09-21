import React from 'react';
import { X } from 'lucide-react';
import { Ingredient } from '../data/ingredients';

interface IngredientModalProps {
  ingredient: Ingredient | null;
  isOpen: boolean;
  onClose: () => void;
}

const IngredientModal: React.FC<IngredientModalProps> = ({ ingredient, isOpen, onClose }) => {
  if (!isOpen || !ingredient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full mx-4 relative animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <h3 className="text-2xl font-bold text-[#4A5C3D] mb-4">
            {ingredient.name}
          </h3>
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-[#A88B67] mb-2">
              Nutritional Benefits
            </h4>
            <p className="text-gray-700 leading-relaxed">
              {ingredient.benefits}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-[#4A5C3D] text-white py-3 rounded-lg font-medium hover:bg-[#3a4a2f] transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientModal;