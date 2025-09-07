import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WasteType {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

const ManageWasteTypes: React.FC = () => {
  const { toast } = useToast();
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWasteType, setEditingWasteType] = useState<WasteType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchWasteTypes();
  }, []);

  const fetchWasteTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('waste_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWasteTypes(data || []);
    } catch (error) {
      console.error('Error fetching waste types:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل أنواع النفايات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission started', { formData, editingWasteType });
    
    if (!formData.name.trim()) {
      toast({
        title: "خطأ في الإدخال",
        description: "يرجى إدخال اسم نوع النفايات",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingWasteType) {
        // Update existing waste type
        console.log('Updating waste type:', editingWasteType.id);
        const { data, error } = await supabase
          .from('waste_types')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', editingWasteType.id);

        console.log('Update result:', { data, error });
        if (error) throw error;

        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث نوع النفايات بنجاح",
        });
      } else {
        // Create new waste type
        console.log('Creating new waste type');
        const { data, error } = await supabase
          .from('waste_types')
          .insert([{
            name: formData.name,
            description: formData.description
          }]);

        console.log('Insert result:', { data, error });
        if (error) throw error;

        toast({
          title: "تم الإضافة بنجاح",
          description: "تم إضافة نوع النفايات الجديد بنجاح",
        });
      }

      // Reset form and close dialog
      setFormData({ name: '', description: '' });
      setEditingWasteType(null);
      setIsDialogOpen(false);
      
      // Refresh data
      fetchWasteTypes();
    } catch (error: any) {
      console.error('Error saving waste type:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: "خطأ في الحفظ",
        description: `حدث خطأ أثناء حفظ البيانات: ${error.message || 'خطأ غير معروف'}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (wasteType: WasteType) => {
    setEditingWasteType(wasteType);
    setFormData({
      name: wasteType.name,
      description: wasteType.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النوع من النفايات؟')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('waste_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف نوع النفايات بنجاح",
      });

      fetchWasteTypes();
    } catch (error) {
      console.error('Error deleting waste type:', error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف نوع النفايات",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingWasteType(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل أنواع النفايات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">إدارة أنواع النفايات</h1>
          <p className="text-muted-foreground">
            إضافة وتعديل وحذف أنواع النفايات المختلفة في النظام
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="font-cairo">
              <PlusCircle className="h-4 w-4 ml-2" />
              إضافة نوع جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="font-cairo">
                  {editingWasteType ? 'تعديل نوع النفايات' : 'إضافة نوع نفايات جديد'}
                </DialogTitle>
                <DialogDescription>
                  {editingWasteType 
                    ? 'قم بتعديل بيانات نوع النفايات' 
                    : 'أدخل بيانات نوع النفايات الجديد'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-cairo">اسم نوع النفايات *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: نفايات إلكترونية"
                    className="font-cairo"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-cairo">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف تفصيلي لنوع النفايات..."
                    rows={3}
                    className="font-cairo"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" className="font-cairo">
                  {editingWasteType ? 'تحديث' : 'إضافة'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي الأنواع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wasteTypes.length}</div>
            <p className="text-xs text-muted-foreground">أنواع النفايات المسجلة</p>
          </CardContent>
        </Card>
      </div>

      {/* Waste Types List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">قائمة أنواع النفايات</CardTitle>
          <CardDescription>
            جميع أنواع النفايات المسجلة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wasteTypes.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-cairo">لا توجد أنواع نفايات مسجلة</p>
              <p className="text-sm text-muted-foreground">ابدأ بإضافة نوع النفايات الأول</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {wasteTypes.map((wasteType) => (
                <div
                  key={wasteType.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 space-x-reverse mb-1">
                      <h3 className="font-semibold text-lg font-cairo">{wasteType.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {new Date(wasteType.created_at).toLocaleDateString('ar-SA')}
                      </Badge>
                    </div>
                    {wasteType.description && (
                      <p className="text-sm text-muted-foreground font-cairo">
                        {wasteType.description}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(wasteType)}
                      className="font-cairo"
                    >
                      <Edit className="h-4 w-4" />
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(wasteType.id)}
                      className="font-cairo"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageWasteTypes;