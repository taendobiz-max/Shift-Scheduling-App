import { createClient } from '@supabase/supabase-js'

// Use import.meta.env for Vite instead of process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Employee interface matching the database structure
export interface Employee {
  id: string
  employee_id: string
  name: string
  email?: string
  phone?: string
  department?: string
  position?: string
  hire_date?: string
  status?: string
  created_at?: string
  updated_at?: string
}

// Shift interface
export interface Shift {
  id: string
  employee_id: string
  employee_name?: string
  shift_date: string
  start_time: string
  end_time: string
  status: string
  created_at?: string
  updated_at?: string
}

// Employee data operations
export const employeeService = {
  // Get all employees
  async getAll(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('name')
      
      if (error) {
        console.error('Error fetching employees:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in getAll employees:', error)
      return []
    }
  },

  // Get employee by ID
  async getById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Error fetching employee:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in getById employee:', error)
      return null
    }
  },

  // Create new employee
  async create(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating employee:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in create employee:', error)
      return null
    }
  },

  // Update employee
  async update(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating employee:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in update employee:', error)
      return null
    }
  },

  // Delete employee (soft delete by setting status to inactive)
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting employee:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error in delete employee:', error)
      return false
    }
  }
}

// Shift data operations
export const shiftService = {
  // Get all shifts
  async getAll(): Promise<Shift[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          employees!inner(name)
        `)
        .order('shift_date', { ascending: true })
      
      if (error) {
        console.error('Error fetching shifts:', error)
        return []
      }
      
      // Transform data to include employee name
      return (data || []).map(shift => ({
        ...shift,
        employee_name: shift.employees?.name
      }))
    } catch (error) {
      console.error('Error in getAll shifts:', error)
      return []
    }
  },

  // Create multiple shifts
  async createBatch(shifts: Omit<Shift, 'id' | 'created_at' | 'updated_at'>[]): Promise<Shift[]> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert(shifts)
        .select()
      
      if (error) {
        console.error('Error creating shifts:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in createBatch shifts:', error)
      return []
    }
  },

  // Delete shifts by date range
  async deleteByDateRange(startDate: string, endDate: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
      
      if (error) {
        console.error('Error deleting shifts:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error in deleteByDateRange shifts:', error)
      return false
    }
  }
}