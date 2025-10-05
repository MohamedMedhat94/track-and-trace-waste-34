import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface DriverFormProps {
  onClose: () => void;
  editingDriver?: any;
  onSubmit?: (data: any) => void;
  editData?: any;
}

const DriverForm: React.FC<DriverFormProps> = ({ onClose, editingDriver }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: editingDriver?.name || '',
    national_id: editingDriver?.national_id || '',
    email: editingDriver?.email || '',
    phone: editingDriver?.phone || '',
    license_number: editingDriver?.license_number || '',
    license_type: editingDriver?.license_type || '',
    vehicle_type: editingDriver?.vehicle_type || '',
    vehicle_plate: editingDriver?.vehicle_plate || '',
    location_address: editingDriver?.location_address || '',
    department: editingDriver?.department || '',
    assigned_vehicle_number: editingDriver?.assigned_vehicle_number || '',
    transport_company_id: editingDriver?.transport_company_id || '',
    password: '' // إضافة حقل كلمة المرور
  });

  useEffect(() => {
    fetchTransportCompanies();
  }, []);

  const fetchTransportCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('type', 'transporter')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('خطأ في جلب شركات النقل:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.transport_company_id) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم السائق وشركة النقل على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (!editingDriver && (!formData.email || !formData.password)) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور للسائق الجديد",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength for new drivers
    if (!editingDriver && formData.password) {
      if (formData.password.length < 8) {
        toast({
          title: "كلمة مرور ضعيفة",
          description: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
          variant: "destructive",
        });
        return;
      }
      if (!/[A-Z]/.test(formData.password)) {
        toast({
          title: "كلمة مرور ضعيفة",
          description: "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z)",
          variant: "destructive",
        });
        return;
      }
      if (!/[a-z]/.test(formData.password)) {
        toast({
          title: "كلمة مرور ضعيفة",
          description: "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z)",
          variant: "destructive",
        });
        return;
      }
      if (!/[0-9]/.test(formData.password)) {
        toast({
          title: "كلمة مرور ضعيفة",
          description: "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9)",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      if (editingDriver) {
        // Update existing driver
        const driverData = {
          ...formData,
          // Keep original user_id for updates
          user_id: editingDriver.user_id
        };
        delete driverData.password; // Remove password from update

        const { error } = await supabase
          .from('drivers')
          .update(driverData)
          .eq('id', editingDriver.id);

        if (error) throw error;

        toast({
          title: "تم تحديث السائق",
          description: "تم تحديث بيانات السائق بنجاح",
        });
      } else {
        // Create new driver with user account
        try {
          const { data: createUserData, error: createUserError } = await supabase.functions.invoke('create-user-with-password', {
            body: {
              email: formData.email,
              password: formData.password,
              userData: {
                ...formData
              },
              userType: 'driver'
            }
          });

          if (createUserError) {
            console.error('Edge function error:', createUserError);
            throw createUserError;
          }
          if (createUserData?.error) {
            console.error('Edge function returned error:', createUserData.error);
            throw new Error(createUserData.error);
          }

          toast({
            title: "تم إنشاء السائق بنجاح",
            description: "تم إنشاء حساب السائق مع كلمة المرور المحددة",
          });
        } catch (createError: any) {
          console.error('Edge function failed:', createError);
          throw new Error(createError?.message || 'فشل إنشاء حساب السائق');
        }
      }

      onClose();
    } catch (error: any) {
      console.error('خطأ في حفظ السائق:', error);
      toast({
        title: "خطأ في حفظ السائق",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-cairo">
          {editingDriver ? 'تعديل السائق' : 'إضافة سائق جديد'}
        </CardTitle>
        <CardDescription>
          {editingDriver ? 'تحديث بيانات السائق' : 'إدخال بيانات السائق الجديد'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="font-cairo">اسم السائق</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="الاسم الكامل للسائق"
              />
            </div>

            <div>
              <Label htmlFor="national_id" className="font-cairo">رقم الهوية الوطنية</Label>
              <Input
                id="national_id"
                value={formData.national_id}
                onChange={(e) => handleInputChange('national_id', e.target.value)}
                placeholder="رقم الهوية الوطنية"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="font-cairo">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="البريد الإلكتروني"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="font-cairo">رقم الهاتف</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="رقم الهاتف"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_number" className="font-cairo">رقم رخصة القيادة</Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) => handleInputChange('license_number', e.target.value)}
                placeholder="رقم رخصة القيادة"
              />
            </div>

            <div>
              <Label htmlFor="license_type" className="font-cairo">نوع الرخصة</Label>
              <Select
                value={formData.license_type}
                onValueChange={(value) => handleInputChange('license_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الرخصة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="خاص">خاص</SelectItem>
                  <SelectItem value="عام">عام</SelectItem>
                  <SelectItem value="دراجة نارية">دراجة نارية</SelectItem>
                  <SelectItem value="حافلة">حافلة</SelectItem>
                  <SelectItem value="شاحنة">شاحنة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_type" className="font-cairo">نوع المركبة</Label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(value) => handleInputChange('vehicle_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المركبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="سيارة صغيرة">سيارة صغيرة</SelectItem>
                  <SelectItem value="شاحنة صغيرة">شاحنة صغيرة</SelectItem>
                  <SelectItem value="شاحنة متوسطة">شاحنة متوسطة</SelectItem>
                  <SelectItem value="شاحنة كبيرة">شاحنة كبيرة</SelectItem>
                  <SelectItem value="مقطورة">مقطورة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vehicle_plate" className="font-cairo">رقم لوحة المركبة</Label>
              <Input
                id="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={(e) => handleInputChange('vehicle_plate', e.target.value)}
                placeholder="رقم لوحة المركبة"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="transport_company_id" className="font-cairo">شركة النقل</Label>
            <Select
              value={formData.transport_company_id}
              onValueChange={(value) => handleInputChange('transport_company_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر شركة النقل" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location_address" className="font-cairo">عنوان السكن</Label>
            <Input
              id="location_address"
              value={formData.location_address}
              onChange={(e) => handleInputChange('location_address', e.target.value)}
              placeholder="عنوان السكن الكامل"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department" className="font-cairo">القسم</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="قسم العمل"
              />
            </div>

            <div>
              <Label htmlFor="assigned_vehicle_number" className="font-cairo">رقم المركبة المخصصة</Label>
              <Input
                id="assigned_vehicle_number"
                value={formData.assigned_vehicle_number}
                onChange={(e) => handleInputChange('assigned_vehicle_number', e.target.value)}
                placeholder="رقم المركبة المخصصة"
              />
            </div>
          </div>

          {!editingDriver && (
            <div>
              <Label htmlFor="password" className="font-cairo">كلمة المرور *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="كلمة مرور قوية للحساب"
                required
              />
              <p className="text-sm text-muted-foreground mt-2">
                يجب أن تحتوي على: 8 أحرف على الأقل، حرف كبير (A-Z)، حرف صغير (a-z)، ورقم (0-9)
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : (editingDriver ? 'تحديث السائق' : 'إضافة السائق')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DriverForm;