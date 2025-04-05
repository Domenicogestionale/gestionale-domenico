import { create } from 'zustand';
import { collection, doc, getDocs, setDoc, updateDoc, DocumentData, FirestoreError, query, where } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '../firebase';
import { Product } from '../types/Product';

// Definizione del tipo di stato dello store
interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  lastOperation: {
    type: 'carico' | 'scarico';
    productName: string;
    quantity: number;
    newQuantity: number;
  } | null;
  cache: Map<string, Product>;
  
  fetchProducts: () => Promise<void>;
  getProductByBarcode: (barcode: string) => Promise<Product | null>;
  addProduct: (product: Product) => Promise<Product>;
  updateProductQuantity: (barcode: string, quantity: number, operation: 'carico' | 'scarico') => Promise<Product>;
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
  lastOperation: null,
  cache: new Map(),
  
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
      // Normalizza il barcode
      const normalizedBarcode = barcode.trim().toUpperCase();
      console.log('Ricerca prodotto con barcode:', normalizedBarcode);

      // Prima cerca nella cache
      const cachedProduct = get().cache.get(normalizedBarcode);
      if (cachedProduct) {
        console.log('Prodotto trovato in cache:', cachedProduct);
        return cachedProduct;
      }

      // Se non in cache, cerca nel database
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('barcode', '==', normalizedBarcode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const productDoc = querySnapshot.docs[0];
        const productData = productDoc.data() as Product;
        const product = {
          ...productData,
          id: productDoc.id
        };

        // Aggiorna la cache
        get().cache.set(normalizedBarcode, product);
        console.log('Prodotto trovato nel database:', product);
        return product;
      }

      console.log('Nessun prodotto trovato con barcode:', normalizedBarcode);
      return null;
    } catch (error) {
      console.error('Errore durante la ricerca del prodotto:', error);
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

  updateProductQuantity: async (barcode: string, quantity: number, operation: 'carico' | 'scarico') => {
    try {
      const normalizedBarcode = barcode.trim().toUpperCase();
      console.log(`Aggiornamento quantità - Barcode: ${normalizedBarcode}, Operazione: ${operation}, Quantità: ${quantity}`);

      // Ottieni il prodotto
      const product = await get().getProductByBarcode(normalizedBarcode);
      if (!product) {
        throw new Error('Prodotto non trovato');
      }

      // Calcola la nuova quantità
      const currentQuantity = product.quantity || 0;
      const newQuantity = operation === 'carico' 
        ? currentQuantity + quantity 
        : currentQuantity - quantity;

      // Verifica che non si vada in negativo
      if (newQuantity < 0) {
        throw new Error('Quantità insufficiente in magazzino');
      }

      // Aggiorna il prodotto nel database
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        quantity: newQuantity,
        lastUpdated: new Date().toISOString()
      });

      // Aggiorna la cache
      const updatedProduct = { ...product, quantity: newQuantity };
      get().cache.set(normalizedBarcode, updatedProduct);

      // Aggiorna lo stato globale
      set(state => ({
        products: state.products.map(p => 
          p.id === product.id ? updatedProduct : p
        ),
        lastOperation: {
          type: operation,
          productName: product.name,
          quantity: quantity,
          newQuantity: newQuantity
        }
      }));

      console.log('Quantità aggiornata con successo:', updatedProduct);
      return updatedProduct;
    } catch (error) {
      console.error('Errore durante l\'aggiornamento della quantità:', error);
      throw error;
    }
  },

  // Funzione per aggiornare i dettagli di un prodotto (nome, barcode, quantità)
  updateProduct: async (productId: string, updates: Partial<Product>) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`------ INIZIO AGGIORNAMENTO PRODOTTO ------`);
      console.log(`ID prodotto: ${productId}`);
      console.log(`Aggiornamenti richiesti:`, updates);

      // Ottieni il prodotto attuale
      const { products } = get();
      const currentProduct = products.find(p => p.id === productId);

      if (!currentProduct) {
        throw new Error(`Prodotto con ID ${productId} non trovato.`);
      }

      // Controlli di validità
      if (updates.name !== undefined && updates.name.trim() === '') {
        throw new Error('Il nome del prodotto non può essere vuoto.');
      }

      if (updates.barcode !== undefined && updates.barcode.trim() === '') {
        throw new Error('Il codice a barre non può essere vuoto.');
      }

      if (updates.barcode !== undefined && updates.barcode !== currentProduct.barcode) {
        // Controlla se esiste già un prodotto con questo barcode
        const existingProduct = await get().getProductByBarcode(updates.barcode);
        if (existingProduct && existingProduct.id !== productId) {
          throw new Error(`Esiste già un prodotto con il barcode ${updates.barcode}.`);
        }
      }

      // Se aggiorniamo la quantità, assicuriamoci che sia un numero valido
      if (updates.quantity !== undefined) {
        updates.quantity = Math.max(0, Math.floor(Number(updates.quantity)));
      }

      // Aggiorna il timestamp
      const now = new Date();
      const updatedProduct = {
        ...updates,
        updatedAt: now
      };

      // Aggiorna il documento nel database
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, updatedProduct);
      
      console.log(`Prodotto aggiornato nel database:`, updatedProduct);
      
      // Aggiorna lo store locale
      set(state => ({
        products: state.products.map(p => 
          p.id === productId ? { ...p, ...updatedProduct } : p
        ),
        isLoading: false
      }));
      
      console.log(`------ FINE AGGIORNAMENTO PRODOTTO ------`);
    } catch (error) {
      console.error("Errore durante l'aggiornamento del prodotto:", error);
      handleFirebaseError(error, (errorMsg) => set({ error: errorMsg }));
      set({ isLoading: false });
      throw error;
    }
  }
})); 