import { useState, useEffect } from 'react';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

interface AddProductFormProps {
  initialBarcode?: string;
  initialQuantity?: number;
  onProductAdded?: (product: Product) => void;
}

const AddProductForm = ({ initialBarcode = '', initialQuantity = 1, onProductAdded }: AddProductFormProps) => {
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    barcode: initialBarcode,
    name: '',
    quantity: initialQuantity
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { addProduct } = useProductStore();

  // Aggiorna la quantità quando cambia initialQuantity
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      quantity: initialQuantity
    }));
  }, [initialQuantity]);

  // Aggiorna il barcode quando cambia initialBarcode
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      barcode: initialBarcode
    }));
  }, [initialBarcode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.barcode.trim()) {
        throw new Error('Il codice a barre è obbligatorio');
      }

      if (!formData.name.trim()) {
        throw new Error('Il nome del prodotto è obbligatorio');
      }

      if (formData.quantity < 0) {
        throw new Error('La quantità non può essere negativa');
      }

      const newProduct = await addProduct(formData);
      setSuccess(true);
      
      // Reset del form se non c'è barcode preimpostato
      if (!initialBarcode) {
        setFormData({
          barcode: '',
          name: '',
          quantity: initialQuantity
        });
      }
      
      if (onProductAdded) {
        onProductAdded(newProduct);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Aggiungi Nuovo Prodotto</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Prodotto aggiunto con successo!
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="barcode" className="block text-gray-700 font-bold mb-2">
            Codice a Barre
          </label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!!initialBarcode}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 font-bold mb-2">
            Nome Prodotto
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="quantity" className="block text-gray-700 font-bold mb-2">
            Quantità
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300"
        >
          {isSubmitting ? 'Salvataggio...' : 'Salva Prodotto'}
        </button>
      </form>
    </div>
  );
};

export default AddProductForm; 