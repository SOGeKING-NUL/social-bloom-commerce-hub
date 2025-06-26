import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, ilike, or, sql, desc, asc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Search posts endpoint
  app.get("/api/posts/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const searchTerm = `%${q}%`;
      
      const posts = await db.execute(sql`
        SELECT 
          p.id,
          p.user_id,
          p.content,
          p.image_url,
          p.likes_count,
          p.comments_count,
          p.shares_count,
          p.views_count,
          p.created_at,
          pr.full_name,
          pr.email,
          pr.avatar_url
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.id
        WHERE p.content ILIKE ${searchTerm}
        ORDER BY p.created_at DESC
        LIMIT 20
      `);

      const formattedPosts = posts.rows.map((post: any) => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        shares_count: post.shares_count || 0,
        views_count: post.views_count || 0,
        created_at: post.created_at,
        user: {
          full_name: post.full_name,
          email: post.email,
          avatar_url: post.avatar_url
        }
      }));

      res.json(formattedPosts);
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

      const searchTerm = `%${q}%`;
      
      const profiles = await db.execute(sql`
        SELECT 
          id,
          email,
          full_name,
          avatar_url,
          followers_count,
          following_count,
          posts_count
        FROM profiles
        WHERE full_name ILIKE ${searchTerm} 
           OR email ILIKE ${searchTerm}
        ORDER BY full_name ASC
        LIMIT 20
      `);

      res.json(profiles.rows);
    } catch (error) {
      console.error('Error searching profiles:', error);
      res.status(500).json({ error: 'Failed to search profiles' });
    }
  });

  // Get all posts endpoint
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await db.execute(sql`
        SELECT 
          p.id,
          p.user_id,
          p.content,
          p.image_url,
          p.likes_count,
          p.comments_count,
          p.shares_count,
          p.views_count,
          p.created_at,
          pr.full_name,
          pr.email,
          pr.avatar_url
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `);

      const formattedPosts = posts.rows.map((post: any) => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        shares_count: post.shares_count || 0,
        views_count: post.views_count || 0,
        created_at: post.created_at,
        user: {
          full_name: post.full_name,
          email: post.email,
          avatar_url: post.avatar_url
        }
      }));

      res.json(formattedPosts);
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
      const products = await db.execute(sql`
        SELECT 
          p.id,
          p.vendor_id,
          p.name,
          p.description,
          p.price,
          p.image_url,
          p.category,
          p.stock_quantity,
          p.created_at,
          pr.full_name as vendor_full_name,
          pr.email as vendor_email
        FROM products p
        LEFT JOIN profiles pr ON p.vendor_id = pr.id
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 50
      `);

      const formattedProducts = products.rows.map((product: any) => ({
        id: product.id,
        vendor_id: product.vendor_id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        category: product.category,
        stock_quantity: product.stock_quantity,
        created_at: product.created_at,
        vendor: {
          full_name: product.vendor_full_name,
          email: product.vendor_email
        }
      }));

      res.json(formattedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Get all groups endpoint
  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await db.execute(sql`
        SELECT 
          g.id,
          g.creator_id,
          g.product_id,
          g.name,
          g.description,
          g.is_private,
          g.member_limit,
          g.created_at
        FROM groups g
        ORDER BY g.created_at DESC
        LIMIT 50
      `);

      res.json(groups.rows);
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
