export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      auth_logs: {
        Row: {
          action: string
          created_at: string | null
          email: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          category_display_name: string | null
          commercial_reg_no: string | null
          company_id_display: string | null
          company_id_no: string | null
          contact_person: string | null
          created_at: string
          drivers_count: number | null
          email: string | null
          environmental_approval_no: string | null
          facility_reg_no: string | null
          fax: string | null
          id: string
          industrial_registry: string | null
          is_active: boolean | null
          license_no: string | null
          location_address: string | null
          location_latitude: number | null
          location_longitude: number | null
          name: string
          operating_license_no: string | null
          phone: string | null
          registered_activity: string | null
          signup_timestamp: string | null
          status: string | null
          tax_card_no: string | null
          tax_id: string | null
          type: string
          union_membership_no: string | null
          updated_at: string
          waste_license_no: string | null
        }
        Insert: {
          address?: string | null
          category_display_name?: string | null
          commercial_reg_no?: string | null
          company_id_display?: string | null
          company_id_no?: string | null
          contact_person?: string | null
          created_at?: string
          drivers_count?: number | null
          email?: string | null
          environmental_approval_no?: string | null
          facility_reg_no?: string | null
          fax?: string | null
          id?: string
          industrial_registry?: string | null
          is_active?: boolean | null
          license_no?: string | null
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          name: string
          operating_license_no?: string | null
          phone?: string | null
          registered_activity?: string | null
          signup_timestamp?: string | null
          status?: string | null
          tax_card_no?: string | null
          tax_id?: string | null
          type: string
          union_membership_no?: string | null
          updated_at?: string
          waste_license_no?: string | null
        }
        Update: {
          address?: string | null
          category_display_name?: string | null
          commercial_reg_no?: string | null
          company_id_display?: string | null
          company_id_no?: string | null
          contact_person?: string | null
          created_at?: string
          drivers_count?: number | null
          email?: string | null
          environmental_approval_no?: string | null
          facility_reg_no?: string | null
          fax?: string | null
          id?: string
          industrial_registry?: string | null
          is_active?: boolean | null
          license_no?: string | null
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          name?: string
          operating_license_no?: string | null
          phone?: string | null
          registered_activity?: string | null
          signup_timestamp?: string | null
          status?: string | null
          tax_card_no?: string | null
          tax_id?: string | null
          type?: string
          union_membership_no?: string | null
          updated_at?: string
          waste_license_no?: string | null
        }
        Relationships: []
      }
      company_signatures: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          signature_image_url: string | null
          signature_uploaded_at: string | null
          stamp_image_url: string | null
          stamp_uploaded_at: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          signature_image_url?: string | null
          signature_uploaded_at?: string | null
          stamp_image_url?: string | null
          stamp_uploaded_at?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          signature_image_url?: string | null
          signature_uploaded_at?: string | null
          stamp_image_url?: string | null
          stamp_uploaded_at?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          driver_id: string
          heading: number | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          recorded_at: string | null
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          driver_id: string
          heading?: number | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          recorded_at?: string | null
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          driver_id?: string
          heading?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          recorded_at?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_route_history: {
        Row: {
          accuracy: number | null
          address: string | null
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          location_type: string | null
          longitude: number
          notes: string | null
          recorded_at: string | null
          shipment_id: string | null
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          address?: string | null
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          location_type?: string | null
          longitude: number
          notes?: string | null
          recorded_at?: string | null
          shipment_id?: string | null
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          address?: string | null
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          location_type?: string | null
          longitude?: number
          notes?: string | null
          recorded_at?: string | null
          shipment_id?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_route_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_route_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          assigned_vehicle_number: string | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          department: string | null
          destination_address: string | null
          destination_latitude: number | null
          destination_longitude: number | null
          email: string | null
          id: string
          is_online: boolean | null
          last_location_update: string | null
          last_ping: string | null
          license_number: string | null
          license_type: string | null
          location_address: string | null
          location_latitude: number | null
          location_longitude: number | null
          name: string
          national_id: string | null
          phone: string | null
          route_history: Json | null
          signup_timestamp: string | null
          tracking_enabled: boolean | null
          transport_company_id: string | null
          updated_at: string
          user_id: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          assigned_vehicle_number?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          department?: string | null
          destination_address?: string | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          email?: string | null
          id?: string
          is_online?: boolean | null
          last_location_update?: string | null
          last_ping?: string | null
          license_number?: string | null
          license_type?: string | null
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          name: string
          national_id?: string | null
          phone?: string | null
          route_history?: Json | null
          signup_timestamp?: string | null
          tracking_enabled?: boolean | null
          transport_company_id?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          assigned_vehicle_number?: string | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          department?: string | null
          destination_address?: string | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          email?: string | null
          id?: string
          is_online?: boolean | null
          last_location_update?: string | null
          last_ping?: string | null
          license_number?: string | null
          license_type?: string | null
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          name?: string
          national_id?: string | null
          phone?: string | null
          route_history?: Json | null
          signup_timestamp?: string | null
          tracking_enabled?: boolean | null
          transport_company_id?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_transport_company_id_fkey"
            columns: ["transport_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_tracking: {
        Row: {
          accuracy: number | null
          altitude: number | null
          driver_id: string
          heading: number | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          recorded_at: string
          shipment_id: string | null
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          driver_id: string
          heading?: number | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          recorded_at?: string
          shipment_id?: string | null
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          driver_id?: string
          heading?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          shipment_id?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_tracking_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_tracking_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_settings: {
        Row: {
          display_order: number | null
          id: string
          is_visible: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          phone: string | null
          role: string
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          role: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          role?: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      route_tracking: {
        Row: {
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string | null
          shipment_id: string | null
          speed: number | null
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string | null
          shipment_id?: string | null
          speed?: number | null
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string | null
          shipment_id?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_tracking_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_tracking_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          recipient_company_id: string
          sent_via_email: boolean | null
          shipment_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          recipient_company_id: string
          sent_via_email?: boolean | null
          shipment_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_company_id?: string
          sent_via_email?: boolean | null
          shipment_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_notifications_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          arrival_confirmed_at: string | null
          auto_approval_deadline: string | null
          created_at: string
          created_by: string | null
          current_driver_latitude: number | null
          current_driver_longitude: number | null
          delivery_date: string | null
          delivery_latitude: number | null
          delivery_location: string | null
          delivery_longitude: number | null
          disposal_method: string | null
          driver_entry_type: string | null
          driver_id: string | null
          entry_time: string | null
          estimated_arrival: string | null
          exit_date: string | null
          exit_time: string | null
          generator_approval_status: string | null
          generator_approved_at: string | null
          generator_approved_by: string | null
          generator_company_id: string
          generator_rejection_reason: string | null
          id: string
          manual_driver_name: string | null
          manual_vehicle_number: string | null
          overall_approval_status: string | null
          packaging: string | null
          pdf_receipt_generated: boolean | null
          pdf_receipt_url: string | null
          pickup_date: string | null
          pickup_latitude: number | null
          pickup_location: string | null
          pickup_longitude: number | null
          quantity: number | null
          recycler_approval_status: string | null
          recycler_approved_at: string | null
          recycler_approved_by: string | null
          recycler_company_id: string
          recycler_rejection_reason: string | null
          recycling_end_time: string | null
          recycling_start_time: string | null
          report_created_at: string | null
          report_created_by: string | null
          shipment_number: string
          shipment_report: string | null
          shipment_status: string | null
          sorting_end_time: string | null
          sorting_start_time: string | null
          status: string
          status_history: Json | null
          tracking_enabled: boolean | null
          transporter_company_id: string
          updated_at: string
          vehicle_number: string | null
          waste_description: string | null
          waste_type_id: string
          whatsapp_notification_sent: boolean | null
        }
        Insert: {
          arrival_confirmed_at?: string | null
          auto_approval_deadline?: string | null
          created_at?: string
          created_by?: string | null
          current_driver_latitude?: number | null
          current_driver_longitude?: number | null
          delivery_date?: string | null
          delivery_latitude?: number | null
          delivery_location?: string | null
          delivery_longitude?: number | null
          disposal_method?: string | null
          driver_entry_type?: string | null
          driver_id?: string | null
          entry_time?: string | null
          estimated_arrival?: string | null
          exit_date?: string | null
          exit_time?: string | null
          generator_approval_status?: string | null
          generator_approved_at?: string | null
          generator_approved_by?: string | null
          generator_company_id: string
          generator_rejection_reason?: string | null
          id?: string
          manual_driver_name?: string | null
          manual_vehicle_number?: string | null
          overall_approval_status?: string | null
          packaging?: string | null
          pdf_receipt_generated?: boolean | null
          pdf_receipt_url?: string | null
          pickup_date?: string | null
          pickup_latitude?: number | null
          pickup_location?: string | null
          pickup_longitude?: number | null
          quantity?: number | null
          recycler_approval_status?: string | null
          recycler_approved_at?: string | null
          recycler_approved_by?: string | null
          recycler_company_id: string
          recycler_rejection_reason?: string | null
          recycling_end_time?: string | null
          recycling_start_time?: string | null
          report_created_at?: string | null
          report_created_by?: string | null
          shipment_number: string
          shipment_report?: string | null
          shipment_status?: string | null
          sorting_end_time?: string | null
          sorting_start_time?: string | null
          status?: string
          status_history?: Json | null
          tracking_enabled?: boolean | null
          transporter_company_id: string
          updated_at?: string
          vehicle_number?: string | null
          waste_description?: string | null
          waste_type_id: string
          whatsapp_notification_sent?: boolean | null
        }
        Update: {
          arrival_confirmed_at?: string | null
          auto_approval_deadline?: string | null
          created_at?: string
          created_by?: string | null
          current_driver_latitude?: number | null
          current_driver_longitude?: number | null
          delivery_date?: string | null
          delivery_latitude?: number | null
          delivery_location?: string | null
          delivery_longitude?: number | null
          disposal_method?: string | null
          driver_entry_type?: string | null
          driver_id?: string | null
          entry_time?: string | null
          estimated_arrival?: string | null
          exit_date?: string | null
          exit_time?: string | null
          generator_approval_status?: string | null
          generator_approved_at?: string | null
          generator_approved_by?: string | null
          generator_company_id?: string
          generator_rejection_reason?: string | null
          id?: string
          manual_driver_name?: string | null
          manual_vehicle_number?: string | null
          overall_approval_status?: string | null
          packaging?: string | null
          pdf_receipt_generated?: boolean | null
          pdf_receipt_url?: string | null
          pickup_date?: string | null
          pickup_latitude?: number | null
          pickup_location?: string | null
          pickup_longitude?: number | null
          quantity?: number | null
          recycler_approval_status?: string | null
          recycler_approved_at?: string | null
          recycler_approved_by?: string | null
          recycler_company_id?: string
          recycler_rejection_reason?: string | null
          recycling_end_time?: string | null
          recycling_start_time?: string | null
          report_created_at?: string | null
          report_created_by?: string | null
          shipment_number?: string
          shipment_report?: string | null
          shipment_status?: string | null
          sorting_end_time?: string | null
          sorting_start_time?: string | null
          status?: string
          status_history?: Json | null
          tracking_enabled?: boolean | null
          transporter_company_id?: string
          updated_at?: string
          vehicle_number?: string | null
          waste_description?: string | null
          waste_type_id?: string
          whatsapp_notification_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_generator_company_id_fkey"
            columns: ["generator_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_recycler_company_id_fkey"
            columns: ["recycler_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_transporter_company_id_fkey"
            columns: ["transporter_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_waste_type_id_fkey"
            columns: ["waste_type_id"]
            isOneToOne: false
            referencedRelation: "waste_types"
            referencedColumns: ["id"]
          },
        ]
      }
      system_counters: {
        Row: {
          count: number
          counter_type: string
          id: string
          updated_at: string
        }
        Insert: {
          count?: number
          counter_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          count?: number
          counter_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          company_id: string | null
          company_name: string
          company_stamp_data: string | null
          company_type: string
          created_at: string | null
          full_name: string
          id: string
          ip_address: string | null
          signature_data: string | null
          terms_content: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          company_id?: string | null
          company_name: string
          company_stamp_data?: string | null
          company_type: string
          created_at?: string | null
          full_name: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          terms_content: string
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          company_id?: string | null
          company_name?: string
          company_stamp_data?: string | null
          company_type?: string
          created_at?: string | null
          full_name?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          terms_content?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credentials_audit: {
        Row: {
          admin_id: string
          id: string
          viewed_at: string | null
          viewed_user_id: string
        }
        Insert: {
          admin_id: string
          id?: string
          viewed_at?: string | null
          viewed_user_id: string
        }
        Update: {
          admin_id?: string
          id?: string
          viewed_at?: string | null
          viewed_user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste_entities: {
        Row: {
          address: string | null
          commercial_reg_no: string | null
          created_at: string | null
          entity_type: string
          environmental_approval_no: string | null
          fax: string | null
          id: string
          license_number: string | null
          name: string
          phone: string | null
          registered_activity: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commercial_reg_no?: string | null
          created_at?: string | null
          entity_type: string
          environmental_approval_no?: string | null
          fax?: string | null
          id?: string
          license_number?: string | null
          name: string
          phone?: string | null
          registered_activity?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commercial_reg_no?: string | null
          created_at?: string | null
          entity_type?: string
          environmental_approval_no?: string | null
          fax?: string | null
          id?: string
          license_number?: string | null
          name?: string
          phone?: string | null
          registered_activity?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waste_types: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      whatsapp_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          recipient_phone: string
          response_data: Json | null
          sent_at: string | null
          shipment_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          recipient_phone: string
          response_data?: Json | null
          sent_at?: string | null
          shipment_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          recipient_phone?: string
          response_data?: Json | null
          sent_at?: string | null
          shipment_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_user: {
        Args: { activate: boolean; target_user_id: string }
        Returns: undefined
      }
      add_driver_location_point: {
        Args: {
          accuracy_param?: number
          address_param?: string
          driver_id_param: string
          heading_param?: number
          latitude_param: number
          location_type_param?: string
          longitude_param: number
          notes_param?: string
          shipment_id_param?: string
          speed_param?: number
        }
        Returns: string
      }
      add_shipment_report: {
        Args: { report_text: string; shipment_id_param: string }
        Returns: undefined
      }
      admin_reset_user_password: {
        Args: { new_password: string; target_email: string }
        Returns: undefined
      }
      approve_shipment: {
        Args: {
          approval_type: string
          is_approved: boolean
          rejection_reason_param?: string
          shipment_id_param: string
        }
        Returns: undefined
      }
      assign_user_to_company: {
        Args: { target_company_id: string; target_user_id: string }
        Returns: undefined
      }
      auto_approve_expired_shipments: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          notification_data?: Json
          notification_message: string
          notification_title: string
          notification_type: string
        }
        Returns: string
      }
      create_shipment_notification: {
        Args: {
          message_param: string
          notification_type_param: string
          recipient_company_id_param: string
          shipment_id_param: string
          title_param: string
        }
        Returns: string
      }
      delete_all_companies: { Args: never; Returns: undefined }
      get_active_drivers: {
        Args: never
        Returns: {
          current_latitude: number
          current_longitude: number
          email: string
          id: string
          is_online: boolean
          last_ping: string
          name: string
          phone: string
          transport_company_id: string
          vehicle_plate: string
          vehicle_type: string
        }[]
      }
      get_all_drivers: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          is_online: boolean
          last_ping: string
          license_number: string
          license_type: string
          location_address: string
          name: string
          national_id: string
          phone: string
          transport_company_id: string
          vehicle_plate: string
          vehicle_type: string
        }[]
      }
      get_companies_for_selection: {
        Args: never
        Returns: {
          id: string
          location_address: string
          name: string
          type: string
        }[]
      }
      get_companies_stats: {
        Args: never
        Returns: {
          active_shipments: number
          company_id: string
          company_name: string
          company_type: string
          completed_shipments: number
          total_shipments: number
          total_waste_processed: number
        }[]
      }
      get_company_shipments: {
        Args: { company_type: string }
        Returns: {
          created_at: string
          generator_company_name: string
          id: string
          quantity: number
          recycler_company_name: string
          shipment_number: string
          status: string
          transporter_company_name: string
          waste_type_name: string
        }[]
      }
      get_company_users: {
        Args: { target_company_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_dashboard_stats: {
        Args: never
        Returns: {
          active_shipments: number
          pending_users: number
          total_companies: number
          total_drivers: number
          total_shipments: number
        }[]
      }
      get_driver_for_pdf: {
        Args: { driver_id_param: string }
        Returns: {
          id: string
          license_number: string
          name: string
          phone: string
        }[]
      }
      get_driver_shipments: {
        Args: never
        Returns: {
          created_at: string
          delivery_location: string
          generator_company_name: string
          id: string
          pickup_location: string
          quantity: number
          recycler_company_name: string
          shipment_number: string
          status: string
          transporter_company_name: string
        }[]
      }
      get_drivers_for_selection: {
        Args: never
        Returns: {
          id: string
          name: string
          vehicle_plate: string
          vehicle_type: string
        }[]
      }
      get_drivers_for_tracking: {
        Args: never
        Returns: {
          current_latitude: number
          current_longitude: number
          id: string
          is_online: boolean
          last_location_update: string
          last_ping: string
          name: string
          vehicle_plate: string
          vehicle_type: string
        }[]
      }
      get_shipment_with_signatures: {
        Args: { shipment_id_param: string }
        Returns: {
          generator_signature: string
          generator_stamp: string
          recycler_signature: string
          recycler_stamp: string
          shipment_data: Json
          transporter_signature: string
          transporter_stamp: string
        }[]
      }
      get_unassigned_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      get_user_credentials: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          email: string
          role: string
          username: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_accepted_terms: {
        Args: { required_version?: string; user_id_param: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_counter: { Args: { counter_name: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      log_auth_event: {
        Args: {
          action_param: string
          email_param: string
          ip_param?: string
          user_agent_param?: string
          user_id_param: string
        }
        Returns: string
      }
      log_button_action: {
        Args: {
          action_result_param: string
          button_name_param: string
          error_message_param?: string
        }
        Returns: string
      }
      log_system_activity: {
        Args: {
          action_type_param: string
          details_param?: Json
          entity_id_param?: string
          entity_type_param: string
        }
        Returns: string
      }
      promote_user_to_admin: {
        Args: { target_email: string }
        Returns: undefined
      }
      reset_all_users: { Args: never; Returns: undefined }
      send_whatsapp_notification: {
        Args: {
          message_param: string
          phone_param: string
          shipment_id_param?: string
        }
        Returns: string
      }
      update_driver_current_location: {
        Args: {
          accuracy_param?: number
          driver_id_param: string
          heading_param?: number
          latitude_param: number
          longitude_param: number
          speed_param?: number
        }
        Returns: undefined
      }
      update_driver_gps: {
        Args: {
          driver_id_param: string
          heading_param?: number
          latitude_param: number
          longitude_param: number
          shipment_id_param?: string
          speed_param?: number
        }
        Returns: undefined
      }
      update_driver_location: {
        Args: {
          driver_id_param: string
          latitude_param: number
          longitude_param: number
        }
        Returns: undefined
      }
      update_driver_location_with_route: {
        Args: {
          driver_id_param: string
          heading_param?: number
          latitude_param: number
          longitude_param: number
          shipment_id_param?: string
          speed_param?: number
        }
        Returns: undefined
      }
      update_shipment_status: {
        Args: {
          new_status_param: string
          notes_param?: string
          shipment_id_param: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "generator" | "transporter" | "recycler" | "driver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "generator", "transporter", "recycler", "driver"],
    },
  },
} as const
