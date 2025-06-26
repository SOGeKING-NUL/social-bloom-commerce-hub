import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, ilike, or, sql, desc, asc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
