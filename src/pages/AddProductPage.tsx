import AddProductForm from '../components/AddProductForm';
import { useNavigate } from 'react-router-dom';

const AddProductPage = () => {
  const navigate = useNavigate();

  const handleProductAdded = () => {
    // Possiamo decidere di reindirizzare l'utente all'inventario dopo l'aggiunta
    // o semplicemente lasciarlo qui per aggiungere più prodotti
    // navigate('/inventario');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Aggiungi Nuovo Prodotto</h1>
      
      <div className="max-w-lg mx-auto">
        <AddProductForm onProductAdded={handleProductAdded} />
      </div>
    </div>
  );
};

export default AddProductPage; 