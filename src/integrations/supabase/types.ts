export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'vendor' | 'admin'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'user' | 'vendor' | 'admin'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'user' | 'vendor' | 'admin'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          vendor_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          category: string | null
          stock_quantity: number
          is_active: boolean
          group_order_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          category?: string | null
          stock_quantity?: number
          is_active?: boolean
          group_order_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          category?: string | null
          stock_quantity?: number
          is_active?: boolean
          group_order_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          display_order: number
          is_primary: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          display_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          display_order?: number
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_discount_tiers: {
        Row: {
          id: string
          product_id: string
          tier_number: number
          members_required: number
          discount_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          tier_number: number
          members_required: number
          discount_percentage: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          tier_number?: number
          members_required?: number
          discount_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_discount_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      vendor_kyc: {
        Row: {
          id: string
          vendor_id: string
          business_name: string
          ho_address: string
          warehouse_address: string
          phone_number: string
          gst_number: string
          gst_url: string
          pan_number: string
          pan_url: string
          tan_number: string
          turnover_over_5cr: boolean
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          version: number
          is_active: boolean
          previous_kyc_id: string | null
          submission_count: number
        }
        Insert: {
          id?: string
          vendor_id: string
          business_name: string
          ho_address: string
          warehouse_address: string
          phone_number: string
          gst_number: string
          gst_url: string
          pan_number: string
          pan_url: string
          tan_number: string
          turnover_over_5cr: boolean
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version?: number
          is_active?: boolean
          previous_kyc_id?: string | null
          submission_count?: number
        }
        Update: {
          id?: string
          vendor_id?: string
          business_name?: string
          ho_address?: string
          warehouse_address?: string
          phone_number?: string
          gst_number?: string
          gst_url?: string
          pan_number?: string
          pan_url?: string
          tan_number?: string
          turnover_over_5cr?: boolean
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version?: number
          is_active?: boolean
          previous_kyc_id?: string | null
          submission_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_kyc_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_kyc: {
        Args: {
          vendor_uuid: string
        }
        Returns: {
          id: string
          vendor_id: string
          business_name: string
          ho_address: string
          warehouse_address: string
          phone_number: string
          gst_number: string
          gst_url: string
          pan_number: string
          pan_url: string
          tan_number: string
          turnover_over_5cr: boolean
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          version: number
          is_active: boolean
          previous_kyc_id: string | null
          submission_count: number
        }[]
      }
      create_kyc_version: {
        Args: {
          vendor_uuid: string
          business_name_param: string
          ho_address_param: string
          warehouse_address_param: string
          phone_number_param: string
          gst_number_param: string
          gst_url_param: string
          pan_number_param: string
          pan_url_param: string
          tan_number_param: string
          turnover_over_5cr_param: boolean
        }
        Returns: string
      }
      get_applicable_discount: {
        Args: {
          product_uuid: string
          member_count: number
        }
        Returns: number
      }
      get_user_role: {
        Args: {
          user_uuid: string
        }
        Returns: 'user' | 'vendor' | 'admin'
      }
      set_primary_product_image: {
        Args: {
          product_uuid: string
          image_uuid: string
        }
        Returns: undefined
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      kyc_status: 'pending' | 'approved' | 'rejected'
      post_type: 'text' | 'image' | 'product'
      user_role: 'user' | 'vendor' | 'admin'
    }
  }
}
