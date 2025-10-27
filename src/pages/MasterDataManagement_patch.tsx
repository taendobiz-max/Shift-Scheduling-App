  const handleBusinessMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessMasterForm.業務名) {
      toast.error('業務名は必須です');
      return;
    }

    try {
      if (editingBusinessMasterId) {
        // Update existing business master
        const { error } = await supabase
          .from('app_9213e72257_business_master')
          .update(businessMasterForm)
          .eq('業務id', editingBusinessMasterId);

        if (error) throw error;
        toast.success('業務マスターを更新しました');
      } else {
        // Create new business master
        // Generate a unique business ID
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const newBusinessId = `BIZ${timestamp}${randomSuffix}`;
        
        const newBusinessMaster = {
          ...businessMasterForm,
          業務id: newBusinessId
        };
        
        const { error } = await supabase
          .from('app_9213e72257_business_master')
          .insert([newBusinessMaster]);

        if (error) throw error;
        toast.success('業務マスターを作成しました');
      }

      resetBusinessMasterForm();
      await loadBusinessMasters();
    } catch (error) {
      console.error('Error saving business master:', error);
      toast.error(`業務マスターの保存に失敗しました: ${(error as Error).message}`);
    }
  };

