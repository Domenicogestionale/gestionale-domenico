import { useState } from 'react';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

interface ProductQuantityUpdateProps {
  product: Product;
  onUpdate: (product: Product, quantity: number, operation: 'carico' | 'scarico') => void;
}

export const ProductQuantityUpdate: React.FC<ProductQuantityUpdateProps> = ({ product, onUpdate }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [operation, setOperation] = useState<'carico' | 'scarico'>('carico');

  const handleUpdate = () => {
    onUpdate(product, quantity, operation);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setOperation('carico')}
          className={`px-4 py-2 rounded-lg font-bold ${
            operation === 'carico'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Carico
        </button>
        <button
          onClick={() => setOperation('scarico')}
          className={`px-4 py-2 rounded-lg font-bold ${
            operation === 'scarico'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Scarico
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
          className="w-20 px-3 py-2 border rounded-lg"
        />
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold"
        >
          Aggiorna
        </button>
      </div>
    </div>
  );
}; 