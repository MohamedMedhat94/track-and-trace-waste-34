
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyFormProps {
  onClose?: () => void;
  onSubmit?: (data: any) => void;
  editData?: any;
  submitViaEdgeFunction?: boolean;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ onClose, onSubmit, editData, submitViaEdgeFunction }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    type: editData?.type || '',
    email: editData?.email || '',
    phone: editData?.phone || '',
    fax: editData?.fax || '',
    address: editData?.address || '',
    contact_person: editData?.contact_person || '',
    license_no: editData?.license_no || '',
    commercial_reg_no: editData?.commercial_reg_no || '',
    tax_id: editData?.tax_id || '',
    description: editData?.description || '',
    password: '', // إضافة حقل كلمة المرور
    // إضافية للشركات الناقلة
    environmental_approval_no: editData?.environmental_approval_no || '',
    operating_license_no: editData?.operating_license_no || '',
    registered_activity: editData?.registered_activity || '',
    // إضافية لشركات إعادة التدوير  
    facility_reg_no: editData?.facility_reg_no || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.email || !formData.phone) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (!editData && !submitViaEdgeFunction && !formData.password) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال كلمة مرور للشركة الجديدة",
        variant: "destructive",
      });
      return;
    }

    if (!editData && submitViaEdgeFunction && !formData.password) {
      toast({
        title: "خطأ في البيانات", 
        description: "يرجى إدخال كلمة مرور للشركة الجديدة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      if (editData?.id) {
        // Update existing company
        console.log('Updating company with payload:', { id: editData.id, payload: formData });
        const { data: updateData, error: updateError } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            type: formData.type,
            email: formData.email,
            phone: formData.phone,
            fax: formData.fax || null,
            address: formData.address || null,
            contact_person: formData.contact_person || null,
            license_no: formData.license_no || null,
            commercial_reg_no: formData.commercial_reg_no || null,
            tax_id: formData.tax_id || null,
            environmental_approval_no: formData.environmental_approval_no || null,
            operating_license_no: formData.operating_license_no || null,
            registered_activity: formData.registered_activity || null,
            facility_reg_no: formData.facility_reg_no || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editData.id)
          .select();

        console.log('Company update result:', { updateData, updateError });
        if (updateError) throw updateError;

        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث بيانات الشركة بنجاح",
        });
      } else {
        // Create new company
        console.log('Creating company with payload:', formData);
        
        if (submitViaEdgeFunction) {
          // Use the public registration edge function (bypasses RLS with service role)
          try {
            const { data: registrationData, error: registrationError } = await supabase.functions.invoke('submit-company-registration', {
              body: formData
            });

            if (registrationError) {
              console.error('Registration edge function error:', registrationError);
              throw registrationError;
            }
            
            if (registrationData?.error) {
              throw new Error(registrationData.error);
            }

            console.log('Company registration via edge function result:', registrationData);
            
            toast({
              title: "تم تقديم الطلب بنجاح", 
              description: registrationData?.message || "تم تقديم طلب تسجيل الشركة، سيتم مراجعته من قبل الإدارة",
            });
          } catch (registrationError) {
            console.error('Public registration failed:', registrationError);
            throw registrationError;
          }
        } else {
          // Admin creating company with user account
          try {
            const { data: createUserData, error: createUserError } = await supabase.functions.invoke('create-user-with-password', {
              body: {
                email: formData.email,
                password: formData.password,
                userData: formData,
                userType: 'company'
              }
            });

            if (createUserError) throw createUserError;
            if (createUserData?.error) throw new Error(createUserData.error);

            toast({
              title: "تم إنشاء الشركة بنجاح",
              description: "تم إنشاء حساب الشركة مع كلمة المرور المحددة",
            });
          } catch (createError) {
            console.warn('Edge function failed, falling back to normal creation:', createError);
            
            // Fallback to normal creation without user account
            const payload = {
              name: formData.name,
              type: formData.type,
              email: formData.email,
              phone: formData.phone,
              fax: formData.fax || null,
              address: formData.address || null,
              contact_person: formData.contact_person || null,
              license_no: formData.license_no || null,
              commercial_reg_no: formData.commercial_reg_no || null,
              tax_id: formData.tax_id || null,
              environmental_approval_no: formData.environmental_approval_no || null,
              operating_license_no: formData.operating_license_no || null,
              registered_activity: formData.registered_activity || null,
              facility_reg_no: formData.facility_reg_no || null,
              status: 'pending',
              is_active: false
            };

            const { data: insertData, error: insertError } = await supabase
              .from('companies')
              .insert([payload])
              .select();

            if (insertError) {
              console.error('Fallback insert error:', insertError);
              throw insertError;
            }

            console.log('Company registration fallback result:', insertData);
            
            toast({
              title: "تم تقديم الطلب بنجاح", 
              description: "تم تقديم طلب تسجيل الشركة، سيتم مراجعته من قبل الإدارة",
            });
          }
        }

        // Play success sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuZ3/LCOS0FJHzJ8N2PPwoRXbTn7KpXFAlCm+H0xmkgBjuY3vLMey4FJHzK8N2PPgkTXLPm7KtYE6y'); 
        audio.play().catch(() => console.log('Could not play notification sound'));
      }

      if (onSubmit) {
        onSubmit(formData);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving company:', error);
      console.error('Error details:', { message: error?.message, code: error?.code, details: error?.details, hint: error?.hint });
      toast({
        title: "خطأ في الحفظ",
        description: `حدث خطأ أثناء حفظ بيانات الشركة: ${error?.message || 'خطأ غير معروف'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="font-cairo text-2xl">
                {editData ? 'تعديل بيانات الشركة' : 'إضافة شركة جديدة'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base mt-1">
                {editData ? 'تحديث معلومات الشركة' : 'إدخال بيانات شركة جديدة في النظام'}
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Company Information */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">المعلومات الأساسية</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-semibold flex items-center space-x-1 space-x-reverse">
                  <span>اسم الجهة</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="أدخل اسم الجهة"
                  required
                  className="h-12 border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="type" className="text-sm font-semibold flex items-center space-x-1 space-x-reverse">
                  <span>نوع الجهة</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger className="h-12 border-2 border-muted-foreground/20 focus:border-primary">
                    <SelectValue placeholder="اختر نوع الجهة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generator">الجهة المولدة للمخلفات</SelectItem>
                    <SelectItem value="transporter">الجهة الناقلة للمخلفات</SelectItem>
                    <SelectItem value="recycler">جهة تدوير المخلفات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold flex items-center space-x-1 space-x-reverse">
                  <span>البريد الإلكتروني</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="company@example.com"
                  className="h-12 text-left border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm font-semibold flex items-center space-x-1 space-x-reverse">
                  <span>الهاتف</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="01123456789"
                  className="h-12 text-left border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="fax" className="text-sm font-semibold">الفاكس</Label>
                <Input
                  id="fax"
                  value={formData.fax}
                  onChange={(e) => handleInputChange('fax', e.target.value)}
                  placeholder="2026133210"
                  className="h-12 text-left border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                  dir="ltr"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="contact_person" className="text-sm font-semibold">الشخص المسؤول</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  placeholder="اسم الشخص المسؤول"
                  className="h-12 border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                />
              </div>

              {!editData && (
                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="password" className="text-sm font-semibold flex items-center space-x-1 space-x-reverse">
                    <span>كلمة المرور</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="أدخل كلمة مرور قوية للحساب"
                    className="h-12 border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                    required={!submitViaEdgeFunction}
                  />
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="tax_id" className="text-sm font-semibold">البطاقة الضريبية</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  placeholder="528530755"
                  className="h-12 text-left border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                  dir="ltr"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="commercial_reg_no" className="text-sm font-semibold">السجل التجاري</Label>
                <Input
                  id="commercial_reg_no"
                  value={formData.commercial_reg_no}
                  onChange={(e) => handleInputChange('commercial_reg_no', e.target.value)}
                  placeholder="رقم السجل التجاري"
                  className="h-12 border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="address" className="text-sm font-semibold">عنوان الجهة</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="المنطقة الصناعية الأولي قطعة رقم 5 السادس من اكتوبر"
                rows={4}
                className="border-2 border-muted-foreground/20 focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>

          {/* Transporter Specific Fields */}
          {formData.type === 'transporter' && (
            <div className="space-y-6 border-t-2 border-primary/10 pt-6">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-1 h-6 bg-accent rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">معلومات إضافية للجهة الناقلة</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-accent/5 p-6 rounded-lg border border-accent/20">
                <div className="space-y-3">
                  <Label htmlFor="environmental_approval_no" className="text-sm font-semibold">رقم الموافقة البيئية</Label>
                  <Input
                    id="environmental_approval_no"
                    value={formData.environmental_approval_no}
                    onChange={(e) => handleInputChange('environmental_approval_no', e.target.value)}
                    placeholder="2021-9-20-2881"
                    className="h-12 border-2 border-muted-foreground/20 focus:border-accent transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="license_no" className="text-sm font-semibold">رقم الترخيص</Label>
                  <Input
                    id="license_no"
                    value={formData.license_no}
                    onChange={(e) => handleInputChange('license_no', e.target.value)}
                    placeholder="1220180527000004"
                    className="h-12 border-2 border-muted-foreground/20 focus:border-accent transition-colors"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="registered_activity" className="text-sm font-semibold">النشاط المسجل</Label>
                  <Textarea
                    id="registered_activity"
                    value={formData.registered_activity}
                    onChange={(e) => handleInputChange('registered_activity', e.target.value)}
                    placeholder="جمع ونقل المخلفات الغير خطرة واعادة تدوير الاخشاب"
                    rows={3}
                    className="border-2 border-muted-foreground/20 focus:border-accent transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recycler Specific Fields */}
          {formData.type === 'recycler' && (
            <div className="space-y-6 border-t-2 border-primary/10 pt-6">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-1 h-6 bg-secondary rounded-full"></div>
                <h3 className="text-xl font-bold text-foreground">معلومات إضافية لجهة إعادة التدوير</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/5 p-6 rounded-lg border border-secondary/20">
                <div className="space-y-3">
                  <Label htmlFor="environmental_approval_no" className="text-sm font-semibold">رقم الموافقة البيئية</Label>
                  <Input
                    id="environmental_approval_no"
                    value={formData.environmental_approval_no}
                    onChange={(e) => handleInputChange('environmental_approval_no', e.target.value)}
                    placeholder="2021_9_20_2881"
                    className="h-12 border-2 border-muted-foreground/20 focus:border-secondary transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="operating_license_no" className="text-sm font-semibold">رقم رخصة جهاز تنظيم إدارة المخلفات</Label>
                  <Input
                    id="operating_license_no"
                    value={formData.operating_license_no}
                    onChange={(e) => handleInputChange('operating_license_no', e.target.value)}
                    placeholder="122018052700004/2018"
                    className="h-12 border-2 border-muted-foreground/20 focus:border-secondary transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="facility_reg_no" className="text-sm font-semibold">رقم تسجيل المنشأة</Label>
                  <Input
                    id="facility_reg_no"
                    value={formData.facility_reg_no}
                    onChange={(e) => handleInputChange('facility_reg_no', e.target.value)}
                    placeholder="26075"
                    className="h-12 border-2 border-muted-foreground/20 focus:border-secondary transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="license_no" className="text-sm font-semibold">رقم الترخيص</Label>
                  <Input
                    id="license_no"
                    value={formData.license_no}
                    onChange={(e) => handleInputChange('license_no', e.target.value)}
                    placeholder="رقم الترخيص"
                    className="h-12 border-2 border-muted-foreground/20 focus:border-secondary transition-colors"
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="registered_activity" className="text-sm font-semibold">النشاط المسجل</Label>
                  <Textarea
                    id="registered_activity"
                    value={formData.registered_activity}
                    onChange={(e) => handleInputChange('registered_activity', e.target.value)}
                    placeholder="صناعة الأوعية الخشبية"
                    rows={3}
                    className="border-2 border-muted-foreground/20 focus:border-secondary transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Description */}
          <div className="space-y-6 border-t-2 border-primary/10 pt-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-1 h-6 bg-muted-foreground rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">معلومات إضافية</h3>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold">وصف إضافي للجهة (اختياري)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="معلومات إضافية عن الجهة وأنشطتها ومجالات عملها"
                rows={4}
                className="border-2 border-muted-foreground/20 focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>

          {/* Submit Section */}
          <div className="flex justify-end gap-4 pt-8 border-t-2 border-primary/10">
            {onClose && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="px-8 h-12 border-2 hover:border-primary/50"
              >
                إلغاء
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={loading} 
              className="px-8 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 ml-2" />
                  {editData ? 'تحديث البيانات' : 'إضافة الشركة'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompanyForm;
