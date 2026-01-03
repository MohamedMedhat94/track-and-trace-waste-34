import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HomepageSetting {
  id: string;
  key: string;
  value: string;
  is_visible: boolean;
  display_order: number;
}

const HomepageSettingsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<HomepageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_settings')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (id: string, field: keyof HomepageSetting, value: any) => {
    setSettings(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const addNewFeature = () => {
    const newOrder = settings.length + 1;
    const newSetting: HomepageSetting = {
      id: `new_${Date.now()}`,
      key: `feature_${newOrder}`,
      value: 'ميزة جديدة',
      is_visible: true,
      display_order: newOrder
    };
    setSettings([...settings, newSetting]);
  };

  const removeSetting = async (id: string) => {
    if (id.startsWith('new_')) {
      setSettings(prev => prev.filter(s => s.id !== id));
    } else {
      try {
        const { error } = await supabase
          .from('homepage_settings')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSettings(prev => prev.filter(s => s.id !== id));
        toast({
          title: "تم الحذف",
          description: "تم حذف الميزة بنجاح",
        });
      } catch (error) {
        console.error('Error deleting setting:', error);
        toast({
          title: "خطأ",
          description: "فشل في حذف الميزة",
          variant: "destructive",
        });
      }
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const setting of settings) {
        if (setting.id.startsWith('new_')) {
          // Insert new setting
          const { error } = await supabase
            .from('homepage_settings')
            .insert({
              key: setting.key,
              value: setting.value,
              is_visible: setting.is_visible,
              display_order: setting.display_order
            });
          if (error) throw error;
        } else {
          // Update existing setting
          const { error } = await supabase
            .from('homepage_settings')
            .update({
              value: setting.value,
              is_visible: setting.is_visible,
              display_order: setting.display_order,
              updated_at: new Date().toISOString()
            })
            .eq('id', setting.id);
          if (error) throw error;
        }
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الصفحة الرئيسية بنجاح",
      });
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-cairo">إعدادات الصفحة الرئيسية</h1>
          <p className="text-muted-foreground">تخصيص المميزات المعروضة في الصفحة الرئيسية</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">قائمة المميزات</CardTitle>
          <CardDescription>قم بتعديل النصوص وإظهار/إخفاء المميزات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.map((setting, index) => (
            <div 
              key={setting.id} 
              className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
              <div className="flex-1">
                <Input
                  value={setting.value}
                  onChange={(e) => updateSetting(setting.id, 'value', e.target.value)}
                  className="font-cairo"
                  placeholder="نص الميزة"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={setting.is_visible}
                  onCheckedChange={(checked) => updateSetting(setting.id, 'is_visible', checked)}
                />
                <Label className="text-sm">ظاهر</Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSetting(setting.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={addNewFeature}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة ميزة جديدة
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="h-4 w-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomepageSettingsManagement;
