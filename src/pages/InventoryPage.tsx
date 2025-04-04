import { useState, useEffect, useRef } from 'react';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';
import { exportToCSV, exportToPDF, exportProductCard } from '../utils/exportUtils';

const InventoryPage = () => {
  console.log('Rendering InventoryPage component');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Prevenire ricaricamenti multipli con un flag
  const hasLoadedRef = useRef(false);

  // Accesso diretto allo store globale con Zustand
  const { 
    products, 
    isLoading: storeLoading, 
    error: storeError, 
    fetchProducts,
    updateProduct
  } = useProductStore();

  useEffect(() => {
    // Se i dati sono già stati caricati, non ricaricarli
    if (hasLoadedRef.current) return;

    const loadData = async () => {
      try {
        console.log('InventoryPage - fetching products');
        setIsLoading(true);
        await fetchProducts();
        setIsLoading(false);
        // Imposta il flag per indicare che i dati sono stati caricati
        hasLoadedRef.current = true;
      } catch (err) {
        console.error('Error in InventoryPage:', err);
        setError((err as Error).message);
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchProducts]);

  // Aggiorna l'errore locale se c'è un errore nello store
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  // Aggiorna il loading locale in base allo stato dello store
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    setIsLoading(storeLoading);
  }, [storeLoading]);

  const handleSort = (column: keyof Product) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setEditedProduct({}); // Reset edited product
    setIsEditing(false); // Reset editing mode
    setUpdateError(null); // Reset any previous update errors
  };

  const closeProductDetails = () => {
    setSelectedProduct(null);
    setIsEditing(false);
    setEditedProduct({});
    setUpdateError(null);
  };

  const startEditing = () => {
    if (!selectedProduct) return;
    setEditedProduct({
      name: selectedProduct.name,
      barcode: selectedProduct.barcode,
      quantity: selectedProduct.quantity
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedProduct({});
    setUpdateError(null);
  };

  const handleEditChange = (field: keyof Product, value: any) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveChanges = async () => {
    if (!selectedProduct || !selectedProduct.id) return;
    
    try {
      setUpdateError(null);
      
      // Controlla che i campi non siano vuoti
      if (editedProduct.name !== undefined && editedProduct.name.trim() === '') {
        setUpdateError('Il nome del prodotto non può essere vuoto');
        return;
      }
      
      if (editedProduct.barcode !== undefined && editedProduct.barcode.trim() === '') {
        setUpdateError('Il codice a barre non può essere vuoto');
        return;
      }

      // Controlla che la quantità sia un numero valido
      if (editedProduct.quantity !== undefined) {
        const quantity = Number(editedProduct.quantity);
        if (isNaN(quantity) || quantity < 0) {
          setUpdateError('La quantità deve essere un numero maggiore o uguale a zero');
          return;
        }
      }
      
      await updateProduct(selectedProduct.id, editedProduct);
      
      // Aggiorna il prodotto selezionato con i dati modificati
      const updatedProduct = products.find(p => p.id === selectedProduct.id) || null;
      setSelectedProduct(updatedProduct);
      
      // Esci dalla modalità di modifica
      setIsEditing(false);
      setEditedProduct({});
    } catch (err) {
      console.error('Errore durante l\'aggiornamento del prodotto:', err);
      setUpdateError((err as Error).message);
    }
  };

  // Aggiunti controlli null/undefined per prevenire errori
  const filteredProducts = (products || []).filter(product => {
    // Controllo che product.name e product.barcode esistano prima di usare toLowerCase()
    const nameMatch = product.name && typeof product.name === 'string' 
      ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) 
      : false;
    
    const barcodeMatch = product.barcode && typeof product.barcode === 'string'
      ? product.barcode.includes(searchTerm)
      : false;
    
    return nameMatch || barcodeMatch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const valueA = a[sortColumn];
    const valueB = b[sortColumn];

    let comparison = 0;
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      comparison = valueA.localeCompare(valueB);
    } else if (typeof valueA === 'number' && typeof valueB === 'number') {
      comparison = valueA - valueB;
    } else if (valueA instanceof Date && valueB instanceof Date) {
      comparison = valueA.getTime() - valueB.getTime();
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatDate = (date: Date | undefined | string) => {
    if (!date) return '-';
    try {
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('it-IT');
      }
      if (date instanceof Date) {
        return date.toLocaleDateString('it-IT');
      }
      return '-';
    } catch (error) {
      console.error('Errore formattazione data:', error, date);
      return '-';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Inventario Prodotti</h1>
          <div className="flex space-x-2">
            <button
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center"
              disabled={true}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Esporta CSV
            </button>
            <button
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center"
              disabled={true}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Esporta PDF
            </button>
          </div>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Si è verificato un errore: {error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Inventario Prodotti</h1>
          <div className="flex space-x-2">
            <button
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center opacity-50 cursor-not-allowed"
              disabled={true}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Esporta CSV
            </button>
            <button
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center opacity-50 cursor-not-allowed"
              disabled={true}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Esporta PDF
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Caricamento dati in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario Prodotti</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => exportToCSV(sortedProducts)}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center"
            disabled={sortedProducts.length === 0}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Esporta CSV
          </button>
          <button
            onClick={() => exportToPDF(sortedProducts)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center"
            disabled={sortedProducts.length === 0}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Esporta PDF
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Barra di ricerca */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cerca per nome o barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {sortedProducts.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-lg font-medium text-gray-600">
              {searchTerm 
                ? 'Nessun prodotto corrisponde alla ricerca' 
                : 'Nessun prodotto disponibile. Aggiungi prodotti dalla pagina Scanner o Aggiungi Prodotto.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th 
                    className="py-3 px-4 border-b font-semibold text-gray-700 text-left cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Nome Prodotto
                      {sortColumn === 'name' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 border-b font-semibold text-gray-700 text-left cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('barcode')}
                  >
                    <div className="flex items-center">
                      Barcode
                      {sortColumn === 'barcode' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 border-b font-semibold text-gray-700 text-center cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-center">
                      Quantità
                      {sortColumn === 'quantity' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4 border-b font-semibold text-gray-700 text-center">
                    Ultimo Aggiornamento
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product, index) => (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => handleProductClick(product)}
                  >
                    <td className="py-3 px-4 border-b text-gray-800 font-medium">{product.name}</td>
                    <td className="py-3 px-4 border-b text-gray-600 font-mono">{product.barcode}</td>
                    <td className="py-3 px-4 border-b text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                        product.quantity <= 0 
                          ? 'bg-red-100 text-red-800' 
                          : product.quantity < 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b text-center text-gray-600">
                      {formatDate(product.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-4 text-sm text-gray-500 flex justify-between items-center">
              <span>{filteredProducts.length} prodotti trovati</span>
              {searchTerm && (
                <span>Filtrando per: <strong>"{searchTerm}"</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Dettagli prodotto selezionato (modale o sezione espandibile) */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {isEditing ? 'Modifica Prodotto' : 'Dettagli Prodotto'}
                </h3>
                <button 
                  onClick={closeProductDetails}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6">
                {updateError && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                    <p className="font-medium">Errore: {updateError}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Nome Prodotto</p>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editedProduct.name === undefined ? selectedProduct.name : editedProduct.name}
                        onChange={(e) => handleEditChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="font-medium text-lg">{selectedProduct.name}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Barcode</p>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editedProduct.barcode === undefined ? selectedProduct.barcode : editedProduct.barcode}
                        onChange={(e) => handleEditChange('barcode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    ) : (
                      <p className="font-mono">{selectedProduct.barcode}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Quantità in Magazzino</p>
                    {isEditing ? (
                      <input 
                        type="number"
                        value={editedProduct.quantity === undefined ? selectedProduct.quantity : editedProduct.quantity}
                        onChange={(e) => handleEditChange('quantity', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className={`font-bold ${selectedProduct.quantity <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedProduct.quantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ultimo Aggiornamento</p>
                    <p>{formatDate(selectedProduct.updatedAt)}</p>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6 space-x-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={saveChanges}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                      >
                        Salva Modifiche
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => selectedProduct && exportProductCard(selectedProduct)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Esporta Scheda
                      </button>
                      <button
                        onClick={startEditing}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={closeProductDetails}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                      >
                        Chiudi
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage; 