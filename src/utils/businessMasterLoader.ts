import { supabase } from './supabaseClient';

export interface BusinessMaster {
  業務id?: string;
  業務名?: string;
  開始時間?: string;
  終了時間?: string;
  業務グループ?: string;
  早朝手当?: string;
  深夜手当?: string;
  スキルマップ項目名?: string;
  ペア業務id?: string;
  is_active?: boolean;
}

// For backward compatibility
export interface BusinessMasterData extends BusinessMaster {}

// Load business master data from Supabase
export const loadBusinessMasterFromSupabase = async (): Promise<BusinessMaster[]> => {
  try {
    console.log('🔄 Loading business master data from Supabase...');
    
    const { data, error } = await supabase
      .from('business_master')
      .select('*')
      .eq('is_active', true)
      .order('業務id');

    if (error) {
      console.error('❌ Error loading business master from Supabase:', error);
      throw error;
    }

    console.log(`✅ Loaded ${data?.length || 0} business master entries from Supabase`);
    return data || [];
  } catch (error) {
    console.error('💥 Error in loadBusinessMasterFromSupabase:', error);
    throw error;
  }
};

// For backward compatibility - alias to loadBusinessMasterFromSupabase
export const loadBusinessMasterFromExcel = async (): Promise<BusinessMaster[]> => {
  console.log('⚠️ loadBusinessMasterFromExcel is deprecated, using loadBusinessMasterFromSupabase instead');
  return loadBusinessMasterFromSupabase();
};

// Update business master data in Supabase
export const updateBusinessMasterInSupabase = async (
  businessId: string, 
  updates: Partial<BusinessMaster>
): Promise<boolean> => {
  try {
    console.log(`🔄 Updating business master ${businessId} in Supabase...`, updates);
    
    const { error } = await supabase
      .from('business_master')
      .update(updates)
      .eq('業務id', businessId);

    if (error) {
      console.error('❌ Error updating business master in Supabase:', error);
      return false;
    }

    console.log(`✅ Successfully updated business master ${businessId}`);
    return true;
  } catch (error) {
    console.error('💥 Error in updateBusinessMasterInSupabase:', error);
    return false;
  }
};

// Save business master data to Supabase
export const saveBusinessMasterToSupabase = async (businessData: BusinessMaster[]): Promise<void> => {
  try {
    console.log('💾 Saving business master data to Supabase...');
    
    if (businessData.length === 0) {
      throw new Error('No business data to save');
    }

    const { error } = await supabase
      .from('business_master')
      .insert(businessData);

    if (error) {
      console.error('❌ Error saving business master to Supabase:', error);
      throw error;
    }

    console.log(`✅ Successfully saved ${businessData.length} business master entries to Supabase`);
  } catch (error) {
    console.error('💥 Error saving business master to Supabase:', error);
    throw error;
  }
};

// Delete all business master data from Supabase
export const clearBusinessMasterFromSupabase = async (): Promise<void> => {
  try {
    console.log('🗑️ Clearing all business master data from Supabase...');
    
    const { error } = await supabase
      .from('business_master')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('❌ Error clearing business master from Supabase:', error);
      throw error;
    }

    console.log('✅ Successfully cleared all business master data from Supabase');
  } catch (error) {
    console.error('💥 Error clearing business master from Supabase:', error);
    throw error;
  }
};

// Get business master statistics
export const getBusinessMasterStats = async (): Promise<{
  total: number;
  byGroup: Record<string, number>;
}> => {
  try {
    const { data, error } = await supabase
      .from('business_master')
      .select('業務グループ');

    if (error) {
      console.error('❌ Error getting business master stats:', error);
      return { total: 0, byGroup: {} };
    }

    const total = data?.length || 0;
    const byGroup: Record<string, number> = {};
    
    data?.forEach(item => {
      const group = item.業務グループ || '未設定';
      byGroup[group] = (byGroup[group] || 0) + 1;
    });

    return { total, byGroup };
  } catch (error) {
    console.error('💥 Error getting business master stats:', error);
    return { total: 0, byGroup: {} };
  }
};