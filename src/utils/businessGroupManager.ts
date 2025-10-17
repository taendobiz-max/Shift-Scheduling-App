import { supabase } from './supabaseClient';

export interface BusinessGroup {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

// Get all unique business groups from the business master data
export const getBusinessGroupsFromMaster = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('app_9213e72257_business_master')
      .select('業務グループ, スキルマップ項目名')
      .not('業務グループ', 'is', null)
      .not('業務グループ', 'eq', '');

    if (error) {
      console.error('Error fetching business groups:', error);
      return [];
    }

    // Extract unique groups from both 業務グループ and スキルマップ項目名
    const groups = new Set<string>();
    
    data?.forEach(item => {
      if (item.業務グループ && item.業務グループ.trim()) {
        groups.add(item.業務グループ.trim());
      }
      if (item.スキルマップ項目名 && item.スキルマップ項目名.trim()) {
        groups.add(item.スキルマップ項目名.trim());
      }
    });

    return Array.from(groups).sort();
  } catch (error) {
    console.error('Error getting business groups:', error);
    return [];
  }
};

// Create business groups table if it doesn't exist
export const initializeBusinessGroupsTable = async (): Promise<void> => {
  try {
    // Table creation is handled by SupabaseManager.execute_sql
    console.log('✅ Business groups table initialization completed');
  } catch (error) {
    console.error('Error in initializeBusinessGroupsTable:', error);
  }
};

// Add a new business group
export const addBusinessGroup = async (groupName: string, description?: string): Promise<boolean> => {
  try {
    if (!groupName || !groupName.trim()) {
      throw new Error('Business group name is required');
    }

    const { error } = await supabase
      .from('app_9213e72257_business_groups')
      .insert([
        {
          name: groupName.trim(),
          description: description?.trim() || null
        }
      ]);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('この業務グループは既に存在します');
      }
      throw error;
    }

    console.log(`✅ Business group "${groupName}" added successfully`);
    return true;
  } catch (error) {
    console.error('Error adding business group:', error);
    throw error;
  }
};

// Get all business groups (from both master data and groups table)
export const getAllBusinessGroups = async (): Promise<string[]> => {
  try {
    // Get groups from master data
    const masterGroups = await getBusinessGroupsFromMaster();
    
    // Get groups from business_groups table
    const { data: groupsData, error } = await supabase
      .from('app_9213e72257_business_groups')
      .select('name')
      .order('name');

    const tableGroups = groupsData?.map(g => g.name) || [];
    
    // Combine and deduplicate
    const allGroups = new Set([...masterGroups, ...tableGroups]);
    return Array.from(allGroups).sort();
  } catch (error) {
    console.error('Error getting all business groups:', error);
    return [];
  }
};

// Update business master entry with new group
export const updateBusinessGroup = async (businessId: string, newGroup: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_9213e72257_business_master')
      .update({ 業務グループ: newGroup })
      .eq('業務id', businessId);

    if (error) {
      console.error('Error updating business group:', error);
      return false;
    }

    console.log(`✅ Updated business ${businessId} to group "${newGroup}"`);
    return true;
  } catch (error) {
    console.error('Error updating business group:', error);
    return false;
  }
};