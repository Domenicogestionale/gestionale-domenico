import { Product } from './Product';

// Elemento del carrello che include prodotto e quantità
export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number; // Prezzo totale per questo item (prezzo * quantità)
}

// Tipo del carrello completo
export interface Cart {
  items: CartItem[];
  totalAmount: number; // Totale complessivo del carrello
  itemCount: number;   // Numero totale di articoli
} 