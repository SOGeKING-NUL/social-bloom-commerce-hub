# SocialShop - Social E-Commerce Platform

## Overview

SocialShop is a modern social e-commerce platform that combines social networking features with online shopping. Built with React, TypeScript, Express.js, and Supabase, it enables users to create groups, share products, interact socially, and make purchases within a community-driven environment.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with custom design system (pink/rose theme)
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: React Router for client-side navigation
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Drizzle ORM with schema definitions
- **Authentication**: Supabase Auth with role-based access control
- **API Style**: RESTful API with Express routes
- **File Storage**: Supabase Storage for images and assets

### Database Design
The application uses a comprehensive PostgreSQL schema with the following key entities:
- **Users & Profiles**: User authentication and profile management with role-based access (user/vendor/admin)
- **Products**: Product catalog with vendor relationships
- **Groups**: Social groups for collaborative shopping
- **Posts & Social Features**: Social media-like posts, comments, likes, and following
- **E-commerce**: Cart, orders, wishlist functionality
- **KYC**: Vendor verification system

## Key Components

### Authentication & Authorization
- Multi-role system (user, vendor, admin)
- Supabase authentication with custom profile management
- Row Level Security (RLS) policies for data access control
- Vendor KYC verification process

### Social Features
- Instagram-style post creation with image uploads
- Comments and likes system
- User following relationships
- Group creation and management
- Join requests and invite systems
- Comprehensive search functionality for posts and users
- Real-time content discovery through search interface

### E-commerce Features
- Product catalog with search and filtering
- Shopping cart functionality
- Wishlist management
- Order processing system
- Vendor product management

### UI/UX Design
- Pink-themed design system with smooth curves and gradients
- Responsive design for mobile and desktop
- Custom animations and transitions
- Accessible components with proper ARIA labels

## Data Flow

1. **Authentication Flow**: Users authenticate through Supabase Auth, with automatic profile creation via database triggers
2. **Social Interactions**: Posts, comments, and likes are managed through React Query with optimistic updates
3. **E-commerce Flow**: Products are browsed, added to cart, and processed through order management system
4. **Group Management**: Users can create groups, send invites, and manage join requests
5. **Real-time Updates**: Supabase real-time subscriptions for live data updates

## External Dependencies

### Core Dependencies
- **@supabase/supabase-js**: Database and authentication client
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe ORM for database operations
- **@neondatabase/serverless**: Serverless database connection

### UI/Design Dependencies
- **@radix-ui/react-***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Utility for component variants

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking
- **esbuild**: Fast bundler for production builds

## Deployment Strategy

The application is configured for Replit deployment with:
- **Development**: `npm run dev` - runs both frontend and backend concurrently
- **Production Build**: `npm run build` - builds React app and bundles Express server
- **Production Start**: `npm run start` - serves the built application
- **Database Migrations**: `npm run db:push` - applies Drizzle schema changes

### Environment Configuration
- PostgreSQL database provisioned automatically in Replit
- Supabase integration for authentication and real-time features
- Static file serving for built React application

## Changelog

- June 26, 2025: Initial setup
- June 26, 2025: Added comprehensive search functionality to home page and feed page
  - Implemented SearchSection component with posts and users search tabs
  - Integrated with Supabase for real-time search through posts content and user profiles
  - Added search to both Index page (home) and Feed page for consistent user experience
- June 26, 2025: Enhanced search with collapsible sidebar design
  - Converted search into button-triggered collapsible sidebar
  - Added smooth slide-in/slide-out transitions with backdrop
  - Applied webapp's pink-purple gradient theme to search button
  - Positioned search button lower for better UX
  - Removed search from home page, kept only on feed page
- June 26, 2025: Replaced cart page with comprehensive groups page
  - Removed cart functionality and navigation
  - Created user-specific groups page with analytics dashboard
  - Added filtering and sorting by group attributes (name, members, activity, privacy)
  - Implemented search functionality for groups
  - Added analytics cards showing total groups, admin roles, members, and posts
  - Used clean card-based layout with group information and engagement metrics
- January 17, 2025: Enhanced groups with multiple vendor products functionality
  - Created group_products database table to support multiple products per group from same vendor
  - Added database functions for managing group products (get_group_products, add_product_to_group, remove_product_from_group)
  - Implemented VendorProductsView component allowing group members to browse and add multiple products from the same vendor
  - Enhanced group detail page to display all vendor products instead of single product
  - Added product search and filtering within vendor's catalog in group context
- January 17, 2025: Implemented comprehensive group-based checkout system
  - Created three new database tables: group_checkout_sessions, group_checkout_items, group_checkout_notifications
  - Built admin-controlled checkout workflow: admin initiates → members pay individually → admin completes final checkout
  - Added GroupCheckout component with different views for admins and members
  - Admins can start checkout sessions, send payment notifications, and monitor payment status
  - Members receive notifications, can add shipping addresses, and pay for their selected items
  - Created dedicated checkout page with navigation integration
  - Implemented database functions for checkout management and dashboard analytics
- January 17, 2025: Enhanced individual cart checkout with Stripe integration
  - Created StripeCheckout page with comprehensive payment processing
  - Added test card support with clear instructions for development testing
  - Fixed RLS (Row Level Security) issues by disabling RLS on order_items table
  - Implemented automatic order creation and cart clearing after successful payment
  - Added proper error handling and loading states for payment flow
  - Updated cart page to redirect to new Stripe checkout flow
  - Supports test payments with cards like 4242 4242 4242 4242
- January 17, 2025: **CRITICAL: Complete database migration from mixed Supabase/PostgreSQL to unified PostgreSQL**
  - **Issue**: Application was using both Supabase and local PostgreSQL causing data inconsistency and empty cart problems
  - **Solution**: Migrated entire application to use only local PostgreSQL through REST API endpoints
  - **Migration scope**: Products, profiles, cart, orders, KYC, categories, user search
  - **New API endpoints**: /api/products, /api/categories, /api/users/search, /api/profiles, /api/kyc, /api/cart/add
  - **Benefits**: Consistent data source, easier AWS RDS deployment, no vendor lock-in
  - **Architecture**: Single PostgreSQL database accessed via Express.js API endpoints
  - **Cart issue resolved**: Cart now properly displays items through unified database

## User Preferences

Preferred communication style: Simple, everyday language.