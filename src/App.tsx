import { createContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useProductStore } from './store/useProductStore';
import "./App.css";

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const ScannerPage = lazy(() => import('./pages/ScannerPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const AddProductPage = lazy(() => import('./pages/AddProductPage'));

// Create a context to pass the store to components
export const ProductStoreContext = createContext(useProductStore);

function App() {
  return (
    <Router>
      <ProductStoreContext.Provider value={useProductStore}>
        <div className="app-container">
          <header className="app-header">
            <h1>Gestionale Carico e Scarico</h1>
          </header>
          
          <main className="app-content">
            <Suspense fallback={<div className="loading">Caricamento...</div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/scanner" element={<ScannerPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/aggiungi" element={<AddProductPage />} />
              </Routes>
            </Suspense>
          </main>
          
          <nav className="app-navigation">
            <Link to="/scanner" className="nav-item">
              <span className="icon">📷</span>
              <span>Scanner</span>
            </Link>
            <Link to="/inventory" className="nav-item">
              <span className="icon">📋</span>
              <span>Inventario</span>
            </Link>
            <Link to="/" className="nav-item">
              <span className="icon">ℹ️</span>
              <span>Info</span>
            </Link>
          </nav>
        </div>
      </ProductStoreContext.Provider>
    </Router>
  );
}

export default App;
