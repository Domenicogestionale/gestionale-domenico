import { useState, useRef, useEffect } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductQuantityUpdate from '../components/ProductQuantityUpdate';
import AddProductForm from '../components/AddProductForm';
import { Product } from '../types/Product';
import { useProductStore } from '../store/useProductStore';

// Definisci i tipi di operazione
type OperationMode = 'neutral' | 'carico' | 'scarico';

const ScannerPage = () => {
  const [barcode, setBarcode] = useState<string>('');
  const [productFound, setProductFound] = useState<Product | null>(null);
  const [operationMode, setOperationMode] = useState<OperationMode>('neutral');
  const [quantityToUpdate, setQuantityToUpdate] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastOperation, setLastOperation] = useState<{
    type: 'carico' | 'scarico';
    productName: string;
    quantity: number;
    newQuantity: number;
  } | null>(null);
  // Stato per il feedback visivo
  const [modeFlash, setModeFlash] = useState<boolean>(false);
  const [quantityFlash, setQuantityFlash] = useState<boolean>(false);
  
  const { getProductByBarcode, updateProductQuantity } = useProductStore();
  
  // Resetta lo stato quando cambia la modalità operativa
  const handleModeChange = (newMode: OperationMode) => {
    if (newMode === operationMode) return; // Non fare nulla se è la stessa modalità
    
    setOperationMode(newMode);
    // Rimuovi il prodotto attualmente visualizzato quando cambia la modalità
    setProductFound(null);
    setBarcode('');
    
    // Attiva il feedback visivo per il cambio modalità
    setModeFlash(true);
    setTimeout(() => setModeFlash(false), 500);
    
    console.log(`[DEBUG] Modalità cambiata a: ${newMode}, quantità corrente: ${quantityToUpdate}`);
  };

  // Gestisci la scansione di un prodotto tramite lo scanner
  const handleProductScanned = async (product: Product | null, scannedBarcode: string) => {
    console.log('[DEBUG] handleProductScanned chiamato con:', product, scannedBarcode);
    console.log('[DEBUG] Modalità corrente:', operationMode);
    
    if (isProcessing) {
      console.log('[DEBUG] Operazione già in corso, ignoro scansione');
      return;
    }
    
    setBarcode(scannedBarcode);
    
    if (!product) {
      console.log('[DEBUG] Nessun prodotto trovato per il barcode:', scannedBarcode);
      setProductFound(null);
      return;
    }
    
    console.log(`[DEBUG] Prodotto trovato:`, product);
    setProductFound(product);
    
    // Se troviamo il prodotto, gestiamo in base alla modalità selezionata
    if (product) {
      // Usa la quantità corrente in questo momento, non quella memorizzata in precedenza
      const currentQuantity = quantityToUpdate;
      console.log(`[DEBUG] Quantità corrente da usare: ${currentQuantity}, Modalità: ${operationMode}`);

      if (operationMode === 'neutral') {
        // In modalità neutrale, solo visualizza il prodotto
        console.log('[DEBUG] Modalità neutrale: visualizzazione prodotto', product);
      } else if (operationMode === 'carico') {
        // In modalità carico, aggiungi automaticamente la quantità
        console.log(`[DEBUG] Caricando ${currentQuantity} unità del prodotto ${product.name}`);
        await handleProductUpdate(product, currentQuantity, 'carico');
      } else if (operationMode === 'scarico') {
        // In modalità scarico, sottrai automaticamente la quantità
        console.log(`[DEBUG] Scaricando ${currentQuantity} unità del prodotto ${product.name}`);
        await handleProductUpdate(product, currentQuantity, 'scarico');
      }
    }
  };
  
  // Trova un prodotto dal codice a barre (input manuale)
  const handleScan = async () => {
    if (!barcode || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Cerca il prodotto nel database
      const product = await getProductByBarcode(barcode);
      setProductFound(product);
      
      // Se troviamo il prodotto, gestiamo in base alla modalità selezionata
      if (product) {
        // Usa la quantità corrente in questo momento, non quella memorizzata in precedenza
        const currentQuantity = quantityToUpdate;
        console.log(`[DEBUG] handleScan - Quantità: ${currentQuantity}, Modalità: ${operationMode}`);

        if (operationMode === 'neutral') {
          // In modalità neutrale, solo visualizza il prodotto
          console.log('[DEBUG] Modalità neutrale: visualizzazione prodotto', product);
        } else if (operationMode === 'carico') {
          // In modalità carico, aggiungi automaticamente la quantità
          console.log(`[DEBUG] Caricando ${currentQuantity} unità del prodotto ${product.name}`);
          await handleProductUpdate(product, currentQuantity, 'carico');
        } else if (operationMode === 'scarico') {
          // In modalità scarico, sottrai automaticamente la quantità
          console.log(`[DEBUG] Scaricando ${currentQuantity} unità del prodotto ${product.name}`);
          await handleProductUpdate(product, currentQuantity, 'scarico');
        }
      }
    } catch (error) {
      console.error('[DEBUG] Errore nella scansione:', error);
      setProductFound(null);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Gestisci l'aggiornamento della quantità del prodotto
  const handleProductUpdate = async (product: Product, quantity: number, type: 'carico' | 'scarico') => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      // Assicuriamoci che la quantità sia un numero valido, convertendo esplicitamente
      const safeQuantity = Math.max(1, Math.floor(Number(quantity)));
      
      console.log(`[DEBUG] handleProductUpdate - Tipo: ${type}, Quantità: ${safeQuantity}`);
      console.log(`- Nome: ${product.name}`);
      console.log(`- Barcode: ${product.barcode}`);
      console.log(`- Quantità attuale: ${product.quantity}`);
      console.log(`- Operazione: ${type.toUpperCase()}`);
      console.log(`- Quantità da ${type === 'carico' ? 'aggiungere' : 'sottrarre'}: ${safeQuantity}`);
      
      // Utilizzando l'API esistente updateProductQuantity
      const isAddition = type === 'carico'; // true per carico, false per scarico
      console.log(`[DEBUG] isAddition = ${isAddition}, tipo = '${type}'`);
      
      // Per la modalità scarico, verifica esplicitamente che ci sia quantità sufficiente
      if (!isAddition && product.quantity < safeQuantity) {
        console.warn(`[DEBUG] Quantità insufficiente per lo scarico: disponibile ${product.quantity}, richiesto ${safeQuantity}`);
      }
      
      // Chiamata esplicita all'API specificando chiaramente il terzo parametro
      if (type === 'carico') {
        await updateProductQuantity(product.barcode, safeQuantity, true);
      } else {
        await updateProductQuantity(product.barcode, safeQuantity, false);
      }
      
      // Ottieni il prodotto aggiornato per avere la quantità corretta
      const updatedProduct = await getProductByBarcode(product.barcode);
      console.log(`[DEBUG] Prodotto dopo aggiornamento:`, updatedProduct);
      
      // Salva l'ultima operazione per il feedback
      if (updatedProduct) {
        console.log(`[DEBUG] Operazione completata: ${updatedProduct.name} ora ha ${updatedProduct.quantity} unità`);
        setLastOperation({
          type,
          productName: product.name,
          quantity: safeQuantity,
          newQuantity: updatedProduct.quantity
        });
        
        // Aggiorna il prodotto visualizzato con i dati aggiornati
        setProductFound(updatedProduct);
      } else {
        console.error('[DEBUG] Impossibile recuperare il prodotto aggiornato');
      }
    } catch (error) {
      console.error('[DEBUG] Errore nell\'aggiornamento:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Gestisci l'aggiunta di un nuovo prodotto
  const handleProductAdded = async (addedProduct: Product) => {
    setProductFound(null);
    setBarcode('');
    
    if (operationMode !== 'neutral') {
      // Se stiamo aggiungendo in modalità carico o scarico, aggiungiamo anche l'operazione
      const quantity = quantityToUpdate;
      const type = operationMode === 'carico' ? 'carico' : 'scarico';
      
      setLastOperation({
        type,
        productName: addedProduct.name,
        quantity,
        newQuantity: addedProduct.quantity
      });
    }
  };

  // Gestisci il cambio di quantità
  const handleQuantityChange = (newQuantity: number) => {
    // Assicuriamoci che la quantità sia sempre un numero valido
    const validQuantity = Math.max(1, Math.floor(Number(newQuantity)));
    setQuantityToUpdate(validQuantity);
    
    // Attiva il feedback visivo per il cambio quantità
    setQuantityFlash(true);
    setTimeout(() => setQuantityFlash(false), 500);
    
    console.log(`Quantità cambiata a: ${validQuantity} in modalità: ${operationMode}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Scanner Prodotti</h1>
      
      {/* Modalità Operativa */}
      <div className={`bg-white rounded-lg shadow-md p-6 mb-6 transition-all duration-300 ${modeFlash ? 'bg-yellow-50' : ''}`}>
        <h2 className="text-xl font-semibold mb-4">Modalità Operativa</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => handleModeChange('neutral')}
            className={`px-4 py-2 rounded-lg font-bold text-white shadow-md transition-all ${
              operationMode === 'neutral'
                ? 'bg-gray-700 ring-4 ring-gray-300'
                : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            Modalità Neutrale
          </button>
          <button
            onClick={() => handleModeChange('carico')}
            className={`px-4 py-2 rounded-lg font-bold text-white shadow-md transition-all ${
              operationMode === 'carico'
                ? 'bg-green-700 ring-4 ring-green-300'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Modalità Carico
          </button>
          <button
            onClick={() => handleModeChange('scarico')}
            className={`px-4 py-2 rounded-lg font-bold text-white shadow-md transition-all ${
              operationMode === 'scarico'
                ? 'bg-red-700 ring-4 ring-red-300'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            Modalità Scarico
          </button>
        </div>

        {/* Spiegazione modalità corrente */}
        <div className={`p-4 rounded-lg border ${
          operationMode === 'neutral' ? 'bg-gray-50 border-gray-300 text-gray-700' :
          operationMode === 'carico' ? 'bg-green-50 border-green-300 text-green-800' :
          'bg-red-50 border-red-300 text-red-800'
        }`}>
          <p className="font-medium">
            {operationMode === 'neutral' && 'Modalità Neutrale: Scansiona un prodotto per visualizzare i dettagli senza modificare quantità.'}
            {operationMode === 'carico' && 'Modalità Carico: Scansiona prodotti per caricarli automaticamente in magazzino con la quantità specificata.'}
            {operationMode === 'scarico' && 'Modalità Scarico: Scansiona prodotti per scaricarli automaticamente dal magazzino con la quantità specificata.'}
          </p>
        </div>
      </div>

      {/* Quantità per modalità operative */}
      {operationMode !== 'neutral' && (
        <div className={`bg-white rounded-lg shadow-md p-6 mb-6 transition-all duration-300 ${quantityFlash ? 'bg-blue-50' : ''}`}>
          <h2 className="text-lg font-semibold mb-2">Quantità per {operationMode === 'carico' ? 'carico' : 'scarico'}</h2>
          <div className="flex items-center">
            <button 
              onClick={() => handleQuantityChange(Math.max(1, quantityToUpdate - 1))}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-l-lg font-bold text-gray-700"
            >
              -
            </button>
            <input
              type="number"
              value={quantityToUpdate}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val > 0) {
                  handleQuantityChange(val);
                } else if (e.target.value === '') {
                  // Permette di cancellare il campo per inserire un nuovo valore
                  handleQuantityChange(1);
                }
              }}
              onFocus={(e) => e.target.select()} // Seleziona tutto il testo quando si clicca
              min="1"
              className="w-20 text-center py-1 border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={() => handleQuantityChange(quantityToUpdate + 1)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-r-lg font-bold text-gray-700"
            >
              +
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Nota: Ogni scansione {operationMode === 'carico' ? 'caricherà' : 'scaricherà'} 
            <strong className="mx-1">{quantityToUpdate}</strong> 
            unità del prodotto scansionato. Puoi modificare questa quantità in qualsiasi momento.
          </p>
        </div>
      )}

      {/* Feedback ultima operazione */}
      {lastOperation && (
        <div className={`bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 ${
          lastOperation.type === 'carico' ? 'border-green-500' : 'border-red-500'
        }`}>
          <h2 className="text-lg font-semibold mb-2">Ultima operazione</h2>
          <p className="font-medium">
            {lastOperation.type === 'carico' 
              ? `Caricato: ${lastOperation.quantity} × ${lastOperation.productName}`
              : `Scaricato: ${lastOperation.quantity} × ${lastOperation.productName}`
            }
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Nuova quantità in magazzino: <span className={`font-bold ${
              lastOperation.newQuantity <= 0 ? 'text-red-600' : 'text-green-600'
            }`}>{lastOperation.newQuantity}</span>
          </p>
        </div>
      )}
      
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <p className="text-lg font-semibold mb-2">Elaborazione in corso...</p>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}

      {/* Scanner e Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Scansiona Codice a Barre</h2>
        
        {/* Scanner automatico */}
        <div className="mb-8">
          <BarcodeScanner onProductFound={handleProductScanned} />
        </div>
        
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-3">Inserimento Manuale</h3>
          <div className="flex mb-4">
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Inserisci codice a barre"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleScan}
              disabled={!barcode || isProcessing}
              className={`px-4 py-2 rounded-r-lg font-bold text-white ${
                !barcode || isProcessing
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Cerca
            </button>
          </div>
        </div>
        
        {/* Risultato della scansione o ricerca */}
        {productFound ? (
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-bold text-lg mb-2">{productFound.name}</h3>
            <p className="text-sm mb-1"><span className="font-semibold">Barcode:</span> {productFound.barcode}</p>
            <p className="mb-3">
              <span className="font-semibold">Quantità in magazzino:</span> 
              <span className={`ml-1 font-bold ${
                productFound.quantity <= 0 ? 'text-red-600' : 'text-green-600'
              }`}>{productFound.quantity}</span>
            </p>
            
            {/* Opzioni per il prodotto trovato */}
            {operationMode === 'neutral' ? (
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleProductUpdate(productFound, quantityToUpdate, 'carico')}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg"
                >
                  Carica
                </button>
                <button
                  onClick={() => handleProductUpdate(productFound, quantityToUpdate, 'scarico')}
                  className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg"
                  disabled={productFound.quantity <= 0}
                >
                  Scarica
                </button>
              </div>
            ) : (
              // In modalità carico o scarico aggiungiamo un pulsante per ripetere l'operazione
              <div className="mt-4">
                <button
                  onClick={() => handleProductUpdate(productFound, quantityToUpdate, operationMode as 'carico' | 'scarico')}
                  className={`w-full px-4 py-2 font-bold text-white rounded-lg ${
                    operationMode === 'carico' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : (productFound.quantity <= 0 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600')
                  }`}
                  disabled={operationMode === 'scarico' && productFound.quantity <= 0}
                >
                  {operationMode === 'carico' 
                    ? `Carica ${quantityToUpdate} unità` 
                    : `Scarica ${quantityToUpdate} unità`}
                </button>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Puoi modificare la quantità sopra e ripetere l'operazione.
                </p>
              </div>
            )}
          </div>
        ) : barcode ? (
          <div className="mt-6">
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="font-medium text-yellow-800">Prodotto non trovato con questo codice a barre.</p>
              <p className="mt-2">Vuoi aggiungere un nuovo prodotto con barcode <strong>{barcode}</strong>?</p>
              
              <div className="mt-4">
                <AddProductForm
                  initialBarcode={barcode}
                  onProductAdded={handleProductAdded}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ScannerPage; 