import React, { createContext, useState, ReactNode } from 'react';

export interface OrderProduct {
  id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  purpose: string;
  subPurpose: string;
}

export interface CustomerDetails {
  type: 'customer' | 'dealer';
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  businessName?: string;
  contactPerson?: string;
  udyamNumber?: string;
  gstNumber?: string;
}

export interface PlacedOrder {
  id: string;
  product: OrderProduct;
  customer: CustomerDetails;
  total: number;
  deliveryFee: number;
  placedAt: Date;
  status: 'pending' | 'confirmed' | 'delivered';
}

interface OrderContextType {
  currentProduct: OrderProduct | null;
  currentCustomer: CustomerDetails | null;
  orders: PlacedOrder[];
  setCurrentProduct: (p: OrderProduct | null) => void;
  setCurrentCustomer: (c: CustomerDetails | null) => void;
  placeOrder: () => PlacedOrder | null;
  clearCurrent: () => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [currentProduct, setCurrentProduct] = useState<OrderProduct | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerDetails | null>(null);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);

  const placeOrder = (): PlacedOrder | null => {
    if (!currentProduct || !currentCustomer) return null;
    const deliveryFee = 150;
    const order: PlacedOrder = {
      id: 'ES-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      product: currentProduct,
      customer: currentCustomer,
      total: currentProduct.price * currentProduct.quantity + deliveryFee,
      deliveryFee,
      placedAt: new Date(),
      status: 'pending',
    };
    setOrders(prev => [order, ...prev]);
    return order;
  };

  const clearCurrent = () => {
    setCurrentProduct(null);
    setCurrentCustomer(null);
  };

  return (
    <OrderContext.Provider value={{
      currentProduct, currentCustomer, orders,
      setCurrentProduct, setCurrentCustomer, placeOrder, clearCurrent,
    }}>
      {children}
    </OrderContext.Provider>
  );
}
