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
    
    // Reset degli stati
    setError(null);
    setSuccess(false);
    
    // Validazione
    if (!formData.barcode.trim()) {
      setError('Il codice a barre è obbligatorio');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Il nome del prodotto è obbligatorio');
      return;
    }
    
    if (formData.quantity < 0) {
      setError('La quantità non può essere negativa');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Cerca se esiste già un prodotto con lo stesso barcode
      // Questo avverrà nella funzione addProduct del ProductStore
      
      // Aggiungi il prodotto
      const product = await addProduct(formData);
      
      // Aggiorna lo stato per mostrare il messaggio di successo
      setSuccess(true);
      
      // Reset del form dopo aggiunta
      setFormData({
        barcode: '',
        name: '',
        quantity: 1
      });
      
      // Callback per il componente parent
      if (onProductAdded) {
        onProductAdded(product);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore durante l\'aggiunta del prodotto';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-2 sm:p-3 text-xs sm:text-sm text-red-700">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-2 sm:p-3 text-xs sm:text-sm text-green-700">
          Prodotto aggiunto con successo!
        </div>
      )}
      
      <div>
        <label htmlFor="barcode" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
          Codice a Barre
        </label>
        <input
          type="text"
          id="barcode"
          name="barcode"
          value={formData.barcode}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          disabled={isSubmitting || !!initialBarcode}
        />
      </div>
      
      <div>
        <label htmlFor="name" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
          Nome Prodotto
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          disabled={isSubmitting}
          required
        />
      </div>
      
      <div>
        <label htmlFor="quantity" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
          Quantità Iniziale
        </label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          value={formData.quantity}
          onChange={handleChange}
          min="0"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          disabled={isSubmitting}
        />
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md disabled:bg-green-300 disabled:cursor-not-allowed text-sm sm:text-base"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Aggiunta in corso...' : 'Aggiungi Prodotto'}
        </button>
      </div>
    </form>
  );
};

export default AddProductForm; 