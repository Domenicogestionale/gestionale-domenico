import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-6">Gestionale Carico e Scarico Magazzino</h1>
        <p className="text-lg mb-8">
          Benvenuto nel sistema di gestione magazzino. Utilizza la barra di navigazione o i pulsanti qui sotto per accedere alle funzionalità.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Link 
            to="/scanner" 
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 shadow-md transition-all flex flex-col items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="text-lg font-medium">Scanner Barcode</span>
            <p className="text-sm mt-2">Scansiona prodotti per operazioni di carico e scarico</p>
          </Link>
          
          <Link 
            to="/inventario" 
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 shadow-md transition-all flex flex-col items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-lg font-medium">Inventario</span>
            <p className="text-sm mt-2">Visualizza e gestisci tutti i prodotti in magazzino</p>
          </Link>
          
          <Link 
            to="/aggiungi" 
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-6 shadow-md transition-all flex flex-col items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-medium">Aggiungi Prodotto</span>
            <p className="text-sm mt-2">Inserisci nuovi prodotti nel sistema</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 