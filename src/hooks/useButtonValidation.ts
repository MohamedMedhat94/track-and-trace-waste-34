import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useButtonValidation = () => {
  const { toast } = useToast();

  const validateAndExecute = async (
    buttonName: string,
    action: () => Promise<any>,
    successMessage?: string
  ) => {
    try {
      console.log(`Executing action for button: ${buttonName}`);
      
      const result = await action();
      
      // Log successful button action
      await supabase.rpc('log_button_action', {
        button_name_param: buttonName,
        action_result_param: 'success'
      });

      if (successMessage) {
        toast({
          title: "نجح العملية",
          description: successMessage,
        });
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error(`Error in button action ${buttonName}:`, error);
      
      // Log failed button action
      await supabase.rpc('log_button_action', {
        button_name_param: buttonName,
        action_result_param: 'error',
        error_message_param: error.message || 'Unknown error'
      });

      toast({
        title: "خطأ في العملية",
        description: `فشل تنفيذ العملية: ${error.message || 'خطأ غير معروف'}`,
        variant: "destructive",
      });

      return { success: false, error: error.message };
    }
  };

  return { validateAndExecute };
};