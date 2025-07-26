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
      vendor_kyc: {
        Row: {
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
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: "pending" | "approved" | "rejected" | null
          submitted_at: string | null
          vendor_id: string
          version: number
          is_active: boolean
          previous_kyc_id: string | null
          submission_count: number
        }
        Insert: {
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
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: "pending" | "approved" | "rejected" | null
          submitted_at?: string | null
          vendor_id: string
          version?: number
          is_active?: boolean
          previous_kyc_id?: string | null
          submission_count?: number
        }
        Update: {
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
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: "pending" | "approved" | "rejected" | null
          submitted_at?: string | null
          vendor_id?: string
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
          },
          {
            foreignKeyName: "vendor_kyc_previous_kyc_id_fkey"
            columns: ["previous_kyc_id"]
            isOneToOne: false
            referencedRelation: "vendor_kyc"
            referencedColumns: ["id"]
          }
        ]
      }
      // Add other table definitions as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_applicable_discount: {
        Args: {
          product_uuid: string
          member_count: number
        }
        Returns: number
      }
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
          status: "pending" | "approved" | "rejected"
          rejection_reason: string | null
          submitted_at: string | null
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
          business_name_val: string
          ho_address_val: string
          warehouse_address_val: string
          phone_number_val: string
          gst_number_val: string
          gst_url_val: string
          pan_number_val: string
          pan_url_val: string
          tan_number_val: string
          turnover_over_5cr_val: boolean
        }
        Returns: string
      }
    }
    Enums: {
      kyc_status: "pending" | "approved" | "rejected"
      user_role: "user" | "vendor" | "admin"
    }
  }
}
