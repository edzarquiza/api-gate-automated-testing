export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  customerEmail: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
}
