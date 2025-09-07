import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';
import { supabase } from '@/integrations/supabase/client';
import { Building, Save } from 'lucide-react';

interface CompanyRegistrationFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const CompanyRegistrationForm: React.FC<CompanyRegistrationFormProps> = ({ onClose, onSuccess }) => {
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    phone: '',
    fax: '',
    email: '',
    address: '',
    taxId: '',
    commercialRegNo: '',
    licenseNo: '',
    environmentalApproval: '',
    operatingLicense: '',
    facilityRegNo: '',
    registeredActivity: '',
    contactPerson: '',
    username: '',
    password: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.email) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting company registration...', formData);

      const result = await validateAndExecute(
        'register_company_by_transporter',
        async () => {
          // Insert company
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: formData.name,
              type: formData.type,
              phone: formData.phone || null,
              fax: formData.fax || null,
              email: formData.email,
              address: formData.address || null,
              tax_id: formData.taxId || null,
              commercial_reg_no: formData.commercialRegNo || null,
              license_no: formData.licenseNo || null,
              environmental_approval_no: formData.environmentalApproval || null,
              operating_license_no: formData.operatingLicense || null,
              facility_reg_no: formData.facilityRegNo || null,
              registered_activity: formData.registeredActivity || null,
              contact_person: formData.contactPerson || null,
              username: formData.username || null,
              is_active: true,
              status: 'active'
            })
            .select()
            .single();

          if (companyError) {
            console.error('Company insertion error:', companyError);
            throw new Error(`خطأ في حفظ بيانات الشركة: ${companyError.message}`);
          }

          console.log('Company registered successfully:', companyData);

          // Create user account with password if provided
          if (formData.email && formData.password) {
            console.log('Creating user account...');
            const { error: userError } = await supabase.functions.invoke('create-user-with-password', {
              body: {
                email: formData.email,
                password: formData.password,
                userData: {
                  name: formData.name,
                  type: formData.type,
                  phone: formData.phone || null,
                  fax: formData.fax || null,
                  address: formData.address || null,
                  contact_person: formData.contactPerson || formData.name,
                  tax_id: formData.taxId || null,
                  commercial_reg_no: formData.commercialRegNo || null,
                  license_no: formData.licenseNo || null,
                  environmental_approval_no: formData.environmentalApproval || null,
                  operating_license_no: formData.operatingLicense || null,
                  facility_reg_no: formData.facilityRegNo || null
                },
                userType: 'company'
              }
            });

            if (userError) {
              console.error('Error creating user:', userError);
              // Don't throw error here, company was created successfully
            }
          }

          return companyData;
        },
        `تم تسجيل الشركة ${formData.name} بنجاح`
      );

      if (result.success) {
        console.log('Company registration completed successfully');
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      console.error('Company registration failed:', error);
      toast({
        title: "خطأ في التسجيل",
        description: error.message || "فشل في تسجيل الشركة",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center font-cairo">
          <Building className="h-5 w-5 ml-2" />
          تسجيل شركة جديدة
        </CardTitle>
        <CardDescription>
          إضافة شركة تابعة (مولدة أو مدورة) مع البيانات القانونية الكاملة
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الشركة *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="أدخل اسم الشركة"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">نوع الشركة *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الشركة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generator">مولدة للنفايات</SelectItem>
                  <SelectItem value="recycler">مدورة للنفايات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">الهاتف</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="رقم الهاتف"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="البريد الإلكتروني"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson">الشخص المسؤول</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                placeholder="اسم الشخص المسؤول"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">البطاقة الضريبية</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="رقم البطاقة الضريبية"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commercialRegNo">السجل التجاري</Label>
              <Input
                id="commercialRegNo"
                value={formData.commercialRegNo}
                onChange={(e) => handleInputChange('commercialRegNo', e.target.value)}
                placeholder="رقم السجل التجاري"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNo">رقم الترخيص</Label>
              <Input
                id="licenseNo"
                value={formData.licenseNo}
                onChange={(e) => handleInputChange('licenseNo', e.target.value)}
                placeholder="رقم الترخيص"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environmentalApproval">رقم الموافقة البيئية</Label>
              <Input
                id="environmentalApproval"
                value={formData.environmentalApproval}
                onChange={(e) => handleInputChange('environmentalApproval', e.target.value)}
                placeholder="رقم الموافقة البيئية"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityRegNo">رقم تسجيل المنشأة</Label>
              <Input
                id="facilityRegNo"
                value={formData.facilityRegNo}
                onChange={(e) => handleInputChange('facilityRegNo', e.target.value)}
                placeholder="رقم تسجيل المنشأة"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="اسم المستخدم (اختياري)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="كلمة المرور (اختيارية)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="العنوان الكامل"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registeredActivity">النشاط المسجل</Label>
            <Textarea
              id="registeredActivity"
              value={formData.registeredActivity}
              onChange={(e) => handleInputChange('registeredActivity', e.target.value)}
              placeholder="وصف النشاط المسجل للشركة"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-4 space-x-reverse pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading} className="font-cairo">
              <Save className="h-4 w-4 ml-2" />
              {isLoading ? 'جاري الحفظ...' : 'حفظ الشركة'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompanyRegistrationForm;