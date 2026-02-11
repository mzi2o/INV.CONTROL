import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const PgStore = connectPgSimple(session);
  app.use(session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'inv-control-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  }

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(email.toLowerCase());

      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      await storage.updateLastLogin(user.id);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });

  app.get(api.products.list.path, requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get(api.products.search.path, requireAuth, async (req, res) => {
    try {
      const q = String(req.query.q || '');
      if (!q) {
        const products = await storage.getProducts();
        return res.json(products);
      }
      const results = await storage.searchProducts(q);
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  app.get(api.products.getBySku.path, requireAuth, async (req, res) => {
    try {
      const sku = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;
      const product = await storage.getProductBySku(sku);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(id, input);
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get(api.departments.list.path, requireAuth, async (req, res) => {
    try {
      const depts = await storage.getDepartments();
      res.json(depts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.get(api.purchaseRequests.list.path, requireAuth, async (req, res) => {
    try {
      const requests = await storage.getPurchaseRequests();
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch purchase requests" });
    }
  });

  app.post(api.purchaseRequests.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.purchaseRequests.create.input.parse(req.body);
      const request = await storage.createPurchaseRequest(input.request, input.items);
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create purchase request" });
    }
  });

  app.get(api.purchaseRequests.getWithItems.path, requireAuth, async (req, res) => {
    try {
      const items = await storage.getPurchaseRequestItems(Number(req.params.id));
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch request items" });
    }
  });

  app.get(api.purchaseRequests.pendingBySku.path, requireAuth, async (req, res) => {
    try {
      const sku = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;
      const items = await storage.getPendingItemsBySku(sku);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending items" });
    }
  });

  app.get('/api/receiving/timeline/:itemId', requireAuth, async (req, res) => {
    try {
      const timeline = await storage.getReceivingTimeline(Number(req.params.itemId));
      res.json(timeline);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  app.post(api.receiving.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.receiving.create.input.parse(req.body);
      const receiving = await storage.receiveItem(input);
      res.status(201).json(receiving);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to process receiving" });
    }
  });

  app.post(api.stockOut.issue.path, requireAuth, async (req, res) => {
    try {
      const input = api.stockOut.issue.input.parse(req.body);
      const result = await storage.issueStock(input.sku, input.deptId, input.quantity, input.reasonCode, input.userId);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: "Failed to issue stock" });
    }
  });

  app.get(api.transactions.list.path, requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/transactions/:id', requireAuth, async (req, res) => {
    try {
      const txn = await storage.getTransactionWithDetails(Number(req.params.id));
      if (!txn) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(txn);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  app.get(api.analytics.dashboard.path, requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get(api.analytics.tonerUsage.path, requireAuth, async (req, res) => {
    try {
      const usage = await storage.getTonerUsage();
      res.json(usage);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch toner usage" });
    }
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    const { db: database } = await import("./db");
    const { departments: deptTable, users: usersTable } = await import("@shared/schema");

    const existingDepts = await storage.getDepartments();
    if (existingDepts.length === 0) {
      console.log("Seeding departments...");
      const deptList = [
        { name: "IT", isITDepartment: true },
        { name: "Administration", isITDepartment: false },
        { name: "Magasin", isITDepartment: false },
        { name: "Qualit\u00e9", isITDepartment: false },
        { name: "Labo", isITDepartment: false },
        { name: "Datos", isITDepartment: false },
        { name: "Cadenas", isITDepartment: false },
      ];
      for (const dept of deptList) {
        await database.insert(deptTable).values(dept);
      }
    }

    const existingProducts = await storage.getProducts();
    if (existingProducts.length === 0) {
      console.log("Seeding products...");
      await storage.createProduct({ sku: "TN-HP-414A", manufacturerItemName: "HP 414A Black Toner", internalItemName: "Toner Noir HP LaserJet", category: "Toner", currentStock: 10, minThreshold: 5 });
      await storage.createProduct({ sku: "RB-MAK-X5", manufacturerItemName: "Thermal Ribbon X5", category: "Ribbon", currentStock: 50, minThreshold: 20 });
      await storage.createProduct({ sku: "CAM-DH-2MP", manufacturerItemName: "Dahua IP Camera 2MP", internalItemName: "Camera IP 2M Dome", category: "IT Equipment", currentStock: 8, minThreshold: 3 });
      await storage.createProduct({ sku: "SW-CISCO-24P", manufacturerItemName: "Cisco Switch 24 Port", category: "Network", currentStock: 2, minThreshold: 2 });
      await storage.createProduct({ sku: "RL-MAK-T1", manufacturerItemName: "Thermal Rollos T1", category: "Rollos", currentStock: 100, minThreshold: 30 });
    }

    const existingUsers = await storage.getUserByEmail("marwa6mzi@gmail.com");
    if (!existingUsers) {
      console.log("Seeding admin users...");
      const hashedPassword = await bcrypt.hash("Admin@2026!", 10);
      const adminUsers = [
        { name: "Marwa Mazini", email: "marwa6mzi@gmail.com" },
        { name: "Benamti Otman", email: "b.otman@tintcolor2010.com" },
        { name: "Akhazzan Mossaab", email: "i.mosaab@tintcolor2010.com" },
        { name: "Xevi", email: "xevim@hallotex.com" },
        { name: "Zineb Aktaou", email: "zineb@tintcolor2010.com" },
      ];
      for (const admin of adminUsers) {
        await storage.createUser({
          name: admin.name,
          email: admin.email,
          passwordHash: hashedPassword,
          role: "Admin",
          isActive: true,
        });
      }
    }

    console.log("Database seeded successfully.");
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}
