import { useState, useRef, useEffect } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductQuantityUpdate from '../components/ProductQuantityUpdate';
import AddProductForm from '../components/AddProductForm';
import { Product } from '../types/Product';
import { useProductStore } from '../store/useProductStore';
import { Cart, CartItem } from '../types/Cart';

// Definisci i tipi di operazione
type OperationMode = 'neutral' | 'carico' | 'scarico' | 'cassa';

const ScannerPage = () => {
  const [barcode, setBarcode] = useState<string>('');
  const [productFound, setProductFound] = useState<Product | null>(null);
  const [operationMode, setOperationMode] = useState<OperationMode>('neutral');
  const [quantityToUpdate, setQuantityToUpdate] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastOperation, setLastOperation] = useState<{
    type: 'carico' | 'scarico' | 'cassa';
    productName: string;
    quantity: number;
    newQuantity: number;
  } | null>(null);
  
  // Stato per la modalità cassa
  const [cart, setCart] = useState<Cart>({ items: [], totalAmount: 0, itemCount: 0 });
  const [showCheckout, setShowCheckout] = useState<boolean>(false);
  
  // Stato per aggiustamento manuale del totale
  const [manualAdjustment, setManualAdjustment] = useState<number>(0);
  
  // Ogni volta che cambia il carrello, logga il suo stato
  useEffect(() => {
    console.log('[DEBUG CART] Carrello aggiornato:', JSON.stringify(cart));
    console.log('[DEBUG CART] Numero elementi:', cart.items.length);
    console.log('[DEBUG CART] Elementi:', cart.items.map(item => `${item.product.name} (${item.quantity})`));
  }, [cart]);
  
  // Stato per il feedback visivo
  const [modeFlash, setModeFlash] = useState<boolean>(false);
  const [quantityFlash, setQuantityFlash] = useState<boolean>(false);
  const [cartItemFlash, setCartItemFlash] = useState<string | null>(null); // ID prodotto per animazione
  
  const { getProductByBarcode, updateProductQuantity } = useProductStore();
  
  // Resetta lo stato quando cambia la modalità operativa
  const handleModeChange = (newMode: OperationMode) => {
    if (newMode === operationMode) return; // Non fare nulla se è la stessa modalità
    
    // Se stiamo uscendo dalla modalità cassa, resettiamo il carrello
    if (operationMode === 'cassa' && newMode !== 'cassa') {
      setCart({ items: [], totalAmount: 0, itemCount: 0 });
      setShowCheckout(false);
    }
    
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
      } else if (operationMode === 'cassa') {
        // In modalità cassa, aggiungi automaticamente al carrello
        console.log('[DEBUG] Modalità cassa: aggiungo automaticamente al carrello');
        handleAddToCart(product, currentQuantity);
      }
    }
  };
  
  // Gestisci l'aggiunta di un prodotto al carrello
  const handleAddToCart = async (product: Product, quantity: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      console.log('[DEBUG] ========== INIZIO AGGIUNTA AL CARRELLO ==========');
      console.log('[DEBUG] Prodotto:', product.name, 'Barcode:', product.barcode);
      console.log('[DEBUG] Quantità da aggiungere:', quantity);
      console.log('[DEBUG] Stato corrente del carrello:');
      console.log('[DEBUG] - Numero elementi:', cart.items.length);
      console.log('[DEBUG] - Elenco prodotti:', cart.items.map(item => item.product.name).join(', '));
      
      // Assicuriamoci che la quantità sia un numero valido
      const safeQuantity = Math.max(1, Math.floor(Number(quantity)));
      
      // Verifica che ci sia quantità sufficiente
      if (product.quantity < safeQuantity) {
        alert(`Attenzione: Sono disponibili solo ${product.quantity} unità di ${product.name}`);
        setIsProcessing(false);
        return;
      }
      
      // Calcola il prezzo totale per questo prodotto
      const price = product.price ?? 0;
      const productTotal = price * safeQuantity;
      
      // Utilizziamo il pattern funzionale per setState per garantire che utilizziamo
      // sempre l'ultimo stato del carrello anziché uno snapshot potenzialmente obsoleto
      setCart(prevCart => {
        console.log('[DEBUG] Aggiornamento del carrello usando callback funzionale');
        console.log('[DEBUG] - Stato prevCart:', prevCart.items.length, 'elementi');
        
        // Copia profonda degli elementi attuali del carrello
        const currentItems = [...prevCart.items];
        
        // Cerca se il prodotto esiste già nel carrello
        const existingIndex = currentItems.findIndex(item => 
          item.product.barcode === product.barcode
        );
        console.log('[DEBUG] Prodotto già nel carrello?', existingIndex >= 0 ? `Sì, all'indice ${existingIndex}` : 'No');
        
        let updatedItems;
        
        if (existingIndex >= 0) {
          // Il prodotto esiste già, aggiorna la quantità
          console.log('[DEBUG] Aggiornando elemento esistente');
          updatedItems = [...currentItems]; // Crea una nuova copia per l'immutabilità
          
          const updatedItem = {
            ...currentItems[existingIndex],
            quantity: currentItems[existingIndex].quantity + safeQuantity,
            totalPrice: (currentItems[existingIndex].quantity + safeQuantity) * price
          };
          
          updatedItems[existingIndex] = updatedItem;
          console.log('[DEBUG] Elemento aggiornato con nuova quantità:', updatedItem.quantity);
        } else {
          // Il prodotto non esiste, aggiungilo come nuovo
          console.log('[DEBUG] Aggiungendo nuovo elemento al carrello');
          const newItem = {
            product,
            quantity: safeQuantity,
            totalPrice: productTotal
          };
          
          // Aggiungi il nuovo elemento alla lista esistente
          updatedItems = [...currentItems, newItem];
          console.log('[DEBUG] Nuovo elemento aggiunto:', newItem.product.name);
        }
        
        // Calcola i nuovi totali
        const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        
        // Crea il nuovo oggetto carrello
        const updatedCart = {
          items: updatedItems,
          totalAmount: newTotalAmount,
          itemCount: newItemCount
        };
        
        console.log('[DEBUG] Nuovo carrello creato');
        console.log('[DEBUG] - Numero elementi nel nuovo carrello:', updatedCart.items.length);
        console.log('[DEBUG] - Prodotti nel nuovo carrello:', updatedCart.items.map(item => item.product.name).join(', '));
        
        // Ritorna il nuovo stato del carrello
        return updatedCart;
      });
      
      // Feedback visivo per l'elemento aggiunto
      setCartItemFlash(product.id ?? product.barcode);
      setTimeout(() => setCartItemFlash(null), 800);
      
      // Aggiorna lo stato dell'ultima operazione
      setLastOperation({
        type: 'cassa',
        productName: product.name,
        quantity: safeQuantity,
        newQuantity: product.quantity
      });
      
      console.log('[DEBUG] ========== FINE AGGIUNTA AL CARRELLO ==========');
    } catch (error) {
      console.error('[DEBUG] Errore nell\'aggiunta al carrello:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Rimuovi un prodotto dal carrello
  const handleRemoveFromCart = (index: number) => {
    if (isProcessing) return;
    
    console.log('[DEBUG] ========== INIZIO RIMOZIONE DAL CARRELLO ==========');
    console.log('[DEBUG] Rimozione prodotto con indice:', index);
    console.log('[DEBUG] Carrello attuale:', JSON.stringify(cart));
    
    // Crea un nuovo array senza il prodotto da rimuovere
    const updatedItems = [...cart.items];
    const removedItem = updatedItems[index];
    
    // Rimuovi l'elemento dall'array
    if (index >= 0 && index < updatedItems.length) {
      updatedItems.splice(index, 1);
      
      // Calcola i nuovi totali
      const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const newItemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Crea il nuovo oggetto carrello
      const updatedCart = {
        items: updatedItems,
        totalAmount: newTotalAmount,
        itemCount: newItemCount
      };
      
      console.log('[DEBUG] Nuovo carrello dopo rimozione:', JSON.stringify(updatedCart));
      
      // Aggiorna il carrello con i nuovi valori
      setCart(updatedCart);
      
      console.log(`[DEBUG] Prodotto rimosso dal carrello con successo`);
    } else {
      console.error('[DEBUG] Indice di rimozione non valido:', index);
    }
    
    console.log('[DEBUG] ========== FINE RIMOZIONE DAL CARRELLO ==========');
  };
  
  // Completa l'acquisto e scarica i prodotti dall'inventario
  const handleCheckout = async () => {
    if (isProcessing || cart.items.length === 0) return;
    setIsProcessing(true);
    
    try {
      console.log('[DEBUG] Inizio processo di checkout');
      console.log('[DEBUG] Prodotti nel carrello:', cart.items);
      
      // Verifica che tutti i prodotti abbiano quantità sufficiente
      for (const item of cart.items) {
        const product = await getProductByBarcode(item.product.barcode);
        if (!product) {
          console.error(`[DEBUG] Prodotto non trovato: ${item.product.barcode}`);
          throw new Error(`Prodotto ${item.product.name} non trovato nell'inventario`);
        }
        if (product.quantity < item.quantity) {
          throw new Error(`Quantità insufficiente per ${item.product.name}. Disponibili: ${product.quantity}`);
        }
      }
      
      // Scarica ciascun prodotto dall'inventario
      for (const item of cart.items) {
        console.log(`[DEBUG] Scaricando ${item.quantity} unità di ${item.product.name}`);
        try {
          await updateProductQuantity(item.product.barcode, item.quantity, false);
          console.log(`[DEBUG] Quantità aggiornata con successo per ${item.product.name}`);
        } catch (error) {
          console.error(`[DEBUG] Errore durante lo scarico di ${item.product.name}:`, error);
          throw new Error(`Errore durante lo scarico di ${item.product.name}: ${error.message}`);
        }
      }
      
      // Feedback di successo
      alert(`Pagamento completato con successo!\nTotale: €${cart.totalAmount.toFixed(2)}\nGrazie per l'acquisto!`);
      
      // Resetta il carrello e chiudi la finestra di checkout
      setCart({ items: [], totalAmount: 0, itemCount: 0 });
      setShowCheckout(false);
      
    } catch (error) {
      console.error('[DEBUG] Errore durante il checkout:', error);
      alert(`Errore durante il checkout: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Annulla l'acquisto e svuota il carrello
  const handleCancelCheckout = () => {
    if (window.confirm('Sei sicuro di voler annullare l\'acquisto? Il carrello verrà svuotato.')) {
      setCart({ items: [], totalAmount: 0, itemCount: 0 });
      setShowCheckout(false);
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
    // Assicura che la quantità sia sempre almeno 1
    const validQuantity = Math.max(1, Math.floor(newQuantity));
    setQuantityToUpdate(validQuantity);
    
    // Attiva il feedback visivo per il cambio quantità
    setQuantityFlash(true);
    setTimeout(() => setQuantityFlash(false), 500);
    
    console.log(`Quantità cambiata a: ${validQuantity} in modalità: ${operationMode}`);
  };

  // Passo 4.1: Aggiunte funzioni handler per aggiustamento manuale
  const handleManualAdjustment = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!isNaN(value)) {
      setManualAdjustment(prev => prev + value);
    }
  };

  const handleSetManualAdjustment = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!isNaN(value)) {
       setManualAdjustment(value);
    } else if (typeof amount === 'string' && amount.trim() === '') {
       // Se l'input viene cancellato, azzera l'aggiustamento
       setManualAdjustment(0);
    }
  }

  // Gestisce l'input manuale del codice a barre
  const handleScan = async () => {
    if (!barcode || isProcessing) return;
    setIsProcessing(true);
    
    try {
      console.log(`[DEBUG] Ricerca manuale barcode: ${barcode}`);
      const product = await getProductByBarcode(barcode);
      onProductFound(product, barcode);
    } catch (error) {
      console.error('[DEBUG] Errore nella ricerca manuale:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Callback usato dal componente BarcodeScanner quando trova un prodotto
  const onProductFound = (product: Product | null, scannedBarcode: string) => {
    console.log('[DEBUG] onProductFound - Inizio. Prodotto:', product, 'Barcode:', scannedBarcode);
    console.log('[DEBUG] onProductFound - Modalità operativa:', operationMode);

    if (!product) {
      console.log('[DEBUG] onProductFound - Prodotto non trovato per barcode:', scannedBarcode);
      // CORREZIONE: Imposta productFound a null E aggiorna il barcode
      // in modo che la condizione !productFound && barcode diventi vera
      setProductFound(null);
      setBarcode(scannedBarcode); // <-- Riga chiave per mostrare il form
      console.log('[DEBUG] onProductFound - Stato aggiornato: productFound=null, barcode=', scannedBarcode);
      return; // Esce dopo aver impostato lo stato corretto per mostrare il form
    }

    // Se il prodotto è stato trovato...
    console.log('[DEBUG] onProductFound - Prodotto trovato:', product.name);
    setProductFound(product);
    setBarcode(scannedBarcode); // Aggiorna anche qui per consistenza

    // Gestione basata sulla modalità... (codice esistente)
    if (operationMode === 'carico') {
      console.log('[DEBUG] onProductFound - Modalità carico, chiamo handleProductUpdate');
      handleProductUpdate(product, quantityToUpdate, 'carico');
    } else if (operationMode === 'scarico') {
      console.log('[DEBUG] onProductFound - Modalità scarico');
      if (product.quantity >= quantityToUpdate) {
        console.log('[DEBUG] onProductFound - Quantità sufficiente, chiamo handleProductUpdate');
        handleProductUpdate(product, quantityToUpdate, 'scarico');
      } else {
        console.warn(`[DEBUG] onProductFound - Quantità insufficiente per ${product.name}. Disponibili: ${product.quantity}`);
        alert(`Quantità insufficiente per ${product.name}. Disponibili: ${product.quantity}`);
      }
    } else if (operationMode === 'cassa') {
      console.log('[DEBUG] onProductFound - Modalità cassa, chiamo handleAddToCart');
      handleAddToCart(product, quantityToUpdate);
    } else {
       console.log('[DEBUG] onProductFound - Modalità neutral o non gestita, solo visualizzazione');
    }
  };

  // Ripristina la pagina alle impostazioni predefinite
  const handleReset = () => {
    setBarcode('');
    setProductFound(null);
    setOperationMode('neutral');
    setQuantityToUpdate(1);
    setCart({ items: [], totalAmount: 0, itemCount: 0 });
    setShowCheckout(false);
    setLastOperation(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center sm:text-left">Scanner Prodotti</h1>
      
      {/* Pulsanti per la selezione della modalità - Layout mobile-first responsive */}
      <div className={`grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-4 p-2 rounded transition-colors ${modeFlash ? 'bg-blue-100' : ''}`}>
        <button
          onClick={() => handleModeChange('neutral')}
          className={`px-3 py-2 rounded shadow text-center text-sm sm:text-base ${operationMode === 'neutral' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Visualizzazione
        </button>
        <button
          onClick={() => handleModeChange('carico')}
          className={`px-3 py-2 rounded shadow text-center text-sm sm:text-base ${operationMode === 'carico' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Carico
        </button>
        <button
          onClick={() => handleModeChange('scarico')}
          className={`px-3 py-2 rounded shadow text-center text-sm sm:text-base ${operationMode === 'scarico' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
        >
          Scarico
        </button>
        <button
          onClick={() => handleModeChange('cassa')}
          className={`px-3 py-2 rounded shadow text-center text-sm sm:text-base ${operationMode === 'cassa' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
        >
          Cassa
        </button>
      </div>
      
      {/* Selezione della quantità */}
      <div className={`p-3 rounded-lg border mb-4 transition-colors ${quantityFlash ? 'bg-yellow-100 border-yellow-300' : 'border-gray-200'}`}>
        <label className="block mb-2 font-medium">
          Quantità da {operationMode === 'carico' ? 'caricare' : 
                      operationMode === 'scarico' ? 'scaricare' : 
                      operationMode === 'cassa' ? 'aggiungere' : 'visualizzare'}:
        </label>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleQuantityChange(Math.max(1, quantityToUpdate - 1))}
            className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded text-xl font-bold"
            disabled={quantityToUpdate <= 1}
          >
            -
          </button>
          <input
            type="number"
            value={quantityToUpdate}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            min="1"
            className="w-16 px-2 py-2 border rounded text-center"
          />
          <button 
            onClick={() => handleQuantityChange(quantityToUpdate + 1)}
            className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded text-xl font-bold"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Layout a due colonne per desktop, colonna singola per mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {/* Componente di scansione */}
          <div className="mb-4 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">Scanner Automatico</h2>
            <BarcodeScanner onProductScanned={onProductFound} />
          </div>
          
          {/* Input manuale del codice a barre */}
          <div className="mb-4 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">Inserimento Manuale</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Inserisci codice a barre"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button 
                onClick={handleScan}
                disabled={!barcode || isProcessing}
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
              >
                Cerca
              </button>
            </div>
          </div>
          
          {/* Feedback ultima operazione */}
          {lastOperation && (
            <div className={`p-4 mb-4 rounded-lg shadow border ${
              lastOperation.type === 'carico' ? 'bg-green-50 border-green-200' : 
              lastOperation.type === 'scarico' ? 'bg-red-50 border-red-200' : 
              'bg-purple-50 border-purple-200'
            }`}>
              <h3 className="font-bold mb-1">Ultima Operazione</h3>
              <p className="font-medium">
                {lastOperation.type === 'carico' ? 'Caricato: ' : 
                lastOperation.type === 'scarico' ? 'Scaricato: ' : 
                'Aggiunto al carrello: '}
                <span className="font-bold">{lastOperation.productName}</span> 
                ({lastOperation.quantity} {lastOperation.quantity === 1 ? 'unità' : 'unità'})
              </p>
              {lastOperation.type !== 'cassa' && (
                <p className="text-sm mt-1">
                  Quantità attuale: <span className="font-semibold">{lastOperation.newQuantity}</span> unità
                </p>
              )}
            </div>
          )}
          
          {/* Mostra dettagli del prodotto trovato */}
          {productFound && (
            <div className="p-4 mb-4 border rounded-lg bg-white shadow">
              <h2 className="text-xl font-semibold mb-2">Prodotto Trovato</h2>
              <p className="text-sm text-gray-600 mb-3">Codice: {productFound.barcode}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg">{productFound.name}</h3>
                  <p className="font-medium mt-2">Quantità: <span className="font-bold">{productFound.quantity}</span></p>
                  {productFound.price && (
                    <p className="font-medium mt-1">Prezzo: <span className="font-bold">€{productFound.price.toFixed(2)}</span></p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-end">
                  {operationMode === 'carico' && (
                    <button
                      onClick={() => handleProductUpdate(productFound, quantityToUpdate, 'carico')}
                      disabled={isProcessing}
                      className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400"
                    >
                      Carica {quantityToUpdate} unità
                    </button>
                  )}
                  
                  {operationMode === 'scarico' && (
                    <button
                      onClick={() => handleProductUpdate(productFound, quantityToUpdate, 'scarico')}
                      disabled={isProcessing || productFound.quantity < quantityToUpdate}
                      className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg disabled:bg-gray-400"
                    >
                      Scarica {quantityToUpdate} unità
                    </button>
                  )}
                  
                  {operationMode === 'cassa' && (
                    <button
                      onClick={() => handleAddToCart(productFound, quantityToUpdate)}
                      disabled={isProcessing || productFound.quantity < quantityToUpdate}
                      className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg disabled:bg-gray-400"
                    >
                      Aggiungi al carrello
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div>
          {/* Sezione modalità cassa */}
          {operationMode === 'cassa' && (
            <div className="border rounded-lg p-4 bg-white shadow mb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Carrello</h2>
                <div className="text-right">
                  <p className="font-bold text-lg text-purple-700">
                    Totale: €{(cart.totalAmount + manualAdjustment).toFixed(2)}
                  </p>
                  {manualAdjustment !== 0 && (
                     <p className="text-xs text-gray-500">
                       (Subtotale: €{cart.totalAmount.toFixed(2)}, Aggiust.: €{manualAdjustment.toFixed(2)})
                     </p>
                  )}
                  <p className="text-sm text-gray-600">
                    {cart.itemCount} {cart.itemCount === 1 ? 'articolo' : 'articoli'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cart.items.length} prodotti diversi nel carrello
                  </p>
                </div>
              </div>
              
              {cart.items.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500 mb-2">Il carrello è vuoto</p>
                  <p className="text-sm text-gray-400">Scansiona un prodotto per aggiungerlo</p>
                </div>
              ) : (
                <>
                  {/* Debug info (visibile solo in sviluppo) */}
                  <div className="bg-yellow-50 p-2 mb-2 text-xs border border-yellow-200 rounded">
                    <p>Debug: Prodotti nel carrello: {cart.items.length}</p>
                    <p>Nomi: {cart.items.map(item => item.product.name).join(', ')}</p>
                    <p>ID Prodotti: {cart.items.map(item => item.product.id || item.product.barcode).join(', ')}</p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto mb-4 border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prodotto</th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Prezzo</th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtà</th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Totale</th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cart.items.map((item, index) => (
                          <tr 
                            key={`${item.product.id || item.product.barcode}-${index}`}
                            className={`transition-colors ${
                              cartItemFlash === (item.product.id || item.product.barcode) ? 'bg-purple-50' : ''
                            }`}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                              <div className="text-xs text-gray-500">{item.product.barcode}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">
                              €{item.product.price?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              €{item.totalPrice.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={() => handleRemoveFromCart(index)}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                Rimuovi
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Passo 4.2: Aggiunta sezione Aggiustamento Manuale */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-md font-semibold mb-2">Aggiustamento Manuale Totale</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[1, 2, 5, 10].map(val => (
                        <button
                          key={`add-${val}`}
                          onClick={() => handleManualAdjustment(val)}
                          className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                        >
                          +{val}€
                        </button>
                      ))}
                      {[-1, -2, -5, -10].map(val => (
                         <button
                           key={`sub-${val}`}
                           onClick={() => handleManualAdjustment(val)}
                           className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                         >
                           {val}€
                         </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="custom-adjustment" className="text-sm">Importo:</label>
                      <input
                        type="number"
                        id="custom-adjustment"
                        step="0.01"
                        value={manualAdjustment === 0 ? '' : manualAdjustment.toFixed(2)} // Mostra vuoto se 0
                        onChange={(e) => handleSetManualAdjustment(e.target.value)}
                        placeholder="Es: 1.30 o -0.50"
                        className="w-28 px-2 py-1 border rounded text-sm"
                      />
                       <button
                         onClick={() => setManualAdjustment(0)}
                         className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                         title="Azzera aggiustamento"
                       >
                         Azzera
                       </button>
                    </div>
                    {manualAdjustment !== 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Aggiustamento corrente: €{manualAdjustment.toFixed(2)}
                      </p>
                    )}
                  </div>
                  {/* Fine Sezione Aggiustamento Manuale */}

                  <div className="mt-4 flex gap-2 flex-col sm:flex-row">
                    <button
                      onClick={handleCancelCheckout}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Svuota Carrello
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessing || cart.items.length === 0}
                      className="grow px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                    >
                      Completa Acquisto (€{(cart.totalAmount + manualAdjustment).toFixed(2)})
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Form per l'aggiunta di un nuovo prodotto (se non trovato) */}
          {!productFound && barcode && (
            <div className="p-4 border-t-4 border-orange-400 rounded-b-lg bg-white shadow">
              <h2 className="text-xl font-semibold mb-2 text-orange-700">Prodotto Non Trovato</h2>
              <p className="text-gray-600 mb-4">
                Il codice a barre <span className="font-medium">{barcode}</span> non è presente nel tuo inventario.
                <br />
                Compila il modulo qui sotto per aggiungerlo.
              </p>
              <AddProductForm onProductAdded={handleProductAdded} />
            </div>
          )}
        </div>
      </div>
      
      {/* Pulsante per reset pagina */}
      <div className="mt-8 text-center">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Ripristina
        </button>
      </div>
      
      {/* Finestra di checkout */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Completa l'acquisto</h2>
            
            <div className="mb-4">
              <p className="text-lg font-semibold">
                Totale Finale: <span className="text-xl text-green-600">€{(cart.totalAmount + manualAdjustment).toFixed(2)}</span>
              </p>
              {manualAdjustment !== 0 && (
                 <p className="text-sm text-gray-500">
                   Subtotale Articoli: €{cart.totalAmount.toFixed(2)} <br />
                   Aggiustamento Manuale: €{manualAdjustment.toFixed(2)}
                 </p>
              )}
              <p className="text-gray-600 mt-1">
                {cart.itemCount} {cart.itemCount === 1 ? 'articolo' : 'articoli'}
              </p>
            </div>
            
            <div className="mb-4 max-h-60 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Prodotto</th>
                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500">Qtà</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500">Totale</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cart.items.map((item) => (
                    <tr key={item.product.id || item.product.barcode}>
                      <td className="px-3 py-2 text-sm">{item.product.name}</td>
                      <td className="px-3 py-2 text-center text-sm">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-sm">€{item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between gap-4">
              <button
                onClick={handleCancelCheckout}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                  isProcessing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isProcessing ? 'Elaborazione...' : 'Conferma Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerPage; 