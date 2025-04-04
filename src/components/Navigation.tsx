import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            Gestionale Magazzino
          </Link>
          
          {/* Menu mobile */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-white focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
          
          {/* Menu desktop */}
          <div className="hidden md:flex space-x-4">
            <Link
              to="/scanner"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActiveRoute('/scanner')
                  ? 'bg-blue-700 text-white'
                  : 'text-white hover:bg-blue-500'
              }`}
            >
              Scanner
            </Link>
            <Link
              to="/inventario"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActiveRoute('/inventario')
                  ? 'bg-blue-700 text-white'
                  : 'text-white hover:bg-blue-500'
              }`}
            >
              Inventario
            </Link>
            <Link
              to="/aggiungi"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActiveRoute('/aggiungi')
                  ? 'bg-blue-700 text-white'
                  : 'text-white hover:bg-blue-500'
              }`}
            >
              Aggiungi Prodotto
            </Link>
          </div>
        </div>
        
        {/* Menu mobile dropdown */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 py-2 space-y-1">
            <Link
              to="/scanner"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActiveRoute('/scanner')
                  ? 'bg-blue-700 text-white'
                  : 'text-white hover:bg-blue-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Scanner
            </Link>
            <Link
              to="/inventario"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActiveRoute('/inventario')
                  ? 'bg-blue-700 text-white'
                  : 'text-white hover:bg-blue-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Inventario
            </Link>
            <Link
              to="/aggiungi"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActiveRoute('/aggiungi')
                  ? 'bg-blue-700 text-white'
                  : 'text-white hover:bg-blue-500'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Aggiungi Prodotto
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 