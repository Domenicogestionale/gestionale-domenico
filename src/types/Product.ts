export interface Product {
  id?: string;
  barcode: string;
  name: string;
  quantity: number;
  price?: number;
  createdAt?: Date;
  updatedAt?: Date;
} 