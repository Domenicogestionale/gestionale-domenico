import { create } from 'zustand';
import { collection, doc, getDocs, setDoc, updateDoc, DocumentData, FirestoreError, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '../firebase';
import { Product } from '../types/Product';

// Definizione del tipo di stato dello store
interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  
  fetchProducts: () => Promise<void>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
  addProduct: (product: Product) => Promise<Product>;
  updateProductQuantity: (barcode: string, quantity: number, isAddition: boolean) => Promise<boolean>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
}

// Tipo esteso per il prodotto che include sempre l'ID
interface ProductWithId {
  id: string;
  barcode: string;
  name: string;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Funzione per gestire gli errori di Firebase in modo più specifico
const handleFirebaseError = (error: unknown, setError: (error: string | null) => void) => {
  if (error instanceof FirebaseError) {
    // Errori di permesso
    if (error.code === 'permission-denied') {
      setError('Errore di permessi: Non hai l\'autorizzazione per accedere a questo database. ' +
              'Probabilmente è necessario aggiornare le regole di sicurezza di Firestore.');
      console.log('Suggerimento: nella console Firebase, imposta le regole su:', 
                'rules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}');
    } 
    // Errori di rete
    else if (error.code === 'unavailable' || error.code === 'network-request-failed') {
      setError('Errore di rete: Verifica la tua connessione internet');
    } 
    // Altri errori Firebase
    else {
      setError(`Errore Firebase: ${error.message}`);
    }
  } else if (error instanceof FirestoreError) {
    setError(`Errore Firestore: ${error.message}`);
  } else if (error instanceof Error) {
    // Errori generici non-Firebase
    setError(error.message || 'Si è verificato un errore sconosciuto');
  } else {
    setError('Si è verificato un errore sconosciuto');
  }
};

// Creazione dello store con Zustand
export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(productsRef);
      const fetchedProducts: Product[] = [];
      
      productsSnap.forEach((doc) => {
        fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
      });
      
      set({ products: fetchedProducts, isLoading: false });
    } catch (error) {
      console.error("Errore durante il recupero dei prodotti:", error);
      handleFirebaseError(error, (errorMsg) => set({ error: errorMsg }));
      set({ isLoading: false });
    }
  },

  getProductByBarcode: async (barcode: string) => {
    try {
      if (!barcode || barcode.trim() === '') {
        console.log('[DEBUG] Barcode vuoto o non valido');
        return null;
      }
      
      // Normalizza il barcode
      const safeBarcode = String(barcode).trim();
      console.log(`[DEBUG] getProductByBarcode - Cerco prodotto con barcode: "${safeBarcode}"`);
      
      // Prima cerca nella cache locale
      const { products } = get();
      console.log(`[DEBUG] Controllando ${products.length} prodotti in cache`);
      
      // Confronta i barcode in modo più affidabile (prima normalizzando entrambi come stringhe)
      const localProduct = products.find(p => String(p.barcode).trim() === safeBarcode);
      
      if (localProduct) {
        console.log(`[DEBUG] Prodotto trovato in cache: ${localProduct.name}`);
        return localProduct;
      }
      
      console.log(`[DEBUG] Prodotto non trovato in cache, cerco nel database`);

      // Se non è nella cache, cerca nel database
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(productsRef);
      let foundProduct: Product | null = null;
      
      productsSnap.forEach((doc) => {
        const data = doc.data() as DocumentData;
        const productBarcode = String(data.barcode).trim();
        
        if (productBarcode === safeBarcode) {
          console.log(`[DEBUG] Prodotto trovato in database: ${data.name}`);
          foundProduct = { id: doc.id, ...data } as Product;
        }
      });
      
      // Se abbiamo trovato il prodotto nel database ma non era nella cache, aggiorniamo la cache
      if (foundProduct && !localProduct) {
        console.log(`[DEBUG] Aggiorno cache con prodotto trovato nel database`);
        set(state => ({
          products: [...state.products, foundProduct as Product]
        }));
      }
      
      return foundProduct;
    } catch (error) {
      console.error("[DEBUG] Errore durante la ricerca del prodotto:", error);
      handleFirebaseError(error, (errorMsg) => set({ error: errorMsg }));
      return null;
    }
  },

  addProduct: async (product: Product) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const newProduct = {
        ...product,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = doc(collection(db, 'products'));
      await setDoc(docRef, newProduct);
      
      // Aggiorna lo store locale
      const productWithId = { id: docRef.id, ...newProduct } as Product;
      set(state => ({ 
        products: [...state.products, productWithId],
        isLoading: false 
      }));
      
      return productWithId;
    } catch (error) {
      console.error("Errore durante l'aggiunta del prodotto:", error);
      handleFirebaseError(error, (errorMsg) => set({ error: errorMsg }));
      set({ isLoading: false });
      throw error;
    }
  },

  updateProductQuantity: async (barcode: string, quantity: number, isAddition: boolean): Promise<boolean> => {
    try {
      console.log(`[DEBUG] updateProductQuantity - Barcode: ${barcode}, Quantità: ${quantity}, Operazione: ${isAddition ? 'Carico' : 'Scarico'}`);
      
      const normalizedBarcode = barcode.trim();
      let productDocRef = null;
      let currentQuantity = 0;

      // 1. Cerca nel database per ottenere il riferimento del documento e la quantità attuale
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef); // Potrebbe essere ottimizzato con una query diretta
      
      let foundDoc = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Confronto case-insensitive e trim per sicurezza
        if (String(data.barcode).trim().toLowerCase() === normalizedBarcode.toLowerCase()) {
          foundDoc = doc;
        }
      });

      if (!foundDoc) {
        console.error(`[DEBUG] Prodotto non trovato NEL DATABASE: ${normalizedBarcode}`);
        // Aggiorna lo stato di errore nello store, se necessario
        set({ error: `Prodotto con barcode ${normalizedBarcode} non trovato nel database.` });
        throw new Error(`Prodotto con barcode ${normalizedBarcode} non trovato nel database`);
      }
      
      // Prodotto trovato nel DB
      productDocRef = doc(db, 'products', foundDoc.id);
      const currentData = foundDoc.data();
      currentQuantity = currentData.quantity || 0;
      console.log(`[DEBUG] Prodotto trovato nel DB (ID: ${foundDoc.id}). Quantità attuale: ${currentQuantity}`);

      // 2. Calcola la nuova quantità
      let newQuantity;
      if (isAddition) {
        newQuantity = currentQuantity + quantity;
      } else {
        if (currentQuantity < quantity) {
          console.warn(`[DEBUG] Quantità insufficiente per ${normalizedBarcode}. Disponibili: ${currentQuantity}, Richiesti: ${quantity}`);
          set({ error: `Quantità insufficiente per ${normalizedBarcode}. Disponibili: ${currentQuantity}` });
          throw new Error(`Quantità insufficiente per ${normalizedBarcode}. Disponibili: ${currentQuantity}`);
        }
        newQuantity = currentQuantity - quantity;
      }
      console.log(`[DEBUG] Nuova quantità calcolata: ${newQuantity}`);

      // 3. Aggiorna il documento nel database
      const updateTimestamp = new Date();
      await updateDoc(productDocRef, {
        quantity: newQuantity,
        updatedAt: updateTimestamp
      });
      console.log(`[DEBUG] Database aggiornato con successo per ID: ${foundDoc.id}`);

      // 4. Aggiorna la cache locale (Zustand store)
      set(state => {
        const updatedProducts = state.products.map(p => 
          p.id === foundDoc.id // Usa l'ID del documento trovato per l'aggiornamento
            ? { ...p, quantity: newQuantity, updatedAt: updateTimestamp }
            : p
        );
        // Se il prodotto non era nella cache (improbabile ma possibile), aggiungilo
        if (!state.products.some(p => p.id === foundDoc.id)) {
            console.warn(`[DEBUG] Prodotto ${foundDoc.id} non era nella cache, lo aggiungo.`);
            updatedProducts.push({ id: foundDoc.id, ...currentData, quantity: newQuantity, updatedAt: updateTimestamp } as Product);
        }
        return { products: updatedProducts, error: null }; // Resetta errore in caso di successo
      });
      console.log(`[DEBUG] Cache locale aggiornata.`);
      
      return true; // Operazione completata con successo

    } catch (error) {
      console.error("[DEBUG] Errore finale in updateProductQuantity:", error);
      // Assicurati che handleFirebaseError venga chiamato o che l'errore venga gestito
      handleFirebaseError(error, (errorMsg) => set({ error: errorMsg })); 
      // Rilancia l'errore per farlo gestire da chi ha chiamato la funzione (es. handleCheckout)
      throw error; 
    }
  },

  // Funzione per aggiornare i dettagli di un prodotto (nome, barcode, quantità)
  updateProduct: async (productId: string, updates: Partial<Product>) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`[DEBUG] Aggiornamento prodotto. ID: ${productId}, Aggiornamenti:`, updates);
      
      if (!productId) {
        throw new Error('ID prodotto non valido');
      }
      
      const productRef = doc(db, 'products', productId);
      const now = new Date();
      
      // Aggiungi updatedAt al documento
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: now
      };
      
      await updateDoc(productRef, updatesWithTimestamp);
      console.log(`[DEBUG] Prodotto aggiornato con successo`);
      
      // Aggiorna anche lo stato locale
      set(state => ({
        products: state.products.map(product => 
          product.id === productId 
            ? { ...product, ...updates, updatedAt: now } 
            : product
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error("[DEBUG] Errore durante l'aggiornamento del prodotto:", error);
      handleFirebaseError(error, (errorMsg) => set({ error: errorMsg }));
      set({ isLoading: false });
      throw error;
    }
  }
})); 