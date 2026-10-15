import { AppError } from "./errors";
import { ORDER_ID_PATTERN } from "./schemas";
import type { Order, OrderStatus } from "./types";

// Business rule: allowed status moves. delivered and cancelled are terminal.
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export interface NewOrder {
  customerEmail: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderStore {
  list(): Order[];
  get(id: string): Order;
  create(input: NewOrder): Order;
  updateStatus(id: string, status: OrderStatus): Order;
}

const SEED_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function seedOrder(id: string, sku: string, quantity: number, unitPriceCents: number, status: OrderStatus): Order {
  return {
    id,
    customerEmail: "seed@example.com",
    sku,
    quantity,
    unitPriceCents,
    totalCents: quantity * unitPriceCents,
    status,
    createdAt: SEED_TIMESTAMP,
  };
}

/** Creates a fresh in-memory store with deterministic seed data. */
export function createOrderStore(): OrderStore {
  const seeds = [
    seedOrder("ord_1001", "WIDGET-A", 2, 1500, "pending"),
    seedOrder("ord_1002", "WIDGET-B", 1, 2500, "paid"),
    seedOrder("ord_1003", "GADGET-C", 3, 999, "delivered"),
  ];
  const orders = new Map<string, Order>(seeds.map((order) => [order.id, order]));
  let nextNumber = 1004;

  function get(id: string): Order {
    if (!ORDER_ID_PATTERN.test(id)) {
      throw new AppError(400, "INVALID_ID", "Order id must look like 'ord_<digits>'");
    }
    const order = orders.get(id);
    if (!order) throw new AppError(404, "NOT_FOUND", `Order ${id} was not found`);
    return order;
  }

  return {
    list: () => [...orders.values()],
    get,
    create(input) {
      const order: Order = {
        id: `ord_${nextNumber++}`,
        ...input,
        totalCents: input.quantity * input.unitPriceCents,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      orders.set(order.id, order);
      return order;
    },
    updateStatus(id, status) {
      const order = get(id);
      if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
        throw new AppError(409, "INVALID_TRANSITION", `Cannot change status from '${order.status}' to '${status}'`);
      }
      order.status = status;
      return order;
    },
  };
}
