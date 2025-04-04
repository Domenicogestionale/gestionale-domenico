import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import ScannerPage from './pages/ScannerPage';
import InventoryPage from './pages/InventoryPage';
import AddProductPage from './pages/AddProductPage';
import { useEffect } from 'react';
import { useProductStore } from './store/useProductStore';

function App() {
  console.log('App component rendering');
  const { fetchProducts, products, isLoading, error } = useProductStore();
  
  console.log('productStore:', {
    productsLength: products.length,
    isLoading,
    hasError: !!error
  });

  useEffect(() => {
    console.log('App useEffect - starting fetchProducts');
    // Carica i prodotti all'avvio dell'app
    fetchProducts()
      .then(() => console.log('Products fetched successfully'))
      .catch(err => console.error('Error fetching products:', err));
  }, [fetchProducts]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/aggiungi" element={<AddProductPage />} />
          </Routes>
        </main>
        <footer className="py-4 text-center text-gray-500 text-sm mt-auto">
          <p>Gestionale Carico e Scarico Magazzino &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
