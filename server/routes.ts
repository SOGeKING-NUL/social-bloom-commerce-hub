import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, ilike, or, sql, desc, asc } from "drizzle-orm";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Products API
  app.get("/api/products", async (req, res) => {
    try {
      const { search, vendor_id, category } = req.query;
      let query = db.select().from(sql`products`);
      
      // Add WHERE conditions based on query parameters
      const conditions = [];
      if (search) {
        conditions.push(sql`name ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`}`);
      }
      if (vendor_id) {
        conditions.push(sql`vendor_id = ${vendor_id}`);
      }
      if (category) {
        conditions.push(sql`category = ${category}`);
      }
      
      if (conditions.length > 0) {
        query = query.where(sql`${conditions.join(' AND ')}`);
      }
      
      const products = await query;
      res.json(products);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Single product API
  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const product = await db.execute(sql`
        SELECT p.*, 
               v.full_name as vendor_name,
               v.email as vendor_email
        FROM products p
        LEFT JOIN profiles v ON p.vendor_id = v.id
        WHERE p.id = ${id}
      `);
      
      if (product.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product.rows[0]);
    } catch (error: any) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  // Profiles API
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const profile = await db.execute(sql`
        SELECT * FROM profiles WHERE id = ${id}
      `);
      
      if (profile.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(profile.rows[0]);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Update profile API
  app.put("/api/profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { full_name, bio, website, location, avatar_url } = req.body;
      
      const result = await db.execute(sql`
        UPDATE profiles 
        SET full_name = ${full_name}, 
            bio = ${bio}, 
            website = ${website}, 
            location = ${location}, 
            avatar_url = ${avatar_url},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // KYC API
  app.post("/api/kyc", async (req, res) => {
    try {
      const { user_id, business_name, business_type, tax_id, address, phone, website, description } = req.body;
      
      const result = await db.execute(sql`
        INSERT INTO vendor_kyc (user_id, business_name, business_type, tax_id, address, phone, website, description, status, created_at, updated_at)
        VALUES (${user_id}, ${business_name}, ${business_type}, ${tax_id}, ${address}, ${phone}, ${website}, ${description}, 'pending', NOW(), NOW())
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error creating KYC:', error);
      res.status(500).json({ error: 'Failed to create KYC' });
    }
  });

  // Get KYC status
  app.get("/api/kyc/:user_id", async (req, res) => {
    try {
      const { user_id } = req.params;
      const kyc = await db.execute(sql`
        SELECT * FROM vendor_kyc WHERE user_id = ${user_id} ORDER BY created_at DESC LIMIT 1
      `);
      
      if (kyc.rows.length === 0) {
        return res.status(404).json({ error: 'KYC not found' });
      }
      
      res.json(kyc.rows[0]);
    } catch (error: any) {
      console.error('Error fetching KYC:', error);
      res.status(500).json({ error: 'Failed to fetch KYC' });
    }
  });

  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await db.execute(sql`
        SELECT DISTINCT category 
        FROM products 
        WHERE category IS NOT NULL AND is_active = true
      `);
      
      const uniqueCategories = categories.rows
        .map(row => row.category)
        .filter(Boolean);
      
      res.json(uniqueCategories);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Users search API
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json([]);
      }
      
      const users = await db.execute(sql`
        SELECT id, full_name, email, avatar_url 
        FROM profiles 
        WHERE (full_name ILIKE ${`%${q}%`} OR email ILIKE ${`%${q}%`})
        LIMIT 20
      `);
      
      res.json(users.rows);
    } catch (error: any) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  // Add to cart API
  app.post("/api/cart/add", async (req, res) => {
    try {
      const { user_id, product_id, quantity } = req.body;
      
      // Check if item already exists in cart
      const existingItem = await db.execute(sql`
        SELECT * FROM cart_items WHERE user_id = ${user_id} AND product_id = ${product_id}
      `);
      
      if (existingItem.rows.length > 0) {
        // Update quantity
        const result = await db.execute(sql`
          UPDATE cart_items 
          SET quantity = quantity + ${quantity}
          WHERE user_id = ${user_id} AND product_id = ${product_id}
          RETURNING *
        `);
        res.json(result.rows[0]);
      } else {
        // Insert new item
        const result = await db.execute(sql`
          INSERT INTO cart_items (user_id, product_id, quantity)
          VALUES (${user_id}, ${product_id}, ${quantity})
          RETURNING *
        `);
        res.json(result.rows[0]);
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ error: 'Failed to add to cart' });
    }
  });
  // Mock data for demonstration
  const mockPosts = [
    {
      id: "1",
      user_id: "user1",
      content: "Just discovered this amazing new product! The quality is incredible and the customer service is top-notch. Highly recommend to anyone looking for premium solutions.",
      image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
      likes_count: 24,
      comments_count: 8,
      shares_count: 3,
      views_count: 156,
      created_at: new Date().toISOString(),
      user: {
        full_name: "Sarah Johnson",
        email: "sarah@example.com",
        avatar_url: "https://images.unsplash.com/photo-1494790108755-2616b612b5ff?w=150&h=150&fit=crop&crop=face"
      }
    },
    {
      id: "2", 
      user_id: "user2",
      content: "Love the community here! Found so many great product recommendations and made amazing connections. This platform is changing how we shop and connect.",
      image_url: null,
      likes_count: 18,
      comments_count: 12,
      shares_count: 5,
      views_count: 203,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      user: {
        full_name: "Mike Chen",
        email: "mike@example.com", 
        avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      }
    },
    {
      id: "3",
      user_id: "user3", 
      content: "Check out this incredible tech gadget I found! The innovation and design are outstanding. Perfect for anyone looking to upgrade their setup.",
      image_url: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=300&fit=crop",
      likes_count: 31,
      comments_count: 15,
      shares_count: 8,
      views_count: 289,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      user: {
        full_name: "Emma Davis",
        email: "emma@example.com",
        avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
      }
    }
  ];

  const mockUsers = [
    {
      id: "user1",
      email: "sarah@example.com",
      full_name: "Sarah Johnson",
      avatar_url: "https://images.unsplash.com/photo-1494790108755-2616b612b5ff?w=150&h=150&fit=crop&crop=face",
      followers_count: 128,
      following_count: 95,
      posts_count: 23
    },
    {
      id: "user2", 
      email: "mike@example.com",
      full_name: "Mike Chen",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      followers_count: 87,
      following_count: 112,
      posts_count: 15
    },
    {
      id: "user3",
      email: "emma@example.com", 
      full_name: "Emma Davis",
      avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      followers_count: 203,
      following_count: 67,
      posts_count: 31
    },
    {
      id: "user4",
      email: "alex@example.com",
      full_name: "Alex Rodriguez", 
      avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      followers_count: 156,
      following_count: 89,
      posts_count: 19
    }
  ];

  // Search posts endpoint
  app.get("/api/posts/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const searchTerm = q.toLowerCase();
      const filteredPosts = mockPosts.filter(post => 
        post.content.toLowerCase().includes(searchTerm) ||
        post.user.full_name.toLowerCase().includes(searchTerm)
      );

      res.json(filteredPosts);
    } catch (error) {
      console.error('Error searching posts:', error);
      res.status(500).json({ error: 'Failed to search posts' });
    }
  });

  // Search profiles endpoint
  app.get("/api/profiles/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const searchTerm = q.toLowerCase();
      const filteredUsers = mockUsers.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );

      res.json(filteredUsers);
    } catch (error) {
      console.error('Error searching profiles:', error);
      res.status(500).json({ error: 'Failed to search profiles' });
    }
  });

  // Get all posts endpoint
  app.get("/api/posts", async (req, res) => {
    try {
      res.json(mockPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // Create post endpoint
  app.post("/api/posts", async (req, res) => {
    try {
      const { user_id, content, image_url, post_type } = req.body;

      if (!user_id || !content) {
        return res.status(400).json({ error: 'User ID and content are required' });
      }

      const result = await db.execute(sql`
        INSERT INTO posts (user_id, content, image_url, post_type)
        VALUES (${user_id}, ${content}, ${image_url || null}, ${post_type || 'text'})
        RETURNING *
      `);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  // Get all products endpoint
  app.get("/api/products", async (req, res) => {
    try {
      const mockProducts = [
        {
          id: "prod1",
          vendor_id: "user2",
          name: "Premium Wireless Headphones",
          description: "High-quality wireless headphones with noise cancellation",
          price: 299.99,
          image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
          category: "Electronics",
          stock_quantity: 25,
          created_at: new Date().toISOString(),
          vendor: {
            full_name: "Mike Chen",
            email: "mike@example.com"
          }
        },
        {
          id: "prod2",
          vendor_id: "user3",
          name: "Organic Skincare Set",
          description: "Natural skincare products for healthy glowing skin",
          price: 89.99,
          image_url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
          category: "Beauty",
          stock_quantity: 50,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          vendor: {
            full_name: "Emma Davis",
            email: "emma@example.com"
          }
        }
      ];

      res.json(mockProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Get all groups endpoint
  app.get("/api/groups", async (req, res) => {
    try {
      const mockGroups = [
        {
          id: "group1",
          creator_id: "user1",
          product_id: "prod1",
          name: "Tech Enthusiasts",
          description: "A community for sharing the latest tech products and gadgets",
          is_private: false,
          member_limit: 100,
          created_at: new Date().toISOString()
        },
        {
          id: "group2",
          creator_id: "user3",
          product_id: "prod2",
          name: "Natural Beauty Community",
          description: "Discover and share organic beauty products and tips",
          is_private: false,
          member_limit: 50,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      res.json(mockGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  // Get profile by ID endpoint
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const profile = await db.execute(sql`
        SELECT 
          id,
          email,
          full_name,
          role,
          avatar_url,
          followers_count,
          following_count,
          posts_count,
          bio,
          website,
          location,
          created_at
        FROM profiles
        WHERE id = ${id}
      `);

      if (profile.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json(profile.rows[0]);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // Handle GET request for create-payment-intent (should return error)
  app.get("/api/create-payment-intent", async (req, res) => {
    res.status(405).json({ error: 'Method not allowed. Use POST to create payment intent.' });
  });

  // Stripe payment intent creation for group checkout
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = 'usd', metadata } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        description: 'SocialShop Purchase - E-commerce platform transaction', // Required for Indian regulations
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        error: 'Failed to create payment intent',
        message: error.message 
      });
    }
  });

  // Get cart items for user
  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const cartResult = await db.execute(sql`
        SELECT 
          c.id,
          c.quantity,
          p.id as product_id,
          p.name as product_name,
          p.price as product_price,
          p.image_url as product_image_url
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ${userId}
        ORDER BY c.added_at DESC
      `);

      const cartItems = cartResult.rows.map(row => ({
        id: row.id,
        quantity: row.quantity,
        product: {
          id: row.product_id,
          name: row.product_name,
          price: row.product_price,
          image_url: row.product_image_url
        }
      }));

      res.json(cartItems);
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ 
        error: 'Failed to fetch cart',
        message: error.message 
      });
    }
  });

  // Update cart item quantity
  app.put("/api/cart-item/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;

      await db.execute(sql`
        UPDATE cart_items 
        SET quantity = ${quantity}
        WHERE id = ${itemId}
      `);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ 
        error: 'Failed to update cart item',
        message: error.message 
      });
    }
  });

  // Delete cart item
  app.delete("/api/cart-item/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;

      await db.execute(sql`
        DELETE FROM cart_items 
        WHERE id = ${itemId}
      `);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting cart item:', error);
      res.status(500).json({ 
        error: 'Failed to delete cart item',
        message: error.message 
      });
    }
  });

  // Clear cart for user
  app.delete("/api/cart/clear/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      await db.execute(sql`
        DELETE FROM cart_items 
        WHERE user_id = ${userId}
      `);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ 
        error: 'Failed to clear cart',
        message: error.message 
      });
    }
  });

  // Create order endpoint for checkout
  app.post("/api/create-order", async (req, res) => {
    try {
      const { user_id, total_amount, status, shipping_address, payment_intent_id, order_items } = req.body;

      if (!user_id || !total_amount || !order_items || !Array.isArray(order_items)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create order in database
      const orderResult = await db.execute(sql`
        INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at)
        VALUES (${user_id}, ${total_amount}, ${status || 'confirmed'}, ${shipping_address || ''}, NOW())
        RETURNING id, user_id, total_amount, status, shipping_address, created_at
      `);

      const order = orderResult.rows[0];

      // Create order items
      for (const item of order_items) {
        await db.execute(sql`
          INSERT INTO order_items (order_id, product_id, quantity, price)
          VALUES (${order.id}, ${item.product_id}, ${item.quantity}, ${item.price})
        `);
      }

      // Clear cart for user
      await db.execute(sql`
        DELETE FROM cart_items WHERE user_id = ${user_id}
      `);

      res.json({ 
        id: order.id,
        user_id: order.user_id,
        total_amount: order.total_amount,
        status: order.status,
        shipping_address: order.shipping_address,
        created_at: order.created_at
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      res.status(500).json({ 
        error: 'Failed to create order',
        message: error.message 
      });
    }
  });

  // Stripe webhook handler for payment confirmations
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).send('Missing stripe signature');
    }

    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          
          // Update payment status in database
          if (paymentIntent.metadata.checkout_item_id) {
            await db.execute(sql`
              UPDATE group_checkout_items 
              SET payment_status = 'paid', 
                  stripe_payment_intent_id = ${paymentIntent.id},
                  paid_at = NOW()
              WHERE id = ${paymentIntent.metadata.checkout_item_id}
            `);
          }
          break;
          
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          
          // Update payment status to failed
          if (failedPayment.metadata.checkout_item_id) {
            await db.execute(sql`
              UPDATE group_checkout_items 
              SET payment_status = 'failed'
              WHERE id = ${failedPayment.metadata.checkout_item_id}
            `);
          }
          break;
          
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
