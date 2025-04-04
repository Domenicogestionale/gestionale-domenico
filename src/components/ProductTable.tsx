import { useState, useEffect } from 'react';
import { useProductStoreContext } from '../App';
import { Product } from '../types/Product';

const ProductTable = () => {
  console.log('Rendering ProductTable component');
  
  try {
    const { products, isLoading, error, fetchProducts } = useProductStoreContext();
    console.log('ProductStore context values:', { products, isLoading, error });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<keyof Product>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
      return new Date(date).toLocaleDateString('it-IT');
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
              <th className="py-2 px-4 border">
                Ultimo Aggiornamento
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center border">
                  {searchTerm ? 'Nessun prodotto corrisponde alla ricerca' : 'Nessun prodotto disponibile'}
                </td>
              </tr>
            ) : (
              sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{product.name}</td>
                  <td className="py-2 px-4 border">{product.barcode}</td>
                  <td className="py-2 px-4 border text-center">
                    <span className={`font-bold ${product.quantity <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {product.quantity}
                    </span>
                  </td>
                  <td className="py-2 px-4 border">{formatDate(product.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <div className="mt-4 text-sm text-gray-500">
          {filteredProducts.length} prodotti trovati
        </div>
      </div>
    );
  } catch (err) {
    console.error('Error in ProductTable component:', err);
    return (
      <div className="text-center text-red-500 py-4">
        Si è verificato un errore nel caricamento della tabella: {(err as Error).message}
      </div>
    );
  }
};

export default ProductTable; 