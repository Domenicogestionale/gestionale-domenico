import { useState, useEffect } from 'react';
import { useProductStore } from '../store/useProductStore';
import { Product } from '../types/Product';

const ProductTable = () => {
  console.log('Rendering ProductTable component');
  
  try {
    const { products, isLoading, error, fetchProducts, updateProduct } = useProductStore();
    console.log('ProductStore values:', { products, isLoading, error });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<keyof Product>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [editingPrice, setEditingPrice] = useState<string | null>(null);
    const [priceValue, setPriceValue] = useState<string>('');

    useEffect(() => {
      console.log('Calling fetchProducts');
      fetchProducts().catch(err => console.error('Error fetching products:', err));
    }, [fetchProducts]);

    const handleSort = (column: keyof Product) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };

    const filteredProducts = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    );

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

    const formatDate = (date: Date | undefined) => {
      if (!date) return '-';
      try {
        return new Date(date).toLocaleDateString('it-IT');
      } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
      }
    };

    const handleEditPrice = (productId: string, currentPrice?: number) => {
      setEditingPrice(productId);
      setPriceValue(currentPrice?.toString() || '0');
    };

    const handleSavePrice = async (productId: string) => {
      try {
        const newPrice = parseFloat(priceValue);
        if (isNaN(newPrice) || newPrice < 0) {
          alert('Inserisci un prezzo valido');
          return;
        }

        await updateProduct(productId, { price: newPrice });
        setEditingPrice(null);
      } catch (error) {
        console.error('Errore nell\'aggiornamento del prezzo:', error);
        alert('Errore nell\'aggiornamento del prezzo');
      }
    };

    const handleCancelEdit = () => {
      setEditingPrice(null);
    };

    if (isLoading) {
      return <div className="text-center py-4">Caricamento prodotti...</div>;
    }

    if (error) {
      return <div className="text-center text-red-500 py-4">{error}</div>;
    }

    return (
      <div className="overflow-x-auto">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Cerca per nome o barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded w-full"
          />
        </div>

        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => handleSort('name')}
              >
                Nome Prodotto
                {sortColumn === 'name' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => handleSort('barcode')}
              >
                Barcode
                {sortColumn === 'barcode' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => handleSort('quantity')}
              >
                Quantità
                {sortColumn === 'quantity' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => handleSort('price')}
              >
                Prezzo (€)
                {sortColumn === 'price' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="py-2 px-4 border">
                Ultimo Aggiornamento
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map(product => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border">{product.name}</td>
                <td className="py-2 px-4 border">{product.barcode}</td>
                <td className="py-2 px-4 border text-center">{product.quantity}</td>
                <td className="py-2 px-4 border text-center">
                  {editingPrice === product.id ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        className="w-20 p-1 border rounded"
                        value={priceValue}
                        onChange={(e) => setPriceValue(e.target.value)}
                        min="0"
                        step="0.01"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleSavePrice(product.id || '')}
                        className="p-1 bg-green-500 text-white rounded"
                      >
                        ✓
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="p-1 bg-red-500 text-white rounded"
                      >
                        ✗
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-1">
                      <span>{product.price?.toFixed(2) || '0.00'}</span>
                      <button 
                        onClick={() => handleEditPrice(product.id || '', product.price)}
                        className="text-blue-500 text-sm hover:text-blue-700"
                      >
                        ✎
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-2 px-4 border text-center">
                  {formatDate(product.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    console.error('Error in ProductTable component:', error);
    return <div className="text-center text-red-500 py-4">Si è verificato un errore nel caricamento della tabella.</div>;
  }
};

export default ProductTable; 