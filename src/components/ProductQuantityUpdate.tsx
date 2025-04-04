import { useState } from 'react';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

interface ProductQuantityUpdateProps {
  product: Product;
  onQuantityUpdated?: (newQuantity: number) => void;
}

const ProductQuantityUpdate = ({ product, onQuantityUpdated }: ProductQuantityUpdateProps) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { updateProductQuantity } = useProductStore();
  
  const handleIncrement = () => {
    setQuantity(prev => prev + 1);
  };
  
  const handleDecrement = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };
  
  const handleUpdate = async (isAddition: boolean) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      await updateProductQuantity(product.barcode, quantity, isAddition);
      
      setSuccess(`${isAddition ? 'Caricati' : 'Scaricati'} ${quantity} ${product.name} ${isAddition ? 'in' : 'dal'} magazzino`);
      
      if (onQuantityUpdated) {
        const newQuantity = isAddition 
          ? product.quantity + quantity 
          : Math.max(0, product.quantity - quantity);
        onQuantityUpdated(newQuantity);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="font-medium text-lg mb-4">Aggiorna Quantità</h3>
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded border border-red-300">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded border border-green-300">
          {success}
        </div>
      )}
      
      <div className="flex items-center mb-4">
        <button 
          onClick={handleDecrement}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-l font-bold text-gray-700"
        >
          -
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val > 0) {
              setQuantity(val);
            }
          }}
          min="1"
          className="w-20 text-center p-1 border-t border-b border-gray-300"
        />
        <button 
          onClick={handleIncrement}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-r font-bold text-gray-700"
        >
          +
        </button>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => handleUpdate(true)}
          disabled={isUpdating}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded disabled:bg-green-400"
        >
          Carica
        </button>
        <button
          onClick={() => handleUpdate(false)}
          disabled={isUpdating || product.quantity <= 0}
          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded disabled:bg-red-400"
        >
          Scarica
        </button>
      </div>
    </div>
  );
};

export default ProductQuantityUpdate; 