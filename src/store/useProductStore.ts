import { create } from 'zustand';
import { collection, doc, getDocs, setDoc, updateDoc, DocumentData, FirestoreError } from 'firebase/firestore';
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
  updateProductQuantity: (barcode: string, quantity: number, isAddition: boolean) => Promise<string | void>;
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
      // Prima cerca nella cache locale
      const { products } = get();
      const localProduct = products.find(p => p.barcode === barcode);
      if (localProduct) return localProduct;

      // Se non è nella cache, cerca nel database
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(productsRef);
      let foundProduct: Product | null = null;
      
      productsSnap.forEach((doc) => {
        const product = doc.data() as DocumentData;
        if (product.barcode === barcode) {
          foundProduct = { id: doc.id, ...product } as Product;
        }
      });
      
      return foundProduct;
    } catch (error) {
      console.error("Errore durante la ricerca del prodotto:", error);
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

  updateProductQuantity: async (barcode: string, quantity: number, isAddition: boolean) => {
    set({ isLoading: true, error: null });
    try {
      // Debug più dettagliato: Log parametri di input
      console.log(`------ INIZIO OPERAZIONE ------`);
      console.log(`Operazione: ${isAddition ? 'CARICO' : 'SCARICO'}`);
      console.log(`Barcode: ${barcode}`);
      console.log(`Quantità da ${isAddition ? 'aggiungere' : 'sottrarre'}: ${quantity}`);

      // Ottieni il prodotto aggiornato dal database ogni volta
      // invece di usare la versione in cache per evitare problemi di sincronizzazione
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(productsRef);
      
      // Questo oggetto contiene i dati grezzi del documento
      let docData: DocumentData = {} as DocumentData;
      let docId: string = '';
      
      productsSnap.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.barcode === barcode) {
          docData = data;
          docId = docSnapshot.id;
        }
      });
      
      if (!docData || !docId) {
        console.error(`Prodotto non trovato con barcode: ${barcode}`);
        throw new Error(`Prodotto non trovato con barcode: ${barcode}`);
      }
      
      // Estrai i dati dal documento
      const productName = String(docData.name || '');
      const productBarcode = String(docData.barcode || '');
      const currentQuantity = Number(docData.quantity || 0);
      
      console.log(`Prodotto trovato: ${productName} (${productBarcode})`);
      console.log(`Quantità attuale in magazzino: ${currentQuantity}`);
      
      // Converte la quantità in un numero intero positivo
      const operationQuantity = Math.max(1, Math.floor(Number(quantity)));
      console.log(`Quantità da utilizzare nell'operazione: ${operationQuantity}`);
      
      const productRef = doc(db, 'products', docId);
      let newQuantity = 0;
      
      if (isAddition) {
        // Carico - addiziona la quantità
        newQuantity = currentQuantity + operationQuantity;
        console.log(`CARICO: ${currentQuantity} + ${operationQuantity} = ${newQuantity}`);
      } else {
        // Scarico - sottrae la quantità (non può andare sotto zero)
        newQuantity = Math.max(0, currentQuantity - operationQuantity);
        console.log(`SCARICO: ${currentQuantity} - ${operationQuantity} = ${newQuantity}`);
      }
      
      const now = new Date();
      await updateDoc(productRef, {
        quantity: newQuantity,
        updatedAt: now
      });
      
      console.log(`Quantità aggiornata nel database: ${newQuantity}`);
      
      // Aggiorna lo store locale con lo stesso valore usato per il database
      set(state => ({
        products: state.products.map(p => 
          p.id === docId ? { ...p, quantity: newQuantity, updatedAt: now } : p
        ),
        isLoading: false
      }));
      
      console.log(`------ FINE OPERAZIONE ------`);
      return docId; // Ritorna l'ID per confermare l'aggiornamento
    } catch (error) {
      console.error("Errore durante l'aggiornamento della quantità:", error);
      handleFirebaseError(error, (errorMsg) => set({ error: errorMsg }));
      set({ isLoading: false });
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