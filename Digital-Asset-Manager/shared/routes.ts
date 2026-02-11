import { z } from 'zod';
import { insertProductSchema, insertPurchaseRequestSchema, insertReceivingTransactionSchema } from './schema';

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
    },
    getBySku: {
      method: 'GET' as const,
      path: '/api/products/sku/:sku' as const,
    },
    search: {
      method: 'GET' as const,
      path: '/api/products/search' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id' as const,
      input: z.object({
        manufacturerItemName: z.string().optional(),
        internalItemName: z.string().optional(),
        supplierBarcode: z.string().optional(),
        category: z.string().optional(),
        currentStock: z.number().optional(),
        minThreshold: z.number().optional(),
      }),
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
    },
  },
  departments: {
    list: {
      method: 'GET' as const,
      path: '/api/departments' as const,
    },
  },
  purchaseRequests: {
    list: {
      method: 'GET' as const,
      path: '/api/purchase-requests' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/purchase-requests' as const,
      input: z.object({
        request: insertPurchaseRequestSchema,
        items: z.array(z.object({
          productId: z.number(),
          requestedQty: z.number(),
          expectedDeliveryDate: z.string().optional(),
          supplierName: z.string().optional(),
          unitPrice: z.number().optional(),
        })),
      }),
    },
    getWithItems: {
      method: 'GET' as const,
      path: '/api/purchase-requests/:id/items' as const,
    },
    pendingBySku: {
      method: 'GET' as const,
      path: '/api/purchase-requests/pending/:sku' as const,
    },
  },
  receiving: {
    create: {
      method: 'POST' as const,
      path: '/api/receiving' as const,
      input: insertReceivingTransactionSchema,
    },
    timeline: {
      method: 'GET' as const,
      path: '/api/receiving/timeline/:itemId' as const,
    },
  },
  stockOut: {
    issue: {
      method: 'POST' as const,
      path: '/api/stock-out' as const,
      input: z.object({
        sku: z.string(),
        deptId: z.number(),
        quantity: z.number().min(1),
        reasonCode: z.string().optional(),
        userId: z.string().optional(),
      }),
    },
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
    },
    details: {
      method: 'GET' as const,
      path: '/api/transactions/:id' as const,
    },
  },
  analytics: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/analytics/dashboard' as const,
    },
    tonerUsage: {
      method: 'GET' as const,
      path: '/api/analytics/toner-usage' as const,
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
